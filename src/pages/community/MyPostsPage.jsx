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
  Dialog,
  DialogActions,
  DialogContent,
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
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
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
} from "@mui/icons-material";

// -----------------------------------------------------------------------------
// 1. API Helpers & Constants
// -----------------------------------------------------------------------------
const API_ROOT = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");

// Derive the backend origin from API_ROOT
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
    localStorage.getItem("token") ||
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

// -----------------------------------------------------------------------------
// 2. Data Mappers
// -----------------------------------------------------------------------------
function mapFeedItemRowToUiPost(row) {
  const m = row?.metadata || {};

  const communityId =
    row.community?.id ||
    row.community_id ||
    m.community_id ||
    row.target_object_id ||
    null;

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
  };

  if (type === "text") return { ...base, content: m.text || "" };
  if (type === "link") return { ...base, content: m.description || m.title || "", link: m.url || "" };
  if (type === "image") return { ...base, content: m.caption || "", images: m.image_url ? [m.image_url] : [] };
  if (type === "poll") return { ...base, content: m.question || "", options: Array.isArray(m.options) ? m.options : [] };

  return { ...base, content: m.text || "" };
}

function mapCreateResponseToUiPost(resp) {
  const type = (resp.type || "text").toLowerCase();

  const communityId =
    resp.community?.id ||
    resp.community_id ||
    (resp.metadata && resp.metadata.community_id) ||
    null;

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
    if (tab === "poll")
      return (
        pollOptions.filter((o) => o.trim()).length >= 2 &&
        content.trim().length > 0
      );
    return false;
  }, [communityId, tab, content, linkUrl, files, pollOptions]);

  const handleImageFiles = async (e) => {
    const picked = Array.from(e.target.files || []).slice(0, 6);
    setFiles(picked);
    const previews = await Promise.all(
      picked.map(
        (f) =>
          new Promise((res) => {
            const r = new FileReader();
            r.onload = (ev) => res(ev.target.result);
            r.readAsDataURL(f);
          })
      )
    );
    setImages(previews);
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    onCreate({
      type: tab,
      content: content.trim(),
      url: linkUrl.trim(),
      files,
      options: pollOptions.filter((o) => o.trim()),
    });
    setContent("");
    setLinkUrl("");
    setImages([]);
    setFiles([]);
    setPollOptions(["", ""]);
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
        <TextField
          fullWidth multiline minRows={3}
          value={content} onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind?"
        />
      )}

      {tab === "image" && (
        <Stack spacing={2}>
          <TextField
            fullWidth multiline minRows={2}
            value={content} onChange={(e) => setContent(e.target.value)}
            placeholder="Caption (optional)"
          />
          <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={handleImageFiles} />
          <Button variant="outlined" startIcon={<ImageRoundedIcon />} onClick={() => fileInputRef.current?.click()}>
            Choose images
          </Button>
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
            fullWidth value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://..."
            InputProps={{ startAdornment: (<InputAdornment position="start"><LinkRoundedIcon /></InputAdornment>) }}
          />
          <TextField
            fullWidth multiline minRows={2}
            value={content} onChange={(e) => setContent(e.target.value)}
            placeholder="Caption (optional)"
          />
        </Stack>
      )}

      {tab === "poll" && (
        <Stack spacing={2}>
          <TextField
            fullWidth multiline minRows={2}
            value={content} onChange={(e) => setContent(e.target.value)}
            placeholder="Ask a question..."
          />
          {pollOptions.map((opt, i) => (
            <Stack key={i} direction="row" spacing={1}>
              <TextField
                fullWidth value={opt}
                onChange={(e) => {
                  const n = [...pollOptions];
                  n[i] = e.target.value;
                  setPollOptions(n);
                }}
                placeholder={`Option ${i + 1}`}
              />
              <IconButton
                onClick={() => setPollOptions((o) => o.filter((_, x) => x !== i))}
                disabled={pollOptions.length <= 2}
              >
                <RemoveRoundedIcon />
              </IconButton>
            </Stack>
          ))}
          <Button
            onClick={() => setPollOptions((o) => [...o, ""])}
            startIcon={<AddRoundedIcon />}
            sx={{ alignSelf: "flex-start" }}
          >
            Add option
          </Button>
        </Stack>
      )}

      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <Button variant="contained" endIcon={<SendRoundedIcon />} onClick={handleSubmit} disabled={!canSubmit}>
          Post
        </Button>
      </Box>
    </Stack>
  );
}

// -----------------------------------------------------------------------------
// PostCard: Enhanced logic for likes/shares display
// -----------------------------------------------------------------------------
function PostCard({
  post,
  onLike,
  onComment,
  onShare,
  onEdit,
  onDelete,
  onVote,
  onOpenLikes,
}) {
  const name = post.actor_name || "You";
  const initial = (name[0] || "U").toUpperCase();
  const photo = post.actor_avatar || "";

  // -- Likers logic (Avatar preview) --
  const [likers, setLikers] = React.useState([]);
  // Use hydrated metrics from the post object
  const likeCount = Number(post.metrics?.likes || 0);
  const shareCount = Number(post.metrics?.shares || 0);

  const normalizeUsers = (payload) => {
    // Handle various API return shapes
    const rows = Array.isArray(payload?.results) ? payload.results : Array.isArray(payload) ? payload : [];
    return rows.map((r) => {
      const u = r.user || r.actor || r.liker || r.owner || r.profile || r;
      const profile = u.profile || u.user_profile || r.profile || {};
      const id = u?.id ?? u?.user_id ?? r.user_id ?? r.id;
      const first = u?.first_name || "";
      const last = u?.last_name || "";
      const name = u?.name || u?.full_name || `${first} ${last}`.trim() || u?.username || "User";
      const avatarRaw = profile.user_image_url || u.user_image || u.avatar || "";
      return { id, name, avatar: toAbsolute(avatarRaw) };
    }).filter(Boolean);
  };

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Fetch a few likers for the preview strip
        const urls = [
          `${API_ROOT}/engagements/reactions/?reaction=like&target_type=activity_feed.feeditem&target_id=${post.id}&page_size=5`,
          `${API_ROOT}/engagements/reactions/who-liked/?feed_item=${post.id}&page_size=5`,
        ];
        for (const url of urls) {
          const r = await fetch(url, { headers: { Accept: "application/json", ...authHeader() } });
          if (!r.ok) continue;
          const j = await r.json();
          const list = normalizeUsers(j);
          if (!cancelled) setLikers(list);
          if (list.length) break;
        }
      } catch { if (!cancelled) setLikers([]); }
    })();
    return () => { cancelled = true; };
  }, [post.id]);

  const primaryLiker = likers?.[0] || null;
  const othersCount = Math.max(0, (likeCount || 0) - 1);
  const likeLabel =
    primaryLiker && likeCount > 0
      ? likeCount === 1
        ? `liked by ${primaryLiker.name}`
        : `liked by ${primaryLiker.name} and ${othersCount} others`
      : `${(likeCount || 0).toLocaleString()} likes`;

  // -- Poll Calc --
  const totalVotes = post.type === "poll"
    ? (post.options || []).reduce((acc, o) => acc + (o.vote_count || 0), 0)
    : 0;

  return (
    <Card variant="outlined" sx={{ borderRadius: 3, mb: 2 }}>
      <CardHeader
        avatar={<Avatar src={photo}>{initial}</Avatar>}
        title={<Typography fontWeight={600}>{name}</Typography>}
        subheader={timeAgo(post.created_at)}
        action={
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="Edit">
              <IconButton size="small" onClick={() => onEdit(post)}>
                <EditRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton size="small" color="error" onClick={() => onDelete(post)}>
                <DeleteOutlineRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        }
      />
      <CardContent sx={{ pt: 0 }}>
        {post.content && <Typography sx={{ whiteSpace: "pre-wrap" }}>{post.content}</Typography>}

        {post.type === "link" && post.link && (
          <Button size="small" href={post.link} target="_blank" rel="noreferrer" sx={{ mt: 1, textTransform: "none" }}>
            {post.link}
          </Button>
        )}

        {post.type === "image" && post.images?.length > 0 && (
          <Grid container spacing={1} sx={{ mt: 1 }}>
            {post.images.map((src, i) => (
              <Grid key={i} item xs={12} sm={6}>
                <img
                  src={src} alt="post"
                  style={{ width: "100%", maxHeight: 300, objectFit: "cover", borderRadius: 8 }}
                />
              </Grid>
            ))}
          </Grid>
        )}

        {post.type === "poll" && post.options?.length > 0 && (
          <Box sx={{ mt: 2 }}>
            {post.options.map((opt, i) => {
              const label = typeof opt === "string" ? opt : opt.text || opt.label || `Option ${i + 1}`;
              const votes = typeof opt === "object" ? opt.vote_count || 0 : 0;
              const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
              const oid = opt.id || opt.option_id;

              return (
                <Box
                  key={i} sx={{ mb: 1.5, cursor: oid ? "pointer" : "default" }}
                  onClick={() => oid && onVote(post.id, oid)}
                >
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                    <Typography variant="body2">{label}</Typography>
                    <Typography variant="body2" fontWeight={600}>{pct}%</Typography>
                  </Stack>
                  <LinearProgress variant="determinate" value={pct} sx={{ height: 10, borderRadius: 5 }} />
                  <Typography variant="caption" color="text.secondary">
                    {votes} vote{votes !== 1 ? "s" : ""}
                  </Typography>
                </Box>
              );
            })}
            <Typography variant="caption" color="text.secondary">Total: {totalVotes} votes</Typography>
          </Box>
        )}
      </CardContent>

      <CardActions sx={{ px: 2, pb: 1, display: "block" }}>
        {/* Metric Strip */}
        <Box sx={{ pb: 1 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            {/* Left: Likers Preview */}
            <Stack direction="row" spacing={1} alignItems="center" sx={{ cursor: "pointer" }} onClick={() => onOpenLikes(post.id)}>
              <AvatarGroup max={3} sx={{ "& .MuiAvatar-root": { width: 24, height: 24, fontSize: 12 } }}>
                {(likers || []).slice(0, 3).map((u) => (
                  <Avatar key={u.id} src={u.avatar} alt={u.name}>{(u.name || "U")[0]}</Avatar>
                ))}
              </AvatarGroup>
              <Typography variant="caption" sx={{ ml: 1 }}>{likeLabel}</Typography>
            </Stack>

            {/* Right: Shares Count */}
            <Button size="small" onClick={() => onShare(post.id)} sx={{ textTransform: "none", color: "text.secondary", fontSize: 12 }}>
              {shareCount} Shares
            </Button>
          </Stack>
        </Box>

        <Divider sx={{ mb: 1 }} />

        <Stack direction="row" justifyContent="space-between">
          <Button
            size="small"
            startIcon={post.liked_by_me ? <FavoriteRoundedIcon color="error" /> : <FavoriteBorderRoundedIcon />}
            onClick={() => onLike(post.id)}
            sx={{ color: post.liked_by_me ? "error.main" : "text.secondary" }}
          >
            Like
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
            onClick={() => onShare(post.id)}
          >
            Share
          </Button>
        </Stack>
      </CardActions>
    </Card>
  );
}

// -----------------------------------------------------------------------------
// 4. Dialogs
// -----------------------------------------------------------------------------

function CommentsDialog({ open, postId, onClose }) {
  const [loading, setLoading] = React.useState(false);
  const [comments, setComments] = React.useState([]);
  const [text, setText] = React.useState("");
  const [replyingTo, setReplyingTo] = React.useState(null);
  const [meId, setMeId] = React.useState(null);

  async function getMeId() {
    try {
      const r = await fetch(`${API_ROOT}/users/me/`, { headers: authHeader() });
      const d = await r.json();
      return d?.id;
    } catch { return null; }
  }

  function normalizeUser(u) {
    if (!u) return { id: null, name: "User", avatar: "" };
    const id = u.id || u.user_id;
    const name = u.name || u.full_name || u.username || "User";
    const avatar = toAbsolute(u.user_image || u.avatar || u.user_image_url);
    return { id, name, avatar };
  }

  function normalizeComment(c, currentUserId) {
    const author = normalizeUser(c.author || c.user);
    const replies = (c.replies || []).map(r => normalizeComment(r, currentUserId));
    return {
      id: c.id,
      created: c.created_at,
      body: c.text || c.body || "",
      author,
      likedByMe: !!(c.liked || c.liked_by_me),
      likeCount: Number(c.like_count || c.likes || 0),
      canDelete: !!((author.id && currentUserId && author.id === currentUserId)),
      replies
    };
  }

  async function fetchComments(pid, uid) {
    try {
      const r = await fetch(`${API_ROOT}/engagements/comments/?target_type=activity_feed.feeditem&target_id=${pid}`, { headers: authHeader() });
      if (!r.ok) return [];
      const j = await r.json();
      const rootsRaw = j.results || [];
      const roots = rootsRaw.map(r => ({ ...normalizeComment(r, uid), replies: [] }));

      await Promise.all(roots.map(async (root) => {
         try {
           const rr = await fetch(`${API_ROOT}/engagements/comments/?parent=${root.id}`, { headers: authHeader() });
           const jj = await rr.json();
           root.replies = (jj.results || []).map(x => normalizeComment(x, uid));
         } catch {}
      }));
      return roots;
    } catch { return []; }
  }

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      if (!open || !postId) return;
      setLoading(true);
      const uid = await getMeId();
      if (mounted) setMeId(uid);
      const list = await fetchComments(postId, uid);
      if (mounted) setComments(list);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [open, postId]);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    const payload = replyingTo
      ? { text, parent: replyingTo }
      : { text, target_type: "activity_feed.feeditem", target_id: postId };
    try {
      await fetch(`${API_ROOT}/engagements/comments/`, {
        method: "POST", headers: { "Content-Type": "application/json", ...authHeader() }, body: JSON.stringify(payload)
      });
      setText("");
      setReplyingTo(null);
      const list = await fetchComments(postId, meId);
      setComments(list);
    } catch { alert("Failed to post"); }
  };

  const onLike = async (cid) => {
    try {
      await fetch(`${API_ROOT}/engagements/reactions/toggle/`, {
        method: "POST", headers: { "Content-Type": "application/json", ...authHeader() }, body: JSON.stringify({ target_type: "comment", target_id: cid, reaction: "like" })
      });
      const list = await fetchComments(postId, meId);
      setComments(list);
    } catch {}
  };

  const onDelete = async (cid) => {
    if (!confirm("Delete this comment?")) return;
    try {
      await fetch(`${API_ROOT}/engagements/comments/${cid}/`, { method: "DELETE", headers: authHeader() });
      const list = await fetchComments(postId, meId);
      setComments(list);
    } catch {}
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
          <Stack direction="row" spacing={2} sx={{ mt: 0.5, ml: 1 }}>
             <Typography variant="caption" color="text.secondary">{timeAgo(c.created)}</Typography>
             <Typography variant="caption" sx={{ cursor: "pointer", fontWeight: 600 }} onClick={() => onLike(c.id)}>
               {c.likedByMe ? "Unlike" : "Like"} ({c.likeCount})
             </Typography>
             <Typography variant="caption" sx={{ cursor: "pointer", fontWeight: 600 }} onClick={() => setReplyingTo(c.id)}>
               Reply
             </Typography>
             {c.canDelete && <Typography variant="caption" color="error" sx={{ cursor: "pointer" }} onClick={() => onDelete(c.id)}>Delete</Typography>}
          </Stack>
        </Box>
      </Stack>
      {c.replies.map(r => <CommentItem key={r.id} c={r} depth={depth + 1} />)}
    </Box>
  );

  return (
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
  );
}

// Fixed Likes Dialog (Handles raw array vs. results object)
function LikesDialog({ open, postId, onClose }) {
  const [users, setUsers] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open || !postId) return;
    setLoading(true);
    fetch(`${API_ROOT}/engagements/reactions/?target_type=activity_feed.feeditem&target_id=${postId}&reaction=like`, { headers: authHeader() })
      .then(r => r.json())
      .then(d => {
        // Handle {results: [...]} OR [...]
        const rows = Array.isArray(d?.results) ? d.results : Array.isArray(d) ? d : [];
        setUsers(rows.map(r => {
           const u = r.user || r.owner || {};
           const p = u.profile || {};
           return {
             id: u.id,
             name: u.name || u.full_name || u.username || "User",
             avatar: toAbsolute(u.user_image || p.user_image_url || u.avatar),
             headline: u.headline || u.job_title || ""
           };
        }));
      })
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, [open, postId]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Liked by</DialogTitle>
      <DialogContent dividers>
        {loading ? <LinearProgress /> : users.map(u => (
          <ListItem key={u.id}>
            <ListItemAvatar><Avatar src={u.avatar} /></ListItemAvatar>
            <ListItemText primary={u.name} secondary={u.headline} />
          </ListItem>
        ))}
        {!loading && !users.length && <Typography p={2} color="text.secondary">No likes yet.</Typography>}
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Close</Button></DialogActions>
    </Dialog>
  );
}

// Fixed Shares Dialog (Handles raw array vs. results object)
function SharesDialog({ open, postId, onClose }) {
  const [users, setUsers] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open || !postId) return;
    setLoading(true);
    fetch(`${API_ROOT}/engagements/shares/?target_type=activity_feed.feeditem&target_id=${postId}`, { headers: authHeader() })
      .then(r => r.json())
      .then(d => {
        // Handle {results: [...]} OR [...]
        const rows = Array.isArray(d?.results) ? d.results : Array.isArray(d) ? d : [];
        setUsers(rows.map(r => {
           const u = r.user || r.actor || {};
           return {
             id: u.id,
             name: u.name || u.full_name || u.username || "User",
             avatar: toAbsolute(u.user_image || u.avatar),
             headline: u.headline || ""
           };
        }));
      })
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, [open, postId]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Shared by</DialogTitle>
      <DialogContent dividers>
        {loading ? <LinearProgress /> : users.map(u => (
          <ListItem key={u.id}>
             <ListItemAvatar><Avatar src={u.avatar} /></ListItemAvatar>
             <ListItemText primary={u.name} secondary={u.headline} />
          </ListItem>
        ))}
        {!loading && !users.length && <Typography p={2} color="text.secondary">No shares yet.</Typography>}
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Close</Button></DialogActions>
    </Dialog>
  );
}

// --- Post Edit Dialog & Delete (No change) ---
function PostEditDialog({ open, post, onClose, onSaved }) {
  const [saving, setSaving] = React.useState(false);
  const type = post?.type || "text";
  const [textContent, setTextContent] = React.useState(post?.content || "");
  const [linkUrl, setLinkUrl] = React.useState(post?.link || "");
  const [imageCaption, setImageCaption] = React.useState(post?.content || "");
  const [imageFile, setImageFile] = React.useState(null);
  const [pollOptions, setPollOptions] = React.useState(post?.type === "poll" ? post.options?.map((o) => (typeof o === "string" ? o : o.text || o.label || "")) || ["", ""] : ["", ""]);

  React.useEffect(() => {
    if (!open || !post) return;
    const t = post.type || "text";
    setTextContent(post.content || "");
    setImageCaption(post.content || "");
    setLinkUrl(post.link || "");
    if (t === "poll") {
      setPollOptions(post.options?.map((o) => (typeof o === "string" ? o : o.text || o.label || "")) || ["", ""]);
    } else { setPollOptions(["", ""]); }
    setImageFile(null);
  }, [open, post]);

  const handleSave = async () => {
    if (!post) return;
    setSaving(true);
    let options = { method: "PATCH", headers: { ...authHeader() } };
    let body;
    let url;
    try {
      if (type === "poll") {
        const pollId = post.raw_metadata?.poll_id;
        if (!pollId) throw new Error("Missing poll_id");
        url = `${API_ROOT}/activity/feed/polls/${pollId}/`;
        const validOptions = pollOptions.map((o) => o.trim()).filter(Boolean);
        if (!textContent.trim() || validOptions.length < 2) { alert("Poll must have a question and at least 2 options."); setSaving(false); return; }
        options.headers["Content-Type"] = "application/json";
        body = JSON.stringify({ question: textContent, options: validOptions });
      } else {
        const communityId = post.raw_metadata?.community_id || post.community_id;
        if (!communityId) throw new Error("Missing community id");
        url = `${API_ROOT}/communities/${communityId}/posts/${post.id}/edit/`;
        if (type === "text") { options.headers["Content-Type"] = "application/json"; body = JSON.stringify({ content: textContent }); }
        else if (type === "link") { options.headers["Content-Type"] = "application/json"; body = JSON.stringify({ url: linkUrl, description: textContent }); }
        else if (type === "image") { const fd = new FormData(); fd.append("caption", imageCaption || ""); if (imageFile) fd.append("image", imageFile); body = fd; }
      }
      options.body = body;
      const res = await fetch(url, options);
      if (!res.ok) throw new Error("Update failed");
      const data = await res.json();
      let updated = { ...post };
      if (type === "poll") { updated.content = data.question; updated.options = data.options; }
      else { const meta = data.metadata || post.raw_metadata || {}; if (type === "text") updated.content = meta.text || textContent; if (type === "link") { updated.content = meta.description; updated.link = meta.url; } if (type === "image") updated.content = meta.caption; }
      onSaved(updated);
      onClose();
    } catch (e) { alert("Failed to update post: " + e.message); } finally { setSaving(false); }
  };

  const renderBody = () => {
    if (type === "poll") return <><TextField fullWidth multiline minRows={3} label="Question" value={textContent} onChange={(e) => setTextContent(e.target.value)} sx={{ mb: 2 }} /><Stack spacing={1}><Typography variant="subtitle2">Options</Typography>{pollOptions.map((opt, i) => (<Stack key={i} direction="row" spacing={1}><TextField fullWidth size="small" value={opt} onChange={(e) => { const n = [...pollOptions]; n[i] = e.target.value; setPollOptions(n); }} /><IconButton size="small" onClick={() => setPollOptions((o) => o.filter((_, x) => x !== i))} disabled={pollOptions.length <= 2}><RemoveRoundedIcon fontSize="small" /></IconButton></Stack>))}<Button startIcon={<AddRoundedIcon />} onClick={() => setPollOptions((o) => [...o, ""])} size="small" sx={{ alignSelf: "flex-start" }}>Add Option</Button></Stack></>;
    if (type === "link") return <><TextField fullWidth label="Link URL" value={linkUrl} onChange={e=>setLinkUrl(e.target.value)} sx={{mb:2}} /><TextField fullWidth multiline minRows={3} label="Description" value={textContent} onChange={e=>setTextContent(e.target.value)} /></>;
    if (type === "image") return <Stack spacing={2}><TextField fullWidth multiline minRows={3} label="Caption" value={imageCaption} onChange={e=>setImageCaption(e.target.value)} /><Button variant="outlined" component="label">Change image<input hidden type="file" accept="image/*" onChange={e=>setImageFile(e.target.files[0])} /></Button></Stack>;
    return <TextField fullWidth multiline minRows={3} label="Content" value={textContent} onChange={e=>setTextContent(e.target.value)} />;
  };
  return <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm"><DialogTitle>Edit Post</DialogTitle><DialogContent dividers>{renderBody()}</DialogContent><DialogActions><Button onClick={onClose}>Cancel</Button><Button variant="contained" onClick={handleSave} disabled={saving}>{saving?"Saving...":"Save"}</Button></DialogActions></Dialog>;
}

function PostDeleteConfirm({ open, post, onClose, onDeleted }) {
  const [busy, setBusy] = React.useState(false);
  const handleDelete = async () => {
    setBusy(true);
    let url;
    if (post.type === "poll") url = `${API_ROOT}/activity/feed/${post.id}/poll/delete/`;
    else { const communityId = post.raw_metadata?.community_id || post.community_id; url = `${API_ROOT}/communities/${communityId}/posts/${post.id}/delete/`; }
    try { const res = await fetch(url, { method: "DELETE", headers: authHeader() }); if (res.ok || res.status === 204) { onDeleted(post.id); onClose(); return; } throw new Error("Delete failed"); } catch { alert("Could not delete post."); } finally { setBusy(false); }
  };
  return <Dialog open={open} onClose={onClose}><DialogTitle>Delete Post?</DialogTitle><DialogContent>This cannot be undone.</DialogContent><DialogActions><Button onClick={onClose}>Cancel</Button><Button color="error" variant="contained" onClick={handleDelete} disabled={busy}>Delete</Button></DialogActions></Dialog>;
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

  // --- Initial Fetch & HYDRATION ---
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

          // --- HYDRATION STEP (Fixes "0 likes" / "0 shares") ---
          const ids = uiPosts.map(p => p.id).join(",");
          if (ids) {
            const metricsRes = await fetch(`${API_ROOT}/engagements/metrics/?target_type=activity_feed.feeditem&ids=${ids}`, { headers: authHeader() });
            if (metricsRes.ok) {
              const metricsData = await metricsRes.json();
              // Handle results array OR keyed object
              const metricsMap = metricsData.results || metricsData; 
              
              const hydrated = uiPosts.map(p => {
                // Find matching metric row
                const m = Array.isArray(metricsMap) 
                  ? metricsMap.find(x => String(x.id) === String(p.id)) 
                  : metricsMap[String(p.id)];
                
                if (!m) return p;

                return {
                  ...p,
                  liked_by_me: m.user_has_liked ?? p.liked_by_me,
                  metrics: {
                    likes: Number(m.likes ?? m.like_count ?? p.metrics.likes),
                    comments: Number(m.comments ?? m.comment_count ?? p.metrics.comments),
                    shares: Number(m.shares ?? m.share_count ?? p.metrics.shares),
                  }
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

  const handleLike = async (id) => {
    setPosts((prev) => prev.map((p) => {
      if (p.id !== id) return p;
      const liked = !p.liked_by_me;
      return { ...p, liked_by_me: liked, metrics: { ...p.metrics, likes: Math.max(0, p.metrics.likes + (liked ? 1 : -1)) } };
    }));
    try {
      await fetch(`${API_ROOT}/engagements/reactions/toggle/`, {
        method: "POST", headers: { "Content-Type": "application/json", ...authHeader() }, body: JSON.stringify({ target_type: "activity_feed.feeditem", target_id: id, reaction: "like" }),
      });
    } catch (e) { console.error(e); }
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
    } catch {}
  };

  return (
    // Changed maxWidth:800 to width: "100%"
    <Box sx={{ width: "100%", p: { xs: 1, md: 3 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>My Posts</Typography>
        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setCreateOpen(true)}>Create Post</Button>
      </Stack>

      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {!loading && posts.length === 0 && <Box sx={{ textAlign: "center", py: 5, color: "text.secondary" }}>You haven&apos;t posted anything yet.</Box>}

      {posts.map((post) => (
        <PostCard
          key={post.id} post={post} onLike={handleLike} onComment={setCommentId} onShare={setSharesId} onEdit={setEditObj} onDelete={setDeleteObj} onVote={handleVote} onOpenLikes={setLikesId}
        />
      ))}

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Create Post</DialogTitle><DialogContent><PostComposer communityId={myCommunityId} onCreate={handleCreate} /></DialogContent>
      </Dialog>
      {editObj && <PostEditDialog open={!!editObj} post={editObj} onClose={() => setEditObj(null)} onSaved={(updated) => setPosts((p) => p.map((x) => (x.id === updated.id ? updated : x)))} />}
      {deleteObj && <PostDeleteConfirm open={!!deleteObj} post={deleteObj} onClose={() => setDeleteObj(null)} onDeleted={(id) => setPosts((p) => p.filter((x) => x.id !== id))} />}
      <CommentsDialog open={!!commentId} postId={commentId} onClose={() => setCommentId(null)} />
      <LikesDialog open={!!likesId} postId={likesId} onClose={() => setLikesId(null)} />
      <SharesDialog open={!!sharesId} postId={sharesId} onClose={() => setSharesId(null)} />
    </Box>
  );
}