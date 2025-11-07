// src/pages/community/LiveFeedPage.jsx
import * as React from "react";
import {
  Avatar, Box, Button, Chip, Grid, IconButton, LinearProgress, Link,
  Paper, Stack, TextField, Typography, InputAdornment
} from "@mui/material";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import IosShareIcon from "@mui/icons-material/IosShare";
import ThumbUpAltOutlinedIcon from "@mui/icons-material/ThumbUpAltOutlined";
import HowToVoteOutlinedIcon from "@mui/icons-material/HowToVoteOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import SearchIcon from "@mui/icons-material/Search";
import CommunityProfileCard from "../../components/CommunityProfileCard.jsx";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  CircularProgress, List, ListItem, ListItemAvatar, ListItemText, Divider
} from "@mui/material";


const BORDER = "#e2e8f0";

// ---- API helpers (kept from your file) ----
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
  // if backend already serves under /media/, keep it; else prefix /media/
  return `${API_ORIGIN}/${rel.startsWith("media/") ? rel : `media/${rel}`}`;
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

function formatWhen(ts) {
  try { return new Date(ts).toLocaleString(); } catch { return ts; }
}

// small debounce hook for search
function useDebounced(value, delay = 400) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}
function pickId(...cands) {
  for (const v of cands) {
    if (v === 0 || v === "0") return 0;
    if (v !== null && v !== undefined && v !== "" && v !== "null") {
      const n = Number(v);
      return Number.isFinite(n) ? n : v; // keep numeric if possible
    }
  }
  return null;
}

// ---- FEED MAPPER (adds group_id globally) ----
function mapFeedItem(item) {
  // --- Robust metadata parsing (handles string or object) ---
  const rawMeta =
    item?.metadata ??
    item?.meta ??
    item?.data ??
    item?.payload ??
    null;

  let m = {};
  if (rawMeta) {
    if (typeof rawMeta === "string") {
      try { m = JSON.parse(rawMeta); } catch { m = {}; }
    } else if (typeof rawMeta === "object") {
      m = rawMeta;
    }
  }

  // Normalize verb (some serializers use different keys)
  const verb = String(item?.verb || item?.action || item?.activity || "").toLowerCase();
  const isEventVerb = verb.includes("event"); // covers "created event", "updated event", etc.

  const displayName =
    item.actor_name || item.actor_username || `User #${item.actor_id}`;

  const community_id =
    item?.community_id ??
    m?.community_id ??
    m?.communityId ??
    (typeof m?.community === "object" ? m.community?.id : m?.community) ??
    (typeof item?.community === "object" ? item.community?.id : item?.community) ??
    null;

  const base = {
    id: item.id,
    created_at: item.created_at,
    author: { name: displayName, avatar: item.actor_avatar || "" },
    community_id: community_id ? Number(community_id) : null,
    community_avatar: m.community_cover_url || "",
    community:
      m.community_name ||
      m.community?.name ||
      item.community_name ||
      item.community?.name ||
      m.community_title ||
      item.community_title ||
      ((item.community_id ?? m.community_id)
        ? `Community #${item.community_id ?? m.community_id}`
        : ""),
    group_id: item.group_id ?? m.group_id ?? null,
    group_avatar: m.group_cover_url || "",
    group: m.group_name || (m.group_id ? `Group #${m.group_id}` : "—"),
    visibility: m.visibility || item.visibility || null,
    metrics: {
      likes: Number(m.likes ?? 0),
      comments: Number(m.comments ?? 0),
      shares: Number(m.shares ?? 0),
    },
  };

  if (m.is_hidden || m.is_deleted) return null;

  const t = (m.type || "").toLowerCase();

  // ---- Image post ----
  if (t === "image" || m.image) {
    return { ...base, type: "image", text: m.text || "", image_url: m.image };
  }

  // ---- Poll post ----
  if (t === "poll" || Array.isArray(m.options) || m.poll_id || m.question) {
    const question =
      m.question ??
      item.question ??
      item.title ??
      ""; // ensure something is renderable

    const options = (m.options || []).map((o, i) => ({
      id: o.id ?? o.option_id ?? i + 1,
      label: o.text ?? o.label ?? String(o),
      votes: o.vote_count ?? o.votes ?? 0,
    }));

    return {
      ...base,
      type: "poll",

      // 🔑 expose question under every common key
      text: question,
      title: question,
      question: question,
      content: question,

      poll_id: pickId(
        m.poll_id, m.pollId, m.poll?.id,
        item.poll_id, item.target_object_id, item.object_id, item.target_id,
        item.targetId, item.objectId,
        (t === "poll" ? m.id : null)
      ),
      options,
      user_votes: m.user_votes || [],
      is_closed: Boolean(m.is_closed),
      group_id: base.group_id,
    };
  }

  // ---- Link post ----
  if (t === "link" || m.url) {
    return {
      ...base,
      type: "link",
      text: m.text || "",
      url: m.url,
      url_title: m.url_title,
      url_desc: m.url_desc,
    };
  }

  // ---- Event post ----
  // Treat as event if:
  // - type hints event, OR
  // - verb mentions "event", OR
  // - obvious event fields exist (start_time / event_title / event_id), OR
  // - there is a title and the verb hints event.
  const hasEventFields = !!(
    m.start_time ||
    m.event_title ||
    m.event_id ||
    (m.title && isEventVerb)
  );

  // ---- Resource (file/link) post ----
  if (
    t === "resource" || t === "file" || t === "link" || t === "video" ||
    m.file || m.file_url || m.link_url || m.video_url
  ) {
    return {
      ...base,
      type: "resource",
      text: m.description || m.text || "",
      resource: {
        title: m.title || "Resource",
        file_url: toMediaUrl(m.file_url || m.file || ""),
        link_url: m.link_url || null,
        video_url: toMediaUrl(m.video_url || ""),
        event_id: m.event_id ?? item.target_object_id ?? null,
        event_title: m.event_title || m.title || null,
      },
    };
  }

  if (t === "event" || t === "event_update" || isEventVerb || hasEventFields) {
    return {
      ...base,
      type: "event",
      text: m.description || m.summary || m.text || "",
      event: {
        id: m.event_id ?? item.target_object_id ?? null,
        title: m.event_title || m.title || "Event",
        when: m.start_time || m.new_time || m.time || "",
        where: m.venue || m.location || "",
      },
    };
  }

  // ---- Default: text post ----
  return { ...base, type: "text", text: m.text || m.content || "" };
}


// ---- POLL UI ----
function PollBlock({ post, onVote }) {
  const userVotes = Array.isArray(post.user_votes) ? post.user_votes : [];
  const totalVotes = (post.options || []).reduce(
    (sum, o) => sum + (typeof o.votes === "number" ? o.votes : (o.vote_count || 0)),
    0
  );
  const canVote = !post.is_closed;
  const hasOptions = (post.options || []).length > 0;

  return (
    <Box>
      {post.text && (
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
          {post.text}
        </Typography>
      )}
      {!hasOptions && (
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
          No options added yet.
        </Typography>
      )}
      <Stack spacing={1}>
        {(post.options || []).map((opt, idx) => {
          const optionId = opt.id ?? opt.option_id ?? null;
          const label = opt.label ?? opt.text ?? String(opt);
          const votes = typeof opt.votes === "number" ? opt.votes : (opt.vote_count ?? 0);
          const percent = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
          const chosen = optionId && userVotes.includes(optionId);

          const tryVote = () => {
            if (!canVote || chosen) return;
            onVote?.(optionId, { label, idx });
          };

          return (
            <Paper
              key={optionId ?? label}
              variant="outlined"
              onClick={tryVote}
              role="button"
              tabIndex={0}
              sx={{
                p: 1,
                borderRadius: 2,
                borderColor: BORDER,
                bgcolor: chosen ? "action.selected" : "background.paper",
                cursor: canVote && !chosen ? "pointer" : "default",
                "&:hover": canVote && !chosen ? { borderColor: "primary.main" } : undefined,
              }}
            >
              <Stack spacing={0.5}>
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {label}
                    </Typography>
                    {chosen && (
                      <Chip
                        size="small"
                        icon={<CheckCircleOutlineIcon sx={{ fontSize: 16 }} />}
                        label="Your vote"
                        color="success"
                        variant="outlined"
                      />
                    )}
                  </Stack>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {percent}%
                  </Typography>
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

// ---- EVENT BLOCK ----
function EventBlock({ post, onOpen }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, borderColor: BORDER, bgcolor: "#fafafa" }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
        {post.event?.title}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {post.event?.when ? new Date(post.event.when).toLocaleString() : ""}{post.event?.where ? ` · ${post.event.where}` : ""}
      </Typography>
      {post.text && <Typography variant="body2" sx={{ mt: 1 }}>{post.text}</Typography>}
      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
        <Button size="small" variant="contained" onClick={onOpen} startIcon={<ThumbUpAltOutlinedIcon />}>
          View Event
        </Button>
      </Stack>
    </Paper>
  );
}

function ResourceBlock({ post, onOpenEvent }) {
  const r = post.resource || {};
  const hasVideo = !!r.video_url;
  const primaryHref = r.link_url || r.file_url || r.video_url;

  // simple detectors for YouTube/Vimeo
  const ytId = (r.video_url || "").match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/)?.[1];
  const vmId = (r.video_url || "").match(/vimeo\.com\/(\d+)/)?.[1];
  const ytEmbed = ytId ? `https://www.youtube.com/embed/${ytId}` : null;
  const vmEmbed = vmId ? `https://player.vimeo.com/video/${vmId}` : null;
  const canIframe = !!(ytEmbed || vmEmbed);
  const iframeSrc = ytEmbed || vmEmbed;

  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, borderColor: "#e2e8f0", bgcolor: "#fafafa" }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
        {r.title}
      </Typography>

      {post.text && <Typography variant="body2" sx={{ mt: 1 }}>{post.text}</Typography>}

      {/* VIDEO RENDERING */}
      {hasVideo && (
        <Box sx={{ mt: 1 }}>
          {canIframe ? (
            <Box
              component="iframe"
              src={iframeSrc}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              sx={{ width: "100%", height: 360, border: 0, borderRadius: 8 }}
              title={r.title}
            />
          ) : (
            <Box
              component="video"
              src={r.video_url}
              controls
              preload="metadata"
              sx={{ width: "100%", maxHeight: 420, borderRadius: 2, border: "1px solid #e2e8f0", mt: 0.5 }}
            />
          )}
        </Box>
      )}

      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
        {primaryHref && (
          <Button
            size="small"
            variant="contained"
            component="a"
            href={primaryHref}
            target="_blank"
            rel="noreferrer"
          >
            {hasVideo ? "Watch Video" : r.link_url ? "Open Link" : "View File"}
          </Button>
        )}
      </Stack>
    </Paper>
  );
}

function CommentsDialog({ open, onClose, postId, onBumpCount }) {
  const [loading, setLoading] = React.useState(false);
  const [me, setMe] = React.useState(null);
  const [items, setItems] = React.useState([]);
  const [text, setText] = React.useState("");
  const [replyTo, setReplyTo] = React.useState(null);

  // who am I (for delete-own)
  React.useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const r = await fetch(toApiUrl("users/me/"), { headers: { ...authHeaders() } });
        setMe(r.ok ? await r.json() : {});
      } catch { setMe({}); }
    })();
  }, [open]);

  const load = React.useCallback(async () => {
    if (!open || !postId) return;
    setLoading(true);
    try {
      const r = await fetch(toApiUrl(`activity/feed/${postId}/comments/?page_size=200`), {
        headers: { Accept: "application/json", ...authHeaders() },
      });
      const j = r.ok ? await r.json() : [];
      const flat = Array.isArray(j?.results) ? j.results : (Array.isArray(j) ? j : []);
      setItems(flat);
    } catch { setItems([]); }
    setLoading(false);
  }, [open, postId]);

  React.useEffect(() => { load(); }, [load]);

  // build simple tree
  const roots = React.useMemo(() => {
    const map = new Map();
    (items || []).forEach(c => map.set(c.id, { ...c, children: [] }));
    map.forEach(c => {
      if (c.parent_id && map.get(c.parent_id)) map.get(c.parent_id).children.push(c);
    });
    return [...map.values()].filter(c => !c.parent_id);
  }, [items]);

  async function createComment(body, parentId = null) {
    if (!body.trim()) return;
    try {
      const r = await fetch(toApiUrl(`activity/feed/${postId}/comments/`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(parentId ? { text: body, parent_id: parentId } : { text: body }),
      });
      if (r.ok) {
        setText("");
        setReplyTo(null);
        await load();
        onBumpCount?.(); // let parent increment the visible count
      }
    } catch { }
  }

  async function toggleCommentLike(c) {
    const liked = !!c.user_has_liked;
    try {
      const r = await fetch(toApiUrl(`activity/feed/${postId}/comments/${c.id}/like/`), {
        method: liked ? "DELETE" : "POST",
        headers: { ...authHeaders() },
      });
      if (r.ok) load();
    } catch { }
  }

  async function deleteOwn(c) {
    // Only allow if comment author == me
    const myId = me?.id || me?.user?.id;
    if (!myId || (c.author_id !== myId)) return;
    try {
      const r = await fetch(toApiUrl(`activity/feed/${postId}/comments/${c.id}/`), {
        method: "DELETE",
        headers: { ...authHeaders() },
      });
      if (r.ok) load();
    } catch { }
  }

  const CommentItem = ({ c, depth = 0 }) => (
    <Box sx={{ pl: depth ? 2 : 0, borderLeft: depth ? "2px solid #e2e8f0" : "none", ml: depth ? 1.5 : 0, mt: depth ? 1 : 0 }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Avatar src={c.author?.avatar} sx={{ width: 28, height: 28 }} />
        <Typography variant="subtitle2">{c.author?.name || c.author?.username || `User #${c.author_id}`}</Typography>
        <Typography variant="caption" color="text.secondary">
          {c.created_at ? new Date(c.created_at).toLocaleString() : ""}
        </Typography>
      </Stack>
      <Typography sx={{ mt: 0.5, whiteSpace: "pre-wrap" }}>{c.text}</Typography>

      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 0.5 }}>
        <Button
          size="small"
          startIcon={c.user_has_liked ? <FavoriteRoundedIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
          onClick={() => toggleCommentLike(c)}
        >
          {c.like_count ?? 0}
        </Button>
        <Button size="small" startIcon={<ChatBubbleOutlineIcon fontSize="small" />} onClick={() => setReplyTo(c)}>
          Reply
        </Button>
        {(me?.id || me?.user?.id) === c.author_id && (
          <Button size="small" color="error" onClick={() => deleteOwn(c)}>Delete</Button>
        )}
      </Stack>

      {!!c.children?.length && (
        <Stack spacing={1} sx={{ mt: 1 }}>
          {c.children.map(child => <CommentItem key={child.id} c={child} depth={depth + 1} />)}
        </Stack>
      )}
    </Box>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Comments</DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Stack alignItems="center" py={3}><CircularProgress size={22} /></Stack>
        ) : roots.length === 0 ? (
          <Typography color="text.secondary">No comments yet.</Typography>
        ) : (
          <Stack spacing={2}>
            {roots.map(c => <CommentItem key={c.id} c={c} />)}
          </Stack>
        )}
      </DialogContent>
      <Divider />
      <Box sx={{ px: 2, py: 1.5 }}>
        {replyTo && (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="caption" color="text.secondary">Replying to {replyTo.author?.name || `#${replyTo.author_id}`}</Typography>
            <Button size="small" onClick={() => setReplyTo(null)}>Cancel</Button>
          </Stack>
        )}
        <Stack direction="row" spacing={1}>
          <TextField
            size="small"
            fullWidth
            placeholder={replyTo ? "Write a reply…" : "Write a comment…"}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <Button variant="contained" onClick={() => createComment(text, replyTo?.id || null)}>Post</Button>
        </Stack>
      </Box>
    </Dialog>
  );
}


// ---- POST CARD ----
function PostCard({ post, onReact, onOpenPost, onPollVote, onOpenEvent }) {
  const [local, setLocal] = React.useState(post);
  const [userHasLiked, setUserHasLiked] = React.useState(!!post.user_has_liked);
  const [commentsOpen, setCommentsOpen] = React.useState(false);
  React.useEffect(() => { setLocal(post); }, [post]);
  const inc = (k) => {
    const next = { ...local, metrics: { ...local.metrics, [k]: (local.metrics?.[k] ?? 0) + 1 } };
    setLocal(next);
    onReact?.(post.id, k, next.metrics[k]);
  };
  async function likeOnce() {
    if (userHasLiked) return; // like only once
    try {
      const r = await fetch(toApiUrl(`activity/feed/${post.id}/like/`), {
        method: "POST",
        headers: { ...authHeaders() },
      });
      if (r.ok) {
        setUserHasLiked(true);
        setLocal((curr) => ({ ...curr, metrics: { ...curr.metrics, likes: (curr.metrics?.likes ?? 0) + 1 } }));
      }
    } catch { }
  }

  const bumpCommentCount = () => {
    setLocal((curr) => ({ ...curr, metrics: { ...curr.metrics, comments: (curr.metrics?.comments ?? 0) + 1 } }));
  };

  const headingTitle = post.group_id
    ? (post.group || (post.group_id ? `Group #${post.group_id}` : "—"))
    : (post.visibility === "community"
      ? (post.community || (post.community_id ? `Community #${post.community_id}` : "—"))
      : (post.author?.name || "—"));
  return (
    <Paper key={post.id} elevation={0} sx={{ p: 2, mb: 2, border: `1px solid ${BORDER}`, borderRadius: 3 }}>
      {/* Header */}
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Avatar src={post.group_avatar || post.author?.avatar} alt={headingTitle} />
        <Box sx={{ flex: 1, minWidth: 0 }}>

          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {headingTitle}
          </Typography>

          <Typography variant="caption" color="text.secondary" noWrap>
            {post.author?.name} · {formatWhen(post.created_at)}
          </Typography>
        </Box>
        {post.type === "event" && <Chip size="small" color="primary" label="Event" variant="outlined" />}
        {post.type === "poll" && <Chip size="small" label="Poll" variant="outlined" />}
        {post.type === "link" && <Chip size="small" label="Link" variant="outlined" />}
        {post.type === "image" && <Chip size="small" label="Image" variant="outlined" />}
        {post.type === "text" && <Chip size="small" label="Post" variant="outlined" />}
        {post.type === "resource" && (
          <Chip
            size="small"
            label={post.resource?.video_url ? "Video" : "Resource"}
            variant="outlined"
          />
        )}
      </Stack>

      {/* Body */}
      <Box sx={{ mt: 1.25 }}>
        {post.type === "text" && (
          <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
            {post.text}
          </Typography>
        )}

        {post.type === "resource" && (
          <ResourceBlock post={post} onOpenEvent={onOpenEvent} />
        )}

        {post.type === "image" && (
          <>
            {post.text && <Typography variant="body2" sx={{ mb: 1 }}>{post.text}</Typography>}
            <Box
              component="img"
              src={post.image_url}
              alt={post.text || "post image"}
              sx={{ width: "100%", maxHeight: 420, objectFit: "cover", borderRadius: 2, border: `1px solid ${BORDER}` }}
            />
          </>
        )}

        {post.type === "link" && (
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, borderColor: BORDER, bgcolor: "#fafafa" }}>
            {post.text && <Typography variant="body2" sx={{ mb: 1 }}>{post.text}</Typography>}
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              <Link href={post.url} target="_blank" rel="noreferrer">
                {post.url_title || post.url}
              </Link>
            </Typography>
            {post.url_desc && <Typography variant="caption" color="text.secondary">{post.url_desc}</Typography>}
          </Paper>
        )}

        {post.type === "poll" && (
          <PollBlock post={local} onVote={(optionId, meta) => onPollVote?.(post, optionId, meta)} />
        )}

        {post.type === "event" && (
          <EventBlock post={post} onOpen={() => onOpenEvent?.(post.event?.id || post.id)} />
        )}
      </Box>

      {/* Actions */}
      <Stack direction="row" spacing={1} sx={{ mt: 1.25 }} alignItems="center">
        <IconButton size="small" onClick={likeOnce}>
          {userHasLiked ? <FavoriteRoundedIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
        </IconButton>
        <Typography variant="caption">{local.metrics?.likes ?? 0}</Typography>

        <IconButton size="small" onClick={() => setCommentsOpen(true)}>
          <ChatBubbleOutlineIcon fontSize="small" />
        </IconButton>
        <Typography variant="caption">{local.metrics?.comments ?? 0}</Typography>

        <IconButton size="small" onClick={() => inc("shares")}><IosShareIcon fontSize="small" /></IconButton>
        <Typography variant="caption">{local.metrics?.shares ?? 0}</Typography>
      </Stack>

      <CommentsDialog
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        postId={post.id}
        onBumpCount={bumpCommentCount}
      />
    </Paper>
  );
}

// ---- MAIN PAGE (All / My Groups + Search) ----
export default function LiveFeedPage({
  posts: initialPosts,
  onOpenPost = () => { },
  onOpenEvent = () => { },
  onCreatePost = () => { },
  onReact = () => { },
  websocketUrl,
  communityId,
  user,
  stats,
  tags = [],
}) {
  // SCOPE: all | mine
  const [scope, setScope] = React.useState("all");

  // Search
  const [query, setQuery] = React.useState("");
  const dq = useDebounced(query, 400);

  // Feed data
  const [posts, setPosts] = React.useState(initialPosts ?? []);
  const [nextUrl, setNextUrl] = React.useState(null);
  const [hasMore, setHasMore] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  // Composer (kept off per your UI; uncomment if needed)
  const MAX_LEN = 280;
  const [composeText, setComposeText] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  // Build initial URL based on scope + search
  const buildFeedPath = React.useCallback((sc, q) => {
    const params = new URLSearchParams();

    if (sc === "mine") {
      params.set("mine", "true");
      params.set("scope", "member_groups");
    } else {
      params.set("scope", "home"); // server does union: feed + events
    }

    if (communityId) params.set("community_id", String(communityId)); // 👈 add this

    const qTrim = (q || "").trim();
    if (qTrim) {
      params.set("q", qTrim);
      params.set("search", qTrim);
    }
    const qs = params.toString();
    return `activity/feed/${qs ? `?${qs}` : ""}`;
  }, [communityId]);

  // Load a page (absolute or relative DRF next)
  async function loadFeed(url, append = false) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(toApiUrl(url), {
        headers: { Accept: "application/json", ...authHeaders() },
      });
      if (res.status === 401) throw new Error("Unauthorized (401): missing/expired token");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const page = await res.json();
      const items = (page.results || page).map(mapFeedItem).filter(Boolean);

      setPosts((curr) => (append ? [...curr, ...items] : items));
      const next = page?.next ? page.next : null;
      setHasMore(Boolean(next));
      setNextUrl(next);
    } catch (e) {
      console.error("Failed to fetch feed:", e);
      setError(e.message);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }

  // Initial + on scope/search change
  React.useEffect(() => {
    setPosts([]);
    setHasMore(true);
    setNextUrl(null);
    loadFeed(buildFeedPath(scope, dq), false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, dq]);

  // Realtime (optional)
  React.useEffect(() => {
    if (!websocketUrl) return;
    const ws = new WebSocket(websocketUrl);
    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg?.type === "new_post" && msg.post) {
          if (scope === "mine" && !(msg.post?.group_id)) return; // respect scope
          // If backend already shaped the post (has .type), use it as-is; else map it.
          const incoming = msg.post?.type ? msg.post : mapFeedItem(msg.post);
          if (!incoming) return;
          // De-dup if the same id is already present (e.g., appears later via HTTP page load)
          setPosts((curr) => [incoming, ...curr.filter((p) => p.id !== incoming.id)]);
        }
      } catch { }
    };
    return () => ws.close();
  }, [websocketUrl, scope]);

  async function voteOnPoll(post, optionId, meta) {
    // Resolve optionId if missing (by label/index from the UI)
    if (!optionId) {
      const byIdx = (meta && Number.isInteger(meta.idx)) ? post.options?.[meta.idx] : null;
      const byLabel = (post.options || []).find(o => (o.label || o.text) === meta?.label);
      const picked = byIdx || byLabel || null;
      optionId = picked?.id || picked?.option_id || null;
      if (!optionId) { alert("Could not resolve option id"); return; }
    }

    const url = toApiUrl(`activity/feed/${post.id}/poll/vote/`); // 👈 use FEED ITEM id
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ option_ids: [optionId] }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = await res.json();

      // Backend may return { ok, poll: {...} } or a flat poll-like object
      const p = payload.poll || payload;
      const updated = {
        ...post,
        is_closed: Boolean(p.is_closed),
        user_votes: Array.isArray(p.user_votes) ? p.user_votes : post.user_votes || [],
        options: (p.options || []).map(o => ({
          id: o.id || o.option_id,
          label: o.text || o.label,
          votes: o.vote_count ?? o.votes ?? 0,
        })),
      };
      setPosts(curr => curr.map(x => (x.id === post.id ? updated : x)));
    } catch (err) {
      console.error(err);
      alert("Failed to vote: " + err.message);
    }
  }

  const handleLoadMore = async () => {
    if (!nextUrl) { setHasMore(false); return; }
    await loadFeed(nextUrl, true);
  };

  // If scope is 'mine' and backend didn’t support ?mine=true, fallback to client filter.
  const displayPosts = React.useMemo(() => {
    // scope filter first
    let arr = scope === "mine" ? posts.filter((p) => !!p.group_id) : posts;

    // client-side search fallback (works even if API ignores q/search)
    const needle = (dq || "").trim().toLowerCase();
    if (needle) {
      const toText = (v) => (v ? String(v).toLowerCase() : "");
      arr = arr.filter((p) => {
        const haystack = [
          p.text,
          p.group,
          p.author?.name,
          p.url_title,
          p.url_desc,
          p.event?.title,
          p.event?.where,
        ].map(toText).join(" ");
        return haystack.includes(needle);
      });
    }
    return arr;
  }, [posts, scope, dq]);

  return (
    <Grid container spacing={2}>
      {/* Center: scope + search + feed */}
      <Grid item xs={12} md={9}>
        <Box sx={{ width: "100%", maxWidth: { md: 680 }, mx: "auto" }}>
          {/* Scope toggle */}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 2 }} alignItems="center">
            <Stack direction="row" spacing={1}>
              <Chip label="All" color={scope === "all" ? "primary" : "default"} variant={scope === "all" ? "filled" : "outlined"} onClick={() => setScope("all")} />
              <Chip label="My Groups" color={scope === "mine" ? "primary" : "default"} variant={scope === "mine" ? "filled" : "outlined"} onClick={() => setScope("mine")} />
            </Stack>

            <Box sx={{ flex: 1, width: "100%" }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search posts, events, resources…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}     // debounced by dq
                onKeyDown={(e) => {
                  if (e.key === "Enter") loadFeed(buildFeedPath(scope, query), false); // optional: immediate refresh
                }}
                InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>) }}
                type="search"
              />
            </Box>
          </Stack>

          {/* (Composer kept commented; leave as-is to avoid changing other UI) */}

          {/* Feed */}
          {loading && posts.length === 0 ? (
            <Paper sx={{ p: 2, border: `1px solid ${BORDER}`, borderRadius: 3 }}>
              <Typography variant="body2" color="text.secondary">Loading…</Typography>
            </Paper>
          ) : displayPosts.length === 0 ? (
            <Paper sx={{ p: 2, border: `1px solid ${BORDER}`, borderRadius: 3 }}>
              <Typography variant="body2" color="text.secondary">No posts match your filters.</Typography>
            </Paper>
          ) : (
            displayPosts.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                onReact={onReact}
                onOpenEvent={onOpenEvent}
                onPollVote={(post, optionId, meta) => voteOnPoll(post, optionId, meta)}
              />
            ))
          )}

          {/* Pagination / Load more */}
          {hasMore && (
            <Stack alignItems="center" sx={{ mt: 1 }}>
              <Button variant="outlined" onClick={handleLoadMore} disabled={loading}>
                {loading ? "Loading…" : "Load more"}
              </Button>
            </Stack>
          )}
        </Box>
      </Grid>

      {/* Right rail */}
      <Grid item xs={12} md={3} sx={{ display: { xs: "none", md: "block" } }}>
        <Box sx={{ position: "sticky", top: 88, alignSelf: "flex-start" }}>
          <CommunityProfileCard user={user} stats={stats} tags={tags} />
        </Box>
      </Grid>
    </Grid>
  );
}
