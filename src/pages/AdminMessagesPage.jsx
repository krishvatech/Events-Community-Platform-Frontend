// src/pages/AdminMessagesPage.jsx
import * as React from "react";
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  IconButton,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  Tabs,
  Tab,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import ArrowBackIosNewRoundedIcon from "@mui/icons-material/ArrowBackIosNewRounded";
import MoreVertOutlinedIcon from "@mui/icons-material/MoreVertOutlined";

// ---- API helpers ----
const API_ROOT = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(
  /\/$/,
  ""
);
const getToken = () =>
  localStorage.getItem("access_token") ||
  localStorage.getItem("jwt") ||
  localStorage.getItem("token") ||
  "";
const authHeader = () => {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
};

const MESSAGING_BASE = `${API_ROOT}/messaging`;

// central endpoints (aligned with MessagesPage)
const ENDPOINTS = {
  conversations: () => `${MESSAGING_BASE}/conversations/`,
  conversationMessages: (cid) => `${MESSAGING_BASE}/conversations/${cid}/messages/`,
  ensureGroup: () => `${MESSAGING_BASE}/conversations/ensure-group/`,
  convMarkAllRead: (cid) => `${MESSAGING_BASE}/conversations/${cid}/mark-all-read/`,
  messageRead: (mid) => `${MESSAGING_BASE}/messages/${mid}/read/`,
};

const emitUnreadMessages = (count) => {
  try {
    window.dispatchEvent(
      new CustomEvent("messages:unread", { detail: { count } })
    );
    localStorage.setItem("unread_messages", String(count));
  } catch {
    // ignore
  }
};

const getLastMessageObj = (t) => {
  const lm = t?.last_message ?? t?.latest_message ?? t?.last ?? null;
  if (!lm) return null;
  return typeof lm === "string" ? { body: lm } : lm;
};

const getLastTimeISO = (t) => {
  const lm = getLastMessageObj(t);
  return (
    t?._last_ts ||
    t?.local_last_ts ||
    t?.last_message_created_at ||
    t?.last_message_at ||
    t?.last_message_time ||
    t?.last_message_timestamp ||
    lm?.created_at ||
    lm?.timestamp ||
    lm?.sent_at ||
    t?.updated_at ||
    t?.created_at ||
    null
  );
};

const formatHHMM = (iso) =>
  iso
    ? new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
    : "";

const getLastPreviewText = (t) => {
  const lm = getLastMessageObj(t);
  return (
    t?.last_message_text ||
    t?.last_text ||
    (lm?.body || lm?.text || lm?.message || "") ||
    ""
  );
};

const threadTitle = (t) =>
  t?.group?.name ||
  t?.display_title ||
  (t?.chat_type === "dm" ? "Direct message" : "Conversation");

const threadAvatar = (t) =>
  t?.context_logo || t?.context_cover || t?.group_cover || t?.event_cover || "";

// sort by time inside a messages array
const byTimeAsc = (a, b) => {
  const ta = Date.parse(a?.created_at || a?.createdAt || a?.timestamp || 0);
  const tb = Date.parse(b?.created_at || b?.createdAt || b?.timestamp || 0);
  if (!Number.isNaN(ta) && !Number.isNaN(tb)) return ta - tb;
  return (a?.id ?? 0) - (b?.id ?? 0);
};

const normalizeMessages = (data) => {
  if (Array.isArray(data)) return [...data].sort(byTimeAsc);
  const rows = Array.isArray(data?.results) ? data.results : [];
  return [...rows].sort(byTimeAsc);
};

function displayName(user) {
  if (!user) return "";
  const full =
    [user.first_name, user.last_name].filter(Boolean).join(" ") ||
    user.display_name ||
    user.username ||
    user.email;
  return full || "Staff";
}

/**
 * New-chat dialog for admin:
 * - Tab 0: Staff (from props.staff)
 * - Tab 1: Groups (joined-groups API)
 */
function AdminNewChatDialog({
  open,
  staff,
  onClose,
  onStartStaffChat,
  onStartGroupChat,
}) {
  const [tab, setTab] = React.useState(0);
  const [query, setQuery] = React.useState("");
  const [groups, setGroups] = React.useState([]);
  const [loadingGroups, setLoadingGroups] = React.useState(false);

  // Load "groups you joined" when dialog opens on Groups tab
  React.useEffect(() => {
    if (!open || tab !== 1) return;
    let cancelled = false;

    (async () => {
      setLoadingGroups(true);
      try {
        const res = await fetch(`${API_ROOT}/groups/joined-groups/`, {
          headers: { Accept: "application/json", ...authHeader() },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.detail || "Failed to load groups");
        }

        const raw = Array.isArray(data?.results)
          ? data.results
          : Array.isArray(data)
            ? data
            : [];
        const mapped = raw
          .map((g) => ({
            id: g.id,
            name: g.name || g.title || "Group",
            avatar:
              g.logo_url ||
              g.logo ||
              g.avatar ||
              g.image ||
              g.cover_image ||
              "",
          }))
          .filter((g) => g.id);
        if (!cancelled) setGroups(mapped);
      } catch (e) {
        console.error(e);
        if (!cancelled) setGroups([]);
      } finally {
        if (!cancelled) setLoadingGroups(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, tab]);

  const list = tab === 0 ? staff : groups;
  const filtered = React.useMemo(() => {
    const t = query.trim().toLowerCase();
    if (!t) return list;
    return list.filter((item) => {
      const name = item.name || displayName(item);
      return name.toLowerCase().includes(t);
    });
  }, [query, list]);

  const placeholder = tab === 0 ? "Search staff…" : "Search groups…";
  const secondary = tab === 0 ? "Staff chat" : "Group chat";

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Start a new chat</DialogTitle>
      <DialogContent dividers>
        <Tabs
          value={tab}
          onChange={(_, val) => setTab(val)}
          sx={{ mb: 1 }}
          variant="fullWidth"
        >
          <Tab label="Staff" />
          <Tab label="Groups" />
        </Tabs>

        <TextField
          fullWidth
          size="small"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 1 }}
        />

        {tab === 1 && loadingGroups ? (
          <Stack alignItems="center" sx={{ py: 3 }}>
            <CircularProgress size={24} />
          </Stack>
        ) : (
          <List dense>
            {filtered.map((item) => {
              const name = item.name || displayName(item);
              const avatarSrc =
                item.avatar || item.avatar_url || item.profile_image || "";
              return (
                <ListItemButton
                  key={`${tab}-${item.id}`}
                  onClick={() => {
                    if (tab === 0) {
                      onStartStaffChat?.(item);
                    } else {
                      onStartGroupChat?.(item);
                    }
                    onClose?.();
                  }}
                  sx={{
                    px: 1,
                    py: 1,
                    borderRadius: 2,
                    "&:hover": { bgcolor: "#fafafa" },
                  }}
                >
                  <ListItemAvatar sx={{ minWidth: 44 }}>
                    <Avatar src={avatarSrc}>
                      {name.slice(0, 1).toUpperCase()}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 600 }}
                        noWrap
                      >
                        {name}
                      </Typography>
                    }
                    secondary={
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        noWrap
                      >
                        {secondary}
                      </Typography>
                    }
                  />
                </ListItemButton>
              );
            })}
            {filtered.length === 0 && (
              <Stack alignItems="center" sx={{ py: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  No results
                </Typography>
              </Stack>
            )}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function AdminMessagesPage() {
  const [loadingUsers, setLoadingUsers] = React.useState(true);
  const [users, setUsers] = React.useState([]); // staff list for New Chat
  const [q, setQ] = React.useState("");

  // LEFT: conversations list (DMs + groups)
  const [threads, setThreads] = React.useState([]);
  const [loadingThreads, setLoadingThreads] = React.useState(true);

  const [conversationId, setConversationId] = React.useState(null);
  const [selectedUserId, setSelectedUserId] = React.useState(null);

  const [messages, setMessages] = React.useState([]);
  const [loadingMessages, setLoadingMessages] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [text, setText] = React.useState("");
  const [error, setError] = React.useState("");
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [newChatOpen, setNewChatOpen] = React.useState(false);

  // { type: "staff" | "group", id, name, avatar? }
  const [activeTarget, setActiveTarget] = React.useState(null);

  const chatScrollRef = React.useRef(null);

  const me = React.useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }, []);

  // load staff (for New Chat)
  const fetchUsers = React.useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch(`${MESSAGING_BASE}/conversations/staff-list/`, {
        headers: { Accept: "application/json", ...authHeader() },
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json().catch(() => []);
      let rows = Array.isArray(data) ? data : [];

      // include both staff + owners
      rows = rows.filter((u) => u.is_staff || u.is_superuser);

      // don't show yourself
      const meLocal = JSON.parse(localStorage.getItem("user") || "{}");
      if (meLocal?.id) {
        rows = rows.filter((u) => u.id !== meLocal.id);
      }

      setUsers(rows);
    } catch (e) {
      console.error("Failed to load staff users", e);
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  // load conversations list (all types) – supports background polling
  const loadConversations = React.useCallback(
    async (opts = {}) => {
      const { background = false } = opts;

      if (!background) {
        setLoadingThreads(true);
      }

      try {
        const res = await fetch(ENDPOINTS.conversations(), {
          headers: { Accept: "application/json", ...authHeader() },
        });

        const raw = await res.json().catch(() => ({}));
        const data = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.results)
            ? raw.results
            : [];

        setThreads((prev) => {
          // keep previous timestamps so list doesn’t “jump backwards”
          const byId = new Map(prev.map((p) => [String(p.id), p]));

          const normalized = data
            .map((t) => {
              const serverTs = getLastTimeISO(t);
              const prevTs = byId.get(String(t.id))?._last_ts;

              const best =
                new Date(serverTs || 0).getTime() >=
                  new Date(prevTs || 0).getTime()
                  ? serverTs
                  : prevTs;

              return {
                ...t,
                _last_ts: best || serverTs || t.updated_at || t.created_at,
              };
            })
            .sort(
              (a, b) =>
                new Date(b._last_ts || 0).getTime() -
                new Date(a._last_ts || 0).getTime()
            );

          // broadcast unread count (based on sorted list)
          const totalUnread = normalized.reduce(
            (sum, th) => sum + (th?.unread_count || 0),
            0
          );
          emitUnreadMessages(totalUnread);

          return normalized;
        });
      } catch (e) {
        console.error("Failed to load conversations", e);
        setThreads([]);
        emitUnreadMessages(0);
      } finally {
        if (!background) {
          setLoadingThreads(false);
        }
      }
    },
    []
  );


  React.useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // initial + background polling for conversations
  React.useEffect(() => {
    // first load – show spinner
    loadConversations();

    // next loads – silent background refresh (no loading spinner)
    const iv = setInterval(() => {
      loadConversations({ background: true });
    }, 1000);

    return () => clearInterval(iv);
  }, [loadConversations]);


  // only show threads that actually have messages (after "hi")
  const visibleThreads = React.useMemo(
    () =>
      threads.filter((t) => {
        const txt = (getLastPreviewText(t) || "").trim();
        return txt.length > 0;
      }),
    [threads]
  );

  const filteredThreads = React.useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return visibleThreads;
    return visibleThreads.filter((t) =>
      (threadTitle(t) || "").toLowerCase().includes(term)
    );
  }, [q, visibleThreads]);

  const activeThread = React.useMemo(
    () => threads.find((t) => t.id === conversationId) || null,
    [threads, conversationId]
  );

  const activeUser = React.useMemo(
    () => users.find((u) => u.id === selectedUserId) || null,
    [selectedUserId, users]
  );

  const isGroupChat =
    activeTarget?.type === "group" ||
    activeThread?.chat_type === "group" ||
    Boolean(activeThread?.group || activeThread?.context_group);

  const hasActiveChat = Boolean(conversationId);

  const headerName =
    activeTarget?.name ||
    (activeUser ? displayName(activeUser) : "") ||
    (activeThread ? threadTitle(activeThread) : "");

  const headerSubtitle = isGroupChat ? "Group chat" : "Staff chat";

  const headerAvatarSrc = isGroupChat
    ? activeTarget?.avatar ||
    (activeThread ? threadAvatar(activeThread) : "")
    : activeTarget?.avatar ||
    activeUser?.avatar_url ||
    activeUser?.profile_image ||
    activeUser?.avatar ||
    activeUser?.image ||
    activeUser?.image_url ||
    (activeThread ? threadAvatar(activeThread) : "");


  const showOnlineDot = Boolean(!isGroupChat && conversationId);

  // mark-all-read for a conversation
  const markConversationAllRead = React.useCallback(async (cid) => {
    if (!cid) return;
    try {
      const res = await fetch(ENDPOINTS.convMarkAllRead(cid), {
        method: "POST",
        headers: { Accept: "application/json", ...authHeader() },
      });
      if (!res.ok) return;
      setThreads((cur) => {
        const next = cur.map((t) =>
          t.id === cid ? { ...t, unread_count: 0 } : t
        );
        const totalUnread = next.reduce(
          (sum, th) => sum + (th?.unread_count || 0),
          0
        );
        emitUnreadMessages(totalUnread);
        return next;
      });
    } catch (e) {
      console.error("Failed to mark conversation read", e);
    }
  }, []);

  // open / create conversation with staff
  const openConversation = async (user) => {
    if (!user) return;
    setSelectedUserId(user.id);
    setActiveTarget({
      type: "staff",
      id: user.id,
      name: displayName(user),
      avatar: user.avatar_url || user.profile_image || "",
    });
    setConversationId(null);
    setMessages([]);
    setError("");

    try {
      setLoadingMessages(true);
      const res = await fetch(`${MESSAGING_BASE}/conversations/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ recipient_id: user.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.detail || "Failed to open conversation");
      }
      const id = data?.id || data?.conversation?.id || data?.pk;
      if (!id) {
        throw new Error("No conversation id returned from server");
      }
      setConversationId(id);
      // refresh list in case this DM already has history
      loadConversations();
    } catch (e) {
      console.error(e);
      setError(e?.message || "Unable to open conversation");
    } finally {
      setLoadingMessages(false);
    }
  };

  // open / create conversation with a group (joined group)
  const openGroupConversation = async (group) => {
    if (!group) return;
    setSelectedUserId(null);
    setActiveTarget({
      type: "group",
      id: group.id,
      name: group.name,
      avatar: group.avatar || "",
    });
    setConversationId(null);
    setMessages([]);
    setError("");

    try {
      setLoadingMessages(true);
      const res = await fetch(ENDPOINTS.ensureGroup(), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ group: group.id, title: group.name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.detail || "Failed to open group chat");
      }
      const id = data?.id || data?.conversation?.id || data?.pk;
      if (!id) {
        throw new Error("No conversation id returned from server");
      }
      setConversationId(id);
      loadConversations();
    } catch (e) {
      console.error(e);
      setError(e?.message || "Unable to open group chat");
    } finally {
      setLoadingMessages(false);
    }
  };

  // select an existing conversation from the left list
  const selectThread = React.useCallback(
    (thread) => {
      if (!thread) return;
      setConversationId(thread.id);
      setMessages([]);
      setError("");

      const isGroup =
        thread.chat_type === "group" ||
        Boolean(thread.group || thread.context_group);

      if (isGroup) {
        const g = thread.group || thread.context_group || {};
        setActiveTarget({
          type: "group",
          id:
            g.id ||
            thread.group_id ||
            thread.context_group_id ||
            thread.context_id ||
            null,
          name: g.name || g.title || threadTitle(thread) || "Group chat",
          avatar: threadAvatar(thread),
        });
        setSelectedUserId(null);
      } else {
        const title = threadTitle(thread);
        const match =
          users.find(
            (u) => displayName(u).toLowerCase() === title.toLowerCase()
          ) || null;

        if (match) {
          setSelectedUserId(match.id);
          setActiveTarget({
            type: "staff",
            id: match.id,
            name: displayName(match),
            avatar: match.avatar_url || match.profile_image || "",
          });
        } else {
          setSelectedUserId(null);
          setActiveTarget({
            type: "staff",
            id: null,
            name: title,
            avatar: threadAvatar(thread),
          });
        }
      }
    },
    [users]
  );

  // poll messages for active conversation
  React.useEffect(() => {
    if (!conversationId) return;
    let timer;
    let cancelled = false;

    const tick = async () => {
      try {
        const res = await fetch(
          ENDPOINTS.conversationMessages(conversationId),
          {
            headers: { Accept: "application/json", ...authHeader() },
          }
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.detail || "Failed to load messages");
        if (cancelled) return;
        setMessages(normalizeMessages(data));
        setError("");
        await markConversationAllRead(conversationId);
      } catch (e) {
        if (cancelled) return;
        console.error(e);
        setError(e?.message || "Unable to load messages");
      } finally {
        if (!cancelled) setLoadingMessages(false);
      }
    };

    setLoadingMessages(true);
    tick();
    timer = setInterval(tick, 2500);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [conversationId, markConversationAllRead]);

  // 🔁 auto-scroll chat to latest message whenever messages change
  React.useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, loadingMessages, conversationId]);

  const handleSend = async () => {
    const body = text.trim();
    if (!body || sending || !conversationId) return;

    const nowIso = new Date().toISOString();

    try {
      setSending(true);

      const res = await fetch(
        ENDPOINTS.conversationMessages(conversationId),
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader() },
          body: JSON.stringify({ body }),
        }
      );
      const msg = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(msg?.detail || "Failed to send message");

      // update messages list
      setMessages((prev) => {
        if (msg?.id && prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg].sort(byTimeAsc);
      });

      setText("");

      // 🔝 immediately bump this conversation to the top on the left
      setThreads((prev) =>
        prev
          .map((t) =>
            t.id === conversationId
              ? {
                ...t,
                last_message: msg.body || msg.text || msg.message || body,
                last_message_created_at:
                  msg.created_at || msg.timestamp || nowIso,
                _last_ts: msg.created_at || msg.timestamp || nowIso,
              }
              : t
          )
          .sort(
            (a, b) =>
              new Date(b._last_ts || 0).getTime() -
              new Date(a._last_ts || 0).getTime()
          )
      );

      // soft sync with server in background
      loadConversations({ background: true });
    } catch (e) {
      console.error(e);
      alert(e?.message || "Send failed");
    } finally {
      setSending(false);
    }
  };


  return (
    <Container
      maxWidth="xl"
      sx={{
        // reduced top + left padding vs previous version
        pt: 2,
        pb: 3,
        pl: { xs: 1.5, md: 3 },
        pr: { xs: 1.5, md: 3 },
      }}
    >
      {/* New chat dialog (staff + joined groups) */}
      <AdminNewChatDialog
        open={newChatOpen}
        staff={users}
        onClose={() => setNewChatOpen(false)}
        onStartStaffChat={(u) => openConversation(u)}
        onStartGroupChat={(g) => openGroupConversation(g)}
      />

      {/* Page header – similar to Community Groups */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        alignItems={{ xs: "flex-start", sm: "center" }}
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar sx={{ bgcolor: "primary.main" }}>
            {(me?.first_name || me?.last_name || "A")
              .slice(0, 1)
              .toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Messages
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Chat with your staff and moderators.
            </Typography>
          </Box>
        </Stack>
      </Stack>

      {/* outer card */}
      <Paper
        className="rounded-2xl border border-slate-200"
        sx={{
          p: { xs: 2, sm: 3 },
          height: { xs: "auto", md: "78vh" },
          background:
            "radial-gradient(circle at top left, rgba(45,212,191,0.08), transparent 55%), radial-gradient(circle at bottom right, rgba(59,130,246,0.06), transparent 55%)",
        }}
      >
        {/* 40 / 60 layout with vertical divider */}
        <Box
          sx={{
            height: "100%",
            display: { xs: "block", md: "flex" },
          }}
        >
          {/* LEFT 40% – conversations list */}
          <Box
            sx={{
              width: { xs: "100%", md: "40%" },
              borderRight: { md: "1px solid #e2e8f0" }, // vertical divider
              pr: { md: 3 },
              mb: { xs: 2, md: 0 },
              display: { xs: hasActiveChat ? "none" : "flex", md: "flex" },
              flexDirection: "column",
              height: "100%",
            }}
          >
            {/* Search + title inside member panel */}
            <Box sx={{ mb: 1.5 }}>
              <TextField
                size="small"
                placeholder="Search..."
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
              <Typography
                variant="caption"
                sx={{
                  mt: 1,
                  mb: 0.5,
                  display: "block",
                  color: "text.secondary",
                }}
              >
                All Message
              </Typography>
            </Box>

            {/* Scrollable conversation list */}
            <Box sx={{ flex: 1, overflowY: "auto", mb: 1 }}>
              {loadingThreads ? (
                <Box py={4} textAlign="center">
                  <CircularProgress size={24} />
                </Box>
              ) : filteredThreads.length === 0 ? (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 2 }}
                >
                  No conversations yet. Use <strong>New chat</strong> to start
                  one.
                </Typography>
              ) : (
                <List dense disablePadding>
                  {filteredThreads.map((th) => {
                    const active = conversationId === th.id;
                    const title = threadTitle(th);

                    // 👇 pick avatar like chat header
                    let avatarSrc = threadAvatar(th); // default: context / group cover
                    if (!th.group && th.chat_type !== "group") {
                      // DM: try to find this staff in users list and use their profile image
                      const match =
                        users.find(
                          (u) => displayName(u).toLowerCase() === title.toLowerCase()
                        ) || null;
                      if (match) {
                        avatarSrc = match.avatar_url || match.profile_image || avatarSrc;
                      }
                    }

                    const time = formatHHMM(getLastTimeISO(th));
                    const preview = getLastPreviewText(th) || "Say hi 👋";
                    const unread = th.unread_count || 0;

                    return (
                      <ListItemButton
                        key={th.id}
                        selected={active}
                        onClick={() => selectThread(th)}
                        sx={{
                          px: 1,
                          py: 1,
                          mb: 0.75,
                          borderRadius: 2,
                          alignItems: "flex-start",
                          ...(active
                            ? {
                              bgcolor: "#f6fffe",
                              border: "1px solid #e2e8f0",
                            }
                            : {
                              "&:hover": {
                                bgcolor: "#fafafa",
                              },
                            }),
                        }}
                      >
                        <ListItemAvatar sx={{ minWidth: 48 }}>
                          <Box
                            sx={{
                              position: "relative",
                              display: "inline-flex",
                            }}
                          >
                            <Avatar src={avatarSrc}>
                              {(title || "C").slice(0, 1).toUpperCase()}
                            </Avatar>
                            {/* green dot – top-right corner for DMs */}
                            {!th.group && th.chat_type !== "group" && (
                              <Box
                                sx={{
                                  position: "absolute",
                                  right: -2,
                                  top: -2,
                                  width: 10,
                                  height: 10,
                                  borderRadius: "50%",
                                  bgcolor: "success.main",
                                  border: "2px solid #fff",
                                }}
                              />
                            )}
                          </Box>
                        </ListItemAvatar>

                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            justifyContent="space-between"
                          >
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 600 }}
                              noWrap
                            >
                              {title}
                            </Typography>
                            {time && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {time}
                              </Typography>
                            )}
                          </Stack>
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={1}
                            sx={{ width: "100%" }}        // full row width
                          >
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              noWrap
                              sx={{ flexGrow: 1, mr: 1 }}  // takes all space on left
                            >
                              {preview}
                            </Typography>

                            {unread > 0 && (
                              <Chip
                                label={String(unread)}
                                size="small"
                                color="primary"
                                sx={{ height: 18, minHeight: 18 }}  // badge at far right
                              />
                            )}
                          </Stack>
                        </Box>
                      </ListItemButton>
                    );
                  })}
                </List>
              )}
            </Box>

            {/* New chat (staff + groups they joined) */}
            <Button
              fullWidth
              variant="outlined"
              size="small"
              onClick={() => setNewChatOpen(true)}
              sx={{
                mt: 0.5,
                textTransform: "none",
                borderRadius: 999,
              }}
            >
              New chat
            </Button>
          </Box>

          {/* RIGHT 60% – chat box */}
          <Box
            sx={{
              width: { xs: "100%", md: "60%" },
              pl: { md: 3 },
              // Mobile: show chat ONLY when a conversation is active
              display: { xs: hasActiveChat ? "flex" : "none", md: "flex" },
              flexDirection: "column",
              height: "100%",
            }}
          >
            {hasActiveChat ? (
              <>
                {/* Small details popup dialog (staff OR group) */}
                <Dialog
                  open={detailsOpen}
                  onClose={() => setDetailsOpen(false)}
                  maxWidth="xs"
                  fullWidth
                >
                  <DialogTitle>
                    {isGroupChat ? "Group details" : "Staff details"}
                  </DialogTitle>
                  <DialogContent dividers>
                    {isGroupChat ? (
                      <Stack spacing={1.5}>
                        <Stack
                          direction="row"
                          spacing={1.5}
                          alignItems="center"
                        >
                          <Avatar src={headerAvatarSrc}>
                            {headerName.slice(0, 1).toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography
                              variant="subtitle1"
                              sx={{ fontWeight: 600 }}
                            >
                              {headerName}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Group chat
                            </Typography>
                          </Box>
                        </Stack>
                      </Stack>
                    ) : (
                      <Stack spacing={1.5}>
                        <Stack
                          direction="row"
                          spacing={1.5}
                          alignItems="center"
                        >
                          <Avatar src={headerAvatarSrc}>
                            {headerName.slice(0, 1).toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography
                              variant="subtitle1"
                              sx={{ fontWeight: 600 }}
                            >
                              {headerName}
                            </Typography>
                            {activeUser && (
                              <Chip
                                size="small"
                                color="primary"
                                variant={
                                  activeUser.is_superuser ? "filled" : "outlined"
                                }
                                label={
                                  activeUser.is_superuser
                                    ? "Owner"
                                    : activeUser.is_staff
                                      ? "Staff"
                                      : "Member"
                                }
                                sx={{ mt: 0.5 }}
                              />
                            )}
                          </Box>
                        </Stack>

                        {activeUser?.email && (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                          >
                            Email: {activeUser.email}
                          </Typography>
                        )}
                      </Stack>
                    )}
                  </DialogContent>
                </Dialog>

                {/* Chat header */}
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  mb={1.5}
                >
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    {/* Back button – visible only on mobile */}
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSelectedUserId(null);
                        setActiveTarget(null);
                        setConversationId(null);
                        setMessages([]);
                        setError("");
                      }}
                      sx={{
                        mr: 0.5,
                        display: { xs: "inline-flex", md: "none" },
                      }}
                    >
                      <ArrowBackIosNewRoundedIcon fontSize="small" />
                    </IconButton>

                    <Box
                      sx={{ position: "relative", display: "inline-flex" }}
                    >
                      <Avatar src={headerAvatarSrc}>
                        {headerName.slice(0, 1).toUpperCase()}
                      </Avatar>
                      {showOnlineDot && (
                        <Box
                          sx={{
                            position: "absolute",
                            right: -2,
                            top: -2,
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            bgcolor: "success.main",
                            border: "2px solid #fff",
                          }}
                        />
                      )}
                    </Box>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {headerName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {headerSubtitle}
                      </Typography>
                    </Box>
                  </Stack>

                  {/* Details icon at right side of header */}
                  <IconButton size="small" onClick={() => setDetailsOpen(true)}>
                    <MoreVertOutlinedIcon fontSize="small" />
                  </IconButton>
                </Stack>

                <Divider sx={{ mb: 1.5 }} />

                <Box
                  ref={chatScrollRef}
                  sx={{
                    flex: 1,
                    overflowY: "auto",
                    pr: { xs: 0, md: 1 },
                    py: 1.5,
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                    borderRadius: 3,
                  }}
                >
                  {loadingMessages && messages.length === 0 && (
                    <Box py={4} textAlign="center">
                      <CircularProgress size={24} />
                    </Box>
                  )}

                  {!loadingMessages && error && messages.length === 0 && (
                    <Typography color="error" variant="body2">
                      {error}
                    </Typography>
                  )}

                  {messages.length > 0 &&
                    (() => {
                      const elems = [];
                      let lastDateKey = null;
                      const meId = me?.id;

                      messages.forEach((m, idx) => {
                        const created = m.created_at
                          ? new Date(m.created_at)
                          : null;

                        // ---- date chip (Nov 14, 2025) ----
                        const dateKey = created
                          ? created.toDateString()
                          : "unknown";
                        if (dateKey !== lastDateKey) {
                          lastDateKey = dateKey;

                          let dateLabel = "";
                          if (created) {
                            const today = new Date();
                            const todayKey = today.toDateString();

                            const yesterday = new Date();
                            yesterday.setDate(today.getDate() - 1);
                            const yesterdayKey = yesterday.toDateString();

                            if (dateKey === todayKey) {
                              dateLabel = "Today";
                            } else if (dateKey === yesterdayKey) {
                              dateLabel = "Yesterday";
                            } else {
                              dateLabel = created.toLocaleDateString([], {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              });
                            }
                          }

                          elems.push(
                            <Box
                              key={`date-${dateKey}-${idx}`}
                              sx={{ textAlign: "center", my: 1.5 }}
                            >
                              <Chip
                                label={dateLabel}
                                size="small"
                                variant="outlined"
                                sx={{
                                  borderRadius: 999,
                                  px: 1.5,
                                  bgcolor: "#fff",
                                  borderColor: "rgba(148,163,184,0.5)",
                                  fontSize: 12,
                                }}
                              />
                            </Box>
                          );
                        }

                        // ---- message bubble with avatar + time ----
                        const mine =
                          m.is_mine === true ||
                          m.sender === meId ||
                          m.sender_id === meId ||
                          m.user_id === meId;

                        const body = m.body || m.text || m.message || "";
                        const timeStr = created
                          ? created.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                          : "";

                        const senderName = mine
                          ? "You"
                          : m.sender_name ||
                          m.user_name ||
                          m.author_name ||
                          headerName;

                        // Avatar for *me*
                        const meAvatar =
                          me?.profile_image ||
                          me?.avatar_url ||
                          me?.avatar ||
                          me?.image ||
                          me?.image_url ||
                          "";

                        // Avatar coming from the *message sender* (works for group + 1-1)
                        const msgAvatar =
                          m.sender_avatar ||           // from normalizeMessages / API
                          m.user_avatar ||
                          (m.raw && (m.raw.sender_avatar || m.raw.user_avatar)) ||
                          headerAvatarSrc ||           // fallback to header avatar
                          "";

                        // Final avatar to use for this bubble
                        const senderAvatar = mine
                          ? (meAvatar || msgAvatar)
                          : msgAvatar;



                        elems.push(
                          <Box
                            key={m.id ?? `msg-${idx}`}
                            sx={{
                              display: "flex",
                              justifyContent: mine ? "flex-end" : "flex-start",
                              alignItems: "flex-end",   // ✅ bottom of avatar & bubble align
                              px: 1,
                              mb: 1,
                              gap: 0.75,                 // consistent space between avatar & bubble
                            }}
                          >
                            {/* avatar on left for other person, on right for you */}
                            {!mine && (
                              <Avatar
                                src={senderAvatar}
                                sx={{ width: 32, height: 32, mr: 1 }}
                              >
                                {senderName?.slice(0, 1)?.toUpperCase()}
                              </Avatar>
                            )}

                            <Box
                              sx={{
                                maxWidth: "75%",
                                px: 1.5,
                                py: 1,
                                borderRadius: 1,
                                bgcolor: "#ffffff",
                                border: "1px solid #e2e8f0",
                                boxShadow: "0 6px 16px rgba(15,23,42,0.06)",
                              }}
                            >
                              <Typography
                                variant="body2"
                                sx={{ whiteSpace: "pre-wrap" }}
                              >
                                {body}
                              </Typography>

                              {timeStr && (
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{
                                    display: "block",
                                    mt: 0.5,
                                    textAlign: "right",
                                    fontSize: "0.65rem",   // ⬅ smaller time font
                                  }}
                                >
                                  {timeStr}
                                </Typography>
                              )}
                            </Box>

                            {mine && (
                              <Avatar
                                src={senderAvatar}
                                sx={{ width: 32, height: 32, ml: 1 }}
                              >
                                {senderName?.slice(0, 1)?.toUpperCase()}
                              </Avatar>
                            )}
                          </Box>
                        );
                      });

                      return elems;
                    })()}

                  {!loadingMessages && !error && messages.length === 0 && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 2, textAlign: "center" }}
                    >
                      No messages yet. Say hi 👋
                    </Typography>
                  )}
                </Box>

                <Divider sx={{ mt: 1.5, mb: 1 }} />

                <Box sx={{ display: "flex", gap: 1 }}>
                  <TextField
                    placeholder="Type a message…"
                    fullWidth
                    size="small"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                  />
                  <Button
                    variant="contained"
                    startIcon={<SendRoundedIcon />}
                    disabled={!text.trim() || sending || !conversationId}
                    onClick={handleSend}
                    sx={{ textTransform: "none", borderRadius: 2 }}
                  >
                    Send
                  </Button>
                </Box>
              </>
            ) : (
              <Box
                sx={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Select a conversation on the left or use{" "}
                  <strong>New chat</strong> to start one.
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}
