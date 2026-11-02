// Send one published template to this contact. Mautic's own send-to-contact
// ignores Do Not Contact, so ECP and the bridge both refuse a contact marked
// Do Not Contact for email; the template is sent exactly as saved.

import React, { useEffect, useState } from "react";
import {
  Alert,
  Autocomplete,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { listNewsletterTemplates, sendNewsletterContactEmail } from "../../services/newsletterService";

const errorMessage = (err, fallback) => err?.response?.data?.detail || err?.message || fallback;

/** Why this contact cannot be emailed, or "". */
export const sendBlocker = (contact) => {
  if (!contact) return "The contact is still loading.";
  if (!String(contact.email || "").trim()) return "This contact has no email address.";
  const restrictions = Array.isArray(contact.communication_restrictions) ? contact.communication_restrictions : [];
  if (restrictions.some((rule) => String(rule.channel || "email") === "email")) {
    return "This contact is marked Do Not Contact for email.";
  }
  return "";
};

export default function ContactSendEmailDialog({ open, contact, mauticContactId, onClose, onSent }) {
  const [templates, setTemplates] = useState({ loading: false, rows: [], error: "" });
  const [chosen, setChosen] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const blocker = sendBlocker(contact);

  useEffect(() => {
    if (!open) return undefined;
    setChosen(null);
    setError("");
    let active = true;
    setTemplates({ loading: true, rows: [], error: "" });
    listNewsletterTemplates({ page: 1, page_size: 100 })
      .then((data) => active && setTemplates({
        loading: false,
        error: "",
        rows: (Array.isArray(data?.results) ? data.results : [])
          .filter((template) => template.isPublished && template.role !== "variant" && template.role !== "translation")
          .map((template) => ({ id: String(template.id), name: template.name || `Template #${template.id}`, subject: template.subject || "" })),
      }))
      .catch((err) => active && setTemplates({ loading: false, rows: [], error: errorMessage(err, "Templates could not be loaded.") }));
    return () => {
      active = false;
    };
  }, [open]);

  const send = async () => {
    if (!chosen || busy || blocker) return;
    setBusy(true);
    setError("");
    try {
      const result = await sendNewsletterContactEmail(mauticContactId, chosen.id);
      onSent?.(result);
    } catch (err) {
      setError(errorMessage(err, "The email could not be sent."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => !busy && onClose?.()} fullWidth maxWidth="sm">
      <DialogTitle>Send email</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {blocker ? <Alert severity="warning">{blocker} Nothing can be sent.</Alert> : (
            <Typography color="text.secondary">
              Sends a published template to <strong>{contact?.email}</strong> now, exactly as saved. Mautic tracks opens and clicks.
            </Typography>
          )}
          {templates.error && <Alert severity="error">{templates.error}</Alert>}
          {error && <Alert severity="error">{error}</Alert>}
          <Autocomplete
            options={templates.rows}
            value={chosen}
            onChange={(_, value) => setChosen(value)}
            getOptionLabel={(template) => template.name}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            loading={templates.loading}
            disabled={Boolean(blocker) || busy}
            renderOption={(props, template) => (
              <li {...props} key={template.id}>
                <Stack>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{template.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{template.subject}</Typography>
                </Stack>
              </li>
            )}
            renderInput={(params) => <TextField {...params} label="Template" helperText="Published templates only." />}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="contained" onClick={send} disabled={!chosen || busy || Boolean(blocker)}
          startIcon={busy ? <CircularProgress size={16} color="inherit" /> : null}>
          Send email
        </Button>
      </DialogActions>
    </Dialog>
  );
}
