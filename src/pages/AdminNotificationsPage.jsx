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

import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import GroupAddRoundedIcon from "@mui/icons-material/GroupAddRounded";
import PersonAddAlt1RoundedIcon from "@mui/icons-material/PersonAddAlt1Rounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DoneAllRoundedIcon from "@mui/icons-material/DoneAllRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";

// --- Config: adjust if your app exposes API_ROOT / auth elsewhere ---
const API_ROOT = (import.meta?.env?.VITE_API_ROOT) || "/api";
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

// --- Endpoint adapter: change paths here if your backend differs ---
const ENDPOINTS = {
  list: (params) => `${API_ROOT}/admin/notifications/?${qs(params)}`,
  markRead: (id) => `${API_ROOT}/admin/notifications/${id}/read/`,
  markAllRead: () => `${API_ROOT}/admin/notifications/mark-all-read/`,
  // Actions for join requests (tweak to match your server)
  approveJoin: (n) =>
    `${API_ROOT}/groups/${n?.group?.id}/join-requests/${n?.request_id}/approve/`,
  rejectJoin: (n) =>
    `${API_ROOT}/groups/${n?.group?.id}/join-requests/${n?.request_id}/reject/`,
};

// Types we surface in UI tabs
const TABS = [
  { key: "all", label: "All", icon: <NotificationsRoundedIcon fontSize="small" /> },
  { key: "group_created", label: "Group created", icon: <GroupRoundedIcon fontSize="small" /> },
  { key: "member_joined", label: "User joined", icon: <GroupAddRoundedIcon fontSize="small" /> },
  { key: "join_request", label: "Join requests", icon: <PersonAddAlt1RoundedIcon fontSize="small" /> },
];

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString();
}

function TypeChip({ type }) {
  const map = {
    group_created: { color: "primary", label: "Group created" },
    member_joined: { color: "success", label: "User joined" },
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
          color="error"
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
  return (
    <Button
      size="small"
      variant="text"
      onClick={() => onMarkRead?.(n)}
      disabled={busy || !!n.read_at}
      sx={{ textTransform: "none", borderRadius: 2 }}
    >
      {n.read_at ? "Read" : "Mark read"}
    </Button>
  );
}

export default function AdminNotificationsPage() {
  const [tab, setTab] = React.useState("all");
  const [onlyUnread, setOnlyUnread] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState([]);
  const [count, setCount] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const pageSize = 10;

  const [busyId, setBusyId] = React.useState(null);
  const [toast, setToast] = React.useState({ open: false, type: "success", msg: "" });

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        ENDPOINTS.list({
          type: tab === "all" ? "" : tab,
          unread: onlyUnread ? 1 : "",
          page,
          page_size: pageSize,
        }),
        { headers: { "Accept": "application/json", ...authHeader() } }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // Expecting { results, count } shape; fall back if array
      const list = Array.isArray(data) ? data : (data?.results || []);
      setItems(list);
      setCount(Array.isArray(data) ? list.length : (data?.count ?? list.length));
    } catch (e) {
      setToast({ open: true, type: "error", msg: `Failed to load: ${e?.message || e}` });
    } finally {
      setLoading(false);
    }
  }, [tab, onlyUnread, page]);

  React.useEffect(() => {
    setPage(1); // reset page when filters change
  }, [tab, onlyUnread]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  const markRead = async (n) => {
    if (!n?.id || n.read_at) return;
    setBusyId(n.id);
    try {
      const res = await fetch(ENDPOINTS.markRead(n.id), {
        method: "POST",
        headers: { ...authHeader() },
      });
      if (!res.ok && res.status !== 204) throw new Error(`HTTP ${res.status}`);
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)));
    } catch (e) {
      setToast({ open: true, type: "error", msg: `Could not mark read: ${e?.message || e}` });
    } finally {
      setBusyId(null);
    }
  };

  const markAllRead = async () => {
    setBusyId("all");
    try {
      const res = await fetch(ENDPOINTS.markAllRead(), {
        method: "POST",
        headers: { ...authHeader() },
      });
      if (!res.ok && res.status !== 204) throw new Error(`HTTP ${res.status}`);
      setItems((prev) => prev.map((x) => ({ ...x, read_at: x.read_at || new Date().toISOString() })));
      setToast({ open: true, type: "success", msg: "All visible notifications marked read." });
    } catch (e) {
      setToast({ open: true, type: "error", msg: `Failed: ${e?.message || e}` });
    } finally {
      setBusyId(null);
    }
  };

  const approveJoin = async (n) => {
    setBusyId(n.id);
    try {
      const res = await fetch(ENDPOINTS.approveJoin(n), {
        method: "POST",
        headers: { ...authHeader() },
      });
      if (!res.ok && res.status !== 200 && res.status !== 204) throw new Error(`HTTP ${res.status}`);
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, status: "approved", read_at: new Date().toISOString() } : x)));
      setToast({ open: true, type: "success", msg: "Join request approved." });
    } catch (e) {
      setToast({ open: true, type: "error", msg: `Approve failed: ${e?.message || e}` });
    } finally {
      setBusyId(null);
    }
  };

  const rejectJoin = async (n) => {
    setBusyId(n.id);
    try {
      const res = await fetch(ENDPOINTS.rejectJoin(n), {
        method: "POST",
        headers: { ...authHeader() },
      });
      if (!res.ok && res.status !== 200 && res.status !== 204) throw new Error(`HTTP ${res.status}`);
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, status: "rejected", read_at: new Date().toISOString() } : x)));
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
        <Typography variant="h6" fontWeight={800}>Admin Notifications</Typography>
      </Stack>

      <Stack direction="row" spacing={1}>
        <Tooltip title="Refresh">
          <IconButton onClick={fetchData} disabled={loading}>
            <RefreshRoundedIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Mark all read (current list)">
          <span>
            <Button
              size="small"
              variant="outlined"
              startIcon={<DoneAllRoundedIcon />}
              disabled={busyId === "all" || loading || items.length === 0}
              onClick={markAllRead}
              sx={{ textTransform: "none", borderRadius: 2 }}
            >
              Mark all read
            </Button>
          </span>
        </Tooltip>
      </Stack>
    </Stack>
  );

  return (
    <Box sx={{ p: 2 }}>
      {Header}

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 1, "& .MuiTab-root": { textTransform: "none" } }}
      >
        {TABS.map((t) => (
          <Tab
            key={t.key}
            value={t.key}
            icon={t.icon}
            iconPosition="start"
            label={t.label}
          />
        ))}
      </Tabs>

      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={onlyUnread}
              onChange={(e) => setOnlyUnread(e.target.checked)}
            />
          }
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

        {items.map((n) => (
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
                  src={n?.user?.avatar || ""}
                  alt={n?.user?.name || ""}
                  sx={{ width: 42, height: 42 }}
                >
                  <NotificationsRoundedIcon fontSize="small" />
                </Avatar>

                <Box sx={{ flex: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap" }}>
                    <TypeChip type={n.type} />
                    {!n.read_at && <Chip size="small" color="info" label="New" variant="outlined" />}
                  </Stack>

                  <Typography sx={{ mt: 0.5 }}>
                    {n.type === "group_created" && (
                      <>
                        <b>{n?.actor_name || n?.user?.name || "Someone"}</b> created group{" "}
                        <b>{n?.group?.name || `#${n?.group?.id}`}</b>.
                      </>
                    )}
                    {n.type === "member_joined" && (
                      <>
                        <b>{n?.actor_name || n?.user?.name || "Someone"}</b> joined{" "}
                        <b>{n?.group?.name || `#${n?.group?.id}`}</b>.
                      </>
                    )}
                    {n.type === "join_request" && (
                      <>
                        <b>{n?.actor_name || n?.user?.name || "Someone"}</b> requested to join{" "}
                        <b>{n?.group?.name || `#${n?.group?.id}`}</b>.
                        {" "}
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
                    {formatTime(n.created_at)}
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
        <Pagination
          count={totalPages}
          page={page}
          onChange={(_, p) => setPage(p)}
          color="primary"
          shape="rounded"
        />
      </Stack>

      <Snackbar
        open={toast.open}
        autoHideDuration={2800}
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
