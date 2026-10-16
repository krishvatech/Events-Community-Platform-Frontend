import React, { useEffect, useRef, useState } from "react";
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
import { isLostProviderResponse, isNativeScheduled } from "./newsletterBroadcastState";

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

// The only decision the UI can offer, and only when the backend allows it.
const DECISIONS = {
  confirmed_sent: {
    button: "Mark as Sent",
    title: "Mark this broadcast as sent",
    change: "The broadcast becomes Completed and its original send is recorded as delivered by Mautic.",
  },
};

const NEXT_STEPS = {
  confirmed_sent: "Review the evidence, then confirm it. No email will be sent.",
  still_processing: "Mautic may still be sending. Wait, then use Check Again.",
  evidence_unavailable: "Use Check Again when Mautic is reachable. Nothing was changed.",
  uncertain: "No decision is available: the evidence does not prove the outcome. Check again later; the send stays protected meanwhile.",
  conflicting: "No decision is available: the evidence is contradictory. Review this email in Mautic; the send stays protected.",
};

// Native broadcasts are delivered by Mautic's own cron; these are read-only.
const NATIVE_CATEGORIES = {
  native_not_due: { label: "Not Due Yet", color: "info" },
  native_awaiting_first_send: { label: "Awaiting Mautic Cron", color: "warning" },
  native_due_no_sends_recorded: { label: "Due — No Sends Recorded", color: "warning" },
  native_sending: { label: "Sending in Mautic", color: "warning" },
  native_completed_awaiting_reconciliation: { label: "Sent — Awaiting Reconciliation", color: "success" },
  native_provider_state_mismatch: { label: "Changed in Mautic", color: "error" },
  native_provider_email_missing: { label: "Mautic Email Missing", color: "error" },
  provider_unavailable: { label: "Evidence Unavailable", color: "default" },
};

const INSPECTION_TIMEOUT_MS = 60000;

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

/**
 * A safe message for a failed request: the backend's own explanation only for
 * the curated refusals (400/409/503), otherwise a generic one, so no raw
 * server output, credentials or infrastructure detail is ever shown.
 */
export const requestErrorMessage = (err, action) => {
  const status = err?.response?.status;
  const detail = err?.response?.data?.detail;
  if (!err?.response) {
    return err?.code === "ECONNABORTED"
      ? `The ${action} timed out. Nothing was changed; try again.`
      : `The server could not be reached. Nothing was changed; try again.`;
  }
  if ([400, 409, 503].includes(status) && typeof detail === "string" && detail) return detail.slice(0, 300);
  if (status === 401 || status === 403) return "You do not have permission to do this.";
  if (status === 404) return "This broadcast could not be found.";
  if (status === 429) return "Too many requests. Wait a moment, then try again.";
  if (status >= 500) return "Mautic or the server is temporarily unavailable. Nothing was changed.";
  return `The ${action} failed. Nothing was changed.`;
};

function Row({ label, value }) {
  return (
    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={{ xs: 0, sm: 2 }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography
        variant="body2"
        sx={{ fontWeight: 700, color: "#1B2A4A", textAlign: { xs: "left", sm: "right" }, overflowWrap: "anywhere" }}
      >
        {value === null || value === undefined || value === "" ? "Not available" : String(value)}
      </Typography>
    </Stack>
  );
}

// Long words, UUIDs and labels wrap instead of being clipped in narrow columns.
const wrapAlert = { "& .MuiAlert-message": { minWidth: 0, overflowWrap: "anywhere" } };
const wrapChip = { fontWeight: 800, maxWidth: "100%", height: "auto", "& .MuiChip-label": { whiteSpace: "normal", overflowWrap: "anywhere" } };

const closedDialog = { open: false, reviewed: false, note: "", submitting: false, error: "" };
const idle = { loading: false, error: "", data: null, forbidden: false };

/**
 * Investigation of a broadcast's delivery: for a Send Now whose outcome
 * Mautic never confirmed, the evidence and the one decision the backend
 * allows; for a natively scheduled broadcast, Mautic's delivery state only.
 * Loads only when the administrator asks (no polling).
 */
export default function AdminNewsletterSendOutcomePanel({ campaign, onResolved }) {
  const [state, setState] = useState(idle);
  const [dialog, setDialog] = useState(closedDialog);
  const uuid = campaign?.uuid;
  const native = isNativeScheduled(campaign);
  const lostResponse = isLostProviderResponse(campaign);

  // Each request knows which broadcast and which click it belongs to; an
  // answer for an older click or another broadcast is dropped.
  const requestSeq = useRef(0);
  const inFlight = useRef(false);
  const submitting = useRef(false);
  const mounted = useRef(true);
  // Set on every mount: StrictMode mounts, unmounts and remounts, and a flag
  // left false would silently drop every response.
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    requestSeq.current += 1;
    inFlight.current = false;
    submitting.current = false;
    setState(idle);
    setDialog(closedDialog);
  }, [uuid]);

  const current = (seq) => mounted.current && seq === requestSeq.current;

  const outcome = state.data?.send_outcome;
  const evidence = outcome?.evidence;
  const sendEvent = outcome?.send_event;
  const decision = !state.forbidden && outcome?.applicable && outcome?.allowed_resolution
    ? DECISIONS[outcome.allowed_resolution] || null
    : null;
  const classification = CLASSIFICATIONS[outcome?.classification];
  const delivery = state.data?.delivery;
  const nativeCategory = NATIVE_CATEGORIES[delivery?.category];

  const investigate = async () => {
    if (inFlight.current || !uuid) return;
    inFlight.current = true;
    const seq = ++requestSeq.current;
    setState((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const data = await getNewsletterCampaignDeliveryInspection(uuid, { timeout: INSPECTION_TIMEOUT_MS });
      if (!current(seq)) return;
      const usable = data && typeof data === "object" && (native ? data.delivery : data.send_outcome);
      setState(usable
        ? { loading: false, error: "", data, forbidden: false }
        : { ...idle, error: "The response could not be read. Nothing was changed; try again." });
    } catch (err) {
      if (!current(seq)) return;
      const status = err?.response?.status;
      setState({
        ...idle,
        forbidden: status === 401 || status === 403,
        error: requestErrorMessage(err, "check"),
      });
    } finally {
      if (seq === requestSeq.current) inFlight.current = false;
    }
  };

  const submit = async () => {
    if (submitting.current || !decision || !sendEvent?.event_uuid) return;
    submitting.current = true;
    const seq = requestSeq.current;
    setDialog((prev) => ({ ...prev, submitting: true, error: "" }));
    try {
      const response = await resolveNewsletterCampaignSendOutcome(uuid, {
        event_uuid: sendEvent.event_uuid,
        resolution: outcome.allowed_resolution,
        confirm: true,
        note: dialog.note.trim(),
      });
      if (!current(seq)) return;
      setDialog(closedDialog);
      setState({ ...idle, data: response?.inspection || null });
      onResolved?.();
    } catch (err) {
      if (!current(seq)) return;
      const status = err?.response?.status;
      const inspection = err?.response?.data?.inspection;
      if (inspection) setState({ ...idle, data: inspection });
      if (status === 401 || status === 403) setState((prev) => ({ ...prev, forbidden: true }));
      setDialog((prev) => ({ ...prev, submitting: false, error: requestErrorMessage(err, "decision") }));
    } finally {
      submitting.current = false;
    }
  };

  const title = native ? "Scheduled Delivery" : "Send Outcome";
  const headerChip = native
    ? "Scheduled in Mautic"
    : lostResponse ? "Provider Response Unavailable" : "Sending";
  const headerText = native
    ? "Mautic sends this broadcast itself at the scheduled time. Checking its status is read-only."
    : lostResponse
      ? "Mautic did not confirm this send. It is protected: it will never be retried or resent automatically."
      : "Mautic was asked to send this broadcast and ECP has not recorded the outcome yet. Investigate if it stays in this state.";
  const buttonLabel = state.data ? "Check Again" : native ? "Check Delivery Status" : "Investigate Send Outcome";

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, borderColor: "#E7ECEF", minWidth: 0 }}>
      <Stack spacing={2}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1}>
          <Box sx={{ minWidth: 0, overflowWrap: "anywhere" }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography variant="h6" sx={{ fontWeight: 800, color: "#1B2A4A" }}>{title}</Typography>
              <Chip size="small" color={native ? "info" : "warning"} label={headerChip} sx={wrapChip} />
            </Stack>
            <Typography variant="body2" color="text.secondary">{headerText}</Typography>
          </Box>
          <Button
            startIcon={state.loading ? <CircularProgress size={18} color="inherit" /> : state.data ? <RefreshRoundedIcon /> : <FactCheckRoundedIcon />}
            onClick={investigate}
            disabled={state.loading}
            aria-busy={state.loading}
            sx={{ textTransform: "none", alignSelf: "flex-start", flexShrink: 0 }}
          >
            {state.loading ? "Checking…" : buttonLabel}
          </Button>
        </Stack>

        {state.error && <Alert severity="warning" sx={wrapAlert}>{state.error}</Alert>}

        {native && delivery && (
          <Stack spacing={1.5}>
            <Chip
              size="small"
              color={nativeCategory?.color || "default"}
              label={nativeCategory?.label || "Status Unknown"}
              sx={{ ...wrapChip, alignSelf: "flex-start" }}
            />
            <Typography variant="body2">{delivery.guidance}</Typography>
            <Box sx={{ display: "grid", gap: 0.75 }}>
              <Row label="Scheduled for" value={formatWhen(state.data?.campaign?.scheduled_at)} />
              <Row label="Mautic email" value={state.data?.campaign?.mautic_email_id} />
              <Row label="Mautic sent counter" value={state.data?.provider?.sent_count} />
              <Row label="Checked" value={formatWhen(state.data?.checked_at)} />
            </Box>
          </Stack>
        )}

        {!native && outcome && !outcome.applicable && (
          <Alert severity="info" sx={wrapAlert}>This send is no longer awaiting an outcome. Refresh the broadcast to see its status.</Alert>
        )}

        {!native && outcome?.applicable && (
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Chip size="small" color={classification?.color || "default"} label={classification?.label || "Status Unknown"} sx={wrapChip} />
              <Typography variant="caption" color="text.secondary">Checked {formatWhen(outcome.observed_at)}</Typography>
            </Stack>
            {outcome.explanation && <Typography variant="body2">{outcome.explanation}</Typography>}

            <Box sx={{ display: "grid", gap: 0.75 }}>
              <Row label="Broadcast" value={campaign?.name} />
              <Row label="Send event" value={sendEvent?.event_uuid} />
              <Row label="Event status" value={sendEvent?.status} />
              <Row label="Send requested" value={formatWhen(sendEvent?.requested_at)} />
              <Row label="Mautic asked to send" value={formatWhen(sendEvent?.provider_send_started_at)} />
              <Row label="Mautic email" value={evidence?.mautic_email_id} />
              <Row label="Mautic evidence observed" value={evidence ? formatWhen(evidence.mautic_observed_at) : null} />
              <Row label="Sends recorded since then" value={evidence?.stats?.since} />
              <Row label="Sends recorded before then" value={evidence?.stats?.before_since} />
              <Row label="Mautic sent counter" value={evidence?.sent_count} />
              <Row label="Contacts still due" value={evidence?.pending} />
              <Row label="Waiting in Mautic queue" value={evidence?.queued} />
              <Row label="Delivery/engagement events received" value={evidence?.tracking_events_since_send} />
            </Box>
            {evidence?.limitations && <Typography variant="caption" color="text.secondary">{evidence.limitations}</Typography>}

            {decision ? (
              <Stack spacing={1} alignItems="flex-start">
                <Typography variant="body2" color="text.secondary">Next step: {NEXT_STEPS.confirmed_sent}</Typography>
                <Button variant="contained" onClick={() => setDialog({ ...closedDialog, open: true })} sx={{ textTransform: "none" }}>
                  {decision.button}
                </Button>
              </Stack>
            ) : (
              <Alert severity="info" variant="outlined" sx={wrapAlert}>
                {NEXT_STEPS[outcome.classification] || NEXT_STEPS.uncertain}
              </Alert>
            )}
          </Stack>
        )}
      </Stack>

      <Dialog
        open={dialog.open}
        onClose={dialog.submitting ? undefined : () => setDialog((prev) => ({ ...prev, open: false }))}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{decision?.title || "Decision no longer available"}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>
              Send event <strong>{sendEvent?.event_uuid}</strong> of “{campaign?.name}”.
            </Typography>
            <Typography variant="body2">{decision?.change}</Typography>
            <Alert severity="info" sx={wrapAlert}>This only records the outcome. No email will be sent.</Alert>
            <TextField
              label="Note (optional)"
              size="small"
              value={dialog.note}
              inputProps={{ maxLength: 120 }}
              onChange={(event) => setDialog((prev) => ({ ...prev, note: event.target.value }))}
              disabled={dialog.submitting}
            />
            <FormControlLabel
              control={<Checkbox checked={dialog.reviewed} onChange={(event) => setDialog((prev) => ({ ...prev, reviewed: event.target.checked }))} disabled={dialog.submitting} />}
              label="I have reviewed the evidence above."
            />
            {dialog.error && <Alert severity="error" sx={wrapAlert}>{dialog.error}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog((prev) => ({ ...prev, open: false }))} disabled={dialog.submitting}>Cancel</Button>
          <Button variant="contained" onClick={submit} disabled={!decision || !dialog.reviewed || dialog.submitting}>
            {dialog.submitting ? <CircularProgress size={20} color="inherit" /> : "Confirm Decision"}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
