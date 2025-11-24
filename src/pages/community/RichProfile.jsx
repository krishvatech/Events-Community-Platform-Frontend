// src/pages/RichProfile.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Avatar,
  AvatarGroup,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Container,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  IconButton,
  ListItemAvatar,
  Divider,
  Chip,
  Tabs,
  Tab,
  CircularProgress,   // 👈 NEW
  Checkbox,           // 👈 NEW
  ListItemButton,     // 👈 NEW
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import OpenInNewOutlinedIcon from "@mui/icons-material/OpenInNewOutlined";
import PersonAddAlt1RoundedIcon from "@mui/icons-material/PersonAddAlt1Rounded";
import CommunitySidebar from "../../components/CommunitySideBar.jsx";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import IosShareIcon from "@mui/icons-material/IosShare";
import SearchIcon from "@mui/icons-material/Search";



const RAW_BASE = (import.meta.env.VITE_API_BASE_URL || "").trim();
const API_BASE = RAW_BASE.endsWith("/") ? RAW_BASE.slice(0, -1) : RAW_BASE;
const tokenHeader = () => {
  const t =
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("access") ||
    localStorage.getItem("jwt");
  return t ? { Authorization: `Bearer ${t}` } : {};
};

// --- Engagement helpers for Rich Profile posts ---

function engageTargetOfProfilePost(post) {
  if (!post) return { type: null, id: null };
  return { type: null, id: Number(post.id) || null }; // treat as feed item
}

async function fetchEngagementCountsForProfilePost(post) {
  const target = engageTargetOfProfilePost(post);
  if (!target.id) {
    return { likes: 0, comments: 0, shares: 0, user_has_liked: false };
  }
  const tt = target.type
    ? `&target_type=${encodeURIComponent(target.type)}`
    : "";

  try {
    const res = await fetch(
      `${API_BASE}/engagements/metrics/?ids=${target.id}${tt}`,
      {
        headers: { Accept: "application/json", ...tokenHeader() },
        credentials: "include",
      }
    );
    if (!res.ok) throw new Error("metrics failed");
    const data = await res.json().catch(() => ({}));
    return (
      data[String(target.id)] || {
        likes: 0,
        comments: 0,
        shares: 0,
        user_has_liked: false,
      }
    );
  } catch {
    return { likes: 0, comments: 0, shares: 0, user_has_liked: false };
  }
}

async function toggleProfilePostLike(post) {
  const target = engageTargetOfProfilePost(post);
  if (!target.id) return;

  const body = target.type
    ? { target_type: target.type, target_id: target.id, reaction: "like" }
    : { target_id: target.id, reaction: "like" };

  await fetch(`${API_BASE}/engagements/reactions/toggle/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...tokenHeader(),
    },
    credentials: "include",
    body: JSON.stringify(body),
  });
}


const pickAvatarUrl = (u) => {
  if (!u) return "";
  const cands = [
    u.avatar_url,                       // from /users/roster/
    u.profile?.user_image,              // your DB column
    u.profile?.avatar,
    u.profile?.photo,
    u.profile?.image_url,
    u.profile?.image,
  ];
  return cands.find((x) => typeof x === "string" && x.trim()) || "";
};

// UI helpers
const Section = ({ title, children, action }) => (
  <Card variant="outlined" sx={{ borderRadius: 2 }}>
    <CardHeader
      title={<Typography variant="h6" sx={{ fontWeight: 600 }}>{title}</Typography>}
      action={action}
      sx={{ pb: 0.5 }}
    />
    <CardContent sx={{ pt: 1.5 }}>{children}</CardContent>
  </Card>
);

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const toMonthYear = (d) => {
  if (!d) return "";
  const [y, m] = String(d).split("-");
  const mi = m ? Math.max(1, Math.min(12, parseInt(m, 10))) - 1 : null;
  return mi != null && y ? `${MONTHS[mi]} ${y}` : String(d);
};
const rangeText = (s, e, cur) => {
  const start = toMonthYear(s);
  const end = cur ? "present" : toMonthYear(e);
  return (start || end) ? `${start} - ${end || ""}` : "";
};

/* --------------------------------------------------------------------------
 * Mock posts and helpers for the Posts tab. In a real app you would fetch
 * these from your backend. Posts include support for text, link, image and
 * poll types. The timeAgo helper returns a human‑friendly relative time.
 */
const MOCK_POSTS = [
  {
    id: 1,
    type: "text",
    content: "Hello from Rich Profile!",
    created_at: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
  },
  {
    id: 2,
    type: "link",
    content: "Check out our blog",
    link: "https://example.com",
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
  },
  {
    id: 3,
    type: "image",
    content: "Our new design",
    images: [
      "https://images.unsplash.com/photo-1503264116251-35a269479413?auto=format&fit=crop&w=600&q=60",
    ],
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
  },
  {
    id: 4,
    type: "poll",
    content: "Which JavaScript framework do you prefer?",
    options: ["React", "Vue", "Angular", "Svelte"],
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
  },
];

function timeAgo(date) {
  if (!date) return "";
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// Post card component used in the Posts tab. Shows the post content and a
// bottom row with mutual connections and a friend button (if not friends).
function RichPostCard({
  post,
  fullName,
  avatarUrl,
  mutualCount,
  onOpenConnections,
  friendStatus,
  friendSubmitting,
  handleAddFriend,
  authorId,
}) {
  // initial like status from backend (if available)
  const [liked, setLiked] = React.useState(
    !!(post?.liked_by_me ?? post?.user_has_liked)
  );

  // counters based on metrics (and will be refreshed from /engagements/metrics/)
  const [likeCount, setLikeCount] = React.useState(
    Number(
      post?.like_count ??
      post?.metrics?.likes ??
      0
    )
  );
  const [shareCount, setShareCount] = React.useState(
    Number(
      post?.share_count ??
      post?.metrics?.shares ??
      0
    )
  );
  const [commentCount, setCommentCount] = React.useState(
    Number(
      post?.comment_count ??
      post?.metrics?.comments ??
      0
    )
  );

  const [likers, setLikers] = React.useState([]);
  // Load latest engagement counts (likes/comments/shares) for this post
  React.useEffect(() => {
    let alive = true;
    (async () => {
      const counts = await fetchEngagementCountsForProfilePost(post);
      if (!alive) return;
      setLikeCount(counts.likes ?? 0);
      setShareCount(counts.shares ?? 0);
      setCommentCount(counts.comments ?? 0);
      setLiked(!!counts.user_has_liked);
    })();
    return () => {
      alive = false;
    };
  }, [post?.id]);

  // Load top likers to show avatars in the bubble
  const loadTopLikers = React.useCallback(async () => {
    const target = engageTargetOfProfilePost(post);
    if (!target.id) return;

    const urls = [
      // generic likes list
      target.type
        ? `${API_BASE}/engagements/reactions/?reaction=like&target_type=${encodeURIComponent(
          target.type
        )}&target_id=${target.id}&page_size=5`
        : `${API_BASE}/engagements/reactions/?reaction=like&target_id=${target.id}&page_size=5`,
      // specialised "who liked" endpoint – will silently fail if not present
      `${API_BASE}/engagements/reactions/who-liked/?feed_item=${target.id}&page_size=5`,
    ];

    const normalizeUsers = (payload) => {
      const arr = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.results)
          ? payload.results
          : Array.isArray(payload?.data)
            ? payload.data
            : [];
      return arr
        .map((row) => {
          const u =
            row.user ||
            row.actor ||
            row.profile ||
            row.author ||
            row.owner ||
            row;
          const id = u?.id ?? row.user_id ?? row.id;
          const name =
            u?.full_name ||
            u?.name ||
            u?.username ||
            [u?.first_name, u?.last_name].filter(Boolean).join(" ") ||
            (id ? `User #${id}` : "User");
          const avatar =
            u?.avatar_url ||
            u?.user_image_url ||
            u?.avatar ||
            u?.photo ||
            u?.image ||
            "";
          return id ? { id, name, avatar } : null;
        })
        .filter(Boolean);
    };

    for (const url of urls) {
      try {
        const res = await fetch(url, {
          headers: { Accept: "application/json", ...tokenHeader() },
          credentials: "include",
        });
        if (!res.ok) continue;
        const data = await res.json().catch(() => ({}));
        const list = normalizeUsers(data);
        if (list.length) {
          setLikers(list);
          return;
        }
      } catch {
        // try next url
      }
    }
    setLikers([]);
  }, [post?.id]);

  React.useEffect(() => {
    loadTopLikers();
  }, [loadTopLikers]);


  const [expanded, setExpanded] = React.useState(false);
  const [shareOpen, setShareOpen] = React.useState(false);
  const [commentsOpen, setCommentsOpen] = React.useState(false);

  const likeLabel =
    likeCount === 0
      ? "No likes yet"
      : likeCount === 1
        ? "1 like"
        : `${likeCount} likes`;


  const handleLikeClick = async () => {
    const willUnlike = liked;

    // optimistic UI
    setLiked(!willUnlike);
    setLikeCount((c) => Math.max(0, c + (willUnlike ? -1 : +1)));

    try {
      await toggleProfilePostLike(post);
      const counts = await fetchEngagementCountsForProfilePost(post);
      setLikeCount(counts.likes ?? 0);
      setShareCount(counts.shares ?? 0);
      setCommentCount(counts.comments ?? 0);
      setLiked(!!counts.user_has_liked);
    } catch (e) {
      // rollback via re-fetch
      const counts = await fetchEngagementCountsForProfilePost(post);
      setLikeCount(counts.likes ?? 0);
      setShareCount(counts.shares ?? 0);
      setCommentCount(counts.comments ?? 0);
      setLiked(!!counts.user_has_liked);
    }
  };

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>

      <CardHeader
        avatar={
          <Avatar sx={{ width: 40, height: 40 }} src={avatarUrl}>
            {(fullName || "?").slice(0, 1).toUpperCase()}
          </Avatar>
        }
        title={<Typography fontWeight={600}>{fullName || "User"}</Typography>}
        subheader={timeAgo(post.created_at)}
      />
      <CardContent sx={{ pt: 0 }}>
        {post.content && (
          <Typography sx={{ whiteSpace: "pre-wrap" }}>{post.content}</Typography>
        )}
        {post.link && (
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
        {Array.isArray(post.images) && post.images.length > 0 && (
          <Stack spacing={1} direction="row" sx={{ mt: 1 }} flexWrap="wrap">
            {post.images.map((src, idx) => (
              <Box key={idx} sx={{ width: "100%", maxWidth: 200, borderRadius: 1, overflow: "hidden" }}>
                <img
                  src={src}
                  alt={`post-img-${idx}`}
                  style={{ width: "100%", height: "auto", display: "block" }}
                />
              </Box>
            ))}
          </Stack>
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
      {/* Meta strip: likes bubble + shares count (same style as HomePage) */}
      <Box sx={{ px: 1.25, pt: 0.75, pb: 0.5 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          {/* Left: liker avatars + text */}
          <Stack direction="row" spacing={1} alignItems="center">
            {/* If later you have real liker list, you can map it here.
               For now we just show the avatars of the profile owner */}
            <AvatarGroup
              max={3}
              sx={{ "& .MuiAvatar-root": { width: 24, height: 24, fontSize: 12 } }}
            >
              {(likers || []).slice(0, 3).map((u) => (
                <Avatar key={u.id || u.name} src={u.avatar}>
                  {(u.name || "U").slice(0, 1)}
                </Avatar>
              ))}
            </AvatarGroup>

            <Typography variant="body2">
              {likers?.[0]?.name
                ? Math.max(0, (likeCount || 0) - 1) > 0
                  ? `${likers[0].name} and ${Math.max(
                    0,
                    (likeCount || 0) - 1
                  ).toLocaleString()} others`
                  : likers[0].name
                : `${(likeCount || 0).toLocaleString()} ${Number(likeCount || 0) === 1 ? "like" : "likes"
                }`}
            </Typography>
          </Stack>

          {/* Right: share count, like HomePage "My posts" section */}
          <Button size="small" disabled={!shareCount}>
            {shareCount.toLocaleString()} SHARES
          </Button>
        </Stack>
      </Box>

      <Divider sx={{ my: 1 }} />

      {/* Action row: Like / Comment / Share */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent={{ xs: "space-between", sm: "space-around" }}
        spacing={{ xs: 0.5, sm: 1.5 }}
        sx={{
          px: { xs: 0.5, sm: 0.75 },
          pb: 0.5,
          flexWrap: "nowrap",
        }}
      >
        {/* LIKE */}
        <Button
          size="small"
          startIcon={liked ? <FavoriteRoundedIcon /> : <FavoriteBorderIcon />}
          onClick={handleLikeClick}
          sx={{
            flex: { xs: 1, sm: "0 0 auto" },
            minWidth: 0,
            px: { xs: 0.25, sm: 1 },
            fontSize: { xs: 11, sm: 12 },
            color: liked ? "error.main" : "text.secondary",
            "& .MuiButton-startIcon": {
              mr: { xs: 0.25, sm: 0.5 },
            },
          }}
        >
          LIKE
        </Button>

        {/* COMMENT */}
        <Button
          size="small"
          startIcon={<ChatBubbleOutlineIcon />}
          onClick={() => setCommentsOpen(true)}
          sx={{
            flex: { xs: 1, sm: "0 0 auto" },
            minWidth: 0,
            px: { xs: 0.25, sm: 1 },
            fontSize: { xs: 11, sm: 12 },
            "& .MuiButton-startIcon": {
              mr: { xs: 0.25, sm: 0.5 },
            },
          }}
        >
          COMMENT
        </Button>

        {/* SHARE */}
        <Button
          size="small"
          startIcon={<IosShareIcon />}
          onClick={() => setShareOpen(true)}
          sx={{
            flex: { xs: 1, sm: "0 0 auto" },
            minWidth: 0,
            px: { xs: 0.25, sm: 1 },
            fontSize: { xs: 11, sm: 12 },
            "& .MuiButton-startIcon": {
              mr: { xs: 0.25, sm: 0.5 },
            },
          }}
        >
          SHARE
        </Button>
      </Stack>

      {/* Comments dialog for this post */}
      <ProfileCommentsDialog
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        postId={post.id}
      />
      {/* Comments dialog for this post */}
            <ProfileShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        postId={post.id}
        authorId={authorId}
        groupId={post.group_id || null}
        onShared={() => {
          // local bump so user sees it immediately
          setShareCount((c) => c + 1);

          // optional: refresh from backend for absolute truth
          // fetchEngagementCountsForProfilePost(post).then((counts) => {
          //   setShareCount(counts.shares ?? 0);
          //   setLikeCount(counts.likes ?? 0);
          //   setCommentCount(counts.comments ?? 0);
          // });
        }}
      />
    </Card>
  );
}

function pickBestExperience(exps = []) {
  if (!Array.isArray(exps) || !exps.length) return null;
  const current = exps.find((e) => e?.currently_work_here);
  if (current) return current;
  return [...exps].sort((a, b) => {
    const aEnd = a?.end_date || "2100-01-01";
    const bEnd = b?.end_date || "2100-01-01";
    return new Date(bEnd) - new Date(aEnd);
  })[0];
}

function ProfileCommentsDialog({ open, onClose, postId }) {
  const [loading, setLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [comments, setComments] = React.useState([]);
  const [body, setBody] = React.useState("");

  // Normalize comment shape → { id, text, authorName, authorAvatar }
  function normalizeComment(row = {}) {
    const author =
      row.author ||
      row.user ||
      row.profile ||
      row.created_by ||
      row.owner ||
      {};

    const name =
      author.name ||
      author.full_name ||
      (author.first_name || author.last_name
        ? `${author.first_name || ""} ${author.last_name || ""}`.trim()
        : author.username) ||
      "User";

    const avatar =
      author.avatar ||
      author.avatar_url ||
      author.user_image ||
      author.user_image_url ||
      author.image ||
      author.photo ||
      "";

    const text =
      row.text ||
      row.body ||
      row.comment ||
      row.content ||
      "";

    return {
      id: row.id ?? row.pk,
      text,
      authorName: name,
      authorAvatar: avatar,
    };
  }

  const fetchComments = React.useCallback(async () => {
    if (!open || !postId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("target_id", String(postId));
      params.set("page_size", "200");

      const res = await fetch(
        `${API_BASE}/engagements/comments/?${params.toString()}`,
        {
          headers: { Accept: "application/json", ...tokenHeader() },
          credentials: "include",
        }
      );

      let list = [];
      if (res.ok) {
        const j = await res.json().catch(() => null);
        const raw = Array.isArray(j?.results)
          ? j.results
          : Array.isArray(j)
            ? j
            : [];
        list = raw.map(normalizeComment);
      }
      setComments(list);
    } catch (e) {
      console.error("Failed to load comments:", e);
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [open, postId]);

  React.useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  async function handleSubmit(e) {
    e?.preventDefault?.();
    const text = (body || "").trim();
    if (!text || !postId) return;

    setSubmitting(true);
    try {
      const payload = { text, target_id: Number(postId) };

      const res = await fetch(`${API_BASE}/engagements/comments/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...tokenHeader(),
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setBody("");
        await fetchComments();   // reload with new comment
      } else {
        console.error("Comment POST failed:", res.status);
      }
    } catch (e) {
      console.error("Failed to post comment:", e);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={!!open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Comments</DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Stack alignItems="center" py={3}>
            <CircularProgress size={22} />
          </Stack>
        ) : comments.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No comments yet. Be the first to comment.
          </Typography>
        ) : (
          <List dense sx={{ mb: 2 }}>
            {comments.map((c) => (
              <ListItem key={c.id} alignItems="flex-start">
                <ListItemAvatar>
                  <Avatar src={c.authorAvatar}>
                    {(c.authorName || "U").slice(0, 1)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography
                      variant="body2"
                      sx={{ whiteSpace: "pre-wrap" }}
                    >
                      {c.text}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      {c.authorName}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            multiline
            minRows={2}
            placeholder="Write a comment…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={submitting}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Close
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting || !body.trim()}
        >
          {submitting ? "Posting…" : "Post"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}


function ProfileShareDialog({ open, onClose, postId, authorId, groupId, onShared }) {
  const [loading, setLoading] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [friends, setFriends] = React.useState([]);
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState(new Set());

  // Normalize any friends API shape -> { id, name, avatar }
  function normalizeFriends(list) {
    return (list || [])
      .map((f) => {
        const u = f.user || f.friend || f.to_user || f.peer || f.profile || f;
        const id = u?.id ?? f.user_id ?? f.friend_id ?? f.peer_id ?? f.id;
        const name =
          u?.name ||
          u?.full_name ||
          (u?.first_name || u?.last_name
            ? `${u?.first_name || ""} ${u?.last_name || ""}`.trim()
            : null) ||
          u?.username ||
          `User #${id}`;

        const avatar =
          u?.avatar ||
          u?.avatar_url ||
          u?.user_image ||
          u?.user_image_url ||
          u?.image ||
          u?.photo ||
          f?.avatar ||
          f?.avatar_url ||
          f?.user_image ||
          f?.user_image_url ||
          f?.image ||
          f?.photo ||
          "";

        return { id, name, avatar };
      })
      .filter((x) => x.id);
  }

  const fetchFriends = React.useCallback(async () => {
    if (!open) return;
    setLoading(true);

    const headers = { Accept: "application/json", ...tokenHeader() };

    // 0) GROUP POST: same-group only
    if (groupId) {
      const groupPaths = [
        `groups/${groupId}/members/`,
        `groups/${groupId}/memberships/`,
        `group-memberships/?group=${groupId}`,
        `group-members/?group=${groupId}`,
      ];

      for (const path of groupPaths) {
        try {
          const res = await fetch(
            `${API_BASE}/${String(path).replace(/^\/+/, "")}`,
            { headers, credentials: "include" }
          );
          if (!res.ok) continue;

          const j = await res.json().catch(() => null);
          const arr = Array.isArray(j?.results)
            ? j.results
            : Array.isArray(j)
              ? j
              : j?.members || j?.data || [];

          const norm = normalizeFriends(arr);
          setFriends(norm);
          setLoading(false);
          return; // ✅ same-group list ready
        } catch (e) {
          // try next path
        }
      }
    }

    // 1) Normal profile post: mutual friends ONLY
    if (authorId) {
      try {
        const res = await fetch(
          `${API_BASE}/friends/mutual/?user_id=${authorId}`,
          { headers, credentials: "include" }
        );
        if (res.ok) {
          const j = await res.json().catch(() => null);
          const arr = Array.isArray(j?.results)
            ? j.results
            : Array.isArray(j)
              ? j
              : j?.data || [];
          const norm = normalizeFriends(arr);
          setFriends(norm);
          setLoading(false);
          return; // ✅ mutuals only; no fallback
        }
      } catch (e) {
        // fall through to empty
      }
    }

    // 2) If nothing matched, show empty
    setFriends([]);
    setLoading(false);
  }, [open, authorId, groupId]);

  React.useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter((f) => (f.name || "").toLowerCase().includes(q));
  }, [friends, query]);

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function shareNow() {
    if (!selected.size || !postId) return;
    setSending(true);
    try {
      const payload = {
        target_id: postId,           // 👈 feed item id
        to_users: [...selected],     // 👈 selected mutual/same-group users
      };

      const res = await fetch(`${API_BASE}/engagements/shares/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...tokenHeader(),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      onShared?.();

      setSending(false);
      onClose?.();
      setSelected(new Set());
      setQuery("");
    } catch (e) {
      console.error("ProfileShareDialog shareNow error:", e);
      setSending(false);
      alert("Could not share this post. Please check your share endpoint.");
    }
  }

  return (
    <Dialog open={!!open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Share post</DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Stack alignItems="center" py={3}>
            <CircularProgress size={22} />
          </Stack>
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
                <ListItem
                  key={f.id}
                  disablePadding
                  secondaryAction={
                    <Checkbox
                      edge="end"
                      onChange={() => toggle(f.id)}
                      checked={selected.has(f.id)}
                    />
                  }
                >
                  <ListItemButton onClick={() => toggle(f.id)}>
                    <ListItemAvatar>
                      <Avatar src={f.avatar}>{(f.name || "U").slice(0, 1)}</Avatar>
                    </ListItemAvatar>
                    <ListItemText primary={f.name} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={sending}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={shareNow}
          disabled={!selected.size || sending}
        >
          {sending ? "Sharing…" : "Share"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}


export default function RichProfile() {
  // IMPORTANT: use :userId from /community/rich-profile/:userId
  const { userId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // roster user (passed from directory) if available
  const [userItem, setUserItem] = useState(location.state?.user || null);
  const [loadingBase, setLoadingBase] = useState(!location.state?.user);
  const [experiences, setExperiences] = useState([]);
  const [educations, setEducations] = useState([]);
  const [loadingExtras, setLoadingExtras] = useState(true);

  const me = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
  }, []);
  const isMe = String(me?.id || "") === String(userId || "");

  // --- FRIEND BUTTON / STATUS ---
  const [friendStatus, setFriendStatus] = useState(isMe ? "self" : "none"); // self | none | pending_outgoing | pending_incoming | friends
  const [friendLoading, setFriendLoading] = useState(!isMe);
  const [friendSubmitting, setFriendSubmitting] = useState(false);
  // Per-row friendship status inside Connections dialog
  const [connFriendStatus, setConnFriendStatus] = useState({}); // { [userId]: "friends" | "pending_outgoing" | "pending_incoming" | "none" }
  const [connSubmitting, setConnSubmitting] = useState({});     // { [userId]: boolean }

  async function fetchFriendStatus(targetId) {
    try {
      const r = await fetch(`${API_BASE}/friends/status/?user_id=${targetId}`, {
        headers: { ...tokenHeader(), Accept: "application/json" },
        credentials: "include",
      });
      const d = await r.json().catch(() => ({}));
      // backend may return incoming_pending/outgoing_pending — normalize:
      const map = { incoming_pending: "pending_incoming", outgoing_pending: "pending_outgoing" };
      return (map[d?.status] || d?.status || "none").toLowerCase();
    } catch {
      return "none";
    }
  }

  async function sendFriendRequestTo(targetId) {
    try {
      setConnSubmitting((m) => ({ ...m, [targetId]: true }));
      const r = await fetch(`${API_BASE}/friend-requests/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...tokenHeader(), Accept: "application/json" },
        credentials: "include",
        body: JSON.stringify({ to_user: Number(targetId) }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok && r.status !== 200) throw new Error(d?.detail || "Failed to send request");
      setConnFriendStatus((m) => ({ ...m, [targetId]: (d?.status || "pending_outgoing").toLowerCase() }));
    } catch (e) {
      alert(e?.message || "Failed to send friend request");
    } finally {
      setConnSubmitting((m) => ({ ...m, [targetId]: false }));
    }
  }

  const [mutual, setMutual] = useState([]);
  const [mutualCount, setMutualCount] = useState(0);
  const [connTab, setConnTab] = useState("all"); // "all" | "mutual"

  // --- POSTS & TAB STATE ---
  // In this rich profile we show two tabs: Posts and About. Posts are mocked
  // locally. When integrating with a backend, replace MOCK_POSTS with
  // fetched posts for this user. The tab state controls which tab is active.
  const [tab, setTab] = useState(0);
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);

  function normalizePost(row = {}) {
    // unwrap + metadata (your API enriches feed rows here)
    const src =
      row.post || row.object || row.activity?.object || row.data?.post || row;
    const m = row.metadata || row.meta || {};

    const created =
      row.created_at || src?.created_at || src?.created || row.timestamp || null;
    const id = row.id || src?.id || row.pk;

    const pick = (...xs) =>
      xs.find((v) => typeof v === "string" && v.trim().length) || "";

    const text = pick(
      // metadata first
      m.text, m.body, m.content, m.caption, m.description, m.title,
      // fallbacks from object
      src?.text, src?.content, src?.body, src?.message, src?.caption
    );

    const link = pick(
      m.link_url, m.url,
      src?.link_url, src?.link, src?.url, src?.external_url
    );

    const singleImages = [
      m.image_url, m.image, m.photo_url, m.picture,
      src?.image_url, src?.image, src?.photo_url, src?.picture,
    ].filter((v) => typeof v === "string" && v.trim().length);

    const images = []
      .concat(
        singleImages,
        Array.isArray(m.images) ? m.images : [],
        Array.isArray(src?.images) ? src.images : [],
        Array.isArray(src?.media) ? src.media : [],
        Array.isArray(src?.attachments) ? src.attachments : [],
        Array.isArray(m.files) ? m.files : [] // just in case attachments come under metadata.files
      )
      .map((a) => (typeof a === "string" ? a : a?.url || a?.file || a?.path))
      .filter(Boolean);

    const pollOptions = m.poll?.options || src?.poll?.options || m.options || m.choices || [];

    let type =
      (m.type || src?.type || (images.length ? "image" : pollOptions.length ? "poll" : link ? "link" : "text"))
        ?.toLowerCase();


    // Try to capture group id if present (for "same group" share)
    const group_id =
      row.group_id ??
      m.group_id ??
      src?.group_id ??
      (typeof row.group === "object" ? row.group.id : row.group) ??
      (typeof m.group === "object" ? m.group.id : m.group) ??
      (typeof src?.group === "object" ? src.group.id : src.group) ??
      null;
    const engagement =
      m.metrics || row.metrics || row.engagement || row.engagements || {};

    const like_count =
      engagement.likes ??
      engagement.like_count ??
      row.like_count ??
      src?.like_count ??
      0;
    const comment_count =
      engagement.comments ??
      engagement.comment_count ??
      row.comment_count ??
      src?.comment_count ??
      0;
    const share_count =
      engagement.shares ??
      engagement.share_count ??
      row.share_count ??
      src?.share_count ??
      0;

    const liked_by_me =
      !!(
        engagement.user_has_liked ??
        engagement.liked_by_me ??
        row.user_has_liked ??
        row.liked_by_me
      );

    return {
      id,
      type,
      content: text,
      link,
      images,
      options: pollOptions,
      created_at: created,
      group_id,
      metrics: engagement,
      like_count,
      comment_count,
      share_count,
      liked_by_me,
    };
  }

  async function fetchFeedItemById(feedId, headers) {
    if (!feedId) return null;
    const candidates = [
      `${API_BASE}/activity/feed/${feedId}/?scope=home`,
      `${API_BASE}/activity/feed/${feedId}/?scope=community`,
      `${API_BASE}/activity/feed/${feedId}/`,
    ];
    for (const url of candidates) {
      try {
        const r = await fetch(url, { headers, credentials: "include" });
        if (!r.ok) continue;
        return await r.json().catch(() => null);
      } catch { }
    }
    return null;
  }

  async function fetchUserPostsById(targetUserId, isMe) {
    const headers = { ...tokenHeader(), Accept: "application/json" };
    const urls = [
      // common patterns (one of these should exist in your backend)
      `${API_BASE}/activity/feed/posts/${targetUserId}/`,
    ];
    if (isMe) urls.unshift(`${API_BASE}/activity/feed/posts/me/`);

    for (const url of urls) {
      try {
        const r = await fetch(url, { headers, credentials: "include" });
        if (!r.ok) continue;
        const j = await r.json().catch(() => null);
        const arr = Array.isArray(j) ? j : j?.results || j?.posts || (j && j.id ? [j] : []);
        if (!Array.isArray(arr)) continue;

        let list = arr.map(normalizePost).filter((p) => p.id);

        // If a card has no body (no content/link/images), fetch detail and merge.
        const hydrated = await Promise.all(
          list.map(async (p, idx) => {
            const row = arr[idx] || {};
            const hasBody =
              (p.content && p.content.trim()) || p.link || (p.images || []).length;
            if (hasBody) return p;
            const feedId = row.id || p.id;
            const full = await fetchFeedItemById(feedId, headers); // may 404 for some ids/scope
            if (!full) return p;
            const np = normalizePost(full);
            return { ...p, ...np, id: p.id || np.id, created_at: p.created_at || np.created_at };
          })
        );
        list = hydrated;
        // newest first
        list.sort(
          (a, b) =>
            new Date(b.created_at || 0).getTime() -
            new Date(a.created_at || 0).getTime()
        );
        return list;
      } catch {
        // try next url
      }
    }
    return [];
  }

  // Load when userId changes
  useEffect(() => {
    let alive = true;
    (async () => {
      // 🚧 Private: if not me and not friends, don’t fetch any posts
      if (!isMe && (friendStatus || "").toLowerCase() !== "friends") {
        setPosts([]);
        setPostsLoading(false);
        return;
      }
      setPostsLoading(true);
      const list = await fetchUserPostsById(userId, isMe);
      if (!alive) return;
      setPosts(list);
      setPostsLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [userId, isMe, friendStatus]);

  // Preload mutual connections count for displaying on posts. This effect
  // fetches the mutual friends list once when the component mounts (or when
  // the viewed userId changes) and stores the count in state. Without this
  // call, mutualCount will remain zero unless the user opens the connections
  // dialog.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const mutualList = await fetchMutualList(userId);
        if (!alive) return;
        setMutual(mutualList);
        setMutualCount((mutualList || []).length);
      } catch {
        // ignore errors; leave mutual count unchanged
      }
    })();
    return () => {
      alive = false;
    };
  }, [userId]);

  useEffect(() => {
    let alive = true;
    if (isMe) {
      setFriendStatus("self");
      setFriendLoading(false);
      return;
    }
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/friends/status/?user_id=${userId}`, {
          headers: { ...tokenHeader(), Accept: "application/json" },
          credentials: "include",
        });
        const d = await r.json().catch(() => ({}));
        if (!alive) return;
        const map = {
          incoming_pending: "pending_incoming",
          outgoing_pending: "pending_outgoing",
        };
        const s = (map[d?.status] || d?.status || "none");
        setFriendStatus(String(s).toLowerCase());
      } catch {
        if (!alive) return;
        setFriendStatus("none");
      } finally {
        if (alive) setFriendLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [userId, isMe]);

  const sendFriendRequest = async () => {
    try {
      setFriendSubmitting(true);
      const r = await fetch(`${API_BASE}/friend-requests/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...tokenHeader(),
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ to_user: Number(userId) }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok && r.status !== 200)
        throw new Error(d?.detail || "Failed to send request");
      setFriendStatus(d?.status || "pending_outgoing");
    } catch (e) {
      alert(e?.message || "Failed to send friend request");
    } finally {
      setFriendSubmitting(false);
    }
  };

  // if navigated directly, obtain roster item so we have basic info to render
  useEffect(() => {
    let alive = true;
    (async () => {
      if (userItem) {
        setLoadingBase(false);
        return;
      }
      try {
        const r = await fetch(`${API_BASE}/users/roster/`, {
          headers: tokenHeader(),
          credentials: "include",
        });
        const data = await r.json().catch(() => []);
        const list = Array.isArray(data) ? data : data?.results || [];
        const found = list.find((x) => String(x.id) === String(userId));
        if (alive) setUserItem(found || null);
      } catch { }
      finally {
        if (alive) setLoadingBase(false);
      }
    })();
    return () => { alive = false; };
  }, [userId, userItem]);

  // load experiences + educations (public-first)
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingExtras(true);

      const tryJSON = async (url) => {
        try {
          const r = await fetch(url, { headers: tokenHeader(), credentials: "include" });
          if (!r.ok) return null;
          return await r.json().catch(() => null);
        } catch { return null; }
      };

      // 1) Public-for-all endpoint (new backend action)
      let j = await tryJSON(`${API_BASE}/users/${userId}/profile/`);

      // 2) Fallback to "me" endpoints only if we’re looking at ourselves
      if (!j && isMe) {
        j = await tryJSON(`${API_BASE}/auth/me/profile/`);
        if (!j) {
          const [e1, e2] = await Promise.all([
            tryJSON(`${API_BASE}/auth/me/experiences/`),
            tryJSON(`${API_BASE}/auth/me/educations/`),
          ]);
          j = {
            experiences: Array.isArray(e1) ? e1 : [],
            educations: Array.isArray(e2) ? e2 : [],
          };
        }
      }

      const exps = Array.isArray(j?.experiences) ? j.experiences : [];
      const edus = Array.isArray(j?.educations) ? j.educations : [];

      if (!alive) return;
      setExperiences(exps);
      setEducations(edus);
      setLoadingExtras(false);
    })();
    return () => { alive = false; };
  }, [userId, isMe, friendStatus]);

  const fullName = useMemo(() => {
    const u = userItem || {};
    return (
      u?.profile?.full_name ||
      `${u?.first_name || ""} ${u?.last_name || ""}`.trim() ||
      u?.email ||
      "Member"
    );
  }, [userItem]);

  const currentExp = useMemo(() => pickBestExperience(experiences), [experiences]);

  const companyFromRoster =
    userItem?.company_from_experience || userItem?.profile?.company || "";
  const titleFromRoster =
    userItem?.position_from_experience ||
    userItem?.profile?.job_title ||
    userItem?.profile?.role ||
    "";

  /* =========================
     Connections popup (friends list)
     ========================= */
  const [connOpen, setConnOpen] = useState(false);
  const [connLoading, setConnLoading] = useState(false);
  const [connections, setConnections] = useState([]);
  const [connQ, setConnQ] = useState("");

  const displayName = (u) =>
    u?.username ||
    u?.profile?.full_name ||
    `${u?.first_name || ""} ${u?.last_name || ""}`.trim() ||
    u?.email ||
    `User ${u?.id || ""}`.trim();

  async function startChat(recipientId) {
    try {
      const r = await fetch(`${API_BASE}/messaging/conversations/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...tokenHeader() },
        credentials: "include",
        body: JSON.stringify({ recipient_id: Number(recipientId) }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.detail || "Failed to start conversation");
      const id = data?.id || data?.conversation?.id || data?.pk;
      if (id) localStorage.setItem(`conv_read_${id}`, new Date().toISOString());
      navigate(`/account/messages/${id}`);
    } catch (e) {
      alert(e?.message || "Failed to start conversation");
    }
  }

  function normalizeFriendShape(x) {
    const u = x?.user || x?.friend || x?.friend_user || x?.other_user || x?.target || x;
    return {
      id: u?.id ?? x?.id,
      username: u?.username ?? x?.username ?? "",
      email: u?.email ?? x?.email ?? "",
      first_name: u?.first_name ?? x?.first_name ?? "",
      last_name: u?.last_name ?? x?.last_name ?? "",
      profile: u?.profile ?? x?.profile ?? null,
    };
  }

  // Try a few likely endpoints; adjust to your backend path if needed.
  async function fetchFriendList(targetUserId) {
    const url = `${API_BASE}/friends/of/?user_id=${targetUserId}`;
    try {
      const r = await fetch(url, { headers: tokenHeader(), credentials: "include" });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j) return [];
      const arr = Array.isArray(j) ? j : j.results || j.friends || [];
      return Array.isArray(arr) ? arr.map(normalizeFriendShape) : [];
    } catch {
      return [];
    }
  }

  async function fetchMutualList(targetUserId) {
    if (!targetUserId || String(targetUserId) === String(me?.id || "")) return [];
    try {
      const r = await fetch(`${API_BASE}/friends/mutual/?user_id=${targetUserId}`, {
        headers: tokenHeader(),
        credentials: "include",
      });
      const j = await r.json().catch(() => []);
      const arr = Array.isArray(j) ? j : j.results || j.friends || [];
      return Array.isArray(arr) ? arr.map(normalizeFriendShape) : [];
    } catch {
      return [];
    }
  }
  const openConnections = async () => {
    setConnOpen(true);
    setConnLoading(true);
    const [list, mutualList] = await Promise.all([
      fetchFriendList(userId),
      fetchMutualList(userId),
    ]);
    setConnections(list);
    setMutual(mutualList);
    setMutualCount(mutualList.length);

    // Preload friendship status for everyone we might show
    const ids = Array.from(new Set([...list, ...mutualList].map((x) => String(x?.id)).filter(Boolean)));
    const missing = ids.filter((id) => connFriendStatus[id] === undefined && String(id) !== String(me?.id || ""));
    if (missing.length) {
      const entries = await Promise.all(
        missing.map(async (id) => [id, await fetchFriendStatus(id)])
      );
      setConnFriendStatus((m) => ({ ...m, ...Object.fromEntries(entries) }));
    }
    setConnLoading(false);
  };

  const filterList = (arr) => {
    const s = (connQ || "").toLowerCase().trim();
    if (!s) return arr;
    return arr.filter((u) => {
      const name = (displayName(u) || "").toLowerCase();
      const email = (u?.email || "").toLowerCase();
      return name.includes(s) || email.includes(s);
    });
  };

  const filteredConnections = useMemo(
    () => filterList(connections),
    [connections, connQ]
  );
  const filteredMutual = useMemo(
    () => filterList(mutual),
    [mutual, connQ]
  );

  /* ========================= */

  return (
    <div className="min-h-screen bg-slate-50">
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 md:gap-6">
          <aside>
            {/* Community sidebar */}
            <CommunitySidebar
              stickyTop={96}
              view="members"
              onChangeView={(key) => {
                // keys emitted by CommunitySideBar: 'home' | 'live' | 'notify' | 'messages' | 'feed' | 'members'
                const to =
                  key === "home"
                    ? "/community"
                    : key === "messages"
                      ? "/account/messages"
                      : `/community?view=${key}`;
                navigate(to);
              }}
            />
          </aside>

          <main>
            {loadingBase && <LinearProgress />}

            {!loadingBase && (
              <Stack spacing={2.5}>
                {/* Header Card */}
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Box className="flex items-center gap-3">
                    <Avatar sx={{ width: 56, height: 56 }} src={pickAvatarUrl(userItem)}>
                      {(fullName || "?").slice(0, 1).toUpperCase()}
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        variant="h6"
                        sx={{ fontWeight: 700 }}
                        className="truncate"
                      >
                        {fullName}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        className="truncate"
                      >
                        {(currentExp?.position || titleFromRoster || "—")} ·{" "}
                        {(currentExp?.community_name || companyFromRoster || "—")}
                      </Typography>
                    </Box>

                    {/* Right-side actions */}
                    {!isMe && (
                      <Box sx={{ mt: 1.5, display: "flex", justifyContent: "flex-end", ml: "auto", gap: 1 }}>
                        {friendLoading && (
                          <Button variant="outlined" size="small" disabled>Loading…</Button>
                        )}
                        {!friendLoading && friendStatus === "friends" && (
                          <>
                            <Button
                              variant="outlined"
                              size="small"
                              disabled
                              sx={{ textTransform: "none", borderRadius: 2 }}
                            >
                              Your Friend
                            </Button>
                            {!!mutualCount && (
                              <Chip
                                label={`${mutualCount} mutual`}
                                size="small"
                                sx={{ alignSelf: "center" }}
                              />
                            )}
                            <Button
                              variant="contained"
                              size="small"
                              onClick={openConnections}
                              sx={{ textTransform: "none", borderRadius: 2 }}
                            >
                              Connections
                            </Button>
                          </>
                        )}
                        {!friendLoading && friendStatus === "pending_outgoing" && (
                          <Button variant="outlined" size="small" disabled sx={{ textTransform: "none", borderRadius: 2 }}>
                            Request sent
                          </Button>
                        )}
                        {!friendLoading && friendStatus === "pending_incoming" && (
                          <Button variant="outlined" size="small" disabled sx={{ textTransform: "none", borderRadius: 2 }}>
                            Pending your approval
                          </Button>
                        )}
                        {!friendLoading && friendStatus === "none" && (
                          <Button
                            variant="contained"
                            size="small"
                            onClick={sendFriendRequest}
                            disabled={friendSubmitting}
                            sx={{ textTransform: "none", borderRadius: 2 }}
                          >
                            {friendSubmitting ? "Sending…" : "Add Friend"}
                          </Button>
                        )}
                      </Box>
                    )}
                  </Box>
                </Paper>

                {/*
                  Replace the legacy about/role/experience/education sections with a
                  card containing two tabs: Posts and About. Posts show a
                  feed of the user’s posts, including mutual connection
                  count and a friend button. About mirrors the prior sections
                  (About, Current role, Experience, Education) for viewing.
                */}
                <Card variant="outlined" sx={{ borderRadius: 2 }}>
                  <Tabs
                    value={tab}
                    onChange={(e, v) => setTab(v)}
                    indicatorColor="primary"
                    textColor="primary"
                    variant="fullWidth"
                  >
                    <Tab label="Posts" />
                    <Tab label="About" />
                  </Tabs>
                  <Divider />
                  {tab === 0 && (
                    <CardContent>
                      {(!isMe && (friendStatus || "").toLowerCase() !== "friends") ? (
                        <Box sx={{ textAlign: "center", py: 6 }}>
                          <Typography variant="h6" sx={{ mb: 0.5 }}>This account is private</Typography>
                          <Typography variant="body2" color="text.secondary">
                            Add this member as a friend to see their posts.
                          </Typography>
                          {(friendStatus || "").toLowerCase() === "none" && (
                            <Button
                              variant="contained"
                              size="small"
                              onClick={sendFriendRequest}
                              disabled={friendSubmitting}
                              sx={{ mt: 2, textTransform: "none", borderRadius: 2 }}
                            >
                              {friendSubmitting ? "Sending…" : "Add Friend"}
                            </Button>
                          )}
                        </Box>
                      ) : postsLoading ? (
                        <LinearProgress />
                      ) : posts.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">No posts yet.</Typography>
                      ) : (
                        <Stack spacing={2}>
                          {posts.map((post) => (
                            <RichPostCard
                              key={post.id}
                              post={post}
                              fullName={fullName}
                              avatarUrl={pickAvatarUrl(userItem)}
                              mutualCount={mutualCount}
                              friendStatus={friendStatus}
                              friendSubmitting={friendSubmitting}
                              handleAddFriend={sendFriendRequest}
                              authorId={userId}
                            />
                          ))}
                        </Stack>
                      )}
                    </CardContent>
                  )}
                  {tab === 1 && (
                    <CardContent>
                      <Stack spacing={2.5}>
                        {/* About section */}
                        <Section title="About">
                          <Box sx={{ display: "flex", gap: 1, py: 0.5 }}>
                            <Typography variant="subtitle2" color="text.secondary" sx={{ width: 120 }}>
                              Email:
                            </Typography>
                            <Typography variant="body2">{userItem?.email || "—"}</Typography>
                          </Box>
                          <Box sx={{ display: "flex", gap: 1, py: 0.5 }}>
                            <Typography variant="subtitle2" color="text.secondary" sx={{ width: 120 }}>
                              Company:
                            </Typography>
                            <Typography variant="body2">
                              {currentExp?.community_name || companyFromRoster || "—"}
                            </Typography>
                          </Box>
                          <Box sx={{ display: "flex", gap: 1, py: 0.5 }}>
                            <Typography variant="subtitle2" color="text.secondary" sx={{ width: 120 }}>
                              Job Title:
                            </Typography>
                            <Typography variant="body2">
                              {currentExp?.position || titleFromRoster || "—"}
                            </Typography>
                          </Box>
                          <Box sx={{ display: "flex", gap: 1, py: 0.5 }}>
                            <Typography variant="subtitle2" color="text.secondary" sx={{ width: 120 }}>
                              Location:
                            </Typography>
                            <Typography variant="body2">
                              {userItem?.profile?.location || "—"}
                            </Typography>
                          </Box>
                        </Section>

                        {/* Current role section */}
                        <Section title="Current role">
                          <Typography variant="body2" sx={{ mb: 0.5 }}>
                            {currentExp?.position || titleFromRoster || "—"}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {currentExp?.community_name || companyFromRoster || "—"}
                          </Typography>
                          {(currentExp?.start_date ||
                            currentExp?.end_date ||
                            currentExp?.currently_work_here) && (
                              <Typography variant="caption" color="text.secondary">
                                {rangeText(
                                  currentExp?.start_date,
                                  currentExp?.end_date,
                                  currentExp?.currently_work_here
                                )}
                              </Typography>
                            )}
                        </Section>

                        {/* Experience section */}
                        <Section title="Experience">
                          {loadingExtras ? (
                            <LinearProgress />
                          ) : experiences.length ? (
                            <List dense disablePadding>
                              {experiences.map((x) => (
                                <ListItem key={x.id} disableGutters sx={{ py: 0.5 }}>
                                  <ListItemText
                                    primary={
                                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        {x.position || "—"} — {x.community_name || "—"}
                                      </Typography>
                                    }
                                    secondary={
                                      <Typography variant="caption" color="text.secondary">
                                        {rangeText(
                                          x.start_date,
                                          x.end_date,
                                          x.currently_work_here
                                        )}
                                        {x.location ? ` · ${x.location}` : ""}
                                      </Typography>
                                    }
                                  />
                                </ListItem>
                              ))}
                            </List>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              {isMe
                                ? "You haven’t added any experience yet."
                                : "This member hasn’t shared experience publicly yet."}
                            </Typography>
                          )}
                        </Section>

                        {/* Education section */}
                        <Section title="Education">
                          {loadingExtras ? (
                            <LinearProgress />
                          ) : educations.length ? (
                            <List dense disablePadding>
                              {educations.map((e) => (
                                <ListItem key={e.id} disableGutters sx={{ py: 0.5 }}>
                                  <ListItemText
                                    primary={
                                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        {e.degree || "—"} — {e.school || "—"}
                                      </Typography>
                                    }
                                    secondary={
                                      <Typography variant="caption" color="text.secondary">
                                        {rangeText(e.start_date, e.end_date, false)}
                                        {e.field_of_study ? ` · ${e.field_of_study}` : ""}
                                      </Typography>
                                    }
                                  />
                                </ListItem>
                              ))}
                            </List>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              {isMe
                                ? "You haven’t added any education yet."
                                : "This member hasn’t shared education publicly yet."}
                            </Typography>
                          )}
                        </Section>
                      </Stack>
                    </CardContent>
                  )}
                </Card>
              </Stack>
            )}
          </main>
        </div>
      </Container>

      {/* Connections Dialog */}
      <Dialog open={connOpen} onClose={() => setConnOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>
          Connections
        </DialogTitle>
        <DialogContent dividers>
          <Tabs
            value={connTab}
            onChange={(e, v) => setConnTab(v)}
            sx={{ mb: 1 }}
          >
            <Tab value="all" label={`All (${connections.length})`} />
            <Tab value="mutual" label={`Mutual (${mutual.length})`} />
          </Tabs>
          <TextField
            fullWidth
            size="small"
            placeholder="Search connections…"
            value={connQ}
            onChange={(e) => setConnQ(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 1.5 }}
          />
          {connLoading ? (
            <LinearProgress />
          ) : (
            <>
              {(connTab === "mutual" ? filteredMutual : filteredConnections).length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No connections found.
                </Typography>
              ) : (
                <List dense sx={{ py: 0 }}>
                  {(connTab === "mutual" ? filteredMutual : filteredConnections).map((f, idx) => {
                    const name = displayName(f);
                    return (
                      <React.Fragment key={f.id || idx}>
                        <ListItem
                          disableGutters
                          secondaryAction={
                            <Stack direction="row" spacing={1}>
                              <IconButton
                                size="small"
                                title="Open profile"
                                onClick={() => {
                                  setConnOpen(false);
                                  navigate(`/community/rich-profile/${f.id}`);
                                }}
                              >
                                <OpenInNewOutlinedIcon fontSize="small" />
                              </IconButton>

                              {String(f.id) === String(me?.id || "") ? (
                                // self row → show a neutral chip instead of hiding the action area
                                <Chip label="You" size="small" />
                              ) : (() => {
                                const status = (connFriendStatus[String(f.id)] || "none").toLowerCase();
                                if (status === "friends") {
                                  return (
                                    <Button
                                      size="small"
                                      variant="contained"
                                      sx={{ textTransform: "none", borderRadius: 2 }}
                                      onClick={() => startChat(f.id)}
                                    >
                                      Message
                                    </Button>
                                  );
                                }
                                if (status === "pending_outgoing") {
                                  return (
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      disabled
                                      sx={{ textTransform: "none", borderRadius: 2 }}
                                    >
                                      Request pending
                                    </Button>
                                  );
                                }
                                // not friends → Add friend
                                return (
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<PersonAddAlt1RoundedIcon />}
                                    sx={{ textTransform: "none", borderRadius: 2 }}
                                    disabled={!!connSubmitting[f.id]}
                                    onClick={() => sendFriendRequestTo(f.id)}
                                  >
                                    {connSubmitting[f.id] ? "Sending…" : "Add friend"}
                                  </Button>
                                );
                              })()}
                            </Stack>
                          }
                        >
                          <ListItemAvatar>
                            <Avatar sx={{ width: 36, height: 36 }} src={pickAvatarUrl(f)}>
                              {(name || "?").slice(0, 1).toUpperCase()}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={<Typography variant="body2" sx={{ fontWeight: 600 }}>{name}</Typography>}
                            secondary={<Typography variant="caption" color="text.secondary">{f?.email || ""}</Typography>}
                          />
                        </ListItem>
                        {idx < filteredConnections.length - 1 && <Divider component="li" />}
                      </React.Fragment>
                    );
                  })}
                </List>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConnOpen(false)} sx={{ textTransform: "none" }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
