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
import { apiClient } from "../utils/api";


const TEAL = "#14b8b1";
const TEXT = "#334155";
const HOVER_BG = "#e6f7f6";
const CARD_BG = "#ffffff";
const CARD_BORDER = "#e5e7eb";

// Helper uses apiClient to benefit from interceptors
async function countFromPaginated(url) {
  try {
    // apiClient already handles Authorization & Refresh
    const res = await apiClient.get(url);
    const j = res.data;
    if (typeof j.count === "number") return j.count;
    const arr = Array.isArray(j) ? j : j?.results || [];
    return arr.length;
  } catch {
    return 0;
  }
}

async function getUnreadGroupNotifCount(kind) {
  // Use relative URL so apiClient uses baseURL
  return countFromPaginated(
    `/group-notifications/?unread=1&kind=${encodeURIComponent(kind)}&page_size=1`
  );
}

async function getPendingNameRequestsCount() {
  if (!isOwnerUser()) return 0;
  return countFromPaginated(
    `/auth/admin/name-requests/?status=pending&page_size=1`
  );
}

async function getPendingJoinRequestsCount() {
  try {
    const r = await apiClient.get(`/groups/?page_size=200`);
    const j = r.data;
    const groups = Array.isArray(j) ? j : j?.results || [];

    const manageable = groups.filter((g) =>
      ["owner", "admin", "moderator"].includes(g?.current_user_role)
    );

    const counts = await Promise.all(
      manageable.map(async (g) => {
        try {
          const rr = await apiClient.get(`/groups/${g.id}/member-requests/`);
          const jj = rr.data;
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
      getPendingNameRequestsCount(),
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
  { key: "saleor", label: "Saleor Dashboard", Icon: ShoppingCartRoundedIcon },
  { key: "cms", label: "CMS", Icon: ArticleRoundedIcon },
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
    const allowed = [
      "events",
      "resources",
      "recordings",
      "groups",
      "messages",
      "carts",
      "notifications",
      "settings",
    ];
    listItems = listItems
      .filter((item) => allowed.includes(item.key))
      .map((item) =>
        item.key === "settings" ? { ...item, label: "Profile" } : item
      );
  }

  const [adminNotifCount, setAdminNotifCount] = React.useState(
    Number(localStorage.getItem("admin_unread_notifications") || 0)
  );

  // New state for messages count
  const [messageCount, setMessageCount] = React.useState(
    Number(localStorage.getItem("unread_messages") || 0)
  );

  React.useEffect(() => {
    let off = false;

    // Helper to get total unread messages across all conversations
    const getUnreadMessageCount = async () => {
      try {
        const res = await apiClient.get(`/messaging/conversations/`);
        const raw = res.data;
        const data = Array.isArray(raw) ? raw : (raw?.results || []);

        const total = data.reduce((acc, curr) => acc + (curr.unread_count || 0), 0);
        return total;
      } catch (e) {
        console.error("Failed to fetch unread messages count", e);
        return 0;
      }
    };

    const sync = async () => {
      const cnt = await getAdminNotificationsBadgeCount();
      const msgCnt = await getUnreadMessageCount();

      if (!off) {
        setAdminNotifCount(cnt);
        setMessageCount(msgCnt);
        try {
          localStorage.setItem("admin_unread_notifications", String(cnt));
          localStorage.setItem("unread_messages", String(msgCnt));
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

    // Listener for messages:unread from AdminMessagesPage
    const onMessageUnread = (e) => {
      const c = Math.max(0, e?.detail?.count ?? 0);
      setMessageCount(c);
      try {
        localStorage.setItem("unread_messages", String(c));
      } catch { }
    };

    window.addEventListener("admin:notify:unread", onUnread);
    window.addEventListener("messages:unread", onMessageUnread);

    const id = setInterval(sync, 30000);
    const onFocus = () => sync();
    window.addEventListener("focus", onFocus);

    return () => {
      off = true;
      clearInterval(id);
      window.removeEventListener("admin:notify:unread", onUnread);
      window.removeEventListener("messages:unread", onMessageUnread);
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
                  ) : item.key === "messages" ? (
                    <Badge
                      color="primary"
                      badgeContent={messageCount || 0}
                      invisible={!messageCount}
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
