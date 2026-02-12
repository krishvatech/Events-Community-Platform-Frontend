// src/pages/community/GroupDetailsPage.jsx
import * as React from "react";
import { useParams, Link as RouterLink, useNavigate, useLocation } from "react-router-dom";
import {
  Avatar, AvatarGroup, Box, Button, Card, CardContent,
  Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider,
  Grid, IconButton, InputAdornment, List, ListItem, ListItemAvatar,
  ListItemText, ListItemButton, ListItemSecondaryAction, Pagination,
  Paper, Popover, Stack, Tab, Tabs, TextField, Tooltip, Typography,
  CircularProgress, LinearProgress, Link, Checkbox, Skeleton,
  Snackbar, Alert, Menu, MenuItem, FormControl, FormLabel, RadioGroup, FormControlLabel, Radio, Switch
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";

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
import ReplyRoundedIcon from "@mui/icons-material/ReplyRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import EditNoteRoundedIcon from "@mui/icons-material/EditNoteRounded";
import InsertPhotoRoundedIcon from "@mui/icons-material/InsertPhotoRounded";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import VerifiedIcon from "@mui/icons-material/Verified";
import CommunityProfileCard from "../../components/CommunityProfileCard.jsx";

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

const REPORT_REASONS = [
  { id: "spam", label: "Spam" },
  { id: "harassment", label: "Harassment" },
  { id: "hate_speech", label: "Hate speech" },
  { id: "false_info", label: "False information" },
  { id: "violence", label: "Violence" },
  { id: "sexual_content", label: "Sexual content" },
  { id: "other", label: "Other" },
];

const LINKEDIN_COMPANY_SIZES = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1001-5000",
  "5001-10000",
  "10000+",
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
    localStorage.getItem("access_token") ||
    localStorage.getItem("access_token");
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

function extractCountryFromLocation(raw) {
  if (!raw) return "";
  const parts = String(raw)
    .split(/,|\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (!parts.length) return "";
  const last = parts[parts.length - 1]
    .replace(/\s*-\s.*$/, "")
    .trim();
  return last;
}

function getMinCompanySize(s) {
  if (!s) return 0;
  const firstPart = String(s).split("-")[0];
  const clean = firstPart.replace(/[^0-9]/g, "");
  return parseInt(clean, 10) || 0;
}

function formatCompanySizeLabel(size) {
  const raw = String(size || "").trim();
  if (!raw) return "";
  if (/employee/i.test(raw)) return raw;

  const nums = raw.match(/\d[\d,]*/g) || [];
  const hasPlus = /\+/.test(raw);
  const toNum = (v) => Number(String(v).replace(/,/g, ""));
  const fmt = (v) => toNum(v).toLocaleString("en-US");

  if (nums.length >= 2) {
    return `${fmt(nums[0])}-${fmt(nums[1])} employees`;
  }
  if (nums.length === 1 && hasPlus) {
    return `${fmt(nums[0])}+ employees`;
  }
  return raw;
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
    moderation_status: item.moderation_status ?? m.moderation_status ?? item.moderationStatus ?? m.moderationStatus ?? item.status ?? m.status ?? null,
    is_removed: item.is_removed ?? m.is_removed ?? (item.moderation_status === "removed") ?? (m.moderationStatus === "removed") ?? (m.status === "removed") ?? (item.status === "removed") ?? false,
    is_under_review: item.is_under_review ?? m.is_under_review ?? (item.moderation_status === "under_review") ?? (m.moderationStatus === "under_review") ?? false,
    can_engage: item.can_engage ?? null,
  };

  // Filter out soft-deleted posts, but NOT moderation-removed posts
  // Moderation-removed posts should show "This content was removed by moderators." message
  const isModeratedRemoved = base.is_removed || base.moderation_status === "removed";
  if ((m.is_hidden || m.is_deleted) && !isModeratedRemoved) return null;

  let t = (m.type || m.post_type || item.type || "text").toLowerCase();

  // ⬇️ ROBUST POLL DETECTION
  const rawOptions = m.options ?? item.options ?? m.poll_options ?? item.poll_options ?? [];
  const hasOptions = Array.isArray(rawOptions) && rawOptions.length > 0;

  if (t === 'poll' || m.poll_id || item.poll_id || hasOptions || m.question) {
    t = 'poll';
  }

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
  if (t === "poll") {
    const question = m.question ?? item.question ?? item.title ?? m.text ?? "Poll";
    const options = (rawOptions).map((o, i) => ({
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
      user_votes: m.user_votes ?? item.user_votes ?? [],
      is_closed: Boolean(m.is_closed ?? item.is_closed),
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
  if (
    t === "resource" || t === "file" || t === "video" ||
    m.resource_id || m.file || m.file_url || m.link_url || m.video_url
  ) {
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
  if ((t === "link" || m.url) &&
    !m.resource_id && !m.file && !m.file_url && !m.link_url && !m.video_url) {
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
  const [me, setMe] = React.useState(null);

  // New State for Delete Confirm Dialog
  const [confirmDelId, setConfirmDelId] = React.useState(null);
  const [delBusy, setDelBusy] = React.useState(false);

  // Load current user for permissions
  React.useEffect(() => {
    getMeCached().then(setMe);
  }, []);

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

      // Fetch replies
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

  // UPDATED: Triggers Dialog
  function requestDelete(cid) {
    setConfirmDelId(cid);
  }

  // UPDATED: Performs actual delete
  async function performDelete() {
    if (!confirmDelId) return;
    setDelBusy(true);
    // Optimistic remove
    const cid = confirmDelId;
    try {
      await fetch(toApiUrl(`engagements/comments/${cid}/`), {
        method: "DELETE", headers: authHeaders(),
      });
      // Remove from UI
      setItems(curr => curr.filter(x => x.id !== cid));
      setConfirmDelId(null);
      await load();
    } catch {
      await load(); // Rollback
    } finally {
      setDelBusy(false);
    }
  }

  const CommentItem = ({ c, depth = 0 }) => {
    const isMe = me && c.author?.id && String(c.author.id) === String(me.id);
    return (
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
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5 }}>
              {/* Like */}
              <Button
                size="small"
                startIcon={c.user_has_liked ? <FavoriteRoundedIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
                onClick={() => toggleCommentLike(c.id)}
                sx={{ color: c.user_has_liked ? "teal" : "inherit", minWidth: 0 }}
              >
                {c.like_count || 0}
              </Button>
              {/* Reply */}
              <Button
                size="small"
                startIcon={<ReplyRoundedIcon fontSize="small" />}
                onClick={() => setReplyTo(c)}
                sx={{ color: "primary.main", minWidth: 0 }}
              >
                REPLY
              </Button>
              {/* Delete */}
              {isMe && (
                <Button
                  size="small"
                  startIcon={<DeleteOutlineRoundedIcon fontSize="small" />}
                  onClick={() => requestDelete(c.id)}
                  sx={{ color: "error.main", minWidth: 0 }}
                >
                  DELETE
                </Button>
              )}
            </Stack>
          </Box>
        </Stack>
        {c.children && c.children.length > 0 && (
          <Box sx={{ mt: 1 }}>
            {c.children
              .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0))
              .map(child => <CommentItem key={child.id} c={child} depth={depth + 1} />)}
          </Box>
        )}
      </Box>
    );
  };

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
        {loading ? (
          // Show 3 comment skeletons
          <ListSkeleton count={3} />
        ) : (
          roots.slice(0, inline ? visibleCount : undefined).map(c => <CommentItem key={c.id} c={c} />)
        )}
        {inline && roots.length > visibleCount && (
          <Button size="small" onClick={() => setVisibleCount(v => v + initialCount)}>Load more comments</Button>
        )}
      </Box>

      {/* NEW: Custom Delete Dialog */}
      <Dialog open={!!confirmDelId} onClose={() => { if (!delBusy) setConfirmDelId(null); }}>
        <DialogTitle>Delete Comment?</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this comment? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelId(null)} disabled={delBusy}>Cancel</Button>
          <Button onClick={performDelete} color="error" variant="contained" disabled={delBusy}>
            {delBusy ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
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
          // Show 5 friend list items skeletons
          <Box sx={{ py: 1 }}>
            <ListSkeleton count={5} type="short" />
          </Box>
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
// 5. REPORT DIALOG
// -----------------------------------------------------------------------------
function ReportDialog({ open, onClose, onSubmit, loading, targetLabel }) {
  const [reason, setReason] = React.useState("spam");
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setReason("spam");
      setNotes("");
    }
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Report {targetLabel || "content"}</DialogTitle>
      <DialogContent dividers>
        <FormControl component="fieldset" fullWidth>
          <FormLabel component="legend">Reason</FormLabel>
          <RadioGroup
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          >
            {REPORT_REASONS.map((r) => (
              <FormControlLabel
                key={r.id}
                value={r.id}
                control={<Radio />}
                label={r.label}
              />
            ))}
          </RadioGroup>
        </FormControl>
        <TextField
          label="Additional notes (optional)"
          placeholder="Share any context that can help moderators."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          fullWidth
          multiline
          minRows={3}
          sx={{ mt: 2 }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
          Reports are anonymous. Our moderators will review this content.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => onSubmit?.(reason, notes)}
          disabled={loading}
        >
          {loading ? "Submitting…" : "Submit report"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// -----------------------------------------------------------------------------
// 6. POST CARD
// -----------------------------------------------------------------------------
function PostCard({ post, onReact, onPollVote, onOpenEvent, onReport, viewerId, viewerIsStaff }) {
  const [local, setLocal] = React.useState(post);
  const [commentsOpen, setCommentsOpen] = React.useState(false);
  const [shareOpen, setShareOpen] = React.useState(false);
  const [menuAnchor, setMenuAnchor] = React.useState(null);
  const menuOpen = Boolean(menuAnchor);
  const commentInputRef = React.useRef(null);

  // Reaction Picker
  const [anchorEl, setAnchorEl] = React.useState(null);
  const pickerOpen = Boolean(anchorEl);

  React.useEffect(() => { setLocal(post); }, [post]);

  // Moderation status checks
  const moderationStatus = local.moderation_status || (local.is_under_review ? "under_review" : (local.is_removed ? "removed" : null));
  const isUnderReview = local.is_under_review ?? (moderationStatus === "under_review");
  const isRemoved = local.is_removed ?? (moderationStatus === "removed");
  const canEngage = local.can_engage ?? (!isUnderReview && !isRemoved);

  const myReactionId = local.my_reaction || (local.liked_by_me ? "like" : null);
  const myReactionDef = POST_REACTIONS.find(r => r.id === myReactionId);
  const likeBtnLabel = myReactionDef?.label || "Like";
  const likeBtnEmoji = myReactionDef?.emoji || "👍";
  const hasReaction = !!myReactionId;

  // Check if user can report this post
  const canReport = !!(viewerId && viewerId !== local.author_id && viewerId !== local.author?.id);

  // Optimistic update wrapper
  const handleReactionClick = async (reactionId) => {
    if (!canEngage) return; // Don't allow reactions on removed/under review posts
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
        {canReport && (
          <>
            <IconButton size="small" onClick={(e) => setMenuAnchor(e.currentTarget)}>
              <MoreVertRoundedIcon fontSize="small" />
            </IconButton>
            <Menu
              open={menuOpen}
              anchorEl={menuAnchor}
              onClose={() => setMenuAnchor(null)}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
            >
              <MenuItem
                onClick={() => {
                  setMenuAnchor(null);
                  onReport?.(local);
                }}
              >
                <FlagOutlinedIcon fontSize="small" sx={{ mr: 1 }} />
                Report post
              </MenuItem>
            </Menu>
          </>
        )}
      </Stack>

      {/* Body */}
      {/* Body */}
      <Box sx={{ mb: 2 }}>
        {local.is_removed || local.moderation_status === "removed" ? (
          <Typography color="text.secondary" sx={{ fontStyle: "italic", py: 2 }}>
            This content was removed by moderators.
          </Typography>
        ) : (
          <>
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
          </>
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
          onClick={(e) => canEngage && setAnchorEl(e.currentTarget)}
          disabled={!canEngage}
        >
          {likeBtnLabel}
        </Button>
        <Button
          startIcon={<ChatBubbleOutlineIcon />}
          color="inherit"
          onClick={() => {
            if (!canEngage) return;
            setCommentsOpen(prev => {
              if (!prev) setTimeout(() => commentInputRef.current?.focus(), 0);
              return !prev;
            });
          }}
          disabled={!canEngage}
        >
          Comment
        </Button>
        <Button startIcon={<IosShareIcon />} color="inherit" onClick={() => canEngage && setShareOpen(true)} disabled={!canEngage}>Share</Button>
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

function PostsTab({ groupId, group, moderatorCanI }) {
  const [posts, setPosts] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [postsMeta, setPostsMeta] = React.useState(null);
  const [postType, setPostType] = React.useState("text"); // text | image | link | poll
  const [postText, setPostText] = React.useState("");
  const [postImageFile, setPostImageFile] = React.useState(null);
  const [postLinkUrl, setPostLinkUrl] = React.useState("");
  const [pollQuestion, setPollQuestion] = React.useState("");
  const [pollOptions, setPollOptions] = React.useState(["", ""]); // at least two
  const [postBusy, setPostBusy] = React.useState(false);

  // Report state management
  const [reportOpen, setReportOpen] = React.useState(false);
  const [reportTarget, setReportTarget] = React.useState(null);
  const [reportBusy, setReportBusy] = React.useState(false);
  const [me, setMe] = React.useState(null);

  const fetchPosts = React.useCallback(async () => {
    setLoading(true);
    try {
      const numericGroupId = Number(groupId);
      const resolvedGroupId = Number.isFinite(numericGroupId) && numericGroupId
        ? numericGroupId
        : Number(group?.id || group?.group_id || group?.groupId || group?.groupID);

      // 1. Fetch Posts
      const res = await fetch(toApiUrl(`groups/${groupId}/posts/`), { headers: { Accept: "application/json", ...authHeaders() } });
      const data = res.ok ? await res.json() : [];

      // Extract metadata from response (backend now returns {results, meta})
      const postsArrRaw = Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : []);
      const meta = data?.meta || null;
      setPostsMeta(meta);

      // Debug: Log posts from backend
      console.log('[GroupDetails] Posts from backend:', postsArrRaw.length, 'posts');
      console.log('[GroupDetails] Meta:', meta);
      const removedPosts = postsArrRaw.filter(p => p.is_removed || p.moderation_status === 'removed');
      if (removedPosts.length) {
        console.log('[GroupDetails] Found removed posts:', removedPosts);
      }

      const postsArr = postsArrRaw

        .map(p => {
          // Trust the endpoint: these posts belong to this group. Ensure ID is attached.
          const existingId = p.group_id ?? p.group?.id ?? p.groupId ?? p.groupID;
          const groupIdToUse = Number(existingId) || resolvedGroupId || numericGroupId;
          return { ...p, group_id: groupIdToUse };
        })
        // Drop polls/events if backend mixes them in this endpoint.
        .filter(p => {
          const t = String(p?.type || "").toLowerCase();
          return t !== "poll" && t !== "event";
        });

      // 2. Fetch Polls from Activity Feed
      let pollsFeed = [];
      if (Number.isFinite(resolvedGroupId) && resolvedGroupId) {
        const pollsUrl = toApiUrl(`activity/feed/?scope=group&group_id=${resolvedGroupId}`);
        const resPolls = await fetch(pollsUrl, { headers: { Accept: "application/json", ...authHeaders() } });
        const dataPolls = resPolls.ok ? await resPolls.json() : [];
        pollsFeed = Array.isArray(dataPolls?.results) ? dataPolls.results : (Array.isArray(dataPolls) ? dataPolls : []);
      }

      // 3. Merge & Dedupe (prefer feed item if collision)
      const allRaw = [...postsArr, ...pollsFeed];
      console.log('[GroupDetails] Before mapFeedItem:', allRaw.length, 'items');

      const mapped = allRaw.map(mapFeedItem).filter(Boolean);
      console.log('[GroupDetails] After mapFeedItem + filter(Boolean):', mapped.length, 'items');

      const scopedMapped = Number.isFinite(resolvedGroupId) && resolvedGroupId
        ? mapped.filter(p => Number(p.group_id) === resolvedGroupId)
        : [];
      console.log('[GroupDetails] After scope filter:', scopedMapped.length, 'items');

      const seenIds = new Set();
      const uniqueMapped = [];
      for (const p of scopedMapped) {
        if (!seenIds.has(p.id)) {
          seenIds.add(p.id);
          uniqueMapped.push(p);
        }
      }

      // Sort by created_at desc
      uniqueMapped.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      console.log('[GroupDetails] After dedupe:', uniqueMapped.length, 'unique posts');

      // 4. Hydrate with metrics
      const ids = uniqueMapped.map(p => p.id).filter(id => Number.isInteger(id));

      let finalPosts = uniqueMapped.map(p => ({ ...p, group_id: resolvedGroupId || p.group_id }));

      if (ids.length) {
        const metrics = await fetchBatchMetrics(ids);
        finalPosts = uniqueMapped.map(p => {
          const m = metrics[p.id];
          const base = m ? {
            ...p,
            user_has_liked: !!(m.user_has_liked ?? m.me_liked),
            my_reaction: m.my_reaction || (m.user_has_liked ? "like" : null),
            metrics: { ...p.metrics, ...m }
          } : p;
          // Attach group_id explicitly
          return { ...base, group_id: resolvedGroupId || p.group_id };
        });
      }

      // Announcement mode: restrict to owner/admin/mod posts (fallback to owner-only if role not available)
      const forumEnabled = Boolean(group?.forum_enabled);
      if (!forumEnabled) {
        const ownerId = group?.owner?.id || group?.created_by?.id;
        if (ownerId) {
          finalPosts = finalPosts.filter(p => {
            const isEvent = p.type === "event" || p.metadata?.type === "event";
            if (isEvent) return false;
            const authorId = p.actor_id || p.author_id || p.author?.id;
            return String(authorId) === String(ownerId);
          });
        } else {
          // If owner is not loaded, show nothing to be safe as per "only owner posts" requirement
          finalPosts = [];
        }
      }

      setPosts(finalPosts);
    } catch (e) {
      console.error("Failed to load group posts:", e);
    }
    setLoading(false);
  }, [groupId, group]);

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

  // Fetch current user info
  React.useEffect(() => {
    (async () => {
      try {
        const meJson = await getMeCached();
        setMe(meJson || null);
      } catch {
        setMe(null);
      }
    })();
  }, []);

  const viewerId = me?.id || me?.user?.id || null;
  const viewerIsStaff = !!(me?.is_staff || me?.is_superuser || me?.isAdmin || me?.role === "admin");
  const role = String(group?.current_user_role || "").toLowerCase();
  const isActiveMember = String(group?.membership_status || "").toLowerCase() === "active";
  const isElevated = role === "owner" || role === "admin" || role === "moderator";
  const forumEnabled = Boolean(group?.forum_enabled);
  const creationRestricted = Boolean(group?.posts_creation_restricted);
  const canCreatePost = Boolean(
    moderatorCanI?.can_create_post
    || (!forumEnabled ? isElevated : (creationRestricted ? isElevated : (isElevated || isActiveMember)))
  );

  // Report dialog handlers
  const openReport = React.useCallback((payload) => {
    setReportTarget(payload);
    setReportOpen(true);
  }, []);

  const closeReport = () => {
    if (reportBusy) return;
    setReportOpen(false);
    setReportTarget(null);
  };

  async function submitReport(reason, notes) {
    if (!reportTarget?.target_type || !reportTarget?.target_id) return;
    setReportBusy(true);
    try {
      const res = await fetch(toApiUrl("moderation/reports/"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          target_type: reportTarget.target_type,
          target_id: reportTarget.target_id,
          reason,
          notes,
        }),
      });

      if (res.status === 409) {
        alert("You already reported this content.");
        setReportBusy(false);
        return;
      }
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `HTTP ${res.status}`);
      }

      const payload = await res.json();
      reportTarget.onSuccess?.(payload);
      setReportOpen(false);
      setReportTarget(null);
    } catch (e) {
      alert("Could not submit report. Please try again.");
    } finally {
      setReportBusy(false);
    }
  }

  const handleReport = React.useCallback((payload) => {
    if (!payload) return;
    if (payload.target_type && payload.target_id) {
      openReport(payload);
      return;
    }
    const post = payload;
    if (!post?.id || !Number.isInteger(Number(post.id))) return;
    const blurred = !(viewerIsStaff || viewerId === post.author_id);
    openReport({
      target_type: "activity_feed.feeditem",
      target_id: Number(post.id),
      label: "post",
      onSuccess: () => {
        setPosts((curr) =>
          curr.map((p) =>
            p.id === post.id
              ? {
                ...p,
                moderation_status: "under_review",
                is_under_review: true,
                is_removed: false,
                can_engage: false,
                is_blurred: blurred,
              }
              : p
          )
        );
      },
    });
  }, [openReport, viewerId, viewerIsStaff]);

  const updatePollOption = (idx, val) => {
    setPollOptions((prev) => {
      const copy = [...prev];
      copy[idx] = val;
      return copy;
    });
  };
  const addPollOption = () => setPollOptions((prev) => [...prev, ""]);
  const removePollOption = (idx) => setPollOptions((prev) => prev.filter((_, i) => i !== idx));
  const cleanPollOptions = (opts) => (opts || []).map((o) => String(o || "").trim()).filter(Boolean);

  const handleCreatePost = async () => {
    if (postBusy) return;
    setPostBusy(true);
    try {
      if (postType === "image") {
        const fd = new FormData();
        fd.append("type", "image");
        if (postText.trim()) fd.append("text", postText.trim());
        if (postImageFile) fd.append("image", postImageFile, postImageFile.name);
        const res = await fetch(toApiUrl(`groups/${groupId}/posts/`), {
          method: "POST",
          headers: { ...authHeaders() },
          body: fd,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || "Failed to create image post");
        }
      } else if (postType === "link") {
        const payload = { type: "link", url: postLinkUrl.trim(), text: postText.trim() };
        const res = await fetch(toApiUrl(`groups/${groupId}/posts/`), {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || "Failed to create link post");
        }
      } else if (postType === "poll") {
        const payload = {
          question: pollQuestion.trim(),
          options: cleanPollOptions(pollOptions),
          group_id: Number(group?.id || groupId),
        };
        const res = await fetch(toApiUrl(`activity/feed/polls/create/`), {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || "Failed to create poll");
        }
      } else {
        const text = postText.trim();
        if (!text) throw new Error("Text is required");
        const res = await fetch(toApiUrl(`groups/${groupId}/posts/`), {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ type: "text", text }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || "Failed to create post");
        }
      }

      setPostText("");
      setPostImageFile(null);
      setPostLinkUrl("");
      setPollQuestion("");
      setPollOptions(["", ""]);
      await fetchPosts();
    } catch (e) {
      alert(e.message || "Failed to create post");
    } finally {
      setPostBusy(false);
    }
  };

  // Inside PostsTab function
  if (loading) {
    return (
      <Box>
        {/* Show 3 skeleton posts while loading */}
        <PostSkeleton />
        <PostSkeleton />
        <PostSkeleton />
      </Box>
    );
  }

  const hasRemovedPosts = postsMeta?.has_removed_posts || (postsMeta?.removed_posts > 0 && postsMeta?.visible_posts === 0);

  return (
    <Box>
      {canCreatePost && (
        <Paper sx={{ p: 2, mb: 2, border: `1px solid ${BORDER}`, borderRadius: 3 }}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={2} alignItems="center">
              <TextField
                select
                size="small"
                label="Post Type"
                value={postType}
                onChange={(e) => setPostType(e.target.value)}
                sx={{ minWidth: 200 }}
              >
                <MenuItem value="text">Text</MenuItem>
                <MenuItem value="image">Image</MenuItem>
                <MenuItem value="link">Link</MenuItem>
                <MenuItem value="poll">Poll</MenuItem>
              </TextField>
              <Button
                variant="contained"
                onClick={handleCreatePost}
                disabled={
                  postBusy
                  || (postType === "text" && !postText.trim())
                  || (postType === "image" && !postImageFile)
                  || (postType === "link" && !postLinkUrl.trim())
                  || (postType === "poll" && (!pollQuestion.trim() || cleanPollOptions(pollOptions).length < 2))
                }
              >
                {postBusy ? "Posting..." : "Post"}
              </Button>
            </Stack>

            {postType === "text" && (
              <TextField
                multiline
                minRows={3}
                placeholder="Write a post..."
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
              />
            )}

            {postType === "image" && (
              <>
                <TextField
                  multiline
                  minRows={2}
                  placeholder="Caption (optional)"
                  value={postText}
                  onChange={(e) => setPostText(e.target.value)}
                />
                <Stack direction="row" spacing={1} alignItems="center">
                  <Button variant="outlined" component="label" startIcon={<InsertPhotoRoundedIcon />}>
                    Choose image
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={(e) => setPostImageFile(e.target.files?.[0] || null)}
                    />
                  </Button>
                  <Typography variant="body2" color="text.secondary">
                    {postImageFile ? postImageFile.name : "No file selected"}
                  </Typography>
                </Stack>
              </>
            )}

            {postType === "link" && (
              <>
                <TextField
                  placeholder="https://example.com"
                  label="URL"
                  value={postLinkUrl}
                  onChange={(e) => setPostLinkUrl(e.target.value)}
                />
                <TextField
                  multiline
                  minRows={2}
                  placeholder="Comment (optional)"
                  value={postText}
                  onChange={(e) => setPostText(e.target.value)}
                />
              </>
            )}

            {postType === "poll" && (
              <>
                <TextField
                  label="Poll question"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                />
                <Stack spacing={1}>
                  {pollOptions.map((opt, idx) => (
                    <Stack key={idx} direction="row" spacing={1} alignItems="center">
                      <TextField
                        label={`Option ${idx + 1}`}
                        value={opt}
                        onChange={(e) => updatePollOption(idx, e.target.value)}
                        fullWidth
                      />
                      {pollOptions.length > 2 && (
                        <Button size="small" onClick={() => removePollOption(idx)}>Remove</Button>
                      )}
                    </Stack>
                  ))}
                  <Button size="small" onClick={addPollOption}>
                    Add option
                  </Button>
                </Stack>
              </>
            )}
          </Stack>
        </Paper>
      )}

      {!posts.length ? (
        <Paper sx={{ p: 3, border: `1px solid ${BORDER}`, borderRadius: 3, textAlign: "center" }}>
          <Typography color="text.secondary" sx={{ fontStyle: hasRemovedPosts ? "italic" : "normal" }}>
            {hasRemovedPosts
              ? "This content was removed by moderators."
              : "No posts in this group yet."}
          </Typography>
        </Paper>
      ) : (
        posts.map(p => (
          <PostCard
            key={p.id}
            post={p}
            onReact={handleReact}
            onPollVote={(post, optId) => handlePollVote(post, optId)}
            onReport={handleReport}
            viewerId={viewerId}
            viewerIsStaff={viewerIsStaff}
          />
        ))
      )}
      <ReportDialog
        open={reportOpen}
        onClose={closeReport}
        onSubmit={submitReport}
        loading={reportBusy}
        targetLabel={reportTarget?.label}
      />
    </Box>
  );
}

function MembersTab({ groupId }) {
  const [members, setMembers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [q, setQ] = React.useState("");

  const [selectedCompanies, setSelectedCompanies] = React.useState([]);
  const [selectedRegions, setSelectedRegions] = React.useState([]);
  const [selectedTitles, setSelectedTitles] = React.useState([]);
  const [selectedIndustries, setSelectedIndustries] = React.useState([]);
  const [selectedCompanySizes, setSelectedCompanySizes] = React.useState([]);

  const [globalOptions, setGlobalOptions] = React.useState({
    companies: [],
    titles: [],
    industries: [],
    sizes: [],
    regions: [],
  });

  const getCompanyFromUser = (u) => (u?.company_from_experience || "").trim();
  const getJobTitleFromUser = (u) =>
    (u?.position_from_experience || u?.profile?.job_title || u?.job_title || "").trim();
  const getIndustryFromUser = (u) =>
    (u?.industry_from_experience || u?.profile?.industry || u?.industry || "").trim();
  const getCompanySizeFromUser = (u) =>
    (u?.number_of_employees_from_experience || u?.profile?.number_of_employees || u?.number_of_employees || "").trim();
  const getLocationFromUser = (u) => (u?.location || u?.profile?.location || "").trim();
  const getCountryFromUser = (u) => extractCountryFromLocation(getLocationFromUser(u)).trim();

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(toApiUrl("users/filters/"), {
          headers: { Accept: "application/json", ...authHeaders() },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!alive) return;

        const regionSet = new Set();
        (data.locations || []).forEach((loc) => {
          const c = extractCountryFromLocation(loc);
          if (c) regionSet.add(c);
        });
        const sortedRegions = Array.from(regionSet).sort((a, b) => a.localeCompare(b));

        const sizeSet = new Set([...(data.sizes || []), ...LINKEDIN_COMPANY_SIZES]);
        const sortedSizes = Array.from(sizeSet).sort(
          (a, b) => getMinCompanySize(a) - getMinCompanySize(b)
        );

        setGlobalOptions({
          companies: data.companies || [],
          titles: data.titles || [],
          industries: data.industries || [],
          sizes: sortedSizes,
          regions: sortedRegions,
        });
      } catch (e) {
        console.error("Failed to load filter options", e);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await fetch(toApiUrl(`groups/${groupId}/members/`), { headers: { Accept: "application/json", ...authHeaders() } });
        const d = r.ok ? await r.json() : [];
        setMembers(Array.isArray(d?.results) ? d.results : (Array.isArray(d) ? d : []));
      } catch { }
      setLoading(false);
    })();
  }, [groupId]);

  const filtered = React.useMemo(() => {
    let list = members;

    if (selectedCompanies.length) {
      list = list.filter((m) => selectedCompanies.includes(getCompanyFromUser(m.user || m)));
    }
    if (selectedRegions.length) {
      list = list.filter((m) => selectedRegions.includes(getCountryFromUser(m.user || m)));
    }
    if (selectedTitles.length) {
      list = list.filter((m) => selectedTitles.includes(getJobTitleFromUser(m.user || m)));
    }
    if (selectedIndustries.length) {
      list = list.filter((m) => selectedIndustries.includes(getIndustryFromUser(m.user || m)));
    }
    if (selectedCompanySizes.length) {
      list = list.filter((m) => selectedCompanySizes.includes(getCompanySizeFromUser(m.user || m)));
    }

    const t = q.trim().toLowerCase();
    if (!t) return list;

    return list.filter((m) => {
      const u = m.user || m;
      const name = (u?.name || u?.full_name || u?.username || "").toLowerCase();
      const email = (u?.email || "").toLowerCase();
      const company = getCompanyFromUser(u).toLowerCase();
      const title = getJobTitleFromUser(u).toLowerCase();
      const industry = getIndustryFromUser(u).toLowerCase();
      const location = getLocationFromUser(u).toLowerCase();
      const hay = `${name} ${email} ${company} ${title} ${industry} ${location}`;
      return hay.includes(t);
    });
  }, [
    members,
    q,
    selectedCompanies,
    selectedRegions,
    selectedTitles,
    selectedIndustries,
    selectedCompanySizes,
  ]);

  if (loading) {
    return <ListSkeleton count={5} type="short" />;
  }

  return (
    <Box>
      <Paper
        sx={{
          p: 1.5,
          mb: 1.5,
          border: `1px solid ${BORDER}`,
          borderRadius: 3,
        }}
      >
        <Stack spacing={1.25}>
          <TextField
            value={q}
            onChange={(e) => setQ(e.target.value)}
            size="small"
            placeholder="Search by name, email, company, title, industry, location..."
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Autocomplete
              multiple
              fullWidth
              size="small"
              options={globalOptions.companies}
              value={selectedCompanies}
              onChange={(_, newValue) => setSelectedCompanies(newValue)}
              filterSelectedOptions
              disableCloseOnSelect
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Company"
                  placeholder={selectedCompanies.length ? "" : "All companies"}
                />
              )}
              sx={{ flex: 1 }}
            />

            <Autocomplete
              multiple
              fullWidth
              size="small"
              options={globalOptions.regions}
              value={selectedRegions}
              onChange={(_, newValue) => setSelectedRegions(newValue)}
              filterSelectedOptions
              disableCloseOnSelect
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Region"
                  placeholder={selectedRegions.length ? "" : "All regions"}
                />
              )}
              sx={{ flex: 1 }}
            />

            <Autocomplete
              multiple
              fullWidth
              size="small"
              options={globalOptions.titles}
              value={selectedTitles}
              onChange={(_, newValue) => setSelectedTitles(newValue)}
              filterSelectedOptions
              disableCloseOnSelect
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Job title"
                  placeholder={selectedTitles.length ? "" : "All job titles"}
                />
              )}
              sx={{ flex: 1 }}
            />
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField
              size="small"
              select
              fullWidth
              label="Industry"
              value={selectedIndustries}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedIndustries(
                  typeof value === "string" ? value.split(",") : value
                );
              }}
              InputLabelProps={{ shrink: true }}
              SelectProps={{
                multiple: true,
                displayEmpty: true,
                renderValue: (selected) => {
                  if (!selected || selected.length === 0) return "All industries";
                  return selected.join(", ");
                },
              }}
              sx={{ flex: 1 }}
            >
              {globalOptions.industries.map((name) => (
                <MenuItem key={name} value={name}>
                  <Checkbox checked={selectedIndustries.indexOf(name) > -1} />
                  <ListItemText primary={name} />
                </MenuItem>
              ))}
            </TextField>

            <TextField
              size="small"
              select
              fullWidth
              label="Company Size"
              value={selectedCompanySizes}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedCompanySizes(
                  typeof value === "string" ? value.split(",") : value
                );
              }}
              InputLabelProps={{ shrink: true }}
              SelectProps={{
                multiple: true,
                displayEmpty: true,
                renderValue: (selected) => {
                  if (!selected || selected.length === 0) return "All sizes";
                  return selected.map((s) => formatCompanySizeLabel(s)).join(", ");
                },
              }}
              sx={{ flex: 1 }}
            >
              {globalOptions.sizes.map((name) => (
                <MenuItem key={name} value={name}>
                  <Checkbox checked={selectedCompanySizes.indexOf(name) > -1} />
                  <ListItemText primary={formatCompanySizeLabel(name)} />
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </Stack>
      </Paper>

      {!filtered.length && (
        <Typography color="text.secondary" sx={{ mb: 1 }}>
          No members match your filters.
        </Typography>
      )}

      <List>
        {filtered.map(m => {
          const u = m.user || m;
          return (
            <ListItem key={u.id} sx={{ border: "1px solid #eee", borderRadius: 2, mb: 1 }}>
              <ListItemAvatar>
                <Avatar src={toMediaUrl(u.avatar)} sx={{ width: 40, height: 40 }}>
                  {(u.name || u.full_name || u.username || "U")[0]}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Typography component="span" variant="body1">
                    {u.name || u.full_name || u.username}
                    {u.kyc_status === "approved" && (
                      <VerifiedIcon
                        sx={{
                          fontSize: 16,
                          color: "#22d3ee",
                          ml: 0.5,
                          verticalAlign: "middle",
                        }}
                      />
                    )}
                  </Typography>
                }
                secondary={m.role || "Member"}
              />
            </ListItem>
          );
        })}
      </List>
    </Box>
  );
}

function RequestsTab({ groupId, canApprove, onApproved }) {
  const [requests, setRequests] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [actionBusy, setActionBusy] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const r = await fetch(toApiUrl(`groups/${groupId}/member-requests/`), {
          headers: { Accept: "application/json", ...authHeaders() },
        });
        if (!r.ok) {
          const msg = r.status === 403 ? "Forbidden" : "Failed to load requests.";
          throw new Error(msg);
        }
        const d = await r.json();
        const rows = Array.isArray(d?.requests) ? d.requests : (Array.isArray(d) ? d : []);
        if (mounted) setRequests(rows);
      } catch (e) {
        if (mounted) setError(e?.message || "Failed to load requests.");
      }
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; };
  }, [groupId]);

  if (loading) return <ListSkeleton count={4} type="short" />;
  if (error) return <Typography color="error">{error}</Typography>;
  if (!requests.length) return <Typography color="text.secondary">No pending requests.</Typography>;

  const handleAction = async (userId, action) => {
    if (!userId) return;
    setActionBusy(true);
    setError("");
    try {
      const url = toApiUrl(`groups/${groupId}/member-requests/${action}/${userId}/`);
      const r = await fetch(url, { method: "POST", headers: { Accept: "application/json", ...authHeaders() } });
      if (!r.ok) throw new Error("Request failed.");
      setRequests(curr => curr.filter(req => (req.user?.id || req.user_id || req.id) !== userId));
      if (action === "approve") onApproved?.(userId);
    } catch (e) {
      setError(e?.message || "Request failed.");
    }
    setActionBusy(false);
  };

  return (
    <List>
      {requests.map((req) => {
        const u = req.user || req;
        const uid = u.id || req.user_id || req.id;
        return (
          <ListItem key={req.id || u.id} sx={{ border: "1px solid #eee", borderRadius: 2, mb: 1 }}>
            <ListItemAvatar><Avatar src={toMediaUrl(u.avatar || u.user_image)} /></ListItemAvatar>
            <ListItemText
              primary={u.name || u.full_name || u.username || u.email || "User"}
              secondary={`Pending · ${formatWhen(req.joined_at || req.created_at || req.requested_at)}`}
            />
            {canApprove && (
              <ListItemSecondaryAction>
                <Stack direction="row" spacing={1}>
                  <Button size="small" variant="outlined" disabled={actionBusy} onClick={() => handleAction(uid, "approve")}>
                    Approve
                  </Button>
                  <Button size="small" color="error" variant="outlined" disabled={actionBusy} onClick={() => handleAction(uid, "reject")}>
                    Reject
                  </Button>
                </Stack>
              </ListItemSecondaryAction>
            )}
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
        {group.parent_group && (
          <Typography variant="body2">
            Parent Group: <b>{group.parent_group.name}</b>
          </Typography>
        )}
        <Typography variant="body2">Created: {new Date(group.created_at).toLocaleDateString()}</Typography>
      </Card>
    </Stack>
  );
}

function SettingsTab({ group, onUpdate }) {
  const token = authHeaders().Authorization;
  const [name, setName] = React.useState(group?.name || "");
  const [description, setDescription] = React.useState(group?.description || "");
  // Default to public if missing, but respect parent visibility logic handled in backend/manage page
  const [visibility, setVisibility] = React.useState(group?.visibility || "public");
  // Default to open. If private, backend/UI usually forces invite.
  const [joinPolicy, setJoinPolicy] = React.useState(group?.join_policy || "open");
  const isSubgroup = Boolean(group?.parent_id || group?.parent_group?.id || group?.parent?.id || group?.parent);
  const [parentInfo, setParentInfo] = React.useState({ visibility: "", join_policy: "" });

  const [loading, setLoading] = React.useState(false);
  const [logoFile, setLogoFile] = React.useState(null);
  const [logoPreview, setLogoPreview] = React.useState(group?.logo ? toMediaUrl(group.logo) : "");
  const [coverFile, setCoverFile] = React.useState(null);
  const [coverPreview, setCoverPreview] = React.useState(group?.cover_image ? toMediaUrl(group.cover_image) : "");
  const [forumEnabled, setForumEnabled] = React.useState(Boolean(group?.forum_enabled));
  const [postsCreationRestricted, setPostsCreationRestricted] = React.useState(Boolean(group?.posts_creation_restricted));
  const [postsCommentsEnabled, setPostsCommentsEnabled] = React.useState(Boolean(group?.posts_comments_enabled));
  const [commLoading, setCommLoading] = React.useState(false);

  // Update local state when group changes (e.g. re-fetch)
  React.useEffect(() => {
    if (group) {
      setName(group.name || "");
      setDescription(group.description || "");
      setVisibility(group.visibility || "public");
      const jp = (group.join_policy || "").toLowerCase();
      setJoinPolicy(jp === "public_approval" ? "approval" : (jp || "open"));
      setLogoPreview(group.logo ? toMediaUrl(group.logo) : "");
      setCoverPreview(group.cover_image ? toMediaUrl(group.cover_image) : "");
      setForumEnabled(Boolean(group.forum_enabled));
      setPostsCreationRestricted(Boolean(group.posts_creation_restricted));
      setPostsCommentsEnabled(Boolean(group.posts_comments_enabled));
    }
  }, [group]);

  React.useEffect(() => {
    if (!group?.id) return;
    let active = true;
    setCommLoading(true);
    fetch(toApiUrl(`groups/${group.id}/settings/communication/`), {
      headers: { Accept: "application/json", ...authHeaders() },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!active || !d) return;
        setForumEnabled(Boolean(d.forum_enabled));
        setPostsCreationRestricted(Boolean(d.posts_creation_restricted));
        setPostsCommentsEnabled(Boolean(d.posts_comments_enabled));
      })
      .catch(() => { })
      .finally(() => {
        if (active) setCommLoading(false);
      });
    return () => { active = false; };
  }, [group?.id]);

  // Load parent visibility/join policy for subgroup rules
  React.useEffect(() => {
    if (!group || !isSubgroup) {
      setParentInfo({ visibility: "", join_policy: "" });
      return;
    }

    const pv = group?.parent_group?.visibility || group?.parent?.visibility;
    const pj = group?.parent_group?.join_policy || group?.parent?.join_policy;
    if (pv || pj) {
      setParentInfo({ visibility: pv || "", join_policy: pj || "" });
      return;
    }

    const pid =
      group?.parent_group?.id ||
      group?.parent_id ||
      group?.parent?.id ||
      (typeof group?.parent === "number" ? group.parent : null);
    if (!pid) return;

    let active = true;
    fetch(toApiUrl(`groups/${pid}/`), { headers: { Accept: "application/json", ...authHeaders() } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!active || !d) return;
        setParentInfo({ visibility: d.visibility || "", join_policy: d.join_policy || "" });
      })
      .catch(() => { });
    return () => { active = false; };
  }, [group, isSubgroup]);

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setLogoPreview(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleCoverChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setCoverPreview(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      let commResult = null;
      const commRes = await fetch(toApiUrl(`groups/${group.id}/settings/communication/`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          forum_enabled: forumEnabled,
          posts_creation_restricted: postsCreationRestricted,
          posts_comments_enabled: postsCommentsEnabled,
        }),
      });
      if (!commRes.ok) {
        const err = await commRes.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to update communication settings");
      }
      commResult = await commRes.json();

      const fd = new FormData();
      fd.append("name", name.trim());
      fd.append("description", description.trim());
      fd.append("visibility", visibility);
      const parentVis = String(parentInfo.visibility || "").toLowerCase();
      const parentJoin = String(parentInfo.join_policy || "").toLowerCase();
      const parentAllowsOpen = !isSubgroup || (parentVis === "public" && parentJoin === "open");
      let safePolicy = joinPolicy;
      if (visibility === "private") safePolicy = "invite";
      else if (!parentAllowsOpen && safePolicy === "open") safePolicy = "approval";
      fd.append("join_policy", safePolicy);

      if (logoFile) {
        fd.append("logo", logoFile);
      }
      if (coverFile) {
        fd.append("cover_image", coverFile);
      }

      const res = await fetch(toApiUrl(`groups/${group.id}/`), {
        method: "PATCH",
        headers: { Authorization: token }, // FormData doesn't need Content-Type header
        body: fd,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to update settings");
      }

      let updatedGroup = await res.json();
      if (commResult) updatedGroup = { ...updatedGroup, ...commResult };
      onUpdate?.(updatedGroup);
      alert("Settings updated successfully!");
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const parentVis = String(parentInfo.visibility || "").toLowerCase();
  const parentJoin = String(parentInfo.join_policy || "").toLowerCase();
  const parentAllowsOpen = !isSubgroup || (parentVis === "public" && parentJoin === "open");

  React.useEffect(() => {
    if (visibility === "private") {
      if (joinPolicy !== "invite") setJoinPolicy("invite");
      return;
    }
    const allowed = parentAllowsOpen ? ["open", "approval", "invite"] : ["approval", "invite"];
    if (!allowed.includes(joinPolicy)) {
      setJoinPolicy("approval");
    }
  }, [visibility, joinPolicy, parentAllowsOpen]);

  return (
    <Stack spacing={3} maxWidth="md">
      <Card variant="outlined" sx={{ borderRadius: 3, borderColor: BORDER, p: 3 }}>
        <Typography variant="h6" gutterBottom fontWeight={700}>
          General Settings
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              label="Group Name"
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Description"
              fullWidth
              multiline
              minRows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <TextField
                select
                label="Visibility"
                value={visibility}
                onChange={(e) => {
                  const nextVis = e.target.value;
                  setVisibility(nextVis);
                  if (nextVis === "private") {
                    setJoinPolicy("invite");
                    return;
                  }
                  setJoinPolicy((prev) => {
                    if (!prev) return parentAllowsOpen ? "open" : "approval";
                    if (prev === "open" && !parentAllowsOpen) return "approval";
                    return prev;
                  });
                }}
                helperText={
                  visibility === "private"
                    ? "Private groups are invite-only."
                    : (!parentAllowsOpen ? "Public subgroups under non-open parents cannot be Open." : "")
                }
              >
                <MenuItem value="public">Public</MenuItem>
                <MenuItem value="private">Private</MenuItem>
              </TextField>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <TextField
                select
                label="Join Policy"
                value={joinPolicy}
                onChange={(e) => setJoinPolicy(e.target.value)}
                disabled={visibility === 'private'}
              >
                {visibility === "private" ? (
                  <MenuItem value="invite">Invite only (By invitation only)</MenuItem>
                ) : (
                  <>
                    {parentAllowsOpen && (
                      <MenuItem value="open">Open (Join instantly)</MenuItem>
                    )}
                    <MenuItem value="approval">Approval required (Request approval)</MenuItem>
                    <MenuItem value="invite">Invite only (By invitation only)</MenuItem>
                  </>
                )}
              </TextField>
            </FormControl>
          </Grid>
        </Grid>
      </Card>

      <Card variant="outlined" sx={{ borderRadius: 3, borderColor: BORDER, p: 3 }}>
        <Typography variant="h6" gutterBottom fontWeight={700}>
          Communication / Forum
        </Typography>
        <Stack spacing={1.5}>
          <FormControlLabel
            control={
              <Switch
                checked={forumEnabled}
                onChange={(e) => setForumEnabled(e.target.checked)}
                disabled={commLoading || loading}
              />
            }
            label="Enable Forum"
          />
          <FormControlLabel
            control={
              <Switch
                checked={postsCreationRestricted}
                onChange={(e) => setPostsCreationRestricted(e.target.checked)}
                disabled={!forumEnabled || commLoading || loading}
              />
            }
            label="Restrict posting to admins only"
          />
          <FormControlLabel
            control={
              <Switch
                checked={postsCommentsEnabled}
                onChange={(e) => setPostsCommentsEnabled(e.target.checked)}
                disabled={!forumEnabled || commLoading || loading}
              />
            }
            label="Enable comments"
          />
          <Typography variant="caption" color="text.secondary">
            Forum settings control who can create posts and whether comments are enabled.
          </Typography>
        </Stack>
      </Card>

      <Card variant="outlined" sx={{ borderRadius: 3, borderColor: BORDER, p: 3 }}>
        <Typography variant="h6" gutterBottom fontWeight={700}>
          Group Visuals
        </Typography>
        <Stack spacing={4}>
          {/* Logo Section */}
          <Stack direction="row" spacing={3} alignItems="center">
            <Box
              sx={{
                width: 100,
                height: 100,
                borderRadius: "50%",
                overflow: "hidden",
                border: `1px solid ${BORDER}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "grey.100",
              }}
            >
              {logoPreview ? (
                <Box component="img" src={logoPreview} sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <ImageRoundedIcon sx={{ color: "grey.400", fontSize: 40 }} />
              )}
            </Box>
            <Box>
              <Typography variant="subtitle2" gutterBottom>Group Icon</Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Recommended 200x200px. Max 5MB.
              </Typography>
              <Stack direction="row" spacing={2}>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<InsertPhotoRoundedIcon />}
                >
                  Upload Icon
                  <input type="file" hidden accept="image/*" onChange={handleLogoChange} />
                </Button>
                {logoPreview && (
                  <Button
                    color="error"
                    onClick={() => {
                      setLogoFile(null);
                      setLogoPreview("");
                    }}
                  >
                    Remove
                  </Button>
                )}
              </Stack>
            </Box>
          </Stack>

          <Divider />

          {/* Cover Image Section */}
          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle2" gutterBottom>Cover Image</Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Recommended 800x400px. Max 5MB.
              </Typography>
            </Box>
            <Box
              sx={{
                width: "100%",
                height: 200,
                borderRadius: 2,
                overflow: "hidden",
                border: `1px solid ${BORDER}`,
                bgcolor: "grey.100",
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              {coverPreview ? (
                <Box component="img" src={coverPreview} sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <ImageRoundedIcon sx={{ color: "grey.400", fontSize: 60 }} />
              )}
            </Box>
            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                component="label"
                startIcon={<InsertPhotoRoundedIcon />}
              >
                Upload Cover
                <input type="file" hidden accept="image/*" onChange={handleCoverChange} />
              </Button>
              {coverPreview && (
                <Button
                  color="error"
                  onClick={() => {
                    setCoverFile(null);
                    setCoverPreview("");
                  }}
                >
                  Remove
                </Button>
              )}
            </Stack>
          </Stack>
        </Stack>
      </Card>

      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <Button
          variant="contained"
          size="large"
          onClick={handleSave}
          disabled={loading}
          sx={{ minWidth: 150 }}
        >
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </Box>
    </Stack>
  );
}

// -----------------------------------------------------------------------------
// SKELETON COMPONENTS
// -----------------------------------------------------------------------------

function PostSkeleton() {
  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 3, borderColor: "#e2e8f0" }}>
      {/* Header Skeleton */}
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
        <Skeleton variant="circular" width={40} height={40} />
        <Box sx={{ flex: 1 }}>
          <Skeleton variant="text" width="40%" height={24} />
          <Skeleton variant="text" width="20%" height={16} />
        </Box>
      </Stack>

      {/* Body Skeleton */}
      <Box sx={{ mb: 2 }}>
        <Skeleton variant="text" sx={{ fontSize: '1rem' }} />
        <Skeleton variant="text" sx={{ fontSize: '1rem' }} width="80%" />
        <Skeleton variant="text" sx={{ fontSize: '1rem' }} width="60%" />
        <Skeleton variant="rectangular" height={200} sx={{ mt: 2, borderRadius: 2 }} />
      </Box>

      <Divider sx={{ mb: 1 }} />

      {/* Actions Skeleton */}
      <Stack direction="row" justifyContent="space-around">
        <Skeleton variant="rectangular" width={60} height={30} sx={{ borderRadius: 1 }} />
        <Skeleton variant="rectangular" width={60} height={30} sx={{ borderRadius: 1 }} />
        <Skeleton variant="rectangular" width={60} height={30} sx={{ borderRadius: 1 }} />
      </Stack>
    </Paper>
  );
}

function ListSkeleton({ count = 3, type = "text" }) {
  return (
    <Stack spacing={2} sx={{ mt: 1 }}>
      {Array.from(new Array(count)).map((_, index) => (
        <Stack key={index} direction="row" spacing={2} alignItems="center">
          <Skeleton variant="circular" width={40} height={40} />
          <Box sx={{ width: '100%' }}>
            <Skeleton variant="text" width={type === 'short' ? "40%" : "70%"} height={20} />
            {type !== 'short' && <Skeleton variant="text" width="40%" height={16} />}
          </Box>
        </Stack>
      ))}
    </Stack>
  );
}

// -----------------------------------------------------------------------------
// 8. MAIN PAGE
// -----------------------------------------------------------------------------

export default function GroupDetailsPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [group, setGroup] = React.useState(null);
  const [tab, setTab] = React.useState(0);
  const [me, setMe] = React.useState(null);
  const [canSeeRequests, setCanSeeRequests] = React.useState(false);
  const [canApproveRequests, setCanApproveRequests] = React.useState(false);
  const [moderatorCanI, setModeratorCanI] = React.useState(null);

  const [toast, setToast] = React.useState({ open: false, msg: "", type: "info" });
  const [leaveDialogOpen, setLeaveDialogOpen] = React.useState(false);

  // Back Button Logic
  const backTo = location.state?.backTo || "/community?view=feed";
  const backLabel = location.state?.backLabel || "Back to Explore Groups";

  // --- Actions ---
  const fetchGroup = React.useCallback(async () => {
    try {
      const rMe = await fetch(toApiUrl("users/me/"), { headers: { Accept: "application/json", ...authHeaders() } });
      if (rMe.ok) setMe(await rMe.json());

      const rGroup = await fetch(toApiUrl(`groups/${groupId}/`), { headers: { Accept: "application/json", ...authHeaders() } });
      if (rGroup.ok) setGroup(await rGroup.json());

      const rCan = await fetch(toApiUrl(`groups/${groupId}/moderator/can-i/`), { headers: { Accept: "application/json", ...authHeaders() } });
      if (rCan.ok) {
        const can = await rCan.json();
        setCanSeeRequests(Boolean(can?.is_admin || can?.is_moderator));
        setCanApproveRequests(Boolean(can?.is_admin));
        setModeratorCanI(can);
      } else {
        setCanSeeRequests(false);
        setCanApproveRequests(false);
        setModeratorCanI(null);
      }
    } catch { }
  }, [groupId]);

  React.useEffect(() => {
    fetchGroup();
  }, [fetchGroup]);

  const handleJoin = async () => {
    if (!group?.id) return;
    try {
      const res = await fetch(toApiUrl(`groups/${group.id}/join/`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: "{}"
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setToast({ open: true, msg: data?.detail || "Failed to join group", type: "error" });
        return;
      }
      setToast({ open: true, msg: "Joined successfully!", type: "success" });
      fetchGroup();
    } catch (e) {
      setToast({ open: true, msg: e.message || "Error joining group", type: "error" });
    }
  };

  const handleLeaveClick = () => {
    setLeaveDialogOpen(true);
  };

  const confirmLeave = async () => {
    setLeaveDialogOpen(false);
    if (!group?.id) return;

    // Capture role before leaving
    const role = group?.current_user_role;

    try {
      const res = await fetch(toApiUrl(`groups/${group.id}/leave/`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: "{}"
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setToast({ open: true, msg: data?.detail || "Failed to leave group", type: "error" });
        return;
      }
      setToast({ open: true, msg: "Left group successfully.", type: "success" });

      // Redirect if Member or Moderator (or generally anyone who leaves)
      // User specifically asked for Member/Moderator redirect to feed.
      if (role === "member" || role === "moderator") {
        navigate("/community?view=feed");
      } else {
        // Fallback or for owners (though owners usually can't leave this way)
        fetchGroup();
      }
    } catch (e) {
      setToast({ open: true, msg: e.message || "Error leaving group", type: "error" });
    }
  };

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



  const tabDefs = React.useMemo(() => {
    const items = [
      { label: "POSTS", icon: <ArticleOutlinedIcon />, render: () => <PostsTab groupId={groupId} group={group} moderatorCanI={moderatorCanI} /> },
      { label: "MEMBERS", icon: <PeopleOutlineRoundedIcon />, render: () => <MembersTab groupId={groupId} /> },
    ];
    if (canSeeRequests) {
      items.push({
        label: "REQUESTS",
        icon: <PeopleOutlineRoundedIcon />,
        render: () => (
          <RequestsTab
            groupId={groupId}
            canApprove={canApproveRequests}
            onApproved={() =>
              setGroup((prev) => prev ? { ...prev, member_count: Number(prev.member_count || 0) + 1 } : prev)
            }
          />
        ),
      });
    }
    // New Settings Tab
    if (canApproveRequests) { // Owners/Admins
      items.push({
        label: "SETTINGS",
        icon: <SettingsRoundedIcon />,
        render: () => <SettingsTab group={group} onUpdate={setGroup} />,
      });
    }
    items.push({ label: "OVERVIEW", icon: <InfoOutlinedIcon />, render: () => <OverviewTab group={group} /> });
    return items;
  }, [canApproveRequests, canSeeRequests, group, groupId]);

  React.useEffect(() => {
    if (tab >= tabDefs.length) setTab(0);
  }, [tab, tabDefs.length]);

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
        {/* LEFT: Main group content (full-width like Groups page) */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* Group header */}
          <Box sx={{ mb: 2 }}>
            <Button
              startIcon={<ArrowBackRoundedIcon />}
              onClick={() => navigate(backTo)}
              sx={{
                textTransform: "none",
                color: "text.primary",
                fontWeight: 600,
                minWidth: "auto",
                px: 1,
                "&:hover": { bgcolor: "rgba(0,0,0,0.04)" }
              }}
            >
              {backLabel}
            </Button>
          </Box>
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
                  src={toMediaUrl(group?.logo || group?.avatar || group?.photo || group?.image)}
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
                    {group?.parent_group && (
                      <>
                        {" • Subgroup of "}
                        <Link
                          component={RouterLink}
                          to={`/community/groups/${group.parent_group.id}`}
                          sx={{ fontWeight: 600, color: "inherit", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
                        >
                          {group.parent_group.name}
                        </Link>
                      </>
                    )}
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  startIcon={<ChatBubbleOutlineRoundedIcon />}
                  onClick={() => navigate(`/community?view=messages`)} // Example route
                >
                  Message
                </Button>
                {(() => {
                  const status = group?.membership_status;
                  const role = group?.current_user_role;
                  const isMember = status === "active" || (role && role !== "none");
                  const isPending = status === "pending";

                  if (isMember) {
                    return (
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={handleLeaveClick}
                      >
                        Leave
                      </Button>
                    );
                  } else if (isPending) {
                    return (
                      <Button variant="outlined" disabled>
                        Pending
                      </Button>
                    );
                  } else {
                    return (
                      <Button
                        variant="contained"
                        onClick={handleJoin}
                        sx={{ bgcolor: "#0ea5a4", "&:hover": { bgcolor: "#0d9488" } }}
                      >
                        Join Group
                      </Button>
                    );
                  }
                })()}
              </Stack>
            </CardContent>
          </Card>

          {/* Tabs + tab content */}
          <Card
            variant="outlined"
            sx={{ borderRadius: 3, borderColor: BORDER }}
          >
            <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
              <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2 }}>
                {tabDefs.map((t) => (
                  <Tab key={t.label} icon={t.icon} iconPosition="start" label={t.label} />
                ))}
              </Tabs>
            </Box>
            <CardContent sx={{ p: 3 }}>
              {tabDefs[tab]?.render?.()}
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

      <Dialog open={leaveDialogOpen} onClose={() => setLeaveDialogOpen(false)}>
        <DialogTitle>Leave Group?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to leave this group? You will no longer receive updates from it.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLeaveDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmLeave} color="error" variant="contained">
            Leave Group
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={toast.type} onClose={() => setToast(prev => ({ ...prev, open: false }))}>
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box >
  );
}
