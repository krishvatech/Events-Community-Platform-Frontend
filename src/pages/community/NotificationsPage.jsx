// src/pages/community/NotificationsPage.jsx
import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  Avatar, Badge, Box, Button, Chip, Grid, IconButton,
  List, ListItem, ListItemAvatar, ListItemText, Paper, Stack,
  TextField, Typography, Switch, FormControlLabel, MenuItem, Select
} from "@mui/material";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import MarkEmailReadOutlinedIcon from "@mui/icons-material/MarkEmailReadOutlined";
import MarkEmailUnreadOutlinedIcon from "@mui/icons-material/MarkEmailUnreadOutlined";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import OpenInNewOutlinedIcon from "@mui/icons-material/OpenInNewOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import HighlightOffIcon from "@mui/icons-material/HighlightOff";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import CommunityProfileCard from "../../components/CommunityProfileCard.jsx";
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

/* ------------------- row with actions ------------------- */
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

  const ActionsByKind = () => {
    // LinkedIn-style connection/friend request
    if (item.kind === "friend_request" || item.kind === "connection_request") {
      if (item.state === "accepted") {
        return null;
      }

      if (item.state === "declined") {
        return null;
      }
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

    // Follow
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
        width: 1,                 // ⬅ make each row same width as header
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
          {/* headline */}
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {item.actor?.name || "System"}
            </Typography>
            <Typography variant="body2">{item.title}</Typography>
            {item.context?.group && (
              <Chip size="small" label={item.context.group} variant="outlined" />
            )}
          </Stack>

          {/* description */}
          {item.description ? (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block" }}
            >
              {item.description}
            </Typography>
          ) : null}

          {/* meta */}
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.75 }}>
            <Chip size="small" label={kindChip(item.kind)} />
            <Typography variant="caption" color="text.secondary">
              {formatWhen(item.created_at)}
            </Typography>
          </Stack>

          {/* kind-specific actions (accept/decline, follow back) */}
          <ActionsByKind />
        </Box>

        {/* general actions */}
        <Stack spacing={0.5} alignItems="flex-end">
          {/* icons row (unchanged behavior) */}
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

          {/* status pill for ALL cases */}
          {(() => {
            const s = (item.state || "").toLowerCase();
            if (!s) return null; // no state => no pill

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
              return (
                <Chip
                  {...common}
                  icon={<CheckCircleRoundedIcon sx={{ fontSize: 16 }} />}
                  label="Accepted"
                  sx={{
                    ...common.sx,
                    bgcolor: "#e6f4ea",
                    borderColor: "#e6f4ea",
                    color: "#1a7f37",
                    "& .MuiChip-icon": { color: "#1a7f37", mr: 0.5 },
                  }}
                />
              );
            }

            if (s === "declined" || s === "rejected") {
              return (
                <Chip
                  {...common}
                  icon={<CancelRoundedIcon sx={{ fontSize: 16 }} />}
                  label="Declined"
                  sx={{
                    ...common.sx,
                    bgcolor: "#fde7e9",
                    borderColor: "#fde7e9",
                    color: "#b42318",
                    "& .MuiChip-icon": { color: "#b42318", mr: 0.5 },
                  }}
                />
              );
            }

            if (s === "pending" || s === "requested" || s === "waiting" || s === "sent") {
              return (
                <Chip
                  {...common}
                  icon={<HourglassBottomRoundedIcon sx={{ fontSize: 16 }} />}
                  label={s === "sent" ? "Sent" : "Pending"}
                  sx={{
                    ...common.sx,
                    bgcolor: "#eef2f6",
                    borderColor: "#eef2f6",
                    color: "#374151",
                    "& .MuiChip-icon": { color: "#374151", mr: 0.5 },
                  }}
                />
              );
            }

            // fallback: show the raw state
            return (
              <Chip
                {...common}
                icon={<InfoRoundedIcon sx={{ fontSize: 16 }} />}
                label={item.state}
                sx={{
                  ...common.sx,
                  bgcolor: "#f3f4f6",
                  borderColor: "#f3f4f6",
                  color: "#111827",
                  "& .MuiChip-icon": { color: "#6b7280", mr: 0.5 },
                }}
              />
            );
          })()}
        </Stack>
      </Stack>
    </Paper>
  );
}

/* ------------------- main page component ------------------- */
export default function NotificationsPage({
  items: initialItems,
  // optional external callbacks if you wire up your API later:
  onOpen,
  onMarkRead,
  onMarkAllRead,
  onRespondRequest, // (id, "accepted"|"declined")
  onFollowBackUser, // (id)
  user, stats, tags = [],
}) {
  const navigate = useNavigate();
  const [items, setItems] = React.useState([]);
  const [showOnlyUnread, setShowOnlyUnread] = React.useState(false);
  const [kind, setKind] = React.useState("All");

  // derived
  const unreadCount = React.useMemo(() => items.filter((i) => !i.is_read).length, [items]);

  const filtered = React.useMemo(() => {
    let arr = [...items];
    if (showOnlyUnread) arr = arr.filter((i) => !i.is_read);
    if (kind !== "All") {
      const k = kind.toLowerCase(); // "Requests", "Follows" etc.
      // normalize for mapping
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
    arr.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return arr;
  }, [items, showOnlyUnread, kind]);

  const grouped = groupByDay(filtered);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/notifications/`, {
          headers: { ...tokenHeader(), Accept: "application/json" },
          credentials: "include",
        });
        const j = await r.json().catch(() => []);
        const raw = Array.isArray(j) ? j : j?.results || [];

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
            avatar: n.actor?.avatar_url || "",   // ← use avatar_url now returned by API
          },
          context: {
            friend_request_id: n.data?.friend_request_id,
            profile_user_id: n.data?.from_user_id || n.data?.to_user_id,
          },
        }));

        if (!alive) return;
        setItems(mapped);

        // 🔔 mark-all-read-on-open (optimistic)
        const idsToMark = mapped.filter((i) => !i.is_read).map((i) => i.id);
        if (idsToMark.length) {
          setItems((curr) =>
            curr.map((i) => (idsToMark.includes(i.id) ? { ...i, is_read: true } : i))
          );
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
        // sidebar bell → 0
        emitUnreadCount(0);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

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

  /* ---------- actions: optimistic mock handlers ---------- */
  const handleToggleRead = async (id, nowRead) => {
    setItems((curr) => {
      const next = curr.map((i) => (i.id === id ? { ...i, is_read: nowRead } : i));
      emitUnreadCount(next.filter((x) => !x.is_read).length);
      return next;
    });
    // backend only supports "mark as read"
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

    // Friend/connection requests → Open goes to sender's profile
    if (n.kind === "friend_request" || n.kind === "connection_request") {
      if (ctx.profile_user_id) return navigate(`/community/rich-profile/${ctx.profile_user_id}`);
      return;
    }

    // All other notifications: Open should go to the target only (NOT profile)
    if (ctx.eventId) return navigate(`/events/${ctx.eventId}`);
    if (ctx.postId) return navigate(`/feed/post/${ctx.postId}`);
    if (ctx.groupSlug) return navigate(`/groups/${ctx.groupSlug}`);

    // No profile fallback here—profile is opened ONLY via avatar click
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
      {/* center column */}
      <Grid item xs={12} md={9}>
        {/* header */}
        <Paper sx={{ p: 2, border: `1px solid ${BORDER}`, borderRadius: 3, mb: 2 }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, // ← equal widths from sm+
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

            <Stack direction="row" spacing={1} alignItems="center" justifyContent={{ xs: "flex-start", sm: "flex-end" }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={showOnlyUnread}
                    onChange={(e) => setShowOnlyUnread(e.target.checked)}
                    size="small"
                  />
                }
                label="Unread only"
              />
              <Select
                size="small"
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                sx={{ minWidth: 140 }}
              >
                {["All", "Requests", "Follows", "Mentions", "Comments", "Reactions", "Events", "System"].map((k) => (
                  <MenuItem key={k} value={k}>{k}</MenuItem>
                ))}
              </Select>
              <Button
                size="small"
                variant="outlined"
                startIcon={<DoneAllIcon />}
                onClick={handleMarkAllRead}
              >
                Mark all read
              </Button>
            </Stack>
          </Box>
        </Paper>

        {/* day groups */}
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
      </Grid>

      {/* right column */}
      <Grid item xs={12} md={3} sx={{ display: { xs: "none", md: "block" } }}>
        <Box sx={{ position: "sticky", top: 88, alignSelf: "flex-start" }}>
          <CommunityProfileCard user={user} stats={stats} tags={tags} />
        </Box>
      </Grid>
    </Grid>
  );
}

/* ------------------- mock data + utils ------------------- */
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}