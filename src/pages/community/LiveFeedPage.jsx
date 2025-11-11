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
import { Checkbox, ListItemButton } from "@mui/material";


const BORDER = "#e2e8f0";


function SuggestedConnections({ list = [] }) {
  const [connected, setConnected] = React.useState(() => new Set());
  function toggle(id) {
    setConnected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        mb: 2,
        borderColor: BORDER,
        borderRadius: 3,
        bgcolor: "background.paper",
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Suggested connections
        </Typography>
        <Button size="small" variant="text">See all</Button>
      </Stack>

      {/* Horizontal slider */}
      <Box
        sx={{
          overflowX: "auto",
          px: 0.5,
          pb: 0.5,
          scrollSnapType: "x mandatory",
          "&::-webkit-scrollbar": { height: 6 },
          "&::-webkit-scrollbar-thumb": { bgcolor: "divider", borderRadius: 999 },
        }}
      >
        <Stack direction="row" spacing={1.25}>
          {list.map((u) => {
            const isConnected = connected.has(u.id);
            return (
              <Box key={u.id} sx={{ minWidth: 140, scrollSnapAlign: "start" }}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1,
                    borderRadius: 2,
                    textAlign: "center",
                    borderColor: BORDER,
                  }}
                >
                  <Avatar src={u.avatar} sx={{ width: 56, height: 56, mx: "auto", mb: 0.75 }}>
                    {(u.name || "U").slice(0, 1)}
                  </Avatar>
                  <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                    {u.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {u.mutuals} mutual
                    {u.mutuals === 1 ? "" : "s"}
                  </Typography>
                  <Button
                    size="small"
                    variant={isConnected ? "outlined" : "contained"}
                    sx={{ mt: 1 }}
                    onClick={() => toggle(u.id)}
                  >
                    {isConnected ? "Connected" : "Connect"}
                  </Button>
                </Paper>
              </Box>
            );
          })}
        </Stack>
      </Box>
    </Paper>
  );
}


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

let _meCache = null;
async function getMeCached() {
  if (_meCache) return _meCache;
  const r = await fetch(toApiUrl("users/me/"), { headers: { ...authHeaders(), Accept: "application/json" } });
  _meCache = r.ok ? await r.json() : null;
  return _meCache;
}

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

function engageTargetOf(post) {
  if (post?.engage?.id) return post.engage; // already set by mapper

  // resources engage on content.Resource
  if (post?.type === "resource" && post?.resource?.id) {
    return { type: "content.resource", id: Number(post.resource.id) };
  }

  // events engage on events.Event (so likes/comments live on the Event row)
  if (post?.type === "event" && (post?.event?.id || post?.id)) {
    return { type: "events.event", id: Number(post.event?.id || post.id) };
  }

  // default → FeedItem
  return { type: null, id: Number(post.id) };
}

function formatWhen(ts) {
  try { return new Date(ts).toLocaleString(); } catch { return ts; }
}

function getCountFromPage(j) {
  if (j && typeof j.count === "number") return j.count;
  if (Array.isArray(j?.results)) return j.results.length;
  if (Array.isArray(j)) return j.length;
  return 0;
}

async function fetchBatchMetrics(ids) {
  if (!ids?.length) return {};
  const r = await fetch(toApiUrl(`engagements/metrics/?ids=${ids.join(",")}`), {
    headers: { Accept: "application/json", ...authHeaders() },
  });
  return r.ok ? r.json() : {};
}
async function fetchEngagementCountsForTarget(target) {
  if (!target?.id) return { likes: 0, comments: 0, shares: 0, user_has_liked: false };
  const tt = target.type ? `&target_type=${encodeURIComponent(target.type)}` : "";
  const r = await fetch(toApiUrl(`engagements/metrics/?ids=${target.id}${tt}`), {
    headers: { Accept: "application/json", ...authHeaders() },
  });
  if (!r.ok) return { likes: 0, comments: 0, shares: 0, user_has_liked: false };
  const j = await r.json();
  const key = String(target.id);
  return j[key] || j[target.id] || { likes: 0, comments: 0, shares: 0, user_has_liked: false };
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
    author: {
      name: displayName,
      avatar: toMediaUrl(item.actor_avatar || m.author_avatar || ""),
    },
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
    m.resource_id || m.file || m.file_url || m.link_url || m.video_url
  ) {
    // derive the numeric resource id from whatever the backend sent
    const rid =
      m.resource_id ??
      (typeof m.id === "number" ? m.id : undefined) ??
      (typeof m.object_id === "number" ? m.object_id : undefined) ??
      (typeof item.object_id === "number" ? item.object_id : undefined) ??
      (typeof item.id === "string" && item.id.startsWith("resource-")
        ? parseInt(item.id.split("-")[1], 10)
        : null);

    // your engagements API accepts CT id OR "app_label.ModelName"; use the readable form
    const resourceCT = m.resource_ct || "content.resource";

    return {
      ...base,
      type: "resource",
      text: m.description || m.text || "",
      resource: {
        id: rid, // keep the real resource id on the card
        title: m.title || "Resource",
        file_url: toMediaUrl(m.file_url || m.file || ""),
        link_url: m.link_url || null,
        video_url: toMediaUrl(m.video_url || ""),
        event_id: m.event_id ?? item.target_object_id ?? null,
        event_title: m.event_title || m.title || null,
      },
      // single source of truth for engagements (likes/comments/shares/metrics)
      engage: rid ? { type: resourceCT, id: Number(rid) } : undefined,
    };
  }

  if (t === "event" || t === "event_update" || isEventVerb || hasEventFields) {
    const eventId = m.event_id ?? item.target_object_id ?? item.id ?? null;
    return {
      ...base,
      type: "event",
      text: m.description || m.summary || m.text || "",
      event: {
        id: eventId,
        title: m.event_title || m.title || "Event",
        when: m.start_time || m.new_time || m.time || "",
        where: m.venue || m.location || "",
      },
      // 👇 key line: store where reactions/comments should go
      engage: eventId ? { type: "events.event", id: Number(eventId) } : undefined,
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

function normalizeCommentRow(c) {
  // parent id normalization
  const parent_id =
    c.parent_id ??
    (typeof c.parent === "number" ? c.parent : (typeof c.parent === "object" ? c.parent?.id : null)) ??
    c.parentId ?? null;

  // author normalization
  const rawAuthor = c.author || c.user || c.created_by || c.owner || {};
  const author_id = rawAuthor.id ?? c.author_id ?? c.user_id ?? c.created_by_id ?? null;
  const name =
    rawAuthor.name ||
    rawAuthor.full_name ||
    (rawAuthor.first_name || rawAuthor.last_name
      ? `${rawAuthor.first_name || ""} ${rawAuthor.last_name || ""}`.trim()
      : rawAuthor.username) ||
    (author_id ? `User #${author_id}` : "User");
  const avatar = toMediaUrl(
    rawAuthor.avatar || rawAuthor.profile?.avatar || c.author_avatar || ""
  );

  return {
    ...c,
    parent_id,
    author_id,
    author: { id: author_id, name, avatar },
  };
}

function CommentsDialog({
  open,
  onClose,
  postId,
  onBumpCount,
  // NEW: inline mode props (default off, so old modal behavior still works)
  inline = false,
  initialCount = 3,
  inputRef = null,
  target
}) {
  const [loading, setLoading] = React.useState(false);
  const [me, setMe] = React.useState(null);
  const [items, setItems] = React.useState([]);
  const [text, setText] = React.useState("");
  const [replyTo, setReplyTo] = React.useState(null);

  // NEW: how many root comments to show inline
  const [visibleCount, setVisibleCount] = React.useState(initialCount);

  // who am I (for delete-own)
  React.useEffect(() => {
    if (!inline && !open) return;
    (async () => {
      const meJson = await getMeCached(); // getMeCached already returns JSON
      setMe(meJson || {});
    })();
  }, [open, inline]);

  const load = React.useCallback(async () => {
    if (!postId) return;
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
      params.set("page_size", "200");
      const r = await fetch(toApiUrl(`engagements/comments/?${params.toString()}`), {
        headers: { Accept: "application/json", ...authHeaders() },
      });
      const j = r.ok ? await r.json() : [];
      const flatRaw = Array.isArray(j?.results) ? j.results : (Array.isArray(j) ? j : []);
      const rootsOnly = flatRaw.map(normalizeCommentRow);

      // fetch replies for each root (1 extra request per root)
      const replyUrls = rootsOnly.map((root) =>
        toApiUrl(`engagements/comments/?parent=${root.id}&page_size=200`)
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
      // combine roots + replies and let the tree builder attach children
      const flat = [...rootsOnly, ...replies];
      setItems(flat);
      // reset visible window each fetch
      setVisibleCount(initialCount);
      try {
        const ids = flat.map(c => c.id);
        if (ids.length) {
          const resCounts = await fetch(
            toApiUrl(`engagements/reactions/counts/?target_type=comment&ids=${ids.join(",")}`),
            { headers: { Accept: "application/json", ...authHeaders() } }
          );
          if (resCounts.ok) {
            const payload = await resCounts.json();
            const map = payload?.results || {};
            setItems(curr =>
              curr.map(c => {
                const m = map[String(c.id)];
                return m ? { ...c, like_count: m.like_count ?? c.like_count, user_has_liked: !!m.user_has_liked } : c;
              })
            );
          }
        }
      } catch (e) {
        console.warn("Failed to hydrate comment counts:", e);
      }
    } catch {
      setItems([]);
    }
    setLoading(false);
  }, [postId, open, inline, initialCount, target?.id, target?.type]);


  // --- delete helpers ---
  const myId = me?.id || me?.user?.id;
  const isAdmin =
    !!(me?.is_staff || me?.is_superuser || me?.isAdmin || me?.role === "admin" ||
      (Array.isArray(me?.roles) && me.roles.includes("admin")));

  function canDelete(c) {
    return c?.author_id === myId || isAdmin;
  }

  // collect the comment id + all nested reply ids for optimistic removal
  function collectDescendants(list, rootId) {
    const toRemove = new Set([rootId]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const row of list) {
        if (row.parent_id && toRemove.has(row.parent_id) && !toRemove.has(row.id)) {
          toRemove.add(row.id);
          changed = true;
        }
      }
    }
    return toRemove;
  }

  async function deleteComment(c) {
    if (!canDelete(c)) return;

    const ok = window.confirm("Delete this comment?");
    if (!ok) return;

    // optimistic UI: drop this comment and all its replies
    setItems(prev => {
      const ids = collectDescendants(prev, c.id);
      return prev.filter(row => !ids.has(row.id));
    });

    try {
      const r = await fetch(toApiUrl(`engagements/comments/${c.id}/`), {
        method: "DELETE",
        headers: { ...authHeaders() },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      // success: nothing else to do
    } catch (e) {
      // fallback: reload if server refused
      await load();
      alert("Could not delete comment. Please try again.");
    }
  }

  React.useEffect(() => { load(); }, [load]);

  // build simple tree (roots + children)
  const roots = React.useMemo(() => {
    const map = new Map();
    (items || []).forEach(c => map.set(c.id, { ...c, children: [] }));
    map.forEach(c => {
      if (c.parent_id && map.get(c.parent_id)) map.get(c.parent_id).children.push(c);
    });
    // sort newest first at root level (common social behavior)
    return [...map.values()]
      .filter(c => !c.parent_id)
      .sort((a, b) => (new Date(b.created_at || 0)) - (new Date(a.created_at || 0)));
  }, [items]);

  async function createComment(body, parentId = null) {
    if (!body.trim()) return;
    try {
      // build the correct payload (FeedItem fallback, or content.Resource if present)
      const topLevelPayload = target?.id
        ? (target?.type
          ? { text: body, target_type: target.type, target_id: target.id }
          : { text: body, target_id: target.id })
        : { text: body, target_id: postId };

      const payload = parentId
        ? { text: body, parent: parentId }  // replies inherit target from parent on backend
        : topLevelPayload;

      const r = await fetch(toApiUrl(`engagements/comments/`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(payload),
      });
      if (r.ok) {
        setText("");
        setReplyTo(null);
        await load();
        onBumpCount?.();
      }
    } catch { }
  }


  function bumpCommentLikeLocal(targetId, liked) {
    setItems(prev => prev.map(x => x.id === targetId
      ? {
        ...x,
        user_has_liked: liked,
        like_count: Math.max(0, (x.like_count ?? 0) + (liked ? 1 : -1))
      }
      : x
    ));
  }

  async function toggleCommentLike(commentId) {
    // 1) optimistic update
    setItems((curr) => {
      const i = curr.findIndex((c) => c.id === commentId);
      if (i === -1) return curr;
      const wasLiked = !!curr[i].user_has_liked;
      const next = [...curr];
      next[i] = {
        ...curr[i],
        user_has_liked: !wasLiked,
        like_count: Math.max(0, (curr[i].like_count || 0) + (wasLiked ? -1 : +1)),
      };
      return next;
    });

    // 2) hit the toggle endpoint
    try {
      const res = await fetch(toApiUrl(`engagements/reactions/toggle/`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        // ✅ correct field name
        body: JSON.stringify({ target_type: "comment", target_id: commentId, reaction: "like" }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // 3) re-sync the single comment count (cheap)
      const res2 = await fetch(
        toApiUrl(`engagements/reactions/counts/?target_type=comment&ids=${commentId}`),
        { headers: { Accept: "application/json", ...authHeaders() } }
      );
      if (res2.ok) {
        const payload = await res2.json();
        const m = payload?.results?.[String(commentId)];
        if (m) {
          setItems((curr) =>
            curr.map((c) =>
              c.id === commentId ? { ...c, like_count: m.like_count, user_has_liked: !!m.user_has_liked } : c
            )
          );
        }
      }
    } catch (e) {
      console.error("toggleCommentLike failed:", e);
      // rollback optimistic change on error
      setItems((curr) => {
        const i = curr.findIndex((c) => c.id === commentId);
        if (i === -1) return curr;
        const didLike = !!curr[i].user_has_liked;
        const next = [...curr];
        // reverse what we did above
        next[i] = {
          ...curr[i],
          user_has_liked: !didLike,
          like_count: Math.max(0, (curr[i].like_count || 0) + (didLike ? -1 : +1)),
        };
        return next;
      });
      alert("Failed to like/unlike. Please try again.");
    }
  }

  function updateCommentInTree(list, targetId, updater) {
    return (list || []).map(n => {
      if (n.id === targetId) return updater(n);
      if (n.children?.length) {
        return { ...n, children: updateCommentInTree(n.children, targetId, updater) };
      }
      return n;
    });
  }

  const CommentItem = ({ c, depth = 0 }) => {
    // fetch the like count for this comment once when it renders

    return (
      <Box
        sx={{
          pl: depth ? 2 : 0,
          borderLeft: depth ? "2px solid #e2e8f0" : "none",
          ml: depth ? 1.5 : 0,
          mt: depth ? 1 : 0
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Avatar src={c.author?.avatar} sx={{ width: 28, height: 28 }}>
            {(c.author?.name || "U").slice(0, 1)}
          </Avatar>
          <Typography variant="subtitle2">
            {c.author?.name || c.author?.username || "User"}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {c.created_at ? new Date(c.created_at).toLocaleString() : ""}
          </Typography>
        </Stack>

        <Typography sx={{ mt: 0.5, whiteSpace: "pre-wrap" }}>{c.text}</Typography>

        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 0.5 }}>
          <Button
            size="small"
            startIcon={c.user_has_liked ? <FavoriteRoundedIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
            onClick={() => toggleCommentLike(c.id)}
          >
            {c.like_count ?? 0}
          </Button>
          <Button size="small" startIcon={<ChatBubbleOutlineIcon fontSize="small" />} onClick={() => setReplyTo(c)}>
            Reply
          </Button>
          {canDelete(c) && (
            <Button size="small" color="error" onClick={() => deleteComment(c)}>
              Delete
            </Button>
          )}
        </Stack>

        {!!c.children?.length && (
          <Stack spacing={1} sx={{ mt: 1 }}>
            {c.children
              .sort((a, b) => (new Date(a.created_at || 0)) - (new Date(b.created_at || 0)))
              .map(child => <CommentItem key={child.id} c={child} depth={depth + 1} />)}
          </Stack>
        )}
      </Box>
    );
  };

  // --------- INLINE RENDER (Instagram/LinkedIn style) ----------
  if (inline) {
    const visibleRoots = roots.slice(0, visibleCount);
    const hasMore = roots.length > visibleRoots.length;



    return (
      <Box sx={{ mt: 1.25 }}>
        {replyTo && (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Replying to {replyTo.author?.name || `#${replyTo.author_id}`}
            </Typography>
            <Button size="small" onClick={() => setReplyTo(null)}>Cancel</Button>
          </Stack>
        )}

        {/* Always show comment input */}
        <Stack direction="row" spacing={1}>
          <TextField
            size="small"
            fullWidth
            placeholder={replyTo ? "Write a reply…" : "Write a comment…"}
            value={text}
            onChange={(e) => setText(e.target.value)}
            inputRef={inputRef || undefined}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                createComment(text, replyTo?.id || null);
              }
            }}
          />
          <Button
            variant="contained"
            onClick={() => createComment(text, replyTo?.id || null)}
            disabled={loading || !text.trim()}
          >
            Post
          </Button>
        </Stack>

        {/* Comments list */}
        <Box sx={{ mt: 1.25 }}>
          {loading ? (
            <Stack alignItems="center" py={2}><CircularProgress size={20} /></Stack>
          ) : visibleRoots.length === 0 ? (
            <Typography variant="caption" color="text.secondary">Be the first to comment.</Typography>
          ) : (
            <Stack spacing={1.25}>
              {visibleRoots.map(c => <CommentItem key={c.id} c={c} />)}
            </Stack>
          )}

          {hasMore && (
            <Stack alignItems="flex-start" sx={{ mt: 1 }}>
              <Button
                size="small"
                variant="text"
                onClick={() => setVisibleCount(v => v + initialCount)}
              >
                Load more comments
              </Button>
            </Stack>
          )}
        </Box>
      </Box>
    );
  }


  // --------- ORIGINAL MODAL (left intact for compatibility) ----------
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


function ShareDialog({ open, onClose, postId, onShared, target }) {
  const [loading, setLoading] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [friends, setFriends] = React.useState([]);
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState(new Set());

  // Normalize any friends API shape -> { id, name, avatar }
  function normalizeFriends(list) {
    return (list || []).map((f) => {
      const u = f.user || f.friend || f.to_user || f.peer || f.profile || f;
      const id = u?.id ?? f.user_id ?? f.friend_id ?? f.peer_id ?? f.id;
      const name =
        u?.name ||
        u?.full_name ||
        (u?.first_name || u?.last_name ? `${u?.first_name || ""} ${u?.last_name || ""}`.trim() : null) ||
        u?.username ||
        `User #${id}`;
      const avatar = u?.avatar || u?.profile?.avatar || f?.avatar || "";
      return { id, name, avatar };
    }).filter(x => x.id);
  }

  // Try common endpoints until one works
  const fetchFriends = React.useCallback(async () => {
    if (!open) return;
    setLoading(true);
    const candidates = [
      "friends?status=accepted",
      "friends/accepted",
      "friends/list",
      "friendships?status=accepted",
      "users/me/friends",
    ];
    for (const path of candidates) {
      try {
        const r = await fetch(toApiUrl(path), { headers: { Accept: "application/json", ...authHeaders() } });
        if (!r.ok) continue;
        const j = await r.json();
        const arr = Array.isArray(j?.results) ? j.results : (Array.isArray(j) ? j : j?.data || []);
        const norm = normalizeFriends(arr);
        setFriends(norm);
        setLoading(false);
        return;
      } catch { /* try next */ }
    }
    setFriends([]);
    setLoading(false);
  }, [open]);

  React.useEffect(() => { fetchFriends(); }, [fetchFriends]);

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
          <Typography color="text.secondary">No friends found.</Typography>
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



// ---- POST CARD ----
function PostCard({ post, onReact, onOpenPost, onPollVote, onOpenEvent }) {
  const [local, setLocal] = React.useState(post);
  const [userHasLiked, setUserHasLiked] = React.useState(!!post.user_has_liked);
  const [commentsOpen, setCommentsOpen] = React.useState(false);
  const [shareOpen, setShareOpen] = React.useState(false);
  React.useEffect(() => { setLocal(post); }, [post]);
  const commentInputRef = React.useRef(null);
  const bumpShareCount = () => {
    setLocal((curr) => ({ ...curr, metrics: { ...curr.metrics, shares: (curr.metrics?.shares ?? 0) + 1 } }));
    refreshCounts();
  };

  const inc = (k) => {
    const next = { ...local, metrics: { ...local.metrics, [k]: (local.metrics?.[k] ?? 0) + 1 } };
    setLocal(next);
    onReact?.(post.id, k, next.metrics[k]);
  };

  const refreshBusy = React.useRef(false);

  async function refreshCounts() {
    if (refreshBusy.current) return;
    refreshBusy.current = true;
    try {
      const target = engageTargetOf(post);
      const c = await fetchEngagementCountsForTarget(target);
      setLocal((curr) => ({ ...curr, user_has_liked: !!c.user_has_liked, metrics: { ...curr.metrics, ...c } }));
    } finally {
      refreshBusy.current = false;
    }
  }
  React.useEffect(() => { setLocal(post); refreshCounts(); }, [post]);
  async function toggleLike() {
    try {
      const target = engageTargetOf(post);
      const payload = { target_id: target.id, reaction: "like" }; // field name is 'reaction', not 'kind'
      if (target.type) payload.target_type = target.type;

      // optimistic UI
      setUserHasLiked((prev) => !prev);
      setLocal((curr) => ({
        ...curr,
        metrics: { ...curr.metrics, likes: Math.max(0, (curr.metrics?.likes ?? 0) + (userHasLiked ? -1 : +1)) },
      }));

      const r = await fetch(toApiUrl(`engagements/reactions/toggle/`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      // re-sync exact counts
      await refreshCounts();
    } catch (e) {
      console.error("toggleLike failed:", e);
      // simple rollback by forcing a refresh
      await refreshCounts();
    }
  }

  const bumpCommentCount = () => {
    setLocal((curr) => ({ ...curr, metrics: { ...curr.metrics, comments: (curr.metrics?.comments ?? 0) + 1 } }));
    refreshCounts();
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
        <IconButton size="small" onClick={toggleLike}>
          {userHasLiked ? <FavoriteRoundedIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
        </IconButton>
        <Typography variant="caption">{local.metrics?.likes ?? 0}</Typography>

        <IconButton
          size="small"
          onClick={() => {
            // focus the always-visible inline input
            if (commentInputRef?.current) {
              commentInputRef.current.focus();
            }
          }}
        >
          <ChatBubbleOutlineIcon fontSize="small" />
        </IconButton>
        <Typography variant="caption">{local.metrics?.comments ?? 0}</Typography>

        <IconButton size="small" onClick={() => setShareOpen(true)}><IosShareIcon fontSize="small" /></IconButton>
        <Typography variant="caption">{local.metrics?.shares ?? 0}</Typography>
      </Stack>

      {/* Inline comments, always visible like LinkedIn/Instagram */}
      <CommentsDialog
        inline
        initialCount={3}         // show a few, then "Load more" reveals more
        postId={post.id}
        target={engageTargetOf(post)}
        onBumpCount={bumpCommentCount}
        inputRef={commentInputRef}
      />

      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        postId={post.id}
        target={engageTargetOf(post)}
        onShared={bumpShareCount}
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

  // Suggested connections (fetched once)
  const [suggested, setSuggested] = React.useState([]);
  React.useEffect(() => {
    (async () => {
      try {
        const r = await fetch(toApiUrl("friends/suggested/?limit=12"), {
          headers: { Accept: "application/json", ...authHeaders() },
        });
        const j = r.ok ? await r.json() : [];
        setSuggested(Array.isArray(j) ? j : (j.results || []));
      } catch {
        setSuggested([]);
      }
    })();
  }, []);


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

  async function fetchBatchMetrics(ids) {
    if (!ids?.length) return {};
    const url = toApiUrl(`engagements/metrics/?ids=${ids.join(",")}`);
    try {
      const res = await fetch(url, { headers: { Accept: "application/json", ...authHeaders() } });
      if (!res.ok) return {};
      return await res.json(); // { [id]: {likes, comments, shares, user_has_liked ...} }
    } catch {
      return {};
    }
  }

  async function hydrateMetrics(feedItems) {
    if (!feedItems?.length) return feedItems;

    // only numeric ids are engageable by the current endpoints
    const numericIds = feedItems.map(p => p.id).filter((id) => Number.isInteger(id));
    const map = await fetchBatchMetrics(numericIds);

    return feedItems.map(p => {
      const m = map[p.id] || {};
      return {
        ...p,
        like_count: m.like_count ?? m.likes ?? p.like_count ?? 0,
        comment_count: m.comment_count ?? m.comments ?? p.comment_count ?? 0,
        share_count: m.share_count ?? m.shares ?? p.share_count ?? 0,
        user_has_liked: (m.user_has_liked ?? m.me_liked ?? p.user_has_liked ?? false),
        metrics: {
          ...(p.metrics || {}),
          likes: m.likes ?? m.like_count ?? p.metrics?.likes ?? 0,
          comments: m.comments ?? m.comment_count ?? p.metrics?.comments ?? 0,
          shares: m.shares ?? m.share_count ?? p.metrics?.shares ?? 0,
        },
      };
    });
  }


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
      const rawItems = (page.results || page).map(mapFeedItem).filter(Boolean);
      const items = await hydrateMetrics(rawItems); // ⬅️ enrich with like/comment/share + me_liked

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

  React.useEffect(() => {
    if (!displayPosts.length) return;
    const ids = displayPosts.map(p => p.id);
    let stop = false;

    async function tick() {
      try {
        const map = await fetchBatchMetrics(ids);
        if (stop) return;
        setPosts(curr =>
          curr.map(p => {
            const m = map[p.id];
            return m ? { ...p, user_has_liked: !!m.user_has_liked, metrics: { ...p.metrics, ...m } } : p;
          })
        );
      } catch { }
    }

    const t = setInterval(() => {
      if (document.visibilityState === "visible") tick();
    }, 30000); // every 30s
    tick(); // also once immediately
    return () => { stop = true; clearInterval(t); };
  }, [displayPosts]);


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
            displayPosts.map((p, idx) => (
              <React.Fragment key={p.id}>
                <PostCard
                  post={p}
                  onReact={onReact}
                  onOpenEvent={onOpenEvent}
                  onPollVote={(post, optionId, meta) => voteOnPoll(post, optionId, meta)}
                />
                {((idx + 1) % 4 === 0) && (
                  <SuggestedConnections list={suggested} />
                )}
              </React.Fragment>
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
