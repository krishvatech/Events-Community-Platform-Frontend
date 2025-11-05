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

const BORDER = "#e2e8f0";

// ---- API helpers (kept from your file) ----
const RAW_BASE =
  (typeof window !== "undefined" && window.API_BASE_URL) ||
  import.meta?.env?.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000";

const ORIGIN = String(RAW_BASE).trim().replace(/\/+$/, "");
const API_BASE = /\/api(\/|$)/i.test(ORIGIN) ? ORIGIN : `${ORIGIN}/api`;
const API_ORIGIN = API_BASE.replace(/\/api(\/|$)/i, "");

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

// ---- FEED MAPPER (adds group_id globally) ----
function mapFeedItem(item) {
  const m = item?.metadata || {};
  const displayName = item.actor_name || item.actor_username || `User #${item.actor_id}`;

  const base = {
    id: item.id,
    created_at: item.created_at,
    author: { name: displayName, avatar: item.actor_avatar || "" },
    community_id: item.community_id ?? m.community_id ?? null,
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
    metrics: { likes: 0, comments: 0, shares: 0 },
  };

  if (m.is_hidden || m.is_deleted) return null;
  const t = (m.type || "").toLowerCase();

  if (t === "image") {
    return { ...base, type: "image", text: m.text || "", image_url: m.image };
  }
  if (t === "poll") {
    return {
      ...base,
      type: "poll",
      group_id: base.group_id,
      poll_id: m.poll_id ?? m.id ?? null,
      text: m.question || "",
      options: (m.options || []).map((o) => ({
        id: o.id ?? o.option_id ?? null,
        label: o.text ?? o.label ?? String(o),
        votes: o.vote_count ?? o.votes ?? 0,
      })),
      user_votes: m.user_votes || [],
      is_closed: Boolean(m.is_closed),
    };
  }
  if (t === "link") {
    return {
      ...base,
      type: "link",
      text: m.text || "",
      url: m.url,
      url_title: m.url_title,
      url_desc: m.url_desc,
    };
  }
  if (t === "event" || t === "event_update") {
    return {
      ...base,
      type: "event",
      text: m.text || m.summary || "",
      event: {
        title: m.event_title || m.title || "Event",
        when: m.new_time || m.time || "",
        where: m.venue || "",
      },
    };
  }
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

  return (
    <Box>
      {post.text && (
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
          {post.text}
        </Typography>
      )}

      <Stack spacing={1}>
        {(post.options || []).map((opt) => {
          const optionId = opt.id ?? opt.option_id ?? null;
          const label = opt.label ?? opt.text ?? String(opt);
          const votes = typeof opt.votes === "number" ? opt.votes : (opt.vote_count ?? 0);
          const percent = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
          const chosen = optionId && userVotes.includes(optionId);

          const tryVote = () => {
            if (canVote && optionId && !chosen) onVote?.(optionId);
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
        {post.event?.when} · {post.event?.where}
      </Typography>
      {post.text && <Typography variant="body2" sx={{ mt: 1 }}>{post.text}</Typography>}
      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
        <Button size="small" variant="contained" onClick={onOpen} startIcon={<ThumbUpAltOutlinedIcon />}>
          View Event
        </Button>
        <Button size="small" variant="outlined">RSVP</Button>
      </Stack>
    </Paper>
  );
}

// ---- POST CARD ----
function PostCard({ post, onReact, onOpenPost, onPollVote }) {
  const [local, setLocal] = React.useState(post);
  React.useEffect(() => { setLocal(post); }, [post]);
  const inc = (k) => {
    const next = { ...local, metrics: { ...local.metrics, [k]: (local.metrics?.[k] ?? 0) + 1 } };
    setLocal(next);
    onReact?.(post.id, k, next.metrics[k]);
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
      </Stack>

      {/* Body */}
      <Box sx={{ mt: 1.25 }}>
        {post.type === "text" && (
          <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
            {post.text}
          </Typography>
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
          <PollBlock post={local} onVote={(optionId) => onPollVote?.(post, optionId)} />
        )}

        {post.type === "event" && (
          <EventBlock post={post} onOpen={() => onOpenPost?.(post.id)} />
        )}
      </Box>

      {/* Actions */}
      <Stack direction="row" spacing={1} sx={{ mt: 1.25 }} alignItems="center" justifyContent="space-between">
        <Stack direction="row" spacing={1} alignItems="center">
          <IconButton size="small" onClick={() => inc("likes")}><FavoriteBorderIcon fontSize="small" /></IconButton>
          <Typography variant="caption">{local.metrics?.likes ?? 0}</Typography>

          <IconButton size="small" onClick={() => inc("comments")}><ChatBubbleOutlineIcon fontSize="small" /></IconButton>
          <Typography variant="caption">{local.metrics?.comments ?? 0}</Typography>

          <IconButton size="small" onClick={() => inc("shares")}><IosShareIcon fontSize="small" /></IconButton>
          <Typography variant="caption">{local.metrics?.shares ?? 0}</Typography>
        </Stack>

        <Button size="small" variant="text" onClick={() => onOpenPost?.(post.id)}>Open</Button>
      </Stack>
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
      params.set("mine","true");
      params.set("scope","member_groups");
    } else {
      params.set("scope","home");          // ← ensure union feed is returned
    }

    const qTrim = (q || "").trim();
    if (qTrim) {
      params.set("q", qTrim);
      params.set("search", qTrim);
    }
    const qs = params.toString();
    return `activity/feed/${qs ? `?${qs}` : ""}`;
  }, []);

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
          // optional: if a search is active, only prepend when it matches dq (skipped here)
          setPosts((curr) => [msg.post, ...curr]);
        }
      } catch { }
    };
    return () => ws.close();
  }, [websocketUrl, scope]);

  async function voteOnPoll(post, optionId) {
    if (!post.group_id || !post.poll_id) {
      alert("Missing poll identifiers");
      return;
    }
    try {
      const res = await fetch(
        toApiUrl(`groups/${post.group_id}/polls/${post.poll_id}/vote/`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ option_ids: [optionId] }),
        }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = await res.json();
      const updated = {
        ...post,
        is_closed: payload.is_closed,
        user_votes: payload.user_votes || [],
        options: (payload.options || []).map(o => ({
          id: o.id, label: o.text, votes: o.vote_count || 0,
        })),
      };
      setPosts(curr => curr.map(p => (p.id === post.id ? updated : p)));
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
                onOpenPost={onOpenPost}
                onPollVote={(post, optionId) => voteOnPoll(post, optionId)}
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
