// src/pages/community/GroupDetailsPage.jsx
import * as React from "react";
import { useParams, Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Avatar,
  AvatarGroup,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Pagination,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  CircularProgress,
} from "@mui/material";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import FavoriteBorderRoundedIcon from "@mui/icons-material/FavoriteBorderRounded";
import ReplyRoundedIcon from "@mui/icons-material/ReplyRounded";
import IosShareRoundedIcon from "@mui/icons-material/IosShareRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
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
// Helpers
// -----------------------------------------------------------------------------
const API_ROOT = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");
const API_ORIGIN = (() => {
  try { const u = new URL(API_ROOT); return `${u.protocol}//${u.host}`; } catch { return ""; }
})();
const MEDIA_ORIGIN = import.meta.env.VITE_MEDIA_BASE_URL || API_ORIGIN;

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

const toAbsolute = (url) =>
  !url
    ? ""
    : /^https?:\/\//i.test(url)
      ? url
      : `${MEDIA_ORIGIN}${url.startsWith("/") ? "" : "/"}${url}`;

const avatarOf = (u = {}) =>
  toAbsolute(
    u.user_image_url ||
    u.user_image ||
    u.avatar ||
    u.avatar_url ||
    u.profile_image ||
    u.image_url ||
    u.photo ||
    u.profile?.user_image_url ||
    u.profile?.user_image ||
    u.profile?.avatar ||
    u.profile?.image_url ||
    u.profile?.photo ||
    ""
  );

// -----------------------------------------------------------------------------
// Minimal PostCard (local) so we don't touch your existing files
// -----------------------------------------------------------------------------
function PostCard({ post }) {
  const [likers, setLikers] = React.useState(
    () => post.likers || post.metrics?.likers || []
  );

  const likesCount = post.metrics?.likes ?? post.like_count ?? 0;
  const commentCount = post.metrics?.comments ?? post.comment_count ?? 0;
  const [shareCount, setShareCount] = React.useState(post.metrics?.shares ?? post.share_count ?? 0);

  const primaryLiker = likers[0];
  const othersCount = likesCount > 1 ? likesCount - 1 : 0;

  let likeLabel = "";
  if (likesCount === 1 && primaryLiker) {
    likeLabel = `${primaryLiker.name || "someone"}`;
  } else if (likesCount > 1 && primaryLiker) {
    likeLabel = `${primaryLiker.name || "someone"} and ${othersCount} other${othersCount > 1 ? "s" : ""}`;
  }

  // --- 2a) Normalize likers like Home (helper kept local to PostCard) ---
  const normalizeUsers = React.useCallback((payload) => {
    const rows = Array.isArray(payload?.results)
      ? payload.results
      : Array.isArray(payload)
      ? payload
      : [];
    return rows.map((r) => {
      const u = r.user || r.actor || r.liker || r.owner || r.profile || r;
      const profile = u.profile || u.user_profile || r.profile || {};
      const id =
        u?.id ?? u?.user_id ?? r.user_id ?? r.id;
      const first =
        u?.first_name ?? u?.firstName ?? r.user_first_name ?? "";
      const last =
        u?.last_name ?? u?.lastName ?? r.user_last_name ?? "";
      const name =
        u?.name || u?.full_name || `${first} ${last}`.trim() || u?.username || (id ? `User #${id}` : "User");
      const avatarRaw =
        profile.user_image_url || profile.user_image ||
        u?.user_image_url || u?.user_image ||
        r.user_image_url || r.user_image ||
        u?.avatar || u?.profile_image || u?.photo || u?.image_url || u?.avatar_url || "";
      return { id, name, avatar: toAbsolute(avatarRaw) };
    });
  }, []);

  // sync share count (fallback if API didn’t provide)
  React.useEffect(() => {
    let active = true;
    async function loadShares() {
      try {
        const res = await fetch(
          `${API_ROOT}/engagements/shares/?target_type=activity_feed.feeditem&target_id=${post.id}&page_size=200`,
          { headers: { ...authHeader(), accept: "application/json" } }
        );
        if (!res.ok) return;
        const data = await res.json();
        const rows = Array.isArray(data?.results) ? data.results :
                     Array.isArray(data) ? data :
                     Array.isArray(data?.items) ? data.items :
                     Array.isArray(data?.shares) ? data.shares : [];
        if (active) setShareCount(rows.length || 0);
      } catch {}
    }
    // only fetch if it’s 0 to avoid extra calls
    if (!shareCount) loadShares();
    return () => { active = false; };
  }, [post.id]); // eslint-disable-line

  // load likers list (avatars) similar to HomePage (your original effect kept)
  React.useEffect(() => {
    let active = true;

    async function loadLikers() {
      try {
        const res = await fetch(
          `${API_ROOT}/engagements/reactions/likers/?target_type=activity_feed.feeditem&target_id=${post.id}`,
          {
            headers: {
              "Content-Type": "application/json",
              ...authHeader(),
            },
          }
        );
        if (!res.ok) return;
        const data = await res.json();
        const rows = data?.results || data?.likers || data || [];
        if (!active) return;

        const mapped = rows.map((row) => {
          const user = row.user || row;
          return {
            id: user.id,
            name: nameOf(user),
            avatar: avatarOf(user),
          };
        });

        setLikers(mapped);
      } catch (err) {
        // ignore
      }
    }

    if (likesCount > 0 && likers.length === 0) {
      loadLikers();
    }

    return () => {
      active = false;
    };
  }, [post.id, likesCount]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- 2a) EXTRA: second pass using Home-style endpoints/normalization if still empty ---
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!(likesCount > 0) || likers.length > 0) return;
      try {
        const urls = [
          `${API_ROOT}/engagements/reactions/?reaction=like&target_type=activity_feed.feeditem&target_id=${post.id}&page_size=5`,
          `${API_ROOT}/engagements/reactions/who-liked/?feed_item=${post.id}&page_size=5`,
        ];
        for (const url of urls) {
          const r = await fetch(url, { headers: { Accept: "application/json", ...authHeader() } });
          if (!r.ok) continue;
          const j = await r.json();
          const list = normalizeUsers(j);
          if (!cancelled && list.length) {
            setLikers(list);
            break;
          }
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [post.id, likesCount, likers.length, normalizeUsers]);

  // --- 2b) Override likeLabel to match Home: “liked by … and N others” ---
  {
    const likeCount = Number(post.metrics?.likes ?? post.like_count ?? 0);
    const primary = likers?.[0] || null;
    const others = Math.max(0, (likeCount || 0) - 1);
    likeLabel = primary
      ? (likeCount === 1
          ? `liked by ${primary.name}`
          : `liked by ${primary.name} and ${others} ${others === 1 ? "other" : "others"}`)
      : `${(likeCount || 0).toLocaleString()} likes`;
  }

  return (
    <Card
      variant="outlined"
      sx={{
        mb: 2,
        borderRadius: 2,
        borderColor: BORDER,
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.08)",
      }}
    >
      {/* HEADER */}
      <CardHeader
        avatar={
          <Avatar
            src={post.actor_avatar || undefined}
            alt={post.actor_name || "User"}
          >
            {(post.actor_name || "?").charAt(0).toUpperCase()}
          </Avatar>
        }
        title={
          <Typography variant="subtitle2" fontWeight={600}>
            {post.actor_name || "Member"}
          </Typography>
        }
        subheader={
          <Typography variant="caption" color="text.secondary">
            {new Date(post.created_at).toLocaleString()}
          </Typography>
        }
      />

      {/* MAIN CONTENT */}
      <CardContent sx={{ pt: 0 }}>
        {post.content && (
          <Typography
            variant="body2"
            sx={{ whiteSpace: "pre-wrap", mb: 1.5 }}
          >
            {post.content}
          </Typography>
        )}

        {post.link && (
          <Box
            sx={{
              borderRadius: 1.5,
              border: "1px solid",
              borderColor: BORDER,
              p: 1.5,
              mt: 0.5,
            }}
          >
            {post.link.title && (
              <Typography variant="subtitle2" gutterBottom>
                {post.link.title}
              </Typography>
            )}
            {post.link.description && (
              <Typography variant="body2" color="text.secondary">
                {post.link.description}
              </Typography>
            )}
            {post.link.url && (
              <Typography
                variant="caption"
                color="primary"
                sx={{ mt: 0.5, display: "inline-block" }}
              >
                {post.link.url}
              </Typography>
            )}
          </Box>
        )}

        {post.image && (
          <Box
            sx={{
              borderRadius: 1.5,
              overflow: "hidden",
              mt: 1,
              border: "1px solid",
              borderColor: BORDER,
            }}
          >
            <img
              src={post.image}
              alt=""
              style={{ width: "100%", display: "block" }}
            />
          </Box>
        )}

        {post.poll && Array.isArray(post.poll.options) && (
          <Box sx={{ mt: 1.5 }}>
            {post.poll.options.map((opt, idx) => (
              <Box key={idx} sx={{ mb: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  fullWidth
                  sx={{
                    justifyContent: "space-between",
                    textTransform: "none",
                    borderRadius: 999,
                  }}
                >
                  <span>{opt.label || opt.text || opt}</span>
                  {typeof opt.votes === "number" && (
                    <Typography variant="caption" color="text.secondary">
                      {opt.votes} votes
                    </Typography>
                  )}
                </Button>
              </Box>
            ))}
          </Box>
        )}
      </CardContent>

      {/* METRICS STRIP */}
      <Box
        sx={{
          px: 2,
          pb: 1,
          pt: 0.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        {/* Left: avatars + “liked by …” */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            minWidth: 0,
          }}
        >
          {likesCount > 0 && (
            <>
              <AvatarGroup
                max={3}
                onClick={() => (window.__openLikes && window.__openLikes(post.id))}
                sx={{
                  cursor: "pointer",
                  "& .MuiAvatar-root": {
                    width: 24,
                    height: 24,
                    fontSize: 12,
                  },
                }}
              >
                {likers.slice(0, 4).map((u) => (
                  <Avatar
                    key={u.id || u.name}
                    src={u.avatar || undefined}
                    alt={u.name || "User"}
                  >
                    {(u.name || "U").charAt(0).toUpperCase()}
                  </Avatar>
                ))}
              </AvatarGroup>

              <Typography
                variant="body2"
                sx={{
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                  overflow: "hidden",
                  maxWidth: { xs: 160, sm: 260 },
                }}
                onClick={() => (window.__openLikes && window.__openLikes(post.id))}
              >
                {likeLabel ||
                  `${likesCount} like${likesCount > 1 ? "s" : ""}`}
              </Typography>
            </>
          )}
        </Box>

        {/* Right: comments / shares count */}
        <Stack direction="row" spacing={2} sx={{ ml: "auto" }} alignItems="center">
          <Button
            size="small"
            onClick={() => (window.__openShares && window.__openShares(post.id))}
          >
            {(shareCount || 0).toLocaleString()} SHARES
          </Button>
        </Stack>
      </Box>

      {/* ACTIONS ROW */}
      <CardActions
        sx={{
          px: 1.5,
          pt: 0.5,
          pb: 1,
          display: "flex",
          justifyContent: "space-around",
          borderTop: "1px solid",
          borderColor: BORDER,
        }}
      >
        {/* LIKE */}
        <Button
          fullWidth
          startIcon={
            post.liked_by_me ? (
              <FavoriteRoundedIcon sx={{ fontSize: 18, color: "primary.main" }} />
            ) : (
              <FavoriteBorderRoundedIcon sx={{ fontSize: 18 }} />
            )
          }
          onClick={() => window.__toggleGroupPostLike?.(post.id)}
          sx={{
            textTransform: "uppercase",
            fontSize: 11,
            fontWeight: 600,
            color: post.liked_by_me ? "primary.main" : "text.secondary",
            "& .MuiButton-startIcon": { mr: 0.5 },
          }}
        >
          Like
        </Button>

        {/* COMMENT */}
        <Button
          fullWidth
          startIcon={<ChatBubbleOutlineRoundedIcon sx={{ fontSize: 18 }} />}
          onClick={() =>
            (window.__openComments && window.__openComments(post.id)) ||
            (window.__openGroupComments && window.__openGroupComments(post.id))
          }
          sx={{
            textTransform: "uppercase",
            fontSize: 11,
            fontWeight: 600,
            color: "text.secondary",
            "& .MuiButton-startIcon": { mr: 0.5 },
          }}
        >
          Comment
        </Button>

        {/* SHARE */}
        <Button
          fullWidth
          startIcon={<IosShareRoundedIcon sx={{ fontSize: 18 }} />}
          onClick={() =>
            (window.__openShares && window.__openShares(post.id)) ||
            (window.__openShareDialog && window.__openShareDialog(post.id)) ||
            (window.__openShare && window.__openShare(post.id))
          }
          sx={{
            textTransform: "uppercase",
            fontSize: 11,
            fontWeight: 600,
            color: "text.secondary",
            "& .MuiButton-startIcon": { mr: 0.5 },
          }}
        >
          Share
        </Button>
      </CardActions>
    </Card>
  );
}

function shapePost(row) {
  const m = row?.metadata || {};
  const actor =
    m.actor ||
    row.actor ||
    row.user ||
    row.owner ||
    row.created_by;

  const type = m.post_type || row.post_type || row.type || "text";

  const likeCount =
    Number(
      row.like_count ??
      row.likes_count ??
      row.likes ??
      m.like_count ??
      m.likes ??
      0
    ) || 0;

  const commentCount =
    Number(
      row.comment_count ??
      row.comments_count ??
      row.comments ??
      m.comment_count ??
      m.comments ??
      0
    ) || 0;

  const shareCount =
    Number(
      row.share_count ??
      row.shares_count ??
      row.shares ??
      m.share_count ??
      m.shares ??
      0
    ) || 0;

  const base = {
    id: row.id,
    created_at: row.created_at || row.created || row.timestamp || Date.now(),
    type,
    actor_name: nameOf(actor),
    actor_avatar: avatarOf(actor),
    liked_by_me: !!(
      row.liked_by_me ??
      row.liked ??
      row.is_liked ??
      row.me_liked ??
      m.liked_by_me
    ),
    like_count: likeCount,
    comment_count: commentCount,
    share_count: shareCount,
    metrics: {
      likes: likeCount,
      comments: commentCount,
      shares: shareCount,
    },
    likers: m.likers || row.likers || row.recent_likers || [],
  };

  const text =
    row.text ||
    m.text ||
    row.content ||
    row.body ||
    row.description ||
    row.message ||
    "";

  if (type === "link") {
    return {
      ...base,
      content: text,
      link: {
        url: m.url || row.url,
        title: m.link_title || row.link_title,
        description: m.link_description || row.link_description,
      },
    };
  }

  if (type === "image") {
    return {
      ...base,
      content: text,
      image: m.image || row.image || row.image_url,
    };
  }

  if (type === "poll") {
    return {
      ...base,
      content: text,
      poll: {
        options: m.options || row.options || [],
      },
    };
  }

  return { ...base, content: text };
}

// -----------------------------------------------------------------------------
// Tabs
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
  React.useEffect(() => {
    window.__updateSharesCount = (pid, n) => {
      setPosts(prev => prev.map(p => p.id === pid ? {
        ...p,
        share_count: n,
        metrics: { ...(p.metrics || {}), shares: n }
      } : p));
    };
    return () => { try { delete window.__updateSharesCount; } catch {} };
  }, []);

  // Global toggler to avoid changing PostCard props
  React.useEffect(() => {
    window.__toggleGroupPostLike = async (postId) => {
      // optimistic flip (also keep metrics.likes in sync)
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id !== postId) return p;
          const delta = p.liked_by_me ? -1 : +1;
          const me = (window.__me || null);
          let newLikers = Array.isArray(p.likers) ? [...p.likers] : [];
          if (delta > 0 && me) {
            // add me if missing at front
            if (!newLikers.find(x => String(x.id) === String(me.id))) {
              newLikers = [{ id: me.id, name: me.name, avatar: me.avatar }, ...newLikers].slice(0, 3);
            }
          } else if (delta < 0 && me) {
            newLikers = newLikers.filter(x => String(x.id) !== String(me.id));
          }
          return {
            ...p,
            liked_by_me: !p.liked_by_me,
            like_count: Math.max(0, (p.like_count || 0) + delta),
            metrics: {
              ...(p.metrics || {}),
              likes: Math.max(0, (p.metrics?.likes || 0) + delta),
            },
            likers: newLikers
          };

        })
      );

      // try common endpoints
      const endpoints = [
        `${API_ROOT}/engagements/reactions/toggle/`, // preferred
        `${API_ROOT}/posts/${postId}/like/`,
        `${API_ROOT}/posts/${postId}/toggle-like/`,
        `${API_ROOT}/groups/${groupId}/posts/${postId}/like/`,
      ];
      let ok = false;
      for (const url of endpoints) {
        try {
          const r = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeader() },
            body: url.endsWith("/toggle/") || url.includes("/reactions/")
              ? JSON.stringify({
                  target_type: "activity_feed.feeditem",
                  target_id: postId,
                  reaction: "like",
                })
              : undefined,
          });
          if (r.ok) { ok = true; break; }
        } catch { }
      }
      if (!ok) {
        // revert if server failed
        setPosts((prev) =>
          prev.map((p) => {
            if (p.id !== postId) return p;
            const delta = p.liked_by_me ? -1 : +1; // reverse the above
            return {
              ...p,
              liked_by_me: !p.liked_by_me,
              like_count: Math.max(0, (p.like_count || 0) + delta),
              metrics: {
                ...(p.metrics || {}),
                likes: Math.max(0, (p.metrics?.likes || 0) + delta),
              },
            };
          })
        );
      }
    };
    return () => { try { delete window.__toggleGroupPostLike; } catch { } };
  }, [groupId]);


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
      `${API_ROOT}/groups/${groupId}/member/?page_size=100`,
      `${API_ROOT}/groups/${groupId}/members/?page_size=100`,
      `${API_ROOT}/groups/${groupId}/memberships/?page_size=100`,
      `${API_ROOT}/memberships/?group=${groupId}&page_size=100`,
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
      } catch (e) {}
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
// Likes / Shares dialogs (copied style from HomePage)
// -----------------------------------------------------------------------------
function LikesDialog({ open, postId, onClose }) {
  const [loading, setLoading] = React.useState(false);
  const [likers, setLikers] = React.useState([]);

  function normalizeUser(u) {
    if (!u) return { id: null, name: "User", avatar: "" };
    const id = u.id ?? u.user_id ?? u.owner_id ?? null;
    const first = u.first_name ?? u.firstName ?? u.user_first_name ?? u.user__first_name ?? "";
    const last  = u.last_name  ?? u.lastName  ?? u.user_last_name  ?? u.user__last_name  ?? "";
    const name  = u.name || `${first} ${last}`.trim() || u.username || (id ? `User #${id}` : "User");
    const profile = u.profile || u.userprofile || u.user_profile || {};
    const avatarRaw =
      u.user_image || u.user_image_url || u.avatar || u.profile_image || u.photo || u.image_url || u.avatar_url ||
      profile.user_image_url || profile.user_image || "";
    return { id, name, avatar: toAbsolute(avatarRaw), headline: u.headline || u.job_title || u.title || u.bio || u.about || "" };
  }

  function normalizeRow(row) {
    const nested = row?.user || row?.owner || row?.liked_by || row?.actor || null;
    if (nested) return normalizeUser(nested);
    const u = {
      id: row?.user_id ?? row?.owner_id ?? row?.liked_by_id ?? null,
      first_name: row?.user_first_name ?? row?.user__first_name,
      last_name: row?.user_last_name ?? row?.user__last_name,
      username: row?.user_username ?? row?.user__username,
      user_image: row?.user_image ?? row?.user_image_url ?? row?.user_avatar ?? row?.user__avatar,
      headline: row?.user_headline,
    };
    return normalizeUser(u);
  }

  async function fetchLikers(feedId) {
    const urls = [
      `${API_ROOT}/engagements/reactions/?target_type=activity_feed.feeditem&target_id=${feedId}&reaction=like&page_size=200`,
      `${API_ROOT}/engagements/reactions/who-liked/?feed_item=${feedId}`,
    ];
    for (const url of urls) {
      try {
        const r = await fetch(url, { headers: { ...authHeader(), accept: "application/json" } });
        if (!r.ok) continue;
        const data = await r.json();
        const rows =
          Array.isArray(data?.results) ? data.results :
          Array.isArray(data) ? data :
          Array.isArray(data?.items) ? data.items :
          Array.isArray(data?.likers) ? data.likers :
          Array.isArray(data?.data) ? data.data : [];
        return rows.map(normalizeRow);
      } catch {}
    }
    return [];
  }

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      if (!open || !postId) return;
      setLoading(true);
      const list = await fetchLikers(postId);
      if (mounted) setLikers(list);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [open, postId]);

  return (
    <Dialog open={!!open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{`Liked by${likers.length ? ` (${likers.length})` : ""}`}</DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Typography variant="body2" color="text.secondary">Loading…</Typography>
        ) : likers.length === 0 ? (
          <Typography variant="body2" color="text.secondary">No likes yet.</Typography>
        ) : (
          <List dense>
            {likers.map((u) => (
              <ListItem key={u.id || u.name} disableGutters>
                <ListItemAvatar><Avatar src={u.avatar}>{(u.name || "U").slice(0,1).toUpperCase()}</Avatar></ListItemAvatar>
                <ListItemText
                  primary={u.name}
                  secondary={u.headline || null}
                  primaryTypographyProps={{ variant: "body2", fontWeight: 600 }}
                  secondaryTypographyProps={{ variant: "caption" }}
                />
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Close</Button></DialogActions>
    </Dialog>
  );
}

function SharesDialog({ open, postId, onClose }) {
  const [loading, setLoading] = React.useState(false);
  const [sharers, setSharers] = React.useState([]);

  function normalizeUser(u) {
    if (!u) return { id: null, name: "User", avatar: "" };
    const id = u.id ?? u.user_id ?? u.owner_id ?? null;
    const first = u.first_name ?? u.firstName ?? u.user_first_name ?? u.user__first_name ?? "";
    const last  = u.last_name  ?? u.lastName  ?? u.user_last_name  ?? u.user__last_name  ?? "";
    const name  = u.name || `${first} ${last}`.trim() || u.username || (id ? `User #${id}` : "User");
    const profile = u.profile || u.userprofile || u.user_profile || {};
    const avatarRaw =
      profile.user_image_url || profile.user_image ||
      u.user_image || u.user_image_url || u.avatar || u.profile_image || u.photo || u.image_url || u.avatar_url || "";
    return { id, name, avatar: toAbsolute(avatarRaw), headline: u.headline || u.job_title || u.title || u.bio || u.about || "" };
  }
  function normalizeShareRow(row) {
    const nested = row?.user || row?.owner || row?.actor || row?.shared_by || row?.created_by || row?.sharer || row?.sharer_user || null;
    if (nested) return normalizeUser(nested);
    const profile = row?.profile || row?.user_profile || row?.actor_profile || row?.user?.profile || row?.actor?.profile || null;
    const u = {
      id: row?.user_id ?? row?.owner_id ?? row?.actor_id ?? null,
      first_name: row?.user_first_name ?? row?.user__first_name,
      last_name: row?.user_last_name ?? row?.user__last_name,
      username: row?.user_username ?? row?.user__username,
      name: row?.actor_name ?? row?.user_full_name ?? row?.full_name,
      user_image:
        row?.actor_avatar ?? row?.user_image ?? row?.user_image_url ?? row?.user_avatar ?? row?.user__avatar ??
        profile?.user_image_url ?? profile?.user_image ?? "",
      headline: row?.user_headline,
      profile: profile || undefined,
    };
    return normalizeUser(u);
  }

  async function fetchSharers(feedId) {
    const urls = [
      `${API_ROOT}/engagements/shares/?target_type=activity_feed.feeditem&target_id=${feedId}&page_size=200`,
      `${API_ROOT}/engagements/shares/?feed_item=${feedId}&page_size=200`,
    ];
    for (const url of urls) {
      try {
        const r = await fetch(url, { headers: { ...authHeader(), accept: "application/json" } });
        if (!r.ok) continue;
        const data = await r.json();
        const rows =
          Array.isArray(data?.results) ? data.results :
          Array.isArray(data) ? data :
          Array.isArray(data?.items) ? data.items :
          Array.isArray(data?.shares) ? data.shares :
          Array.isArray(data?.data) ? data.data : [];
        return rows.map(normalizeShareRow);
      } catch {}
    }
    return [];
  }

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      if (!open || !postId) return;
      setLoading(true);
      const list = await fetchSharers(postId);

      const seen = new Set();
      const unique = [];
      for (const u of list) {
        const key = (u.id != null) ? `id:${u.id}` : `name:${(u.name || "").toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        unique.push(u);
      }

      if (mounted) setSharers(unique);
      try { window.__updateSharesCount && window.__updateSharesCount(postId, unique.length); } catch {}

      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [open, postId]);

  return (
    <Dialog open={!!open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{`Shared by${sharers.length ? ` (${sharers.length})` : ""}`}</DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Typography variant="body2" color="text.secondary">Loading…</Typography>
        ) : sharers.length === 0 ? (
          <Typography variant="body2" color="text.secondary">No shares yet.</Typography>
        ) : (
          <List dense>
            {sharers.map((u) => (
              <ListItem key={`${u.id || u.name}-share`} disableGutters>
                <ListItemAvatar><Avatar src={u.avatar}>{(u.name || "U").slice(0,1).toUpperCase()}</Avatar></ListItemAvatar>
                <ListItemText
                  primary={u.name}
                  secondary={u.headline || null}
                  primaryTypographyProps={{ variant: "body2", fontWeight: 600 }}
                  secondaryTypographyProps={{ variant: "caption" }}
                />
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Close</Button></DialogActions>
    </Dialog>
  );
}

// -----------------------------------------------------------------------------
// Comments dialog (group-aware) — now uses engagements endpoints + nests replies
// -----------------------------------------------------------------------------
function CommentsDialog({
  open,
  postId,
  groupId,
  onClose,
  inline = false,
  initialCount = 3,
  inputRef = null,
}) {
  const [loading, setLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [comments, setComments] = React.useState([]);
  const [text, setText] = React.useState("");
  const [replyingTo, setReplyingTo] = React.useState(null);
  const [replyText, setReplyText] = React.useState("");
  const [visibleCount, setVisibleCount] = React.useState(initialCount);

  function normalizeUser(u) {
    if (!u) return { id: null, name: "User", avatar: "" };
    const id = u.id ?? u.user_id ?? null;
    const first = u.first_name ?? u.firstName ?? u.user_first_name ?? u.user__first_name ?? "";
    const last  = u.last_name  ?? u.lastName  ?? u.user_last_name  ?? u.user__last_name  ?? "";
    const name =
      u.name ||
      u.full_name ||
      `${first} ${last}`.trim() ||
      u.username ||
      (id ? `User #${id}` : "User");

    const profile = u.profile || u.userprofile || u.user_profile || {};
    const avatarRaw =
      u.user_image || u.user_image_url || u.avatar || u.profile_image || u.photo || u.image_url || u.avatar_url ||
      profile.user_image_url || profile.user_image || "";
    return { id, name, avatar: toAbsolute(avatarRaw) };
  }

  function normalizeFlat(row) {
    const author = normalizeUser(row.author || row.user || row.created_by || row.owner || row.actor || {});
    return {
      id: row.id,
      body: row.text || row.body || row.content || "",
      created: row.created_at || row.created || row.timestamp || null,
      likedByMe: !!(row.liked || row.liked_by_me || row.user_has_liked),
      likeCount: Number(row.like_count ?? row.likes ?? 0) || 0,
      canDelete: !!(row.can_delete || row.is_owner || row.is_mine),
      parent: row.parent || row.parent_id || row.reply_to || null,
      author,
      replies: [],
    };
  }

  function buildTree(rows) {
    const byId = new Map();
    rows.forEach(r => byId.set(r.id, { ...r, replies: [] }));
    const roots = [];
    rows.forEach(r => {
      const node = byId.get(r.id);
      if (r.parent && byId.has(r.parent)) {
        byId.get(r.parent).replies.push(node);
      } else {
        roots.push(node);
      }
    });
    // newest first at root
    roots.sort((a, b) => new Date(b.created || 0) - new Date(a.created || 0));
    return roots;
  }

  async function fetchComments(feedId) {
    const candidates = [
      // engagements-first (works on HomePage)
      `${API_ROOT}/engagements/comments/?target_type=activity_feed.feeditem&target_id=${feedId}&page_size=200`,
      // group-scoped
      ...(groupId ? [`${API_ROOT}/groups/${groupId}/posts/${feedId}/comments/`] : []),
      // generic fallbacks
      `${API_ROOT}/posts/${feedId}/comments/`,
      `${API_ROOT}/comments/?post=${feedId}`,
    ];
    for (const url of candidates) {
      try {
        const r = await fetch(url, { headers: { ...authHeader(), accept: "application/json" } });
        if (!r.ok) continue;
        const data = await r.json();
        const rows = Array.isArray(data?.results) ? data.results :
                     Array.isArray(data) ? data :
                     Array.isArray(data?.comments) ? data.comments : [];
        if (!rows.length) return [];
        const flat = rows.map(normalizeFlat);
        return buildTree(flat);
      } catch {}
    }
    return [];
  }

  async function createComment(feedId, body, parentId = null) {
    const text = (body || "").trim();
    if (!text) return null;

    // 1) engagements — correct shapes:
    //    - root: needs target_type/target_id
    //    - reply: ONLY parent (backend inherits target from parent)
    try {
      const payload = parentId
        ? { text, parent: parentId }                         // reply
        : { text, target_type: "activity_feed.feeditem", target_id: feedId }; // root
      const r = await fetch(`${API_ROOT}/engagements/comments/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify(payload),
      });
      if (r.ok) return normalizeFlat(await r.json());
    } catch {}

    // 2) group-scoped fallback
    if (groupId) {
      try {
        const r = await fetch(`${API_ROOT}/groups/${groupId}/posts/${feedId}/comments/`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader() },
          body: JSON.stringify(parentId ? { text, parent: parentId } : { text }),
        });
        if (r.ok) return normalizeFlat(await r.json());
      } catch {}
    }

    // 3) generic fallbacks
    try {
      const r = await fetch(`${API_ROOT}/posts/${feedId}/comments/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify(parentId ? { text, parent: parentId } : { text }),
      });
      if (r.ok) return normalizeFlat(await r.json());
    } catch {}

    try {
      const r = await fetch(`${API_ROOT}/comments/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ post: feedId, text, parent: parentId || undefined }),
      });
      if (r.ok) return normalizeFlat(await r.json());
    } catch {}

    throw new Error("Could not create comment");
  }


  async function toggleLikeComment(commentId) {
    const candidates = [
      `${API_ROOT}/comments/${commentId}/toggle-like/`,
      `${API_ROOT}/comments/${commentId}/like/`,
      `${API_ROOT}/engagements/comments/${commentId}/toggle-like/`,
      // generic reaction toggle against comment content type
      { url: `${API_ROOT}/engagements/reactions/toggle/`, body: { target_type: "engagements.comment", target_id: commentId, reaction: "like" } },
    ];
    for (const c of candidates) {
      try {
        if (typeof c === "string") {
          const r = await fetch(c, { method: "POST", headers: { ...authHeader(), accept: "application/json" } });
          if (r.ok) return true;
        } else {
          const r = await fetch(c.url, { method: "POST", headers: { "Content-Type": "application/json", ...authHeader() }, body: JSON.stringify(c.body) });
          if (r.ok) return true;
        }
      } catch {}
    }
    return false;
  }

  async function deleteComment(commentId) {
    const candidates = [
      `${API_ROOT}/comments/${commentId}/`,
      `${API_ROOT}/comments/${commentId}/delete/`,
      `${API_ROOT}/engagements/comments/${commentId}/`,
      `${API_ROOT}/engagements/comments/${commentId}/delete/`,
    ];
    for (const url of candidates) {
      try {
        const r = await fetch(url, {
          method: url.endsWith("/delete/") ? "POST" : "DELETE",
          headers: { ...authHeader(), accept: "application/json" },
        });
        if (r.ok || r.status === 204) return true;
      } catch {}
    }
    return false;
  }

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      if ((!inline && !open) || !postId) return;
      setLoading(true);
      const list = await fetchComments(postId);
      if (mounted) {
        setComments(list);
        setVisibleCount(initialCount);
      }
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [open, inline, postId, groupId, initialCount]);

  const onSubmitNew = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      const c = await createComment(postId, text.trim(), null);
      setComments((prev) => [c, ...prev]); // newest at top
      setText("");
    } catch (e) { alert(e.message || "Failed to add comment"); }
    setSubmitting(false);
  };

  const onSubmitReply = async () => {
    if (!replyingTo || !replyText.trim()) return;
    setSubmitting(true);
    try {
      const c = await createComment(postId, replyText.trim(), replyingTo);
      setComments((prev) =>
        prev.map((p) => (p.id === replyingTo ? { ...p, replies: [...(p.replies || []), c] } : p))
      );
      setReplyingTo(null);
      setReplyText("");
    } catch (e) { alert(e.message || "Failed to reply"); }
    setSubmitting(false);
  };

  const onLike = async (id) => {
    setComments((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, likedByMe: !c.likedByMe, likeCount: c.likedByMe ? Math.max(0, c.likeCount - 1) : c.likeCount + 1 }
          : c
      )
    );
    const ok = await toggleLikeComment(id);
    if (!ok) {
      // revert
      setComments((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, likedByMe: !c.likedByMe, likeCount: c.likedByMe ? Math.max(0, c.likeCount - 1) : c.likeCount + 1 }
            : c
        )
      );
    }
  };

  const onDelete = async (id, isReply = false, parentId = null) => {
    const ok = await deleteComment(id);
    if (!ok) return alert("Delete failed");
    setComments((prev) => {
      if (!isReply) return prev.filter((c) => c.id !== id);
      return prev.map((p) => (p.id === parentId ? { ...p, replies: (p.replies || []).filter((r) => r.id !== id) } : p));
    });
  };

  const Item = ({ c, depth = 0, parentId = null }) => (
    <Box sx={{ pl: depth ? 5 : 0, py: 1 }}>
      <Stack direction="row" spacing={1}>
        <Avatar src={c.author.avatar}>{(c.author.name[0] || "").toUpperCase()}</Avatar>
        <Box sx={{ flex: 1 }}>
          <Stack direction="row" alignItems="baseline" spacing={1}>
            <Typography variant="subtitle2">{c.author.name}</Typography>
            {c.created && <Typography variant="caption" color="text.secondary">{timeAgo(c.created)}</Typography>}
          </Stack>
          <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", mt: 0.25 }}>{c.body}</Typography>

          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
            <IconButton size="small" onClick={() => onLike(c.id)}>
              {c.likedByMe ? <FavoriteRoundedIcon fontSize="small" /> : <FavoriteBorderRoundedIcon fontSize="small" />}
            </IconButton>
            <Typography variant="caption">{c.likeCount || 0}</Typography>

            <Button size="small" startIcon={<ReplyRoundedIcon />} onClick={() => { setReplyingTo(c.id); setReplyText(""); }}>
              Reply
            </Button>

            {c.canDelete && (
              <Button size="small" color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={() => onDelete(c.id, !!parentId, parentId)}>
                Delete
              </Button>
            )}
          </Stack>

          {c.replies && c.replies.length > 0 && (
            <Box sx={{ mt: 1 }}>
              {c.replies.map((r) => <Item key={r.id} c={r} depth={1} parentId={c.id} />)}
            </Box>
          )}

          {replyingTo === c.id && (
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <TextField
                size="small"
                fullWidth
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a reply…"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onSubmitReply();
                  }
                }}
              />

              <Button variant="contained" onClick={onSubmitReply} disabled={submitting || !replyText.trim()}>
                Send
              </Button>
              <Button onClick={() => { setReplyingTo(null); setReplyText(""); }}>Cancel</Button>
            </Stack>
          )}
        </Box>
      </Stack>
    </Box>
  );

  if (inline) {
    const roots = comments;
    const visibleRoots = roots.slice(0, visibleCount);
    const hasMore = roots.length > visibleRoots.length;

    return (
      <Box sx={{ mt: 1 }}>
        <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
          <TextField
            size="small"
            fullWidth
            placeholder="Write a comment…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            inputRef={inputRef || undefined}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSubmitNew();
              }
            }}
          />
          <Button variant="contained" onClick={onSubmitNew} disabled={submitting || !text.trim()}>
            Post
          </Button>
        </Stack>

        {loading ? (
          <Stack alignItems="center" py={1.5}><CircularProgress size={18} /></Stack>
        ) : visibleRoots.length === 0 ? (
          <Typography variant="caption" color="text.secondary">Be the first to comment.</Typography>
        ) : (
          <Box>
            {visibleRoots.map((c) => <Item key={c.id} c={c} />)}
          </Box>
        )}

        {hasMore && (
          <Box sx={{ mt: 1 }}>
            <Button size="small" onClick={() => setVisibleCount((v) => v + initialCount)}>
              Load more comments
            </Button>
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Dialog open={!!open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Comments</DialogTitle>
      <DialogContent dividers sx={{ pt: 1 }}>
        {loading ? (
          <Typography variant="body2" color="text.secondary">Loading comments…</Typography>
        ) : comments.length === 0 ? (
          <Typography variant="body2" color="text.secondary">No comments yet. Be the first to comment!</Typography>
        ) : (
          <Box>{comments.map((c) => <Item key={c.id} c={c} />)}</Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Write a comment…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <Button variant="contained" onClick={onSubmitNew} disabled={submitting || !text.trim()}>
          Post
        </Button>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

// -----------------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------------
export default function GroupDetailsPage() {
  const navigate = useNavigate();
  const { groupId } = useParams();
  const [tab, setTab] = React.useState(2); // default to OVERVIEW
  const [group, setGroup] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [me, setMe] = React.useState(null);

  // comments dialog
  const [commentOpen, setCommentOpen] = React.useState(false);
  const [commentPostId, setCommentPostId] = React.useState(null);

  // NEW: likes / shares dialogs (wire same as HomePage)
  const [likesOpen, setLikesOpen] = React.useState(false);
  const [likesPostId, setLikesPostId] = React.useState(null);
  const [sharesOpen, setSharesOpen] = React.useState(false);
  const [sharesPostId, setSharesPostId] = React.useState(null);

  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_ROOT}/users/me/`, {
          headers: { ...authHeader(), accept: "application/json" },
        });
        if (res.ok) {
          const user = await res.json();
          setMe(user);
          // --- 2c) Expose current user for optimistic like avatars (same as Home) ---
          try {
            window.__me = {
              id: user.id ?? user.user?.id ?? null,
              name: nameOf(user),
              avatar: avatarOf(user),
            };
          } catch {}
        }
      } catch {}
    })();
  }, []);

  // expose openers just like HomePage so PostCard hooks work
  React.useEffect(() => {
    window.__openGroupComments = (postId) => { setCommentPostId(postId); setCommentOpen(true); };
    window.__openComments = (postId) => { setCommentPostId(postId); setCommentOpen(true); };
    window.__openLikes = (postId) => { setLikesPostId(postId); setLikesOpen(true); };
    window.__openShares = (postId) => { setSharesPostId(postId); setSharesOpen(true); };
    window.__openShare = (postId) => { setSharesPostId(postId); setSharesOpen(true); };
    window.__openShareDialog = (postId) => { setSharesPostId(postId); setSharesOpen(true); };
    return () => {
      try {
        delete window.__openGroupComments;
        delete window.__openComments;
        delete window.__openLikes;
        delete window.__openShares;
        delete window.__openShare;
        delete window.__openShareDialog;
      } catch {}
    };
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

        if (parentId && !parentName) {
          try {
            const pres = await fetch(`${API_ROOT}/groups/${parentId}/`, {
              headers: { ...authHeader(), accept: "application/json" },
            });
            if (pres.ok) {
              const pdata = await pres.json();
              parentName = pdata.name || pdata.title || pdata.display_name || parentName;
            }
          } catch {}
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
      } catch {}
    }
    setGroup(null);
    setLoading(false);
  }, [groupId]);

  React.useEffect(() => { fetchGroup(); }, [fetchGroup]);

  return (
    <Box sx={{ width: "100%", py: { xs: 2, md: 3 } }}>
      <Box sx={{ display: "flex", gap: 3, px: { xs: 2, sm: 2, md: 3 }, maxWidth: "1200px", mx: "auto" }}>
        {/* LEFT: sidebar */}
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
          <CommunitySidebar
            view="feed"
            onChangeView={(key) =>
              navigate(key === "home" ? "/community" : `/community?view=${key}`)
            }
          />
        </Box>

        {/* RIGHT: content */}
        <CommunityRightRailLayout user={me}>
          {/* Header */}
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
                justifyContent="space-between"
              >
                <Stack
                  direction="row"
                  spacing={2.5}
                  alignItems="center"
                  sx={{ flex: 1 }}
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
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
                      {loading ? "Loading…" : (group?.name || "Group")}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {loading ? "" : `${group?.member_count ?? 0} members`}
                    </Typography>
                  </Box>
                </Stack>

                <Button
                  variant="contained"
                  startIcon={<ChatBubbleOutlineRoundedIcon />}
                  onClick={() =>
                    navigate(`/community?view=messages&groupId=${groupId}`)
                  }
                  sx={{ mt: { xs: 1, sm: 0 } }}
                >
                  Message
                </Button>
              </Stack>
            </CardContent>
          </Card>

          {/* Tabs */}
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
                <Tab icon={<ArticleOutlinedIcon />} iconPosition="start" label="POSTS" />
                <Tab icon={<PeopleOutlineRoundedIcon />} iconPosition="start" label="MEMBERS" />
                <Tab icon={<InfoOutlinedIcon />} iconPosition="start" label="OVERVIEW" />
              </Tabs>
            </Box>

            <CardContent sx={{ p: 3 }}>
              {tab === 0 && <PostsTab groupId={groupId} />}
              {tab === 1 && <MembersTab groupId={groupId} />}
              {tab === 2 && <OverviewTab group={group} />}
            </CardContent>
          </Card>
        </CommunityRightRailLayout>
      </Box>

      {/* dialogs */}
      <CommentsDialog
        open={commentOpen}
        postId={commentPostId}
        groupId={groupId}
        onClose={() => setCommentOpen(false)}
      />
      <LikesDialog
        open={likesOpen}
        postId={likesPostId}
        onClose={() => setLikesOpen(false)}
      />
      <SharesDialog
        open={sharesOpen}
        postId={sharesPostId}
        onClose={() => setSharesOpen(false)}
      />
    </Box>
  );
}
