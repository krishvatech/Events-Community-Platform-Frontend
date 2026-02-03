// src/pages/AdminEvents.jsx
import React, { useEffect, useMemo, useState } from "react";
import { isOwnerUser } from "../utils/adminRole.js";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Avatar,
  Box,
  Button,
  Chip,
  Container,
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
  Skeleton,             // ✅ NEW: skeletons
} from "@mui/material";
import Grid from "@mui/material/Grid";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import AdminGroups from "./AdminGroups.jsx";
import AdminResources from "./AdminResources.jsx";
import AdminNameRequestsPage from "./AdminNameRequestsPage.jsx";
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
import { IconButton, InputAdornment } from "@mui/material";
import AdminPostsPage from "./AdminPostsPage.jsx";
import MyRecordingsPage from "./MyRecordingsPage.jsx"
import AdminNotificationsPage from "./AdminNotificationsPage.jsx";
import AdminSettings from "./AdminSettings.jsx"
import RegisteredActions from "../components/RegisteredActions.jsx";
import Autocomplete from "@mui/material/Autocomplete";
import * as isoCountries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";

dayjs.extend(utc);
dayjs.extend(timezone);


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

isoCountries.registerLocale(enLocale);

// 🇮🇳 flag from "IN"
const flagEmoji = (code) =>
  code
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt()));

const COUNTRY_OPTIONS = Object.entries(
  isoCountries.getNames("en", { select: "official" })
).map(([code, label]) => ({ code, label, emoji: flagEmoji(code) }));

// Same logic as HomePage – but we pass `{ location }`
const getSelectedCountry = ({ location }) => {
  if (!location) return null;

  // if you ever store code directly
  const byCode = COUNTRY_OPTIONS.find((opt) => opt.code === location);
  if (byCode) return byCode;

  // match by name (what you use now)
  return (
    COUNTRY_OPTIONS.find(
      (opt) =>
        (opt.label || "").toLowerCase() === String(location).toLowerCase()
    ) || null
  );
};

const FALLBACK_TIMEZONES = [
  "Asia/Kolkata",
  "UTC",
  "Asia/Dubai",
  "Europe/London",
  "America/New_York",
];

const getBrowserTimezone = () => {
  if (typeof Intl !== "undefined" && Intl.DateTimeFormat) {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
  }
  return "Asia/Kolkata";
};

const getTimezoneOptions = () => {
  if (typeof Intl !== "undefined" && typeof Intl.supportedValuesOf === "function") {
    return Intl.supportedValuesOf("timeZone");
  }
  return FALLBACK_TIMEZONES;
};

const TIMEZONE_OPTIONS = getTimezoneOptions();

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
  localStorage.getItem("access_token") ||
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

// Allow join X minutes before the event start (used for staff view)
const canJoinEarly = (ev, minutes = 15) => {
  if (!ev?.start_time) return false;

  const startMs = new Date(ev.start_time).getTime();
  if (!Number.isFinite(startMs)) return false;

  const now = Date.now();
  const diff = startMs - now;           // ms until start
  const windowMs = minutes * 60 * 1000; // e.g. 15 minutes

  // true only if event hasn't started yet, but is within the early-join window
  return diff > 0 && diff <= windowMs;
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
   CreateEventDialog (popup inside AdminEvents)
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
const toUTCISO = (date, time, tz) => {
  if (!date || !time || !tz) return null;
  const dt = dayjs.tz(`${date}T${time}:00`, tz);
  return dt.isValid() ? dt.toDate().toISOString() : null;
};

// --- Schedule defaults: always hour-aligned (HH:00) and default duration 2 hours ---
const roundToHour = (d = dayjs()) => dayjs(d).minute(0).second(0).millisecond(0);

const getDefaultSchedule = (durationHours = 2) => {
  const start = roundToHour(dayjs());
  const end = start.add(durationHours, "hour");
  return {
    startDate: start.format("YYYY-MM-DD"),
    endDate: end.format("YYYY-MM-DD"),
    startTime: start.format("HH:mm"),
    endTime: end.format("HH:mm"),
  };
};

const computeEndFromStart = (startDate, startTime, durationHours = 2) => {
  const start = dayjs(`${startDate}T${startTime}:00`);
  if (!start.isValid()) {
    return { endDate: startDate, endTime: startTime };
  }
  const end = start.add(durationHours, "hour");
  return { endDate: end.format("YYYY-MM-DD"), endTime: end.format("HH:mm") };
};


function CreateEventDialog({ open, onClose, onCreated, communityId = "1" }) {
  const token = getToken();

  // Event fields
  const [title, setTitle] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [location, setLocation] = React.useState("Germany");
  const [category, setCategory] = React.useState("Workshop");
  const [format, setFormat] = React.useState("virtual");
  const [price, setPrice] = React.useState();
  const [isFree, setIsFree] = React.useState(false);

  const today = dayjs().format("YYYY-MM-DD");
  const defaultSchedule = React.useMemo(() => getDefaultSchedule(2), []);
  const [isMultiDay, setIsMultiDay] = React.useState(false);
  const [startDate, setStartDate] = React.useState(defaultSchedule.startDate);
  const [endDate, setEndDate] = React.useState(defaultSchedule.endDate);
  const [startTime, setStartTime] = React.useState(defaultSchedule.startTime);
  const [endTime, setEndTime] = React.useState(defaultSchedule.endTime);
  const [timezone, setTimezone] = React.useState(getBrowserTimezone());

  const timezoneOptions = React.useMemo(() => {
    return timezone && !TIMEZONE_OPTIONS.includes(timezone)
      ? [timezone, ...TIMEZONE_OPTIONS]
      : TIMEZONE_OPTIONS;
  }, [timezone]);

  // Image - Update Logo / Picture (original branding image)
  const [logoImageFile, setLogoImageFile] = React.useState(null);
  const [localLogoImagePreview, setLocalLogoImagePreview] = React.useState("");

  // Image - Cover Image (displayed when host disconnected or event not live)
  const [coverImageFile, setCoverImageFile] = React.useState(null);
  const [localCoverImagePreview, setLocalCoverImagePreview] = React.useState("");

  // Image - Waiting Room Image (replaces clock in waiting room if uploaded)
  const [waitingRoomImageFile, setWaitingRoomImageFile] = React.useState(null);
  const [localWaitingRoomImagePreview, setLocalWaitingRoomImagePreview] = React.useState("");
  const [waitingRoomEnabled, setWaitingRoomEnabled] = React.useState(false);
  const [waitingRoomLoungeAllowed, setWaitingRoomLoungeAllowed] = React.useState(true);
  const [waitingRoomNetworkingAllowed, setWaitingRoomNetworkingAllowed] = React.useState(true);
  const [waitingRoomAutoAdmitSeconds, setWaitingRoomAutoAdmitSeconds] = React.useState("");

  // Replay Options
  const [replayAvailable, setReplayAvailable] = React.useState(false);
  const [replayDuration, setReplayDuration] = React.useState("");

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
  const [resPublishDate, setResPublishDate] = React.useState(defaultSchedule.startDate);
  const [resPublishTime, setResPublishTime] = React.useState(defaultSchedule.startTime);

  const [submitting, setSubmitting] = React.useState(false);
  const [toast, setToast] = React.useState({ open: false, type: "success", msg: "" });
  const [errors, setErrors] = React.useState({});

  const slugifyLocal = (s) =>
    (s || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const iso = (d, t) => (d && t ? dayjs(`${d}T${t}:00`).toISOString() : null);

  // ✅ Default schedule on open: current hour (HH:00) → +2 hours
  React.useEffect(() => {
    if (!open) return;
    const sch = getDefaultSchedule(2);
    setStartDate(sch.startDate);
    setEndDate(sch.endDate);
    setStartTime(sch.startTime);
    setEndTime(sch.endTime);
    // Keep resources publish defaults aligned with the same hour
    setResPublishDate(sch.startDate);
    setResPublishTime(sch.startTime);
  }, [open]);

  // 🔹 NEW: reset all fields back to defaults after successful create
  const resetForm = () => {
    const sch = getDefaultSchedule(2);
    const todayStr = sch.startDate;

    setTitle("");
    setSlug("");
    setDescription("");
    setLocation("Germany");
    setCategory("Workshop");
    setFormat("virtual");
    setPrice(0);
    setIsFree(false);

    setIsMultiDay(false);
    setStartDate(sch.startDate);
    setEndDate(sch.endDate);
    setStartTime(sch.startTime);
    setEndTime(sch.endTime);
    setTimezone(getBrowserTimezone());

    setLogoImageFile(null);
    setLocalLogoImagePreview("");
    setCoverImageFile(null);
    setLocalCoverImagePreview("");
    setWaitingRoomImageFile(null);
    setLocalWaitingRoomImagePreview("");

    setReplayAvailable(false);
    setReplayDuration("");

    setResourceType("file");
    setResFiles([]);
    setResLinks([""]);
    setResVideos([""]);

    setResTitle("");
    setResDesc("");
    setTagInput("");
    setResTags([]);

    setResourcesPublishNow(true);
    setResPublishDate(sch.startDate);
    setResPublishTime(sch.startTime);

    setErrors({});
  };

  const validate = () => {
    const e = {};
    if (!title.trim()) e.title = "Required";
    if (!slug.trim()) e.slug = "Required";
    if (["in_person", "hybrid"].includes(format) && !location.trim()) e.location = "Required";
    if (!description.trim()) e.description = "Required";
    const priceValue = Number(price);
    if (!isFree) {
      if (price === "" || price === null || typeof price === "undefined") {
        e.price = "Price is required (or mark as free)";
      } else if (!Number.isFinite(priceValue)) {
        e.price = "Price must be a valid number";
      } else if (priceValue < 1) {
        e.price = "Price must be >= 1";
      }
    }

    const s = dayjs.tz(`${startDate}T${startTime}:00`, timezone);
    const ed = dayjs.tz(`${endDate}T${endTime}:00`, timezone);
    if (s.isValid() && ed.isValid() && !ed.isAfter(s)) {
      // ⛔ End before or same as start → show error on end date + end time
      e.endTime = "End must be after start";
      e.endDate = "End must be after start";
    }
    if (!resourcesPublishNow) {
      const pdt = dayjs(`${resPublishDate}T${resPublishTime}:00`);
      if (pdt.isValid() === false) e.resource_publish_at = "Choose valid publish date & time";
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
    fd.append("description", description);
    fd.append("location", location.trim());
    fd.append("category", category);
    fd.append("format", format);
    fd.append("price", String(isFree ? 0 : (price ?? 0)));
    fd.append("is_free", String(isFree));
    fd.append("timezone", timezone);
    fd.append("start_time", toUTCISO(startDate, startTime, timezone));
    fd.append("end_time", toUTCISO(endDate, endTime, timezone));
    fd.append("recording_url", "");

    if (replayAvailable) {
      fd.append("replay_available", "true");
      fd.append("replay_availability_duration", replayDuration.trim());
    } else {
      fd.append("replay_available", "false");
      fd.append("replay_availability_duration", "");
    }

    if (logoImageFile) fd.append("preview_image", logoImageFile, logoImageFile.name);
    if (coverImageFile) fd.append("cover_image", coverImageFile, coverImageFile.name);
    if (waitingRoomImageFile) fd.append("waiting_room_image", waitingRoomImageFile, waitingRoomImageFile.name);
    fd.append("waiting_room_enabled", String(waitingRoomEnabled));
    fd.append("lounge_enabled_waiting_room", String(waitingRoomLoungeAllowed));
    fd.append("networking_tables_enabled_waiting_room", String(waitingRoomNetworkingAllowed));
    if (waitingRoomAutoAdmitSeconds) {
      fd.append("auto_admit_seconds", String(waitingRoomAutoAdmitSeconds));
    }
    fd.append("waiting_room_enabled", String(waitingRoomEnabled));
    fd.append("lounge_enabled_waiting_room", String(waitingRoomLoungeAllowed));
    fd.append("networking_tables_enabled_waiting_room", String(waitingRoomNetworkingAllowed));
    if (waitingRoomAutoAdmitSeconds) {
      fd.append("auto_admit_seconds", String(waitingRoomAutoAdmitSeconds));
    }
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
          Object.entries(json)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
            .join(" | ") ||
          `HTTP ${res.status}`;
        throw new Error(msg);
      }

      onCreated?.(json);
      setToast({ open: true, type: "success", msg: "Event created. Resources attached." });

      // 🔹 CLEAR FORM FOR NEXT TIME
      resetForm();

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

          <Box className="flex items-start mb-3">
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
            label="Format"
            select
            value={format}
            onChange={(e) => {
              const next = e.target.value;
              setFormat(next);
              if (next === "virtual") {
                setErrors((prev) => ({ ...prev, location: "" }));
              }
            }}
            fullWidth
            sx={{ mb: 2 }}
          >
            {formats.map((f) => (
              <MenuItem key={f.value} value={f.value}>
                {f.label}
              </MenuItem>
            ))}
          </TextField>
        </Paper>

        {/* Replay Options - Only for Virtual/Hybrid */}
        {(format === "virtual" || format === "hybrid") && (
          <Paper elevation={0} className="rounded-2xl border border-slate-200 p-4 mb-3">
            <Typography variant="h6" className="font-semibold mb-3">Replay Options</Typography>
            <Stack direction="row" spacing={3} alignItems="center">
              <FormControlLabel
                control={
                  <Switch
                    checked={replayAvailable}
                    onChange={(e) => setReplayAvailable(e.target.checked)}
                  />
                }
                label="Replay will be available"
              />
              {replayAvailable && (
                <TextField
                  select
                  label="Available for"
                  value={replayDuration}
                  onChange={(e) => setReplayDuration(e.target.value)}
                  size="small"
                  sx={{ minWidth: 200 }}
                >
                  {[
                    "7 Days",
                    "14 Days",
                    "30 Days",
                    "60 Days",
                    "90 Days",
                    "6 Months",
                    "1 Year",
                    "Unlimited"
                  ].map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            </Stack>
          </Paper>
        )}

        {/* Country Field */}
        <Box sx={{ mb: 2 }}>
          {format === "virtual" ? (
            <Autocomplete
              fullWidth
              options={COUNTRY_OPTIONS}
              autoHighlight
              value={getSelectedCountry({ location })}
              getOptionLabel={(opt) => opt?.label ?? ""}
              isOptionEqualToValue={(o, v) => o.code === v.code}
              onChange={(_, newVal) => {
                setLocation(newVal ? newVal.label : "");
                setErrors((prev) => ({ ...prev, location: "" }));
              }}
              ListboxProps={{
                style: {
                  maxHeight: 36 * 7,
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
                  label="Country"
                  placeholder="Select country"
                  fullWidth
                  error={!!errors.location}
                  helperText={errors.location}
                  inputProps={{
                    ...params.inputProps,
                    autoComplete: "new-password",
                  }}
                />
              )}
            />
          ) : (
            <TextField
              label="Location *"
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                setErrors((prev) => ({ ...prev, location: "" }));
              }}
              fullWidth
              error={!!errors.location}
              helperText={errors.location || "City & country, or full address"}
            />
          )}
        </Box>



        {/* Category Field */}
        <Box sx={{ mb: 3 }}>
          <TextField
            label="Category"
            select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            fullWidth
          >
            {categories.map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </TextField>
        </Box>

        {/* Row 2: Price & Free Event */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Price Field */}
          <Grid item xs={12} sm={6}>
            <TextField
              label="Price ($)"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              inputProps={{ min: 0, step: "0.01" }}
              fullWidth
              error={!!errors.price}
              helperText={errors.price}
              disabled={isFree}
            />
          </Grid>

          {/* Free Event Checkbox */}
          <Grid item xs={12} sm={6} sx={{ display: "flex", alignItems: "center", justifyContent: "flex-start" }}>
            <FormControlLabel
              control={<Switch checked={isFree} onChange={(e) => setIsFree(e.target.checked)} />}
              label="Free Event"
              sx={{ width: "100%", m: 0 }}
            />
          </Grid>
        </Grid>

        {/* hidden slug */}
        <Box sx={{ display: "none" }}>
          <TextField label="Slug *" value={slug} onChange={(e) => setSlug(slugifyLocal(e.target.value))} />
        </Box>

        {/* Images Row - Three Equal Columns */}
        <Box
          sx={{
            mt: 3,
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 2,
          }}
        >
          {/* Update Logo / Picture */}
          <Box>
            <Typography variant="subtitle1" className="font-semibold">Update Logo / Picture</Typography>
            <Typography variant="caption" className="text-slate-500 block mb-2">
              Recommended 650x365px - Max 50 MB
            </Typography>

            <Box
              className="rounded-xl border border-slate-300 bg-slate-100/70 flex items-center justify-center"
              sx={{ height: 150, position: "relative", overflow: "hidden" }}
            >
              {localLogoImagePreview ? (
                <img
                  src={localLogoImagePreview}
                  alt="logo preview"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <Stack alignItems="center" spacing={1}>
                  <ImageRoundedIcon />
                  <Typography variant="body2" className="text-slate-600">Logo / Picture</Typography>
                </Stack>
              )}

              <input
                id="ev-logo-image-file"
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setLogoImageFile(f);
                  const r = new FileReader();
                  r.onload = (ev) =>
                    setLocalLogoImagePreview(String(ev.target?.result || ""));
                  r.readAsDataURL(f);
                }}
              />
            </Box>

            <label htmlFor="ev-logo-image-file">
              <Button
                component="span"
                size="small"
                variant="outlined"
                startIcon={<InsertPhotoRoundedIcon />}
                sx={{ mt: 1 }}
              >
                Upload Logo
              </Button>
            </label>
          </Box>

          {/* Cover Image */}
          <Box>
            <Typography variant="subtitle1" className="font-semibold">Cover Image</Typography>
            <Typography variant="caption" className="text-slate-500 block mb-2">
              Recommended 650x365px - Max 50 MB
            </Typography>

            <Box
              className="rounded-xl border border-slate-300 bg-slate-100/70 flex items-center justify-center"
              sx={{ height: 150, position: "relative", overflow: "hidden" }}
            >
              {localCoverImagePreview ? (
                <img
                  src={localCoverImagePreview}
                  alt="cover preview"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <Stack alignItems="center" spacing={1}>
                  <ImageRoundedIcon />
                  <Typography variant="body2" className="text-slate-600">Cover Image</Typography>
                </Stack>
              )}

              <input
                id="ev-cover-image-file"
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setCoverImageFile(f);
                  const r = new FileReader();
                  r.onload = (ev) =>
                    setLocalCoverImagePreview(String(ev.target?.result || ""));
                  r.readAsDataURL(f);
                }}
              />
            </Box>

            <label htmlFor="ev-cover-image-file">
              <Button
                component="span"
                size="small"
                variant="outlined"
                startIcon={<InsertPhotoRoundedIcon />}
                sx={{ mt: 1 }}
              >
                Upload Cover
              </Button>
            </label>
          </Box>

          {/* Waiting Room Image */}
          <Box>
            <Typography variant="subtitle1" className="font-semibold">Waiting Room</Typography>
            <Typography variant="caption" className="text-slate-500 block mb-2">
              Recommended 650x365px - Max 50 MB
            </Typography>

            <Box
              className="rounded-xl border border-slate-300 bg-slate-100/70 flex items-center justify-center"
              sx={{ height: 150, position: "relative", overflow: "hidden" }}
            >
              {localWaitingRoomImagePreview ? (
                <img
                  src={localWaitingRoomImagePreview}
                  alt="waiting room preview"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <Stack alignItems="center" spacing={1}>
                  <ImageRoundedIcon />
                  <Typography variant="body2" className="text-slate-600">Waiting Room</Typography>
                </Stack>
              )}

              <input
                id="ev-waiting-room-image-file"
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setWaitingRoomImageFile(f);
                  const r = new FileReader();
                  r.onload = (ev) =>
                    setLocalWaitingRoomImagePreview(String(ev.target?.result || ""));
                  r.readAsDataURL(f);
                }}
              />
            </Box>

            <label htmlFor="ev-waiting-room-image-file">
              <Button
                component="span"
                size="small"
                variant="outlined"
                startIcon={<InsertPhotoRoundedIcon />}
                sx={{ mt: 1 }}
              >
                Upload Waiting Room
              </Button>
            </label>

          </Box>
        </Box>

        <Box
          sx={{
            mt: 2,
            width: "100%",
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
            gap: 1.5,
            alignItems: "center",
          }}
        >
          <FormControlLabel
            control={
              <Switch
                checked={waitingRoomEnabled}
                onChange={(e) => setWaitingRoomEnabled(e.target.checked)}
              />
            }
            label="Enable Waiting Room"
            sx={{
              m: 0,
              width: "100%",
              justifyContent: "flex-start",
              gap: 1.5,
              "& .MuiFormControlLabel-label": { marginLeft: 0 },
            }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={waitingRoomLoungeAllowed}
                onChange={(e) => setWaitingRoomLoungeAllowed(e.target.checked)}
                disabled={!waitingRoomEnabled}
              />
            }
            label="Allow Social Lounge while waiting"
            sx={{
              m: 0,
              width: "100%",
              justifyContent: "flex-start",
              gap: 1.5,
              "& .MuiFormControlLabel-label": { marginLeft: 0 },
            }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={waitingRoomNetworkingAllowed}
                onChange={(e) => setWaitingRoomNetworkingAllowed(e.target.checked)}
                disabled={!waitingRoomEnabled}
              />
            }
            label="Allow Networking Tables while waiting"
            sx={{
              m: 0,
              width: "100%",
              justifyContent: "flex-start",
              gap: 1.5,
              "& .MuiFormControlLabel-label": { marginLeft: 0 },
            }}
          />
          <TextField
            label="Auto-admit after (seconds)"
            size="small"
            type="number"
            value={waitingRoomAutoAdmitSeconds}
            onChange={(e) => setWaitingRoomAutoAdmitSeconds(e.target.value)}
            disabled={!waitingRoomEnabled}
            fullWidth
          />
        </Box>

        {/* ===== Schedule ===== */}
        <Paper elevation={0} className="rounded-2xl border border-slate-200 p-4 mb-3">
          <Box className="flex items-center justify-between mb-3">
            <Typography variant="h6" className="font-semibold">Schedule</Typography>
            <FormControlLabel
              control={<Switch checked={isMultiDay} onChange={(e) => {
                const v = e.target.checked;
                setIsMultiDay(v);
                if (!v) {
                  // If switching to Single Day, force end date to equal start date
                  setEndDate(startDate);
                }
              }} />}
              label="Multi-day event?"
            />
          </Box>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={isMultiDay ? 6 : 12}>
              <TextField
                label={isMultiDay ? "Start Date" : "Date"}
                type="date"
                value={startDate}
                onChange={(e) => {
                  const v = e.target.value;
                  setStartDate(v);
                  if (isMultiDay) {
                    const next = computeEndFromStart(v, startTime, 2);
                    setEndDate(next.endDate);
                    setEndTime(next.endTime);
                  } else {
                    // Single day: force end date same as start
                    setEndDate(v);
                  }
                }}
                fullWidth
                InputLabelProps={{ shrink: true }}
                InputProps={{ endAdornment: <InputAdornment position="end"><CalendarMonthRoundedIcon className="text-slate-400" /></InputAdornment> }}
                // 🔻 show error if needed
                error={!!errors.startDate}
                helperText={errors.startDate}
              />
            </Grid>
            {isMultiDay && (
              <Grid item xs={12} md={6}>
                <TextField label="End Date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} fullWidth
                  InputLabelProps={{ shrink: true }}
                  InputProps={{ endAdornment: <InputAdornment position="end"><CalendarMonthRoundedIcon className="text-slate-400" /></InputAdornment> }}
                  // 🔻 show error when end < start
                  error={!!errors.endDate}
                  helperText={errors.endDate}
                />
              </Grid>
            )}
          </Grid>

          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <TimePicker label="Start time *" ampm minutesStep={1} value={dayjs(`1970-01-01T${startTime}`)}
                  onChange={(v) => {
                    const newStart = v ? dayjs(v).second(0).format("HH:mm") : startTime;
                    setStartTime(newStart);
                    const next = computeEndFromStart(startDate, newStart, 2);
                    setEndDate(next.endDate);
                    setEndTime(next.endTime);
                  }}
                  slotProps={{ textField: { fullWidth: true } }} />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} md={4}>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <TimePicker label="End time *" ampm minutesStep={1} value={dayjs(`1970-01-01T${endTime}`)}
                  onChange={(v) => {
                    const newEnd = v ? dayjs(v).second(0).format("HH:mm") : endTime;
                    setEndTime(newEnd);
                    if (startDate && endDate && startDate === endDate && newEnd <= startTime) {
                      setEndDate(dayjs(startDate).add(1, "day").format("YYYY-MM-DD"));
                    }
                  }}
                  slotProps={{ textField: { fullWidth: true } }} />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} md={4}>
              <Autocomplete
                fullWidth
                options={timezoneOptions}
                value={timezone}
                onChange={(_, newVal) => setTimezone(newVal || getBrowserTimezone())}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Event Timezone"
                    helperText="Times are saved in this timezone."
                  />
                )}
              />
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
                    minutesStep={60}
                    value={dayjs(`1970-01-01T${resPublishTime}`)}
                    onChange={(val) => setResPublishTime(val ? dayjs(val).minute(0).second(0).format("HH:mm") : resPublishTime)}
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
export function EditEventDialog({ open, onClose, event, onUpdated }) {
  const token = getToken();

  // --- local state from existing event ---
  const initialTimezone = event?.timezone || getBrowserTimezone();
  const initialStart = event?.start_time
    ? dayjs(event.start_time).tz(initialTimezone)
    : dayjs();
  const initialEnd = event?.end_time
    ? dayjs(event.end_time).tz(initialTimezone)
    : initialStart.add(2, "hour");

  const [title, setTitle] = useState(event?.title || "");
  const [slug, setSlug] = useState(event?.slug || "");
  const [description, setDescription] = useState(event?.description || "");
  const [location, setLocation] = useState(event?.location || "");
  const [category, setCategory] = useState(event?.category || "Workshop");
  const [format, setFormat] = useState(event?.format || "virtual");
  const [price, setPrice] = useState(
    typeof event?.price === "number" ? event.price : Number(event?.price || 0)
  );
  const [isFree, setIsFree] = useState(event?.is_free || false);

  const [isMultiDay, setIsMultiDay] = useState(() => {
    if (!initialStart || !initialEnd) return false;
    return initialStart.format("YYYY-MM-DD") !== initialEnd.format("YYYY-MM-DD");
  });
  const [startDate, setStartDate] = useState(initialStart.format("YYYY-MM-DD"));
  const [endDate, setEndDate] = useState(initialEnd.format("YYYY-MM-DD"));
  const [startTime, setStartTime] = useState(initialStart.format("HH:mm"));
  const [endTime, setEndTime] = useState(initialEnd.format("HH:mm"));

  const [timezone, setTimezone] = useState(initialTimezone);
  const timezoneOptions = useMemo(() => {
    return timezone && !TIMEZONE_OPTIONS.includes(timezone)
      ? [timezone, ...TIMEZONE_OPTIONS]
      : TIMEZONE_OPTIONS;
  }, [timezone]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ open: false, type: "success", msg: "" });

  // image handling - Update Logo / Picture (original branding image)
  const [logoImageFile, setLogoImageFile] = useState(null);
  const [localLogoImagePreview, setLocalLogoImagePreview] = useState("");
  const logoImage = event?.preview_image ? toAbs(event.preview_image) : "";

  // image handling - Cover Image (displayed when host disconnected or event not live)
  const [coverImageFile, setCoverImageFile] = useState(null);
  const [localCoverImagePreview, setLocalCoverImagePreview] = useState("");
  const coverImage = event?.cover_image ? toAbs(event.cover_image) : "";

  // image handling - Waiting Room Image (replaces clock in waiting room if uploaded)
  const [waitingRoomImageFile, setWaitingRoomImageFile] = useState(null);
  const [localWaitingRoomImagePreview, setLocalWaitingRoomImagePreview] = useState("");
  const waitingRoomImage = event?.waiting_room_image ? toAbs(event.waiting_room_image) : "";
  const [waitingRoomEnabled, setWaitingRoomEnabled] = useState(Boolean(event?.waiting_room_enabled));
  const [waitingRoomLoungeAllowed, setWaitingRoomLoungeAllowed] = useState(
    event?.lounge_enabled_waiting_room !== undefined ? Boolean(event.lounge_enabled_waiting_room) : true
  );
  const [waitingRoomNetworkingAllowed, setWaitingRoomNetworkingAllowed] = useState(
    event?.networking_tables_enabled_waiting_room !== undefined ? Boolean(event.networking_tables_enabled_waiting_room) : true
  );
  const [waitingRoomAutoAdmitSeconds, setWaitingRoomAutoAdmitSeconds] = useState(
    event?.auto_admit_seconds ? String(event.auto_admit_seconds) : ""
  );

  // Replay Options
  const [replayAvailable, setReplayAvailable] = React.useState(false);
  const [replayDuration, setReplayDuration] = React.useState("");

  useEffect(() => {
    if (!open) return;
    // hydrate on open in case `event` changed
    const tz = event?.timezone || getBrowserTimezone();
    setTitle(event?.title || "");
    setSlug(event?.slug || "");
    setDescription(event?.description || "");
    setLocation(event?.location || "");
    setCategory(event?.category || "Workshop");
    setFormat((event?.format || "virtual").toLowerCase());
    setPrice(typeof event?.price === "number" ? event.price : Number(event?.price || 0));
    setIsFree(event?.is_free || false);

    const start = event?.start_time ? dayjs(event.start_time).tz(tz) : dayjs();
    const end = event?.end_time ? dayjs(event.end_time).tz(tz) : start.add(2, "hour");
    setTimezone(tz);
    setIsMultiDay(start.format("YYYY-MM-DD") !== end.format("YYYY-MM-DD"));
    setStartDate(start.format("YYYY-MM-DD"));
    setEndDate(end.format("YYYY-MM-DD"));
    setStartTime(start.format("HH:mm"));
    setEndTime(end.format("HH:mm"));

    setLogoImageFile(null);
    setLocalLogoImagePreview("");
    setCoverImageFile(null);
    setLocalCoverImagePreview("");
    setWaitingRoomImageFile(null);
    setLocalWaitingRoomImagePreview("");

    // Init replay options
    setReplayAvailable(!!event?.replay_available);
    setReplayDuration(event?.replay_availability_duration || "");

    setErrors({});
  }, [open, event?.id]);

  const slugifyLocal = (s) =>
    (s || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const combineToISO = (d, t) => toUTCISO(d, t, timezone);

  const validate = () => {
    const e = {};
    if (!title.trim()) e.title = "Required";
    if (!slug.trim()) e.slug = "Required";
    if (["in_person", "hybrid"].includes(format) && !location.trim()) e.location = "Required";
    if (!description.trim()) e.description = "Description is required";
    const priceValue = Number(price);
    if (!isFree) {
      if (price === "" || price === null || typeof price === "undefined") {
        e.price = "Price is required (or mark as free)";
      } else if (!Number.isFinite(priceValue)) {
        e.price = "Price must be a valid number";
      } else if (priceValue < 1) {
        e.price = "Price must be >= 1";
      }
    }

    if (startDate && endDate) {
      const s = dayjs.tz(`${startDate}T${startTime}:00`, timezone);
      const ed = dayjs.tz(`${endDate}T${endTime}:00`, timezone);
      if (s.isValid() && ed.isValid() && !ed.isAfter(s)) {
        // ⛔ End before or same as start → show error on end date + end time
        e.endTime = "End must be after start";
        e.endDate = "End must be after start";
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onPickLogoImage = (file) => {
    if (!file) return;
    setLogoImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setLocalLogoImagePreview(String(e.target?.result || ""));
    reader.readAsDataURL(file);
  };

  const onPickCoverImage = (file) => {
    if (!file) return;
    setCoverImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setLocalCoverImagePreview(String(e.target?.result || ""));
    reader.readAsDataURL(file);
  };

  const onPickWaitingRoomImage = (file) => {
    if (!file) return;
    setWaitingRoomImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setLocalWaitingRoomImagePreview(String(e.target?.result || ""));
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    if (!event?.id) return;
    if (!validate()) return;
    setSubmitting(true);

    const fd = new FormData();
    fd.append("title", title.trim());
    fd.append("slug", slug.trim());
    fd.append("description", description);
    fd.append("location", location.trim());
    fd.append("category", category);
    fd.append("format", format);
    fd.append("price", String(isFree ? 0 : (price ?? 0)));
    fd.append("is_free", String(isFree));
    fd.append("timezone", timezone);
    fd.append("start_time", combineToISO(startDate, startTime));
    fd.append("end_time", combineToISO(endDate, endTime));

    // Send replay update - explicitly send 'true'/'false' and duration (or empty string/null)
    if (replayAvailable) {
      fd.append("replay_available", "true");
      fd.append("replay_availability_duration", replayDuration.trim());
    } else {
      fd.append("replay_available", "false");
      fd.append("replay_availability_duration", "");
    }

    if (logoImageFile) fd.append("preview_image", logoImageFile, logoImageFile.name);
    if (coverImageFile) fd.append("cover_image", coverImageFile, coverImageFile.name);
    if (waitingRoomImageFile) fd.append("waiting_room_image", waitingRoomImageFile, waitingRoomImageFile.name);

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

          <Box className="flex items-start mb-4">
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

          <TextField
            label="Description *"
            multiline minRows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth className="mb-3"
            error={!!errors.description} helperText={errors.description}
          />

          <TextField
            label="Format"
            select
            value={format}
            onChange={(e) => {
              const next = e.target.value;
              setFormat(next);
              if (next === "virtual") {
                setErrors((prev) => ({ ...prev, location: "" }));
              }
            }}
            fullWidth
            className="mb-3"
          >
            {formats.map((f) => (
              <MenuItem key={f.value} value={f.value}>
                {f.label}
              </MenuItem>
            ))}
          </TextField>

          {/* Replay Options - Only for Virtual/Hybrid (EDIT MODE) */}
          {(format === "virtual" || format === "hybrid") && (
            <Paper elevation={0} className="rounded-2xl border border-slate-200 p-4 mb-3">
              <Typography variant="h6" className="font-semibold mb-3">Replay Options</Typography>
              <Stack direction="row" spacing={3} alignItems="center">
                <FormControlLabel
                  control={
                    <Switch
                      checked={replayAvailable}
                      onChange={(e) => setReplayAvailable(e.target.checked)}
                    />
                  }
                  label="Replay will be available"
                />
                {replayAvailable && (
                  <TextField
                    select
                    label="Available for"
                    value={replayDuration}
                    onChange={(e) => setReplayDuration(e.target.value)}
                    size="small"
                    sx={{ minWidth: 200 }}
                  >
                    {[
                      "7 Days",
                      "14 Days",
                      "30 Days",
                      "60 Days",
                      "90 Days",
                      "6 Months",
                      "1 Year",
                      "Unlimited"
                    ].map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              </Stack>
            </Paper>
          )}

          <Grid container spacing={3} columns={{ xs: 12, md: 12 }}>
            {/* Left */}
            <Grid size={{ xs: 12, md: 7 }}>
              {format === "virtual" ? (
                <Autocomplete
                  size="small"
                  fullWidth
                  className="mb-3"
                  options={COUNTRY_OPTIONS}
                  autoHighlight
                  value={getSelectedCountry({ location })}
                  getOptionLabel={(opt) => opt?.label ?? ""}
                  isOptionEqualToValue={(o, v) => o.code === v.code}
                  onChange={(_, newVal) => {
                    setLocation(newVal ? newVal.label : "");
                    setErrors((prev) => ({ ...prev, location: "" }));
                  }}
                  ListboxProps={{
                    style: {
                      maxHeight: 36 * 7,
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
                      label="Country"
                      placeholder="Select country"
                      fullWidth
                      error={!!errors.location}
                      helperText={errors.location}
                      inputProps={{
                        ...params.inputProps,
                        autoComplete: "new-password",
                      }}
                    />
                  )}
                />
              ) : (
                <TextField
                  label="Location *"
                  value={location}
                  onChange={(e) => {
                    setLocation(e.target.value);
                    setErrors((prev) => ({ ...prev, location: "" }));
                  }}
                  fullWidth
                  className="mb-3"
                  error={!!errors.location}
                  helperText={errors.location || "City & country, or full address"}
                />
              )}

              <TextField
                label="Category" select fullWidth
                value={category} onChange={(e) => setCategory(e.target.value)}
                sx={{ mt: 1 }}
              >
                {categories.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </TextField>

              <TextField
                label="Price ($)" type="number" fullWidth
                value={price} onChange={(e) => setPrice(e.target.value)}
                inputProps={{ min: 0, step: "0.01" }}
                error={!!errors.price} helperText={errors.price}
                disabled={isFree}
                sx={{ mt: 3 }}
              />

              <Box sx={{ mt: 1.5, mb: 2 }}>
                <FormControlLabel
                  control={<Switch checked={isFree} onChange={(e) => setIsFree(e.target.checked)} />}
                  label="Free Event (all users can register)"
                />
              </Box>

              {/* keep slug hidden but present */}
              <Box sx={{ display: "none" }}>
                <TextField label="Slug *" value={slug} onChange={(e) => setSlug(slugifyLocal(e.target.value))} />
              </Box>
            </Grid>

            {/* Images Row - Three Equal Columns */}
            <Box sx={{ mt: 3 }}>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: 2,
                }}
              >
                {/* Update Logo / Picture */}
                <Box>
                  <Typography variant="subtitle1" className="font-semibold">Update Logo / Picture</Typography>
                  <Typography variant="caption" className="text-slate-500 block mb-2">
                    Recommended 650x365px - Max 50 MB
                  </Typography>

                  <Box className="rounded-xl border border-slate-300 bg-slate-100/70 flex items-center justify-center"
                    sx={{ height: 150, position: "relative", overflow: "hidden" }}>
                    {localLogoImagePreview ? (
                      <img src={localLogoImagePreview} alt="logo preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : logoImage ? (
                      <img src={logoImage} alt="logo preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <Stack alignItems="center" spacing={1}>
                        <ImageRoundedIcon />
                        <Typography variant="body2" className="text-slate-600">Logo / Picture</Typography>
                      </Stack>
                    )}
                    <input id="edit-ev-logo-image-file" type="file" accept="image/*" style={{ display: "none" }}
                      onChange={(e) => onPickLogoImage(e.target.files?.[0])} />
                  </Box>

                  <label htmlFor="edit-ev-logo-image-file">
                    <Button component="span" size="small" variant="outlined" startIcon={<InsertPhotoRoundedIcon />} sx={{ mt: 1 }}>
                      Upload Logo
                    </Button>
                  </label>
                </Box>

                {/* Cover Image */}
                <Box>
                  <Typography variant="subtitle1" className="font-semibold">Cover Image</Typography>
                  <Typography variant="caption" className="text-slate-500 block mb-2">
                    Recommended 650x365px - Max 50 MB
                  </Typography>

                  <Box className="rounded-xl border border-slate-300 bg-slate-100/70 flex items-center justify-center"
                    sx={{ height: 150, position: "relative", overflow: "hidden" }}>
                    {localCoverImagePreview ? (
                      <img src={localCoverImagePreview} alt="cover preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : coverImage ? (
                      <img src={coverImage} alt="cover preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <Stack alignItems="center" spacing={1}>
                        <ImageRoundedIcon />
                        <Typography variant="body2" className="text-slate-600">Cover Image</Typography>
                      </Stack>
                    )}
                    <input id="edit-ev-cover-image-file" type="file" accept="image/*" style={{ display: "none" }}
                      onChange={(e) => onPickCoverImage(e.target.files?.[0])} />
                  </Box>

                  <label htmlFor="edit-ev-cover-image-file">
                    <Button component="span" size="small" variant="outlined" startIcon={<InsertPhotoRoundedIcon />} sx={{ mt: 1 }}>
                      Upload Cover
                    </Button>
                  </label>
                </Box>

                {/* Waiting Room Image */}
                <Box>
                  <Typography variant="subtitle1" className="font-semibold">Waiting Room</Typography>
                  <Typography variant="caption" className="text-slate-500 block mb-2">
                    Recommended 650x365px - Max 50 MB
                  </Typography>

                  <Box className="rounded-xl border border-slate-300 bg-slate-100/70 flex items-center justify-center"
                    sx={{ height: 150, position: "relative", overflow: "hidden" }}>
                    {localWaitingRoomImagePreview ? (
                      <img src={localWaitingRoomImagePreview} alt="waiting room preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : waitingRoomImage ? (
                      <img src={waitingRoomImage} alt="waiting room preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <Stack alignItems="center" spacing={1}>
                        <ImageRoundedIcon />
                        <Typography variant="body2" className="text-slate-600">Waiting Room</Typography>
                      </Stack>
                    )}
                    <input id="edit-ev-waiting-room-image-file" type="file" accept="image/*" style={{ display: "none" }}
                      onChange={(e) => onPickWaitingRoomImage(e.target.files?.[0])} />
                  </Box>

                  <label htmlFor="edit-ev-waiting-room-image-file">
                    <Button component="span" size="small" variant="outlined" startIcon={<InsertPhotoRoundedIcon />} sx={{ mt: 1 }}>
                      Upload Waiting Room
                    </Button>
                  </label>

                </Box>
              </Box>
            </Box>

            <Box
              sx={{
                mt: 2,
                width: "100%",
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
                gap: 1.5,
                alignItems: "center",
              }}
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={waitingRoomEnabled}
                    onChange={(e) => setWaitingRoomEnabled(e.target.checked)}
                  />
                }
                label="Enable Waiting Room"
                sx={{
                  m: 0,
                  width: "100%",
                  justifyContent: "flex-start",
                  gap: 1.5,
                  "& .MuiFormControlLabel-label": { marginLeft: 0 },
                }}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={waitingRoomLoungeAllowed}
                    onChange={(e) => setWaitingRoomLoungeAllowed(e.target.checked)}
                    disabled={!waitingRoomEnabled}
                  />
                }
                label="Allow Social Lounge while waiting"
                sx={{
                  m: 0,
                  width: "100%",
                  justifyContent: "flex-start",
                  gap: 1.5,
                  "& .MuiFormControlLabel-label": { marginLeft: 0 },
                }}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={waitingRoomNetworkingAllowed}
                    onChange={(e) => setWaitingRoomNetworkingAllowed(e.target.checked)}
                    disabled={!waitingRoomEnabled}
                  />
                }
                label="Allow Networking Tables while waiting"
                sx={{
                  m: 0,
                  width: "100%",
                  justifyContent: "flex-start",
                  gap: 1.5,
                  "& .MuiFormControlLabel-label": { marginLeft: 0 },
                }}
              />
              <TextField
                label="Auto-admit after (seconds)"
                size="small"
                type="number"
                value={waitingRoomAutoAdmitSeconds}
                onChange={(e) => setWaitingRoomAutoAdmitSeconds(e.target.value)}
                disabled={!waitingRoomEnabled}
                fullWidth
              />
            </Box>

            {/* Dates */}
            <Grid size={{ xs: 12 }}>
              <FormControlLabel
                control={<Switch checked={isMultiDay} onChange={(e) => {
                  const v = e.target.checked;
                  setIsMultiDay(v);
                  if (!v) setEndDate(startDate);
                }} />}
                label="Multi-day event?"
              />
            </Grid>

            <Grid size={{ xs: 12, md: isMultiDay ? 6 : 12 }}>
              <TextField
                label={isMultiDay ? "Start Date" : "Date"} type="date" fullWidth
                value={startDate} onChange={(e) => {
                  const v = e.target.value;
                  setStartDate(v);
                  if (!isMultiDay) setEndDate(v);
                }}
                InputLabelProps={{ shrink: true }}
                InputProps={{ endAdornment: <InputAdornment position="end"><CalendarMonthRoundedIcon className="text-slate-400" /></InputAdornment> }}
                error={!!errors.startDate} helperText={errors.startDate}
              />
            </Grid>
            {isMultiDay && (
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="End Date" type="date" fullWidth
                  value={endDate} onChange={(e) => setEndDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  InputProps={{ endAdornment: <InputAdornment position="end"><CalendarMonthRoundedIcon className="text-slate-400" /></InputAdornment> }}
                  error={!!errors.endDate} helperText={errors.endDate}
                />
              </Grid>
            )}

            <Grid size={{ xs: 12 }}>
              <Grid container spacing={3}>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TimePicker
                      label="Start time *" ampm minutesStep={1}
                      value={dayjs(`1970-01-01T${startTime}`)}
                      onChange={(val) => {
                        const newStart = val ? dayjs(val).second(0).format("HH:mm") : startTime;
                        setStartTime(newStart);
                        const next = computeEndFromStart(startDate, newStart, 2);
                        setEndDate(next.endDate);
                        setEndTime(next.endTime);
                      }}
                      slotProps={{ textField: { fullWidth: true, error: !!errors.startTime, helperText: errors.startTime } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TimePicker
                      label="End time *" ampm minutesStep={1}
                      value={dayjs(`1970-01-01T${endTime}`)}
                      onChange={(val) => {
                        const newEnd = val ? dayjs(val).second(0).format("HH:mm") : endTime;
                        setEndTime(newEnd);
                        if (startDate && endDate && startDate === endDate && newEnd <= startTime) {
                          setEndDate(dayjs(startDate).add(1, "day").format("YYYY-MM-DD"));
                        }
                      }}
                      slotProps={{ textField: { fullWidth: true, error: !!errors.endTime, helperText: errors.endTime } }}
                    />
                  </Grid>
                </LocalizationProvider>

                <Grid size={{ xs: 12, md: 4 }}>
                  <Autocomplete
                    fullWidth
                    options={timezoneOptions}
                    value={timezone}
                    onChange={(_, newVal) => setTimezone(newVal || getBrowserTimezone())}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Event Timezone"
                        helperText="Times are saved in this timezone."
                      />
                    )}
                  />
                </Grid>
              </Grid>
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
function AdminEventCard({
  ev,
  onHost,
  isHosting,
  onJoinLive,
  isJoining,
  isOwner,
  onEdit,
  reg,
  onUnregistered,
  onCancelRequested,
}) {
  const navigate = useNavigate();

  const status = computeStatus(ev);
  const chip = statusChip(status);

  // Staff side status helpers
  const isPast = status === "past" || ev.status === "ended";
  const isLive = status === "live" && ev.status !== "ended";

  // ✅ allow staff to join up to 15 minutes before the start time
  const isWithinEarlyJoinWindow = canJoinEarly(ev, 15);

  // If event is live OR within early-join window, show enabled Join button
  const canShowActiveJoin = isLive || isWithinEarlyJoinWindow;

  const handleOpenDetails = () => {
    if (!ev?.id) return;
    navigate(`/admin/events/${ev.id}`, { state: { event: ev } });
  };

  return (
    <Paper
      elevation={0}
      className="h-full flex flex-col rounded-2xl border border-slate-200 overflow-hidden"
      onClick={handleOpenDetails}
      sx={{ cursor: "pointer" }}
    >
      {/* Top image area */}
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

        {isOwner && (
          <IconButton
            size="small"
            aria-label="Edit event"
            onClick={(e) => {
              e.stopPropagation();     // don’t open details
              onEdit?.(ev);
            }}
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              bgcolor: "rgba(15,23,42,0.75)",
              color: "common.white",
              "&:hover": {
                bgcolor: "rgba(15,23,42,0.95)",
              },
            }}
          >
            <EditNoteRoundedIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

      {/* Content */}
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
          title={`${fmtDateRange(ev.start_time, ev.end_time)}${ev.location ? ` • ${ev.location}` : ""}`}
        >
          {fmtDateRange(ev.start_time, ev.end_time)}
          {ev.location ? ` • ${ev.location}` : ""}
        </p>

        {/* Actions – stop click bubbling so buttons don't trigger card navigation */}
        <Box
          className="mt-auto pt-1 flex gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          {isOwner ? (
            <>
              {/* OWNER: Buttons row */}
              {isPast ? (
                <>
                  {ev.recording_url ? (
                    // Event ended & recording available → Watch Recording
                    <Button
                      component="a"
                      href={ev.recording_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="contained"
                      className="rounded-xl flex-1"
                      sx={{
                        textTransform: "none",
                        backgroundColor: "#10b8a6",
                        "&:hover": { backgroundColor: "#0ea5a4" },
                        minWidth: 0,
                        px: 1,
                      }}
                    >
                      <Box component="span" sx={{ display: { xs: "none", lg: "inline" }, whiteSpace: "nowrap" }}>
                        Watch
                      </Box>
                      <Box component="span" sx={{ display: { xs: "inline", lg: "none" } }}>
                        Watch
                      </Box>
                    </Button>
                  ) : (
                    // Event ended, no recording → disabled Event Ended
                    <Button
                      disabled
                      variant="contained"
                      className="rounded-xl flex-1"
                      sx={{
                        textTransform: "none",
                        backgroundColor: "#CBD5E1",
                        minWidth: 0,
                        px: 1,
                      }}
                    >
                      <Box component="span" sx={{ display: { xs: "none", lg: "inline" }, whiteSpace: "nowrap" }}>
                        Ended
                      </Box>
                      <Box component="span" sx={{ display: { xs: "inline", lg: "none" } }}>
                        Ended
                      </Box>
                    </Button>
                  )}

                  {/* Past -> View Details (Recording Details Page) */}
                  <Button
                    component={Link}
                    to={`/admin/recordings/${ev.id}`}
                    state={{ from: "admin" }}
                    variant="outlined"
                    className="rounded-xl flex-1"
                    sx={{
                      textTransform: "none",
                      minWidth: 0,
                      px: 1,
                      borderColor: "#cbd5e1",
                      color: "#475569",
                      "&:hover": { borderColor: "#94a3b8", backgroundColor: "#f8fafc" },
                    }}
                  >
                    Details
                  </Button>
                </>
              ) : (
                <>
                  {/* Upcoming / Live → Host Now */}
                  <Button
                    onClick={() => onHost(ev)}
                    startIcon={<LiveTvRoundedIcon />}
                    variant="contained"
                    className="rounded-xl flex-1"
                    sx={{
                      textTransform: "none",
                      backgroundColor: "#10b8a6",
                      "&:hover": { backgroundColor: "#0ea5a4" },
                      minWidth: 0,
                      px: 1,
                    }}
                    disabled={isHosting}
                  >
                    {isHosting ? (
                      <span className="flex items-center gap-2">
                        <CircularProgress size={18} />
                      </span>
                    ) : (
                      <Box component="span" sx={{ whiteSpace: "nowrap" }}>
                        Host
                      </Box>
                    )}
                  </Button>

                  {/* Upcoming/Live → View Details (Event Manage) */}
                  <Button
                    component={Link}
                    to={`/admin/events/${ev.id}`}
                    state={{ event: ev }}
                    variant="outlined"
                    className="rounded-xl flex-1"
                    sx={{
                      textTransform: "none",
                      minWidth: 0,
                      px: 1,
                      borderColor: "#cbd5e1",
                      color: "#475569",
                      "&:hover": { borderColor: "#94a3b8", backgroundColor: "#f8fafc" },
                    }}
                  >
                    Details
                  </Button>
                </>
              )}
            </>
          ) : (
            <>
              {/* STAFF: single full-width button */}
              {canShowActiveJoin ? (
                // Live OR within 15 min before start → Join
                <Button
                  onClick={() => onJoinLive?.(ev)}
                  variant="contained"
                  className="rounded-xl"
                  fullWidth
                  sx={{
                    textTransform: "none",
                    backgroundColor: "#10b8a6",
                    "&:hover": { backgroundColor: "#0ea5a4" },
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
                    <>
                      <Box
                        component="span"
                        sx={{ display: { xs: "none", lg: "inline" } }}
                      >
                        {isLive ? "Join Live" : "Join"}
                      </Box>
                      <Box
                        component="span"
                        sx={{ display: { xs: "inline", lg: "none" } }}
                      >
                        {isLive ? "Live" : "Join"}
                      </Box>
                    </>
                  )}
                </Button>
              ) : isPast && ev.recording_url ? (
                // Ended + recording → Watch Recording
                <Button
                  component="a"
                  href={ev.recording_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="contained"
                  className="rounded-xl"
                  fullWidth
                  sx={{
                    textTransform: "none",
                    backgroundColor: "#10b8a6",
                    "&:hover": { backgroundColor: "#0ea5a4" },
                  }}
                >
                  <Box
                    component="span"
                    sx={{ display: { xs: "none", lg: "inline" } }}
                  >
                    Watch Recording
                  </Box>
                  <Box
                    component="span"
                    sx={{ display: { xs: "inline", lg: "none" } }}
                  >
                    Watch
                  </Box>
                </Button>
              ) : isPast && !ev.recording_url ? (
                // Ended, no recording → disabled Event Ended
                <Button
                  disabled
                  variant="contained"
                  className="rounded-xl"
                  fullWidth
                  sx={{
                    textTransform: "none",
                    backgroundColor: "#CBD5E1",
                  }}
                >
                  <Box
                    component="span"
                    sx={{ display: { xs: "none", lg: "inline" } }}
                  >
                    Event Ended
                  </Box>
                  <Box
                    component="span"
                    sx={{ display: { xs: "inline", lg: "none" } }}
                  >
                    Ended
                  </Box>
                </Button>
              ) : (
                // Upcoming but more than 15 min away → disabled Join
                <Button
                  disabled
                  variant="contained"
                  className="rounded-xl"
                  fullWidth
                  sx={{
                    textTransform: "none",
                    backgroundColor: "#CBD5E1",
                  }}
                >
                  <Box
                    component="span"
                    sx={{ display: { xs: "none", lg: "inline" } }}
                  >
                    Join (Not Live Yet)
                  </Box>
                  <Box
                    component="span"
                    sx={{ display: { xs: "inline", lg: "none" } }}
                  >
                    Not Live
                  </Box>
                </Button>
              )}
            </>
          )}


          {/* Cancellation / Unregistration Actions (for Staff side) */}
          {!isOwner && !isPast && reg && (
            <RegisteredActions
              ev={ev}
              reg={reg}
              onUnregistered={onUnregistered}
              onCancelRequested={onCancelRequested}
              hideChip={true}
            />
          )}

        </Box >
      </Box >
    </Paper >
  );
}


function EventsPage() {
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

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [myRegistrations, setMyRegistrations] = useState({}); // ✅ Stores user's registration per event

  // Pagination & Filtering
  const PAGE_SIZE = 6;
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState(0); // 0=All, 1=Upcoming, 2=Live, 3=Past
  const [q, setQ] = useState("");
  const [refreshKey, setRefreshKey] = useState(0); // to force refetch

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  // Hosting/Joining
  const [hostingId, setHostingId] = useState(null);
  const [joiningId, setJoiningId] = useState(null);
  const [errOpen, setErrOpen] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  // Helpers
  const statusTabMap = { 1: "upcoming", 2: "live", 3: "past" };

  // Reset page on tab/search change
  useEffect(() => {
    setPage(1);
  }, [tab, q]);

  // Main Fetch Effect
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const fetchData = async () => {
      try {
        const headers = {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };

        // Determine endpoint
        // Owner/Admin -> /events/ (sees all)
        // Staff -> /events/mine/ (sees registered, with similar filters)
        // Note: Staff using /mine/ might not see events they created but didn't register for,
        // but this aligns with previous behavior of preferring /mine/ endpoint.
        const baseUrl = isOwner ? `${API_ROOT}/events/` : `${API_ROOT}/events/mine/`;

        const url = new URL(baseUrl);
        url.searchParams.set("limit", String(PAGE_SIZE));
        url.searchParams.set("offset", String((page - 1) * PAGE_SIZE));

        if (q.trim()) {
          url.searchParams.set("search", q.trim());
        }

        const bucket = statusTabMap[tab];
        if (bucket) {
          url.searchParams.set("bucket", bucket); // upcoming | live | past
        }

        // Ordering defaults
        // Upcoming -> start_time ascending (soonest first)
        // Past/Live/All -> start_time descending (newest/active first)
        if (bucket === "upcoming") {
          url.searchParams.set("ordering", "start_time");
        } else {
          url.searchParams.set("ordering", "-start_time");
        }

        const res = await fetch(url.toString(), { headers });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();

        if (!cancelled) {
          const results = Array.isArray(data?.results) ? data.results : [];
          const count = typeof data?.count === "number" ? data.count : 0;
          setEvents(results);
          setTotalCount(count);

          // 🔹 NEW: Fetch registrations for these events if not owner
          // (Owners don't register for their own events usually, but staff do)
          if (!isOwner && results.length > 0) {
            const newRegs = {};
            await Promise.all(results.map(async (ev) => {
              try {
                const regUrl = new URL(urlJoin(API_BASE, "/event-registrations/"));
                regUrl.searchParams.set("event", String(ev.id));
                const rRes = await fetch(regUrl.toString(), {
                  headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                  },
                });
                if (rRes.ok) {
                  const rData = await rRes.json();
                  const rList = asList(rData);
                  // user sees their own registration
                  if (rList.length > 0) {
                    newRegs[ev.id] = rList[0];
                  }
                }
              } catch (e) {
                // ignore
              }
            }));
            if (!cancelled) {
              setMyRegistrations(newRegs);
            }
          }

          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          console.error("Fetch failed", e);
          setEvents([]);
          setTotalCount(0);
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [page, tab, q, isOwner, token, refreshKey]);

  // Actions
  const onHost = async (ev) => {
    if (!ev?.id) return;
    setHostingId(ev.id);
    try {
      const livePath = `/live/${ev.slug || ev.id}?id=${ev.id}&role=publisher`;
      window.open(livePath, "_blank");
    } catch (e) {
      setErrMsg(e?.message || "Unable to start live meeting.");
      setErrOpen(true);
    } finally {
      setHostingId(null);
    }
  };

  const handleJoinLive = async (ev) => {
    if (!ev?.id) return;
    setJoiningId(ev.id);
    try {
      const livePath = `/live/${ev.slug || ev.id}?id=${ev.id}&role=audience`;
      navigate(livePath, { state: { event: ev } });
    } catch (e) {
      setErrMsg(e?.message || "Unable to join live.");
      setErrOpen(true);
    } finally {
      setJoiningId(null);
    }
  };

  const handleEditEvent = (ev) => {
    setEditingEvent(ev);
    setEditOpen(true);
  };

  const handleEventUpdated = (updated) => {
    if (!updated) return;
    // Optimistic update in list
    setEvents((prev) => prev.map((e) => (e.id === updated.id ? { ...e, ...updated } : e)));
  };

  const onCreated = () => {
    // Reset to first page and reload to see new item
    setTab(0);
    setPage(1);
    setRefreshKey((k) => k + 1);
  };

  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <Container maxWidth="lg" disableGutters className="pt-6 pb-6 sm:pt-1 sm:pb-8">
      {/* Header */}
      <Box className="mb-4" sx={{ display: "flex", flexWrap: "wrap", alignItems: { xs: "flex-start", sm: "center" }, gap: 2 }}>
        <Avatar sx={{ bgcolor: "#0ea5a4" }}>{(user?.first_name || "A")[0].toUpperCase()}</Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h5" className="font-extrabold">Events</Typography>
          <Typography className="text-slate-500">Manage sessions you’ve created. Start hosting with one click.</Typography>
        </Box>
        {isOwnerUser() && (
          <Box sx={{ width: { xs: "100%", sm: "auto" } }}>
            <Button
              fullWidth
              onClick={() => setCreateOpen(true)}
              startIcon={<AddRoundedIcon />}
              variant="contained"
              className="rounded-xl"
              sx={{ textTransform: "none", backgroundColor: "#10b8a6", "&:hover": { backgroundColor: "#0ea5a4" } }}
            >
              Create Event
            </Button>
          </Box>
        )}
      </Box>

      {/* Tabs */}
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
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "stretch", sm: "center" }} className="mb-5">
        <TextField
          size="small"
          placeholder="Search your events…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          InputProps={{ startAdornment: <SearchRoundedIcon className="mr-2 text-slate-400" /> }}
          sx={{ width: { xs: "100%", sm: 360 } }}
        />
      </Stack>

      {/* Grid */}
      {loading ? (
        <Box sx={{ flexGrow: 1 }}>
          <Grid container spacing={{ xs: 2, md: 3 }} columns={{ xs: 4, sm: 12, md: 12 }}>
            {Array.from({ length: PAGE_SIZE }).map((_, idx) => (
              <Grid key={idx} size={{ xs: 4, sm: 4, md: 4 }}>
                <Paper elevation={0} className="h-full flex flex-col rounded-2xl border border-slate-200 overflow-hidden">
                  <Box sx={{ position: "relative", width: "100%", paddingTop: "56.25%" }}>
                    <Skeleton variant="rectangular" sx={{ position: "absolute", inset: 0 }} />
                  </Box>
                  <Box className="p-4 flex flex-col gap-2 flex-1">
                    <Box className="flex items-center justify-between gap-2">
                      <Skeleton variant="rounded" width={72} height={24} />
                      <Skeleton variant="text" width={60} height={18} />
                    </Box>
                    <Skeleton variant="text" width="80%" height={28} />
                    <Skeleton variant="text" width="60%" height={20} />
                    <Box className="mt-auto pt-1"><Skeleton variant="rounded" height={40} /></Box>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      ) : events.length === 0 ? (
        <Paper elevation={0} className="rounded-2xl border border-slate-200">
          <Box className="p-8 text-center">
            <Typography variant="h6" className="font-semibold text-slate-700">No events found</Typography>
            <p className="text-slate-500 mt-1">Try a different search{isOwner ? " or create a new event." : "."}</p>
            {isOwner && (
              <Button
                onClick={() => setCreateOpen(true)}
                className="mt-4 rounded-xl"
                sx={{ textTransform: "none", backgroundColor: "#10b8a6", "&:hover": { backgroundColor: "#0ea5a4" } }}
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
            <Grid container spacing={{ xs: 2, md: 3 }} columns={{ xs: 4, sm: 12, md: 12 }}>
              {events.map((ev) => (
                <Grid key={ev.id || ev.slug} size={{ xs: 4, sm: 4, md: 4 }}>
                  <AdminEventCard
                    ev={ev}
                    onHost={onHost}
                    isHosting={hostingId === (ev.id ?? null)}
                    onJoinLive={handleJoinLive}
                    isJoining={joiningId === (ev.id ?? null)}
                    isOwner={isOwner}
                    onEdit={handleEditEvent}
                    // ✅ Pass registration data & handlers
                    reg={myRegistrations[ev.id]}
                    onUnregistered={(eventId) => {
                      // Remove from local registration map
                      setMyRegistrations(prev => {
                        const next = { ...prev };
                        delete next[eventId];
                        return next;
                      });
                      // Remove from events list immediately (since this is "my events" view)
                      setEvents(prev => prev.filter(e => e.id !== eventId));
                      setTotalCount(prev => Math.max(0, prev - 1));

                      navigate("/admin/events");
                    }}
                    onCancelRequested={(eventId, updatedReg) => {
                      // Update local registration map
                      setMyRegistrations(prev => ({
                        ...prev,
                        [eventId]: updatedReg
                      }));
                    }}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* Pagination */}
          <Box className="mt-4 flex items-center justify-center">
            <Pagination
              count={pageCount}
              page={page}
              onChange={(_, p) => setPage(p)}
              color="primary"
              shape="rounded"
            />
          </Box>
        </>
      )}

      {/* Dialogs */}
      <Snackbar open={errOpen} autoHideDuration={6000} onClose={() => setErrOpen(false)}>
        <Alert onClose={() => setErrOpen(false)} severity="error" variant="filled" sx={{ width: "100%" }}>
          {errMsg || "Unable to host right now."}
        </Alert>
      </Snackbar>

      <CreateEventDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={onCreated}
      />

      <EditEventDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        event={editingEvent}
        onUpdated={(updated) => {
          handleEventUpdated(updated);
          setEditOpen(false);
        }}
      />
    </Container>
  );
}


export default function DashbAdminEventsoard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [active, setActive] = React.useState(
    new URLSearchParams(location.search).get("admin_tab") || "events"
  );
  const [mobileOpen, setMobileOpen] = React.useState(false); // optional for mobile
  React.useEffect(() => {
    const q = new URLSearchParams(location.search);
    const tab = q.get("admin_tab");

    if (tab) {
      setActive(tab);
    } else if (location.pathname.includes("name-requests")) {
      setActive("name-requests"); // ✅ Fixes Sidebar Highlight
    } else if (location.pathname.includes("resources")) {
      setActive("resources");
    } else if (location.pathname.includes("posts")) {
      setActive("posts");
    } else if (location.pathname.includes("groups")) {
      setActive("groups");
    } else if (location.pathname.includes("notifications")) {
      setActive("notifications");
    } else if (location.pathname.includes("settings")) {
      setActive("settings");
    } else {
      setActive("events");
    }
  }, [location.search, location.pathname]);

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
          <Grid size={{ xs: 12, md: 12 }}>
            {active === "events" ? (
              <EventsPage />
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
            ) : active === "name-requests" ? (
              <AdminNameRequestsPage />
            ) : (
              <AdminResources />
            )}
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
