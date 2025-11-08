// src/pages/community/MessagesPage.jsx
import * as React from "react";
import {
  Avatar,
  AvatarGroup,
  Badge,
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  Tabs,
  Tab,
  CircularProgress,
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import SendIcon from "@mui/icons-material/Send";
import AttachFileOutlinedIcon from "@mui/icons-material/AttachFileOutlined";
import MoreVertOutlinedIcon from "@mui/icons-material/MoreVertOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import VideocamOutlinedIcon from "@mui/icons-material/VideocamOutlined";
import PersonAddAltOutlinedIcon from "@mui/icons-material/PersonAddAltOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import VideoFileOutlinedIcon from "@mui/icons-material/VideoFileOutlined";
import FolderOpenOutlinedIcon from "@mui/icons-material/FolderOpenOutlined";

const BORDER = "#e2e8f0";
const PANEL_H = "calc(100vh - 180px)";

// ---------- API helpers ----------
const API_ROOT = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");
const MESSAGING = `${API_ROOT}/messaging`;

function getCookie(name) {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match("(^|;)\\s*" + name + "\\s*=\\s*([^;]+)");
  return m ? decodeURIComponent(m.pop()) : null;
}
function authHeader() {
  const access =
    localStorage.getItem("access") ||
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken");
  const headers = {};
  if (access) headers.Authorization = `Bearer ${access}`;
  return headers;
}
function csrfHeader(method) {
  if (!method || ["GET", "HEAD", "OPTIONS"].includes(method)) return {};
  const csrftoken = getCookie("csrftoken") || getCookie("csrfToken");
  return csrftoken ? { "X-CSRFToken": csrftoken } : {};
}
async function apiFetch(url, { method = "GET", headers = {}, body } = {}) {
  const finalHeaders = {
    Accept: "application/json",
    ...authHeader(),
    ...csrfHeader(method),
    ...headers,
  };
  const res = await fetch(url, {
    method,
    headers: finalHeaders,
    body,
    credentials: "include",
  });
  return res;
}

// ---------- UI SUB-COMPONENTS ----------

// Left list row (conversation item)
function ConversationRow({ thread, active, onClick }) {
  const unread = thread.unread_count || 0;
  const title = (thread?.group?.name)
    || thread.display_title
    || (thread.chat_type === "dm" ? "Direct Message" : "Conversation");
  const time = thread.updated_at ? new Date(thread.updated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
  const last = thread.last_message || "";

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
        <Badge variant={unread > 0 ? "dot" : "standard"} color="primary" overlap="circular">
          <Avatar src={thread.context_logo}>{(title || "C").slice(0, 1)}</Avatar>
        </Badge>
      </ListItemAvatar>

      <ListItemText
        primary={
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
              {title}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {time}
            </Typography>
          </Stack>
        }
        secondary={
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="caption" color="text.secondary" noWrap>
              {last}
            </Typography>
            {unread > 0 && (
              <Chip size="small" label={String(unread)} color="primary" sx={{ height: 18, minHeight: 18 }} />
            )}
          </Stack>
        }
      />
    </ListItem>
  );
}

// Single message bubble (center)
function Bubble({ m, showSender, myAvatar }) {
  const mine = Boolean(m.mine);
  return (
    <Stack
      direction="row"
      justifyContent={mine ? "flex-end" : "flex-start"}
      alignItems="flex-end"
      sx={{ my: 1 }}
    >
      {!mine && (
        <Avatar src={m.sender_avatar} sx={{ width: 32, height: 32, mr: 1 }}>
          {(m.sender_display || m.sender_name || "U").slice(0, 1)}
        </Avatar>
      )}
      <Box
        sx={{
          maxWidth: "78%",
          bgcolor: mine ? "#2dd4bf" : "background.paper",
          color: mine ? "white" : "inherit",
          px: 1.5,
          py: 1,
          borderRadius: 2,
          border: `1px solid ${mine ? "#14b8a6" : BORDER}`,
          boxShadow: mine ? "0 2px 6px rgba(20,184,166,0.25)" : "none",
        }}
      >
        {!mine && showSender && (
          <Typography variant="caption" sx={{ fontWeight: 700 }}>
            {m.sender_display || m.sender_name}
          </Typography>
        )}
        {m.body && (
          <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
            {m.body}
          </Typography>
        )}
        <Stack direction="row" justifyContent="flex-end">
          <Typography variant="caption" sx={{ opacity: 0.7 }}>
            {m._time}
          </Typography>
        </Stack>
      </Box>
      {mine && <Avatar sx={{ width: 32, height: 32, ml: 1 }}>Y</Avatar>}
    </Stack>
  );
}

// ---------- New Chat Dialog (Friends | Groups | Events) ----------
function NewChatDialog({ open, onClose, onOpened }) {
  const [tab, setTab] = React.useState(0); // 0: Friends, 1: Groups, 2: Events
  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [friends, setFriends] = React.useState([]);
  const [groups, setGroups] = React.useState([]);
  const [events, setEvents] = React.useState([]);

  // small helper: normalize any response into [{id, name, avatar}]
  const normalizeEvents = React.useCallback((json) => {
    const inArr = Array.isArray(json?.results) ? json.results : Array.isArray(json) ? json : [];
    const out = [];

    for (const x of inArr) {
      // Case A: it's already an event object
      if (x?.id && (x?.title || x?.name)) {
        out.push({
          id: x.id,
          name: x.title || x.name || `Event #${x.id}`,
          avatar: x.banner_url || x.cover_image || x.poster || x.thumbnail || "",
        });
        continue;
      }
      // Case B: it's a registration object; event nested
      const ev = x?.event || x?.event_obj || null;
      if (ev && (ev.id || x.event_id)) {
        const id = ev.id || x.event_id;
        out.push({
          id,
          name: ev.title || ev.name || x.event_title || `Event #${id}`,
          avatar: ev.banner_url || ev.cover_image || ev.poster || ev.thumbnail || "",
        });
        continue;
      }
      // Case C: registration with ids/titles split
      if (x?.event_id) {
        const id = x.event_id;
        out.push({
          id,
          name: x.event_title || `Event #${id}`,
          avatar: "",
        });
      }
    }

    // dedupe by id
    const seen = new Set();
    return out.filter((e) => (e.id && !seen.has(e.id) && seen.add(e.id)));
  }, []);

  React.useEffect(() => {
    if (!open) return;
    onOpened?.();

    (async () => {
      setLoading(true);
      try {
        // ---- FRIENDS ----
        const fr = await apiFetch(`${API_ROOT}/friends/?page_size=100`);
        const frJson = await fr.json();
        const ff = (Array.isArray(frJson?.results) ? frJson.results : Array.isArray(frJson) ? frJson : [])
          .map((x) => ({
            id: x?.friend?.id ?? x?.id ?? x?.user_id ?? x?.user?.id,
            name: x?.friend?.full_name || x?.friend?.username || x?.friend_name || x?.name || x?.user?.username || "Friend",
            avatar: x?.friend?.avatar || x?.avatar || "",
          }))
          .filter((x) => x.id);
        setFriends(ff);

        // ---- GROUPS ----
        let gRes = await apiFetch(`${MESSAGING}/conversations/chat-groups/`);
        let gJson = await gRes.json();
        if (!Array.isArray(gJson) || gJson.length === 0) {
          const jg = await apiFetch(`${API_ROOT}/groups/joined-groups/`);
          gJson = await jg.json();
          if (!Array.isArray(gJson)) {
            const eg = await apiFetch(`${API_ROOT}/groups/explore-groups/`);
            gJson = await eg.json();
          }
        }
        const gg = (Array.isArray(gJson?.results) ? gJson.results : Array.isArray(gJson) ? gJson : [])
          .map((g) => ({
            id: g.id,
            name: g.name || g.title || "Group",
            avatar: g.logo_url || g.cover_image || "",
          }))
          .filter((g) => g.id);
        setGroups(gg);

        // ---- EVENTS (your candidates) ----
        // optionally get me.id for the last candidate
        let meId = null;
        try {
          const meRes = await apiFetch(`${API_ROOT}/users/me/`);
          if (meRes.ok) {
            const meJson = await meRes.json();
            meId = meJson?.id || null;
          }
        } catch { }

        const candidates = [
          `${API_ROOT}/events/mine/`,
          `${API_ROOT}/event-registrations/mine/`,
          `${API_ROOT}/registrations/mine/`,
          `${API_ROOT}/event-registrations/?user=me`,
          meId ? `${API_ROOT}/event-registrations/?user=${meId}` : null,
        ].filter(Boolean);

        let evOut = [];
        // prefer a precise helper if you add one later
        try {
          const er = await apiFetch(`${MESSAGING}/conversations/chat-events/`);
          if (er.ok) {
            const ej = await er.json();
            evOut = normalizeEvents(ej);
          }
        } catch { }

        if (evOut.length === 0) {
          for (const url of candidates) {
            try {
              const r = await apiFetch(url);
              if (!r.ok) continue;
              const j = await r.json();
              const picked = normalizeEvents(j);
              if (picked.length) { evOut = picked; break; }
            } catch { }
          }
        }

        setEvents(evOut);
      } catch (e) {
        console.error("Load lists failed", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, normalizeEvents]);

  const list = React.useMemo(() => (tab === 0 ? friends : tab === 1 ? groups : events), [tab, friends, groups, events]);
  const filtered = React.useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return list;
    return list.filter((x) => (x.name || "").toLowerCase().includes(t));
  }, [q, list]);

  const placeholder = tab === 0 ? "Search friends…" : tab === 1 ? "Search groups…" : "Search events…";
  const secondary = tab === 0 ? "Direct message" : tab === 1 ? "Group chat" : "Event chat";

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Start a new chat</DialogTitle>
      <DialogContent dividers>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 1 }}>
          <Tab label="Friends" />
          <Tab label="Groups" />
          <Tab label="Events" />
        </Tabs>

        <TextField
          fullWidth
          size="small"
          placeholder={placeholder}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 1 }}
        />

        {loading ? (
          <Stack alignItems="center" sx={{ py: 3 }}>
            <CircularProgress size={24} />
          </Stack>
        ) : (
          <List dense>
            {filtered.map((x) => (
              <ListItem
                key={`tab${tab}-${x.id}`}
                disableGutters
                sx={{ px: 1, py: 1, borderRadius: 2, cursor: "pointer", "&:hover": { bgcolor: "#fafafa" } }}
                onClick={async () => {
                  try {
                    if (tab === 0) {
                      const res = await apiFetch(`${MESSAGING}/conversations/`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ recipient_id: x.id }),
                      });
                      const convo = await res.json();
                      if (!res.ok) throw new Error(convo?.detail || "Unable to create DM");
                      onClose({ type: "dm", conversation: convo });
                    } else if (tab === 1) {
                      const res = await apiFetch(`${MESSAGING}/conversations/ensure-group/`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ group: x.id, title: x.name }),
                      });
                      const convo = await res.json();
                      if (!res.ok) throw new Error(convo?.detail || "Unable to create group chat");
                      onClose({ type: "group", conversation: convo });
                    } else {
                      const res = await apiFetch(`${MESSAGING}/conversations/ensure-event/`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ event: x.id, title: x.name }),
                      });
                      const convo = await res.json();
                      if (!res.ok) throw new Error(convo?.detail || "Unable to create event chat");
                      onClose({ type: "event", conversation: convo });
                    }
                  } catch (e) {
                    console.error(e);
                    onClose();
                  }
                }}
              >
                <ListItemAvatar sx={{ minWidth: 44 }}>
                  <Avatar src={x.avatar}>{(x.name || "X").slice(0, 1)}</Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={<Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>{x.name}</Typography>}
                  secondary={secondary}
                />
              </ListItem>
            ))}
            {filtered.length === 0 && (
              <Stack alignItems="center" sx={{ py: 3 }}>
                <Typography variant="body2" color="text.secondary">No results</Typography>
              </Stack>
            )}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** ---------- PAGE ---------- */
export default function MessagesPage() {
  // LEFT: conversations list
  const [q, setQ] = React.useState("");
  const [threads, setThreads] = React.useState([]); // API: /conversations/
  const [activeId, setActiveId] = React.useState(null);
  const [newOpen, setNewOpen] = React.useState(false);

  // CENTER: chat
  const [messages, setMessages] = React.useState([]); // API: /conversations/:id/messages/

  const sections = React.useMemo(() => {
    const out = [];
    const by = new Map();

    const today = new Date();
    const yest = new Date(); yest.setDate(today.getDate() - 1);

    const sameDay = (a, b) =>
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();

    const dlabel = (iso) => {
      const d = new Date(iso);
      if (sameDay(d, today)) return "Today";
      if (sameDay(d, yest)) return "Yesterday";
      return new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "short", year: "numeric" }).format(d);
    };

    for (const m of messages) {
      const key = dlabel(m.created_at || Date.now());
      if (!by.has(key)) by.set(key, []);
      by.get(key).push(m);
    }

    for (const [label, arr] of by.entries()) {
      out.push({ label, items: arr });
    }

    // keep chronological order of sections according to first item's time
    out.sort((a, b) => new Date(a.items[0].created_at) - new Date(b.items[0].created_at));
    return out;
  }, [messages]);

  const [draft, setDraft] = React.useState("");

  // Right-rail: attachments summary derived from messages
  // put near other hooks
  const attachmentSummary = React.useMemo(() => {
    const out = {
      document: { key: 'document', icon: <DescriptionOutlinedIcon fontSize="small" />, label: 'Documents', count: 0 },
      photo: { key: 'photo', icon: <ImageOutlinedIcon fontSize="small" />, label: 'Photos', count: 0 },
      video: { key: 'video', icon: <VideoFileOutlinedIcon fontSize="small" />, label: 'Videos', count: 0 },
      other: { key: 'other', icon: <FolderOpenOutlinedIcon fontSize="small" />, label: 'Other', count: 0 },
    };
    const isExt = (u, list) => {
      const ext = (u || "").split(".").pop()?.toLowerCase();
      return !!ext && list.includes(ext);
    };
    for (const m of messages) {
      for (const a of (m.attachments || [])) {
        const url = a.url || "";
        const mime = (a.mimetype || a.type || "").toLowerCase();
        let bucket = 'other';
        if (mime.startsWith('image/') || isExt(url, ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif'])) bucket = 'photo';
        else if (mime.startsWith('video/') || isExt(url, ['mp4', 'mov', 'mkv', 'webm'])) bucket = 'video';
        else if (mime.startsWith('application/') || isExt(url, ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'])) bucket = 'document';
        out[bucket].count += 1;
      }
    }
    return Object.values(out);
  }, [messages]);


  // ME + right-rail members
  const [me, setMe] = React.useState(null);
  const [topMembers, setTopMembers] = React.useState([]);

  const active = React.useMemo(() => threads.find((t) => t.id === activeId) || null, [threads, activeId]);

  // fetch conversations
  const loadConversations = React.useCallback(async () => {
    try {
      const res = await apiFetch(`${MESSAGING}/conversations/`);
      if (res.status === 401) { console.warn("Not authenticated for conversations"); return; }
      const data = await res.json();
      if (Array.isArray(data)) {
        setThreads(data);
        if (!activeId && data.length) setActiveId(data[0].id);
      }
    } catch (e) {
      console.error("Failed to load conversations", e);
    }
  }, [activeId]);

  React.useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // load me
  React.useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch(`${API_ROOT}/users/me/`);
        if (res.ok) {
          const data = await res.json();
          setMe(data);
        }
      } catch (e) {
        console.error("Load me failed", e);
      }
    })();
  }, []);

  // fetch messages for active thread
  const loadMessages = React.useCallback(async () => {
    if (!activeId) return;
    try {
      const res = await apiFetch(`${MESSAGING}/conversations/${activeId}/messages/`);
      if (!res.ok) { console.error("Messages load failed", res.status); return; }
      const payload = await res.json();
      const rows = Array.isArray(payload?.results) ? payload.results
        : Array.isArray(payload) ? payload : [];
      const mapped = rows.map((m) => ({
        ...m,
        _time: m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
      }));
      setMessages(mapped);
      requestAnimationFrame(() => {
        const el = document.getElementById("chat-scroll");
        if (el) el.scrollTop = el.scrollHeight;
      });
    } catch (e) {
      console.error("Failed to load messages", e);
    }
  }, [activeId]);

  // initial + polling
  React.useEffect(() => {
    if (!activeId) return;
    loadMessages();                           // load now
    const iv = setInterval(loadMessages, 4000); // then poll
    return () => clearInterval(iv);
  }, [activeId, loadMessages]);

  // light polling to refresh conversation list (last message / unread)
  React.useEffect(() => {
    const iv = setInterval(loadConversations, 10000);
    return () => clearInterval(iv);
  }, [loadConversations]);

  const loadMembers = React.useCallback(async (cid) => {
    if (!cid) return;
    try {
      const res = await apiFetch(`${MESSAGING}/conversations/${cid}/members/`);
      if (!res.ok) { setTopMembers([]); return; }
      const arr = await res.json();
      // Normalize: [{id, name, avatar, role, is_you}]
      setTopMembers(Array.isArray(arr) ? arr : []);
    } catch (e) {
      console.error("members load failed", e);
      setTopMembers([]);
    }
  }, []);

  // whenever active conversation changes, load members
  React.useEffect(() => {
    if (!activeId) { setTopMembers([]); return; }
    loadMembers(activeId);
  }, [activeId, loadMembers]);

  // search filter
  const filtered = React.useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return threads;
    return threads.filter((th) => (th.display_title || "").toLowerCase().includes(t));
  }, [q, threads]);
  const pinned = [];
  const rest = filtered;

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || !activeId) return;

    const nowStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const localMsg = {
      id: "local-" + Date.now(),
      body: text,
      mine: true,
      sender_display: "You",
      _time: nowStr,
    };
    setMessages((cur) => [...cur, localMsg]);
    setDraft("");
    requestAnimationFrame(() => {
      const el = document.getElementById("chat-scroll");
      if (el) el.scrollTop = el.scrollHeight;
    });

    try {
      const res = await apiFetch(`${MESSAGING}/conversations/${activeId}/messages/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text, attachments: [] }),
      });
      const saved = await res.json();
      if (!res.ok) throw new Error(saved?.detail || "Send failed");

      setMessages((cur) =>
        cur.map((m) =>
          m.id === localMsg.id
            ? {
              ...saved,
              _time: saved.created_at
                ? new Date(saved.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : nowStr,
            }
            : m
        )
      );

      setThreads((cur) =>
        cur
          .map((t) =>
            t.id === activeId
              ? { ...t, last_message: saved.body, updated_at: saved.created_at || new Date().toISOString(), unread_count: 0 }
              : t
          )
          .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      );
    } catch (e) {
      console.error(e);
    }
  };

  // Hide global footer on this page
  React.useEffect(() => {
    const sels = ["footer", "#footer", "#site-footer", ".site-footer", ".app-footer", "#app-footer"];
    const els = sels.flatMap((s) => Array.from(document.querySelectorAll(s)));
    const prev = new Map();
    els.forEach((el) => {
      prev.set(el, el.style.display);
      el.style.display = "none";
    });
    return () => {
      els.forEach((el) => {
        el.style.display = prev.get(el) || "";
      });
    };
  }, []);

  const topTitle = (active?.group?.name)
    || active?.display_title
    || (active?.chat_type === "dm" ? "Direct Message" : "Conversation");

  const topCover = active?.context_cover || "";
  const topLogo = active?.context_logo || "";
  // const topMembers = [];  // (optional) hydrate from your own members API

  return (
    <>
      {/* New Chat Dialog */}
      <NewChatDialog
        open={newOpen}
        onOpened={() => { }}
        onClose={async (result) => {
          setNewOpen(false);
          if (!result?.conversation) return;
          // make sure the new/ensured conversation appears in the list and gets activated
          await loadConversations();
          const newId = result.conversation?.id;
          if (newId) setActiveId(newId);
        }}
      />

      <Grid container spacing={2}>
        {/* LEFT: Conversation list */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 1.5, border: `1px solid ${BORDER}`, borderRadius: 3, height: PANEL_H, display: "flex", flexDirection: "column" }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>Messages</Typography>
              <IconButton size="small"><AttachFileOutlinedIcon fontSize="small" /></IconButton>
            </Stack>

            <TextField
              size="small"
              placeholder="Search…"
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

            {!!pinned.length && (
              <>
                <Typography variant="caption" sx={{ mt: 1.5, mb: 0.5, display: "block", color: "text.secondary" }}>
                  Pinned Message
                </Typography>
                <List dense>
                  {pinned.map((t) => (
                    <ConversationRow key={t.id} thread={t} active={t.id === activeId} onClick={() => setActiveId(t.id)} />
                  ))}
                </List>
              </>
            )}

            <Typography variant="caption" sx={{ mt: 1, mb: 0.5, display: "block", color: "text.secondary" }}>
              All Message
            </Typography>
            <List dense sx={{ flex: 1, overflowY: "auto" }}>
              {rest.map((t) => (
                <ConversationRow key={t.id} thread={t} active={t.id === activeId} onClick={() => setActiveId(t.id)} />
              ))}
            </List>

            <Button fullWidth variant="outlined" sx={{ mt: 1 }} onClick={() => setNewOpen(true)}>
              New Chat
            </Button>
          </Paper>
        </Grid>

        {/* CENTER: Chat */}
        <Grid item xs={12} md={6}>
          <Box sx={{ height: PANEL_H, display: "flex", flexDirection: "column", minHeight: 0 }}>
            {/* Top bar */}
            <Paper sx={{ p: 1.5, border: `1px solid ${BORDER}`, borderRadius: 3, mb: 1 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Avatar src={topLogo} sx={{ width: 40, height: 40 }}>
                    {(topTitle || "C").slice(0, 1)}
                  </Avatar>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                    {topTitle}
                  </Typography>

                  {topCover && (
                    <Box sx={{ mt: 1, borderRadius: 2, overflow: "hidden", border: `1px solid ${BORDER}` }}>
                      <img
                        src={topCover}
                        alt="cover"
                        style={{ width: "100%", height: 120, objectFit: "cover", display: "block" }}
                      />
                    </Box>
                  )}
                </Stack>

                <Stack direction="row" alignItems="center" spacing={1.25}>
                  <AvatarGroup max={4} sx={{ "& .MuiAvatar-root": { width: 28, height: 28, fontSize: 12 } }}>
                    {topMembers.map((m, i) => (
                      <Avatar key={m.id || i} src={m.avatar}>
                        {(m.name || "U").slice(0, 1)}
                      </Avatar>
                    ))}
                  </AvatarGroup>
                  <IconButton size="small"><PhoneOutlinedIcon fontSize="small" /></IconButton>
                  <IconButton size="small"><VideocamOutlinedIcon fontSize="small" /></IconButton>
                  <IconButton size="small"><MoreVertOutlinedIcon fontSize="small" /></IconButton>
                </Stack>
              </Stack>
            </Paper>

            {/* Chat thread */}
            <Paper
              sx={{
                p: 2,
                border: `1px solid ${BORDER}`,
                borderRadius: 3,
                flex: 1,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Box id="chat-scroll" sx={{ flex: 1, overflowY: "auto" }}>
                {sections.map((sec) => (
                  <React.Fragment key={sec.label}>
                    <Stack alignItems="center" sx={{ my: 0.8 }}>
                      <Chip size="small" variant="outlined" label={sec.label} />
                    </Stack>
                    {sec.items.map((m) => (
                      <Bubble key={m.id} m={m} showSender={active?.chat_type !== "dm"} />
                    ))}
                  </React.Fragment>
                ))}
              </Box>

              <Divider sx={{ my: 1.25 }} />

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
          </Box>
        </Grid>

        {/* RIGHT: Members + Attachments */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 1.5, border: `1px solid ${BORDER}`, borderRadius: 3, height: PANEL_H, display: "flex", flexDirection: "column" }}>
            <Stack spacing={1.25}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                {topTitle}
              </Typography>

              <Accordion disableGutters defaultExpanded sx={{ border: "none", boxShadow: "none" }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Members
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0 }}>
                  <Button size="small" startIcon={<PersonAddAltOutlinedIcon />} sx={{ mb: 1, textTransform: "none" }}>
                    Add Member
                  </Button>
                  <Stack spacing={1}>
                    {topMembers.map((p) => (
                      <Stack key={p.id} direction="row" spacing={1} alignItems="center">
                        <Avatar src={p.avatar} sx={{ width: 28, height: 28 }} />
                        <Typography variant="body2">{p.name}</Typography>
                        <Box sx={{ ml: "auto" }}>
                          {p.is_you ? (
                            <Chip size="small" color="primary" label="You" />
                          ) : p.role ? (
                            <Chip size="small" variant="outlined" label={p.role} />
                          ) : null}
                        </Box>
                      </Stack>
                    ))}
                  </Stack>
                </AccordionDetails>
              </Accordion>

              <Accordion disableGutters defaultExpanded sx={{ border: "none", boxShadow: "none" }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Attachments
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0 }}>
                  <Stack spacing={1}>
                    {attachmentSummary.map((a) => (
                      <Stack key={a.key} direction="row" spacing={1} alignItems="center">
                        {a.icon}
                        <Typography variant="body2">{a.label}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>
                          {a.count} file{a.count === 1 ? "" : "s"}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </AccordionDetails>
              </Accordion>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </>
  );
}
