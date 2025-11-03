// src/pages/community/GroupDetailPage.jsx
import * as React from "react";
import {
  Avatar, Box, Button, Chip, Divider, IconButton, InputAdornment, List, ListItem,
  ListItemAvatar, ListItemText, Paper, Stack, Tab, Tabs, TextField, Typography,
  Grid, Drawer
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import LogoutIcon from "@mui/icons-material/Logout";
import PublicIcon from "@mui/icons-material/Public";
import LockIcon from "@mui/icons-material/Lock";
import GroupIcon from "@mui/icons-material/Group";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import { useParams, useNavigate } from "react-router-dom";

// ⬇️ same sidebar component used in CommunityHub/Groups pages
import CommunitySideBar from "../../components/CommunitySideBar.jsx"; // :contentReference[oaicite:1]{index=1}

const API_ROOT = import.meta.env.VITE_API_ROOT || "/api";

/* ----------------------------- MOCK GENERATOR ----------------------------- */
function demoData(id = "demo") {
  const name = id === "demo" ? "Design Team" : "My Awesome Group";
  return {
    group: {
      id,
      slug: id,
      name,
      description: "This is a mock group for preview. Replace with real data later.",
      visibility: "public",
      member_count: 3,
      my_role: "member",
      is_member: true,
      cover_image: "https://picsum.photos/seed/group-cover/200/200"
    },
    members: [
      { id: "u1", name: "Aarav Shah", role: "owner",    avatar: "https://i.pravatar.cc/64?img=5" },
      { id: "u2", name: "Diya Patel", role: "moderator", avatar: "https://i.pravatar.cc/64?img=32" },
      { id: "u3", name: "Rohan Mehta", role: "member",   avatar: "https://i.pravatar.cc/64?img=15" }
    ],
    messages: [
      { id: "m1", content: "Welcome to the group! 🎉", created_at: new Date(Date.now()-3600e3).toISOString(), user: { name: "Aarav Shah" } },
      { id: "m2", content: "Hello everyone 👋",        created_at: new Date(Date.now()-1800e3).toISOString(), user: { name: "Diya Patel" } }
    ]
  };
}

/* --------------------------------- PAGE ---------------------------------- */
export default function GroupDetailPage() {
  const { idOrSlug } = useParams();
  const navigate = useNavigate();

  // left rail (like CommunityHub)
  const [view, setView] = React.useState("feed"); // just for highlighting in the sidebar
  const [navOpen, setNavOpen] = React.useState(false);
  const TOPICS = React.useMemo(
    () => ["Eco-Friendly tips", "Sustainable Living", "Climate Action & Advocacy", "Recycling & Upcycling"],
    []
  );

  const [tab, setTab] = React.useState("chat");
  const [group, setGroup] = React.useState(null);
  const [members, setMembers] = React.useState([]);
  const [messages, setMessages] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [sending, setSending] = React.useState(false);
  const [text, setText] = React.useState("");
  const [error, setError] = React.useState("");

  // token storage (adjust to your app)
  const token = window.localStorage.getItem("token");

  // enable mock via ?mock=1 or slug === "demo" or env flag
  const qs = new URLSearchParams(window.location.search);
  const USE_MOCK =
    import.meta.env.VITE_MOCK_GROUP_DETAIL === "1" ||
    qs.get("mock") === "1" ||
    idOrSlug === "demo";

  // ---- Fetch group, members, messages --------------------------------------
  React.useEffect(() => {
    let abort = false;
    (async () => {
      try {
        setError("");
        setLoading(true);

        // MOCK: short-circuit network calls
        if (USE_MOCK) {
          const d = demoData(idOrSlug);
          if (!abort) {
            setGroup(d.group);
            setMembers(d.members);
            setMessages(d.messages);
          }
          return;
        }

        const headers = {
          "Content-Type": "application/json",
          "Accept": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };
        const safeJSON = async (res, url) => {
          const ct = res.headers.get("content-type") || "";
          if (!res.ok || !ct.includes("application/json")) {
            const txt = await res.text();
            throw new Error(`HTTP ${res.status} ${res.statusText} on ${url}\nReceived: ${ct}\n${txt.slice(0, 160)}`);
          }
          return res.json();
        };
        const enc = encodeURIComponent(idOrSlug);

        // Group details
        const gUrl = `${API_ROOT}/groups/${enc}/`;
        const g = await safeJSON(await fetch(gUrl, { headers }), gUrl);

        // Members
        const mUrl = `${API_ROOT}/groups/${enc}/members/`;
        const mRes = await fetch(mUrl, { headers });
        const m = mRes.ok ? await mRes.json() : [];

        // Chat history (adjust if your endpoint differs)
        const cUrl = `${API_ROOT}/groups/${enc}/chat/history/`;
        const cRes = await fetch(cUrl, { headers });
        const c = cRes.ok ? await cRes.json() : [];

        if (!abort) {
          setGroup(g);
          setMembers(Array.isArray(m?.results) ? m.results : m || []);
          setMessages(Array.isArray(c?.results) ? c.results : c || []);
        }
      } catch (e) {
        if (!abort) setError(String(e?.message || e));
        console.error("GroupDetailPage load error:", e);
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => { abort = true; };
  }, [idOrSlug, token, USE_MOCK]);

  // ---- Send message (HTTP; swap to WS if you already use sockets) ----------
  const sendMessage = async () => {
    const content = text.trim();
    if (!content) return;
    setSending(true);
    try {
      // MOCK
      if (USE_MOCK) {
        setMessages((cur) => [
          ...cur,
          { id: Date.now(), content, created_at: new Date().toISOString(), user: { name: "You" } }
        ]);
        setText("");
        return;
      }

      const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      const res = await fetch(`${API_ROOT}/groups/${encodeURIComponent(idOrSlug)}/chat/send/`, {
        method: "POST",
        headers,
        body: JSON.stringify({ content }),
      });
      const msg = await res.json();
      // optimistic append; adapt to your response shape
      setMessages((cur) => [...cur, msg ?? { id: Date.now(), content, created_at: new Date().toISOString(), user: { name: "You" } }]);
      setText("");
    } catch (e) {
      console.error("sendMessage error:", e);
    } finally {
      setSending(false);
    }
  };

  // ---- Leave group ---------------------------------------------------------
  const leaveGroup = async () => {
    if (!confirm("Leave this group?")) return;
    try {
      // MOCK
      if (USE_MOCK) {
        setGroup((g) => (g ? { ...g, is_member: false } : g));
        alert("You left the group. (mock)");
        return;
      }

      const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      await fetch(`${API_ROOT}/groups/${encodeURIComponent(idOrSlug)}/membership/leave/`, {
        method: "POST",
        headers
      });
      // reflect immediately in UI
      setGroup((g) => (g ? { ...g, is_member: false } : g));
      alert("You left the group.");
    } catch (e) {
      console.error("leaveGroup error:", e);
    }
  };

  // ---- Sidebar interactions -------------------------------------------------
  const onChangeSidebar = (key) => {
    setView(key);
    // If they pick another section, go back to the hub (matches your UX)
    if (key !== "feed") navigate("/community");
  };

  // ---- Render ---------------------------------------------------------------
  if (loading) return <Box sx={{ p: 3 }}><Typography>Loading group…</Typography></Box>;
  if (error) {
    return (
      <Box sx={{ p: 3, maxWidth: 900, mx: "auto" }}>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>Couldn’t load this group</Typography>
          <Typography sx={{ whiteSpace: "pre-wrap" }} color="text.secondary">{error}</Typography>
          <Typography sx={{ mt: 1.5 }} variant="body2" color="text.secondary">
            Tip: check <code>VITE_API_ROOT</code>, auth token, and that the slug/id exists.
          </Typography>
        </Paper>
      </Box>
    );
  }
  if (!group) return <Box sx={{ p: 3 }}><Typography>Group not found.</Typography></Box>;

  const isPrivate = (group.visibility || "").toLowerCase() === "private";
  const visibilityIcon = isPrivate ? <LockIcon fontSize="small" /> : <PublicIcon fontSize="small" />;

  return (
    <Box sx={{ px: { xs: 2, md: 3 }, py: 2, maxWidth: 1280, mx: "auto" }}>
      {/* Title bar with mobile nav trigger (consistent with CommunityHub) */}
      <Paper
        elevation={0}
        sx={{
          mb: 2,
          p: 2,
          border: theme => `1px solid ${theme.palette.divider}`,
          borderRadius: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 800 }}>{group.name}</Typography>
        <IconButton
          sx={{ display: { xs: "inline-flex", md: "none" } }}
          onClick={() => setNavOpen(true)}
          aria-label="Open navigation"
        >
          <MenuRoundedIcon />
        </IconButton>
      </Paper>

      {/* Mobile drawer for the left nav (same pattern as CommunityHub) */}
      <Drawer
        open={navOpen}
        onClose={() => setNavOpen(false)}
        PaperProps={{ sx: { width: 280 } }}
        sx={{ display: { xs: "block", md: "none" } }}
      >
        <Box sx={{ p: 2 }}>
          <CommunitySideBar view={view} topics={TOPICS} onChangeView={onChangeSidebar} />
        </Box>
      </Drawer>

      <Grid container spacing={2}>
        {/* Left rail (desktop) — Community sidebar */}
        <Grid
          item
          xs={12}
          md={3}
          order={{ xs: 2, md: 1 }}
          sx={{ display: { xs: "none", md: "block" } }}
        >
          <CommunitySideBar view={view} topics={TOPICS} onChangeView={onChangeSidebar} />
        </Grid>

        {/* Main content (Group details) */}
        <Grid item xs={12} md={9} order={{ xs: 1, md: 2 }}>
          {/* Header */}
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, mb: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar
                src={group.cover_image || group.avatar}
                alt={group.name}
                sx={{ width: 64, height: 64 }}
              >
                {group?.name?.[0]?.toUpperCase()}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="h5" noWrap>{group.name}</Typography>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5, flexWrap: "wrap" }}>
                  <Chip size="small" icon={visibilityIcon} label={(group.visibility || "public").toUpperCase()} />
                  <Chip size="small" icon={<GroupIcon fontSize="small" />} label={`${group.member_count ?? members.length} members`} />
                  {group?.my_role && <Chip size="small" color="primary" label={String(group.my_role).toUpperCase()} />}
                </Stack>
              </Box>
              {group.is_member !== false && (
                <Button variant="outlined" color="error" startIcon={<LogoutIcon />} onClick={leaveGroup}>
                  Leave
                </Button>
              )}
            </Stack>
          </Paper>

          {/* Tabs + content */}
          <Paper variant="outlined" sx={{ borderRadius: 3 }}>
            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v)}
              variant="fullWidth"
              textColor="primary"
              indicatorColor="primary"
            >
              <Tab value="chat" label="Chat" />
              <Tab value="members" label="Members" />
              <Tab value="overview" label="Overview" />
            </Tabs>
            <Divider />

            {/* CHAT TAB */}
            {tab === "chat" && (
              <Box sx={{ p: 2 }}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: 420, overflow: "auto", mb: 1.5 }}>
                  {messages.length === 0 ? (
                    <Typography color="text.secondary">No messages yet.</Typography>
                  ) : (
                    <List dense>
                      {messages.map((m) => (
                        <ListItem key={m.id ?? `${m.created_at}-${Math.random()}`} alignItems="flex-start">
                          <ListItemAvatar>
                            <Avatar src={m.user?.avatar} alt={m.user?.name}>{m.user?.name?.[0]?.toUpperCase()}</Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Stack direction="row" spacing={1} alignItems="baseline">
                                <Typography fontWeight={600}>{m.user?.name || "Member"}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {new Date(m.created_at || Date.now()).toLocaleString()}
                                </Typography>
                              </Stack>
                            }
                            secondary={<Typography component="span">{m.content}</Typography>}
                          />
                        </ListItem>
                      ))}
                    </List>
                  )}
                </Paper>

                <Stack direction="row" spacing={1}>
                  <TextField
                    fullWidth size="small"
                    placeholder="Type a message…"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton aria-label="send" onClick={sendMessage} disabled={sending}>
                            <SendIcon />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Stack>
              </Box>
            )}

            {/* MEMBERS TAB */}
            {tab === "members" && (
              <Box sx={{ p: 2 }}>
                {members.length === 0 ? (
                  <Typography color="text.secondary">No members found.</Typography>
                ) : (
                  <List>
                    {members.map((m) => (
                      <ListItem key={m.id}>
                        <ListItemAvatar>
                          <Avatar src={m.avatar} alt={m.name}>{m?.name?.[0]?.toUpperCase()}</Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography fontWeight={600}>{m.name || m.username}</Typography>
                              {m.role && <Chip size="small" label={String(m.role).toUpperCase()} />}
                            </Stack>
                          }
                          secondary={m.title || m.email}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </Box>
            )}

            {/* OVERVIEW TAB */}
            {tab === "overview" && (
              <Box sx={{ p: 2 }}>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>About</Typography>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2 }}>
                  <Typography>{group.description || "No description provided."}</Typography>
                </Paper>

                <Stack direction="row" spacing={2} flexWrap="wrap">
                  <Chip icon={visibilityIcon} label={`Visibility: ${(group.visibility || "public").toUpperCase()}`} />
                  <Chip icon={<GroupIcon />} label={`Members: ${group.member_count ?? members.length}`} />
                  {group.created_at && (
                    <Chip label={`Created: ${new Date(group.created_at).toLocaleDateString()}`} />
                  )}
                </Stack>

                {group.is_member !== false && (
                  <Box sx={{ mt: 2 }}>
                    <Button variant="outlined" color="error" startIcon={<LogoutIcon />} onClick={leaveGroup}>
                      Leave group
                    </Button>
                  </Box>
                )}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
