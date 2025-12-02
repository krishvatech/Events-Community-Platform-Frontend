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
  Tooltip,
  Divider,
  FormControlLabel,
  LinearProgress,
  Snackbar,
  Alert,
  Pagination,
  useMediaQuery,
  MenuItem,
  Switch,
  FormControl,
  Select,
  Container,
  Skeleton
} from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import DoneAllRoundedIcon from "@mui/icons-material/DoneAllRounded";
import MarkEmailReadOutlinedIcon from "@mui/icons-material/MarkEmailReadOutlined";
import MarkEmailUnreadOutlinedIcon from "@mui/icons-material/MarkEmailUnreadOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import HighlightOffIcon from "@mui/icons-material/HighlightOff";
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded';
import HourglassBottomRoundedIcon from "@mui/icons-material/HourglassBottomRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";

// --- Config ---
const API_ROOT = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");
const TEAL = "#14b8b1"; 
const BORDER = "#e2e8f0"; // Matches your community theme
const getToken = () => localStorage.getItem("access_token") || localStorage.getItem("token") || "";
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
  groupsPage: (page = 1) => `${API_ROOT}/groups/?${qs({ page, page_size: 200 })}`,
  pendingForGroup: (groupId) => `${API_ROOT}/groups/${groupId}/member-requests/`,
  approveJoin: (groupId, userId) => `${API_ROOT}/groups/${groupId}/member-requests/approve/${userId}/`,
  rejectJoin: (groupId, userId) => `${API_ROOT}/groups/${groupId}/member-requests/reject/${userId}/`,
  nameRequestsList: () => `${API_ROOT}/auth/admin/name-requests/?status=pending`,
  nameRequestDecide: (id) => `${API_ROOT}/auth/admin/name-requests/${id}/decide/`,
};

// ---- Data Loaders ----
async function loadNameChangeRequests() {
  try {
    const res = await fetch(ENDPOINTS.nameRequestsList(), { headers: { Accept: "application/json", ...authHeader() } });
    if (!res.ok) return { items: [], count: 0 };
    const data = await res.json();
    const rows = Array.isArray(data) ? data : data?.results || [];
    const items = rows.map((req) => ({
      id: req.id,
      _source: "name_request",
      type: "name_change",
      status: req.status,
      created_at: req.created_at,
      actor_name: req.username || req.user?.username || "User",
      actor_avatar: "", 
      user_id: req.user,
      data: {
        old_name: `${req.old_first_name} ${req.old_last_name}`,
        new_name: `${req.new_first_name} ${req.new_last_name}`,
        reason: req.reason
      },
      read_at: null, // Pending requests count as unread
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
    const all = [];
    for (const g of manageable) {
      try {
        const r = await fetch(ENDPOINTS.pendingForGroup(g.id), { headers: { Accept: "application/json", ...authHeader() } });
        if (!r.ok) continue;
        const jr = await r.json();
        const rows = (jr?.requests || []).map((req) => ({
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
        all.push(...rows);
      } catch { }
    }
    return { items: all, count: all.length };
  } catch { return { items: [], count: 0 }; }
}

async function loadMemberJoined(onlyUnread) {
  try {
    const res = await fetch(ENDPOINTS.notifList({ kind: "member_joined", unread: onlyUnread ? 1 : undefined, page_size: 200 }), { headers: { Accept: "application/json", ...authHeader() } });
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
    const res = await fetch(ENDPOINTS.notifList({ kind: "group_created", unread: onlyUnread ? 1 : undefined, page_size: 200 }), { headers: { Accept: "application/json", ...authHeader() } });
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

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function profileHref(n) { return (n?.user_id || n?.actor_id) ? `/community/rich-profile/${n.user_id || n.actor_id}` : "#"; }
function groupHref(n) { return n?.group?.id ? `/community/groups/${n.group.id}` : "#"; }

// --- Sub-Component: Notification Row ---
function AdminNotificationRow({ n, busy, onApprove, onReject, onDecideName, onMarkRead }) {
  const isRead = !!n.read_at && n.status !== 'pending';
  const isMobile = useMediaQuery("(max-width:600px)");

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
      elevation={0}
      sx={{
        p: 1.5,
        mb: 1.5,
        width: "100%",
        border: `1px solid ${BORDER}`,
        borderRadius: 2,
        bgcolor: isRead ? "white" : "#f6fffe", // Light teal background for unread
        transition: 'all 0.2s',
        '&:hover': { borderColor: '#cbd5e1' }
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
            ) : n.type === "join_request" ? (
              <>
                <Box component="span" fontWeight={700}>{n.actor_name}</Box> requested to join <Box component={Link} to={groupHref(n)} sx={{ textDecoration: 'none', fontWeight: 700, color: 'inherit' }}>{n?.group?.name}</Box>.
              </>
            ) : n.type === "member_joined" ? (
              <>
                <Box component="span" fontWeight={700}>{n.actor_name}</Box> joined <Box component={Link} to={groupHref(n)} sx={{ textDecoration: 'none', fontWeight: 700, color: 'inherit' }}>{n?.group?.name}</Box>.
              </>
            ) : (
              <>
                <Box component="span" fontWeight={700}>{n.actor_name}</Box> created group <Box component={Link} to={groupHref(n)} sx={{ textDecoration: 'none', fontWeight: 700, color: 'inherit' }}>{n?.group?.name}</Box>.
              </>
            )}
          </Typography>

          {/* Subtext Row: Kind Badge + Date */}
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5 }}>
            {n.type === "name_change" && <Chip label="Identity Request" size="small" icon={<BadgeRoundedIcon style={{ fontSize: 12 }} />} sx={{ height: 20, fontSize: 10, bgcolor: '#394d79ff', color: 'white', '& .MuiChip-label': { px: 0.5 }, '& .MuiChip-icon': { color: 'white', ml: 0.5 } }} />}
            <Typography variant="caption" color="text.secondary">{formatTime(n.created_at)}</Typography>
          </Stack>

          {/* Special Data: Reason */}
          {n.type === "name_change" && n.data?.reason && (
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: '#64748b', fontStyle: 'italic' }}>
              "{n.data.reason}"
            </Typography>
          )}

          {/* ACTION BUTTONS (Inside Content Area, matching Community UI) */}
          {n.status === 'pending' && (n.type === "name_change" || n.type === "join_request") && (
            <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
              <Button
                size="small"
                variant="contained"
                disabled={busy}
                onClick={() => n.type === "name_change" ? onDecideName(n, "approved") : onApprove(n)}
                startIcon={<CheckCircleOutlineIcon />}
                sx={{ textTransform: "none", borderRadius: 2, bgcolor: TEAL, '&:hover': { bgcolor: TEAL }, px: 2 }}
              >
                Approve
              </Button>
              <Button
                size="small"
                variant="outlined"
                disabled={busy}
                onClick={() => n.type === "name_change" ? onDecideName(n, "rejected") : onReject(n)}
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
            {n._source === 'notif' && (
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

// --- MAIN COMPONENT ---
export default function AdminNotificationsPage() {
  const isMobile = useMediaQuery("(max-width:600px)");
  const [tab, setTab] = React.useState("all");
  const [onlyUnread, setOnlyUnread] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState([]);
  const [count, setCount] = React.useState(0);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const pageSize = 8; // Matched community page size
  const start = (page - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);
  const [busyId, setBusyId] = React.useState(null);
  const [toast, setToast] = React.useState({ open: false, type: "success", msg: "" });
  const [userInitial, setUserInitial] = React.useState("A");

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

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      let out = { items: [], count: 0 };
      if (tab === "name_change") out = await loadNameChangeRequests();
      else if (tab === "join_request") out = await loadJoinRequests();
      else if (tab === "member_joined") out = await loadMemberJoined(onlyUnread);
      else if (tab === "group_created") out = await loadGroupCreated(onlyUnread);
      else {
        const [reqs, joined, created, names] = await Promise.all([
          loadJoinRequests(),
          loadMemberJoined(onlyUnread),
          loadGroupCreated(onlyUnread),
          loadNameChangeRequests(),
        ]);
        out.items = [...names.items, ...reqs.items, ...joined.items, ...created.items].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
        out.count = out.items.length;
        if (onlyUnread) {
          out.items = out.items.filter((x) => (x.type === "join_request" || x.type === "name_change" ? x.status === "pending" : !x.read_at));
          out.count = out.items.length;
        }
      }
      const unread = out.items.filter((x) => (x.type === "join_request" || x.type === "name_change") ? x.status === "pending" : !x.read_at).length;
      setUnreadCount(unread);
      setItems(out.items);
      setCount(out.count);
    } catch (e) {
      setItems([]); setCount(0);
    } finally { setLoading(false); }
  }, [tab, onlyUnread]);

  React.useEffect(() => { setPage(1); fetchData(); }, [fetchData]);

  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  // --- Handlers ---
  const markRead = async (n) => { 
    if (n?._source !== "notif" || !n?.id || n.read_at) return;
    setBusyId(n.id);
    try {
      await fetch(ENDPOINTS.notifMarkReadBulk(), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ ids: [n.id] }),
      });
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)));
    } catch (e) { setToast({ open: true, type: "error", msg: "Failed" }); } finally { setBusyId(null); }
  };

  const handleMarkAllRead = async () => { 
    const ids = items.filter((n) => n._source === "notif" && !n.read_at).map((n) => n.id);
    if (!ids.length) return;
    setBusyId("bulk");
    try {
      await fetch(ENDPOINTS.notifMarkReadBulk(), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ ids }),
      });
      const now = new Date().toISOString();
      setItems((prev) => prev.map((n) => ids.includes(n.id) ? { ...n, read_at: now } : n));
      setUnreadCount(0);
      setToast({ open: true, type: "success", msg: "Marked all read" });
    } catch (e) { setToast({ open: true, type: "error", msg: "Failed" }); } finally { setBusyId(null); }
  };

  const approveJoin = async (n) => { 
    setBusyId(n.id);
    try {
      await fetch(ENDPOINTS.approveJoin(n.group.id, n.user_id), { method: "POST", headers: { ...authHeader() } });
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, status: "approved" } : x)));
      setToast({ open: true, type: "success", msg: "Approved" });
    } catch { setToast({ open: true, type: "error", msg: "Failed" }); } finally { setBusyId(null); }
  };

  const rejectJoin = async (n) => { 
    setBusyId(n.id);
    try {
      await fetch(ENDPOINTS.rejectJoin(n.group.id, n.user_id), { method: "POST", headers: { ...authHeader() } });
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, status: "rejected" } : x)));
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
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, status: status } : x)));
      setToast({ open: true, type: "success", msg: `Request ${status}.` });
      setTimeout(fetchData, 1500); // refresh list to eventually remove processed
    } catch (e) { setToast({ open: true, type: "error", msg: "Error" }); } finally { setBusyId(null); }
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
            disabled={loading || unreadCount === 0} 
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
            <MenuItem value="join_request">Join Requests</MenuItem>
            <MenuItem value="member_joined">User Joined</MenuItem>
            <MenuItem value="group_created">Group Created</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      {/* List */}
      <Stack spacing={1}>
        {loading && items.length === 0 && <LinearProgress sx={{ borderRadius: 2, color: TEAL }} />}
        
        {!loading && items.length === 0 && (
          <Paper variant="outlined" sx={{ p: 4, textAlign: "center", borderRadius: 3, bgcolor: '#f8fafc', borderStyle: 'dashed' }}>
            <Typography color="text.secondary" fontWeight={500}>No notifications found.</Typography>
          </Paper>
        )}

        {pageItems.map((n) => (
          <AdminNotificationRow 
            key={n.id} 
            n={n} 
            busy={busyId === n.id} 
            onApprove={approveJoin} 
            onReject={rejectJoin} 
            onDecideName={decideNameChange} 
            onMarkRead={markRead} 
          />
        ))}
      </Stack>

      <Stack direction="row" justifyContent="center" sx={{ mt: 4 }}>
        <Pagination page={page} count={totalPages} onChange={(e, v) => setPage(v)} color="primary" shape="rounded" sx={{ '& .Mui-selected': { bgcolor: TEAL + ' !important', color: 'white' } }} />
      </Stack>

      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast((t) => ({ ...t, open: false }))} anchorOrigin={{ vertical: "top", horizontal: "center" }}>
        <Alert variant="filled" severity={toast.type === "error" ? "error" : "success"} onClose={() => setToast((t) => ({ ...t, open: false }))}>{toast.msg}</Alert>
      </Snackbar>
    </Container>
  );
}