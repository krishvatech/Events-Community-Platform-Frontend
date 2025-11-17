// src/pages/AdminMessagesPage.jsx
import * as React from "react";
import {
  Avatar,
  Box,
  Button,
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
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import { listAdminUsers } from "../utils/api";

// ---- API helpers ----
const API_ROOT = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");
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

// sort by time
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
  return full || "Moderator";
}

export default function AdminMessagesPage() {
  const [loadingUsers, setLoadingUsers] = React.useState(true);
  const [users, setUsers] = React.useState([]);
  const [q, setQ] = React.useState("");
  const [selectedUserId, setSelectedUserId] = React.useState(null);

  const [conversationId, setConversationId] = React.useState(null);
  const [messages, setMessages] = React.useState([]);
  const [loadingMessages, setLoadingMessages] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [text, setText] = React.useState("");
  const [error, setError] = React.useState("");

  const me = React.useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }, []);

  // load staff / moderators
  const fetchUsers = React.useCallback(async () => {
    setLoadingUsers(true);
    try {
      const data = await listAdminUsers({ ordering: "-date_joined", page_size: 200 });
      let rows = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
      // only staff (moderators), skip superusers in list
      rows = rows.filter((u) => !!u.is_staff && !u.is_superuser);
      setUsers(rows);
    } catch (e) {
      console.error("Failed to load staff users", e);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  React.useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = React.useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return users;
    return users.filter((u) => {
      const full = displayName(u).toLowerCase();
      const email = (u.email || "").toLowerCase();
      return full.includes(term) || email.includes(term);
    });
  }, [q, users]);

  const activeUser = React.useMemo(
    () => users.find((u) => u.id === selectedUserId) || null,
    [selectedUserId, users]
  );

  // open / create conversation with moderator
  const openConversation = async (user) => {
    if (!user) return;
    setSelectedUserId(user.id);
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
    } catch (e) {
      console.error(e);
      setError(e?.message || "Unable to open conversation");
    } finally {
      setLoadingMessages(false);
    }
  };

  // poll messages
  React.useEffect(() => {
    if (!conversationId) return;
    let timer;
    let cancelled = false;

    const tick = async () => {
      try {
        const res = await fetch(
          `${MESSAGING_BASE}/conversations/${conversationId}/messages/`,
          { headers: { Accept: "application/json", ...authHeader() } }
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.detail || "Failed to load messages");
        if (cancelled) return;
        setMessages(normalizeMessages(data));
        setError("");
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
  }, [conversationId]);

  const handleSend = async () => {
    const body = text.trim();
    if (!body || sending || !conversationId) return;
    try {
      setSending(true);
      const res = await fetch(
        `${MESSAGING_BASE}/conversations/${conversationId}/messages/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader() },
          body: JSON.stringify({ body }),
        }
      );
      const msg = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(msg?.detail || "Failed to send message");
      setMessages((prev) => {
        if (msg?.id && prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg].sort(byTimeAsc);
      });
      setText("");
    } catch (e) {
      console.error(e);
      alert(e?.message || "Send failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* outer card */}
      <Paper
        elevation={0}
        className="rounded-2xl border border-slate-200"
        sx={{
          p: { xs: 2, sm: 3 },
          height: { xs: "auto", md: "78vh" },
        }}
      >
        {/* 40 / 60 layout with vertical divider */}
        <Box
          sx={{
            height: "100%",
            display: { xs: "block", md: "flex" },
          }}
        >
          {/* LEFT 40% – moderator list */}
          <Box
            sx={{
              width: { xs: "100%", md: "40%" },
              borderRight: { md: "1px solid #e2e8f0" }, // vertical divider
              pr: { md: 3 },
              mb: { xs: 2, md: 0 },
              display: "flex",
              flexDirection: "column",
              height: "100%",
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="h6" className="font-semibold tracking-tight">
                Moderator Messages
              </Typography>
              <IconButton size="small" onClick={fetchUsers}>
                <RefreshRoundedIcon fontSize="small" />
              </IconButton>
            </Stack>

            <TextField
              size="small"
              placeholder="Search moderators…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 1.5 }}
            />

            <Box sx={{ flex: 1, overflowY: "auto" }}>
              {loadingUsers ? (
                <Box py={4} textAlign="center">
                  <CircularProgress size={24} />
                </Box>
              ) : filteredUsers.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  No moderators found.
                </Typography>
              ) : (
                <List dense disablePadding>
                  {filteredUsers.map((u) => {
                    const active = selectedUserId === u.id;
                    return (
                      <ListItemButton
                        key={u.id}
                        selected={active}
                        onClick={() => openConversation(u)}
                        sx={{
                          borderRadius: 2,
                          mb: 0.5,
                          "&.Mui-selected": { bgcolor: "rgba(20,184,177,0.08)" },
                        }}
                      >
                        <ListItemAvatar>
                          <Avatar src={u.avatar_url || u.profile_image || ""}>
                            {displayName(u).slice(0, 1).toUpperCase()}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={displayName(u)}
                          secondary={u.email || "Staff"}
                          primaryTypographyProps={{ noWrap: true }}
                          secondaryTypographyProps={{ noWrap: true, variant: "caption" }}
                        />
                      </ListItemButton>
                    );
                  })}
                </List>
              )}
            </Box>
          </Box>

          {/* RIGHT 60% – chat box */}
          <Box
            sx={{
              width: { xs: "100%", md: "60%" },
              pl: { md: 3 },
              display: "flex",
              flexDirection: "column",
              height: "100%",
            }}
          >
            {activeUser ? (
              <>
                <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar src={activeUser.avatar_url || activeUser.profile_image || ""}>
                      {displayName(activeUser).slice(0, 1).toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {displayName(activeUser)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Moderator chat
                      </Typography>
                    </Box>
                  </Stack>
                </Stack>

                <Divider sx={{ mb: 1.5 }} />

                <Box
                  sx={{
                    flex: 1,
                    overflowY: "auto",
                    pr: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
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

                  {messages.map((m) => {
                    const meId = me?.id;
                    const mine =
                      m.is_mine === true ||
                      m.sender === meId ||
                      m.sender_id === meId ||
                      m.user_id === meId;
                    const body = m.body || m.text || m.message || "";
                    const ts = m.created_at ? new Date(m.created_at).toLocaleString() : "";
                    return (
                      <Box
                        key={m.id ?? `${m.created_at}-${Math.random()}`}
                        sx={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}
                      >
                        <Box
                          sx={{
                            px: 1.25,
                            py: 0.75,
                            maxWidth: "75%",
                            borderRadius: 2,
                            bgcolor: mine ? "primary.main" : "grey.100",
                            color: mine ? "primary.contrastText" : "text.primary",
                            boxShadow: mine ? 1 : 0,
                          }}
                        >
                          <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                            {body}
                          </Typography>
                          {ts && (
                            <Typography
                              variant="caption"
                              sx={{
                                display: "block",
                                mt: 0.25,
                                opacity: 0.7,
                                textAlign: "right",
                              }}
                            >
                              {ts}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    );
                  })}

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
                  Select a moderator on the left to start a conversation.
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}
