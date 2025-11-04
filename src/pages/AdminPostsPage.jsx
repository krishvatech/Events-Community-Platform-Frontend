// src/pages/AdminPostsPage.jsx
import * as React from "react";
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

const API_ROOT = (import.meta.env.VITE_API_ROOT || "/api").replace(/\/$/, "");

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
function CreatePostDialog({ open, onClose, onCreated }) {
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
    const base = {
      type,
      tags: tags
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };
    const tokenHeaders = authHeader();

    try {
      let res, created;

      if (type === "image") {
        const fd = new FormData();
        fd.append("type", "image");
        fd.append("caption", caption || "");
        fd.append("image", imageFile, imageFile.name);
        base.tags.forEach((t) => fd.append("tags", t));
        res = await fetch(`${API_ROOT}/posts/`, {
          method: "POST",
          headers: tokenHeaders,
          body: fd,
        });
        created = res.ok
          ? await res.json()
          : {
              id: `local-${Date.now()}`,
              created_at: new Date().toISOString(),
              ...base,
              caption,
              image_preview: imagePreview,
            };
      } else if (type === "link") {
        const payload = { ...base, url: linkUrl, title: linkTitle || undefined, description: linkDesc || undefined };
        res = await fetch(`${API_ROOT}/posts/`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...tokenHeaders },
          body: JSON.stringify(payload),
        });
        created = res.ok
          ? await res.json()
          : { id: `local-${Date.now()}`, created_at: new Date().toISOString(), ...payload };
      } else if (type === "poll") {
        const payload = {
          ...base,
          question,
          options: pollOptions.map((o) => o.trim()).filter(Boolean),
        };
        res = await fetch(`${API_ROOT}/posts/`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...tokenHeaders },
          body: JSON.stringify(payload),
        });
        created = res.ok
          ? await res.json()
          : { id: `local-${Date.now()}`, created_at: new Date().toISOString(), ...payload };
      } else {
        // text
        const payload = { ...base, text };
        res = await fetch(`${API_ROOT}/posts/`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...tokenHeaders },
          body: JSON.stringify(payload),
        });
        created = res.ok
          ? await res.json()
          : { id: `local-${Date.now()}`, created_at: new Date().toISOString(), ...payload };
      }

      onCreated?.(created);
      onClose?.();
    } catch {
      onCreated?.({
        id: `local-${Date.now()}`,
        created_at: new Date().toISOString(),
        ...base,
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

  const Row = ({ children }) => (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ width: "100%" }}>
      {children}
    </Stack>
  );

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
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
          <Button onClick={handleCreate} variant="contained" disabled={!canCreate()}>
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
  const [search, setSearch] = React.useState("");
  const [items, setItems] = React.useState([]);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [loadingErr, setLoadingErr] = React.useState("");

  const load = React.useCallback(async () => {
    setLoadingErr("");
    try {
      const url = new URL(`${API_ROOT}/posts/`, window.location.origin);
      if (search.trim()) url.searchParams.set("search", search.trim());
      const res = await fetch(url.pathname + url.search, {
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
  }, [search]);

  React.useEffect(() => {
    load();
  }, [load]);

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
          <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setCreateOpen(true)} sx={{ borderRadius: 2 }}>
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
          <Button variant="outlined" onClick={load}>Search</Button>
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

      <CreatePostDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={handleCreated} />
    </Box>
  );
}
