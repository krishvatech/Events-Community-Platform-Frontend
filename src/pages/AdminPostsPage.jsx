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
  Divider, List, ListItem, ListItemAvatar, ListItemText, AvatarGroup, Badge, Checkbox
} from "@mui/material";
import { IconButton, Tooltip, CircularProgress, DialogContentText } from "@mui/material";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import SearchIcon from "@mui/icons-material/Search";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import LinkIcon from "@mui/icons-material/Link";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import IosShareRoundedIcon from "@mui/icons-material/IosShareRounded";
import Pagination from "@mui/material/Pagination";
import RepeatRoundedIcon from "@mui/icons-material/RepeatRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";




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

// --- BEGIN: engagements helpers (ported from LiveFeed) ---
function toApiUrl(pathOrUrl) {
  try { return new URL(pathOrUrl).toString(); } catch {
    const rel = String(pathOrUrl).replace(/^\/+/, "");
    return `${API_ROOT}/${rel.replace(/^api\/+/, "")}`;
  }
}
function authHeaders() { return { ...authHeader() }; }

// --- media URL helpers (ensure absolute) ---
const API_HOST = API_ROOT.replace(/\/api\/?$/, "");
function absMedia(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url) || url.startsWith("data:")) return url;
  if (url.startsWith("/")) return `${API_HOST}${url}`;
  return `${API_HOST}/${url}`;
}

function avatarFrom(u) {
  if (!u) return "";
  const raw =
    // direct fields
    u?.avatar_url ?? u?.avatar ??
    u?.user_image_url ?? u?.user_image ??
    u?.image ?? u?.photo ??
    // nested profile shapes
    u?.profile?.avatar_url ?? u?.profile?.avatar ?? u?.profile?.image ??
    u?.profile?.user_image_url ?? u?.profile?.user_image ??
    // some backends expose user_profile instead of profile
    u?.user_profile?.avatar_url ?? u?.user_profile?.avatar ?? u?.user_profile?.image ??
    u?.user_profile?.user_image ??
    // occasional alternates
    u?.profile_pic ?? u?.profile_picture ?? "";
  return absMedia(raw);
}


function nameFrom(u) {
  if (!u) return "";
  return u.full_name || u.name || u.username ||
    [u.first_name, u.last_name].filter(Boolean).join(" ") || "";
}

// Try nested author object first, then flat fields on the item
function headerAvatarFromItem(item) {
  // prefer a nested author-ish object first
  const headerAuthor =
    (typeof item?.created_by === "object" ? item.created_by : null) ||
    (typeof item?.author === "object" ? item.author : null) ||
    (typeof item?.owner === "object" ? item.owner : null) ||
    (typeof item?.user === "object" ? item.user : null) ||
    (typeof item?.user_profile === "object" ? item.user_profile : null) ||
    (typeof item?.profile === "object" ? item.profile : null) ||
    (typeof item?.creator === "object" ? item.creator : null) ||
    (typeof item?.posted_by === "object" ? item.posted_by : null) ||
    (typeof item?.actor === "object" ? item.actor : null);

  const nested = avatarFrom(headerAuthor);
  if (nested) return nested;

  // fallback: direct fields on the item (cover *_user_image, *_image, *_photo variants)
  const raw =
    // author-based
    item?.author_avatar || item?.author_avatar_url ||
    item?.author_user_image || item?.author_user_image_url ||
    item?.author_image || item?.author_photo ||
    // created_by-based
    item?.created_by_avatar || item?.created_by_avatar_url ||
    item?.created_by_user_image || item?.created_by_user_image_url ||
    item?.created_by_image || item?.created_by_photo ||
    // other common aliases
    item?.owner_avatar || item?.owner_avatar_url ||
    item?.posted_by_avatar || item?.posted_by_avatar_url ||
    item?.creator_avatar || item?.creator_avatar_url ||
    // generic user fields
    item?.user_image || item?.user_image_url ||
    item?.avatar || item?.avatar_url ||
    item?.image || item?.photo || "";

  return absMedia(raw);
}


function headerNameFromItem(item) {
  const headerAuthor =
    (typeof item?.created_by === "object" ? item.created_by : null) ||
    (typeof item?.author === "object" ? item.author : null) ||
    (typeof item?.owner === "object" ? item.owner : null) ||
    (typeof item?.user === "object" ? item.user : null) ||
    (typeof item?.user_profile === "object" ? item.user_profile : null) ||
    (typeof item?.profile === "object" ? item.profile : null) ||
    (typeof item?.creator === "object" ? item.creator : null) ||
    (typeof item?.posted_by === "object" ? item.posted_by : null) ||
    (typeof item?.actor === "object" ? item.actor : null);

  return (
    nameFrom(headerAuthor) ||
    item?.created_by_name || item?.author_name || item?.owner_name ||
    item?.posted_by_name || item?.creator_name || item?.user_name ||
    "Admins"
  );
}



// Map a post to the correct engagement target (feed item | event | resource)
function engageTargetOf(post) {
  if (post?.type === "resource" && post?.resource?.id) {
    return { type: "content.resource", id: Number(post.resource.id) };
  }
  if (post?.type === "event" && (post?.event?.id || post?.id)) {
    return { type: "events.event", id: Number(post.event?.id || post.id) };
  }
  return { type: null, id: Number(post.id) }; // default: feed item
}

// Fetch like/comment/share counts (and me-liked) for a single target
async function fetchEngagementCountsForTarget(target) {
  if (!target?.id) return { likes: 0, comments: 0, shares: 0, user_has_liked: false };
  const tt = target.type ? `&target_type=${encodeURIComponent(target.type)}` : "";
  const r = await fetch(
    toApiUrl(`engagements/metrics/?ids=${target.id}${tt}`),
    { headers: { Accept: "application/json", ...authHeaders() } }
  );
  if (!r.ok) return { likes: 0, comments: 0, shares: 0, user_has_liked: false };
  const j = await r.json();
  return j[String(target.id)] || { likes: 0, comments: 0, shares: 0, user_has_liked: false };
}

// small concurrency helper (for fetching replies)
async function runLimited(items, limit, worker) {
  const out = new Array(items.length); let i = 0; const pool = new Set();
  async function one(idx) { const p = worker(items[idx]).then(res => out[idx] = res).finally(() => pool.delete(p)); pool.add(p); if (pool.size >= limit) await Promise.race(pool); }
  while (i < items.length) await one(i++);
  await Promise.all(pool);
  return out;
}
// --- END: engagements helpers ---


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
          <Avatar src={headerAvatarFromItem(item)} sx={{ width: 28, height: 28 }}>
            {headerNameFromItem(item).slice(0, 1)}
          </Avatar>

          <Typography variant="subtitle2" color="text.secondary">
            {headerNameFromItem(item)} • {new Date(item.created_at || Date.now()).toLocaleString()}
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
// ---------- Likes dialog (uses engagements/*, with fallbacks) ----------
// ---------- Likes dialog (engagements-first with robust fallbacks) ----------
function LikesDialog({ open, onClose, communityId, postId, target: propTarget }) {
  const [loading, setLoading] = React.useState(true);
  const [rows, setRows] = React.useState([]);

  // normalize many possible payload shapes -> [{id,name,avatar}]
  const normalizeUsers = (payload) => {
    const arr = Array.isArray(payload) ? payload
      : Array.isArray(payload?.results) ? payload.results
        : Array.isArray(payload?.data) ? payload.data
          : Array.isArray(payload?.items) ? payload.items
            : Array.isArray(payload?.likers) ? payload.likers
              : Array.isArray(payload?.likes) ? payload.likes
                : [];

    return arr.map((r) => {
      const u = r.user || r.actor || r.owner || r.created_by || r.author || r.user_profile || r.profile || r;
      const id = u?.id ?? u?.user_id ?? r.user_id ?? r.id;
      const name =
        u?.full_name || u?.name || u?.username ||
        [u?.first_name, u?.last_name].filter(Boolean).join(" ") ||
        (id ? `User #${id}` : "User");
      const avatar =
        avatarFrom(u) ||
        absMedia(r.user_image || r.user_image_url || r.avatar || r.avatar_url || "");
      return id ? { id, name, avatar } : null;
    }).filter(Boolean);
  };


  const load = React.useCallback(async () => {
    if (!open) return;
    setLoading(true);

    const tgt = propTarget?.id ? propTarget : { id: postId, type: null };

    // Try the new engagements APIs first, then legacy fallbacks.
    const urls = [
      // primary: reactions filtered to like
      (tgt.type
        ? `${API_ROOT}/engagements/reactions/?reaction=like&target_type=${encodeURIComponent(tgt.type)}&target_id=${tgt.id}&page_size=200`
        : `${API_ROOT}/engagements/reactions/?reaction=like&target_id=${tgt.id}&page_size=200`),

      // helper: who-liked (feed_item form)
      `${API_ROOT}/engagements/reactions/who-liked/?feed_item=${tgt.id}`,

      // helper: who-liked (target_type/target_id form, if supported)
      (tgt.type
        ? `${API_ROOT}/engagements/reactions/who-liked/?target_type=${encodeURIComponent(tgt.type)}&target_id=${tgt.id}`
        : null),

      // legacy community/feed fallbacks
      (communityId ? `${API_ROOT}/communities/${communityId}/posts/${postId}/likes/` : null),
      `${API_ROOT}/activity/feed/${postId}/likes/`,
    ].filter(Boolean);


    const collected = [];
    for (const url of urls) {
      try {
        let next = url;
        while (next) {
          const res = await fetch(next, { headers: { Accept: "application/json", ...authHeader() } });
          if (!res.ok) break;
          const json = await res.json();
          collected.push(...normalizeUsers(json));
          const n = json?.next;
          next = n ? (/^https?:/i.test(n) ? n : `${API_ROOT}${n.startsWith("/") ? "" : "/"}${n}`) : null;
        }
        if (collected.length) break; // stop once one endpoint works
      } catch { }
    }

    // de-dupe
    const seen = new Set();
    const dedup = [];
    for (const u of collected) {
      const k = (u.id != null) ? `id:${u.id}` : `name:${(u.name || "").toLowerCase()}`;
      if (!seen.has(k)) { seen.add(k); dedup.push(u); }
    }
    setRows(dedup);

    setLoading(false);
  }, [open, communityId, postId, propTarget?.id, propTarget?.type]);

  React.useEffect(() => { load(); }, [load]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{`Liked by${rows.length ? ` (${rows.length})` : ""}`}</DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Stack alignItems="center" py={3}><CircularProgress size={22} /></Stack>
        ) : rows.length === 0 ? (
          <Typography color="text.secondary">No likes yet.</Typography>
        ) : (
          <List>
            {rows.map((u) => (
              <ListItem key={u.id}>
                <ListItemAvatar><Avatar src={u.avatar} alt={u.name} /></ListItemAvatar>
                <ListItemText primary={u.name} />
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Close</Button></DialogActions>
    </Dialog>
  );
}

function SharesDialog({ open, onClose, communityId, postId, target: propTarget }) {
  const [loading, setLoading] = React.useState(true);
  const [rows, setRows] = React.useState([]);

  // normalize many possible payload shapes -> [{id,name,avatar}]
  const normalizeUsers = (payload) => {
    const arr = Array.isArray(payload) ? payload
      : Array.isArray(payload?.results) ? payload.results
        : Array.isArray(payload?.data) ? payload.data
          : Array.isArray(payload?.items) ? payload.items
            : Array.isArray(payload?.shares) ? payload.shares
              : [];

    return arr.map((r) => {
      const u = r.user || r.actor || r.owner || r.shared_by || r.sender || r.created_by || r.author || r.profile || r;
      const id = u?.id ?? u?.user_id ?? r.user_id ?? r.actor_id ?? r.owner_id ?? r.shared_by_id ?? r.id;
      const name =
        u?.full_name || u?.name || u?.username ||
        [u?.first_name, u?.last_name].filter(Boolean).join(" ") ||
        (id ? `User #${id}` : "User");
      const rawAvatar =
        u?.avatar_url || u?.user_image_url || u?.user_image ||
        u?.avatar || u?.photo || u?.image || u?.profile?.avatar_url || u?.profile?.avatar ||
        r.user_image || r.user_image_url || r.avatar || "";
      return id ? { id, name, avatar: absMedia(rawAvatar) } : null;
    }).filter(Boolean);
  };


  const load = React.useCallback(async () => {
    if (!open) return;
    setLoading(true);

    const tgt = propTarget?.id ? propTarget : { id: postId, type: null };

    // Shares in your API are keyed by feed_item ⇒ query that first,
    // then fall back to legacy/alternate routes.
    const urls = [
      `${API_ROOT}/engagements/shares/?feed_item=${tgt.id}&page_size=200`,
      `${API_ROOT}/activity/feed/${tgt.id}/shares/`,
      (tgt.type
        ? `${API_ROOT}/engagements/shares/?target_type=${encodeURIComponent(tgt.type)}&target_id=${tgt.id}&page_size=200`
        : null),
    ].filter(Boolean);

    const collected = [];
    for (const url of urls) {
      try {
        let next = url;
        while (next) {
          const res = await fetch(next, { headers: { Accept: "application/json", ...authHeader() } });
          if (!res.ok) break;
          const json = await res.json();
          collected.push(...normalizeUsers(json));
          const n = json?.next;
          next = n ? (/^https?:/i.test(n) ? n : `${API_ROOT}${n.startsWith("/") ? "" : "/"}${n}`) : null;
        }
        if (collected.length) break; // stop once one endpoint works
      } catch { /* ignore and try next */ }
    }

    // de-dupe
    const seen = new Set();
    const unique = [];
    for (const u of collected) {
      const k = (u.id != null) ? `id:${u.id}` : `name:${(u.name || "").toLowerCase()}`;
      if (!seen.has(k)) { seen.add(k); unique.push(u); }
    }

    setRows(unique);
    setLoading(false);
  }, [open, postId, propTarget?.id, propTarget?.type]);

  React.useEffect(() => { load(); }, [load]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{`Shared by${rows.length ? ` (${rows.length})` : ""}`}</DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Stack alignItems="center" py={3}><CircularProgress size={22} /></Stack>
        ) : rows.length === 0 ? (
          <Typography color="text.secondary">No shares yet.</Typography>
        ) : (
          <List>
            {rows.map((u) => (
              <ListItem key={u.id || u.name}>
                <ListItemAvatar><Avatar src={u.avatar} alt={u.name} /></ListItemAvatar>
                <ListItemText primary={u.name} />
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Close</Button></DialogActions>
    </Dialog>
  );
}


// ---------- Comments dialog (engagements/comments + replies + comment-like) ----------
function CommentsDialog({
  open,
  onClose,
  communityId,
  postId,
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
  const [visibleCount, setVisibleCount] = React.useState(initialCount);

  React.useEffect(() => {
    if (!inline && !open) return;
    (async () => {
      try {
        const r = await fetch(toApiUrl(`users/me/`), { headers: { ...authHeaders() } });
        setMe(r.ok ? await r.json() : {});
      } catch { setMe({}); }
    })();
  }, [open, inline]);

  const normalizeCommentRow = (c) => {
    const parent_id =
      c.parent_id ??
      (typeof c.parent === "number" ? c.parent : (typeof c.parent === "object" ? c.parent?.id : null)) ??
      c.parentId ?? null;

    const rawAuthor = c.author || c.user || c.created_by || c.owner || c.user_profile || c.profile || {};
    const author_id = rawAuthor.id ?? c.author_id ?? c.user_id ?? c.created_by_id ?? null;
    const name =
      rawAuthor.name || rawAuthor.full_name ||
      (rawAuthor.first_name || rawAuthor.last_name
        ? `${rawAuthor.first_name || ""} ${rawAuthor.last_name || ""}`.trim()
        : rawAuthor.username) ||
      (author_id ? `User #${author_id}` : "User");
    const avatar = avatarFrom(rawAuthor) || absMedia(c.author_avatar || "");
    return { ...c, parent_id, author_id, author: { id: author_id, name, avatar } };
  };

  const load = React.useCallback(async () => {
    if ((!inline && !open)) return;
    const tgt = target?.id ? target : { id: postId, type: null };
    setLoading(true);
    try {
      // 1) fetch roots
      const params = new URLSearchParams();
      if (tgt.type) params.set("target_type", tgt.type);
      params.set("target_id", String(tgt.id));
      params.set("page_size", "200");

      const r = await fetch(toApiUrl(`engagements/comments/?${params.toString()}`), {
        headers: { Accept: "application/json", ...authHeaders() },
      });
      const j = r.ok ? await r.json() : [];
      const roots = (Array.isArray(j?.results) ? j.results : Array.isArray(j) ? j : []).map(normalizeCommentRow);

      // 2) fetch replies for each root (parallel)
      const replyUrls = roots.map(root => toApiUrl(`engagements/comments/?parent=${root.id}&page_size=200`));
      const replyPages = await runLimited(replyUrls, 3, async (url) => {
        try {
          const rr = await fetch(url, { headers: { Accept: "application/json", ...authHeaders() } });
          return rr.ok ? await rr.json() : [];
        } catch { return []; }
      });
      const replies = replyPages.flatMap(pg => {
        const arr = Array.isArray(pg?.results) ? pg.results : (Array.isArray(pg) ? pg : []);
        return arr.map(normalizeCommentRow);
      });

      setItems([...roots, ...replies]);
      setVisibleCount(initialCount);

      // hydrate comment like counts
      try {
        const ids = [...roots, ...replies].map(c => c.id);
        if (ids.length) {
          const rc = await fetch(
            toApiUrl(`engagements/reactions/counts/?target_type=comment&ids=${ids.join(",")}`),
            { headers: { Accept: "application/json", ...authHeaders() } }
          );
          if (rc.ok) {
            const payload = await rc.json();
            const map = payload?.results || {};
            setItems(curr =>
              curr.map(c => {
                const m = map[String(c.id)];
                return m ? { ...c, like_count: m.like_count ?? c.like_count, user_has_liked: !!m.user_has_liked } : c;
              })
            );
          }
        }
      } catch { }
    } catch { setItems([]); }
    setLoading(false);
  }, [open, inline, initialCount, postId, target?.id, target?.type]);

  React.useEffect(() => { load(); }, [load]);

  const myId = me?.id || me?.user?.id;
  const isAdmin = !!(me?.is_staff || me?.is_superuser || me?.is_moderator || me?.isAdmin);

  function canDelete(c) { return c?.author_id === myId || isAdmin; }

  async function createComment(body, parentId = null) {
    if (!body.trim()) return;
    const tgt = target?.id ? target : { id: postId, type: null };
    const rootPayload = tgt.type
      ? { text: body, target_type: tgt.type, target_id: tgt.id }
      : { text: body, target_id: tgt.id };
    const payload = parentId ? { text: body, parent: parentId } : rootPayload;

    try {
      const r = await fetch(toApiUrl(`engagements/comments/`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(payload),
      });
      if (r.ok) { setText(""); setReplyTo(null); await load(); }
    } catch { }
  }

  async function deleteComment(c) {
    if (!canDelete(c)) return;
    const ok = window.confirm("Delete this comment?");
    if (!ok) return;
    try {
      const r = await fetch(toApiUrl(`engagements/comments/${c.id}/`), { method: "DELETE", headers: { ...authHeaders() } });
      if (!r.ok) throw new Error();
      await load();
    } catch { alert("Could not delete comment."); }
  }

  async function toggleCommentLike(commentId) {
    // optimistic
    setItems(curr => curr.map(c => c.id === commentId
      ? { ...c, user_has_liked: !c.user_has_liked, like_count: Math.max(0, (c.like_count || 0) + (c.user_has_liked ? -1 : +1)) }
      : c
    ));
    try {
      const res = await fetch(toApiUrl(`engagements/reactions/toggle/`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ target_type: "comment", target_id: commentId, reaction: "like" }),
      });
      if (!res.ok) throw new Error();
      const rc = await fetch(
        toApiUrl(`engagements/reactions/counts/?target_type=comment&ids=${commentId}`),
        { headers: { Accept: "application/json", ...authHeaders() } }
      );
      if (rc.ok) {
        const payload = await rc.json();
        const m = payload?.results?.[String(commentId)];
        if (m) {
          setItems(curr => curr.map(c => c.id === commentId ? { ...c, like_count: m.like_count, user_has_liked: !!m.user_has_liked } : c));
        }
      }
    } catch {
      // rollback by reloading the single thread
      await load();
    }
  }

  // build tree
  const roots = React.useMemo(() => {
    const map = new Map();
    items.forEach(c => map.set(c.id, { ...c, children: [] }));
    map.forEach(c => { if (c.parent_id && map.get(c.parent_id)) map.get(c.parent_id).children.push(c); });
    return [...map.values()].filter(c => !c.parent_id)
      .sort((a, b) => (new Date(b.created_at || 0)) - (new Date(a.created_at || 0)));
  }, [items]);

  const CommentItem = ({ c, depth = 0 }) => (
    <Box sx={{ pl: depth ? 2 : 0, borderLeft: depth ? `2px solid ${BORDER}` : "none", ml: depth ? 1.5 : 0, mt: depth ? 1 : 0 }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Avatar src={c.author?.avatar} sx={{ width: 28, height: 28 }} />
        <Typography variant="subtitle2">{c.author?.name || "User"}</Typography>
        <Typography variant="caption" color="text.secondary">
          {c.created_at ? new Date(c.created_at).toLocaleString() : ""}
        </Typography>
      </Stack>

      <Typography sx={{ mt: .5, whiteSpace: "pre-wrap" }}>{c.text}</Typography>

      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: .5 }}>
        <Button size="small"
          startIcon={c.user_has_liked ? <FavoriteRoundedIcon fontSize="small" /> : <FavoriteBorderRoundedIcon fontSize="small" />}
          onClick={() => toggleCommentLike(c.id)}
        >
          {c.like_count ?? 0}
        </Button>
        <Button size="small" startIcon={<ChatBubbleOutlineRoundedIcon fontSize="small" />} onClick={() => setReplyTo(c)}>
          Reply
        </Button>
        {canDelete(c) && <Button size="small" color="error" onClick={() => deleteComment(c)}>Delete</Button>}
      </Stack>

      {!!c.children?.length && (
        <Stack spacing={1} sx={{ mt: 1 }}>
          {c.children.sort((a, b) => (new Date(a.created_at || 0)) - (new Date(b.created_at || 0)))
            .map(child => <CommentItem key={child.id} c={child} depth={depth + 1} />)}
        </Stack>
      )}
    </Box>
  );

  // INLINE (like LiveFeed)
  if (inline) {
    const visibleRoots = roots.slice(0, visibleCount);
    const hasMore = roots.length > visibleRoots.length;
    return (
      <Box sx={{ mt: 1 }}>
        {replyTo && (
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Replying to {replyTo.author?.name || `#${replyTo.author_id}`}
            </Typography>
            <Button size="small" onClick={() => setReplyTo(null)}>Cancel</Button>
          </Stack>
        )}
        <Stack direction="row" spacing={1}>
          <TextField
            size="small" fullWidth
            placeholder={replyTo ? "Write a reply…" : "Write a comment…"}
            value={text}
            onChange={e => setText(e.target.value)}
            inputRef={inputRef || undefined}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); createComment(text, replyTo?.id || null); }
            }}
          />
          <Button variant="contained" onClick={() => createComment(text, replyTo?.id || null)} disabled={loading || !text.trim()}>
            Post
          </Button>
        </Stack>

        <Box sx={{ mt: 1.25 }}>
          {loading ? (
            <Stack alignItems="center" py={1.5}><CircularProgress size={18} /></Stack>
          ) : visibleRoots.length === 0 ? (
            <Typography variant="caption" color="text.secondary">Be the first to comment.</Typography>
          ) : (
            <Stack spacing={1.25}>
              {visibleRoots.map(c => <CommentItem key={c.id} c={c} />)}
            </Stack>
          )}
          {hasMore && (
            <Stack alignItems="flex-start" sx={{ mt: 1 }}>
              <Button size="small" variant="text" onClick={() => setVisibleCount(v => v + initialCount)}>
                Load more comments
              </Button>
            </Stack>
          )}
        </Box>
      </Box>
    );
  }

  // MODAL
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Comments</DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Stack alignItems="center" py={3}><CircularProgress size={22} /></Stack>
        ) : roots.length === 0 ? (
          <Typography color="text.secondary">No comments yet.</Typography>
        ) : (
          <Stack spacing={2}>{roots.map(c => <CommentItem key={c.id} c={c} />)}</Stack>
        )}
      </DialogContent>
      <Divider />
      <Box sx={{ px: 2, py: 1.5 }}>
        {replyTo && (
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Replying to {replyTo.author?.name || `#${replyTo.author_id}`}
            </Typography>
            <Button size="small" onClick={() => setReplyTo(null)}>Cancel</Button>
          </Stack>
        )}
        <Stack direction="row" spacing={1}>
          <TextField size="small" fullWidth placeholder={replyTo ? "Write a reply…" : "Write a comment…"}
            value={text} onChange={e => setText(e.target.value)} />
          <Button variant="contained" onClick={() => createComment(text, replyTo?.id || null)}>Post</Button>
        </Stack>
      </Box>
    </Dialog>
  );
}

function SharePickerDialog({ open, onClose, target, onShared }) {
  const [loading, setLoading] = React.useState(true);
  const [users, setUsers] = React.useState([]);
  const [groups, setGroups] = React.useState([]);
  const [selectedUsers, setSelectedUsers] = React.useState(new Set());
  const [selectedGroups, setSelectedGroups] = React.useState(new Set());
  const [sending, setSending] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [meId, setMeId] = React.useState(null);

  // --- helpers ---
  const fetchAllPages = React.useCallback(async (url) => {
    const out = [];
    let next = url;
    while (next) {
      const r = await fetch(next, { headers: { Accept: "application/json", ...authHeader() } });
      if (!r.ok) break;
      const j = await r.json();
      const arr = Array.isArray(j?.results) ? j.results :
        Array.isArray(j?.data) ? j.data :
          Array.isArray(j?.items) ? j.items :
            Array.isArray(j) ? j : [];
      out.push(...arr);
      const n = j?.next;
      next = n ? (/^https?:/i.test(n) ? n : `${API_ROOT}${n.startsWith("/") ? "" : "/"}${n}`) : null;
    }
    return out;
  }, []);

  // pick “the other user” out of a connection row
  const pickOtherUser = (row) => {
    const pairs = [
      ["from_user", "to_user"],
      ["requester", "receiver"],
      ["sender", "recipient"],
      ["user_a", "user_b"],
      ["user1", "user2"],
      ["initiator", "friend"]
    ];
    for (const [a, b] of pairs) {
      const A = row?.[a], B = row?.[b];
      if (A && B) {
        const aId = A?.id ?? A?.user_id;
        const bId = B?.id ?? B?.user_id;
        if (meId && aId === meId) return B;
        if (meId && bId === meId) return A;
        // if we don't know me yet, just return one
        return A || B;
      }
    }
    return null;
  };

  const normUser = (row) => {
    // direct user-like shapes first
    let u = row.friend || row.user || row.member || row.profile || row.owner || row.actor || null;

    // connection shapes (two participants)
    if (!u) u = pickOtherUser(row);

    // some APIs wrap it again (e.g., { friend: { user: {...} } })
    if (u && u.user && (u.user.id || u.user.user_id)) u = u.user;

    // last-ditch: some rows store user object under 'counterparty' or 'other_user'
    if (!u) u = row.counterparty || row.other_user || null;

    const id = u?.id ?? u?.user_id ?? row.friend_id ?? row.user_id ?? null;
    if (!id) return null;

    const name = u?.full_name || u?.name || u?.username ||
      [u?.first_name, u?.last_name].filter(Boolean).join(" ") || `User #${id}`;
    const avatar = u?.user_image || u?.user_image_url || u?.avatar || u?.avatar_url ||
      u?.photo || u?.image || u?.profile?.avatar || "";

    return { id, name, avatar };
  };

  const normGroup = (row) => {
    const g = row.group || row.target || row;
    const id = g?.id ?? row.group_id ?? null;
    if (!id) return null;
    const name = g?.name || g?.title || `Group #${id}`;
    const avatar = g?.avatar || g?.avatar_url || g?.icon || g?.image || g?.photo || "";
    return { id, name, avatar };
  };

  const dedupe = (arr) => {
    const seen = new Set();
    const out = [];
    for (const x of arr) {
      const k = `${x.id}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(x);
    }
    return out;
  };

  const load = React.useCallback(async () => {
    if (!open) return;
    setLoading(true);

    // who am I? (needed to pick the counterparty in a friendship row)
    try {
      const meRes = await fetch(`${API_ROOT}/users/me/`, { headers: { Accept: "application/json", ...authHeader() } });
      if (meRes.ok) {
        const me = await meRes.json();
        setMeId(me?.id || me?.user?.id || null);
      }
    } catch { }

    const tgtId = target?.id;

    // 1) single helper if you have it
    try {
      const url = tgtId
        ? `${API_ROOT}/engagements/share-targets/?feed_item=${tgtId}`
        : `${API_ROOT}/engagements/share-targets/`;
      const r = await fetch(url, { headers: { Accept: "application/json", ...authHeader() } });
      if (r.ok) {
        const j = await r.json();
        const u1 = (Array.isArray(j.users) ? j.users : []).map(normUser).filter(Boolean);
        const g1 = (Array.isArray(j.groups) ? j.groups : []).map(normGroup).filter(Boolean);
        if (u1.length || g1.length) {
          setUsers(dedupe(u1));
          setGroups(dedupe(g1));
          setLoading(false);
          return;
        }
      }
    } catch { /* fall through */ }

    // 2) Fallbacks – Friends (accepted connections; many possible routes)
    let uAll = [];
    try {
      const friendUrls = [
        `${API_ROOT}/friends/connections/?status=accepted&page_size=200`,
        `${API_ROOT}/friends/friendships/?status=accepted&page_size=200`,
        `${API_ROOT}/friends/?status=accepted&page_size=200`,
        `${API_ROOT}/users/connections/?page_size=200`,
        `${API_ROOT}/users/?connected=1&page_size=200`,
        `${API_ROOT}/users/friends/?page_size=200`,
      ];
      for (const u of friendUrls) {
        const rows = await fetchAllPages(u);
        if (rows.length) uAll.push(...rows.map(normUser).filter(Boolean));
        if (uAll.length) break;
      }
    } catch { /* ignore */ }

    // 3) Fallbacks – My Groups (memberships I belong to)
    let gAll = [];
    try {
      const groupUrls = [
        `${API_ROOT}/groups/memberships/?me=1&status=member&page_size=200`,
        `${API_ROOT}/groups/memberships/my/?page_size=200`,
        `${API_ROOT}/groups/?member=me&page_size=200`,
        `${API_ROOT}/groups/my/?page_size=200`,
      ];
      for (const g of groupUrls) {
        const rows = await fetchAllPages(g);
        if (rows.length) gAll.push(...rows.map(normGroup).filter(Boolean));
        if (gAll.length) break;
      }
    } catch { /* ignore */ }

    setUsers(dedupe(uAll));
    setGroups(dedupe(gAll));
    setLoading(false);
  }, [open, target?.id, fetchAllPages, meId]);

  React.useEffect(() => { load(); }, [load]);

  const filteredUsers = users.filter(u => !q || (u.name || "").toLowerCase().includes(q.toLowerCase()));
  const filteredGroups = groups.filter(g => !q || (g.name || "").toLowerCase().includes(q.toLowerCase()));

  const toggleSel = (bucket, setBucket, id) => {
    setBucket(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const doShare = async () => {
    if (!target?.id) return;
    const toUsers = Array.from(selectedUsers);
    const toGroups = Array.from(selectedGroups);
    if (toUsers.length === 0 && toGroups.length === 0) return;

    setSending(true);
    try {
      // LiveFeedPage uses target_id (and target_type when available), not feed_item
      const base = target.type
        ? { target_type: target.type, target_id: target.id }
        : { target_id: target.id };

      const res = await fetch(
        toApiUrl(`engagements/shares/`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ ...base, to_users: toUsers, to_groups: toGroups }),
        }
      );

      if (!res.ok) throw new Error("share_failed");

      // same UX as before: refresh counts + open "Shared by"
      onShared?.();
      onClose?.();
    } catch {
      alert("Could not share. Please try again.");
    } finally {
      setSending(false);
    }
  };


  return (
    <Dialog open={open} onClose={sending ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Share</DialogTitle>
      <DialogContent dividers>
        <TextField
          fullWidth size="small" placeholder="Search people or groups…"
          value={q} onChange={(e) => setQ(e.target.value)} sx={{ mb: 1.5 }}
        />
        {loading ? (
          <Stack alignItems="center" py={3}><CircularProgress size={22} /></Stack>
        ) : (
          <Stack spacing={2}>
            {!!filteredUsers.length && (
              <Box>
                <Typography variant="overline">People</Typography>
                <List dense>
                  {filteredUsers.map(u => (
                    <ListItem key={`u-${u.id}`} button onClick={() => toggleSel(selectedUsers, setSelectedUsers, u.id)}>
                      <ListItemAvatar><Avatar src={u.avatar}>{(u.name || "U").slice(0, 1)}</Avatar></ListItemAvatar>
                      <ListItemText primary={u.name || `User #${u.id}`} />
                      <Checkbox edge="end" checked={selectedUsers.has(u.id)} />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
            {!!filteredGroups.length && (
              <Box>
                <Typography variant="overline">Groups</Typography>
                <List dense>
                  {filteredGroups.map(g => (
                    <ListItem key={`g-${g.id}`} button onClick={() => toggleSel(selectedGroups, setSelectedGroups, g.id)}>
                      <ListItemAvatar><Avatar src={g.avatar}>{(g.name || "G").slice(0, 1)}</Avatar></ListItemAvatar>
                      <ListItemText primary={g.name || `Group #${g.id}`} />
                      <Checkbox edge="end" checked={selectedGroups.has(g.id)} />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
            {!filteredUsers.length && !filteredGroups.length && (
              <Typography color="text.secondary">No results.</Typography>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={sending}>Cancel</Button>
        <Button
          onClick={doShare}
          variant="contained"
          disabled={sending || (selectedUsers.size === 0 && selectedGroups.size === 0)}
        >
          {sending ? <CircularProgress size={18} /> : "Share"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}



// ---------- Social bar (uses engagements/*) ----------
function PostSocialBar({ communityId, post, onCounts }) {
  const target = React.useMemo(() => engageTargetOf(post), [post]);
  const [likeCount, setLikeCount] = React.useState(post.like_count ?? post.metrics?.likes ?? 0);
  const [commentCount, setCommentCount] = React.useState(post.comment_count ?? post.metrics?.comments ?? 0);
  const [userHasLiked, setUserHasLiked] = React.useState(!!post.user_has_liked);
  const [likesOpen, setLikesOpen] = React.useState(false);
  const commentInputRef = React.useRef(null);
  const [shareCount, setShareCount] = React.useState(post.share_count ?? post.metrics?.shares ?? 0);
  const [sharesOpen, setSharesOpen] = React.useState(false);
  const [commentsOpen, setCommentsOpen] = React.useState(false);
  const [likers, setLikers] = React.useState([]);
  const [sharePickerOpen, setSharePickerOpen] = React.useState(false);
  const normalizeUsers = (payload) => {
    const arr = Array.isArray(payload) ? payload
      : Array.isArray(payload?.results) ? payload.results
        : Array.isArray(payload?.data) ? payload.data
          : Array.isArray(payload?.items) ? payload.items
            : Array.isArray(payload?.likers) ? payload.likers
              : Array.isArray(payload?.likes) ? payload.likes
                : [];
    return arr.map((r) => {
      const u = r.user || r.actor || r.owner || r.created_by || r.author || r.profile || r;
      const id = u?.id ?? u?.user_id ?? r.user_id ?? r.id;
      const name =
        u?.full_name || u?.name || u?.username ||
        [u?.first_name, u?.last_name].filter(Boolean).join(" ") ||
        (id ? `User #${id}` : "User");
      const rawAvatar =
        u?.avatar_url || u?.user_image_url || u?.user_image ||
        u?.avatar || u?.photo || u?.image || u?.profile?.avatar_url || u?.profile?.avatar ||
        r.user_image || r.user_image_url || r.avatar || "";
      return id ? { id, name, avatar: absMedia(rawAvatar) } : null;
    }).filter(Boolean);
  };

  const loadTopLikers = React.useCallback(async () => {
    const tgt = target?.id ? target : { id: post.id, type: null };
    const urls = [
      (tgt.type
        ? `${API_ROOT}/engagements/reactions/?reaction=like&target_type=${encodeURIComponent(tgt.type)}&target_id=${tgt.id}&page_size=5`
        : `${API_ROOT}/engagements/reactions/?reaction=like&target_id=${tgt.id}&page_size=5`),
      `${API_ROOT}/engagements/reactions/who-liked/?feed_item=${tgt.id}&page_size=5`,
    ];
    for (const url of urls) {
      try {
        const r = await fetch(url, { headers: { Accept: "application/json", ...authHeader() } });
        if (!r.ok) continue;
        const j = await r.json();
        const list = normalizeUsers(j);
        if (list.length) { setLikers(list); return; }
      } catch { }
    }
    setLikers([]);
  }, [post.id, target?.id, target?.type]);

  React.useEffect(() => { loadTopLikers(); }, [loadTopLikers]);


  async function refreshCounts() {
    const c = await fetchEngagementCountsForTarget(target);
    setLikeCount(c.likes ?? 0);
    setCommentCount(c.comments ?? 0);
    setShareCount(c.shares ?? 0);
    setUserHasLiked(!!c.user_has_liked);
    onCounts?.({ likeCount: c.likes ?? 0, commentCount: c.comments ?? 0, shareCount: c.shares ?? 0 });

  }
  React.useEffect(() => { refreshCounts(); /* on mount */ }, [post.id]);

  async function togglePostLike() {
    // optimistic
    const willUnlike = userHasLiked;
    setUserHasLiked(!willUnlike);
    setLikeCount(n => Math.max(0, n + (willUnlike ? -1 : +1)));

    try {
      const body = target.type
        ? { target_type: target.type, target_id: target.id, reaction: "like" }
        : { target_id: target.id, reaction: "like" };

      const res = await fetch(toApiUrl(`engagements/reactions/toggle/`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      await refreshCounts();
    } catch {
      // rollback by resync
      await refreshCounts();
    }
  }

  return (
    <>
      {/* Meta strip: avatars + "Name and N others"  |  counts on the right */}
      <Box sx={{ px: 1.25, pt: 0.75, pb: 0.5 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          {/* Left: liker avatars + sentence */}
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ cursor: "pointer" }}
            onClick={() => setLikesOpen(true)}
          >
            <AvatarGroup
              max={3}
              sx={{ "& .MuiAvatar-root": { width: 24, height: 24, fontSize: 12 } }}
            >
              {(likers || []).slice(0, 3).map((u) => (
                <Avatar key={u.id || u.name} src={u.avatar} alt={u.name}>
                  {(u.name || "U").slice(0, 1)}
                </Avatar>
              ))}
            </AvatarGroup>

            <Typography variant="body2">
              {likers?.[0]?.name ? (
                Math.max(0, (likeCount || 0) - 1) > 0
                  ? `${likers[0].name} and ${Math.max(0, (likeCount || 0) - 1).toLocaleString()} others`
                  : likers[0].name
              ) : (
                `${(likeCount || 0).toLocaleString()} ${Number(likeCount || 0) === 1 ? "like" : "likes"}`
              )}
            </Typography>

          </Stack>

          {/* Right: shares */}
          <Stack direction="row" alignItems="center" spacing={1}>
            <Button size="small" onClick={() => setSharesOpen(true)}>
              {Number(shareCount || 0).toLocaleString()} shares
            </Button>
          </Stack>

        </Stack>
      </Box>

      {/* Action row: Like / Comment / Repost / Send */}
      <Stack
        direction="row"
        justifyContent="space-around"
        alignItems="center"
        sx={{ borderTop: `1px solid ${BORDER}`, px: 0.5, py: 0.5 }}
      >
        {/* IMPORTANT: Like opens dialog (no toggle) */}
        <Button
          size="small"
          startIcon={userHasLiked ? <FavoriteRoundedIcon /> : <FavoriteBorderRoundedIcon />}
          onClick={togglePostLike}
        >
          Like
        </Button>

        <Button size="small" startIcon={<ChatBubbleOutlineRoundedIcon />} onClick={() => setCommentsOpen(true)}>
          Comment
        </Button>

        <Button size="small" startIcon={<IosShareRoundedIcon />} onClick={() => setSharePickerOpen(true)}>
          Share
        </Button>

      </Stack>
      <LikesDialog
        open={likesOpen}
        onClose={() => setLikesOpen(false)}
        communityId={communityId}
        postId={post.id}
        target={engageTargetOf(post)}
      />
      <SharesDialog
        open={sharesOpen}
        onClose={() => { setSharesOpen(false); refreshCounts(); }}
        communityId={communityId}
        postId={post.id}
        target={engageTargetOf(post)}
      />
      <CommentsDialog
        open={commentsOpen}
        onClose={() => { setCommentsOpen(false); refreshCounts(); }}
        communityId={communityId}
        postId={post.id}
        target={target}
      />
      <SharePickerDialog
        open={sharePickerOpen}
        onClose={() => setSharePickerOpen(false)}
        target={target}
        onShared={() => { refreshCounts(); setSharesOpen(true); }}
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

  const PER_PAGE = 5;
  const [page, setPage] = React.useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / PER_PAGE));
  const pageItems = React.useMemo(() => {
    const start = (page - 1) * PER_PAGE;
    return items.slice(start, start + PER_PAGE);
  }, [items, page]);

  // keep page in range when items change (e.g., after search/delete)
  React.useEffect(() => {
    const pages = Math.max(1, Math.ceil(items.length / PER_PAGE));
    if (page > pages) setPage(pages);
  }, [items]);


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
            <>
              <Stack spacing={2}>
                {pageItems.map((it) => (
                  <PostShell
                    key={it.id || it.created_at}
                    item={it}
                    communityId={activeCommunityId}
                    onUpdated={(updated) =>
                      setItems((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)))
                    }
                    onDeleted={(id) => setItems((prev) => prev.filter((p) => p.id !== id))}
                  />
                ))}
              </Stack>

              <Stack direction="row" justifyContent="center" sx={{ mt: 1 }}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={(_, v) => setPage(v)}
                  shape="rounded"
                  size="small"
                  siblingCount={0}
                />
              </Stack>
            </>
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
