// src/pages/community/MyPostsPage.jsx
import * as React from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Avatar,
  AvatarGroup,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Checkbox,
  CircularProgress, // Added for delBusy spinner if not already there, checking imports... yes it is not there, need to add it or use LinearProgress? LiveFeed used CircularProgress. let's add it to imports just in case or use LinearProgress since it is imported on line 22
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  Popover,
  Skeleton,
  Slide,
} from "@mui/material";
import {
  AddRounded as AddRoundedIcon,
  BarChartRounded as BarChartRoundedIcon,
  ChatBubbleOutlineRounded as ChatBubbleOutlineRoundedIcon,
  DeleteOutlineRounded as DeleteOutlineRoundedIcon,
  EditRounded as EditRoundedIcon,
  FavoriteBorderRounded as FavoriteBorderRoundedIcon,
  FavoriteRounded as FavoriteRoundedIcon,
  ImageRounded as ImageRoundedIcon,
  IosShareRounded as IosShareRoundedIcon,
  LinkRounded as LinkRoundedIcon,
  RemoveRounded as RemoveRoundedIcon,
  SendRounded as SendRoundedIcon,
  TextFieldsRounded as TextFieldsRoundedIcon,
  ReplyRounded as ReplyRoundedIcon,
  Search as SearchIcon, // Added
} from "@mui/icons-material";
import KeyboardArrowUpRoundedIcon from "@mui/icons-material/KeyboardArrowUpRounded";

// -----------------------------------------------------------------------------
// 1. API Helpers & Constants
// -----------------------------------------------------------------------------
const API_ROOT = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");

const API_ORIGIN = (() => {
  try {
    const u = new URL(API_ROOT);
    return `${u.protocol}//${u.host}`;
  } catch {
    return "";
  }
})();

function getToken() {
  return (
    localStorage.getItem("access_token") ||
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    ""
  );
}

function authHeader() {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

function timeAgo(date) {
  if (!date) return "";
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function toAbsolute(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  const base = import.meta.env.VITE_MEDIA_BASE_URL || API_ORIGIN || "http://127.0.0.1:8000";
  return `${base.replace(/\/$/, "")}/${url.replace(/^\//, "")}`;
}

// LinkedIn-style reactions for posts
const POST_REACTIONS = [
  { id: "like", emoji: "👍", label: "Like" },
  { id: "intriguing", emoji: "🤔", label: "Intriguing" },
  { id: "spot_on", emoji: "🎯", label: "Spot On" },
  { id: "validated", emoji: "🧠", label: "Validated" },
  { id: "debatable", emoji: "🤷", label: "Debatable" },
];


// -----------------------------------------------------------------------------
// 2. Data Mappers
// -----------------------------------------------------------------------------
function mapFeedItemRowToUiPost(row) {
  const m = row?.metadata || {};
  const communityId = row.community?.id || row.community_id || m.community_id || row.target_object_id || null;
  const type = (m.type || "text").toLowerCase();

  const base = {
    id: row.id,
    created_at: row.created_at || Date.now(),
    type,
    actor_name: row.actor_name || row.actor?.name || "You",
    actor_avatar: toAbsolute(row.actor_avatar || row.actor?.avatar),
    liked_by_me: !!(row.liked_by_me || row.is_liked),
    metrics: {
      likes: Number(row.metrics?.likes || row.like_count || 0),
      comments: Number(row.metrics?.comments || row.comment_count || 0),
      shares: Number(row.metrics?.shares || row.share_count || 0),
    },
    raw_metadata: { ...m, community_id: communityId },
    community_id: communityId,
    target_object_id: row.target_object_id,
    moderation_status: row.moderation_status || m.moderation_status || row.moderationStatus || m.moderationStatus || row.status || m.status || null,
    is_removed: row.is_removed || m.is_removed || (row.moderation_status === "removed") || (m.moderationStatus === "removed") || (m.status === "removed") || (row.status === "removed") || false,
    is_under_review: row.is_under_review || m.is_under_review || (row.moderation_status === "under_review") || (m.moderationStatus === "under_review") || false,
  };

  if (type === "text") return { ...base, content: m.text || "" };
  if (type === "link") return { ...base, content: m.description || m.title || "", link: m.url || "" };
  if (type === "image") return { ...base, content: m.caption || "", images: m.image_url ? [m.image_url] : [] };
  if (type === "poll") return { ...base, content: m.question || "", options: Array.isArray(m.options) ? m.options : [], user_votes: m.user_votes || [] };

  return { ...base, content: m.text || "" };
}

function mapCreateResponseToUiPost(resp) {
  const type = (resp.type || "text").toLowerCase();
  const communityId = resp.community?.id || resp.community_id || (resp.metadata && resp.metadata.community_id) || null;

  const base = {
    id: resp.id,
    created_at: resp.created_at || Date.now(),
    type,
    actor_name: "You",
    metrics: { likes: 0, comments: 0, shares: 0 },
    raw_metadata: { ...(resp.metadata || {}), community_id: communityId, type },
    community_id: communityId,
  };

  if (type === "text") return { ...base, content: resp.text || resp.content || "" };
  if (type === "link") return { ...base, content: resp.description || resp.title || "", link: resp.url || "" };
  if (type === "image") return { ...base, content: resp.caption || "", images: resp.image_url ? [resp.image_url] : [] };
  if (type === "poll") return { ...base, content: resp.question || "", options: resp.options || [] };

  return { ...base, content: "" };
}

// -----------------------------------------------------------------------------
// 3. Sub-Components
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// LinkedIn-style clamp (See more / See less) — preserves newlines
// -----------------------------------------------------------------------------
function ClampedText({ text, maxLines = 5 }) {
  const [expanded, setExpanded] = React.useState(false);
  if (!text) return null;

  // Rough check to avoid "See more" for very tiny texts
  const roughLineCount = (text.match(/\n/g) || []).length + 1;
  const shouldShowToggle = roughLineCount > maxLines || text.length > 280;

  return (
    <Box sx={{ mt: 1 }}>
      <Typography
        variant="body2"
        sx={{
          whiteSpace: "pre-wrap",  // ✅ keep \n and \n\n
          wordBreak: "break-word", // ✅ long URLs/words don’t overflow
          ...(expanded
            ? {}
            : {
              display: "-webkit-box",
              WebkitLineClamp: maxLines,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }),
        }}
      >
        {text}
      </Typography>

      {shouldShowToggle && (
        <Button
          size="small"
          variant="text"
          sx={{ mt: 0.5, px: 0, textTransform: "none" }}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "See less" : "See more"}
        </Button>
      )}
    </Box>
  );
}

function PostComposer({ communityId, onCreate }) {
  const [tab, setTab] = React.useState("text");
  const [content, setContent] = React.useState("");
  const [linkUrl, setLinkUrl] = React.useState("");
  const [images, setImages] = React.useState([]);
  const [files, setFiles] = React.useState([]);
  const [pollOptions, setPollOptions] = React.useState(["", ""]);
  const fileInputRef = React.useRef(null);

  const canSubmit = React.useMemo(() => {
    if (!communityId) return false;
    if (tab === "text") return content.trim().length > 0;
    if (tab === "link") return linkUrl.trim().length > 0;
    if (tab === "image") return files.length > 0;
    if (tab === "poll") return pollOptions.filter((o) => o.trim()).length >= 2 && content.trim().length > 0;
    return false;
  }, [communityId, tab, content, linkUrl, files, pollOptions]);

  const handleImageFiles = async (e) => {
    const picked = Array.from(e.target.files || []).slice(0, 6);
    setFiles(picked);
    const previews = await Promise.all(picked.map(f => new Promise(res => {
      const r = new FileReader();
      r.onload = (ev) => res(ev.target.result);
      r.readAsDataURL(f);
    })));
    setImages(previews);
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    onCreate({
      type: tab,
      content: content,
      url: linkUrl.trim(),
      files,
      options: pollOptions.filter((o) => o.trim()),
    });
    setContent(""); setLinkUrl(""); setImages([]); setFiles([]); setPollOptions(["", ""]);
  };

  return (
    <Stack spacing={2}>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" allowScrollButtonsMobile>
        <Tab icon={<TextFieldsRoundedIcon />} iconPosition="start" value="text" label="Text" />
        <Tab icon={<ImageRoundedIcon />} iconPosition="start" value="image" label="Image" />
        <Tab icon={<LinkRoundedIcon />} iconPosition="start" value="link" label="Link" />
        <Tab icon={<BarChartRoundedIcon />} iconPosition="start" value="poll" label="Poll" />
      </Tabs>
      {tab === "text" && (
        <Stack spacing={1}>
          <TextField fullWidth multiline minRows={3} value={content} onChange={(e) => setContent(e.target.value)} placeholder="What's on your mind?" />
          {content && (
            <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 1.25 }}>
              <Typography variant="caption" color="text.secondary">Preview</Typography>
              <ClampedText text={content} maxLines={5} />
            </Box>
          )}
        </Stack>
      )}
      {tab === "image" && (
        <Stack spacing={2}>
          <TextField fullWidth multiline minRows={2} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Caption (optional)" />
          {content && (
            <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 1.25 }}>
              <Typography variant="caption" color="text.secondary">Preview</Typography>
              <ClampedText text={content} maxLines={5} />
            </Box>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={handleImageFiles} />
          <Button variant="outlined" startIcon={<ImageRoundedIcon />} onClick={() => fileInputRef.current?.click()}>Choose images</Button>
          {images.length > 0 && (
            <Grid container spacing={1}>
              {images.map((src, i) => (
                <Grid key={i} item xs={4}>
                  <img src={src} alt="p" style={{ width: "100%", height: 80, objectFit: "cover", borderRadius: 4 }} />
                </Grid>
              ))}
            </Grid>
          )}
        </Stack>
      )}
      {tab === "link" && (
        <Stack spacing={2}>
          <TextField
            fullWidth
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://..."
            InputProps={{ startAdornment: (<InputAdornment position="start"><LinkRoundedIcon /></InputAdornment>) }}
          />
          <TextField fullWidth multiline minRows={2} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Caption (optional)" />
          {content && (
            <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 1.25 }}>
              <Typography variant="caption" color="text.secondary">Preview</Typography>
              <ClampedText text={content} maxLines={5} />
            </Box>
          )}
        </Stack>
      )}
      {tab === "poll" && <Stack spacing={2}><TextField fullWidth multiline minRows={2} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Ask a question..." />{pollOptions.map((opt, i) => <Stack key={i} direction="row" spacing={1}><TextField fullWidth value={opt} onChange={(e) => { const n = [...pollOptions]; n[i] = e.target.value; setPollOptions(n); }} placeholder={`Option ${i + 1}`} /><IconButton onClick={() => setPollOptions((o) => o.filter((_, x) => x !== i))} disabled={pollOptions.length <= 2}><RemoveRoundedIcon /></IconButton></Stack>)}<Button onClick={() => setPollOptions((o) => [...o, ""])} startIcon={<AddRoundedIcon />} sx={{ alignSelf: "flex-start" }}>Add option</Button></Stack>}
      <Box sx={{ display: "flex", justifyContent: "flex-end" }}><Button variant="contained" endIcon={<SendRoundedIcon />} onClick={handleSubmit} disabled={!canSubmit}>Post</Button></Box>
    </Stack>
  );
}

function PostCard({
  post,
  onReact,          // ⬅️ changed: generic reaction handler
  onComment,
  onShareAction,
  onViewShares,
  onEdit,
  onDelete,
  onVote,
  onOpenLikes,
}) {
  const name = post.actor_name || "You";
  const initial = (name[0] || "U").toUpperCase();
  const photo = post.actor_avatar || "";

  const likersInitial = [];
  const [likers, setLikers] = React.useState(likersInitial);
  const likeCount = Number(post.metrics?.likes || 0);
  const shareCount = Number(post.metrics?.shares || 0);

  // voters dialog state
  const [votersOpen, setVotersOpen] = React.useState(false);
  const [votersLoading, setVotersLoading] = React.useState(false);
  const [votersRows, setVotersRows] = React.useState([]);
  const [votersAnonymous, setVotersAnonymous] = React.useState(false);
  const [votersOption, setVotersOption] = React.useState("");

  const handleOpenVoters = async (opt) => {
    if (!post.id || !opt?.id) return;
    setVotersOpen(true);
    setVotersLoading(true);
    setVotersOption(opt.text || opt.label || "Option");
    setVotersRows([]);
    setVotersAnonymous(false);

    try {
      const url = `${API_ROOT}/activity/feed/polls/options/${opt.id}/votes/`;
      const res = await fetch(url, { headers: { Accept: "application/json", ...authHeader() } });
      if (res.ok) {
        const data = await res.json();
        setVotersAnonymous(!!data.anonymous);
        const rawResults = Array.isArray(data.results) ? data.results : [];
        const rows = rawResults.map(r => {
          const u = r.user || r.voter || r;
          const uId = u.id || u.user_id;
          const uName = u.name || u.full_name || u.username || `User #${uId}`;
          const uAvatar = toAbsolute(u.avatar || u.user_image || u.user_image_url);
          return {
            id: uId,
            name: uName,
            avatar: uAvatar,
            votedAt: r.voted_at || r.created_at
          };
        });
        setVotersRows(rows);
      }
    } catch (e) {
      console.error("Failed to fetch voters", e);
    } finally {
      setVotersLoading(false);
    }
  };

  const handleCloseVoters = () => {
    setVotersOpen(false);
    setVotersRows([]);
  };

  // NEW: my reaction info for UI
  const myReactionId =
    post.my_reaction || (post.liked_by_me ? "like" : null);
  const myReactionDef = POST_REACTIONS.find(
    (r) => r.id === myReactionId
  );
  const likeBtnLabel = myReactionDef ? myReactionDef.label : "Like";
  const likeBtnEmoji = myReactionDef ? myReactionDef.emoji : "👍";
  const hasReaction = !!myReactionId;

  // Popup anchor
  const [anchorEl, setAnchorEl] = React.useState(null);
  const pickerOpen = Boolean(anchorEl);
  const handleOpenPicker = (event) => setAnchorEl(event.currentTarget);
  const handleClosePicker = () => setAnchorEl(null);

  // Helper to handle any user shape
  const normalizeUsers = (payload) => {
    const rows = Array.isArray(payload?.results)
      ? payload.results
      : Array.isArray(payload)
        ? payload
        : [];
    return rows
      .map((r) => {
        let u = r.user || r.actor || r.liker || r.owner || r.profile || r;
        if (!u.id && !u.user_id) u = r;
        const profile = u.profile || u.user_profile || r.profile || {};
        const id = u?.id ?? u?.user_id ?? r.user_id ?? r.id;
        const first = u?.first_name || r.user_first_name || "";
        const last = u?.last_name || r.user_last_name || "";
        let displayName =
          u?.name || u?.full_name || r.user_name || r.user_full_name;
        if (!displayName && (first || last))
          displayName = `${first} ${last}`.trim();
        if (!displayName)
          displayName = u?.username || r.user_username || "User";
        const avatarRaw =
          profile.user_image_url ||
          u.user_image ||
          u.avatar ||
          r.user_image ||
          r.user_avatar ||
          "";
        const reactionId = r.reaction || r.reaction_type || r.kind || null;

        return {
          id,
          name: displayName,
          avatar: toAbsolute(avatarRaw),
          reactionId,
        };

      })
      .filter(Boolean);
  };

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const urls = [
          `${API_ROOT}/engagements/reactions/who-liked/?feed_item=${post.id}&page_size=25`,
        ];
        for (const url of urls) {
          try {
            const r = await fetch(url, {
              headers: { Accept: "application/json", ...authHeader() },
            });
            if (!r.ok) continue;
            const j = await r.json();
            const list = normalizeUsers(j);
            if (!cancelled) setLikers(list);
            if (list.length) break;
          } catch { }
        }
      } catch {
        if (!cancelled) setLikers([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [post.id]);

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



  // Text changed "likes" → "reactions"
  const likeLabel =
    primaryLiker && likeCount > 0
      ? likeCount === 1
        ? `reacted by ${primaryLiker.name}`
        : `reacted by ${primaryLiker.name} and ${othersCount} others`
      : `${(likeCount || 0).toLocaleString()} reactions`;

  const totalVotes =
    post.type === "poll"
      ? (post.options || []).reduce(
        (acc, o) => acc + (o.vote_count || 0),
        0
      )
      : 0;

  const userHasVoted = post.user_votes && post.user_votes.length > 0;

  return (
    <Card variant="outlined" sx={{ borderRadius: 3, mb: 2 }}>
      <CardHeader
        avatar={<Avatar src={photo}>{initial}</Avatar>}
        title={<Typography fontWeight={600}>{name}</Typography>}
        subheader={timeAgo(post.created_at)}
        action={
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="Edit">
              <IconButton
                size="small"
                onClick={() => onEdit(post)}
              >
                <EditRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton
                size="small"
                color="error"
                onClick={() => onDelete(post)}
              >
                <DeleteOutlineRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        }
      />
      {/* Body */}
      <Box sx={{ mb: 2, px: 2 }}>
        {post.is_removed || post.moderation_status === "removed" ? (
          <Typography color="text.secondary" sx={{ fontStyle: "italic", py: 2 }}>
            This content was removed by moderators.
          </Typography>
        ) : (
          <>
            {post.type === "text" && (
              <ClampedText text={post.content} maxLines={5} />
            )}

            {post.type === "link" && post.link && (
              <Button
                size="small"
                href={post.link}
                target="_blank"
                rel="noreferrer"
                sx={{ mt: 1, textTransform: "none" }}
              >
                {post.link}
              </Button>
            )}

            {post.type === "image" && post.images?.length > 0 && (
              <Grid container spacing={1} sx={{ mt: 1 }}>
                {post.images.map((src, i) => (
                  <Grid key={i} item xs={12} sm={6}>
                    <img
                      src={src}
                      alt="post"
                      style={{
                        width: "100%",
                        maxHeight: 300,
                        objectFit: "cover",
                        borderRadius: 8,
                      }}
                    />
                  </Grid>
                ))}
              </Grid>
            )}

            {post.type === "poll" && post.options?.length > 0 && (
              <Box sx={{ mt: 2 }}>
                {post.options.map((opt, i) => {
                  const label =
                    typeof opt === "string"
                      ? opt
                      : opt.text || opt.label || `Option ${i + 1}`;
                  const votes =
                    typeof opt === "object" ? opt.vote_count || 0 : 0;
                  const pct =
                    totalVotes > 0
                      ? Math.round((votes / totalVotes) * 100)
                      : 0;
                  const oid = opt.id || opt.option_id;
                  const hasVotes = votes > 0;
                  return (
                    <Box
                      key={i}
                      sx={{ mb: 1.5 }}
                    >
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        sx={{ mb: 0.5 }}
                      >
                        <Box
                          onClick={() => !userHasVoted && oid && onVote(post.id, oid)}
                          sx={{ cursor: (!userHasVoted && oid) ? "pointer" : "default", flex: 1 }}
                        >
                          <Typography variant="body2">
                            {label}
                          </Typography>
                        </Box>

                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography
                            variant="body2"
                            fontWeight={600}
                          >
                            {pct}%
                          </Typography>
                          {hasVotes && (
                            <Button
                              size="small"
                              variant="outlined"
                              sx={{ py: 0, px: 1, minWidth: "auto", height: 24, fontSize: "0.7rem", textTransform: "none" }}
                              onClick={(e) => { e.stopPropagation(); handleOpenVoters(opt); }}
                            >
                              Voters
                            </Button>
                          )}
                        </Stack>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={pct}
                        sx={{ height: 10, borderRadius: 5, cursor: (!userHasVoted && oid) ? "pointer" : "default" }}
                        onClick={() => !userHasVoted && oid && onVote(post.id, oid)}
                      />
                      <Typography
                        variant="caption"
                        color="text.secondary"
                      >
                        {votes} vote{votes !== 1 ? "s" : ""}
                      </Typography>
                    </Box>
                  );
                })}
                <Typography variant="caption" color="text.secondary">
                  Total: {totalVotes} votes
                </Typography>
              </Box>
            )}
          </>
        )}
      </Box>

      <CardActions sx={{ px: 2, pb: 1, display: "block" }}>
        {(likeCount > 0 || shareCount > 0) && (
          <Box sx={{ pb: 1 }}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
            >
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ cursor: "pointer" }}
                onClick={() => onOpenLikes(post.id)}
              >
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

                <Typography variant="caption" sx={{ ml: 1 }}>
                  {likeLabel}
                </Typography>
              </Stack>


              <Button
                size="small"
                onClick={() => onViewShares(post.id)}
                sx={{
                  textTransform: "none",
                  color: "text.secondary",
                  fontSize: 12,
                }}
              >
                {shareCount} Shares
              </Button>
            </Stack>
          </Box>
        )}

        <Divider sx={{ mb: 1 }} />

        <Stack direction="row" justifyContent="space-between">
          {/* Reaction button with popup */}
          <Button
            size="small"
            onClick={handleOpenPicker}
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

          <Button
            size="small"
            startIcon={<ChatBubbleOutlineRoundedIcon />}
            onClick={() => onComment(post.id)}
          >
            Comment
          </Button>

          <Button
            size="small"
            startIcon={<IosShareRoundedIcon />}
            onClick={() => onShareAction(post.id)}
          >
            Share
          </Button>
        </Stack>

        {/* Popup with reaction emojis, like LinkedIn */}
        <Popover
          open={pickerOpen}
          anchorEl={anchorEl}
          onClose={handleClosePicker}
          anchorOrigin={{
            vertical: "top",
            horizontal: "center",
          }}
          transformOrigin={{
            vertical: "bottom",
            horizontal: "center",
          }}
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
                  onClick={() => {
                    // send selected reaction to parent
                    onReact(post.id, r.id);
                    handleClosePicker();
                  }}
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
      </CardActions>

      {/* Voters Dialog */}
      <Dialog open={votersOpen} onClose={handleCloseVoters} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" component="div">Voters</Typography>
          <Typography variant="subtitle2" color="text.secondary" noWrap>
            For: {votersOption}
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          {votersLoading ? (
            <Stack alignItems="center" py={3}><CircularProgress size={24} /></Stack>
          ) : votersAnonymous ? (
            <Alert severity="info" variant="outlined">
              Anonymous poll — voter list hidden.
            </Alert>
          ) : votersRows.length === 0 ? (
            <Typography color="text.secondary" align="center" py={2}>
              No voters found (or hidden).
            </Typography>
          ) : (
            <List dense disablePadding>
              {votersRows.map((u, idx) => (
                <ListItem key={u.id || idx}>
                  <ListItemAvatar>
                    <Avatar src={u.avatar} alt={u.name} sx={{ width: 32, height: 32 }}>
                      {(u.name || "?").slice(0, 1)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={u.name}
                    secondary={u.votedAt ? new Date(u.votedAt).toLocaleDateString() : null}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseVoters}>Close</Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}


// -----------------------------------------------------------------------------
// 4. Dialogs
// -----------------------------------------------------------------------------

// Transition for dialogs
const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

function CommentsDialog({ open, postId, onClose, isPostOwner }) {
  const [loading, setLoading] = React.useState(false);
  const [comments, setComments] = React.useState([]);
  const [text, setText] = React.useState("");
  const [replyingTo, setReplyingTo] = React.useState(null);
  const [meId, setMeId] = React.useState(null);

  // Delete confirmation state
  const [confirmDelId, setConfirmDelId] = React.useState(null);
  const [delBusy, setDelBusy] = React.useState(false);

  async function getMeId() {
    try { const r = await fetch(`${API_ROOT}/users/me/`, { headers: authHeader() }); const d = await r.json(); return d?.id; } catch { return null; }
  }
  function normalizeUser(u) { if (!u) return { id: null, name: "User", avatar: "" }; const id = u.id || u.user_id; const name = u.name || u.full_name || u.username || "User"; const avatar = toAbsolute(u.user_image || u.avatar || u.user_image_url); return { id, name, avatar }; }
  function normalizeComment(c, currentUserId) { const author = normalizeUser(c.author || c.user); const replies = (c.replies || []).map(r => normalizeComment(r, currentUserId)); return { id: c.id, created: c.created_at, body: c.text || c.body || "", author, likedByMe: !!(c.liked || c.liked_by_me), likeCount: Number(c.like_count || c.likes || 0), canDelete: !!((author.id && currentUserId && author.id === currentUserId) || isPostOwner), replies }; }
  async function fetchComments(pid, uid) { try { const r = await fetch(`${API_ROOT}/engagements/comments/?target_type=activity_feed.feeditem&target_id=${pid}`, { headers: authHeader() }); if (!r.ok) return []; const j = await r.json(); const rootsRaw = j.results || []; const roots = rootsRaw.map(r => ({ ...normalizeComment(r, uid), replies: [] })); await Promise.all(roots.map(async (root) => { try { const rr = await fetch(`${API_ROOT}/engagements/comments/?parent=${root.id}`, { headers: authHeader() }); const jj = await rr.json(); root.replies = (jj.results || []).map(x => normalizeComment(x, uid)); } catch { } })); return roots; } catch { return []; } }

  React.useEffect(() => { let mounted = true; (async () => { if (!open || !postId) return; setLoading(true); const uid = await getMeId(); if (mounted) setMeId(uid); const list = await fetchComments(postId, uid); if (mounted) setComments(list); setLoading(false); })(); return () => { mounted = false; }; }, [open, postId]);

  const handleSubmit = async () => { if (!text.trim()) return; const payload = replyingTo ? { text, parent: replyingTo } : { text, target_type: "activity_feed.feeditem", target_id: postId }; try { await fetch(`${API_ROOT}/engagements/comments/`, { method: "POST", headers: { "Content-Type": "application/json", ...authHeader() }, body: JSON.stringify(payload) }); setText(""); setReplyingTo(null); const list = await fetchComments(postId, meId); setComments(list); } catch { alert("Failed to post"); } };
  // recursive update helper
  function updateCommentInTree(list, targetId, updater) {
    return list.map(c => {
      if (c.id === targetId) return updater(c);
      if (c.replies && c.replies.length) {
        return { ...c, replies: updateCommentInTree(c.replies, targetId, updater) };
      }
      return c;
    });
  }

  const toggleCommentLike = async (cid) => {
    // optimistic
    setComments(prev => updateCommentInTree(prev, cid, c => ({
      ...c,
      likedByMe: !c.likedByMe,
      likeCount: Math.max(0, c.likeCount + (c.likedByMe ? -1 : 1))
    })));

    try {
      await fetch(`${API_ROOT}/engagements/reactions/toggle/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ target_type: "comment", target_id: cid, reaction: "like" })
      });
    } catch {
      // rollback
      setComments(prev => updateCommentInTree(prev, cid, c => ({
        ...c,
        likedByMe: !c.likedByMe,
        likeCount: Math.max(0, c.likeCount + (c.likedByMe ? -1 : 1))
      })));
    }
  };

  // Trigger custom dialog
  const onDelete = async (cid) => {
    setConfirmDelId(cid);
  };

  // Perform actual delete
  const performDelete = async () => {
    if (!confirmDelId) return;
    setDelBusy(true);
    try {
      await fetch(`${API_ROOT}/engagements/comments/${confirmDelId}/`, { method: "DELETE", headers: authHeader() });
      setConfirmDelId(null);
      const list = await fetchComments(postId, meId);
      setComments(list);
    } catch {
      alert("Could not delete comment.");
    } finally {
      setDelBusy(false);
    }
  };

  const CommentItem = ({ c, depth = 0 }) => (
    <Box sx={{ pl: depth * 4, py: 1 }}>
      <Stack direction="row" spacing={1}>
        <Avatar src={c.author.avatar} sx={{ width: 32, height: 32 }} />
        <Box sx={{ flex: 1 }}>
          <Box sx={{ bgcolor: "action.hover", p: 1.5, borderRadius: 2 }}>
            <Typography variant="subtitle2" fontWeight={700}>{c.author.name}</Typography>
            <Typography variant="body2">{c.body}</Typography>
          </Box>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 0.5, ml: 1 }}>
            <Typography variant="caption" color="text.secondary">{timeAgo(c.created)}</Typography>
            <Button size="small"
              startIcon={c.likedByMe ? <FavoriteRoundedIcon fontSize="small" /> : <FavoriteBorderRoundedIcon fontSize="small" />}
              onClick={() => toggleCommentLike(c.id)}
              sx={{ color: c.likedByMe ? "teal" : "inherit" }}
            >
              {c.likeCount}
            </Button>
            <Button size="small" startIcon={<ReplyRoundedIcon fontSize="small" />} onClick={() => setReplyingTo(c.id)}>
              Reply
            </Button>
            {c.canDelete && <Button size="small" color="error" startIcon={<DeleteOutlineRoundedIcon fontSize="small" />} onClick={() => onDelete(c.id)}>Delete</Button>}
          </Stack>
        </Box>
      </Stack>
      {c.replies.map(r => <CommentItem key={r.id} c={r} depth={depth + 1} />)}
    </Box>
  );

  const deleteConfirmationDialog = (
    <Dialog
      open={!!confirmDelId}
      onClose={() => !delBusy && setConfirmDelId(null)}
      TransitionComponent={Transition}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
      sx={{ zIndex: (theme) => theme.zIndex.modal + 1 }}
    >
      <DialogTitle sx={{ pb: 1 }}>Delete Comment?</DialogTitle>
      <DialogContent>
        <DialogContentText color="text.secondary">
          Are you sure you want to delete this comment?
          This action cannot be undone.
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={() => setConfirmDelId(null)}
          disabled={delBusy}
          variant="outlined"
          color="inherit"
          sx={{ borderRadius: 2, textTransform: "none" }}
        >
          Cancel
        </Button>
        <Button
          onClick={performDelete}
          color="error"
          variant="contained"
          disabled={delBusy}
          disableElevation
          sx={{ borderRadius: 2, textTransform: "none" }}
        >
          {delBusy ? "Deleting..." : "Delete"}
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle>Comments</DialogTitle>
        <DialogContent dividers>
          {loading ? <LinearProgress /> : comments.length ? comments.map(c => <CommentItem key={c.id} c={c} />) : <Typography color="text.secondary">No comments yet.</Typography>}
        </DialogContent>
        <DialogActions sx={{ p: 2, display: "block" }}>
          {replyingTo && <Typography variant="caption" display="block" sx={{ mb: 1 }}>Replying... <span style={{ textDecoration: "underline", cursor: "pointer" }} onClick={() => setReplyingTo(null)}>Cancel</span></Typography>}
          <Stack direction="row" spacing={1}>
            <TextField fullWidth size="small" placeholder="Write a comment..." value={text} onChange={e => setText(e.target.value)} />
            <IconButton color="primary" onClick={handleSubmit}><SendRoundedIcon /></IconButton>
          </Stack>
        </DialogActions>
      </Dialog>
      {deleteConfirmationDialog}
    </>
  );
}

function LikesDialog({ open, postId, onClose }) {
  const [users, setUsers] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [activeFilter, setActiveFilter] = React.useState("all");
  React.useEffect(() => {
    if (!open || !postId) return;
    setActiveFilter("all");
    setLoading(true);
    (async () => {
      const endpoints = [
        `${API_ROOT}/engagements/reactions/who-liked/?feed_item=${postId}`,
      ];
      let foundData = false;
      for (const url of endpoints) {
        try {
          const r = await fetch(url, { headers: authHeader() });
          if (!r.ok) continue;
          const d = await r.json();
          const rows = Array.isArray(d?.results) ? d.results : Array.isArray(d) ? d : [];
          if (rows.length === 0) continue;
          const parsed = rows
            .map((r) => {
              // 1) resolve user object
              let u =
                r.user ||
                r.owner ||
                r.liker ||
                r.actor ||
                r.profile ||
                r; // fallback

              const profile = u.profile || r.profile || {};
              const id =
                u.id ??
                r.user_id ??
                r.owner_id ??
                r.actor_id ??
                r.id;

              const first = u.first_name || u.firstName || "";
              const last = u.last_name || u.lastName || "";

              let displayName =
                u.name ||
                u.full_name ||
                r.user_name ||
                r.owner_name ||
                r.actor_name;

              if (!displayName && (first || last)) {
                displayName = `${first} ${last}`.trim();
              }
              if (!displayName) {
                displayName = u.username || `User #${id}`;
              }

              const avatarRaw =
                profile.user_image_url ||
                profile.user_image ||
                u.user_image ||
                u.avatar ||
                r.user_image ||
                r.avatar ||
                "";

              // 2) reaction info from backend
              const reactionId =
                r.reaction || r.reaction_type || r.kind || null;

              const def =
                POST_REACTIONS.find((x) => x.id === reactionId) ||
                POST_REACTIONS[0]; // default to 👍 Like

              return {
                id,
                name: displayName.trim(),
                avatar: toAbsolute(avatarRaw),
                reactionId,
                reactionEmoji: def.emoji,
                reactionLabel: def.label,
              };
            })
            .filter((x) => x.id);
          if (parsed.length > 0) { setUsers(parsed); foundData = true; break; }
        } catch (e) { console.error(e); }
      }
      if (!foundData) setUsers([]); setLoading(false);
    })();
  }, [open, postId]);

  const filteredUsers =
    activeFilter === "all"
      ? users
      : users.filter((u) => u.reactionId === activeFilter);

  const reactionCounts = { all: users.length };
  users.forEach((u) => {
    if (!u.reactionId) return;
    reactionCounts[u.reactionId] = (reactionCounts[u.reactionId] || 0) + 1;
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Reactions</DialogTitle>
      <DialogContent dividers>
        {/* Tabs: All / 👍 / 🤔 / 🎯 / 🧠 / 🤷 */}
        <Box sx={{ mb: 1, borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={activeFilter}
            onChange={(_, v) => setActiveFilter(v)}
            variant="scrollable"
            allowScrollButtonsMobile
          >
            <Tab
              value="all"
              label={`All (${reactionCounts.all || 0})`}
            />
            {POST_REACTIONS.map((r) => (
              <Tab
                key={r.id}
                value={r.id}
                label={
                  <Box
                    sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                  >
                    <span>{r.emoji}</span>
                    <span style={{ fontSize: 12 }}>
                      ({reactionCounts[r.id] || 0})
                    </span>
                  </Box>
                }
              />
            ))}
          </Tabs>
        </Box>
        {loading ? (
          <LinearProgress />
        ) : filteredUsers.length ? (
          <List dense disablePadding>
            {filteredUsers.map((u) => (
              <ListItem key={u.id}>
                <ListItemAvatar>
                  <Avatar src={u.avatar} />
                </ListItemAvatar>
                <ListItemText primary={u.name} secondary={u.headline} />
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
        ) : (
          <Typography p={2} color="text.secondary">
            No reactions yet.
          </Typography>
        )}


      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

function SharesDialog({ open, postId, onClose }) {
  const [users, setUsers] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  React.useEffect(() => {
    if (!open || !postId) return;
    setLoading(true);
    fetch(`${API_ROOT}/engagements/shares/?target_type=activity_feed.feeditem&target_id=${postId}`, { headers: authHeader() })
      .then(r => r.json())
      .then(d => {
        const rows = Array.isArray(d?.results) ? d.results : Array.isArray(d) ? d : [];
        const parsed = rows.map(r => {
          let u = r.user || r.actor || r.sharer;
          if (!u) u = { id: r.user_id ?? r.actor_id ?? r.id, username: r.user_username ?? r.username, first_name: r.user_first_name ?? r.first_name, last_name: r.user_last_name ?? r.last_name, user_image: r.user_image || r.user_avatar || r.avatar, headline: r.user_headline ?? r.headline };
          const p = u.profile || r.profile || {};
          const first = u.first_name || u.firstName || ""; const last = u.last_name || u.lastName || ""; const displayName =
            u.name ||
            u.full_name ||
            (first || last ? `${first} ${last}` : "").trim() ||
            "User";
          const reactionId = r.reaction || r.reaction_type || null;
          const def =
            POST_REACTIONS.find((x) => x.id === reactionId) ||
            POST_REACTIONS[0];

          return {
            id: u.id,
            name: displayName.trim(),
            avatar: toAbsolute(
              u.user_image || u.avatar || p.user_image_url || p.user_image || ""
            ),
            headline: u.headline || u.job_title || p.headline || "",
            reactionId,
            reactionEmoji: def.emoji,
            reactionLabel: def.label,
          };
        }).filter(x => x.id);

        // 🔹 De-duplicate by user id so A appears only once
        const uniqueById = [];
        const seen = new Set();
        for (const u of parsed) {
          if (seen.has(u.id)) continue;
          seen.add(u.id);
          uniqueById.push(u);
        }
        setUsers(uniqueById);
      }).catch(() => setUsers([])).finally(() => setLoading(false));
  }, [open, postId]);
  return (<Dialog open={open} onClose={onClose} fullWidth maxWidth="xs"> <DialogTitle>Shared by</DialogTitle> <DialogContent dividers> {loading ? <LinearProgress /> : users.map(u => (<ListItem key={u.id}> <ListItemAvatar><Avatar src={u.avatar} /></ListItemAvatar> <ListItemText primary={u.name} secondary={u.headline} /> </ListItem>))} {!loading && !users.length && <Typography p={2} color="text.secondary">No shares yet.</Typography>} </DialogContent> <DialogActions><Button onClick={onClose}>Close</Button></DialogActions> </Dialog>);
}

// --- NEW COMPONENT: Share To Friend Dialog ---
function ShareToFriendDialog({ open, onClose, postId }) {
  const [friends, setFriends] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [selected, setSelected] = React.useState([]);
  const [search, setSearch] = React.useState("");
  const [sending, setSending] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setLoading(true);
    // Try multiple friend endpoints
    const endpoints = [`${API_ROOT}/friends/`, `${API_ROOT}/relationships/friends/`, `${API_ROOT}/users/friends/`];
    let found = false;
    (async () => {
      for (const url of endpoints) {
        try {
          const res = await fetch(url, { headers: authHeader() });
          if (!res.ok) continue;
          const data = await res.json();
          const rows = Array.isArray(data) ? data : (data.results || []);
          if (rows.length > 0) {
            const clean = rows.map(r => {
              // Normalize friend object
              const u = r.friend || r.user || r;
              const img = u.avatar || u.user_image || u.user_image_url || "";
              const first = u.first_name || u.firstName || "";
              const last = u.last_name || u.lastName || "";
              const displayName =
                u.name ||
                u.full_name ||
                (first || last ? `${first} ${last}` : "").trim() ||
                "Friend";
              return {
                id: u.id,
                name: displayName,
                avatar: toAbsolute(img),
                headline: u.headline || u.bio || ""
              }
            });
            setFriends(clean);
            found = true;
            break;
          }
        } catch { }
      }
      if (!found) setFriends([]);
      setLoading(false);
    })();
  }, [open]);

  const filtered = friends.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));

  const handleToggle = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSend = async () => {
    if (selected.length === 0) return;
    setSending(true);
    try {
      // Generic share endpoint - assumes backend handles creating activity or message
      await fetch(`${API_ROOT}/engagements/shares/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({
          target_type: "activity_feed.feeditem",
          target_id: postId,
          user_ids: selected // Sending array of user IDs
        })
      });
      onClose();
      setSelected([]);
    } catch (e) {
      alert("Shared (mock): Verify your backend /api/engagements/shares/ endpoint accepts user_ids.");
      onClose();
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Share with Contacts</DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        <Box sx={{ p: 2, pb: 1 }}>
          <TextField
            fullWidth size="small" placeholder="Search friends..."
            value={search} onChange={e => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          />
        </Box>
        {loading ? <LinearProgress /> : (
          <List sx={{ height: 300, overflow: 'auto' }}>
            {filtered.length === 0 && <Typography p={2} align="center" color="text.secondary">No friends found.</Typography>}
            {filtered.map(f => (
              <ListItem key={f.id} onClick={() => handleToggle(f.id)}>
                <ListItemAvatar><Avatar src={f.avatar} /></ListItemAvatar>
                <ListItemText primary={f.name} secondary={f.headline} />
                <ListItemSecondaryAction>
                  <Checkbox edge="end" checked={selected.includes(f.id)} onChange={() => handleToggle(f.id)} />
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSend} disabled={sending || selected.length === 0}>
          {sending ? "Sharing..." : `Share (${selected.length})`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function PostEditDialog({ open, post, onClose, onSaved }) { /* ... (unchanged) ... */
  const [saving, setSaving] = React.useState(false);
  const type = post?.type || "text";
  const [textContent, setTextContent] = React.useState(post?.content || "");
  const [linkUrl, setLinkUrl] = React.useState(post?.link || "");
  const [imageCaption, setImageCaption] = React.useState(post?.content || "");
  const [imageFile, setImageFile] = React.useState(null);
  const [pollOptions, setPollOptions] = React.useState(post?.type === "poll" ? post.options?.map((o) => (typeof o === "string" ? o : o.text || o.label || "")) || ["", ""] : ["", ""]);
  React.useEffect(() => { if (!open || !post) return; const t = post.type || "text"; setTextContent(post.content || ""); setImageCaption(post.content || ""); setLinkUrl(post.link || ""); if (t === "poll") { setPollOptions(post.options?.map((o) => (typeof o === "string" ? o : o.text || o.label || "")) || ["", ""]); } else { setPollOptions(["", ""]); } setImageFile(null); }, [open, post]);
  const handleSave = async () => { if (!post) return; setSaving(true); let options = { method: "PATCH", headers: { ...authHeader() } }; let body; let url; try { if (type === "poll") { const pollId = post.raw_metadata?.poll_id; if (!pollId) throw new Error("Missing poll_id"); url = `${API_ROOT}/activity/feed/polls/${pollId}/`; const validOptions = pollOptions.map((o) => o.trim()).filter(Boolean); if (!textContent.trim() || validOptions.length < 2) { alert("Poll must have a question and at least 2 options."); setSaving(false); return; } options.headers["Content-Type"] = "application/json"; body = JSON.stringify({ question: textContent, options: validOptions }); } else { const communityId = post.raw_metadata?.community_id || post.community_id; if (!communityId) throw new Error("Missing community id"); url = `${API_ROOT}/communities/${communityId}/posts/${post.id}/edit/`; if (type === "text") { options.headers["Content-Type"] = "application/json"; body = JSON.stringify({ content: textContent }); } else if (type === "link") { options.headers["Content-Type"] = "application/json"; body = JSON.stringify({ url: linkUrl, description: textContent }); } else if (type === "image") { const fd = new FormData(); fd.append("caption", imageCaption || ""); if (imageFile) fd.append("image", imageFile); body = fd; } } options.body = body; const res = await fetch(url, options); if (!res.ok) throw new Error("Update failed"); const data = await res.json(); let updated = { ...post }; if (type === "poll") { updated.content = data.question; updated.options = data.options; } else { const meta = data.metadata || post.raw_metadata || {}; if (type === "text") updated.content = meta.text || textContent; if (type === "link") { updated.content = meta.description; updated.link = meta.url; } if (type === "image") updated.content = meta.caption; } onSaved(updated); onClose(); } catch (e) { alert("Failed to update post: " + e.message); } finally { setSaving(false); } };
  const renderBody = () => {
    if (type === "poll") return <><TextField fullWidth multiline minRows={3} label="Question" value={textContent} onChange={(e) => setTextContent(e.target.value)} sx={{ mb: 2 }} /><Stack spacing={1}><Typography variant="subtitle2">Options</Typography>{pollOptions.map((opt, i) => (<Stack key={i} direction="row" spacing={1}><TextField fullWidth size="small" value={opt} onChange={(e) => { const n = [...pollOptions]; n[i] = e.target.value; setPollOptions(n); }} /><IconButton size="small" onClick={() => setPollOptions((o) => o.filter((_, x) => x !== i))} disabled={pollOptions.length <= 2}><RemoveRoundedIcon fontSize="small" /></IconButton></Stack>))}<Button startIcon={<AddRoundedIcon />} onClick={() => setPollOptions((o) => [...o, ""])} size="small" sx={{ alignSelf: "flex-start" }}>Add Option</Button></Stack></>; if (type === "link") return <>
      <TextField fullWidth label="Link URL" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} sx={{ mb: 2 }} />
      <TextField fullWidth multiline minRows={3} label="Description" value={textContent} onChange={e => setTextContent(e.target.value)} />
      {textContent && (
        <Box sx={{ mt: 1, border: "1px solid", borderColor: "divider", borderRadius: 2, p: 1.25 }}>
          <Typography variant="caption" color="text.secondary">Preview</Typography>
          <ClampedText text={textContent} maxLines={5} />
        </Box>
      )}
    </>; if (type === "image") return <Stack spacing={2}>
      <TextField fullWidth multiline minRows={3} label="Caption" value={imageCaption} onChange={e => setImageCaption(e.target.value)} />
      {imageCaption && (
        <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 1.25 }}>
          <Typography variant="caption" color="text.secondary">Preview</Typography>
          <ClampedText text={imageCaption} maxLines={5} />
        </Box>
      )}
      <Button variant="outlined" component="label">Change image<input hidden type="file" accept="image/*" onChange={e => setImageFile(e.target.files[0])} /></Button>
    </Stack>; return <>
      <TextField fullWidth multiline minRows={3} label="Content" value={textContent} onChange={e => setTextContent(e.target.value)} />
      {textContent && (
        <Box sx={{ mt: 1, border: "1px solid", borderColor: "divider", borderRadius: 2, p: 1.25 }}>
          <Typography variant="caption" color="text.secondary">Preview</Typography>
          <ClampedText text={textContent} maxLines={5} />
        </Box>
      )}
    </>;
  };
  return <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm"><DialogTitle>Edit Post</DialogTitle><DialogContent dividers>{renderBody()}</DialogContent><DialogActions><Button onClick={onClose}>Cancel</Button><Button variant="contained" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button></DialogActions></Dialog>;
}

function PostDeleteConfirm({ open, post, onClose, onDeleted }) {
  const [busy, setBusy] = React.useState(false);
  const handleDelete = async () => { setBusy(true); let url; if (post.type === "poll") url = `${API_ROOT}/activity/feed/${post.id}/poll/delete/`; else { const communityId = post.raw_metadata?.community_id || post.community_id; url = `${API_ROOT}/communities/${communityId}/posts/${post.id}/delete/`; } try { const res = await fetch(url, { method: "DELETE", headers: authHeader() }); if (res.ok || res.status === 204) { onDeleted(post.id); onClose(); return; } throw new Error("Delete failed"); } catch { alert("Could not delete post."); } finally { setBusy(false); } };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      TransitionComponent={Transition}
      keepMounted
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle sx={{ pb: 1 }}>Delete Post?</DialogTitle>
      <DialogContent>
        <DialogContentText color="text.secondary">
          Are you sure you want to delete this post? This action cannot be undone.
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          color="inherit"
          sx={{ borderRadius: 2, textTransform: "none" }}
        >
          Cancel
        </Button>
        <Button
          color="error"
          variant="contained"
          onClick={handleDelete}
          disabled={busy}
          disableElevation
          sx={{ borderRadius: 2, textTransform: "none" }}
        >
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function PostSkeleton() {
  return (
    <Card
      variant="outlined"
      sx={{ borderRadius: 3, mb: 2 }}
    >
      {/* Header skeleton */}
      <CardHeader
        avatar={<Skeleton variant="circular" width={40} height={40} />}
        title={<Skeleton variant="text" width="40%" />}
        subheader={<Skeleton variant="text" width="20%" />}
      />

      {/* Body skeleton */}
      <CardContent>
        <Skeleton
          variant="rectangular"
          height={120}
          sx={{ borderRadius: 2, mb: 1.5 }}
        />
        <Skeleton variant="text" width="90%" />
        <Skeleton variant="text" width="80%" />
        <Skeleton variant="text" width="50%" />
      </CardContent>

      {/* Footer skeleton (buttons) */}
      <CardActions sx={{ px: 2, pb: 2 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          sx={{ width: "100%" }}
        >
          <Skeleton variant="rounded" width={60} height={30} />
          <Skeleton variant="rounded" width={60} height={30} />
          <Skeleton variant="rounded" width={60} height={30} />
        </Stack>
      </CardActions>
    </Card>
  );
}


// -----------------------------------------------------------------------------
// 5. Main Page Component
// -----------------------------------------------------------------------------
export default function MyPostsPage() {
  const [posts, setPosts] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [me, setMe] = React.useState(null);
  const [myCommunityId, setMyCommunityId] = React.useState(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editObj, setEditObj] = React.useState(null);
  const [deleteObj, setDeleteObj] = React.useState(null);
  const [commentId, setCommentId] = React.useState(null);
  const [likesId, setLikesId] = React.useState(null);
  const [sharesId, setSharesId] = React.useState(null);
  const [shareActionPostId, setShareActionPostId] = React.useState(null);

  const [visibleCount, setVisibleCount] = React.useState(4);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const observerTarget = React.useRef(null);                      // intersection trigger at bottom
  const [showScrollTop, setShowScrollTop] = React.useState(false);

  React.useEffect(() => {
    // Whenever posts list updates (first load / refresh),
    // ensure we start from first 4
    if (posts.length > 0) {
      setVisibleCount(4);
    }
  }, [posts.length]);



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


  React.useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const meRes = await fetch(`${API_ROOT}/users/me/`, { headers: authHeader() });
        if (meRes.ok) setMe(await meRes.json());

        const postsRes = await fetch(`${API_ROOT}/activity/feed/posts/me/`, { headers: authHeader() });
        if (postsRes.ok) {
          const data = await postsRes.json();
          const rows = Array.isArray(data.results) ? data.results : Array.isArray(data) ? data : [];
          const uiPosts = rows.map(mapFeedItemRowToUiPost);
          setPosts(uiPosts);

          const ids = uiPosts.map(p => p.id).join(",");
          if (ids) {
            const metricsRes = await fetch(`${API_ROOT}/engagements/metrics/?target_type=activity_feed.feeditem&ids=${ids}`, { headers: authHeader() });
            if (metricsRes.ok) {
              const metricsData = await metricsRes.json();
              const metricsMap = metricsData.results || metricsData;
              const hydrated = uiPosts.map((p) => {
                const m = Array.isArray(metricsMap)
                  ? metricsMap.find((x) => String(x.id) === String(p.id))
                  : metricsMap[String(p.id)];
                if (!m) return p;

                // try to read your reaction from metrics (adjust field name to your API)
                const apiUserReaction =
                  m.user_reaction || m.reaction || null;

                const likedBy =
                  m.user_has_liked ?? p.liked_by_me ?? !!apiUserReaction;

                const myReaction =
                  apiUserReaction || (likedBy ? "like" : null);

                return {
                  ...p,
                  liked_by_me: likedBy,
                  my_reaction: myReaction,
                  metrics: {
                    likes: Number(m.likes ?? m.like_count ?? p.metrics.likes),
                    comments: Number(
                      m.comments ?? m.comment_count ?? p.metrics.comments
                    ),
                    shares: Number(
                      m.shares ?? m.share_count ?? p.metrics.shares
                    ),
                  },
                };
              });
              setPosts(hydrated);
            }
          }
        }
        const commsRes = await fetch(`${API_ROOT}/communities/`, { headers: authHeader() });
        if (commsRes.ok) {
          const comms = await commsRes.json();
          const list = comms.results || comms;
          if (list.length) setMyCommunityId(list[0].id);
        }
      } catch (e) { console.error(e); } finally { setLoading(false); }
    }
    init();
  }, []);

  const handleCreate = async (draft) => {
    if (!myCommunityId) { alert("No community context loaded."); return; }
    try {
      if (draft.type === "poll") {
        const pollRes = await fetch(`${API_ROOT}/activity/feed/polls/create/`, {
          method: "POST", headers: { "Content-Type": "application/json", ...authHeader() }, body: JSON.stringify({ question: draft.content, options: draft.options, community_id: myCommunityId }),
        });
        if (!pollRes.ok) throw new Error("Poll creation failed");
        const pollData = await pollRes.json();
        const uiPost = {
          id: pollData.feed_item_id, type: "poll", content: pollData.poll.question, options: pollData.poll.options, created_at: new Date().toISOString(), actor_name: "You", actor_avatar: me?.avatar || "",
          metrics: { likes: 0, comments: 0, shares: 0 }, raw_metadata: { type: "poll", poll_id: pollData.poll.id, community_id: myCommunityId }, community_id: myCommunityId,
        };
        setPosts((prev) => [uiPost, ...prev]); setCreateOpen(false); return;
      }
      const fd = new FormData(); fd.append("type", draft.type); fd.append("visibility", "friends");
      if (draft.type === "text") fd.append("content", draft.content);
      else if (draft.type === "link") { fd.append("url", draft.url); fd.append("description", draft.content); }
      else if (draft.type === "image") { if (draft.content) fd.append("caption", draft.content); if (draft.files?.[0]) fd.append("image", draft.files[0]); }
      const res = await fetch(`${API_ROOT}/communities/${myCommunityId}/posts/create/`, { method: "POST", headers: authHeader(), body: fd });
      if (!res.ok) throw new Error("Create failed");
      const data = await res.json();
      const uiPost = mapCreateResponseToUiPost({ ...data, community_id: myCommunityId });
      setPosts((prev) => [uiPost, ...prev]); setCreateOpen(false);
    } catch (e) { alert("Failed to create post. " + e.message); }
  };

  const handleReact = async (id, reactionId) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;

        const prevReaction = p.my_reaction || (p.liked_by_me ? "like" : null);
        const isSame = prevReaction === reactionId;

        // Decide how total count changes
        let delta = 0;
        if (!prevReaction && reactionId) delta = 1;        // first time react
        else if (prevReaction && !reactionId) delta = -1;  // remove reaction
        else if (prevReaction && reactionId && isSame)
          delta = -1;                                      // toggle off same reaction
        // else switching reaction: keep same total

        const newReaction = isSame ? null : reactionId;

        return {
          ...p,
          my_reaction: newReaction,
          liked_by_me: !!newReaction,
          metrics: {
            ...p.metrics,
            likes: Math.max(
              0,
              (p.metrics.likes || 0) + delta
            ),
          },
        };
      })
    );

    try {
      await fetch(`${API_ROOT}/engagements/reactions/toggle/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeader(),
        },
        body: JSON.stringify({
          target_type: "activity_feed.feeditem",
          target_id: id,
          reaction: reactionId, // "like" / "intriguing" / ...
        }),
      });
    } catch (e) {
      console.error(e);
    }
  };


  const handleVote = async (postId, optionId) => {
    setPosts((prev) => prev.map((p) => {
      if (p.id !== postId) return p;
      return { ...p, options: p.options.map((o) => (o.id === optionId || o.option_id === optionId ? { ...o, vote_count: (o.vote_count || 0) + 1 } : o)) };
    }));
    try {
      await fetch(`${API_ROOT}/activity/feed/${postId}/poll/vote/`, {
        method: "POST", headers: { "Content-Type": "application/json", ...authHeader() }, body: JSON.stringify({ option_ids: [optionId] }),
      });
    } catch { }
  };

  React.useEffect(() => {
    if (!observerTarget.current) return;

    const target = observerTarget.current;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (
          entry.isIntersecting &&
          !loading &&
          !isLoadingMore &&
          posts.length > visibleCount
        ) {
          // Show skeleton while we "load" next 4 posts
          setIsLoadingMore(true);

          // Small delay just for visual effect (like API load)
          setTimeout(() => {
            setVisibleCount((prev) =>
              Math.min(prev + 4, posts.length)
            );
            setIsLoadingMore(false);
          }, 600);
        }
      },
      { threshold: 0.5 } // trigger when ~50% visible
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [loading, isLoadingMore, posts.length, visibleCount]);

  const visiblePosts = React.useMemo(
    () => posts.slice(0, visibleCount),
    [posts, visibleCount]
  );


  return (
    <Box sx={{ width: "100%", pl: 0, pt: 0, pr: 1, pb: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4">My Posts</Typography>
        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setCreateOpen(true)}>Create Post</Button>
      </Stack>

      {loading ? (
        // 🔹 Initial loading → show 4 skeleton cards instead of spinner
        <>
          <PostSkeleton />
          <PostSkeleton />
          <PostSkeleton />
          <PostSkeleton />
        </>
      ) : (
        <>
          {posts.length === 0 && (
            <Box sx={{ textAlign: "center", py: 5, color: "text.secondary" }}>
              You haven&apos;t posted anything yet.
            </Box>
          )}

          {visiblePosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onReact={handleReact}
              onComment={setCommentId}
              onShareAction={setShareActionPostId}
              onViewShares={setSharesId}
              onEdit={setEditObj}
              onDelete={setDeleteObj}
              onVote={handleVote}
              onOpenLikes={setLikesId}
            />
          ))}
        </>
      )}

      {/* Infinite-scroll trigger + bottom skeleton (like Live Feed) */}
      {posts.length > visibleCount && (
        <Box
          ref={observerTarget}
          sx={{ py: 2, textAlign: "center", width: "100%" }}
        >
          {isLoadingMore && (
            <>
              <PostSkeleton />
              <PostSkeleton />
            </>
          )}
        </Box>
      )}

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Create Post</DialogTitle><DialogContent><PostComposer communityId={myCommunityId} onCreate={handleCreate} /></DialogContent>
      </Dialog>
      {editObj && <PostEditDialog open={!!editObj} post={editObj} onClose={() => setEditObj(null)} onSaved={(updated) => setPosts((p) => p.map((x) => (x.id === updated.id ? updated : x)))} />}
      {deleteObj && <PostDeleteConfirm open={!!deleteObj} post={deleteObj} onClose={() => setDeleteObj(null)} onDeleted={(id) => setPosts((p) => p.filter((x) => x.id !== id))} />}
      <CommentsDialog open={!!commentId} postId={commentId} onClose={() => setCommentId(null)} isPostOwner={true} />
      <LikesDialog open={!!likesId} postId={likesId} onClose={() => setLikesId(null)} />
      <SharesDialog open={!!sharesId} postId={sharesId} onClose={() => setSharesId(null)} />

      {/* The New Share-To-Friend Dialog */}
      <ShareToFriendDialog
        open={!!shareActionPostId}
        postId={shareActionPostId}
        onClose={() => setShareActionPostId(null)}
      />
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
    </Box>
  );
}