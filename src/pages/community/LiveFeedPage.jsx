// src/pages/community/LiveFeedPage.jsx
import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Avatar, AvatarGroup, Box, Button, Chip, Grid, IconButton, LinearProgress, Link,
  Paper, Stack, TextField, Typography, InputAdornment, Popover, Tooltip, Skeleton,
  Menu, MenuItem, FormControl, FormLabel, RadioGroup, FormControlLabel, Radio
} from "@mui/material";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import IosShareIcon from "@mui/icons-material/IosShare";
import ThumbUpAltOutlinedIcon from "@mui/icons-material/ThumbUpAltOutlined";
import HowToVoteOutlinedIcon from "@mui/icons-material/HowToVoteOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import SearchIcon from "@mui/icons-material/Search";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import KeyboardArrowUpRoundedIcon from "@mui/icons-material/KeyboardArrowUpRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import PlayCircleOutlineRoundedIcon from "@mui/icons-material/PlayCircleOutlineRounded";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import ReplyRoundedIcon from "@mui/icons-material/ReplyRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText,
  CircularProgress, List, ListItem, ListItemAvatar, ListItemText, Divider
} from "@mui/material";
import { Checkbox, ListItemButton } from "@mui/material";
import { Tabs, Tab, ListItemSecondaryAction } from "@mui/material";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import VerifiedIcon from "@mui/icons-material/Verified";
import { isOwnerUser, isStaffUser } from "../../utils/adminRole.js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import localizedFormat from "dayjs/plugin/localizedFormat";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(localizedFormat);

const BORDER = "#e2e8f0";
// LinkedIn-style reactions 
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


const NOOP = () => { };

function SuggestedConnections({ list = [] }) {
  const [connected, setConnected] = React.useState(() => new Set());

  // --- friend status (same idea as RichProfile) ---
  const [friendStatusByUser, setFriendStatusByUser] = React.useState({})


  // normalize backend statuses (incoming_pending/outgoing_pending → pending_incoming/pending_outgoing)
  function normalizeFriendStatus(s) {
    const map = { incoming_pending: "pending_incoming", outgoing_pending: "pending_outgoing" };
    return String(map[s] || s || "none").toLowerCase();
  }
  // preload friend status for first few visible cards
  React.useEffect(() => {
    let alive = true;
    (async () => {
      const first = (list || []).slice(0, 8).map(u => u.id).filter(Boolean);
      const need = first.filter(id => friendStatusByUser[id] === undefined);
      if (!need.length) return;
      const entries = await Promise.all(need.map(async (id) => [id, await fetchFriendStatus(id)]));
      if (alive && entries.length) {
        setFriendStatusByUser((m) => ({ ...m, ...Object.fromEntries(entries) }));
      }
    })();
    return () => { alive = false; };
  }, [list]);


  async function fetchFriendStatus(userId) {
    try {
      const r = await fetch(toApiUrl(`friends/status/?user_id=${userId}`), {
        headers: { Accept: "application/json", ...authHeaders() },
        credentials: "include",
      });
      const d = await r.json().catch(() => ({}));
      return normalizeFriendStatus(d?.status);
    } catch {
      return "none";
    }
  }

  // NEW: See-all dialog
  const [openAll, setOpenAll] = React.useState(false);


  // avatar + name helpers (match posts/profile fallbacks)
  function userName(u) {
    return (
      u?.name ||
      u?.display_name ||
      `${u?.first_name || ""} ${u?.last_name || ""}`.trim() ||
      u?.username ||
      u?.email ||
      `User #${u?.id}`
    );
  }
  function userAvatar(u) {
    const p = u?.profile || {};
    const candidates = [
      u?.avatar, u?.avatar_url, u?.avatarUrl,
      u?.user_image, p?.user_image,
      u?.profile_image, u?.profile_picture, p?.profile_image, p?.profile_picture,
      u?.image, u?.image_url, p?.image, p?.image_url,
      u?.photo, u?.photo_url, p?.photo, p?.photo_url,
      u?.picture, u?.picture_url
    ];
    const raw = candidates.find(Boolean) || "";
    return toMediaUrl(raw);
  }

  // cache resolved avatar by user id
  const [avatarByUser, setAvatarByUser] = React.useState({});

  // extract avatar url from any user/profile JSON shape
  function pickAvatarFromJson(j) {
    const p = j?.profile || j?.data || {};
    const cand = [
      j?.avatar, j?.avatar_url, j?.avatarUrl,
      j?.user_image, p?.user_image,
      j?.profile_image, j?.profile_picture, p?.profile_image, p?.profile_picture,
      j?.image, j?.image_url, p?.image, p?.image_url,
      j?.photo, j?.photo_url, p?.photo, p?.photo_url,
      j?.picture, j?.picture_url
    ].find(Boolean) || "";
    return toMediaUrl(cand);
  }

  // try a few likely endpoints to fetch a user profile and grab avatar
  async function hydrateAvatar(userId) {
    if (!userId || avatarByUser[userId]) return;
    const endpoints = [
      `users/${userId}/`,
      `profiles/${userId}/`,
      `user-profiles/${userId}/`,
      `accounts/${userId}/`,
    ];
    for (const path of endpoints) {
      try {
        const r = await fetch(toApiUrl(path), { headers: { Accept: "application/json", ...authHeaders() } });
        if (!r.ok) continue;
        const j = await r.json();
        const url = pickAvatarFromJson(j);
        if (url) {
          setAvatarByUser((m) => ({ ...m, [userId]: url }));
          return;
        }
      } catch { /* try next */ }
    }
  }

  // prefetch for first few visible suggestions
  React.useEffect(() => {
    (list || []).slice(0, 8).forEach(u => hydrateAvatar(u.id));
  }, [list]);


  async function sendFriendRequest(id) {
    try {
      const r = await fetch(toApiUrl(`friend-requests/`), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", ...authHeaders() },
        credentials: "include",
        body: JSON.stringify({ to_user: Number(id) }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok && r.status !== 200 && r.status !== 201) {
        throw new Error(d?.detail || "Failed to send request");
      }
      const st = normalizeFriendStatus(d?.status || "pending_outgoing");
      setFriendStatusByUser((m) => ({ ...m, [id]: st }));
    } catch (e) {
      alert(e?.message || "Failed to send request");
    }
  }




  // cache of mutuals: { [userId]: Array<{id,name,avatar}> }
  const [mutualMap, setMutualMap] = React.useState({});

  async function loadMutuals(userId) {
    // don’t refetch if we already have it
    if (mutualMap[userId] !== undefined) return;
    try {
      const res = await fetch(toApiUrl(`friends/mutual/?user_id=${userId}`), {
        headers: { Accept: "application/json", ...authHeaders() },
      });
      const arr = res.ok ? await res.json() : [];
      const normalized = (arr || []).map(m => ({
        id: m.id,
        name: m.name || m.display_name || m.username || `User #${m.id}`,
        avatar: toMediaUrl(m.avatar || m.avatar_url || (m.profile && m.profile.avatar) || ""),
      }));
      setMutualMap(prev => ({ ...prev, [userId]: normalized }));
    } catch {
      setMutualMap(prev => ({ ...prev, [userId]: [] }));
    }
  }
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
        // ✅ match PostCard width & centering
        maxWidth: { xs: "100%", md: "100%" },
        mx: { xs: 0, md: "auto" },
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Suggested connections
        </Typography>
        <Button size="small" variant="text" onClick={() => setOpenAll(true)}>See all</Button>      </Stack>

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
                  onMouseEnter={() => {
                    if (u.mutuals > 0) loadMutuals(u.id);
                    hydrateAvatar(u.id);
                  }}
                >
                  <Avatar src={avatarByUser[u.id] || userAvatar(u)} sx={{ width: 56, height: 56, mx: "auto", mb: 0.75 }}>
                    {(userName(u) || "U").slice(0, 1)}
                  </Avatar>
                  <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                    {userName(u)}
                  </Typography>
                  {/* Mutual friends avatars (only if > 0) */}
                  {u.mutuals > 0 && (
                    <Stack direction="row" spacing={0.75} alignItems="center" justifyContent="center" sx={{ mt: 0.5 }}>
                      <AvatarGroup
                        max={3}
                        sx={{ "& .MuiAvatar-root": { width: 18, height: 18, fontSize: 10 } }}
                      >
                        {(mutualMap[u.id] || []).slice(0, 3).map(m => (
                          <Avatar key={m.id} src={userAvatar(m)}>
                            {(m.name || "U").slice(0, 1)}
                          </Avatar>
                        ))}
                      </AvatarGroup>
                      <Typography variant="caption" color="text.secondary">
                        {u.mutuals} mutual{u.mutuals === 1 ? "" : "s"}
                      </Typography>
                    </Stack>
                  )}
                  {(() => {
                    const status = String(friendStatusByUser[u.id] || "").toLowerCase();
                    if (status === "friends") {
                      return (
                        <Button size="small" variant="outlined" sx={{ mt: 1 }} disabled>
                          Friends
                        </Button>
                      );
                    }
                    if (status === "pending_outgoing") {
                      return (
                        <Button size="small" variant="outlined" sx={{ mt: 1 }} disabled>
                          Request sent
                        </Button>
                      );
                    }
                    if (status === "pending_incoming") {
                      return (
                        <Button size="small" variant="outlined" sx={{ mt: 1 }} disabled>
                          Pending your approval
                        </Button>
                      );
                    }
                    return (
                      <Button
                        size="small"
                        variant="contained"
                        sx={{ mt: 1 }}
                        onClick={() => sendFriendRequest(u.id)}
                      >
                        Connect
                      </Button>
                    );
                  })()}
                  <Dialog open={openAll} onClose={() => setOpenAll(false)} maxWidth="sm" fullWidth>
                    <DialogTitle>Suggested connections</DialogTitle>
                    <DialogContent dividers>
                      <Stack spacing={1.25}>
                        {list.map((u) => {
                          const status = String(friendStatusByUser[u.id] || "").toLowerCase();
                          return (
                            <Paper key={u.id} variant="outlined" sx={{ p: 1, borderRadius: 2, borderColor: BORDER }}>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Avatar src={avatarByUser[u.id] || userAvatar(u)} sx={{ width: 36, height: 36 }}>                                  {(userName(u) || "U").slice(0, 1)}
                                </Avatar>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                                    {userName(u)}
                                  </Typography>
                                  {u.mutuals > 0 && (
                                    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.25 }}>
                                      <AvatarGroup max={3} sx={{ "& .MuiAvatar-root": { width: 18, height: 18, fontSize: 10 } }}>
                                        {(mutualMap[u.id] || []).slice(0, 3).map((m) => (
                                          <Avatar key={m.id} src={userAvatar(m)}>
                                            {(m.name || "U").slice(0, 1)}
                                          </Avatar>
                                        ))}
                                      </AvatarGroup>
                                      <Typography variant="caption" color="text.secondary">
                                        {u.mutuals} mutual{u.mutuals === 1 ? "" : "s"}
                                      </Typography>
                                    </Stack>
                                  )}
                                </Box>

                                {status === "friends" ? (
                                  <Button size="small" variant="outlined" disabled>Friends</Button>
                                ) : status === "pending_outgoing" ? (
                                  <Button size="small" variant="outlined" disabled>Request pending</Button>
                                ) : (
                                  <Button size="small" variant="contained" onClick={() => sendFriendRequest(u.id)}>
                                    Connect
                                  </Button>
                                )}
                              </Stack>
                            </Paper>
                          );
                        })}
                        {(!list || list.length === 0) && (
                          <Typography color="text.secondary">No suggestions right now.</Typography>
                        )}
                      </Stack>
                    </DialogContent>
                  </Dialog>
                </Paper>
              </Box>
            );
          })}
        </Stack>
      </Box>
    </Paper>
  );
}

function SuggestedGroups({ list = [], loading = false, onJoined }) {
  const [joiningId, setJoiningId] = React.useState(null);

  async function joinGroup(groupId) {
    try {
      setJoiningId(groupId);
      const r = await fetch(toApiUrl(`groups/${groupId}/join-group/`), {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json", ...authHeaders() },
      });
      if (r.ok) {
        onJoined?.(groupId);
      }
    } finally {
      setJoiningId(null);
    }
  }

  const items = (list || []).slice(0, 4);
  if (!loading && items.length === 0) return null;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        mb: 2,
        borderColor: BORDER,
        borderRadius: 3,
        bgcolor: "background.paper",
        maxWidth: { xs: "100%", md: "100%" },
        mx: { xs: 0, md: "auto" },
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Groups you may like
        </Typography>
        <Chip size="small" label="Based on your friends" variant="outlined" />
      </Stack>

      <Grid container spacing={1}>
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
            <Grid key={i} item xs={12} sm={6} md={3}>
              <Paper variant="outlined" sx={{ p: 1, borderRadius: 2, borderColor: BORDER }}>
                <Skeleton variant="rounded" height={64} sx={{ mb: 1, borderRadius: 1.5 }} />
                <Skeleton width="80%" />
                <Skeleton width="60%" />
                <Skeleton variant="rounded" height={30} sx={{ mt: 1, borderRadius: 2 }} />
              </Paper>
            </Grid>
          ))
          : items.map((g) => (
            <Grid key={g.id} item xs={12} sm={6} md={3}>
              <Paper variant="outlined" sx={{ p: 1, borderRadius: 2, borderColor: BORDER }}>
                <Box
                  sx={{
                    height: 64,
                    borderRadius: 1.5,
                    overflow: "hidden",
                    mb: 1,
                    bgcolor: "grey.100",
                  }}
                >
                  {g.cover_image ? (
                    <Box
                      component="img"
                      src={toMediaUrl(g.cover_image)}
                      alt={g.name}
                      sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  ) : (
                    <Box sx={{ width: "100%", height: "100%" }} />
                  )}
                </Box>

                <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2 }} noWrap>
                  {g.name}
                </Typography>

                <Typography variant="caption" color="text.secondary">
                  {(g.member_count || 0).toLocaleString()} members
                </Typography>

                {Number(g.mutuals || 0) > 0 && (
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5 }}>
                    <AvatarGroup
                      max={3}
                      sx={{ "& .MuiAvatar-root": { width: 22, height: 22, fontSize: 11 } }}
                    >
                      {(g.mutual_members || []).slice(0, 3).map((m) => (
                        <Avatar key={m.id} src={toMediaUrl(m.avatar || m.avatar_url)}>
                          {(m.name || "U").slice(0, 1)}
                        </Avatar>
                      ))}
                    </AvatarGroup>
                    <Typography variant="caption" color="text.secondary">
                      {g.mutuals} friend{g.mutuals === 1 ? "" : "s"} joined
                    </Typography>
                  </Stack>
                )}

                <Button
                  fullWidth
                  size="small"
                  variant="contained"
                  sx={{ mt: 1 }}
                  disabled={joiningId === g.id}
                  onClick={() => joinGroup(g.id)}
                >
                  {joiningId === g.id ? "Joining..." : "Join"}
                </Button>
              </Paper>
            </Grid>
          ))}
      </Grid>
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

function formatWhen(ts, tz) {
  if (!ts) return "";
  const zone = tz || dayjs.tz.guess();
  return dayjs(ts).tz(zone).format('L LT');
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

  // NEW: capture author / actor id so we can use it for mutual-share logic
  const authorId =
    item.actor_id ??
    (typeof item.actor === "object" ? item.actor?.id : null) ??
    m.author_id ??
    (typeof m.author === "object" ? m.author?.id : null) ??
    item.user_id ??
    m.user_id ??
    null;

  const community_id =
    item?.community_id ??
    m?.community_id ??
    m?.communityId ??
    (typeof m?.community === "object" ? m.community?.id : m?.community) ??
    (typeof item?.community === "object" ? item.community?.id : item?.community) ??
    null;

  const authorKycStatus =
    item.actor_kyc_status ||
    m.author_kyc_status ||
    m.kyc_status ||
    (typeof m.author === "object" ? (m.author.kyc_status || m.author.kycStatus) : null) ||
    (typeof item.actor === "object" ? (item.actor.kyc_status || item.actor.kycStatus) : null) ||
    item.kyc_status ||
    item.kycStatus ||
    null;

  const base = {
    id: item.id,
    created_at: item.created_at,
    author_id: authorId, // NEW
    author: {
      id: authorId,      // NEW
      name: displayName,
      avatar: toMediaUrl(item.actor_avatar || m.author_avatar || ""),
      kyc_status: authorKycStatus,   // 👈 so PostCard can show the badge
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
    group_avatar: m.group_logo_url || m.group_cover_url || "",
    group: m.group_name || (m.group_id ? `Group #${m.group_id}` : "—"),
    visibility: m.visibility || item.visibility || null,
    metrics: {
      likes: Number(m.likes ?? 0),
      comments: Number(m.comments ?? 0),
      shares: Number(m.shares ?? 0),
    },
    moderation_status:
      item.moderation_status ??
      m.moderation_status ??
      item.moderationStatus ??
      m.moderationStatus ??
      item.status ??
      m.status ??
      null,
    is_under_review:
      item.is_under_review ??
      m.is_under_review ??
      (item.moderation_status === "under_review") ??
      (m.moderationStatus === "under_review") ??
      false,
    is_removed:
      item.is_removed ??
      m.is_removed ??
      (item.moderation_status === "removed") ??
      (m.moderationStatus === "removed") ??
      (item.status === "removed") ??
      (m.status === "removed") ??
      false,
    can_engage:
      item.can_engage ??
      m.can_engage ??
      null,
    is_blurred:
      item.is_blurred ??
      m.is_blurred ??
      null,
  };

  if (m.is_hidden || m.is_deleted) return null;

  const t = (m.type || "").toLowerCase();

  // ---- Image post ----
  if (t === "image" || m.image || m.image_url || m.imageUrl) {
    const img =
      m.image ||
      m.image_url ||
      m.imageUrl ||
      m.url ||
      m.file_url ||
      m.file;

    const caption =
      m.text ||
      m.caption ||   // 👈 your metadata
      m.title ||
      "";

    return {
      ...base,
      type: "image",
      text: caption,
      image_url: img,
    };
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
        event_title: m.event_title || null,
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
        preview_image: m.event_preview_image || null,
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

function ClampedText({
  text,
  maxLines = 5,
  mt = 0,
  variant = "body2",
  color,
  sx = {},
}) {
  const [expanded, setExpanded] = React.useState(false);
  if (!text) return null;

  const roughLineCount = (text.match(/\n/g) || []).length + 1;
  const shouldShowToggle = roughLineCount > maxLines || text.length > 280;

  return (
    <Box sx={{ mt }}>
      <Typography
        variant={variant}
        color={color}
        sx={{
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
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

      {shouldShowToggle && (
        <Button
          size="small"
          variant="text"
          sx={{ mt: 0.5, px: 0 }}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "See less" : "See more"}
        </Button>
      )}
    </Box>
  );
}

// ---- EVENT BLOCK ----
function EventBlock({ post, onOpen }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, borderColor: BORDER, bgcolor: "#fafafa" }}>
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1} sx={{ gap: 1 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }} noWrap>
            {post.event?.title}
          </Typography>
        </Box>

        <Tooltip title="View event">
          <IconButton size="small" onClick={onOpen} sx={{ flexShrink: 0, mt: -0.25 }}>
            <OpenInNewRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
      <Typography variant="caption" color="text.secondary">
        {post.event?.when ? formatWhen(post.event.when, post.userTimezone) : ""}{post.event?.where ? ` · ${post.event.where}` : ""}
      </Typography>

      {post.text && <ClampedText text={post.text} maxLines={5} mt={1} />}
    </Paper>
  );
}

function ResourceBlock({ post, onOpenEvent }) {
  const r = post.resource || {};
  const hasVideo = !!r.video_url;
  const primaryHref = r.link_url || r.file_url || r.video_url;

  // ---- LinkedIn-style file detection ----
  const safeUrlParts = (u) => {
    try {
      const x = new URL(u);
      return { pathname: x.pathname || "", href: x.toString() };
    } catch {
      const s = String(u || "");
      const noQ = s.split("?")[0].split("#")[0];
      return { pathname: noQ, href: s };
    }
  };

  const getExt = (u) => {
    const { pathname } = safeUrlParts(u);
    const last = (pathname || "").split("/").pop() || "";
    const dot = last.lastIndexOf(".");
    if (dot === -1) return "";
    return last.slice(dot + 1).toLowerCase();
  };

  const getFileName = (u) => {
    const { pathname } = safeUrlParts(u);
    const last = (pathname || "").split("/").pop() || "";
    return decodeURIComponent(last || "");
  };

  const fileUrl = r.file_url || "";
  const fileExt = getExt(fileUrl || primaryHref);
  const fileName = getFileName(fileUrl || primaryHref) || r.title || "Attachment";

  const isImageFile = ["jpg", "jpeg", "png", "webp", "gif", "bmp", "svg"].includes(fileExt);
  const isPdfFile = fileExt === "pdf";
  const hasFile = !!fileUrl;


  // simple detectors for YouTube/Vimeo
  const ytId = (r.video_url || "").match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/)?.[1];
  const vmId = (r.video_url || "").match(/vimeo\.com\/(\d+)/)?.[1];
  const ytEmbed = ytId ? `https://www.youtube.com/embed/${ytId}` : null;
  const vmEmbed = vmId ? `https://player.vimeo.com/video/${vmId}` : null;
  const canIframe = !!(ytEmbed || vmEmbed);
  const iframeSrc = ytEmbed || vmEmbed;

  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, borderColor: "#e2e8f0", bgcolor: "#fafafa" }}>
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1} sx={{ gap: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, flex: 1, minWidth: 0 }}>
          {r.title}
        </Typography>

        {primaryHref && (
          <Tooltip title={hasVideo ? "Watch video" : r.link_url ? "Open link" : "View file"}>
            <IconButton
              size="small"
              component="a"
              href={primaryHref}
              target="_blank"
              rel="noreferrer"
              sx={{ flexShrink: 0, mt: -0.25 }}
            >
              {hasVideo ? (
                <PlayCircleOutlineRoundedIcon fontSize="small" />
              ) : r.link_url ? (
                <OpenInNewRoundedIcon fontSize="small" />
              ) : (
                <InsertDriveFileOutlinedIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        )}
      </Stack>

      {post.text && (
        <ClampedText
          text={post.text}
          maxLines={5}
          mt={1}
          variant="body2"
        />
      )}

      {/* VIDEO RENDERING */}
      {hasVideo && (
        <Box sx={{ mt: 1 }}>
          {canIframe ? (
            <Box
              component="iframe"
              src={iframeSrc}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              sx={{ width: "100%", height: 360, border: 0, borderRadius: 1 }}
              title={r.title}
            />
          ) : (
            <Box
              component="video"
              src={r.video_url}
              controls
              preload="metadata"
              sx={{ width: "100%", maxHeight: 420, borderRadius: 1, border: "1px solid #e2e8f0", mt: 0.5 }}
            />
          )}
        </Box>
      )}

      {/* FILE / IMAGE RENDERING (LinkedIn style) */}
      {!hasVideo && hasFile && isImageFile && (
        <Box
          sx={{
            mt: 1,
            borderRadius: 1,
            overflow: "hidden",
            border: "1px solid #e2e8f0",
            bgcolor: "background.paper",
          }}
        >
          <Box
            component="img"
            src={fileUrl}
            alt={r.title || "resource image"}
            sx={{
              width: "100%",
              maxHeight: 460,
              objectFit: "cover",
              display: "block",
            }}
          />
        </Box>
      )}

      {!hasVideo && hasFile && isPdfFile && (
        <Box
          sx={{
            mt: 1,
            borderRadius: 1,
            overflow: "hidden",
            border: "1px solid #e2e8f0",
            bgcolor: "background.paper",
          }}
        >
          <Box
            component="iframe"
            src={fileUrl}
            title={r.title || "PDF"}
            sx={{ width: "100%", height: 420, border: 0 }}
          />
        </Box>
      )}

      {!hasVideo && hasFile && !isImageFile && !isPdfFile && (
        <Paper
          variant="outlined"
          sx={{
            mt: 1,
            p: 1.25,
            borderRadius: 1,
            borderColor: "#e2e8f0",
            bgcolor: "background.paper",
          }}
        >
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 1.5,
                bgcolor: "grey.100",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
              }}
            >
              📎
            </Box>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                {fileName}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {(fileExt || "FILE").toUpperCase()} · Attachment
              </Typography>
            </Box>

            <Chip size="small" label={(fileExt || "FILE").toUpperCase()} variant="outlined" />
          </Stack>
        </Paper>
      )}
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
    rawAuthor.avatar || rawAuthor.avatar_url || rawAuthor.user_image || rawAuthor.user_image_url ||
    rawAuthor.image || rawAuthor.photo ||
    rawAuthor.profile?.avatar || rawAuthor.profile?.avatar_url ||
    rawAuthor.profile?.user_image || rawAuthor.profile?.user_image_url ||
    c.author_avatar || c.avatar || c.avatar_url || c.user_image || c.user_image_url || c.image || c.photo || ""
  );

  const moderation_status =
    c.moderation_status ??
    c.moderationStatus ??
    null;
  const is_under_review =
    c.is_under_review ??
    (moderation_status === "under_review");
  const is_removed =
    c.is_removed ??
    (moderation_status === "removed");
  const can_engage =
    c.can_engage ??
    (!is_under_review && !is_removed);

  const kyc_status =
    rawAuthor.kyc_status ||
    rawAuthor.kycStatus ||
    rawAuthor.profile?.kyc_status ||
    rawAuthor.profile?.kycStatus ||
    null;

  return {
    ...c,
    parent_id,
    author_id,
    author: { id: author_id, name, avatar, kyc_status },
    moderation_status,
    is_under_review,
    is_removed,
    can_engage,
    is_blurred: c.is_blurred ?? false,
  };
}

// CommentItem moved OUTSIDE CommentsDialog to prevent re-creation on every render
// which was causing the menu to close unexpectedly
function CommentItem({
  c,
  depth = 0,
  myId,
  isAdmin,
  onToggleLike,
  onReply,
  onDelete,
  onReport,
  canEngage,
  reportable
}) {
  const canDeleteComment = c?.author_id === myId;
  const canInteract = canEngage && !(c.is_under_review || c.is_removed);
  const canReport = reportable && myId && c?.author_id !== myId;
  const [menuAnchor, setMenuAnchor] = React.useState(null);
  const menuOpen = Boolean(menuAnchor);

  const handleMenuOpen = React.useCallback((e) => {
    e.stopPropagation();
    setMenuAnchor(e.currentTarget);
  }, []);

  const handleMenuClose = React.useCallback(() => {
    setMenuAnchor(null);
  }, []);

  const handleReport = React.useCallback(() => {
    setMenuAnchor(null);
    onReport?.(c);
  }, [onReport, c]);

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
        <Avatar
          src={c.author?.avatar}
          sx={{ width: 28, height: 28 }}
          imgProps={{ loading: "lazy", decoding: "async" }}
        >
          {(c.author?.name || "U").slice(0, 1)}
        </Avatar>
        <Typography variant="subtitle2" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          {c.author?.name || c.author?.username || "User"}
          {c.author?.kyc_status === "approved" && (
            <VerifiedIcon sx={{ fontSize: 14, color: "#22d3ee" }} />
          )}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {formatWhen(c.created_at, c.userTimezone)}
        </Typography>
        {c.is_under_review && (
          <Chip size="small" label="Under Review" variant="outlined" />
        )}
        {c.is_removed && (
          <Chip size="small" color="warning" label="Removed" variant="outlined" />
        )}
        {canReport && (
          <>
            <IconButton size="small" onClick={handleMenuOpen}>
              <MoreVertRoundedIcon fontSize="small" />
            </IconButton>
            <Menu
              open={menuOpen}
              anchorEl={menuAnchor}
              onClose={handleMenuClose}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
              // Prevent menu from closing due to parent re-renders
              disablePortal={false}
              keepMounted
            >
              <MenuItem onClick={handleReport}>
                <FlagOutlinedIcon fontSize="small" sx={{ mr: 1 }} />
                Report comment
              </MenuItem>
            </Menu>
          </>
        )}
      </Stack>

      <Typography
        sx={{
          mt: 0.5,
          whiteSpace: "pre-wrap",
          filter: c.is_blurred ? "blur(4px)" : "none",
          opacity: c.is_removed ? 0.5 : 1,
        }}
      >
        {c.text}
      </Typography>

      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 0.5 }}>
        <Button
          size="small"
          startIcon={c.user_has_liked ? <FavoriteRoundedIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
          onClick={() => canInteract && onToggleLike?.(c.id)}
          disabled={!canInteract}
          sx={{ color: c.user_has_liked ? "teal" : "inherit" }}
        >
          {c.like_count ?? 0}
        </Button>
        <Button
          size="small"
          startIcon={<ReplyRoundedIcon fontSize="small" />}
          onClick={() => canInteract && onReply?.(c)}
          disabled={!canInteract}
        >
          Reply
        </Button>
        {canDeleteComment && (
          <Button size="small" color="error" startIcon={<DeleteOutlineRoundedIcon fontSize="small" />} onClick={() => onDelete?.(c)}>
            Delete
          </Button>
        )}
      </Stack>

      {/* Recursive rendering of child comments */}
      {!!c.children?.length && (
        <Stack spacing={1} sx={{ mt: 1 }}>
          {c.children
            .sort((a, b) => (new Date(a.created_at || 0)) - (new Date(b.created_at || 0)))
            .map(child => (
              <CommentItem
                key={child.id}
                c={child}
                depth={depth + 1}
                myId={myId}
                isAdmin={isAdmin}
                onToggleLike={onToggleLike}
                onReply={onReply}
                onDelete={onDelete}
                onReport={onReport}
                canEngage={canEngage}
                reportable={reportable}
              />
            ))}
        </Stack>
      )}
    </Box>
  );
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
  target,
  canEngage = true,
  reportable = true,
  onReport
}) {
  const [loading, setLoading] = React.useState(false);
  const [me, setMe] = React.useState(null);
  const [items, setItems] = React.useState([]);
  const [text, setText] = React.useState("");
  const [replyTo, setReplyTo] = React.useState(null);

  // NEW: how many root comments to show inline
  const [visibleCount, setVisibleCount] = React.useState(initialCount);
  // DELETE CONFIRMATION State
  const [confirmDelId, setConfirmDelId] = React.useState(null);
  const [delBusy, setDelBusy] = React.useState(false);

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
    return c?.author_id === myId;
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
    setConfirmDelId(c.id);
  }

  async function performDelete() {
    if (!confirmDelId) return;
    setDelBusy(true);
    try {
      const r = await fetch(toApiUrl(`engagements/comments/${confirmDelId}/`), {
        method: "DELETE",
        headers: { ...authHeaders() },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      // success: nothing else to do, optimistic update was NOT done here so we load
      await load();
      setConfirmDelId(null);
    } catch (e) {
      await load();
      alert("Could not delete comment. Please try again.");
    } finally {
      setDelBusy(false);
    }
  }

  const deleteConfirmationDialog = (
    <Dialog
      open={!!confirmDelId}
      onClose={() => !delBusy && setConfirmDelId(null)}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>Delete Comment?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Are you sure you want to delete this comment?
          This action cannot be undone.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setConfirmDelId(null)} disabled={delBusy}>
          Cancel
        </Button>
        <Button
          onClick={performDelete}
          color="error"
          variant="contained"
          disabled={delBusy}
          startIcon={delBusy ? <CircularProgress size={16} color="inherit" /> : null}
        >
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );

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
    if (!canEngage) return;
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
    if (!canEngage) return;
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

  const markCommentUnderReview = React.useCallback((commentId) => {
    setItems((curr) =>
      curr.map((c) =>
        c.id === commentId
          ? {
            ...c,
            moderation_status: "under_review",
            is_under_review: true,
            is_removed: false,
            can_engage: false,
            is_blurred: !isAdmin && c.author_id !== myId,
          }
          : c
      )
    );
  }, [isAdmin, myId]);

  // Helper function to handle comment reporting
  const handleReportComment = React.useCallback((comment) => {
    if (!onReport) return;
    onReport({
      target_type: "comment",
      target_id: comment.id,
      label: "comment",
      onSuccess: () => markCommentUnderReview(comment.id),
    });
  }, [onReport, markCommentUnderReview]);

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

        {!canEngage && (
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
            Engagement is disabled while this content is under review.
          </Typography>
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
              if (!canEngage) return;
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                createComment(text, replyTo?.id || null);
              }
            }}
            disabled={!canEngage}
          />
          <Button
            variant="contained"
            onClick={() => createComment(text, replyTo?.id || null)}
            disabled={!canEngage || loading || !text.trim()}
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
              {/* Inside CommentsDialog return statement */}
              {visibleRoots.map(c => (
                <CommentItem
                  key={c.id}
                  c={{ ...c, userTimezone: me?.timezone }} // Pass timezone down
                  myId={myId}
                  isAdmin={isAdmin}
                  onToggleLike={toggleCommentLike}
                  onReply={setReplyTo}
                  onDelete={deleteComment}
                  onReport={handleReportComment}
                  canEngage={canEngage}
                  reportable={reportable}
                />
              ))}
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
        {deleteConfirmationDialog}
      </Box>
    );
  }


  // --------- ORIGINAL MODAL (left intact for compatibility) ----------
  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>Comments</DialogTitle>
        <DialogContent dividers>
          {loading ? (
            <Stack alignItems="center" py={3}><CircularProgress size={22} /></Stack>
          ) : roots.length === 0 ? (
            <Typography color="text.secondary">No comments yet.</Typography>
          ) : (
            <Stack spacing={2}>
              {roots.map(c => (
                <CommentItem
                  key={c.id}
                  c={{ ...c, userTimezone: me?.timezone }} // Pass timezone down
                  myId={myId}
                  isAdmin={isAdmin}
                  onToggleLike={toggleCommentLike}
                  onReply={setReplyTo}
                  onDelete={deleteComment}
                  onReport={handleReportComment}
                  canEngage={canEngage}
                  reportable={reportable}
                />
              ))}
            </Stack>
          )}
        </DialogContent>
        <Divider />
        <Box sx={{ px: 2, py: 1.5 }}>
          {!canEngage && (
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
              Engagement is disabled while this content is under review.
            </Typography>
          )}
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
              disabled={!canEngage}
            />
            <Button variant="contained" disabled={!canEngage} onClick={() => createComment(text, replyTo?.id || null)}>Post</Button>
          </Stack>
        </Box>
      </Dialog>
      {deleteConfirmationDialog}
    </>
  );
}


function ShareDialog({ open, onClose, postId, onShared, target, authorId, groupId }) {
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
      const avatar = toMediaUrl(
        u?.avatar || u?.avatar_url || u?.user_image || u?.user_image_url ||
        u?.image || u?.photo ||
        u?.profile?.avatar || u?.profile?.avatar_url || u?.profile?.user_image || u?.profile?.user_image_url ||
        f?.avatar || f?.avatar_url || f?.user_image || f?.user_image_url || f?.image || f?.photo || ""
      );

      const kycStatus =
        u?.kyc_status ||
        u?.kycStatus ||
        u?.profile?.kyc_status ||
        f?.kyc_status ||
        "not_started";

      return { id, name, avatar, kycStatus };
    }).filter(x => x.id);
  }

  const fetchFriends = React.useCallback(async () => {
    if (!open) return;
    setLoading(true);

    // figure out who is logged in (for excluding self from group members)
    let meId = null;
    try {
      const meJson = await getMeCached();
      meId = meJson?.id || meJson?.user?.id || null;
    } catch (e) {
      meId = null;
    }

    // 0) GROUP POST: prefer group members → share only to group members (B, C, …)
    if (groupId) {
      const groupCandidatePaths = [
        `groups/${groupId}/members/`,
        `groups/${groupId}/memberships/`,
        `group-memberships/?group=${groupId}`,
        `group-members/?group=${groupId}`,
      ];
      for (const path of groupCandidatePaths) {
        try {
          const r = await fetch(toApiUrl(path), {
            headers: { Accept: "application/json", ...authHeaders() },
          });
          if (!r.ok) continue;

          const j = await r.json();
          const arr =
            Array.isArray(j?.results) ? j.results :
              Array.isArray(j) ? j :
                j?.members || j?.data || [];

          let norm = normalizeFriends(arr);
          // ❌ don’t show current user in the list (A shouldn’t see themself)
          if (meId) {
            norm = norm.filter((u) => u.id !== meId);
          }

          setFriends(norm);
          setLoading(false);
          return; // ✅ group post handled, no need to fall back
        } catch (e) {
          // try next candidate path
        }
      }
      // if all group endpoints fail, fall through to the normal friend logic below
    }

    // 1) Normal / admin post: mutual friends with the post author
    if (authorId) {
      try {
        const r = await fetch(
          toApiUrl(`friends/mutual/?user_id=${authorId}`),
          { headers: { Accept: "application/json", ...authHeaders() } }
        );
        if (r.ok) {
          const j = await r.json();
          const arr = Array.isArray(j?.results)
            ? j.results
            : (Array.isArray(j) ? j : j?.data || []);
          const norm = normalizeFriends(arr);

          // ✅ If we found ANY mutuals → use them (friend posts)
          if (norm.length > 0) {
            setFriends(norm);
            setLoading(false);
            return;
          }
          // ⚠️ If 0 mutuals (typical for admin posts) → fall through to full friends list
        }
      } catch (e) {
        // ignore and fall back to normal friends list below
      }
    }

    // 2) Fallback: all accepted friends (e.g. admin posts with 0 mutuals → share to your friends)
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
      } catch {
        /* try next */
      }
    }

    setFriends([]);
    setLoading(false);
  }, [open, authorId, groupId]);



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
                    <ListItemText
                      primary={
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <Typography variant="body1">{f.name}</Typography>
                          {(f.kycStatus === "approved" || f.kycStatus === "verified") && (
                            <VerifiedIcon color="primary" sx={{ fontSize: 16 }} />
                          )}
                        </Stack>
                      }
                    />
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



// ---- POST CARD ----
function PostCard({ post, onReact, onOpenPost, onPollVote, onOpenEvent, viewerId, viewerIsStaff, onReport, commentsEnabled, userTimezone }) {
  const [local, setLocal] = React.useState(post);
  const [userHasLiked, setUserHasLiked] = React.useState(!!post.user_has_liked);
  const [commentsOpen, setCommentsOpen] = React.useState(false);
  const [shareOpen, setShareOpen] = React.useState(false);

  const [likers, setLikers] = React.useState([]);
  const likeCount = Number(post.metrics?.likes || 0);
  const shareCount = Number(post.metrics?.shares || 0);

  // my reaction info
  const myReactionId =
    post.my_reaction || (post.liked_by_me ? "like" : null);
  const myReactionDef = POST_REACTIONS.find((r) => r.id === myReactionId);
  const likeBtnLabel = myReactionDef ? myReactionDef.label : "Like";
  const likeBtnEmoji = myReactionDef ? myReactionDef.emoji : "👍";
  const hasReaction = !!myReactionId;

  // Popup anchor
  const [anchorEl, setAnchorEl] = React.useState(null);
  const pickerOpen = Boolean(anchorEl);
  const handleOpenPicker = (event) => setAnchorEl(event.currentTarget);
  const handleClosePicker = () => setAnchorEl(null);
  const primaryLiker = likers?.[0] || null;
  const othersCount = Math.max(0, (likeCount || 0) - 1);

  // Unique reaction types present on this post
  const reactionIds = Array.from(
    new Set(
      [
        ...likers.map((u) => u.reactionId).filter(Boolean),
        myReactionId, // include my current reaction so bubbles update instantly
      ].filter(Boolean)
    )
  );

  const likeLabel =
    primaryLiker && likeCount > 0
      ? likeCount === 1
        ? `reacted by ${primaryLiker.name}`
        : `reacted by ${primaryLiker.name} and ${othersCount} others`
      : `${(likeCount || 0).toLocaleString()} reactions`;

  React.useEffect(() => { setLocal(post); }, [post]);
  React.useEffect(() => {
    if (commentsEnabled === false) setCommentsOpen(false);
  }, [commentsEnabled]);
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
  React.useEffect(() => {
    const target = engageTargetOf(post);
    let cancelled = false;
    (async () => {
      try {
        const urls = [
          toApiUrl(`engagements/reactions/who-liked/?${target.type ? `target_type=${encodeURIComponent(target.type)}&` : ""}target_id=${target.id}&page_size=5`),
        ];
        for (const url of urls) {
          const r = await fetch(url, { headers: { Accept: "application/json", ...authHeaders() } });
          if (!r.ok) continue;
          const j = await r.json();
          const rows = Array.isArray(j?.results) ? j.results : (Array.isArray(j) ? j : []);
          const norm = rows.map((row) => {
            const u = row.user || row.actor || row.profile || row;
            const name =
              u?.name || u?.full_name ||
              (u?.first_name || u?.last_name ? `${u?.first_name || ""} ${u?.last_name || ""}`.trim() : u?.username) ||
              `User #${u?.id || row.user_id || row.id}`;
            const avatar = toMediaUrl(
              u?.avatar || u?.avatar_url || u?.user_image || u?.user_image_url ||
              u?.image || u?.photo ||
              u?.profile?.avatar || u?.profile?.avatar_url || u?.profile?.user_image || u?.profile?.user_image_url ||
              row.actor_avatar || row.avatar || row.avatar_url || row.user_image || row.user_image_url || row.image || row.photo || ""
            );
            const id = u?.id || row.user_id || row.id;
            const reactionId = row.reaction || row.reaction_type || row.kind || null;  // 👈 add this

            return { id, name, avatar, reactionId };
          }).filter(Boolean);

          if (!cancelled) setLikers(norm);
          if (norm.length) break;
        }
      } catch { if (!cancelled) setLikers([]); }
    })();
    return () => { cancelled = true; };
  }, [post.id]);

  async function toggleLike() {
    if (!canEngage) return;
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

  const resourceEventTitle =
    post.type === "resource" ? (post.resource?.event_title || null) : null;

  const eventTitle =
    post.type === "event" ? (post.event?.title || null) : null;

  const headingTitle =
    resourceEventTitle
      ? resourceEventTitle
      : eventTitle
        ? eventTitle
        : post.group_id
          ? (post.group || (post.group_id ? `Group #${post.group_id}` : "—"))
          : (post.visibility === "community"
            ? (post.community || (post.community_id ? `Community #${post.community_id}` : "—"))
            : (post.author?.name || "—"));

  const moderationStatus = post.moderation_status || (post.is_under_review ? "under_review" : (post.is_removed ? "removed" : null));
  const isUnderReview = post.is_under_review ?? (moderationStatus === "under_review");
  const isRemoved = post.is_removed ?? (moderationStatus === "removed");
  const canEngage = post.can_engage ?? (!isUnderReview && !isRemoved);
  const isReportable = post.type !== "event" && post.type !== "resource";
  const canReport = isReportable && viewerId && viewerId !== post.author_id;
  const shouldBlur = post.is_blurred ?? (isUnderReview && !(viewerIsStaff || viewerId === post.author_id));
  const [menuAnchor, setMenuAnchor] = React.useState(null);
  const menuOpen = Boolean(menuAnchor);

  return (
    <Paper
      key={post.id}
      elevation={0}
      sx={{
        p: 2,
        mb: 2,
        border: `1px solid ${BORDER}`,
        borderRadius: 3,
        width: "100%",
        // 🔹 Make each post card itself fixed-width on desktop
        maxWidth: { xs: "100%", md: "100%" },
        minWidth: { xs: "100%", md: "100%" },
        mx: { xs: 0, md: "auto" },
      }}
    >
      {/* Header */}
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Avatar
          src={toMediaUrl(
            post.type === "event"
              ? (post.event?.preview_image || post.group_avatar || post.author?.avatar)
              : (post.group_avatar || post.author?.avatar)
          )}
          alt={headingTitle}
          variant={post.type === "event" && post.event?.preview_image ? "rounded" : "circular"}
        />
        <Box sx={{ flex: 1, minWidth: 0 }}>

          <Stack direction="row" spacing={0.5} alignItems="center">
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {headingTitle}
            </Typography>
            {headingTitle === post.author?.name && post.author?.kyc_status === "approved" && (
              <VerifiedIcon sx={{ fontSize: 16, color: "#22d3ee" }} />
            )}
          </Stack>

          <Stack direction="row" spacing={0.5} alignItems="center">
            <Typography variant="caption" color="text.secondary" noWrap>
              {post.type === "resource" ? (post.resource?.title || "Resource") : (post.author?.name)}
            </Typography>



            <Typography variant="caption" color="text.secondary" noWrap>
              · {formatWhen(post.created_at, userTimezone)}
            </Typography>
          </Stack>
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
        {isUnderReview && <Chip size="small" label="Under Review" variant="outlined" />}
        {isRemoved && <Chip size="small" color="warning" label="Removed" variant="outlined" />}
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
                  onReport?.(post);
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
      <Box sx={{ mt: 1.25, position: "relative" }}>
        {!canEngage && isUnderReview && (
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
            Engagement is disabled while this content is under review.
          </Typography>
        )}
        <Box
          sx={{
            filter: shouldBlur ? "blur(4px)" : "none",
            opacity: isRemoved ? 1 : 1, // Keep opacity 1 so message is readable
            pointerEvents: shouldBlur ? "none" : "auto",
          }}
        >
          {isRemoved ? (
            <Typography color="text.secondary" sx={{ fontStyle: "italic", py: 2 }}>
              This content was removed by moderators.
            </Typography>
          ) : (
            <>
              {post.type === "text" && (
                <ClampedText text={post.text} maxLines={5} />
              )}

              {post.type === "resource" && (
                <ResourceBlock post={post} onOpenEvent={onOpenEvent} />
              )}

              {post.type === "image" && (
                <>
                  {post.text && (
                    <Box sx={{ mb: 1 }}>
                      <ClampedText text={post.text} maxLines={5} />
                    </Box>
                  )}
                  <Box
                    component="img"
                    src={toMediaUrl(post.image_url)}
                    alt={post.text || "post image"}
                    sx={{
                      width: "100%",
                      maxWidth: { xs: "100%", md: 640 },
                      maxHeight: 420,
                      objectFit: "cover",
                      borderRadius: 2,
                      border: `1px solid ${BORDER}`,
                      display: "block",
                      mx: "auto",
                    }}
                  />
                </>
              )}

              {post.type === "link" && (
                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, borderColor: BORDER, bgcolor: "#fafafa" }}>
                  {post.text && (
                    <Box sx={{ mb: 1 }}>
                      <ClampedText text={post.text} maxLines={5} />
                    </Box>
                  )}

                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    <Link href={post.url} target="_blank" rel="noreferrer">
                      {post.url_title || post.url}
                    </Link>
                  </Typography>

                  {post.url_desc && (
                    <ClampedText
                      text={post.url_desc}
                      maxLines={5}
                      variant="caption"
                      color="text.secondary"
                      mt={0.5}
                    />
                  )}
                </Paper>
              )}

              {post.type === "poll" && (
                <PollBlock post={local} onVote={(optionId, meta) => onPollVote?.(post, optionId, meta)} />
              )}

              {post.type === "event" && (
                <EventBlock
                  post={{ ...post, userTimezone }} // Pass timezone down to event block
                  onOpen={() => {
                    const eventId =
                      post?.engage?.id ??
                      post?.event?.id ??
                      post?.event_id ??
                      post?.eventId ??
                      post?.id;
                    onOpenEvent?.(eventId);
                  }}
                />
              )}
            </>
          )}
        </Box>
      </Box>

      {/* Actions */}
      {/* Meta strip: likers avatars + sentence | shares on right */}
      {(local.metrics?.likes || 0) > 0 || (local.metrics?.shares || 0) > 0 ? (
        <Box sx={{ px: 0.5, pt: 0.5 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={1} alignItems="center">
              <AvatarGroup
                max={3}
                sx={{ "& .MuiAvatar-root": { width: 24, height: 24, fontSize: 14 } }}
              >
                {(reactionIds.length ? reactionIds : ["like"])
                  .slice(0, 3)
                  .map((rid) => {
                    const def =
                      POST_REACTIONS.find((r) => r.id === rid) || POST_REACTIONS[0];
                    return (
                      <Avatar key={rid} onClick={() => window.__openLikes?.(engageTargetOf(post))?.()}>
                        <span style={{ fontSize: 16 }}>{def.emoji}</span>
                      </Avatar>
                    );
                  })}
              </AvatarGroup>
              <Typography
                variant="body2"
                sx={{ cursor: "pointer" }}
                onClick={() => window.__openLikes?.(engageTargetOf(post))?.()}
              >
                {likeLabel}
              </Typography>
            </Stack>

            <Button size="small" onClick={() => window.__openShares?.(engageTargetOf(post))?.()}>
              {(local.metrics?.shares || 0).toLocaleString()} SHARES
            </Button>
          </Stack>
        </Box>
      ) : null}
      <Divider sx={{ my: 1 }} />

      {/* Action row: Like / Comment / Share */}
      <Stack direction="row" justifyContent="space-around" alignItems="center" sx={{ px: 0.5, pb: 0.5 }}>
        <Button
          size="small"
          onClick={canEngage ? handleOpenPicker : undefined}
          disabled={!canEngage}
          sx={{
            textTransform: "none",
            color: hasReaction ? "primary.main" : "text.secondary",
            fontWeight: hasReaction ? 600 : 400,
          }}
          startIcon={
            <span style={{ fontSize: 18, lineHeight: 1 }}>
              {likeBtnEmoji}
            </span>
          }
        >
          {likeBtnLabel}
        </Button>

        {commentsEnabled && (
          <Button
            size="small"
            startIcon={<ChatBubbleOutlineIcon />}
            disabled={!canEngage}
            onClick={() => {
              if (!canEngage) return;
              setCommentsOpen((v) => {
                const next = !v;
                if (!v) setTimeout(() => commentInputRef.current?.focus?.(), 0); // focus when opening
                return next;
              });
            }}
          >
            COMMENT
          </Button>
        )}


        <Button
          size="small"
          startIcon={<IosShareIcon />}
          disabled={!canEngage}
          onClick={() => canEngage && setShareOpen(true)}
        >
          SHARE
        </Button>
      </Stack>

      <Popover
        open={pickerOpen}
        anchorEl={anchorEl}
        onClose={handleClosePicker}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        transformOrigin={{ vertical: "bottom", horizontal: "center" }}
        disableRestoreFocus
      >
        <Box
          sx={{
            p: 1,
            display: "flex",
            gap: 1,
            px: 1.5,
          }}
        >
          {POST_REACTIONS.map((r) => (
            <Tooltip key={r.id} title={r.label}>
              <Box
                onClick={async () => {
                  // delegate to parent (same as My Posts)
                  await onReact?.(post.id, r.id);
                  handleClosePicker();
                }}
                sx={{
                  cursor: "pointer",
                  fontSize: 26,
                  lineHeight: 1,
                  px: 0.5,
                  py: 0.25,
                  borderRadius: "999px",
                  transition:
                    "transform 120ms ease, background 120ms ease",
                  "&:hover": {
                    bgcolor: "action.hover",
                    transform: "translateY(-2px) scale(1.05)",
                  },
                }}
              >
                {r.emoji}
              </Box>
            </Tooltip>
          ))}
        </Box>
      </Popover>

      {/* Inline comments, always visible like LinkedIn/Instagram */}
      {commentsEnabled && commentsOpen && (
        <CommentsDialog
          inline
          initialCount={3}
          postId={post.id}
          target={engageTargetOf(post)}
          onBumpCount={bumpCommentCount}
          inputRef={commentInputRef}
          canEngage={canEngage}
          reportable={isReportable}
          onReport={onReport}
        />
      )}

      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        postId={post.id}
        target={engageTargetOf(post)}
        authorId={post.author_id || post.author?.id}  // existing
        groupId={post.group_id || null}               // 👈 NEW: pass group id
        onShared={bumpShareCount}
      />
    </Paper>
  );
}

function PostSkeleton() {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        mb: 2,
        borderRadius: 3,
        borderColor: "#e2e8f0",
        width: "100%", // ✅ Forces full width
        maxWidth: "100%", // ✅ Ensures it doesn't shrink on larger screens
        mx: "auto",
      }}
    >
      {/* Header Skeleton */}
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
        <Skeleton variant="circular" width={40} height={40} />
        <Box sx={{ flex: 1 }}>
          <Skeleton variant="text" width="40%" height={24} />
          <Skeleton variant="text" width="20%" height={20} />
        </Box>
      </Stack>

      {/* Body Skeleton */}
      <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2, mb: 1.5 }} />
      <Skeleton variant="text" width="90%" />
      <Skeleton variant="text" width="80%" />
      <Skeleton variant="text" width="50%" />

      {/* Footer Skeleton */}
      <Stack direction="row" justifyContent="space-between" sx={{ mt: 2 }}>
        <Skeleton variant="rounded" width={60} height={30} />
        <Skeleton variant="rounded" width={60} height={30} />
        <Skeleton variant="rounded" width={60} height={30} />
      </Stack>
    </Paper>
  );
}

// ---- MAIN PAGE (All / My Groups + Search) ----
export default function LiveFeedPage({
  posts: initialPosts,
  onOpenPost = () => { },
  onOpenEvent = NOOP,
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

  const [sortMode, setSortMode] = React.useState("recent");

  // Search
  const [query, setQuery] = React.useState("");
  const dq = useDebounced(query, 400);

  const navigate = useNavigate();

  // Smart routing for "View Event" inside Live Feed:
  // - if user has registered/purchased the event -> /account/events
  // - else -> /events
  const myRegisteredEventIdsRef = React.useRef(new Set());
  const [myRegisteredLoaded, setMyRegisteredLoaded] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const headers = authHeaders?.() || {};
        const hasAuth = Boolean(headers.Authorization || headers.authorization);
        if (!hasAuth) {
          if (!cancelled) setMyRegisteredLoaded(true);
          return;
        }

        const candidatePaths = [
          "events/my-registrations/?page_size=1000",
          "events/registrations/mine/?page_size=1000",
          "event-registrations/mine/?page_size=1000",
          "events/registered/?page_size=1000",
        ];

        for (const path of candidatePaths) {
          try {
            const res = await fetch(toApiUrl(path), {
              headers: { Accept: "application/json", ...headers },
            });
            if (!res.ok) continue;

            const j = await res.json();
            const rows = Array.isArray(j) ? j : (j.results || j.data || []);

            const ids = [];
            for (const row of rows) {
              let id =
                row?.event_id ??
                row?.eventId ??
                row?.event;

              if (row?.event && typeof row.event === "object") id = row.event?.id;

              // Some APIs might return the event objects directly
              if (id == null && row?.id != null) id = row.id;

              if (id != null) ids.push(id);
            }

            if (ids.length) {
              myRegisteredEventIdsRef.current = new Set(
                ids.map((x) => {
                  const n = Number(x);
                  return Number.isNaN(n) ? x : n;
                }),
              );
            }
            break;
          } catch {
            // try next endpoint
          }
        }
      } finally {
        if (!cancelled) setMyRegisteredLoaded(true);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const smartOpenEvent = React.useCallback((eventId) => {
    const n = Number(eventId);
    const key = Number.isNaN(n) ? eventId : n;

    if (!myRegisteredLoaded || key == null) {
      navigate("/events");
      return;
    }

    const isRegistered = myRegisteredEventIdsRef.current.has(key);

    // ✅ staff OR superuser -> admin/events if registered
    const adminSide = isOwnerUser() || isStaffUser();

    if (isRegistered) {
      navigate(adminSide ? "/admin/events" : "/account/events");
    } else {
      navigate("/events");
    }
  }, [navigate, myRegisteredLoaded]);

  // If parent passes a handler, keep it. Otherwise use smart routing.
  const openEvent = onOpenEvent === NOOP ? smartOpenEvent : onOpenEvent;
  const [searchParams] = useSearchParams();
  const focus = searchParams.get("focus"); // "connections" | "groups"

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

  // ✅ Suggested groups (fetched once)
  const [suggestedGroups, setSuggestedGroups] = React.useState([]);
  const [suggestedGroupsLoading, setSuggestedGroupsLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      try {
        setSuggestedGroupsLoading(true);
        const r = await fetch(toApiUrl("groups/suggested/?limit=8"), {
          headers: { Accept: "application/json", ...authHeaders() },
        });
        const j = r.ok ? await r.json() : [];
        setSuggestedGroups(Array.isArray(j) ? j : (j.results || []));
      } catch {
        setSuggestedGroups([]);
      } finally {
        setSuggestedGroupsLoading(false);
      }
    })();
  }, []);

  const removeSuggestedGroup = (id) => {
    setSuggestedGroups((prev) => prev.filter((g) => g.id !== id));
  };


  const handleJoinedGroup = React.useCallback((groupId) => {
    setSuggestedGroups((prev) => prev.filter((g) => Number(g.id) !== Number(groupId)));
  }, []);

  // Feed data
  const [posts, setPosts] = React.useState(initialPosts ?? []);
  const [nextUrl, setNextUrl] = React.useState(null);
  const [hasMore, setHasMore] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [me, setMe] = React.useState(null);
  const [focusPostId, setFocusPostId] = React.useState(null);
  const focusHandledRef = React.useRef(false);
  const [groupCommentsEnabled, setGroupCommentsEnabled] = React.useState({});
  const groupCommentsEnabledRef = React.useRef({});
  // Composer (kept off per your UI; uncomment if needed)
  const MAX_LEN = 280;
  const [composeText, setComposeText] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  // --- Likes modal state (global for this page) ---
  const [likesOpen, setLikesOpen] = React.useState(false);
  const [likesTarget, setLikesTarget] = React.useState(null); // {id, type|null}
  const [likesLoading, setLikesLoading] = React.useState(false);
  const [likesUsers, setLikesUsers] = React.useState([]);
  const [likesFilter, setLikesFilter] = React.useState("all");
  // --- Shares modal state (global for this page) ---
  const [sharesOpen, setSharesOpen] = React.useState(false);
  const [sharesTarget, setSharesTarget] = React.useState(null);
  const [sharesLoading, setSharesLoading] = React.useState(false);
  const [sharesUsers, setSharesUsers] = React.useState([]);
  // --- Report modal state ---
  const [reportOpen, setReportOpen] = React.useState(false);
  const [reportTarget, setReportTarget] = React.useState(null);
  const [reportBusy, setReportBusy] = React.useState(false);

  const viewerId = me?.id || me?.user?.id || null;
  const viewerIsStaff = !!(me?.is_staff || me?.is_superuser || me?.isAdmin || me?.role === "admin");

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

  React.useEffect(() => {
    groupCommentsEnabledRef.current = groupCommentsEnabled;
  }, [groupCommentsEnabled]);

  const ensureGroupCommentSettings = React.useCallback(async (groupIds) => {
    const uniq = Array.from(new Set((groupIds || []).filter(Boolean)));
    if (!uniq.length) return;
    const missing = uniq.filter((gid) => groupCommentsEnabledRef.current[gid] === undefined);
    if (!missing.length) return;

    const headers = { Accept: "application/json", ...authHeaders() };
    const entries = await Promise.all(missing.map(async (gid) => {
      try {
        const res = await fetch(toApiUrl(`groups/${gid}/settings/communication/`), { headers });
        if (!res.ok) return [gid, true];
        const data = await res.json();
        return [gid, data?.posts_comments_enabled !== false];
      } catch {
        return [gid, true];
      }
    }));

    setGroupCommentsEnabled((prev) => {
      const next = { ...prev };
      entries.forEach(([gid, enabled]) => {
        if (gid != null) next[gid] = enabled;
      });
      return next;
    });
  }, []);

  // 🔼 Show "scroll to top" button after user scrolls down
  const [showScrollTop, setShowScrollTop] = React.useState(false);

  // Add a ref for the scroll trigger
  const observerTarget = React.useRef(null);

  // Add this useEffect to trigger 'handleLoadMore' automatically
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          handleLoadMore();
        }
      },
      { threshold: 0.5 } // Trigger when 50% visible
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) observer.unobserve(observerTarget.current);
    };
  }, [hasMore, loading, nextUrl]);

  // 🔹 Multi-reaction handler (Like / Intriguing / Spot On / etc.)
  async function handleReact(postId, reactionId) {
    if (!postId || !reactionId) return;
    const currentPost = posts.find((p) => p.id === postId);
    if (currentPost && (currentPost.can_engage === false || currentPost.is_under_review || currentPost.is_removed)) {
      return;
    }

    // 1) Optimistic update in local state (same feel as My Posts)
    setPosts((curr) =>
      curr.map((p) => {
        if (p.id !== postId) return p;

        const currentReaction = p.my_reaction || (p.liked_by_me ? "like" : null);
        const hadReaction = !!currentReaction;
        const isSame = currentReaction === reactionId;

        // clicking same reaction again → remove reaction
        const nextReaction = isSame ? null : reactionId;

        const currentLikes = p.metrics?.likes ?? 0;
        let nextLikes = currentLikes;

        if (!hadReaction && nextReaction) {
          // no reaction before → add one like
          nextLikes = currentLikes + 1;
        } else if (hadReaction && !nextReaction) {
          // removing reaction → minus one like
          nextLikes = Math.max(0, currentLikes - 1);
        }
        // changing from one reaction to another keeps like count the same

        return {
          ...p,
          my_reaction: nextReaction,
          liked_by_me: !!nextReaction,
          user_has_liked: !!nextReaction,
          metrics: {
            ...(p.metrics || {}),
            likes: nextLikes,
          },
        };
      })
    );

    // 2) Call backend toggle endpoint (same API as other places in this file)
    try {
      // find the post & engagement target
      const post = posts.find((p) => p.id === postId);
      if (!post) return;
      const target = engageTargetOf(post);

      const payload = {
        target_id: target.id,
        reaction: reactionId,       // 👈 IMPORTANT: backend expects `reaction`
      };
      if (target.type) payload.target_type = target.type;

      const res = await fetch(toApiUrl(`engagements/reactions/toggle/`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      // 3) Re-sync exact counts from server so Live Feed stays accurate
      const counts = await fetchEngagementCountsForTarget(target);
      setPosts((curr) =>
        curr.map((p) =>
          p.id === postId
            ? {
              ...p,
              user_has_liked: !!counts.user_has_liked,
              metrics: {
                ...(p.metrics || {}),
                ...counts, // {likes, comments, shares, user_has_liked}
              },
            }
            : p
        )
      );
    } catch (e) {
      console.error("handleReact failed:", e);
      // If something goes wrong, do a hard refresh of metrics so UI recovers
      try {
        const post = posts.find((p) => p.id === postId);
        if (!post) return;
        const target = engageTargetOf(post);
        const counts = await fetchEngagementCountsForTarget(target);
        setPosts((curr) =>
          curr.map((p) =>
            p.id === postId
              ? {
                ...p,
                user_has_liked: !!counts.user_has_liked,
                metrics: {
                  ...(p.metrics || {}),
                  ...counts,
                },
              }
              : p
          )
        );
      } catch (e2) {
        console.error("Failed to resync metrics:", e2);
      }
    }

    // 4) Also call parent callback if someone passed onReact prop
    onReact?.(postId, reactionId);
  }

  React.useEffect(() => {
    const handleScroll = () => {
      if (typeof window === "undefined") return;
      setShowScrollTop(window.scrollY > 300); // show after 300px
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleScrollTop = () => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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
  }, [openReport, setPosts, viewerId, viewerIsStaff]);


  // Install a global opener used by PostCard ("liked by X and N others" click)
  React.useEffect(() => {
    window.__openLikes = (t) => () => {
      // accept either a number (feed item id) or an {id, type} object
      const target = typeof t === "object" && t ? t : { id: t, type: null };
      setLikesTarget(target);
      setLikesOpen(true);
    };
    return () => { try { delete window.__openLikes; } catch { } };
  }, []);

  // Install a global opener used by PostCard for "X SHARES" click
  React.useEffect(() => {
    window.__openShares = (t) => () => {
      // accept either a number or an {id, type} object
      const target = typeof t === "object" && t ? t : { id: t, type: null };
      setSharesTarget(target);
      setSharesOpen(true);
    };
    return () => { try { delete window.__openShares; } catch { } };
  }, []);




  // Fetch all reactions (not only likes) for the current target
  React.useEffect(() => {
    if (!likesOpen || !likesTarget?.id) return;

    (async () => {
      setLikesFilter("all");       // reset tabs to "All" every time
      setLikesLoading(true);
      const { id, type } = likesTarget;

      const urls = [
        // 1) if we know exact target_type (events.event, content.resource, etc.)
        type ? toApiUrl(
          `engagements/reactions/?target_type=${encodeURIComponent(type)}&target_id=${id}&page_size=100`
        ) : null,
        // 2) generic feed item (same as MyPostsPage)
        toApiUrl(
          `engagements/reactions/?target_type=activity_feed.feeditem&target_id=${id}&page_size=100`
        ),
        // 3) legacy "who-liked" endpoint (fallback, may only return likes)
        toApiUrl(
          `engagements/reactions/who-liked/?feed_item=${id}&page_size=100`
        ),
      ].filter(Boolean);

      let rows = [];
      for (const url of urls) {
        try {
          const r = await fetch(url, {
            headers: { Accept: "application/json", ...authHeaders() },
          });
          if (!r.ok) continue;
          const j = await r.json();
          rows = Array.isArray(j?.results)
            ? j.results
            : Array.isArray(j)
              ? j
              : [];
          if (rows.length) break;
        } catch {
          // ignore and try next url
        }
      }

      const list = rows.map((row) => {
        // pick user from various shapes
        const u = row.user || row.actor || row.profile || row;
        const id2 = u?.id || row.user_id || row.id;

        const name =
          u?.name ||
          u?.full_name ||
          ((u?.first_name || u?.last_name)
            ? `${u?.first_name || ""} ${u?.last_name || ""}`.trim()
            : u?.username) ||
          `User #${id2}`;

        const avatar = toMediaUrl(
          u?.avatar ||
          u?.avatar_url ||
          u?.user_image ||
          u?.user_image_url ||
          u?.image ||
          u?.photo ||
          u?.profile?.avatar ||
          u?.profile?.avatar_url ||
          u?.profile?.user_image ||
          u?.profile?.user_image_url ||
          row.actor_avatar ||
          row.avatar ||
          row.avatar_url ||
          row.actor_user_image ||
          row.actor_user_image_url ||
          row.user_image ||
          row.user_image_url ||
          row.image ||
          row.photo ||
          ""
        );

        // ⭐ reaction type from backend
        const reactionId =
          row.reaction || row.reaction_type || row.kind || null;

        const def =
          POST_REACTIONS.find((x) => x.id === reactionId) ||
          POST_REACTIONS[0]; // default to "Like"

        // 🟢 Extract KYC status
        const kycStatus =
          u?.kyc_status ||
          u?.kycStatus ||
          u?.profile?.kyc_status ||
          u?.profile?.kycStatus ||
          row.kyc_status ||
          row.kycStatus ||
          null;

        return {
          id: id2,
          name,
          avatar,
          reactionId,
          reactionEmoji: def?.emoji,
          reactionLabel: def?.label,
          kyc_status: kycStatus,
        };
      });

      setLikesUsers(list);
      setLikesLoading(false);
    })();
  }, [likesOpen, likesTarget]);

  React.useEffect(() => {
    if (!sharesOpen || !sharesTarget?.id) return;

    (async () => {
      setSharesLoading(true);
      const { id, type } = sharesTarget;

      // Try a few likely endpoints (handles FeedItem or typed targets)
      const urls = [
        type ? toApiUrl(`engagements/shares/?target_type=${encodeURIComponent(type)}&target_id=${id}&page_size=100`) : null,
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

      const list = rows.map((row) => {
        const u = row.user || row.actor || row.profile || row.from_user || row.shared_by || row.owner || row;
        const id2 = u?.id || row.user_id || row.from_user_id || row.id;
        const name =
          u?.name || u?.full_name ||
          ((u?.first_name || u?.last_name) ? `${u?.first_name || ""} ${u?.last_name || ""}`.trim() : u?.username) ||
          `User #${id2}`;
        const avatar = toMediaUrl(
          u?.avatar || u?.avatar_url || u?.user_image || u?.user_image_url ||
          u?.image || u?.photo ||
          u?.profile?.avatar || u?.profile?.avatar_url || u?.profile?.user_image || u?.profile?.user_image_url ||
          row.actor_avatar || row.avatar || row.avatar_url || row.user_image || row.user_image_url || row.image || row.photo || ""
        );
        const kycStatus =
          u?.kyc_status ||
          u?.kycStatus ||
          u?.profile?.kyc_status ||
          u?.profile?.kycStatus ||
          row.kyc_status ||
          row.kycStatus ||
          null;

        return { id: id2, name, avatar, kyc_status: kycStatus };
      });

      // [FIX] Deduplicate users by ID using a Map
      // This ensures if User A is found 3 times, we only keep them once.
      const uniqueList = Array.from(
        new Map(list.map((item) => [item.id, item])).values()
      );

      setSharesUsers(uniqueList); // <--- Use uniqueList instead of list
      setSharesLoading(false);
    })();
  }, [sharesOpen, sharesTarget]);


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
      await ensureGroupCommentSettings(items.map((p) => p.group_id).filter(Boolean));

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
          if (incoming.group_id) ensureGroupCommentSettings([incoming.group_id]);
          // De-dup if the same id is already present (e.g., appears later via HTTP page load)
          setPosts((curr) => [incoming, ...curr.filter((p) => p.id !== incoming.id)]);
        }
      } catch { }
    };
    return () => ws.close();
  }, [websocketUrl, scope, ensureGroupCommentSettings]);

  // Check if we should focus a specific post (shared from messages)
  React.useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search || "");
      let pid = params.get("post");

      if (pid) {
        const num = parseInt(pid, 10);
        if (!Number.isNaN(num)) pid = num;
      } else {
        const stored = window.localStorage ? window.localStorage.getItem("ecp_livefeed_focus_post") : null;
        if (stored) {
          const num = parseInt(stored, 10);
          pid = Number.isNaN(num) ? stored : num;
        }
      }

      if (pid) {
        setFocusPostId(pid);
        try {
          window.localStorage && window.localStorage.removeItem("ecp_livefeed_focus_post");
        } catch (_) { }
      }
    } catch (_) { }
  }, []);


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

  const displayPosts = React.useMemo(() => {
    // 1) scope filter first
    let arr = scope === "mine" ? posts.filter((p) => !!p.group_id) : posts;

    // 2) client-side search fallback (works even if API ignores q/search)
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
        ]
          .map(toText)
          .join(" ");
        return haystack.includes(needle);
      });
    }

    // 3) sort by mode
    const sorted = [...arr];

    if (sortMode === "popular") {
      // 👍 Most popular = highest likes first (then newest)
      sorted.sort((a, b) => {
        const la = a.metrics?.likes ?? a.like_count ?? 0;
        const lb = b.metrics?.likes ?? b.like_count ?? 0;
        if (lb !== la) return lb - la; // more likes → higher
        // tie-breaker: newer first
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      });
    } else {
      // 🕒 Most recent (default)
      sorted.sort(
        (a, b) =>
          new Date(b.created_at || 0) - new Date(a.created_at || 0)
      );
    }

    return sorted;
  }, [posts, scope, dq, sortMode]);


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

  // When navigated here from a shared message, scroll to the focused post once
  React.useEffect(() => {
    if (!focusPostId || focusHandledRef.current) return;
    const el = document.querySelector(`[data-post-id="${focusPostId}"]`);
    if (!el) return;

    focusHandledRef.current = true;
    try {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (e) {
      el.scrollIntoView();
    }
  }, [focusPostId, displayPosts]);

  // --- Derived data for Reactions popup (same idea as MyPostsPage) ---
  const likesFilteredUsers =
    likesFilter === "all"
      ? likesUsers
      : likesUsers.filter((u) => u.reactionId === likesFilter);

  const likesReactionCounts = { all: likesUsers.length };
  likesUsers.forEach((u) => {
    if (!u.reactionId) return;
    likesReactionCounts[u.reactionId] =
      (likesReactionCounts[u.reactionId] || 0) + 1;
  });


  return (
    <Grid
      container
      rowSpacing={2}
      columnSpacing={{ xs: 2, md: 4 }}   // 🔹 more gap between feed and right rail on md+
    >
      {/* Center: scope + search + feed */}
      <Grid item xs={12} md={9}>
        <Box
          sx={{
            width: "100%",
            // 🔹 Mobile & tablet: full width
            // 🔹 md+ (≥ 900px): clamp the feed to a fixed width and center it
            maxWidth: { xs: "100%", md: "100%" },
            mx: { xs: 0, md: "auto" },
          }}
        >
          {/* Scope toggle */}
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            sx={{ mb: 2 }}
            alignItems="center"
          >
            <Stack direction="row" spacing={1}>
              <Chip
                label="All"
                color={scope === "all" ? "primary" : "default"}
                variant={scope === "all" ? "filled" : "outlined"}
                onClick={() => setScope("all")}
              />
              <Chip
                label="My Groups"
                color={scope === "mine" ? "primary" : "default"}
                variant={scope === "mine" ? "filled" : "outlined"}
                onClick={() => setScope("mine")}
              />
            </Stack>

            <Box sx={{ flex: 1, width: "100%" }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search posts, events, resources…"
                value={query}
                onChange={(e) => setQuery(e.target.value)} // debounced by dq
                onKeyDown={(e) => {
                  if (e.key === "Enter")
                    loadFeed(buildFeedPath(scope, query), false); // optional: immediate refresh
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                type="search"
              />
            </Box>

            {/* 🔽 NEW: sort chips */}
            <Stack
              direction="row"
              spacing={1}
              sx={{ mt: { xs: 1, sm: 0 } }}
            >
              <Chip
                label="Most recent"
                size="small"
                color={sortMode === "recent" ? "primary" : "default"}
                variant={sortMode === "recent" ? "filled" : "outlined"}
                onClick={() => setSortMode("recent")}
              />
              <Chip
                label="Most popular"
                size="small"
                color={sortMode === "popular" ? "primary" : "default"}
                variant={sortMode === "popular" ? "filled" : "outlined"}
                onClick={() => setSortMode("popular")}
              />
            </Stack>
          </Stack>


          {/* (Composer kept commented; leave as-is to avoid changing other UI) */}

          {(focus === "connections") && (
            <Box sx={{ mb: 2 }}>
              <SuggestedConnections list={suggested} />
            </Box>
          )}

          {(focus === "groups") && (
            <Box sx={{ mb: 2 }}>
              <SuggestedGroups list={suggestedGroups} loading={suggestedGroupsLoading} onJoined={removeSuggestedGroup} />
            </Box>
          )}

          {/* Feed */}
          {loading && posts.length === 0 ? (
            // [CHANGE 1] Show Skeletons on first load instead of "Loading..." text
            // Ensure <PostSkeleton /> is defined or imported as shown in the previous step
            <>
              <PostSkeleton />
              <PostSkeleton />
              <PostSkeleton />
            </>
          ) : displayPosts.length === 0 ? (
            <Paper sx={{ p: 2, border: `1px solid ${BORDER}`, borderRadius: 3 }}>
              <Typography variant="body2" color="text.secondary">No posts match your filters.</Typography>
            </Paper>
          ) : (
            <>
              {displayPosts.map((p, idx) => (
                <React.Fragment key={p.id}>
                  <Box
                    data-post-id={p.id}
                    sx={{
                      scrollMarginTop: 96,
                      ...(focusPostId === p.id
                        ? { outline: `2px solid ${BORDER}`, borderRadius: 3 }
                        : null),
                    }}
                  >
                    <PostCard
                      post={p}
                      onReact={handleReact}
                      onOpenEvent={openEvent}
                      onPollVote={(post, optionId, meta) => voteOnPoll(post, optionId, meta)}
                      viewerId={viewerId}
                      viewerIsStaff={viewerIsStaff}
                      onReport={handleReport}
                      commentsEnabled={p.group_id ? (groupCommentsEnabled[p.group_id] !== false) : true}
                      userTimezone={me?.timezone}
                    />
                  </Box>
                  {/* After 4 posts: mutual connections */}
                  {((idx + 1) % 8 === 4) && (
                    <SuggestedConnections list={suggested} />
                  )}

                  {/* After next 4 posts (8 total): group suggestions */}
                  {((idx + 1) % 8 === 0) && (suggestedGroupsLoading || (suggestedGroups?.length ?? 0) > 0) && (
                    <SuggestedGroups
                      list={suggestedGroups}
                      loading={suggestedGroupsLoading}
                      onJoined={removeSuggestedGroup}
                    />
                  )}
                </React.Fragment>
              ))}

              {/* [CHANGE 2] Infinite Scroll Trigger & Bottom Loading State */}
              {hasMore && (
                <Box ref={observerTarget} sx={{ py: 2, textAlign: "center", width: "100%" }}>
                  {/* Show a skeleton at the bottom while fetching the NEXT page */}
                  {loading && <PostSkeleton />}
                </Box>
              )}
            </>
          )}
        </Box>
        <Dialog
          open={likesOpen}
          onClose={() => setLikesOpen(false)}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>Reactions</DialogTitle>
          <DialogContent dividers>
            {/* Tabs: All / 👍 / 🤔 / 🎯 / 🧠 / 🤷 just like MyPostsPage */}
            <Box sx={{ mb: 1, borderBottom: 1, borderColor: "divider" }}>
              <Tabs
                value={likesFilter}
                onChange={(_, v) => setLikesFilter(v)}
                variant="scrollable"
                allowScrollButtonsMobile
              >
                <Tab
                  value="all"
                  label={`All (${likesReactionCounts.all || 0})`}
                />
                {POST_REACTIONS.map((r) => (
                  <Tab
                    key={r.id}
                    value={r.id}
                    label={
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.5,
                        }}
                      >
                        <span>{r.emoji}</span>
                        <span style={{ fontSize: 12 }}>
                          ({likesReactionCounts[r.id] || 0})
                        </span>
                      </Box>
                    }
                  />
                ))}
              </Tabs>
            </Box>

            {likesLoading ? (
              <LinearProgress />
            ) : !likesFilteredUsers.length ? (
              <Typography p={2} color="text.secondary">
                No reactions yet.
              </Typography>
            ) : (
              <List dense>
                {likesFilteredUsers.map((u) => (
                  <ListItem key={u.id}>
                    <ListItemAvatar>
                      <Avatar src={u.avatar}>
                        {(u.name || "U").slice(0, 1)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <Typography variant="body1">{u.name}</Typography>
                          {u.kyc_status === "approved" && (
                            <VerifiedIcon sx={{ fontSize: 16, color: "#22d3ee" }} />
                          )}
                        </Stack>
                      }
                    />
                    {u.reactionEmoji && (
                      <ListItemSecondaryAction>
                        <Tooltip title={u.reactionLabel || ""}>
                          <Box sx={{ fontSize: 20, mr: 1 }}>
                            {u.reactionEmoji}
                          </Box>
                        </Tooltip>
                      </ListItemSecondaryAction>
                    )}
                  </ListItem>
                ))}
              </List>
            )}
          </DialogContent>
        </Dialog>
        <Dialog open={sharesOpen} onClose={() => setSharesOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Shares</DialogTitle>
          <DialogContent dividers>
            {sharesLoading ? (
              <Stack alignItems="center" py={2}><CircularProgress size={22} /></Stack>
            ) : sharesUsers.length === 0 ? (
              <Typography color="text.secondary">No shares yet.</Typography>
            ) : (
              <List dense>
                {sharesUsers.map(u => (
                  <ListItem key={u.id}>
                    <ListItemAvatar>
                      <Avatar src={u.avatar}>{(u.name || "U").slice(0, 1)}</Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <Typography variant="body1">{u.name}</Typography>
                          {(u.kyc_status === "approved" || u.kyc_status === "verified") && (
                            <VerifiedIcon color="primary" sx={{ fontSize: 16 }} />
                          )}
                        </Stack>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </DialogContent>
        </Dialog>
        <ReportDialog
          open={reportOpen}
          onClose={closeReport}
          onSubmit={submitReport}
          loading={reportBusy}
          targetLabel={reportTarget?.label}
        />


      </Grid>
      {showScrollTop && (
        <Box
          sx={{
            position: "fixed",
            bottom: { xs: 72, md: 32 },
            right: { xs: 16, md: 32 },
            zIndex: 1300,
          }}
        >
          <IconButton
            onClick={handleScrollTop}
            size="large"
            sx={{
              bgcolor: "primary.main",
              color: "#fff",
              boxShadow: 4,
              borderRadius: "999px",
              "&:hover": {
                bgcolor: "primary.dark",
              },
            }}
          >
            <KeyboardArrowUpRoundedIcon />
          </IconButton>
        </Box>
      )}
    </Grid>
  );
}
