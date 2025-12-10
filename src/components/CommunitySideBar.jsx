// src/components/CommunitySideBar.jsx
import * as React from "react";
import {
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  Stack,
  Divider,
  Chip,
  Button,
  Badge,
} from "@mui/material";

import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import ChatBubbleRoundedIcon from "@mui/icons-material/ChatBubbleRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import Diversity3RoundedIcon from "@mui/icons-material/Diversity3Rounded";
import LiveTvRoundedIcon from "@mui/icons-material/LiveTvRounded";
// 👇 Added Icon for My Posts
import ArticleRoundedIcon from "@mui/icons-material/ArticleRounded";

const BORDER = "#e2e8f0";
const HOVER_BG = "#e6f7f6";
const SLATE_700 = "#334155";

// harmonize with AdminSidebar
const TEAL = "#14b8b1";

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
    const r = await fetch(`${API_BASE}/notifications/?unread=1&page_size=1`, {
      headers: { ...tokenHeader(), Accept: "application/json" },
      credentials: "include",
    });
    if (!r.ok) return 0;

    const j = await r.json().catch(() => ({}));

    if (typeof j.count === "number") return j.count;

    const arr = Array.isArray(j) ? j : j?.results || [];
    return arr.reduce((acc, n) => acc + (n?.is_read ? 0 : 1), 0);
  } catch {
    return 0;
  }
}

async function getMessagesUnreadCount() {
  try {
    const r = await fetch(`${API_BASE}/messaging/conversations/`, {
      headers: { ...tokenHeader(), Accept: "application/json" },
      credentials: "include",
    });
    if (!r.ok) return 0;

    const j = await r.json().catch(() => ({}));
    const arr = Array.isArray(j) ? j : j?.results || [];
    return arr.reduce((sum, t) => sum + (t?.unread_count || 0), 0);
  } catch {
    return 0;
  }
}

// props: { view, onChangeView, topics? }
export default function CommunitySideBar({
  view,
  onChangeView = () => {},
  topics,
}) {
  const [notifCount, setNotifCount] = React.useState(
    Number(localStorage.getItem("unread_notifications") || 0)
  );
  const [messageCount, setMessageCount] = React.useState(
    Number(localStorage.getItem("unread_messages") || 0)
  );

  // Messages unread polling + event listener
  React.useEffect(() => {
    let off = false;

    const sync = async () => {
      const cnt = await getMessagesUnreadCount();
      if (!off) {
        setMessageCount(cnt);
        try {
          localStorage.setItem("unread_messages", String(cnt));
        } catch {}
      }
    };

    sync();

    const onUnread = (e) => {
      const c = Math.max(0, e?.detail?.count ?? 0);
      setMessageCount(c);
      try {
        localStorage.setItem("unread_messages", String(c));
      } catch {}
    };
    window.addEventListener("messages:unread", onUnread);

    const id = setInterval(sync, 30000);

    return () => {
      off = true;
      clearInterval(id);
      window.removeEventListener("messages:unread", onUnread);
    };
  }, []);

  // Notifications unread polling + event listener
  React.useEffect(() => {
    let off = false;

    const sync = async () => {
      const cnt = await getUnreadCount();
      if (!off) {
        setNotifCount(cnt);
        localStorage.setItem("unread_notifications", String(cnt));
      }
    };

    sync();

    const onUnread = (e) => setNotifCount(Math.max(0, e?.detail?.count ?? 0));
    window.addEventListener("notify:unread", onUnread);

    const id = setInterval(sync, 30000);
    const onFocus = () => sync();
    window.addEventListener("focus", onFocus);

    return () => {
      off = true;
      clearInterval(id);
      window.removeEventListener("notify:unread", onUnread);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const TOPICS =
    topics && topics.length
      ? topics
      : [
          "Eco-Friendly tips",
          "Sustainable Living",
          "Climate Action & Advocacy",
          "Recycling & Upcycling",
        ];

  // HARMONIZED + REORDERED ITEMS
  const items = [
    { key: "home", label: "Home", Icon: HomeRoundedIcon },
    // 👇 Added My Posts here
    { key: "members", label: "Members", Icon: Diversity3RoundedIcon },
    { key: "feed", label: "Groups", Icon: GroupsRoundedIcon }, 
    { key: "live", label: "Live Feed", Icon: LiveTvRoundedIcon },
    { key: "notify", label: "Notification", Icon: NotificationsRoundedIcon },
    { key: "messages", label: "Messages", Icon: ChatBubbleRoundedIcon },
    { key: "myposts", label: "My Posts", Icon: ArticleRoundedIcon },
  ];

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        border: `1px solid ${BORDER}`,
        borderRadius: 3,
        position: { xs: "static", lg: "sticky" },
        top: { lg: 16 },
        maxHeight: { xs: "none", lg: "calc(100vh - 120px)" },
        overflowY: { xs: "visible", lg: "auto" },
      }}
    >
      <Typography
        variant="subtitle1"
        sx={{ fontWeight: 700, mb: 1.5, color: SLATE_700 }}
      >
        IMAA Connect
      </Typography>

      <List dense>
        {items.map((it) => {
          const norm = (v) => String(v || "").toLowerCase();
          const aliases = {
            home: ["home"],
            // 👇 Added aliases for My Posts
            myposts: ["myposts", "posts", "my-posts"],
            live: ["live", "live-feed"],
            notify: ["notify", "notification", "notifications"],
            messages: ["messages", "message", "chat"],
            feed: ["feed", "groups"],
            members: ["members", "member"],
          };
          const active = (aliases[it.key] || [it.key]).includes(norm(view));

          const ItemIcon = it.Icon;

          let iconEl = null;
          if (it.key === "notify") {
            iconEl = (
              <Badge
                color="primary"
                badgeContent={notifCount || 0}
                invisible={!notifCount}
              >
                <ItemIcon
                  fontSize="small"
                  sx={{ color: active ? TEAL : "#6b7280" }}
                />
              </Badge>
            );
          } else if (it.key === "messages") {
            iconEl = (
              <Badge
                color="primary"
                badgeContent={messageCount || 0}
                invisible={!messageCount}
              >
                <ItemIcon
                  fontSize="small"
                  sx={{ color: active ? TEAL : "#6b7280" }}
                />
              </Badge>
            );
          } else if (ItemIcon) {
            iconEl = (
              <ItemIcon
                fontSize="small"
                sx={{ color: active ? TEAL : "#6b7280" }}
              />
            );
          }

          const emitKey = it.key;

          return (
            <ListItem
              key={it.key}
              onClick={() => onChangeView?.(emitKey)}
              sx={{
                px: 1.25,
                borderRadius: 2,
                cursor: "pointer",
                position: "relative",
                m: "4px 0",
                color: active ? TEAL : SLATE_700,
                "&:hover": { bgcolor: HOVER_BG },
                ...(active && {
                  bgcolor: "rgba(20,184,177,0.08)",
                  "&:hover": { bgcolor: HOVER_BG },
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    left: 6,
                    top: 6,
                    bottom: 6,
                    width: 3,
                    borderRadius: 2,
                    backgroundColor: TEAL,
                  },
                }),
              }}
            >
              <ListItemText
                primary={
                  <Stack direction="row" alignItems="center" spacing={1.25}>
                    {iconEl}
                    <Typography
                      variant="body2"
                      sx={{ color: active ? TEAL : "text.primary" }}
                    >
                      {it.label}
                    </Typography>
                  </Stack>
                }
              />
            </ListItem>
          );
        })}
      </List>
    </Paper>
  );
}