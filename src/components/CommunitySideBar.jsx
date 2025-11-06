// src/components/CommunitySideBar.jsx
import * as React from "react";
import {
  Paper, Typography, List, ListItem, ListItemText,
  Stack, Divider, Chip, Button,Badge
} from "@mui/material";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";

const BORDER = "#e2e8f0";
const HOVER_BG = "#e6f7f6";
const SLATE_700 = "#334155";


// Always resolve to the Django API (e.g., http://localhost:8000/api)
const RAW_BASE = (import.meta.env.VITE_API_BASE_URL || "").trim();
const API_BASE = RAW_BASE.endsWith("/") ? RAW_BASE.slice(0, -1) : RAW_BASE;

const tokenHeader = () => {
  const t =
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("access") ||
    localStorage.getItem("jwt");
  return t ? { Authorization: `Bearer ${t}` } : {};
};

async function getUnreadCount() {
  try {
    // Ask only for unread and 1 item — DRF pagination will include `count`
    const r = await fetch(`${API_BASE}/notifications/?unread=1&page_size=1`, {
      headers: { ...tokenHeader(), Accept: "application/json" },
      credentials: "include",
    });
    if (!r.ok) return 0;

    const j = await r.json().catch(() => ({}));

    // If you have DRF pagination: { count, results: [...] }
    if (typeof j.count === "number") return j.count;

    // If pagination is off and API returns a plain array:
    const arr = Array.isArray(j) ? j : j?.results || [];
    return arr.reduce((acc, n) => acc + (n?.is_read ? 0 : 1), 0);
  } catch {
    return 0;
  }
}

// Same API as your in-file LeftNav:
// props: { view, onChangeView, topics? }
export default function CommunitySideBar({ view, onChangeView = () => {}, topics }) {
  // unread notifications badge (seed from localStorage, live-update via custom event)
  const [notifCount, setNotifCount] = React.useState(
  Number(localStorage.getItem("unread_notifications") || 0)
);

React.useEffect(() => {
  let off = false;

  const sync = async () => {
    const cnt = await getUnreadCount();
    if (!off) {
      setNotifCount(cnt);
      localStorage.setItem("unread_notifications", String(cnt));
    }
  };

  // initial fetch
  sync();

  // listen for broadcasts from NotificationsPage (still supported)
  const onUnread = (e) => setNotifCount(Math.max(0, e?.detail?.count ?? 0));
  window.addEventListener("notify:unread", onUnread);

  // light polling + refresh when window regains focus
  const id = setInterval(sync, 30000); // 30s
  const onFocus = () => sync();
  window.addEventListener("focus", onFocus);

  return () => {
    off = true;
    clearInterval(id);
    window.removeEventListener("notify:unread", onUnread);
    window.removeEventListener("focus", onFocus);
  };
}, []);
  const TOPICS = topics && topics.length
    ? topics
    : ["Eco-Friendly tips", "Sustainable Living", "Climate Action & Advocacy", "Recycling & Upcycling"];

  const items = [
    { key: "home", label: "Home", icon: "🏠" },
    { key: "live", label: "Live Feed", icon: "🔴" },
    { key: "notify", label: "Notification", icon: "🔔" },
    { key: "messages", label: "Messages", icon: "💬" },
    { key: "feed", label: "Groups", icon: "👥" },
    { key: "members", label: "Members", icon: "🧑‍🤝‍🧑" },
  ];

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        border: `1px solid ${BORDER}`,
        borderRadius: 3,
        position: { md: "sticky" },
        top: { md: 16 },
        maxHeight: { md: "calc(100vh - 120px)" },
        overflowY: { md: "auto" },
      }}
    >
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5, color: SLATE_700 }}>
        IMAA Connect
      </Typography>

      <List dense>
        {items.map((it) => {
          // normalize current view to compare (handles 'notifications' vs 'notify', etc.)
          const norm = (v) => String(v || "").toLowerCase();
          const aliases = {
            home: ["home"],
            live: ["live", "live-feed"],
            notify: ["notify", "notification", "notifications"],
            messages: ["messages", "message", "chat"],
            feed: ["feed", "groups"],
            members: ["members", "member"],
          };
          const active = (aliases[it.key] || [it.key]).includes(norm(view));

          // bell with badge (others use simple emoji icon)
          const iconEl =
            it.key === "notify" ? (
              <Badge color="primary" badgeContent={notifCount || 0} invisible={!notifCount}>
                <NotificationsRoundedIcon sx={{ color: "#f59e0b" }} fontSize="small" />
              </Badge>
            ) : (
              <span style={{ width: 18, display: "inline-block", textAlign: "center" }}>
                {it.icon}
              </span>
            );
            const emitKey = it.key;
          return (
            <ListItem
              key={it.key}
              onClick={() => onChangeView?.(emitKey)}
              sx={{
                px: 1.25,
                borderRadius: 2,
                cursor: "pointer",
                ...(active
                  ? { bgcolor: HOVER_BG, "&:hover": { bgcolor: HOVER_BG } }
                  : { "&:hover": { background: HOVER_BG } }),
              }}
            >
              <ListItemText
                primary={
                  <Stack direction="row" alignItems="center" spacing={1.25}>
                    {iconEl}
                    <Typography variant="body2" color="text.primary">
                      {it.label}
                    </Typography>
                  </Stack>
                }
              />
            </ListItem>
          );
        })}
      </List>

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: SLATE_700, mb: 1 }}>
        Topics
      </Typography>
      <Stack spacing={1}>
        {TOPICS.map((t) => (
          <Chip key={t} label={t} variant="outlined" sx={{ width: "100%" }} />
        ))}
        <Button size="small" variant="text">… MORE</Button>
      </Stack>
    </Paper>
  );
}