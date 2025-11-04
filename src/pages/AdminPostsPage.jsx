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
                  {typeof opt === "string" ? opt : opt?.text}
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

      if (type === "image") {
        // multipart for S3 upload
        const fd = new FormData();
        fd.append("type", "image");
        fd.append("image", imageFile);                 // ← file
        if (caption) fd.append("caption", caption);
        const tagList = tags.split(",").map(s => s.trim()).filter(Boolean);
        tagList.forEach(t => fd.append("tags", t));
        res = await fetch(COMMUNITY_CREATE_URL, {
          method: "POST",
          headers: { ...tokenHeaders },               // DO NOT set Content-Type manually
          body: fd,
        });
      } else if (type === "link") {
        payload = {
          type: "link",
          url: linkUrl.trim(),
          title: linkTitle.trim() || undefined,
          description: linkDesc.trim() || undefined,
          tags: tags.split(",").map(s => s.trim()).filter(Boolean),
        };
        res = await fetch(COMMUNITY_CREATE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...tokenHeaders },
          body: JSON.stringify(payload),
        });
      } else if (type === "poll") {
        payload = {
          type: "poll",
          question,
          options: pollOptions.map(o => o.trim()).filter(Boolean),
          tags: tags.split(",").map(s => s.trim()).filter(Boolean),
        };
        res = await fetch(COMMUNITY_CREATE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...tokenHeaders },
          body: JSON.stringify(payload),
        });
      } else {
        // text
        payload = { type: "text", content: text, tags: tags.split(",").map(s => s.trim()).filter(Boolean) };
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

            <TextField
              label="Tags (comma-separated)"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="news, launch, update"
              fullWidth
            />
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

  const load = React.useCallback(async () => {
    setLoadingErr("");
    try {
      if (!activeCommunityId) return; // don’t call until we know the community
      const url = new URL(`${API_ROOT}/communities/${activeCommunityId}/posts/`, API_ROOT);
      if (search.trim()) url.searchParams.set("search", search.trim());
      const res = await fetch(url.toString(), {
        headers: { Accept: "application/json", ...authHeader() },
      });
      if (res.ok) {
        const json = await res.json();
        setItems(Array.isArray(json?.results) ? json.results : json || []);
      } else {
        setItems([]);
        setLoadingErr(`HTTP ${res.status}`);
      }
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
                <PostCard key={it.id || it.created_at} item={it} />
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
