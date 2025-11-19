// src/pages/Dashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { isOwnerUser } from "../utils/adminRole";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  LinearProgress,
  Paper,
  TextField,
  Typography,
  Stack,
  Snackbar,
  Alert,
  CircularProgress,
  Pagination,           // ✅ pagination
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  FormControlLabel, Switch,
  Tab,
  Tabs,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import dayjs from "dayjs";
import AdminGroups from "../pages/AdminGroups";
import AdminResources from "./AdminResources.jsx";
import EmojiEmotionsRoundedIcon from '@mui/icons-material/EmojiEmotionsRounded';
import InsertPhotoRoundedIcon from '@mui/icons-material/InsertPhotoRounded';
import { LocalizationProvider, TimePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import LiveTvRoundedIcon from "@mui/icons-material/LiveTvRounded";
import EditNoteRoundedIcon from "@mui/icons-material/EditNoteRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import AlternateEmailRoundedIcon from "@mui/icons-material/AlternateEmailRounded";
import AttachFileRoundedIcon from "@mui/icons-material/AttachFileRounded";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import { IconButton, InputAdornment } from "@mui/material";
import AdminPostsPage from "./AdminPostsPage.jsx";
import MyRecordingsPage from "./MyRecordingsPage.jsx"
import AdminNotificationsPage from "./AdminNotificationsPage.jsx";
import AdminSettings from "./AdminSettings.jsx"
import AdminSidebar from "../components/AdminSidebar";

const RAW = import.meta.env.VITE_API_BASE_URL || "";
const BASE = RAW.replace(/\/+$/, "");
const API_ROOT = BASE.endsWith("/api") ? BASE : `${BASE}/api`;


const API_BASE =
  (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api").replace(/\/$/, "");
const EVENTS_URL = `${API_BASE}/events/`;
const RAW_BASE = (import.meta.env.VITE_API_BASE_URL || "").trim();
// API_BASE may be like http://127.0.0.1:8000/api
// const API_BASE = RAW_BASE.replace(/\/+$/, "");
// Origin without the /api suffix
const API_ORIGIN = API_BASE.replace(/\/api$/, "");

// Small helpers reused from MyEventsPage
const urlJoin = (base, path) => {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
};

const asList = (data) => (Array.isArray(data) ? data : data?.results ?? []);

const toAbs = (u) => {
  if (!u) return u;
  // already absolute?
  if (/^https?:\/\//i.test(u)) return u;
  // ensure leading slash then join to origin
  const p = u.startsWith("/") ? u : `/${u}`;
  return `${API_ORIGIN}${p}`;
};

const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("access") ||
  localStorage.getItem("access_token") ||
  "";

// --- Helpers ---
const fmtDateRange = (s, e) => {
  try {
    const start = new Date(s);
    const end = new Date(e);
    const sameDay = start.toDateString() === end.toDateString();
    const left = start.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
    const right = end.toLocaleTimeString(undefined, { timeStyle: "short" });
    return sameDay ? `${left} – ${right}` : `${left} → ${end.toLocaleString()}`;
  } catch {
    return "";
  }
};
const computeStatus = (ev) => {
  const now = Date.now();
  const s = ev.start_time ? new Date(ev.start_time).getTime() : 0;
  const e = ev.end_time ? new Date(ev.end_time).getTime() : 0;

  // If meeting is manually ended, always treat as past
  if (ev.status === "ended") return "past";

  if (ev.is_live && ev.status !== "ended") return "live";
  if (s && e && now >= s && now <= e && ev.status !== "ended") return "live";
  if (s && now < s) return "upcoming";
  if (e && now > e) return "past";
  return "upcoming";
};
const statusChip = (status) => {
  switch (status) {
    case "live":
      return { label: "Live", className: "bg-rose-50 text-rose-700" };
    case "upcoming":
      return { label: "Upcoming", className: "bg-teal-50 text-teal-700" };
    case "past":
      return { label: "Past", className: "bg-slate-100 text-slate-700" };
    default:
      return { label: "—", className: "bg-slate-100 text-slate-700" };
  }
};
async function postJSON(url, body, token) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body || {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.detail || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json;
}

/* ===========================================
   CreateEventDialog (popup inside Dashboard)
   – mirrors CreateEventPage form & payload
   =========================================== */
const categories = ["Workshop", "Strategy", "Legal", "Leadership", "Networking", "Q&A", "Live"];
const formats = [
  { value: "virtual", label: "Virtual" },
  { value: "in_person", label: "In person" },
  { value: "hybrid", label: "Hybrid" },
];
const slugify = (s) =>
  (s || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
const toISO = (v) => (v ? new Date(v).toISOString() : null);

function CreateEventDialog({ open, onClose, onCreated, communityId = "1" }) {
  const token = getToken();

  // Event fields
  const [title, setTitle] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [category, setCategory] = React.useState("Workshop");
  const [format, setFormat] = React.useState("virtual");
  const [price, setPrice] = React.useState(0);

  const today = dayjs().format("YYYY-MM-DD");
  const [startDate, setStartDate] = React.useState(today);
  const [endDate, setEndDate] = React.useState(today);
  const [startTime, setStartTime] = React.useState("10:00");
  const [endTime, setEndTime] = React.useState("12:00");
  const [timezone, setTimezone] = React.useState("Asia/Kolkata"); // UI only

  // Image
  const [imageFile, setImageFile] = React.useState(null);
  const [localImagePreview, setLocalImagePreview] = React.useState("");

  // Resources
  const [resourceType, setResourceType] = React.useState("file"); // 'file' | 'link' | 'video'
  const [resFiles, setResFiles] = React.useState([]);
  const [resLinks, setResLinks] = React.useState([""]);
  const [resVideos, setResVideos] = React.useState([""]);

  // NEW: resource metadata
  const [resTitle, setResTitle] = React.useState("");
  const [resDesc, setResDesc] = React.useState("");
  const [tagInput, setTagInput] = React.useState("");
  const [resTags, setResTags] = React.useState([]);

  // Publish control
  const [resourcesPublishNow, setResourcesPublishNow] = React.useState(true);
  const [resPublishDate, setResPublishDate] = React.useState(today);
  const [resPublishTime, setResPublishTime] = React.useState("10:00");

  const [submitting, setSubmitting] = React.useState(false);
  const [toast, setToast] = React.useState({ open: false, type: "success", msg: "" });
  const [errors, setErrors] = React.useState({});

  const slugifyLocal = (s) =>
    (s || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const iso = (d, t) => (d && t ? dayjs(`${d}T${t}:00`).toISOString() : null);

  const validate = () => {
    const e = {};
    if (!title.trim()) e.title = "Required";
    if (!slug.trim()) e.slug = "Required";
    if (!location.trim()) e.location = "Required";
    if (!description.trim()) e.description = "Required";
    if (Number(price) < 0) e.price = "Price must be ≥ 0";

    const s = dayjs(`${startDate}T${startTime}:00`);
    const ed = dayjs(`${endDate}T${endTime}:00`);
    if (s.isValid() && ed.isValid() && !ed.isAfter(s)) {
      // ⛔ End before or same as start → show error on end date + end time
      e.endTime = "End must be after start";
      e.endDate = "End must be after start";
    }
    if (!resourcesPublishNow) {
      const pdt = dayjs(`${resPublishDate}T${resPublishTime}:00`);
      if (!pdt.isValid()) e.resource_publish_at = "Choose valid publish date & time";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSubmitting(true);

    const fd = new FormData();
    fd.append("community_id", String(communityId));
    fd.append("status", "published");
    fd.append("is_live", "false");

    fd.append("title", title.trim());
    fd.append("slug", slug.trim());
    fd.append("description", description.trim());
    fd.append("location", location.trim());
    fd.append("category", category);
    fd.append("format", format);
    fd.append("price", String(price ?? 0));
    fd.append("start_time", iso(startDate, startTime));
    fd.append("end_time", iso(endDate, endTime));
    fd.append("recording_url", "");

    if (imageFile) fd.append("preview_image", imageFile, imageFile.name);
    fd.append("publish_resources_immediately", resourcesPublishNow ? "true" : "false");
    if (!resourcesPublishNow) {
      const publishISO = iso(resPublishDate, resPublishTime);
      if (publishISO) fd.append("resource_publish_at", publishISO);
    }


    if (resourceType === "file") {
      resFiles.forEach((f) => fd.append("resource_files", f, f.name));
    } else if (resourceType === "link") {
      resLinks.map((s) => String(s || "").trim()).filter(Boolean).forEach((u) => fd.append("resource_links", u));
    } else if (resourceType === "video") {
      resVideos.map((s) => String(s || "").trim()).filter(Boolean).forEach((u) => fd.append("resource_videos", u));
    }


    if (resTitle.trim()) fd.append("resource_title", resTitle.trim());
    if (resDesc.trim()) fd.append("resource_description", resDesc.trim());
    resTags.filter(Boolean).forEach((t) => fd.append("resource_tags", t));

    try {
      const res = await fetch(`${API_ROOT}/events/`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: fd,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          json?.detail ||
          Object.entries(json).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`).join(" | ") ||
          `HTTP ${res.status}`;
        throw new Error(msg);
      }
      onCreated?.(json);
      setToast({ open: true, type: "success", msg: "Event created. Resources attached." });
      onClose?.();
    } catch (e) {
      setToast({ open: true, type: "error", msg: String(e?.message || e) });
    } finally {
      setSubmitting(false);
    }
  };

  const addTag = () => {
    const v = tagInput.trim();
    if (!v) return;
    if (!resTags.includes(v)) setResTags((p) => [...p, v]);
    setTagInput("");
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{ sx: { width: { xs: "100%", sm: 880 }, maxWidth: "100%", borderRadius: 3 } }}
    >
      <DialogTitle className="font-extrabold">Create an Event</DialogTitle>

      <DialogContent dividers>
        <Typography variant="body2" className="text-slate-500 mb-4">
          *Required fields are marked with an asterisk
        </Typography>

        {/* ===== Basic Info ===== */}
        <Paper elevation={0} className="rounded-2xl border border-slate-200 p-4 mb-3">
          <Typography variant="h6" className="font-semibold mb-3">Basic Info</Typography>

          <Box className="flex items-start gap-3 mb-3">
            <Avatar sx={{ bgcolor: "#10b8a6", width: 40, height: 40 }} />
            <TextField
              label="Name of the Event *"
              value={title}
              onChange={(e) => {
                const v = e.target.value;
                setTitle(v);
                if (!slug || slug === slugifyLocal(title)) setSlug(slugifyLocal(v));
              }}
              fullWidth
              error={!!errors.title}
              helperText={errors.title}
            />
          </Box>

          <Grid container spacing={2} alignItems="flex-start">
            {/* Left */}
            <Grid item xs={12} md={6}>
              <TextField
                label="Description *"
                multiline
                minRows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                fullWidth
                error={!!errors.description}
                helperText={errors.description}
                sx={{ mb: 2 }}
              />

              <TextField
                label="Location *"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                fullWidth
                error={!!errors.location}
                helperText={errors.location}
                sx={{ mb: 2 }}
              />

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField label="Category" select value={category} onChange={(e) => setCategory(e.target.value)} fullWidth>
                    {categories.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField label="Format" select value={format} onChange={(e) => setFormat(e.target.value)} fullWidth>
                    {formats.map((f) => <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>)}
                  </TextField>
                </Grid>
              </Grid>

              <TextField
                label="Price ($)"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                inputProps={{ min: 0, step: "0.01" }}
                fullWidth
                error={!!errors.price}
                helperText={errors.price}
                sx={{ mt: 2 }}
              />

              {/* hidden slug */}
              <Box sx={{ display: "none" }}>
                <TextField label="Slug *" value={slug} onChange={(e) => setSlug(slugifyLocal(e.target.value))} />
              </Box>
            </Grid>

            {/* Right: Image */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" className="font-semibold">Add Logo or Picture</Typography>
              <Typography variant="caption" className="text-slate-500 block mb-2">
                Recommended size is 650×365px – Max 50 MB
              </Typography>

              <Box
                className="rounded-xl border border-slate-300 bg-slate-100/70 flex items-center justify-center"
                sx={{ width: "100%", maxWidth: 340, aspectRatio: "16 / 9", mx: { xs: 0, md: "auto" }, mb: 1.5, overflow: "hidden" }}
              >
                {localImagePreview ? (
                  <img src={localImagePreview} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <Stack alignItems="center" spacing={1}>
                    <ImageRoundedIcon />
                    <Typography variant="body2" className="text-slate-600">Image Preview</Typography>
                  </Stack>
                )}
                <input
                  id="ev-image-file"
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setImageFile(f);
                    const r = new FileReader();
                    r.onload = (ev) => setLocalImagePreview(String(ev.target?.result || ""));
                    r.readAsDataURL(f);
                  }}
                />
              </Box>

              <label htmlFor="ev-image-file">
                <Button component="span" size="small" variant="outlined" startIcon={<InsertPhotoRoundedIcon />}>
                  Upload
                </Button>
              </label>
            </Grid>
          </Grid>
        </Paper>

        {/* ===== Schedule ===== */}
        <Paper elevation={0} className="rounded-2xl border border-slate-200 p-4 mb-3">
          <Typography variant="h6" className="font-semibold mb-3">Schedule</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <TextField label="Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} fullWidth
                InputLabelProps={{ shrink: true }}
                InputProps={{ endAdornment: <InputAdornment position="end"><CalendarMonthRoundedIcon className="text-slate-400" /></InputAdornment> }}
                // 🔻 show error if needed
                error={!!errors.startDate}
                helperText={errors.startDate}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField label="End Date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} fullWidth
                InputLabelProps={{ shrink: true }}
                InputProps={{ endAdornment: <InputAdornment position="end"><CalendarMonthRoundedIcon className="text-slate-400" /></InputAdornment> }}
                // 🔻 show error when end < start
                error={!!errors.endDate}
                helperText={errors.endDate}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <TimePicker label="Start time *" ampm minutesStep={1} value={dayjs(`1970-01-01T${startTime}`)}
                  onChange={(v) => setStartTime(v ? dayjs(v).format("HH:mm") : startTime)}
                  slotProps={{ textField: { fullWidth: true } }} />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} md={3}>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <TimePicker label="End time *" ampm minutesStep={1} value={dayjs(`1970-01-01T${endTime}`)}
                  onChange={(v) => setEndTime(v ? dayjs(v).format("HH:mm") : endTime)}
                  slotProps={{ textField: { fullWidth: true } }} />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="Timezone *" select value={timezone} onChange={(e) => setTimezone(e.target.value)} fullWidth
                SelectProps={{ IconComponent: ExpandMoreRoundedIcon }}>
                {["Asia/Kolkata", "UTC", "Europe/London", "America/New_York", "America/Los_Angeles"].map((tz) => (
                  <MenuItem key={tz} value={tz}>{tz.replace("/", " - ")}</MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
        </Paper>

        {/* ===== Attach Resources ===== */}
        <Paper elevation={0} className="rounded-2xl border border-slate-200 p-4">
          <Typography variant="h6" className="font-semibold mb-1">Attach Resources (optional)</Typography>
          <Typography variant="caption" className="text-slate-500">
            You can add files, links, or videos now. They’ll be saved to this event.
          </Typography>

          <Box className="mt-2">
            <FormControlLabel
              control={<Switch checked={resourcesPublishNow} onChange={(e) => setResourcesPublishNow(e.target.checked)} />}
              label="Publish resources immediately"
            />
          </Box>

          {/* Resource Type */}
          <Grid container spacing={2} sx={{ mb: 1, mt: 1 }} alignItems="center">
            <Grid item xs={12} sm={6}>
              <TextField
                label="Resource Type"
                select
                value={resourceType}
                onChange={(e) => setResourceType(e.target.value)}
                fullWidth
                sx={{
                  width: "100%",
                  minWidth: 300,
                  "& .MuiInputBase-root": { width: "100%" },
                  "& .MuiFormControl-root": { width: "100%" },
                }}
              >
                <MenuItem value="file">File (PDF/Document)</MenuItem>
                <MenuItem value="link">Link</MenuItem>
                <MenuItem value="video">Video URL</MenuItem>
              </TextField>
            </Grid>
          </Grid>

          {/* Optional schedule for resources */}
          {!resourcesPublishNow && (
            <Grid container spacing={2} sx={{ mb: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Publish Date"
                  type="date"
                  value={resPublishDate}
                  onChange={(e) => setResPublishDate(e.target.value)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  InputProps={{ endAdornment: <InputAdornment position="end"><CalendarMonthRoundedIcon className="text-slate-400" /></InputAdornment> }}
                  error={!!errors.resource_publish_at}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <TimePicker
                    label="Publish Time"
                    ampm
                    minutesStep={15}
                    value={dayjs(`1970-01-01T${resPublishTime}`)}
                    onChange={(val) => setResPublishTime(val ? dayjs(val).format("HH:mm") : resPublishTime)}
                    slotProps={{ textField: { fullWidth: true, error: !!errors.resource_publish_at } }}
                  />
                </LocalizationProvider>
              </Grid>
            </Grid>
          )}

          {/* NEW: Resource metadata (applies to any type) */}
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={12} md={6}>
              <TextField label="Title" value={resTitle} onChange={(e) => setResTitle(e.target.value)} fullWidth />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="Description" value={resDesc} onChange={(e) => setResDesc(e.target.value)} fullWidth multiline minRows={1} />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600 }}>Tags</Typography>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <TextField size="small" placeholder="Add a tag" value={tagInput} onChange={(e) => setTagInput(e.target.value)} sx={{ flex: 1, maxWidth: 420 }} />
                <Button variant="outlined" onClick={addTag}>Add</Button>
              </Stack>
              {resTags.length > 0 && (
                <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                  {resTags.map((t) => (
                    <Chip key={t} label={t} onDelete={() => setResTags((p) => p.filter((x) => x !== t))} />
                  ))}
                </Stack>
              )}
            </Grid>
          </Grid>

          {/* Conditionally render only the chosen resource block */}
          {resourceType === "file" && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>Files</Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Button component="label" variant="outlined" startIcon={<AttachFileRoundedIcon />}>
                  Choose files
                  <input hidden type="file" multiple onChange={(e) => e.target.files && setResFiles((p) => [...p, ...Array.from(e.target.files)])} />
                </Button>
                <Typography variant="caption" color="text.secondary">You can select multiple files.</Typography>
              </Stack>
              {resFiles.length > 0 && (
                <Stack spacing={0.75} sx={{ mt: 1 }}>
                  {resFiles.map((f, idx) => (
                    <Stack key={`${f.name}-${idx}`} direction="row" spacing={1} alignItems="center">
                      <Chip size="small" label={f.name} />
                      <Button size="small" color="error" onClick={() => setResFiles((p) => p.filter((_, i) => i !== idx))}>
                        Remove
                      </Button>
                    </Stack>
                  ))}
                </Stack>
              )}
            </Box>
          )}

          {resourceType === "link" && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>Links</Typography>
              <Stack spacing={1} sx={{ width: "100%" }}>
                {resLinks.map((val, idx) => (
                  <Stack key={`link-${idx}`} direction="row" spacing={1} sx={{ width: "100%" }}>
                    <TextField fullWidth placeholder="https://example.com/resource" value={val}
                      onChange={(e) => setResLinks((p) => p.map((x, i) => (i === idx ? e.target.value : x)))} size="small" />
                    <Button variant="outlined" color="error" onClick={() => setResLinks((p) => p.filter((_, i) => i !== idx))}>
                      Remove
                    </Button>
                  </Stack>
                ))}
                <Button size="small" onClick={() => setResLinks((p) => [...p, ""])} startIcon={<AddRoundedIcon />}>
                  Add link
                </Button>
              </Stack>
            </Box>
          )}

          {resourceType === "video" && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>Videos</Typography>
              <Stack spacing={1} sx={{ width: "100%" }}>
                {resVideos.map((val, idx) => (
                  <Stack key={`video-${idx}`} direction="row" spacing={1} sx={{ width: "100%" }}>
                    <TextField fullWidth placeholder="https://youtu.be/abcd…" value={val}
                      onChange={(e) => setResVideos((p) => p.map((x, i) => (i === idx ? e.target.value : x)))} size="small" />
                    <Button variant="outlined" color="error" onClick={() => setResVideos((p) => p.filter((_, i) => i !== idx))}>
                      Remove
                    </Button>
                  </Stack>
                ))}
                <Button size="small" onClick={() => setResVideos((p) => [...p, ""])} startIcon={<AddRoundedIcon />}>
                  Add video
                </Button>
              </Stack>
            </Box>
          )}
        </Paper>
      </DialogContent>

      <DialogActions className="px-6 py-4">
        <Button onClick={onClose} sx={{ textTransform: "none" }}>Cancel</Button>
        <Button
          onClick={submit}
          disabled={submitting}
          variant="contained"
          sx={{ textTransform: "none", backgroundColor: "#10b8a6", "&:hover": { backgroundColor: "#0ea5a4" } }}
        >
          Create
        </Button>
      </DialogActions>

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
    </Dialog>
  );
}





// Edit EditEventDialog
function EditEventDialog({ open, onClose, event, onUpdated }) {
  const token = getToken();

  // --- local state from existing event ---
  const [title, setTitle] = useState(event?.title || "");
  const [slug, setSlug] = useState(event?.slug || "");
  const [description, setDescription] = useState(event?.description || "");
  const [location, setLocation] = useState(event?.location || "");
  const [category, setCategory] = useState(event?.category || "Workshop");
  const [format, setFormat] = useState(event?.format || "virtual");
  const [price, setPrice] = useState(
    typeof event?.price === "number" ? event.price : Number(event?.price || 0)
  );

  const [startDate, setStartDate] = useState(
    event?.start_time ? new Date(event.start_time).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState(
    event?.end_time ? new Date(event.end_time).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
  );
  const [startTime, setStartTime] = useState(
    event?.start_time ? new Date(event.start_time).toISOString().slice(11, 16) : "10:00"
  );
  const [endTime, setEndTime] = useState(
    event?.end_time ? new Date(event.end_time).toISOString().slice(11, 16) : "12:00"
  );

  const [timezone, setTimezone] = useState("Asia/Kolkata"); // UI-only like Create dialog
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ open: false, type: "success", msg: "" });

  // image handling
  const [imageFile, setImageFile] = useState(null);
  const [localImagePreview, setLocalImagePreview] = useState("");
  const previewImage = event?.preview_image ? toAbs(event.preview_image) : "";

  useEffect(() => {
    if (!open) return;
    // hydrate on open in case `event` changed
    setTitle(event?.title || "");
    setSlug(event?.slug || "");
    setDescription(event?.description || "");
    setLocation(event?.location || "");
    setCategory(event?.category || "Workshop");
    setFormat(event?.format || "virtual");
    setPrice(typeof event?.price === "number" ? event.price : Number(event?.price || 0));

    setStartDate(event?.start_time ? new Date(event.start_time).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
    setEndDate(event?.end_time ? new Date(event.end_time).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
    setStartTime(event?.start_time ? new Date(event.start_time).toISOString().slice(11, 16) : "10:00");
    setEndTime(event?.end_time ? new Date(event.end_time).toISOString().slice(11, 16) : "12:00");

    setImageFile(null);
    setLocalImagePreview("");
    setErrors({});
  }, [open, event?.id]);

  const slugifyLocal = (s) =>
    (s || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const combineToISO = (d, t) => (d && t ? new Date(`${d}T${t}:00`).toISOString() : null);

  const validate = () => {
    const e = {};
    if (!title.trim()) e.title = "Required";
    if (!slug.trim()) e.slug = "Required";
    if (!location.trim()) e.location = "Required";
    if (!description.trim()) e.description = "Description is required";
    if (Number(price) < 0) e.price = "Price must be ≥ 0";

    if (startDate && endDate) {
      const s = new Date(`${startDate}T${startTime}:00`);
      const ed = new Date(`${endDate}T${endTime}:00`);
      if (ed <= s) {
        // ⛔ End before or same as start → show error on end date + end time
        e.endTime = "End must be after start";
        e.endDate = "End must be after start";
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onPickFile = (file) => {
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setLocalImagePreview(String(e.target?.result || ""));
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    if (!event?.id) return;
    if (!validate()) return;
    setSubmitting(true);

    const fd = new FormData();
    fd.append("title", title.trim());
    fd.append("slug", slug.trim());
    fd.append("description", description.trim());
    fd.append("location", location.trim());
    fd.append("category", category);
    fd.append("format", format);
    fd.append("price", String(price ?? 0));
    fd.append("start_time", combineToISO(startDate, startTime));
    fd.append("end_time", combineToISO(endDate, endTime));

    if (imageFile) fd.append("preview_image", imageFile, imageFile.name);

    try {
      const res = await fetch(`${API_ROOT}/events/${event.id}/`, {
        method: "PATCH",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          // let browser set multipart boundary
        },
        body: fd,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          json?.detail ||
          Object.entries(json)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
            .join(" | ") ||
          `HTTP ${res.status}`;
        throw new Error(msg);
      }
      onUpdated?.(json);
      setToast({ open: true, type: "success", msg: "Event updated" });
      onClose?.();
    } catch (e) {
      setToast({ open: true, type: "error", msg: String(e?.message || e) });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" PaperProps={{ className: "rounded-2xl" }}>
        <DialogTitle className="font-extrabold">Edit Event</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" className="text-slate-500 mb-4">
            Update the fields and click Save.
          </Typography>

          <Box className="flex items-start gap-3 mb-4">
            <Avatar sx={{ bgcolor: "#10b8a6", width: 40, height: 40 }} />
            <TextField
              label="Name of the Event *"
              value={title}
              onChange={(e) => {
                const v = e.target.value;
                setTitle(v);
                if (!slug || slug === slugifyLocal(title)) setSlug(slugifyLocal(v));
              }}
              fullWidth
              error={!!errors.title}
              helperText={errors.title}
              className="mb-3"
            />
          </Box>

          <Grid container spacing={3} columns={{ xs: 12, md: 12 }}>
            {/* Left */}
            <Grid size={{ xs: 12, md: 7 }}>
              <TextField
                label="Description *"
                multiline minRows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                fullWidth className="mb-3"
                error={!!errors.description} helperText={errors.description}
              />

              <TextField
                label="Location *"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                fullWidth className="mb-3"
                error={!!errors.location} helperText={errors.location}
              />

              <TextField
                label="Category" select fullWidth className="mb-3"
                value={category} onChange={(e) => setCategory(e.target.value)}
              >
                {categories.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </TextField>

              <TextField
                label="Format" select fullWidth className="mb-3"
                value={format} onChange={(e) => setFormat(e.target.value)}
              >
                {formats.map((f) => <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>)}
              </TextField>

              <TextField
                label="Price (₹)" type="number" fullWidth className="mb-3"
                value={price} onChange={(e) => setPrice(e.target.value)}
                inputProps={{ min: 0, step: "0.01" }}
                error={!!errors.price} helperText={errors.price}
              />

              {/* keep slug hidden but present */}
              <Box sx={{ display: "none" }}>
                <TextField label="Slug *" value={slug} onChange={(e) => setSlug(slugifyLocal(e.target.value))} />
              </Box>
            </Grid>

            {/* Right: Image */}
            <Grid size={{ xs: 12, md: 5 }}>
              <Typography variant="subtitle1" className="font-semibold">Update Logo / Picture</Typography>
              <Typography variant="caption" className="text-slate-500 block mb-2">
                Recommended 650×365px • Max 50 MB
              </Typography>

              <Box className="rounded-xl border border-slate-300 bg-slate-100/70 flex items-center justify-center"
                sx={{ height: 200, position: "relative", overflow: "hidden" }}>
                {localImagePreview ? (
                  <img src={localImagePreview} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : previewImage ? (
                  <img src={previewImage} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <Stack alignItems="center" spacing={1}>
                    <ImageRoundedIcon />
                    <Typography variant="body2" className="text-slate-600">Image Preview</Typography>
                  </Stack>
                )}
                <input id="edit-ev-image-file" type="file" accept="image/*" style={{ display: "none" }}
                  onChange={(e) => onPickFile(e.target.files?.[0])} />
              </Box>

              <Stack direction="row" spacing={1} className="mt-2">
                <label htmlFor="edit-ev-image-file">
                  <Button component="span" size="small" variant="outlined" startIcon={<InsertPhotoRoundedIcon />}>
                    Upload
                  </Button>
                </label>
              </Stack>
            </Grid>

            {/* Dates */}
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Start Date" type="date" fullWidth
                value={startDate} onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                InputProps={{ endAdornment: <InputAdornment position="end"><CalendarMonthRoundedIcon className="text-slate-400" /></InputAdornment> }}
                error={!!errors.startDate} helperText={errors.startDate}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="End Date" type="date" fullWidth
                value={endDate} onChange={(e) => setEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                InputProps={{ endAdornment: <InputAdornment position="end"><CalendarMonthRoundedIcon className="text-slate-400" /></InputAdornment> }}
                error={!!errors.endDate} helperText={errors.endDate}
              />
            </Grid>

            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TimePicker
                  label="Start time *" ampm minutesStep={1}
                  value={dayjs(`1970-01-01T${startTime}`)}
                  onChange={(val) => setStartTime(val ? dayjs(val).format("HH:mm") : startTime)}
                  slotProps={{ textField: { fullWidth: true, error: !!errors.startTime, helperText: errors.startTime } }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TimePicker
                  label="End time *" ampm minutesStep={1}
                  value={dayjs(`1970-01-01T${endTime}`)}
                  onChange={(val) => setEndTime(val ? dayjs(val).format("HH:mm") : endTime)}
                  slotProps={{ textField: { fullWidth: true, error: !!errors.endTime, helperText: errors.endTime } }}
                />
              </Grid>
            </LocalizationProvider>

            <Grid size={{ xs: 12 }}>
              <TextField
                label="Timezone *" select fullWidth
                value={timezone} onChange={(e) => setTimezone(e.target.value)}
                SelectProps={{ IconComponent: ExpandMoreRoundedIcon }}
              >
                {["America/Miami", "UTC", "Asia/Kolkata", "Europe/London", "America/Los_Angeles"].map((tz) => (
                  <MenuItem key={tz} value={tz}>{tz.replace("/", " - ")}</MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions className="px-6 py-4">
          <Button onClick={onClose} className="rounded-xl" sx={{ textTransform: "none" }}>Cancel</Button>
          <Button
            onClick={submit}
            disabled={submitting}
            variant="contained"
            className="rounded-xl"
            sx={{ textTransform: "none", backgroundColor: "#10b8a6", "&:hover": { backgroundColor: "#0ea5a4" } }}
          >
            Save
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



/* ===========================================
   Existing Admin cards list (unchanged)
   =========================================== */
function AdminEventCard({ ev, onHost, isHosting, onEdit, onJoinLive, isJoining, isOwner }) {
  const status = computeStatus(ev);
  const chip = statusChip(status);

  // audience can join if event is not ended AND either live OR Dyte meeting exists
  const canJoinLive =
    ev?.status !== "ended" &&
    (status === "live" || !!ev?.dyte_meeting_id);

  return (
    <Paper
      elevation={0}
      className="h-full flex flex-col rounded-2xl border border-slate-200 overflow-hidden"
    >
      <Box sx={{ position: "relative", width: "100%", paddingTop: "56.25%" }}>
        {ev.preview_image ? (
          <img
            src={toAbs(ev.preview_image)}
            alt={ev.title}
            loading="lazy"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "#E5E7EB",
            }}
          />
        )}
      </Box>

      <Box className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-center justify-between gap-2">
          <Chip
            size="small"
            label={chip.label}
            className={`${chip.className} font-medium`}
          />
          {ev.category && (
            <span className="text-xs text-slate-500">{ev.category}</span>
          )}
        </div>

        <Typography
          variant="h6"
          className="font-extrabold !leading-snug text-slate-900"
        >
          {ev.title}
        </Typography>

        <p
          className="text-sm text-slate-500 truncate"
          title={`${fmtDateRange(ev.start_time, ev.end_time)}${ev.location ? ` • ${ev.location}` : ""
            }`}
        >
          {fmtDateRange(ev.start_time, ev.end_time)}
          {ev.location ? ` • ${ev.location}` : ""}
        </p>

        <Box className="mt-auto flex items-center gap-1.5 pt-1">
          {isOwner ? (
            <>
              {/* OWNER: Host Now */}
              <Button
                onClick={() => onHost(ev)}
                startIcon={<LiveTvRoundedIcon />}
                variant="contained"
                className="rounded-xl"
                sx={{
                  textTransform: "none",
                  backgroundColor: "#10b8a6",
                  "&:hover": { backgroundColor: "#0ea5a4" },
                  minWidth: { xs: 40, lg: 120 },
                  px: { xs: 1, lg: 2 },
                }}
                disabled={isHosting}
              >
                {isHosting ? (
                  <span className="flex items-center gap-2">
                    <CircularProgress size={18} />
                    <Box
                      component="span"
                      sx={{ display: { xs: "none", lg: "inline" } }}
                    >
                      Hosting…
                    </Box>
                  </span>
                ) : (
                  <Box
                    component="span"
                    sx={{ display: { xs: "none", lg: "inline" } }}
                  >
                    Host Now
                  </Box>
                )}
              </Button>

              {/* OWNER: Edit */}
              <Button
                onClick={() => onEdit?.(ev)}
                startIcon={<EditNoteRoundedIcon />}
                variant="outlined"
                className="rounded-xl"
                sx={{
                  textTransform: "none",
                  minWidth: { xs: 36, lg: 96 },
                  px: { xs: 1, lg: 2 },
                }}
              >
                <Box
                  component="span"
                  sx={{ display: { xs: "none", lg: "inline" } }}
                >
                  Edit
                </Box>
              </Button>
            </>
          ) : (
            <>
              {/* STAFF: Join (instead of Host) */}
              {canJoinLive ? (
                <Button
                  onClick={() => onJoinLive?.(ev)}
                  variant="contained"
                  className="rounded-xl"
                  sx={{
                    textTransform: "none",
                    backgroundColor: "#10b8a6",
                    "&:hover": { backgroundColor: "#0ea5a4" },
                    minWidth: { xs: 40, lg: 120 },
                    px: { xs: 1, lg: 2 },
                  }}
                  disabled={isJoining}
                >
                  {isJoining ? (
                    <span className="flex items-center gap-2">
                      <CircularProgress size={18} />
                      <Box
                        component="span"
                        sx={{ display: { xs: "none", lg: "inline" } }}
                      >
                        Joining…
                      </Box>
                    </span>
                  ) : (
                    <Box
                      component="span"
                      sx={{ display: { xs: "none", lg: "inline" } }}
                    >
                      Join
                    </Box>
                  )}
                </Button>
              ) : (
                // If not live / no dyte meeting yet, just show Details
                <Button
                  component={Link}
                  to={`/admin/events/${ev.slug || ev.id}`}
                  state={{ event: ev }}
                  variant="contained"
                  className="rounded-xl"
                  sx={{
                    textTransform: "none",
                    backgroundColor: "#10b8a6",
                    "&:hover": { backgroundColor: "#0ea5a4" },
                    minWidth: { xs: 40, lg: 120 },
                    px: { xs: 1, lg: 2 },
                  }}
                >
                  <Box
                    component="span"
                    sx={{ display: { xs: "none", lg: "inline" } }}
                  >
                    Details
                  </Box>
                </Button>
              )}

              {/* STAFF: View (instead of Edit) */}
              <Button
                component={Link}
                to={`/admin/events/${ev.slug || ev.id}`}
                state={{ event: ev }}
                variant="outlined"
                className="rounded-xl"
                sx={{
                  textTransform: "none",
                  minWidth: { xs: 36, lg: 96 },
                  px: { xs: 1, lg: 2 },
                }}
              >
                <Box
                  component="span"
                  sx={{ display: { xs: "none", lg: "inline" } }}
                >
                  View
                </Box>
              </Button>
            </>
          )}
        </Box>
      </Box>
    </Paper>
  );
}

function AdminEvents() {
  const token = getToken();
  const isOwner = isOwnerUser();
  const navigate = useNavigate();
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }, []);
  const myId = user?.id || user?.pk || user?.user_id || null;
  const [imageFile, setImageFile] = useState(null);
  const [events, setEvents] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  // hosting flow state
  const [hostingId, setHostingId] = useState(null);
  const [joiningId, setJoiningId] = useState(null);
  const [errOpen, setErrOpen] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  // ➕ Pagination
  const PAGE_SIZE = 6;
  const [page, setPage] = useState(1);
  // Tabs: 0=All, 1=Upcoming, 2=Live, 3=Past
  const [tab, setTab] = useState(0);

  // NEW: create dialog state
  const [createOpen, setCreateOpen] = useState(false);

  // when a card clicks Edit:
  const onEdit = (ev) => {
    setEditing(ev);
    setEditOpen(true);
  };

  // when PATCH succeeds:
  const onUpdated = (updated) => {
    setEvents((prev) => prev.map((e) => (String(e.id) === String(updated.id) ? updated : e)));
  };

  // Fetch events:
  // - Owner: see ALL events
  // - Staff: see only purchased / registered events (same logic as MyEventsPage)
  useEffect(() => {
    let cancelled = false;

    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const fetchJSON = async (path) => {
      const fullUrl = path.startsWith("http") ? path : urlJoin(API_BASE, path);
      const res = await fetch(fullUrl, { headers });
      if (!res.ok) {
        throw new Error(`${res.status}`);
      }
      return res.json();
    };

    const loadOwnerEvents = async () => {
      const res = await fetch(`${API_ROOT}/events/`, { headers });
      if (!res.ok) throw new Error(`${res.status}`);
      const json = await res.json().catch(() => ({}));
      const data = asList(json);
      return Array.isArray(data) ? data : [];
    };

    const loadStaffEvents = async () => {
      let me = null;
      try {
        me = await fetchJSON("/users/me/");
      } catch {
        // ignore, we'll still try user=me endpoints
      }

      const candidates = [
        "/events/mine/",
        "/event-registrations/mine/",
        "/registrations/mine/",
        "/event-registrations/?user=me",
        me?.id ? `/event-registrations/?user=${me.id}` : null,
      ].filter(Boolean);

      let raw = [];
      for (const p of candidates) {
        try {
          const data = await fetchJSON(p);
          const list = asList(data);
          if (Array.isArray(list)) {
            raw = list;
            if (list.length > 0) break; // first non-empty wins (same behaviour as MyEventsPage)
          }
        } catch {
          // try next candidate
        }
      }

      // If these are registrations, pull out the event object
      let list = [];
      if (raw.length > 0 && raw[0] && raw[0].event) {
        list = raw.map((r) => r.event).filter(Boolean);
      } else {
        list = raw;
      }

      // de-duplicate by id/slug (same as MyEventsPage)
      const seen = new Set();
      const dedup = [];
      for (const ev of list) {
        const key = ev?.id ?? ev?.slug;
        if (!key || seen.has(key)) continue;
        seen.add(key);
        dedup.push(ev);
      }
      return dedup;
    };

    const load = async () => {
      setLoading(true);
      try {
        const arr = isOwner ? await loadOwnerEvents() : await loadStaffEvents();
        if (!cancelled) {
          setEvents(arr);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setEvents([]);
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [token, isOwner]);


  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return events.filter((ev) => {
      const searchHit =
        !term ||
        `${ev.title || ""} ${ev.category || ""} ${ev.location || ""}`
          .toLowerCase()
          .includes(term);

      if (!searchHit) return false;

      const status = computeStatus(ev);
      if (tab === 1) return status === "upcoming";
      if (tab === 2) return status === "live";
      if (tab === 3) return status === "past";
      return true; // All
    });
  }, [events, q, tab]);

  useEffect(() => {
    setPage(1);
  }, [q, tab]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    if (page > maxPage) setPage(maxPage);
  }, [filtered.length, page]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  // Host flow (unchanged)
  const onHost = async (ev) => {
    const eventId = ev?.id ?? null;
    if (!eventId) return;
    setHostingId(eventId);

    try {
      // Just open the Dyte meeting page as 'publisher'
      const livePath = `/live/${ev.slug || eventId}?id=${eventId}&role=publisher`;
      window.open(livePath, "_blank");
    } catch (e) {
      setErrMsg(
        typeof e?.message === "string" && e.message
          ? e.message
          : "Unable to start live meeting."
      );
      setErrOpen(true);
    } finally {
      setHostingId(null);
    }
  };

  const handleJoinLive = async (ev) => {
    if (!ev?.id) return;

    setJoiningId(ev.id);
    try {
      // same pattern as MyEventsPage: /live/:slug?id=...&role=audience
      const livePath = `/live/${ev.slug || ev.id}?id=${ev.id}&role=audience`;

      navigate(livePath, {
        state: { event: ev },
        replace: false,
      });
    } catch (e) {
      setErrMsg(
        typeof e?.message === "string" && e.message.length
          ? `Unable to join live: ${e.message}`
          : "Unable to join live at the moment."
      );
      setErrOpen(true);
    } finally {
      setJoiningId(null);
    }
  };


  // When a new event is created from the dialog, show it immediately at the top
  const onCreated = (ev) => {
    setEvents((prev) => [ev, ...prev]);
  };

  return (
    <Container
      maxWidth="lg"
      disableGutters
      className="pt-6 pb-6 sm:pt-1 sm:pb-8"
    >
      {/* Header */}
      <Box
        className="mb-4"
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: { xs: "flex-start", sm: "center" },
          gap: 2,
        }}
      >
        <Avatar sx={{ bgcolor: "#0ea5a4" }}>
          {(user?.first_name || "A")[0].toUpperCase()}
        </Avatar>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h5" className="font-extrabold">
            Events
          </Typography>
          <Typography className="text-slate-500">
            Manage sessions you’ve created. Start hosting with one click.
          </Typography>
        </Box>

        {isOwnerUser() && (
          <Box sx={{ width: { xs: "100%", sm: "auto" } }}>
            <Button
              fullWidth
              onClick={() => setCreateOpen(true)}
              startIcon={<AddRoundedIcon />}
              variant="contained"
              className="rounded-xl"
              sx={{
                textTransform: "none",
                backgroundColor: "#10b8a6",
                "&:hover": { backgroundColor: "#0ea5a4" },
              }}
            >
              Create Event
            </Button>
          </Box>
        )}
      </Box>
      {/* Tabs: All / Upcoming / Live / Past */}
      <Paper elevation={0} className="rounded-2xl border border-slate-200 mb-4">
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            px: 1,
            "& .MuiTab-root": { textTransform: "none", minHeight: 46 },
            "& .Mui-selected": { color: "#0ea5a4 !important", fontWeight: 700 },
            "& .MuiTabs-indicator": { backgroundColor: "#0ea5a4" },
          }}
        >
          <Tab label="All" />
          <Tab label="Upcoming" />
          <Tab label="Live" />
          <Tab label="Past" />
        </Tabs>
      </Paper>

      {/* Search */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        alignItems={{ xs: "stretch", sm: "center" }}
        className="mb-5"
      >
        <TextField
          size="small"
          placeholder="Search your events…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          InputProps={{ startAdornment: <SearchRoundedIcon className="mr-2 text-slate-400" /> }}
          sx={{ width: { xs: "100%", sm: 360 } }}
        />
        <Box sx={{ flex: 1, display: { xs: "none", sm: "block" } }} />
      </Stack>

      {/* Grid */}
      {loading ? (
        <Box className="flex items-center justify-center py-16">
          <div className="w-64">
            <LinearProgress />
            <p className="text-center text-slate-500 mt-3">Loading events…</p>
          </div>
        </Box>
      ) : filtered.length === 0 ? (
        <Paper elevation={0} className="rounded-2xl border border-slate-200">
          <Box className="p-8 text-center">
            <Typography variant="h6" className="font-semibold text-slate-700">
              No events found
            </Typography>
            <p className="text-slate-500 mt-1">
              Try a different search{isOwner ? " or create a new event." : "."}
            </p>
            {isOwner && (
              <Button
                onClick={() => setCreateOpen(true)}
                className="mt-4 rounded-xl"
                sx={{
                  textTransform: "none",
                  backgroundColor: "#10b8a6",
                  "&:hover": { backgroundColor: "#0ea5a4" },
                }}
                variant="contained"
              >
                Create Event
              </Button>
            )}
          </Box>
        </Paper>
      ) : (
        <>
          <Box sx={{ flexGrow: 1 }}>
            <Grid
              container
              spacing={{ xs: 2, md: 3 }}
              columns={{ xs: 4, sm: 12, md: 12 }}   // ✅ same as MyEventsPage
            >
              {paged.map((ev) => (
                <Grid
                  key={ev.id || ev.slug}
                  size={{ xs: 4, sm: 4, md: 4 }}     // ✅ 1 card on mobile, 3 on tablet/desktop
                >
                  <AdminEventCard
                    ev={ev}
                    onHost={onHost}
                    isHosting={hostingId === (ev.id ?? null)}
                    onEdit={onEdit}
                    onJoinLive={handleJoinLive}
                    isJoining={joiningId === (ev.id ?? null)}
                    isOwner={isOwner}
                  />
                </Grid>
              ))}
            </Grid>

            {editing && (
              <EditEventDialog
                open={editOpen}
                onClose={() => setEditOpen(false)}
                event={editing}
                onUpdated={onUpdated}
              />
            )}
          </Box>

          {/* Pagination */}
          <Box className="mt-4 flex items-center justify-center">
            <Pagination count={pageCount} page={page} onChange={(_, p) => setPage(p)} color="primary" shape="rounded" />
          </Box>
        </>
      )}

      {/* Error Snackbar */}
      <Snackbar open={errOpen} autoHideDuration={6000} onClose={() => setErrOpen(false)}>
        <Alert onClose={() => setErrOpen(false)} severity="error" variant="filled" sx={{ width: "100%" }}>
          {errMsg || "Unable to host right now."}
        </Alert>
      </Snackbar>

      {/* Create Event Dialog */}
      <CreateEventDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={onCreated} />
      {/* Edit dialog (mounted once) */}
      {editing && (
        <EditEventDialog
          open={editOpen}
          onClose={() => setEditOpen(false)}
          event={editing}
          onUpdated={onUpdated}
        />
      )}
    </Container>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [active, setActive] = React.useState(
    new URLSearchParams(location.search).get("admin_tab") || "events"
  );
  const [mobileOpen, setMobileOpen] = React.useState(false); // optional for mobile
  React.useEffect(() => {
    const q = new URLSearchParams(location.search);
    setActive(q.get("admin_tab") || "events");
  }, [location.search]);

  return (
    <Box className="min-h-screen bg-slate-50">
      <Container
        maxWidth="xl"
        sx={{
          py: 3,
          px: { xs: 1, sm: 2 },   // xs = 8px, sm+ = 16px (same as before)
        }}
      >
        <Grid
          container
          columnSpacing={{ xs: 2, md: 3 }}   // 16px on mobile, 24px on md+
          rowSpacing={{ xs: 2, md: 2 }}
          columns={{ xs: 12, md: 12 }}
        >

          {/* Right: Content */}
          <Grid size={{ xs: 12, md: 9 }}>
            {active === "events" ? (
              <AdminEvents />
            ) : active === "posts" ? (
              <AdminPostsPage />
            ) : active === "resources" ? (
              <AdminResources />
            ) : active === "groups" ? (
              <AdminGroups />
            ) : active === "recordings" ? (
              <MyRecordingsPage />
            ) : active === "notifications" ? (
              <AdminNotificationsPage />
            ) : active === "settings" ? (
              <AdminSettings />
            ) : (
              <AdminResources />   // fallback unchanged
            )}
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}