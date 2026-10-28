import React, { useEffect, useState } from "react";
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import {
  listMauticSegments,
  listNewsletterContactOwners,
  listNewsletterMauticCampaigns,
  runNewsletterContactBulkAction,
} from "../../services/newsletterService";

// The bulk actions offered on the Contacts list, in menu order.
export const BULK_ACTIONS = [
  { key: "segment_add", label: "Add to segment…", title: "Add to segment", verb: "Add", target: "segment" },
  { key: "segment_remove", label: "Remove from segment…", title: "Remove from segment", verb: "Remove", target: "segment" },
  { key: "campaign_add", label: "Add to campaign…", title: "Add to campaign", verb: "Add", target: "campaign" },
  { key: "campaign_remove", label: "Remove from campaign…", title: "Remove from campaign", verb: "Remove", target: "campaign" },
  { key: "owner_set", label: "Change owner…", title: "Change owner", verb: "Change Owner", target: "owner" },
  { key: "dnc_add", label: "Mark as Do Not Contact…", title: "Mark as Do Not Contact", verb: "Mark Do Not Contact", target: null },
];

const TARGET_LABELS = { segment: "Segment", campaign: "Campaign", owner: "Owner" };
const NO_OWNER = "none";

const plural = (count) => `${count} contact${count === 1 ? "" : "s"}`;

// Only static segments outside a Subscription List take manual membership.
export const manualSegments = (segments) =>
  (Array.isArray(segments) ? segments : []).filter(
    (segment) => segment?.is_static && !segment?.managed_by_subscription_list
  );

export const bulkPayload = ({ action, contactIds, targetId, reason }) => {
  const payload = { action, contact_ids: contactIds };
  if (action.startsWith("segment_")) payload.segment_id = targetId;
  if (action.startsWith("campaign_")) payload.campaign_id = targetId;
  if (action === "owner_set") payload.owner_id = targetId === NO_OWNER ? null : targetId;
  if (action === "dnc_add" && reason.trim()) payload.reason = reason.trim();
  return payload;
};

export const describeBulkAction = (action, count, targetName) => {
  const who = plural(count);
  switch (action) {
    case "segment_add": return `Add ${who} to the segment "${targetName}".`;
    case "segment_remove": return `Remove ${who} from the segment "${targetName}".`;
    case "campaign_add": return `Add ${who} to the campaign "${targetName}". They start its events as Mautic runs them.`;
    case "campaign_remove": return `Remove ${who} from the campaign "${targetName}". Mautic stops their remaining events.`;
    case "owner_set": return targetName === "No owner" ? `Clear the owner of ${who}.` : `Make ${targetName} the owner of ${who}.`;
    case "dnc_add": return `Mark ${who} as Do Not Contact for email. Mautic will stop sending them marketing email.`;
    default: return "";
  }
};

const errorMessage = (err, fallback) => err?.response?.data?.detail || err?.response?.data?.error || err?.message || fallback;

async function loadChoices(target) {
  if (target === "segment") {
    return manualSegments(await listMauticSegments()).map((segment) => ({
      id: String(segment.id),
      name: segment.name || `Segment #${segment.id}`,
    }));
  }
  if (target === "campaign") {
    const data = await listNewsletterMauticCampaigns({ page: 1, page_size: 100 });
    return (Array.isArray(data?.results) ? data.results : []).map((campaign) => ({
      id: String(campaign.id),
      name: campaign.name || `Campaign #${campaign.id}`,
      note: campaign.isPublished ? "" : " (unpublished)",
    }));
  }
  if (target === "owner") {
    const data = await listNewsletterContactOwners();
    const owners = (Array.isArray(data?.results) ? data.results : []).map((owner) => ({
      id: String(owner.id),
      name: owner.name || owner.email || `User #${owner.id}`,
    }));
    return [{ id: NO_OWNER, name: "No owner" }, ...owners];
  }
  return [];
}

/**
 * One bulk action on the ticked contacts. The admin picks the target, reads
 * what will happen and confirms; the result lists every contact that was
 * skipped or failed. Each change runs as the admin's own Mautic user.
 */
export default function ContactBulkActionDialog({ open, action, contactIds = [], onClose }) {
  const meta = BULK_ACTIONS.find((item) => item.key === action) || null;
  const [choices, setChoices] = useState([]);
  const [choicesLoading, setChoicesLoading] = useState(false);
  const [choicesError, setChoicesError] = useState("");
  const [targetId, setTargetId] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!open || !meta) return undefined;
    setTargetId("");
    setReason("");
    setError("");
    setResult(null);
    setChoices([]);
    setChoicesError("");
    if (!meta.target) return undefined;
    let active = true;
    setChoicesLoading(true);
    loadChoices(meta.target)
      .then((rows) => active && setChoices(rows))
      .catch((err) => active && setChoicesError(errorMessage(err, `We could not load the ${meta.target}s.`)))
      .finally(() => active && setChoicesLoading(false));
    return () => {
      active = false;
    };
  }, [open, action]);

  if (!meta) return null;

  const target = choices.find((choice) => choice.id === targetId);
  const ready = !meta.target || Boolean(target);
  const count = contactIds.length;

  const close = () => {
    if (busy) return;
    onClose?.({ changed: Number(result?.updated || 0) > 0 });
  };

  const apply = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setError("");
    try {
      setResult(await runNewsletterContactBulkAction(bulkPayload({ action, contactIds, targetId, reason })));
    } catch (err) {
      setError(errorMessage(err, "The bulk action failed. Nothing more was changed."));
    } finally {
      setBusy(false);
    }
  };

  const notUpdated = (result?.results || []).filter((row) => row.status !== "updated");

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
      <DialogTitle>{meta.title}</DialogTitle>
      <DialogContent>
        {result ? (
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            <Alert severity={result.failed ? "warning" : "success"}>
              {`${result.updated} updated, ${result.skipped} skipped, ${result.failed} failed.`}
            </Alert>
            {notUpdated.length > 0 && (
              <List dense aria-label="Contacts not updated" sx={{ maxHeight: 260, overflowY: "auto" }}>
                {notUpdated.map((row) => (
                  <ListItem key={row.mautic_contact_id} disableGutters>
                    <ListItemText
                      primary={`${row.name || `Contact #${row.mautic_contact_id}`} · ${row.status === "failed" ? "Failed" : "Skipped"}`}
                      secondary={row.message}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Stack>
        ) : (
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            {choicesError && <Alert severity="error">{choicesError}</Alert>}
            {meta.target && (
              <FormControl size="small" fullWidth disabled={busy || choicesLoading}>
                <InputLabel id="contact-bulk-target-label">{TARGET_LABELS[meta.target]}</InputLabel>
                <Select
                  labelId="contact-bulk-target-label"
                  label={TARGET_LABELS[meta.target]}
                  value={targetId}
                  onChange={(event) => setTargetId(String(event.target.value))}
                >
                  {choices.map((choice) => (
                    <MenuItem key={choice.id} value={choice.id}>
                      {choice.name}
                      {choice.note || ""}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            {meta.target === "segment" && (
              <Typography variant="caption" color="text.secondary">
                Only static segments are listed. Filter segments and Subscription List segments manage their own members.
              </Typography>
            )}
            {meta.target === "segment" && !choicesLoading && !choicesError && choices.length === 0 && (
              <Alert severity="info">There are no static segments to choose from.</Alert>
            )}
            {action === "dnc_add" && (
              <TextField
                label="Reason (optional)"
                value={reason}
                onChange={(event) => setReason(event.target.value.slice(0, 255))}
                size="small"
                fullWidth
                disabled={busy}
                helperText="Saved on each contact's Do Not Contact record."
              />
            )}
            {ready && (
              <Alert severity={action === "dnc_add" || action === "campaign_remove" ? "warning" : "info"}>
                {describeBulkAction(action, count, target?.name)}
                {action === "dnc_add" ? " It can only be removed contact by contact." : ""}
              </Alert>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        {result ? (
          <Button variant="contained" onClick={close}>Done</Button>
        ) : (
          <>
            <Button onClick={close} disabled={busy}>Cancel</Button>
            <Button
              variant="contained"
              color={action === "dnc_add" ? "error" : "primary"}
              onClick={apply}
              disabled={!ready || busy || !count}
            >
              {busy ? <CircularProgress size={20} color="inherit" /> : meta.verb}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
