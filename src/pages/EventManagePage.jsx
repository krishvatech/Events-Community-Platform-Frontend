// src/pages/EventManagePage.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import RegisteredActions from "../components/RegisteredActions";

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

// ---- Status helpers ----
const computeStatus = (ev) => {
  if (!ev) return "upcoming";
  const now = Date.now();
  const s = ev.start_time ? new Date(ev.start_time).getTime() : 0;
  const e = ev.end_time ? new Date(ev.end_time).getTime() : 0;

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
    const s = start ? new Date(start) : null;
    const e = end ? new Date(end) : null;
    if (s && e && s.toDateString() === e.toDateString()) {
      return `${s.toLocaleDateString(undefined, {
        dateStyle: "medium",
      })} • ${s.toLocaleTimeString(undefined, {
        timeStyle: "short",
      })} – ${e.toLocaleTimeString(undefined, { timeStyle: "short" })}`;
    }
    if (s && e) {
      return `${s.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })} → ${e.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })}`;
    }
    if (s) return s.toLocaleString();
    if (e) return `Ends: ${e.toLocaleString()}`;
  } catch {
    return `${start || ""} – ${end || ""}`;
  }
};

// ---- Tabs / pagination ----
const EVENT_TAB_LABELS = ["Overview", "Registered Members", "Resources", "Breakout Rooms Tables", "Social Lounge", "Lounge Settings"];
const STAFF_EVENT_TAB_LABELS = ["Overview", "Resources", "Breakout Rooms Tables", "Social Lounge"];
const MEMBERS_PER_PAGE = 5;
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
    return () => controller.abort();
  }, [eventId, isOwner]);

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

            {targetCategory !== "BREAKOUT" && (
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
            )}
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
          <Chip
            size="small"
            label={registrations.length}
            sx={{ bgcolor: "grey.100", color: "text.secondary" }}
          />
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
                              {(Number(event?.price) === 0 || event?.is_free) && (
                                <Button
                                  size="small"
                                  color="error"
                                  onClick={() => openDialog("deregister", r)}
                                >
                                  Deregister
                                </Button>
                              )}

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
                  {tab === 2 && renderResources()}
                  {tab === 3 && renderLoungeTables("BREAKOUT", "Breakout Rooms Tables", "Manage specific breakout rooms.")}
                  {tab === 4 && renderLoungeTables("LOUNGE", "Social Lounge Tables", "Set up lounge tables for networking.")}
                  {tab === 5 && renderLoungeSettings()}
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
          <DialogTitle sx={{ fontWeight: 700 }}>Create Lounge Table</DialogTitle>
          <DialogContent sx={{ pt: 1 }}>
            <Stack spacing={2}>
              <TextField
                label="Table name"
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
          <DialogTitle sx={{ fontWeight: 700 }}>Edit Lounge Table</DialogTitle>
          <DialogContent sx={{ pt: 1 }}>
            <Stack spacing={2}>
              <TextField
                label="Table name"
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
          <DialogTitle sx={{ fontWeight: 700 }}>Delete Lounge Table?</DialogTitle>
          <DialogContent>
            <DialogContentText>
              This will remove the table "{loungeDeleteTarget?.name || "Table"}" and clear its seats.
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
      </Container>
    </Box>
  );
}
