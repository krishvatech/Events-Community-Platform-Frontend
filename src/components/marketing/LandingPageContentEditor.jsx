import React, { Suspense, forwardRef, lazy, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import CodeRoundedIcon from "@mui/icons-material/CodeRounded";
import DashboardCustomizeRoundedIcon from "@mui/icons-material/DashboardCustomizeRounded";
import DynamicFormRoundedIcon from "@mui/icons-material/DynamicFormRounded";

import { listNewsletterForms } from "../../services/newsletterService";
import { findActiveContent, hasBuilderStyle } from "./landingPageDocument";

const LandingPageVisualBuilder = lazy(() => import("./LandingPageVisualBuilder.jsx"));

export const MODE_VISUAL = "visual";
export const MODE_HTML = "html";

/** The mode a page opens in: visual for new pages and pages last saved from the builder. */
export function initialPageEditorMode({ isNew, html }) {
  if (findActiveContent(html).length) return MODE_HTML;
  return isNew || hasBuilderStyle(html) ? MODE_VISUAL : MODE_HTML;
}

/** Lists published Mautic Forms and returns the chosen one. */
function FormPickerDialog({ open, onClose, onPick }) {
  const [state, setState] = useState({ loading: false, forms: [], error: "" });

  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    setState({ loading: true, forms: [], error: "" });
    listNewsletterForms({ status: "published", page_size: 100, sort: "name" })
      .then((data) => active && setState({ loading: false, forms: Array.isArray(data?.results) ? data.results : [], error: "" }))
      .catch(() => active && setState({ loading: false, forms: [], error: "Published Forms could not be loaded from Mautic." }));
    return () => {
      active = false;
    };
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Insert a Mautic Form</DialogTitle>
      <DialogContent>
        {state.loading && <CircularProgress size={24} aria-label="Loading Forms" />}
        {state.error && <Alert severity="error">{state.error}</Alert>}
        {!state.loading && !state.error && state.forms.length === 0 && (
          <Typography color="text.secondary">There are no published Forms. Publish a Form first.</Typography>
        )}
        {state.forms.length > 0 && (
          <List dense aria-label="Published Forms">
            {state.forms.map((form) => (
              <ListItemButton key={form.id} onClick={() => onPick(form)}>
                <ListItemText primary={form.name || `Form #${form.id}`} secondary={`Form #${form.id}`} />
              </ListItemButton>
            ))}
          </List>
        )}
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          The builder shows a placeholder; the Form itself appears on the live page.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}

/**
 * Visual Builder / HTML Editor switch for one landing page. The HTML editor is
 * the caller's `htmlEditor` node; the page HTML is the only saved copy, so the
 * builder always opens the current `html`.
 */
const LandingPageContentEditor = forwardRef(function LandingPageContentEditor(
  { pageKey, html, mode, onModeChange, onHtmlFromBuilder, onBuilderDirtyChange, readOnly = false, htmlEditor, height = 720 },
  ref
) {
  const builderRef = useRef(null);
  // Bumped to reopen the builder with the current HTML after HTML edits.
  const [nonce, setNonce] = useState(0);
  const [confirmTidy, setConfirmTidy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState("");
  const activeContent = useMemo(() => findActiveContent(html), [html]);
  const visual = mode === MODE_VISUAL && !readOnly && activeContent.length === 0;

  useImperativeHandle(ref, () => ({
    /** The HTML to save from the builder, or null when the builder has no changes (or is not shown). */
    collect: () => {
      if (!visual) return null;
      const builder = builderRef.current;
      if (!builder?.isReady()) throw new Error("The visual builder is still loading. Try again in a moment.");
      return builder.isDirty() ? builder.getDocument() : null;
    },
    hasUnsavedBuilderChanges: () => Boolean(visual && builderRef.current?.isDirty()),
  }));

  const openVisual = () => {
    setNonce((value) => value + 1);
    onBuilderDirtyChange?.(false);
    onModeChange(MODE_VISUAL);
  };

  const requestVisual = () => {
    setError("");
    if (activeContent.length) {
      setError(`The visual builder cannot open this page: it would remove ${activeContent.join("; ")}. Keep editing it as HTML.`);
      return;
    }
    if (String(html || "").trim() && !hasBuilderStyle(html)) setConfirmTidy(true);
    else openVisual();
  };

  const switchToHtml = () => {
    setError("");
    const builder = builderRef.current;
    if (builder?.isReady() && builder.isDirty()) {
      try {
        onHtmlFromBuilder(builder.getDocument());
      } catch (err) {
        setError(err?.message || "The page could not be converted to HTML.");
        return;
      }
    }
    onBuilderDirtyChange?.(false);
    onModeChange(MODE_HTML);
  };

  const handleMode = (_, next) => {
    if (!next || next === (visual ? MODE_VISUAL : MODE_HTML) || readOnly) return;
    if (next === MODE_HTML) switchToHtml();
    else requestVisual();
  };

  return (
    <Stack spacing={2}>
      {!readOnly && (
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
          <ToggleButtonGroup exclusive size="small" value={visual ? MODE_VISUAL : MODE_HTML} onChange={handleMode} aria-label="Page editor mode">
            <ToggleButton value={MODE_VISUAL} aria-label="Visual Builder" sx={{ textTransform: "none", gap: 0.75 }}>
              <DashboardCustomizeRoundedIcon fontSize="small" /> Visual Builder
            </ToggleButton>
            <ToggleButton value={MODE_HTML} aria-label="HTML Editor" sx={{ textTransform: "none", gap: 0.75 }}>
              <CodeRoundedIcon fontSize="small" /> HTML Editor
            </ToggleButton>
          </ToggleButtonGroup>
          {visual && (
            <Button size="small" variant="outlined" startIcon={<DynamicFormRoundedIcon />} onClick={() => setPickerOpen(true)} sx={{ textTransform: "none" }}>
              Insert Mautic Form
            </Button>
          )}
        </Stack>
      )}
      {error && <Alert severity="warning" onClose={() => setError("")}>{error}</Alert>}
      {visual ? (
        <Suspense
          fallback={
            <Box sx={{ minHeight: height, display: "grid", placeItems: "center" }}>
              <CircularProgress aria-label="Loading visual builder" />
            </Box>
          }
        >
          <LandingPageVisualBuilder
            ref={builderRef}
            pageKey={`${pageKey}:${nonce}`}
            html={html}
            height={height}
            onDirtyChange={(dirty) => onBuilderDirtyChange?.(dirty)}
            onError={(err) => setError(err?.message || "The visual builder could not be loaded.")}
          />
        </Suspense>
      ) : (
        htmlEditor
      )}
      <Dialog open={confirmTidy} onClose={() => setConfirmTidy(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Open this page in the visual builder?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            This page was written as HTML. The builder may tidy it when you save from Visual Builder: inline styles move
            into a builder stylesheet and markup it does not understand may be simplified. The page head (title, meta
            tags and styles) is kept as it is. Nothing changes unless you save.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmTidy(false)}>Stay in HTML Editor</Button>
          <Button
            variant="contained"
            onClick={() => {
              setConfirmTidy(false);
              openVisual();
            }}
          >
            Open Visual Builder
          </Button>
        </DialogActions>
      </Dialog>
      <FormPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(form) => {
          setPickerOpen(false);
          builderRef.current?.insertForm(form.id, form.name);
        }}
      />
    </Stack>
  );
});

export default LandingPageContentEditor;
