// src/pages/community/GroupDetailsPage.jsx
import * as React from "react";
import { useParams } from "react-router-dom";
import {
  Avatar, Box, Button, Card, CardContent, CardHeader, Chip, Divider, Grid,
  IconButton, List, ListItem, ListItemAvatar, ListItemText, Stack, Tab, Tabs,
  TextField, Typography, InputAdornment, Pagination, Tooltip, CircularProgress
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import PeopleOutlineRoundedIcon from "@mui/icons-material/PeopleOutlineRounded";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import CommunitySidebar from "../../components/CommunitySideBar.jsx";

const BORDER = "#e2e8f0";

// -----------------------------------------------------------------------------
// Keep helpers local (mirrors your HomePage style). No imports from your code.
// -----------------------------------------------------------------------------
const API_ROOT = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");
const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("access") ||
  localStorage.getItem("access_token") ||
  "";
const authHeader = () => {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
};
const timeAgo = (date) => {
  if (!date) return "";
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

// -----------------------------------------------------------------------------
// Minimal PostCard (local) so we don't touch your existing files
// -----------------------------------------------------------------------------
function PostCard({ post }) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 3, borderColor: BORDER }}>
      <CardHeader
        avatar={<Avatar src={post.actor_avatar || ""}>{(post.actor_name || "U").slice(0, 1)}</Avatar>}
        title={<Typography fontWeight={600}>{post.actor_name || "Member"}</Typography>}
        subheader={timeAgo(post.created_at)}
      />
      <CardContent sx={{ pt: 0 }}>
        {post.content && (
          <Typography sx={{ whiteSpace: "pre-wrap" }}>{post.content}</Typography>
        )}

        {post.type === "link" && post.link && (
          <Button
            size="small"
            href={post.link}
            target="_blank"
            rel="noreferrer"
            sx={{ mt: 1 }}
          >
            {post.link}
          </Button>
        )}

        {post.type === "image" && Array.isArray(post.images) && post.images.length > 0 && (
          <Grid container spacing={1} sx={{ mt: 1 }}>
            {post.images.map((src, idx) => (
              <Grid key={idx} item xs={6} sm={4} md={3}>
                <img
                  src={src}
                  alt={`post-${post.id}-img-${idx}`}
                  style={{ width: "100%", height: 160, objectFit: "cover", borderRadius: 8 }}
                />
              </Grid>
            ))}
          </Grid>
        )}

        {post.type === "poll" && Array.isArray(post.options) && post.options.length > 0 && (
          <List dense sx={{ mt: 1, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
            {post.options.map((opt, idx) => (
              <ListItem key={idx} disableGutters sx={{ px: 1 }}>
                <ListItemAvatar>
                  <Avatar sx={{ width: 28, height: 28 }}>{idx + 1}</Avatar>
                </ListItemAvatar>
                <ListItemText primary={opt} />
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
}

// Shape feed rows into UI posts (works with a few backend styles)
function shapePost(row) {
  const m = row?.metadata || {};
  const type = (row?.type || m.type || "text").toLowerCase();
  const base = {
    id: row.id,
    created_at: row.created_at || row.timestamp || Date.now(),
    type,
    actor_name: row.actor_name || row.actor?.name || row.user?.name || "",
    actor_avatar: row.actor?.avatar || row.user?.avatar || "",
  };
  if (type === "text") return { ...base, content: row.content || m.text || "" };
  if (type === "link") return { ...base, content: row.description || m.description || "", link: row.url || m.url || "" };
  if (type === "image") return { ...base, content: row.caption || m.caption || "", images: row.images || (m.image_url ? [m.image_url] : []) };
  if (type === "poll") return { ...base, content: row.question || m.question || "", options: Array.isArray(row.options || m.options) ? (row.options || m.options) : [] };
  return { ...base, content: row.content || m.text || "" };
}

// -----------------------------------------------------------------------------
// Tabs content
// -----------------------------------------------------------------------------
function ChatTab({ groupId }) {
  const [messages, setMessages] = React.useState([]);
  const [text, setText] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [sending, setSending] = React.useState(false);
  const listRef = React.useRef(null);

  const scrollToBottom = React.useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  const fetchMessages = React.useCallback(async () => {
    setLoading(true);
    const candidates = [
      `${API_ROOT}/groups/${groupId}/chat/messages/`,
      `${API_ROOT}/messaging/threads/group-${groupId}/messages/`,
      `${API_ROOT}/chat/groups/${groupId}/messages/`,
    ];
    for (const url of candidates) {
      try {
        const res = await fetch(url, { headers: { ...authHeader(), accept: "application/json" } });
        if (!res.ok) continue;
        const data = await res.json();
        const rows = Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : []);
        setMessages(rows);
        setLoading(false);
        setTimeout(scrollToBottom, 50);
        return;
      } catch { }
    }
    setMessages([]);
    setLoading(false);
  }, [groupId, scrollToBottom]);

  React.useEffect(() => { fetchMessages(); }, [fetchMessages]);

  const sendMessage = async () => {
    const body = { text: text.trim() };
    if (!body.text) return;
    setSending(true);
    const candidates = [
      `${API_ROOT}/groups/${groupId}/chat/messages/`,
      `${API_ROOT}/messaging/threads/group-${groupId}/messages/`,
      `${API_ROOT}/chat/groups/${groupId}/messages/`,
    ];
    for (const url of candidates) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader() },
          body: JSON.stringify(body),
        });
        if (!res.ok) continue;
        setText("");
        await fetchMessages();
        setSending(false);
        return;
      } catch { }
    }
    setSending(false);
    alert("Couldn't send message.");
  };

  return (
    <Stack spacing={2}>
      <Card variant="outlined" sx={{ borderRadius: 3, borderColor: BORDER }}>
        <CardContent sx={{ p: 0 }}>
          <Box
            ref={listRef}
            sx={{ maxHeight: 420, overflowY: "auto", p: 2 }}
          >
            {loading ? (
              <Stack direction="row" alignItems="center" justifyContent="center" sx={{ py: 4 }}>
                <CircularProgress size={24} />
              </Stack>
            ) : messages.length === 0 ? (
              <Typography color="text.secondary" sx={{ p: 2 }}>No messages yet.</Typography>
            ) : (
              <Stack spacing={1.25}>
                {messages.map((m) => (
                  <Stack key={m.id} direction="row" spacing={1.25} alignItems="flex-start">
                    <Avatar src={m.user?.avatar || ""} sx={{ width: 36, height: 36 }}>
                      {(m.user?.name || "U").slice(0, 1)}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {m.user?.name || "Member"} <Box component="span" sx={{ color: "text.secondary", fontWeight: 400, ml: 1 }}>{timeAgo(m.created_at || m.timestamp)}</Box>
                      </Typography>
                      <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{m.text || m.message || ""}</Typography>
                    </Box>
                  </Stack>
                ))}
              </Stack>
            )}
          </Box>
          <Divider />
          <Box sx={{ display: "flex", gap: 1, p: 1.5 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Type a message…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            />
            <Button variant="contained" endIcon={<SendRoundedIcon />} onClick={sendMessage} disabled={sending}>
              Send
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Stack>
  );
}

function PostsTab({ groupId }) {
  const [posts, setPosts] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  const fetchPosts = React.useCallback(async () => {
    setLoading(true);
    const candidates = [
      `${API_ROOT}/groups/${groupId}/posts/`,
      `${API_ROOT}/groups/${groupId}/feed/`,
      `${API_ROOT}/activity/feed/?scope=group&group_id=${groupId}`,
    ];
    for (const url of candidates) {
      try {
        const res = await fetch(url, { headers: { ...authHeader(), accept: "application/json" } });
        if (!res.ok) continue;
        const data = await res.json();
        const list = Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : []);
        setPosts(list.map(shapePost));
        setLoading(false);
        return;
      } catch { }
    }
    setPosts([]);
    setLoading(false);
  }, [groupId]);

  React.useEffect(() => { fetchPosts(); }, [fetchPosts]);

  if (loading) {
    return (
      <Stack alignItems="center" sx={{ py: 4 }}>
        <CircularProgress size={24} />
      </Stack>
    );
  }

  if (posts.length === 0) {
    return <Typography color="text.secondary">No posts in this group yet.</Typography>;
  }

  return (
    <Stack spacing={2}>
      {posts.map((p) => <PostCard key={p.id} post={p} />)}
    </Stack>
  );
}

function MembersTab({ groupId }) {
  const [members, setMembers] = React.useState([]);
  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(1);
  const perPage = 12;

  const fetchMembers = React.useCallback(async () => {
    const candidates = [
      `${API_ROOT}/groups/${groupId}/members/`,
      `${API_ROOT}/groups/${groupId}/memberships/`,
      `${API_ROOT}/memberships/?group=${groupId}`,
    ];
    for (const url of candidates) {
      try {
        const res = await fetch(url, { headers: { ...authHeader(), accept: "application/json" } });
        if (!res.ok) continue;
        const data = await res.json();
        const rows = Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : []);
        const normalized = rows.map((r) => {
          const u = r.user || r.member || r;
          return {
            id: u.id || r.id,
            name: `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.username || "Member",
            avatar: u.avatar || u.profile_image || "",
            role: r.role || "member",
          };
        });
        setMembers(normalized);
        return;
      } catch { }
    }
    setMembers([]);
  }, [groupId]);

  React.useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => m.name.toLowerCase().includes(q));
  }, [members, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const startIdx = (page - 1) * perPage;
  const pageItems = filtered.slice(startIdx, startIdx + perPage);

  React.useEffect(() => { setPage(1); }, [query, filtered.length]);

  return (
    <Stack spacing={2}>
      <TextField
        fullWidth
        placeholder="Search members"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>) }}
      />
      <Grid container spacing={2}>
        {pageItems.map((m) => (
          <Grid key={m.id} item xs={12} sm={6} md={4} lg={3}>
            <Card variant="outlined" sx={{ borderRadius: 2, borderColor: BORDER }}>
              <CardHeader
                avatar={<Avatar src={m.avatar}>{(m.name || "M").slice(0, 1)}</Avatar>}
                title={<Typography fontWeight={600} variant="body1">{m.name}</Typography>}
                subheader={<Chip label={m.role} size="small" />}
                sx={{ pb: 0.5 }}
              />
            </Card>
          </Grid>
        ))}
      </Grid>
      <Stack direction={{ xs: "column", sm: "row" }} alignItems="center" justifyContent="space-between">
        <Typography variant="body2" color="text.secondary">
          Showing {filtered.length === 0 ? 0 : startIdx + 1}–{Math.min(startIdx + perPage, filtered.length)} of {filtered.length}
        </Typography>
        <Pagination
          count={totalPages}
          page={page}
          onChange={(_, p) => setPage(p)}
          color="primary"
          size="medium"
          siblingCount={0}
          boundaryCount={1}
        />
      </Stack>
    </Stack>
  );
}

function OverviewTab({ group }) {
  if (!group) return null;
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={7}>
        <Card variant="outlined" sx={{ borderRadius: 3, borderColor: BORDER }}>
          <CardHeader 
            title={
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                About this group
              </Typography>
            } 
          />
          <CardContent sx={{ pt: 0 }}>
            <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
              {group.description || group.about || "No description yet."}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={5}>
        <Card variant="outlined" sx={{ borderRadius: 3, borderColor: BORDER }}>
          <CardHeader 
            title={
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Group info
              </Typography>
            } 
          />
          <CardContent sx={{ pt: 0 }}>
            <Stack spacing={1} divider={<Divider />}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 1 }}>
                <Typography variant="body2" color="text.secondary">Members</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {group.member_count ?? group.members_count ?? "—"}
                </Typography>
              </Box>
              
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 1 }}>
                <Typography variant="body2" color="text.secondary">Visibility</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500, textTransform: "capitalize" }}>
                  {(group.visibility || "private").toString()}
                </Typography>
              </Box>
              
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 1 }}>
                <Typography variant="body2" color="text.secondary">Created</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {(group.created_at && new Date(group.created_at).toLocaleDateString()) || "—"}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

// -----------------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------------
export default function GroupDetailsPage() {
  const { groupId } = useParams();
  const [tab, setTab] = React.useState(3); // Default to Overview tab
  const [group, setGroup] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  const fetchGroup = React.useCallback(async () => {
    setLoading(true);
    const candidates = [
      `${API_ROOT}/groups/${groupId}/`,
      `${API_ROOT}/groups/detail/${groupId}/`,
    ];
    for (const url of candidates) {
      try {
        const res = await fetch(url, { headers: { ...authHeader(), accept: "application/json" } });
        if (!res.ok) continue;
        const data = await res.json();
        setGroup({
          id: data.id,
          name: data.name,
          description: data.description || data.about || "",
          member_count: data.member_count ?? data.members_count ?? 0,
          avatar: data.avatar || "",
          created_at: data.created_at,
          visibility: data.visibility || "private",
        });
        setLoading(false);
        return;
      } catch { }
    }
    setGroup(null);
    setLoading(false);
  }, [groupId]);

  React.useEffect(() => { fetchGroup(); }, [fetchGroup]);

  return (
    <Box sx={{ width: "100%", py: { xs: 2, md: 3 } }}>
      <Box sx={{ display: "flex", gap: 3, px: { xs: 2, sm: 2, md: 3 }, maxWidth: "1200px", mx: "auto" }}>
        {/* LEFT: Community sidebar (sticky on desktop) */}
        <Box
          sx={{
            width: 280,
            display: { xs: "none", md: "block" },
            position: "sticky",
            top: 20,
            height: "fit-content",
            flexShrink: 0,
          }}
        >
          <CommunitySidebar active="groups" />
        </Box>

        {/* RIGHT: Group content */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* Header Card */}
          <Card 
            variant="outlined" 
            sx={{ 
              borderRadius: 3, 
              borderColor: BORDER,
              mb: 3,
              overflow: "visible"
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2.5}
                alignItems={{ xs: "flex-start", sm: "center" }}
              >
                <Avatar 
                  src={group?.avatar || ""} 
                  sx={{ 
                    width: 80, 
                    height: 80,
                    bgcolor: "#e0f2fe",
                    color: "#0284c7",
                    fontSize: "2rem",
                    fontWeight: 600
                  }}
                >
                  {(group?.name || "G").slice(0, 1)}
                </Avatar>
                <Box flex={1}>
                  <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
                    {loading ? "Loading…" : (group?.name || "Group")}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {loading ? "" : `${group?.member_count ?? 0} members`}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          {/* Tabs Card */}
          <Card variant="outlined" sx={{ borderRadius: 3, borderColor: BORDER }}>
            <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
              <Tabs 
                value={tab} 
                onChange={(_, v) => setTab(v)} 
                variant="scrollable" 
                scrollButtons="auto"
                allowScrollButtonsMobile
                sx={{
                  px: 2,
                  "& .MuiTab-root": {
                    textTransform: "none",
                    minHeight: 64,
                    fontWeight: 500,
                  }
                }}
              >
                <Tab 
                  icon={<ChatBubbleOutlineRoundedIcon />} 
                  iconPosition="start" 
                  label="CHAT" 
                />
                <Tab 
                  icon={<ArticleOutlinedIcon />} 
                  iconPosition="start" 
                  label="POSTS" 
                />
                <Tab 
                  icon={<PeopleOutlineRoundedIcon />} 
                  iconPosition="start" 
                  label="MEMBERS" 
                />
                <Tab 
                  icon={<InfoOutlinedIcon />} 
                  iconPosition="start" 
                  label="OVERVIEW" 
                />
              </Tabs>
            </Box>
            
            <CardContent sx={{ p: 3 }}>
              {tab === 0 && <ChatTab groupId={groupId} />}
              {tab === 1 && <PostsTab groupId={groupId} />}
              {tab === 2 && <MembersTab groupId={groupId} />}
              {tab === 3 && <OverviewTab group={group} />}
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
}