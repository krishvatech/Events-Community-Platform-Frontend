// One contact note with Edit and Delete, as the admin's Mautic user.

import React, { useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";

import { deleteNewsletterAdminContactNote, updateNewsletterAdminContactNote } from "../../services/newsletterService";

export const NOTE_TYPES = [
  ["general", "General"],
  ["email", "Email"],
  ["call", "Call"],
  ["meeting", "Meeting"],
];
const errorText = (err, fallback) => err?.response?.data?.detail || err?.message || fallback;

export default function ContactNoteItem({ contactId, note, meta, onChanged }) {
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const changes = {};
      if (editing.text.trim() !== (note.text || "").trim()) changes.text = editing.text.trim();
      if (editing.type !== (note.type || "general")) changes.type = editing.type;
      if (Object.keys(changes).length) await updateNewsletterAdminContactNote(contactId, note.id, changes);
      setEditing(null);
      onChanged?.(Object.keys(changes).length ? "Note saved." : "");
    } catch (err) {
      setError(errorText(err, "The note could not be saved."));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError("");
    try {
      await deleteNewsletterAdminContactNote(contactId, note.id);
      setDeleting(false);
      onChanged?.("Note deleted.");
    } catch (err) {
      setError(errorText(err, "The note could not be deleted."));
    } finally {
      setBusy(false);
    }
  };

  const preview = (note.text || "").slice(0, 80);
  return (
    <Box sx={{ borderBottom: "1px solid #EEF2F6", pb: 1 }}>
      <Stack direction="row" spacing={1} alignItems="flex-start" justifyContent="space-between">
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{note.text || "—"}</Typography>
          <Typography variant="caption" color="text.secondary">{meta}</Typography>
        </Box>
        <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0 }}>
          <Tooltip title="Edit note">
            <IconButton size="small" aria-label={`Edit note: ${preview}`} onClick={() => { setError(""); setEditing({ text: note.text || "", type: note.type || "general" }); }}>
              <EditRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete note">
            <IconButton size="small" color="error" aria-label={`Delete note: ${preview}`} onClick={() => { setError(""); setDeleting(true); }}>
              <DeleteOutlineRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      <Dialog open={Boolean(editing)} onClose={busy ? undefined : () => setEditing(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Note</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField select label="Type" value={editing?.type || "general"} onChange={(event) => setEditing((current) => ({ ...current, type: event.target.value }))}>
              {NOTE_TYPES.map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
            </TextField>
            <TextField label="Note" value={editing?.text || ""} onChange={(event) => setEditing((current) => ({ ...current, text: event.target.value }))}
              multiline minRows={4} fullWidth autoFocus />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(null)} disabled={busy}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={busy || !editing?.text?.trim()}>
            {busy ? <CircularProgress size={18} color="inherit" /> : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleting} onClose={busy ? undefined : () => setDeleting(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Note</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}
            <Typography>Delete this note? This cannot be undone.</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>{preview}{(note.text || "").length > 80 ? "…" : ""}</Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleting(false)} disabled={busy}>Cancel</Button>
          <Button color="error" variant="contained" onClick={remove} disabled={busy}>
            {busy ? <CircularProgress size={18} color="inherit" /> : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
