// Shared pieces of the Marketing Hub Templates pages (list, details, editor).
// Templates live in Mautic; every call goes through the existing
// newsletterService endpoints, which keep identity assertions and audit logging.

import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import SendRoundedIcon from "@mui/icons-material/SendRounded";

import {
  deleteNewsletterTemplate,
  duplicateNewsletterTemplate,
  getNewsletterTemplateUsage,
  listNewsletterTemplateCategories,
  listNewsletterTemplateThemes,
  listNewsletterTemplateTokens,
  testSendNewsletterTemplate,
} from "../services/newsletterService";

export const TEMPLATES_PATH = "/admin/newsletter/templates";
export const TEMPLATE_NEW_PATH = `${TEMPLATES_PATH}/new`;
export const templateDetailsPath = (id) => `${TEMPLATES_PATH}/${encodeURIComponent(id)}`;
export const templateEditPath = (id) => `${templateDetailsPath(id)}/edit`;

/** Mautic email IDs are positive integers; anything else never reaches the API. */
export const isValidTemplateId = (value) => /^[1-9]\d{0,17}$/.test(String(value || ""));

export const PAGE_SIZE = 25;
export const NAVY = "#1B2A4A";
export const CARD_BORDER = "#E7ECEF";

export const starterHtml = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-family: Arial, sans-serif; color: #1B2A4A; background: #ffffff;">
  <tr>
    <td style="padding: 24px;">
      <h1 style="margin: 0 0 16px; font-size: 28px; line-height: 1.25;">Newsletter headline</h1>
      <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6;">Write your reusable newsletter content here.</p>
    </td>
  </tr>
</table>`;

export const starterPlainText = `Newsletter headline

Write your reusable newsletter content here.`;

export const blankTemplate = {
  name: "",
  subject: "",
  preheaderText: "",
  fromName: "IMAA Connect",
  fromAddress: "eventncommunity@gmail.com",
  plainText: starterPlainText,
  customHtml: starterHtml,
  isPublished: false,
  category: "",
  template: "",
};

export const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const getErrorMessage = (err, fallback = "Something went wrong. Please try again.") => {
  const data = err?.response?.data;
  if (!data) return err?.message || fallback;
  if (typeof data === "string") return data;
  if (data.detail) return data.detail;
  if (data.error) return data.error;
  const firstKey = Object.keys(data)[0];
  const firstValue = firstKey ? data[firstKey] : null;
  if (Array.isArray(firstValue)) return `${firstKey}: ${firstValue.join(", ")}`;
  if (firstValue) return `${firstKey}: ${firstValue}`;
  return fallback;
};

/** A page-level load failure, worded for what the admin can do about it. */
export const describeLoadError = (err, what = "this Template") => {
  const statusCode = err?.response?.status;
  if (!err?.response) return { title: "We could not reach the server.", detail: "Check your connection and try again.", retry: true };
  if (statusCode === 404) return { title: "Template not found.", detail: `${what} does not exist in Mautic, or it is not a reusable Template.`, retry: false };
  if (statusCode === 401 || statusCode === 403) return { title: "You do not have access to this Template.", detail: "Marketing Hub access is required. Your session may also have expired.", retry: false };
  if (statusCode >= 500) return { title: "Mautic is unavailable right now.", detail: getErrorMessage(err, "Try again in a moment."), retry: true };
  return { title: `We could not load ${what}.`, detail: getErrorMessage(err), retry: true };
};

export const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const templateToForm = (template) => ({
  name: template?.name || "",
  subject: template?.subject || "",
  preheaderText: template?.preheaderText || "",
  fromName: template?.fromName || "",
  fromAddress: template?.fromAddress || "",
  plainText: template?.plainText || "",
  customHtml: template?.customHtml || "",
  isPublished: Boolean(template?.isPublished),
  category: template?.category?.id || "",
  template: template?.template || "",
});

export const tokenGroups = (tokens) =>
  (Array.isArray(tokens) ? tokens : []).reduce((groups, token) => {
    const group = token.group || "Tokens";
    return {
      ...groups,
      [group]: [...(groups[group] || []), token],
    };
  }, {});

// Mirrors the backend's own refusal, so the button explains itself instead of
// offering a send that can only be rejected.
export const templateTestSendBlocker = (template) => {
  if (!String(template?.subject || "").trim()) return "Add a subject before sending a test email";
  if (!String(template?.customHtml || "").trim() && !String(template?.plainText || "").trim()) {
    return "Add HTML or plain-text content before sending a test email";
  }
  return "";
};

/** Tokens, email categories and themes for Template forms; loaded once per page. */
export function useTemplateMetadata() {
  const [metadata, setMetadata] = useState({ tokens: [], categories: [], themes: [], loaded: false });
  useEffect(() => {
    let cancelled = false;
    Promise.all([listNewsletterTemplateTokens(), listNewsletterTemplateCategories(), listNewsletterTemplateThemes()])
      .then(([tokenData, categoryData, themeData]) => {
        if (cancelled) return;
        setMetadata({
          tokens: Array.isArray(tokenData?.results) ? tokenData.results : [],
          categories: Array.isArray(categoryData?.results) ? categoryData.results : [],
          themes: Array.isArray(themeData?.results) ? themeData.results : [],
          loaded: true,
        });
      })
      .catch(() => {
        // Loaded, just empty: the forms and editors work without metadata.
        if (!cancelled) setMetadata({ tokens: [], categories: [], themes: [], loaded: true });
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return metadata;
}

export function TemplateStatusChip({ published, size = "small" }) {
  return (
    <Chip
      size={size}
      label={published ? "Published" : "Draft"}
      color={published ? "success" : "default"}
      variant={published ? "filled" : "outlined"}
      sx={{ fontWeight: 800 }}
    />
  );
}

/**
 * Duplicates a Template through the existing guarded endpoint. One request
 * per click; resolves to the new Template or null on failure.
 */
export function useTemplateDuplicate({ onError }) {
  const inFlight = useRef(false);
  const [duplicatingId, setDuplicatingId] = useState("");
  const duplicate = async (template) => {
    if (!template?.id || inFlight.current) return null;
    inFlight.current = true;
    setDuplicatingId(String(template.id));
    try {
      return await duplicateNewsletterTemplate(template.id);
    } catch (err) {
      onError?.(
        err?.response
          ? getErrorMessage(err, "We could not duplicate this Template.")
          : "We could not reach the server. Check your connection and try again."
      );
      return null;
    } finally {
      inFlight.current = false;
      setDuplicatingId("");
    }
  };
  return { duplicate, duplicatingId };
}

/**
 * Delete confirmation. Mautic's own validation remains the dependency guard,
 * and the dialog says so: ECP cannot verify Template usage.
 */
export function TemplateDeleteDialog({ template, open, onClose, onDeleted }) {
  const [state, setState] = useState({ loading: false, usage: null, error: "" });

  useEffect(() => {
    if (!open || !template?.id) return undefined;
    let active = true;
    setState({ loading: true, usage: null, error: "" });
    getNewsletterTemplateUsage(template.id)
      .then((usage) => active && setState({ loading: false, usage, error: "" }))
      .catch((err) => active && setState({ loading: false, usage: null, error: getErrorMessage(err, "Template usage could not be checked.") }));
    return () => {
      active = false;
    };
  }, [open, template?.id]);

  const confirm = async () => {
    if (!template?.id || state.loading) return;
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      await deleteNewsletterTemplate(template.id);
      setState({ loading: false, usage: null, error: "" });
      onDeleted(template);
    } catch (err) {
      setState((current) => ({ ...current, loading: false, error: getErrorMessage(err, "We could not delete this Template.") }));
    }
  };

  return (
    <Dialog open={open} onClose={state.loading ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Delete Newsletter Template?</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {state.error && <Alert severity="error">{state.error}</Alert>}
          {state.loading ? (
            <Skeleton height={54} />
          ) : state.usage?.available === false ? (
            <Alert severity="warning" variant="outlined">
              Mautic REST does not expose template dependency usage here. Delete
              will be attempted through Mautic, and provider validation remains the guard.
            </Alert>
          ) : null}
          <Typography>
            Delete <strong>{template?.name || "this Template"}</strong> from native Mautic?
          </Typography>
          <Alert severity="warning" variant="outlined">
            This permanently deletes the provider Template. Campaign history is separate,
            but do not delete a Template that another Mautic automation still relies on.
          </Alert>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={state.loading}>Cancel</Button>
        <Button color="error" variant="contained" onClick={confirm} disabled={state.loading}>
          {state.loading ? <CircularProgress size={20} color="inherit" /> : "Delete"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/**
 * Inline Test Send. Sends one temporary copy of the saved Template to one
 * address through the existing Mautic test-send endpoint; never on page load.
 */
export function TemplateTestSendPanel({ template, inputRef, onSent }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sentTo, setSentTo] = useState("");
  // Guards the request itself: a fast second click could otherwise start a
  // second send before `loading` re-renders.
  const inFlight = useRef(false);

  const trimmed = email.trim();
  const invalid = Boolean(trimmed) && !emailPattern.test(trimmed);
  const blocker = templateTestSendBlocker(template);

  const send = async () => {
    if (!template?.id || !trimmed || invalid || blocker || inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    setError("");
    setSentTo("");
    try {
      const result = await testSendNewsletterTemplate(template.id, trimmed);
      const recipient = result?.recipient_email || trimmed;
      setSentTo(recipient);
      onSent?.(recipient);
    } catch (err) {
      setError(
        err?.response
          ? getErrorMessage(err, "We could not send this test email.")
          : "We could not reach the server. Check your connection and try again."
      );
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, borderColor: CARD_BORDER }} component="section" aria-label="Send Test Email">
      <Stack spacing={2}>
        <Typography variant="h6" sx={{ fontWeight: 800, color: NAVY }}>Send Test Email</Typography>
        <Typography color="text.secondary">
          Send the saved version of <strong>{template?.name || "this Template"}</strong> once to one
          address. A temporary copy is sent, so this Template&apos;s own sent and read counts do not change.
        </Typography>
        {blocker && <Alert severity="info">{blocker}.</Alert>}
        {error && <Alert severity="error">{error}</Alert>}
        {sentTo && <Alert severity="success">Test email sent to {sentTo}.</Alert>}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "flex-start" }}>
          <TextField
            label="Recipient Email"
            type="email"
            size="small"
            value={email}
            inputRef={inputRef}
            onChange={(event) => {
              setEmail(event.target.value);
              setError("");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                send();
              }
            }}
            error={invalid}
            helperText={invalid ? "Enter a valid email address." : " "}
            disabled={loading || Boolean(blocker)}
            sx={{ minWidth: { sm: 320 } }}
          />
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <SendRoundedIcon />}
            onClick={send}
            disabled={loading || !trimmed || invalid || Boolean(blocker)}
            sx={{ textTransform: "none", minHeight: 40 }}
          >
            Send Test
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
