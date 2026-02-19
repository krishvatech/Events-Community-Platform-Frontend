// src/pages/AdminNotificationsPage.jsx
import * as React from "react";
import {
  Box,
  Stack,
  Paper,
  Avatar,
  Typography,
  Chip,
  Button,
  IconButton,
  Divider,
  FormControlLabel,
  Snackbar,
  Alert,
  useMediaQuery,
  MenuItem,
  Switch,
  FormControl,
  Select,
  Container,
  Skeleton
} from "@mui/material";
import { Link } from "react-router-dom";
import DoneAllRoundedIcon from "@mui/icons-material/DoneAllRounded";
import MarkEmailReadOutlinedIcon from "@mui/icons-material/MarkEmailReadOutlined";
import MarkEmailUnreadOutlinedIcon from "@mui/icons-material/MarkEmailUnreadOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import HighlightOffIcon from "@mui/icons-material/HighlightOff";
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded';
import HourglassBottomRoundedIcon from "@mui/icons-material/HourglassBottomRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import { isOwnerUser } from "../utils/adminRole";

// --- Config ---
const API_ROOT = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");
const TEAL = "#14b8b1";
const BORDER = "#e2e8f0"; // Matches your community theme
const getToken = () => localStorage.getItem("access_token") || localStorage.getItem("access_token") || "";
const authHeader = () => {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
};

// Small helper: build query string
const qs = (obj = {}) =>
  Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

const ENDPOINTS = {
  notifList: (params) =>
    `${API_ROOT}/group-notifications/?${qs({
      kind: params?.kind,
      unread: params?.unread ? 1 : undefined,
      page: params?.page,
      page_size: params?.page_size,
    })}`,
  notifMarkReadBulk: () => `${API_ROOT}/group-notifications/mark-read/`,
  standardNotifList: (params) =>
    `${API_ROOT}/notifications/?${qs({
      kind: params?.kind,
      unread: params?.unread ? 1 : undefined,
      page: params?.page,
      page_size: params?.page_size,
    })}`,
  standardNotifMarkReadBulk: () => `${API_ROOT}/notifications/mark-read/`,
  groupsPage: (page = 1) => `${API_ROOT}/groups/?${qs({ page, page_size: 50 })}`,
  pendingForGroup: (groupId) => `${API_ROOT}/groups/${groupId}/member-requests/`,
  approveJoin: (groupId, userId) => `${API_ROOT}/groups/${groupId}/member-requests/approve/${userId}/`,
  rejectJoin: (groupId, userId) => `${API_ROOT}/groups/${groupId}/member-requests/reject/${userId}/`,
  // CHANGED: Removed "?status=pending" to fetch ALL name requests (history)
  nameRequestsList: () => `${API_ROOT}/auth/admin/name-requests/`,
  nameRequestDecide: (id) => `${API_ROOT}/auth/admin/name-requests/${id}/decide/`,
  verificationRequestsList: () => `${API_ROOT}/users/admin/verification-requests/`,
  verificationRequestDecide: (id) => `${API_ROOT}/users/admin/verification-request/${id}/decide/`,
};

// ---- Helpers ----
// Returns the best display name for a user_details object.
// Priority: first+last name → full_name → username → "User"
const getUserDisplayName = (u) => {
  const name = `${u?.first_name || ""} ${u?.last_name || ""}`.trim();
  return name || u?.full_name || u?.username || "User";
};

// ---- Data Loaders ----
async function loadNameChangeRequests() {
  // ✅ Staff should not call superuser-only endpoint
  if (!isOwnerUser()) return { items: [], count: 0 };
  try {
    const res = await fetch(ENDPOINTS.nameRequestsList(), { headers: { Accept: "application/json", ...authHeader() } });
    if (!res.ok) return { items: [], count: 0 };
    const data = await res.json();
    const rows = Array.isArray(data) ? data : data?.results || [];
    const items = rows.map((req) => ({
      id: req.id,
      _source: "name_request",
      type: "name_change",
      status: req.status, // 'pending', 'approved', or 'rejected'
      created_at: req.created_at,
      actor_name: req.username || req.user?.username || "User",
      actor_avatar: "",
      user_id: req.user,
      data: {
        old_name: `${req.old_first_name} ${req.old_last_name}`,
        new_name: `${req.new_first_name} ${req.new_last_name}`,
        reason: req.reason
      },
      // CHANGED: If status is NOT pending, treat it as "read" (so it has white background)
      read_at: req.status === 'pending' ? null : (req.updated_at || new Date().toISOString()),
    }));
    return { items, count: items.length };
  } catch (e) {
    return { items: [], count: 0 };
  }
}

async function loadVerificationRequests() {
  if (!isOwnerUser()) return { items: [], count: 0 };
  try {
    const res = await fetch(ENDPOINTS.verificationRequestsList(), { headers: { Accept: "application/json", ...authHeader() } });
    if (!res.ok) return { items: [], count: 0 };
    const data = await res.json();
    const rows = Array.isArray(data) ? data : data?.results || [];
    // Only show pending ones for notifications normally, or all if we treat them like name requests
    const items = rows.map((req) => ({
      id: `verif-${req.id}`,
      real_id: req.id,
      _source: "verification_request",
      type: "verification_request",
      status: req.status,
      created_at: req.created_at,
      actor_name: getUserDisplayName(req.user_details),
      actor_avatar: req.user_details?.avatar_url || req.user_details?.user_image_url || "",
      user_id: req.user,
      data: {
        reason: req.reason
      },
      read_at: req.status === 'pending' ? null : (req.updated_at || new Date().toISOString()),
    }));
    return { items, count: items.length };
  } catch (e) {
    return { items: [], count: 0 };
  }
}

async function loadJoinRequests() {
  try {
    const res = await fetch(ENDPOINTS.groupsPage(1), { headers: { Accept: "application/json", ...authHeader() } });
    if (!res.ok) return { items: [], count: 0 };
    const data = await res.json();
    const groups = Array.isArray(data) ? data : data?.results || [];
    const manageable = groups.filter((g) => ["owner", "admin", "moderator"].includes(g?.current_user_role));
    const rowsByGroup = await Promise.all(
      manageable.map(async (g) => {
        try {
          const r = await fetch(ENDPOINTS.pendingForGroup(g.id), { headers: { Accept: "application/json", ...authHeader() } });
          if (!r.ok) return [];
          const jr = await r.json();
          return (jr?.requests || []).map((req) => ({
            id: `join-${g.id}-${req?.user?.id}`,
            _source: "join",
            type: "join_request",
            status: req?.status || "pending",
            created_at: req?.joined_at,
            actor_name: req?.user?.name || "Someone",
            actor_avatar: req?.user?.avatar || "",
            user_id: req?.user?.id,
            group: { id: g.id, name: g.name },
            read_at: null,
          }));
        } catch {
          return [];
        }
      })
    );

    const all = rowsByGroup.flat();
    return { items: all, count: all.length };
  } catch { return { items: [], count: 0 }; }
}

async function loadMemberJoined(onlyUnread) {
  try {
    const res = await fetch(ENDPOINTS.notifList({ kind: "member_joined", unread: onlyUnread ? 1 : undefined, page_size: 50 }), { headers: { Accept: "application/json", ...authHeader() } });
    if (!res.ok) return { items: [], count: 0 };
    const j = await res.json();
    const list = Array.isArray(j) ? j : j?.results || [];
    const items = list.filter((n) => n?.data?.type === "group_member_joined").map((n) => ({
      id: n.id,
      _source: "notif",
      type: "member_joined",
      created_at: n.created_at,
      actor_id: n?.actor?.id,
      actor_name: n?.actor?.display_name || n?.actor?.username || "Someone",
      actor_avatar: n?.actor?.avatar_url || "",
      user_id: n?.data?.user_id,
      group: { id: n?.data?.group_id, name: n?.data?.group_name || `#${n?.data?.group_id}` },
      read_at: n?.is_read ? n.created_at : null,
    }));
    return { items, count: items.length };
  } catch { return { items: [], count: 0 }; }
}

async function loadGroupCreated(onlyUnread) {
  try {
    const res = await fetch(ENDPOINTS.notifList({ kind: "group_created", unread: onlyUnread ? 1 : undefined, page_size: 50 }), { headers: { Accept: "application/json", ...authHeader() } });
    if (!res.ok) return { items: [], count: 0 };
    const j = await res.json();
    const list = Array.isArray(j) ? j : j?.results || [];
    const items = list.filter((n) => n?.data?.type === "group_created").map((n) => ({
      id: n.id,
      _source: "notif",
      type: "group_created",
      created_at: n.created_at,
      actor_id: n?.actor?.id,
      actor_name: n?.actor?.display_name || n?.actor?.username || "Someone",
      actor_avatar: n?.actor?.avatar_url || "",
      group: { id: n?.data?.group_id ?? n?.group, name: n?.data?.group_name || `#${n?.data?.group_id ?? n?.group}` },
      read_at: n?.is_read ? n.created_at : null,
    }));
    return { items, count: items.length };
  } catch { return { items: [], count: 0 }; }
}

async function loadParentLinkNotifications(onlyUnread) {
  try {
    const [reqRes, appRes] = await Promise.all([
      fetch(ENDPOINTS.notifList({ kind: "parent_link_request", unread: onlyUnread ? 1 : undefined, page_size: 50 }), { headers: { Accept: "application/json", ...authHeader() } }),
      fetch(ENDPOINTS.notifList({ kind: "parent_link_approved", unread: onlyUnread ? 1 : undefined, page_size: 50 }), { headers: { Accept: "application/json", ...authHeader() } }),
    ]);
    const mapRow = (n) => ({
      id: n.id,
      _source: "notif",
      type: n.kind || n?.data?.type,
      status: n.state || (n.is_read ? "read" : "pending"),
      created_at: n.created_at,
      actor_id: n?.actor?.id,
      actor_name: n?.actor?.display_name || n?.actor?.username || "System",
      actor_avatar: n?.actor?.avatar_url || "",
      title: n.title || "",
      description: n.description || "",
      group: { id: n?.data?.child_group_id, name: n?.data?.child_group_name || `#${n?.data?.child_group_id}` },
      data: n.data || {},
      read_at: n?.is_read ? n.created_at : null,
    });
    const reqList = reqRes.ok ? ((await reqRes.json().catch(() => ({}))).results || []).map(mapRow) : [];
    const appList = appRes.ok ? ((await appRes.json().catch(() => ({}))).results || []).map(mapRow) : [];
    const items = [...reqList, ...appList].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
    return { items, count: items.length };
  } catch { return { items: [], count: 0 }; }
}

async function loadStandardNotifications(onlyUnread, kindFilter) {
  try {
    const res = await fetch(
      ENDPOINTS.standardNotifList({
        kind: kindFilter,
        unread: onlyUnread ? 1 : undefined,
        page_size: 100
      }),
      { headers: { Accept: "application/json", ...authHeader() } }
    );
    if (!res.ok) return { items: [], count: 0 };
    const j = await res.json();
    const list = Array.isArray(j) ? j : j?.results || [];

    const items = list.map((n) => ({
      id: `std-${n.id}`,
      _source: "standard_notif",
      type: n.kind,
      status: n.state || (n.is_read ? "read" : "unread"),
      created_at: n.created_at,
      actor_id: n?.actor?.id,
      actor_name: n?.actor?.first_name || n?.actor?.username || n?.actor?.email || "User",
      actor_avatar: n?.actor?.avatar_url || "",
      data: n.data || {},
      description: n.description,
      title: n.title,
      read_at: n.is_read ? n.created_at : null,
      original_id: n.id, // Store original ID for mark-read
    }));

    return { items, count: items.length };
  } catch (e) {
    console.warn("Failed to load standard notifications:", e);
    return { items: [], count: 0 };
  }
}


function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function profileHref(n) { return (n?.user_id || n?.actor_id) ? `/community/rich-profile/${n.user_id || n.actor_id}` : "#"; }
function groupHref(n) { return n?.group?.id ? `/community/groups/${n.group.id}` : "#"; }

const VERIF_ICON = <BadgeRoundedIcon style={{ fontSize: 12 }} />;

// --- Sub-Component: Notification Row ---
function AdminNotificationRow({ n, busy, onApprove, onReject, onDecideName, onDecideVerif, onMarkRead }) {
  // Logic: It's "read" if it has a read_at date AND it is not pending. 
  // Pending items are always highlighted (teal background).
  const isRead = !!n.read_at && n.status !== 'pending';
  const isMobile = useMediaQuery("(max-width:600px)");

  // Check if this is a moderation report notification
  const isModerationReport = n.type === "system" && (n.title?.toLowerCase().includes("report") || n.data?.type === "moderation_report");

  // Helper to render Status Chip on right
  const renderStatus = () => {
    const s = n.status || (n.read_at ? "read" : "pending");
    const common = { size: "small", variant: "outlined", sx: { mt: 0.5, height: 24, borderRadius: "999px", fontWeight: 600, "& .MuiChip-label": { px: 0.5, pt: "1px" } } };

    if (s === "approved") return <Chip {...common} icon={<CheckCircleRoundedIcon sx={{ fontSize: 16 }} />} label="Approved" sx={{ ...common.sx, bgcolor: "#e6f4ea", borderColor: "#e6f4ea", color: "#1a7f37", "& .MuiChip-icon": { color: "#1a7f37", mr: 0.5 } }} />;
    if (s === "rejected") return <Chip {...common} icon={<CancelRoundedIcon sx={{ fontSize: 16 }} />} label="Rejected" sx={{ ...common.sx, bgcolor: "#fde7e9", borderColor: "#fde7e9", color: "#b42318", "& .MuiChip-icon": { color: "#b42318", mr: 0.5 } }} />;
    if (s === "pending") return <Chip {...common} icon={<HourglassBottomRoundedIcon sx={{ fontSize: 16 }} />} label="Pending" sx={{ ...common.sx, bgcolor: "#fff7ed", borderColor: "#ffedd5", color: "#c2410c", "& .MuiChip-icon": { color: "#c2410c", mr: 0.5 } }} />;
    return null;
  };

  return (
    <Paper
      component={isModerationReport ? Link : "div"}
      to={isModerationReport ? "/admin/moderation" : undefined}
      elevation={0}
      sx={{
        p: 1.5,
        mb: 1.5,
        width: "100%",
        border: `1px solid ${BORDER}`,
        borderRadius: 2,
        bgcolor: isRead ? "white" : "#f6fffe", // Light teal background for unread/pending
        transition: 'all 0.2s',
        '&:hover': { borderColor: '#cbd5e1', cursor: isModerationReport ? 'pointer' : 'default' },
        textDecoration: 'none',
        color: 'inherit'
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        {/* Avatar */}
        <Avatar
          component={Link}
          to={profileHref(n)}
          src={n.actor_avatar || ""}
          sx={{ width: 44, height: 44, border: `1px solid ${BORDER}`, bgcolor: 'grey.100', color: 'grey.600', fontWeight: 700 }}
        >
          {n.actor_name?.[0]?.toUpperCase()}
        </Avatar>

        {/* Content */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* Main Text Logic */}
          <Typography variant="body2" sx={{ lineHeight: 1.5, color: '#0f172a' }}>
            {n.type === "name_change" ? (
              <>
                <Box component="span" fontWeight={700}>{n.actor_name}</Box> requested a name change from <b>{n.data.old_name}</b> to <b>{n.data.new_name}</b>.
              </>
            ) : n.type === "verification_request" ? (
              <>
                <Box component="span" fontWeight={700}>{n.actor_name}</Box> requested verification renewal.
              </>
            ) : n.type === "join_request" ? (
              <>
                <Box component="span" fontWeight={700}>{n.actor_name}</Box> requested to join <Box component={Link} to={groupHref(n)} sx={{ textDecoration: 'none', fontWeight: 700, color: 'inherit' }}>{n?.group?.name}</Box>.
              </>
            ) : n.type === "member_joined" ? (
              <>
                <Box component="span" fontWeight={700}>{n.actor_name}</Box> joined <Box component={Link} to={groupHref(n)} sx={{ textDecoration: 'none', fontWeight: 700, color: 'inherit' }}>{n?.group?.name}</Box>.
              </>
            ) : n.type === "parent_link_request" ? (
              <>
                🔗 <Box component="span" fontWeight={700}>{n.data?.child_group_name || n.actor_name}</Box> sent a parent link request to join <Box component={Link} to={n.data?.parent_group_id ? `/community/groups/${n.data.parent_group_id}` : "#"} sx={{ textDecoration: 'none', fontWeight: 700, color: 'inherit' }}>{n.data?.parent_group_name || "your group"}</Box>.
              </>
            ) : n.type === "parent_link_approved" ? (
              <>
                ✅ Link request from <Box component="span" fontWeight={700}>{n.data?.child_group_name || n.group?.name}</Box> to <Box component={Link} to={n.data?.parent_group_id ? `/community/groups/${n.data.parent_group_id}` : "#"} sx={{ textDecoration: 'none', fontWeight: 700, color: 'inherit' }}>{n.data?.parent_group_name || "parent group"}</Box> was <b>approved</b>.
              </>
            ) : n.type === "friend_request" ? (
              <>
                <Box component="span" fontWeight={700}>{n.actor_name}</Box> sent you a friend request.
              </>
            ) : n.type === "mention" ? (
              <>
                <Box component="span" fontWeight={700}>{n.actor_name}</Box> mentioned you in a post.
              </>
            ) : n.type === "comment" ? (
              <>
                <Box component="span" fontWeight={700}>{n.actor_name}</Box> commented on your post.
              </>
            ) : n.type === "reaction" ? (
              <>
                <Box component="span" fontWeight={700}>{n.actor_name}</Box> reacted to your post.
              </>
            ) : n.type === "event" ? (
              <>
                <Box component="span" fontWeight={700}>{n.title || "Event notification"}</Box>
              </>
            ) : n.type === "system" ? (
              <>
                <Box component="span" fontWeight={700}>System:</Box> {n.title}
              </>
            ) : (
              <>
                <Box component="span" fontWeight={700}>{n.actor_name}</Box> created group <Box component={Link} to={groupHref(n)} sx={{ textDecoration: 'none', fontWeight: 700, color: 'inherit' }}>{n?.group?.name}</Box>.
              </>
            )}
          </Typography>

          {/* Show description for standard notifications */}
          {n.description && n._source === "standard_notif" && (
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: '#64748b' }}>
              {n.description}
            </Typography>
          )}

          {/* Subtext Row: Kind Badge + Date */}
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5 }}>
            {n.type === "name_change" && <Chip label="Identity Request" size="small" icon={<BadgeRoundedIcon style={{ fontSize: 12 }} />} sx={{ height: 20, fontSize: 10, bgcolor: '#394d79ff', color: 'white', '& .MuiChip-label': { px: 0.5 }, '& .MuiChip-icon': { color: 'white', ml: 0.5 } }} />}
            {n.type === "verification_request" && <Chip label="Verification Request" size="small" icon={VERIF_ICON} sx={{ height: 20, fontSize: 10, bgcolor: '#7c3aed', color: 'white', '& .MuiChip-label': { px: 0.5 }, '& .MuiChip-icon': { color: 'white', ml: 0.5 } }} />}
            <Typography variant="caption" color="text.secondary">{formatTime(n.created_at)}</Typography>
          </Stack>

          {/* Special Data: Reason */}
          {(n.type === "name_change" || n.type === "verification_request") && n.data?.reason && (
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: '#64748b', fontStyle: 'italic' }}>
              "{n.data.reason}"
            </Typography>
          )}

          {/* ACTION BUTTONS (Only if pending) */}
          {n.status === 'pending' && (n.type === "name_change" || n.type === "join_request" || n.type === "verification_request") && (
            <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
              <Button
                size="small"
                variant="contained"
                disabled={busy}
                onClick={() => {
                  if (n.type === "name_change") return onDecideName(n, "approved");
                  if (n.type === "verification_request") return onDecideVerif(n, "approved");
                  return onApprove(n);
                }}
                startIcon={<CheckCircleOutlineIcon />}
                sx={{ textTransform: "none", borderRadius: 2, bgcolor: TEAL, '&:hover': { bgcolor: TEAL }, px: 2 }}
              >
                Approve
              </Button>
              <Button
                size="small"
                variant="outlined"
                disabled={busy}
                onClick={() => {
                  if (n.type === "name_change") return onDecideName(n, "rejected");
                  if (n.type === "verification_request") return onDecideVerif(n, "rejected");
                  return onReject(n);
                }}
                startIcon={<HighlightOffIcon />}
                sx={{ textTransform: "none", borderRadius: 2, color: 'text.secondary', borderColor: BORDER, '&:hover': { bgcolor: 'grey.50', borderColor: 'grey.400' } }}
              >
                Reject
              </Button>
            </Stack>
          )}
        </Box>

        {/* Right Side: Actions & Status */}
        <Stack spacing={0.5} alignItems="flex-end" sx={{ flexShrink: 0 }}>
          <Stack direction="row" spacing={0.5}>
            {/* Mark Read/Unread Toggle */}
            {(n._source === 'notif' || n._source === 'standard_notif') && (
              <IconButton size="small" onClick={() => onMarkRead(n)} title={isRead ? "Mark as unread" : "Mark as read"}>
                {isRead ? <MarkEmailReadOutlinedIcon fontSize="small" color="disabled" /> : <MarkEmailUnreadOutlinedIcon fontSize="small" color="primary" />}
              </IconButton>
            )}
          </Stack>

          {/* Status Badge (Accepted/Declined/Pending) */}
          {renderStatus()}
        </Stack>
      </Stack>
    </Paper>
  );
}

// --- Skeleton Component ---
function AdminNotificationSkeleton() {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        mb: 1.5,
        width: "100%",
        border: `1px solid ${BORDER}`,
        borderRadius: 2,
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <Skeleton variant="circular" width={44} height={44} />
        <Box sx={{ flex: 1 }}>
          <Skeleton variant="text" width="60%" height={24} />
          <Skeleton variant="text" width="30%" height={16} sx={{ mt: 0.5 }} />
          <Skeleton variant="rounded" width={140} height={32} sx={{ mt: 1.5 }} />
        </Box>
      </Stack>
    </Paper>
  );
}

// --- MAIN COMPONENT ---
export default function AdminNotificationsPage() {
  const isMobile = useMediaQuery("(max-width:600px)");
  const [tab, setTab] = React.useState("all");
  const [onlyUnread, setOnlyUnread] = React.useState(false);
  const [items, setItems] = React.useState([]);
  const [count, setCount] = React.useState(0);
  const [unreadCount, setUnreadCount] = React.useState(0);

  // -- Loading & Infinite Scroll State --
  const [initialLoading, setInitialLoading] = React.useState(true);
  const [visibleCount, setVisibleCount] = React.useState(8);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const observerTarget = React.useRef(null);

  const [busyId, setBusyId] = React.useState(null);
  const [toast, setToast] = React.useState({ open: false, type: "success", msg: "" });
  const [userInitial, setUserInitial] = React.useState("A");

  // Calculate visible items based on infinite scroll state
  const visibleItems = React.useMemo(() => {
    return items.slice(0, visibleCount);
  }, [items, visibleCount]);

  React.useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await fetch(`${API_ROOT}/users/me/`, { headers: { Authorization: `Bearer ${getToken()}` } });
        if (res.ok) {
          const data = await res.json();
          const name = data.first_name || data.username || "Admin";
          setUserInitial(name.charAt(0).toUpperCase());
        }
      } catch (e) { }
    };
    fetchMe();
  }, []);

  const syncUnread = React.useCallback((nextItems) => {
    const unread = nextItems.filter((x) =>
      (x.type === "join_request" || x.type === "name_change" || x.type === "verification_request")
        ? x.status === "pending"
        : !x.read_at
    ).length;

    setUnreadCount(unread);
    try { localStorage.setItem("admin_unread_notifications", String(unread)); } catch { }
    window.dispatchEvent(new CustomEvent("admin:notify:unread", { detail: { count: unread } }));
  }, []);

  // --- Intersection Observer Logic ---
  React.useEffect(() => {
    // If we have shown all items or are currently loading, do nothing
    if (isLoadingMore || visibleCount >= items.length || !observerTarget.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsLoadingMore(true);
          // Fake network delay for smooth UX
          setTimeout(() => {
            setVisibleCount((prev) => prev + 5);
            setIsLoadingMore(false);
          }, 500);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [isLoadingMore, visibleCount, items.length]);


  const fetchData = React.useCallback(async () => {
    setInitialLoading(true);
    try {
      let out = { items: [], count: 0 };

      // Filter-specific loading
      if (tab === "name_change") out = await loadNameChangeRequests();
      else if (tab === "verification_request") out = await loadVerificationRequests();
      else if (tab === "join_request") out = await loadJoinRequests();
      else if (tab === "member_joined") out = await loadMemberJoined(onlyUnread);
      else if (tab === "group_created") out = await loadGroupCreated(onlyUnread);
      else if (tab === "friend_request") out = await loadStandardNotifications(onlyUnread, "friend_request");
      else if (tab === "mention") out = await loadStandardNotifications(onlyUnread, "mention");
      else if (tab === "comment") out = await loadStandardNotifications(onlyUnread, "comment");
      else if (tab === "reaction") out = await loadStandardNotifications(onlyUnread, "reaction");
      else if (tab === "event") out = await loadStandardNotifications(onlyUnread, "event");
      else if (tab === "system") out = await loadStandardNotifications(onlyUnread, "system");
      else if (tab === "parent_link") out = await loadParentLinkNotifications(onlyUnread);
      else {
        // "all" tab - load everything
        const [reqs, joined, created, names, verifs, standard, parentLinks] = await Promise.all([
          loadJoinRequests(),
          loadMemberJoined(onlyUnread),
          loadGroupCreated(onlyUnread),
          loadNameChangeRequests(),
          loadVerificationRequests(),
          loadStandardNotifications(onlyUnread),
          loadParentLinkNotifications(onlyUnread),
        ]);
        out.items = [
          ...names.items,
          ...verifs.items,
          ...reqs.items,
          ...joined.items,
          ...created.items,
          ...standard.items,
          ...parentLinks.items,
        ].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
        // Wait, let's fix the array destructuring
        out.count = out.items.length;

        if (onlyUnread) {
          out.items = out.items.filter((x) =>
            (x.type === "join_request" || x.type === "name_change" || x.type === "verification_request")
              ? x.status === "pending"
              : !x.read_at
          );
          out.count = out.items.length;
        }
      }

      const unread = out.items.filter((x) => (x.type === "join_request" || x.type === "name_change" || x.type === "verification_request") ? x.status === "pending" : !x.read_at).length;
      setUnreadCount(unread);
      try {
        localStorage.setItem("admin_unread_notifications", String(unread));
      } catch { }
      window.dispatchEvent(new CustomEvent("admin:notify:unread", { detail: { count: unread } }));
      setItems(out.items);
      setCount(out.count);
      setVisibleCount(8); // Reset scroll on new filter
    } catch (e) {
      setItems([]); setCount(0);
    } finally { setInitialLoading(false); }
  }, [tab, onlyUnread]);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  // --- Handlers ---
  const markRead = async (n) => {
    if (!n?.id || n.read_at) return;
    if (n._source !== "notif" && n._source !== "standard_notif") return;

    setBusyId(n.id);
    try {
      const endpoint = n._source === "standard_notif"
        ? ENDPOINTS.standardNotifMarkReadBulk()
        : ENDPOINTS.notifMarkReadBulk();

      const realId = n._source === "standard_notif" && n.original_id
        ? n.original_id
        : n.id;

      await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ ids: [realId] }),
      });

      setItems((prev) => {
        const next = prev.map((x) =>
          x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x
        );
        syncUnread(next);   // ✅ LIVE update sidebar + header
        return next;
      });
    } catch (e) {
      setToast({ open: true, type: "error", msg: "Failed" });
    } finally {
      setBusyId(null);
    }
  };

  const handleMarkAllRead = async () => {
    const groupNotifIds = items.filter((n) => n._source === "notif" && !n.read_at).map((n) => n.id);
    const standardNotifIds = items.filter((n) => n._source === "standard_notif" && !n.read_at).map((n) => n.original_id || n.id.replace("std-", ""));

    if (!groupNotifIds.length && !standardNotifIds.length) return;

    setBusyId("bulk");
    try {
      const promises = [];

      if (groupNotifIds.length > 0) {
        promises.push(
          fetch(ENDPOINTS.notifMarkReadBulk(), {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeader() },
            body: JSON.stringify({ ids: groupNotifIds }),
          })
        );
      }

      if (standardNotifIds.length > 0) {
        promises.push(
          fetch(ENDPOINTS.standardNotifMarkReadBulk(), {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeader() },
            body: JSON.stringify({ ids: standardNotifIds }),
          })
        );
      }

      await Promise.all(promises);

      const now = new Date().toISOString();
      const allIds = [...groupNotifIds, ...items.filter((n) => n._source === "standard_notif" && !n.read_at).map((n) => n.id)];
      setItems((prev) => prev.map((n) => allIds.includes(n.id) ? { ...n, read_at: now } : n));
      setUnreadCount(0);
      window.dispatchEvent(new CustomEvent("admin:notify:unread", { detail: { count: 0 } }));
      setToast({ open: true, type: "success", msg: "Marked all read" });
    } catch (e) { setToast({ open: true, type: "error", msg: "Failed" }); } finally { setBusyId(null); }
  };

  const approveJoin = async (n) => {
    setBusyId(n.id);
    try {
      await fetch(ENDPOINTS.approveJoin(n.group.id, n.user_id), { method: "POST", headers: { ...authHeader() } });
      setItems((prev) => {
        const next = prev.map((x) => (x.id === n.id ? { ...x, status: "approved" } : x));
        syncUnread(next);
        return next;
      });
      setToast({ open: true, type: "success", msg: "Approved" });
    } catch { setToast({ open: true, type: "error", msg: "Failed" }); } finally { setBusyId(null); }
  };

  const rejectJoin = async (n) => {
    setBusyId(n.id);
    try {
      await fetch(ENDPOINTS.rejectJoin(n.group.id, n.user_id), { method: "POST", headers: { ...authHeader() } });
      setItems((prev) => {
        const next = prev.map((x) => (x.id === n.id ? { ...x, status: "rejected" } : x));
        syncUnread(next);
        return next;
      });
      setToast({ open: true, type: "success", msg: "Rejected" });
    } catch { setToast({ open: true, type: "error", msg: "Failed" }); } finally { setBusyId(null); }
  };

  const decideNameChange = async (n, status) => {
    setBusyId(n.id);
    try {
      const res = await fetch(ENDPOINTS.nameRequestDecide(n.id), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ status: status }),
      });
      if (!res.ok) throw new Error("Failed");

      // Update local state to reflect decision immediately
      setItems((prev) => {
        const next = prev.map((x) =>
          x.id === n.id ? { ...x, status, read_at: new Date().toISOString() } : x
        );
        syncUnread(next);
        return next;
      });

      setToast({ open: true, type: "success", msg: `Request ${status}.` });

      // Refresh list to sync with server, but now since we fetch ALL, the approved item will stay.
      setTimeout(fetchData, 1500);
    } catch (e) { setToast({ open: true, type: "error", msg: "Error" }); } finally { setBusyId(null); }
  };

  const decideVerification = async (n, status) => {
    setBusyId(n.id);
    try {
      const res = await fetch(ENDPOINTS.verificationRequestDecide(n.real_id), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ status: status }),
      });
      if (!res.ok) throw new Error("Failed");

      setItems((prev) => {
        const next = prev.map((x) =>
          x.id === n.id ? { ...x, status, read_at: new Date().toISOString() } : x
        );
        syncUnread(next);
        return next;
      });
      setToast({ open: true, type: "success", msg: `Verification ${status}.` });
      setTimeout(fetchData, 1500);
    } catch { setToast({ open: true, type: "error", msg: "Error" }); } finally { setBusyId(null); }
  };

  return (
    <Container maxWidth="xl" disableGutters sx={{ px: { xs: 0, sm: 0 }, pt: 6, pb: 6 }}>

      {/* Header */}
      <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "flex-start", sm: "center" }} justifyContent="space-between" spacing={2} sx={{ mb: 4 }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Avatar sx={{ bgcolor: TEAL, width: 48, height: 48, fontSize: '1.25rem', fontWeight: 700 }}>{userInitial}</Avatar>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="h5" sx={{ fontWeight: 800, color: "#1e293b", letterSpacing: '-0.5px' }}>Admin Notifications</Typography>
              {unreadCount > 0 && <Chip size="small" label={`${unreadCount} pending`} sx={{ borderRadius: 1, bgcolor: '#f1f5f9', fontWeight: 600, height: 24, fontSize: '0.75rem' }} />}
            </Stack>
            <Typography variant="body2" sx={{ color: "#64748b" }}>Manage system and group notifications.</Typography>
          </Box>
        </Stack>
        {!isMobile && (
          <Button
            variant="outlined"
            startIcon={<DoneAllRoundedIcon />}
            onClick={handleMarkAllRead}
            disabled={initialLoading || unreadCount === 0}
            sx={{ borderRadius: 99, textTransform: "uppercase", fontSize: 12, px: 2.5, borderColor: TEAL, color: TEAL, '&:hover': { bgcolor: '#f0fdfa', borderColor: TEAL } }}
          >
            Mark all read
          </Button>
        )}
      </Stack>

      {/* Filters */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "stretch", sm: "center" }} sx={{ mb: 3 }}>
        <Stack direction="row" alignItems="center" sx={{ width: { xs: "100%", sm: "auto" } }}>
          <FormControlLabel
            sx={{ ml: 0 }}
            control={<Switch checked={onlyUnread} onChange={(e) => setOnlyUnread(e.target.checked)} sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: TEAL }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: TEAL } }} />}
            label={<Typography variant="body2" fontWeight={500} color="#475569">Pending / Unread</Typography>}
          />
        </Stack>
        <Box sx={{ flexGrow: 1 }} />
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <Select value={tab} onChange={(e) => setTab(e.target.value)} sx={{ borderRadius: 2, bgcolor: 'white', '& .MuiSelect-select': { py: 1, fontSize: '0.9rem', fontWeight: 500 } }}>
            <MenuItem value="all">All Notifications</MenuItem>
            <MenuItem value="name_change">Identity Requests</MenuItem>
            <MenuItem value="verification_request">Verification Requests</MenuItem>
            <MenuItem value="join_request">Join Requests</MenuItem>
            <MenuItem value="member_joined">User Joined</MenuItem>
            <MenuItem value="group_created">Group Created</MenuItem>
            <MenuItem value="parent_link">🔗 Group Link Requests</MenuItem>
            <Divider />
            <MenuItem value="friend_request">Friend Requests</MenuItem>
            <MenuItem value="mention">Mentions</MenuItem>
            <MenuItem value="comment">Comments</MenuItem>
            <MenuItem value="reaction">Reactions</MenuItem>
            <MenuItem value="event">Events</MenuItem>
            <MenuItem value="system">System</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      {/* List */}
      <Box>
        {/* 1. INITIAL LOADING STATE - Show Skeletons */}
        {initialLoading ? (
          <Stack spacing={1}>
            <AdminNotificationSkeleton />
            <AdminNotificationSkeleton />
            <AdminNotificationSkeleton />
            <AdminNotificationSkeleton />
          </Stack>
        ) : items.length === 0 ? (
          // 2. EMPTY STATE
          <Paper variant="outlined" sx={{ p: 4, textAlign: "center", borderRadius: 3, bgcolor: '#f8fafc', borderStyle: 'dashed' }}>
            <Typography color="text.secondary" fontWeight={500}>No notifications found.</Typography>
          </Paper>
        ) : (
          // 3. LIST + INFINITE SCROLL
          <>
            <Stack spacing={1}>
              {visibleItems.map((n) => (
                <AdminNotificationRow
                  key={n.id}
                  n={n}
                  busy={busyId === n.id}
                  onApprove={approveJoin}
                  onReject={rejectJoin}
                  onDecideName={decideNameChange}
                  onDecideVerif={decideVerification}
                  onMarkRead={markRead}
                />
              ))}
            </Stack>

            {/* 4. INFINITE SCROLL TRIGGER & BOTTOM SKELETON */}
            {items.length > visibleCount && (
              <Box ref={observerTarget} sx={{ py: 2, mt: 1, textAlign: 'center' }}>
                {isLoadingMore && (
                  <Stack spacing={1}>
                    <AdminNotificationSkeleton />
                    <AdminNotificationSkeleton />
                  </Stack>
                )}
              </Box>
            )}
          </>
        )}
      </Box>

      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast((t) => ({ ...t, open: false }))} anchorOrigin={{ vertical: "top", horizontal: "center" }}>
        <Alert variant="filled" severity={toast.type === "error" ? "error" : "success"} onClose={() => setToast((t) => ({ ...t, open: false }))}>{toast.msg}</Alert>
      </Snackbar>
    </Container>
  );
}