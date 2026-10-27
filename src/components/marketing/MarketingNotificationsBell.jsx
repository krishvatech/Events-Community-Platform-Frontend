// Marketing Hub notification bell: the admin's own marketing notifications
// (e.g. "Contact export ready"), with an unread badge, a list with actions,
// and a toast when a new one arrives. Polls every 20s, and every 5s for a
// while after something announces work in progress (see notifyMarketingWorkStarted).

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Badge,
  Box,
  Button,
  Divider,
  IconButton,
  Popover,
  Snackbar,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import NotificationsNoneRoundedIcon from "@mui/icons-material/NotificationsNoneRounded";

import {
  downloadNewsletterContactExport,
  listMarketingNotifications,
  markMarketingNotificationsRead,
} from "../../services/newsletterService";
import { saveBlob } from "./saveBlob";

export const POLL_MS = 20000;
export const FAST_POLL_MS = 5000;
export const FAST_POLL_FOR_MS = 15 * 60 * 1000;
const WORK_EVENT = "marketing:work-started";

/** Tells the bell to check often for a while: something will finish soon. */
export function notifyMarketingWorkStarted() {
  window.dispatchEvent(new CustomEvent(WORK_EVENT));
}

const formatWhen = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
};

const isDownloadable = (n) => n.type === "marketing_contact_export" && n.data?.status === "done" && n.data?.job_id;

export default function MarketingNotificationsBell({ pollMs = POLL_MS, fastPollMs = FAST_POLL_MS }) {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [anchor, setAnchor] = useState(null);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const seen = useRef(null);
  const fastUntil = useRef(0);
  const timer = useRef(null);
  const mounted = useRef(false);

  const load = useCallback(async () => {
    try {
      const data = await listMarketingNotifications();
      if (!mounted.current) return;
      const results = Array.isArray(data?.results) ? data.results : [];
      setItems(results);
      setUnread(Number(data?.unread || 0));
      // The first load only learns what exists; later ones announce new arrivals.
      if (seen.current) {
        const fresh = results.find((n) => !n.is_read && !seen.current.has(n.id));
        if (fresh) setToast(fresh);
      }
      seen.current = new Set(results.map((n) => n.id));
    } catch {
      // A missed poll is retried by the next one.
    }
  }, []);

  const schedule = useCallback(() => {
    window.clearTimeout(timer.current);
    const delay = Date.now() < fastUntil.current ? fastPollMs : pollMs;
    timer.current = window.setTimeout(async () => {
      await load();
      if (mounted.current) schedule();
    }, delay);
  }, [load, pollMs, fastPollMs]);

  useEffect(() => {
    mounted.current = true;
    load().then(() => mounted.current && schedule());
    const onWork = () => {
      fastUntil.current = Date.now() + FAST_POLL_FOR_MS;
      schedule();
    };
    window.addEventListener(WORK_EVENT, onWork);
    return () => {
      mounted.current = false;
      window.clearTimeout(timer.current);
      window.removeEventListener(WORK_EVENT, onWork);
    };
  }, [load, schedule]);

  const markRead = async (payload) => {
    try {
      const result = await markMarketingNotificationsRead(payload);
      setUnread(Number(result?.unread || 0));
      setItems((current) => current.map((n) => (payload.all || payload.ids?.includes(n.id) ? { ...n, is_read: true } : n)));
    } catch {
      // Read state is cosmetic; the next poll shows the truth.
    }
  };

  const download = async (notification) => {
    setBusyId(notification.id);
    setError("");
    try {
      saveBlob(await downloadNewsletterContactExport(notification.data.job_id), notification.data.filename);
      if (!notification.is_read) markRead({ ids: [notification.id] });
    } catch (err) {
      setError(err?.response?.data?.detail || "The file could not be downloaded.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"} onClick={(e) => setAnchor(e.currentTarget)} size="small">
          <Badge color="error" badgeContent={unread} max={99}>
            <NotificationsNoneRoundedIcon />
          </Badge>
        </IconButton>
      </Tooltip>
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        slotProps={{ paper: { sx: { width: 360, maxWidth: "calc(100vw - 32px)" } } }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 1.5 }}>
          <Typography sx={{ fontWeight: 800 }}>Notifications</Typography>
          {unread > 0 && <Button size="small" onClick={() => markRead({ all: true })} sx={{ textTransform: "none" }}>Mark all read</Button>}
        </Stack>
        <Divider />
        {error && <Alert severity="error" sx={{ m: 1 }} onClose={() => setError("")}>{error}</Alert>}
        {items.length === 0 ? (
          <Typography color="text.secondary" sx={{ p: 2 }}>No notifications yet.</Typography>
        ) : (
          <Box component="ul" aria-label="Marketing notifications" sx={{ listStyle: "none", m: 0, p: 0, maxHeight: 420, overflowY: "auto" }}>
            {items.map((n) => (
              <Box component="li" key={n.id} data-notification-id={n.id}
                sx={{ px: 2, py: 1.25, borderBottom: "1px solid #F0EEEB", bgcolor: n.is_read ? "transparent" : "#F0FAF9" }}>
                <Stack direction="row" spacing={1} alignItems="flex-start">
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>{n.title}</Typography>
                    <Typography variant="body2" color="text.secondary">{n.description}</Typography>
                    <Typography variant="caption" color="text.secondary">{formatWhen(n.created_at)}</Typography>
                  </Box>
                  {isDownloadable(n) && (
                    <Button size="small" startIcon={<DownloadRoundedIcon />} onClick={() => download(n)} disabled={busyId === n.id}
                      sx={{ textTransform: "none", flexShrink: 0 }}>
                      Download
                    </Button>
                  )}
                </Stack>
              </Box>
            ))}
          </Box>
        )}
      </Popover>
      <Snackbar open={Boolean(toast)} autoHideDuration={10000} onClose={() => setToast(null)} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert
          severity={toast?.data?.status === "failed" ? "error" : "success"}
          onClose={() => setToast(null)}
          action={toast && isDownloadable(toast) ? (
            <Button color="inherit" size="small" onClick={() => { download(toast); setToast(null); }}>Download</Button>
          ) : undefined}
        >
          <strong>{toast?.title}</strong> {toast?.description}
        </Alert>
      </Snackbar>
    </>
  );
}
