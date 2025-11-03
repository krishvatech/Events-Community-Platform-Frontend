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

/* ---------------------- helpers ---------------------- */
function formatWhen(ts) {
  try { return new Date(ts).toLocaleString(); } catch { return ts; }
}
function groupByDay(items) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const groups = { Today: [], Yesterday: [], Earlier: [] };
  for (const it of items) {
    const d0 = new Date(it.created_at); const d = new Date(d0); d.setHours(0,0,0,0);
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
  const unread = !item.is_read;

  const ActionsByKind = () => {
    // LinkedIn-style connection/friend request
    if (item.kind === "friend_request" || item.kind === "connection_request") {
      if (item.state === "accepted") {
        return (
          <Chip
            size="small"
            color="success"
            icon={<CheckCircleOutlineIcon />}
            label="Accepted"
            sx={{ ml: 1 }}
          />
        );
      }
      if (item.state === "declined") {
        return (
          <Chip
            size="small"
            color="default"
            icon={<HighlightOffIcon />}
            label="Declined"
            sx={{ ml: 1 }}
          />
        );
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
        border: `1px solid ${BORDER}`,
        borderRadius: 2,
        bgcolor: unread ? "#f6fffe" : "background.paper",
      }}
    >
      <Stack direction="row" spacing={1.25} alignItems="flex-start">
        <ListItemAvatar sx={{ minWidth: 48 }}>
          <Avatar src={item.actor?.avatar} alt={item.actor?.name}>
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

      // map API -> UI shape the page already expects
      const mapped = raw.map((n) => ({
        id: n.id,
        kind: n.kind,               // "friend_request"
        state: n.state || "",       // "pending" | "accepted" | "declined" | "canceled"
        title: n.title || "",
        description: n.description || "",
        created_at: n.created_at,
        is_read: !!n.is_read,
        actor: {
          name: n.actor?.display_name || n.actor?.username || n.actor?.email || "User",
          avatar: n.actor?.avatar || "",
        },
        // for "open profile" + friend-request actions:
        context: {
          friend_request_id: n.data?.friend_request_id,
          // for the recipient: go to the sender’s profile
          profile_user_id: n.data?.from_user_id || n.data?.to_user_id,
        },
      }));

      if (alive) setItems(mapped);
    } catch {
      // ignore; keep empty list
    }
  })();
  return () => { alive = false; };
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
  } catch {
    // non-blocking
  }
};

  /* ---------- actions: optimistic mock handlers ---------- */
  const handleToggleRead = async (id, nowRead) => {
  // optimistic UI
  setItems((curr) => curr.map((i) => (i.id === id ? { ...i, is_read: nowRead } : i)));
  // backend only supports "mark as read" right now
  if (nowRead) await apiMarkRead([id]);
};

const handleMarkAllRead = async () => {
  const ids = items.filter((i) => !i.is_read).map((i) => i.id);
  if (!ids.length) return;
  setItems((curr) => curr.map((i) => ({ ...i, is_read: true })));
  await apiMarkRead(ids);
};

  const handleOpen = (n) => {
    if (onOpen) return onOpen(n);
    // default: smart routes by context mock
    const ctx = n.context || {};
    if (ctx.profile_user_id) return navigate(`/community/rich-profile/${ctx.profile_user_id}`);
    if (ctx.eventId) return navigate(`/events/${ctx.eventId}`);
    if (ctx.postId) return navigate(`/feed/post/${ctx.postId}`);
    if (ctx.groupSlug) return navigate(`/groups/${ctx.groupSlug}`);
    // fallback
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
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "flex-start", sm: "center" }} justifyContent="space-between">
            <Stack direction="row" spacing={1.25} alignItems="center">
              <Badge badgeContent={unreadCount} color="primary">
                <NotificationsNoneOutlinedIcon />
              </Badge>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Notifications
              </Typography>
              <Chip size="small" label={`${unreadCount} unread`} />
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center">
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
          </Stack>
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

function demoNotifications() {
  const now = Date.now();
  return [
    // connection / friend request (pending -> Accept / Decline)
    {
      id: "req1",
      kind: "friend_request",
      state: "pending", // "accepted" | "declined" | "pending"
      title: "sent you a connection request",
      description: "“Let’s connect and collaborate on M&A deals.”",
      created_at: new Date(now - 1000 * 60 * 6).toISOString(),
      is_read: false,
      actor: {
        name: "Kiran Patel",
        avatar:
          "https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?w=80&q=80&auto=format&fit=crop",
      },
      context: { profile_user_id: 1023 },
    },

    // follow (with Follow back button)
    {
      id: "fol1",
      kind: "follow",
      title: "started following you",
      description: "",
      created_at: new Date(now - 1000 * 60 * 30).toISOString(),
      is_read: false,
      following_back: false,
      actor: {
        name: "Ravi Shah",
        avatar:
          "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&q=80&auto=format&fit=crop",
      },
      context: { profile_user_id: 1089 },
    },

    // mention
    {
      id: "n1",
      kind: "mention",
      title: "mentioned you in a comment",
      description: "“Great point about carve-outs, @you!”",
      created_at: new Date(now - 1000 * 60 * 45).toISOString(),
      is_read: false,
      actor: {
        name: "Aisha Khan",
        avatar:
          "https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?w=80&q=80&auto=format&fit=crop",
      },
      context: { group: "EMEA Chapter", postId: "p4" },
    },

    // event
    {
      id: "n3",
      kind: "event",
      title: "event starts soon",
      description: "Legal Due Diligence Workshop · Today 6:30 PM IST",
      created_at: new Date(now - 1000 * 60 * 120).toISOString(),
      is_read: true,
      actor: {
        name: "IMAA Events",
        avatar:
          "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=80&q=80&auto=format&fit=crop",
      },
      context: { group: "Charter Holders", eventId: 9 },
    },

    // reaction
    {
      id: "n4",
      kind: "reaction",
      title: "liked your post",
      description: "“Welcome to all new members!” got new likes",
      created_at: new Date(now - 1000 * 60 * 180).toISOString(),
      is_read: false,
      actor: {
        name: "Yara Costa",
        avatar:
          "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&q=80&auto=format&fit=crop",
      },
      context: { group: "EMEA Chapter", postId: "p1" },
    },

    // system
    {
      id: "n6",
      kind: "system",
      title: "policy update",
      description: "We’ve updated our community guidelines.",
      created_at: new Date(now - 1000 * 60 * 900).toISOString(),
      is_read: true,
      actor: { name: "System" },
      context: {},
    },

    // comment
    {
      id: "n7",
      kind: "comment",
      title: "replied to your comment",
      description: "“Sharing the deck here.”",
      created_at: new Date(now - 1000 * 60 * 1400).toISOString(),
      is_read: false,
      actor: {
        name: "Anita Sharma",
        avatar:
          "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=80&q=80&auto=format&fit=crop",
      },
      context: { group: "Cohort 2024 Online", postId: "p7" },
    },

    // another connection request already accepted (for UI state)
    {
      id: "req2",
      kind: "connection_request",
      state: "accepted",
      title: "sent you a connection request",
      description: "",
      created_at: new Date(now - 1000 * 60 * 2000).toISOString(),
      is_read: true,
      actor: {
        name: "Elena Petrova",
        avatar:
          "https://images.unsplash.com/photo-1544006659-f0b21884ce1d?w=80&q=80&auto=format&fit=crop",
      },
      context: { profile_user_id: 1201 },
    },
  ];
}
