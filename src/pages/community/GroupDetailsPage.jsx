// src/pages/community/GroupDetailsPage.jsx
import * as React from "react";
import { useParams, Link as RouterLink } from "react-router-dom";
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
import CommunityRightRailLayout from "../../components/layout/CommunityRightRailLayout.jsx";

const BORDER = "#e2e8f0";

// -----------------------------------------------------------------------------
// Keep helpers local (mirrors your HomePage style). No imports from your code.
// -----------------------------------------------------------------------------
const API_ROOT = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");
const getToken = () => {
  const keys = ["token", "access", "access_token", "accessToken", "jwt", "JWT"];
  for (const k of keys) {
    const v = localStorage.getItem(k);
    if (v) return v;
  }
  return "";
};
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
const nameOf = (u = {}) =>
  u.profile?.full_name ||
  u.full_name ||
  u.user_full_name ||
  u.name ||
  [u.first_name, u.last_name].filter(Boolean).join(" ") ||
  u.display_name ||
  u.username ||
  u.email ||
  "Member";

const avatarOf = (u = {}) =>
  u.avatar ||
  u.avatar_url ||
  u.photo ||
  u.profile?.avatar ||
  u.profile?.image_url ||
  u.profile?.photo ||
  "";
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
  const actor =
    row.actor || row.user || row.author || row.created_by || row.owner || {};
  const type = (row?.type || m.type || "text").toLowerCase();
  const base = {
    id: row.id,
    created_at: row.created_at || row.created || row.timestamp || Date.now(),
    type,
    actor_name: nameOf(actor),
    actor_avatar: avatarOf(actor),
  };
  // common text post fields from DRF-style payloads
  const text =
    row.content || row.text || row.body || row.message || m.text || "";
  if (type === "link") {
    return {
      ...base,
      content: row.description || m.description || text,
      link: row.url || m.url || row.link || "",
    };
  }
  if (type === "image") {
    return {
      ...base,
      content: row.caption || m.caption || text,
      images: row.images || (m.image_url ? [m.image_url] : []),
    };
  }
  if (type === "poll") {
    const opts = row.options || m.options;
    return { ...base, content: row.question || m.question || text, options: Array.isArray(opts) ? opts : [] };
  }
  return { ...base, content: text };
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
    // Try your preferred endpoint first, then common variants
    const candidates = [
      `${API_ROOT}/groups/${groupId}/member/?page_size=100`,
      `${API_ROOT}/groups/${groupId}/members/?page_size=100`,
      `${API_ROOT}/groups/${groupId}/memberships/?page_size=100`,
      `${API_ROOT}/memberships/?group=${groupId}&page_size=100`,
      // no-trailing-slash fallbacks
      `${API_ROOT}/groups/${groupId}/member`,
      `${API_ROOT}/groups/${groupId}/members`,
    ];
    for (const url of candidates) {
      try {
        const res = await fetch(url, {
          headers: { ...authHeader(), accept: "application/json" },
        });
        if (!res.ok) continue;
        const data = await res.json();
        const rows =
          Array.isArray(data?.results) ? data.results :
            Array.isArray(data?.members) ? data.members :
              Array.isArray(data?.items) ? data.items :
                (Array.isArray(data) ? data : []);
        if (!rows) continue;
        const normalized = rows.map((r) => {
          // Common shapes your API might return
          const u = r.user || r.member || r.participant || r.account || r.profile || r;
          const displayName =
            r.user_full_name || r.member_name || r.display_name || null;
          const role =
            r.role ||
            r.role_display ||
            r.membership_role ||
            r.role_name ||
            r.user_role ||
            r.membership?.role ||
            (r.is_owner ? "owner" : r.is_admin ? "admin" : r.is_moderator ? "moderator" : "member");
          return {
            id: u?.id || r.id,
            name: displayName || nameOf(u) || nameOf(r),
            avatar: avatarOf(u) || avatarOf(r),
            role: (role || "member").toString().toLowerCase(),
            email: u?.email || r?.email || null,
          };
        });
        setMembers(normalized);
        return;
      } catch (e) {
        // ignore and try next
      }
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
      <Stack spacing={1.25}>
        {pageItems.map((m) => (
          <Box
            key={m.id}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              border: "1px solid",
              borderColor: BORDER,
              borderRadius: 2,
              p: 1.25,
              width: "100%",
            }}
          >
            <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
              <Avatar src={m.avatar}>{(m.name || "M").slice(0, 1)}</Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body1" fontWeight={600} noWrap title={m.name}>
                  {m.name}
                </Typography>
                {!!m.email && (
                  <Typography variant="caption" color="text.secondary" noWrap title={m.email}>
                    {m.email}
                  </Typography>
                )}
              </Box>
            </Stack>
            <Chip label={m.role} size="small" />
          </Box>
        ))}
      </Stack>
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
    <Stack spacing={3}>
      <Card variant="outlined" sx={{ borderRadius: 3, borderColor: BORDER }}>
        <CardHeader title={<Typography variant="h6" sx={{ fontWeight: 600 }}>About this group</Typography>} />
        <CardContent sx={{ pt: 0 }}>
          <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
            {group.description || group.about || "No description yet."}
          </Typography>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ borderRadius: 3, borderColor: BORDER }}>
        <CardHeader title={<Typography variant="h6" sx={{ fontWeight: 600 }}>Group info</Typography>} />
        <CardContent sx={{ pt: 0 }}>
          {/* your info rows */}
          <Stack spacing={1} divider={<Divider />}>
            {group.parent_id && group.parent_id !== group.id && (
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 1 }}>
                <Typography variant="body2" color="text.secondary">Parent group</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  <Button
                    component={RouterLink}
                    to={`/community/groups/${group.parent_id}`}
                    variant="text"
                    size="small"
                    sx={{ textTransform: "none", p: 0, minWidth: 0 }}
                  >
                    {group.parent_name || `#${group.parent_id}`}
                  </Button>
                </Typography>
              </Box>
            )}
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
    </Stack>
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
  const [me, setMe] = React.useState(null);
  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_ROOT}/users/me/`, {
          headers: { ...authHeader(), accept: "application/json" },
        });
        if (res.ok) setMe(await res.json());
      } catch { }
    })();
  }, []);

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

        // Detect parent info (various backend shapes)
        const parentId =
          data.parent_id ??
          data.parent?.id ??
          data.parent_group_id ??
          data.parent_group?.id ??
          data.parentGroupId ??
          data.parentGroup?.id ??
          null;
        let parentName =
          data.parent?.name ??
          data.parent_name ??
          data.parent_group?.name ??
          data.parentGroup?.name ??
          null;

        // If we have an id but no name, fetch the parent detail once for display
        if (parentId && !parentName) {
          try {
            const pres = await fetch(`${API_ROOT}/groups/${parentId}/`, {
              headers: { ...authHeader(), accept: "application/json" },
            });
            if (pres.ok) {
              const pdata = await pres.json();
              parentName = pdata.name || pdata.title || pdata.display_name || parentName;
            }
          } catch { }
        }

        setGroup({
          id: data.id,
          name: data.name,
          description: data.description || data.about || "",
          member_count: data.member_count ?? data.members_count ?? 0,
          avatar: data.avatar || "",
          created_at: data.created_at,
          visibility: data.visibility || "private",
          parent_id: parentId || null,
          parent_name: parentName || null,
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
            top: 88,
            height: "fit-content",
            flexShrink: 0,
          }}
        >
          <CommunitySidebar active="groups" />
        </Box>

        {/* RIGHT: Group content */}
        <CommunityRightRailLayout user={me}>
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
        </CommunityRightRailLayout>
      </Box>
    </Box>
  );
}