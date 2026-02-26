// src/pages/RichProfile.jsx
import React, { useEffect, useMemo, useState } from "react"; // Verified file access
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
  CircularProgress,
  Checkbox,
  Popover,
  Tooltip,
  ListItemButton,
  Skeleton,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import OpenInNewOutlinedIcon from "@mui/icons-material/OpenInNewOutlined";
import PersonAddAlt1RoundedIcon from "@mui/icons-material/PersonAddAlt1Rounded";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import IosShareIcon from "@mui/icons-material/IosShare";
import SearchIcon from "@mui/icons-material/Search";
import ReplyRoundedIcon from "@mui/icons-material/ReplyRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import TwitterIcon from "@mui/icons-material/Twitter";
import FacebookIcon from "@mui/icons-material/Facebook";
import InstagramIcon from "@mui/icons-material/Instagram";
import GitHubIcon from "@mui/icons-material/GitHub";
import LanguageIcon from "@mui/icons-material/Language";
import EventIcon from "@mui/icons-material/Event";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import FlagIcon from "@mui/icons-material/Flag";
import VerifiedIcon from "@mui/icons-material/Verified";
import ReportProfileDialog from "../../components/ReportProfileDialog.jsx";
import { Menu, MenuItem } from "@mui/material";
import { isAdminUser } from "../../utils/adminRole";
import { startKYC } from "../../utils/api";



const RAW_BASE = (import.meta.env.VITE_API_BASE_URL || "").trim();
const API_BASE = RAW_BASE.endsWith("/") ? RAW_BASE.slice(0, -1) : RAW_BASE;
const tokenHeader = () => {
  const t =
    localStorage.getItem("access_token") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("access") ||
    localStorage.getItem("jwt");
  return t ? { Authorization: `Bearer ${t}` } : {};
};

async function fetchGroupListForUser(userId) {
  const candidateEndpoints = userId
    ? [
      `${API_BASE}/groups/joined-groups/?user_id=${userId}`,
      `${API_BASE}/users/${userId}/groups/?page_size=100`,
      `${API_BASE}/groups/?member_id=${userId}&page_size=100`,
      `${API_BASE}/groups/members/?user_id=${userId}&page_size=100`,
    ]
    : [
      `${API_BASE}/groups/joined-groups/`,
      `${API_BASE}/groups/?page_size=100`,
    ];

  for (const url of candidateEndpoints) {
    try {
      const r = await fetch(url, { headers: tokenHeader(), credentials: "include" });
      if (!r.ok) continue;
      const j = await r.json().catch(() => null);
      const rows = Array.isArray(j?.results) ? j.results : Array.isArray(j) ? j : [];
      if (rows.length) return rows;
    } catch { }
  }
  return [];
}

function extractGroupId(row) {
  if (!row) return null;
  return (
    row.id ||
    row.group_id ||
    row.groupId ||
    row?.group?.id ||
    row?.group?.pk ||
    null
  );
}

function parseLinks(value) {
  const v = (value ?? "").toString().trim();
  if (!v) return {};
  try {
    const j = JSON.parse(v);
    if (j && typeof j === "object" && !Array.isArray(j)) return j;
  } catch { }
  const out = {};
  v.split(/\n|,|;/).forEach((part) => {
    const [k, ...rest] = part.split("=");
    const key = (k || "").trim();
    const val = rest.join("=").trim();
    if (key && val) out[key] = val;
  });
  return out;
}

function normalizeUrl(value) {
  const v = (value || "").trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  return `https://${v}`;
}

function normalizeVisibility(value) {
  const v = (value || "").toString().trim().toLowerCase();
  if (!v) return "";
  if (v === "direct_contacts") return "contacts";
  if (v === "contacts_and_groups" || v === "contacts+groups") return "contacts_groups";
  if (v === "by_request" || v === "by request") return "request";
  return v;
}

function isVerifiedStatus(raw) {
  const v = String(raw || "").toLowerCase();
  return v === "approved" || v === "verified";
}

// Helper to get country flag emoji from phone number
function getCountryFlag(phoneNumber) {
  if (!phoneNumber) return null;
  const num = String(phoneNumber).replace(/\D/g, '');

  // Common country codes
  const countryFlags = {
    '1': '🇺🇸',      // US/Canada
    '44': '🇬🇧',     // UK
    '91': '🇮🇳',     // India
    '86': '🇨🇳',     // China
    '81': '🇯🇵',     // Japan
    '49': '🇩🇪',     // Germany
    '33': '🇫🇷',     // France
    '39': '🇮🇹',     // Italy
    '34': '🇪🇸',     // Spain
    '61': '🇦🇺',     // Australia
    '55': '🇧🇷',     // Brazil
    '7': '🇷🇺',      // Russia
    '82': '🇰🇷',     // South Korea
    '52': '🇲🇽',     // Mexico
    '31': '🇳🇱',     // Netherlands
    '46': '🇸🇪',     // Sweden
    '47': '🇳🇴',     // Norway
    '45': '🇩🇰',     // Denmark
    '48': '🇵🇱',     // Poland
    '90': '🇹🇷',     // Turkey
    '27': '🇿🇦',     // South Africa
    '20': '🇪🇬',     // Egypt
    '971': '🇦🇪',    // UAE
    '966': '🇸🇦',    // Saudi Arabia
    '65': '🇸🇬',     // Singapore
    '60': '🇲🇾',     // Malaysia
    '62': '🇮🇩',     // Indonesia
    '63': '🇵🇭',     // Philippines
    '66': '🇹🇭',     // Thailand
    '84': '🇻🇳',     // Vietnam
  };

  // Try to match country code (1-3 digits)
  for (let len = 3; len >= 1; len--) {
    const code = num.substring(0, len);
    if (countryFlags[code]) {
      return countryFlags[code];
    }
  }

  return '🌐'; // Default globe icon
}

const POST_REACTIONS = [
  { id: "like", label: "Like", emoji: "👍" },
  { id: "intriguing", label: "Intriguing", emoji: "🤔" },
  { id: "spot_on", label: "Spot On", emoji: "🎯" },
  { id: "validated", label: "Validated", emoji: "🧠" },
  { id: "debatable", label: "Debatable", emoji: "🤷" },
];


// --- Engagement helpers for Rich Profile posts ---

// Same target type as feed items on My Posts – needed for reactions & metrics
function engageTargetOfProfilePost(post) {
  const id = post ? Number(post.id) || null : null;

  return {
    type: "activity_feed.feeditem",
    id,
  };
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

// 👉 NEW: full reactions toggle (Like / Intriguing / Spot On / Validated / Debatable)
async function toggleProfilePostReaction(post, reactionId) {
  const target = engageTargetOfProfilePost(post);
  if (!target.id || !reactionId) return;

  const body = target.type
    ? { target_type: target.type, target_id: target.id, reaction: reactionId }
    : { target_id: target.id, reaction: reactionId };

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

// 👉 NEW: Toggle like on a comment
async function toggleCommentLike(commentId) {
  if (!commentId) return;
  await fetch(`${API_BASE}/engagements/reactions/toggle/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...tokenHeader(),
    },
    credentials: "include",
    body: JSON.stringify({
      target_type: "engagements.comment",
      target_id: commentId,
      reaction: "like",
    }),
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
  // --- My reaction for this post (Like / Intriguing / Spot On / Validated / Debatable) ---
  const initialReaction = useMemo(() => {
    if (post?.my_reaction) return post.my_reaction;
    if (post?.reaction) return post.reaction;
    if (post?.liked_by_me || post?.user_has_liked) return "like";
    return null;
  }, [post]);

  const [myReactionId, setMyReactionId] = useState(initialReaction);

  useEffect(() => {
    setMyReactionId(initialReaction);
  }, [initialReaction]);

  const myReactionDef =
    POST_REACTIONS.find((r) => r.id === myReactionId) || null;
  const likeBtnLabel = myReactionDef ? myReactionDef.label : "Like";
  const likeBtnEmoji = myReactionDef ? myReactionDef.emoji : "👍";
  const hasReaction = !!myReactionId;


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

  const loadTopLikers = React.useCallback(async () => {
    const target = engageTargetOfProfilePost(post);
    if (!target.id) return;

    const urls = [
      // all reactions for this post
      target.type
        ? `${API_BASE}/engagements/reactions/?target_type=${encodeURIComponent(
          target.type
        )}&target_id=${target.id}&page_size=25`
        : `${API_BASE}/engagements/reactions/?target_id=${target.id}&page_size=25`,
      // specialised "who liked" endpoint – safe fallback if present
      `${API_BASE}/engagements/reactions/who-liked/?feed_item=${target.id}&page_size=25`,
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
            row.owner ||
            row.author ||
            row;

          const id = u?.id ?? row.user_id ?? row.id;
          if (!id) return null;

          const first = u.first_name || u.firstName || "";
          const last = u.last_name || u.lastName || "";

          const name =
            u.full_name ||
            u.name ||
            (first || last ? `${first} ${last}`.trim() : u.username) ||
            `User #${id}`;

          const avatar =
            u.avatar_url ||
            u.user_image_url ||
            u.avatar ||
            u.photo ||
            u.image ||
            "";

          // 👉 which reaction this user gave
          const reactionId =
            row.reaction ||
            row.reaction_type ||
            row.kind ||
            row.type ||
            "like";

          return { id, name, avatar, reactionId };
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
  const [shareOpen, setShareOpen] = React.useState(false);         // send-to-friends popup
  const [shareListOpen, setShareListOpen] = React.useState(false); // who-received popup
  const [commentsOpen, setCommentsOpen] = React.useState(false);
  const [reactionsOpen, setReactionsOpen] = React.useState(false);

  // --- Meta text + reaction bubbles (same as My Posts) ---
  const primaryLiker = likers?.[0] || null;
  const othersCount = Math.max(0, (likeCount || 0) - 1);

  const reactionIds = React.useMemo(
    () =>
      Array.from(
        new Set(
          [
            ...likers.map((u) => u.reactionId).filter(Boolean),
            myReactionId, // include my reaction so UI updates instantly
          ].filter(Boolean)
        )
      ),
    [likers, myReactionId]
  );

  const likeLabel =
    primaryLiker && likeCount > 0
      ? likeCount === 1
        ? `reacted by ${primaryLiker.name}`
        : `reacted by ${primaryLiker.name} and ${othersCount} others`
      : `${(likeCount || 0).toLocaleString()} reactions`;

  // Same text style as MyPosts: "reacted by avinash and 1 others"
  const metaLikeLabel =
    primaryLiker && likeCount > 0
      ? likeCount === 1
        ? `reacted by ${primaryLiker.name}`
        : `reacted by ${primaryLiker.name} and ${othersCount} others`
      : `${(likeCount || 0).toLocaleString()} reactions`;

  // --- Reaction picker popup (like MyPosts) ---
  const [reactionAnchorEl, setReactionAnchorEl] = useState(null);
  const pickerOpen = Boolean(reactionAnchorEl);

  const handleLikeClick = (event) => {
    // open reactions popup instead of direct toggle
    setReactionAnchorEl(event.currentTarget);
  };

  const handleClosePicker = () => setReactionAnchorEl(null);

  const handleSelectReaction = async (reactionId) => {
    handleClosePicker();

    // Optimistic local update of my reaction
    setMyReactionId((prev) => {
      const next = prev === reactionId ? null : reactionId; // same → remove
      setLiked(!!next);
      return next;
    });

    try {
      await toggleProfilePostReaction(post, reactionId);
      const counts = await fetchEngagementCountsForProfilePost(post);
      setLikeCount(counts.likes ?? 0);
      setShareCount(counts.shares ?? 0);
      setCommentCount(counts.comments ?? 0);
      setLiked(!!counts.user_has_liked);
    } catch (e) {
      console.error("Failed to toggle reaction", e);
      // counts re-sync keeps likeCount correct even if there’s an error
      try {
        const counts = await fetchEngagementCountsForProfilePost(post);
        setLikeCount(counts.likes ?? 0);
        setShareCount(counts.shares ?? 0);
        setCommentCount(counts.comments ?? 0);
        setLiked(!!counts.user_has_liked);
      } catch { }
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
        {post.is_removed || post.moderation_status === "removed" ? (
          <Typography color="text.secondary" sx={{ fontStyle: "italic", py: 2 }}>
            This content was removed by moderators.
          </Typography>
        ) : (
          <>
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
            {post.type === "poll" &&
              Array.isArray(post.options) &&
              post.options.length > 0 &&
              (() => {
                // Normalise options and compute totals (same logic style as HomePage)
                const normalized = post.options.map((opt, idx) => {
                  const optionId =
                    typeof opt === "object"
                      ? opt.id ?? opt.option_id ?? null
                      : null;

                  const label =
                    typeof opt === "string"
                      ? opt
                      : opt?.text ??
                      opt?.label ??
                      opt?.option ??
                      opt?.value ??
                      `Option ${idx + 1}`;

                  const votes =
                    typeof opt === "object"
                      ? (typeof opt.vote_count === "number"
                        ? opt.vote_count
                        : typeof opt.votes === "number"
                          ? opt.votes
                          : 0)
                      : 0;

                  return { idx, optionId, label, votes };
                });

                const totalVotes = normalized.reduce(
                  (sum, o) => sum + (o.votes || 0),
                  0
                );

                return (
                  <Box sx={{ mt: 2 }}>
                    {normalized.map(({ idx, optionId, label, votes }) => {
                      const pct =
                        totalVotes > 0
                          ? Math.round((votes / totalVotes) * 100)
                          : 0;

                      return (
                        <Box
                          key={optionId ?? idx}
                          sx={{
                            mb: 1.5,
                            cursor: optionId ? "pointer" : "default",
                          }}
                          onClick={() => {
                            if (!optionId) return;
                            if (
                              typeof window !== "undefined" &&
                              window.__votePollOption
                            ) {
                              window.__votePollOption(post.id, optionId);
                            }
                          }}
                        >
                          <Stack
                            direction="row"
                            justifyContent="space-between"
                            alignItems="center"
                            sx={{ mb: 0.5 }}
                          >
                            <Typography variant="body2">{label}</Typography>
                            <Typography variant="body2" fontWeight={600}>
                              {pct}%
                            </Typography>
                          </Stack>

                          <LinearProgress
                            variant="determinate"
                            value={pct}
                            sx={{
                              height: 10,
                              borderRadius: 5,
                              "& .MuiLinearProgress-bar": {
                                borderRadius: 5,
                              },
                            }}
                          />

                          <Button
                            size="small"
                            sx={{ mt: 0.5, pl: 0 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!optionId) return;
                              if (
                                typeof window !== "undefined" &&
                                window.__openPollVotes
                              ) {
                                window.__openPollVotes(
                                  post.id,
                                  optionId,
                                  label
                                )?.();
                              }
                            }}
                          >
                            {votes} {votes === 1 ? "vote" : "votes"}
                          </Button>
                        </Box>
                      );
                    })}

                    <Typography variant="caption" color="text.secondary">
                      Total: {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
                    </Typography>
                  </Box>
                );
              })()}
          </>
        )}
      </CardContent>
      {/* Meta strip: likes bubble + shares count (same style as HomePage) */}
      {(likeCount > 0 || shareCount > 0) && (
        <Box sx={{ px: 1.25, pt: 0.75, pb: 0.5 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            {/* Left: reaction bubbles + text (like My Posts) */}
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ cursor: likeCount > 0 ? "pointer" : "default" }}
              onClick={() => {
                if (likeCount > 0) setReactionsOpen(true);
              }}
            >
              {/* Reaction emoji bubbles */}
              <AvatarGroup
                max={3}
                sx={{
                  "& .MuiAvatar-root": {
                    width: 24,
                    height: 24,
                    fontSize: 14,
                  },
                }}
              >
                {(reactionIds.length ? reactionIds : ["like"])
                  .slice(0, 3)
                  .map((rid) => {
                    const def =
                      POST_REACTIONS.find((r) => r.id === rid) ||
                      POST_REACTIONS[0];
                    return (
                      <Avatar key={rid}>
                        <span style={{ fontSize: 16 }}>{def.emoji}</span>
                      </Avatar>
                    );
                  })}
              </AvatarGroup>

              <Typography variant="body2">
                {metaLikeLabel}
              </Typography>
            </Stack>

            {/* Right: share count, like HomePage "My posts" section */}
            <Button size="small" disabled={!shareCount} onClick={() => {
              if (shareCount) setShareListOpen(true);
            }}>
              {shareCount.toLocaleString()} SHARES
            </Button>
          </Stack>
        </Box>
      )}

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
        {/* LIKE / REACTIONS */}
        <Button
          size="small"
          onClick={handleLikeClick}
          sx={{
            flex: { xs: 1, sm: "0 0 auto" },
            minWidth: 0,
            px: { xs: 0.25, sm: 1 },
            fontSize: { xs: 11, sm: 12 },
            textTransform: "none",
            color: hasReaction ? "primary.main" : "text.secondary",
            fontWeight: hasReaction ? 600 : 400,
            "& .MuiButton-startIcon": {
              mr: { xs: 0.25, sm: 0.5 },
            },
          }}
          startIcon={
            <span style={{ fontSize: 18, lineHeight: 1 }}>
              {likeBtnEmoji}
            </span>
          }
        >
          {likeBtnLabel}
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
      <ProfileShareRecipientsDialog
        open={shareListOpen}
        onClose={() => setShareListOpen(false)}
        postId={post.id}
      />
      <ProfileReactionsDialog
        open={reactionsOpen}
        onClose={() => setReactionsOpen(false)}
        postId={post.id}
      />
      {/* Reactions picker popover (LinkedIn-style) */}
      <Popover
        open={pickerOpen}
        anchorEl={reactionAnchorEl}
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
                onClick={() => handleSelectReaction(r.id)}
                sx={{
                  cursor: "pointer",
                  fontSize: 26,
                  lineHeight: 1,
                  px: 0.5,
                  py: 0.25,
                  borderRadius: "999px",
                  transition: "transform 120ms ease, background 120ms ease",
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
    </Card>
  );
}

function RichPostSkeleton() {
  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardHeader
        avatar={
          <Skeleton variant="circular" width={40} height={40} />
        }
        title={<Skeleton width="40%" />}
        subheader={<Skeleton width="25%" />}
        sx={{ pb: 0.5 }}
      />
      <CardContent sx={{ pt: 1.5 }}>
        <Stack spacing={1}>
          <Skeleton variant="text" width="90%" />
          <Skeleton variant="text" width="80%" />
          <Skeleton
            variant="rectangular"
            height={160}
            sx={{ borderRadius: 2, mt: 1 }}
          />
        </Stack>
      </CardContent>
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

// --- Reactions popup for Rich Profile posts ---
function ProfileReactionsDialog({ open, onClose, postId }) {
  const [users, setUsers] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [activeFilter, setActiveFilter] = React.useState("all");

  React.useEffect(() => {
    if (!open || !postId) return;

    setActiveFilter("all");
    setLoading(true);

    (async () => {
      try {
        const targetType = "activity_feed.feeditem";

        // Try main reactions endpoint first, then who-liked (same style as MyPostsPage)
        const endpoints = [
          `${API_BASE}/engagements/reactions/?target_type=${encodeURIComponent(
            targetType
          )}&target_id=${postId}&page_size=500`,
          `${API_BASE}/engagements/reactions/who-liked/?feed_item=${postId}&page_size=500`,
        ];

        let rows = [];

        for (const url of endpoints) {
          try {
            const res = await fetch(url, {
              headers: { Accept: "application/json", ...tokenHeader() },
              credentials: "include",
            });
            if (!res.ok) continue;

            const j = await res.json().catch(() => null);
            const candidate = Array.isArray(j?.results)
              ? j.results
              : Array.isArray(j)
                ? j
                : Array.isArray(j?.data)
                  ? j.data
                  : [];

            if (!candidate.length) continue;

            rows = candidate;
            break;
          } catch (err) {
            console.error("ProfileReactionsDialog: error from", url, err);
          }
        }

        const parsed = rows
          .map((row) => {
            const u =
              row.user ||
              row.actor ||
              row.profile ||
              row.owner ||
              row.author ||
              {};

            const id = u.id ?? row.user_id ?? row.id;
            if (!id) return null;

            const first = u.first_name || u.firstName || "";
            const last = u.last_name || u.lastName || "";

            const name =
              u.full_name ||
              u.name ||
              (first || last ? `${first} ${last}`.trim() : u.username) ||
              `User #${id}`;

            const avatar =
              u.avatar_url ||
              u.user_image_url ||
              u.avatar ||
              u.photo ||
              u.image ||
              "";

            const reactionId =
              row.reaction ||
              row.reaction_type ||
              row.kind ||
              row.type ||
              "like";

            const reactionDef =
              POST_REACTIONS.find((r) => r.id === reactionId) ||
              POST_REACTIONS[0];

            const isVerified = isVerifiedStatus(u.kyc_status || u.profile?.kyc_status);

            return {
              id,
              name,
              avatar,
              reactionId,
              reactionEmoji: reactionDef.emoji,
              reactionLabel: reactionDef.label,
              isVerified,
            };
          })
          .filter(Boolean);

        setUsers(parsed);
      } catch (e) {
        console.error("Failed to load reactions:", e);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, postId]);

  const reactionSummary = React.useMemo(() => {
    const map = {};
    for (const u of users) {
      const key = u.reactionId || "like";
      map[key] = (map[key] || 0) + 1;
    }
    return map;
  }, [users]);

  const filteredUsers =
    activeFilter === "all"
      ? users
      : users.filter((u) => u.reactionId === activeFilter);

  return (
    <Dialog open={!!open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Reactions</DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Stack alignItems="center" py={3}>
            <CircularProgress size={22} />
          </Stack>
        ) : (
          <>
            {/* Filter chips: All + each reaction with count */}
            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
              <Chip
                size="small"
                label={`All (${users.length})`}
                variant={activeFilter === "all" ? "filled" : "outlined"}
                onClick={() => setActiveFilter("all")}
              />
              {POST_REACTIONS.map((r) => {
                const count = reactionSummary[r.id] || 0;
                if (!count) return null;
                return (
                  <Chip
                    key={r.id}
                    size="small"
                    label={`${r.emoji} ${r.label} (${count})`}
                    variant={activeFilter === r.id ? "filled" : "outlined"}
                    onClick={() => setActiveFilter(r.id)}
                  />
                );
              })}
            </Stack>

            {/* List of users + which reaction they gave */}
            {filteredUsers.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No reactions yet.
              </Typography>
            ) : (
              <List dense>
                {filteredUsers.map((u) => (
                  <ListItem key={u.id}>
                    <ListItemAvatar>
                      <Avatar src={u.avatar}>
                        {(u.name || "U").slice(0, 1)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <Typography variant="body1">{u.name}</Typography>
                          {u.isVerified && (
                            <VerifiedIcon color="primary" sx={{ fontSize: 16 }} />
                          )}
                        </Stack>
                      }
                      secondary={
                        u.reactionEmoji
                          ? `${u.reactionEmoji} ${u.reactionLabel}`
                          : undefined
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}



function ProfileCommentsDialog({ open, onClose, postId }) {
  const [loading, setLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [items, setItems] = React.useState([]);       // raw comments from API
  const [text, setText] = React.useState("");        // composer text
  const [replyTo, setReplyTo] = React.useState(null); // which comment we’re replying to
  const [deleteTarget, setDeleteTarget] = React.useState(null);
  const [deleteBusy, setDeleteBusy] = React.useState(false);


  // -------- Load comments (root + replies) --------
  const load = React.useCallback(async () => {
    if (!open || !postId) return;
    setLoading(true);
    try {
      // 1. Fetch Roots (Level 0)
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

      let rootsRaw = [];
      if (res.ok) {
        const j = await res.json().catch(() => null);
        rootsRaw = Array.isArray(j?.results) ? j.results : Array.isArray(j) ? j : [];
      }

      // 2. Fetch Replies for each Root (Level 1)
      // Your LiveFeedPage does this, so RichProfile must do it too.
      const replyPromises = rootsRaw.map(async (root) => {
        try {
          const r = await fetch(
            `${API_BASE}/engagements/comments/?parent=${root.id}&page_size=200`,
            {
              headers: { Accept: "application/json", ...tokenHeader() },
              credentials: "include",
            }
          );
          if (!r.ok) return [];
          const j = await r.json();
          return Array.isArray(j?.results) ? j.results : Array.isArray(j) ? j : [];
        } catch {
          return [];
        }
      });

      const nestedReplies = await Promise.all(replyPromises);
      const allReplies = nestedReplies.flat();

      // 3. Combine them so the tree builder can link them
      setItems([...rootsRaw, ...allReplies]);

    } catch (e) {
      console.error("Failed to load comments:", e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [open, postId]);

  React.useEffect(() => {
    load();
  }, [load]);

  // -------- Build tree (roots + children) & add authorName / avatar --------
  const roots = React.useMemo(() => {
    const map = new Map();

    (items || []).forEach((row) => {
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
        author.image ||
        author.photo ||
        "";

      const isVerified = isVerifiedStatus(
        author.kyc_status || author.profile?.kyc_status
      );

      // 🔴 IMPORTANT: normalize parent id from various possible fields
      const parentId =
        row.parent_id ??
        (typeof row.parent === "object" ? row.parent?.id : row.parent) ??
        row.parent_comment_id ??
        (typeof row.parent_comment === "object"
          ? row.parent_comment?.id
          : row.parent_comment) ??
        row.reply_to_id ??
        (typeof row.reply_to === "object" ? row.reply_to?.id : row.reply_to) ??
        null;

      map.set(row.id, {
        ...row,
        parentId,          // normalized parent id
        authorName: name,
        authorAvatar: avatar,
        isVerified,
        children: [],
      });
    });

    // link children → parent
    map.forEach((c) => {
      if (c.parentId && map.get(c.parentId)) {
        map.get(c.parentId).children.push(c);
      }
    });

    const all = Array.from(map.values());
    // roots = comments without a parent
    const rootNodes = all.filter((c) => !c.parentId);

    // newest first
    rootNodes.sort(
      (a, b) =>
        new Date(b.created_at || 0) - new Date(a.created_at || 0)
    );

    return rootNodes;
  }, [items]);

  // -------- Create / reply comment (POST) --------
  async function createComment(body, parentId = null) {
    const trimmed = (body || "").trim();
    if (!trimmed || !postId) return;

    setSubmitting(true);
    try {
      // always send target_id for this post
      const payload = {
        text: trimmed,
        target_id: Number(postId),
        ...(parentId ? { parent: parentId } : {}),
      };

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
        setText("");
        setReplyTo(null);
        // reload full list (roots + replies)
        await load();
      } else {
        console.error("Comment POST failed:", res.status);
      }
    } catch (e) {
      console.error("Failed to post comment:", e);
    } finally {
      setSubmitting(false);
    }
  }
  // -------- Delete comment (and its replies) --------
  function handleDelete(c) {
    // just open the modern dialog
    setDeleteTarget(c);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteBusy(true);

    try {
      const res = await fetch(
        `${API_BASE}/engagements/comments/${deleteTarget.id}/`,
        {
          method: "DELETE",
          headers: { ...tokenHeader(), Accept: "application/json" },
          credentials: "include",
        }
      );

      if (res.ok || res.status === 204) {
        setDeleteTarget(null);
        await load();   // reload comments
      } else {
        console.error("Delete failed", res.status);
        alert("Could not delete comment. Please try again.");
      }
    } catch (e) {
      console.error("Failed to delete comment", e);
      alert("Could not delete comment. Please try again.");
    } finally {
      setDeleteBusy(false);
    }
  }


  // -------- Single comment item (with nested replies) --------
  function CommentItem({ c, depth = 0 }) {
    // Initial state from the comment object
    // Note: ensure your backend returns `user_has_liked` and `like_count` (or `likes_count`) for comments
    const [liked, setLiked] = React.useState(!!c.user_has_liked);
    const [likeCount, setLikeCount] = React.useState(
      Number(c.like_count || c.likes_count || 0)
    );

    const handleLike = async () => {
      const oldLiked = liked;
      const oldCount = likeCount;

      // Optimistic update
      const newLiked = !oldLiked;
      setLiked(newLiked);
      setLikeCount(newLiked ? oldCount + 1 : Math.max(0, oldCount - 1));

      try {
        await toggleCommentLike(c.id);
      } catch (e) {
        console.error("Failed to toggle comment like", e);
        // Revert
        setLiked(oldLiked);
        setLikeCount(oldCount);
      }
    };

    return (
      <Box sx={{ pl: depth ? 5 : 0, mt: depth ? 0.75 : 1 }}>
        <Stack direction="row" spacing={1} alignItems="flex-start">
          <Avatar sx={{ width: 32, height: 32 }} src={c.authorAvatar}>
            {(c.authorName || "U").slice(0, 1)}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Typography variant="subtitle2">
                {c.authorName}
              </Typography>
              {c.isVerified && (
                <VerifiedIcon color="primary" sx={{ fontSize: 14 }} />
              )}
            </Stack>
            <Typography
              variant="body2"
              sx={{ whiteSpace: "pre-wrap" }}
            >
              {c.text || c.body || ""}
            </Typography>

            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ mt: 0.5 }}
            >
              {/* LIKE BUTTON */}
              <Button
                size="small"
                onClick={handleLike}
                startIcon={
                  liked ? (
                    <FavoriteRoundedIcon sx={{ fontSize: 16 }} />
                  ) : (
                    <FavoriteBorderIcon sx={{ fontSize: 16 }} />
                  )
                }
                sx={{
                  color: liked ? "teal" : "text.secondary",
                  minWidth: "auto",
                  px: 1,
                }}
              >
                {likeCount > 0 ? likeCount : "Like"}
              </Button>

              <Button
                size="small"
                onClick={() => setReplyTo(c)}
                startIcon={<ReplyRoundedIcon sx={{ fontSize: 16 }} />}
                sx={{ color: "text.secondary", minWidth: "auto", px: 1 }}
              >
                Reply
              </Button>

              <Button
                size="small"
                color="inherit" // or "error" if you prefer red always
                onClick={() => handleDelete(c)}
                startIcon={<DeleteOutlineRoundedIcon sx={{ fontSize: 16 }} />}
                sx={{ color: "text.secondary", minWidth: "auto", px: 1, "&:hover": { color: "error.main" } }}
              >
                Delete
              </Button>
            </Stack>

            {c.children && c.children.length > 0 && (
              <Box sx={{ mt: 0.5 }}>
                {c.children.map((child) => (
                  <CommentItem
                    key={child.id}
                    c={child}
                    depth={depth + 1}
                  />
                ))}
              </Box>
            )}
          </Box>
        </Stack>
      </Box>
    );
  }

  return (
    <>
      <Dialog open={!!open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Comments</DialogTitle>

        <DialogContent dividers>
          {loading ? (
            <Stack alignItems="center" py={3}>
              <CircularProgress size={22} />
            </Stack>
          ) : roots.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No comments yet. Be the first to comment.
            </Typography>
          ) : (
            <Box sx={{ mb: 2 }}>
              {roots.map((c) => (
                <CommentItem key={c.id} c={c} />
              ))}
            </Box>
          )}

          {replyTo && (
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ mb: 1 }}
            >
              <Typography variant="caption" color="text.secondary">
                Replying to {replyTo.authorName || "comment"}
              </Typography>
              <Button
                size="small"
                onClick={() => setReplyTo(null)}
              >
                Cancel
              </Button>
            </Stack>
          )}

          <Box
            component="form"
            onSubmit={(e) => {
              e.preventDefault();
              createComment(text, replyTo?.id || null);
            }}
          >
            <TextField
              fullWidth
              multiline
              minRows={2}
              placeholder={
                replyTo ? "Write a reply…" : "Write a comment…"
              }
              value={text}
              onChange={(e) => setText(e.target.value)}
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
            onClick={() => createComment(text, replyTo?.id || null)}
            disabled={submitting || !text.trim()}
          >
            {submitting ? "Posting…" : "Post"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modern delete confirm dialog */}
      <Dialog
        open={!!deleteTarget}
        onClose={deleteBusy ? undefined : () => setDeleteTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete comment?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to delete this comment? This action
            cannot be undone.
          </Typography>

          {deleteTarget && (
            <Box
              mt={2}
              p={1.5}
              sx={{ bgcolor: "grey.100", borderRadius: 1 }}
            >
              <Typography
                variant="body2"
                sx={{ whiteSpace: "pre-wrap" }}
              >
                {deleteTarget.text || deleteTarget.body || ""}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteTarget(null)}
            disabled={deleteBusy}
          >
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={confirmDelete}
            disabled={deleteBusy}
          >
            {deleteBusy ? "Deleting…" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
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

        const isVerified = isVerifiedStatus(
          u?.kyc_status || u?.profile?.kyc_status || f?.kyc_status
        );

        return { id, name, avatar, isVerified };
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
                    <ListItemText
                      primary={
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <Typography variant="body1">{f.name}</Typography>
                          {f.isVerified && (
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


function ProfileShareRecipientsDialog({ open, onClose, postId }) {
  const [loading, setLoading] = React.useState(false);
  const [items, setItems] = React.useState([]);

  // Normalize share row → { id, name, avatar }  // 👈 now: WHO SHARED the post
  function normalizeRecipient(row = {}) {
    // Sharer / actor of the share
    const u =
      row.actor ||          // preferred: who performed the share
      row.user ||           // fallback
      row.profile ||
      row.owner ||
      row.from_user ||      // extra safeguard if backend uses from_user
      {};

    const id =
      u.id ??
      row.actor_id ??
      row.user_id ??
      row.owner_id ??
      row.from_user_id ??
      row.id;

    const name =
      u.full_name ||
      u.name ||
      u.username ||
      [u.first_name, u.last_name].filter(Boolean).join(" ") ||
      (id ? `User #${id}` : "User");

    const avatar =
      u.avatar_url ||
      u.user_image_url ||
      u.avatar ||
      u.photo ||
      u.image ||
      "";

    const isVerified = isVerifiedStatus(
      u.kyc_status || u.profile?.kyc_status
    );

    return id ? { id, name, avatar, isVerified } : null;
  }


  React.useEffect(() => {
    if (!open || !postId) return;

    setLoading(true);
    (async () => {
      try {
        // 🔹 Adjust the URL/param if your backend uses a different shape
        const res = await fetch(
          `${API_BASE}/engagements/shares/?target_id=${postId}`,
          {
            headers: { Accept: "application/json", ...tokenHeader() },
            credentials: "include",
          }
        );

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json().catch(() => ({}));

        const arr = Array.isArray(data?.results)
          ? data.results
          : Array.isArray(data)
            ? data
            : data?.data || [];

        const norm = arr.map(normalizeRecipient).filter(Boolean);

        // Deduplicate by user id: if A shared to many friends, show A only once
        const seen = new Set();
        const unique = [];
        for (const u of norm) {
          if (!seen.has(u.id)) {
            seen.add(u.id);
            unique.push(u);
          }
        }

        setItems(unique);

      } catch (e) {
        console.error("Failed to load share recipients:", e);
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, postId]);

  return (
    <Dialog open={!!open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Shared by</DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Stack alignItems="center" py={3}>
            <CircularProgress size={22} />
          </Stack>
        ) : items.length === 0 ? (
          <Typography color="text.secondary">
            This post hasn&apos;t been shared to anyone yet.
          </Typography>
        ) : (
          <List dense>
            {items.map((u) => (
              <ListItem key={u.id}>
                <ListItemAvatar>
                  <Avatar src={u.avatar}>
                    {(u.name || "U").slice(0, 1).toUpperCase()}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {u.name}
                      </Typography>
                      {u.isVerified && (
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
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: "none" }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}



export default function RichProfile({ userId: propUserId, viewAsPublic, onBack }) {
  // IMPORTANT: use :userId from /community/rich-profile/:userId
  const { userId: paramUserId } = useParams();
  const userId = propUserId || paramUserId;
  const navigate = useNavigate();
  const location = useLocation();

  // roster user (passed from directory) if available
  const [userItem, setUserItem] = useState(location.state?.user || null);
  const [loadingBase, setLoadingBase] = useState(!location.state?.user);
  const [experiences, setExperiences] = useState([]);
  const [educations, setEducations] = useState([]);
  const [loadingExtras, setLoadingExtras] = useState(true);
  const [profileLinks, setProfileLinks] = useState({});

  const me = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
  }, []);
  // If viewAsPublic is true, we force isMe to false so the UI renders as if viewing a stranger
  const isMe = !viewAsPublic && String(me?.id || "") === String(userId || "");
  const viewerIsStaff = !viewAsPublic && isAdminUser();
  const viewerIsVerified = isVerifiedStatus(me?.profile?.kyc_status || me?.kyc_status);
  const [sharesGroup, setSharesGroup] = useState(false);

  // --- REPORTING ---
  const [reportOpen, setReportOpen] = useState(false);
  const [reportBusy, setReportBusy] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);

  // Per-row friendship status inside Connections dialog
  const [connFriendStatus, setConnFriendStatus] = useState({}); // { [userId]: "friends" | "pending_outgoing" | "pending_incoming" | "none" }
  const [connSubmitting, setConnSubmitting] = useState({});     // { [userId]: boolean }
  const [connFriendRequests, setConnFriendRequests] = useState({});

  // --- FRIEND BUTTON / STATUS ---
  const [friendStatus, setFriendStatus] = useState(isMe ? "self" : "none"); // self | none | pending_outgoing | pending_incoming | friends
  const [friendLoading, setFriendLoading] = useState(!isMe);
  const [friendSubmitting, setFriendSubmitting] = useState(false);
  const [friendRequestId, setFriendRequestId] = useState(null);

  const handleReportProfile = async (payload) => {
    setReportBusy(true);
    try {
      const res = await fetch(`${API_BASE}/moderation/reports/profile/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...tokenHeader() },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.detail || "Report failed");
      }
      alert("Profile reported successfully. Our team will review it.");
      setReportOpen(false);
    } catch (error) {
      alert(`Failed to report profile: ${error.message}`);
    } finally {
      setReportBusy(false);
    }
  };

  React.useEffect(() => {
    // 🔹 Global helper used by the poll UI in RichProfile
    window.__votePollOption = async (postId, optionId) => {
      if (!postId || !optionId) return;

      try {
        const res = await fetch(
          `${API_BASE}/activity/feed/${postId}/poll/vote/`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...tokenHeader(),      // 🔹 same auth as other API calls in this file
            },
            body: JSON.stringify({ option_ids: [optionId] }), // ✅ IMPORTANT
          }
        );

        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          console.error("Poll vote failed:", res.status, txt);
          alert("Could not register your vote.");
          return;
        }

        // (Optional) If backend returns updated options, you can merge them into local state here.
        // const data = await res.json().catch(() => null);
        // if (data && Array.isArray(data.options)) {
        //   setPosts(prev =>
        //     prev.map((p) =>
        //       p.id === postId && p.type === "poll"
        //         ? { ...p, options: data.options }
        //         : p
        //     )
        //   );
        // }
      } catch (err) {
        console.error("Error voting on poll:", err);
        alert("Could not register your vote.");
      }
    };

    // If you already have __openPollVotes here, keep it below:
    // window.__openPollVotes = (postId, optionId, label) => { ... };

    return () => {
      try {
        delete window.__votePollOption;
        delete window.__openPollVotes;
      } catch { }
    };
  }, []);


  useEffect(() => {
    // allow voting on polls from RichProfile page
    window.__votePollOption = async (postId, optionId) => {
      try {
        const res = await fetch(
          `${API_BASE}/activity/feed/${postId}/poll/vote/`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...tokenHeader(),
            },
            credentials: "include",
            body: JSON.stringify({ option_ids: [optionId] }),
          }
        );

        if (!res.ok) {
          console.error("Poll vote failed:", res.status);
        }
      } catch (err) {
        console.error("Poll vote error:", err);
      }
    };

    // optional stub: you can later show a dialog with who voted
    window.__openPollVotes = (postId, optionId, label) => {
      console.log("openPollVotes (RichProfile) →", { postId, optionId, label });
      // later you can implement a dialog here if you want
    };

    return () => {
      delete window.__votePollOption;
      delete window.__openPollVotes;
    };
  }, []);

  async function fetchFriendStatus(targetId) {
    try {
      const r = await fetch(`${API_BASE}/friends/status/?user_id=${targetId}`, {
        headers: { ...tokenHeader(), Accept: "application/json" },
        credentials: "include",
      });
      const d = await r.json().catch(() => ({}));
      // backend may return incoming_pending/outgoing_pending — normalize:
      const map = { incoming_pending: "pending_incoming", outgoing_pending: "pending_outgoing" };

      if (d?.status === "incoming_pending" && d?.request_id) {
        setConnFriendRequests((prev) => ({ ...prev, [targetId]: d.request_id }));
      }

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

  async function respondToConnRequest(targetId, action) {
    const reqId = connFriendRequests[targetId];
    if (!reqId) {
      alert("Unable to find request ID. Please refresh.");
      return;
    }
    try {
      setConnSubmitting((m) => ({ ...m, [targetId]: true }));
      const r = await fetch(`${API_BASE}/friend-requests/${reqId}/${action}/`, {
        method: "POST",
        headers: { Accept: "application/json", ...tokenHeader() },
        credentials: "include",
      });
      if (!r.ok) throw new Error(`Failed to ${action}`);
      setConnFriendStatus((m) => ({ ...m, [targetId]: action === "accept" ? "friends" : "none" }));
      setConnFriendRequests((prev) => {
        const next = { ...prev };
        delete next[targetId];
        return next;
      });
    } catch (e) {
      alert(e.message);
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
  const [tab, setTab] = useState(1);
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);

  const [visiblePostCount, setVisiblePostCount] = useState(4);
  const [isLoadingMorePosts, setIsLoadingMorePosts] = useState(false);
  const postsObserverRef = React.useRef(null);

  const visiblePosts = useMemo(
    () => posts.slice(0, visiblePostCount),
    [posts, visiblePostCount]
  );

  // Infinite scroll for profile posts: load 4 at a time
  useEffect(() => {
    if (!postsObserverRef.current) return;

    const el = postsObserverRef.current;

    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (
        entry.isIntersecting &&
        !postsLoading &&
        !isLoadingMorePosts &&
        posts.length > visiblePostCount
      ) {
        setIsLoadingMorePosts(true);

        // Small delay for smoother UX (similar feel to MyPostsPage)
        setTimeout(() => {
          setVisiblePostCount((prev) =>
            Math.min(prev + 4, posts.length)
          );
          setIsLoadingMorePosts(false);
        }, 600);
      }
    }, { threshold: 0.5 });

    observer.observe(el);
    return () => observer.disconnect();
  }, [postsLoading, isLoadingMorePosts, posts.length, visiblePostCount]);

  useEffect(() => {
    if (!postsLoading) {
      setVisiblePostCount(4);
    }
  }, [postsLoading]);

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
      moderation_status: row.moderation_status ?? m.moderation_status ?? row.moderationStatus ?? m.moderationStatus ?? row.status ?? m.status ?? null,
      is_removed: row.is_removed ?? m.is_removed ?? (row.moderation_status === "removed") ?? (m.moderationStatus === "removed") ?? (m.status === "removed") ?? (row.status === "removed") ?? false,
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
      if (!isMe && !viewAsPublic && (friendStatus || "").toLowerCase() !== "friends") {
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
    if (viewAsPublic) {
      setFriendStatus("none");
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
        setFriendRequestId(d?.request_id || null);
      } catch {
        if (!alive) return;
        setFriendStatus("none");
      } finally {
        if (alive) setFriendLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [userId, isMe]);

  const respondToRequest = async (action) => {
    if (!friendRequestId) {
      alert("Unable to find request ID. Please refresh.");
      return;
    }
    setFriendSubmitting(true);
    try {
      const r = await fetch(`${API_BASE}/friend-requests/${friendRequestId}/${action}/`, {
        method: "POST",
        headers: { Accept: "application/json", ...tokenHeader() },
        credentials: "include",
      });
      if (!r.ok) throw new Error(`Failed to ${action} request`);

      setFriendStatus(action === "accept" ? "friends" : "none");
      setFriendRequestId(null);
      if (action === "accept") {
        setMutualCount((prev) => prev + 1);
      }
    } catch (e) {
      alert(e.message);
    } finally {
      setFriendSubmitting(false);
    }
  };

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

  const handleStartKYC = async () => {
    try {
      const data = await startKYC();
      if (data?.url) {
        window.location.href = data.url;
      } else {
        alert("Could not start verification. Please try again.");
      }
    } catch (error) {
      alert(error?.message || "Failed to start verification");
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

      if (j && j.user) {
        // MERGE API data into userItem so we have the latest Location, Avatar, etc.
        // The public_profile endpoint returns { user: {...}, profile: {...}, ... }
        // UserMiniSerializer usually puts avatar_url on the user object too.
        setUserItem((prev) => ({
          ...(prev || {}),
          ...j.user,
          profile: j.profile || j.user?.profile || prev?.profile || {},
        }));
      }

      const exps = Array.isArray(j?.experiences) ? j.experiences : [];
      const edus = Array.isArray(j?.educations) ? j.educations : [];
      const rawLinks =
        j?.links ||
        j?.profile?.links ||
        j?.profile?.links_text ||
        j?.profile?.linksText ||
        {};
      const parsedLinks = typeof rawLinks === "string" ? parseLinks(rawLinks) : rawLinks;
      const links = (parsedLinks && typeof parsedLinks === "object") ? parsedLinks : {};

      if (!alive) return;
      setExperiences(exps);
      setEducations(edus);
      setProfileLinks(links);
      setLoadingExtras(false);
    })();
    return () => { alive = false; };
  }, [userId, isMe, friendStatus]);

  const fullName = useMemo(() => {
    const u = userItem || {};
    return (
      u?.profile?.full_name ||
      `${u?.first_name || ""} ${u?.last_name || ""}`.trim() ||
      u?.username ||
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

  const canViewContactVisibility = (visibility, opts = {}) => {
    const v = normalizeVisibility(visibility || "");
    if (isMe || viewerIsStaff) return true;
    if (opts.requireVerified && !viewerIsVerified) return false;
    if (!v || v === "public") return true;
    if (v === "private") return false;
    if (v === "request" || v === "contacts") return friendStatus === "friends";
    if (v === "contacts_groups") return friendStatus === "friends" || sharesGroup;
    return false;
  };

  const resolvedLinks = useMemo(() => {
    const fromUser =
      userItem?.profile?.links && typeof userItem.profile.links === "object"
        ? userItem.profile.links
        : {};
    const fromUserText = parseLinks(
      userItem?.profile?.links_text || userItem?.profile?.linksText
    );
    const fromProfile =
      profileLinks && typeof profileLinks === "object" ? profileLinks : {};
    return { ...fromUserText, ...fromUser, ...fromProfile };
  }, [profileLinks, userItem]);

  const getVisibilityValue = (item) =>
    item?.visibility ||
    item?.visibility_level ||
    item?.visibilityLevel ||
    item?.access ||
    item?.access_level ||
    "";

  const contactSettings = resolvedLinks?.contact || {};
  const emailRequireVerified = !!(
    contactSettings.require_verified ||
    contactSettings.member_integrity ||
    contactSettings.email_requires_verified
  );
  const emailVisibilityModes = [
    normalizeVisibility(getVisibilityValue(contactSettings.main_email)),
    ...(Array.isArray(contactSettings.emails)
      ? contactSettings.emails.map((e) => normalizeVisibility(getVisibilityValue(e)))
      : []),
  ].filter(Boolean);
  const needsGroupCheck = emailVisibilityModes.includes("contacts_groups");

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!needsGroupCheck || isMe || !me?.id || !userId) {
        setSharesGroup(false);
        return;
      }

      try {
        const [mineRaw, theirsRaw] = await Promise.all([
          fetchGroupListForUser(me.id),
          fetchGroupListForUser(userId),
        ]);
        const mineIds = new Set(
          (mineRaw || [])
            .map(extractGroupId)
            .filter(Boolean)
            .map((id) => String(id))
        );
        const share = (theirsRaw || [])
          .map(extractGroupId)
          .filter(Boolean)
          .some((id) => mineIds.has(String(id)));
        if (alive) setSharesGroup(share);
      } catch {
        if (alive) setSharesGroup(false);
      }
    })();
    return () => { alive = false; };
  }, [needsGroupCheck, isMe, me?.id, userId]);

  // --- Helper: Extract visible phone ---
  const visiblePhones = useMemo(() => {
    const contact = resolvedLinks?.contact || {};
    // "phones" is usually an array: [{ number: "+123...", type:"mobile", visibility:"public", primary:true }, ...]
    const phones = Array.isArray(contact.phones) ? contact.phones : [];

    console.log('🔍 DEBUG visiblePhones:', {
      resolvedLinks,
      contact,
      phones,
      isMe,
      friendStatus
    });

    // Filter by visibility - return ALL visible phones
    const visible = phones.filter(
      (p) => {
        const vis = normalizeVisibility(getVisibilityValue(p));
        const canView = canViewContactVisibility(vis);
        console.log('📞 Phone filter:', { number: p?.number, visibility: vis, canView });
        return p?.number && canView;
      }
    );

    if (visible.length) {
      return visible;
    }

    // Fallbacks for older schemas
    const directPhone =
      (typeof contact.phone === "object" ? contact.phone.number : contact.phone) ||
      (typeof contact.main_phone === "object"
        ? contact.main_phone.number
        : contact.main_phone) ||
      userItem?.profile?.phone ||
      userItem?.profile?.phone_number ||
      userItem?.phone ||
      userItem?.phone_number ||
      "";

    const directVisibility =
      getVisibilityValue(contact.phone) || getVisibilityValue(contact.main_phone);

    if (!directPhone) return [];
    if (directVisibility && !canViewContactVisibility(directVisibility)) return [];

    return [{ number: directPhone, type: "phone" }];
  }, [resolvedLinks, friendStatus, isMe, userItem]);

  // --- Helper: Extract visible emails (ALL public emails) ---
  const visibleEmails = useMemo(() => {
    const contact = resolvedLinks?.contact || {};
    const emails = Array.isArray(contact.emails) ? contact.emails : [];

    console.log('🔍 DEBUG visibleEmails:', {
      resolvedLinks,
      contact,
      emails,
      isMe,
      friendStatus
    });

    // Filter by visibility - return ALL visible emails
    const visible = emails.filter(
      (e) => {
        const vis = normalizeVisibility(getVisibilityValue(e)) || "contacts";
        const canView = canViewContactVisibility(vis, { requireVerified: emailRequireVerified });
        console.log('📧 Email filter:', { email: e?.email, visibility: vis, canView });
        return e?.email && canView;
      }
    );

    console.log('✅ Visible emails result:', visible);

    // Always include main email from User model if not already in the list
    const mainEmailValue = (userItem?.email || "").trim();
    if (mainEmailValue) {
      const alreadyIncluded = visible.some(e => e.email?.toLowerCase() === mainEmailValue.toLowerCase());
      if (!alreadyIncluded) {
        // Check if main_email has visibility settings
        const mainEmail = contact.main_email || {};
        const mainVisibility = normalizeVisibility(getVisibilityValue(mainEmail)) || "contacts";

        if (isMe || canViewContactVisibility(mainVisibility, { requireVerified: emailRequireVerified })) {
          visible.unshift({
            email: mainEmailValue,
            type: mainEmail.type || "Main",
            primary: true
          });
        }
      }
    }

    return visible;
  }, [resolvedLinks, friendStatus, isMe, userItem, sharesGroup, viewerIsStaff]);

  const emailVisibilityInfo = useMemo(() => {
    const contact = resolvedLinks?.contact || {};
    const emails = Array.isArray(contact.emails) ? contact.emails : [];
    const rawMain = normalizeVisibility(getVisibilityValue(contact.main_email));
    const fallbackVis =
      rawMain ||
      normalizeVisibility(getVisibilityValue(emails[0])) ||
      "contacts";
    const anyEmail = Boolean(
      (userItem?.email || "").trim() ||
      emails.some((e) => (e?.email || "").trim())
    );
    return { anyEmail, visibility: fallbackVis };
  }, [resolvedLinks, userItem]);

  const emailBlockedByVerified =
    emailRequireVerified && !viewerIsVerified && !isMe && !viewerIsStaff;
  const primaryEmailVisibility = emailVisibilityInfo.visibility || "contacts";
  const canRequestContact =
    !isMe &&
    !viewerIsStaff &&
    !emailBlockedByVerified &&
    ["request", "contacts", "contacts_groups"].includes(primaryEmailVisibility) &&
    (friendStatus || "").toLowerCase() !== "friends" &&
    (friendStatus || "").toLowerCase() !== "pending_outgoing";

  // --- Helper: Extract visible location ---
  const visibleLocation = useMemo(() => {
    const contactLoc = resolvedLinks?.contact?.location;
    const contactVisibility =
      typeof contactLoc === "object" ? getVisibilityValue(contactLoc) : "";
    const contactValue =
      typeof contactLoc === "string"
        ? contactLoc
        : contactLoc?.value || contactLoc?.location || contactLoc?.label || "";

    const fallback =
      userItem?.profile?.location ||
      userItem?.location ||
      "";

    const value = (contactValue || fallback || "").trim();
    if (!value) return "";
    if (contactVisibility && !canViewContactVisibility(contactVisibility)) return "";
    return value;
  }, [resolvedLinks, friendStatus, isMe, userItem, sharesGroup, viewerIsStaff, viewerIsVerified, emailRequireVerified]);

  const socialItems = useMemo(() => {
    const contactSocials =
      resolvedLinks?.contact?.socials && typeof resolvedLinks.contact.socials === "object"
        ? resolvedLinks.contact.socials
        : {};
    const pickSocial = (key, fallbacks = []) => {
      const direct = resolvedLinks[key] || fallbacks.map((f) => resolvedLinks[f]).find(Boolean);
      if (direct) return { url: direct, visibility: "public" };
      const fromContact = contactSocials[key];
      if (typeof fromContact === "string") return { url: fromContact, visibility: "public" };
      if (fromContact && typeof fromContact === "object") {
        return { url: fromContact.url || fromContact.link || "", visibility: fromContact.visibility || "public" };
      }
      return { url: "", visibility: "public" };
    };

    const socials = [
      { key: "linkedin", label: "LinkedIn", icon: <LinkedInIcon fontSize="small" />, ...pickSocial("linkedin", ["linkedIn"]) },
      { key: "x", label: "X", icon: <TwitterIcon fontSize="small" />, ...pickSocial("x", ["twitter"]) },
      { key: "facebook", label: "Facebook", icon: <FacebookIcon fontSize="small" />, ...pickSocial("facebook") },
      { key: "instagram", label: "Instagram", icon: <InstagramIcon fontSize="small" />, ...pickSocial("instagram") },
      { key: "github", label: "GitHub", icon: <GitHubIcon fontSize="small" />, ...pickSocial("github") },
    ];
    return socials
      .filter((s) => canViewContactVisibility(s.visibility))
      .map((s) => ({ ...s, url: normalizeUrl(s.url) }))
      .filter((s) => s.url);
  }, [resolvedLinks, friendStatus, isMe]);

  const portfolioLinks = useMemo(() => {
    const out = [];
    const seen = new Set();
    const add = (label, url) => {
      const clean = normalizeUrl(url);
      if (!clean) return;
      const key = clean.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      out.push({ label, url: clean });
    };

    add("Portfolio", resolvedLinks.portfolio);
    add("Website", resolvedLinks.website || resolvedLinks.site);

    if (Array.isArray(resolvedLinks.websites)) {
      resolvedLinks.websites.forEach((item) => {
        if (typeof item === "string") add("Website", item);
        else add(item?.label || "Website", item?.url);
      });
    }

    if (Array.isArray(resolvedLinks?.contact?.websites)) {
      resolvedLinks.contact.websites.forEach((item) => {
        if (typeof item === "string") {
          add("Website", item);
          return;
        }
        if (!canViewContactVisibility(item?.visibility)) return;
        add(item?.label || "Website", item?.url);
      });
    }

    return out;
  }, [resolvedLinks, friendStatus, isMe]);

  // --- Helper: Extract visible scheduler ---
  const visibleScheduler = useMemo(() => {
    const scheduler = resolvedLinks?.contact?.scheduler;
    if (!scheduler) return null;

    const schedulerUrl = typeof scheduler === "string"
      ? scheduler
      : scheduler?.url || scheduler?.link || "";
    const schedulerLabel = typeof scheduler === "object"
      ? scheduler?.label || "Schedule a meeting"
      : "Schedule a meeting";
    const schedulerVisibility = typeof scheduler === "object"
      ? getVisibilityValue(scheduler)
      : "public";

    if (!schedulerUrl) return null;
    if (!canViewContactVisibility(schedulerVisibility)) return null;

    return {
      url: normalizeUrl(schedulerUrl),
      label: schedulerLabel
    };
  }, [resolvedLinks, friendStatus, isMe]);

  /* =========================
     Connections popup (friends list)
     ========================= */
  const [connOpen, setConnOpen] = useState(false);
  const [connLoading, setConnLoading] = useState(false);
  const [connections, setConnections] = useState([]);
  const [connQ, setConnQ] = useState("");

  const displayName = (u) =>
    u?.full_name ||                             // like shares list
    u?.name ||                                  // like shares list
    u?.profile?.full_name ||
    [u?.first_name, u?.last_name].filter(Boolean).join(" ").trim() ||
    u?.username ||
    (u?.id ? `User #${u.id}` : "User");

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
      navigate(`/community?view=messages`);
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
      full_name: u?.full_name ?? x?.full_name ?? "",
      name: u?.name ?? x?.name ?? "",
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
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <div className="flex flex-col gap-4 md:gap-6">
          <main className="w-full">
            {loadingBase && <LinearProgress />}

            {!loadingBase && (
              <Stack spacing={2.5}>
                {/* Back Button */}
                <Box sx={{ display: 'flex' }}>
                  <Button
                    startIcon={<ArrowBackRoundedIcon />}
                    onClick={() => {
                      if (onBack) onBack();
                      else navigate("/community?view=members");
                    }}
                    sx={{
                      textTransform: "none",
                      color: "text.primary",
                      fontWeight: 600,
                      minWidth: "auto",
                      px: 1,
                      "&:hover": { bgcolor: "rgba(0,0,0,0.04)" }
                    }}
                  >
                    {viewAsPublic ? "Exit Public View" : "Back to Explore Members"}
                  </Button>
                </Box>

                {/* Header Card */}
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Box className="flex items-center gap-3">
                    <Avatar sx={{ width: 56, height: 56 }} src={pickAvatarUrl(userItem)}>
                      {(fullName || "?").slice(0, 1).toUpperCase()}
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <Typography
                          variant="h6"
                          sx={{ fontWeight: 700 }}
                          className="truncate"
                        >
                          {fullName}
                        </Typography>
                        {userItem?.profile?.kyc_status === "approved" && (
                          <Tooltip title="Verified Member">
                            <VerifiedIcon sx={{ color: "#22d3ee", fontSize: 20 }} />
                          </Tooltip>
                        )}
                      </Box>
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
                    {!isMe && !viewAsPublic && (
                      <Box sx={{ mt: 1.5, display: "flex", justifyContent: "flex-end", ml: "auto", gap: 1 }}>
                        <IconButton
                          size="small"
                          onClick={(e) => setMenuAnchor(e.currentTarget)}
                        >
                          <MoreVertIcon />
                        </IconButton>
                        <Menu
                          anchorEl={menuAnchor}
                          open={Boolean(menuAnchor)}
                          onClose={() => setMenuAnchor(null)}
                        >
                          <MenuItem
                            onClick={() => {
                              setMenuAnchor(null);
                              setReportOpen(true);
                            }}
                          >
                            <FlagIcon fontSize="small" sx={{ mr: 1.5 }} />
                            Report Profile
                          </MenuItem>
                        </Menu>

                        {friendLoading && (
                          <Button variant="outlined" size="small" disabled>Loading…</Button>
                        )}
                        {!friendLoading && friendStatus === "friends" && (
                          <>
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
                          <Stack direction="row" spacing={1}>
                            <Button
                              variant="contained"
                              size="small"
                              color="success"
                              onClick={() => respondToRequest("accept")}
                              disabled={friendSubmitting}
                              sx={{ textTransform: "none", borderRadius: 2 }}
                            >
                              Accept
                            </Button>
                            <Button
                              variant="outlined"
                              size="small"
                              color="error"
                              onClick={() => respondToRequest("decline")}
                              disabled={friendSubmitting}
                              sx={{ textTransform: "none", borderRadius: 2 }}
                            >
                              Decline
                            </Button>
                          </Stack>
                        )}
                        {!friendLoading && friendStatus === "none" && (
                          <Button
                            variant="contained"
                            size="small"
                            onClick={emailBlockedByVerified ? handleStartKYC : sendFriendRequest}
                            disabled={friendSubmitting}
                            sx={{ textTransform: "none", borderRadius: 2 }}
                          >
                            {emailBlockedByVerified
                              ? "Get Verified"
                              : friendSubmitting
                                ? "Sending…"
                                : "Add as Contact"}
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
                      {(!isMe && !viewAsPublic && (friendStatus || "").toLowerCase() !== "friends") ? (
                        <Box sx={{ textAlign: "center", py: 6 }}>
                          <Typography variant="h6" sx={{ mb: 0.5 }}>This account is private</Typography>
                          <Typography variant="body2" color="text.secondary">
                            Add this member as a Contact to see their posts.
                          </Typography>
                          {(friendStatus || "").toLowerCase() === "none" && (
                            <Button
                              variant="contained"
                              size="small"
                              onClick={sendFriendRequest}
                              disabled={friendSubmitting}
                              sx={{ mt: 2, textTransform: "none", borderRadius: 2 }}
                            >
                              {friendSubmitting ? "Sending…" : "Add as Contact"}
                            </Button>
                          )}
                        </Box>
                      ) : postsLoading ? (
                        // Skeletons while posts are loading
                        <Stack spacing={2}>
                          <RichPostSkeleton />
                          <RichPostSkeleton />
                          <RichPostSkeleton />
                        </Stack>
                      ) : posts.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                          No posts yet.
                        </Typography>
                      ) : (
                        <>
                          <Stack spacing={2}>
                            {visiblePosts.map((post) => (
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

                          {posts.length > visiblePostCount && (
                            <Box
                              ref={postsObserverRef}
                              sx={{ py: 2, textAlign: "center", width: "100%" }}
                            >
                              {isLoadingMorePosts && (
                                <Stack spacing={2}>
                                  <RichPostSkeleton />
                                  <RichPostSkeleton />
                                </Stack>
                              )}
                            </Box>
                          )}
                        </>
                      )}
                    </CardContent>
                  )}
                  {tab === 1 && (
                    <CardContent>
                      <Stack spacing={2.5}>
                        {/* About section */}
                        <Section title="About">
                          {/* EMAILS - display ALL public emails */}
                          {visibleEmails.length > 0 && (
                            <Box sx={{ display: "flex", gap: 1, py: 0.5 }}>
                              <Typography variant="subtitle2" color="text.secondary" sx={{ width: 120 }}>
                                Email{visibleEmails.length > 1 ? "s" : ""}:
                              </Typography>
                              <Stack spacing={0.5}>
                                {visibleEmails.map((emailObj, idx) => (
                                  <Box key={idx} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                    <Typography variant="body2">{emailObj.email}</Typography>
                                    {emailObj.type && (
                                      <Chip
                                        label={emailObj.type}
                                        size="small"
                                        sx={{ height: 18, fontSize: 10 }}
                                      />
                                    )}
                                    {emailObj.primary && (
                                      <Chip
                                        label="Primary"
                                        size="small"
                                        color="primary"
                                        sx={{ height: 18, fontSize: 10 }}
                                      />
                                    )}
                                  </Box>
                                ))}
                              </Stack>
                            </Box>
                          )}
                          {visibleEmails.length === 0 && emailVisibilityInfo.anyEmail && (
                            <Box sx={{ display: "flex", gap: 1, py: 0.5 }}>
                              <Typography variant="subtitle2" color="text.secondary" sx={{ width: 120 }}>
                                Email:
                              </Typography>
                              {emailBlockedByVerified ? (
                                <Paper variant="outlined" sx={{ p: 1.25, bgcolor: "#f8fafc", borderColor: "#e2e8f0", flex: 1 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    This member only shares their email with Verified Professionals.
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    Click below to get your Verification Badge.
                                  </Typography>
                                  <Box sx={{ mt: 1 }}>
                                    <Button size="small" variant="contained" onClick={handleStartKYC}>
                                      Get Verified
                                    </Button>
                                  </Box>
                                </Paper>
                              ) : (
                                <Stack spacing={0.5} sx={{ flex: 1 }}>
                                  <Typography variant="body2" color="text.secondary">
                                    {primaryEmailVisibility === "request"
                                      ? "By request"
                                      : primaryEmailVisibility === "contacts_groups"
                                        ? "Contacts & Group Members"
                                        : primaryEmailVisibility === "contacts"
                                          ? "Direct Contacts only"
                                          : "Private"}
                                  </Typography>
                                  {(friendStatus || "").toLowerCase() === "pending_outgoing" && (
                                    <Chip size="small" label="Request sent" sx={{ width: "fit-content" }} />
                                  )}
                                  {canRequestContact && (
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      onClick={sendFriendRequest}
                                      disabled={friendSubmitting}
                                      sx={{ width: "fit-content" }}
                                    >
                                      Request Contact
                                    </Button>
                                  )}
                                </Stack>
                              )}
                            </Box>
                          )}

                          {/* PHONES - display ALL public phones */}
                          {visiblePhones.length > 0 && (
                            <Box sx={{ display: "flex", gap: 1, py: 0.5 }}>
                              <Typography variant="subtitle2" color="text.secondary" sx={{ width: 120 }}>
                                Phone{visiblePhones.length > 1 ? "s" : ""}:
                              </Typography>
                              <Stack spacing={0.5}>
                                {visiblePhones.map((phoneObj, idx) => (
                                  <Box key={idx} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                    <span style={{ fontSize: 18 }}>{getCountryFlag(phoneObj.number)}</span>
                                    <Typography variant="body2">{phoneObj.number}</Typography>
                                    {phoneObj.type && (
                                      <Chip
                                        label={phoneObj.type}
                                        size="small"
                                        sx={{ height: 18, fontSize: 10 }}
                                      />
                                    )}
                                    {phoneObj.primary && (
                                      <Chip
                                        label="Primary"
                                        size="small"
                                        color="primary"
                                        sx={{ height: 18, fontSize: 10 }}
                                      />
                                    )}
                                  </Box>
                                ))}
                              </Stack>
                            </Box>
                          )}
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
                          {visibleLocation && (
                            <Box sx={{ display: "flex", gap: 1, py: 0.5 }}>
                              <Typography variant="subtitle2" color="text.secondary" sx={{ width: 120 }}>
                                Location:
                              </Typography>
                              <Typography variant="body2">
                                {visibleLocation}
                              </Typography>
                            </Box>
                          )}

                          {/* Social Profiles */}
                          {socialItems.length > 0 && (
                            <Box sx={{ display: "flex", gap: 1, py: 0.5 }}>
                              <Typography variant="subtitle2" color="text.secondary" sx={{ width: 120 }}>
                                Social:
                              </Typography>
                              <Stack direction="row" spacing={1} flexWrap="wrap">
                                {socialItems.map((social) => (
                                  <IconButton
                                    key={social.key}
                                    size="small"
                                    component="a"
                                    href={social.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title={social.label}
                                    sx={{ color: "primary.main" }}
                                  >
                                    {social.icon}
                                  </IconButton>
                                ))}
                              </Stack>
                            </Box>
                          )}

                          {/* Scheduler */}
                          {visibleScheduler && (
                            <Box sx={{ display: "flex", gap: 1, py: 0.5 }}>
                              <Typography variant="subtitle2" color="text.secondary" sx={{ width: 120 }}>
                                Schedule:
                              </Typography>
                              <Button
                                size="small"
                                variant="outlined"
                                component="a"
                                href={visibleScheduler.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                startIcon={<EventIcon />}
                                sx={{ textTransform: "none", borderRadius: 2 }}
                              >
                                {visibleScheduler.label}
                              </Button>
                            </Box>
                          )}
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
                                      <Stack component="span" spacing={0.5}>
                                        {e.field_of_study && <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 400 }}>{e.field_of_study}</Typography>}
                                        <Typography variant="caption" color="text.secondary">
                                          {[(e.start_date || "").slice(0, 4), (e.end_date || "").slice(0, 4)].filter(Boolean).join(" - ")}
                                        </Typography>
                                      </Stack>
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
      </Container >

      {/* Connections Dialog */}
      < Dialog open={connOpen} onClose={() => setConnOpen(false)
      } fullWidth maxWidth="sm" >
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
                                if (status === "pending_incoming") {
                                  return (
                                    <Stack direction="row" spacing={0.5}>
                                      <Button
                                        size="small"
                                        variant="contained"
                                        color="success"
                                        disabled={connSubmitting[String(f.id)]}
                                        onClick={() => respondToConnRequest(f.id, "accept")}
                                        sx={{ textTransform: "none", borderRadius: 2, minWidth: 'auto', px: 1 }}
                                      >
                                        Accept
                                      </Button>
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        color="error"
                                        disabled={connSubmitting[String(f.id)]}
                                        onClick={() => respondToConnRequest(f.id, "decline")}
                                        sx={{ textTransform: "none", borderRadius: 2, minWidth: 'auto', px: 1 }}
                                      >
                                        Decline
                                      </Button>
                                    </Stack>
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
      </Dialog >

      <ReportProfileDialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        onSubmit={handleReportProfile}
        loading={reportBusy}
        targetUser={{
          id: userId,
          full_name: fullName,
          username: userItem?.username
        }}
      />
    </div >
  );
}
