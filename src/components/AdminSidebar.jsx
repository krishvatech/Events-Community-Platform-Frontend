// src/components/AdminSidebar.jsx
import React from "react";
import {
  Box,
  Paper,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Drawer,
  Typography,
  useMediaQuery,
  useTheme,
  Badge,
} from "@mui/material";
import { isOwnerUser, isStaffUser } from "../utils/adminRole";
import EventNoteRoundedIcon from "@mui/icons-material/EventNoteRounded";
import LibraryBooksRoundedIcon from "@mui/icons-material/LibraryBooksRounded";
import OndemandVideoRoundedIcon from "@mui/icons-material/OndemandVideoRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import ShoppingCartRoundedIcon from "@mui/icons-material/ShoppingCartRounded";
import ArticleRoundedIcon from "@mui/icons-material/ArticleRounded";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import ChatBubbleRoundedIcon from "@mui/icons-material/ChatBubbleRounded";
import BadgeRoundedIcon from "@mui/icons-material/BadgeRounded";


const TEAL = "#14b8b1";
const TEXT = "#334155";
const HOVER_BG = "#e6f7f6";
const CARD_BG = "#ffffff";
const CARD_BORDER = "#e5e7eb";

// Always resolve to the Django API (e.g., http://localhost:8000/api)
const RAW_BASE = (import.meta.env.VITE_API_BASE_URL || "").trim();
const API_ROOT = RAW_BASE.endsWith("/") ? RAW_BASE.slice(0, -1) : RAW_BASE;

const tokenHeader = () => {
  const t =
    localStorage.getItem("access_token") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("access") ||
    localStorage.getItem("jwt");
  return t ? { Authorization: `Bearer ${t}` } : {};
};

async function countFromPaginated(url) {
  try {
    const r = await fetch(url, {
      headers: { ...tokenHeader(), Accept: "application/json" },
      credentials: "include",
    });
    if (!r.ok) return 0;
    const j = await r.json().catch(() => ({}));
    if (typeof j.count === "number") return j.count;
    const arr = Array.isArray(j) ? j : j?.results || [];
    return arr.length;
  } catch {
    return 0;
  }
}

async function getUnreadGroupNotifCount(kind) {
  return countFromPaginated(
    `${API_ROOT}/group-notifications/?unread=1&kind=${encodeURIComponent(kind)}&page_size=1`
  );
}

async function getPendingNameRequestsCount() {
  // ✅ IMPORTANT: Avoid calling admin-only API for staff users
  if (!isOwnerUser()) return 0;

  return countFromPaginated(
    `${API_ROOT}/auth/admin/name-requests/?status=pending&page_size=1`
  );
}

async function getPendingJoinRequestsCount() {
  try {
    const r = await fetch(`${API_ROOT}/groups/?page_size=200`, {
      headers: { ...tokenHeader(), Accept: "application/json" },
      credentials: "include",
    });
    if (!r.ok) return 0;
    const j = await r.json().catch(() => ({}));
    const groups = Array.isArray(j) ? j : j?.results || [];

    const manageable = groups.filter((g) =>
      ["owner", "admin", "moderator"].includes(g?.current_user_role)
    );

    const counts = await Promise.all(
      manageable.map(async (g) => {
        try {
          const rr = await fetch(`${API_ROOT}/groups/${g.id}/member-requests/`, {
            headers: { ...tokenHeader(), Accept: "application/json" },
            credentials: "include",
          });
          if (!rr.ok) return 0;
          const jj = await rr.json().catch(() => ({}));
          if (typeof jj.count === "number") return jj.count;
          return Array.isArray(jj.requests) ? jj.requests.length : 0;
        } catch {
          return 0;
        }
      })
    );

    return counts.reduce((a, b) => a + (b || 0), 0);
  } catch {
    return 0;
  }
}

// ✅ This matches what AdminNotificationsPage shows (pending/unread mix)
async function getAdminNotificationsBadgeCount() {
  const [joinPending, memberJoinedUnread, groupCreatedUnread, namePending] =
    await Promise.all([
      getPendingJoinRequestsCount(),
      getUnreadGroupNotifCount("member_joined"),
      getUnreadGroupNotifCount("group_created"),
      getPendingNameRequestsCount(), // if you DON'T want identity requests in Notifications badge → remove this line
    ]);

  return (joinPending || 0) + (memberJoinedUnread || 0) + (groupCreatedUnread || 0) + (namePending || 0);
}


const defaultItems = [
  { key: "events", label: "My Events", Icon: EventNoteRoundedIcon },
  { key: "posts", label: "Posts", Icon: ArticleRoundedIcon },
  { key: "resources", label: "My Resources", Icon: LibraryBooksRoundedIcon },
  { key: "recordings", label: "My Recordings", Icon: OndemandVideoRoundedIcon },
  { key: "groups", label: "Groups", Icon: GroupsRoundedIcon },
  { key: "messages", label: "Messages", Icon: ChatBubbleRoundedIcon },
  { key: "carts", label: "Cart", Icon: ShoppingCartRoundedIcon },
  { key: "name-requests", label: "Identity Verification", Icon: BadgeRoundedIcon },
  { key: "staff", label: "Staff", Icon: AdminPanelSettingsRoundedIcon },
  { key: "notifications", label: "Notifications", Icon: NotificationsRoundedIcon },
  { key: "settings", label: "Settings", Icon: SettingsRoundedIcon },
];

export default function AdminSidebar({
  active = "events",
  onSelect,
  mobileOpen = false,
  onMobileClose,
  title = "Admin",
  items,
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  let listItems = items ?? defaultItems;
  const owner = isOwnerUser();
  const staffOnly = !owner && isStaffUser();
  if (owner) {
    listItems = listItems.filter((item) => item.key !== "carts");
  }
  if (staffOnly) {
    listItems = listItems
      .filter((item) => !["staff", "posts", "name-requests"].includes(item.key))
      .map((item) =>
        item.key === "settings" ? { ...item, label: "Profile" } : item
      );
  }

  const [adminNotifCount, setAdminNotifCount] = React.useState(
    Number(localStorage.getItem("admin_unread_notifications") || 0)
  );

  React.useEffect(() => {
    let off = false;

    const sync = async () => {
      const cnt = await getAdminNotificationsBadgeCount();
      if (!off) {
        setAdminNotifCount(cnt);
        try {
          localStorage.setItem("admin_unread_notifications", String(cnt));
        } catch { }
      }
    };

    sync();

    const onUnread = (e) => {
      const c = Math.max(0, e?.detail?.count ?? 0);
      setAdminNotifCount(c);
      try {
        localStorage.setItem("admin_unread_notifications", String(c));
      } catch { }
    };

    window.addEventListener("admin:notify:unread", onUnread);

    const id = setInterval(sync, 30000);
    const onFocus = () => sync();
    window.addEventListener("focus", onFocus);

    return () => {
      off = true;
      clearInterval(id);
      window.removeEventListener("admin:notify:unread", onUnread);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const ListUI = (
    <Paper
      elevation={0}
      variant="outlined"
      sx={{ width: 280, bgcolor: CARD_BG, borderColor: CARD_BORDER, borderRadius: 3, p: 1 }}
    >
      <Box sx={{ px: 2, pt: 1, pb: 1 }}>
        <Typography variant="subtitle2" sx={{ color: TEXT, fontWeight: 700 }}>
          {title}
        </Typography>
      </Box>
      <List dense disablePadding>
        {listItems.map((item) => {
          const selected = active === item.key;
          const ItemIcon = item.Icon || item.icon || null;
          { ItemIcon && <ItemIcon className="mr-2" fontSize="small" /> }
          return (
            <ListItemButton
              selected={active === item.key}
              onClick={() => onSelect?.(item.key)}
              sx={{
                position: "relative",
                m: "4px 8px",
                borderRadius: 2,
                color: selected ? TEAL : TEXT,
                "& .MuiListItemIcon-root": { minWidth: 40, color: selected ? TEAL : "#6b7280" },
                "&.Mui-selected": { bgcolor: "rgba(20,184,177,0.08)" },
                "&.Mui-selected:hover": { bgcolor: HOVER_BG },
                "&:hover": { bgcolor: HOVER_BG },
                "&.Mui-selected::before": {
                  content: '""',
                  position: "absolute",
                  left: 6,
                  top: 6,
                  bottom: 6,
                  width: 3,
                  borderRadius: 2,
                  backgroundColor: TEAL,
                },
              }}
            >
              {ItemIcon && (
                <ListItemIcon>
                  {item.key === "notifications" ? (
                    <Badge
                      color="primary"
                      badgeContent={adminNotifCount || 0}
                      invisible={!adminNotifCount}
                    >
                      <ItemIcon fontSize="small" />
                    </Badge>
                  ) : (
                    <ItemIcon fontSize="small" />
                  )}
                </ListItemIcon>
              )}
              <ListItemText primary={item.label} />
            </ListItemButton>
          );
        })}
      </List>
    </Paper>
  );

  return isMobile ? (
    <Drawer anchor="left" open={mobileOpen} onClose={onMobileClose}>
      <Box sx={{ p: 1 }}>{ListUI}</Box>
    </Drawer>
  ) : (
    <Box sx={{ width: 280 }}>{ListUI}</Box>
  );
}
