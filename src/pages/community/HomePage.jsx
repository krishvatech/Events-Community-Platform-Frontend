// src/pages/account/HomePage.jsx
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
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

// -----------------------------------------------------------------------------
// Mock data definitions
// -----------------------------------------------------------------------------
// The following constants contain mock data for the user, posts, groups and
// profile. In a real application these would be fetched from your backend API.

const MOCK_USER = {
  avatar: "", // leave empty to fall back to initials
  first_name: "Aarav",
  last_name: "Shah",
  job_title: "Frontend Developer",
  bio: "Building Event & Community Platform. Coffee + React.",
  friends_count: 50,
};

const MOCK_POSTS = [
  {
    id: 1,
    type: "text",
    content: "Shipping v0 of my ECP Home page!",
    created_at: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
  },
  {
    id: 2,
    type: "link",
    content: "MUI Grid responsive cheat‑sheet.",
    link: "https://mui.com/material-ui/react-grid/",
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
  },
  {
    id: 3,
    type: "image",
    content: "A snapshot of our new design.",
    images: [
      // unsplash placeholder
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

const MOCK_GROUPS = [
  { id: 1, name: "React India", description: "All things React, hooks, patterns, performance.", member_count: 1280 },
  { id: 2, name: "Django Pros", description: "Django, DRF, auth, multi‑tenant setups.", member_count: 940 },
  { id: 3, name: "UI/UX Lab", description: "Design systems, Figma, HIG, Material.", member_count: 530 },
  { id: 4, name: "DevOps Circle", description: "Kubernetes, CI/CD, Terraform and more.", member_count: 410 },
  { id: 5, name: "Cloud Gurus", description: "AWS, GCP, Azure, multi cloud best practices.", member_count: 750 },
  { id: 6, name: "Data Geeks", description: "Analytics, ML, D3, big data.", member_count: 230 },
  { id: 7, name: "Open Source Club", description: "Contribute, collaborate, celebrate community.", member_count: 890 },
  { id: 8, name: "MERN Developers", description: "Mongo, Express, React & Node tips.", member_count: 460 },
];

const MOCK_PROFILE = {
  first_name: "Aarav",
  last_name: "Shah",
  job_title: "Frontend Developer",
  bio: "Building Event & Community Platform. Coffee + React.",
  skills: ["React", "Django", "PostgreSQL", "MUI", "WebSockets", "AWS"],
  links: {
    linkedin: "https://www.linkedin.com/in/aarav-shah",
  },
  experience: [
    { id: 101, org: "KrishvaTech", position: "Frontend Developer", start: "2024-01", end: null, current: true, location: "Ahmedabad" },
    { id: 102, org: "Open Source Club", position: "Contributor", start: "2023-06", end: "2024-01", current: false, location: "Remote" },
  ],
  education: [
    { id: 201, school: "Nirma University", degree: "B.Tech", field: "CSE", start: "2020-08", end: "2024-05", grade: "8.6 CGPA" },
  ],
};

// -----------------------------------------------------------------------------
// Helpers
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

// Parse skills from a CSV string or JSON array into an array of strings.
// Accepts comma-separated values or a JSON array. Trims values and filters out empty entries.
function parseSkills(value) {
  const v = (value ?? "").toString().trim();
  if (!v) return [];
  try {
    const j = JSON.parse(v);
    if (Array.isArray(j)) return j.map((s) => String(s).trim()).filter(Boolean);
  } catch {
    // fall through if JSON.parse fails
  }
  return v.split(/,|\n|;/).map((s) => s.trim()).filter(Boolean);
}

// -----------------------------------------------------------------------------
// Reusable components
// -----------------------------------------------------------------------------

function SkillsChips({ skills }) {
  if (!skills || !skills.length) return null;
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
      {skills.map((s, i) => (
        <Chip key={i} size="small" label={s} />
      ))}
    </Box>
  );
}

function SectionCard({ title, action, children, sx }) {
  return (
    <Card
      variant="outlined"
      sx={{ borderRadius: 3, width: "100%", ...sx }}
    >
      <CardHeader
        title={<Typography variant="h6" sx={{ fontWeight: 600 }}>{title}</Typography>}
        action={action}
        sx={{ pb: 0.5 }}
      />
      <CardContent sx={{ pt: 1.5 }}>{children}</CardContent>
    </Card>
  );
}

// PostComposer: used inside the create-post dialog to build new posts. Allows
// creating text, link, image and poll posts. When the user clicks Post the
// new post object is returned to the parent via the onCreate prop.
function PostComposer({ onCreate }) {
  const [tab, setTab] = React.useState("text");
  const [content, setContent] = React.useState("");
  const [linkUrl, setLinkUrl] = React.useState("");
  const [images, setImages] = React.useState([]);
  const [pollOptions, setPollOptions] = React.useState(["", ""]);
  const fileInputRef = React.useRef(null);

  const canSubmit = React.useMemo(() => {
    if (tab === "text") return content.trim().length > 0;
    if (tab === "link") return linkUrl.trim().length > 0;
    if (tab === "image") return images.length > 0;
    if (tab === "poll") return pollOptions.filter((o) => o.trim().length > 0).length >= 2;
    return false;
  }, [tab, content, linkUrl, images, pollOptions]);

  const handleImageFiles = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, 6);
    const toDataUrl = (file) => new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (ev) => resolve(ev.target.result);
      reader.readAsDataURL(file);
    });
    const urls = await Promise.all(files.map((f) => toDataUrl(f)));
    setImages(urls);
  };

  const addPollOption = () => setPollOptions((opts) => [...opts, ""]);
  const removePollOption = (i) => setPollOptions((opts) => opts.filter((_, idx) => idx !== i));
  const setPollText = (i, v) => setPollOptions((opts) => opts.map((o, idx) => (idx === i ? v : o)));

  const resetForm = () => {
    setContent("");
    setLinkUrl("");
    setImages([]);
    setPollOptions(["", ""]);
    setTab("text");
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    const newPost = { id: Date.now(), type: tab, created_at: new Date(), content: content.trim() };
    if (tab === "link") newPost.link = linkUrl.trim();
    if (tab === "image") newPost.images = images;
    if (tab === "poll") newPost.options = pollOptions.filter((o) => o.trim().length > 0);
    onCreate?.(newPost);
    resetForm();
  };

  return (
    <Stack spacing={2}>
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="scrollable"
        allowScrollButtonsMobile
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
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={handleImageFiles}
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
          {images.length > 0 && (
            <Grid container spacing={1}>
              {images.map((src, idx) => (
                <Grid key={idx} item xs={6} sm={4} md={3}>
                  <img
                    src={src}
                    alt={`upload-${idx}`}
                    style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 8 }}
                  />
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
        </Stack>
      )}
      <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
        <Button
          variant="contained"
          endIcon={<SendRoundedIcon />}
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          Post
        </Button>
      </Box>
    </Stack>
  );
}

// PostCard: displays a single post. Handles all post types (text, link, image,
// poll) and shows a relative timestamp. Simplistic actions are provided for
// like and comment but have no functionality attached yet.
function PostCard({ post }) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardHeader
        avatar={<Avatar src={MOCK_USER.avatar}>{(MOCK_USER.first_name[0] || "").toUpperCase()}</Avatar>}
        title={<Typography fontWeight={600}>{MOCK_USER.first_name + " " + MOCK_USER.last_name}</Typography>}
        subheader={timeAgo(post.created_at)}
      />
      <CardContent sx={{ pt: 0 }}>
        {post.content && <Typography sx={{ whiteSpace: "pre-wrap" }}>{post.content}</Typography>}
        {post.type === "link" && post.link && (
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
        <Button size="small">Like</Button>
        <Button size="small">Comment</Button>
      </CardActions>
    </Card>
  );
}

function MyPostsList({ posts }) {
  if (!posts || posts.length === 0) {
    return (
      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent>
          <Typography>No posts yet.</Typography>
        </CardContent>
      </Card>
    );
  }
  return (
    <Stack spacing={2}>
      {posts.map((p) => <PostCard key={p.id} post={p} />)}
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
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </CardContent>
      <List disablePadding>
        {pageItems.length === 0 && (
          <ListItem>
            <ListItemText primary="No groups match your search." />
          </ListItem>
        )}
        {pageItems.map((g, idx) => (
          <React.Fragment key={g.id}>
            <ListItem
              alignItems="flex-start"
              secondaryAction={<Chip label={`${g.member_count ?? 0} members`} size="small" />}
            >
              <ListItemAvatar>
                <Avatar>{(g.name || "").slice(0, 1)}</Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={<Typography fontWeight={600}>{g.name}</Typography>}
                secondary={g.description && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {g.description}
                  </Typography>
                )}
              />
            </ListItem>
            {idx < pageItems.length - 1 && <Divider component="li" />}
          </React.Fragment>
        ))}
      </List>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems="center"
        justifyContent="space-between"
        sx={{ p: 2, pt: 1 }}
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

function AboutTab({ profile, groups, onUpdate }) {
  // Editing state for basic info (name, title, bio)
  const [editOpen, setEditOpen] = React.useState(false);
  const [form, setForm] = React.useState({
    first_name: profile.first_name || "",
    last_name: profile.last_name || "",
    job_title: profile.job_title || "",
    bio: profile.bio || "",
  });
  React.useEffect(() => {
    setForm({
      first_name: profile.first_name || "",
      last_name: profile.last_name || "",
      job_title: profile.job_title || "",
      bio: profile.bio || "",
    });
  }, [profile]);
  const handleSave = () => {
    onUpdate?.({
      ...profile,
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      job_title: form.job_title.trim(),
      bio: form.bio.trim(),
    });
    setEditOpen(false);
  };

  // Local editing state for About (bio + skills)
  const [aboutOpen, setAboutOpen] = React.useState(false);
  const [aboutForm, setAboutForm] = React.useState({
    bio: profile.bio || "",
    skillsText: (profile.skills || []).join(", "),
  });

  // Local editing state for education
  const [eduOpen, setEduOpen] = React.useState(false);
  const [editEduId, setEditEduId] = React.useState(null);
  const [eduForm, setEduForm] = React.useState({
    school: "",
    degree: "",
    field: "",
    start: "",
    end: "",
    grade: "",
  });

  // Local editing state for experience
  const [expOpen, setExpOpen] = React.useState(false);
  const [editExpId, setEditExpId] = React.useState(null);
  const [expForm, setExpForm] = React.useState({
    org: "",
    position: "",
    start: "",
    end: "",
    current: false,
    location: "",
  });

  const fullName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim();

  // Helpers to open dialog prefilled with existing data
  const openEditAbout = () => {
    setAboutForm({
      bio: profile.bio || "",
      skillsText: (profile.skills || []).join(", "),
    });
    setAboutOpen(true);
  };
  const openAddEducation = () => {
    setEditEduId(null);
    setEduForm({
      school: "",
      degree: "",
      field: "",
      start: "",
      end: "",
      grade: "",
    });
    setEduOpen(true);
  };
  const openEditEducation = (id) => {
    const edu = profile.education?.find((e) => e.id === id);
    if (edu) {
      setEditEduId(id);
      setEduForm({
        school: edu.school || "",
        degree: edu.degree || "",
        field: edu.field || "",
        start: edu.start || "",
        end: edu.end || "",
        grade: edu.grade || "",
      });
      setEduOpen(true);
    }
  };
  const openAddExperience = () => {
    setEditExpId(null);
    setExpForm({
      org: "",
      position: "",
      start: "",
      end: "",
      current: false,
      location: "",
    });
    setExpOpen(true);
  };
  const openEditExperience = (id) => {
    const exp = profile.experience?.find((e) => e.id === id);
    if (exp) {
      setEditExpId(id);
      setExpForm({
        org: exp.org || "",
        position: exp.position || "",
        start: exp.start || "",
        end: exp.end || "",
        current: !!exp.current,
        location: exp.location || "",
      });
      setExpOpen(true);
    }
  };

  // Save handlers
  const saveAbout = () => {
    const updated = {
      ...profile,
      bio: (aboutForm.bio || "").trim(),
      skills: parseSkills(aboutForm.skillsText),
    };
    onUpdate?.(updated);
    setAboutOpen(false);
  };
  const saveEducation = () => {
    const eduEntry = {
      school: eduForm.school.trim(),
      degree: eduForm.degree.trim(),
      field: eduForm.field.trim(),
      start: eduForm.start,
      end: eduForm.end,
      grade: eduForm.grade.trim(),
    };
    let newEducation = Array.isArray(profile.education) ? [...profile.education] : [];
    if (editEduId) {
      const idx = newEducation.findIndex((e) => e.id === editEduId);
      if (idx >= 0) {
        newEducation[idx] = { ...newEducation[idx], ...eduEntry };
      }
    } else {
      newEducation.push({ id: Date.now(), ...eduEntry });
    }
    onUpdate?.({ ...profile, education: newEducation });
    setEduOpen(false);
    setEditEduId(null);
  };
  const saveExperience = () => {
    const expEntry = {
      org: expForm.org.trim(),
      position: expForm.position.trim(),
      start: expForm.start,
      end: expForm.end,
      current: !!expForm.current,
      location: expForm.location.trim(),
    };
    let newExperience = Array.isArray(profile.experience) ? [...profile.experience] : [];
    if (editExpId) {
      const idx = newExperience.findIndex((e) => e.id === editExpId);
      if (idx >= 0) {
        newExperience[idx] = { ...newExperience[idx], ...expEntry };
      }
    } else {
      newExperience.push({ id: Date.now(), ...expEntry });
    }
    onUpdate?.({ ...profile, experience: newExperience });
    setExpOpen(false);
    setEditExpId(null);
  };

  // Delete handlers
  const deleteEducation = (id) => {
    if (!window.confirm("Delete this education?")) return;
    const newEducation = (profile.education || []).filter((e) => e.id !== id);
    onUpdate?.({ ...profile, education: newEducation });
    setEduOpen(false);
    setEditEduId(null);
  };
  const deleteExperience = (id) => {
    if (!window.confirm("Delete this experience?")) return;
    const newExperience = (profile.experience || []).filter((e) => e.id !== id);
    onUpdate?.({ ...profile, experience: newExperience });
    setExpOpen(false);
    setEditExpId(null);
  };

  return (
    <Box>
      <Grid container spacing={{ xs: 2, md: 2.5 }}>
        <Grid item xs={12} md={6}>
          <SectionCard
            title="About"
            action={
              <Tooltip title="Edit about">
                <IconButton size="small" onClick={openEditAbout}>
                  <EditRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            }
          >
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>Summary:</Typography>
            {profile.bio ? (
              <Typography variant="body2">{profile.bio}</Typography>
            ) : (
              <Typography variant="body2" color="text.secondary">—</Typography>
            )}
            {profile.skills && profile.skills.length > 0 && (
              <>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>Skills:</Typography>
                <SkillsChips skills={profile.skills} />
              </>
            )}
          </SectionCard>
          <SectionCard
            sx={{ mt: 2 }}
            title="About your work"
            action={
              <Tooltip title="Edit profile">
                <IconButton size="small" onClick={() => setEditOpen(true)}>
                  <EditRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            }
          >
            <Box sx={{ display: "flex", alignItems: "center", py: 0.75 }}>
              <Typography variant="subtitle2" sx={{ width: 120, minWidth: 120, color: "text.secondary" }}>Job Title:</Typography>
              <Typography variant="body2" sx={{ flex: 1 }}>{profile.job_title || "—"}</Typography>
            </Box>
            <Divider sx={{ my: 0.5 }} />
            <Box sx={{ display: "flex", alignItems: "center", py: 0.75 }}>
              <Typography variant="subtitle2" sx={{ width: 120, minWidth: 120, color: "text.secondary" }}>Company:</Typography>
              <Typography variant="body2" sx={{ flex: 1 }}>KrishvaTech</Typography>
            </Box>
            <Divider sx={{ my: 0.5 }} />
            <Box sx={{ display: "flex", alignItems: "center", py: 0.75 }}>
              <Typography variant="subtitle2" sx={{ width: 120, minWidth: 120, color: "text.secondary" }}>Location:</Typography>
              <Typography variant="body2" sx={{ flex: 1 }}>Ahmedabad</Typography>
            </Box>
          </SectionCard>
          <SectionCard
            sx={{ mt: 2 }}
            title="Experience"
            action={
              <Tooltip title="Add experience">
                <IconButton size="small" onClick={openAddExperience}>
                  <AddRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            }
          >
            {profile.experience && profile.experience.length > 0 ? (
              <List dense disablePadding>
                {profile.experience.map((exp) => (
                  <ListItem
                    key={exp.id}
                    disableGutters
                    sx={{ py: 0.75 }}
                    secondaryAction={
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => openEditExperience(exp.id)}>
                          <EditRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    }
                  >
                    <ListItemText
                      primary={<Typography variant="body2" sx={{ fontWeight: 600 }}>{exp.position} — {exp.org}</Typography>}
                      secondary={<Typography variant="caption" color="text.secondary">{dateRange(exp.start, exp.end, exp.current)}{exp.location ? ` · ${exp.location}` : ""}</Typography>}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">No experience yet</Typography>
            )}
          </SectionCard>
          <SectionCard
            sx={{ mt: 2 }}
            title="Education"
            action={
              <Tooltip title="Add education">
                <IconButton size="small" onClick={openAddEducation}>
                  <AddRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            }
          >
            {profile.education && profile.education.length > 0 ? (
              <List dense disablePadding>
                {profile.education.map((edu) => (
                  <ListItem
                    key={edu.id}
                    disableGutters
                    sx={{ py: 0.75 }}
                    secondaryAction={
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => openEditEducation(edu.id)}>
                          <EditRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    }
                  >
                    <ListItemText
                      primary={<Typography variant="body2" sx={{ fontWeight: 600 }}>{edu.degree} — {edu.school}</Typography>}
                      secondary={<Typography variant="caption" color="text.secondary">{dateRange(edu.start, edu.end, false)}{edu.field ? ` · ${edu.field}` : ""}{edu.grade ? ` · ${edu.grade}` : ""}</Typography>}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">No education yet</Typography>
            )}
          </SectionCard>
        </Grid>
        <Grid item xs={12} md={6}>
          <SectionCard title="Contact">
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>LinkedIn</Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <LinkedInIcon fontSize="small" />
              <Typography variant="body2" sx={{ wordBreak: "break-word" }}>{profile.links?.linkedin || "—"}</Typography>
            </Box>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>Email</Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <EmailIcon fontSize="small" />
              <Typography variant="body2">{fullName.split(" ")[0].toLowerCase()}@example.com</Typography>
            </Box>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>Location</Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <PlaceIcon fontSize="small" />
              <Typography variant="body2">Ahmedabad</Typography>
            </Box>
          </SectionCard>
          <SectionCard sx={{ mt: 2 }} title="Groups">
            <List dense disablePadding>
              {(groups || []).slice(0, 2).map((g) => (
                <ListItem key={g.id} disableGutters sx={{ py: 0.75 }}>
                  <ListItemAvatar>
                    <Avatar>{(g.name || "").slice(0, 1)}</Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={<Typography variant="body2">{g.name}</Typography>}
                    secondary={<Typography variant="caption" color="text.secondary">{(g.member_count ?? 0)} members</Typography>}
                  />
                </ListItem>
              ))}
            </List>
          </SectionCard>
        </Grid>
      </Grid>

      {/* Edit basic profile info (name, job, bio) */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Edit Profile</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="First name"
              fullWidth
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
            />
            <TextField
              label="Last name"
              fullWidth
              value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })}
            />
            <TextField
              label="Job title"
              fullWidth
              value={form.job_title}
              onChange={(e) => setForm({ ...form, job_title: e.target.value })}
            />
            <TextField
              label="Bio"
              fullWidth
              multiline
              minRows={3}
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Edit About (summary & skills) */}
      <Dialog open={aboutOpen} onClose={() => setAboutOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Edit About</DialogTitle>
        <DialogContent>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
            Update your summary and skills
          </Typography>
          <TextField
            label="Summary"
            value={aboutForm.bio}
            onChange={(e) => setAboutForm((f) => ({ ...f, bio: e.target.value }))}
            fullWidth
            multiline
            minRows={4}
            sx={{ mb: 2 }}
            placeholder="Tell people a little about yourself…"
          />
          <TextField
            label="Skills (CSV or JSON array)"
            value={aboutForm.skillsText}
            onChange={(e) => setAboutForm((f) => ({ ...f, skillsText: e.target.value }))}
            fullWidth
            helperText="Saved as a list of strings"
            placeholder='e.g., M&A, Strategy  OR  ["M&A","Strategy"]'
          />
          <Box sx={{ mt: 1, display: "flex", gap: 1, flexWrap: "wrap" }}>
            {parseSkills(aboutForm.skillsText).length ? (
              parseSkills(aboutForm.skillsText).map((s, i) => <Chip key={i} label={s} size="small" />)
            ) : (
              <Typography variant="caption" color="text.secondary">
                No skills parsed yet
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAboutOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveAbout}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Education dialog */}
      <Dialog open={eduOpen} onClose={() => { setEduOpen(false); setEditEduId(null); }} fullWidth maxWidth="sm">
        <DialogTitle>{editEduId ? "Edit education" : "Add education"}</DialogTitle>
        <DialogContent>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
            *Required fields are marked with an asterisk
          </Typography>
          <TextField
            label="School *"
            value={eduForm.school}
            onChange={(e) => setEduForm((f) => ({ ...f, school: e.target.value }))}
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            label="Degree *"
            value={eduForm.degree}
            onChange={(e) => setEduForm((f) => ({ ...f, degree: e.target.value }))}
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            label="Field of Study *"
            value={eduForm.field}
            onChange={(e) => setEduForm((f) => ({ ...f, field: e.target.value }))}
            fullWidth
            sx={{ mb: 2 }}
          />
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Start Date"
                type="date"
                value={eduForm.start}
                onChange={(e) => setEduForm((f) => ({ ...f, start: e.target.value }))}
                fullWidth
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <CalendarTodayIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="End Date"
                type="date"
                value={eduForm.end}
                onChange={(e) => setEduForm((f) => ({ ...f, end: e.target.value }))}
                fullWidth
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <CalendarTodayIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>
          <TextField
            label="Grade *"
            value={eduForm.grade}
            onChange={(e) => setEduForm((f) => ({ ...f, grade: e.target.value }))}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          {editEduId && (
            <Button color="error" onClick={() => deleteEducation(editEduId)}>Delete</Button>
          )}
          <Button onClick={() => { setEduOpen(false); setEditEduId(null); }}>Cancel</Button>
          <Button variant="contained" onClick={saveEducation}>
            {editEduId ? "Save changes" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Experience dialog */}
      <Dialog open={expOpen} onClose={() => { setExpOpen(false); setEditExpId(null); }} fullWidth maxWidth="sm">
        <DialogTitle>{editExpId ? "Edit experience" : "Add experience"}</DialogTitle>
        <DialogContent>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
            *Required fields are marked with an asterisk
          </Typography>
          <TextField
            label="Organisation *"
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
          <Grid container spacing={2} sx={{ mb: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Start Date"
                type="date"
                value={expForm.start}
                onChange={(e) => setExpForm((f) => ({ ...f, start: e.target.value }))}
                fullWidth
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <CalendarTodayIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="End Date"
                type="date"
                value={expForm.end}
                onChange={(e) => setExpForm((f) => ({ ...f, end: e.target.value }))}
                fullWidth
                disabled={expForm.current}
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <CalendarTodayIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>
          <FormControlLabel
            control={
              <Checkbox
                checked={expForm.current}
                onChange={(e) => setExpForm((f) => ({ ...f, current: e.target.checked, end: e.target.checked ? "" : f.end }))}
              />
            }
            label="I currently work here"
          />
          <TextField
            label="Location"
            value={expForm.location}
            onChange={(e) => setExpForm((f) => ({ ...f, location: e.target.value }))}
            fullWidth
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          {editExpId && (
            <Button color="error" onClick={() => deleteExperience(editExpId)}>Delete</Button>
          )}
          <Button onClick={() => { setExpOpen(false); setEditExpId(null); }}>Cancel</Button>
          <Button variant="contained" onClick={saveExperience}>
            {editExpId ? "Save changes" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// -----------------------------------------------------------------------------
// Main page component
// -----------------------------------------------------------------------------
export default function HomePage() {
  const PAGE_MAX_W = 1120;
  const [posts, setPosts] = React.useState(MOCK_POSTS);
  const [groups, setGroups] = React.useState(MOCK_GROUPS);
  const [profile, setProfile] = React.useState(MOCK_PROFILE);
  const [tabIndex, setTabIndex] = React.useState(0);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const handleCreatePost = (newPost) => {
    setPosts((prev) => [newPost, ...prev]);
  };

  const handleUpdateProfile = (updated) => {
    setProfile(updated);
  };

  const fullName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "User";

  return (
    <Box sx={{ px: { xs: 1, sm: 2, md: 3 }, py: 2 }}>
      <Box sx={{ width: "100%", maxWidth: PAGE_MAX_W, mx: "auto" }}>
        {/* Header */}
        <Card variant="outlined" sx={{ borderRadius: 3, p: 2, mb: 2 }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems={{ xs: "flex-start", sm: "center" }}
          >
            <Avatar
              src={profile.avatar || MOCK_USER.avatar}
              sx={{ width: 72, height: 72, mr: { sm: 2 } }}
            >
              {(fullName[0] || "").toUpperCase()}
            </Avatar>
            <Box flex={1} sx={{ alignSelf: { xs: "flex-start", sm: "center" } }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>{fullName}</Typography>
              <Typography variant="body2" color="text.secondary">{profile.job_title}</Typography>
              {profile.bio && <Typography variant="body2" sx={{ mt: 1 }}>{profile.bio}</Typography>}
            </Box>
            <Divider orientation="vertical" flexItem sx={{ display: { xs: "none", sm: "block" }, mx: 2 }} />
            <Box textAlign={{ xs: "left", sm: "center" }}>
              <Typography variant="subtitle2">
                <Box component="span" sx={{ fontWeight: 600 }}>{posts.length}</Box> Posts&nbsp;|&nbsp;
                <Box component="span" sx={{ fontWeight: 600 }}>{MOCK_USER.friends_count}</Box> Friends
              </Typography>
            </Box>
          </Stack>
        </Card>
        {/* Tabs */}
        <Card variant="outlined" sx={{ borderRadius: 3, width: "100%" }}>
          <Tabs
            value={tabIndex}
            onChange={(_, v) => setTabIndex(v)}
            variant="scrollable"
            allowScrollButtonsMobile
          >
            <Tab label="My Posts" />
            <Tab label="My Groups" />
            <Tab label="About" />
          </Tabs>
          <Divider />
          <CardContent>
            {tabIndex === 0 && (
              <Stack spacing={2}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography variant="h6">My Posts</Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddRoundedIcon />}
                    onClick={() => setDialogOpen(true)}
                  >
                    Create Post
                  </Button>
                </Stack>
                <MyPostsList posts={posts} />
              </Stack>
            )}
            {tabIndex === 1 && <MyGroups groups={groups} />}
            {tabIndex === 2 && <AboutTab profile={profile} groups={groups} onUpdate={handleUpdateProfile} />}
          </CardContent>
        </Card>
      </Box>
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Create a post</DialogTitle>
        <DialogContent>
          <PostComposer onCreate={(p) => { handleCreatePost(p); setDialogOpen(false); }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}