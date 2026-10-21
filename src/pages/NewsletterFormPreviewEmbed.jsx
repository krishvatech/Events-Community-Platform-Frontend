// Native Form preview and embed codes (read-only).
//
// Preview: the saved Form exactly as Mautic rendered it, in an iframe with an
// empty sandbox (no scripts, no forms, no same-origin) built from srcDoc, so
// nothing in it can run, submit, navigate this page or read its storage. For a
// published Form the live public page can also be opened in a separately
// sandboxed frame from Mautic's own (different) origin.
//
// Embed: Mautic's own embed codes, shown as text and copied verbatim. Nothing
// here publishes a Form or executes the embed script.

import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";

import { getNewsletterFormEmbed, getNewsletterFormPreview } from "../services/newsletterService";
import { NAVY, formatDateTime, getErrorMessage } from "./newsletterFormShared.jsx";

// Live frames load Mautic's page from Mautic's own origin; same-origin is only
// granted when that origin differs from ours, so the frame can never reach ECP.
export function liveFrameSandbox(url, ownOrigin = typeof window !== "undefined" ? window.location.origin : "") {
  let frameOrigin = "";
  try {
    frameOrigin = new URL(url).origin;
  } catch {
    return "";
  }
  const base = ["allow-scripts", "allow-forms"];
  return (frameOrigin && frameOrigin !== ownOrigin ? [...base, "allow-same-origin"] : base).join(" ");
}

// Where Mautic's stored Form HTML sends visitors' submissions, compared with
// Mautic's public address (site_url). A mismatch means submissions may be saved
// while visitors see no success message or redirect, or may not arrive at all.
const SUBMIT_ADDRESS_LABELS = {
  match: "Matches Mautic's public address",
  mismatch: "Does not match Mautic's public address",
  missing: "Not rendered yet",
  public_url_unavailable: "Cannot be checked",
};

export function submitAddressSeverity(submitAddress, published) {
  if (!submitAddress || submitAddress.status === "match") return null;
  if (submitAddress.status === "mismatch") return published ? "error" : "warning";
  return "info";
}

export function SubmitAddressStatus({ submitAddress, published, variant = "alert" }) {
  if (!submitAddress) return null;
  const label = SUBMIT_ADDRESS_LABELS[submitAddress.status] || submitAddress.status;
  if (variant === "text") {
    return (
      <span data-submit-address-status={submitAddress.status}>
        {label}
        {submitAddress.stored ? ` (${submitAddress.stored})` : ""}
      </span>
    );
  }
  const severity = submitAddressSeverity(submitAddress, published);
  if (!severity) return null;
  return (
    <Alert severity={severity} data-submit-address-status={submitAddress.status}>
      <strong>Submit address: {label}.</strong> {submitAddress.message}
      {submitAddress.status === "mismatch" && (
        <Box component="span" sx={{ display: "block", mt: 0.5, wordBreak: "break-all" }}>
          Stored: {submitAddress.stored} · Public: {submitAddress.expected}
        </Box>
      )}
    </Alert>
  );
}

function useLoad(open, loader, formId) {
  const [state, setState] = useState({ loading: false, data: null, error: "" });
  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    setState({ loading: true, data: null, error: "" });
    loader(formId)
      .then((data) => active && setState({ loading: false, data, error: "" }))
      .catch((err) => active && setState({ loading: false, data: null, error: getErrorMessage(err, "Mautic could not provide this right now.") }));
    return () => {
      active = false;
    };
  }, [open, loader, formId]);
  return state;
}

export function FormPreviewDialog({ formId, open, onClose }) {
  const { loading, data, error } = useLoad(open, getNewsletterFormPreview, formId);
  const [tab, setTab] = useState("saved");
  useEffect(() => {
    if (open) setTab("saved");
  }, [open]);
  const sandbox = data?.liveUrl ? liveFrameSandbox(data.liveUrl) : "";

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" aria-labelledby="form-preview-title">
      <DialogTitle id="form-preview-title">Preview Form{data?.name ? ` — ${data.name}` : ""}</DialogTitle>
      <DialogContent dividers>
        {loading && <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress aria-label="Loading preview" /></Stack>}
        {error && <Alert severity="error">{error}</Alert>}
        {data && (
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
              <Chip size="small" label={data.isLive ? "Published" : "Not published"} color={data.isLive ? "success" : "default"} />
              <Typography variant="body2" color="text.secondary">Last saved {formatDateTime(data.savedAt)}</Typography>
            </Stack>
            <Alert severity="info">{data.note}</Alert>
            <Tabs value={tab} onChange={(_, value) => setTab(value)} aria-label="Preview type">
              <Tab value="saved" label="Saved form" />
              <Tab value="live" label="Live public form" disabled={!data.liveUrl} />
            </Tabs>
            {tab === "saved" && (
              <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1, overflow: "hidden" }}>
                <iframe
                  title="Native form preview"
                  srcDoc={data.document}
                  sandbox=""
                  referrerPolicy="no-referrer"
                  style={{ width: "100%", height: 520, border: 0, display: "block", background: "#fff" }}
                />
              </Box>
            )}
            {tab === "live" && data.liveUrl && (
              <Stack spacing={1}>
                <Alert severity="warning">
                  This is the real published Form. Submitting it here creates a real submission in Mautic and runs its actions.
                </Alert>
                <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1, overflow: "hidden" }}>
                  <iframe
                    title="Live public form"
                    src={data.liveUrl}
                    sandbox={sandbox}
                    referrerPolicy="no-referrer"
                    style={{ width: "100%", height: 520, border: 0, display: "block", background: "#fff" }}
                  />
                </Box>
              </Stack>
            )}
            {!data.isLive && (
              <Typography variant="body2" color="text.secondary">
                This Form must be published before a native public preview is available. The saved preview above is rendered
                from Mautic&apos;s stored version and is not public.
              </Typography>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        {data?.liveUrl && (
          <Button component="a" href={data.liveUrl} target="_blank" rel="noopener noreferrer" startIcon={<OpenInNewRoundedIcon />}>
            Open public form
          </Button>
        )}
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

export function FormEmbedDialog({ formId, open, onClose }) {
  const { loading, data, error } = useLoad(open, getNewsletterFormEmbed, formId);
  const [copied, setCopied] = useState("");
  const [copyError, setCopyError] = useState("");

  const copy = async (method) => {
    setCopyError("");
    try {
      await navigator.clipboard.writeText(method.code);
      setCopied(method.method);
    } catch {
      setCopyError("Copying is blocked in this browser. Select the code and copy it manually.");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" aria-labelledby="form-embed-title">
      <DialogTitle id="form-embed-title">Embed Form</DialogTitle>
      <DialogContent dividers>
        {loading && <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress aria-label="Loading embed codes" /></Stack>}
        {error && <Alert severity="error">{error}</Alert>}
        {data && (
          <Stack spacing={2}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap" useFlexGap alignItems={{ sm: "center" }}>
              <Typography sx={{ fontWeight: 800, color: NAVY, wordBreak: "break-word" }}>{data.name}</Typography>
              <Chip size="small" label={`Form #${data.formId}`} />
              <Chip size="small" label={data.isLive ? "Published" : "Not published"} color={data.isLive ? "success" : "default"} />
            </Stack>
            {data.warnings.map((warning) => <Alert key={warning} severity="warning">{warning}</Alert>)}
            {data.submitAddress && (
              <Typography variant="body2" color="text.secondary">
                Submit address: <SubmitAddressStatus submitAddress={data.submitAddress} variant="text" />
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary">
              Paste one of these native Mautic codes into your website. Visitors submit straight to Mautic; this page never publishes the Form.
            </Typography>
            {copyError && <Alert severity="error">{copyError}</Alert>}
            {data.methods.map((method) => (
              <Stack key={method.method} spacing={1}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                  <Typography component="h3" variant="subtitle2" sx={{ fontWeight: 800, color: NAVY }}>{method.label}</Typography>
                  <Button size="small" startIcon={<ContentCopyRoundedIcon />} onClick={() => copy(method)} sx={{ textTransform: "none", flexShrink: 0 }}
                    aria-label={`Copy ${method.label} code`}>
                    {copied === method.method ? "Copied" : "Copy code"}
                  </Button>
                </Stack>
                <Box component="pre" data-embed-method={method.method}
                  sx={{ m: 0, p: 1.5, bgcolor: "#F7F9FA", border: 1, borderColor: "divider", borderRadius: 1, fontSize: 13, whiteSpace: "pre-wrap", wordBreak: "break-all", overflowWrap: "anywhere" }}>
                  {method.code}
                </Box>
                <Typography variant="body2" color="text.secondary">{method.help}</Typography>
              </Stack>
            ))}
            <Typography variant="body2" color="text.secondary">
              Public Form address:{" "}
              <Link href={data.formUrl} target="_blank" rel="noopener noreferrer" sx={{ wordBreak: "break-all" }}>{data.formUrl}</Link>
            </Typography>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
