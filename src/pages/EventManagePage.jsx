// src/pages/EventManagePage.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import RegisteredActions from "../components/RegisteredActions";
import InviteUsersDialog from "../components/InviteUsersDialog";

import {
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Grid,
  CircularProgress,
  LinearProgress,
  Paper,
  Snackbar,
  Alert,
  Stack,
  Typography,
  Tabs,
  Tab,
  Drawer,
  TextField,
  InputAdornment,
  FormControl,
  Select,
  MenuItem,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Pagination,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Switch,
  FormControlLabel,
  Autocomplete,
} from "@mui/material";
import EditNoteRoundedIcon from "@mui/icons-material/EditNoteRounded";
import { EditEventDialog } from "./AdminEvents.jsx";
import ArrowBackIosNewRoundedIcon from "@mui/icons-material/ArrowBackIosNewRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import LiveTvRoundedIcon from "@mui/icons-material/LiveTvRounded";
import MovieRoundedIcon from "@mui/icons-material/MovieRounded";
import AttachFileRoundedIcon from "@mui/icons-material/AttachFileRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import VideoLibraryRoundedIcon from "@mui/icons-material/VideoLibraryRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ArrowDropDownRoundedIcon from "@mui/icons-material/ArrowDropDownRounded";
import FilterListRoundedIcon from "@mui/icons-material/FilterListRounded";
import AddIcon from "@mui/icons-material/Add";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import VerifiedIcon from "@mui/icons-material/Verified";
import PersonAddRoundedIcon from "@mui/icons-material/PersonAddRounded";

import { isOwnerUser, isStaffUser } from "../utils/adminRole.js"; // MOD: added isStaffUser

// ---- API helpers ----
const RAW = import.meta.env.VITE_API_BASE_URL || "";
const BASE = RAW.replace(/\/+$/, "");
const API_ROOT = BASE.endsWith("/api") ? BASE : `${BASE}/api`;
const API_ORIGIN = API_ROOT.replace(/\/api$/, "");

const getToken = () =>
  localStorage.getItem("access_token") ||
  localStorage.getItem("access") ||
  localStorage.getItem("access_token") ||
  "";

const toAbs = (u) => {
  if (!u) return u;
  if (/^https?:\/\//i.test(u)) return u;
  const p = u.startsWith("/") ? u : `/${u}`;
  return `${API_ORIGIN}${p}`;
};

const isVerifiedStatus = (raw) => {
  const v = String(raw || "").toLowerCase();
  return v === "approved" || v === "verified";
};

// ---- Status helpers ----
// ---- Status helpers ----
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone);

const computeStatus = (ev) => {
  if (!ev) return "upcoming";
  const now = Date.now();
  const s = ev.start_time ? dayjs(ev.start_time).valueOf() : 0;
  const e = ev.end_time ? dayjs(ev.end_time).valueOf() : 0;

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
      return { label: "Live", color: "error", bg: "rgba(248,113,113,0.12)" };
    case "upcoming":
      return { label: "Upcoming", color: "success", bg: "rgba(34,197,94,0.08)" };
    case "past":
      return { label: "Past", color: "default", bg: "rgba(148,163,184,0.16)" };
    default:
      return { label: "—", color: "default", bg: "rgba(148,163,184,0.16)" };
  }
};

const fmtDateRange = (start, end) => {
  if (!start && !end) return "Not scheduled";
  try {
    const s = dayjs(start);
    const e = dayjs(end);
    if (s.isValid() && e.isValid() && s.isSame(e, 'day')) {
      return `${s.format("MMM D, YYYY")} • ${s.format("h:mm A")} – ${e.format("h:mm A")}`;
    }
    if (s.isValid() && e.isValid()) {
      return `${s.format("MMM D, YYYY h:mm A")} → ${e.format("MMM D, YYYY h:mm A")}`;
    }
    if (s.isValid()) return s.format("MMM D, YYYY h:mm A");
    if (e.isValid()) return `Ends: ${e.format("MMM D, YYYY h:mm A")}`;
    return "Invalid date";
  } catch {
    return `${start || ""} – ${end || ""}`;
  }
};

// ---- Tabs / pagination ----
const EVENT_TAB_LABELS = ["Overview", "Registered Members", "Session", "Resources", "Breakout Rooms Tables", "Social Lounge", "Lounge Settings"];
const STAFF_EVENT_TAB_LABELS = ["Overview", "Resources", "Breakout Rooms Tables", "Social Lounge"];
const MEMBERS_PER_PAGE = 10;
const RESOURCES_PER_PAGE = 5;



export default function EventManagePage() {
  const { eventId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const initialEvent = location.state?.event || null;

  const [event, setEvent] = useState(initialEvent);
  const [eventLoading, setEventLoading] = useState(!initialEvent);
  const [eventError, setEventError] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState(null); // 'deregister' | 'approve' | 'reject'
  const [selectedReg, setSelectedReg] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [registrations, setRegistrations] = useState([]);
  const [registrationsLoading, setRegistrationsLoading] = useState(false);
  const [registrationsError, setRegistrationsError] = useState("");

  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState("");
  const [sessionEditOpen, setSessionEditOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionDeleteDialogOpen, setSessionDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [sessionActionLoading, setSessionActionLoading] = useState(false);

  // Add Session state
  const [addSessionOpen, setAddSessionOpen] = useState(false);
  const [newSessionData, setNewSessionData] = useState({
    title: "",
    description: "",
    session_date: "",
    start_time: "",
    end_time: "",
    session_type: "main",
  });
  const [addSessionLoading, setAddSessionLoading] = useState(false);

  const [tab, setTab] = useState(0);
  const [mobileTabsOpen, setMobileTabsOpen] = useState(false);

  const [memberSearch, setMemberSearch] = useState("");
  const [memberSort, setMemberSort] = useState("newest");
  const [memberPage, setMemberPage] = useState(1);

  const [resourceSearch, setResourceSearch] = useState("");
  const [resourceType, setResourceType] = useState("all");
  const [resourceSort, setResourceSort] = useState("newest");
  const [resourcePage, setResourcePage] = useState(1);

  const [loungeTables, setLoungeTables] = useState([]);
  const [loungeLoading, setLoungeLoading] = useState(false);
  const [loungeError, setLoungeError] = useState("");
  const [loungeCreateOpen, setLoungeCreateOpen] = useState(false);
  const [loungeCreateCategory, setLoungeCreateCategory] = useState("LOUNGE"); // 'LOUNGE' | 'BREAKOUT'
  const [loungeCreateName, setLoungeCreateName] = useState("Networking Table");
  const [loungeCreateSeats, setLoungeCreateSeats] = useState(4);
  const [loungeCreateSaving, setLoungeCreateSaving] = useState(false);
  const [loungeCreateIcon, setLoungeCreateIcon] = useState(null);
  const [loungeCreatePreview, setLoungeCreatePreview] = useState("");
  const [loungeEditOpen, setLoungeEditOpen] = useState(false);
  const [loungeEditTarget, setLoungeEditTarget] = useState(null);
  const [loungeEditName, setLoungeEditName] = useState("");
  const [loungeEditSeats, setLoungeEditSeats] = useState(4);
  const [loungeEditSaving, setLoungeEditSaving] = useState(false);
  const [loungeEditIcon, setLoungeEditIcon] = useState(null);
  const [loungeEditPreview, setLoungeEditPreview] = useState("");
  const [loungeDeleteOpen, setLoungeDeleteOpen] = useState(false);
  const [loungeDeleteTarget, setLoungeDeleteTarget] = useState(null);
  const [loungeDeleteSaving, setLoungeDeleteSaving] = useState(false);

  // Add Participant Dialog State
  const [addParticipantOpen, setAddParticipantOpen] = useState(false);
  const [addParticipantEmail, setAddParticipantEmail] = useState("");
  const [addParticipantLoading, setAddParticipantLoading] = useState(false);
  const [inviteUsersOpen, setInviteUsersOpen] = useState(false);
  const [regsRefresh, setRegsRefresh] = useState(0);

  // User Search State
  const [userOptions, setUserOptions] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // Lounge Settings State
  const [loungeSettingsSaving, setLoungeSettingsSaving] = useState(false);
  const [loungeSettings, setLoungeSettings] = useState({
    lounge_enabled_before: false,
    lounge_before_buffer: 30,
    lounge_enabled_during: true,
    lounge_enabled_breaks: false,
    lounge_enabled_after: false,
    lounge_after_buffer: 30,
  });

  // Participant Visibility Settings State
  const [visibilitySettingsSaving, setVisibilitySettingsSaving] = useState(false);
  const [participantVisibility, setParticipantVisibility] = useState({
    show_participants_before_event: true,
    show_participants_after_event: false,
  });

  const isOwner = isOwnerUser();
  const isStaff = isStaffUser();
  const canManageLounge = isOwner || isStaff;
  const [myReg, setMyReg] = useState(null); // New state for my registration
  const resources = event?.resources || [];
  const tabLabels = isOwner ? EVENT_TAB_LABELS : STAFF_EVENT_TAB_LABELS;

  // ---- load event ----
  useEffect(() => {
    if (!eventId) return;

    if (initialEvent && String(initialEvent.id) === String(eventId)) {
      setEvent(initialEvent);
      setEventLoading(false);
      return;
    }

    const controller = new AbortController();

    const load = async () => {
      setEventLoading(true);
      setEventError("");
      try {
        const token = getToken();
        const headers = {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };

        const res = await fetch(`${API_ROOT}/events/${eventId}/`, {
          headers,
          signal: controller.signal,
        });

        const json = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(json?.detail || `HTTP ${res.status}`);
        }
        setEvent(json);
      } catch (e) {
        if (e.name === "AbortError") return;
        setEventError(e?.message || "Unable to load event");
      } finally {
        setEventLoading(false);
      }
    };

    load();
    return () => controller.abort();
  }, [eventId, initialEvent]);

  // Sync lounge settings from event
  useEffect(() => {
    if (event) {
      setLoungeSettings({
        lounge_enabled_before: event.lounge_enabled_before ?? false,
        lounge_before_buffer: event.lounge_before_buffer ?? 30,
        lounge_enabled_during: event.lounge_enabled_during ?? true,
        lounge_enabled_breaks: event.lounge_enabled_breaks ?? false,
        lounge_enabled_after: event.lounge_enabled_after ?? false,
        lounge_after_buffer: event.lounge_after_buffer ?? 30,
      });
      setParticipantVisibility({
        show_participants_before_event: event.show_participants_before_event ?? true,
        show_participants_after_event: event.show_participants_after_event ?? false,
      });
    }
  }, [event]);

  // ---- load registrations (owner only) ----
  useEffect(() => {
    if (!eventId || !isOwner) return;

    const token = getToken();
    if (!token) return;

    const controller = new AbortController();

    const loadRegs = async () => {
      setRegistrationsLoading(true);
      setRegistrationsError("");
      try {
        const headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        };

        const res = await fetch(
          `${API_ROOT}/events/${eventId}/registrations/?limit=50`,
          { headers, signal: controller.signal }
        );
        const json = await res.json().catch(() => []);
        if (!res.ok) {
          throw new Error(json?.detail || `HTTP ${res.status}`);
        }

        let data = [];
        if (Array.isArray(json)) {
          data = json;
        } else if (json && Array.isArray(json.results)) {
          data = json.results;
        }

        setRegistrations(data);
      } catch (e) {
        if (e.name === "AbortError") return;
        setRegistrationsError(e?.message || "Unable to load members");
      } finally {
        setRegistrationsLoading(false);
      }
    };

    loadRegs();
    loadRegs();
    return () => controller.abort();
  }, [eventId, isOwner, regsRefresh]);

  // ---- load sessions (owner only, for multi-day events) ----
  useEffect(() => {
    if (!eventId || !isOwner) return;

    // Only fetch sessions if explicitly a multi-day event
    if (event && !event.is_multi_day) return;

    const token = getToken();
    const controller = new AbortController();

    const loadSessions = async () => {
      setSessionsLoading(true);
      setSessionsError("");
      try {
        const headers = {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };

        console.log("🔄 Fetching sessions for event:", eventId, "is_multi_day:", event?.is_multi_day);

        const res = await fetch(
          `${API_ROOT}/events/${eventId}/sessions/`,
          { headers, signal: controller.signal }
        );
        const json = await res.json().catch(() => []);

        console.log("📊 Sessions API response:", json, "status:", res.status);

        if (!res.ok) {
          throw new Error(json?.detail || `HTTP ${res.status}`);
        }

        let data = [];
        if (Array.isArray(json)) {
          data = json;
        } else if (json && Array.isArray(json.results)) {
          data = json.results;
        }

        console.log("✅ Sessions loaded:", data.length, "sessions");
        setSessions(data);
      } catch (e) {
        if (e.name === "AbortError") return;
        console.error("❌ Failed to load sessions:", e);
        setSessionsError(e?.message || "Unable to load sessions");
      } finally {
        setSessionsLoading(false);
      }
    };

    loadSessions();
    return () => controller.abort();
  }, [eventId, isOwner, event]);

  // ---- load MY registration (for staff/attendee view) ----
  useEffect(() => {
    if (!eventId || isOwner) return;

    const token = getToken();
    if (!token) return;

    const loadMyReg = async () => {
      try {
        // 1. Get my user ID
        let userId = null;
        try {
          const u = JSON.parse(localStorage.getItem("user"));
          userId = u?.id;
        } catch { }

        if (!userId) {
          const meRes = await fetch(`${API_ROOT}/users/me/`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (meRes.ok) {
            const me = await meRes.json();
            userId = me.id;
          }
        }
        if (!userId) return;

        // 2. Fetch registration for this event & user
        // Using filter ?event=X&user=Y
        const res = await fetch(
          `${API_ROOT}/event-registrations/?event=${eventId}&user=${userId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const json = await res.json();
        const list = Array.isArray(json) ? json : json.results || [];
        if (list.length > 0) {
          setMyReg(list[0]);
        }
      } catch (err) {
        console.error("Failed to load my registration", err);
      }
    };
    loadMyReg();
  }, [eventId, isOwner]);

  useEffect(() => {
    if (!loungeCreateIcon) {
      setLoungeCreatePreview("");
      return;
    }
    const previewUrl = URL.createObjectURL(loungeCreateIcon);
    setLoungeCreatePreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [loungeCreateIcon]);

  useEffect(() => {
    if (!loungeEditIcon) {
      setLoungeEditPreview("");
      return;
    }
    const previewUrl = URL.createObjectURL(loungeEditIcon);
    setLoungeEditPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [loungeEditIcon]);

  const clampSeats = useCallback((value) => Math.max(2, Math.min(30, value || 0)), []);

  const normalizeLoungeTables = useCallback(
    (tables) =>
      (Array.isArray(tables) ? tables : []).map((t) => ({
        ...t,
        icon_url: toAbs(t?.icon_url),
      })),
    []
  );

  const fetchLoungeTables = useCallback(async () => {
    if (!eventId || !canManageLounge) return;
    setLoungeLoading(true);
    setLoungeError("");
    try {
      const token = getToken();
      const res = await fetch(`${API_ROOT}/events/${eventId}/lounge-state/`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.detail || `HTTP ${res.status}`);
      }
      setLoungeTables(normalizeLoungeTables(json?.tables || []));
    } catch (e) {
      setLoungeError(e?.message || "Unable to load lounge tables");
    } finally {
      setLoungeLoading(false);
    }
  }, [eventId, canManageLounge, normalizeLoungeTables]);

  useEffect(() => {
    fetchLoungeTables();
  }, [fetchLoungeTables]);

  const handleCreateLoungeTable = async () => {
    const name = (loungeCreateName || "").trim();
    if (!name || !eventId || loungeCreateSaving) return;
    setLoungeCreateSaving(true);
    try {
      const token = getToken();
      const url = `${API_ROOT}/events/${eventId}/create-lounge-table/`;
      let res;
      const seatsValue = clampSeats(loungeCreateSeats);
      if (loungeCreateIcon) {
        const formData = new FormData();
        formData.append("name", name);
        formData.append("category", loungeCreateCategory);
        formData.append("max_seats", String(seatsValue));
        formData.append("icon", loungeCreateIcon);
        res = await fetch(url, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        });
      } else {
        res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ name, category: loungeCreateCategory, max_seats: seatsValue }),
        });
      }
      if (!res.ok) {
        const msg = await res.json().catch(() => ({}));
        throw new Error(msg?.detail || `HTTP ${res.status}`);
      }
      setLoungeCreateOpen(false);
      setLoungeCreateName("Networking Table");
      setLoungeCreateSeats(4);
      setLoungeCreateIcon(null);
      fetchLoungeTables();
    } catch (e) {
      setLoungeError(e?.message || "Failed to create lounge table");
    } finally {
      setLoungeCreateSaving(false);
    }
  };

  const handleOpenEditLoungeTable = (table) => {
    setLoungeEditTarget(table);
    setLoungeEditName(table?.name || "");
    setLoungeEditSeats(clampSeats(table?.max_seats || 4));
    setLoungeEditIcon(null);
    setLoungeEditPreview(table?.icon_url || "");
    setLoungeEditOpen(true);
  };

  const handleUpdateLoungeTable = async () => {
    if (!eventId || !loungeEditTarget || loungeEditSaving) return;
    const name = (loungeEditName || "").trim();
    if (!name) return;
    setLoungeEditSaving(true);
    try {
      const token = getToken();
      const url = `${API_ROOT}/events/${eventId}/lounge-table-update/`;
      let res;
      const seatsValue = clampSeats(loungeEditSeats);
      if (loungeEditIcon) {
        const formData = new FormData();
        formData.append("table_id", String(loungeEditTarget.id));
        formData.append("name", name);
        formData.append("max_seats", String(seatsValue));
        formData.append("icon", loungeEditIcon);
        res = await fetch(url, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        });
      } else {
        res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            table_id: loungeEditTarget.id,
            name,
            max_seats: seatsValue,
          }),
        });
      }
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.detail || `HTTP ${res.status}`);
      }
      setLoungeTables((prev) =>
        prev.map((t) =>
          String(t.id) === String(loungeEditTarget.id)
            ? {
              ...t,
              name: json.name || name,
              max_seats: json.max_seats || seatsValue,
              icon_url: toAbs(json.icon_url || t.icon_url),
            }
            : t
        )
      );
      setLoungeEditOpen(false);
    } catch (e) {
      setLoungeError(e?.message || "Failed to update lounge table");
    } finally {
      setLoungeEditSaving(false);
    }
  };

  const handleOpenDeleteLoungeTable = (table) => {
    setLoungeDeleteTarget(table);
    setLoungeDeleteOpen(true);
  };

  const handleDeleteLoungeTable = async () => {
    if (!eventId || !loungeDeleteTarget || loungeDeleteSaving) return;
    setLoungeDeleteSaving(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_ROOT}/events/${eventId}/lounge-table-delete/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ table_id: loungeDeleteTarget.id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.detail || `HTTP ${res.status}`);
      }
      setLoungeTables((prev) =>
        prev.filter((t) => String(t.id) !== String(loungeDeleteTarget.id))
      );
      setLoungeDeleteOpen(false);
      setLoungeDeleteTarget(null);
    } catch (e) {
      setLoungeError(e?.message || "Failed to delete lounge table");
    } finally {
      setLoungeDeleteSaving(false);
    }
  };

  // MOD: Handle Member Actions with Dialog
  const openDialog = (action, reg) => {
    setDialogAction(action);
    setSelectedReg(reg);
    setDialogOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!dialogAction || !selectedReg) return;
    setActionLoading(true);
    const token = getToken();

    try {
      let url = "";
      let method = "POST";

      if (dialogAction === "deregister") {
        url = `${API_ROOT}/event-registrations/${selectedReg.id}/`;
        method = "DELETE";
      } else if (dialogAction === "approve") {
        url = `${API_ROOT}/event-registrations/${selectedReg.id}/approve_cancellation/`;
      } else if (dialogAction === "reject") {
        url = `${API_ROOT}/event-registrations/${selectedReg.id}/reject_cancellation/`;
      }

      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Action failed");

      // Update local state
      if (dialogAction === "deregister") {
        setRegistrations((prev) => prev.filter((r) => r.id !== selectedReg.id));
      } else if (dialogAction === "approve") {
        setRegistrations((prev) =>
          prev.map((r) =>
            r.id === selectedReg.id ? { ...r, status: "cancelled" } : r
          )
        );
      } else if (dialogAction === "reject") {
        setRegistrations((prev) =>
          prev.map((r) =>
            r.id === selectedReg.id ? { ...r, status: "registered" } : r
          )
        );
      }
      setDialogOpen(false);
    } catch (e) {
      alert(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Debounced User Search
  useEffect(() => {
    if (!addParticipantOpen) return;

    const timer = setTimeout(async () => {
      if (!searchQuery || searchQuery.length < 2) {
        setUserOptions([]);
        return;
      }
      setSearchLoading(true);
      try {
        const token = getToken();
        // Use 'search' param as supported by SearchFilter
        const res = await fetch(`${API_ROOT}/users/?search=${encodeURIComponent(searchQuery)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          // json might be paginated { count: ..., results: ... } or array depending on config
          // DRF DefaultPagination returns { results: [...] }
          const results = Array.isArray(json) ? json : (json.results || []);
          setUserOptions(results);
        }
      } catch (err) {
        console.error("User search failed", err);
      } finally {
        setSearchLoading(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery, addParticipantOpen]);

  const handleAddParticipant = async () => {
    if (!eventId) return;

    // Validate: Need either a selected user OR a typed email
    const emailToUse = selectedUser ? selectedUser.email : addParticipantEmail;
    const userIdToUse = selectedUser ? selectedUser.id : null;

    if (!emailToUse && !userIdToUse) {
      toast.error("Please select a user or enter an email.");
      return;
    }

    setAddParticipantLoading(true);
    try {
      const token = getToken();
      const payload = {};
      if (userIdToUse) payload.user_id = userIdToUse;
      if (emailToUse) payload.email = emailToUse;

      const res = await fetch(`${API_ROOT}/events/${eventId}/add-participant/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || "Failed to add participant");

      toast.success("Participant added successfully");
      setAddParticipantOpen(false);
      setAddParticipantEmail("");
      setSelectedUser(null);
      setSearchQuery("");
      setUserOptions([]);
      setRegsRefresh(prev => prev + 1);
      refreshEvent();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setAddParticipantLoading(false);
    }
  };

  // ---- Refresh event after editing ----
  const refreshEvent = async () => {
    if (!eventId) return;
    try {
      const token = getToken();
      const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      const res = await fetch(`${API_ROOT}/events/${eventId}/`, { headers });
      const json = await res.json().catch(() => null);
      if (res.ok && json) {
        setEvent(json);
      }
    } catch (e) {
      console.error("Failed to refresh event:", e);
    }
  };

  // ---- derived values ----
  const status = useMemo(() => computeStatus(event || {}), [event]);
  const statusMeta = statusChip(status);
  const avatarLetter = (event?.title?.[0] || "E").toUpperCase();

  // ---- members filtering / paging ----
  useEffect(() => {
    setMemberPage(1);
  }, [memberSearch, memberSort]);

  const filteredMembers = useMemo(() => {
    let rows = registrations.slice();

    if (memberSearch.trim()) {
      const q = memberSearch.toLowerCase();
      rows = rows.filter((r) => {
        const name = (r.user_name || "").toLowerCase();
        const email = (r.user_email || "").toLowerCase();
        return name.includes(q) || email.includes(q);
      });
    }

    if (memberSort === "newest") {
      rows.sort((a, b) => {
        const da = a.registered_at ? new Date(a.registered_at).getTime() : 0;
        const db = b.registered_at ? new Date(b.registered_at).getTime() : 0;
        return db - da;
      });
    } else if (memberSort === "oldest") {
      rows.sort((a, b) => {
        const da = a.registered_at ? new Date(a.registered_at).getTime() : 0;
        const db = b.registered_at ? new Date(b.registered_at).getTime() : 0;
        return da - db;
      });
    }

    return rows;
  }, [registrations, memberSearch, memberSort]);

  const totalMembers = filteredMembers.length;
  const memberPageCount = Math.max(
    1,
    Math.ceil(totalMembers / MEMBERS_PER_PAGE || 1)
  );
  const memberStart = totalMembers === 0 ? 0 : (memberPage - 1) * MEMBERS_PER_PAGE + 1;
  const memberEnd = Math.min(
    memberPage * MEMBERS_PER_PAGE,
    totalMembers
  );
  const pagedMembers = filteredMembers.slice(
    (memberPage - 1) * MEMBERS_PER_PAGE,
    memberPage * MEMBERS_PER_PAGE
  );

  // ---- resources filtering / paging ----
  useEffect(() => {
    setResourcePage(1);
  }, [resourceSearch, resourceType, resourceSort]);

  const filteredResources = useMemo(() => {
    let rows = resources.slice();

    if (resourceSearch.trim()) {
      const q = resourceSearch.toLowerCase();
      rows = rows.filter((r) => {
        const title = (r.title || "").toLowerCase();
        const link = (r.link_url || "").toLowerCase();
        const video = (r.video_url || "").toLowerCase();
        const file = (r.file || "").toLowerCase();
        return title.includes(q) || link.includes(q) || video.includes(q) || file.includes(q);
      });
    }

    if (resourceType !== "all") {
      rows = rows.filter((r) => r.type === resourceType);
    }

    if (resourceSort === "newest") {
      rows.sort((a, b) => {
        const da = a.created_at ? new Date(a.created_at).getTime() : 0;
        const db = b.created_at ? new Date(b.created_at).getTime() : 0;
        return db - da;
      });
    } else if (resourceSort === "oldest") {
      rows.sort((a, b) => {
        const da = a.created_at ? new Date(a.created_at).getTime() : 0;
        const db = b.created_at ? new Date(b.created_at).getTime() : 0;
        return da - db;
      });
    }

    return rows;
  }, [resources, resourceSearch, resourceType, resourceSort]);

  const totalResources = filteredResources.length;
  const resourcePageCount = Math.max(
    1,
    Math.ceil(totalResources / RESOURCES_PER_PAGE || 1)
  );
  const resourceStart =
    totalResources === 0 ? 0 : (resourcePage - 1) * RESOURCES_PER_PAGE + 1;
  const resourceEnd = Math.min(
    resourcePage * RESOURCES_PER_PAGE,
    totalResources
  );
  const pagedResources = filteredResources.slice(
    (resourcePage - 1) * RESOURCES_PER_PAGE,
    resourcePage * RESOURCES_PER_PAGE
  );

  // ---- tab content components ----
  const renderOverview = () => {
    if (!event) return null;

    return (
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
              overflow: "hidden",
              bgcolor: "background.paper",
            }}
          >
            {/* Cover image */}
            <Box
              sx={{
                position: "relative",
                width: "100%",
                aspectRatio: "16 / 9",
                "@supports not (aspect-ratio: 1 / 1)": { height: 240 },
                bgcolor: "grey.200",
                overflow: "hidden",
              }}
            >
              {event.preview_image && (
                <Box
                  component="img"
                  src={toAbs(event.preview_image)}
                  alt={event.title}
                  sx={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    transform: "scale(1.01)",
                  }}
                />
              )}
            </Box>

            <Box sx={{ p: { xs: 2, sm: 3 } }}>
              {/* top row: status + price */}
              <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", sm: "center" }}
                spacing={1.5}
                sx={{ mb: 1.5 }}
              >
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Chip
                    size="small"
                    label={statusMeta.label}
                    sx={{
                      fontWeight: 600,
                      bgcolor: statusMeta.bg,
                      color:
                        statusMeta.color === "error"
                          ? "error.main"
                          : statusMeta.color === "success"
                            ? "success.main"
                            : "text.secondary",
                    }}
                  />
                  {event.category && (
                    <Chip
                      size="small"
                      label={event.category}
                      sx={{
                        bgcolor: "rgba(59,130,246,0.1)",
                        color: "primary.main",
                      }}
                    />
                  )}
                  {event.format && (
                    <Chip
                      size="small"
                      label={event.format}
                      sx={{
                        bgcolor: "rgba(245,158,11,0.12)",
                        color: "warning.main",
                      }}
                    />
                  )}
                </Stack>

                {event.price !== null && event.price !== undefined && (
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 700, color: "text.primary" }}
                  >
                    {Number(event.price) > 0
                      ? `$${Number(event.price).toFixed(2)}`
                      : "Free"}
                  </Typography>
                )}
              </Stack>

              {/* title + slug */}
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 800,
                  lineHeight: 1.25,
                  mb: 0.5,
                  fontSize: { xs: 20, sm: 22 },
                }}
              >
                {event.title}
              </Typography>
              {event.slug && (
                <Typography
                  variant="body2"
                  sx={{ color: "text.disabled", mb: 1.5 }}
                >
                  slug: {event.slug}
                </Typography>
              )}

              {/* date / time / location */}
              <Stack spacing={0.75} sx={{ mb: 2.5 }}>
                <Stack direction="row" spacing={1.2} alignItems="center">
                  <CalendarMonthRoundedIcon
                    fontSize="small"
                    sx={{ color: "text.disabled" }}
                  />
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    {fmtDateRange(event.start_time, event.end_time)}
                  </Typography>
                </Stack>
                {event.location && (
                  <Stack direction="row" spacing={1.2} alignItems="center">
                    <PlaceRoundedIcon
                      fontSize="small"
                      sx={{ color: "text.disabled" }}
                    />
                    <Typography
                      variant="body2"
                      sx={{ color: "text.secondary" }}
                    >
                      {event.location}
                    </Typography>
                  </Stack>
                )}
              </Stack>

              <Divider sx={{ mb: 2 }} />

              {/* description */}
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 600, color: "text.primary", mb: 0.75 }}
              >
                Description
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: "text.secondary",
                  whiteSpace: "pre-wrap",  // ✅ keep \n and \n\n exactly as typed
                  wordBreak: "break-word", // ✅ long URLs / words won’t overflow
                }}
              >
                {event.description || "No description provided."}
              </Typography>

              {/* Replay Info Badge - similar to EventDetailsPage */}
              {event.replay_available && (
                <Box sx={{ mt: 2, mb: 1, p: 2, bgcolor: "rgba(99, 102, 241, 0.08)", borderRadius: 2, border: "1px solid rgba(99, 102, 241, 0.2)" }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "indigo.main" }}>
                    Replay will be available
                  </Typography>
                  {event.replay_availability_duration && (
                    <Typography variant="caption" sx={{ color: "indigo.dark", display: "block", mt: 0.5 }}>
                      Accessible for: {event.replay_availability_duration}
                    </Typography>
                  )}
                </Box>
              )}

              {/* Self-Management Actions (Leave / Cancel Request) */}
              {myReg && (
                <Box sx={{ mt: 3, mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    Your Registration
                  </Typography>
                  <RegisteredActions
                    ev={event}
                    reg={myReg}
                    onUnregistered={() => {
                      setMyReg(null);
                      // toast is handled in RegisteredActions, but we can add extra if needed
                    }}
                    onCancelRequested={(eid, updated) => setMyReg(updated)}
                  />
                </Box>
              )}

              <Divider sx={{ my: 2 }} />

              {/* status + attending */}
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                alignItems={{ xs: "flex-start", sm: "center" }}
                justifyContent="space-between"
              >
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <LiveTvRoundedIcon
                    fontSize="small"
                    sx={{
                      color: event.is_live ? "error.main" : "text.disabled",
                    }}
                  />
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Status:{" "}
                    <strong>
                      {event.is_live ? "Live" : event.status || "—"}
                    </strong>
                  </Typography>
                </Stack>

                <Stack direction="row" spacing={1.5} alignItems="center">
                  <AccessTimeRoundedIcon
                    fontSize="small"
                    sx={{ color: "text.disabled" }}
                  />
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Registered Members:{" "}
                    <strong>
                      {Math.max(1, event.attending_count != null ? event.attending_count : 0)}
                    </strong>
                  </Typography>
                </Stack>
              </Stack>

              {event.recording_url && (
                <Box sx={{ mt: 2 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    component="a"
                    href={event.recording_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    startIcon={<MovieRoundedIcon />}
                    sx={{ textTransform: "none", borderRadius: 2 }}
                  >
                    Open recording
                  </Button>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Participant Visibility Settings (Owner/Staff only) */}
        {(isOwner || isStaff) && (
          <Grid item xs={12}>
            <Paper
              elevation={0}
              sx={{
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                p: { xs: 2, sm: 3 },
                bgcolor: "background.paper",
              }}
            >
              <Box mb={2}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Participant List Visibility
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Control when regular participants can see the list of registered members.
                </Typography>
              </Box>
              <Stack spacing={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={participantVisibility.show_participants_before_event}
                      onChange={(e) => setParticipantVisibility(prev => ({ ...prev, show_participants_before_event: e.target.checked }))}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight={500}>Show participants before event starts</Typography>
                      <Typography variant="caption" color="text.secondary">Default: On</Typography>
                    </Box>
                  }
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={participantVisibility.show_participants_after_event}
                      onChange={(e) => setParticipantVisibility(prev => ({ ...prev, show_participants_after_event: e.target.checked }))}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight={500}>Show participants after event ends</Typography>
                      <Typography variant="caption" color="text.secondary">Default: Off</Typography>
                    </Box>
                  }
                />
                <Box>
                  <Button
                    variant="contained"
                    onClick={() => handleSaveVisibilitySettings(participantVisibility)}
                    disabled={visibilitySettingsSaving}
                    size="small"
                  >
                    {visibilitySettingsSaving ? "Saving..." : "Save Settings"}
                  </Button>
                </Box>
              </Stack>
            </Paper>
          </Grid>
        )}
      </Grid >
    );
  };

  /*
   * Reusable render method for both "Breakout Rooms" (category="BREAKOUT")
   * and "Social Lounge" (category="LOUNGE").
   */
  const renderLoungeTables = (targetCategory, title, description) => {
    if (!canManageLounge) return null;

    // 1) Filter tables by this category
    //    (If any table has NO category or non-matching, hide it from this view)
    const tables = loungeTables.filter((t) => {
      const cat = (t.category || "LOUNGE").toUpperCase();
      return cat === targetCategory;
    });

    return (
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          p: { xs: 2, sm: 3 },
          bgcolor: "background.paper",
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={1.5}
          sx={{ mb: 2 }}
        >
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.25 }}>
              {title}
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {description}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              onClick={fetchLoungeTables}
              sx={{ textTransform: "none", borderRadius: 2 }}
            >
              Sync
            </Button>

            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setLoungeCreateCategory(targetCategory);
                setLoungeCreateOpen(true);
              }}
              sx={{ textTransform: "none", borderRadius: 2 }}
            >
              Create {targetCategory === 'BREAKOUT' ? 'Room' : 'Table'}
            </Button>
          </Stack>
        </Stack>

        <TableContainer
          sx={{
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
            overflow: "hidden",
          }}
        >
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.50" }}>
                <TableCell>Logo</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Seats</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loungeLoading ? (
                <TableRow>
                  <TableCell colSpan={4}>
                    <LinearProgress />
                  </TableCell>
                </TableRow>
              ) : tables.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <Typography variant="body2" sx={{ color: "text.secondary", py: 2 }}>
                      No {targetCategory === 'BREAKOUT' ? 'rooms' : 'tables'} found.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                tables.map((t) => (
                  <TableRow key={t.id} hover>
                    <TableCell>
                      <Avatar
                        src={t.icon_url || ""}
                        variant="rounded"
                        sx={{ width: 32, height: 32, bgcolor: "grey.100" }}
                      >
                        {(t.name || "T")[0]}
                      </Avatar>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {t.name || `Table ${t.id}`}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {t.max_seats || 4}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenEditLoungeTable(t)}
                        >
                          <EditRoundedIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleOpenDeleteLoungeTable(t)}
                        >
                          <DeleteOutlineRoundedIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    );
  };

  const handleSaveLoungeSettings = async () => {
    if (!eventId || loungeSettingsSaving) return;
    setLoungeSettingsSaving(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_ROOT}/events/${eventId}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(loungeSettings),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.detail || `HTTP ${res.status}`);
      }
      setEvent((prev) => ({ ...prev, ...loungeSettings }));
      toast.success("Lounge settings saved successfully!");
    } catch (e) {
      toast.error(e?.message || "Failed to save lounge settings");
    } finally {
      setLoungeSettingsSaving(false);
    }
  };

  const handleSaveVisibilitySettings = async (newSettings) => {
    if (!eventId || visibilitySettingsSaving) return;
    setVisibilitySettingsSaving(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_ROOT}/events/${eventId}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(newSettings),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.detail || `HTTP ${res.status}`);
      }
      setEvent((prev) => ({ ...prev, ...newSettings }));
      setParticipantVisibility(prev => ({ ...prev, ...newSettings }));
      toast.success("Visibility settings updated");
    } catch (e) {
      toast.error(e?.message || "Failed to save visibility settings");
    } finally {
      setVisibilitySettingsSaving(false);
    }
  };

  const renderLoungeSettings = () => {
    if (!isOwner) return null;

    return (
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          p: { xs: 2, sm: 3 },
          bgcolor: "background.paper",
        }}
      >
        <Stack spacing={3}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
              Social Lounge Availability
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Control when participants can access the Social Lounge for networking.
            </Typography>
          </Box>

          <Divider />

          {/* Before Event */}
          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={loungeSettings.lounge_enabled_before}
                  onChange={(e) =>
                    setLoungeSettings((prev) => ({
                      ...prev,
                      lounge_enabled_before: e.target.checked,
                    }))
                  }
                />
              }
              label={
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    Open Before Event
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    Allow networking before the event starts
                  </Typography>
                </Box>
              }
            />
            {loungeSettings.lounge_enabled_before && (
              <TextField
                type="number"
                label="Minutes before start"
                value={loungeSettings.lounge_before_buffer}
                onChange={(e) =>
                  setLoungeSettings((prev) => ({
                    ...prev,
                    lounge_before_buffer: Math.max(0, parseInt(e.target.value) || 0),
                  }))
                }
                size="small"
                sx={{ mt: 1, ml: 5, width: 200 }}
                InputProps={{ inputProps: { min: 0 } }}
              />
            )}
          </Box>

          {/* During Event */}
          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={loungeSettings.lounge_enabled_during}
                  onChange={(e) =>
                    setLoungeSettings((prev) => ({
                      ...prev,
                      lounge_enabled_during: e.target.checked,
                    }))
                  }
                />
              }
              label={
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    Open During Event
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    Allow networking while the event is live
                  </Typography>
                </Box>
              }
            />
          </Box>

          {/* During Breaks */}
          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={loungeSettings.lounge_enabled_breaks}
                  onChange={(e) =>
                    setLoungeSettings((prev) => ({
                      ...prev,
                      lounge_enabled_breaks: e.target.checked,
                    }))
                  }
                />
              }
              label={
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    Open During Breaks
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    Allow networking when the event is on break
                  </Typography>
                </Box>
              }
            />
          </Box>

          {/* After Event */}
          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={loungeSettings.lounge_enabled_after}
                  onChange={(e) =>
                    setLoungeSettings((prev) => ({
                      ...prev,
                      lounge_enabled_after: e.target.checked,
                    }))
                  }
                />
              }
              label={
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    Open After Event
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    Allow networking after the event ends
                  </Typography>
                </Box>
              }
            />
            {loungeSettings.lounge_enabled_after && (
              <TextField
                type="number"
                label="Minutes after end"
                value={loungeSettings.lounge_after_buffer}
                onChange={(e) =>
                  setLoungeSettings((prev) => ({
                    ...prev,
                    lounge_after_buffer: Math.max(0, parseInt(e.target.value) || 0),
                  }))
                }
                size="small"
                sx={{ mt: 1, ml: 5, width: 200 }}
                InputProps={{ inputProps: { min: 0 } }}
              />
            )}
          </Box>

          <Divider />

          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button
              variant="contained"
              onClick={handleSaveLoungeSettings}
              disabled={loungeSettingsSaving}
              sx={{ textTransform: "none", borderRadius: 2 }}
            >
              {loungeSettingsSaving ? "Saving..." : "Save Settings"}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    );
  };

  const renderMembers = () => {
    if (!isOwner) {
      return (
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
            p: { xs: 2, sm: 3 },
            bgcolor: "background.paper",
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
            Members
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Only the event owner can view the list of members who purchased
            this event.
          </Typography>
        </Paper>
      );
    }

    return (
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          p: { xs: 2, sm: 3 },
          bgcolor: "background.paper",
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 2 }}
          spacing={1.5}
        >
          <Box>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 600, mb: 0.25 }}
            >
              REGISTERED MEMBERS
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              People who have purchased this event.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              size="small"
              label={registrations.length}
              sx={{ bgcolor: "grey.100", color: "text.secondary" }}
            />
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setAddParticipantOpen(true)}
              sx={{ textTransform: "none", borderColor: "divider", color: "text.primary" }}
            >
              Add Member
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<PersonAddRoundedIcon />}
              onClick={() => setInviteUsersOpen(true)}
              sx={{ textTransform: "none", borderRadius: 999 }}
            >
              Invite
            </Button>
          </Stack>
        </Stack>

        {/* search + sort */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          sx={{ mb: 2 }}
        >
          <TextField
            fullWidth
            size="small"
            placeholder="Search members..."
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <Select
              value={memberSort}
              onChange={(e) => setMemberSort(e.target.value)}
              displayEmpty
              renderValue={
                memberSort !== ""
                  ? undefined
                  : () => "Sort"
              }
              IconComponent={ArrowDropDownRoundedIcon}
            >
              <MenuItem value="newest">Newest first</MenuItem>
              <MenuItem value="oldest">Oldest first</MenuItem>
            </Select>
          </FormControl>
        </Stack>

        {registrationsLoading ? (
          <Box sx={{ py: 4, textAlign: "center" }}>
            <CircularProgress size={22} />
          </Box>
        ) : (
          <>
            <TableContainer
              sx={{
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                overflow: "hidden",
              }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow
                    sx={{
                      bgcolor: "grey.50",
                      "& th": { fontSize: 13, color: "text.secondary" },
                    }}
                  >
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                      Registered at
                    </TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pagedMembers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} align="center">
                        <Typography
                          variant="body2"
                          sx={{ color: "text.secondary", py: 2 }}
                        >
                          No members found.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagedMembers.map((r) => {
                      const name = r.user_name || r.user_email || "Unnamed";
                      const email = r.user_email || "";
                      const purchased = r.registered_at
                        ? new Date(r.registered_at).toLocaleString()
                        : "";
                      const regKyc =
                        r.user_kyc_status ||
                        r.user?.kyc_status ||
                        r.profile?.kyc_status ||
                        r.kyc_status ||
                        "";
                      const isVerified = isVerifiedStatus(regKyc);
                      const avatarSrc = toAbs(
                        r.user_avatar_url ||
                        r.user_image_url ||
                        r.user_avatar ||
                        r.user_image
                      );

                      return (
                        <TableRow key={r.id} hover>
                          <TableCell>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Avatar
                                src={avatarSrc || undefined}
                                sx={{
                                  width: 28,
                                  height: 28,
                                  bgcolor: "primary.light",
                                  fontSize: 13,
                                }}
                              >
                                {(name[0] || "U").toUpperCase()}
                              </Avatar>
                              <Box>
                                <Typography
                                  variant="body2"
                                  sx={{ fontWeight: 500 }}
                                >
                                  {name}
                                  {isVerified && (
                                    <VerifiedIcon
                                      sx={{ fontSize: 16, color: "#22d3ee", ml: 0.5, verticalAlign: "middle" }}
                                    />
                                  )}
                                </Typography>
                              </Box>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{email}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={r.status || 'registered'}
                              color={r.status === 'cancellation_requested' ? 'warning' : (r.status === 'cancelled' ? 'default' : 'success')}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                            <Typography variant="body2">{purchased}</Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Stack direction="row" justifyContent="flex-end" spacing={1}>
                              <Button
                                size="small"
                                color="error"
                                onClick={() => openDialog("deregister", r)}
                              >
                                Deregister
                              </Button>

                              {!(Number(event?.price) === 0 || event?.is_free) && (
                                <>
                                  {r.status === "cancellation_requested" && (
                                    <>
                                      <Button
                                        size="small"
                                        color="success"
                                        variant="contained"
                                        onClick={() => openDialog("approve", r)}
                                      >
                                        Accept
                                      </Button>
                                      <Button
                                        size="small"
                                        color="error"
                                        onClick={() => openDialog("reject", r)}
                                      >
                                        Reject
                                      </Button>
                                    </>
                                  )}
                                </>
                              )}
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* footer: showing + pagination */}
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", sm: "center" }}
              spacing={1.5}
              sx={{ mt: 2 }}
            >
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Showing {memberStart}-{memberEnd} of {totalMembers} members
              </Typography>
              <Pagination
                size="small"
                page={memberPage}
                count={memberPageCount}
                onChange={(_, value) => setMemberPage(value)}
              />
            </Stack>
          </>
        )}
      </Paper>
    );
  };

  // ---- Session management handlers ----
  const openSessionEdit = (session) => {
    setSelectedSession(session);
    setSessionEditOpen(true);
  };

  const closeSessionEdit = () => {
    setSessionEditOpen(false);
    setSelectedSession(null);
  };

  const handleSessionUpdate = async (updatedSession) => {
    // Validate required fields
    if (!updatedSession.title?.trim()) {
      toast.error("Session title is required");
      return;
    }

    if (!updatedSession.start_time || !updatedSession.end_time) {
      toast.error("Start and end times are required");
      return;
    }

    // Validate end time > start time
    const startTime = new Date(updatedSession.start_time);
    const endTime = new Date(updatedSession.end_time);
    if (endTime <= startTime) {
      toast.error("End time must be after start time");
      return;
    }

    const token = getToken();
    if (!token) {
      toast.error("Authentication required");
      return;
    }

    setSessionActionLoading(true);
    try {
      const res = await fetch(
        `${API_ROOT}/events/${eventId}/sessions/${selectedSession.id}/`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updatedSession),
        }
      );

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.detail || `HTTP ${res.status}`);
      }

      // Update sessions list with the updated session
      setSessions(sessions.map(s => s.id === selectedSession.id ? json : s));
      toast.success("Session updated successfully");
      closeSessionEdit();
    } catch (e) {
      toast.error(e?.message || "Failed to update session");
    } finally {
      setSessionActionLoading(false);
    }
  };

  const openDeleteSessionDialog = (session) => {
    setSessionToDelete(session);
    setSessionDeleteDialogOpen(true);
  };

  const closeDeleteSessionDialog = () => {
    setSessionDeleteDialogOpen(false);
    setSessionToDelete(null);
  };

  const handleSessionDelete = async () => {
    const token = getToken();
    if (!token) {
      toast.error("Authentication required");
      return;
    }

    setSessionActionLoading(true);
    try {
      const res = await fetch(
        `${API_ROOT}/events/${eventId}/sessions/${sessionToDelete.id}/`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.detail || `HTTP ${res.status}`);
      }

      // Remove session from list
      setSessions(sessions.filter(s => s.id !== sessionToDelete.id));
      toast.success("Session deleted successfully");
      closeDeleteSessionDialog();
    } catch (e) {
      toast.error(e?.message || "Failed to delete session");
    } finally {
      setSessionActionLoading(false);
    }
  };

  // ---- Helper function to validate session times ----
  const isSessionTimeInvalid = () => {
    if (!newSessionData.start_time || !newSessionData.end_time) {
      return false; // Not filled yet, don't show error
    }
    const startTime = new Date(newSessionData.start_time);
    const endTime = new Date(newSessionData.end_time);
    return endTime <= startTime;
  };

  // ---- Helper function to get validation error message ----
  const getSessionTimeErrorMessage = () => {
    if (!newSessionData.start_time || !newSessionData.end_time) {
      return "";
    }
    if (isSessionTimeInvalid()) {
      return "End time must be after start time";
    }
    return "";
  };

  // ---- Add Session handler ----
  const handleAddSession = async () => {
    if (!newSessionData.title.trim()) {
      toast.error("Session title is required");
      return;
    }

    if (!newSessionData.session_date || !newSessionData.start_time || !newSessionData.end_time) {
      toast.error("Session date and times are required");
      return;
    }

    // Validate end time > start time
    if (isSessionTimeInvalid()) {
      toast.error("End time must be after start time");
      return;
    }

    // Validate session_date matches start_time date
    const startTimeDate = dayjs(newSessionData.start_time).format("YYYY-MM-DD");
    if (newSessionData.session_date !== startTimeDate) {
      toast.error("Session date must match the start time date");
      return;
    }

    const token = getToken();
    if (!token) {
      toast.error("Authentication required");
      return;
    }

    setAddSessionLoading(true);
    try {
      const res = await fetch(`${API_ROOT}/events/${eventId}/sessions/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newSessionData),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errorMsg = json?.detail || json?.title?.[0] || `HTTP ${res.status}`;
        throw new Error(errorMsg);
      }

      // Add new session to list
      setSessions([...sessions, json]);
      toast.success("Session created successfully");

      // Reset form and close dialog
      setNewSessionData({
        title: "",
        description: "",
        session_date: "",
        start_time: "",
        end_time: "",
        session_type: "main",
      });
      setAddSessionOpen(false);
    } catch (e) {
      toast.error(e?.message || "Failed to create session");
    } finally {
      setAddSessionLoading(false);
    }
  };

  const renderSessions = () => {
    // Only show for multi-day events and owners
    if (!event?.is_multi_day) {
      return (
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
            p: { xs: 2, sm: 3 },
            bgcolor: "background.paper",
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
            Sessions
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Sessions are only available for multi-day events.
          </Typography>
        </Paper>
      );
    }

    return (
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          p: { xs: 2, sm: 3 },
          bgcolor: "background.paper",
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 2 }}
          spacing={1.5}
        >
          <Box>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 600, mb: 0.25 }}
            >
              SESSIONS
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              All sessions scheduled for this multi-day event.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              size="small"
              label={sessions.length}
              sx={{ bgcolor: "grey.100", color: "text.secondary" }}
            />
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setAddSessionOpen(true)}
              sx={{ textTransform: "none", borderRadius: 2 }}
            >
              Add Session
            </Button>
          </Stack>
        </Stack>

        {sessionsLoading ? (
          <Box sx={{ py: 4, textAlign: "center" }}>
            <CircularProgress size={22} />
          </Box>
        ) : (
          <TableContainer
            sx={{
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
              overflow: "hidden",
            }}
          >
            <Table size="small">
              <TableHead>
                <TableRow
                  sx={{
                    bgcolor: "grey.50",
                    "& th": { fontSize: 13, color: "text.secondary" },
                  }}
                >
                  <TableCell>Date</TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell>Time</TableCell>
                  <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                    Type
                  </TableCell>
                  <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                    Status
                  </TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sessions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography
                        variant="body2"
                        sx={{ color: "text.secondary", py: 2 }}
                      >
                        No sessions found. Create a session to get started.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  sessions
                    .sort(
                      (a, b) =>
                        new Date(a.start_time) - new Date(b.start_time)
                    )
                    .map((session) => {
                      const sessionDate = session.session_date
                        ? dayjs(session.session_date).format("MMM D, YYYY")
                        : "—";
                      const timeRange = session.start_time && session.end_time
                        ? `${dayjs(session.start_time).format("h:mm A")} – ${dayjs(
                          session.end_time
                        ).format("h:mm A")}`
                        : "—";
                      const statusColor =
                        session.is_live ? "error" : "default";
                      const statusLabel = session.is_live ? "Live" : "Scheduled";

                      return (
                        <TableRow key={session.id} hover>
                          <TableCell>
                            <Typography variant="body2">
                              {sessionDate}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {session.title}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontSize: 12 }}>
                              {timeRange}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                            <Chip
                              size="small"
                              label={
                                session.session_type
                                  ? session.session_type
                                    .split("_")
                                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                                    .join(" ")
                                  : "Main"
                              }
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                            <Chip
                              size="small"
                              label={statusLabel}
                              color={statusColor}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Stack direction="row" justifyContent="flex-end" spacing={0.5}>
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => openSessionEdit(session)}
                                disabled={sessionActionLoading}
                                title="Edit session"
                              >
                                <EditRoundedIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => openDeleteSessionDialog(session)}
                                disabled={sessionActionLoading}
                                title="Delete session"
                              >
                                <DeleteOutlineRoundedIcon fontSize="small" />
                              </IconButton>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {sessionsError && (
          <Typography
            variant="body2"
            sx={{ color: "error.main", mt: 2 }}
          >
            {sessionsError}
          </Typography>
        )}
      </Paper>
    );
  };

  const renderResources = () => (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        p: { xs: 2, sm: 3 },
        bgcolor: "background.paper",
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2 }}
        spacing={1.5}
      >
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.25 }}>
            Resources
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Links, files and videos attached to this event.
          </Typography>
        </Box>
        <Chip
          size="small"
          label={resources.length}
          sx={{ bgcolor: "grey.100", color: "text.secondary" }}
        />
      </Stack>

      {/* search + filters */}
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1.5}
        sx={{ mb: 2 }}
      >
        <TextField
          fullWidth
          size="small"
          placeholder="Search resources…"
          value={resourceSearch}
          onChange={(e) => setResourceSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <Stack
          direction="row"
          spacing={1}
          sx={{ width: { xs: "100%", md: "auto" } }}
        >
          <FormControl size="small" sx={{ minWidth: 140, flex: 1 }}>
            <Select
              value={resourceType}
              onChange={(e) => setResourceType(e.target.value)}
              displayEmpty
              IconComponent={ArrowDropDownRoundedIcon}
              renderValue={
                resourceType !== ""
                  ? undefined
                  : () => "All types"
              }
            >
              <MenuItem value="all">All types</MenuItem>
              <MenuItem value="video">Video</MenuItem>
              <MenuItem value="link">Link</MenuItem>
              <MenuItem value="file">File</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160, flex: 1 }}>
            <Select
              value={resourceSort}
              onChange={(e) => setResourceSort(e.target.value)}
              displayEmpty
              IconComponent={ArrowDropDownRoundedIcon}
              renderValue={
                resourceSort !== ""
                  ? undefined
                  : () => "Newest first"
              }
            >
              <MenuItem value="newest">Newest first</MenuItem>
              <MenuItem value="oldest">Oldest first</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Stack>

      <TableContainer
        sx={{
          borderRadius: 2,
          border: "1px solid",
          borderColor: "divider",
          overflow: "hidden",
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow
              sx={{
                bgcolor: "grey.50",
                "& th": { fontSize: 13, color: "text.secondary" },
              }}
            >
              <TableCell>Title</TableCell>
              <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                Type
              </TableCell>
              <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                Event
              </TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pagedResources.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <Typography
                    variant="body2"
                    sx={{ color: "text.secondary", py: 2 }}
                  >
                    No resources found.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              pagedResources.map((r) => {
                const href = r.file
                  ? toAbs(r.file)
                  : r.link_url || r.video_url || null;

                const typeLabel =
                  r.type === "file"
                    ? "File"
                    : r.type === "link"
                      ? "Link"
                      : r.type === "video"
                        ? "Video"
                        : r.type || "Resource";

                const icon =
                  r.type === "file" ? (
                    <AttachFileRoundedIcon fontSize="small" />
                  ) : r.type === "video" ? (
                    <VideoLibraryRoundedIcon fontSize="small" />
                  ) : (
                    <LinkRoundedIcon fontSize="small" />
                  );

                return (
                  <TableRow key={r.id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        {icon}
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 500 }}
                        >
                          {r.title ||
                            r.link_url ||
                            r.video_url ||
                            r.file ||
                            "Untitled resource"}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                      <Chip size="small" label={typeLabel} sx={{ bgcolor: "grey.100", fontSize: 11 }} />
                    </TableCell>
                    <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                      <Typography variant="body2">
                        {event?.title || "—"}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {href ? (
                        <IconButton
                          size="small"
                          component="a"
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <VisibilityRoundedIcon fontSize="small" />
                        </IconButton>
                      ) : (
                        <Typography variant="body2" sx={{ color: "text.disabled" }}>
                          —
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* footer: showing + pagination */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={1.5}
        sx={{ mt: 2 }}
      >
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Showing {resourceStart}-{resourceEnd} of {totalResources} resources
        </Typography>
        <Pagination
          size="small"
          page={resourcePage}
          count={resourcePageCount}
          onChange={(_, value) => setResourcePage(value)}
        />
      </Stack>
    </Paper >
  );

  // ---- render ----
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50" }}>
      <Container
        maxWidth="xl"
        sx={{
          py: { xs: 2.5, md: 3 },
          px: { xs: 1.5, sm: 3, lg: 4 },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            mb: 2,
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", sm: "center" },
            gap: 2,
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar
              sx={{
                width: 40,
                height: 40,
                bgcolor: "primary.main",
                fontWeight: 700,
              }}
            >
              {avatarLetter}
            </Avatar>
            <Box>
              <Typography
                variant="h5"
                sx={{ fontWeight: 800, lineHeight: 1.2 }}
              >
                {event?.title || "Event Details"}
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: "text.secondary", mt: 0.5 }}
              >
                Review purchases and resources for this event.
              </Typography>
            </Box>
          </Stack>

          <Stack
            direction="row"
            spacing={1}
            sx={{ alignSelf: { xs: "stretch", sm: "center" } }}
          >
            {isOwner && (
              <Button
                variant="outlined"
                startIcon={<EditNoteRoundedIcon fontSize="small" />}
                onClick={() => setEditOpen(true)}
                sx={{
                  borderRadius: 999,
                  textTransform: "none",
                  px: 2.5,
                }}
              >
                Edit
              </Button>
            )}

            <Button
              variant="contained"
              startIcon={<ArrowBackIosNewRoundedIcon fontSize="small" />}
              onClick={() => navigate(-1)}
              sx={{
                borderRadius: 999,
                textTransform: "none",
                px: 2.5,
                flexGrow: { xs: 1, sm: 0 },
              }}
            >
              Back to events
            </Button>
          </Stack>
        </Box>

        {/* Loading / not found */}
        {eventLoading && (
          <Box sx={{ py: 10, textAlign: "center" }}>
            <Box sx={{ width: 260, mx: "auto" }}>
              <LinearProgress />
              <Typography
                variant="body2"
                sx={{ mt: 2, color: "text.secondary" }}
              >
                Loading event details…
              </Typography>
            </Box>
          </Box>
        )}

        {!eventLoading && !event && (
          <Paper
            elevation={0}
            sx={{
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper",
            }}
          >
            <Box sx={{ p: 4, textAlign: "center" }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                Event not found
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                This event may have been deleted or you don’t have access.
              </Typography>
            </Box>
          </Paper>
        )}

        {/* Tabs + content */}
        {!eventLoading && event && (
          <>
            {/* desktop / tablet tabs */}
            <Box
              sx={{
                borderBottom: 1,
                borderColor: "divider",
                mb: 2,
                display: { xs: "none", sm: "block" },
              }}
            >
              <Tabs
                value={tab}
                onChange={(_, value) => setTab(value)}
                variant="scrollable"
                scrollButtons="auto"
              >
                {tabLabels.map((label, idx) => (
                  <Tab
                    key={label}
                    label={label.toUpperCase()}
                    sx={{
                      textTransform: "none",
                      fontWeight: 600,
                      fontSize: 14,
                      mr: 2,
                    }}
                  />
                ))}
              </Tabs>
            </Box>

            {/* mobile tab selector */}
            <Box
              sx={{
                display: { xs: "flex", sm: "none" },
                mb: 2,
              }}
            >
              <Button
                fullWidth
                variant="outlined"
                onClick={() => setMobileTabsOpen(true)}
                endIcon={<ArrowDropDownRoundedIcon />}
                sx={{
                  justifyContent: "space-between",
                  textTransform: "none",
                  borderRadius: 999,
                }}
              >
                {tabLabels[tab]}
              </Button>
            </Box>

            {/* Tabs content – full width aligned with header */}
            <Box sx={{ mb: 4 }}>
              {isOwner ? (
                <>
                  {tab === 0 && renderOverview()}
                  {tab === 1 && renderMembers()}
                  {tab === 2 && renderSessions()}
                  {tab === 3 && renderResources()}
                  {tab === 4 && renderLoungeTables("BREAKOUT", "Breakout Rooms Tables", "Manage specific breakout rooms.")}
                  {tab === 5 && renderLoungeTables("LOUNGE", "Social Lounge Tables", "Set up lounge tables for networking.")}
                  {tab === 6 && renderLoungeSettings()}
                </>
              ) : (
                <>
                  {tab === 0 && renderOverview()}
                  {tab === 1 && renderResources()}
                  {tab === 2 && renderLoungeTables("BREAKOUT", "Breakout Rooms Tables", "Manage specific breakout rooms.")}
                  {tab === 3 && renderLoungeTables("LOUNGE", "Social Lounge Tables", "Set up lounge tables for networking.")}
                </>
              )}
            </Box>

            {/* mobile tabs drawer */}
            <Drawer
              anchor="right"
              open={mobileTabsOpen}
              onClose={() => setMobileTabsOpen(false)}
            >
              <Box sx={{ p: 2 }}>
                <Typography
                  variant="subtitle2"
                  sx={{ mb: 1, color: "text.secondary" }}
                >
                  Sections
                </Typography>
                {tabLabels.map((label, idx) => (
                  <Button
                    key={label}
                    fullWidth
                    onClick={() => {
                      setTab(idx);
                      setMobileTabsOpen(false);
                    }}
                    sx={{
                      justifyContent: "flex-start",
                      textTransform: "none",
                      borderRadius: 2,
                      mb: 1,
                      bgcolor: tab === idx ? "grey.100" : "transparent",
                    }}
                  >
                    {label}
                  </Button>
                ))}
              </Box>
            </Drawer>
          </>
        )}

        {isOwner && event && (
          <EditEventDialog
            open={editOpen}
            onClose={() => setEditOpen(false)}
            event={event}
            onUpdated={(updated) => {
              setEvent(updated);
              setEditOpen(false);
              // Refresh event to ensure all fields (including is_multi_day) are latest
              setTimeout(() => refreshEvent(), 500);
            }}
          />
        )}

        {/* global error snackbar for event load */}
        <Snackbar
          open={!!eventError}
          autoHideDuration={4000}
          onClose={() => setEventError("")}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert
            onClose={() => setEventError("")}
            severity="error"
            variant="filled"
            sx={{ width: "100%" }}
          >
            {eventError}
          </Alert>
        </Snackbar>

        {/* registrations error – small snackbar */}
        <Snackbar
          open={!!registrationsError}
          autoHideDuration={4000}
          onClose={() => setRegistrationsError("")}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert
            onClose={() => setRegistrationsError("")}
            severity="error"
            variant="filled"
            sx={{ width: "100%" }}
          >
            {registrationsError}
          </Alert>
        </Snackbar>

        <Snackbar
          open={!!loungeError}
          autoHideDuration={4000}
          onClose={() => setLoungeError("")}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert
            onClose={() => setLoungeError("")}
            severity="error"
            variant="filled"
            sx={{ width: "100%" }}
          >
            {loungeError}
          </Alert>
        </Snackbar>

        <Dialog
          open={loungeCreateOpen}
          onClose={() => {
            setLoungeCreateOpen(false);
            setLoungeCreateIcon(null);
          }}
          maxWidth="xs"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              p: 1,
            },
          }}
        >
          <DialogTitle sx={{ fontWeight: 700 }}>
            {loungeCreateCategory === 'BREAKOUT' ? 'Create Breakout Room' : 'Create Lounge Table'}
          </DialogTitle>
          <br />
          <DialogContent sx={{ pt: 1 }}>
            <Stack spacing={2}>
              <TextField
                label={loungeCreateCategory === 'BREAKOUT' ? 'Room name' : 'Table name'}
                value={loungeCreateName}
                onChange={(e) => setLoungeCreateName(e.target.value)}
                fullWidth
              />
              <TextField
                label="Seats"
                type="number"
                inputProps={{ min: 2, max: 30 }}
                value={loungeCreateSeats}
                onChange={(e) => setLoungeCreateSeats(clampSeats(Number(e.target.value)))}
                fullWidth
              />
              {loungeCreateCategory !== 'BREAKOUT' && (
                <Box>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    Table logo (optional)
                  </Typography>
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 1 }}>
                    <Button variant="outlined" component="label" sx={{ textTransform: "none" }}>
                      {loungeCreateIcon ? "Replace logo" : "Upload logo"}
                      <input
                        type="file"
                        hidden
                        accept="image/*"
                        onChange={(e) => setLoungeCreateIcon(e.target.files?.[0] || null)}
                      />
                    </Button>
                    {loungeCreatePreview && (
                      <Avatar
                        src={loungeCreatePreview}
                        variant="rounded"
                        sx={{ width: 40, height: 40, bgcolor: "grey.100" }}
                      />
                    )}
                    {loungeCreateIcon && (
                      <Button
                        size="small"
                        onClick={() => setLoungeCreateIcon(null)}
                        sx={{ textTransform: "none" }}
                      >
                        Remove
                      </Button>
                    )}
                  </Stack>
                </Box>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => {
                setLoungeCreateOpen(false);
                setLoungeCreateIcon(null);
              }}
              sx={{ textTransform: "none" }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleCreateLoungeTable}
              disabled={!loungeCreateName.trim() || loungeCreateSaving}
              sx={{ textTransform: "none" }}
            >
              {loungeCreateSaving ? "Creating..." : "Create"}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={loungeEditOpen}
          onClose={() => {
            setLoungeEditOpen(false);
            setLoungeEditIcon(null);
            setLoungeEditTarget(null);
          }}
          maxWidth="xs"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              p: 1,
            },
          }}
        >
          <DialogTitle sx={{ fontWeight: 700 }}>
            {(loungeEditTarget?.category || 'LOUNGE') === 'BREAKOUT' ? 'Edit Breakout Room' : 'Edit Lounge Table'}
          </DialogTitle>
          <br />
          <DialogContent sx={{ pt: 1 }}>
            <Stack spacing={2}>
              <TextField
                label={(loungeEditTarget?.category || 'LOUNGE') === 'BREAKOUT' ? 'Room name' : 'Table name'}
                value={loungeEditName}
                onChange={(e) => setLoungeEditName(e.target.value)}
                fullWidth
              />
              <TextField
                label="Seats"
                type="number"
                inputProps={{ min: 2, max: 30 }}
                value={loungeEditSeats}
                onChange={(e) => setLoungeEditSeats(clampSeats(Number(e.target.value)))}
                fullWidth
              />
              {(loungeEditTarget?.category || 'LOUNGE') !== 'BREAKOUT' && (
                <Box>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    Table logo (optional)
                  </Typography>
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 1 }}>
                    <Button variant="outlined" component="label" sx={{ textTransform: "none" }}>
                      {loungeEditIcon ? "Replace logo" : "Upload logo"}
                      <input
                        type="file"
                        hidden
                        accept="image/*"
                        onChange={(e) => setLoungeEditIcon(e.target.files?.[0] || null)}
                      />
                    </Button>
                    {(loungeEditPreview || loungeEditTarget?.icon_url) && (
                      <Avatar
                        src={loungeEditPreview || loungeEditTarget?.icon_url || ""}
                        variant="rounded"
                        sx={{ width: 40, height: 40, bgcolor: "grey.100" }}
                      />
                    )}
                    {loungeEditIcon && (
                      <Button
                        size="small"
                        onClick={() => setLoungeEditIcon(null)}
                        sx={{ textTransform: "none" }}
                      >
                        Remove
                      </Button>
                    )}
                  </Stack>
                </Box>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => {
                setLoungeEditOpen(false);
                setLoungeEditIcon(null);
                setLoungeEditTarget(null);
              }}
              sx={{ textTransform: "none" }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleUpdateLoungeTable}
              disabled={!loungeEditName.trim() || loungeEditSaving}
              sx={{ textTransform: "none" }}
            >
              {loungeEditSaving ? "Saving..." : "Save changes"}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={loungeDeleteOpen}
          onClose={() => {
            setLoungeDeleteOpen(false);
            setLoungeDeleteTarget(null);
          }}
          maxWidth="xs"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              p: 1,
            },
          }}
        >
          <DialogTitle sx={{ fontWeight: 700 }}>
            {(loungeDeleteTarget?.category || 'LOUNGE') === 'BREAKOUT' ? 'Delete Breakout Room?' : 'Delete Lounge Table?'}
          </DialogTitle>
          <DialogContent>
            <DialogContentText>
              This will remove the {(loungeDeleteTarget?.category || 'LOUNGE') === 'BREAKOUT' ? 'room' : 'table'} "{loungeDeleteTarget?.name || "Table"}" and clear its seats.
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => {
                setLoungeDeleteOpen(false);
                setLoungeDeleteTarget(null);
              }}
              sx={{ textTransform: "none" }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleDeleteLoungeTable}
              disabled={loungeDeleteSaving}
              sx={{ textTransform: "none" }}
            >
              {loungeDeleteSaving ? "Deleting..." : "Delete"}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          PaperProps={{ style: { borderRadius: 16, padding: 8 } }}
        >
          <DialogTitle sx={{ fontWeight: 700 }}>
            {dialogAction === "deregister" && "Deregister User?"}
            {dialogAction === "approve" && "Approve Cancellation?"}
            {dialogAction === "reject" && "Reject Request?"}
          </DialogTitle>
          <DialogContent>
            <DialogContentText>
              {dialogAction === "deregister" && "Are you sure you want to remove this user from the event?"}
              {dialogAction === "approve" && "This will approve the cancellation and refund process. Proceed?"}
              {dialogAction === "reject" && "This will reject the cancellation request. The user will remain registered."}
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => setDialogOpen(false)}
              disabled={actionLoading}
              color="inherit"
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmAction}
              disabled={actionLoading}
              variant="contained"
              color={dialogAction === "approve" ? "success" : "error"}
              className="rounded-full normal-case px-4"
              autoFocus
            >
              {actionLoading ? "Processing..." : "Confirm"}
            </Button>
          </DialogActions>
        </Dialog>
        <Dialog
          open={addParticipantOpen}
          onClose={() => setAddParticipantOpen(false)}
          maxWidth="xs"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              p: 1,
            },
          }}
        >
          <DialogTitle sx={{ fontWeight: 700 }}>Add Participant</DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ mb: 2 }}>
              Search for an existing user or enter an email address.
            </DialogContentText>
            <Autocomplete
              id="user-search-autocomplete"
              freeSolo
              options={userOptions}
              loading={searchLoading}
              getOptionLabel={(option) => {
                // Handle both object (selected user) and string (free input)
                if (typeof option === "string") return option;
                return `${option.first_name || ""} ${option.last_name || ""} (${option.email})`;
              }}
              filterOptions={(x) => x} // Disable client-side filtering since we do server-side
              inputValue={searchQuery}
              onInputChange={(event, newInputValue) => {
                setSearchQuery(newInputValue);
                // If user clears input, clear selection too
                if (!newInputValue) setSelectedUser(null);
              }}
              onChange={(event, newValue) => {
                if (typeof newValue === "string") {
                  // User typed free text and hit enter
                  setAddParticipantEmail(newValue);
                  setSelectedUser(null);
                } else {
                  // User selected an object
                  setSelectedUser(newValue);
                  // If they selected an object, we can opt to clear manual email or keep it sync
                  setAddParticipantEmail(newValue?.email || "");
                }
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="User Search or Email"
                  variant="outlined"
                  size="small"
                  fullWidth
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <React.Fragment>
                        {searchLoading ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </React.Fragment>
                    ),
                  }}
                />
              )}
              renderOption={(props, option) => {
                const { key, ...optionProps } = props;
                return (
                  <li key={key} {...optionProps}>
                    <Grid container alignItems="center">
                      <Grid item sx={{ display: 'flex', width: 44 }}>
                        <Avatar
                          src={option.profile?.user_image_url || option.profile?.avatar || ""}
                          alt={option.username}
                          sx={{ width: 30, height: 30 }}
                        />
                      </Grid>
                      <Grid item sx={{ width: 'calc(100% - 44px)', wordWrap: 'break-word' }}>
                        <Box component="span" sx={{ fontWeight: 'bold' }}>
                          {option.first_name} {option.last_name}
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {option.email}
                        </Typography>
                      </Grid>
                    </Grid>
                  </li>
                );
              }}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setAddParticipantOpen(false)} sx={{ textTransform: "none" }}>
              Cancel
            </Button>
            <Button
              onClick={handleAddParticipant}
              variant="contained"
              disabled={addParticipantLoading}
              sx={{ textTransform: "none" }}
            >
              {addParticipantLoading ? "Adding..." : "Add"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Add Session Dialog */}
        <Dialog
          open={addSessionOpen}
          onClose={() => {
            setAddSessionOpen(false);
            setNewSessionData({
              title: "",
              description: "",
              session_date: "",
              start_time: "",
              end_time: "",
              session_type: "main",
            });
          }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ fontWeight: 700 }}>Create New Session</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Stack spacing={2}>
              <TextField
                fullWidth
                label="Session Title *"
                value={newSessionData.title}
                onChange={(e) =>
                  setNewSessionData({ ...newSessionData, title: e.target.value })
                }
                size="small"
                placeholder="e.g., Opening Keynote, Workshop, Networking"
              />
              <TextField
                fullWidth
                label="Description"
                value={newSessionData.description}
                onChange={(e) =>
                  setNewSessionData({ ...newSessionData, description: e.target.value })
                }
                multiline
                rows={3}
                size="small"
              />
              <FormControl size="small" fullWidth>
                <Select
                  value={newSessionData.session_type}
                  onChange={(e) =>
                    setNewSessionData({ ...newSessionData, session_type: e.target.value })
                  }
                  label="Type"
                >
                  <MenuItem value="main">Main Session</MenuItem>
                  <MenuItem value="breakout">Breakout Session</MenuItem>
                  <MenuItem value="workshop">Workshop</MenuItem>
                  <MenuItem value="networking">Networking</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="Session Date *"
                type="date"
                value={newSessionData.session_date}
                onChange={(e) =>
                  setNewSessionData({ ...newSessionData, session_date: e.target.value })
                }
                size="small"
                InputLabelProps={{ shrink: true }}
                helperText="Auto-synced with start time date"
                inputProps={{
                  min: event?.start_time ? dayjs(event.start_time).format("YYYY-MM-DD") : "",
                  max: event?.end_time ? dayjs(event.end_time).format("YYYY-MM-DD") : "",
                }}
              />
              <TextField
                fullWidth
                label="Start Time *"
                type="datetime-local"
                value={newSessionData.start_time ? dayjs(newSessionData.start_time).format("YYYY-MM-DDTHH:mm") : ""}
                onChange={(e) => {
                  // Convert local datetime string to ISO UTC datetime
                  const localDateTime = dayjs(e.target.value, "YYYY-MM-DDTHH:mm");
                  const utcDateTime = localDateTime.utc().toISOString();
                  const dateStr = localDateTime.format("YYYY-MM-DD");
                  // Auto-sync session_date with start_time date (local date)
                  setNewSessionData({
                    ...newSessionData,
                    start_time: utcDateTime,
                    session_date: dateStr
                  });
                }}
                size="small"
                InputLabelProps={{ shrink: true }}
                helperText="Must be within event date range"
              />
              <TextField
                fullWidth
                label="End Time *"
                type="datetime-local"
                value={newSessionData.end_time ? dayjs(newSessionData.end_time).format("YYYY-MM-DDTHH:mm") : ""}
                onChange={(e) => {
                  // Convert local datetime string to ISO UTC datetime
                  const localDateTime = dayjs(e.target.value, "YYYY-MM-DDTHH:mm");
                  const utcDateTime = localDateTime.utc().toISOString();
                  setNewSessionData({ ...newSessionData, end_time: utcDateTime });
                }}
                size="small"
                InputLabelProps={{ shrink: true }}
                error={isSessionTimeInvalid()}
                helperText={getSessionTimeErrorMessage() || "Must be after start time"}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => {
                setAddSessionOpen(false);
                setNewSessionData({
                  title: "",
                  description: "",
                  session_date: "",
                  start_time: "",
                  end_time: "",
                  session_type: "main",
                });
              }}
              sx={{ textTransform: "none" }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddSession}
              variant="contained"
              disabled={
                addSessionLoading ||
                !newSessionData.title.trim() ||
                !newSessionData.session_date ||
                !newSessionData.start_time ||
                !newSessionData.end_time ||
                isSessionTimeInvalid()
              }
              sx={{ textTransform: "none" }}
            >
              {addSessionLoading ? "Creating..." : "Create Session"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Session Edit Dialog */}
        <Dialog
          open={sessionEditOpen}
          onClose={closeSessionEdit}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ fontWeight: 700 }}>Edit Session</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            {selectedSession && (
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  label="Title"
                  value={selectedSession.title}
                  onChange={(e) =>
                    setSelectedSession({ ...selectedSession, title: e.target.value })
                  }
                  size="small"
                />
                <TextField
                  fullWidth
                  label="Description"
                  value={selectedSession.description}
                  onChange={(e) =>
                    setSelectedSession({ ...selectedSession, description: e.target.value })
                  }
                  multiline
                  rows={3}
                  size="small"
                />
                <FormControl size="small" fullWidth>
                  <Select
                    value={selectedSession.session_type || "main"}
                    onChange={(e) =>
                      setSelectedSession({ ...selectedSession, session_type: e.target.value })
                    }
                    label="Type"
                  >
                    <MenuItem value="main">Main Session</MenuItem>
                    <MenuItem value="breakout">Breakout Session</MenuItem>
                    <MenuItem value="workshop">Workshop</MenuItem>
                    <MenuItem value="networking">Networking</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  label="Session Date"
                  type="date"
                  value={selectedSession.session_date || ""}
                  onChange={(e) =>
                    setSelectedSession({ ...selectedSession, session_date: e.target.value })
                  }
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  fullWidth
                  label="Start Time"
                  type="datetime-local"
                  value={selectedSession.start_time ? dayjs(selectedSession.start_time).format("YYYY-MM-DDTHH:mm") : ""}
                  onChange={(e) => {
                    // Convert local datetime string to ISO UTC datetime
                    const localDateTime = dayjs(e.target.value, "YYYY-MM-DDTHH:mm");
                    const utcDateTime = localDateTime.utc().toISOString();
                    const dateStr = localDateTime.format("YYYY-MM-DD");
                    // Auto-sync session_date with start_time date (local date)
                    setSelectedSession({
                      ...selectedSession,
                      start_time: utcDateTime,
                      session_date: dateStr
                    });
                  }}
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  helperText="Must be within event date range"
                />
                <TextField
                  fullWidth
                  label="End Time"
                  type="datetime-local"
                  value={selectedSession.end_time ? dayjs(selectedSession.end_time).format("YYYY-MM-DDTHH:mm") : ""}
                  onChange={(e) => {
                    // Convert local datetime string to ISO UTC datetime
                    const localDateTime = dayjs(e.target.value, "YYYY-MM-DDTHH:mm");
                    const utcDateTime = localDateTime.utc().toISOString();
                    setSelectedSession({ ...selectedSession, end_time: utcDateTime });
                  }}
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  error={selectedSession.end_time && selectedSession.start_time && new Date(selectedSession.end_time) <= new Date(selectedSession.start_time)}
                  helperText={selectedSession.end_time && selectedSession.start_time && new Date(selectedSession.end_time) <= new Date(selectedSession.start_time) ? "End time must be after start time" : "Must be after start time"}
                />
              </Stack>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={closeSessionEdit} sx={{ textTransform: "none" }}>
              Cancel
            </Button>
            <Button
              onClick={() => handleSessionUpdate(selectedSession)}
              variant="contained"
              disabled={sessionActionLoading}
              sx={{ textTransform: "none" }}
            >
              {sessionActionLoading ? "Saving..." : "Save"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Session Delete Confirmation Dialog */}
        <Dialog
          open={sessionDeleteDialogOpen}
          onClose={closeDeleteSessionDialog}
        >
          <DialogTitle sx={{ fontWeight: 700 }}>Delete Session</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete the session "<strong>{sessionToDelete?.title}</strong>"?
              This action cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={closeDeleteSessionDialog} sx={{ textTransform: "none" }}>
              Cancel
            </Button>
            <Button
              onClick={handleSessionDelete}
              variant="contained"
              color="error"
              disabled={sessionActionLoading}
              sx={{ textTransform: "none" }}
            >
              {sessionActionLoading ? "Deleting..." : "Delete"}
            </Button>
          </DialogActions>
        </Dialog>

        {eventId && (
          <InviteUsersDialog
            open={inviteUsersOpen}
            onClose={() => setInviteUsersOpen(false)}
            eventId={eventId}
          />
        )}
      </Container>
    </Box >
  );
}
