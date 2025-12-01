// src/pages/community/NotificationsPage.jsx
import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  Avatar, Badge, Box, Button, Chip, Grid, IconButton,
  List, ListItem, ListItemAvatar, Paper, Stack,
  Typography, Switch, FormControlLabel, MenuItem, Select, useMediaQuery, useTheme,
  Skeleton
} from "@mui/material";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import MarkEmailReadOutlinedIcon from "@mui/icons-material/MarkEmailReadOutlined";
import MarkEmailUnreadOutlinedIcon from "@mui/icons-material/MarkEmailUnreadOutlined";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import OpenInNewOutlinedIcon from "@mui/icons-material/OpenInNewOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import HighlightOffIcon from "@mui/icons-material/HighlightOff";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import HourglassBottomRoundedIcon from "@mui/icons-material/HourglassBottomRounded";
import InfoRoundedIcon from "@mui/icons-material/InfoRounded";


const BORDER = "#e2e8f0";

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

const emitUnreadCount = (count) => {
  try {
    window.dispatchEvent(new CustomEvent("notify:unread", { detail: { count } }));
    localStorage.setItem("unread_notifications", String(count));
  } catch { }
};

/* ---------------------- helpers ---------------------- */
function formatWhen(ts) {
  try { return new Date(ts).toLocaleString(); } catch { return ts; }
}

function groupByDay(items) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const groups = { Today: [], Yesterday: [], Earlier: [] };
  for (const it of items) {
    const d0 = new Date(it.created_at); const d = new Date(d0); d.setHours(0, 0, 0, 0);
    if (d >= today) groups.Today.push(it);
    else if (d >= yesterday) groups.Yesterday.push(it);
    else groups.Earlier.push(it);
  }
  return groups;
}

const KIND_LABEL = {
  mention: "Mentions",
  comment: "Comments",
  reaction: "Reactions",
  follow: "Follows",
  event: "Events",
  system: "System",
  friend_request: "Requests",
  connection_request: "Requests",
};

function kindChip(kind) {
  return KIND_LABEL[kind] || "Other";
}

// ---------------------- SKELETON COMPONENT ----------------------
function NotificationSkeleton() {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.25,
        mb: 1,
        width: "100%",
        border: `1px solid ${BORDER}`,
        borderRadius: 2,
      }}
    >
      <Stack direction="row" spacing={1.25} alignItems="flex-start">
        <Skeleton variant="circular" width={40} height={40} />
        <Box sx={{ flex: 1 }}>
          <Stack direction="row" spacing={1} sx={{ mb: 0.5 }}>
            <Skeleton variant="text" width={80} height={20} />
            <Skeleton variant="text" width={120} height={20} />
          </Stack>
          <Skeleton variant="text" width="90%" height={16} />
          <Skeleton variant="text" width="40%" height={16} sx={{ mt: 0.5 }} />
        </Box>
      </Stack>
    </Paper>
  );
}

function NotificationRow({
  item,
  onOpen,
  onToggleRead,
  onAcceptRequest,
  onDeclineRequest,
  onFollowBack,
}) {
  const navigate = useNavigate();
  const unread = !item.is_read;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const ActionsByKind = () => {
    if (item.kind === "friend_request" || item.kind === "connection_request") {
      if (item.state === "accepted") return null;
      if (item.state === "declined") return null;
      return (
        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          <Button
            size="small"
            variant="contained"
            onClick={() => onAcceptRequest?.(item.id)}
            disabled={!!item._busy}
            sx={{ textTransform: "none", borderRadius: 2 }}
            startIcon={<CheckCircleOutlineIcon />}
          >
            Accept
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => onDeclineRequest?.(item.id)}
            disabled={!!item._busy}
            sx={{ textTransform: "none", borderRadius: 2 }}
            startIcon={<HighlightOffIcon />}
          >
            Decline
          </Button>
        </Stack>
      );
    }

    if (item.kind === "follow") {
      return item.following_back ? (
        <Chip size="small" variant="outlined" label="Following" sx={{ ml: 1 }} />
      ) : (
        <Button
          size="small"
          variant="outlined"
          onClick={() => onFollowBack?.(item.id)}
          disabled={!!item._busy}
          sx={{ textTransform: "none", borderRadius: 2, mt: 1 }}
          startIcon={<PersonAddAlt1Icon />}
        >
          Follow back
        </Button>
      );
    }

    return null;
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.25,
        mb: 1,
        width: "100%",
        flexGrow: 1,
        boxSizing: "border-box",
        border: `1px solid ${BORDER}`,
        borderRadius: 2,
        bgcolor: unread ? "#f6fffe" : "background.paper",
      }}
    >
      <Stack direction="row" spacing={1.25} alignItems="flex-start">
        <ListItemAvatar sx={{ minWidth: 48 }}>
          <Avatar
            src={item.actor?.avatar}
            alt={item.actor?.name}
            onClick={() => {
              const uid = item?.context?.profile_user_id || item?.actor?.id;
              if (uid) navigate(`/community/rich-profile/${uid}`);
            }}
            sx={{ cursor: (item?.context?.profile_user_id || item?.actor?.id) ? "pointer" : "default" }}
          >
            {(item.actor?.name || "S").slice(0, 1).toUpperCase()}
          </Avatar>
        </ListItemAvatar>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {item.actor?.name || "System"}
            </Typography>
            <Typography variant="body2">{item.title}</Typography>
            {item.context?.group && (
              <Chip size="small" label={item.context.group} variant="outlined" />
            )}
          </Stack>

          {item.description ? (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block" }}
            >
              {item.description}
            </Typography>
          ) : null}

          <Stack
            direction={isMobile ? "column" : "row"}
            alignItems={isMobile ? "flex-start" : "center"}
            spacing={isMobile ? 0.5 : 1}
            sx={{ mt: 0.75 }}
          >
            <Chip size="small" label={kindChip(item.kind)} />
            <Typography variant="caption" color="text.secondary">
              {formatWhen(item.created_at)}
            </Typography>
          </Stack>

          <ActionsByKind />
        </Box>

        <Stack spacing={0.5} alignItems="flex-end">
          <Stack direction="row" spacing={0.5}>
            <IconButton
              size="small"
              title={unread ? "Mark as read" : "Mark as unread"}
              onClick={() => onToggleRead?.(item.id, !unread)}
            >
              {unread ? (
                <MarkEmailReadOutlinedIcon fontSize="small" />
              ) : (
                <MarkEmailUnreadOutlinedIcon fontSize="small" />
              )}
            </IconButton>

            <IconButton size="small" title="Open" onClick={() => onOpen?.(item)}>
              <OpenInNewOutlinedIcon fontSize="small" />
            </IconButton>
          </Stack>

          {(() => {
            const s = (item.state || "").toLowerCase();
            if (!s) return null;

            const common = {
              size: "small",
              variant: "outlined",
              sx: {
                mt: 0.5,
                height: 24,
                borderRadius: "999px",
                fontWeight: 600,
                "& .MuiChip-label": { px: 0.5, pt: "1px" },
              },
            };

            if (s === "accepted" || s === "approved") {
              return <Chip {...common} icon={<CheckCircleRoundedIcon sx={{ fontSize: 16 }} />} label="Accepted" sx={{ ...common.sx, bgcolor: "#e6f4ea", borderColor: "#e6f4ea", color: "#1a7f37", "& .MuiChip-icon": { color: "#1a7f37", mr: 0.5 } }} />;
            }
            if (s === "declined" || s === "rejected") {
              return <Chip {...common} icon={<CancelRoundedIcon sx={{ fontSize: 16 }} />} label="Declined" sx={{ ...common.sx, bgcolor: "#fde7e9", borderColor: "#fde7e9", color: "#b42318", "& .MuiChip-icon": { color: "#b42318", mr: 0.5 } }} />;
            }
            if (s === "pending" || s === "requested" || s === "waiting" || s === "sent") {
              return <Chip {...common} icon={<HourglassBottomRoundedIcon sx={{ fontSize: 16 }} />} label={s === "sent" ? "Sent" : "Pending"} sx={{ ...common.sx, bgcolor: "#eef2f6", borderColor: "#eef2f6", color: "#374151", "& .MuiChip-icon": { color: "#374151", mr: 0.5 } }} />;
            }
            return <Chip {...common} icon={<InfoRoundedIcon sx={{ fontSize: 16 }} />} label={item.state} sx={{ ...common.sx, bgcolor: "#f3f4f6", borderColor: "#f3f4f6", color: "#111827", "& .MuiChip-icon": { color: "#6b7280", mr: 0.5 } }} />;
          })()}
        </Stack>
      </Stack>
    </Paper>
  );
}

/* ------------------- main page component ------------------- */
export default function NotificationsPage({
  // optional external callbacks if you wire up your API later:
  onOpen,
  onFollowBackUser,
}) {
  const navigate = useNavigate();
  const [items, setItems] = React.useState([]);
  const [showOnlyUnread, setShowOnlyUnread] = React.useState(false);
  const [kind, setKind] = React.useState("All");

  // --- Pagination State ---
  const [loading, setLoading] = React.useState(true);
  const [hasMore, setHasMore] = React.useState(true);
  // Initial URL includes ?page_size=10
  const [nextUrl, setNextUrl] = React.useState(`${API_BASE}/notifications/?page_size=10`);
  const observerTarget = React.useRef(null);

  // Derived state (filters & counts)
  const unreadCount = React.useMemo(() => items.filter((i) => !i.is_read).length, [items]);

  const filtered = React.useMemo(() => {
    let arr = [...items];
    if (showOnlyUnread) arr = arr.filter((i) => !i.is_read);
    if (kind !== "All") {
      const k = kind.toLowerCase();
      const norm = {
        requests: ["friend_request", "connection_request"],
        follows: ["follow"],
        mentions: ["mention"],
        comments: ["comment"],
        reactions: ["reaction"],
        events: ["event"],
        system: ["system"],
      };
      const keys = norm[k] || [k.slice(0, -1)];
      arr = arr.filter((i) => keys.includes(i.kind));
    }
    // Re-sort to ensure correct order after appending
    arr.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return arr;
  }, [items, showOnlyUnread, kind]);

  const grouped = groupByDay(filtered);

  // --- Load Function ---
  const loadNotifications = React.useCallback(async (url, isAppend = false) => {
    if (!url) return;
    setLoading(true);

    try {
      const r = await fetch(url, {
        headers: { ...tokenHeader(), Accept: "application/json" },
        credentials: "include",
      });
      if (!r.ok) throw new Error("Failed");

      const j = await r.json();
      const raw = Array.isArray(j) ? j : j?.results || [];
      const next = j?.next || null;

      const mapped = raw.map((n) => ({
        id: n.id,
        kind: n.kind,
        state: n.state || "",
        title: n.title || "",
        description: n.description || "",
        created_at: n.created_at,
        is_read: !!n.is_read,
        actor: {
          id: n.actor?.id,
          name: n.actor?.first_name || n.actor?.username || n.actor?.email || "User",
          avatar: n.actor?.avatar_url || "",
        },
        context: {
          friend_request_id: n.data?.friend_request_id,
          profile_user_id: n.data?.from_user_id || n.data?.to_user_id,
          eventId: n.data?.event_id || n.data?.eventId,
          postId: n.data?.post_id || n.data?.postId,
          groupSlug: n.data?.group_slug,
        },
      }));

      // Update state
      setItems(prev => {
        const combined = isAppend ? [...prev, ...mapped] : mapped;
        // Deduplicate by ID
        const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
        return unique;
      });

      setNextUrl(next);
      setHasMore(!!next);

      // Optimistically mark fetched items as read
      const idsToMark = mapped.filter((i) => !i.is_read).map((i) => i.id);
      if (idsToMark.length) {
        // We update local state to read immediately
        setItems(curr => curr.map(i => idsToMark.includes(i.id) ? { ...i, is_read: true } : i));
        
        // Fire & forget the backend update
        try {
          await fetch(`${API_BASE}/notifications/mark-read/`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...tokenHeader(),
              Accept: "application/json",
            },
            credentials: "include",
            body: JSON.stringify({ ids: idsToMark }),
          });
        } catch { }
      }

      emitUnreadCount(0); // Simple reset for now

    } catch (e) {
      console.error(e);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // --- 1. Initial Load ---
  React.useEffect(() => {
    // Load first page (size=10)
    loadNotifications(`${API_BASE}/notifications/?page_size=10`, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- 2. Infinite Scroll Observer ---
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Trigger load only if target is visible, we have more pages, and not currently loading
        if (entries[0].isIntersecting && hasMore && !loading && nextUrl) {
          loadNotifications(nextUrl, true);
        }
      },
      { threshold: 0.1 }
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    
    return () => {
      if (observerTarget.current) observer.unobserve(observerTarget.current);
    };
  }, [hasMore, loading, nextUrl, loadNotifications]);


  // --- Helper API Calls ---
  const apiMarkRead = async (ids = []) => {
    if (!ids.length) return;
    try {
      await fetch(`${API_BASE}/notifications/mark-read/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...tokenHeader(), Accept: "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids }),
      });
    } catch { }
  };

  const handleToggleRead = async (id, nowRead) => {
    setItems((curr) => {
      const next = curr.map((i) => (i.id === id ? { ...i, is_read: nowRead } : i));
      emitUnreadCount(next.filter((x) => !x.is_read).length);
      return next;
    });
    if (nowRead) await apiMarkRead([id]);
  };

  const handleMarkAllRead = async () => {
    const ids = items.filter((i) => !i.is_read).map((i) => i.id);
    if (!ids.length) return;
    setItems((curr) => {
      const next = curr.map((i) => ({ ...i, is_read: true }));
      emitUnreadCount(0);
      return next;
    });
    await apiMarkRead(ids);
  };

  const handleOpen = (n) => {
    if (onOpen) return onOpen(n);
    const ctx = n.context || {};

    if (n.kind === "friend_request" || n.kind === "connection_request") {
      if (ctx.profile_user_id) return navigate(`/community/rich-profile/${ctx.profile_user_id}`);
      return;
    }

    if (ctx.eventId) return navigate(`/events/${ctx.eventId}`);
    if (ctx.postId) return navigate(`/feed/post/${ctx.postId}`);
    if (ctx.groupSlug) return navigate(`/groups/${ctx.groupSlug}`);
    return;
  };

  const updateItem = (id, patch) =>
    setItems((curr) => curr.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const handleAcceptRequest = async (id) => {
    const n = items.find((x) => x.id === id);
    const frId = n?.context?.friend_request_id;
    if (!frId) return;
    updateItem(id, { _busy: true });
    try {
      const r = await fetch(`${API_BASE}/friend-requests/${frId}/accept/`, {
        method: "POST",
        headers: { ...tokenHeader(), Accept: "application/json" },
        credentials: "include",
      });
      updateItem(id, {
        _busy: false,
        is_read: true,
        state: r.ok ? "accepted" : n.state,
      });
    } catch {
      updateItem(id, { _busy: false });
    }
  };

  const handleDeclineRequest = async (id) => {
    const n = items.find((x) => x.id === id);
    const frId = n?.context?.friend_request_id;
    if (!frId) return;
    updateItem(id, { _busy: true });
    try {
      const r = await fetch(`${API_BASE}/friend-requests/${frId}/decline/`, {
        method: "POST",
        headers: { ...tokenHeader(), Accept: "application/json" },
        credentials: "include",
      });
      updateItem(id, {
        _busy: false,
        is_read: true,
        state: r.ok ? "declined" : n.state,
      });
    } catch {
      updateItem(id, { _busy: false });
    }
  };

  const handleFollowBack = async (id) => {
    updateItem(id, { _busy: true });
    await sleep(350);
    updateItem(id, { following_back: true, _busy: false, is_read: true });
    onFollowBackUser?.(id);
  };

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={12} md={9} sx={{ width: '100%' }}>
        {/* Header */}
        <Paper
          sx={{
            p: 2,
            border: `1px solid ${BORDER}`,
            borderRadius: 3,
            mb: 2,
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              alignItems: "center",
              columnGap: 1,
              rowGap: 1,
            }}
          >
            <Stack direction="row" spacing={1.25} alignItems="center">
              <Badge badgeContent={unreadCount} color="primary">
                <NotificationsNoneOutlinedIcon />
              </Badge>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Notifications
              </Typography>
              <Chip size="small" label={`${unreadCount} unread`} />
            </Stack>

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              alignItems={{ xs: "flex-start", sm: "center" }}
              justifyContent={{ xs: "flex-start", sm: "flex-end" }}
              sx={{ width: "100%" }}
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={showOnlyUnread}
                    onChange={(e) => setShowOnlyUnread(e.target.checked)}
                    size="small"
                  />
                }
                label="Unread only"
                sx={{
                  m: 0,
                  "& .MuiFormControlLabel-label": {
                    fontSize: { xs: 12, sm: 14 },
                  },
                }}
              />

              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                sx={{ width: { xs: "100%", sm: "auto" } }}
              >
                <Select
                  size="small"
                  value={kind}
                  onChange={(e) => setKind(e.target.value)}
                  sx={{
                    minWidth: { xs: "100%", sm: 140 },
                  }}
                >
                  {[
                    "All",
                    "Requests",
                    "Follows",
                    "Mentions",
                    "Comments",
                    "Reactions",
                    "Events",
                    "System",
                  ].map((k) => (
                    <MenuItem key={k} value={k}>
                      {k}
                    </MenuItem>
                  ))}
                </Select>

                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<DoneAllIcon />}
                  onClick={handleMarkAllRead}
                  sx={{
                    width: { xs: "100%", sm: "auto" },
                    whiteSpace: "nowrap",
                  }}
                >
                  Mark all read
                </Button>
              </Stack>
            </Stack>
          </Box>
        </Paper>

        {/* Initial Loading State */}
        {loading && items.length === 0 ? (
          <>
            <NotificationSkeleton />
            <NotificationSkeleton />
            <NotificationSkeleton />
          </>
        ) : filtered.length === 0 ? (
          <Paper sx={{ p: 2, border: `1px solid ${BORDER}`, borderRadius: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">No notifications found.</Typography>
          </Paper>
        ) : (
          <>
            {/* Grouped Lists */}
            {["Today", "Yesterday", "Earlier"].map((section) =>
              grouped[section]?.length ? (
                <Box key={section} sx={{ mb: 2 }}>
                  <Typography variant="overline" sx={{ color: "text.secondary" }}>
                    {section}
                  </Typography>
                  <List sx={{ mt: 1 }}>
                    {grouped[section].map((it) => (
                      <ListItem key={it.id} disableGutters sx={{ px: 0 }}>
                        <NotificationRow
                          item={it}
                          onOpen={handleOpen}
                          onToggleRead={handleToggleRead}
                          onAcceptRequest={handleAcceptRequest}
                          onDeclineRequest={handleDeclineRequest}
                          onFollowBack={handleFollowBack}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              ) : null
            )}

            {/* Bottom Loader / Scroll Trigger */}
            {hasMore && (
              <Box ref={observerTarget} sx={{ py: 1, textAlign: "center", width: "100%" }}>
                {loading && <NotificationSkeleton />}
              </Box>
            )}
          </>
        )}
      </Grid>
    </Grid>
  );
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}