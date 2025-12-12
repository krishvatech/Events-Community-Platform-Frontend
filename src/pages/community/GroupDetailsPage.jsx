// src/pages/community/GroupDetailsPage.jsx
import * as React from "react";
import { useParams, Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Avatar, AvatarGroup, Box, Button, Card, CardContent,
  Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider,
  Grid, IconButton, InputAdornment, List, ListItem, ListItemAvatar,
  ListItemText, ListItemButton, ListItemSecondaryAction, Pagination,
  Paper, Popover, Stack, Tab, Tabs, TextField, Tooltip, Typography,
  CircularProgress, LinearProgress, Link, Checkbox
} from "@mui/material";

// Icons
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import IosShareIcon from "@mui/icons-material/IosShare";
import ThumbUpAltOutlinedIcon from "@mui/icons-material/ThumbUpAltOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import SearchIcon from "@mui/icons-material/Search";
import PeopleOutlineRoundedIcon from "@mui/icons-material/PeopleOutlineRounded";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import CommunityProfileCard from "../../components/CommunityProfileCard.jsx";
import CommunitySidebar from "../../components/CommunitySideBar.jsx";

// -----------------------------------------------------------------------------
// 1. CONSTANTS & API HELPERS
// -----------------------------------------------------------------------------

const BORDER = "#e2e8f0";
const POST_REACTIONS = [
  { id: "like", emoji: "👍", label: "Like" },
  { id: "intriguing", emoji: "🤔", label: "Intriguing" },
  { id: "spot_on", emoji: "🎯", label: "Spot On" },
  { id: "validated", emoji: "🧠", label: "Validated" },
  { id: "debatable", emoji: "🤷", label: "Debatable" },
];

const RAW_BASE =
  (typeof window !== "undefined" && window.API_BASE_URL) ||
  import.meta?.env?.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000";

const ORIGIN = String(RAW_BASE).trim().replace(/\/+$/, "");
const API_BASE = /\/api(\/|$)/i.test(ORIGIN) ? ORIGIN : `${ORIGIN}/api`;
const API_ORIGIN = API_BASE.replace(/\/api(\/|$)/i, "");

function toMediaUrl(p) {
  if (!p) return "";
  try { return new URL(p).toString(); } catch { }
  const rel = String(p).replace(/^\/+/, "");
  const keepAsIs = /^(media|static|uploads|images|files|storage)\//i.test(rel);
  return `${API_ORIGIN}/${keepAsIs ? rel : `media/${rel}`}`;
}

function toApiUrl(pathOrUrl) {
  if (!pathOrUrl) return API_BASE;
  try {
    return new URL(pathOrUrl).toString();
  } catch {
    const rel = String(pathOrUrl).replace(/^\/+/, "");
    const relNoApi = rel.replace(/^api\/+/, "");
    return `${API_BASE}/${relNoApi}`;
  }
}

function authHeaders() {
  const token =
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    sessionStorage.getItem("access") ||
    sessionStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Cached User Fetcher
let _meCache = null;
async function getMeCached() {
  if (_meCache) return _meCache;
  try {
    const r = await fetch(toApiUrl("users/me/"), { headers: { ...authHeaders(), Accept: "application/json" } });
    _meCache = r.ok ? await r.json() : null;
  } catch { _meCache = null; }
  return _meCache;
}

// ⬇️ NEW: Helper for concurrent fetching (needed for comments+replies)
async function runLimited(items, limit, worker) {
  const ret = new Array(items.length);
  let i = 0;
  const pool = new Set();
  async function runOne(idx) {
    const p = worker(items[idx]).then((res) => { ret[idx] = res; }).finally(() => pool.delete(p));
    pool.add(p);
    if (pool.size >= limit) await Promise.race(pool);
  }
  while (i < items.length) await runOne(i++);
  await Promise.all(pool);
  return ret;
}

function formatWhen(ts) {
  try { return new Date(ts).toLocaleString(); } catch { return ts; }
}

function pickId(...cands) {
  for (const v of cands) {
    if (v === 0 || v === "0") return 0;
    if (v !== null && v !== undefined && v !== "" && v !== "null") {
      const n = Number(v);
      return Number.isFinite(n) ? n : v;
    }
  }
  return null;
}

function engageTargetOf(post) {
  if (post?.engage?.id) return post.engage;
  if (post?.type === "resource" && post?.resource?.id) {
    return { type: "content.resource", id: Number(post.resource.id) };
  }
  if (post?.type === "event" && (post?.event?.id || post?.id)) {
    return { type: "events.event", id: Number(post.event?.id || post.id) };
  }
  return { type: null, id: Number(post.id) };
}

async function fetchBatchMetrics(ids) {
  if (!ids?.length) return {};
  const url = toApiUrl(`engagements/metrics/?ids=${ids.join(",")}`);
  try {
    const res = await fetch(url, { headers: { Accept: "application/json", ...authHeaders() } });
    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {};
  }
}

// -----------------------------------------------------------------------------
// 2. ROBUST FEED MAPPER
// -----------------------------------------------------------------------------
function mapFeedItem(item) {
  const rawMeta = item?.metadata ?? item?.meta ?? item?.data ?? item?.payload ?? null;
  let m = {};
  if (rawMeta) {
    if (typeof rawMeta === "string") {
      try { m = JSON.parse(rawMeta); } catch { m = {}; }
    } else if (typeof rawMeta === "object") {
      m = rawMeta;
    }
  }

  // Fallback for flat group post structures
  if (!m.text && !m.content) m = { ...item, ...m };

  const verb = String(item?.verb || item?.action || item?.activity || "").toLowerCase();
  const isEventVerb = verb.includes("event");

  const rawAuthor = item.actor || item.author || item.user || item.owner || item.created_by || {};
  const authorId =
    rawAuthor.id ??
    item.actor_id ??
    item.user_id ??
    item.author_id ??
    m.user_id ??
    null;

  const displayName =
    rawAuthor.name ||
    rawAuthor.full_name ||
    rawAuthor.username ||
    item.actor_name ||
    item.actor_username ||
    (authorId ? `User #${authorId}` : "Unknown User");

  const authorAvatar =
    rawAuthor.avatar ||
    rawAuthor.avatar_url ||
    rawAuthor.user_image ||
    item.actor_avatar ||
    m.author_avatar ||
    "";

  const base = {
    id: item.id,
    created_at: item.created_at || item.created,
    author_id: authorId,
    author: {
      id: authorId,
      name: displayName,
      avatar: toMediaUrl(authorAvatar),
    },
    group_id: item.group_id ?? m.group_id ?? null,
    group: m.group_name ?? null,
    metrics: {
      likes: Number(m.likes ?? item.like_count ?? 0),
      comments: Number(m.comments ?? item.comment_count ?? 0),
      shares: Number(m.shares ?? item.share_count ?? 0),
    },
    user_has_liked: !!(item.liked_by_me ?? item.user_has_liked ?? false),
    my_reaction: item.my_reaction || (item.liked_by_me ? "like" : null),
  };

  if (m.is_hidden || m.is_deleted) return null;

  const t = (m.type || m.post_type || item.type || "text").toLowerCase();

  // IMAGE
  if (t === "image" || m.image || m.image_url || m.imageUrl) {
    return {
      ...base,
      type: "image",
      text: m.text || m.caption || m.title || "",
      image_url: m.image || m.image_url || m.imageUrl || m.file || "",
    };
  }

  // POLL
  if (t === "poll" || Array.isArray(m.options) || m.poll_id) {
    const question = m.question ?? item.question ?? item.title ?? "";
    const options = (m.options || []).map((o, i) => ({
      id: o.id ?? o.option_id ?? i + 1,
      label: o.text ?? o.label ?? String(o),
      votes: o.vote_count ?? o.votes ?? 0,
    }));
    return {
      ...base,
      type: "poll",
      text: question,
      poll_id: pickId(m.poll_id, item.poll_id, item.target_object_id, item.id),
      options,
      user_votes: m.user_votes || [],
      is_closed: Boolean(m.is_closed),
    };
  }

  // EVENT
  if (t === "event" || t === "event_update" || isEventVerb) {
    const eventId = m.event_id ?? item.target_object_id ?? item.id;
    return {
      ...base,
      type: "event",
      text: m.description || m.summary || m.text || "",
      event: {
        id: eventId,
        title: m.event_title || m.title || "Event",
        when: m.start_time || m.time || "",
        where: m.venue || m.location || "",
      },
      engage: eventId ? { type: "events.event", id: Number(eventId) } : undefined,
    };
  }

  // RESOURCE
  if (t === "resource" || t === "file" || t === "link" || t === "video" || m.resource_id) {
    const rid = m.resource_id ?? item.object_id ?? item.id;
    return {
      ...base,
      type: "resource",
      text: m.description || m.text || "",
      resource: {
        id: rid,
        title: m.title || "Resource",
        file_url: toMediaUrl(m.file_url || m.file || ""),
        link_url: m.link_url || null,
        video_url: toMediaUrl(m.video_url || ""),
      },
      engage: rid ? { type: "content.resource", id: Number(rid) } : undefined,
    };
  }

  // LINK (Simple)
  if ((t === "link" || m.url) && !m.resource_id) {
    return {
      ...base,
      type: "link",
      text: m.text || "",
      url: m.url,
      url_title: m.url_title,
      url_desc: m.url_desc,
    };
  }

  // DEFAULT TEXT
  return {
    ...base,
    type: "text",
    text: m.text || m.content || ""
  };
}

// -----------------------------------------------------------------------------
// 3. UI BLOCKS
// -----------------------------------------------------------------------------

function PollBlock({ post, onVote }) {
  const userVotes = Array.isArray(post.user_votes) ? post.user_votes : [];
  const totalVotes = (post.options || []).reduce(
    (sum, o) => sum + (typeof o.votes === "number" ? o.votes : (o.vote_count || 0)), 0
  );
  const canVote = !post.is_closed;

  return (
    <Box>
      {post.text && <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>{post.text}</Typography>}
      <Stack spacing={1}>
        {(post.options || []).map((opt) => {
          const optionId = opt.id ?? opt.option_id;
          const label = opt.label ?? opt.text ?? String(opt);
          const votes = typeof opt.votes === "number" ? opt.votes : (opt.vote_count ?? 0);
          const percent = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
          const chosen = optionId && userVotes.includes(optionId);

          const tryVote = () => {
            if (!canVote || chosen) return;
            onVote?.(optionId);
          };

          return (
            <Paper
              key={optionId ?? label}
              variant="outlined"
              onClick={tryVote}
              sx={{
                p: 1, borderRadius: 2, borderColor: BORDER,
                bgcolor: chosen ? "action.selected" : "background.paper",
                cursor: canVote && !chosen ? "pointer" : "default",
                "&:hover": canVote && !chosen ? { borderColor: "primary.main" } : undefined,
              }}
            >
              <Stack spacing={0.5}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{label}</Typography>
                  {chosen && <Chip size="small" icon={<CheckCircleOutlineIcon sx={{ fontSize: 16 }} />} label="Your vote" color="success" variant="outlined" />}
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{percent}%</Typography>
                </Stack>
                <LinearProgress variant="determinate" value={percent} sx={{ height: 8, borderRadius: 1 }} />
              </Stack>
            </Paper>
          );
        })}
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
        Total: {totalVotes} vote{totalVotes === 1 ? "" : "s"}{post.is_closed ? " · Poll closed" : ""}
      </Typography>
    </Box>
  );
}

function EventBlock({ post, onOpen }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, borderColor: BORDER, bgcolor: "#fafafa" }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{post.event?.title}</Typography>
      <Typography variant="caption" color="text.secondary">
        {post.event?.when ? new Date(post.event.when).toLocaleString() : ""} · {post.event?.where}
      </Typography>
      {post.text && <ExpandableText text={post.text} maxLines={5} wrapperSx={{ mt: 1 }} />}
      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
        <Button size="small" variant="contained" onClick={onOpen} startIcon={<ThumbUpAltOutlinedIcon />}>
          View Event
        </Button>
      </Stack>
    </Paper>
  );
}

function ResourceBlock({ post }) {
  const r = post.resource || {};
  const hasVideo = !!r.video_url;
  const primaryHref = r.link_url || r.file_url || r.video_url;

  const ytId = (r.video_url || "").match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/)?.[1];
  const vmId = (r.video_url || "").match(/vimeo\.com\/(\d+)/)?.[1];
  const iframeSrc = ytId ? `https://www.youtube.com/embed/${ytId}` : vmId ? `https://player.vimeo.com/video/${vmId}` : null;

  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, borderColor: BORDER, bgcolor: "#fafafa" }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{r.title}</Typography>
      {post.text && <ExpandableText text={post.text} maxLines={5} wrapperSx={{ mt: 1 }} />}

      {hasVideo && (
        <Box sx={{ mt: 1 }}>
          {iframeSrc ? (
            <Box component="iframe" src={iframeSrc} allowFullScreen sx={{ width: "100%", height: 360, border: 0, borderRadius: 2 }} />
          ) : (
            <Box component="video" src={r.video_url} controls sx={{ width: "100%", maxHeight: 420, borderRadius: 2 }} />
          )}
        </Box>
      )}

      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
        {primaryHref && (
          <Button size="small" variant="contained" component="a" href={primaryHref} target="_blank">
            {hasVideo ? "Watch Video" : r.link_url ? "Open Link" : "View File"}
          </Button>
        )}
      </Stack>
    </Paper>
  );
}

// -----------------------------------------------------------------------------
// 4. COMMENTS & SHARES (UPDATED FOR REPLY FETCHING)
// -----------------------------------------------------------------------------

function normalizeCommentRow(c) {
  const parent_id = c.parent_id ?? (typeof c.parent === "number" ? c.parent : c.parent?.id) ?? null;
  const rawAuthor = c.author || c.user || c.created_by || {};
  const author_id = rawAuthor.id ?? c.author_id ?? c.user_id ?? null;
  const name = rawAuthor.name || rawAuthor.full_name || rawAuthor.username || `User #${author_id}`;
  const avatar = toMediaUrl(rawAuthor.avatar || rawAuthor.avatar_url || rawAuthor.user_image || "");

  return {
    ...c,
    parent_id,
    author_id,
    author: { id: author_id, name, avatar },
  };
}

function CommentsDialog({ open, onClose, postId, target, inline = false, initialCount = 3, onBumpCount, inputRef }) {
  const [loading, setLoading] = React.useState(false);
  const [items, setItems] = React.useState([]);
  const [text, setText] = React.useState("");
  const [replyTo, setReplyTo] = React.useState(null);
  const [visibleCount, setVisibleCount] = React.useState(initialCount);

  const load = React.useCallback(async () => {
    if (!postId && !target?.id) return;
    if (!inline && !open) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (target?.id) {
        if (target?.type) params.set("target_type", target.type);
        params.set("target_id", String(target.id));
      } else {
        params.set("target_id", String(postId));
      }
      params.set("page_size", "100");
      const r = await fetch(toApiUrl(`engagements/comments/?${params.toString()}`), {
        headers: { Accept: "application/json", ...authHeaders() },
      });
      const j = r.ok ? await r.json() : [];
      const flatRaw = Array.isArray(j?.results) ? j.results : (Array.isArray(j) ? j : []);
      const rootsOnly = flatRaw.map(normalizeCommentRow);

      // ⬇️ FIX: Fetch replies for these roots! (Live Feed Style)
      const replyUrls = rootsOnly.map((root) =>
        toApiUrl(`engagements/comments/?parent=${root.id}&page_size=100`)
      );

      const replyPages = await runLimited(replyUrls, 3, async (url) => {
        try {
          const rr = await fetch(url, { headers: { Accept: "application/json", ...authHeaders() } });
          return rr.ok ? await rr.json() : [];
        } catch { return []; }
      });

      const replies = replyPages.flatMap((jr) => {
        const arr = Array.isArray(jr?.results) ? jr.results : (Array.isArray(jr) ? jr : []);
        return arr.map(normalizeCommentRow);
      });

      const flat = [...rootsOnly, ...replies];
      setItems(flat);

      // Hydrate counts
      try {
        const ids = flat.map(c => c.id);
        if (ids.length) {
          const resCounts = await fetch(toApiUrl(`engagements/reactions/counts/?target_type=comment&ids=${ids.join(",")}`), { headers: { ...authHeaders() } });
          if (resCounts.ok) {
            const p = await resCounts.json();
            const map = p?.results || {};
            setItems(curr => curr.map(c => {
              const m = map[String(c.id)];
              return m ? { ...c, like_count: m.like_count ?? c.like_count, user_has_liked: !!m.user_has_liked } : c;
            }));
          }
        }
      } catch { }

    } catch { setItems([]); }
    setLoading(false);
  }, [postId, target, open, inline]);

  React.useEffect(() => { load(); }, [load]);

  const roots = React.useMemo(() => {
    const map = new Map();
    items.forEach(c => map.set(c.id, { ...c, children: [] }));
    items.forEach(c => {
      if (c.parent_id && map.get(c.parent_id)) map.get(c.parent_id).children.push(map.get(c.id));
    });
    return [...map.values()]
      .filter(c => !c.parent_id)
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }, [items]);

  async function createComment(body, parentId = null) {
    if (!body.trim()) return;
    try {
      const topLevelPayload = target?.id
        ? (target?.type ? { text: body, target_type: target.type, target_id: target.id } : { text: body, target_id: target.id })
        : { text: body, target_id: postId };
      const payload = parentId ? { text: body, parent: parentId } : topLevelPayload;

      const r = await fetch(toApiUrl(`engagements/comments/`), {
        method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(payload),
      });
      if (r.ok) {
        setText(""); setReplyTo(null); await load(); onBumpCount?.();
      }
    } catch { }
  }

  async function toggleCommentLike(commentId) {
    setItems(curr => curr.map(c => c.id === commentId ? { ...c, user_has_liked: !c.user_has_liked, like_count: c.like_count + (c.user_has_liked ? -1 : 1) } : c));
    try {
      await fetch(toApiUrl(`engagements/reactions/toggle/`), {
        method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ target_type: "comment", target_id: commentId, reaction: "like" }),
      });
    } catch { }
  }

  const CommentItem = ({ c, depth = 0 }) => (
    <Box sx={{ pl: depth ? 2 : 0, borderLeft: depth ? "2px solid #e2e8f0" : "none", ml: depth ? 1.5 : 0, mt: 1 }}>
      <Stack direction="row" spacing={1}>
        <Avatar src={c.author.avatar} sx={{ width: 24, height: 24 }}>{(c.author.name || "U")[0]}</Avatar>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ bgcolor: "#f1f5f9", p: 1, borderRadius: 2 }}>
            <Typography variant="subtitle2">{c.author.name}</Typography>
            <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word", overflowWrap: "anywhere" }}>
              {c.text}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 0.5 }}>
            <Button size="small" startIcon={c.user_has_liked ? <FavoriteRoundedIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />} onClick={() => toggleCommentLike(c.id)}>
              {c.like_count || 0}
            </Button>
            <Button size="small" startIcon={<ChatBubbleOutlineIcon fontSize="small" />} onClick={() => setReplyTo(c)}>Reply</Button>
          </Stack>
        </Box>
      </Stack>
      {/* ⬇️ FIX: Ensure children are rendered recursively */}
      {c.children && c.children.length > 0 && (
        <Box sx={{ mt: 1 }}>
          {c.children
            .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0))
            .map(child => <CommentItem key={child.id} c={child} depth={depth + 1} />)}
        </Box>
      )}
    </Box>
  );

  const content = (
    <Box>
      {replyTo && (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="caption">Replying to {replyTo.author?.name}</Typography>
          <Button size="small" onClick={() => setReplyTo(null)}>Cancel</Button>
        </Stack>
      )}
      <Stack direction="row" spacing={1}>
        <TextField
          size="small" fullWidth placeholder={replyTo ? "Write a reply..." : "Write a comment..."}
          value={text} onChange={(e) => setText(e.target.value)} inputRef={inputRef}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); createComment(text, replyTo?.id); } }}
        />
        <Button variant="contained" onClick={() => createComment(text, replyTo?.id)} disabled={!text.trim()}>Post</Button>
      </Stack>
      <Box sx={{ mt: 2 }}>
        {loading ? <CircularProgress size={20} /> : roots.slice(0, inline ? visibleCount : undefined).map(c => <CommentItem key={c.id} c={c} />)}
        {inline && roots.length > visibleCount && (
          <Button size="small" onClick={() => setVisibleCount(v => v + initialCount)}>Load more comments</Button>
        )}
      </Box>
    </Box>
  );

  if (inline) return <Box sx={{ mt: 1.5 }}>{content}</Box>;
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Comments</DialogTitle>
      <DialogContent dividers>{content}</DialogContent>
    </Dialog>
  );
}

// -----------------------------------------------------------------------------
// 5. SHARE DIALOG
// -----------------------------------------------------------------------------
function ShareDialog({ open, onClose, postId, onShared, target, authorId, groupId }) {
  const [loading, setLoading] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [friends, setFriends] = React.useState([]);
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState(new Set());

  // Normalize any friends API shape -> { id, name, avatar }
  function normalizeFriends(list, meId) {
    if (!Array.isArray(list)) return [];
    return list.map((f) => {
      // Logic: If from_user and to_user exist, pick the one that ISN'T me.
      let u;
      if (f.from_user && f.to_user && meId) {
        u = (String(f.from_user.id) === String(meId)) ? f.to_user : f.from_user;
      } else {
        u = f.user || f.friend || f.to_user || f.peer || f.profile || f;
      }

      const id = u?.id ?? f.user_id ?? f.friend_id ?? f.peer_id ?? f.id;
      const name =
        u?.name ||
        u?.full_name ||
        (u?.first_name || u?.last_name ? `${u?.first_name || ""} ${u?.last_name || ""}`.trim() : null) ||
        u?.username ||
        `User #${id}`;
      const avatar = toMediaUrl(
        u?.avatar || u?.avatar_url || u?.user_image || u?.user_image_url ||
        u?.image || u?.photo ||
        u?.profile?.avatar || u?.profile?.avatar_url || u?.profile?.user_image || u?.profile?.user_image_url ||
        f?.avatar || f?.avatar_url || f?.user_image || f?.user_image_url || f?.image || f?.photo || ""
      );

      return { id, name, avatar };
    }).filter(x => x.id && String(x.id) !== String(meId)); // Safety check to remove self
  }

  // Helper to fetch friends
  async function fetchMyFriends(meId) {
    const candidates = [
      "friends?status=accepted",
      "friends/accepted",
      "friends/list",
      "friendships?status=accepted",
      "users/me/friends",
    ];
    const limitParams = "&page_size=1000&limit=1000";

    for (const path of candidates) {
      try {
        const join = path.includes("?") ? "&" : "?";
        const r = await fetch(toApiUrl(path + join + limitParams), { headers: { Accept: "application/json", ...authHeaders() } });
        if (!r.ok) continue;
        const j = await r.json();
        return normalizeFriends(Array.isArray(j?.results) ? j.results : j, meId);
      } catch { }
    }
    return [];
  }

  // Helper to fetch Group Members (Robust)
  async function fetchGroupMembers(gId) {
    // Try multiple endpoints to catch members
    const candidates = [
      `groups/${gId}/members/`, // Best candidate
      `groups/${gId}/memberships/`,
      `group-members/?group=${gId}`,
    ];
    // We append query params safely
    const limitParams = "?page_size=1000";

    for (const path of candidates) {
      try {
        // Construct URL safely
        let url = path;
        if (!path.includes("?")) {
          url = path.endsWith("/") ? path + limitParams : path + "/" + limitParams;
        } else {
          url = path + limitParams.replace("?", "&");
        }

        const r = await fetch(toApiUrl(url), { headers: { Accept: "application/json", ...authHeaders() } });
        if (!r.ok) continue;
        const j = await r.json();
        const rawMems = Array.isArray(j?.results) ? j.results : j?.members || (Array.isArray(j) ? j : []);
        if (rawMems.length > 0) return rawMems;
      } catch { }
    }
    return [];
  }

  const fetchFriendsList = React.useCallback(async () => {
    if (!open) return;
    setLoading(true);

    try {
      let meId = null;
      try { const me = await getMeCached(); meId = me?.id || me?.user?.id; } catch { }

      if (groupId) {
        // Parallel fetch: Friends & Group Members
        const [myFriends, rawMems] = await Promise.all([
          fetchMyFriends(meId),
          fetchGroupMembers(groupId)
        ]);

        let groupMembers = new Set();
        if (rawMems.length > 0) {
          rawMems.forEach(m => {
            const uid = m.user?.id || m.user_id || m.id;
            if (uid) groupMembers.add(String(uid));
          });
        }

        // ⬇️ STRICT INTERSECTION: Only show friends who are ALSO group members.
        // No fallback to 'all friends' if fetch fails.
        const mutuals = myFriends.filter(f => groupMembers.has(String(f.id)));
        setFriends(mutuals);

      } else {
        // Non-group posts
        const list = await fetchMyFriends(meId);
        setFriends(list);
      }
    } catch (e) {
      console.error(e);
      setFriends([]);
    } finally {
      setLoading(false);
    }
  }, [open, groupId]);

  React.useEffect(() => { fetchFriendsList(); }, [fetchFriendsList]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter(f => (f.name || "").toLowerCase().includes(q));
  }, [friends, query]);

  function toggle(id) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function shareNow() {
    if (!selected.size || !postId) return;
    setSending(true);
    try {
      const base = target?.id
        ? (target?.type
          ? { target_type: target.type, target_id: target.id }
          : { target_id: target.id })
        : { target_id: postId };

      const r = await fetch(toApiUrl(`engagements/shares/`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ ...base, to_users: [...selected] }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);

      setSending(false);
      onShared?.();
      onClose?.();
      setSelected(new Set());
      setQuery("");
    } catch (e) {
      setSending(false);
      alert("Could not share this post. Please check your share endpoint.");
    }
  }
  return (
    <Dialog open={!!open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Share post</DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Stack alignItems="center" py={3}><CircularProgress size={22} /></Stack>
        ) : friends.length === 0 ? (
          <Typography color="text.secondary">
            {groupId ? "No friends found in this group." : "No friends found."}
          </Typography>
        ) : (
          <>
            <TextField
              size="small"
              fullWidth
              placeholder="Search friends…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 1.5 }}
            />
            <Divider sx={{ mb: 1 }} />
            <List dense disablePadding>
              {filtered.map((f) => (
                <ListItem key={f.id} disablePadding secondaryAction={
                  <Checkbox edge="end" onChange={() => toggle(f.id)} checked={selected.has(f.id)} />
                }>
                  <ListItemButton onClick={() => toggle(f.id)}>
                    <ListItemAvatar><Avatar src={f.avatar} /></ListItemAvatar>
                    <ListItemText primary={f.name} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={sending}>Cancel</Button>
        <Button variant="contained" onClick={shareNow} disabled={!selected.size || sending}>
          {sending ? "Sharing…" : "Share"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ExpandableText({
  text,
  maxLines = 5,
  variant = "body2",
  color,
  wrapperSx,
  sx,
}) {
  const [expanded, setExpanded] = React.useState(false);
  const [canClamp, setCanClamp] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    setExpanded(false);
  }, [text, maxLines]);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const check = () => {
      // only meaningful when clamped
      const overflow = el.scrollHeight > el.clientHeight + 1;
      setCanClamp(overflow);
    };

    requestAnimationFrame(check);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [text, expanded, maxLines]);

  if (!text) return null;

  return (
    <Box sx={wrapperSx}>
      <Typography
        ref={ref}
        variant={variant}
        color={color}
        sx={{
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          overflowWrap: "anywhere",
          ...(expanded
            ? {}
            : {
              display: "-webkit-box",
              WebkitLineClamp: maxLines,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }),
          ...sx,
        }}
      >
        {text}
      </Typography>

      {canClamp && (
        <Button
          size="small"
          onClick={() => setExpanded((v) => !v)}
          sx={{ mt: 0.5, px: 0, minWidth: 0, textTransform: "none" }}
        >
          {expanded ? "See less" : "See more"}
        </Button>
      )}
    </Box>
  );
}


// -----------------------------------------------------------------------------
// 6. POST CARD
// -----------------------------------------------------------------------------
function PostCard({ post, onReact, onPollVote, onOpenEvent }) {
  const [local, setLocal] = React.useState(post);
  const [commentsOpen, setCommentsOpen] = React.useState(false);
  const [shareOpen, setShareOpen] = React.useState(false);
  const commentInputRef = React.useRef(null);

  // Reaction Picker
  const [anchorEl, setAnchorEl] = React.useState(null);
  const pickerOpen = Boolean(anchorEl);

  React.useEffect(() => { setLocal(post); }, [post]);

  const myReactionId = local.my_reaction || (local.liked_by_me ? "like" : null);
  const myReactionDef = POST_REACTIONS.find(r => r.id === myReactionId);
  const likeBtnLabel = myReactionDef?.label || "Like";
  const likeBtnEmoji = myReactionDef?.emoji || "👍";
  const hasReaction = !!myReactionId;

  // Optimistic update wrapper
  const handleReactionClick = async (reactionId) => {
    setAnchorEl(null);
    const oldReaction = local.my_reaction;
    const isSame = oldReaction === reactionId;
    const nextReaction = isSame ? null : reactionId;

    let nextLikes = local.metrics.likes;
    if (!oldReaction && nextReaction) nextLikes++;
    if (oldReaction && !nextReaction) nextLikes = Math.max(0, nextLikes - 1);

    const nextState = {
      ...local,
      my_reaction: nextReaction,
      user_has_liked: !!nextReaction,
      metrics: { ...local.metrics, likes: nextLikes }
    };
    setLocal(nextState);
    onReact(local.id, reactionId); // Call parent to sync API
  };

  const bumpCommentCount = () => {
    setLocal(curr => ({ ...curr, metrics: { ...curr.metrics, comments: (curr.metrics.comments || 0) + 1 } }));
  };

  const bumpShareCount = () => {
    setLocal(curr => ({ ...curr, metrics: { ...curr.metrics, shares: (curr.metrics.shares || 0) + 1 } }));
  };

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 3, borderColor: BORDER }}>
      {/* Header */}
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
        <Avatar src={local.author?.avatar} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2" fontWeight={700}>{local.author?.name}</Typography>
          <Typography variant="caption" color="text.secondary">{formatWhen(local.created_at)}</Typography>
        </Box>
        {local.type !== 'text' && <Chip size="small" label={local.type.toUpperCase()} variant="outlined" />}
      </Stack>

      {/* Body */}
      <Box sx={{ mb: 2 }}>
        {local.type === "text" && (
          <ExpandableText text={local.text} maxLines={5} />
        )}

        {local.type === "resource" && <ResourceBlock post={local} />}

        {local.type === "image" && (
          <>
            <ExpandableText text={local.text} maxLines={5} wrapperSx={{ mb: 1 }} />
            <Box
              component="img"
              src={toMediaUrl(local.image_url)}
              sx={{ width: "100%", borderRadius: 2, maxHeight: 500, objectFit: "cover" }}
            />
          </>
        )}

        {local.type === "poll" && <PollBlock post={local} onVote={(oid) => onPollVote(local, oid)} />}

        {local.type === "event" && <EventBlock post={local} onOpen={() => onOpenEvent?.(local.event?.id || local.id)} />}

        {local.type === "link" && (
          <Paper variant="outlined" sx={{ p: 1.5, bgcolor: "#fafafa" }}>
            <ExpandableText text={local.text} maxLines={5} wrapperSx={{ mb: 0.5 }} />
            <Link href={local.url} target="_blank" fontWeight={600}>
              {local.url_title || local.url}
            </Link>
            <ExpandableText
              text={local.url_desc}
              variant="caption"
              color="text.secondary"
              maxLines={5}
              wrapperSx={{ mt: 0.5 }}
            />
          </Paper>
        )}
      </Box>

      {/* Metrics */}
      {(local.metrics.likes > 0 || local.metrics.shares > 0) && (
        <Box sx={{ px: 0.5, pt: 0.5, mb: 1 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={1} alignItems="center" sx={{ cursor: "pointer" }} onClick={() => window.__openLikes?.(engageTargetOf(local))}>
              <Box sx={{ bgcolor: "primary.main", borderRadius: "50%", p: 0.25, display: "flex" }}>
                <ThumbUpAltOutlinedIcon sx={{ fontSize: 12, color: "white" }} />
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ "&:hover": { textDecoration: "underline" } }}>
                {local.metrics.likes} reaction{local.metrics.likes !== 1 ? 's' : ''}
              </Typography>
            </Stack>
            {local.metrics.shares > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }} onClick={() => window.__openShares?.(engageTargetOf(local))}>
                {local.metrics.shares} share{local.metrics.shares !== 1 ? 's' : ''}
              </Typography>
            )}
          </Stack>
        </Box>
      )}

      <Divider sx={{ mb: 1 }} />

      {/* Actions */}
      <Stack direction="row" justifyContent="space-around">
        <Button
          startIcon={<span style={{ fontSize: 18 }}>{likeBtnEmoji}</span>}
          sx={{ color: hasReaction ? "primary.main" : "text.secondary", fontWeight: hasReaction ? 600 : 400 }}
          onClick={(e) => setAnchorEl(e.currentTarget)}
        >
          {likeBtnLabel}
        </Button>
        <Button
          startIcon={<ChatBubbleOutlineIcon />}
          color="inherit"
          onClick={() => {
            setCommentsOpen(prev => {
              if (!prev) setTimeout(() => commentInputRef.current?.focus(), 0);
              return !prev;
            });
          }}
        >
          Comment
        </Button>
        <Button startIcon={<IosShareIcon />} color="inherit" onClick={() => setShareOpen(true)}>Share</Button>
      </Stack>

      <Popover
        open={pickerOpen} anchorEl={anchorEl} onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        transformOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Box sx={{ p: 1, display: "flex", gap: 1 }}>
          {POST_REACTIONS.map(r => (
            <Tooltip key={r.id} title={r.label}>
              <Box
                onClick={() => handleReactionClick(r.id)}
                sx={{ fontSize: 24, cursor: "pointer", transition: "transform 0.1s", "&:hover": { transform: "scale(1.2)" } }}
              >
                {r.emoji}
              </Box>
            </Tooltip>
          ))}
        </Box>
      </Popover>

      {/* Inline Comments */}
      {commentsOpen && (
        <CommentsDialog
          inline
          postId={local.id}
          target={engageTargetOf(local)}
          onBumpCount={bumpCommentCount}
          inputRef={commentInputRef}
        />
      )}

      {/* Share Dialog */}
      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        postId={local.id}
        target={engageTargetOf(local)}
        authorId={local.author_id || local.author?.id}
        groupId={local.group_id}
        onShared={bumpShareCount}
      />
    </Paper>
  );
}

// -----------------------------------------------------------------------------
// 7. TABS CONTENT
// -----------------------------------------------------------------------------

function PostsTab({ groupId }) {
  const [posts, setPosts] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  const fetchPosts = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(toApiUrl(`groups/${groupId}/posts/`), { headers: { Accept: "application/json", ...authHeaders() } });
      if (res.ok) {
        const data = await res.json();
        const raw = Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : []);
        const mapped = raw.map(mapFeedItem).filter(Boolean);

        // ⬇️ FIX: Force attach current Group ID to all posts so ShareDialog works
        const numericGroupId = Number(groupId);

        const ids = mapped.map(p => p.id).filter(id => Number.isInteger(id));
        if (ids.length) {
          const metrics = await fetchBatchMetrics(ids);
          const hydrated = mapped.map(p => {
            const m = metrics[p.id];
            const base = m ? {
              ...p,
              user_has_liked: !!(m.user_has_liked ?? m.me_liked),
              my_reaction: m.my_reaction || (m.user_has_liked ? "like" : null),
              metrics: { ...p.metrics, ...m }
            } : p;

            // Attach group_id explicitly
            return { ...base, group_id: numericGroupId };
          });
          setPosts(hydrated);
        } else {
          // Attach group_id explicitly even if no metrics
          setPosts(mapped.map(p => ({ ...p, group_id: numericGroupId })));
        }
      }
    } catch { }
    setLoading(false);
  }, [groupId]);

  React.useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const handlePollVote = async (post, optionId) => {
    if (!optionId) return;
    try {
      const res = await fetch(toApiUrl(`activity/feed/${post.id}/poll/vote/`), {
        method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ option_ids: [optionId] })
      });
      if (res.ok) {
        const p = await res.json();
        const updatedPoll = p.poll || p;
        setPosts(curr => curr.map(x => x.id === post.id ? {
          ...x,
          is_closed: updatedPoll.is_closed,
          user_votes: updatedPoll.user_votes,
          options: (updatedPoll.options || []).map((o, i) => ({
            id: o.id ?? o.option_id ?? i + 1, label: o.text ?? o.label, votes: o.vote_count ?? o.votes ?? 0
          }))
        } : x));
      }
    } catch { alert("Vote failed"); }
  };

  const handleReact = async (postId, reactionId) => {
    try {
      const p = posts.find(x => x.id === postId);
      const target = engageTargetOf(p);
      await fetch(toApiUrl(`engagements/reactions/toggle/`), {
        method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ target_type: target.type || "activity_feed.feeditem", target_id: target.id, reaction: reactionId })
      });
    } catch (e) { console.error(e); }
  };

  if (loading) return <Stack alignItems="center" py={4}><CircularProgress /></Stack>;
  if (!posts.length) return <Typography color="text.secondary" align="center" py={4}>No posts in this group yet.</Typography>;

  return (
    <Box>
      {posts.map(p => (
        <PostCard
          key={p.id}
          post={p}
          onReact={handleReact}
          onPollVote={(post, optId) => handlePollVote(post, optId)}
        />
      ))}
    </Box>
  );
}

function MembersTab({ groupId }) {
  const [members, setMembers] = React.useState([]);
  React.useEffect(() => {
    (async () => {
      try {
        const r = await fetch(toApiUrl(`groups/${groupId}/members/`), { headers: { Accept: "application/json", ...authHeaders() } });
        const d = r.ok ? await r.json() : [];
        setMembers(Array.isArray(d?.results) ? d.results : (Array.isArray(d) ? d : []));
      } catch { }
    })();
  }, [groupId]);

  return (
    <List>
      {members.map(m => {
        const u = m.user || m;
        return (
          <ListItem key={u.id} sx={{ border: "1px solid #eee", borderRadius: 2, mb: 1 }}>
            <ListItemAvatar><Avatar src={toMediaUrl(u.avatar || u.user_image)} /></ListItemAvatar>
            <ListItemText primary={u.name || u.full_name || u.username} secondary={m.role || "Member"} />
          </ListItem>
        );
      })}
    </List>
  );
}

function OverviewTab({ group }) {
  if (!group) return null;
  return (
    <Stack spacing={2}>
      <Card variant="outlined" sx={{ borderRadius: 3, borderColor: BORDER, p: 2 }}>
        <Typography variant="h6" gutterBottom>About</Typography>
        <Typography variant="body2">{group.description || "No description."}</Typography>
      </Card>
      <Card variant="outlined" sx={{ borderRadius: 3, borderColor: BORDER, p: 2 }}>
        <Typography variant="h6" gutterBottom>Details</Typography>
        <Typography variant="body2">Visibility: {group.visibility}</Typography>
        <Typography variant="body2">Created: {new Date(group.created_at).toLocaleDateString()}</Typography>
      </Card>
    </Stack>
  );
}

// -----------------------------------------------------------------------------
// 8. MAIN PAGE
// -----------------------------------------------------------------------------

export default function GroupDetailsPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = React.useState(null);
  const [tab, setTab] = React.useState(0);
  const [me, setMe] = React.useState(null);

  // --- Global Lists State (Who Liked, Who Shared) ---
  const [likesTarget, setLikesTarget] = React.useState(null);
  const [sharesTarget, setSharesTarget] = React.useState(null);
  const [listUsers, setListUsers] = React.useState([]);
  const [listLoading, setListLoading] = React.useState(false);

  // Specific state for the Tabbed Likes Dialog
  const [likesFilter, setLikesFilter] = React.useState("all");

  // Install Global Openers for PostCard
  React.useEffect(() => {
    window.__openLikes = (target) => setLikesTarget(target);
    window.__openShares = (target) => setSharesTarget(target);
    return () => { delete window.__openLikes; delete window.__openShares; };
  }, []);

  // Fetch "Who Liked" data (ROBUST MULTI-URL FETCH like LiveFeed)
  React.useEffect(() => {
    if (!likesTarget) return;
    setListLoading(true);
    setLikesFilter("all");
    (async () => {
      const { id, type } = likesTarget;
      // Try multiple endpoint patterns to find where the reactions are stored
      const urls = [
        type ? toApiUrl(`engagements/reactions/?target_type=${encodeURIComponent(type)}&target_id=${id}&page_size=100`) : null,
        toApiUrl(`engagements/reactions/?target_type=activity_feed.feeditem&target_id=${id}&page_size=100`),
        toApiUrl(`engagements/reactions/who-liked/?feed_item=${id}&page_size=100`),
      ].filter(Boolean);

      let rows = [];
      for (const url of urls) {
        try {
          const r = await fetch(url, { headers: { Accept: "application/json", ...authHeaders() } });
          if (!r.ok) continue;
          const j = await r.json();
          rows = Array.isArray(j?.results) ? j.results : (Array.isArray(j) ? j : []);
          if (rows.length) break; // Found data, stop looking
        } catch { }
      }

      setListUsers(rows.map(row => {
        const u = row.user || row.actor || row.profile || row;
        const reactionId = row.reaction || row.kind || "like";
        const def = POST_REACTIONS.find(x => x.id === reactionId) || POST_REACTIONS[0];
        return {
          id: u.id,
          name: u.name || u.full_name || u.username || "User",
          avatar: toMediaUrl(u.avatar || u.user_image),
          reactionId,
          reactionEmoji: def?.emoji,
          reactionLabel: def?.label,
        };
      }));
      setListLoading(false);
    })();
  }, [likesTarget]);

  // Fetch "Who Shared" data (ROBUST MULTI-URL FETCH like LiveFeed)
  React.useEffect(() => {
    if (!sharesTarget) return;
    setListLoading(true);
    (async () => {
      const { id, type } = sharesTarget;
      // Try multiple endpoint patterns
      const urls = [
        type ? toApiUrl(`engagements/shares/?target_type=${encodeURIComponent(type)}&target_id=${id}&page_size=100`) : null,
        toApiUrl(`engagements/shares/who-shared/?feed_item=${id}&page_size=100`),
        toApiUrl(`engagements/shares/?target_type=activity_feed.feeditem&target_id=${id}&page_size=100`),
      ].filter(Boolean);

      let rows = [];
      for (const url of urls) {
        try {
          const r = await fetch(url, { headers: { Accept: "application/json", ...authHeaders() } });
          if (!r.ok) continue;
          const j = await r.json();
          rows = Array.isArray(j?.results) ? j.results : (Array.isArray(j) ? j : []);
          if (rows.length) break;
        } catch { }
      }

      // ⬇️ CHANGED: Use a Map to ensure distinct users (Deduplication)
      const uniqueMap = new Map();

      rows.forEach(row => {
        const u = row.user || row.actor || row.profile || row.from_user || row;
        const uid = u.id || u.user_id;

        // Only add if we haven't seen this User ID yet
        if (uid && !uniqueMap.has(String(uid))) {
          uniqueMap.set(String(uid), {
            id: uid,
            name: u.name || u.full_name || u.username || "User",
            avatar: toMediaUrl(u.avatar || u.user_image),
          });
        }
      });

      setListUsers(Array.from(uniqueMap.values()));
      setListLoading(false);
    })();
  }, [sharesTarget]);

  React.useEffect(() => {
    (async () => {
      try {
        const rMe = await fetch(toApiUrl("users/me/"), { headers: { Accept: "application/json", ...authHeaders() } });
        if (rMe.ok) setMe(await rMe.json());
        const rGroup = await fetch(toApiUrl(`groups/${groupId}/`), { headers: { Accept: "application/json", ...authHeaders() } });
        if (rGroup.ok) setGroup(await rGroup.json());
      } catch { }
    })();
  }, [groupId]);

  // Filter Logic for Likes Dialog
  const likesFilteredUsers = likesFilter === "all" ? listUsers : listUsers.filter(u => u.reactionId === likesFilter);
  const likesReactionCounts = { all: listUsers.length };
  listUsers.forEach(u => {
    if (u.reactionId) likesReactionCounts[u.reactionId] = (likesReactionCounts[u.reactionId] || 0) + 1;
  });

  return (
    <Box sx={{ width: "100%", py: { xs: 2, md: 3 } }}>
      <Box
        sx={{
          display: "flex",
          gap: 3,
          px: { xs: 0, sm: 2, md: 2.5, lg: 3 },
          maxWidth: { xs: "100%", lg: "1480px" },
          mx: "auto",
        }}
      >
        {/* LEFT: Community sidebar (same as other community pages) */}
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
            view="groups"
            onChangeView={(k) =>
              navigate(k === "home" ? "/community" : `/community?view=${k}`)
            }
          />
        </Box>
        {/* LEFT: Main group content (full-width like Groups page) */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* Group header */}
          <Card
            variant="outlined"
            sx={{ borderRadius: 3, borderColor: BORDER, mb: 3 }}
          >
            <CardContent
              sx={{
                p: 3,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar
                  src={toMediaUrl(group?.avatar)}
                  sx={{
                    width: 80,
                    height: 80,
                    fontSize: 32,
                    bgcolor: "primary.light",
                  }}
                >
                  {(group?.name || "G")[0]}
                </Avatar>
                <Box>
                  <Typography variant="h5" fontWeight={700}>
                    {group?.name || "Loading..."}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {group?.member_count || 0} Members
                  </Typography>
                </Box>
              </Stack>
              <Button
                variant="outlined"
                startIcon={<ChatBubbleOutlineRoundedIcon />}
                onClick={() => navigate(`/community?view=messages`)} // Example route
              >
                Message
              </Button>
            </CardContent>
          </Card>

          {/* Tabs + tab content */}
          <Card
            variant="outlined"
            sx={{ borderRadius: 3, borderColor: BORDER }}
          >
            <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
              <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2 }}>
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
                {/* Chat Tab Removed Here */}
              </Tabs>
            </Box>
            <CardContent sx={{ p: 3 }}>
              {tab === 0 && <PostsTab groupId={groupId} />}
              {tab === 1 && <MembersTab groupId={groupId} />}
              {tab === 2 && <OverviewTab group={group} />}
              {/* Chat Content Removed Here */}
            </CardContent>
          </Card>
        </Box>
      </Box>
      {/* REACTION DIALOG (Tabbed) */}
      <Dialog open={!!likesTarget} onClose={() => setLikesTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Reactions</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mb: 1, borderBottom: 1, borderColor: "divider" }}>
            <Tabs value={likesFilter} onChange={(_, v) => setLikesFilter(v)} variant="scrollable" allowScrollButtonsMobile>
              <Tab value="all" label={`All (${likesReactionCounts.all || 0})`} />
              {POST_REACTIONS.map(r => (
                <Tab key={r.id} value={r.id} label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <span>{r.emoji}</span><span style={{ fontSize: 12 }}>({likesReactionCounts[r.id] || 0})</span>
                  </Box>
                } />
              ))}
            </Tabs>
          </Box>
          {listLoading ? <LinearProgress /> : !likesFilteredUsers.length ? (
            <Typography p={2} color="text.secondary">No reactions.</Typography>
          ) : (
            <List dense>
              {likesFilteredUsers.map(u => (
                <ListItem key={u.id}>
                  <ListItemAvatar><Avatar src={u.avatar}>{(u.name || "U")[0]}</Avatar></ListItemAvatar>
                  <ListItemText primary={u.name} />
                  {u.reactionEmoji && (
                    <ListItemSecondaryAction>
                      <Tooltip title={u.reactionLabel || ""}><Box sx={{ fontSize: 20, mr: 1 }}>{u.reactionEmoji}</Box></Tooltip>
                    </ListItemSecondaryAction>
                  )}
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setLikesTarget(null)}>Close</Button></DialogActions>
      </Dialog>

      {/* SHARE LIST DIALOG (Simple List) */}
      <Dialog open={!!sharesTarget} onClose={() => setSharesTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Shares</DialogTitle>
        <DialogContent dividers>
          {listLoading ? <LinearProgress /> : !listUsers.length ? (
            <Typography p={2} color="text.secondary">No shares yet.</Typography>
          ) : (
            <List dense>
              {listUsers.map(u => (
                <ListItem key={u.id}>
                  <ListItemAvatar><Avatar src={u.avatar}>{(u.name || "U")[0]}</Avatar></ListItemAvatar>
                  <ListItemText primary={u.name} />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setSharesTarget(null)}>Close</Button></DialogActions>
      </Dialog>
    </Box>
  );
}