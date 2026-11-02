// Email delivery options Mautic keeps on the email itself (Reply-To, the UTM
// tags it adds to tracked links, file attachments) and per-link click counts.
// Templates save the options with the template; a broadcast's are set on its
// Mautic email once the broadcast has been saved (BroadcastDeliveryOptionsPanel).

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";

import {
  getNewsletterCampaignDeliveryOptions,
  listNewsletterAssets,
  updateNewsletterCampaignDeliveryOptions,
} from "../../services/newsletterService";

const NAVY = "#1B2A4A";
const BORDER = "#E7ECEF";
export const UTM_FIELDS = [
  ["utmSource", "UTM source", "e.g. imaa-newsletter"],
  ["utmMedium", "UTM medium", "e.g. email"],
  ["utmCampaign", "UTM campaign", "e.g. november-2026"],
  ["utmContent", "UTM content", "Optional"],
];
const EMAIL_PATTERN = /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/;
const UTM_PATTERN = /^[A-Za-z0-9 ._~+\-|:/{}]*$/;
export const MAX_ATTACHMENTS = 10;

export const blankDeliveryOptions = () => ({
  replyToAddress: "",
  utmTags: Object.fromEntries(UTM_FIELDS.map(([key]) => [key, ""])),
  assetAttachments: [],
});

/** The options as the backend returns them on a template or broadcast. */
export const deliveryOptionsFrom = (source) => ({
  replyToAddress: source?.replyToAddress || "",
  utmTags: Object.fromEntries(UTM_FIELDS.map(([key]) => [key, source?.utmTags?.[key] || ""])),
  assetAttachments: (source?.assetAttachments || []).map((asset) => ({ id: String(asset.id), title: asset.title || `Asset ${asset.id}` })),
});

export const deliveryOptionsPayload = (value) => ({
  replyToAddress: value.replyToAddress.trim(),
  utmTags: Object.fromEntries(UTM_FIELDS.map(([key]) => [key, (value.utmTags[key] || "").trim()])),
  assetAttachments: value.assetAttachments.map((asset) => asset.id),
});

export function validateDeliveryOptions(value) {
  const errors = {};
  const replyTo = value.replyToAddress.trim();
  if (replyTo && !EMAIL_PATTERN.test(replyTo)) errors.replyToAddress = "Use one valid email address.";
  for (const [key, label] of UTM_FIELDS) {
    const text = (value.utmTags[key] || "").trim();
    if (text.length > 100 || !UTM_PATTERN.test(text)) {
      errors[key] = `${label}: letters, digits, spaces and . _ - + ~ | : / { } only (up to 100).`;
    }
  }
  if (value.assetAttachments.length > MAX_ATTACHMENTS) errors.assetAttachments = `Attach up to ${MAX_ATTACHMENTS} assets.`;
  return errors;
}

export function EmailDeliveryOptionsFields({ value, onChange, disabled = false, errors = {} }) {
  const [assets, setAssets] = useState({ loading: true, rows: [], error: "" });

  useEffect(() => {
    let active = true;
    listNewsletterAssets({ status: "published", page_size: 100 })
      .then((data) => active && setAssets({
        loading: false,
        error: "",
        rows: (data?.results || []).map((asset) => ({ id: String(asset.id), title: asset.title || `Asset ${asset.id}` })),
      }))
      .catch(() => active && setAssets({ loading: false, rows: [], error: "Assets could not be loaded; attachments cannot be changed now." }));
    return () => {
      active = false;
    };
  }, []);

  const set = (patch) => onChange({ ...value, ...patch });
  return (
    <Stack spacing={2} aria-label="Delivery options">
      <TextField label="Reply-To address" value={value.replyToAddress} onChange={(event) => set({ replyToAddress: event.target.value })}
        disabled={disabled} error={Boolean(errors.replyToAddress)}
        helperText={errors.replyToAddress || "Optional. Replies go here instead of the sender address."} fullWidth />
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: NAVY, mb: 1 }}>UTM tags</Typography>
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
          {UTM_FIELDS.map(([key, label, placeholder]) => (
            <TextField key={key} label={label} placeholder={placeholder} value={value.utmTags[key] || ""}
              onChange={(event) => set({ utmTags: { ...value.utmTags, [key]: event.target.value } })}
              disabled={disabled} error={Boolean(errors[key])} helperText={errors[key] || ""} />
          ))}
        </Box>
        <Typography variant="caption" color="text.secondary">Mautic adds these to every tracked link in the email.</Typography>
      </Box>
      <Autocomplete
        multiple
        options={assets.rows}
        value={value.assetAttachments}
        onChange={(_, chosen) => set({ assetAttachments: chosen })}
        getOptionLabel={(asset) => asset.title}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        disabled={disabled || Boolean(assets.error)}
        loading={assets.loading}
        renderInput={(params) => (
          <TextField {...params} label="Attachments" error={Boolean(errors.assetAttachments || assets.error)}
            helperText={errors.assetAttachments || assets.error || `Published assets sent as file attachments (up to ${MAX_ATTACHMENTS}).`} />
        )}
      />
    </Stack>
  );
}

const sameOptions = (a, b) => JSON.stringify(deliveryOptionsPayload(a)) === JSON.stringify(deliveryOptionsPayload(b));

export function BroadcastDeliveryOptionsPanel({ campaignUuid }) {
  const [state, setState] = useState({ loading: true, error: "", available: false, editable: false });
  const [saved, setSaved] = useState(blankDeliveryOptions());
  const [value, setValue] = useState(blankDeliveryOptions());
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  const apply = (data) => {
    const options = deliveryOptionsFrom(data);
    setSaved(options);
    setValue(options);
    setState({ loading: false, error: "", available: Boolean(data?.available), editable: Boolean(data?.editable) });
  };

  useEffect(() => {
    let active = true;
    getNewsletterCampaignDeliveryOptions(campaignUuid)
      .then((data) => active && apply(data))
      .catch((err) => active && setState({ loading: false, error: err?.response?.data?.detail || "Delivery options could not be loaded.", available: false, editable: false }));
    return () => {
      active = false;
    };
  }, [campaignUuid]);

  const save = async () => {
    const nextErrors = validateDeliveryOptions(value);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setSaving(true);
    setNotice(null);
    try {
      apply(await updateNewsletterCampaignDeliveryOptions(campaignUuid, deliveryOptionsPayload(value)));
      setNotice({ severity: "success", message: "Delivery options saved and confirmed in Mautic." });
    } catch (err) {
      const data = err?.response?.data;
      if (data?.errors) setErrors(Object.fromEntries(Object.entries(data.errors).map(([key, message]) => [key === "utmTags" ? "utmSource" : key, message])));
      setNotice({ severity: "error", message: data?.detail || "Delivery options could not be saved." });
    } finally {
      setSaving(false);
    }
  };

  const dirty = !sameOptions(value, saved);
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, borderColor: BORDER }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, color: NAVY }}>Delivery options</Typography>
          <Typography variant="body2" color="text.secondary">
            Reply-To, UTM tags and attachments are kept on the broadcast's Mautic email and shared by its A/B and language versions.
          </Typography>
        </Box>
        {state.loading ? <Skeleton variant="rounded" height={120} /> : state.error ? <Alert severity="warning">{state.error}</Alert> : !state.available ? (
          <Alert severity="info" variant="outlined">Save the broadcast first: delivery options are set on its Mautic email.</Alert>
        ) : (
          <>
            {!state.editable && <Alert severity="info" variant="outlined">Delivery options can only be changed while the broadcast is a draft.</Alert>}
            {notice && <Alert severity={notice.severity} onClose={() => setNotice(null)}>{notice.message}</Alert>}
            <EmailDeliveryOptionsFields value={value} onChange={setValue} disabled={!state.editable || saving} errors={errors} />
            {state.editable && (
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button onClick={() => { setValue(saved); setErrors({}); }} disabled={!dirty || saving} sx={{ textTransform: "none" }}>Reset</Button>
                <Button variant="contained" onClick={save} disabled={!dirty || saving}
                  startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null} sx={{ textTransform: "none" }}>
                  Save delivery options
                </Button>
              </Stack>
            )}
          </>
        )}
      </Stack>
    </Paper>
  );
}

/** `load` returns the backend's link-click summary for the email (family). */
export function EmailLinkClicksPanel({ load, title = "Link clicks" }) {
  const [state, setState] = useState({ loading: true, error: "", data: null });
  // Callers pass a fresh function each render: read it from a ref so the
  // clicks load once on mount (remount with a new key to change the email).
  const loadRef = useRef(load);
  loadRef.current = load;
  const refresh = useCallback(() => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    loadRef.current()
      .then((data) => setState({ loading: false, error: "", data }))
      .catch((err) => setState({ loading: false, error: err?.response?.data?.detail || "Link clicks could not be loaded.", data: null }));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const links = state.data?.links || [];
  const versions = useMemo(() => (state.data?.emailIds || []).length, [state.data]);
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, borderColor: BORDER }}>
      <Stack spacing={2}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: NAVY }}>{title}</Typography>
            <Typography variant="body2" color="text.secondary">
              Every tracked link with its total and unique clicks, as Mautic counts them{versions > 1 ? ", across all versions" : ""}.
            </Typography>
          </Box>
          <Button startIcon={<RefreshRoundedIcon />} onClick={refresh} disabled={state.loading} sx={{ textTransform: "none", alignSelf: "flex-start" }}>Refresh</Button>
        </Stack>
        {state.error && <Alert severity="warning">{state.error}</Alert>}
        {state.loading && !state.data ? <Skeleton variant="rounded" height={80} /> : !links.length && !state.error ? (
          <Typography color="text.secondary">No tracked link has been clicked yet.</Typography>
        ) : links.length > 0 && (
          <TableContainer>
            <Table size="small" aria-label="Link clicks">
              <TableHead>
                <TableRow sx={{ "& th": { fontWeight: 800, color: NAVY, bgcolor: "#F7F9FA" } }}>
                  <TableCell>Link</TableCell>
                  <TableCell align="right">Clicks</TableCell>
                  <TableCell align="right">Unique clicks</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {links.map((link) => (
                  <TableRow key={link.url}>
                    <TableCell sx={{ wordBreak: "break-all" }}>
                      <Typography variant="body2" component="span">{link.url}</Typography>
                      {versions > 1 && link.byEmail?.length > 0 && (
                        <Typography variant="caption" color="text.secondary" component="div">
                          {link.byEmail.map((version) => `${version.name || `#${version.emailId}`}: ${version.clicks}`).join(" · ")}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">{link.clicks}</TableCell>
                    <TableCell align="right">{link.uniqueClicks}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Stack>
    </Paper>
  );
}
