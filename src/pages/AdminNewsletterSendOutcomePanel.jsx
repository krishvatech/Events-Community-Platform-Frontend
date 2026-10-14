import React, { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import FactCheckRoundedIcon from "@mui/icons-material/FactCheckRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";

import {
  getNewsletterCampaignDeliveryInspection,
  resolveNewsletterCampaignSendOutcome,
} from "../services/newsletterService";

// Administrator-facing classifications from the backend; none of them is a
// new broadcast status, and none offers a resend. There is no "not sent":
// absence of sending activity never proves Mautic will not send.
const CLASSIFICATIONS = {
  confirmed_sent: { label: "Confirmed Sent", color: "success" },
  still_processing: { label: "Awaiting Delivery Evidence", color: "warning" },
  uncertain: { label: "Outcome Uncertain", color: "warning" },
  conflicting: { label: "Conflicting Evidence", color: "error" },
  evidence_unavailable: { label: "Evidence Unavailable", color: "default" },
};

const DECISIONS = {
  confirmed_sent: {
    button: "Mark as Sent",
    title: "Mark this broadcast as sent",
    change: "The broadcast becomes Completed and its original send is recorded as delivered by Mautic.",
  },
};

const formatWhen = (value) => {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const errorMessage = (err, fallback) => {
  const data = err?.response?.data;
  return data?.detail || data?.message || err?.message || fallback;
};

function Row({ label, value }) {
  return (
    <Stack direction="row" justifyContent="space-between" spacing={2}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 700, color: "#1B2A4A", textAlign: "right", wordBreak: "break-all" }}>
        {value === null || value === undefined || value === "" ? "Not available" : String(value)}
      </Typography>
    </Stack>
  );
}

/**
 * Investigation and resolution of a Send Now whose outcome Mautic never
 * confirmed. Loads only when the administrator asks (no polling) and only
 * offers the decision the backend says the evidence supports.
 */
export default function AdminNewsletterSendOutcomePanel({ campaign, onResolved }) {
  const [state, setState] = useState({ loading: false, error: "", data: null });
  const [dialog, setDialog] = useState({ open: false, reviewed: false, note: "", submitting: false, error: "" });

  const outcome = state.data?.send_outcome;
  const evidence = outcome?.evidence;
  const sendEvent = outcome?.send_event;
  const decision = outcome?.allowed_resolution ? DECISIONS[outcome.allowed_resolution] : null;
  const classification = CLASSIFICATIONS[outcome?.classification];
  const uncertainResponse = Boolean(campaign?.last_error);

  const investigate = async () => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const data = await getNewsletterCampaignDeliveryInspection(campaign.uuid);
      setState({ loading: false, error: "", data });
    } catch (err) {
      setState((current) => ({ ...current, loading: false, error: errorMessage(err, "The send could not be investigated.") }));
    }
  };

  const submit = async () => {
    setDialog((current) => ({ ...current, submitting: true, error: "" }));
    try {
      const response = await resolveNewsletterCampaignSendOutcome(campaign.uuid, {
        event_uuid: sendEvent.event_uuid,
        resolution: outcome.allowed_resolution,
        confirm: true,
        note: dialog.note.trim(),
      });
      setDialog({ open: false, reviewed: false, note: "", submitting: false, error: "" });
      setState({ loading: false, error: "", data: response?.inspection || null });
      onResolved?.();
    } catch (err) {
      const inspection = err?.response?.data?.inspection;
      if (inspection) setState({ loading: false, error: "", data: inspection });
      setDialog((current) => ({
        ...current,
        submitting: false,
        error: errorMessage(err, "The decision could not be applied. Nothing was changed."),
      }));
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, borderColor: "#E7ECEF" }}>
      <Stack spacing={2}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1}>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="h6" sx={{ fontWeight: 800, color: "#1B2A4A" }}>Send Outcome</Typography>
              <Chip
                size="small"
                color="warning"
                label={uncertainResponse ? "Provider Response Unavailable" : "Sending"}
                sx={{ fontWeight: 800 }}
              />
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {uncertainResponse
                ? "Mautic did not confirm this send. It is protected: it will never be retried or resent automatically."
                : "Mautic is sending this broadcast. Investigate if it stays in this state."}
            </Typography>
          </Box>
          <Button
            startIcon={state.loading ? <CircularProgress size={18} color="inherit" /> : state.data ? <RefreshRoundedIcon /> : <FactCheckRoundedIcon />}
            onClick={investigate}
            disabled={state.loading}
            sx={{ textTransform: "none", alignSelf: "flex-start" }}
          >
            {state.data ? "Check Again" : "Investigate Send Outcome"}
          </Button>
        </Stack>

        {state.error && <Alert severity="warning">{state.error}</Alert>}

        {outcome && !outcome.applicable && (
          <Alert severity="info">This send is no longer awaiting an outcome. Refresh the broadcast to see its status.</Alert>
        )}

        {outcome?.applicable && (
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip size="small" color={classification?.color || "default"} label={classification?.label || outcome.classification} sx={{ fontWeight: 800 }} />
              <Typography variant="caption" color="text.secondary">Checked {formatWhen(outcome.observed_at)}</Typography>
            </Stack>
            <Typography variant="body2">{outcome.explanation}</Typography>

            <Box sx={{ display: "grid", gap: 0.75 }}>
              <Row label="Broadcast" value={campaign?.name} />
              <Row label="Send event" value={sendEvent?.event_uuid} />
              <Row label="Event status" value={sendEvent?.status} />
              <Row label="Send requested" value={formatWhen(sendEvent?.requested_at)} />
              <Row label="Mautic asked to send" value={formatWhen(sendEvent?.provider_send_started_at)} />
              <Row label="Mautic email" value={evidence?.mautic_email_id} />
              <Row label="Sends recorded since then" value={evidence?.stats?.since} />
              <Row label="Sends recorded before then" value={evidence?.stats?.before_since} />
              <Row label="Mautic sent counter" value={evidence?.sent_count} />
              <Row label="Contacts still due" value={evidence?.pending} />
              <Row label="Waiting in Mautic queue" value={evidence?.queued} />
              <Row label="Delivery/engagement events received" value={evidence?.tracking_events_since_send} />
            </Box>
            {evidence?.limitations && <Typography variant="caption" color="text.secondary">{evidence.limitations}</Typography>}

            {decision ? (
              <Box>
                <Button variant="contained" onClick={() => setDialog({ open: true, reviewed: false, note: "", submitting: false, error: "" })} sx={{ textTransform: "none" }}>
                  {decision.button}
                </Button>
              </Box>
            ) : (
              <Alert severity="info" variant="outlined">
                No decision is available: the evidence does not prove the outcome. Check again later; the send stays protected meanwhile.
              </Alert>
            )}
          </Stack>
        )}
      </Stack>

      <Dialog open={dialog.open} onClose={dialog.submitting ? undefined : () => setDialog((current) => ({ ...current, open: false }))} maxWidth="sm" fullWidth>
        <DialogTitle>{decision?.title}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography variant="body2">Send event <strong>{sendEvent?.event_uuid}</strong> of “{campaign?.name}”.</Typography>
            <Typography variant="body2">{decision?.change}</Typography>
            <Alert severity="info">This only records the outcome. No email will be sent.</Alert>
            <TextField
              label="Note (optional)"
              size="small"
              value={dialog.note}
              inputProps={{ maxLength: 120 }}
              onChange={(event) => setDialog((current) => ({ ...current, note: event.target.value }))}
              disabled={dialog.submitting}
            />
            <FormControlLabel
              control={<Checkbox checked={dialog.reviewed} onChange={(event) => setDialog((current) => ({ ...current, reviewed: event.target.checked }))} disabled={dialog.submitting} />}
              label="I have reviewed the evidence above."
            />
            {dialog.error && <Alert severity="error">{dialog.error}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog((current) => ({ ...current, open: false }))} disabled={dialog.submitting}>Cancel</Button>
          <Button variant="contained" onClick={submit} disabled={!dialog.reviewed || dialog.submitting}>
            {dialog.submitting ? <CircularProgress size={20} color="inherit" /> : "Confirm Decision"}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
