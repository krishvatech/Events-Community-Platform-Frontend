import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import dayjs from "dayjs";

// Per-event Event Companion opt-out. Lists the user's current in-person
// registrations (the only events with a Companion) and lets them choose,
// event by event, whether other participants see them in the Companion
// directory. Each switch saves immediately.
export default function CompanionVisibilityDialog({ open, onClose, apiBase, tokenHeader, onNotify }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const r = await fetch(`${apiBase}/event-registrations/companion-visibility/`, {
          headers: { ...tokenHeader() },
        });
        if (!r.ok) throw new Error("Failed to load your events");
        const data = await r.json();
        if (!cancelled) setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) setError(e?.message || "Failed to load your events");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, apiBase, tokenHeader]);

  async function toggle(row, visible) {
    const hide = !visible;
    const id = row.registration_id;
    setSavingId(id);
    setRows((prev) => prev.map((x) => (x.registration_id === id ? { ...x, hide_from_companion: hide } : x)));
    try {
      const r = await fetch(`${apiBase}/event-registrations/${id}/companion-visibility/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...tokenHeader() },
        body: JSON.stringify({ hide_from_companion: hide }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.detail || "Failed to update Companion visibility");
      setRows((prev) => prev.map((x) => (x.registration_id === id ? data : x)));
      onNotify?.("success", hide
        ? `You are hidden from the Companion for "${row.event.title}"`
        : `You are visible in the Companion for "${row.event.title}"`);
    } catch (e) {
      setRows((prev) => prev.map((x) => (x.registration_id === id ? { ...x, hide_from_companion: !hide } : x)));
      onNotify?.("error", e?.message || "Update failed");
    } finally {
      setSavingId(null);
    }
  }

  function formatWhen(ev) {
    if (!ev?.start_time) return "";
    const start = dayjs(ev.start_time);
    const end = ev.end_time ? dayjs(ev.end_time) : null;
    if (end && !end.isSame(start, "day")) {
      return `${start.format("MMM D, YYYY")} – ${end.format("MMM D, YYYY")}`;
    }
    return start.format("MMM D, YYYY · h:mm A");
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Event Companion Visibility</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          Participants of in-person events are shown in the Event Companion directory by default.
          Turn an event OFF to hide yourself from other participants in that event&apos;s Companion.
          They will also not be able to send you meeting requests there. The organizer can still see you.
        </DialogContentText>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
            <CircularProgress size={28} />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : rows.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            You are not registered for any upcoming or ongoing in-person events.
          </Typography>
        ) : (
          <Stack divider={<Divider flexItem />} spacing={1.5}>
            {rows.map((row) => {
              const visible = !row.hide_from_companion;
              const meta = [formatWhen(row.event), row.event.location].filter(Boolean).join(" · ");
              return (
                <Box
                  key={row.registration_id}
                  sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle2" noWrap title={row.event.title}>
                      {row.event.title}
                    </Typography>
                    {meta && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {meta}
                      </Typography>
                    )}
                    <Typography variant="caption" color={visible ? "success.main" : "text.secondary"}>
                      {visible ? "Shown in Companion" : "Hidden from Companion"}
                    </Typography>
                  </Box>
                  <Switch
                    checked={visible}
                    disabled={savingId === row.registration_id}
                    onChange={(e) => toggle(row, e.target.checked)}
                    inputProps={{ "aria-label": `Show me in the Companion for ${row.event.title}` }}
                  />
                </Box>
              );
            })}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
