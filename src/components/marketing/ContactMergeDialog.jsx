import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
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

import {
  listNewsletterAdminContacts,
  mergeNewsletterContact,
  previewNewsletterContactMerge,
} from "../../services/newsletterService";

const errorMessage = (err, fallback) => err?.response?.data?.detail || err?.response?.data?.error || err?.message || fallback;

// What Mautic's merge does, in the order an admin cares about.
export const MERGE_EFFECTS = [
  "For each field, the value from the most recently updated contact is kept.",
  "Points are added together. The kept contact's owner stays; the other contact's owner is used only if there is none.",
  "Tags, segments, campaigns, notes and activity history move to the kept contact.",
  "Do Not Contact records are kept.",
];

function ContactCard({ title, contact }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, borderColor: "#E7ECEF", flex: 1, minWidth: 0 }} aria-label={title}>
      <Typography variant="overline" color="text.secondary">{title}</Typography>
      <Typography sx={{ fontWeight: 800 }} noWrap>{contact.name}</Typography>
      <Typography variant="body2" color="text.secondary" noWrap>{contact.email || "No email"}</Typography>
      <Typography variant="body2" color="text.secondary">
        {[`#${contact.mautic_contact_id}`, `${contact.points ?? 0} points`, contact.owner ? `Owner: ${contact.owner.name}` : "No owner"].join(" · ")}
      </Typography>
      {contact.linked_ecp_user_id ? (
        <Typography variant="caption" color="success.main">Linked to ECP account #{contact.linked_ecp_user_id}</Typography>
      ) : null}
    </Paper>
  );
}

/**
 * Native Mautic "Merge": the contact being viewed is kept and the chosen one
 * is merged into it, then deleted. The server reports every blocker before
 * the admin confirms and checks them again when merging.
 */
export default function ContactMergeDialog({ open, mauticContactId, onClose, onMerged }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setResults([]);
    setSearched(false);
    setPreview(null);
    setError("");
  }, [open]);

  const search = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setError("");
    try {
      const data = await listNewsletterAdminContacts({ search: query.trim(), page: 1, page_size: 10 });
      const rows = Array.isArray(data?.results) ? data.results : [];
      setResults(rows.filter((row) => String(row.mautic_contact_id) !== String(mauticContactId)));
      setSearched(true);
    } catch (err) {
      setError(errorMessage(err, "We could not search contacts."));
    } finally {
      setSearching(false);
    }
  };

  const choose = async (row) => {
    setPreviewLoading(true);
    setError("");
    try {
      setPreview(await previewNewsletterContactMerge(mauticContactId, row.mautic_contact_id));
    } catch (err) {
      setError(errorMessage(err, "We could not check these contacts."));
    } finally {
      setPreviewLoading(false);
    }
  };

  const merge = async () => {
    if (!preview?.can_merge || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await mergeNewsletterContact(mauticContactId, preview.merged_away.mautic_contact_id);
      onMerged?.(result);
    } catch (err) {
      setError(errorMessage(err, "The merge failed. Both contacts are unchanged."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Merge contacts</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          {preview ? (
            <>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                <ContactCard title="Kept" contact={preview.kept} />
                <ContactCard title="Merged in and deleted" contact={preview.merged_away} />
              </Stack>
              {preview.blockers.length ? (
                preview.blockers.map((blocker) => (
                  <Alert key={blocker.code} severity="error">{blocker.message}</Alert>
                ))
              ) : (
                <Alert severity="warning">
                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                    {`${preview.merged_away.name} will be merged into ${preview.kept.name} and then deleted. This cannot be undone.`}
                  </Typography>
                  <Box component="ul" sx={{ m: 0, pl: 2.5, listStyleType: "disc" }}>
                    {MERGE_EFFECTS.map((line) => (
                      <li key={line}><Typography variant="body2">{line}</Typography></li>
                    ))}
                  </Box>
                </Alert>
              )}
            </>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary">
                Find the duplicate to merge into this contact. This contact is kept.
              </Typography>
              <Stack direction="row" spacing={1}>
                <TextField
                  size="small"
                  fullWidth
                  autoFocus
                  label="Search contacts"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      search();
                    }
                  }}
                  disabled={searching || previewLoading}
                />
                <Button variant="outlined" onClick={search} disabled={searching || !query.trim()} sx={{ textTransform: "none" }}>
                  Search
                </Button>
              </Stack>
              {searching || previewLoading ? (
                <Skeleton variant="rounded" height={96} />
              ) : results.length ? (
                <Stack spacing={1} component="ul" aria-label="Merge candidates" sx={{ listStyle: "none", m: 0, p: 0 }}>
                  {results.map((row) => (
                    <Stack
                      component="li"
                      key={row.mautic_contact_id}
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      justifyContent="space-between"
                      sx={{ border: "1px solid #E7ECEF", borderRadius: 1.5, px: 1.5, py: 1 }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 700 }} noWrap>{row.name || `Contact #${row.mautic_contact_id}`}</Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {[row.email, `#${row.mautic_contact_id}`].filter(Boolean).join(" · ")}
                        </Typography>
                      </Box>
                      <Button size="small" variant="outlined" onClick={() => choose(row)} sx={{ textTransform: "none", flexShrink: 0 }}
                        aria-label={`Choose ${row.name || `Contact #${row.mautic_contact_id}`}`}>
                        Choose
                      </Button>
                    </Stack>
                  ))}
                </Stack>
              ) : searched ? (
                <Typography variant="body2" color="text.secondary">No other contacts match.</Typography>
              ) : null}
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        {preview && (
          <Button onClick={() => setPreview(null)} disabled={busy} sx={{ textTransform: "none", mr: "auto" }}>
            Back
          </Button>
        )}
        <Button onClick={onClose} disabled={busy} sx={{ textTransform: "none" }}>Cancel</Button>
        {preview && (
          <Button variant="contained" color="error" onClick={merge} disabled={busy || !preview.can_merge} sx={{ textTransform: "none" }}>
            {busy ? <CircularProgress size={20} color="inherit" /> : "Merge"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
