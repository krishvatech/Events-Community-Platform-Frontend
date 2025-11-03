// src/pages/community/MessagesPage.jsx
import * as React from "react";
import {
  Avatar, Badge, Box, Button, Chip, Divider, Grid, IconButton, InputAdornment,
  List, ListItem, ListItemAvatar, ListItemText, Paper, Stack, TextField, Tooltip, Typography
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import SendIcon from "@mui/icons-material/Send";
import AttachFileOutlinedIcon from "@mui/icons-material/AttachFileOutlined";
import MoreVertOutlinedIcon from "@mui/icons-material/MoreVertOutlined";
import ArrowUpwardOutlinedIcon from "@mui/icons-material/ArrowUpwardOutlined";

const BORDER = "#e2e8f0";

// Bubble for a single message
function MessageBubble({ msg, me = "me" }) {
  const mine = msg.sender_id === me;
  return (
    <Stack
      direction="row"
      justifyContent={mine ? "flex-end" : "flex-start"}
      sx={{ my: 0.5 }}
    >
      {!mine && (
        <Avatar
          src={msg.sender_avatar}
          alt={msg.sender_name}
          sx={{ width: 28, height: 28, mr: 1, mt: "auto" }}
        />
      )}
      <Box
        sx={{
          maxWidth: "78%",
          px: 1.25,
          py: 1,
          borderRadius: 2,
          border: `1px solid ${BORDER}`,
          bgcolor: mine ? "#e6f7f6" : "background.paper",
        }}
      >
        {!mine && (
          <Typography variant="caption" sx={{ fontWeight: 700 }}>
            {msg.sender_name}
          </Typography>
        )}
        {msg.text && (
          <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
            {msg.text}
          </Typography>
        )}
        {msg.attachment && (
          <Chip
            size="small"
            variant="outlined"
            component="a"
            href={msg.attachment.url}
            target="_blank"
            label={msg.attachment.name}
            clickable
            sx={{ mt: 0.5 }}
          />
        )}
        <Stack direction="row" justifyContent="flex-end">
          <Typography variant="caption" color="text.secondary">
            {new Date(msg.created_at).toLocaleTimeString()}
          </Typography>
        </Stack>
      </Box>
      {mine && (
        <Avatar
          src={msg.sender_avatar}
          alt={msg.sender_name}
          sx={{ width: 28, height: 28, ml: 1, mt: "auto" }}
        />
      )}
    </Stack>
  );
}

// One row in the conversation list
function ConversationItem({ c, active, onClick }) {
  return (
    <ListItem
      disableGutters
      onClick={onClick}
      sx={{
        px: 1,
        py: 1,
        borderRadius: 2,
        cursor: "pointer",
        ...(active
          ? { bgcolor: "#f6fffe", border: `1px solid ${BORDER}` }
          : { "&:hover": { bgcolor: "#fafafa" } }),
      }}
    >
      <ListItemAvatar sx={{ minWidth: 48 }}>
        <Badge
          variant={c.unread > 0 ? "dot" : "standard"}
          color="primary"
          overlap="circular"
        >
          <Avatar src={c.avatar} alt={c.name} />
        </Badge>
      </ListItemAvatar>
      <ListItemText
        primary={
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
              {c.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {c.time}
            </Typography>
          </Stack>
        }
        secondary={
          <Typography variant="caption" color="text.secondary" noWrap>
            {c.lastMessage}
          </Typography>
        }
      />
    </ListItem>
  );
}

export default function MessagesPage({
  // Data (optional). If not provided, mock/demo data will be used.
  conversations: initialConversations,
  initialActiveId,
  fetchMessages,                  // async (conversationId, page) => { items, hasMore }
  // Callbacks (optional)
  onSend = (conversationId, text, files) => {},
  onMarkRead = (conversationId) => {},
  // Realtime (optional)
  websocketUrl,                   // ws(s)://... to receive {type: "message", conversationId, message}
  // Me (optional)
  me = { id: "me", name: "You", avatar: "" },
}) {
  // Left panel: conversations
  const [conversations, setConversations] = React.useState(
    () => initialConversations ?? demoConversations()
  );
  const [q, setQ] = React.useState("");

  // Center: active conversation + messages
  const [activeId, setActiveId] = React.useState(
    () => initialActiveId ?? (conversations[0]?.id || null)
  );
  const [messages, setMessages] = React.useState(() =>
    demoMessages(activeId, me)
  );
  const [page, setPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(true);
  const scrollerRef = React.useRef(null);
  const [draft, setDraft] = React.useState("");
  const [typing, setTyping] = React.useState(false);

  // Load messages when conversation changes
  React.useEffect(() => {
    let alive = true;
    async function load() {
      if (!activeId) return;
      if (fetchMessages) {
        const res = await fetchMessages(activeId, 1);
        if (!alive) return;
        setMessages(res?.items ?? []);
        setPage(1);
        setHasMore(Boolean(res?.hasMore));
      } else {
        setMessages(demoMessages(activeId, me));
        setPage(1);
        setHasMore(true);
      }
      // mark read on open
      setConversations((curr) =>
        curr.map((c) => (c.id === activeId ? { ...c, unread: 0 } : c))
      );
      onMarkRead?.(activeId);
      // scroll to bottom
      requestAnimationFrame(() => {
        if (scrollerRef.current) {
          scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
        }
      });
    }
    load();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  // Optional realtime socket
  React.useEffect(() => {
    if (!websocketUrl) return;
    const ws = new WebSocket(websocketUrl);
    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg?.type === "typing" && msg.conversationId === activeId) {
          setTyping(true);
          setTimeout(() => setTyping(false), 1200);
        }
        if (msg?.type === "message") {
          setConversations((curr) =>
            curr.map((c) =>
              c.id === msg.conversationId
                ? {
                    ...c,
                    lastMessage: msg.message.text || "Attachment",
                    time: new Date(msg.message.created_at).toLocaleTimeString(),
                    unread: c.id === activeId ? 0 : (c.unread || 0) + 1,
                  }
                : c
            )
          );
          if (msg.conversationId === activeId) {
            setMessages((curr) => [...curr, msg.message]);
            // auto-scroll down
            requestAnimationFrame(() => {
              if (scrollerRef.current) {
                scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
              }
            });
          }
        }
      } catch {}
    };
    return () => ws.close();
  }, [websocketUrl, activeId]);

  const filteredConvs = React.useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return conversations;
    return conversations.filter((c) => c.name.toLowerCase().includes(t));
  }, [conversations, q]);

  const handleLoadOlder = async () => {
    if (!hasMore) return;
    if (fetchMessages) {
      const res = await fetchMessages(activeId, page + 1);
      if (res?.items?.length) {
        setMessages((curr) => [...res.items, ...curr]);
        setPage((p) => p + 1);
        setHasMore(Boolean(res?.hasMore));
      } else {
        setHasMore(false);
      }
      return;
    }
    // demo fallback
    setHasMore(false);
  };

  const handleSend = () => {
    const text = draft.trim();
    if (!text) return;
    const newMsg = {
      id: "local-" + Date.now(),
      conversation_id: activeId,
      sender_id: me.id,
      sender_name: me.name,
      sender_avatar: me.avatar,
      text,
      created_at: new Date().toISOString(),
    };
    setMessages((curr) => [...curr, newMsg]);
    setDraft("");
    // update conv row
    setConversations((curr) =>
      curr.map((c) =>
        c.id === activeId
          ? { ...c, lastMessage: text, time: new Date().toLocaleTimeString() }
          : c
      )
    );
    onSend?.(activeId, text, []);
    // scroll to bottom
    requestAnimationFrame(() => {
      if (scrollerRef.current) {
        scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
      }
    });
  };

  return (
    <Grid container spacing={2}>
      {/* Left: conversation list */}
      <Grid item xs={12} md={3}>
        <Paper sx={{ p: 1.5, border: `1px solid ${BORDER}`, borderRadius: 3 }}>
          <TextField
            size="small"
            placeholder="Search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <List dense sx={{ mt: 1, maxHeight: { md: "calc(100vh - 220px)" }, overflowY: "auto" }}>
            {filteredConvs.map((c) => (
              <ConversationItem
                key={c.id}
                c={c}
                active={c.id === activeId}
                onClick={() => setActiveId(c.id)}
              />
            ))}
          </List>
          <Button fullWidth variant="outlined" sx={{ mt: 1 }}>
            New chat
          </Button>
        </Paper>
      </Grid>

      {/* Center: thread */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 1.5, border: `1px solid ${BORDER}`, borderRadius: 3, mb: 1 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {conversations.find((c) => c.id === activeId)?.name || "Messages"}
            </Typography>
            <IconButton size="small">
              <MoreVertOutlinedIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Paper>

        <Paper
          sx={{
            p: 1.5,
            border: `1px solid ${BORDER}`,
            borderRadius: 3,
            minHeight: 360,
            maxHeight: { md: "calc(100vh - 260px)" },
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Stack direction="row" justifyContent="center" sx={{ mb: 1 }}>
            {hasMore && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<ArrowUpwardOutlinedIcon />}
                onClick={handleLoadOlder}
              >
                Load older
              </Button>
            )}
          </Stack>

          <Box
            ref={scrollerRef}
            sx={{ flex: 1, overflowY: "auto", px: 0.5 }}
          >
            {messages.map((m) => (
              <MessageBubble key={m.id} msg={m} me={me.id} />
            ))}
            {typing && (
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                typing…
              </Typography>
            )}
          </Box>

          <Divider sx={{ my: 1 }} />

          <Stack direction="row" spacing={1}>
            <Tooltip title="Attach file">
              <IconButton size="small">
                <AttachFileOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <TextField
              size="small"
              placeholder="Type a message"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              fullWidth
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <Button variant="contained" size="small" endIcon={<SendIcon />} onClick={handleSend}>
              Send
            </Button>
          </Stack>
        </Paper>
      </Grid>

      {/* Right: conversation info / participants */}
      <Grid item xs={12} md={3}>
        <Paper sx={{ p: 1.5, border: `1px solid ${BORDER}`, borderRadius: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            Conversation info
          </Typography>

          <Stack spacing={1}>
            {(conversations.find((c) => c.id === activeId)?.participants || demoParticipants()).map(
              (p) => (
                <Stack key={p.id} direction="row" spacing={1} alignItems="center">
                  <Avatar src={p.avatar} sx={{ width: 28, height: 28 }} />
                  <Typography variant="body2">{p.name}</Typography>
                  {p.role && (
                    <Chip size="small" variant="outlined" label={p.role} sx={{ ml: "auto" }} />
                  )}
                </Stack>
              )
            )}
          </Stack>

          <Divider sx={{ my: 1.5 }} />

          <Stack direction="row" spacing={1}>
            <Button size="small" variant="outlined">Mute</Button>
            <Button size="small" variant="outlined">Leave</Button>
          </Stack>
        </Paper>
      </Grid>
    </Grid>
  );
}

/* ------------------ Demo data (used if props not passed) ------------------ */
function demoConversations() {
  return [
    {
      id: "c1",
      name: "Anita Sharma",
      avatar:
        "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=80&q=80&auto=format&fit=crop",
      lastMessage: "See you at the workshop!",
      time: "16:05",
      unread: 2,
      participants: demoParticipants().slice(0, 2),
    },
    {
      id: "c2",
      name: "EMEA Chapter (Core)",
      avatar:
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&q=80&auto=format&fit=crop",
      lastMessage: "Agenda updated.",
      time: "15:40",
      unread: 0,
      participants: demoParticipants(),
    },
    {
      id: "c3",
      name: "Cohort 2024 Online",
      avatar:
        "https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?w=80&q=80&auto=format&fit=crop",
      lastMessage: "Slides attached.",
      time: "Yesterday",
      unread: 0,
      participants: demoParticipants(),
    },
  ];
}

function demoParticipants() {
  return [
    {
      id: "u1",
      name: "You",
      avatar: "",
      role: "Owner",
    },
    {
      id: "u2",
      name: "Anita Sharma",
      avatar:
        "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=80&q=80&auto=format&fit=crop",
    },
    {
      id: "u3",
      name: "Kenji Watanabe",
      avatar:
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&q=80&auto=format&fit=crop",
    },
  ];
}

function demoMessages(convId, me) {
  const now = Date.now();
  return [
    {
      id: "m1",
      conversation_id: convId,
      sender_id: "u2",
      sender_name: "Anita Sharma",
      sender_avatar:
        "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=80&q=80&auto=format&fit=crop",
      text: "Hey! Ready for the Legal DD workshop?",
      created_at: new Date(now - 1000 * 60 * 25).toISOString(),
    },
    {
      id: "m2",
      conversation_id: convId,
      sender_id: me.id,
      sender_name: me.name,
      sender_avatar: me.avatar,
      text: "Yes, I’ll join at 6:30 PM IST.",
      created_at: new Date(now - 1000 * 60 * 23).toISOString(),
    },
    {
      id: "m3",
      conversation_id: convId,
      sender_id: "u2",
      sender_name: "Anita Sharma",
      sender_avatar:
        "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=80&q=80&auto=format&fit=crop",
      text: "Cool. Sharing the prep checklist.",
      created_at: new Date(now - 1000 * 60 * 20).toISOString(),
      attachment: { name: "Checklist.pdf", url: "#" },
    },
  ];
}
