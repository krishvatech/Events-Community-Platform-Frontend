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
  AvatarGroup,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  Checkbox,
  FormControlLabel,
  MenuItem,
  Drawer,
  LinearProgress
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
import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded";
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import IosShareRoundedIcon from "@mui/icons-material/IosShareRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";


// -----------------------------------------------------------------------------
// API helpers
// -----------------------------------------------------------------------------
const API_ROOT = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");
// Derive the backend origin from API_ROOT (http://127.0.0.1:8000 if your API is there)
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

// ---------------- Profile wiring (read) ----------------
function mapExperience(item) {
  return {
    id: item.id,
    org: item.community_name || item.org || item.company || "",
    position: item.position || "",
    start: item.start_date || "",
    end: item.end_date || "",
    current: !!item.currently_work_here,
    // new metadata (all optional on read):
    employment_type: item.employment_type || "full_time",
    work_schedule: item.work_schedule || "",
    relationship_to_org: item.relationship_to_org || "",
    career_stage: item.career_stage || "",
    compensation_type: item.compensation_type || "",
    work_arrangement: item.work_arrangement || "",
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
    id: data.id ?? null,
    first_name: data.first_name || "",
    last_name: data.last_name || "",
    email: data.email || "",
    job_title: prof.job_title || "",
    bio: prof.bio || "",
    location: prof.location || "",
    avatar: prof.user_image_url || prof.user_image || prof.avatar || data.avatar || "",
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
  id: null,
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

function loadInitialProfile() {
  // 1) First, try cached profile_core (fast return on second+ visits)
  try {
    const raw = localStorage.getItem("profile_core");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return { ...EMPTY_PROFILE, ...parsed };
      }
    }
  } catch (e) {
    console.warn("Failed to read cached profile_core", e);
  }

  // 2) Fallback: decode JWT token to get name instantly on FIRST visit
  try {
    const token = getToken();
    const payload = decodeJwtPayload(token);
    if (payload) {
      const first_name =
        payload.first_name ||
        payload.given_name ||
        (payload.name ? String(payload.name).split(" ")[0] : "") ||
        "";
      const last_name =
        payload.last_name ||
        payload.family_name ||
        (payload.name ? String(payload.name).split(" ").slice(1).join(" ") : "") ||
        "";
      const email = payload.email || "";

      return {
        ...EMPTY_PROFILE,
        id: payload.user_id || payload.id || null,
        first_name,
        last_name,
        email,
      };
    }
  } catch (e) {
    console.warn("Failed to decode JWT payload", e);
  }

  // 3) Final fallback
  return EMPTY_PROFILE;
}


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
function PostCard({ post, avatarUrl, actorName }) {
  const name = (post.actor_name || actorName || "You");
  const initial = (name?.[0] || "U").toUpperCase();
  const photo = post.actor_avatar || avatarUrl || "";
  const commentInputRef = React.useRef(null);
  // --- likers preview for the meta strip (same endpoints used in AdminPostsPage) ---
  const [likers, setLikers] = React.useState([]);
  const likeCount = Number(post?.metrics?.likes ?? 0);
  const commentCount = Number(post?.metrics?.comments ?? 0);
  const shareCount = Number(post?.metrics?.shares ?? 0);

  const normalizeUsers = (payload) => {
    const rows = Array.isArray(payload?.results)
      ? payload.results
      : Array.isArray(payload)
        ? payload
        : [];

    const makeAbsolute = (url) =>
      !url
        ? ""
        : /^https?:\/\//i.test(url)
          ? url
          : `${(import.meta.env.VITE_MEDIA_BASE_URL || API_ORIGIN)}${url.startsWith("/") ? "" : "/"
          }${url}`;

    return rows
      .map((r) => {
        const u =
          r.user ||
          r.actor ||
          r.liker ||
          r.owner ||
          r.profile ||
          r;
        const profile =
          u.profile ||
          u.user_profile ||
          u.userprofile ||
          r.profile ||
          {};

        const id =
          u?.id ??
          u?.user_id ??
          r.user_id ??
          r.id;

        const first =
          u?.first_name ??
          u?.firstName ??
          r.user_first_name ??
          "";
        const last =
          u?.last_name ??
          u?.lastName ??
          r.user_last_name ??
          "";

        const name =
          u?.name ||
          u?.full_name ||
          `${first} ${last}`.trim() ||
          u?.username ||
          (id ? `User #${id}` : "User");

        const avatarRaw =
          profile.user_image_url ||
          profile.user_image ||
          u?.user_image_url ||
          u?.user_image ||
          r.user_image_url ||
          r.user_image ||
          u?.avatar ||
          u?.profile_image ||
          u?.photo ||
          u?.image_url ||
          u?.avatar_url ||
          "";

        return {
          id,
          name,
          avatar: makeAbsolute(avatarRaw),
        };
      })
      .filter(Boolean);
  };

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const urls = [
          // Primary: generic reactions API, filtered to likes
          `${API_ROOT}/engagements/reactions/?reaction=like&target_type=activity_feed.feeditem&target_id=${post.id}&page_size=5`,
          // Fallback: who-liked helper if present
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
        : `liked by ${primaryLiker.name} and ${othersCount} ${othersCount === 1 ? "other" : "others"
        }`
      : `${(likeCount || 0).toLocaleString()} likes`;

  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardHeader
        avatar={<Avatar src={photo}>{initial}</Avatar>}
        title={<Typography fontWeight={600}>{name}</Typography>}
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

        {post.type === "poll" && Array.isArray(post.options) && post.options.length > 0 && (() => {
        // normalise options and compute totals
        const normalized = post.options.map((opt, idx) => {
          const optionId =
            typeof opt === "object"
              ? (opt.id ?? opt.option_id ?? null)
              : null;

          const label =
            typeof opt === "string"
              ? opt
              : (opt?.text ?? opt?.label ?? `Option ${idx + 1}`);

          const votes =
            typeof opt === "object" && typeof opt?.vote_count === "number"
              ? opt.vote_count
              : 0;

          return { idx, optionId, label, votes };
        });

        const totalVotes = normalized.reduce((sum, o) => sum + o.votes, 0);

        return (
          <Box sx={{ mt: 2 }}>
            {normalized.map(({ idx, optionId, label, votes }) => {
              const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;

              return (
                <Box
                  key={idx}
                  sx={{
                    mb: 1.5,
                    cursor: optionId ? "pointer" : "default",
                  }}
                  onClick={() => {
                    if (!optionId) return;
                    window.__votePollOption?.(post.id, optionId);
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
                      window.__openPollVotes?.(post.id, optionId, label)?.();
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

      </CardContent>
      <CardActions sx={{ px: 1, py: 0.5, display: 'block' }}>
        {/* Meta strip: avatars + "Name and N others"  |  shares on the right */}
        <Box sx={{ px: 1.25, pt: 0.75, pb: 0.5 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            {/* Left: liker avatars + sentence (click opens likers dialog) */}
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ cursor: "pointer" }}
              onClick={() => window.__openLikes?.(post.id)?.()}
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
                {likeLabel}
              </Typography>

            </Stack>

            {/* Right: "N SHARES" (click opens share list) */}
            <Stack direction="row" alignItems="center" spacing={1}>
              <Button size="small" onClick={() => window.__openShares?.(post.id)?.()}>
                {Number(shareCount || 0).toLocaleString()} SHARES
              </Button>
            </Stack>
          </Stack>
        </Box>

        {/* Action row: Like / Comment / Share (same as Admin social bar) */}
        <Stack
          direction="row"
          alignItems="center"
          justifyContent={{ xs: "space-between", sm: "space-around" }}
          spacing={{ xs: 0.5, sm: 1.5 }}
          sx={{
            mt: 0.25,
            pt: 0.5,
            borderTop: (t) => `1px solid ${t.palette.divider}`,
            px: { xs: 0.25, sm: 0.5 },
            pb: 0.5,
            flexWrap: "nowrap",           //  always one line, even on 320px
          }}
        >

          {/* Like — uses your existing toggle + opens likers dialog (Admin behavior) */}
          <Button
            size="small"
            startIcon={post?.liked_by_me ? <FavoriteRoundedIcon /> : <FavoriteBorderRoundedIcon />}
            onClick={(e) => {
              e.stopPropagation();

              const wasLiked = !!post?.liked_by_me;
              const me = (typeof window !== "undefined" && window.__me) || null;

              if (me) {
                setLikers((prev) => {
                  const exists = prev.some(
                    (u) =>
                      (me.id && u.id && u.id === me.id) ||
                      (!me.id && u.name === me.name)
                  );

                  // If we are liking now (was not liked before)
                  if (!wasLiked) {
                    if (exists) return prev;
                    const selfUser = {
                      id: me.id || null,
                      name: me.name || "You",
                      avatar: me.avatar || "",
                    };
                    return [selfUser, ...prev];
                  }

                  // If we are unliking now – remove myself from the strip
                  return prev.filter(
                    (u) =>
                      !(
                        (me.id && u.id && u.id === me.id) ||
                        (!me.id && u.name === me.name)
                      )
                  );
                });
              }

              // Still call the global toggle to update metrics + backend
              window.__toggleLike?.(post.id);
            }}
            sx={{
              //  Equal width on small phones; natural width on bigger screens
              flex: { xs: 1, sm: "0 0 auto" },
              minWidth: 0,
              px: { xs: 0.25, sm: 1 },
              fontSize: { xs: 11, sm: 12 },
              "& .MuiButton-startIcon": {
                mr: { xs: 0.25, sm: 0.5 },
              },
            }}
          >
            LIKE
          </Button>


          {/* Comment — opens the comments popup (same as Admin) */}
          <Button
            size="small"
            startIcon={<ChatBubbleOutlineRoundedIcon />}
            onClick={() => window.__openComments?.(post.id)?.()}
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

          {/* Share — opens the “shared by” list */}
          <Button
            size="small"
            startIcon={<IosShareRoundedIcon />}
            onClick={() => window.__openShares?.(post.id)?.()}
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


      </CardActions>

    </Card>
  );
}

function MyPostsList({ posts, avatarUrl, actorName }) {
  if (!posts || posts.length === 0) {
    return (
      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent><Typography>No posts yet.</Typography></CardContent>
      </Card>
    );
  }
  return (
    <Stack spacing={2}>
      {posts.map((p) => (
        <PostCard key={p.id} post={p} avatarUrl={avatarUrl} actorName={actorName} />
      ))}
    </Stack>
  );
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
              <ListItemAvatar>
                <Avatar
                  src={g.cover_image || undefined}
                  alt={g.name || "Group"}
                  imgProps={{ referrerPolicy: "no-referrer" }}
                >
                  {(g.name || "").slice(0, 1).toUpperCase()}
                </Avatar>
              </ListItemAvatar>
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
// Put this small helper once (top of file or near other utils)
const toAbsolute = (u) =>
  !u
    ? ""
    : /^https?:\/\//i.test(u)
      ? u
      : `${(import.meta.env.VITE_MEDIA_BASE_URL || API_ORIGIN)}${u.startsWith("/") ? "" : "/"}${u}`;


function normalizeFriend(row) {
  // accept common payload shapes
  const u = row?.friend || row?.user || row || {};
  const profile = u.profile || u.userprofile || u.user_profile || row?.profile || {};

  const id = u.id ?? row.id;
  const first = u.first_name || u.firstName || "";
  const last = u.last_name || u.lastName || "";

  // Match the same priority you already use elsewhere (profile → flat → legacy)
  const avatarRaw =
    profile.user_image_url ||
    profile.user_image ||
    u.user_image_url ||
    u.user_image ||
    row.user_image ||                 // sometimes it lives on the row itself
    u.image_url ||
    u.photo_url ||
    u.avatar_url ||
    u.profile_image ||
    u.avatar ||
    "";

  return {
    id,
    name: `${first} ${last}`.trim() || u.username || "Friend",
    avatar: toAbsolute(avatarRaw),
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
                    <Avatar
                      src={f.avatar}
                      imgProps={{ referrerPolicy: "no-referrer" }}
                    >
                      {(f.name?.[0] || "").toUpperCase()}
                    </Avatar>
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
      cover_image: row.cover_image || row.coverImage || null,
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
      cover_image: g.cover_image || g.coverImage || null,
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

const TAB_LABELS = ["My Posts", "My Groups", "My Friends", "About"];
export default function HomePage() {
  const PAGE_MAX_W = 1120;
  const [myCommunityId, setMyCommunityId] = React.useState(null);
  const [posts, setPosts] = React.useState([]);           // ← now real data
  const [profile, setProfile] = React.useState(() => loadInitialProfile());
  const [groups, setGroups] = React.useState([]);
  const [communities, setCommunities] = React.useState([]); // for composer picklist
  const [tabIndex, setTabIndex] = React.useState(0);
  const [mobileTabsOpen, setMobileTabsOpen] = React.useState(false); // 👈 added
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
  const [avatarDialogOpen, setAvatarDialogOpen] = React.useState(false);
  const [avatarFile, setAvatarFile] = React.useState(null);
  const [avatarPreview, setAvatarPreview] = React.useState("");
  const [avatarSaving, setAvatarSaving] = React.useState(false);
  const [sharesOpen, setSharesOpen] = React.useState(false);
  const [sharesPostId, setSharesPostId] = React.useState(null);
  const [pollVotesOpen, setPollVotesOpen] = React.useState(false);
  const [pollVotesTarget, setPollVotesTarget] = React.useState(null);

  React.useEffect(() => {
    window.__openPollVotes = (postId, optionId, optionLabel) => () => {
      setPollVotesTarget({ postId, optionId, optionLabel });
      setPollVotesOpen(true);
    };
    return () => {
      try {
        delete window.__openPollVotes;
      } catch {}
    };
  }, []);
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

  React.useEffect(() => {
    window.__openShares = (postId) => () => { setSharesPostId(postId); setSharesOpen(true); };
    return () => { try { delete window.__openShares; } catch { } };
  }, []);


  // --- Expose global functions to open edit/delete dialogs ----
  React.useEffect(() => {
    window.__openPostEdit = (postId) => () => { setEditPostId(postId); setEditOpen(true); };
    window.__confirmDeletePost = (postId) => () => { setDeletePostId(postId); setDeleteOpen(true); };
    return () => {
      try { delete window.__openPostEdit; delete window.__confirmDeletePost; } catch { }
    };
  }, []);

  React.useEffect(() => {
    window.__setPostMetrics = (postId, patch) => {
      setPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, metrics: { ...(p.metrics || {}), ...patch } } : p
      ));
    };
    return () => { try { delete window.__setPostMetrics; } catch { } };
  }, []);


  // Toggle like for a FeedItem, then optionally open the likers popup
  React.useEffect(() => {
    window.__toggleLike = async (postId, openAfter = false) => {
      try {
        // optimistic UI
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? {
                ...p,
                liked_by_me: !p.liked_by_me,
                metrics: {
                  ...(p.metrics || {}),
                  likes: (p.metrics?.likes ?? 0) + (p.liked_by_me ? -1 : 1),
                },
              }
              : p
          )
        );
        // backend toggle
        const r = await fetch(`${API_ROOT}/engagements/reactions/toggle/`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader() },
          body: JSON.stringify({
            target_type: "activity_feed.feeditem",
            target_id: postId,
            reaction: "like",
          }),
        });
        if (!r.ok) throw new Error("toggle failed");
        if (openAfter) {
          setLikesPostId(postId);
          setLikesOpen(true);
        }
      } catch {
        // revert on error
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? {
                ...p,
                liked_by_me: !p.liked_by_me,
                metrics: {
                  ...(p.metrics || {}),
                  likes: (p.metrics?.likes ?? 0) + (p.liked_by_me ? -1 : 1),
                },
              }
              : p
          )
        );
      }
    };
    return () => { try { delete window.__toggleLike; } catch { } };
  }, []);


  // ---- Fetch my posts (paginated) ----
  const fetchMyPosts = React.useCallback(async () => {
    try {
      const res = await fetch(`${API_ROOT}/activity/feed/posts/me/`, { headers: { ...authHeader(), accept: "application/json" } });
      const data = await res.json();
      const rows = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
      const ui = rows.map(mapFeedItemRowToUiPost);
      setPosts(ui);
      // hydrate metrics (likes, comments, liked_by_me) from engagements
      const ids = ui.map(p => p.id).join(",");
      if (ids) {
        const raw = await fetch(
          `${API_ROOT}/engagements/metrics/?target_type=activity_feed.feeditem&ids=${ids}`,
          { headers: { ...authHeader(), accept: "application/json" } }
        ).then(r => (r.ok ? r.json() : {}));
        const bag = raw?.results || raw?.data || raw?.metrics || raw || {};
        setPosts(prev =>
          prev.map(p => {
            const key = String(p.id);
            const row = bag[key] ||
              (Array.isArray(bag) ? bag.find(x => String(x.id) === key) : null) ||
              {};
            return {
              ...p,
              liked_by_me: Boolean(row.user_has_liked ?? p.liked_by_me),
              metrics: {
                likes: Number(row.likes ?? 0),
                comments: Number(row.comments ?? 0),
              },
            };
          })
        );
      }
    } catch (e) {
      console.error("Failed to load my posts:", e);
      setPosts([]); // keep empty
    }
  }, []);

  // ---- Global poll vote handler (uses setPosts + fetchMyPosts) ----
  React.useEffect(() => {
    window.__votePollOption = async (postId, optionId) => {
      if (!optionId) return;

      // Optimistic UI: increment vote_count for that option
      setPosts(prev =>
        prev.map(p => {
          if (p.id !== postId || p.type !== "poll") return p;
          const options = (p.options || []).map(opt => {
            if (typeof opt !== "object") return opt;
            const oid = opt.id ?? opt.option_id;
            if (oid !== optionId) return opt;
            return {
              ...opt,
              vote_count: Number(opt.vote_count || 0) + 1,
            };
          });
          return { ...p, options };
        })
      );

      try {
        const res = await fetch(
          `${API_ROOT}/activity/feed/${postId}/poll/vote/`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...authHeader(),
            },
            body: JSON.stringify({ option_ids: [optionId] }),
          }
        );

        if (!res.ok) {
          throw new Error("Vote failed");
        }

        // If API returns updated options, merge them in
        const data = await res.json().catch(() => null);
        if (data && Array.isArray(data.options)) {
          setPosts(prev =>
            prev.map(p =>
              p.id === postId && p.type === "poll"
                ? { ...p, options: data.options }
                : p
            )
          );
        }
      } catch (err) {
        console.error(err);
        // On error, reload posts so counts are correct again
        fetchMyPosts();
      }
    };

    return () => {
      try {
        delete window.__votePollOption;
      } catch {}
    };
  }, [fetchMyPosts]);


  React.useEffect(() => {
    if (Array.isArray(posts) && posts.length) {
      hydrateShareCounts(posts);
    }
  }, [posts]);


  async function hydrateShareCounts(items) {
    const ids = (items || []).map(p => p?.id).filter(Boolean);
    if (!ids.length) return;
    try {
      const res = await fetch(
        `${API_ROOT}/engagements/metrics/?target_type=activity_feed.feeditem&ids=${ids.join(",")}`,
        { headers: { ...authHeader(), accept: "application/json" } }
      );
      if (!res.ok) return;
      const raw = await res.json();
      const bag = raw?.results || raw?.data || raw?.metrics || raw || {};
      // Update each post’s share count without touching your existing like/comment logic
      for (const id of ids) {
        const key = String(id);
        const row = bag[key] ||
          (Array.isArray(bag) ? bag.find(x => String(x.id) === key) : null) || {};
        const shares = Number(
          row.shares ?? row.share_count ?? row.shares_count ?? 0
        ) || 0;
        window.__setPostMetrics?.(id, { shares });
      }
    } catch { }
  }


  const fetchMyProfileFromMe = React.useCallback(async () => {
    try {
      // 1) Start both calls in parallel
      const corePromise = fetchProfileCore();
      const extrasPromise = fetchProfileExtras().catch(() => ({
        experiences: [],
        educations: [],
      }));

      // 2) Wait for /users/me/ first → show name + job title fast
      const core = await corePromise;

      setProfile((prev) => ({
        ...prev,
        ...core,
      }));

      // Cache core locally so next time name is instant
      try {
        localStorage.setItem("profile_core", JSON.stringify(core));
      } catch (e) {
        console.warn("Failed to cache profile_core", e);
      }

      // Expose current user globally so PostCard & others can use it
      try {
        window.__me = {
          id: core.id || null,
          name:
            `${core.first_name || ""} ${core.last_name || ""}`.trim() ||
            "You",
          avatar: core.avatar || "",
        };
      } catch {
        // ignore
      }

      // 3) Now wait for slow extras and merge them later
      const extra = await extrasPromise;

      setProfile((prev) => ({
        ...prev,
        experience: extra.experiences,
        education: extra.educations,
      }));
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
    const communityId = myCommunityId;
    if (!communityId) { alert("Community not loaded yet."); return; }

    // 1. INTERCEPT POLLS: Send to the dedicated polls/create endpoint
    if (draft.type === "poll") {
      const payload = {
        question: draft.content || "",
        options: draft.options || [],
        community_id: Number(communityId),
        // backend 'polls_create' expects JSON, not FormData
      };

      // Note: based on your views.py, the path is likely /activity/feed/polls/create/
      const res = await fetch(`${API_ROOT}/activity/feed/polls/create/`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...authHeader() 
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to create poll");
      }
      // The backend returns { ok: true, poll: {...}, feed_item_id: ... }
      // We need to map this back to your UI format so it appears immediately
      const data = await res.json();
      
      // Return a shape that mapCreateResponseToUiPost understands
      return {
        id: data.feed_item_id,
        type: "poll",
        created_at: new Date().toISOString(),
        question: data.poll.question,
        options: data.poll.options,
        community: { id: communityId },
      };
    }

    // 2. STANDARD POSTS (Text, Image, Link) - Keep existing FormData logic
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

  const handleUpdateProfile = (updater) => {
    setProfile((prev) =>
      typeof updater === "function" ? updater(prev) : updater
    );
  };
  const fullName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "User";

  return (
    <Box sx={{ px: { xs: 1, sm: 2, md: 0 }, py: 2 }}>
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
            <Box sx={{ position: "relative", mr: { sm: 2 }, width: 72, height: 72 }}>
              <Avatar src={profile.avatar || ""} sx={{ width: 72, height: 72 }}>
                {(fullName[0] || "").toUpperCase()}
              </Avatar>
              <Tooltip title="Change photo">
                <IconButton
                  size="small"
                  onClick={() => {
                    setAvatarPreview(profile.avatar || "");
                    setAvatarDialogOpen(true);
                  }}
                  sx={{
                    position: "absolute",
                    right: -6,
                    bottom: -6,
                    bgcolor: "background.paper",
                    border: "1px solid",
                    borderColor: "divider",
                    boxShadow: 1,
                  }}
                >
                  <PhotoCameraRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            <Box
              sx={{
                // grow / shrink on tablet & desktop so counts always fit
                flex: { xs: "0 0 auto", sm: 1 },
                minWidth: 0,
                width: { xs: "100%", sm: "auto" },
                // keep your previous feel on larger screens
                maxWidth: { sm: 700, md: 780 },
                alignSelf: { xs: "flex-start", sm: "center" },
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600 }}>{fullName}</Typography>

              {/* Show latest experience under name */}
              {profile.experience && profile.experience.length > 0 ? (
                <Typography variant="body2" color="text.secondary">
                  {profile.experience[0].position} – {profile.experience[0].org}
                </Typography>
              ) : (
                profile.job_title && (
                  <Typography variant="body2" color="text.secondary">{profile.job_title}</Typography>
                )
              )}
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
        {/* Tabs */}
        <Card variant="outlined" sx={{ borderRadius: 3, width: "100%" }}>
          {/* Desktop / tablet tab row */}
          <Box sx={{ display: { xs: "none", sm: "block" } }}>
            <Tabs
              value={tabIndex}
              onChange={(_, v) => setTabIndex(v)}
              variant="scrollable"
              allowScrollButtonsMobile
            >
              {TAB_LABELS.map((label) => (
                <Tab key={label} label={label} />
              ))}
            </Tabs>
          </Box>

          {/* Mobile tab header with drawer trigger */}
          <Box
            sx={{
              display: { xs: "flex", sm: "none" },
              alignItems: "center",
              justifyContent: "space-between",
              px: 2,
              py: 1,
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {TAB_LABELS[tabIndex] || "My Posts"}
            </Typography>
            <IconButton
              size="small"
              onClick={() => setMobileTabsOpen(true)}
              aria-label="Open sections"
            >
              <MenuRoundedIcon />
            </IconButton>
          </Box>

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
                  <MyPostsList
                    posts={posts}
                    avatarUrl={profile.avatar}
                    actorName={fullName}
                  />
                </ScrollThreeVisible>
              </Stack>
            )}
            {tabIndex === 1 && <MyGroups groups={groups} />}
            {tabIndex === 2 && <MyFriends friends={friends} />}     {/* ← NEW */}
            {tabIndex === 3 && (
              <AboutTab
                profile={profile}
                groups={groups}
                onUpdate={handleUpdateProfile}
              />
            )}
          </CardContent>
        </Card>

        {/* Mobile drawer for tabs – right side, like community sidebar */}
        <Drawer
          anchor="right"
          open={mobileTabsOpen}
          onClose={() => setMobileTabsOpen(false)}
          sx={{
            display: { xs: "block", sm: "none" },
            "& .MuiBackdrop-root": {
              backgroundColor: "rgba(15, 23, 42, 0.45)", // dim background like sidebar
            },
          }}
          PaperProps={{
            sx: {
              width: { xs: "88vw", sm: 320 }, // narrower on very small phones
              maxWidth: "100vw",
              borderTopLeftRadius: 24,
              borderBottomLeftRadius: 24,
              borderTopRightRadius: 0,
              borderBottomRightRadius: 0,
              pb: 2,
              mt: { xs: 7, sm: 0 },
              height: { xs: "calc(100% - 56px)", sm: "100%" },
            },
          }}
        >
          <Box sx={{ p: 2 }}>
            {/* title – same dark color as brand text */}
            <Typography
              variant="subtitle1"
              sx={{
                mb: 2,
                fontWeight: 700,
                letterSpacing: 0,
                textTransform: "none",
                fontSize: 16,
                color: "#262626", // same kind of dark as "IMAA Connect"
              }}
            >
              Go to section
            </Typography>

            <Stack spacing={1}>
              {TAB_LABELS.map((label, index) => (
                <Button
                  key={label}
                  fullWidth
                  variant="text"
                  sx={{
                    justifyContent: "flex-start",
                    textTransform: "none",
                    borderRadius: 999, // pill
                    px: 1.5,
                    py: 0.75,
                    fontSize: 14,
                    fontWeight: index === tabIndex ? 700 : 500,

                    // text color same as left sidebar items
                    color: "#262626",

                    // active background same as "Home" pill in left sidebar
                    backgroundColor: index === tabIndex ? "#E6F7F6" : "transparent",

                    "&:hover": {
                      backgroundColor:
                        index === tabIndex
                          ? "#E6F7F6"             // keep same on hover for active
                          : "#F3F4F6",            // light grey hover for inactive
                    },
                  }}
                  onClick={() => {
                    setTabIndex(index);
                    setMobileTabsOpen(false);
                  }}
                >
                  {label}
                </Button>
              ))}
            </Stack>
          </Box>
        </Drawer>
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
      <SharesDialog
        open={sharesOpen}
        postId={sharesPostId}
        onClose={() => setSharesOpen(false)}
      />
      <PollVotesDialog
        open={pollVotesOpen}
        target={pollVotesTarget}
        onClose={() => setPollVotesOpen(false)}
      />

      <AvatarUploadDialog
        open={avatarDialogOpen}
        file={avatarFile}
        preview={avatarPreview}
        currentUrl={profile.avatar}
        saving={avatarSaving}
        onPick={(f, url) => { setAvatarFile(f); setAvatarPreview(url); }}
        onClose={() => { setAvatarDialogOpen(false); setAvatarFile(null); setAvatarPreview(""); }}
        onSaved={(newUrl) => {
          if (newUrl) {
            // update only the avatar field; keep the rest of profile intact
            setProfile((p) => ({ ...p, avatar: newUrl }));
          }
          setAvatarDialogOpen(false);
          setAvatarFile(null);
          setAvatarPreview("");
        }}
        setSaving={setAvatarSaving}
      />
      {editOpen && editPostId && (
        <PostEditDialog
          open={editOpen}
          post={posts.find((p) => p.id === editPostId)}
          communityId={myCommunityId}
          onClose={() => setEditOpen(false)}
          reloadPosts={fetchMyPosts} 
          onSaved={(updated) => {
            if (!updated) { setEditOpen(false); return; }
            setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
            setEditOpen(false);
          }}
        />
      )}
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

function PollVotesDialog({ open, target, onClose }) {
  const [loading, setLoading] = React.useState(false);
  const [voters, setVoters] = React.useState([]);

  const postId = target?.postId;
  const optionId = target?.optionId;
  const optionLabel = target?.optionLabel || "";

  function normalizeUser(u) {
    if (!u) return { id: null, name: "User", avatar: "" };

    const id =
      u.id ??
      u.user_id ??
      u.owner_id ??
      null;

    const first =
      u.first_name ??
      u.firstName ??
      u.user_first_name ??
      u.user__first_name ??
      "";

    const last =
      u.last_name ??
      u.lastName ??
      u.user_last_name ??
      u.user__last_name ??
      "";

    const name =
      u.name ||
      `${first} ${last}`.trim() ||
      u.username ||
      (id ? `User #${id}` : "User");

    const profile =
      u.profile ||
      u.userprofile ||
      u.user_profile ||
      {};

    const avatarRaw =
      profile.user_image_url ||
      profile.user_image ||
      u.user_image ||
      u.user_image_url ||
      u.avatar ||
      u.profile_image ||
      u.photo ||
      u.image_url ||
      u.avatar_url ||
      "";

    return {
      id,
      name,
      avatar: toAbsolute(avatarRaw),
      headline:
        u.headline ||
        u.job_title ||
        u.title ||
        u.bio ||
        u.about ||
        "",
    };
  }

  function normalizeVoteRow(row) {
    // try to find the user on the row
    const nested =
      row?.user ||
      row?.voter ||
      row?.owner ||
      row?.actor ||
      null;

    if (nested && typeof nested === "object") return normalizeUser(nested);

    // flattened fall-back
    return normalizeUser({
      id: row?.user_id ?? row?.voter_id,
      first_name: row?.user_first_name,
      last_name: row?.user_last_name,
      username: row?.user_username,
      user_image: row?.user_image ?? row?.user_image_url,
    });
  }

  async function fetchVoters(feedItemId, optionId) {
    // feedItemId is not needed anymore, we look up by optionId directly
    const url = `${API_ROOT}/activity/feed/polls/options/${optionId}/votes/`;

    try {
      const r = await fetch(url, {
        headers: { ...authHeader(), accept: "application/json" },
      });
      if (!r.ok) {
        console.error("Failed to load poll voters:", r.status, await r.text());
        return [];
      }
      const data = await r.json();

      const rows = Array.isArray(data?.results)
        ? data.results
        : Array.isArray(data)
        ? data
        : [];

      return rows.map(normalizeVoteRow); // same normalizeVoteRow you already have
    } catch (err) {
      console.error("Error loading poll voters:", err);
      return [];
    }
  }


  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!open || !postId || !optionId) return;
      setLoading(true);
      const list = await fetchVoters(postId, optionId);
      if (!cancelled) setVoters(list);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, postId, optionId]);

  return (
    <Dialog open={!!open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>
        {`Votes By`}
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Typography variant="body2" color="text.secondary">
            Loading…
          </Typography>
        ) : voters.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No votes yet.
          </Typography>
        ) : (
          <List dense>
            {voters.map((u) => (
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

// Function For Likes Dialog
function LikesDialog({ open, postId, onClose }) {
  const [loading, setLoading] = React.useState(false);
  const [likers, setLikers] = React.useState([]);

  function normalizeUser(u) {
    if (!u) return { id: null, name: "User", avatar: "" };
    const id =
      u.id ??
      u.user_id ??
      u.owner_id ??
      null;

    const first =
      u.first_name ?? u.firstName ?? u.user_first_name ?? u.user__first_name ?? "";
    const last =
      u.last_name ?? u.lastName ?? u.user_last_name ?? u.user__last_name ?? "";

    const name =
      u.name ||
      `${first} ${last}`.trim() ||
      u.username ||
      (id ? `User #${id}` : "User");

    // ⬇️ Prefer user_image first, then fallbacks
    const avatarRaw =
      u.user_image ||
      u.user_image_url ||
      u.avatar ||
      u.profile_image ||
      u.photo ||
      u.image_url ||
      u.avatar_url ||
      "";

    const avatar = toAbsolute(avatarRaw);
    const headline = u.headline || u.job_title || u.title || u.bio || u.about || "";
    return { id, name, avatar, headline };
  }


  // Handle different API shapes: some endpoints return {results:[{user:{...}}]}, others return raw users
  function normalizeLikerRow(row) {
    // Prefer nested user object if present
    const nested =
      row?.user ||
      row?.owner ||
      row?.liked_by ||
      row?.actor ||
      null;
    if (nested && typeof nested === "object") return normalizeUser(nested);
    // Fallback: reaction rows with flattened user fields / IDs
    const u = {
      id: row?.user_id ?? row?.owner_id ?? row?.liked_by_id ?? null,
      first_name: row?.user_first_name ?? row?.user__first_name,
      last_name: row?.user_last_name ?? row?.user__last_name,
      username: row?.user_username ?? row?.user__username,
      // ⬇️ Prefer user_image first
      avatar: row?.user_image ?? row?.user_image_url ?? row?.user_avatar ?? row?.user__avatar,
      headline: row?.user_headline,
    };
    return normalizeUser(u);
  }

  async function fetchLikers(postId) {
    // Try common DRF patterns you’re likely already using
    const candidates = [
      // Primary: reactions list filtered to "like" for a FeedItem
      `${API_ROOT}/engagements/reactions/?target_type=activity_feed.feeditem&target_id=${postId}&reaction=like&page_size=200`,

      // Optional fallback (if you also exposed a helper)
      `${API_ROOT}/engagements/reactions/who-liked/?feed_item=${postId}`,
    ];

    for (const url of candidates) {
      try {
        const r = await fetch(url, {
          headers: { ...authHeader(), accept: "application/json" },
        });
        if (!r.ok) continue;
        const data = await r.json();
        const rows =
          Array.isArray(data?.results) ? data.results :
            Array.isArray(data) ? data :
              Array.isArray(data?.items) ? data.items :
                Array.isArray(data?.likers) ? data.likers :
                  Array.isArray(data?.data) ? data.data :
                    [];
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

function SharesDialog({ open, postId, onClose }) {
  const [loading, setLoading] = React.useState(false);
  const [sharers, setSharers] = React.useState([]);

  function normalizeUser(u) {
    if (!u) return { id: null, name: "User", avatar: "" };

    const id =
      u.id ??
      u.user_id ??
      u.owner_id ??
      null;

    const first =
      u.first_name ??
      u.firstName ??
      u.user_first_name ??
      u.user__first_name ??
      "";

    const last =
      u.last_name ??
      u.lastName ??
      u.user_last_name ??
      u.user__last_name ??
      "";

    const name =
      u.name ||
      `${first} ${last}`.trim() ||
      u.username ||
      (id ? `User #${id}` : "User");

    // 👇 also look into nested profile for user_image / user_image_url
    const profile =
      u.profile ||
      u.userprofile ||
      u.user_profile ||
      {};

    const avatarRaw =
      profile.user_image_url ||
      profile.user_image ||
      u.user_image ||
      u.user_image_url ||
      u.avatar ||
      u.profile_image ||
      u.photo ||
      u.image_url ||
      u.avatar_url ||
      "";

    const avatar = toAbsolute(avatarRaw);

    const headline =
      u.headline ||
      u.job_title ||
      u.title ||
      u.bio ||
      u.about ||
      "";

    return { id, name, avatar, headline };
  }

  function normalizeShareRow(row) {
    // Prefer nested user when available
    const nested =
      row?.user ||
      row?.owner ||
      row?.actor ||
      row?.shared_by ||
      row?.created_by ||
      row?.sharer ||
      row?.sharer_user ||
      null;

    if (nested && typeof nested === "object") {
      return normalizeUser(nested);
    }

    // Look for profile attached directly on the row as well
    const profile =
      row?.profile ||
      row?.user_profile ||
      row?.actor_profile ||
      row?.user?.profile ||
      row?.actor?.profile ||
      null;

    // Fallback flattened forms – use actor_* fields first (shares often return these)
    const u = {
      id: row?.user_id ?? row?.owner_id ?? row?.actor_id ?? null,
      first_name: row?.user_first_name ?? row?.user__first_name,
      last_name: row?.user_last_name ?? row?.user__last_name,
      username: row?.user_username ?? row?.user__username,

      // name from actor_* if available
      name: row?.actor_name ?? row?.user_full_name ?? row?.full_name,

      // avatar from actor_avatar first, then other user_* avatar fields,
      // then profile.user_image(_url)
      user_image:
        row?.actor_avatar ??
        row?.user_image ??
        row?.user_image_url ??
        row?.user_avatar ??
        row?.user__avatar ??
        profile?.user_image_url ??
        profile?.user_image ??
        "",

      headline: row?.user_headline,
      profile: profile || undefined,
    };

    return normalizeUser(u);
  }

  async function fetchSharers(feedId) {
    const urls = [
      // Generic shares listing filtered to this FeedItem
      `${API_ROOT}/engagements/shares/?target_type=activity_feed.feeditem&target_id=${feedId}&page_size=200`,
      // Optional alternate param some APIs expose
      `${API_ROOT}/engagements/shares/?feed_item=${feedId}&page_size=200`,
    ];
    for (const url of urls) {
      try {
        const r = await fetch(url, { headers: { ...authHeader(), accept: "application/json" } });
        if (!r.ok) continue;
        const data = await r.json();
        const rows =
          Array.isArray(data?.results) ? data.results :
            Array.isArray(data) ? data :
              Array.isArray(data?.items) ? data.items :
                Array.isArray(data?.shares) ? data.shares :
                  Array.isArray(data?.data) ? data.data : [];
        return rows.map(normalizeShareRow);
      } catch { }
    }
    return [];
  }

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      if (!open || !postId) return;
      setLoading(true);
      const list = await fetchSharers(postId);

      // ⬇️ De-dupe by stable key: id if present, else name
      const seen = new Set();
      const unique = [];
      for (const u of list) {
        const key = (u.id != null) ? `id:${u.id}` : `name:${(u.name || "").toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        unique.push(u);
      }

      if (mounted) setSharers(unique);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [open, postId]);

  return (
    <Dialog open={!!open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{`Shared by${sharers.length ? ` (${sharers.length})` : ""}`}</DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Typography variant="body2" color="text.secondary">Loading…</Typography>
        ) : sharers.length === 0 ? (
          <Typography variant="body2" color="text.secondary">No shares yet.</Typography>
        ) : (
          <List dense>
            {sharers.map((u) => (
              <ListItem key={`${u.id || u.name}-share`} disableGutters>
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

function getPollOptionLabel(opt, idx) {
  if (typeof opt === "string") return opt;
  if (!opt || typeof opt !== "object") return `Option ${idx + 1}`;
  return opt.text || opt.label || opt.value || `Option ${idx + 1}`;
}

// Function For Edit Post Dialog & Delete Confirm Dialog
function PostEditDialog({ open, post, communityId, onClose, onSaved ,reloadPosts}) {
  const [saving, setSaving] = React.useState(false);

  // core states (same idea as AdminPostsPage)
  const [type, setType] = React.useState(post?.type || "text");
  const [content, setContent] = React.useState(post?.content || "");
  const [link, setLink] = React.useState(post?.link || "");

  // poll options – editable like AdminPostsPage
  const [pollOptions, setPollOptions] = React.useState(["", ""]);

  // image edit support (preview + replace)
  const [imageFile, setImageFile] = React.useState(null);
  const [imagePreview, setImagePreview] = React.useState("");

  // initialize from post
  React.useEffect(() => {
    if (!post) return;

    const t = post.type || "text";
    setType(t);

    // base content
    const baseContent =
      post.content ||
      post.caption ||
      post.text ||
      post.description ||
      post.question ||
      "";

    setContent(baseContent);
    setLink(post.link || post.url || "");

    // poll options (mirror AdminPostsPage behaviour)
    if (t === "poll") {
      const rawOpts = (post.options || post.poll_options || []).map(
        (opt, idx) => getPollOptionLabel(opt, idx)
      );
      if (rawOpts.length >= 2) {
        setPollOptions(rawOpts);
      } else {
        setPollOptions(["", ""]);
      }
    } else {
      setPollOptions(["", ""]);
    }

    // image preview (mirror AdminPostsPage existing-image behaviour)
    setImageFile(null);
    if (t === "image") {
      const existingImage =
        (Array.isArray(post.images) && post.images[0]) ||
        post.image_url ||
        post.image ||
        post.image_preview ||
        "";
      setImagePreview(existingImage || "");
    } else {
      setImagePreview("");
    }
  }, [post?.id]);

  if (!post) return null;

  // image picker (like AdminPostsPage)
  const onPickImage = React.useCallback((file) => {
    if (!file) {
      setImageFile(null);
      return;
    }
    setImageFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      const result =
        typeof e.target?.result === "string" ? e.target.result : "";
      setImagePreview(result || "");
    };
    reader.readAsDataURL(file);
  }, []);

  // validation logic similar to AdminPostsPage Edit dialog
  const canSave = React.useMemo(() => {
    if (type === "text") {
      return !!(content || "").trim();
    }
    if (type === "link") {
      return !!(link || "").trim();
    }
    if (type === "poll") {
      const trimmedQuestion = (content || "").trim();
      const trimmedOptions = pollOptions
        .map((o) => o.trim())
        .filter(Boolean);
      return trimmedQuestion.length > 0 && trimmedOptions.length >= 2;
    }
    // image or other custom types – allow save
    return true;
  }, [type, content, link, pollOptions]);

  // ---- API helper: mirrors your Admin + Home logic ----
  async function updatePostApi() {
  const tokenHeaders = authHeader();
  if (!post) throw new Error("No post");

  const id = post.id;
  const urlBase = API_ROOT;

  // ---- Local UI fallback (so dialog doesn't crash if API fails) ----
  const localUi = () => {
    if (type === "text") {
      return { type: "text", content };
    }
    if (type === "link") {
      return { type: "link", content, link };
    }
    if (type === "image") {
      const images = imagePreview
        ? [imagePreview]
        : Array.isArray(post.images)
        ? post.images
        : post.image
        ? [post.image]
        : [];
      return { type: "image", content, images };
    }
    if (type === "poll") {
      const trimmedOptions = pollOptions
        .map((opt) => opt.trim())
        .filter(Boolean);
      return {
        type: "poll",
        content,
        options: trimmedOptions,
      };
    }
    return { type: type || post.type, content };
  };

  // ---- JSON payload for community posts (text / link / image generic) ----
  const jsonPayload = () => {
    if (type === "text") {
      return { type: "text", content };
    }
    if (type === "link") {
      return {
        type: "link",
        url: link || "",
        description: content || "",
      };
    }
    if (type === "image") {
      // community posts edit: treat caption as content-ish field
      return {
        type: "image",
        caption: content || "",
      };
    }
    if (type === "poll") {
      const trimmedOptions = pollOptions
        .map((opt) => opt.trim())
        .filter(Boolean);
      return {
        type: "poll",
        question: content || "",
        options: trimmedOptions,
      };
    }
    return { type: type || post.type, content };
  };

  // ---- FormData payload (needed for image file uploads) ----
  const formPayload = () => {
    const fd = new FormData();
    if (type === "text") {
      fd.append("type", "text");
      fd.append("content", content || "");
    } else if (type === "link") {
      fd.append("type", "link");
      fd.append("url", link || "");
      fd.append("description", content || "");
    } else if (type === "image") {
      fd.append("type", "image");
      if (content) fd.append("caption", content);
      if (imageFile) fd.append("image", imageFile);
    } else if (type === "poll") {
      fd.append("type", "poll");
      fd.append("question", content || "");
      pollOptions.forEach((opt, idx) => {
        const trimmed = opt.trim();
        if (trimmed) {
          fd.append(`options[${idx}]`, trimmed);
        }
      });
    } else {
      fd.append("type", type || post.type);
      fd.append("content", content || "");
    }
    return fd;
  };

  // ---- Special payload just for activity_feed poll update ----
  const pollJsonPayload = () => {
    const trimmedOptions = pollOptions
      .map((opt) => opt.trim())
      .filter(Boolean);
    return {
      question: content || "",
      options: trimmedOptions,
    };
  };

  // ---- Endpoint candidates (ordered by priority) ----
  const candidates = [];

  // 1) If this is a POLL → hit activity_feed poll update first
  if (type === "poll") {
    candidates.push({
      // /api/activity/feed/<feed_item_id>/poll/
      url: `${urlBase}/activity/feed/${id}/poll/`,
      method: "PATCH",
      json: true,
      bodyBuilder: pollJsonPayload,
    });
  }

  // 2) If this is an IMAGE → prefer multipart PATCH so caption + file update correctly
  if (type === "image") {
    candidates.push(
      {
        url: `${urlBase}/communities/${communityId}/posts/${id}/edit/`,
        method: "PATCH",
        json: false,
        bodyBuilder: formPayload,
      },
      {
        url: `${urlBase}/communities/${communityId}/posts/${id}/`,
        method: "PATCH",
        json: false,
        bodyBuilder: formPayload,
      }
    );
  }

  // 3) Generic community JSON endpoints (good for text/link + fallback for image/poll)
  candidates.push(
    {
      url: `${urlBase}/communities/${communityId}/posts/${id}/edit/`,
      method: "PATCH",
      json: true,
      bodyBuilder: jsonPayload,
    },
    {
      url: `${urlBase}/communities/${communityId}/posts/${id}/`,
      method: "PATCH",
      json: true,
      bodyBuilder: jsonPayload,
    },
    {
      url: `${urlBase}/communities/${communityId}/posts/${id}/edit/`,
      method: "PUT",
      json: true,
      bodyBuilder: jsonPayload,
    },
    {
      url: `${urlBase}/communities/${communityId}/posts/${id}/`,
      method: "PUT",
      json: true,
      bodyBuilder: jsonPayload,
    }
  );

  // 4) Final fallback: multipart PATCH (for any type that wants it)
  candidates.push({
    url: `${urlBase}/communities/${communityId}/posts/${id}/edit/`,
    method: "PATCH",
    json: false,
    bodyBuilder: formPayload,
  });

  let lastError = null;

  for (const c of candidates) {
    try {
      const body = c.bodyBuilder();
      const headers = c.json
        ? { ...tokenHeaders, "Content-Type": "application/json" }
        : tokenHeaders;

      const resp = await fetch(c.url, {
        method: c.method,
        headers,
        body: c.json ? JSON.stringify(body) : body,
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`HTTP ${resp.status}: ${text}`);
      }

      const data = await resp.json().catch(() => null);

      // If activity_feed poll update responded directly with {question, options,...}
      if (type === "poll" && data && data.question && Array.isArray(data.options)) {
        return {
          ...post,
          type: "poll",
          content: data.question,
          options: data.options,
        };
      }

      // Normal case: use same mapper as create
      if (data) {
        return mapCreateResponseToUiPost(data);
      }

      // Safety fallback if server returned 204 with no JSON
      return { ...post, ...localUi() };
    } catch (err) {
      console.warn(
        "[HomePage] edit-post candidate failed",
        c.method,
        c.url,
        err
      );
      lastError = err;
    }
  }

  // If everything fails, at least update UI locally so dialog closes gracefully
  if (lastError) {
    console.error("[HomePage] all edit-post endpoints failed", lastError);
    return { ...post, ...localUi() };
  }

  return { ...post, ...localUi() };
}


  const onSave = async () => {
  if (!canSave || !post) return;
  setSaving(true);
  try {
    const updated = await updatePostApi();

    // 1) Merge API result into existing post, keep same feed-item id
    const mergedBase = updated
      ? {
          ...post,      // keep actor_name, metrics, etc.
          ...updated,   // apply new content/link/caption/options
          id: post.id,  // force id to stay same as current feed item
        }
      : post;

    // 2) Special handling for IMAGE posts:
    //    if API didn't send images, keep the old ones so UI doesn't go blank.
    const merged =
      (mergedBase.type || post.type) === "image"
        ? {
            ...mergedBase,
            images:
              (updated &&
                Array.isArray(updated.images) &&
                updated.images.length > 0)
                ? updated.images
                : (Array.isArray(post.images) && post.images.length > 0
                    ? post.images
                    : mergedBase.images || []),
          }
        : mergedBase;

    // update local list immediately
    onSaved?.(merged);

    // 🔁 also refresh from server so feed stays in sync
    if (typeof reloadPosts === "function") {
      reloadPosts();
    }

    onClose?.();
  } catch (err) {
    console.error("Failed to update post", err);
    alert("Could not update the post. Please try again.");
  } finally {
    setSaving(false);
  }
};

  const handleOptionChange = (index, value) => {
    setPollOptions((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const addPollOption = () => {
    setPollOptions((prev) => [...prev, ""]);
  };

  const removePollOption = (index) => {
    setPollOptions((prev) => {
      if (prev.length <= 2) return prev; // keep at least 2 options
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Edit Post</DialogTitle>
      <DialogContent dividers>
        <Typography
          variant="caption"
          sx={{ display: "block", mb: 1, color: "text.secondary" }}
        >
          Type: {type}
        </Typography>

        {/* TEXT */}
        {type === "text" && (
          <TextField
            fullWidth
            multiline
            minRows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            label="Text"
            placeholder="Update your text…"
            sx={{ mt: 1 }}
          />
        )}

        {/* IMAGE (mirror AdminPostsPage: preview + replace + caption) */}
        {type === "image" && (
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <Box
              sx={{
                width: "100%",
                borderRadius: 2,
                border: "1px dashed rgba(145, 158, 171, 0.5)",
                overflow: "hidden",
                bgcolor: "background.default",
              }}
            >
              {imagePreview ? (
                <Box
                  component="img"
                  src={imagePreview}
                  alt="Post"
                  sx={{
                    display: "block",
                    width: "100%",
                    maxHeight: 260,
                    objectFit: "cover",
                  }}
                />
              ) : (
                <Box
                  sx={{
                    p: 3,
                    textAlign: "center",
                    color: "text.secondary",
                    fontSize: 13,
                  }}
                >
                  No image preview available
                </Box>
              )}
            </Box>

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.5}
              alignItems="flex-start"
            >
              <Button
                component="label"
                variant="outlined"
                size="small"
                startIcon={<ImageRoundedIcon fontSize="small" />}
                sx={{ whiteSpace: "nowrap" }}
              >
                Replace image
                <input
                  hidden
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    onPickImage(e.target.files?.[0] || null)
                  }
                />
              </Button>

              <TextField
                fullWidth
                multiline
                minRows={2}
                label="Caption"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </Stack>
          </Stack>
        )}

        {/* LINK (styled like AdminPostsPage) */}
        {type === "link" && (
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Link URL"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://example.com"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LinkRoundedIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              fullWidth
              label="Description"
              multiline
              minRows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Say something about this link…"
            />
          </Stack>
        )}

        {/* POLL (same feel as AdminPostsPage) */}
        {type === "poll" && (
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Question"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What do you want people to vote on?"
            />

            <Stack spacing={1}>
              {pollOptions.map((option, index) => (
                <Stack
                  key={index}
                  direction="row"
                  spacing={1}
                  alignItems="center"
                >
                  <TextField
                    fullWidth
                    label={`Option ${index + 1}`}
                    value={option}
                    onChange={(e) =>
                      handleOptionChange(index, e.target.value)
                    }
                  />
                  <IconButton
                    size="small"
                    color="error"
                    disabled={pollOptions.length <= 2}
                    onClick={() => removePollOption(index)}
                  >
                    <RemoveRoundedIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}

              <Button
                variant="outlined"
                size="small"
                startIcon={<AddRoundedIcon fontSize="small" />}
                onClick={addPollOption}
                sx={{ alignSelf: "flex-start", mt: 0.5 }}
              >
                Add option
              </Button>
            </Stack>
          </Stack>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={onSave}
          disabled={saving || !canSave}
        >
          {saving ? "Saving…" : "Save"}
        </Button>
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



// Edit Profile pic 
function AvatarUploadDialog({ open, file, preview, currentUrl, saving, onPick, onClose, onSaved, setSaving }) {
  const inputRef = React.useRef(null);

  const handleChoose = () => inputRef.current?.click();

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => onPick(f, ev.target.result);
    reader.readAsDataURL(f);
  };

  async function uploadAvatarApi(theFile) {
    // Try a few likely endpoints; stop on the first success.
    // All are multipart with field "avatar".
    const candidates = [
      { url: `${API_ROOT}/users/me/avatar/`, method: "POST", field: "avatar" },
      { url: `${API_ROOT}/auth/me/avatar/`, method: "POST", field: "avatar" },
      { url: `${API_ROOT}/profile/avatar/`, method: "POST", field: "avatar" },
      { url: `${API_ROOT}/users/me/`, method: "PATCH", field: "avatar" }, // generic fallback
    ];

    for (const c of candidates) {
      try {
        const fd = new FormData();
        fd.append(c.field, theFile, theFile.name);
        const r = await fetch(c.url, { method: c.method, headers: { ...authHeader() }, body: fd });
        if (!r.ok) continue;

        // Most APIs return the fresh profile or avatar url
        let j = {};
        try { j = await r.json(); } catch { /* 204 or empty body */ }
        const newUrl =
          j?.avatar ||
          j?.profile?.avatar ||
          j?.data?.avatar ||
          j?.user_image_url ||         // ← add this
          null;

        // If server returned 204/no body, do a quick re-fetch of /users/me/
        if (!newUrl) {
          try {
            const me = await fetch(`${API_ROOT}/users/me/`, { headers: { ...authHeader(), accept: "application/json" } });
            if (me.ok) {
              const d = await me.json();
              return (
                d?.profile?.avatar ||
                d?.avatar ||
                d?.profile?.user_image_url ||   // ← add
                d?.profile?.user_image ||       // ← add (in case it’s a relative path)
                null
              );
            }
          } catch { /* ignore */ }
        }
        return newUrl;
      } catch {
        /* try next */
      }
    }
    return null;
  }

  const handleSave = async () => {
    if (!file) return;
    setSaving(true);
    const newUrl = await uploadAvatarApi(file);
    setSaving(false);
    if (!newUrl) {
      alert("Could not update photo. Please check your avatar endpoint.");
      return;
    }
    // cache-bust just in case
    const finalUrl = `${newUrl}${newUrl.includes("?") ? "&" : "?"}_=${Date.now()}`;
    onSaved(finalUrl);
  };

  return (
    <Dialog open={!!open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Update profile photo</DialogTitle>
      <DialogContent dividers>
        <input ref={inputRef} type="file" accept="image/*" hidden onChange={handleFileChange} />
        <Stack spacing={2} alignItems="center">
          <Avatar src={preview || currentUrl || ""} sx={{ width: 120, height: 120 }} />
          <Button variant="outlined" startIcon={<CloudUploadRoundedIcon />} onClick={handleChoose}>
            Choose image
          </Button>
          <Typography variant="caption" color="text.secondary">
            JPG/PNG, recommended square image
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={!file || saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}


function CommentsDialog({
  open,
  postId,
  onClose,
  // NEW: inline mode props
  inline = false,
  initialCount = 3,
  inputRef = null,
}) {
  const [loading, setLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [comments, setComments] = React.useState([]);
  const [text, setText] = React.useState("");
  const [meId, setMeId] = React.useState(null);
  const [replyingTo, setReplyingTo] = React.useState(null);
  // Who am I replying to? (search roots + replies)
  const replyTarget = React.useMemo(() => {
    if (!replyingTo) return null;
    for (const root of comments) {
      if (root.id === replyingTo) return root;
      const child = (root.replies || []).find((r) => r.id === replyingTo);
      if (child) return child;
    }
    return null;
  }, [replyingTo, comments]);

  const replyToName = replyTarget?.author?.name || "";

  const [replyText, setReplyText] = React.useState("");
  const [visibleCount, setVisibleCount] = React.useState(initialCount);
  const composerRef = React.useRef(null);

  async function getMeId() {
    try {
      const r = await fetch(`${API_ROOT}/users/me/`, { headers: { ...authHeader(), accept: "application/json" } });
      if (!r.ok) return null;
      const d = await r.json();
      return d?.id ?? d?.user?.id ?? null;
    } catch { return null; }
  }

  // Same user normalization as LikesDialog so profile images work
  function normalizeUser(u) {
    if (!u) return { id: null, name: "User", avatar: "" };

    const id =
      u.id ??
      u.user_id ??
      u.owner_id ??
      null;

    const first =
      u.first_name ??
      u.firstName ??
      u.user_first_name ??
      u.user__first_name ??
      "";

    const last =
      u.last_name ??
      u.lastName ??
      u.user_last_name ??
      u.user__last_name ??
      "";

    const name =
      u.name ||
      `${first} ${last}`.trim() ||
      u.username ||
      (id ? `User #${id}` : "User");

    // Prefer user_image / user_image_url, then fallbacks
    const avatarRaw =
      u.user_image ||
      u.user_image_url ||
      u.avatar ||
      u.profile_image ||
      u.photo ||
      u.image_url ||
      u.avatar_url ||
      "";

    const avatar = toAbsolute(avatarRaw);

    const headline =
      u.headline ||
      u.job_title ||
      u.title ||
      u.bio ||
      u.about ||
      "";

    return { id, name, avatar, headline };
  }


  // inside CommentsDialog
  function normalizeComment(c, currentUserId = meId) {
    const author = normalizeUser(c.author || c.user || c.created_by);
    const id = c.id;
    const created = c.created_at || c.created || c.timestamp || null;
    const body = c.text || c.body || c.content || "";
    const likedByMe = !!(c.liked || c.liked_by_me);
    const likeCount = Number(c.like_count ?? c.likes ?? 0) || 0;
    const canDelete = !!(c.can_delete || c.is_owner || (author.id && currentUserId && author.id === currentUserId));

    const replies = Array.isArray(c.replies)
      ? c.replies.map((r) => {
        if (r.body || r.text || r.content || r.author || r.user) {
          return normalizeComment(r, currentUserId);
        }
        return {
          id: r.id,
          created: r.created_at || r.timestamp || r.created || null,
          body: r.content || r.text || "",
          author: normalizeUser(r.user || r.author),
          likedByMe: !!(r.liked || r.liked_by_me),
          likeCount: Number(r.like_count ?? r.likes ?? 0) || 0,
          canDelete: !!((r.user?.id || r.author?.id) && currentUserId && (r.user?.id || r.author?.id) === currentUserId),
          replies: [],
        };
      })
      : [];

    return { id, created, body, author, likedByMe, likeCount, canDelete, replies };
  }


  async function fetchComments(postId, currentUserId) {
    const rootUrl = `${API_ROOT}/engagements/comments/?target_type=activity_feed.feeditem&target_id=${postId}&page_size=200`;
    try {
      const r = await fetch(rootUrl, { headers: { ...authHeader(), accept: "application/json" } });
      if (!r.ok) return [];
      const j = await r.json();
      const rootRows = Array.isArray(j?.results) ? j.results : (Array.isArray(j) ? j : (j?.comments || []));
      const roots = rootRows.map((c) => ({ ...normalizeComment(c, currentUserId), replies: [] }));

      await Promise.all(
        roots.map(async (root) => {
          try {
            const rr = await fetch(`${API_ROOT}/engagements/comments/?parent=${root.id}&page_size=200`,
              { headers: { ...authHeader(), accept: "application/json" } });
            if (!rr.ok) return;
            const jj = await rr.json();
            const rows = Array.isArray(jj?.results) ? jj.results : (Array.isArray(jj) ? jj : []);
            root.replies = rows.map((x) => normalizeComment(x, currentUserId));
          } catch { }
        })
      );

      // 3) Hydrate like counts + my-like for both roots and replies
      const ids = [
        ...roots.map((c) => c.id),
        ...roots.flatMap((c) => (c.replies || []).map((r) => r.id)),
      ];
      if (ids.length) {
        try {
          const rc = await fetch(
            `${API_ROOT}/engagements/reactions/counts/?target_type=comment&ids=${ids.join(",")}`,
            { headers: { ...authHeader(), accept: "application/json" } }
          );
          if (rc.ok) {
            const payload = await rc.json();
            const map = payload?.results || {};
            const apply = (obj) => {
              const m = map[String(obj.id)];
              if (m) {
                obj.likeCount = Number(m.like_count || 0);
                obj.likedByMe = !!m.user_has_liked;
              }
            };
            roots.forEach((c) => { apply(c); (c.replies || []).forEach(apply); });
          }
        } catch { }
      }

      return roots;
    } catch {
      return [];
    }
  }

  async function createComment(postId, body, parentId = null) {
    if (!body.trim()) return null;
    const payload = parentId ? { text: body, parent: parentId } : { text: body };

    // engagements: create root comment or reply
    try {
      const r = await fetch(`${API_ROOT}/engagements/comments/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify(
          parentId
            ? { text: body, parent: parentId } // reply: backend inherits target from parent
            : { text: body, target_type: "activity_feed.feeditem", target_id: postId } // root comment
        ),
      });
      if (r.ok) return normalizeComment(await r.json());
    } catch { /* handled below */ }
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
    try {
      const res = await fetch(`${API_ROOT}/engagements/reactions/toggle/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ target_type: "comment", target_id: commentId, reaction: "like" }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }


  async function deleteComment(commentId) {
    const candidates = [
      // engagements: delete comment
      { url: `${API_ROOT}/engagements/comments/${commentId}/`, method: "DELETE" },
    ];
    for (const c of candidates) {
      try {
        const r = await fetch(c.url, { method: c.method, headers: { ...authHeader(), accept: "application/json" } });
        if (r.ok || r.status === 204) return true;
      } catch { }
    }
    return false;
  }

  // Load on mount / when switching between posts
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      if ((!inline && !open) || !postId) return;
      setLoading(true);
      const uid = await getMeId();
      if (mounted) setMeId(uid);
      const list = await fetchComments(postId, uid);   // ← pass uid
      if (mounted) {
        const sorted = list.sort((a, b) => (new Date(b.created || 0)) - (new Date(a.created || 0)));
        setComments(sorted);
        setVisibleCount(initialCount);
        window.__setPostMetrics?.(postId, { comments: sorted.length });
      }
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [open, inline, postId, initialCount]);


  const onSubmitNew = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      // If replyingTo is set, post as a reply; else post as a root comment
      const parentId = replyingTo || null;
      const c = await createComment(postId, text.trim(), parentId);
      if (parentId) {
        // Reload so the reply renders under its parent (same approach as Admin)
        const list = await fetchComments(postId, meId || (await getMeId()));

        const sorted = list.sort((a, b) => (new Date(b.created || 0)) - (new Date(a.created || 0)));
        setComments(sorted);
        setReplyingTo(null);
        window.__setPostMetrics?.(postId, { comments: sorted.length });
      } else {
        setComments((prev) => [c, ...prev]);
      }
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
      await createComment(postId, replyText.trim(), replyingTo);
      setReplyingTo(null);
      setReplyText("");

      // Reload comments so replies show correctly (same as AdminPostsPage does)
      const list = await fetchComments(postId, meId || (await getMeId()));


      const sorted = list.sort((a, b) => (new Date(b.created || 0)) - (new Date(a.created || 0)));
      setComments(sorted);
      window.__setPostMetrics?.(postId, { comments: sorted.length });
    } catch (e) {
      alert(e.message || "Failed to reply");
    } finally {
      setSubmitting(false);
    }
  };


  const onLike = async (id) => {
    // optimistic update for root or reply
    setComments((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const liked = !c.likedByMe;
          return { ...c, likedByMe: liked, likeCount: Math.max(0, (c.likeCount || 0) + (liked ? 1 : -1)) };
        }
        const replies = (c.replies || []).map((r) => {
          if (r.id !== id) return r;
          const liked = !r.likedByMe;
          return { ...r, likedByMe: liked, likeCount: Math.max(0, (r.likeCount || 0) + (liked ? 1 : -1)) };
        });
        return { ...c, replies };
      })
    );

    const ok = await toggleLike(id);
    if (!ok) {
      // hard resync on failure
      const list = await fetchComments(postId, meId || (await getMeId()));

      const sorted = list.sort((a, b) => (new Date(b.created || 0)) - (new Date(a.created || 0)));
      setComments(sorted);
    } else {
      // precise resync of this one id from counts API
      try {
        const rc = await fetch(
          `${API_ROOT}/engagements/reactions/counts/?target_type=comment&ids=${id}`,
          { headers: { ...authHeader(), accept: "application/json" } }
        );
        if (rc.ok) {
          const payload = await rc.json();
          const m = payload?.results?.[String(id)];
          if (m) {
            setComments((prev) =>
              prev.map((c) => {
                if (c.id === id) {
                  return { ...c, likedByMe: !!m.user_has_liked, likeCount: Number(m.like_count || 0) };
                }
                const replies = (c.replies || []).map((r) =>
                  r.id === id ? { ...r, likedByMe: !!m.user_has_liked, likeCount: Number(m.like_count || 0) } : r
                );
                return { ...c, replies };
              })
            );
          }
        }
      } catch { }
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
    <Box sx={{ pl: depth ? 4 : 0, py: 0.75 }}>
      <Stack direction="row" spacing={0.75}>
        <Avatar
          src={c.author.avatar}
          sx={{ width: depth ? 28 : 32, height: depth ? 28 : 32 }}
        >
          {(c.author.name[0] || "").toUpperCase()}
        </Avatar>
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
            <Button
              size="small"
              startIcon={<ReplyRoundedIcon />}
              onClick={() => {
                setReplyingTo(c.id);
                setText("");
                setTimeout(() => composerRef.current?.focus?.(), 0);
              }}
            >
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

        </Box>
      </Stack>
    </Box>
  );

  // -------- Inline mode (LinkedIn/Instagram style) --------
  if (inline) {
    const roots = comments; // normalized as root-level with nested replies
    const visibleRoots = roots.slice(0, visibleCount);
    const hasMore = roots.length > visibleRoots.length;

    return (
      <Box>
        {/* Always-show input */}
        <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
          <TextField
            size="small"
            fullWidth
            placeholder="Write a comment…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            inputRef={inputRef || composerRef}

            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSubmitNew();
              }
            }}
          />

          <Button variant="contained" onClick={onSubmitNew} disabled={submitting || !text.trim()}>
            Post
          </Button>
        </Stack>

        {loading ? (
          <Typography variant="body2" color="text.secondary">Loading comments…</Typography>
        ) : visibleRoots.length === 0 ? (
          <Typography variant="caption" color="text.secondary">Be the first to comment.</Typography>
        ) : (
          <Box>
            {visibleRoots.map((c) => <Item key={c.id} c={c} />)}
          </Box>
        )}

        {hasMore && (
          <Box sx={{ mt: 1 }}>
            <Button size="small" onClick={() => setVisibleCount((v) => v + initialCount)}>
              Load more comments
            </Button>
          </Box>
        )}
      </Box>
    );
  }

  // -------- Original modal path kept for compatibility --------
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
      <DialogActions sx={{ px: 3, pb: 2, flexWrap: "wrap" }}>
        {/* Replying banner (modal) */}
        {replyingTo && (
          <Box sx={{ width: "100%", mb: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="caption" color="text.secondary">
                Replying to <b>{replyToName}</b>
              </Typography>
              <Button
                size="small"
                onClick={() => {
                  setReplyingTo(null);
                  setText("");
                }}
              >
                CANCEL
              </Button>
            </Stack>
          </Box>
        )}

        <TextField
          fullWidth
          size="small"
          placeholder={replyingTo ? "Write a reply…" : "Write a comment…"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          inputRef={composerRef}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSubmitNew();
            }
          }}
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
      location: payload.location || "",
      start_date: payload.start || null,
      end_date: payload.current ? null : (payload.end || null),
      currently_work_here: !!payload.current,
      description: payload.description || "",
      employment_type: payload.employment_type || "full_time",
      work_schedule: payload.work_schedule || "",
      relationship_to_org: payload.relationship_to_org || "",
      career_stage: payload.career_stage || "",
      compensation_type: payload.compensation_type || "",
      work_arrangement: payload.work_arrangement || "",
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
      location: payload.location || "",
      start_date: payload.start || null,
      end_date: payload.current ? null : (payload.end || null),
      currently_work_here: !!payload.current,
      description: payload.description || "",
      employment_type: payload.employment_type || "full_time",
      work_schedule: payload.work_schedule || "",
      relationship_to_org: payload.relationship_to_org || "",
      career_stage: payload.career_stage || "",
      compensation_type: payload.compensation_type || "",
      work_arrangement: payload.work_arrangement || "",
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

  const [expForm, setExpForm] = React.useState({
    org: "", position: "", location: "", start: "", end: "", current: false,
    employment_type: "full_time",       // compulsory (default)
    work_schedule: "",                   // optional: "", "full_time", "part_time"
    relationship_to_org: "",            // optional: "", "employee", "independent", "third_party"
    career_stage: "",                   // optional: "", "internship","apprenticeship","trainee","entry","mid","senior"
    compensation_type: "",              // optional: "", "paid","stipend","volunteer"
    work_arrangement: "",               // optional: "", "onsite","hybrid","remote"
  });
  const [syncProfileLocation, setSyncProfileLocation] = React.useState(false);

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
    onUpdate?.((prev) => ({
      ...prev,
      experience: extra.experiences,
      education: extra.educations,
    }));
  }, [onUpdate]);

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
  const openAddExperience = () => {
    setEditExpId(null);
    setExpForm({
      org: "", position: "", location: "", start: "", end: "", current: false,
      employment_type: "full_time",
      work_schedule: "",
      relationship_to_org: "",
      career_stage: "",
      compensation_type: "",
      work_arrangement: "",
    });
    setSyncProfileLocation(false);
    setExpOpen(true);
  };
  const openEditExperience = (id) => {
    const x = (profile.experience || []).find((e) => e.id === id);
    if (!x) return;
    setEditExpId(id);
    setExpForm({
      org: x.org || x.community_name || "",
      position: x.position || "",
      location: x.location || "",
      start: x.start || x.start_date || "",
      end: x.end || x.end_date || "",
      current: !!(x.current || x.currently_work_here),
      employment_type: x.employment_type || "full_time",
      work_schedule: x.work_schedule || "",
      relationship_to_org: x.relationship_to_org || "",
      career_stage: x.career_stage || "",
      compensation_type: x.compensation_type || "",
      work_arrangement: x.work_arrangement || "",
    });
    setExpOpen(true);
  };

  const saveExperience = async () => {
    try {
      const { start, end, current } = expForm;

      // Convert to ISO yyyy-mm-dd for safe string comparison
      const todayStr = new Date().toISOString().slice(0, 10);

      // 1) Start date cannot be in the future
      if (start && start > todayStr) {
        alert("Start date cannot be after today.");
        return;
      }

      // 2) End date cannot be in the future (only when not 'currently work here')
      if (!current && end && end > todayStr) {
        alert("End date cannot be after today.");
        return;
      }

      // 3) End date cannot be before start date
      if (!current && start && end && end < start) {
        alert("End date cannot be before start date.");
        return;
      }
      if (editExpId) await updateExperienceApi(editExpId, expForm);
      else await createExperienceApi(expForm);
      // If user ticked "Make this location my profile’s work location"
      if (syncProfileLocation && expForm.location) {
        const payload = {
          first_name: profile.first_name || "",
          last_name: profile.last_name || "",
          email: profile.email || "",
          profile: {
            full_name: fullName,
            timezone: "",
            bio: profile.bio || "",
            headline: "",
            job_title: profile.job_title || "",
            company: "",
            location: expForm.location,
            skills: profile.skills || [],
            links: profile.links || {},
          },
        };

        try {
          await saveProfileToMe(payload);
          onUpdate?.({ ...profile, location: expForm.location });
        } catch (err) {
          console.error("Failed to sync profile location from experience", err);
        }
      }
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
          {/* 👇 Date row – 50% + 50% on sm+, full width stacked on mobile */}
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              gap: 2,
              mb: 2,
            }}
          >
            <TextField
              label="Start Date"
              type="date"
              value={eduForm.start}
              onChange={(e) =>
                setEduForm((f) => ({ ...f, start: e.target.value }))
              }
              fullWidth
              InputLabelProps={{ shrink: true }}
              sx={{ flex: 1 }}
            />

            <TextField
              label="End Date"
              type="date"
              value={eduForm.end}
              onChange={(e) =>
                setEduForm((f) => ({ ...f, end: e.target.value }))
              }
              fullWidth
              InputLabelProps={{ shrink: true }}
              sx={{ flex: 1 }}
            />
          </Box>
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
          <TextField
            label="Company name *"
            value={expForm.org}
            onChange={(e) => setExpForm((f) => ({ ...f, org: e.target.value }))}
            fullWidth
            sx={{ mb: 2 }}
          />

          <TextField
            label="Position *"
            value={expForm.position}
            onChange={(e) => setExpForm((f) => ({ ...f, position: e.target.value }))}
            fullWidth
            sx={{ mb: 2 }}
          />

          <TextField
            label="Location *"
            value={expForm.location}
            onChange={(e) =>
              setExpForm((f) => ({ ...f, location: e.target.value }))
            }
            fullWidth
            sx={{ mb: 2 }}
          />

          {/* Relationship to organization (required) */}
          <TextField
            select
            label="Employment type *"
            value={expForm.relationship_to_org}
            onChange={(e) =>
              setExpForm((f) => ({ ...f, relationship_to_org: e.target.value }))
            }
            fullWidth
            sx={{ mb: 2 }}
          >
            <MenuItem value="">—</MenuItem>
            <MenuItem value="employee">Employee (on payroll)</MenuItem>
            <MenuItem value="independent">
              Independent (self-employed / contractor / freelance)
            </MenuItem>
            <MenuItem value="third_party">
              Third-party (Agency / Consultancy / Temp)
            </MenuItem>
          </TextField>

          {/* Work schedule (optional) */}
          <TextField
            select
            value={expForm.work_schedule}
            onChange={(e) =>
              setExpForm((f) => ({ ...f, work_schedule: e.target.value }))
            }
            fullWidth
            SelectProps={{
              displayEmpty: true,
              renderValue: (v) =>
                v
                  ? ({ full_time: "Full-time", part_time: "Part-time" }[v] || v)
                  : (
                    <span style={{ color: "rgba(0,0,0,0.6)" }}>
                      Work schedule
                    </span>
                  ),
            }}
            sx={{ mb: 2 }}
          >
            <MenuItem value="full_time">Full-time</MenuItem>
            <MenuItem value="part_time">Part-time</MenuItem>
          </TextField>

          {/* Career stage + Compensation type (half-half) */}
          <Box sx={{ display: "flex", gap: 2, mb: 1 }}>
            {/* Career stage (optional) */}
            <TextField
              select
              value={expForm.career_stage}
              onChange={(e) =>
                setExpForm((f) => ({ ...f, career_stage: e.target.value }))
              }
              fullWidth
              sx={{ flex: 1 }}   // 👈 makes it use 50% of row
              SelectProps={{
                displayEmpty: true,
                renderValue: (v) =>
                  v
                    ? ({
                      internship: "Internship",
                      apprenticeship: "Apprenticeship",
                      trainee: "Trainee / Entry program",
                      entry: "Entry level",
                      mid: "Mid level",
                      senior: "Senior level",
                    }[v] || v)
                    : (
                      <span style={{ color: "rgba(0,0,0,0.6)" }}>
                        Career stage
                      </span>
                    ),
              }}
            >
              <MenuItem value="">—</MenuItem>
              <MenuItem value="internship">Internship</MenuItem>
              <MenuItem value="apprenticeship">Apprenticeship</MenuItem>
              <MenuItem value="trainee">Trainee / Entry program</MenuItem>
              <MenuItem value="entry">Entry level</MenuItem>
              <MenuItem value="mid">Mid level</MenuItem>
              <MenuItem value="senior">Senior level</MenuItem>
            </TextField>

            {/* Compensation type (optional) */}
            <TextField
              select
              value={expForm.compensation_type}
              onChange={(e) =>
                setExpForm((f) => ({ ...f, compensation_type: e.target.value }))
              }
              fullWidth
              sx={{ flex: 1 }}   // 👈 also 50% of row
              SelectProps={{
                displayEmpty: true,
                renderValue: (v) =>
                  v
                    ? ({
                      paid: "Paid",
                      stipend: "Stipend",
                      volunteer: "Volunteer / Unpaid",
                    }[v] || v)
                    : (
                      <span style={{ color: "rgba(0,0,0,0.6)" }}>
                        Compensation type
                      </span>
                    ),
              }}
            >
              <MenuItem value="">—</MenuItem>
              <MenuItem value="paid">Paid</MenuItem>
              <MenuItem value="stipend">Stipend</MenuItem>
              <MenuItem value="volunteer">Volunteer / Unpaid</MenuItem>
            </TextField>
          </Box>

          {/* Work arrangement (optional) */}
          <TextField
            select
            label="Work arrangement"
            value={expForm.work_arrangement}
            onChange={(e) => setExpForm((f) => ({ ...f, work_arrangement: e.target.value }))}
            fullWidth
            sx={{ mb: 2 }}
          >
            <MenuItem value="">—</MenuItem>
            <MenuItem value="onsite">On-site</MenuItem>
            <MenuItem value="hybrid">Hybrid</MenuItem>
            <MenuItem value="remote">Remote</MenuItem>
          </TextField>

          {/* Date row – 50% + 50% on sm+, full width stacked on mobile */}
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              gap: 2,
              mb: 1,
            }}
          >
            <TextField
              label="Start Date"
              type="date"
              value={expForm.start}
              onChange={(e) =>
                setExpForm((f) => ({ ...f, start: e.target.value }))
              }
              fullWidth
              InputLabelProps={{ shrink: true }}
              sx={{ flex: 1 }}
            />

            <TextField
              label="End Date"
              type="date"
              value={expForm.end}
              onChange={(e) =>
                setExpForm((f) => ({ ...f, end: e.target.value }))
              }
              fullWidth
              disabled={expForm.current}
              InputLabelProps={{ shrink: true }}
              sx={{ flex: 1 }}
            />
          </Box>

          <FormControlLabel
            control={
              <Checkbox
                checked={expForm.current}
                onChange={(e) => {
                  const current = e.target.checked;
                  setExpForm((prev) => ({
                    ...prev,
                    current,
                    end_date: current ? "" : prev.end_date,
                  }));
                }}
              />
            }
            label="I currently work here"
          />

          {expForm.current && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={syncProfileLocation}
                  onChange={(e) => setSyncProfileLocation(e.target.checked)}
                />
              }
              label="Make this location my profile’s work location"
            />
          )}
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
            <Box sx={{ display: "flex", gap: 2, width: "100%" }}>
              <TextField label="First name" value={contactForm.first_name} onChange={(e) => setContactForm({ ...contactForm, first_name: e.target.value })} fullWidth sx={{ flex: 1 }} />
              <TextField label="Last name" value={contactForm.last_name} onChange={(e) => setContactForm({ ...contactForm, last_name: e.target.value })} fullWidth sx={{ flex: 1 }} />
            </Box>
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

