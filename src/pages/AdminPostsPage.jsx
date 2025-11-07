// src/pages/AdminPostsPage.jsx
import * as React from "react";
import { useParams } from "react-router-dom";
import {
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
  Card,
  CardContent,
  CardActions,
  Snackbar,
  Alert,
} from "@mui/material";
import FavoriteBorderRoundedIcon from "@mui/icons-material/FavoriteBorderRounded";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import {
  Divider, List, ListItem, ListItemAvatar, ListItemText, AvatarGroup, Badge
} from "@mui/material";
import { IconButton, Tooltip, CircularProgress, DialogContentText } from "@mui/material";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import SearchIcon from "@mui/icons-material/Search";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import LinkIcon from "@mui/icons-material/Link";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";

const API_ROOT = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");
function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    ""
  );
}
function authHeader() {
  const tok = getToken();
  return tok ? { Authorization: `Bearer ${tok}` } : {};
}

const BORDER = "#e5e7eb";

// Stable Row wrapper (top-level, memoized)
const Row = React.memo(function Row({ children }) {
  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ width: "100%" }}>
      {children}
    </Stack>
  );
});

// ------- card renderer -------
function PostCard({ item }) {
  const kind = (item.type || "text").toLowerCase();
  return (
    <Card variant="outlined" sx={{ borderRadius: 3, borderColor: BORDER }}>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} mb={1}>
          <Avatar sx={{ width: 28, height: 28 }}>A</Avatar>
          <Typography variant="subtitle2" color="text.secondary">
            Admin • {new Date(item.created_at || Date.now()).toLocaleString()}
          </Typography>
        </Stack>
        {item.community?.name && (
          <Chip
            size="small"
            variant="outlined"
            label={`Community: ${item.community.name}`}
            sx={{ mb: 1 }}
          />
        )}
        {kind === "text" && (
          <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
            {item.text || ""}
          </Typography>
        )}

        {kind === "image" && (
          <Box>
            {item.image_preview ? (
              <img
                src={item.image_preview}
                alt="preview"
                style={{ width: "100%", borderRadius: 12, marginBottom: 8 }}
              />
            ) : item.image_url || item.image ? (
              <img
                src={item.image_url || item.image}
                alt="post"
                style={{ width: "100%", borderRadius: 12, marginBottom: 8 }}
              />
            ) : null}
            {item.caption && (
              <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
                {item.caption}
              </Typography>
            )}
          </Box>
        )}

        {kind === "link" && (
          <Box>
            <Paper
              variant="outlined"
              sx={{
                borderColor: BORDER,
                p: 1.25,
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                gap: 1,
                mb: 1,
              }}
            >
              <LinkIcon fontSize="small" />
              <a
                href={item.url || item.link_url}
                target="_blank"
                rel="noreferrer"
                style={{ wordBreak: "break-all" }}
              >
                {item.url || item.link_url}
              </a>
            </Paper>
            {item.title || item.link_title ? (
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {item.title || item.link_title}
              </Typography>
            ) : null}
            {item.description || item.link_description ? (
              <Typography variant="body2" color="text.secondary">
                {item.description || item.link_description}
              </Typography>
            ) : null}
          </Box>
        )}

        {kind === "poll" && (
          <Box>
            {item.question && (
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                {item.question}
              </Typography>
            )}
            <Stack spacing={0.75}>
              {(item.options || []).map((opt, i) => (
                <Paper
                  key={i}
                  variant="outlined"
                  sx={{ p: 1, borderRadius: 2, borderColor: BORDER }}
                >
                  {typeof opt === "string" ? opt : (opt?.text ?? opt?.label ?? "")}
                </Paper>
              ))}
            </Stack>
          </Box>
        )}

        {!!item.tags?.length && (
          <Stack direction="row" spacing={1} mt={1} flexWrap="wrap">
            {item.tags.map((t, i) => (
              <Chip key={i} size="small" label={t} />
            ))}
          </Stack>
        )}
      </CardContent>
      <CardActions sx={{ px: 2, pb: 2 }}>
        <Chip
          size="small"
          variant="outlined"
          icon={<ArticleOutlinedIcon sx={{ fontSize: 16 }} />}
          label={(item.type || "Text").toUpperCase()}
        />
      </CardActions>
    </Card>
  );
}

// ------- edit dialog (reuses your patterns) -------
function EditPostDialog({ open, onClose, item, communityId, onSaved }) {
  const kind = (item?.type || "text").toLowerCase();

  // shared fields
  const [tags, setTags] = React.useState(Array.isArray(item?.tags) ? item.tags.join(", ") : "");
  const [saving, setSaving] = React.useState(false);
  const [toast, setToast] = React.useState({ open: false, type: "success", msg: "" });

  // text
  const [text, setText] = React.useState(item?.text || "");

  // link
  const [linkUrl, setLinkUrl] = React.useState(item?.url || item?.link_url || "");
  const [linkTitle, setLinkTitle] = React.useState(item?.title || item?.link_title || "");
  const [linkDesc, setLinkDesc] = React.useState(item?.description || item?.link_description || "");

  // image
  const [caption, setCaption] = React.useState(item?.caption || "");
  const [imageFile, setImageFile] = React.useState(null);
  const [imagePreview, setImagePreview] = React.useState("");

  // poll
  const [question, setQuestion] = React.useState(item?.question || "");
  const [pollOptions, setPollOptions] = React.useState(
    Array.isArray(item?.options) ? item.options.map(o => (typeof o === "string" ? o : o?.text || "")) : ["", ""]
  );

  React.useEffect(() => {
    if (!open) return;
    setTags(Array.isArray(item?.tags) ? item.tags.join(", ") : "");
    setText(item?.text || "");
    setLinkUrl(item?.url || item?.link_url || "");
    setLinkTitle(item?.title || item?.link_title || "");
    setLinkDesc(item?.description || item?.link_description || "");
    setCaption(item?.caption || "");
    setImageFile(null);
    setImagePreview("");
    setQuestion(item?.question || "");
    setPollOptions(Array.isArray(item?.options) ? item.options.map(o => (typeof o === "string" ? o : o?.text || "")) : ["", ""]);
  }, [open, item]);

  const onPickImage = (file) => {
    setImageFile(file || null);
    if (file) {
      const r = new FileReader();
      r.onload = (ev) => setImagePreview(String(ev.target?.result || ""));
      r.readAsDataURL(file);
    } else {
      setImagePreview("");
    }
  };

  const canSave = () => {
    if (kind === "text") return !!text.trim();
    if (kind === "link") return !!linkUrl.trim();
    if (kind === "image") return true; // allow caption-only edits too
    if (kind === "poll") return !!question.trim() && pollOptions.filter(o => o.trim()).length >= 2;
    return true;
  };

  function normalizeServerPost(resp, prevItem, fallbackKind) {
    if (!resp) return prevItem;

    const meta = resp.metadata || {};
    const t = (resp.type || meta.type || prevItem.type || fallbackKind || "text").toLowerCase();

    // start from previous values so we don't lose things like created_at
    const out = { ...prevItem, ...resp };
    delete out.metadata; // we'll flatten below

    out.type = t;
    out.tags = Array.isArray(resp.tags) ? resp.tags : (meta.tags || prevItem.tags || []);
    out.visibility = resp.visibility || meta.visibility || prevItem.visibility;

    if (t === "text") {
      out.text = resp.text ?? meta.text ?? prevItem.text ?? "";
    } else if (t === "image") {
      out.image_url = resp.image_url ?? meta.image_url ?? prevItem.image_url;
      out.caption = resp.caption ?? meta.caption ?? prevItem.caption ?? "";
    } else if (t === "link") {
      out.url = resp.url ?? meta.url ?? prevItem.url;
      out.title = resp.title ?? meta.title ?? prevItem.title;
      out.description = resp.description ?? meta.description ?? prevItem.description;
    } else if (t === "poll") {
      out.question = resp.question ?? meta.question ?? prevItem.question ?? "";
      out.options = resp.options ?? meta.options ?? prevItem.options ?? [];
    }

    return out;
  }

  const handleSave = async () => {
    if (!communityId || !item?.id) {
      setToast({ open: true, type: "error", msg: "Missing community or post id." });
      return;
    }
    // local items fallback
    if (String(item.id).startsWith("local-")) {
      onSaved?.({
        ...item,
        text, caption, url: linkUrl, title: linkTitle, description: linkDesc,
        question, options: pollOptions, tags: tags.split(",").map(s => s.trim()).filter(Boolean)
      });
      onClose?.();
      return;
    }

    setSaving(true);
    const tokenHeaders = authHeader();
    const POST_DETAIL_URL = `${API_ROOT}/communities/${communityId}/posts/${item.id}/edit/`;

    try {
      let res;
      if (kind === "image" && imageFile) {
        const fd = new FormData();
        fd.append("type", "image");
        fd.append("image", imageFile);
        if (caption) fd.append("caption", caption);
        tags.split(",").map(s => s.trim()).filter(Boolean).forEach(t => fd.append("tags", t));
        res = await fetch(POST_DETAIL_URL, { method: "PATCH", headers: { ...tokenHeaders }, body: fd });
      } else {
        const payload = { type: kind, tags: tags.split(",").map(s => s.trim()).filter(Boolean) };
        if (kind === "text") payload.content = text;
        if (kind === "image") payload.caption = caption;
        if (kind === "link") Object.assign(payload, {
          url: linkUrl.trim(), title: linkTitle.trim() || undefined, description: linkDesc.trim() || undefined
        });
        if (kind === "poll") Object.assign(payload, {
          question, options: pollOptions.map(o => o.trim()).filter(Boolean)
        });

        res = await fetch(POST_DETAIL_URL, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...tokenHeaders },
          body: JSON.stringify(payload),
        });
      }

      let updated;
      if (res?.ok) {
        const json = await res.json();
        updated = normalizeServerPost(json, item, kind);
      } else {
        // fallback: local shape (already what PostCard expects)
        updated = {
          ...item,
          type: kind,
          text,
          caption,
          url: linkUrl,
          title: linkTitle,
          description: linkDesc,
          question,
          options: pollOptions,
        };
      }
      onSaved?.(updated);
      onClose?.();
    } catch {
      onSaved?.({ ...item, text, caption, url: linkUrl, title: linkTitle, description: linkDesc, question, options: pollOptions });
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth keepMounted>
        <DialogTitle>Edit Post</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {/* kind-specific editors, simplified */}
            {kind === "text" && (
              <TextField label="Text" multiline minRows={5} value={text} onChange={e => setText(e.target.value)} fullWidth />
            )}

            {kind === "image" && (
              <Stack spacing={1.5}>
                <Box sx={{ width: "100%", border: `1px dashed ${BORDER}`, borderRadius: 2, p: 2, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 140, bgcolor: "#fafafa" }}>
                  {imagePreview ? (
                    <img src={imagePreview} alt="preview" style={{ maxWidth: "100%", maxHeight: 240, borderRadius: 12 }} />
                  ) : (item.image_url || item.image || item.image_preview) ? (
                    <img src={item.image_url || item.image || item.image_preview} alt="post" style={{ maxWidth: "100%", maxHeight: 240, borderRadius: 12 }} />
                  ) : null}
                </Box>
                <Row>
                  <Button component="label" variant="outlined" startIcon={<ImageRoundedIcon />}>
                    Replace image
                    <input hidden type="file" accept="image/*" onChange={(e) => onPickImage(e.target.files?.[0] || null)} />
                  </Button>
                  <TextField label="Caption" value={caption} onChange={e => setCaption(e.target.value)} fullWidth />
                </Row>
              </Stack>
            )}

            {kind === "link" && (
              <Stack spacing={1.5}>
                <TextField label="URL" value={linkUrl} onChange={e => setLinkUrl(e.target.value)}
                  InputProps={{ startAdornment: (<InputAdornment position="start"><LinkIcon fontSize="small" /></InputAdornment>) }} fullWidth />
                <Row>
                  <TextField label="Title" value={linkTitle} onChange={e => setLinkTitle(e.target.value)} fullWidth />
                </Row>
                <TextField label="Description" value={linkDesc} onChange={e => setLinkDesc(e.target.value)} multiline minRows={2} fullWidth />
              </Stack>
            )}

            {kind === "poll" && (
              <Stack spacing={1.5}>
                <TextField label="Question" value={question} onChange={e => setQuestion(e.target.value)} fullWidth />
                <Stack spacing={1}>
                  {pollOptions.map((opt, i) => (
                    <Row key={i}>
                      <TextField label={`Option ${i + 1}`} value={opt} onChange={e => setPollOptions(p => p.map((x, idx) => idx === i ? e.target.value : x))} fullWidth />
                      <Button color="error" onClick={() => setPollOptions(p => p.filter((_, idx) => idx !== i))} disabled={pollOptions.length <= 2}>Remove</Button>
                    </Row>
                  ))}
                  <Button onClick={() => setPollOptions(p => [...p, ""])} startIcon={<AddRoundedIcon />}>Add option</Button>
                </Stack>
              </Stack>
            )}

            <TextField label="Tags (comma separated)" value={tags} onChange={e => setTags(e.target.value)} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={!canSave() || saving}>
            {saving ? <CircularProgress size={18} /> : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={toast.open} autoHideDuration={2600} onClose={() => setToast(t => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}>
        <Alert severity={toast.type === "error" ? "error" : "success"} variant="filled" onClose={() => setToast(t => ({ ...t, open: false }))}>
          {toast.msg}
        </Alert>
      </Snackbar>
    </>
  );
}

// ------- delete confirm -------
function DeleteConfirmDialog({ open, onClose, communityId, item, onDeleted }) {
  const [busy, setBusy] = React.useState(false);
  const handleDelete = async () => {
    if (!communityId || !item?.id) { onDeleted?.(); onClose?.(); return; }
    if (String(item.id).startsWith("local-")) { onDeleted?.(); onClose?.(); return; }

    setBusy(true);
    const tokenHeaders = authHeader();
    const POST_DETAIL_URL = `${API_ROOT}/communities/${communityId}/posts/${item.id}/delete/`;
    try {
      await fetch(POST_DETAIL_URL, { method: "DELETE", headers: { ...tokenHeaders } });
    } catch { }
    setBusy(false);
    onDeleted?.();
    onClose?.();
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose}>
      <DialogTitle>Delete post?</DialogTitle>
      <DialogContent>
        <DialogContentText> This action cannot be undone. </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>Cancel</Button>
        <Button onClick={handleDelete} color="error" variant="contained" disabled={busy}>
          {busy ? <CircularProgress size={18} /> : "Delete"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// Like Dialog
// ---------- Likes dialog ----------
function LikesDialog({ open, onClose, communityId, postId }) {
  const [loading, setLoading] = React.useState(true);
  const [rows, setRows] = React.useState([]);

  const load = React.useCallback(async () => {
    if (!open || !communityId || !postId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${API_ROOT}/communities/${communityId}/posts/${postId}/likes/`,
        { headers: { Accept: "application/json", ...authHeader() } }
      );
      const json = res.ok ? await res.json() : [];
      const list = Array.isArray(json?.results) ? json.results : (Array.isArray(json) ? json : []);
      setRows(list);
    } catch { setRows([]); }
    setLoading(false);
  }, [open, communityId, postId]);

  React.useEffect(() => { load(); }, [load]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Liked by</DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Stack alignItems="center" py={3}><CircularProgress size={22} /></Stack>
        ) : rows.length === 0 ? (
          <Typography color="text.secondary">No likes yet.</Typography>
        ) : (
          <List>
            {rows.map((u) => (
              <ListItem key={u.id || u.user_id}>
                <ListItemAvatar><Avatar src={u.avatar} alt={u.name || u.username} /></ListItemAvatar>
                <ListItemText
                  primary={u.name || u.username || `User #${u.id || u.user_id}`}
                  secondary={u.handle ? `@${u.handle}` : undefined}
                />
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Close</Button></DialogActions>
    </Dialog>
  );
}

// ---------- Comments dialog (threaded, like, reply, admin delete) ----------
function CommentsDialog({ open, onClose, communityId, postId }) {
  const [loading, setLoading] = React.useState(true);
  const [comments, setComments] = React.useState([]);
  const [me, setMe] = React.useState(null);
  const [input, setInput] = React.useState("");
  const [replyTo, setReplyTo] = React.useState(null);

  const isAdmin = !!(me?.is_admin || me?.is_staff || me?.is_moderator);

  const fetchMe = React.useCallback(async () => {
    try {
      const r = await fetch(`${API_ROOT}/users/me/`, { headers: { ...authHeader() } });
      const j = r.ok ? await r.json() : null;
      setMe(j || {});
    } catch { setMe({}); }
  }, []);

  const load = React.useCallback(async () => {
    if (!open || !communityId || !postId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${API_ROOT}/communities/${communityId}/posts/${postId}/comments/?page_size=200`,
        { headers: { Accept: "application/json", ...authHeader() } }
      );
      const json = res.ok ? await res.json() : [];
      const flat = Array.isArray(json?.results) ? json.results : (Array.isArray(json) ? json : []);
      setComments(flat);
    } catch { setComments([]); }
    setLoading(false);
  }, [open, communityId, postId]);

  React.useEffect(() => { if (open) { fetchMe(); load(); } }, [open, fetchMe, load]);

  // helpers
  const buildTree = React.useMemo(() => {
    const byId = new Map(); const roots = [];
    comments.forEach(c => byId.set(c.id, { ...c, children: [] }));
    byId.forEach(c => {
      if (c.parent_id && byId.get(c.parent_id)) byId.get(c.parent_id).children.push(c);
      else roots.push(c);
    });
    return roots;
  }, [comments]);

  async function createComment(text, parentId = null) {
    if (!text.trim()) return;
    try {
      const res = await fetch(
        `${API_ROOT}/communities/${communityId}/posts/${postId}/comments/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader() },
          body: JSON.stringify(parentId ? { text, parent_id: parentId } : { text }),
        }
      );
      if (res.ok) { await load(); setInput(""); setReplyTo(null); }
    } catch {}
  }

  async function toggleCommentLike(c) {
    const url = `${API_ROOT}/communities/${communityId}/posts/${postId}/comments/${c.id}/like/`;
    const liked = !!c.user_has_liked;
    try {
      const res = await fetch(url, { method: liked ? "DELETE" : "POST", headers: { ...authHeader() } });
      if (res.ok) await load();
    } catch {}
  }

  async function deleteComment(c) {
    // Prefer DELETE to detail; gracefully fall back to /delete/
    const tryUrls = [
      `${API_ROOT}/communities/${communityId}/posts/${postId}/comments/${c.id}/`,
      `${API_ROOT}/communities/${communityId}/posts/${postId}/comments/${c.id}/delete/`
    ];
    for (const u of tryUrls) {
      try {
        const res = await fetch(u, { method: "DELETE", headers: { ...authHeader() } });
        if (res.ok) { await load(); return; }
      } catch {}
    }
  }

  const CommentItem = ({ c, depth = 0 }) => (
    <Box sx={{ pl: depth ? 2 : 0, borderLeft: depth ? `2px solid ${BORDER}` : "none", ml: depth ? 1.5 : 0, mt: depth ? 1 : 0 }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Avatar src={c.author?.avatar} sx={{ width: 28, height: 28 }} />
        <Typography variant="subtitle2">{c.author?.name || c.author?.username || `User #${c.author_id}`}</Typography>
        <Typography variant="caption" color="text.secondary">
          {new Date(c.created_at || Date.now()).toLocaleString()}
        </Typography>
      </Stack>
      <Typography sx={{ mt: 0.5, whiteSpace: "pre-wrap" }}>{c.text}</Typography>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 0.5 }}>
        <Button
          size="small"
          startIcon={c.user_has_liked ? <FavoriteRoundedIcon fontSize="small" /> : <FavoriteBorderRoundedIcon fontSize="small" />}
          onClick={() => toggleCommentLike(c)}
        >
          {c.like_count ?? 0}
        </Button>
        <Button size="small" startIcon={<ChatBubbleOutlineRoundedIcon fontSize="small" />} onClick={() => setReplyTo(c)}>
          Reply
        </Button>
        {(isAdmin || (me?.id && c.author_id === me.id)) && (
          <Button size="small" color="error" onClick={() => deleteComment(c)}>
            Delete
          </Button>
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
        ) : buildTree.length === 0 ? (
          <Typography color="text.secondary">No comments yet.</Typography>
        ) : (
          <Stack spacing={2}>
            {buildTree.map((c) => <CommentItem key={c.id} c={c} />)}
          </Stack>
        )}
      </DialogContent>
      <Divider />
      <Box sx={{ px: 2, py: 1.5 }}>
        {replyTo && (
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <Typography variant="caption" color="text.secondary">Replying to {replyTo.author?.name || `#${replyTo.author_id}`}</Typography>
            <Button size="small" onClick={() => setReplyTo(null)}>Cancel</Button>
          </Stack>
        )}
        <Stack direction="row" spacing={1}>
          <TextField
            size="small"
            fullWidth
            placeholder={replyTo ? "Write a reply…" : "Write a comment…"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <Button variant="contained" onClick={() => createComment(input, replyTo?.id || null)}>Post</Button>
        </Stack>
      </Box>
    </Dialog>
  );
}

// ---------- Social bar (below each card) ----------
function PostSocialBar({ communityId, post, onCounts }) {
  const [likeCount, setLikeCount] = React.useState(post.like_count ?? 0);
  const [commentCount, setCommentCount] = React.useState(post.comment_count ?? 0);
  const [userHasLiked, setUserHasLiked] = React.useState(!!post.user_has_liked);
  const [likesOpen, setLikesOpen] = React.useState(false);
  const [commentsOpen, setCommentsOpen] = React.useState(false);

  async function togglePostLike() {
    const url = `${API_ROOT}/communities/${communityId}/posts/${post.id}/like/`;
    const willUnlike = userHasLiked;
    try {
      const res = await fetch(url, { method: willUnlike ? "DELETE" : "POST", headers: { ...authHeader() } });
      if (res.ok) {
        setUserHasLiked(!willUnlike);
        setLikeCount((n) => (willUnlike ? Math.max(0, n - 1) : n + 1));
        onCounts?.({ likeCount: willUnlike ? Math.max(0, likeCount - 1) : likeCount + 1, commentCount });
      }
    } catch {}
  }

  return (
    <>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ px: 1, pb: 1 }}>
        <Button
          size="small"
          startIcon={userHasLiked ? <FavoriteRoundedIcon /> : <FavoriteBorderRoundedIcon />}
          onClick={togglePostLike}
        >
          {likeCount}
        </Button>
        <Button
          size="small"
          startIcon={<ChatBubbleOutlineRoundedIcon />}
          onClick={() => setCommentsOpen(true)}
        >
          {commentCount}
        </Button>
        <Button size="small" onClick={() => setLikesOpen(true)}>View likes</Button>
      </Stack>

      <LikesDialog open={likesOpen} onClose={() => setLikesOpen(false)} communityId={communityId} postId={post.id} />
      <CommentsDialog
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        communityId={communityId}
        postId={post.id}
      />
    </>
  );
}

// ---------- Wrapper that composes your existing PostWithActions + Social ----------
function PostShell({ item, communityId, onUpdated, onDeleted }) {
  return (
    <Box>
      {/* your original overlay card with Edit/Delete – untouched */}
      <PostWithActions
        item={item}
        communityId={communityId}
        onUpdated={onUpdated}
        onDeleted={onDeleted}
      />
      {/* new social row below the card */}
      {!String(item.id).startsWith("local-") && (
        <PostSocialBar communityId={communityId} post={item} />
      )}
    </Box>
  );
}


// ------- overlay wrapper (no changes to your PostCard) -------
function PostWithActions({ item, communityId, onUpdated, onDeleted }) {
  const [editOpen, setEditOpen] = React.useState(false);
  const [delOpen, setDelOpen] = React.useState(false);

  return (
    <Box sx={{ position: "relative" }}>
      <PostCard item={item} />
      <Stack
        direction="row"
        spacing={1}
        sx={{ position: "absolute", top: 8, right: 8, zIndex: 1 }}
      >
        <Tooltip title="Edit">
          <IconButton size="small" onClick={() => setEditOpen(true)}>
            <EditRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete">
          <IconButton size="small" color="error" onClick={() => setDelOpen(true)}>
            <DeleteOutlineRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>

      <EditPostDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        item={item}
        communityId={communityId}
        onSaved={(u) => onUpdated?.(u)}
      />
      <DeleteConfirmDialog
        open={delOpen}
        onClose={() => setDelOpen(false)}
        item={item}
        communityId={communityId}
        onDeleted={() => onDeleted?.(item.id)}
      />
    </Box>
  );
}


// ------- create dialog -------
function CreatePostDialog({ open, onClose, onCreated, communityId }) {
  // types: text | image | link | poll  (event removed)
  const [type, setType] = React.useState("text");

  // text
  const [text, setText] = React.useState("");

  // image
  const [imageFile, setImageFile] = React.useState(null);
  const [imagePreview, setImagePreview] = React.useState("");
  const [caption, setCaption] = React.useState("");

  // link
  const [linkUrl, setLinkUrl] = React.useState("");
  const [linkTitle, setLinkTitle] = React.useState("");
  const [linkDesc, setLinkDesc] = React.useState("");

  // poll (no multi-select, no closes_at)
  const [question, setQuestion] = React.useState("");
  const [pollOptions, setPollOptions] = React.useState(["", ""]);

  // common
  const [tags, setTags] = React.useState("");
  const [toast, setToast] = React.useState({ open: false, type: "success", msg: "" });

  React.useEffect(() => {
    if (!open) {
      setType("text");
      setText("");
      setImageFile(null);
      setImagePreview("");
      setCaption("");
      setLinkUrl("");
      setLinkTitle("");
      setLinkDesc("");
      setQuestion("");
      setPollOptions(["", ""]);
      setTags("");
    }
  }, [open]);

  const onPickImage = (file) => {
    setImageFile(file || null);
    if (file) {
      const r = new FileReader();
      r.onload = (ev) => setImagePreview(String(ev.target?.result || ""));
      r.readAsDataURL(file);
    } else {
      setImagePreview("");
    }
  };

  const canCreate = () => {
    if (type === "text") return !!text.trim();
    if (type === "image") return !!imageFile;
    if (type === "link") return !!linkUrl.trim();
    if (type === "poll") return !!question.trim() && pollOptions.filter((o) => o.trim()).length >= 2;
    return false;
  };

  const handleCreate = async () => {
    if (!communityId) {
      setToast({ open: true, type: "error", msg: "No community selected yet." });
      return;
    }
    const tokenHeaders = authHeader();
    const COMMUNITY_CREATE_URL = `${API_ROOT}/communities/${communityId}/posts/create/`;

    try {
      let res, payload;

      if (type === "link") {
        payload = {
          type: "link",
          url: linkUrl,
          title: linkTitle,
          description: linkDesc,
          tags: tags.split(",").map(s => s.trim()).filter(Boolean),
          visibility: "community",
        };
        res = await fetch(COMMUNITY_CREATE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...tokenHeaders },
          body: JSON.stringify(payload),
        });

      } else if (type === "image") {
        const fd = new FormData();
        fd.append("type", "image");
        fd.append("caption", caption || "");
        fd.append("visibility", "community");
        tags.split(",").map(s => s.trim()).filter(Boolean).forEach(t => fd.append("tags", t));
        if (imageFile) fd.append("image", imageFile);

        res = await fetch(COMMUNITY_CREATE_URL, {
          method: "POST",
          headers: { ...tokenHeaders }, // let browser set multipart boundary
          body: fd,
        });

      } else if (type === "poll") {
        // Create poll via Activity Feed, scoped to the community
        const pollPayload = {
          question,
          options: pollOptions.map(o => o.trim()).filter(Boolean),
          community_id: Number(communityId),
          // allows_multiple, is_anonymous, closes_at can be added later
        };

        res = await fetch(`${API_ROOT}/activity/feed/polls/create/`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...tokenHeaders },
          body: JSON.stringify(pollPayload),
        });

        const json = res.ok ? await res.json() : null;

        const created =
          json?.poll
            ? {
              id: json.feed_item_id || `local-${Date.now()}`, // FEED ITEM id (used for voting)
              created_at: new Date().toISOString(),
              type: "poll",
              question: json.poll.question,
              is_closed: !!json.poll.is_closed,
              options: (json.poll.options || []).map(o => ({
                id: o.id,
                label: o.text,
                votes: o.vote_count ?? 0,
              })),
              user_votes: json.poll.user_votes || [],
              community_id: pollPayload.community_id,
            }
            : {
              id: `local-${Date.now()}`,
              created_at: new Date().toISOString(),
              type: "poll",
              question,
              options: pollOptions
                .map(t => t.trim())
                .filter(Boolean)
                .map((t, i) => ({ id: i + 1, label: t, votes: 0 })),
              user_votes: [],
              community_id: pollPayload.community_id,
            };

        onCreated?.(created);   // list will show instantly
        onClose?.();
        return;

      } else {
        // text
        payload = {
          type: "text",
          content: text,
          tags: tags.split(",").map(s => s.trim()).filter(Boolean),
          visibility: "community",
        };
        res = await fetch(COMMUNITY_CREATE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...tokenHeaders },
          body: JSON.stringify(payload),
        });
      }

      const created = res.ok
        ? await res.json()
        : { id: `local-${Date.now()}`, created_at: new Date().toISOString(), type, text };

      onCreated?.(created);   // list will show instantly
      onClose?.();

    } catch (e) {
      onCreated?.({
        id: `local-${Date.now()}`,
        created_at: new Date().toISOString(),
        type,
        text,
        caption,
        url: linkUrl,
        title: linkTitle,
        description: linkDesc,
        question,
        options: pollOptions.filter(Boolean),
        image_preview: imagePreview,
      });
      onClose?.();
      setToast({ open: true, type: "error", msg: "Saved locally (API not available)." });
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth keepMounted>
        <DialogTitle>Create Post</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              size="small"
              label="Post Type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              sx={{ maxWidth: 260 }}
            >
              <MenuItem value="text">Text</MenuItem>
              <MenuItem value="image">Image</MenuItem>
              <MenuItem value="link">Link</MenuItem>
              <MenuItem value="poll">Poll</MenuItem>
            </TextField>

            {type === "text" && (
              <TextField
                label="Write something…"
                multiline
                minRows={5}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Share an update with your community"
                fullWidth
              />
            )}

            {type === "image" && (
              <Stack spacing={1.5}>
                <Box
                  sx={{
                    width: "100%",
                    border: `1px dashed ${BORDER}`,
                    borderRadius: 2,
                    p: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: 140,
                    bgcolor: "#fafafa",
                  }}
                >
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="preview"
                      style={{ maxWidth: "100%", maxHeight: 240, borderRadius: 12 }}
                    />
                  ) : (
                    <Stack alignItems="center" spacing={1}>
                      <ImageRoundedIcon />
                      <Typography variant="body2" color="text.secondary">
                        Image preview
                      </Typography>
                    </Stack>
                  )}
                </Box>
                <Row>
                  <Button component="label" variant="outlined" startIcon={<ImageRoundedIcon />}>
                    Choose image
                    <input
                      hidden
                      type="file"
                      accept="image/*"
                      onChange={(e) => onPickImage(e.target.files?.[0] || null)}
                    />
                  </Button>
                  <TextField
                    label="Caption (optional)"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    fullWidth
                  />
                </Row>
              </Stack>
            )}

            {type === "link" && (
              <Stack spacing={1.5}>
                <TextField
                  label="URL"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com/article"
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LinkIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
                <Row>
                  <TextField
                    label="Title (optional)"
                    value={linkTitle}
                    onChange={(e) => setLinkTitle(e.target.value)}
                    fullWidth
                  />
                </Row>
                <TextField
                  label="Description (optional)"
                  value={linkDesc}
                  onChange={(e) => setLinkDesc(e.target.value)}
                  multiline
                  minRows={2}
                  fullWidth
                />
              </Stack>
            )}

            {type === "poll" && (
              <Stack spacing={1.5}>
                <TextField
                  label="Question"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  fullWidth
                />
                <Stack spacing={1}>
                  {pollOptions.map((opt, i) => (
                    <Row key={i}>
                      <TextField
                        label={`Option ${i + 1}`}
                        value={opt}
                        onChange={(e) =>
                          setPollOptions((p) => p.map((x, idx) => (idx === i ? e.target.value : x)))
                        }
                        fullWidth
                      />
                      <Button
                        color="error"
                        onClick={() => setPollOptions((p) => p.filter((_, idx) => idx !== i))}
                        disabled={pollOptions.length <= 2}
                      >
                        Remove
                      </Button>
                    </Row>
                  ))}
                  <Button onClick={() => setPollOptions((p) => [...p, ""])} startIcon={<AddRoundedIcon />}>
                    Add option
                  </Button>
                </Stack>
              </Stack>
            )}

          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate} variant="contained" disabled={!canCreate() || !communityId}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toast.open}
        autoHideDuration={2800}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity={toast.type === "error" ? "error" : "success"}
          variant="filled"
          onClose={() => setToast((t) => ({ ...t, open: false }))}
        >
          {toast.msg}
        </Alert>
      </Snackbar>
    </>
  );
}

// ------- page -------
export default function AdminPostsPage() {
  const { id: routeCommunityId } = useParams();
  const [activeCommunityId, setActiveCommunityId] = React.useState(null);
  const [search, setSearch] = React.useState("");
  const [items, setItems] = React.useState([]);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [loadingErr, setLoadingErr] = React.useState("");

  React.useEffect(() => {
    if (routeCommunityId) {
      setActiveCommunityId(routeCommunityId);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${API_ROOT}/communities/`, {
          headers: { Accept: "application/json", ...authHeader() },
        });
        if (!res.ok) return;
        const data = await res.json();
        const list = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
        if (list.length > 0) {
          setActiveCommunityId(String(list[0].id)); // first community
        }
      } catch {
        // ignore; user might not belong to any community yet
      }
    })();
  }, [routeCommunityId]);

  function mapFeedPollToAdminItem(row) {
    const m = row?.metadata || {};
    if ((m.type || row.type) !== "poll") return null;

    const options = (m.options || []).map(o => ({
      id: o.id ?? o.option_id ?? null,
      text: o.text ?? o.label ?? "",
      vote_count: o.vote_count ?? o.votes ?? 0,
    }));

    return {
      // Note: this is the FEED ITEM id (not a community post id)
      id: row.id,
      type: "poll",
      created_at: row.created_at || new Date().toISOString(),
      community: { id: row.community_id, name: row.community_name || `Community #${row.community_id}` },
      question: m.question || "",
      options,
      tags: m.tags || [],
      __source: "feed",            // marker (optional)
      __feed_item_id: row.id,      // marker (optional)
    };
  }


  const load = React.useCallback(async () => {
    setLoadingErr("");
    try {
      if (!activeCommunityId) return;

      // ---- existing posts API (text/image/link) ----
      const postsUrl = new URL(`${API_ROOT}/communities/${activeCommunityId}/posts/`, API_ROOT);
      if (search.trim()) postsUrl.searchParams.set("search", search.trim());

      // ---- feed API for polls ----
      const feedUrl = new URL(`${API_ROOT}/activity/feed/`, API_ROOT);
      feedUrl.searchParams.set("scope", "community");
      feedUrl.searchParams.set("community_id", String(activeCommunityId));
      if (search.trim()) {
        feedUrl.searchParams.set("q", search.trim());
        feedUrl.searchParams.set("search", search.trim());
      }

      const [resPosts, resFeed] = await Promise.all([
        fetch(postsUrl.toString(), { headers: { Accept: "application/json", ...authHeader() } }),
        fetch(feedUrl.toString(), { headers: { Accept: "application/json", ...authHeader() } }),
      ]);

      const postsJson = resPosts.ok ? await resPosts.json() : [];
      const posts = Array.isArray(postsJson?.results) ? postsJson.results
        : Array.isArray(postsJson) ? postsJson : [];

      const feedJson = resFeed.ok ? await resFeed.json() : [];
      const feedRows = Array.isArray(feedJson?.results) ? feedJson.results
        : Array.isArray(feedJson) ? feedJson : [];
      const polls = feedRows.map(mapFeedPollToAdminItem).filter(Boolean);

      // merge + sort (newest first)
      const merged = [...posts, ...polls].sort((a, b) => {
        const ta = new Date(a.created_at || 0).getTime();
        const tb = new Date(b.created_at || 0).getTime();
        return tb - ta;
      });

      setItems(merged);
    } catch {
      setItems([]);
      setLoadingErr("Network error");
    }
  }, [search, activeCommunityId]);

  React.useEffect(() => {
    if (activeCommunityId) load();
  }, [load, activeCommunityId]);

  const handleCreated = (p) => setItems((prev) => [p, ...prev]);

  return (
    <Box sx={{ py: 3 }}>
      <Container maxWidth="lg">
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar sx={{ bgcolor: "#14b8b1" }}>A</Avatar>
            <Box>
              <Typography variant="h5" fontWeight={800}>Admin Posts</Typography>
              <Typography color="text.secondary">Publish community-wide updates from the dashboard.</Typography>
            </Box>
          </Stack>
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={() => setCreateOpen(true)}
            sx={{ borderRadius: 2 }}
            disabled={!activeCommunityId}   // ← guard
          >
            Create Post
          </Button>
        </Stack>

        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
          <TextField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your posts..."
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ width: { xs: "100%", sm: 360 } }}
            onKeyDown={(e) => e.key === "Enter" && load()}
          />
        </Stack>

        <Box>
          {items.length === 0 ? (
            <Paper
              variant="outlined"
              sx={{
                borderRadius: 3,
                borderColor: BORDER,
                p: 4,
                textAlign: "center",
                color: loadingErr ? "error.main" : "text.secondary",
              }}
            >
              {loadingErr ? loadingErr : "No posts yet."}
            </Paper>
          ) : (
            <Stack spacing={2}>
              {items.map((it) => (
                <PostShell
                  key={it.id || it.created_at}
                  item={it}
                  communityId={activeCommunityId}
                  onUpdated={(updated) =>
                    setItems((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)))
                  }
                  onDeleted={(id) =>
                    setItems((prev) => prev.filter((p) => p.id !== id))
                  }
                />
              ))}

            </Stack>
          )}
        </Box>
      </Container>

      <CreatePostDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
        communityId={activeCommunityId}
      />
    </Box>
  );
}
