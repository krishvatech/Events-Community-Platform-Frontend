// src/pages/community/HomePage.jsx
import * as React from "react";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import TextFieldsRoundedIcon from "@mui/icons-material/TextFieldsRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import ThumbUpAltOutlinedIcon from "@mui/icons-material/ThumbUpAltOutlined";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import MoreHorizRoundedIcon from "@mui/icons-material/MoreHorizRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import { useParams } from "react-router-dom";

import CommunityProfileCard from "../../components/CommunityProfileCard.jsx";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");


/* ---------------- helpers ---------------- */
function authHeaders(extra = {}) {
  const token =
    localStorage.getItem("access") ||
    localStorage.getItem("token") ||
    localStorage.getItem("auth_token");
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

function timeAgo(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/* ---------------- PostComposer (Text, Image, Link, Poll) ---------------- */
function PostComposer({ communityId, onPosted }) {
  const [audience] = React.useState("friends"); 
  const [tab, setTab] = React.useState("text"); // text | image | link | poll
  const [content, setContent] = React.useState("");
  const [linkUrl, setLinkUrl] = React.useState("");
  const [images, setImages] = React.useState([]);
  const [pollOptions, setPollOptions] = React.useState(["", ""]);
  const [submitting, setSubmitting] = React.useState(false);
  const fileInputRef = React.useRef(null);

  const canSubmit =
    (tab === "text" && content.trim().length > 0) ||
    (tab === "link" && linkUrl.trim().length > 0) ||
    (tab === "image" && images.length > 0) ||
    (tab === "poll" &&
      pollOptions.filter((o) => o.trim().length > 0).length >= 2);

  const handleImages = (e) => {
    const files = Array.from(e.target.files || []);
    setImages(files.slice(0, 6)); // max 6 images
  };

  const addPollOption = () => setPollOptions((a) => [...a, ""]);
  const removePollOption = (i) =>
    setPollOptions((a) => a.filter((_, idx) => idx !== i));
  const setPollText = (i, v) =>
    setPollOptions((a) => a.map((x, idx) => (idx === i ? v : x)));

  async function createPost() {
    // Keep endpoints unchanged: expects POST /api/communities/{id}/posts/create
    const url = `${API_BASE}/communities/${communityId}/posts/create/`;
    setSubmitting(true);
    try {
      let res;
      if (tab === "image") {
        const fd = new FormData();
        fd.append("type", "image");
        if (content.trim()) fd.append("caption", content.trim()); // backend expects 'caption'
        if (!images.length) throw new Error("Please select an image");
        fd.append("image", images[0]); // backend expects single 'image'
        res = await fetch(url, {
          method: "POST",
          headers: authHeaders(),
          body: fd,
        });
      } else {
        const body = { type: tab, visibility: "friends" }; // or use your audience state
        if (tab === "text") {
          body.content = content.trim();
        }
        if (tab === "link") {
          body.url = linkUrl.trim();                     // backend expects 'url'
          if (content.trim()) body.description = content.trim(); // optional
        }
        if (tab === "poll") {
          body.question = content.trim();               // backend expects 'question'
          body.options = pollOptions
            .map((x) => x.trim())
            .filter(Boolean)
            .slice(0, 10);                              // backend expects 'options'
        }
        res = await fetch(url, {
          method: "POST",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify(body),
        });
      }
      if (!res.ok) throw new Error(await res.text());

      // reset + notify
      setContent("");
      setLinkUrl("");
      setImages([]);
      setPollOptions(["", ""]);
      onPosted?.();
    } catch (err) {
      console.error("createPost:", err);
      alert("Failed to post. Check permissions/endpoints and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardHeader
        avatar={<Avatar />}
        title="Create a post"
        subheader="Share with your community"
      />
      <Divider />
      <CardContent>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          allowScrollButtonsMobile
          sx={{ mb: 2 }}
        >
          <Tab icon={<TextFieldsRoundedIcon />} iconPosition="start" value="text" label="Text" />
          <Tab icon={<ImageRoundedIcon />} iconPosition="start" value="image" label="Image" />
          <Tab icon={<LinkRoundedIcon />} iconPosition="start" value="link" label="Link" />
          <Tab icon={<BarChartRoundedIcon />} iconPosition="start" value="poll" label="Poll" />
        </Tabs>

        {tab === "text" && (
          <TextField
            fullWidth
            multiline
            minRows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?"
          />
        )}

        {tab === "image" && (
          <Stack spacing={2}>
            <TextField
              fullWidth
              multiline
              minRows={2}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Say something about your images (optional)"
            />
            <input
              ref={fileInputRef}
              onChange={handleImages}
              type="file"
              accept="image/*"
              multiple
              style={{ display: "none" }}
            />
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Button
                variant="outlined"
                startIcon={<ImageRoundedIcon />}
                onClick={() => fileInputRef.current?.click()}
              >
                Choose images
              </Button>
              {images.length > 0 && (
                <Typography variant="body2">{images.length} selected</Typography>
              )}
            </Stack>
          </Stack>
        )}

        {tab === "link" && (
          <Stack spacing={2}>
            <TextField
              fullWidth
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="Paste a link (https://...)"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LinkRoundedIcon />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              fullWidth
              multiline
              minRows={2}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Add a caption (optional)"
            />
          </Stack>
        )}

        {tab === "poll" && (
          <Stack spacing={2}>
            <TextField
              fullWidth
              multiline
              minRows={2}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Ask a question (poll)"
            />
            <Stack spacing={1}>
              {pollOptions.map((opt, idx) => (
                <Stack key={idx} direction="row" spacing={1} alignItems="center">
                  <TextField
                    fullWidth
                    value={opt}
                    onChange={(e) => setPollText(idx, e.target.value)}
                    placeholder={`Option ${idx + 1}`}
                  />
                  <IconButton
                    onClick={() => removePollOption(idx)}
                    disabled={pollOptions.length <= 2}
                  >
                    <RemoveRoundedIcon />
                  </IconButton>
                </Stack>
              ))}
              <Button onClick={addPollOption} startIcon={<AddRoundedIcon />} sx={{ alignSelf: "flex-start" }}>
                Add option
              </Button>
            </Stack>
            {/* Per your spec: no multiple select toggle, no end date-time */}
          </Stack>
        )}
      </CardContent>
      <CardActions sx={{ px: 2, pb: 2 }}>
        <Button variant="contained" endIcon={<SendRoundedIcon />} onClick={createPost} disabled={!communityId || !canSubmit || submitting}>
          Post
        </Button>
        {submitting && (
          <Box sx={{ flex: 1, ml: 2 }}>
            <LinearProgress />
          </Box>
        )}
      </CardActions>
    </Card>
  );
}

/* ---------------- FeedList (All | Friends | Mine) ---------------- */
function FeedList({ communityId, filter }) {
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  // Keep your feed endpoint untouched; adjust only if your query params differ
  const endpoint = `${API_BASE}/feed/?scope=community&community=${communityId}&filter=${filter}`;

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(endpoint, {
        headers: authHeaders({ "Content-Type": "application/json" }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setItems(Array.isArray(data) ? data : data.results || []);
    } catch (e) {
      console.error(e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [communityId, filter]);

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Typography variant="subtitle2" sx={{ color: "text.secondary" }}>
          Showing: {filter === "friends" ? "Friends' posts" : filter === "mine" ? "My posts" : "All"}
        </Typography>
        <IconButton size="small" onClick={load}>
          <RefreshRoundedIcon fontSize="small" />
        </IconButton>
      </Stack>

      {loading && <LinearProgress />}

      {!loading && items.length === 0 && (
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography>No posts yet.</Typography>
          </CardContent>
        </Card>
      )}

      {items.map((it) => (
        <Card key={it.id || Math.random()} variant="outlined" sx={{ borderRadius: 3 }}>
          <CardHeader
            avatar={<Avatar src={it.actor?.avatar_url}>{(it.actor?.name || "?").slice(0, 1)}</Avatar>}
            title={
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography fontWeight={600}>{it.actor?.name || it.actor_display || "Member"}</Typography>
                <Chip label={(it.type || it.metadata?.type || "post").toUpperCase()} size="small" />
              </Stack>
            }
            subheader={timeAgo(it.created_at)}
            action={
              <IconButton>
                <MoreHorizRoundedIcon />
              </IconButton>
            }
          />
          <CardContent sx={{ pt: 0 }}>
            {/* Text */}
            {it.content && <Typography sx={{ whiteSpace: "pre-wrap" }}>{it.content}</Typography>}

            {/* Link */}
            {(it.link_url || it.metadata?.link_url) && (
              <Button
                size="small"
                endIcon={<OpenInNewRoundedIcon />}
                href={it.link_url || it.metadata?.link_url}
                target="_blank"
                rel="noreferrer"
                sx={{ mt: 1 }}
              >
                {it.link_url || it.metadata?.link_url}
              </Button>
            )}

            {/* Images */}
            {Array.isArray(it.images || it.metadata?.images) &&
              (it.images || it.metadata?.images)?.length > 0 && (
                <Grid container spacing={1} sx={{ mt: 1 }}>
                  {(it.images || it.metadata?.images).map((src, idx) => (
                    <Grid key={idx} item xs={6} sm={4}>
                      <img
                        src={src}
                        alt={`image ${idx + 1}`}
                        style={{ width: "100%", height: 180, objectFit: "cover", borderRadius: 12 }}
                      />
                    </Grid>
                  ))}
                </Grid>
              )}

            {/* Poll (display-only) */}
            {Array.isArray(it.poll_options || it.metadata?.poll_options) &&
              (it.poll_options || it.metadata?.poll_options).length > 0 && (
                <List dense sx={{ mt: 1, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                  {(it.poll_options || it.metadata?.poll_options).map((opt, idx) => (
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
          <CardActions sx={{ pt: 0 }}>
            <Button size="small" startIcon={<ThumbUpAltOutlinedIcon />}>Like</Button>
            <Button size="small" startIcon={<ChatBubbleOutlineRoundedIcon />}>Comment</Button>
            <Tooltip title="Delete (if permitted)">
              <IconButton color="error">
                <DeleteOutlineRoundedIcon />
              </IconButton>
            </Tooltip>
          </CardActions>
        </Card>
      ))}
    </Stack>
  );
}

/* ---------------- Page ---------------- */
export default function HomePage() {
  // Expect route like: /community/:communityId/home
  const params = useParams();
  const fromRouteId = params.communityId || params.id || null;
  const [activeCommunityId, setActiveCommunityId] = React.useState(fromRouteId);

  React.useEffect(() => {
    if (fromRouteId) { setActiveCommunityId(fromRouteId); return; }
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/communities/`, {
          headers: authHeaders({ Accept: "application/json" }),
        });
        if (!res.ok) return;
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.results || []);
        if (list.length) setActiveCommunityId(String(list[0].id));
      } catch {}
    })();
  }, [fromRouteId]);

  const [filter, setFilter] = React.useState("all"); // all | friends | mine
  const [refreshNonce, setRefreshNonce] = React.useState(0);

  const handlePosted = () => setRefreshNonce((n) => n + 1);

  return (
    <Box sx={{ px: { xs: 1, sm: 2 }, py: 2, maxWidth: "1400px", mx: "auto" }}>
      <Grid container spacing={2}>
        {/* CENTER — Composer + Feed */}
        <Grid item xs={12} md={6} lg={6}>
          <Stack spacing={2}>
            <PostComposer communityId={activeCommunityId} onPosted={handlePosted} />

            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <CardContent sx={{ pb: 1 }}>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  flexWrap="wrap"
                  gap={1}
                >
                  <Typography variant="h6">Feed</Typography>
                  <ToggleButtonGroup
                    value={filter}
                    exclusive
                    onChange={(_, v) => v && setFilter(v)}
                    size="small"
                  >
                    <ToggleButton value="all">All</ToggleButton>
                    <ToggleButton value="friends">Friends</ToggleButton>
                    <ToggleButton value="mine">My Posts</ToggleButton>
                  </ToggleButtonGroup>
                </Stack>
              </CardContent>
              <Divider />
              <CardContent>
                <FeedList
                  key={`${activeCommunityId}-${filter}-${refreshNonce}`}
                  communityId={activeCommunityId}
                  filter={filter}
                />
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        {/* RIGHT — Community Profile Card */}
        <Grid item xs={12} md={3} lg={3}>
          <CommunityProfileCard communityId={activeCommunityId} />
        </Grid>
      </Grid>
    </Box>
  );
}
