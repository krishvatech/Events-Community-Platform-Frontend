// Shared pieces of the Marketing Hub Forms pages (list, details, editor).
// Forms live in Mautic. Basic settings, publication and supported fields are
// managed here (fields through NewsletterFormFieldBuilder); submit actions are
// shown read-only and never sent. Every write runs as the admin's own Mautic
// user through newsletterService.

import React, { useState } from "react";
import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";

import { publishNewsletterForm, unpublishNewsletterForm } from "../services/newsletterService";
import { getErrorMessage } from "./newsletterTemplateShared.jsx";

export { CARD_BORDER, NAVY, PAGE_SIZE, formatDateTime, getErrorMessage } from "./newsletterTemplateShared.jsx";

export const FORMS_PATH = "/admin/newsletter/forms";
export const FORM_NEW_PATH = `${FORMS_PATH}/new`;
export const formDetailsPath = (id) => `${FORMS_PATH}/${encodeURIComponent(id)}`;
export const formEditPath = (id) => `${formDetailsPath(id)}/edit`;

/** Mautic Form IDs are positive integers; anything else never reaches the API. */
export const isValidFormId = (value) => /^[1-9]\d{0,17}$/.test(String(value || ""));

// Mirrors the backend limits so mistakes show before a save is attempted.
export const NAME_MAX_LENGTH = 191;
export const DESCRIPTION_MAX_LENGTH = 2000;
export const MESSAGE_MAX_LENGTH = 2000;
export const REDIRECT_MAX_LENGTH = 2048;

export const POST_ACTIONS = [
  { value: "message", label: "Show a message", help: "Visitors stay on the page and see your message." },
  { value: "hideform", label: "Hide the form and show a message", help: "The Form disappears and your message is shown in its place." },
  { value: "redirect", label: "Redirect to a URL", help: "Visitors are sent to another web address." },
  { value: "return", label: "Return to the page", help: "Visitors return to the page the Form is on." },
];

export const postActionLabel = (value) => POST_ACTIONS.find((option) => option.value === value)?.label || "Show a message";

export const blankForm = { name: "", description: "", postAction: "message", postActionProperty: "" };

export const formToDraft = (form) => ({
  name: form?.name || "",
  description: form?.description || "",
  postAction: POST_ACTIONS.some((option) => option.value === form?.postAction) ? form.postAction : "message",
  postActionProperty: form?.postAction === "return" ? "" : form?.postActionProperty || "",
});

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

export function validateRedirectUrl(value) {
  const url = String(value || "").trim();
  if (!url) return "Enter the web address visitors go to after submitting.";
  if (url.length > REDIRECT_MAX_LENGTH) return `Redirect URL must be ${REDIRECT_MAX_LENGTH} characters or fewer.`;
  if (/\s/.test(url) || /[{}]/.test(url)) return "Redirect URL cannot contain spaces or Mautic tokens.";
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return "Redirect URL must be a full http:// or https:// address.";
  }
  if (!["http:", "https:"].includes(parsed.protocol) || !parsed.hostname) {
    return "Redirect URL must be a full http:// or https:// address.";
  }
  if (parsed.username || parsed.password) return "Redirect URL cannot contain a username or password.";
  return "";
}

/** Field errors for a draft, keyed like the backend's `errors`. */
export function validateFormDraft(draft) {
  const errors = {};
  const name = String(draft?.name || "").trim();
  if (!name) errors.name = "Form name is required.";
  else if (name.length > NAME_MAX_LENGTH) errors.name = `Form name must be ${NAME_MAX_LENGTH} characters or fewer.`;
  else if (CONTROL_CHARS.test(name)) errors.name = "Form name contains unsupported characters.";
  if (String(draft?.description || "").trim().length > DESCRIPTION_MAX_LENGTH) {
    errors.description = `Description must be ${DESCRIPTION_MAX_LENGTH} characters or fewer.`;
  }
  const property = String(draft?.postActionProperty || "").trim();
  if (draft?.postAction === "message" || draft?.postAction === "hideform") {
    if (!property) errors.postActionProperty = "Enter the message visitors see after submitting.";
    else if (property.length > MESSAGE_MAX_LENGTH) errors.postActionProperty = `Message must be ${MESSAGE_MAX_LENGTH} characters or fewer.`;
  } else if (draft?.postAction === "redirect") {
    const problem = validateRedirectUrl(property);
    if (problem) errors.postActionProperty = problem;
  } else if (draft?.postAction !== "return") {
    errors.postAction = "Choose what happens after submit.";
  }
  return errors;
}

/**
 * The request body for a save: every basic setting for a create, only what
 * changed for an edit. Never fields, actions, formType or isPublished.
 */
export function draftToPayload(draft, original = null) {
  const clean = {
    name: String(draft.name || "").trim(),
    description: String(draft.description || "").trim(),
    postAction: draft.postAction,
    postActionProperty: draft.postAction === "return" ? "" : String(draft.postActionProperty || "").trim(),
  };
  if (!original) return clean;
  const before = formToDraft(original);
  const payload = {};
  if (clean.name !== before.name.trim()) payload.name = clean.name;
  if (clean.description !== before.description.trim()) payload.description = clean.description;
  if (clean.postAction !== before.postAction || clean.postActionProperty !== before.postActionProperty.trim()) {
    payload.postAction = clean.postAction;
    payload.postActionProperty = clean.postActionProperty;
  }
  return payload;
}

/** A page-level load failure, worded for what the admin can do about it. */
export const describeFormLoadError = (err) => {
  const statusCode = err?.response?.status;
  if (!err?.response) return { title: "We could not reach the server.", detail: "Check your connection and try again.", retry: true };
  if (statusCode === 404) return { title: "Form not found.", detail: "This Form does not exist in Mautic.", retry: false };
  if (statusCode === 400) return { title: "Invalid Form link.", detail: getErrorMessage(err, "Form links use a numeric Mautic Form ID."), retry: false };
  if (statusCode === 401 || statusCode === 403) return { title: "You do not have access to Forms.", detail: "Marketing Hub access is required. Your session may also have expired.", retry: false };
  if (statusCode >= 500) return { title: "Mautic is unavailable right now.", detail: getErrorMessage(err, "Try again in a moment."), retry: true };
  return { title: "We could not load this Form.", detail: getErrorMessage(err), retry: true };
};

export function FormStatusChip({ published, size = "small" }) {
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
 * Confirms, then publishes or unpublishes a Form. `onDone` receives the Form
 * exactly as the backend read it back from Mautic afterwards; `onRefresh`
 * receives the verified state reported with a failure, and the dialog stays
 * open to show why.
 */
export function FormPublicationDialog({ form, open, onClose, onDone, onRefresh }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const publishing = !form?.isPublished;
  const label = form?.name || `Form #${form?.id}`;

  const close = () => {
    if (busy) return;
    setError("");
    onClose();
  };

  const confirm = async () => {
    setBusy(true);
    setError("");
    try {
      const saved = publishing ? await publishNewsletterForm(form.id) : await unpublishNewsletterForm(form.id);
      onDone(saved, publishing ? "Form published." : "Form unpublished.");
    } catch (err) {
      const data = err?.response?.data;
      // The backend reports the Form's verified state when Mautic was unclear.
      if (data?.form) onRefresh?.(data.form);
      setError(getErrorMessage(err, publishing ? "The Form could not be published." : "The Form could not be unpublished."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={close} maxWidth="xs" fullWidth>
      <DialogTitle>{publishing ? "Publish Form?" : "Unpublish Form?"}</DialogTitle>
      <DialogContent>
        <Typography color="text.secondary" sx={{ mb: error ? 2 : 0 }}>
          {publishing
            ? `"${label}" will accept submissions wherever it is embedded, and its submit actions will run.`
            : `"${label}" will stop accepting submissions. Its fields, actions and past submissions are kept.`}
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
