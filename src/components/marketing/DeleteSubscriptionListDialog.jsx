import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";

import {
  getNewsletterCategoryDeletePreflight,
  permanentlyDeleteNewsletterCategory,
} from "../../services/newsletterService";

const DEPENDENCY_LABELS = {
  broadcast: "Broadcast",
  subscription_list: "Subscription List",
  mautic_segment: "Mautic segment",
  mautic_campaign: "Mautic campaign",
  mautic_email: "Mautic email",
};

/** User-facing message for a failed preflight or delete request. */
export function deleteListErrorMessage(err) {
  const response = err?.response;
  if (!response) return "Network error. Check your connection and try again.";
  const data = response.data && typeof response.data === "object" ? response.data : {};
  const detail = typeof data.detail === "string" ? data.detail : "";
  switch (response.status) {
    case 401:
      return "Your session has expired. Sign in again and retry.";
    case 403:
      return detail || "You do not have permission to delete subscription lists.";
    case 404:
      return "This subscription list no longer exists.";
    case 409:
      return detail || "This subscription list cannot be deleted right now.";
    default:
      if (response.status >= 500) {
        const pending = data.deletion_state === "deleting"
          ? " The list is hidden and pending deletion; select Delete List again to finish."
          : " Nothing was deleted.";
        return `${detail || "Mautic could not complete the deletion."}${pending}`;
      }
      return detail || "Failed to delete subscription list.";
  }
}

const DependencyList = ({ items }) => (
  <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
    {items.map((item) => (
      <li key={`${item.type}:${item.id}`}>
        <Typography variant="body2">
          <strong>{DEPENDENCY_LABELS[item.type] || item.type}:</strong> {item.name}
          {item.detail ? ` — ${item.detail}` : ""}
        </Typography>
      </li>
    ))}
  </Box>
);

/**
 * Permanent delete of one Subscription List (separate from Deactivate).
 * Loads a read-only preflight on open, then deletes only after the backend
 * confirms. ``onDeleted`` runs only after a successful response.
 */
export default function DeleteSubscriptionListDialog({ open, category, onClose, onDeleted }) {
  const [preflight, setPreflight] = useState(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [blockers, setBlockers] = useState([]);
  const [busy, setBusy] = useState(false);
  const submittingRef = useRef(false);
  const slug = category?.slug;

  const check = useCallback(async () => {
    if (!slug) return;
    setChecking(true);
    setError("");
    try {
      const data = await getNewsletterCategoryDeletePreflight(slug);
      setPreflight(data);
      setBlockers(Array.isArray(data?.blockers) ? data.blockers : []);
    } catch (err) {
      setPreflight(null);
      setError(deleteListErrorMessage(err));
    } finally {
      setChecking(false);
    }
  }, [slug]);

  useEffect(() => {
    if (!open) return;
    setPreflight(null);
    setBlockers([]);
    setError("");
    check();
  }, [open, check]);

  const handleClose = () => {
    if (!submittingRef.current) onClose?.();
  };

  const handleDelete = async () => {
    if (submittingRef.current || !slug) return;
    submittingRef.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await permanentlyDeleteNewsletterCategory(slug);
      submittingRef.current = false;
      setBusy(false);
      onDeleted?.(result);
      return;
    } catch (err) {
      setError(deleteListErrorMessage(err));
      const dependencies = err?.response?.data?.dependencies;
      if (Array.isArray(dependencies)) setBlockers(dependencies);
    }
    submittingRef.current = false;
    setBusy(false);
  };

  const pending = (preflight?.deletion_state || category?.deletion_state) === "deleting";
  const warnings = Array.isArray(preflight?.warnings) ? preflight.warnings : [];
  const canDelete = Boolean(preflight) && blockers.length === 0 && !checking && !busy;
  const segmentId = preflight?.mautic_segment_id;

  return (
    <Dialog open={Boolean(open)} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Delete Subscription List?</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography color="text.secondary">
            You are about to permanently remove this Subscription List from active ECP management and delete its
            linked Mautic segment. Existing users and historical subscription records will be preserved. This action
            cannot be undone.
          </Typography>

          {pending && (
            <Alert severity="warning">
              A previous deletion of this list did not finish. Delete List will retry it.
            </Alert>
          )}

          {checking && !preflight ? (
            <Stack spacing={1}>
              <Skeleton height={24} width="70%" />
              <Skeleton height={24} width="50%" />
            </Stack>
          ) : preflight ? (
            <Box sx={{ display: "grid", gridTemplateColumns: "auto 1fr", columnGap: 2, rowGap: 0.75 }}>
              <Typography variant="body2" color="text.secondary">List</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>{preflight.name || category?.name}</Typography>
              <Typography variant="body2" color="text.secondary">Subscribers</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>{Number(preflight.subscriber_count || 0)}</Typography>
              <Typography variant="body2" color="text.secondary">Mautic segment</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {segmentId
                  ? `#${segmentId}${preflight.mautic_segment_missing ? " (already removed in Mautic)" : ""}`
                  : "Not connected"}
              </Typography>
            </Box>
          ) : null}

          {blockers.length > 0 && (
            <Alert severity="error">
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                Remove these dependencies before deleting:
              </Typography>
              <DependencyList items={blockers} />
            </Alert>
          )}

          {warnings.length > 0 && (
            <Alert severity="warning">
              <DependencyList items={warnings} />
            </Alert>
          )}

          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} disabled={busy}>Cancel</Button>
        {!preflight && !checking && error && (
          <Button onClick={check} disabled={busy}>Check again</Button>
        )}
        <Button variant="contained" color="error" onClick={handleDelete} disabled={!canDelete}>
          {busy ? <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> : null}
          Delete List
        </Button>
      </DialogActions>
    </Dialog>
  );
}
