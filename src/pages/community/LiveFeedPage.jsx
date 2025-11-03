// src/pages/community/LiveFeedPage.jsx
import * as React from "react";
import {
  Avatar, Box, Button, Chip, Divider, Grid, IconButton, LinearProgress, Link,
  List, ListItem, ListItemText, MenuItem, Paper, Select, Stack, TextField, Typography
} from "@mui/material";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import IosShareIcon from "@mui/icons-material/IosShare";
import ThumbUpAltOutlinedIcon from "@mui/icons-material/ThumbUpAltOutlined";
import HowToVoteOutlinedIcon from "@mui/icons-material/HowToVoteOutlined";
import CommunityProfileCard from "../../components/CommunityProfileCard.jsx"; // optional left column
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";


const BORDER = "#e2e8f0";

const RAW_BASE =
  (typeof window !== "undefined" && window.API_BASE_URL) ||
  import.meta?.env?.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000";

// 2) Normalize origin and API base
// - Strip trailing slashes
// - Ensure we have exactly one `/api` segment in API_BASE
const ORIGIN = String(RAW_BASE).trim().replace(/\/+$/, "");
const API_BASE = /\/api(\/|$)/i.test(ORIGIN) ? ORIGIN : `${ORIGIN}/api`;

// 3) A version of the origin *without* `/api` (useful for file URLs, images, etc.)
const API_ORIGIN = API_BASE.replace(/\/api(\/|$)/i, "");

// 4) Build an absolute API URL from either a relative path or a full URL
function toApiUrl(pathOrUrl) {
  if (!pathOrUrl) return API_BASE;
  // If it's already absolute, keep it as-is
  try {
    return new URL(pathOrUrl).toString();
  } catch {
    // Make sure we don't duplicate `api/` or leading slashes
    const rel = String(pathOrUrl).replace(/^\/+/, "");  // remove leading "/"
    const relNoApi = rel.replace(/^api\/+/, "");        // drop leading "api/"
    return `${API_BASE}/${relNoApi}`;
  }
}

// 5) Auth header helper
function authHeaders() {
  const token =
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    sessionStorage.getItem("access") ||
    sessionStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function formatWhen(ts) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}


function getAuthHeader() {
  const token =
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    sessionStorage.getItem("access") ||
    sessionStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Map backend FeedItem -> PostCard-friendly object
function mapFeedItem(item) {
  const m = item?.metadata || {};

  const displayName = item.actor_name || item.actor_username || `User #${item.actor_id}`;

  const base = {
    id: item.id,
    created_at: item.created_at,
    author: {
      name: displayName,
      avatar: item.actor_avatar || "",
    },
    // ⬇️ NEW: carry group cover image from API
    group_avatar: m.group_cover_url || "",
    group: m.group_name || (m.group_id ? `Group #${m.group_id}` : "—"),
    metrics: { likes: 0, comments: 0, shares: 0 },
  };

  if (m.is_hidden || m.is_deleted) return null;
  const t = (m.type || "").toLowerCase();
  if (t === "image") return { ...base, type: "image", text: m.text || "", image_url: m.image };
  if (t === "poll")  return {
    ...base,
    type: "poll",
    group_id: m.group_id ?? null,
    poll_id:  m.poll_id  ?? m.id ?? null,
    text: m.question || "",
    // keep ids + vote counts if present
    options: (m.options || []).map((o) => ({
      id:    o.id ?? o.option_id ?? null,
      label: o.text ?? o.label ?? String(o),
      votes: o.vote_count ?? o.votes ?? 0,
    })),
    user_votes: m.user_votes || [],
    is_closed:  Boolean(m.is_closed),
  };
  if (t === "link")  return { ...base, type: "link",  text: m.text || "", url: m.url, url_title: m.url_title, url_desc: m.url_desc };
  return { ...base, type: "text", text: m.text || m.content || "" };
}


/** A single post card supporting: text | image | link | poll | event */
function PostCard({ post, onReact, onOpenPost, onPollVote }) {
  const [local, setLocal] = React.useState(post);
  React.useEffect(() => { setLocal(post); }, [post]);
  const inc = (k) => {
    const next = { ...local, metrics: { ...local.metrics, [k]: (local.metrics?.[k] ?? 0) + 1 } };
    setLocal(next);
    onReact?.(post.id, k, next.metrics[k]);
  };

  return (
    <Paper
      key={post.id}
      elevation={0}
      sx={{ p: 2, mb: 2, border: `1px solid ${BORDER}`, borderRadius: 3 }}
    >
      {/* Header */}
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Avatar
          src={post.group_avatar || post.author?.avatar}
          alt={post.group}
        />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {post.group}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {post.author.name} · {formatWhen(post.created_at)}
          </Typography>
        </Box>
        {post.type === "event" && (
          <Chip size="small" color="primary" label="Event" variant="outlined" />
        )}
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
            {post.text && (
              <Typography variant="body2" sx={{ mb: 1 }}>
                {post.text}
              </Typography>
            )}
            <Box
              component="img"
              src={post.image_url}
              alt={post.text || "post image"}
              sx={{
                width: "100%",
                maxHeight: 420,
                objectFit: "cover",
                borderRadius: 2,
                border: `1px solid ${BORDER}`,
              }}
            />
          </>
        )}

        {post.type === "link" && (
          <Paper
            variant="outlined"
            sx={{ p: 1.5, borderRadius: 2, borderColor: BORDER, bgcolor: "#fafafa" }}
          >
            {post.text && (
              <Typography variant="body2" sx={{ mb: 1 }}>
                {post.text}
              </Typography>
            )}
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              <Link href={post.url} target="_blank" rel="noreferrer">
                {post.url_title || post.url}
              </Link>
            </Typography>
            {post.url_desc && (
              <Typography variant="caption" color="text.secondary">
                {post.url_desc}
              </Typography>
            )}
          </Paper>
        )}

        {post.type === "poll" && (
          <PollBlock
            post={local}
            onVote={(optionId) => {
              // parent handler will call the API
              onPollVote?.(post, optionId);
            }}
          />
        )}

        {post.type === "event" && (
          <EventBlock post={post} onOpen={() => onOpenPost?.(post.id)} />
        )}
      </Box>

      {/* Actions */}
      <Stack
        direction="row"
        spacing={1}
        sx={{ mt: 1.25 }}
        alignItems="center"
        justifyContent="space-between"
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <IconButton size="small" onClick={() => inc("likes")}><FavoriteBorderIcon fontSize="small" /></IconButton>
          <Typography variant="caption">{local.metrics?.likes ?? 0}</Typography>

          <IconButton size="small" onClick={() => inc("comments")}><ChatBubbleOutlineIcon fontSize="small" /></IconButton>
          <Typography variant="caption">{local.metrics?.comments ?? 0}</Typography>

          <IconButton size="small" onClick={() => inc("shares")}><IosShareIcon fontSize="small" /></IconButton>
          <Typography variant="caption">{local.metrics?.shares ?? 0}</Typography>
        </Stack>

        <Button size="small" variant="text" onClick={() => onOpenPost?.(post.id)}>
          Open
        </Button>
      </Stack>
    </Paper>
  );
}

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
          const optionId  = opt.id ?? opt.option_id ?? null;
          const label     = opt.label ?? opt.text ?? String(opt);
          const votes     = typeof opt.votes === "number" ? opt.votes : (opt.vote_count ?? 0);
          const percent   = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
          const chosen    = optionId && userVotes.includes(optionId);

          // Click anywhere on the row to vote (if allowed and not already chosen)
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
                {/* Top row: label + your check if selected */}
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

                {/* Progress bar */}
                <LinearProgress
                  variant="determinate"
                  value={percent}
                  sx={{
                    height: 8,
                    borderRadius: 1,
                  }}
                />
              </Stack>
            </Paper>
          );
        })}
      </Stack>

      {/* Totals */}
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
        Total: {totalVotes} vote{totalVotes === 1 ? "" : "s"}{post.is_closed ? " · Poll closed" : ""}
      </Typography>
    </Box>
  );
}


function EventBlock({ post, onOpen }) {
  return (
    <Paper
      variant="outlined"
      sx={{ p: 1.5, borderRadius: 2, borderColor: BORDER, bgcolor: "#fafafa" }}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
        {post.event?.title}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {post.event?.when} · {post.event?.where}
      </Typography>
      {post.text && (
        <Typography variant="body2" sx={{ mt: 1 }}>
          {post.text}
        </Typography>
      )}
      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
        <Button size="small" variant="contained" onClick={onOpen} startIcon={<ThumbUpAltOutlinedIcon />}>
          View Event
        </Button>
        <Button size="small" variant="outlined">RSVP</Button>
      </Stack>
    </Paper>
  );
}

/** Main page */
export default function LiveFeedPage({
  // Data inputs (all optional; mock data will be used if not passed)
  posts: initialPosts,
  groups = ["All", "Charter Holders", "EMEA Chapter", "Cohort 2024 Online"],
  categories = ["All", "Announcements", "Jobs", "Introductions", "Events", "Polls"],
  // Callbacks
  onOpenPost = () => { },
  onOpenEvent = () => { },
  onOpenGroup = () => { },
  onCreatePost = () => { },
  onReact = () => { },
  onLoadMore, // (page, pageSize) => Promise<{items, hasMore}>
  // Realtime
  websocketUrl, // optional: ws(s)://... ; new posts will be prepended when messages arrive
  // Left column
  user,
  stats,
  tags = [],
}) {
  // Local state
  const [filterGroup, setFilterGroup] = React.useState("All");
  const [filterCategory, setFilterCategory] = React.useState("All");
  const [sortBy, setSortBy] = React.useState("recent");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [hasMore, setHasMore] = React.useState(true);
  // Twitter-like composer
  const MAX_LEN = 280;
  const [composeText, setComposeText] = React.useState("");
  const [creating, setCreating] = React.useState(false);


  const [posts, setPosts] = React.useState(initialPosts ?? []);
  
    const [nextUrl, setNextUrl] = React.useState(toApiUrl("activity/feed/"));
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState(null);

    async function loadFeed(url, append = false) {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(toApiUrl(url), {
          headers: {
            Accept: "application/json",
            ...authHeaders(),
          },
        });
        if (res.status === 401) {
          throw new Error("Unauthorized (401): missing/expired token");
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const page = await res.json();
        const items = (page.results || page)
          .map(mapFeedItem)
          .filter(Boolean); // drop hidden/deleted/null

        setPosts((curr) => (append ? [...curr, ...items] : items));
        const next = page?.next ? page.next : null; // may be absolute from DRF
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

    React.useEffect(() => {
      loadFeed("activity/feed/");
    }, []);

  // Realtime WS (optional)
  React.useEffect(() => {
    if (!websocketUrl) return;
    const ws = new WebSocket(websocketUrl);
    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg?.type === "new_post" && msg.post) {
          setPosts((curr) => [msg.post, ...curr]);
        }
      } catch {
        // ignore
      }
    };
    return () => ws.close();
  }, [websocketUrl]);

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
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ option_ids: [optionId] }),
      }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const payload = await res.json(); // GroupPollOutSerializer

    // convert API payload → our post shape
    const updated = {
      ...post,
      is_closed: payload.is_closed,
      user_votes: payload.user_votes || [],
      options: (payload.options || []).map(o => ({
        id: o.id,
        label: o.text,
        votes: o.vote_count || 0,
      })),
    };

    setPosts(curr => curr.map(p => (p.id === post.id ? updated : p)));
  } catch (err) {
    console.error(err);
    alert("Failed to vote: " + err.message);
  }
}

  const filtered = React.useMemo(() => {
    let arr = [...posts];

    if (filterGroup && filterGroup !== "All") {
      arr = arr.filter((p) => p.group === filterGroup);
    }
    if (filterCategory && filterCategory !== "All") {
      arr = arr.filter((p) => (p.category || "Other") === filterCategory);
    }
    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      arr = arr.filter((p) => new Date(p.created_at).getTime() >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo).getTime();
      arr = arr.filter((p) => new Date(p.created_at).getTime() <= to);
    }
    if (sortBy === "recent") {
      arr.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sortBy === "popular") {
      arr.sort((a, b) => (b.metrics?.likes ?? 0) + (b.metrics?.comments ?? 0) - ((a.metrics?.likes ?? 0) + (a.metrics?.comments ?? 0)));
    }
    return arr;
  }, [posts, filterGroup, filterCategory, dateFrom, dateTo, sortBy]);


  const handleLoadMore = async () => {
  if (!nextUrl) {
    setHasMore(false);
    return;
  }
  await loadFeed(nextUrl, true);
};

  const handleCreateTextPost = async () => {
    const text = composeText.trim();
    if (!text) return;

    setCreating(true);

    // Draft a local post so the user sees it instantly
    const draft = {
      id: "local-" + Date.now(),
      type: "text",
      category: "Announcements",
      group: filterGroup && filterGroup !== "All" ? filterGroup : (groups?.[1] || "General"),
      text,
      created_at: new Date().toISOString(),
      author: {
        name: user?.name || "You",
        avatar: user?.avatar,
      },
      metrics: { likes: 0, comments: 0, shares: 0 },
    };

    // Prepend locally
    setPosts((curr) => [draft, ...curr]);
    setComposeText("");

    try {
      // If parent provided a backend hook, let it save
      const saved = await (onCreatePost?.(draft));
      if (saved && saved.id) {
        // Swap the local draft with the saved version (keeps ordering)
        setPosts((curr) => curr.map((p) => (p.id === draft.id ? { ...saved } : p)));
      }
    } catch (_) {
      // Optional: you could show a toast here
    } finally {
      setCreating(false);
    }
  };

  const onComposerKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleCreateTextPost();
    }
  };



  return (
    <Grid container spacing={2}>
      {/* Center: Composer + Feed */}
      <Grid item xs={12} md={9}>
        <Box sx={{ width: '100%', maxWidth: { md: 680 }, mx: 'auto' }}>
          {/* Composer */}
          {/* Composer — Twitter style (text only) */}
          <Paper sx={{ p: 2, border: `1px solid ${BORDER}`, borderRadius: 3, mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
              Share an update
            </Typography>

            <Stack spacing={1}>
              <TextField
                fullWidth
                size="small"
                placeholder="What's happening?"
                multiline
                minRows={3}
                value={composeText}
                onChange={(e) => setComposeText(e.target.value.slice(0, MAX_LEN))}
                onKeyDown={onComposerKeyDown} // remove this line if you skipped step 2 bonus
              />

              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="caption" color="text.secondary">
                  {composeText.length}/{MAX_LEN}
                </Typography>

                <Box sx={{ flex: 1 }} />

                <Button
                  size="small"
                  variant="contained"
                  onClick={handleCreateTextPost}
                  disabled={creating || composeText.trim().length === 0}
                  sx={{ textTransform: "none" }}
                >
                  Post
                </Button>
              </Stack>
            </Stack>
          </Paper>

          {/* Feed */}
          {filtered.length === 0 && (
            <Paper sx={{ p: 2, border: `1px solid ${BORDER}`, borderRadius: 3 }}>
              <Typography variant="body2" color="text.secondary">No posts match your filters.</Typography>
            </Paper>
          )}
          {filtered.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              onReact={onReact}
              onOpenPost={onOpenPost}
              onPollVote={(post, optionId) => voteOnPoll(post, optionId)}
            />
          ))}

          {/* Pagination / Load more */}
          {hasMore && (
            <Stack alignItems="center" sx={{ mt: 1 }}>
              <Button variant="outlined" onClick={handleLoadMore}>Load more</Button>
            </Stack>
          )}
        </Box>

      </Grid>
      {/* Right: Profile (sticky like left sidebar) */}
      <Grid item xs={12} md={3} sx={{ display: { xs: "none", md: "block" } }}>
        <Box
          sx={{
            position: "sticky",
            top: 88,            // adjust if your header is taller/shorter (e.g., 72–104)
            alignSelf: "flex-start"
          }}
        >
          <CommunityProfileCard user={user} stats={stats} tags={tags} />
        </Box>
      </Grid>
    </Grid >
  );
}

/** Demo data (safe defaults if you don't pass posts) */

