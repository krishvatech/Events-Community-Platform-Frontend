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
import { getJoinButtonText, isPostEventLoungeOpen, isPreEventLoungeOpen } from "../utils/gracePeriodUtils";
import { useSecondTick } from "../utils/useGracePeriodTimer";
import ParticipantForm from "../components/ParticipantForm";
import ParticipantList from "../components/ParticipantList";
import RecordVoiceOverRoundedIcon from "@mui/icons-material/RecordVoiceOverRounded";
import SessionDialog from "../components/SessionDialog";
import SessionList from "../components/SessionList";
import { formatSessionTimeRange } from "../utils/timezoneUtils";
import {
  getToken,
  toAbs,
  getBrowserTimezone,
  TIMEZONE_OPTIONS,
  computeEndFromStart,
  toUTCISO,
  iso,
  getDefaultSchedule,
  roundToHour,
  COUNTRY_OPTIONS,
  getSelectedCountry,
  slugifyLocal,
  API_ROOT,
  API_ORIGIN
} from "../utils/eventUtils";
import EditEventForm from "../components/EditEventForm";


dayjs.extend(utc);
dayjs.extend(timezone);


const RAW = import.meta.env.VITE_API_BASE_URL || "";
const BASE = RAW.replace(/\/+$/, "");
// Helpers imported from eventUtils


// getToken imported from eventUtils

// --- Helpers ---
const fmtDateRange = (s, e) => {
  try {
    const start = dayjs(s);
    const end = dayjs(e);
    const sameDay = start.isSame(end, 'day');
    const left = start.format("MMM D, YYYY h:mm A");
    const right = end.format("h:mm A");
    return sameDay ? `${left} – ${right}` : `${left} → ${end.format("MMM D, YYYY h:mm A")}`;
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
// Schedule helpers imported from eventUtils



function CreateEventDialog({ open, onClose, onCreated, communityId = "1" }) {
  const token = getToken();

  // Event fields
  const [title, setTitle] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [slugStatus, setSlugStatus] = React.useState({ checking: false, available: null });
  const [description, setDescription] = React.useState("");
  const [location, setLocation] = React.useState("Germany");
  const [category, setCategory] = React.useState("Workshop");
  const [format, setFormat] = React.useState("virtual");
  const [price, setPrice] = React.useState();
  const [isFree, setIsFree] = React.useState(true);
  const [maxParticipants, setMaxParticipants] = React.useState(""); // New state

  const today = dayjs().format("YYYY-MM-DD");
  const defaultSchedule = React.useMemo(() => getDefaultSchedule(2), []);
  const [isMultiDay, setIsMultiDay] = React.useState(false);
  const [startDate, setStartDate] = React.useState(defaultSchedule.startDate);
  const [endDate, setEndDate] = React.useState(defaultSchedule.endDate);
  const [startTime, setStartTime] = React.useState(defaultSchedule.startTime);
  const [endTime, setEndTime] = React.useState(defaultSchedule.endTime);
  // Store single-day times to restore when toggling back
  const [singleDayStartTime] = React.useState(defaultSchedule.startTime);
  const [singleDayEndTime] = React.useState(defaultSchedule.endTime);
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
  const [waitingRoomGracePeriodMinutes, setWaitingRoomGracePeriodMinutes] = React.useState("0");

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

  // Participants
  const [participants, setParticipants] = React.useState([]);
  const [participantDialogOpen, setParticipantDialogOpen] = React.useState(false);
  const [editingParticipantIndex, setEditingParticipantIndex] = React.useState(null);

  // Sessions (for multi-day events)
  const [sessions, setSessions] = React.useState([]);
  const [sessionDialogOpen, setSessionDialogOpen] = React.useState(false);
  const [editingSessionIndex, setEditingSessionIndex] = React.useState(null);
  const [actualEventStartTime, setActualEventStartTime] = React.useState(null);
  const [actualEventEndTime, setActualEventEndTime] = React.useState(null);

  // 🔴 DEBUG: Wrapper to track startTime changes
  const originalSetStartTime = setStartTime;
  const debugSetStartTime = (val) => {
    console.log("🔴 setStartTime being called with:", {
      newValue: val,
      currentValue: startTime,
      sessionsLength: sessions.length,
      stack: new Error().stack
    });
    originalSetStartTime(val);
  };
  // Override setStartTime with debug version for debugging (comment out in production)
  // const setStartTime = debugSetStartTime;

  // Helpers imported from eventUtils

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

  // 🔴 DEBUG: Log when sessions array changes
  React.useEffect(() => {
    console.log("🔴 sessions array changed. Current state:", {
      sessions: sessions.map(s => ({ title: s.title, _startTime: s._startTime, _endTime: s._endTime })),
      formStartTime: startTime,
      formEndTime: endTime,
    });
  }, [sessions]);

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
    setIsFree(true);
    setMaxParticipants(""); // Reset max participants

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

    // Participants
    setParticipants([]);
    setParticipantDialogOpen(false);
    setEditingParticipantIndex(null);

    // Sessions
    setSessions([]);
    setSessionDialogOpen(false);
    setEditingSessionIndex(null);
    setActualEventStartTime(null);
    setActualEventEndTime(null);

    setErrors({});
  };

  const validate = () => {
    const e = {};
    if (!title.trim()) e.title = "Required";
    if (!slug.trim()) e.slug = "Required";
    else if (slugStatus.checking) e.slug = "Checking slug availability. Please wait.";
    else if (slugStatus.available === false) e.slug = "This slug is already taken.";
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

  React.useEffect(() => {
    const candidate = String(slug || "").trim();
    if (!candidate) {
      setSlugStatus({ checking: false, available: null });
      return;
    }

    const controller = new AbortController();
    setSlugStatus({ checking: true, available: null });

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_ROOT}/events/slug-availability/?slug=${encodeURIComponent(candidate)}`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            signal: controller.signal,
          }
        );
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setSlugStatus({ checking: false, available: null });
          return;
        }
        setSlugStatus({ checking: false, available: Boolean(json?.available) });
      } catch (err) {
        if (err?.name !== "AbortError") {
          setSlugStatus({ checking: false, available: null });
        }
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [slug, token]);

  const submit = async () => {
    if (!validate()) return;
    setSubmitting(true);

    // 🔴 DEBUG: Log sessions state at submission time
    console.log("🚨 AT FORM SUBMISSION - Sessions state:", {
      isMultiDay,
      sessionsCount: sessions.length,
      sessions: sessions.map(s => ({
        title: s.title,
        _startDate: s._startDate,
        startTime: s.startTime,
        endTime: s.endTime,
      })),
    });

    // 🔴 CRITICAL FIX: Create immutable string copies IMMEDIATELY
    // This prevents any async state changes from affecting our values
    const safeStartDate = String(startDate);
    const safeStartTime = String(startTime);
    const safeEndDate = String(endDate);
    const safeEndTime = String(endTime);
    const safeTimezone = String(timezone);

    console.log("🔴 SAFE COPIES CREATED (immutable):", {
      safeStartDate, safeStartTime, safeEndDate, safeEndTime, safeTimezone
    });

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
    if (maxParticipants) {
      fd.append("max_participants", String(maxParticipants));
    } else {
      fd.append("max_participants", ""); // Send empty string to clear/set null
    }
    fd.append("is_multi_day", String(isMultiDay));
    fd.append("timezone", safeTimezone);

    // DEBUG: Log exact state values before conversion
    const startISO = toUTCISO(safeStartDate, safeStartTime, safeTimezone);
    const endISO = toUTCISO(safeEndDate, safeEndTime, safeTimezone);
    console.log("🔍 Form Submission Debug - Using SAFE values:", {
      safeStartDate,
      safeStartTime,
      safeEndDate,
      safeEndTime,
      safeTimezone,
      startISO,
      endISO,
    });

    fd.append("start_time", startISO);
    fd.append("end_time", endISO);
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
    fd.append("waiting_room_grace_period_minutes", String(waitingRoomGracePeriodMinutes || "0"));
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

    // Add participants if any
    if (participants.length > 0) {
      const participantsData = participants.map((p, idx) => ({
        type: p.participantType,
        user_id: p.participantType === "staff" ? p.userId : undefined,
        role: p.role,
        name: p.participantType === "guest" ? p.guestName : undefined,
        email: p.participantType === "guest" ? p.guestEmail : undefined,
        bio: p.bio || "",
        display_order: idx,
        client_index: idx,
      }));

      console.log("Sending participants data:", participantsData); // Debug log

      // Backend expects JSON string for nested array
      fd.append("participants", JSON.stringify(participantsData));

      participants.forEach((p, idx) => {
        if (p?.imageFile) {
          fd.append(`participant_image_${idx}`, p.imageFile, p.imageFile.name || `participant_${idx}.jpg`);
        }
      });
    }

    // Add sessions_input for multi-day events (atomic with event creation)
    // 🚨 CRITICAL: Check for mismatch between isMultiDay flag and sessions data
    if (sessions.length > 0 && !isMultiDay) {
      console.warn(
        "⚠️ WARNING: Sessions exist but isMultiDay is FALSE!",
        { sessionsCount: sessions.length, isMultiDay },
        "This may cause sessions to not be saved. Did you toggle Multi-Day OFF after adding sessions?"
      );
    }

    console.log("🔍 Sessions condition check:", {
      isMultiDay,
      "sessions.length": sessions.length,
      "isMultiDay && sessions.length > 0": isMultiDay && sessions.length > 0,
    });

    if (isMultiDay && sessions.length > 0) {
      console.log("✅ Condition TRUE - Processing sessions");
      const sessionsData = sessions.map((s, idx) => {
        // SessionDialog returns data with both ISO fields (startTime, endTime) and display fields (_startDate, _startTime, _endDate, _endTime)
        // Use the ISO fields directly since they're already timezone-converted
        return {
          title: s.title,
          description: s.description || "",
          session_type: s.sessionType || "main",
          session_date: s._startDate,  // Use display field for session_date
          start_time: s.startTime,     // Already ISO from SessionDialog
          end_time: s.endTime,         // Already ISO from SessionDialog
          display_order: idx,
          use_parent_meeting: true,
        };
      });

      console.log("Sending sessions_input data:", sessionsData);
      console.log("Sessions being sent:", {
        count: sessionsData.length,
        sessions: sessionsData.map(s => ({
          title: s.title,
          session_date: s.session_date,
          start_time: s.start_time,
          end_time: s.end_time,
        })),
      });
      const sessionsJSON = JSON.stringify(sessionsData);
      fd.append("sessions_input", sessionsJSON);
      console.log("📤 sessions_input JSON appended to FormData:", sessionsJSON);
    } else {
      console.log("❌ Condition FALSE - Not processing sessions");
    }

    try {
      // DEBUG: Log FormData contents before sending to backend
      console.log("🚀 FINAL FormData being sent to backend:", {
        start_time_value: fd.get("start_time"),
        end_time_value: fd.get("end_time"),
        title: fd.get("title"),
        timezone: fd.get("timezone"),
        sessions_input_present: fd.get("sessions_input") ? "✅ YES" : "❌ NO",
        safe_startDate: safeStartDate,
        safe_startTime: safeStartTime,
        safe_endDate: safeEndDate,
        safe_endTime: safeEndTime,
      });

      const res = await fetch(`${API_ROOT}/events/`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: fd,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error("Request error response:", json); // Log full error to console
        // Handle session-specific validation errors
        if (json?.sessions_input && Array.isArray(json.sessions_input)) {
          const sessionErrors = json.sessions_input.join("; ");
          throw new Error(`Sessions validation failed: ${sessionErrors}`);
        }
        const msg =
          json?.detail ||
          Object.entries(json)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
            .join(" | ") ||
          `HTTP ${res.status}`;
        throw new Error(msg);
      }

      const eventId = json.id;

      // Store actual event times from database for session validation
      setActualEventStartTime(json.start_time);
      setActualEventEndTime(json.end_time);

      // Log event and sessions created atomically
      console.log("Event created with sessions (atomic):", {
        eventId: json.id,
        startTime: json.start_time,
        endTime: json.end_time,
        timezone: json.timezone,
        sessionsCount: json.sessions?.length || 0,
      });

      onCreated?.(json);
      const msg = isMultiDay && sessions.length > 0
        ? `Event created with ${sessions.length} session(s). Resources attached.`
        : "Event created. Resources attached.";
      setToast({ open: true, type: "success", msg });

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
              placeholder="Enter event name"
              InputLabelProps={{ shrink: true }}
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
            placeholder="Enter event description..."
            InputLabelProps={{ shrink: true }}
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
            label="Slug *"
            placeholder="enter-event-slug"
            InputLabelProps={{ shrink: true }}
            value={slug}
            onChange={(e) => {
              setSlug(slugifyLocal(e.target.value));
              setErrors((prev) => ({ ...prev, slug: "" }));
            }}
            fullWidth
            error={!!errors.slug || slugStatus.available === false}
            helperText={
              errors.slug ||
              (slugStatus.checking
                ? "Checking slug availability..."
                : slugStatus.available === true
                  ? "Slug is available."
                  : slugStatus.available === false
                    ? "This slug is already taken."
                    : "Use lowercase letters, numbers, and hyphens.")
            }
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
              placeholder="Enter location (City, Country)"
              InputLabelProps={{ shrink: true }}
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

        {/* Row 2: Free Event & Price */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Free Event Checkbox */}
          <Grid item xs={12} sm={4} sx={{ display: "flex", alignItems: "center", justifyContent: "flex-start" }}>
            <FormControlLabel
              control={<Switch checked={isFree} onChange={(e) => setIsFree(e.target.checked)} />}
              label="Free Event"
              sx={{ width: "100%", m: 0 }}
            />
          </Grid>
          {/* Price Field */}
          <Grid item xs={12} sm={4}>
            <TextField
              label="Price ($)"
              placeholder="0.00"
              InputLabelProps={{ shrink: true }}
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
          {/* Max Participants Field */}
          <Grid item xs={12} sm={4}>
            <TextField
              label="Max Participants"
              placeholder="e.g., 100"
              InputLabelProps={{ shrink: true }}
              type="number"
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(e.target.value)}
              inputProps={{ min: 1, step: 1 }}
              fullWidth
              helperText="Leave empty for unlimited"
            />
          </Grid>
        </Grid>

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
        <TextField
          label="Grace Period (minutes)"
          type="number"
          inputProps={{ min: "0", max: "1440", step: "1" }}
          value={waitingRoomGracePeriodMinutes}
          onChange={(e) => setWaitingRoomGracePeriodMinutes(e.target.value)}
          disabled={!waitingRoomEnabled}
          fullWidth
          size="small"
          sx={{ mt: 3 }}
          helperText="Minutes after event start during which participants can join directly without waiting room approval"
          InputProps={{
            endAdornment: <InputAdornment position="end">minutes</InputAdornment>,
          }}
        />

        {/* ===== Schedule ===== */}
        <Paper elevation={0} className="rounded-2xl border border-slate-200 p-4 mb-3">
          <Box className="flex items-center justify-between mb-3">
            <Typography variant="h6" className="font-semibold">Schedule</Typography>
            <FormControlLabel
              control={<Switch checked={isMultiDay} onChange={(e) => {
                const v = e.target.checked;
                setIsMultiDay(v);
                if (v) {
                  // If switching to Multi-Day, set Start Time to 10 minutes ahead of current time in selected timezone
                  // and End Time to 12:00 AM
                  try {
                    const currentTimeInTz = dayjs().tz(timezone || 'UTC');
                    const startTimeInTz = currentTimeInTz.add(10, 'minutes').second(0).millisecond(0);
                    const startTimeStr = startTimeInTz.format("HH:mm");
                    setStartTime(startTimeStr);
                    setEndTime("00:00");
                    console.log("🕐 Multi-Day toggle ON: Set Start Time to current time + 10 minutes", {
                      timezone,
                      currentTime: currentTimeInTz.format("YYYY-MM-DD HH:mm:ss"),
                      startTime: startTimeStr,
                      startTimeFullISO: startTimeInTz.format("YYYY-MM-DD HH:mm:ss"),
                    });
                  } catch (error) {
                    console.error("❌ Error calculating start time:", error);
                    // Fallback to current local time if timezone calculation fails
                    const currentTime = dayjs().add(10, 'minutes').second(0).millisecond(0);
                    setStartTime(currentTime.format("HH:mm"));
                    setEndTime("00:00");
                  }
                } else {
                  // If switching to Single Day, restore original single-day times and force end date to equal start date
                  setStartTime(singleDayStartTime);
                  setEndTime(singleDayEndTime);
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
                  console.log("📅 Start Date Changed:", { previousStartDate: startDate, newStartDate: v, isMultiDay });
                  setStartDate(v);
                  if (!isMultiDay) {
                    // Single day: force end date same as start
                    setEndDate(v);
                  }
                  // Removed auto-calculation for multi-day to let user set times manually
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
                <TextField label="End Date" type="date" value={endDate} onChange={(e) => {
                  const v = e.target.value;
                  console.log("📅 End Date Changed:", { previousEndDate: endDate, newEndDate: v });
                  setEndDate(v);
                }} fullWidth
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
            {!isMultiDay && (
              <>
                <Grid item xs={12} md={4}>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <TimePicker
                      label="Start time *"
                      ampm
                      minutesStep={1}
                      disabled={isMultiDay}
                      value={dayjs(`1970-01-01T${startTime}`)}
                      onChange={(v) => {
                        const newStart = v ? dayjs(v).second(0).format("HH:mm") : startTime;
                        console.log("⏰ Start Time Changed:", {
                          dayjsValue: v ? dayjs(v).toString() : null,
                          previousStartTime: startTime,
                          newStartTime: newStart,
                          formatted: v ? dayjs(v).second(0).format("HH:mm") : "null"
                        });
                        console.trace("🔴 setStartTime STACK TRACE:");
                        setStartTime(newStart);
                        // Removed auto-calculation to let user set times manually
                      }}
                      slotProps={{ textField: { fullWidth: true } }} />
                  </LocalizationProvider>
                </Grid>
                <Grid item xs={12} md={4}>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <TimePicker
                      label="End time *"
                      ampm
                      minutesStep={1}
                      disabled={isMultiDay}
                      value={dayjs(`1970-01-01T${endTime}`)}
                      onChange={(v) => {
                        const newEnd = v ? dayjs(v).second(0).format("HH:mm") : endTime;
                        console.log("⏰ End Time Changed:", {
                          dayjsValue: v ? dayjs(v).toString() : null,
                          previousEndTime: endTime,
                          newEndTime: newEnd,
                          formatted: v ? dayjs(v).second(0).format("HH:mm") : "null"
                        });
                        setEndTime(newEnd);
                        // Removed auto-date-advancement logic to give user full control
                      }}
                      slotProps={{ textField: { fullWidth: true } }} />
                  </LocalizationProvider>
                </Grid>
              </>
            )}
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

        {/* ===== Sessions (Multi-Day Events) ===== */}
        {isMultiDay && (
          <Paper elevation={0} className="rounded-2xl border border-slate-200 p-4 mb-3">
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <CalendarMonthRoundedIcon color="action" />
                <Typography variant="h6" className="font-semibold">
                  Sessions
                </Typography>
              </Stack>
              <Button
                size="small"
                startIcon={<AddRoundedIcon />}
                onClick={() => {
                  setEditingSessionIndex(null);
                  setSessionDialogOpen(true);
                }}
                sx={{ backgroundColor: "#10b8a6", color: "white", "&:hover": { backgroundColor: "#0ea5a4" } }}
              >
                Add Session
              </Button>
            </Stack>

            <Typography variant="body2" color="text.secondary" mb={2}>
              Break your multi-day event into individual sessions
            </Typography>

            {sessions.length > 0 && (
              <Box mb={2}>
                <SessionList
                  sessions={sessions}
                  onEdit={(session, idx) => {
                    setEditingSessionIndex(idx);
                    setSessionDialogOpen(true);
                  }}
                  onDelete={(session, idx) => {
                    setSessions(prev => prev.filter((_, i) => i !== idx));
                    setToast({ open: true, type: "success", msg: "Session removed" });
                  }}
                />
              </Box>
            )}
          </Paper>
        )}

        {/* ===== Speakers & Hosts ===== */}
        <Paper elevation={0} className="rounded-2xl border border-slate-200 p-4 mb-3">
          <Stack direction="row" alignItems="center" spacing={1} mb={2}>
            <RecordVoiceOverRoundedIcon color="action" />
            <Typography variant="h6" className="font-semibold">
              Speakers & Hosts
            </Typography>
          </Stack>

          <Typography variant="body2" color="text.secondary" mb={2}>
            Add speakers, moderators, or hosts for this event
          </Typography>

          {participants.length > 0 && (
            <Box mb={2}>
              <ParticipantList
                participants={participants}
                onEdit={(p, idx) => {
                  setEditingParticipantIndex(idx);
                  setParticipantDialogOpen(true);
                }}
                onRemove={(p, idx) => {
                  setParticipants(prev => prev.filter((_, i) => i !== idx));
                  toast.success("Participant removed");
                }}
              />
            </Box>
          )}

          <Button
            variant="outlined"
            startIcon={<AddRoundedIcon />}
            onClick={() => {
              setEditingParticipantIndex(null);
              setParticipantDialogOpen(true);
            }}
            fullWidth
          >
            Add Participant
          </Button>
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
              <TextField
                label="Title"
                placeholder="Enter resource title"
                InputLabelProps={{ shrink: true }}
                value={resTitle}
                onChange={(e) => setResTitle(e.target.value)}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Description"
                placeholder="Enter resource description"
                InputLabelProps={{ shrink: true }}
                value={resDesc}
                onChange={(e) => setResDesc(e.target.value)}
                fullWidth
                multiline
                minRows={1}
              />
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

      {/* Participant Form Dialog */}
      <ParticipantForm
        open={participantDialogOpen}
        onClose={() => {
          setParticipantDialogOpen(false);
          setEditingParticipantIndex(null);
        }}
        onSubmit={(participantData) => {
          if (editingParticipantIndex !== null) {
            // Edit existing
            setParticipants(prev => prev.map((p, i) =>
              i === editingParticipantIndex ? participantData : p
            ));
            setToast({ open: true, type: "success", msg: "Participant updated" });
          } else {
            // Add new
            setParticipants(prev => [...prev, participantData]);
            setToast({ open: true, type: "success", msg: "Participant added" });
          }
          setParticipantDialogOpen(false);
          setEditingParticipantIndex(null);
        }}
        initialData={
          editingParticipantIndex !== null
            ? participants[editingParticipantIndex]
            : null
        }
        existingParticipants={participants}
      />

      {/* Session Dialog */}
      <SessionDialog
        open={sessionDialogOpen}
        onClose={() => {
          setSessionDialogOpen(false);
          setEditingSessionIndex(null);
        }}
        onSubmit={(sessionData) => {
          console.log("🟢 SessionDialog onSubmit called with sessionData:", {
            title: sessionData.title,
            _startTime: sessionData._startTime,
            _endTime: sessionData._endTime,
            startTime: sessionData.startTime,
            endTime: sessionData.endTime,
          });
          if (editingSessionIndex !== null) {
            // Edit existing
            setSessions(prev => prev.map((s, i) =>
              i === editingSessionIndex ? sessionData : s
            ));
            setToast({ open: true, type: "success", msg: "Session updated" });
          } else {
            // Add new
            console.log("🟢 Adding new session. Current startTime before setSessions:", startTime);
            setSessions(prev => {
              console.log("🟢 Inside setSessions callback. startTime is:", startTime);
              return [...prev, sessionData];
            });
            setToast({ open: true, type: "success", msg: "Session added" });
          }
          setSessionDialogOpen(false);
          setEditingSessionIndex(null);
        }}
        initialData={
          editingSessionIndex !== null
            ? sessions[editingSessionIndex]
            : null
        }
        eventStartTime={actualEventStartTime || toUTCISO(startDate, startTime, timezone)}
        eventEndTime={actualEventEndTime || toUTCISO(endDate, endTime, timezone)}
        timezone={timezone}
      />
    </Dialog>
  );
}





// Edit EditEventDialog
export function EditEventDialog({ open, onClose, event, onUpdated }) {
  // Simple wrapper around the new reusable form
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" PaperProps={{ className: "rounded-2xl" }}>
      <DialogContent sx={{ p: 0 }}>
        <EditEventForm
          event={event}
          onUpdated={(updated) => {
            onUpdated?.(updated);
            onClose?.();
          }}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
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
  const isPostEventLounge = isPostEventLoungeOpen(ev);
  const isPast = (status === "past" || ev.status === "ended") && !isPostEventLounge;
  const isLive = status === "live" && ev.status !== "ended";

  // ✅ allow staff to join up to 15 minutes before the start time
  const isWithinEarlyJoinWindow = canJoinEarly(ev, 15);
  const isPreEventLounge = isPreEventLoungeOpen(ev);

  // If event is live OR within early-join window OR pre-event lounge, show enabled Join button
  const canShowActiveJoin = isLive || isWithinEarlyJoinWindow || isPreEventLounge || isPostEventLounge;
  const joinLabel = getJoinButtonText(ev, isLive, false);
  const joinLabelShort =
    joinLabel === "Join Waiting Room"
      ? "Waiting Room"
      : joinLabel === "Join Social Lounge"
        ? "Lounge"
        : joinLabel.split(" ")[0];

  // Timezone logic
  const organizerTimezone = ev.timezone;
  const timeFormat = "h:mm A";
  const dateFormat = "MMM D, YYYY";

  const orgStartObj = (ev.start_time && organizerTimezone) ? dayjs(ev.start_time).tz(organizerTimezone) : dayjs(ev.start_time);
  const orgEndObj = (ev.end_time && organizerTimezone) ? dayjs(ev.end_time).tz(organizerTimezone) : dayjs(ev.end_time);
  const orgDateStr = orgStartObj.format(dateFormat);
  const orgTimeRangeKey = `${orgStartObj.format(timeFormat)} – ${orgEndObj.format(timeFormat)}`;

  const localStartObj = dayjs(ev.start_time).local();
  const localEndObj = dayjs(ev.end_time).local();
  const localDateStr = localStartObj.format(dateFormat);
  const localTimeRangeKey = `${localStartObj.format(timeFormat)} – ${localEndObj.format(timeFormat)}`;

  const userTimezoneName = dayjs.tz.guess();
  const timesDiffer = (orgTimeRangeKey !== localTimeRangeKey) || (orgDateStr !== localDateStr);
  // Check both format fields just in case
  const isVirtual = ev.format === 'virtual' || ev.event_format === 'virtual';
  const showYourTime = isVirtual && organizerTimezone && timesDiffer;

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

        <div className="text-sm text-slate-500">
          {(() => {
            // DEBUG: Log event data
            console.log(`[AdminEventCard Debug] Event "${ev.title}":`, {
              is_multi_day: ev.is_multi_day,
              sessions_present: !!ev.sessions,
              sessions_count: ev.sessions?.length || 0,
              timezone: organizerTimezone,
            });

            // For multi-day events with sessions, show only the next upcoming session
            if (ev.is_multi_day && ev.sessions && ev.sessions.length > 0) {
              return (
                <div>
                  {/* Show location */}
                  <span className="block font-medium text-slate-900 mb-1">
                    {ev.location || "Virtual"}
                  </span>

                  {/* Show next upcoming session with timezone handling */}
                  {(() => {
                    // Find next upcoming session
                    const now = new Date();
                    const nextSession = ev.sessions?.find(s => new Date(s.end_time) > now);

                    if (!nextSession) {
                      return (
                        <span className="block text-xs text-neutral-600">
                          All sessions completed
                        </span>
                      );
                    }

                    const sessionTimeRange = formatSessionTimeRange(
                      nextSession.start_time,
                      nextSession.end_time,
                      organizerTimezone
                    );

                    return (
                      <>
                        {/* Primary: Organizer Time */}
                        <span className="block text-xs font-medium text-slate-900" style={{ lineHeight: 1.4 }}>
                          {sessionTimeRange.primary}
                        </span>

                        {/* Secondary: Your Time */}
                        {sessionTimeRange.secondary && (
                          <span className="block mt-1 text-xs text-neutral-600">
                            <span className="font-semibold text-teal-700">Your Time:</span>{" "}
                            {sessionTimeRange.secondary.label.replace('Your Time: ', '')}
                            <span className="text-neutral-400 ml-1">({sessionTimeRange.secondary.timezone})</span>
                          </span>
                        )}
                      </>
                    );
                  })()}
                </div>
              );
            }

            // Single-day events
            return (
              <>
                {/* Primary: Organizer Time + Location (for single-day events) */}
                <span className="block font-medium text-slate-900">
                  {orgDateStr} {orgTimeRangeKey} • {ev.location || "Virtual"}
                </span>

                {/* Secondary: Your Time */}
                {showYourTime && (
                  <span className="block mt-1.5 text-xs text-neutral-600">
                    <span className="font-semibold text-teal-700">Your Time:</span>{" "}
                    {localDateStr} {localTimeRangeKey}
                    <span className="text-neutral-400 ml-1">({userTimezoneName})</span>
                  </span>
                )}
              </>
            );
          })()}
        </div>

        {/* Actions – stop click bubbling so buttons don't trigger card navigation */}
        <Box
          className="mt-auto pt-1 flex gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          {isOwner ? (
            <>
              {/* OWNER: Buttons row */}
              {isPostEventLounge ? (
                <>
                  <Button
                    onClick={() => onJoinLive?.(ev)}
                    variant="contained"
                    className="rounded-xl flex-1"
                    sx={{
                      textTransform: "none",
                      backgroundColor: "#10b8a6",
                      "&:hover": { backgroundColor: "#0ea5a4" },
                      minWidth: 0,
                      px: 1,
                    }}
                    disabled={isJoining}
                  >
                    {isJoining ? (
                      <span className="flex items-center gap-2">
                        <CircularProgress size={18} />
                      </span>
                    ) : (
                      <Box component="span" sx={{ whiteSpace: "nowrap" }}>
                        {joinLabel}
                      </Box>
                    )}
                  </Button>

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
              ) : isPast ? (
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
                        {joinLabel}
                      </Box>
                      <Box
                        component="span"
                        sx={{ display: { xs: "inline", lg: "none" } }}
                      >
                        {joinLabelShort}
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
          {!isOwner && reg && (
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

  // Force re-render every second to keep join button text current
  useSecondTick();

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
      const isPreEventLounge = isPreEventLoungeOpen(ev);
      const isPostEventLounge = isPostEventLoungeOpen(ev);
      const livePath = `/live/${ev.slug || ev.id}?id=${ev.id}&role=audience`;
      navigate(livePath, { state: { event: ev, openLounge: isPreEventLounge || isPostEventLounge, preEventLounge: isPreEventLounge } });
    } catch (e) {
      setErrMsg(e?.message || "Unable to join live.");
      setErrOpen(true);
    } finally {
      setJoiningId(null);
    }
  };

  const handleEditEvent = async (ev) => {
    if (!ev?.id) return;

    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    try {
      const res = await fetch(`${API_ROOT}/events/${ev.id}/`, { headers });
      if (res.ok) {
        const detail = await res.json();
        setEditingEvent(detail);
      } else {
        setEditingEvent(ev);
      }
    } catch (e) {
      console.warn("Failed to fetch event details for edit dialog, using list payload.", e);
      setEditingEvent(ev);
    } finally {
      setEditOpen(true);
    }
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
