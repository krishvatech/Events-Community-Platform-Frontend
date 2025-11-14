import * as React from "react";
import {
  Box,
  Stack,
  Card,
  CardContent,
  CardActions,
  Avatar,
  Typography,
  Chip,
  Button,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  Divider,
  Checkbox,
  FormControlLabel,
  LinearProgress,
  Snackbar,
  Alert,
  Pagination,
} from "@mui/material";

import { Link } from "react-router-dom";

import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import GroupAddRoundedIcon from "@mui/icons-material/GroupAddRounded";
import PersonAddAlt1RoundedIcon from "@mui/icons-material/PersonAddAlt1Rounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DoneAllRoundedIcon from "@mui/icons-material/DoneAllRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";

// --- Config: reuse same API root style as community pages ---
const API_ROOT = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");
const getToken = () => localStorage.getItem("access_token") || "";
const authHeader = () => {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
};

// Small helper: build query string without extra deps
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

  // groups endpoints
  groupsPage: (page = 1) => `${API_ROOT}/groups/?${qs({ page, page_size: 200 })}`,
  pendingForGroup: (groupId) => `${API_ROOT}/groups/${groupId}/member-requests/`,
  approveJoin: (groupId, userId) => `${API_ROOT}/groups/${groupId}/member-requests/approve/${userId}/`,
  rejectJoin: (groupId, userId) => `${API_ROOT}/groups/${groupId}/member-requests/reject/${userId}/`,
};

// ---- Data loaders ---------------------------------------------------------

async function loadJoinRequests() {
  // 1) fetch groups where current user is owner/admin/mod (via current_user_role)
  const res = await fetch(ENDPOINTS.groupsPage(1), { headers: { Accept: "application/json", ...authHeader() } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
    } catch {
      /* ignore per-group errors */
    }
  }
  all.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
  return { items: all, count: all.length };
}

async function loadMemberJoined(onlyUnread = false) {
  // read real notifications emitted by backend GroupNotification signals
  const res = await fetch(
    ENDPOINTS.notifList({ kind: "member_joined", unread: onlyUnread ? 1 : undefined, page_size: 200 }),
    { headers: { Accept: "application/json", ...authHeader() } }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const j = await res.json();
  const list = Array.isArray(j) ? j : j?.results || [];

  const items = list
    .filter((n) => n?.data?.type === "group_member_joined")
    .map((n) => ({
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

  items.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
  return { items, count: items.length };
}

async function loadGroupCreated(onlyUnread = false) {
  // notifications when a new group is created
  const res = await fetch(
    ENDPOINTS.notifList({ kind: "group_created", unread: onlyUnread ? 1 : undefined, page_size: 200 }),
    { headers: { Accept: "application/json", ...authHeader() } }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const j = await res.json();
  const list = Array.isArray(j) ? j : j?.results || [];

  const items = list
    .filter((n) => n?.data?.type === "group_created")
    .map((n) => ({
      id: n.id,
      _source: "notif",
      type: "group_created",
      created_at: n.created_at,
      actor_id: n?.actor?.id,
      actor_name: n?.actor?.display_name || n?.actor?.username || "Someone",
      actor_avatar: n?.actor?.avatar_url || "",
      // group info comes from data (or fallback to group pk)
      group: {
        id: n?.data?.group_id ?? n?.group,
        name: n?.data?.group_name || `#${n?.data?.group_id ?? n?.group}`,
      },
      read_at: n?.is_read ? n.created_at : null,
    }));

  items.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
  return { items, count: items.length };
}

const TABS = [
  { key: "all", label: "All", icon: <NotificationsRoundedIcon fontSize="small" /> },
  { key: "member_joined", label: "User joined", icon: <GroupAddRoundedIcon fontSize="small" /> },
  { key: "group_created", label: "Group created", icon: <GroupRoundedIcon fontSize="small" /> },
  { key: "join_request", label: "Join requests", icon: <PersonAddAlt1RoundedIcon fontSize="small" /> },
];

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString();
}

function TypeChip({ type }) {
  const map = {
    member_joined: { color: "success", label: "User joined" },
    group_created: { color: "info", label: "Group created" },
    join_request: { color: "warning", label: "Join request" },
  };
  const m = map[type] || { color: "default", label: String(type || "notice") };
  return <Chip size="small" color={m.color} label={m.label} />;
}

function RowActions({ n, onApprove, onReject, onMarkRead, busy }) {
  if (n.type === "join_request" && n.status === "pending") {
    return (
      <Stack direction="row" spacing={1}>
        <Button
          size="small"
          variant="contained"
          startIcon={<CheckRoundedIcon />}
          disabled={busy}
          onClick={() => onApprove?.(n)}
          sx={{ textTransform: "none", borderRadius: 2 }}
        >
          Approve
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<CloseRoundedIcon />}
          disabled={busy}
          onClick={() => onReject?.(n)}
          sx={{ textTransform: "none", borderRadius: 2 }}
        >
          Reject
        </Button>
      </Stack>
    );
  }
  if (n._source === "notif") {
    return (
      <Button
        size="small"
        startIcon={<DoneAllRoundedIcon />}
        disabled={busy || !!n.read_at}
        onClick={() => onMarkRead?.(n)}
        sx={{ textTransform: "none", borderRadius: 2 }}
      >
        {n.read_at ? "Read" : "Mark read"}
      </Button>
    );
  }
  return null;
}

function profileHref(n) {
  const uid = n?.user_id || n?.actor_id;
  return uid ? `/community/rich-profile/${uid}` : "#";
}
function groupHref(n) {
  return n?.group?.id ? `/community/groups/${n.group.id}` : "#"; // route already redirects to /admin/community/groups/:id
}

export default function AdminNotificationsPage() {
  const [tab, setTab] = React.useState("all");
  const [onlyUnread, setOnlyUnread] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState([]);
  const [count, setCount] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const pageSize = 10;
  const start = (page - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);

  const [busyId, setBusyId] = React.useState(null);
  const [toast, setToast] = React.useState({ open: false, type: "success", msg: "" });

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      let out = { items: [], count: 0 };
      if (tab === "join_request") {
        out = await loadJoinRequests();
        if (onlyUnread) {
          out.items = out.items.filter((x) => x.type === "join_request" && x.status === "pending");
          out.count = out.items.length;
        }
      } else if (tab === "member_joined") {
        out = await loadMemberJoined(onlyUnread);
      } else if (tab === "group_created") {
        out = await loadGroupCreated(onlyUnread);
      } else {
        // ALL = pending join requests + member joined + group created
        const [reqs, joined, created] = await Promise.all([
          loadJoinRequests(),
          loadMemberJoined(onlyUnread),
          loadGroupCreated(onlyUnread),
        ]);
        out.items = [...reqs.items, ...joined.items, ...created.items].sort((a, b) =>
          (b.created_at || "").localeCompare(a.created_at || "")
        );
        out.count = out.items.length;
        if (onlyUnread) {
          out.items = out.items.filter((x) =>
            x.type === "join_request" ? x.status === "pending" : !x.read_at
          );
          out.count = out.items.length;
        }
      }
      setItems(out.items);
      setCount(out.count);
    } catch (e) {
      setItems([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, [tab, onlyUnread]);

  React.useEffect(() => {
    setPage(1);
  }, [tab, onlyUnread]);
  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  const markRead = async (n) => {
    if (n?._source !== "notif" || !n?.id || n.read_at) return;
    setBusyId(n.id);
    try {
      const res = await fetch(ENDPOINTS.notifMarkReadBulk(), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ ids: [n.id] }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)));
    } catch (e) {
      setToast({ open: true, type: "error", msg: `Could not mark read: ${e?.message || e}` });
    } finally {
      setBusyId(null);
    }
  };

  const approveJoin = async (n) => {
    if (!n?.group?.id || !n?.user_id) return;
    setBusyId(n.id);
    try {
      const res = await fetch(ENDPOINTS.approveJoin(n.group.id, n.user_id), {
        method: "POST",
        headers: { ...authHeader() },
      });
      if (!res.ok && res.status !== 200 && res.status !== 204) throw new Error(`HTTP ${res.status}`);
      setItems((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, status: "approved", read_at: new Date().toISOString() } : x))
      );
      setToast({ open: true, type: "success", msg: "Join request approved." });
    } catch (e) {
      setToast({ open: true, type: "error", msg: `Approve failed: ${e?.message || e}` });
    } finally {
      setBusyId(null);
    }
  };

  const rejectJoin = async (n) => {
    if (!n?.group?.id || !n?.user_id) return;
    setBusyId(n.id);
    try {
      const res = await fetch(ENDPOINTS.rejectJoin(n.group.id, n.user_id), {
        method: "POST",
        headers: { ...authHeader() },
      });
      if (!res.ok && res.status !== 200 && res.status !== 204) throw new Error(`HTTP ${res.status}`);
      setItems((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, status: "rejected", read_at: new Date().toISOString() } : x))
      );
      setToast({ open: true, type: "success", msg: "Join request rejected." });
    } catch (e) {
      setToast({ open: true, type: "error", msg: `Reject failed: ${e?.message || e}` });
    } finally {
      setBusyId(null);
    }
  };

  const Header = (
    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <NotificationsRoundedIcon />
        <Typography variant="h6" fontWeight={800}>
          Admin Notifications
        </Typography>
      </Stack>

      <Stack direction="row" spacing={1}>
        <Tooltip title="Refresh">
          <IconButton onClick={fetchData} disabled={loading}>
            <RefreshRoundedIcon />
          </IconButton>
        </Tooltip>
      </Stack>
    </Stack>
  );

  return (
    <Box sx={{ p: 2, maxWidth: 960 }}>
      {Header}

      <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 1 }}>
        {TABS.map((t) => (
          <Tab key={t.key} iconPosition="start" icon={t.icon} label={t.label} value={t.key} />
        ))}
      </Tabs>

      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <FormControlLabel
          control={<Checkbox checked={onlyUnread} onChange={(e) => setOnlyUnread(e.target.checked)} />}
          label="Only unread"
        />
        <Typography variant="body2" color="text.secondary">
          {count} total
        </Typography>
      </Stack>

      <Divider sx={{ mb: 2 }} />
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <Stack spacing={1.5}>
        {!loading && items.length === 0 && (
          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography>No notifications found.</Typography>
              <Typography variant="body2" color="text.secondary">
                Try switching tabs or turning off “Only unread”.
              </Typography>
            </CardContent>
          </Card>
        )}

        {pageItems.map((n) => (
          <Card
            key={n.id}
            variant="outlined"
            sx={{
              borderRadius: 3,
              opacity: n.read_at ? 0.9 : 1,
              borderColor: n.read_at ? "divider" : "primary.light",
            }}
          >
            <CardContent sx={{ pb: 1.5 }}>
              <Stack direction="row" spacing={2} alignItems="flex-start">
                <Avatar
                  component={Link}
                  to={profileHref(n)}
                  src={n.actor_avatar || n?.user?.avatar || ""}
                  alt={n.actor_name || n?.user?.name || ""}
                  sx={{ width: 44, height: 44, border: "1px solid", borderColor: "divider" }}
                />

                <Box sx={{ flex: 1 }}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                    <TypeChip type={n.type} />
                    <Typography variant="caption" color="text.secondary">
                      {formatTime(n.created_at)}
                    </Typography>
                  </Stack>

                  <Typography sx={{ mt: 0.5 }}>
                    {n.type === "member_joined" && (
                      <>
                        <Box component={Link} to={profileHref(n)} sx={{ textDecoration: "none", color: "inherit" }}>
                          <b>{n.actor_name || "Someone"}</b>
                        </Box>{" "}
                        joined{" "}
                        <Box component={Link} to={groupHref(n)} sx={{ textDecoration: "none", color: "inherit" }}>
                          <b>{n?.group?.name || `#${n?.group?.id}`}</b>
                        </Box>
                        .
                      </>
                    )}
                    {n.type === "group_created" && (
                      <>
                        <Box component={Link} to={profileHref(n)} sx={{ textDecoration: "none", color: "inherit" }}>
                          <b>{n.actor_name || "Someone"}</b>
                        </Box>{" "}
                        created the group{" "}
                        <Box component={Link} to={groupHref(n)} sx={{ textDecoration: "none", color: "inherit" }}>
                          <b>{n?.group?.name || `#${n?.group?.id}`}</b>
                        </Box>
                        .
                      </>
                    )}
                    {n.type === "join_request" && (
                      <>
                        <Box component={Link} to={profileHref(n)} sx={{ textDecoration: "none", color: "inherit" }}>
                          <b>{n.actor_name || "Someone"}</b>
                        </Box>{" "}
                        requested to join{" "}
                        <Box component={Link} to={groupHref(n)} sx={{ textDecoration: "none", color: "inherit" }}>
                          <b>{n?.group?.name || `#${n?.group?.id}`}</b>
                        </Box>{" "}
                        <Chip
                          size="small"
                          label={(n.status || "pending").replace("_", " ")}
                          color={
                            n.status === "approved"
                              ? "success"
                              : n.status === "rejected"
                              ? "error"
                              : "warning"
                          }
                          sx={{ ml: 1 }}
                        />
                      </>
                    )}
                  </Typography>

                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                    {n.type === "member_joined" && "A member just joined one of your groups."}
                    {n.type === "group_created" && "A new group was created in your community."}
                    {n.type === "join_request" && "Approve or reject the request."}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>

            <CardActions sx={{ px: 2, pb: 2 }}>
              <RowActions
                n={n}
                busy={busyId === n.id}
                onApprove={approveJoin}
                onReject={rejectJoin}
                onMarkRead={markRead}
              />
            </CardActions>
          </Card>
        ))}
      </Stack>

      <Stack direction="row" justifyContent="center" sx={{ mt: 2 }}>
        <Pagination page={page} count={totalPages} onChange={(e, v) => setPage(v)} />
      </Stack>

      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          variant="filled"
          severity={toast.type === "error" ? "error" : "success"}
          onClose={() => setToast((t) => ({ ...t, open: false }))}
        >
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
