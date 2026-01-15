// src/pages/EventManagePage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";

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

import { isOwnerUser } from "../utils/adminRole.js";

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
const EVENT_TAB_LABELS = ["Overview", "Registered Members", "Resources"];
const STAFF_EVENT_TAB_LABELS = ["Overview", "Resources"];
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

  const isOwner = isOwnerUser();
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
          `${API_ROOT}/events/${eventId}/registrations/`,
          { headers, signal: controller.signal }
        );
        const json = await res.json().catch(() => []);
        if (!res.ok) {
          throw new Error(json?.detail || `HTTP ${res.status}`);
        }
        setRegistrations(Array.isArray(json) ? json : []);
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
                    Attending:{" "}
                    <strong>
                      {event.attending_count != null
                        ? event.attending_count
                        : 0}
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
      </Grid>
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
                    <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                      Purchased at
                    </TableCell>
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
                          <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                            <Typography variant="body2">{purchased}</Typography>
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
                </>
              ) : (
                <>
                  {tab === 0 && renderOverview()}
                  {tab === 1 && renderResources()}
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
      </Container>
    </Box>
  );
}
