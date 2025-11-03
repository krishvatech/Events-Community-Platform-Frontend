// src/pages/community/NotificationsPage.jsx
import * as React from "react";
import {
  Avatar, Badge, Box, Button, Chip, Divider, Grid, IconButton,
  List, ListItem, ListItemAvatar, ListItemText, MenuItem, Paper, Stack,
  TextField, Typography
} from "@mui/material";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import MarkEmailReadOutlinedIcon from "@mui/icons-material/MarkEmailReadOutlined";
import MarkEmailUnreadOutlinedIcon from "@mui/icons-material/MarkEmailUnreadOutlined";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import OpenInNewOutlinedIcon from "@mui/icons-material/OpenInNewOutlined";
import CommunityProfileCard from "../../components/CommunityProfileCard.jsx";

const BORDER = "#e2e8f0";

function formatWhen(ts) {
  try { return new Date(ts).toLocaleString(); } catch { return ts; }
}

function groupByDay(items) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const groups = { Today: [], Yesterday: [], Earlier: [] };
  for (const it of items) {
    const d = new Date(it.created_at); const dd = new Date(d); dd.setHours(0, 0, 0, 0);
    if (dd >= today) groups.Today.push(it);
    else if (dd >= yesterday) groups.Yesterday.push(it);
    else groups.Earlier.push(it);
  }
  return groups;
}

function kindChip(kind) {
  const map = { mention: "Mentions", comment: "Comments", reaction: "Reactions", follow: "Follows", event: "Events", system: "System" };
  return map[kind] || "Other";
}

function NotificationRow({ item, onOpen, onToggleRead }) {
  const unread = !item.is_read;
  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.25, mb: 1,
        border: `1px solid ${BORDER}`,
        borderRadius: 2,
        bgcolor: unread ? "#f6fffe" : "background.paper",
      }}
    >
      <Stack direction="row" spacing={1.25} alignItems="flex-start">
        <ListItemAvatar sx={{ minWidth: 48 }}>
          <Avatar src={item.actor?.avatar} alt={item.actor?.name} />
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
          {item.description && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
              {item.description}
            </Typography>
          )}

          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.75 }}>
            <Chip size="small" label={kindChip(item.kind)} />
            <Typography variant="caption" color="text.secondary">
              {formatWhen(item.created_at)}
            </Typography>
          </Stack>
        </Box>

        <Stack direction="row" spacing={0.5}>
          <IconButton
            size="small"
            title={unread ? "Mark as read" : "Mark as unread"}
            onClick={() => onToggleRead?.(item.id, !unread)}
          >
            {unread ? <MarkEmailReadOutlinedIcon fontSize="small" /> : <MarkEmailUnreadOutlinedIcon fontSize="small" />}
          </IconButton>
          <IconButton size="small" title="Open" onClick={() => onOpen?.(item)}>
            <OpenInNewOutlinedIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Stack>
    </Paper>
  );
}

export default function NotificationsPage({
  // Optional data; uses demo if not provided
  items: initialItems,
  // Filters
  kinds = ["All", "Mentions", "Comments", "Reactions", "Follows", "Events", "System"],
  // Callbacks
  onOpen = (item) => { },                 // open notification target (event/post/profile)
  onMarkRead = (ids) => { },              // persist read state
  onMarkAllRead = () => { },              // persist mark all
  // Realtime
  websocketUrl,                          // optional ws(s)://... to receive {type:"notification", item:{...}}
  // Left column (optional)
  user, stats, tags = [],
}) {
  const [items, setItems] = React.useState(() => initialItems ?? demoNotifications());
  const [showOnlyUnread, setShowOnlyUnread] = React.useState(false);
  const [kind, setKind] = React.useState("All");
  const [from, setFrom] = React.useState(""); // yyyy-mm-dd
  const [to, setTo] = React.useState("");

  // Realtime prepend
  React.useEffect(() => {
    if (!websocketUrl) return;
    const ws = new WebSocket(websocketUrl);
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg?.type === "notification" && msg.item) {
          setItems((curr) => [msg.item, ...curr]);
        }
      } catch { }
    };
    return () => ws.close();
  }, [websocketUrl]);

  const unreadCount = React.useMemo(() => items.filter((i) => !i.is_read).length, [items]);

  const filtered = React.useMemo(() => {
    let arr = [...items];
    if (showOnlyUnread) arr = arr.filter((i) => !i.is_read);
    if (kind !== "All") {
      const k = kind.toLowerCase().slice(0, -1); // "Mentions" -> "mention"
      arr = arr.filter((i) => i.kind === k);
    }
    if (from) {
      const ts = new Date(from).getTime();
      arr = arr.filter((i) => new Date(i.created_at).getTime() >= ts);
    }
    if (to) {
      const ts = new Date(to).getTime();
      arr = arr.filter((i) => new Date(i.created_at).getTime() <= ts);
    }
    arr.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return arr;
  }, [items, showOnlyUnread, kind, from, to]);

  const grouped = groupByDay(filtered);

  const handleToggleRead = (id, nowRead) => {
    setItems((curr) =>
      curr.map((i) => (i.id === id ? { ...i, is_read: nowRead } : i))
    );
    onMarkRead?.([id]);
  };

  const handleMarkAllRead = () => {
    const ids = items.filter((i) => !i.is_read).map((i) => i.id);
    if (!ids.length) return;
    setItems((curr) => curr.map((i) => ({ ...i, is_read: true })));
    onMarkAllRead?.(ids);
  };

  return (
    <Grid container spacing={2}>
      {/* Center: Notifications list */}
      <Grid item xs={12} md={9}>
        <Paper sx={{ p: 2, border: `1px solid ${BORDER}`, borderRadius: 3, mb: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={1} alignItems="center">
              <Badge badgeContent={unreadCount} color="primary">
                <NotificationsNoneOutlinedIcon />
              </Badge>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Notifications
              </Typography>
              <Chip size="small" label={`${unreadCount} unread`} />
            </Stack>
            <Stack direction="row" spacing={1}>
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

        {/* Today / Yesterday / Earlier groups */}
        {["Today", "Yesterday", "Earlier"].map((section) => (
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
                      onOpen={(n) => onOpen?.(n)}
                      onToggleRead={handleToggleRead}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          ) : null
        ))}
      </Grid>

      {/* Right: Profile (sticky like left sidebar) */}
      <Grid item xs={12} md={3} sx={{ display: { xs: "none", md: "block" } }}>
        <Box
          sx={{
            position: "sticky",
            top: 88,            // adjust if your header is taller/shorter (e.g., 72–104)
            alignSelf: "flex-start"
          }}
        >
          <CommunityProfileCard user={user} stats={stats} tags={tags} />
        </Box>
      </Grid>
    </Grid>
  );
}

/** Demo notifications (used if you don't pass items prop) */
function demoNotifications() {
  const now = Date.now();
  return [
    {
      id: "n1",
      kind: "mention",
      title: "mentioned you in a comment",
      description: "“Great point about carve-outs, @you!”",
      created_at: new Date(now - 1000 * 60 * 15).toISOString(),
      is_read: false,
      actor: {
        name: "Aisha Khan",
        avatar: "https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?w=80&q=80&auto=format&fit=crop",
      },
      context: { group: "EMEA Chapter", postId: "p4" },
    },
    {
      id: "n2",
      kind: "comment",
      title: "commented on your post",
      description: "“Can you share the valuation sheet?”",
      created_at: new Date(now - 1000 * 60 * 45).toISOString(),
      is_read: false,
      actor: {
        name: "Kenji Watanabe",
        avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&q=80&auto=format&fit=crop",
      },
      context: { group: "Charter Holders", postId: "p2" },
    },
    {
      id: "n3",
      kind: "event",
      title: "event starts soon",
      description: "Legal Due Diligence Workshop · Today 6:30 PM IST",
      created_at: new Date(now - 1000 * 60 * 120).toISOString(),
      is_read: true,
      actor: { name: "IMAA Events", avatar: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=80&q=80&auto=format&fit=crop" },
      context: { group: "Charter Holders", eventId: 9 },
    },
    {
      id: "n4",
      kind: "reaction",
      title: "liked your post",
      description: "“Welcome to all new members!” got new likes",
      created_at: new Date(now - 1000 * 60 * 180).toISOString(),
      is_read: false,
      actor: { name: "Yara Costa", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&q=80&auto=format&fit=crop" },
      context: { group: "EMEA Chapter", postId: "p1" },
    },
    {
      id: "n5",
      kind: "follow",
      title: "started following you",
      description: "",
      created_at: new Date(now - 1000 * 60 * 400).toISOString(),
      is_read: true,
      actor: { name: "Lena Hoff", avatar: "https://images.unsplash.com/photo-1544006659-f0b21884ce1d?w=80&q=80&auto=format&fit=crop" },
      context: {},
    },
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
    {
      id: "n7",
      kind: "comment",
      title: "replied to your comment",
      description: "“Sharing the deck here.”",
      created_at: new Date(now - 1000 * 60 * 1400).toISOString(),
      is_read: false,
      actor: { name: "Anita Sharma", avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=80&q=80&auto=format&fit=crop" },
      context: { group: "Cohort 2024 Online", postId: "p7" },
    },
  ];
}
