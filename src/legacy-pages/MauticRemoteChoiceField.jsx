import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControl,
  InputLabel,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Select,
  TextField,
  Typography,
} from "@mui/material";

import { asArray } from "./mauticCampaignEventHydration";
import {
  DEFAULT_CHOICE_PAGE_SIZE,
  appendChoicePage,
  choiceCacheKey,
  createChoiceLabelStore,
  selectionKey,
  choiceRequestParams,
  choiceSourceKey,
  hasMoreChoices,
  mergeSelectedChoices,
  missingSelectedValues,
  nextChoiceStart,
  normalizeChoiceResults,
  selectedValueList,
} from "./mauticCampaignChoices";
import { getMauticCampaignChoices } from "../services/newsletterService";

const SEARCH_DEBOUNCE_MS = 300;

// One page per key: an unfiltered page, a search's page and page 2 are all
// distinct entries, so a cache hit can never stand in for a different query.
const choicePageCache = new Map();
// Identical pages asked for at the same moment share one request rather than
// racing each other to the provider.
const inFlightPages = new Map();
// Labels for saved provider values, kept for the page session and outside React
// state so a resolved label survives re-renders, re-mounts and prop churn.
const labelStore = createChoiceLabelStore();

export const __resetChoiceCaches = () => {
  choicePageCache.clear();
  inFlightPages.clear();
  labelStore.clear();
};

const getErrorMessage = (err, fallback) =>
  err?.response?.data?.detail || err?.message || fallback;

/**
 * Generic selector for any provider choice field described by reference instead
 * of inlined. No field, event or segment is named here.
 *
 * It asks for one small page at a time, searches provider-side, and only fetches
 * more when the user asks for it. What differs per caller — how a request is
 * addressed, who serves it, and which cache it belongs to — is injected, and
 * defaults to the campaign builder's, which is where this component started.
 */
export default function MauticRemoteChoiceField({
  field,
  value,
  onChange,
  disabled,
  buildParams = choiceRequestParams,
  loadChoices = getMauticCampaignChoices,
  // Caches and resolved labels are module-wide, and two callers can name the
  // same provider catalog while asking different endpoints for it. The default
  // is empty so the campaign builder's keys are unchanged.
  cacheNamespace = "",
  // The campaign builder's own default; the segment rows are compact.
  size = "medium",
}) {
  const [options, setOptions] = useState([]);
  // Bumped when the label store learns something, to re-render with it.
  const [resolvedRevision, setResolvedRevision] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [nextStart, setNextStart] = useState(0);
  const [opened, setOpened] = useState(false);

  // Only the newest query may write to state; older in-flight responses are
  // dropped rather than allowed to overwrite it.
  const requestVersion = useRef(0);
  // The search term the currently shown page belongs to.
  const loadedSearch = useRef(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const selectedValues = useMemo(
    () => selectedValueList(value, field.multiple),
    [value, field.multiple]
  );
  const source = field.choiceSource;
  const sourceKey = useMemo(
    () => `${cacheNamespace}${choiceSourceKey(source)}`,
    [source, cacheNamespace]
  );
  const pageKey = useCallback(
    (page) => `${cacheNamespace}${choiceCacheKey(source, page)}`,
    [source, cacheNamespace]
  );

  const fetchPage = useCallback(async (params, cacheKey) => {
    if (cacheKey && choicePageCache.has(cacheKey)) return choicePageCache.get(cacheKey);
    if (cacheKey && inFlightPages.has(cacheKey)) return inFlightPages.get(cacheKey);

    const request = (async () => {
      const payload = await loadChoices(params);
      const choices = normalizeChoiceResults(payload);
      const page = {
        choices,
        hasMore: hasMoreChoices(payload),
        nextStart: nextChoiceStart(payload, choices.length),
      };
      if (cacheKey) choicePageCache.set(cacheKey, page);
      return page;
    })();

    if (!cacheKey) return request;

    inFlightPages.set(cacheKey, request);
    try {
      return await request;
    } finally {
      inFlightPages.delete(cacheKey);
    }
  }, [loadChoices]);

  const selectedKey = selectionKey(selectedValues);

  // Resolve the labels of values this event already holds, without fetching the
  // catalog: a saved selection must read correctly before the list is opened.
  // The answer is written to the session store rather than to component state,
  // so nothing is lost if this component re-renders or unmounts mid-request.
  useEffect(() => {
    const needed = labelStore.needed(sourceKey, selectedValues);
    if (!needed.length) return undefined;

    const params = buildParams(source, { values: needed });
    if (!params) return undefined; // source not usable yet; retry when it is

    labelStore.markPending(sourceKey, needed);

    (async () => {
      try {
        const page = await fetchPage(params, pageKey({ values: needed }));
        labelStore.resolve(sourceKey, page.choices);
        // Anything the provider did not return simply does not exist any more.
        labelStore.markFailed(sourceKey, needed);
      } catch {
        // A failed lookup must never clear the saved value, and must not be
        // retried in a loop; the raw value stays visible and flagged.
        labelStore.markFailed(sourceKey, needed);
      } finally {
        if (mounted.current) setResolvedRevision((current) => current + 1);
      }
    })();

    return undefined;
  }, [selectedKey, sourceKey, source, fetchPage, selectedValues, buildParams, pageKey]);

  const selectedChoices = useMemo(
    () => labelStore.known(sourceKey, selectedValues),
    // resolvedRevision is what makes a newly stored label reach the render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sourceKey, selectedKey, resolvedRevision, selectedValues]
  );

  const loadFirstPage = useCallback(
    async (nextSearch) => {
      const params = buildParams(source, {
        search: nextSearch,
        start: 0,
        limit: DEFAULT_CHOICE_PAGE_SIZE,
      });
      if (!params) return;

      const version = ++requestVersion.current;
      loadedSearch.current = nextSearch;
      setLoading(true);
      setError("");
      try {
        const page = await fetchPage(
          params,
          pageKey({ search: nextSearch, start: 0 })
        );
        if (version !== requestVersion.current) return; // a newer query won
        setSearch(nextSearch);
        setOptions(page.choices);
        setHasMore(page.hasMore);
        setNextStart(page.nextStart);
      } catch (err) {
        if (version !== requestVersion.current) return;
        setOptions([]);
        setHasMore(false);
        setError(getErrorMessage(err, "We could not load options from Mautic."));
      } finally {
        if (version === requestVersion.current) setLoading(false);
      }
    },
    [source, fetchPage, buildParams, pageKey]
  );

  const loadMore = useCallback(async () => {
    if (!hasMore || loading || loadingMore) return;
    const params = buildParams(source, {
      search,
      start: nextStart,
      limit: DEFAULT_CHOICE_PAGE_SIZE,
    });
    if (!params) return;

    const version = requestVersion.current;
    setLoadingMore(true);
    try {
      const page = await fetchPage(
        params,
        pageKey({ search, start: nextStart })
      );
      if (version !== requestVersion.current) return;
      setOptions((current) => appendChoicePage(current, page.choices));
      setHasMore(page.hasMore);
      setNextStart(page.nextStart);
    } catch (err) {
      if (version === requestVersion.current) {
        setError(getErrorMessage(err, "We could not load more options from Mautic."));
      }
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loading, loadingMore, source, search, nextStart, fetchPage, buildParams, pageKey]);

  // Debounced so a typed word is one provider query, not one per keystroke.
  useEffect(() => {
    if (!opened) return undefined;
    const trimmed = searchInput.trim();
    if (trimmed === loadedSearch.current) return undefined; // already showing it

    const handle = setTimeout(() => {
      loadFirstPage(trimmed);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(handle);
  }, [searchInput, opened, loadFirstPage]);

  const handleOpen = () => {
    setOpened(true);
    if (!options.length && !loading) loadFirstPage(searchInput.trim());
  };

  const renderedOptions = useMemo(
    () => mergeSelectedChoices(options, selectedChoices, selectedValues),
    [options, selectedChoices, selectedValues]
  );

  const labelFor = (rawValue) => {
    const match = renderedOptions.find(
      (option) => String(option.value) === String(rawValue) && !option.unresolved
    );
    if (match) return match.label;
    // Still being looked up: never present the provider code as the final label.
    if (labelStore.isPending(sourceKey, rawValue)) return "Resolving…";
    return String(rawValue);
  };

  const fieldLabel = field.required ? `${field.label} *` : field.label;
  const total = field.choiceSource?.total ?? field.choiceCount;

  return (
    <FormControl
      fullWidth
      size={size}
      error={field.required && !selectedValues.length}
      disabled={disabled}
    >
      <InputLabel id={`${field.path}-remote-label`}>{fieldLabel}</InputLabel>
      <Select
        labelId={`${field.path}-remote-label`}
        multiple={Boolean(field.multiple)}
        value={field.multiple ? selectedValues : selectedValues[0] ?? ""}
        label={fieldLabel}
        input={<OutlinedInput label={fieldLabel} />}
        size={size}
        onOpen={handleOpen}
        onClose={() => setOpened(false)}
        onChange={(changeEvent) => onChange(changeEvent.target.value)}
        renderValue={(selected) =>
          asArray(field.multiple ? selected : [selected])
            .filter((item) => item !== "" && item !== undefined && item !== null)
            .map(labelFor)
            .join(", ")
        }
        MenuProps={{ PaperProps: { sx: { maxHeight: 380 } } }}
      >
        <Box sx={{ px: 1.5, pt: 1, pb: 0.5 }} onKeyDown={(e) => e.stopPropagation()}>
          <TextField
            size="small"
            fullWidth
            placeholder={`Search ${String(field.searchLabel || field.label).toLowerCase()}…`}
            value={searchInput}
            onChange={(changeEvent) => setSearchInput(changeEvent.target.value)}
            onClick={(e) => e.stopPropagation()}
          />
          <Typography variant="caption" color="text.secondary">
            {loading
              ? "Searching Mautic…"
              : `Showing ${options.length}${total ? ` of ${total}` : ""} — search to narrow`}
          </Typography>
        </Box>

        {error && (
          <Box sx={{ px: 1.5, py: 1 }}>
            <Alert severity="error" variant="outlined">
              {error}
            </Alert>
          </Box>
        )}

        {loading && !renderedOptions.length && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
            <CircularProgress size={20} />
          </Box>
        )}

        {!loading && !error && opened && !renderedOptions.length && (
          <Box sx={{ px: 1.5, py: 1 }}>
            <Typography variant="body2" color="text.secondary">
              No matching provider options.
            </Typography>
          </Box>
        )}

        {renderedOptions.map((option, index) => (
          <MenuItem key={`${field.path}-${option.value}-${index}`} value={option.value}>
            {field.multiple && (
              <Checkbox
                checked={selectedValues.includes(String(option.value))}
                size="small"
              />
            )}
            <ListItemText
              primary={option.label}
              secondary={
                option.unresolved
                  ? "Saved value — not offered by Mautic"
                  : option.group || null
              }
            />
          </MenuItem>
        ))}

        {hasMore && (
          <Box sx={{ px: 1.5, py: 1 }} onKeyDown={(e) => e.stopPropagation()}>
            <Button
              size="small"
              fullWidth
              onClick={(clickEvent) => {
                clickEvent.stopPropagation();
                loadMore();
              }}
              disabled={loadingMore}
              startIcon={loadingMore ? <CircularProgress size={14} /> : null}
            >
              {loadingMore ? "Loading…" : "Load more"}
            </Button>
          </Box>
        )}
      </Select>
    </FormControl>
  );
}
