// src/pages/account/HomePage.jsx
import * as React from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Pagination,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  Checkbox,
  FormControlLabel,
  MenuItem,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import TextFieldsRoundedIcon from "@mui/icons-material/TextFieldsRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import SearchIcon from "@mui/icons-material/Search";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import EmailIcon from "@mui/icons-material/Email";
import PlaceIcon from "@mui/icons-material/Place";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import Autocomplete from "@mui/material/Autocomplete";
import * as isoCountries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import FavoriteBorderRoundedIcon from "@mui/icons-material/FavoriteBorderRounded";
import ReplyRoundedIcon from "@mui/icons-material/ReplyRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";


// -----------------------------------------------------------------------------
// API helpers
// -----------------------------------------------------------------------------
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
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

// ---------------- Profile wiring (read) ----------------
function mapExperience(item) {
  return {
    id: item.id,
    org: item.community_name || item.org || item.company || "",
    position: item.position || "",
    start: item.start_date || "",
    end: item.end_date || "",
    current: !!item.currently_work_here,
    location: item.location || "",
  };
}
function mapEducation(item) {
  return {
    id: item.id,
    school: item.school || "",
    degree: item.degree || "",
    field: item.field_of_study || "",
    start: item.start_date || "",
    end: item.end_date || "",
    grade: item.grade || "",
  };
}

isoCountries.registerLocale(enLocale);

// 🇮🇳 flag from "IN"
const flagEmoji = (code) =>
  code
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt()));

const COUNTRY_OPTIONS = Object.entries(
  isoCountries.getNames("en", { select: "official" })
).map(([code, label]) => ({ code, label, emoji: flagEmoji(code) }));

// If your profile stores the country *name* in profile.location,
// this finds the matching option; if you store ISO2 (like "IN"),
// it also works by matching code.
const getSelectedCountry = (profile) => {
  if (!profile?.location) return null;
  const byCode = COUNTRY_OPTIONS.find((o) => o.code === profile.location);
  if (byCode) return byCode;
  return COUNTRY_OPTIONS.find(
    (o) => (o.label || "").toLowerCase() === String(profile.location).toLowerCase()
  ) || null;
};

async function fetchProfileCore() {
  const r = await fetch(`${API_ROOT}/users/me/`, {
    headers: { ...authHeader(), accept: "application/json" },
  });
  if (!r.ok) throw new Error("Failed to load /users/me/");
  const data = await r.json();
  const prof = data.profile || {};
  return {
    first_name: data.first_name || "",
    last_name: data.last_name || "",
    email: data.email || "",
    job_title: prof.job_title || "",
    bio: prof.bio || "",
    location: prof.location || "",
    avatar: prof.avatar || data.avatar || "",
    skills: Array.isArray(prof.skills) ? prof.skills : parseSkills(prof.skills || ""),
    links: (prof.links && typeof prof.links === "object") ? prof.links : {},
    experience: [],
    education: [],
  };
}


async function fetchProfileExtras() {
  // try combined
  try {
    const r = await fetch(`${API_ROOT}/auth/me/profile/`, { headers: { ...authHeader(), accept: "application/json" } });
    if (r.ok) {
      const d = await r.json();
      return {
        experiences: Array.isArray(d.experiences) ? d.experiences.map(mapExperience) : [],
        educations: Array.isArray(d.educations) ? d.educations.map(mapEducation) : [],
      };
    }
  } catch { }
  // fallback to two calls
  const [e1, e2] = await Promise.all([
    fetch(`${API_ROOT}/auth/me/educations/`, { headers: { ...authHeader(), accept: "application/json" } }).catch(() => null),
    fetch(`${API_ROOT}/auth/me/experiences/`, { headers: { ...authHeader(), accept: "application/json" } }).catch(() => null),
  ]);
  const educations = e1?.ok ? (await e1.json()).map(mapEducation) : [];
  const experiences = e2?.ok ? (await e2.json()).map(mapExperience) : [];
  return { experiences, educations };
}


// -----------------------------------------------------------------------------
// Small utilities
// -----------------------------------------------------------------------------
function timeAgo(date) {
  if (!date) return "";
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
function toMonthYear(d) {
  if (!d) return "";
  const [y, m] = String(d).split("-");
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const mi = m ? Math.max(1, Math.min(12, parseInt(m, 10))) - 1 : null;
  return mi != null && y ? `${monthNames[mi]} ${y}` : String(d);
}
function dateRange(start, end, current) {
  const s = toMonthYear(start);
  const e = current ? "present" : toMonthYear(end);
  return s || e ? `${s} - ${e || ""}` : "";
}
function parseSkills(value) {
  const v = (value ?? "").toString().trim();
  if (!v) return [];
  try {
    const j = JSON.parse(v);
    if (Array.isArray(j)) return j.map((s) => String(s).trim()).filter(Boolean);
  } catch { }
  return v.split(/,|\n|;/).map((s) => s.trim()).filter(Boolean);
}

const EMPTY_PROFILE = {
  first_name: "",
  last_name: "",
  email: "",
  job_title: "",
  bio: "",
  location: "",
  avatar: "",
  skills: [],
  links: {},
  experience: [],
  education: [],
};

// -----------------------------------------------------------------------------
// Post composer
// -----------------------------------------------------------------------------
// ---- Post composer (no community dropdown) ----
function PostComposer({ communityId, onCreate }) {
  const [tab, setTab] = React.useState("text");
  const [content, setContent] = React.useState("");
  const [linkUrl, setLinkUrl] = React.useState("");
  const [images, setImages] = React.useState([]);     // previews
  const [files, setFiles] = React.useState([]);       // File objects
  const [pollOptions, setPollOptions] = React.useState(["", ""]);
  const fileInputRef = React.useRef(null);

  const canSubmit = React.useMemo(() => {
    if (!communityId) return false; // must have the community to post
    if (tab === "text") return content.trim().length > 0;
    if (tab === "link") return linkUrl.trim().length > 0;
    if (tab === "image") return files.length > 0;
    if (tab === "poll") return pollOptions.filter((o) => o.trim().length > 0).length >= 2 && content.trim().length > 0;
    return false;
  }, [communityId, tab, content, linkUrl, files, pollOptions]);

  const toDataUrl = (file) =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (ev) => resolve(ev.target.result);
      reader.readAsDataURL(file);
    });

  const handleImageFiles = async (e) => {
    const picked = Array.from(e.target.files || []).slice(0, 6);
    setFiles(picked);
    const previews = await Promise.all(picked.map((f) => toDataUrl(f)));
    setImages(previews);
  };

  const addPollOption = () => setPollOptions((opts) => [...opts, ""]);
  const removePollOption = (i) => setPollOptions((opts) => opts.filter((_, idx) => idx !== i));
  const setPollText = (i, v) => setPollOptions((opts) => opts.map((o, idx) => (idx === i ? v : o)));

  const handleSubmit = () => {
    if (!canSubmit) return;
    const draft = {
      type: tab,
      content: content.trim(),
      url: linkUrl.trim(),
      files, // for image
      options: pollOptions.filter((o) => o.trim().length > 0),
    };
    onCreate?.(draft);
  };

  return (
    <Stack spacing={2}>
      {/* Subtle hint instead of dropdown */}
      <Typography variant="caption" color="text.secondary">
        Posting to your community
      </Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" allowScrollButtonsMobile>
        <Tab icon={<TextFieldsRoundedIcon />} iconPosition="start" value="text" label="Text" />
        <Tab icon={<ImageRoundedIcon />} iconPosition="start" value="image" label="Image" />
        <Tab icon={<LinkRoundedIcon />} iconPosition="start" value="link" label="Link" />
        <Tab icon={<BarChartRoundedIcon />} iconPosition="start" value="poll" label="Poll" />
      </Tabs>

      {tab === "text" && (
        <TextField fullWidth multiline minRows={3} value={content} onChange={(e) => setContent(e.target.value)} placeholder="What's on your mind?" />
      )}

      {tab === "image" && (
        <Stack spacing={2}>
          <TextField fullWidth multiline minRows={2} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Say something about your image (optional)" />
          <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={handleImageFiles} />
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Button variant="outlined" startIcon={<ImageRoundedIcon />} onClick={() => fileInputRef.current?.click()}>
              Choose images
            </Button>
            {files.length > 0 && <Typography variant="body2">{files.length} selected</Typography>}
          </Stack>
          {images.length > 0 && (
            <Grid container spacing={1}>
              {images.map((src, idx) => (
                <Grid key={idx} item xs={6} sm={4} md={3}>
                  <img src={src} alt={`upload-${idx}`} style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 8 }} />
                </Grid>
              ))}
            </Grid>
          )}
        </Stack>
      )}

      {tab === "link" && (
        <Stack spacing={2}>
          <TextField fullWidth value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="Paste a link (https://...)" InputProps={{ startAdornment: (<InputAdornment position="start"><LinkRoundedIcon /></InputAdornment>) }} />
          <TextField fullWidth multiline minRows={2} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Add a caption (optional)" />
        </Stack>
      )}

      {tab === "poll" && (
        <Stack spacing={2}>
          <TextField fullWidth multiline minRows={2} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Ask a question (poll)" />
          <Stack spacing={1}>
            {pollOptions.map((opt, idx) => (
              <Stack key={idx} direction="row" spacing={1} alignItems="center">
                <TextField fullWidth value={opt} onChange={(e) => setPollText(idx, e.target.value)} placeholder={`Option ${idx + 1}`} />
                <IconButton onClick={() => removePollOption(idx)} disabled={pollOptions.length <= 2}><RemoveRoundedIcon /></IconButton>
              </Stack>
            ))}
            <Button onClick={addPollOption} startIcon={<AddRoundedIcon />} sx={{ alignSelf: "flex-start" }}>
              Add option
            </Button>
          </Stack>
        </Stack>
      )}

      <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
        <Button variant="contained" endIcon={<SendRoundedIcon />} onClick={handleSubmit} disabled={!canSubmit}>
          Post
        </Button>
      </Box>
    </Stack>
  );
}


// Limit the visible height to ~3 post cards and enable vertical scroll
function ScrollThreeVisible({ children }) {
  const ref = React.useRef(null);
  const [maxH, setMaxH] = React.useState(null);

  const measure = React.useCallback(() => {
    const root = ref.current;
    if (!root) return;
    const cards = root.querySelectorAll(".MuiCard-root");
    if (!cards.length) { setMaxH(null); return; }

    const take = Math.min(3, cards.length);
    let sum = 0;
    for (let i = 0; i < take; i++) sum += cards[i].getBoundingClientRect().height;
    const spacingPx = 16 * (take - 1); // Stack spacing={2}
    setMaxH(Math.ceil(sum + spacingPx + 2));
  }, []);

  React.useLayoutEffect(() => {
    measure();
    const id = setTimeout(measure, 350); // re-measure after images load
    return () => clearTimeout(id);
  }, [children, measure]);

  return (
    <Box ref={ref} sx={{ maxHeight: maxH ?? "none", overflowY: maxH ? "auto" : "visible", pr: 1 }}>
      {children}
    </Box>
  );
}


// -----------------------------------------------------------------------------
// Post card + lists
// -----------------------------------------------------------------------------
function PostCard({ post }) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardHeader
        avatar={<Avatar src={""}>{("A")}</Avatar>}
        title={<Typography fontWeight={600}>{post.actor_name || "You"}</Typography>}
        subheader={timeAgo(post.created_at)}
        action={
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="Edit">
              <IconButton size="small" onClick={() => (window.__openPostEdit?.(post.id))?.()}>
                <EditRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton size="small" color="error" onClick={() => (window.__confirmDeletePost?.(post.id))?.()}>
                <DeleteOutlineRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        }
      />
      <CardContent sx={{ pt: 0 }}>
        {post.content && <Typography sx={{ whiteSpace: "pre-wrap" }}>{post.content}</Typography>}

        {post.type === "link" && post.link && (
          <Button size="small" href={post.link} target="_blank" rel="noreferrer" sx={{ mt: 1 }}>
            {post.link}
          </Button>
        )}

        {post.type === "image" && Array.isArray(post.images) && post.images.length > 0 && (
          <Grid container spacing={1} sx={{ mt: 1 }}>
            {post.images.map((src, idx) => (
              <Grid key={idx} item xs={6} sm={4} md={3}>
                <img
                  src={src}
                  alt={`post-${post.id}-img-${idx}`}
                  style={{ width: "100%", height: 160, objectFit: "cover", borderRadius: 8 }}
                />
              </Grid>
            ))}
          </Grid>
        )}

        {post.type === "poll" && Array.isArray(post.options) && post.options.length > 0 && (
          <List dense sx={{ mt: 1, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
            {post.options.map((opt, idx) => (
              <ListItem key={idx} disableGutters sx={{ px: 1 }}>
                <ListItemAvatar><Avatar sx={{ width: 28, height: 28 }}>{idx + 1}</Avatar></ListItemAvatar>
                <ListItemText primary={opt} />
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
      <CardActions sx={{ pt: 0, gap: 0.5 }}>
        {/* Like icon — choose ONE of the onClick behaviors below */}
        <Tooltip title="Like">
          <IconButton
            size="medium"
            onClick={() => {
              // OPTION A: just toggle like
              //handleLike?.(post);
              // OPTION B: toggle like AND open the likers list (uncomment next line if you want both)
              (window.__openLikes?.(post.id))?.();
            }}
          >
            {post?.liked_by_me ? (
              <FavoriteRoundedIcon fontSize="small" />
            ) : (
              <FavoriteBorderRoundedIcon fontSize="small" />
            )}
          </IconButton>
        </Tooltip>

        {/* Comment icon — opens the comments popup */}
        <Tooltip title="Comments">
          <IconButton
            size="medium"
            onClick={() => (window.__openComments?.(post.id))?.()}
          >
            <ChatBubbleOutlineRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </CardActions>
    </Card>
  );
}

function MyPostsList({ posts }) {
  if (!posts || posts.length === 0) {
    return (
      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent><Typography>No posts yet.</Typography></CardContent>
      </Card>
    );
  }
  return (<Stack spacing={2}>{posts.map((p) => <PostCard key={p.id} post={p} />)}</Stack>);
}

function MyGroups({ groups }) {
  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(1);
  const perPage = 5;
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) =>
      (g.name || "").toLowerCase().includes(q) ||
      (g.description || "").toLowerCase().includes(q)
    );
  }, [groups, query]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const startIdx = (page - 1) * perPage;
  const endIdx = Math.min(startIdx + perPage, filtered.length);
  const pageItems = filtered.slice(startIdx, endIdx);
  React.useEffect(() => { setPage(1); }, [query, groups.length]);
  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardHeader title="Joined Groups" sx={{ pb: 0 }} />
      <CardContent sx={{ pt: 1, pb: 0 }}>
        <TextField
          fullWidth
          placeholder="Search groups"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>) }}
        />
      </CardContent>
      <List disablePadding>
        {pageItems.length === 0 && (<ListItem><ListItemText primary="No groups match your search." /></ListItem>)}
        {pageItems.map((g, idx) => (
          <React.Fragment key={g.id}>
            <ListItem alignItems="flex-start" secondaryAction={<Chip label={`${g.member_count ?? 0} members`} size="small" />}>
              <ListItemAvatar><Avatar>{(g.name || "").slice(0, 1)}</Avatar></ListItemAvatar>
              <ListItemText
                primary={
                  <Typography
                    fontWeight={600}
                    component={RouterLink}
                    to={`/community/groups/${g.id}`}
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    {g.name}
                  </Typography>
                }
                secondary={g.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {g.description}
                  </Typography>
                )}
              />
            </ListItem>
            {idx < pageItems.length - 1 && <Divider component="li" />}
          </React.Fragment>
        ))}
      </List>
      <Stack direction={{ xs: "column", sm: "row" }} alignItems="center" justifyContent="space-between" sx={{ p: 2, pt: 1 }}>
        <Typography variant="body2" color="text.secondary">Showing {filtered.length === 0 ? 0 : startIdx + 1}–{endIdx} of {filtered.length}</Typography>
        <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)} color="primary" size="medium" siblingCount={0} boundaryCount={1} />
      </Stack>
    </Card>
  );
}

// -----------------------------------------------------------------------------
// Friends list (new)
// -----------------------------------------------------------------------------
function normalizeFriend(row) {
  // Supports multiple payload styles
  const u = row?.friend || row?.user || row || {};
  const id = u.id ?? row.id;
  const first = u.first_name || u.firstName || "";
  const last = u.last_name || u.lastName || "";
  return {
    id,
    name: `${first} ${last}`.trim() || u.username || "Friend",
    avatar: u.avatar || u.profile_image || "",
    headline: u.job_title || u.title || u.bio || "",
    mutual_count: row?.mutual_count ?? row?.mutuals ?? 0,
  };
}

function MyFriends({ friends }) {
  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(1);
  const perPage = 8;

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter((f) =>
      f.name.toLowerCase().includes(q) || (f.headline || "").toLowerCase().includes(q)
    );
  }, [friends, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const startIdx = (page - 1) * perPage;
  const endIdx = Math.min(startIdx + perPage, filtered.length);
  const pageItems = filtered.slice(startIdx, endIdx);

  React.useEffect(() => { setPage(1); }, [query, friends.length]);

  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardHeader title="My Friends" sx={{ pb: 0 }} />
      <CardContent sx={{ pt: 1 }}>
        <TextField
          fullWidth
          placeholder="Search friends"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>) }}
          sx={{ mb: 2 }}
        />

        {pageItems.length === 0 ? (
          <Typography color="text.secondary">No friends found.</Typography>
        ) : (
          <List disablePadding>
            {pageItems.map((f, idx) => (
              <React.Fragment key={f.id}>
                <ListItem
                  alignItems="flex-start"
                  secondaryAction={
                    f.mutual_count ? <Chip size="small" label={`${f.mutual_count} mutual`} /> : null
                  }
                  sx={{
                    px: 1,
                    py: 1,
                    "& .MuiListItemSecondaryAction-root": { right: { xs: 8, sm: 12 } },
                  }}
                >
                  <ListItemAvatar>
                    <Avatar src={f.avatar}>{(f.name[0] || "").toUpperCase()}</Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={<Typography fontWeight={600}>{f.name}</Typography>}
                    secondary={
                      <Typography variant="body2" color="text.secondary">
                        {f.headline || "—"}
                      </Typography>
                    }
                  />
                </ListItem>
                {idx < pageItems.length - 1 && <Divider component="li" />}
              </React.Fragment>
            ))}
          </List>
        )}
      </CardContent>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems="center"
        justifyContent="space-between"
        sx={{ p: 2, pt: 0 }}
      >
        <Typography variant="body2" color="text.secondary">
          Showing {filtered.length === 0 ? 0 : startIdx + 1}–{endIdx} of {filtered.length}
        </Typography>
        <Pagination
          count={totalPages}
          page={page}
          onChange={(_, p) => setPage(p)}
          color="primary"
          size="medium"
          siblingCount={0}
          boundaryCount={1}
        />
      </Stack>
    </Card>
  );
}



// -----------------------------------------------------------------------------
// API mappers
// -----------------------------------------------------------------------------
function mapFeedItemRowToUiPost(row) {
  // FeedItemSerializer shape (assumed): { id, created_at, actor, actor_id, metadata: { type, text/url/image_url/question/options, caption/title/description } ...}
  const m = row?.metadata || {};
  const type = (m.type || "text").toLowerCase();
  const base = {
    id: row.id,
    created_at: row.created_at || Date.now(),
    type,
    actor_name: row.actor_name || row.actor?.name || "",
  };

  if (type === "text") {
    return { ...base, content: m.text || "" };
  }
  if (type === "link") {
    return { ...base, content: m.description || m.title || "", link: m.url || "" };
  }
  if (type === "image") {
    return { ...base, content: m.caption || "", images: m.image_url ? [m.image_url] : [] };
  }
  if (type === "poll") {
    return { ...base, content: m.question || "", options: Array.isArray(m.options) ? m.options : [] };
  }
  // fallback render as text
  return { ...base, content: m.text || "" };
}

function normalizeJoinedGroup(row) {
  // If the endpoint returns raw group objects
  if (row?.name) {
    return {
      id: row.id,
      name: row.name,
      description: row.description || row.about || "",
      member_count: row.member_count ?? row.members_count ?? row.members ?? 0,
    };
  }
  // If it returns memberships with a nested `group`
  if (row?.group) {
    const g = row.group;
    return {
      id: g.id,
      name: g.name,
      description: g.description || g.about || "",
      member_count: g.member_count ?? g.members_count ?? 0,
    };
  }
  return null;
}

function mapCreateResponseToUiPost(resp) {
  // CommunityViewSet.create_post returns a simplified row
  // { id, type, created_at, community: {id,name}, actor?, visibility, tags, ...(type-specific fields) }
  const type = (resp.type || "text").toLowerCase();
  const base = { id: resp.id, created_at: resp.created_at || Date.now(), type };
  if (type === "text") return { ...base, content: resp.text || "" };
  if (type === "link") return { ...base, content: resp.description || resp.title || "", link: resp.url || "" };
  if (type === "image") return { ...base, content: resp.caption || "", images: resp.image_url ? [resp.image_url] : [] };
  if (type === "poll") return { ...base, content: resp.question || "", options: Array.isArray(resp.options) ? resp.options : [] };
  return { ...base, content: "" };
}

// -----------------------------------------------------------------------------
// Main page
// -----------------------------------------------------------------------------
export default function HomePage() {
  const PAGE_MAX_W = 1120;
  const [myCommunityId, setMyCommunityId] = React.useState(null);
  const [posts, setPosts] = React.useState([]);           // ← now real data
  const [profile, setProfile] = React.useState(EMPTY_PROFILE);
  const [groups, setGroups] = React.useState([]);
  const [communities, setCommunities] = React.useState([]); // for composer picklist
  const [tabIndex, setTabIndex] = React.useState(0);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [friends, setFriends] = React.useState([]);
  const [friendCount, setFriendCount] = React.useState(0); // ← ADD THIS
  const [commentOpen, setCommentOpen] = React.useState(false);
  const [commentPostId, setCommentPostId] = React.useState(null);
  const openCommentsFor = (postId) => { setCommentPostId(postId); setCommentOpen(true); };
  const [likesOpen, setLikesOpen] = React.useState(false);
  const [likesPostId, setLikesPostId] = React.useState(null);
  const [editOpen, setEditOpen] = React.useState(false);
  const [editPostId, setEditPostId] = React.useState(null);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deletePostId, setDeletePostId] = React.useState(null);


  // ---- Expose global functions to open comments/likes dialogs ----
  React.useEffect(() => {
    window.__openComments = (postId) => () => openCommentsFor(postId);
    return () => { try { delete window.__openComments; } catch { } };
  }, []);

  React.useEffect(() => {
    window.__openLikes = (postId) => () => { setLikesPostId(postId); setLikesOpen(true); };
    return () => {
      try { delete window.__openLikes; } catch { }
    };
  }, []);

  // --- Expose global functions to open edit/delete dialogs ----
  React.useEffect(() => {
    window.__openPostEdit = (postId) => () => { setEditPostId(postId); setEditOpen(true); };
    window.__confirmDeletePost = (postId) => () => { setDeletePostId(postId); setDeleteOpen(true); };
    return () => {
      try { delete window.__openPostEdit; delete window.__confirmDeletePost; } catch { }
    };
  }, []);



  // ---- Fetch my posts (paginated) ----
  const fetchMyPosts = React.useCallback(async () => {
    try {
      const res = await fetch(`${API_ROOT}/activity/feed/posts/me/`, { headers: { ...authHeader(), accept: "application/json" } });
      const data = await res.json();
      const rows = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
      setPosts(rows.map(mapFeedItemRowToUiPost));
    } catch (e) {
      console.error("Failed to load my posts:", e);
      setPosts([]); // keep empty
    }
  }, []);

  const fetchMyProfileFromMe = React.useCallback(async () => {
    try {
      const core = await fetchProfileCore();
      const extra = await fetchProfileExtras();
      setProfile({
        ...core,
        experience: extra.experiences,
        education: extra.educations,
      });
    } catch (e) {
      console.error("Failed to load profile:", e);
    }
  }, []);

  const fetchMyFriends = React.useCallback(async () => {
    const candidates = [
      `${API_ROOT}/relationships/friends/`,
      `${API_ROOT}/friends/`,
      `${API_ROOT}/users/friends/`,
      `${API_ROOT}/accounts/friends/`,
    ];
    for (const url of candidates) {
      try {
        const res = await fetch(url, { headers: { ...authHeader(), accept: "application/json" } });
        if (!res.ok) continue;
        const data = await res.json();
        const rows = Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : []);
        const total = Number(data?.count ?? rows.length) || 0;
        setFriends(rows.map(normalizeFriend).filter(Boolean));
        setFriendCount(total);
        return;
      } catch { /* try next */ }
    }
    setFriends([]);
    setFriendCount(0);
  }, []);



  // ---- Fetch my communities (owner or member) ----
  const fetchMyCommunities = React.useCallback(async () => {
    try {
      const res = await fetch(`${API_ROOT}/communities/`, { headers: { ...authHeader(), accept: "application/json" } });
      const list = await res.json();
      const rows = Array.isArray(list) ? list : (list?.results || []);
      setCommunities(rows);
      // setGroups(rows);
      setMyCommunityId(rows?.[0]?.id ?? null); // ← derive community_id from membership
    } catch (e) {
      console.error("Failed to load communities:", e);
      setCommunities([]);
      setMyCommunityId(null);
    }
  }, []);
  const fetchMyJoinedGroups = React.useCallback(async () => {
    try {
      const res = await fetch(`${API_ROOT}/groups/joined-groups/`, {
        headers: { ...authHeader(), accept: "application/json" },
      });
      const data = await res.json();
      const rows = Array.isArray(data) ? data : (data?.results || []);
      const normalized = rows.map(normalizeJoinedGroup).filter(Boolean);
      setGroups(normalized);
    } catch (e) {
      console.error("Failed to load joined groups:", e);
      setGroups([]);
    }
  }, []);

  React.useEffect(() => {
    fetchMyPosts();
    fetchMyCommunities();
    fetchMyJoinedGroups();
    fetchMyFriends();
    fetchMyProfileFromMe();   // ← add this line
  }, [fetchMyPosts, fetchMyCommunities, fetchMyJoinedGroups, fetchMyFriends, fetchMyProfileFromMe]);


  // ---- Create post (always visibility=friends) ----
  async function createCommunityPost(draft) {
    const communityId = myCommunityId;           // ← always post to your single community
    if (!communityId) { alert("Community not loaded yet."); return; }
    const fd = new FormData();
    fd.append("visibility", "friends");

    if (draft.type === "text") {
      fd.append("type", "text");
      fd.append("content", draft.content || "");
    } else if (draft.type === "link") {
      fd.append("type", "link");
      fd.append("url", draft.url || "");
      if (draft.content) fd.append("description", draft.content);
    } else if (draft.type === "image") {
      fd.append("type", "image");
      if (draft.files?.[0]) {
        fd.append("image", draft.files[0], draft.files[0].name);
      }
      if (draft.content) fd.append("caption", draft.content);
    } else if (draft.type === "poll") {
      fd.append("type", "poll");
      // question = content, options = repeated keys
      fd.append("question", draft.content || "");
      (draft.options || []).forEach((opt) => fd.append("options", opt));
    } else {
      fd.append("type", "text");
      fd.append("content", draft.content || "");
    }

    const res = await fetch(`${API_ROOT}/communities/${communityId}/posts/create/`, {
      method: "POST",
      headers: { ...authHeader() }, // do NOT set Content-Type manually when using FormData
      body: fd,
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new Error(`Create failed (${res.status}): ${err}`);
    }
    const row = await res.json();
    return row;
  }

  const handleCreatePost = async (draft) => {
    try {
      const resp = await createCommunityPost(draft);
      const ui = mapCreateResponseToUiPost(resp);
      setPosts((prev) => [ui, ...prev]);
      setDialogOpen(false);
    } catch (e) {
      console.error(e);
      alert("Could not create post. Check console for details.");
    }
  };

  const handleUpdateProfile = (updated) => setProfile(updated);
  const fullName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "User";

  return (
    <Box sx={{ px: { xs: 1, sm: 2, md: 3 }, py: 2 }}>
      <Box sx={{ width: "100%", maxWidth: "100%", mx: 0 }}>

        {/* Header */}
        <Card
          variant="outlined"
          className="profileHeaderCard"
          sx={{ width: "100%", borderRadius: 3, p: 2, mb: 2 }}   // ← forces full width of its container
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems={{ xs: "flex-start", sm: "center" }}
            sx={{ width: "100%", flexWrap: { xs: "wrap", sm: "nowrap" } }}   // ← make inner layout span 100%
          >
            <Avatar src={profile.avatar || ""} sx={{ width: 72, height: 72, mr: { sm: 2 } }}>
              {(fullName[0] || "").toUpperCase()}
            </Avatar>
            <Box
              sx={{
                flex: "0 0 auto",
                width: { xs: "100%", sm: 700, md: 780 },   // adjust numbers if you want
                alignSelf: { xs: "flex-start", sm: "center" },
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600 }}>{fullName}</Typography>
              <Typography variant="body2" color="text.secondary">{profile.job_title}</Typography>
              {profile.bio && <Typography variant="body2" sx={{ mt: 1 }}>{profile.bio}</Typography>}
            </Box>

            <Divider orientation="vertical" flexItem sx={{ display: { xs: "none", sm: "block" }, mx: 2 }} />
            <Box
              sx={{
                minWidth: { sm: 160 },
                textAlign: { xs: "left", sm: "center" },
              }}
            >
              <Typography variant="subtitle2">
                <Box component="span" sx={{ fontWeight: 600 }}>{posts.length}</Box> Posts&nbsp;|&nbsp;
                <Box component="span" sx={{ fontWeight: 600 }}>{friendCount || friends.length}</Box> Friends
              </Typography>
            </Box>
          </Stack>
        </Card>

        {/* Tabs */}
        <Card variant="outlined" sx={{ borderRadius: 3, width: "100%" }}>
          <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)} variant="scrollable" allowScrollButtonsMobile>
            <Tab label="My Posts" />
            <Tab label="My Groups" />
            <Tab label="My Friends" />
            <Tab label="About" />
          </Tabs>
          <Divider />
          <CardContent>
            {tabIndex === 0 && (
              <Stack spacing={2}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography variant="h6">My Posts</Typography>
                  <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setDialogOpen(true)}>
                    Create Post
                  </Button>
                </Stack>
                <ScrollThreeVisible>
                  <MyPostsList posts={posts} />
                </ScrollThreeVisible>
              </Stack>
            )}
            {tabIndex === 1 && <MyGroups groups={groups} />}
            {tabIndex === 2 && <MyFriends friends={friends} />}     {/* ← NEW */}
            {tabIndex === 3 && <AboutTab profile={profile} groups={groups} onUpdate={handleUpdateProfile} />}
          </CardContent>
        </Card>
      </Box>

      {/* Create post dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Create a post</DialogTitle>
        <DialogContent>
          <PostComposer communityId={myCommunityId} onCreate={handleCreatePost} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
      {/* Comments dialog (view, like, reply, delete) */}
      <CommentsDialog
        open={commentOpen}
        postId={commentPostId}
        onClose={() => setCommentOpen(false)}
      />
      <LikesDialog
        open={likesOpen}
        postId={likesPostId}
        onClose={() => setLikesOpen(false)}
      />
      <PostEditDialog
        open={editOpen}
        post={posts.find((p) => p.id === editPostId)}
        communityId={myCommunityId}
        onClose={() => setEditOpen(false)}
        onSaved={(updated) => {
          if (!updated) { setEditOpen(false); return; }
          setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
          setEditOpen(false);
        }}
      />
      <PostDeleteConfirm
        open={deleteOpen}
        postId={deletePostId}
        communityId={myCommunityId}
        onClose={() => setDeleteOpen(false)}
        onDeleted={(id) => {
          if (!id) { setDeleteOpen(false); return; }
          setPosts((prev) => prev.filter((p) => p.id !== id));
          setDeleteOpen(false);
        }}
      />
    </Box>
  );
}

// Function For Likes Dialog
function LikesDialog({ open, postId, onClose }) {
  const [loading, setLoading] = React.useState(false);
  const [likers, setLikers] = React.useState([]);

  function normalizeUser(u) {
    if (!u) return { id: null, name: "User", avatar: "" };
    const id = u.id ?? u.user_id ?? null;
    const name =
      u.name ||
      `${u.first_name || ""} ${u.last_name || ""}`.trim() ||
      u.username ||
      "User";
    const avatar = u.avatar || u.profile_image || u.photo || "";
    const headline =
      u.headline || u.job_title || u.title || u.bio || u.about || "";
    return { id, name, avatar, headline };
  }

  // Handle different API shapes: some endpoints return {results:[{user:{...}}]}, others return raw users
  function normalizeLikerRow(row) {
    const user = row?.user || row?.owner || row?.liked_by || row;
    return normalizeUser(user);
  }

  async function fetchLikers(postId) {
    // Try common DRF patterns you’re likely already using
    const candidates = [
      `${API_ROOT}/posts/${postId}/likes/`,
      `${API_ROOT}/communities/posts/${postId}/likes/`,
      `${API_ROOT}/activity/posts/${postId}/likes/`,
      `${API_ROOT}/reactions/?post=${postId}&type=like`,
      `${API_ROOT}/likes/?post=${postId}`,
    ];
    for (const url of candidates) {
      try {
        const r = await fetch(url, {
          headers: { ...authHeader(), accept: "application/json" },
        });
        if (!r.ok) continue;
        const data = await r.json();
        const rows = Array.isArray(data?.results)
          ? data.results
          : Array.isArray(data)
            ? data
            : data?.items || data?.likers || [];
        return rows.map(normalizeLikerRow);
      } catch {
        /* try next */
      }
    }
    return [];
  }

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      if (!open || !postId) return;
      setLoading(true);
      const list = await fetchLikers(postId);
      if (mounted) setLikers(list);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [open, postId]);

  return (
    <Dialog open={!!open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>
        {`Liked by${likers.length ? ` (${likers.length})` : ""}`}
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Typography variant="body2" color="text.secondary">
            Loading…
          </Typography>
        ) : likers.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No likes yet.
          </Typography>
        ) : (
          <List dense>
            {likers.map((u) => (
              <ListItem key={u.id || u.name} disableGutters>
                <ListItemAvatar>
                  <Avatar src={u.avatar}>
                    {(u.name || "U").slice(0, 1).toUpperCase()}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={u.name}
                  secondary={u.headline || null}
                  primaryTypographyProps={{ variant: "body2", fontWeight: 600 }}
                  secondaryTypographyProps={{ variant: "caption" }}
                />
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

// Function For Edit Post Dialog & Delete Confirm Dialog
function PostEditDialog({ open, post, communityId, onClose, onSaved }) {
  const [saving, setSaving] = React.useState(false);
  const [type, setType] = React.useState(post?.type || "text");
  const [content, setContent] = React.useState(post?.content || "");
  const [link, setLink] = React.useState(post?.link || "");
  const [optionsText, setOptionsText] = React.useState(Array.isArray(post?.options) ? post.options.join("\n") : "");

  React.useEffect(() => {
    setType(post?.type || "text");
    setContent(post?.content || "");
    setLink(post?.link || "");
    setOptionsText(Array.isArray(post?.options) ? post.options.join("\n") : "");
  }, [post]);

  if (!post) return null;

  // Build both JSON and FormData shapes; try multiple endpoints until one works
  async function updatePostApi() {
    const jsonPayload = (() => {
      if (type === "text") return { type: "text", content };
      if (type === "link") return { type: "link", url: link, description: content };
      if (type === "image") return { type: "image", caption: content };
      if (type === "poll") {
        const opts = optionsText.split("\n").map(s => s.trim()).filter(Boolean);
        return { type: "poll", question: content, options: opts.length ? opts : undefined };
      }
      return { type: "text", content };
    })();

    const formPayload = (() => {
      const fd = new FormData();
      fd.append("type", type);
      if (type === "text") fd.append("content", content || "");
      if (type === "link") { fd.append("url", link || ""); if (content) fd.append("description", content); }
      if (type === "image") { if (content) fd.append("caption", content); }
      if (type === "poll") {
        fd.append("question", content || "");
        optionsText.split("\n").map(s => s.trim()).filter(Boolean).forEach((o) => fd.append("options", o));
      }
      return fd;
    })();

    const cId = communityId;
    const id = post.id;

    const candidates = [
      // Common working patterns seen in your logs
      { url: `${API_ROOT}/communities/${cId}/posts/${id}/edit/`, method: "PATCH", body: jsonPayload, json: true },
      { url: `${API_ROOT}/communities/${cId}/posts/${id}/edit/`, method: "PUT", body: jsonPayload, json: true },
      { url: `${API_ROOT}/posts/${id}/`, method: "PATCH", body: jsonPayload, json: true },
      { url: `${API_ROOT}/posts/${id}/edit/`, method: "POST", body: jsonPayload, json: true },
      // FormData fallbacks
      { url: `${API_ROOT}/communities/${cId}/posts/${id}/edit/`, method: "POST", body: formPayload, json: false },
    ];

    for (const c of candidates) {
      try {
        const r = await fetch(c.url, {
          method: c.method,
          headers: c.json ? { "Content-Type": "application/json", ...authHeader() } : { ...authHeader() },
          body: c.json ? JSON.stringify(c.body) : c.body,
        });
        if (!r.ok) continue;
        const resp = await r.json().catch(() => ({}));
        // Reuse your existing mapper
        const ui = mapCreateResponseToUiPost(resp);
        return { ...post, ...ui, id: post.id };
      } catch { /* try next */ }
    }
    throw new Error("Update failed");
  }

  const onSave = async () => {
    setSaving(true);
    try {
      const updated = await updatePostApi();
      onSaved?.(updated);
    } catch (e) {
      alert(e.message || "Could not update post");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Edit post</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        {/* Type is shown read-only to keep the UI minimal */}
        <Typography variant="caption" color="text.secondary">Type: {type}</Typography>
        {type === "text" && (
          <TextField fullWidth multiline minRows={4} sx={{ mt: 1 }}
            value={content} onChange={(e) => setContent(e.target.value)} placeholder="Say something…" />
        )}
        {type === "link" && (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField fullWidth value={link} onChange={(e) => setLink(e.target.value)} label="Link URL" />
            <TextField fullWidth multiline minRows={3} value={content} onChange={(e) => setContent(e.target.value)} label="Description" />
          </Stack>
        )}
        {type === "image" && (
          <TextField fullWidth multiline minRows={3} sx={{ mt: 1 }}
            value={content} onChange={(e) => setContent(e.target.value)} label="Caption" />
        )}
        {type === "poll" && (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField fullWidth multiline minRows={2} value={content} onChange={(e) => setContent(e.target.value)} label="Question" />
            <TextField fullWidth multiline minRows={3} value={optionsText} onChange={(e) => setOptionsText(e.target.value)} label="Options (one per line)" />
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={onSave} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
      </DialogActions>
    </Dialog>
  );
}

function PostDeleteConfirm({ open, postId, communityId, onClose, onDeleted }) {
  const [busy, setBusy] = React.useState(false);
  if (!postId) return null;

  async function deletePostApi() {
    const cId = communityId;
    const id = postId;

    const candidates = [
      // Try the /delete/ suffix first (matches your earlier working patterns)
      { url: `${API_ROOT}/communities/${cId}/posts/${id}/delete/`, method: "DELETE" },
      { url: `${API_ROOT}/communities/${cId}/posts/${id}/delete/`, method: "POST" },
      // Plain resource delete
      { url: `${API_ROOT}/communities/${cId}/posts/${id}/`, method: "DELETE" },
      { url: `${API_ROOT}/posts/${id}/delete/`, method: "POST" },
      { url: `${API_ROOT}/posts/${id}/`, method: "DELETE" },
    ];

    for (const c of candidates) {
      try {
        const r = await fetch(c.url, { method: c.method, headers: { ...authHeader(), accept: "application/json" } });
        if (r.ok || r.status === 204) return true;
      } catch { /* try next */ }
    }
    return false;
  }

  const onConfirm = async () => {
    setBusy(true);
    const ok = await deletePostApi();
    setBusy(false);
    if (!ok) {
      alert("Delete failed");          // keep or replace with your snackbar later
      return;
    }
    onDeleted?.(postId);               // parent already closes the dialog & updates list
  };

  return (
    <Dialog open={!!open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Delete post</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary">
          This action can’t be undone.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button color="error" variant="contained" onClick={onConfirm} disabled={busy}>
          {busy ? "Deleting…" : "Delete"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}


// Function For Comments Dialog
function CommentsDialog({ open, postId, onClose }) {
  const [loading, setLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [comments, setComments] = React.useState([]);
  const [text, setText] = React.useState("");
  const [meId, setMeId] = React.useState(null);
  const [replyingTo, setReplyingTo] = React.useState(null);
  const [replyText, setReplyText] = React.useState("");

  // --- helpers that reuse API_ROOT/authHeader from the file ---
  async function getMeId() {
    try {
      const r = await fetch(`${API_ROOT}/users/me/`, { headers: { ...authHeader(), accept: "application/json" } });
      if (!r.ok) return null;
      const d = await r.json();
      return d?.id ?? d?.user?.id ?? null;
    } catch { return null; }
  }

  function normalizeUser(u) {
    if (!u) return { id: null, name: "User", avatar: "" };
    const id = u.id ?? u.user_id ?? null;
    const name = (u.name || `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.username || "User");
    const avatar = u.avatar || u.profile_image || "";
    return { id, name, avatar };
  }

  function normalizeComment(c) {
    const author = normalizeUser(c.author || c.user || c.created_by);
    const id = c.id;
    const created = c.created_at || c.created || c.timestamp || null;
    const body = c.text || c.body || c.content || "";
    const likedByMe = !!(c.liked || c.liked_by_me);
    const likeCount = Number(c.like_count ?? c.likes ?? 0) || 0;
    const canDelete = !!(c.can_delete || c.is_owner || (author.id && meId && author.id === meId));
    const replies = Array.isArray(c.replies) ? c.replies.map(normalizeComment) : [];
    return { id, created, body, author, likedByMe, likeCount, canDelete, replies };
  }

  async function fetchComments(postId) {
    const candidates = [
      `${API_ROOT}/posts/${postId}/comments/`,
      `${API_ROOT}/communities/posts/${postId}/comments/`,
      `${API_ROOT}/activity/posts/${postId}/comments/`,
      `${API_ROOT}/comments/?post=${postId}`,
    ];
    for (const url of candidates) {
      try {
        const r = await fetch(url, { headers: { ...authHeader(), accept: "application/json" } });
        if (!r.ok) continue;
        const data = await r.json();
        const rows = Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : (data?.comments || []));
        return rows.map(normalizeComment);
      } catch { /* try next */ }
    }
    return [];
  }

  async function createComment(postId, body, parentId = null) {
    // Try post-scoped first, then global /comments/
    const payload = parentId ? { text: body, parent: parentId } : { text: body };
    const scoped = [
      { url: `${API_ROOT}/posts/${postId}/comments/`, body: payload },
      { url: `${API_ROOT}/communities/posts/${postId}/comments/`, body: payload },
    ];
    for (const { url, body: b } of scoped) {
      try {
        const r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader() },
          body: JSON.stringify(b),
        });
        if (r.ok) return normalizeComment(await r.json());
      } catch { }
    }
    // Global fallback
    try {
      const r = await fetch(`${API_ROOT}/comments/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ post: postId, text: body, parent: parentId || undefined }),
      });
      if (r.ok) return normalizeComment(await r.json());
    } catch { }
    throw new Error("Could not create comment");
  }

  async function toggleLike(commentId) {
    const candidates = [
      { url: `${API_ROOT}/comments/${commentId}/like/`, method: "POST" },
      { url: `${API_ROOT}/comments/${commentId}/toggle-like/`, method: "POST" },
    ];
    for (const c of candidates) {
      try {
        const r = await fetch(c.url, { method: c.method, headers: { ...authHeader(), accept: "application/json" } });
        if (r.ok) return true;
      } catch { }
    }
    return false;
  }

  async function deleteComment(commentId) {
    const candidates = [
      { url: `${API_ROOT}/comments/${commentId}/`, method: "DELETE" },
      { url: `${API_ROOT}/comments/${commentId}/delete/`, method: "POST" },
    ];
    for (const c of candidates) {
      try {
        const r = await fetch(c.url, { method: c.method, headers: { ...authHeader(), accept: "application/json" } });
        if (r.ok || r.status === 204) return true;
      } catch { }
    }
    return false;
  }

  // load on open
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      if (!open || !postId) return;
      setLoading(true);
      const uid = await getMeId();
      if (mounted) setMeId(uid);
      const list = await fetchComments(postId);
      if (mounted) setComments(list);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [open, postId]);

  const onSubmitNew = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      const c = await createComment(postId, text.trim(), null);
      setComments((prev) => [c, ...prev]);
      setText("");
    } catch (e) {
      alert(e.message || "Failed to add comment");
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmitReply = async () => {
    if (!replyingTo || !replyText.trim()) return;
    setSubmitting(true);
    try {
      const c = await createComment(postId, replyText.trim(), replyingTo);
      setComments((prev) =>
        prev.map((p) => (p.id === replyingTo ? { ...p, replies: [...(p.replies || []), c] } : p))
      );
      setReplyingTo(null);
      setReplyText("");
    } catch (e) {
      alert(e.message || "Failed to reply");
    } finally {
      setSubmitting(false);
    }
  };

  const onLike = async (id) => {
    setComments((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, likedByMe: !c.likedByMe, likeCount: c.likedByMe ? Math.max(0, c.likeCount - 1) : c.likeCount + 1 } : c
      )
    );
    const ok = await toggleLike(id);
    if (!ok) {
      // revert if server failed
      setComments((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, likedByMe: !c.likedByMe, likeCount: c.likedByMe ? Math.max(0, c.likeCount - 1) : c.likeCount + 1 } : c
        )
      );
    }
  };

  const onDelete = async (id, isReply = false, parentId = null) => {
    if (!window.confirm("Delete this comment?")) return;
    const ok = await deleteComment(id);
    if (!ok) return alert("Delete failed");
    setComments((prev) => {
      if (!isReply) return prev.filter((c) => c.id !== id);
      return prev.map((p) => (p.id === parentId ? { ...p, replies: (p.replies || []).filter((r) => r.id !== id) } : p));
    });
  };

  const Item = ({ c, depth = 0, parentId = null }) => (
    <Box sx={{ pl: depth ? 5 : 0, py: 1 }}>
      <Stack direction="row" spacing={1}>
        <Avatar src={c.author.avatar}>{(c.author.name[0] || "").toUpperCase()}</Avatar>
        <Box sx={{ flex: 1 }}>
          <Stack direction="row" alignItems="baseline" spacing={1}>
            <Typography variant="subtitle2">{c.author.name}</Typography>
            {c.created && <Typography variant="caption" color="text.secondary">{timeAgo(c.created)}</Typography>}
          </Stack>
          <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", mt: 0.25 }}>{c.body}</Typography>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
            <IconButton size="small" onClick={() => onLike(c.id)}>
              {c.likedByMe ? <FavoriteRoundedIcon fontSize="small" /> : <FavoriteBorderRoundedIcon fontSize="small" />}
            </IconButton>
            <Typography variant="caption">{c.likeCount || 0}</Typography>

            <Button size="small" startIcon={<ReplyRoundedIcon />} onClick={() => { setReplyingTo(c.id); setReplyText(""); }}>
              Reply
            </Button>

            {c.canDelete && (
              <Button size="small" color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={() => onDelete(c.id, !!parentId, parentId)}>
                Delete
              </Button>
            )}
          </Stack>

          {/* Replies */}
          {c.replies && c.replies.length > 0 && (
            <Box sx={{ mt: 1 }}>
              {c.replies.map((r) => <Item key={r.id} c={r} depth={1} parentId={c.id} />)}
            </Box>
          )}

          {/* Inline reply box */}
          {replyingTo === c.id && (
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <TextField
                size="small"
                fullWidth
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a reply…"
              />
              <Button variant="contained" onClick={onSubmitReply} disabled={submitting || !replyText.trim()}>
                Send
              </Button>
              <Button onClick={() => { setReplyingTo(null); setReplyText(""); }}>Cancel</Button>
            </Stack>
          )}
        </Box>
      </Stack>
    </Box>
  );

  return (
    <Dialog open={!!open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Comments</DialogTitle>
      <DialogContent dividers sx={{ pt: 1 }}>
        {loading ? (
          <Typography variant="body2" color="text.secondary">Loading comments…</Typography>
        ) : comments.length === 0 ? (
          <Typography variant="body2" color="text.secondary">No comments yet. Be the first to comment!</Typography>
        ) : (
          <Box>
            {comments.map((c) => <Item key={c.id} c={c} />)}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Write a comment…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <Button variant="contained" onClick={onSubmitNew} disabled={submitting || !text.trim()}>
          Post
        </Button>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}


// ---------------- About tab (unchanged core logic) ----------------
function SkillsChips({ skills }) {
  if (!skills || !skills.length) return null;
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
      {skills.map((s, i) => (<Chip key={i} size="small" label={s} />))}
    </Box>
  );
}
function SectionCard({ title, action, children, sx }) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 3, width: "100%", ...sx }}>
      <CardHeader title={<Typography variant="h6" sx={{ fontWeight: 600 }}>{title}</Typography>} action={action} sx={{ pb: 0.5 }} />
      <CardContent sx={{ pt: 1.5 }}>{children}</CardContent>
    </Card>
  );
}
// ---------------- Profile wiring (write) ----------------
async function saveProfileToMe(payload) {
  const clean = {
    first_name: payload.first_name || "",
    last_name: payload.last_name || "",
    email: payload.email || undefined, // optional
    profile: {
      full_name: payload.profile?.full_name || "",
      timezone: payload.profile?.timezone || "Asia/Kolkata",
      bio: payload.profile?.bio || "",
      headline: payload.profile?.headline || "",
      job_title: payload.profile?.job_title || "",
      company: payload.profile?.company || "",
      location: payload.profile?.location || "",
      skills: Array.isArray(payload.profile?.skills) ? payload.profile.skills : [],
      links: typeof payload.profile?.links === "object" ? payload.profile.links : {},
    },
  };

  const r = await fetch(`${API_ROOT}/users/me/`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(clean),
  });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = json?.detail ||
      Object.entries(json).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`).join(" | ") ||
      "Save failed";
    throw new Error(msg);
  }
  return json;
}

// ---- About tab API helpers (educations & experiences) ----
async function createEducationApi(payload) {
  const r = await fetch(`${API_ROOT}/auth/me/educations/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({
      school: payload.school,
      degree: payload.degree,
      field_of_study: payload.field,
      start_date: payload.start || null,
      end_date: payload.end || null,
      grade: payload.grade || "",
    }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.detail || "Failed to add education");
  return j;
}

async function updateEducationApi(id, payload) {
  const r = await fetch(`${API_ROOT}/auth/me/educations/${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({
      school: payload.school,
      degree: payload.degree,
      field_of_study: payload.field,
      start_date: payload.start || null,
      end_date: payload.end || null,
      grade: payload.grade || "",
    }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.detail || "Failed to update education");
  return j;
}

async function deleteEducationApi(id) {
  const r = await fetch(`${API_ROOT}/auth/me/educations/${id}/`, {
    method: "DELETE",
    headers: { ...authHeader() },
  });
  if (!r.ok && r.status !== 204) throw new Error("Failed to delete education");
}

async function createExperienceApi(payload) {
  const r = await fetch(`${API_ROOT}/auth/me/experiences/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({
      community_name: payload.org,
      position: payload.position,
      start_date: payload.start || null,
      end_date: payload.current ? null : (payload.end || null),
      currently_work_here: !!payload.current,
      description: payload.description || "",
    }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.detail || "Failed to add experience");
  return j;
}

async function updateExperienceApi(id, payload) {
  const r = await fetch(`${API_ROOT}/auth/me/experiences/${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({
      community_name: payload.org,
      position: payload.position,
      start_date: payload.start || null,
      end_date: payload.current ? null : (payload.end || null),
      currently_work_here: !!payload.current,
      description: payload.description || "",
    }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.detail || "Failed to update experience");
  return j;
}


async function deleteExperienceApi(id) {
  const r = await fetch(`${API_ROOT}/auth/me/experiences/${id}/`, {
    method: "DELETE",
    headers: { ...authHeader() },
  });
  if (!r.ok && r.status !== 204) throw new Error("Failed to delete experience");
}


function AboutTab({ profile, groups, onUpdate }) {
  // ----- dialogs & forms -----
  const [aboutOpen, setAboutOpen] = React.useState(false);
  const [aboutForm, setAboutForm] = React.useState({
    bio: profile.bio || "",
    skillsText: (profile.skills || []).join(", "),
  });

  const [eduOpen, setEduOpen] = React.useState(false);
  const [editEduId, setEditEduId] = React.useState(null);
  const [eduForm, setEduForm] = React.useState({
    school: "", degree: "", field: "", start: "", end: "", grade: "",
  });

  const [expOpen, setExpOpen] = React.useState(false);
  const [editExpId, setEditExpId] = React.useState(null);
  // NOTE: no "location" here anymore
  const [expForm, setExpForm] = React.useState({
    org: "", position: "", start: "", end: "", current: false,
  });

  // NEW: Edit Contact dialog (first, last, email, location, linkedin, job title)
  const [contactOpen, setContactOpen] = React.useState(false);
  const [contactForm, setContactForm] = React.useState({
    first_name: profile.first_name || "",
    last_name: profile.last_name || "",
    email: profile.email || "",
    location: profile.location || "",
    linkedin: profile.links?.linkedin || "",
    job_title: profile.job_title || "",
  });

  React.useEffect(() => {
    setAboutForm({
      bio: profile.bio || "",
      skillsText: (profile.skills || []).join(", "),
    });
    setContactForm({
      first_name: profile.first_name || "",
      last_name: profile.last_name || "",
      email: profile.email || "",
      location: profile.location || "",
      linkedin: profile.links?.linkedin || "",
      job_title: profile.job_title || "",
    });
  }, [profile]);

  const fullName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim();

  const reloadExtras = React.useCallback(async () => {
    const extra = await fetchProfileExtras();
    onUpdate?.({ ...profile, experience: extra.experiences, education: extra.educations });
  }, [onUpdate, profile]);

  // ----- About (summary + skills) -----
  const openEditAbout = () => setAboutOpen(true);
  const saveAbout = async () => {
    try {
      const payload = {
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        email: profile.email || "",
        profile: {
          full_name: fullName,
          timezone: "",
          bio: (aboutForm.bio || "").trim(),
          headline: "",
          job_title: profile.job_title || "",
          company: "",
          location: profile.location || "",
          skills: parseSkills(aboutForm.skillsText),
          links: profile.links || {},
        },
      };
      await saveProfileToMe(payload);
      onUpdate?.({ ...profile, bio: payload.profile.bio, skills: payload.profile.skills });
      setAboutOpen(false);
    } catch (e) { alert(e.message || "Save failed"); }
  };

  // ----- Education -----
  const openAddEducation = () => { setEditEduId(null); setEduForm({ school: "", degree: "", field: "", start: "", end: "", grade: "" }); setEduOpen(true); };
  const openEditEducation = (id) => {
    const e = (profile.education || []).find((x) => x.id === id);
    if (!e) return;
    setEditEduId(id);
    setEduForm({
      school: e.school || "",
      degree: e.degree || "",
      field: e.field || e.field_of_study || "",
      start: e.start || e.start_date || "",
      end: e.end || e.end_date || "",
      grade: e.grade || "",
    });
    setEduOpen(true);
  };
  const saveEducation = async () => {
    try {
      if (editEduId) await updateEducationApi(editEduId, eduForm);
      else await createEducationApi(eduForm);
      setEduOpen(false); setEditEduId(null);
      await reloadExtras();
    } catch (e) { alert(e.message || "Save failed"); }
  };
  const deleteEducation = async (id) => {
    if (!window.confirm("Delete this education?")) return;
    try { await deleteEducationApi(id); setEduOpen(false); setEditEduId(null); await reloadExtras(); }
    catch (e) { alert(e.message || "Delete failed"); }
  };

  // ----- Experience (NO location field) -----
  const openAddExperience = () => { setEditExpId(null); setExpForm({ org: "", position: "", start: "", end: "", current: false }); setExpOpen(true); };
  const openEditExperience = (id) => {
    const x = (profile.experience || []).find((e) => e.id === id);
    if (!x) return;
    setEditExpId(id);
    setExpForm({
      org: x.org || x.community_name || "",
      position: x.position || "",
      start: x.start || x.start_date || "",
      end: x.end || x.end_date || "",
      current: !!(x.current || x.currently_work_here),
    });
    setExpOpen(true);
  };
  const saveExperience = async () => {
    try {
      if (editExpId) await updateExperienceApi(editExpId, expForm);
      else await createExperienceApi(expForm);
      setExpOpen(false); setEditExpId(null);
      await reloadExtras();
    } catch (e) { alert(e.message || "Save failed"); }
  };
  const deleteExperience = async (id) => {
    if (!window.confirm("Delete this experience?")) return;
    try { await deleteExperienceApi(id); setExpOpen(false); setEditExpId(null); await reloadExtras(); }
    catch (e) { alert(e.message || "Delete failed"); }
  };

  // ----- Contact (edit dialog) -----
  const saveContact = async () => {
    try {
      const links = { ...(profile.links || {}), linkedin: (contactForm.linkedin || "").trim() };
      const payload = {
        first_name: (contactForm.first_name || "").trim(),
        last_name: (contactForm.last_name || "").trim(),
        email: (contactForm.email || "").trim() || undefined,
        profile: {
          full_name: `${(contactForm.first_name || "").trim()} ${(contactForm.last_name || "").trim()}`.trim(),
          timezone: "",
          bio: profile.bio || "",
          headline: "",
          job_title: (contactForm.job_title || "").trim(),
          company: "",
          location: (contactForm.location || "").trim(),
          skills: profile.skills || [],
          links,
        },
      };
      await saveProfileToMe(payload);
      onUpdate?.({
        ...profile,
        first_name: payload.first_name,
        last_name: payload.last_name,
        email: payload.email || "",
        job_title: payload.profile.job_title,
        location: payload.profile.location,
        links: payload.profile.links,
      });
      setContactOpen(false);
    } catch (e) { alert(e.message || "Save failed"); }
  };

  return (
    <Box>
      <Grid container spacing={{ xs: 2, md: 2.5 }} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
        {/* LEFT column: About → Experience → Education */}
        <Grid item xs={12} md={6} sx={{ display: "flex", flexDirection: "column", gap: { xs: 2, md: 2.5 } }}>
          <SectionCard
            title="About"
            action={<Tooltip title="Edit about"><IconButton size="small" onClick={openEditAbout}><EditRoundedIcon fontSize="small" /></IconButton></Tooltip>}
            sx={{ minHeight: 200, display: "flex", flexDirection: "column" }}
          >
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>Summary:</Typography>
            {profile.bio ? <Typography variant="body2">{profile.bio}</Typography>
              : <Typography variant="body2" color="text.secondary">—</Typography>}

            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>Skills:</Typography>
            {profile.skills && profile.skills.length
              ? <SkillsChips skills={profile.skills} />
              : <Typography variant="body2" color="text.secondary">—</Typography>}
          </SectionCard>

          <SectionCard
            title="Experience"
            action={<Tooltip title="Add experience"><IconButton size="small" onClick={() => openAddExperience()}><AddRoundedIcon fontSize="small" /></IconButton></Tooltip>}
            sx={{ minHeight: 200, display: "flex", flexDirection: "column" }}
          >
            {profile.experience && profile.experience.length ? (
              <List dense disablePadding>
                {profile.experience.map((exp) => (
                  <ListItem key={exp.id} disableGutters sx={{ py: 0.75 }}
                    secondaryAction={<Tooltip title="Edit"><IconButton size="small" onClick={() => openEditExperience(exp.id)}><EditRoundedIcon fontSize="small" /></IconButton></Tooltip>}>
                    <ListItemText
                      primary={<Typography variant="body2" sx={{ fontWeight: 600 }}>{exp.position} — {exp.org}</Typography>}
                      secondary={<Typography variant="caption" color="text.secondary">{dateRange(exp.start, exp.end, exp.current)}</Typography>}
                    />
                  </ListItem>
                ))}
              </List>
            ) : <Typography variant="body2" color="text.secondary">No experience yet</Typography>}
          </SectionCard>

          <SectionCard
            title="Education"
            action={<Tooltip title="Add education"><IconButton size="small" onClick={() => openAddEducation()}><AddRoundedIcon fontSize="small" /></IconButton></Tooltip>}
            sx={{ minHeight: 200, display: "flex", flexDirection: "column" }}
          >
            {profile.education && profile.education.length ? (
              <List dense disablePadding>
                {profile.education.map((edu) => (
                  <ListItem key={edu.id} disableGutters sx={{ py: 0.75 }}
                    secondaryAction={<Tooltip title="Edit"><IconButton size="small" onClick={() => openEditEducation(edu.id)}><EditRoundedIcon fontSize="small" /></IconButton></Tooltip>}>
                    <ListItemText
                      primary={<Typography variant="body2" sx={{ fontWeight: 600 }}>{edu.degree} — {edu.school}</Typography>}
                      secondary={<Typography variant="caption" color="text.secondary">{dateRange(edu.start, edu.end, false)}{edu.field ? ` · ${edu.field}` : ""}{edu.grade ? ` · ${edu.grade}` : ""}</Typography>}
                    />
                  </ListItem>
                ))}
              </List>
            ) : <Typography variant="body2" color="text.secondary">No education yet</Typography>}
          </SectionCard>
        </Grid>

        {/* RIGHT column: Contact → About your work */}
        <Grid item xs={12} md={6} sx={{ display: "flex", flexDirection: "column", gap: { xs: 2, md: 2.5 } }}>
          <SectionCard
            title="Contact"
            action={<Tooltip title="Edit contact"><IconButton size="small" onClick={() => setContactOpen(true)}><EditRoundedIcon fontSize="small" /></IconButton></Tooltip>}
            sx={{ minHeight: 200, display: "flex", flexDirection: "column" }}
          >
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>LinkedIn</Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <LinkedInIcon fontSize="small" />
              <Typography variant="body2" sx={{ wordBreak: "break-word" }}>{profile.links?.linkedin || "—"}</Typography>
            </Box>

            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>Email</Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <EmailIcon fontSize="small" />
              <Typography variant="body2">{profile.email || "—"}</Typography>
            </Box>

            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>Location</Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <PlaceIcon fontSize="small" />
              <Typography variant="body2">{profile.location || "—"}</Typography>
            </Box>
          </SectionCard>

          {/* About your work */}
          <SectionCard
            sx={{ minHeight: 200, display: "flex", flexDirection: "column" }}
            title="About your work"
          >
            <Box sx={{ display: "flex", alignItems: "center", py: 0.75 }}>
              <Typography variant="subtitle2" sx={{ width: 150, minWidth: 150, color: "text.secondary" }}>Job Title:</Typography>
              <Typography variant="body2" sx={{ flex: 1 }}>{profile.job_title || "—"}</Typography>
            </Box>
            <Divider sx={{ my: 0.5 }} />
            <Box sx={{ display: "flex", alignItems: "center", py: 0.75 }}>
              <Typography variant="subtitle2" sx={{ width: 150, minWidth: 150, color: "text.secondary" }}>Community:</Typography>
              <Typography variant="body2" sx={{ flex: 1 }}>{profile.company || "—"}</Typography>
            </Box>
            <Divider sx={{ my: 0.5 }} />
            <Box sx={{ display: "flex", alignItems: "center", py: 0.75 }}>
              <Typography variant="subtitle2" sx={{ width: 150, minWidth: 150, color: "text.secondary" }}>Sector:</Typography>
              <Typography variant="body2" sx={{ flex: 1 }}>—</Typography>
            </Box>
            <Divider sx={{ my: 0.5 }} />
            <Box sx={{ display: "flex", alignItems: "center", py: 0.75 }}>
              <Typography variant="subtitle2" sx={{ width: 150, minWidth: 150, color: "text.secondary" }}>Industry:</Typography>
              <Typography variant="body2" sx={{ flex: 1 }}>—</Typography>
            </Box>
            <Divider sx={{ my: 0.5 }} />
            <Box sx={{ display: "flex", alignItems: "center", py: 0.75 }}>
              <Typography variant="subtitle2" sx={{ width: 150, minWidth: 150, color: "text.secondary" }}>Number of Employees:</Typography>
              <Typography variant="body2" sx={{ flex: 1 }}>—</Typography>
            </Box>
          </SectionCard>
        </Grid>
      </Grid>

      {/* --- Dialogs --- */}

      {/* Edit About */}
      <Dialog open={aboutOpen} onClose={() => setAboutOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Edit About</DialogTitle>
        <DialogContent>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>Update your summary and skills</Typography>
          <TextField label="Summary" value={aboutForm.bio} onChange={(e) => setAboutForm((f) => ({ ...f, bio: e.target.value }))} fullWidth multiline minRows={4} sx={{ mb: 2 }} />
          <TextField label="Skills (CSV or JSON array)" value={aboutForm.skillsText} onChange={(e) => setAboutForm((f) => ({ ...f, skillsText: e.target.value }))} fullWidth helperText="Saved as a list of strings" />
          <Box sx={{ mt: 1, display: "flex", gap: 1, flexWrap: "wrap" }}>
            {parseSkills(aboutForm.skillsText).length ? parseSkills(aboutForm.skillsText).map((s, i) => <Chip key={i} label={s} size="small" />) : <Typography variant="caption" color="text.secondary">No skills parsed yet</Typography>}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAboutOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveAbout}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Add/Edit Education */}
      <Dialog open={eduOpen} onClose={() => { setEduOpen(false); setEditEduId(null); }} fullWidth maxWidth="sm">
        <DialogTitle>{editEduId ? "Edit education" : "Add education"}</DialogTitle>
        <DialogContent>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>*Required fields are marked with an asterisk</Typography>
          <TextField label="School *" value={eduForm.school} onChange={(e) => setEduForm((f) => ({ ...f, school: e.target.value }))} fullWidth sx={{ mb: 2 }} />
          <TextField label="Degree *" value={eduForm.degree} onChange={(e) => setEduForm((f) => ({ ...f, degree: e.target.value }))} fullWidth sx={{ mb: 2 }} />
          <TextField label="Field of Study *" value={eduForm.field} onChange={(e) => setEduForm((f) => ({ ...f, field: e.target.value }))} fullWidth sx={{ mb: 2 }} />
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6}><TextField label="Start Date" type="date" value={eduForm.start} onChange={(e) => setEduForm((f) => ({ ...f, start: e.target.value }))} fullWidth InputLabelProps={{ shrink: true }} /></Grid>
            <Grid item xs={12} sm={6}><TextField label="End Date" type="date" value={eduForm.end} onChange={(e) => setEduForm((f) => ({ ...f, end: e.target.value }))} fullWidth InputLabelProps={{ shrink: true }} /></Grid>
          </Grid>
          <TextField label="Grade *" value={eduForm.grade} onChange={(e) => setEduForm((f) => ({ ...f, grade: e.target.value }))} fullWidth />
        </DialogContent>
        <DialogActions>
          {editEduId && (<Button color="error" onClick={() => deleteEducation(editEduId)}>Delete</Button>)}
          <Button onClick={() => { setEduOpen(false); setEditEduId(null); }}>Cancel</Button>
          <Button variant="contained" onClick={saveEducation}>{editEduId ? "Save changes" : "Save"}</Button>
        </DialogActions>
      </Dialog>

      {/* Add/Edit Experience (NO Location field) */}
      <Dialog open={expOpen} onClose={() => { setExpOpen(false); setEditExpId(null); }} fullWidth maxWidth="sm">
        <DialogTitle>{editExpId ? "Edit experience" : "Add experience"}</DialogTitle>
        <DialogContent>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>*Required fields are marked with an asterisk</Typography>
          <TextField label="Community name *" value={expForm.org} onChange={(e) => setExpForm((f) => ({ ...f, org: e.target.value }))} fullWidth sx={{ mb: 2 }} />
          <TextField label="Position *" value={expForm.position} onChange={(e) => setExpForm((f) => ({ ...f, position: e.target.value }))} fullWidth sx={{ mb: 2 }} />
          <Grid container spacing={2} sx={{ mb: 1 }}>
            <Grid item xs={12} sm={6}><TextField label="Start Date" type="date" value={expForm.start} onChange={(e) => setExpForm((f) => ({ ...f, start: e.target.value }))} fullWidth InputLabelProps={{ shrink: true }} /></Grid>
            <Grid item xs={12} sm={6}><TextField label="End Date" type="date" value={expForm.end} onChange={(e) => setExpForm((f) => ({ ...f, end: e.target.value }))} fullWidth disabled={expForm.current} InputLabelProps={{ shrink: true }} /></Grid>
          </Grid>
          <FormControlLabel control={<Checkbox checked={expForm.current} onChange={(e) => setExpForm((f) => ({ ...f, current: e.target.checked, end: e.target.checked ? "" : f.end }))} />} label="I currently work here" />
        </DialogContent>
        <DialogActions>
          {editExpId && (<Button color="error" onClick={() => deleteExperience(editExpId)}>Delete</Button>)}
          <Button onClick={() => { setExpOpen(false); setEditExpId(null); }}>Cancel</Button>
          <Button variant="contained" onClick={saveExperience}>{editExpId ? "Save changes" : "Save"}</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Contact */}
      <Dialog open={contactOpen} onClose={() => setContactOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Edit Contact</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}><TextField label="First name" value={contactForm.first_name} onChange={(e) => setContactForm({ ...contactForm, first_name: e.target.value })} fullWidth /></Grid>
              <Grid item xs={12} sm={6}><TextField label="Last name" value={contactForm.last_name} onChange={(e) => setContactForm({ ...contactForm, last_name: e.target.value })} fullWidth /></Grid>
            </Grid>
            <TextField label="Job title" value={contactForm.job_title} onChange={(e) => setContactForm({ ...contactForm, job_title: e.target.value })} fullWidth />
            <TextField label="Email" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} fullWidth />
            <Autocomplete
              size="small"
              fullWidth
              options={COUNTRY_OPTIONS}
              autoHighlight
              value={getSelectedCountry({ location: contactForm.location })}
              getOptionLabel={(opt) => opt?.label ?? ""}
              isOptionEqualToValue={(o, v) => o.code === v.code}
              onChange={(_, newVal) =>
                setContactForm((f) => ({ ...f, location: newVal ? newVal.label : "" }))
              }

              // ⬇️ show 7 items, then scroll
              ListboxProps={{
                style: {
                  maxHeight: 36 * 7,   // 36px per option for size="small"; use 48 * 7 for "medium"
                  overflowY: "auto",
                  paddingTop: 0,
                  paddingBottom: 0,
                },
              }}

              renderOption={(props, option) => (
                <li {...props} key={option.code}>
                  <span style={{ marginRight: 8 }}>{option.emoji}</span>
                  {option.label}
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Location"
                  placeholder="Select country"
                  fullWidth
                  inputProps={{ ...params.inputProps, autoComplete: "new-password" }}
                />
              )}
            />
            <TextField label="LinkedIn URL" value={contactForm.linkedin} onChange={(e) => setContactForm({ ...contactForm, linkedin: e.target.value })} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setContactOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveContact}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

