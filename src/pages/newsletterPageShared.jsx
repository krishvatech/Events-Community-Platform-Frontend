// Shared pieces of the Marketing Hub Landing Pages (list, details, editor).
// Pages live in Mautic and are served from its public address (site_url/alias).
// Every write runs as the admin's own Mautic user through newsletterService.
// Head/footer scripts and preference-center pages are never edited here.
// Unpublished pages answer 403 Forbidden unless a redirect is set.

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
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import {
  deleteNewsletterPage,
  duplicateNewsletterPage,
  getNewsletterPageUsage,
  publishNewsletterPage,
  unpublishNewsletterPage,
} from "../services/newsletterService";
import { getErrorMessage } from "./newsletterTemplateShared.jsx";

export { CARD_BORDER, NAVY, PAGE_SIZE, formatDateTime, getErrorMessage } from "./newsletterTemplateShared.jsx";

export const PAGES_PATH = "/admin/newsletter/pages";
export const PAGE_NEW_PATH = `${PAGES_PATH}/new`;
export const pageDetailsPath = (id) => `${PAGES_PATH}/${encodeURIComponent(id)}`;
export const pageEditPath = (id) => `${pageDetailsPath(id)}/edit`;

/** Mautic page IDs are positive integers; anything else never reaches the API. */
export const isValidPageId = (value) => /^[1-9]\d{0,17}$/.test(String(value || ""));

// Mirrors the backend limits so mistakes show before a save is attempted.
export const TITLE_MAX_LENGTH = 191;
export const ALIAS_MAX_LENGTH = 191;
export const META_DESCRIPTION_MAX_LENGTH = 255;
export const REDIRECT_URL_MAX_LENGTH = 2048;
export const HTML_MAX_LENGTH = 1000000;

// First path segments Mautic serves itself (see page_views.RESERVED_ALIASES).
export const RESERVED_ALIASES = new Set([
  "api", "app", "asset", "dwc", "ecp", "email", "focus", "form", "index", "installer", "login", "logout",
  "mautic", "media", "mtc", "notification", "oauth", "oauth2", "p", "page", "passwordreset", "plugins",
  "r", "redirect", "s", "saml", "themes",
]);

export const REDIRECT_TYPES = [
  { value: "", label: "No redirect" },
  { value: "301", label: "301 — Moved permanently" },
  { value: "302", label: "302 — Found (temporary)" },
  { value: "303", label: "303 — See other (temporary)" },
  { value: "307", label: "307 — Temporary redirect" },
  { value: "308", label: "308 — Permanent redirect" },
];

export const starterPageHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Landing page</title>
  <style>
    body { margin: 0; font-family: Arial, sans-serif; color: #1B2A4A; background: #ffffff; }
    main { max-width: 760px; margin: 0 auto; padding: 48px 24px; }
    h1 { font-size: 36px; line-height: 1.2; margin: 0 0 16px; }
    p { font-size: 18px; line-height: 1.6; margin: 0 0 24px; }
  </style>
</head>
<body>
  <main>
    <h1>Your headline</h1>
    <p>Describe the offer or event here.</p>
  </main>
</body>
</html>`;

export const blankPage = {
  title: "",
  alias: "",
  customHtml: starterPageHtml,
  metaDescription: "",
  noIndex: false,
  language: "en",
  category: "",
  redirectType: "",
  redirectUrl: "",
};

export const pageToDraft = (page) => ({
  title: page?.title || "",
  alias: page?.alias || "",
  customHtml: page?.customHtml || "",
  metaDescription: page?.metaDescription || "",
  noIndex: Boolean(page?.noIndex),
  language: page?.language || "en",
  category: page?.category?.id ? String(page.category.id) : "",
  redirectType: REDIRECT_TYPES.some((option) => option.value === String(page?.redirectType || "")) ? String(page?.redirectType || "") : "",
  redirectUrl: page?.redirectUrl || "",
});

/** A URL-safe alias suggestion from a title: lowercase words joined by single hyphens. */
export function slugifyAlias(title) {
  return String(title || "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, ALIAS_MAX_LENGTH)
    .replace(/-+$/g, "");
}

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
const ALIAS_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LANGUAGE_PATTERN = /^[a-z]{2,3}(?:_[A-Z]{2})?$/;

export function validateRedirectUrl(value) {
  const url = String(value || "").trim();
  if (!url) return "Enter the address visitors are redirected to.";
  if (url.length > REDIRECT_URL_MAX_LENGTH) return `Redirect URL must be ${REDIRECT_URL_MAX_LENGTH} characters or fewer.`;
  if (/\s/.test(url) || /[{}]/.test(url)) return "Redirect URL cannot contain spaces or Mautic tokens.";
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return "Redirect URL must be a full http:// or https:// address.";
  }
  if (!["http:", "https:"].includes(parsed.protocol) || !parsed.hostname) return "Redirect URL must be a full http:// or https:// address.";
  if (parsed.username || parsed.password) return "Redirect URL cannot contain a username or password.";
  return "";
}

/** Field errors for a draft, keyed like the backend's `errors`. */
export function validatePageDraft(draft, { isNew = false } = {}) {
  const errors = {};
  const title = String(draft?.title || "").trim();
  if (!title) errors.title = "Page title is required.";
  else if (title.length > TITLE_MAX_LENGTH) errors.title = `Page title must be ${TITLE_MAX_LENGTH} characters or fewer.`;
  else if (CONTROL_CHARS.test(title)) errors.title = "Page title contains unsupported characters.";

  const alias = String(draft?.alias || "").trim();
  if (!alias) {
    if (!isNew) errors.alias = "Page URL is required.";
  } else if (alias.length > ALIAS_MAX_LENGTH) errors.alias = `Page URL must be ${ALIAS_MAX_LENGTH} characters or fewer.`;
  else if (!ALIAS_PATTERN.test(alias)) errors.alias = "Page URL may use lowercase letters, numbers and single hyphens only.";
  else if (RESERVED_ALIASES.has(alias)) errors.alias = `"${alias}" is used by Mautic itself. Choose another page URL.`;

  if (String(draft?.customHtml || "").length > HTML_MAX_LENGTH) errors.customHtml = "Page HTML is too large.";
  if (String(draft?.metaDescription || "").trim().length > META_DESCRIPTION_MAX_LENGTH) {
    errors.metaDescription = `Meta description must be ${META_DESCRIPTION_MAX_LENGTH} characters or fewer.`;
  }
  if (!LANGUAGE_PATTERN.test(String(draft?.language || ""))) errors.language = "Language must be a locale code such as en or en_US.";
  if (draft?.redirectType) {
    const problem = validateRedirectUrl(draft.redirectUrl);
    if (problem) errors.redirectUrl = problem;
  }
  return errors;
}

/**
 * The request body for a save: every setting for a create (an empty alias is
 * left to Mautic), only what changed for an edit. Never publication.
 */
export function draftToPayload(draft, original = null) {
  const clean = {
    title: String(draft.title || "").trim(),
    alias: String(draft.alias || "").trim(),
    customHtml: String(draft.customHtml || ""),
    metaDescription: String(draft.metaDescription || "").trim(),
    noIndex: Boolean(draft.noIndex),
    language: String(draft.language || "").trim(),
    category: draft.category ? String(draft.category) : "",
    redirectType: draft.redirectType || "",
    redirectUrl: draft.redirectType ? String(draft.redirectUrl || "").trim() : "",
  };
  if (!original) {
    const { alias, category, redirectType, redirectUrl, ...rest } = clean;
    return {
      ...rest,
      ...(alias ? { alias } : {}),
      ...(category ? { category } : {}),
      ...(redirectType ? { redirectType, redirectUrl } : {}),
    };
  }
  const before = pageToDraft(original);
  const payload = {};
  for (const key of ["title", "alias", "customHtml", "metaDescription", "noIndex", "language", "category"]) {
    const previous = typeof before[key] === "string" && key !== "customHtml" ? before[key].trim() : before[key];
    if (clean[key] !== previous) payload[key] = clean[key];
  }
  if (clean.redirectType !== before.redirectType || clean.redirectUrl !== before.redirectUrl.trim()) {
    payload.redirectType = clean.redirectType;
    payload.redirectUrl = clean.redirectUrl;
  }
  if (original.htmlLocked) delete payload.customHtml;
  return payload;
}

/** A page-level load failure, worded for what the admin can do about it. */
export const describePageLoadError = (err) => {
  const statusCode = err?.response?.status;
  if (!err?.response) return { title: "We could not reach the server.", detail: "Check your connection and try again.", retry: true };
  if (statusCode === 404) return { title: "Landing page not found.", detail: "This page does not exist in Mautic.", retry: false };
  if (statusCode === 400) return { title: "Invalid landing page link.", detail: getErrorMessage(err, "Landing page links use a numeric Mautic page ID."), retry: false };
  if (statusCode === 401 || statusCode === 403) return { title: "You do not have access to Landing Pages.", detail: "Marketing Hub access is required. Your session may also have expired.", retry: false };
  if (statusCode >= 500) return { title: "Mautic is unavailable right now.", detail: getErrorMessage(err, "Try again in a moment."), retry: true };
  return { title: "We could not load this landing page.", detail: getErrorMessage(err), retry: true };
};

export function PageStatusChip({ page, size = "small" }) {
  if (page?.isPreferenceCenter) {
    return <Chip size={size} label="Preference center" color="info" variant="outlined" sx={{ fontWeight: 800 }} />;
  }
  const published = Boolean(page?.isPublished);
  return (
    <Chip
      size={size}
      label={published ? "Published" : "Unpublished"}
      color={published ? "success" : "default"}
      variant={published ? "filled" : "outlined"}
      sx={{ fontWeight: 800 }}
    />
  );
}

/**
 * Confirms, then publishes or unpublishes a page. `onDone` receives the page
 * as the backend read it back from Mautic; `onRefresh` receives the verified
 * state reported with a failure, and the dialog stays open to show why.
 */
export function PagePublicationDialog({ page, open, onClose, onDone, onRefresh }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const publishing = !page?.isPublished;
  const label = page?.title || `Page #${page?.id}`;

  const close = () => {
    if (busy) return;
    setError("");
    onClose();
  };

  const confirm = async () => {
    setBusy(true);
    setError("");
    try {
      const saved = publishing ? await publishNewsletterPage(page.id) : await unpublishNewsletterPage(page.id);
      onDone(saved, publishing ? "Landing page published." : "Landing page unpublished.");
    } catch (err) {
      const data = err?.response?.data;
      if (data?.page) onRefresh?.(data.page);
      setError(getErrorMessage(err, publishing ? "The page could not be published." : "The page could not be unpublished."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={close} maxWidth="xs" fullWidth>
      <DialogTitle>{publishing ? "Publish landing page?" : "Unpublish landing page?"}</DialogTitle>
      <DialogContent>
        <Typography color="text.secondary" sx={{ mb: error ? 2 : 0 }}>
          {publishing
            ? `"${label}" will be live for anyone with its link${page?.publicUrl ? ` (${page.publicUrl})` : ""}.`
            : `"${label}" will stop being shown. ${page?.redirectType ? "Visitors are redirected to its redirect address." : "Visitors will see Mautic's access-denied (403) page."}`}
        </Typography>
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={close} disabled={busy}>Cancel</Button>
        <Button
          variant="contained"
          color={publishing ? "primary" : "warning"}
          onClick={confirm}
          disabled={busy}
          startIcon={busy ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {publishing ? "Publish" : "Unpublish"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** Asks for the copy's title (Mautic picks a unique URL), then duplicates. */
export function PageDuplicateDialog({ page, open, onClose, onDuplicated }) {
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setTitle(page?.title ? `${page.title} Copy` : "");
    setError("");
  }, [open, page?.title]);

  const close = () => {
    if (busy) return;
    onClose();
  };

  const confirm = async () => {
    const clean = title.trim();
    if (clean.length > TITLE_MAX_LENGTH) {
      setError(`Page title must be ${TITLE_MAX_LENGTH} characters or fewer.`);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const copy = await duplicateNewsletterPage(page.id, clean ? { title: clean } : {});
      onDuplicated(copy, `Copy "${copy?.title || clean}" created (unpublished).`);
    } catch (err) {
      setError(getErrorMessage(err, "The page could not be duplicated."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={close} maxWidth="xs" fullWidth>
      <DialogTitle>Duplicate landing page?</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label="Title of the copy"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            fullWidth
            slotProps={{ htmlInput: { maxLength: TITLE_MAX_LENGTH } }}
            helperText="The copy starts unpublished with its own URL."
          />
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close} disabled={busy}>Cancel</Button>
        <Button variant="contained" onClick={confirm} disabled={busy} startIcon={busy ? <CircularProgress size={16} color="inherit" /> : null}>
          Duplicate
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** Plain-language lines for whatever stops a delete (the backend's `blocking`). */
export function describeBlocking(blocking) {
  const lines = [];
  const named = (rows) => rows.map((row) => `${row.name || "Untitled"} (#${row.id})`).join(", ");
  if (blocking?.campaigns?.length) lines.push(`Campaigns: ${named(blocking.campaigns)}`);
  if (blocking?.preferenceCenterEmails?.length) lines.push(`Preference center of Emails: ${named(blocking.preferenceCenterEmails)}`);
  if (blocking?.children) {
    const { variants = 0, translations = 0 } = blocking.children;
    lines.push(`${variants} A/B variant${variants === 1 ? "" : "s"} and ${translations} translation${translations === 1 ? "" : "s"} (managed in Mautic)`);
  }
  return lines;
}

export function pageDeleteErrorMessage(err) {
  if (err?.response?.data?.code === "mautic_permission_denied") {
    return "Your Mautic role does not allow deleting this page. Mautic lets you delete pages you created; deleting other people's pages needs that permission in your Mautic role.";
  }
  return getErrorMessage(err, "The landing page could not be deleted.");
}

/**
 * Checks where the page is used, then confirms and deletes it. Mautic decides
 * whether this admin may delete it; a page still in use cannot be deleted.
 */
export function PageDeleteDialog({ page, open, onClose, onDeleted }) {
  const [usage, setUsage] = useState({ loading: false, data: null, error: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [blockedBy, setBlockedBy] = useState(null);
  const label = page?.title || (page?.id ? `Page #${page.id}` : "This page");

  useEffect(() => {
    if (!open || !page?.id) return undefined;
    let active = true;
    setError("");
    setBlockedBy(null);
    setUsage({ loading: true, data: null, error: "" });
    getNewsletterPageUsage(page.id)
      .then((data) => active && setUsage({ loading: false, data, error: "" }))
      .catch((err) => active && setUsage({ loading: false, data: null, error: getErrorMessage(err, "Where this page is used could not be checked.") }));
    return () => {
      active = false;
    };
  }, [open, page?.id]);

  const close = () => {
    if (busy) return;
    onClose();
  };

  const blocking = describeBlocking(blockedBy || usage.data?.blocking);
  const pointActions = Array.isArray(usage.data?.pointActions) ? usage.data.pointActions : [];
  const canDelete = !usage.loading && !usage.error && blocking.length === 0;

  const confirm = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await deleteNewsletterPage(page.id);
      onDeleted(result, `Landing page "${result?.title || label}" deleted.`);
    } catch (err) {
      const used = err?.response?.data?.blocking;
      if (used && typeof used === "object") setBlockedBy(used);
      setError(pageDeleteErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={close} maxWidth="sm" fullWidth>
      <DialogTitle>Delete landing page?</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Typography color="text.secondary">
            {`"${label}" will be deleted from Mautic and its link will stop working. This cannot be undone here.`}
          </Typography>
          {usage.loading && (
            <Stack direction="row" spacing={1} alignItems="center">
              <CircularProgress size={16} />
              <Typography variant="body2" color="text.secondary">Checking where this page is used…</Typography>
            </Stack>
          )}
          {usage.error && <Alert severity="warning">{usage.error} Nothing can be deleted until it is checked.</Alert>}
          {blocking.length > 0 && (
            <Alert severity="warning">
              <strong>This page is still in use and cannot be deleted.</strong> Remove it from these first:
              <Box component="ul" sx={{ m: 0, mt: 0.5, pl: 2.5 }}>
                {blocking.map((line) => <li key={line}>{line}</li>)}
              </Box>
            </Alert>
          )}
          {canDelete && pointActions.length > 0 && (
            <Typography variant="body2" color="text.secondary">
              {`Point action${pointActions.length === 1 ? "" : "s"} ${pointActions.map((p) => `"${p.name}"`).join(", ")} will no longer award points for it.`}
            </Typography>
          )}
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close} disabled={busy}>Cancel</Button>
        <Button
          variant="contained"
          color="error"
          onClick={confirm}
          disabled={busy || !canDelete}
          startIcon={busy ? <CircularProgress size={16} color="inherit" /> : null}
        >
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}
