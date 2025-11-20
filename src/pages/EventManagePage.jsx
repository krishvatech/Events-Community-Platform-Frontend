// src/pages/EventManagePage.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useParams, useLocation, useNavigate, Link } from "react-router-dom";
import {
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Grid,
  LinearProgress,
  Paper,
  Snackbar,
  Alert,
  Stack,
  Typography,
  IconButton,
} from "@mui/material";
import ArrowBackIosNewRoundedIcon from "@mui/icons-material/ArrowBackIosNewRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import MovieRoundedIcon from "@mui/icons-material/MovieRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import VideoLibraryRoundedIcon from "@mui/icons-material/VideoLibraryRounded";
import LiveTvRoundedIcon from "@mui/icons-material/LiveTvRounded";
import AttachFileRoundedIcon from "@mui/icons-material/AttachFileRounded";

const RAW = import.meta.env.VITE_API_BASE_URL || "";
const BASE = RAW.replace(/\/+$/, "");
const API_ROOT = BASE.endsWith("/api") ? BASE : `${BASE}/api`;
const API_ORIGIN = API_ROOT.replace(/\/api$/, "");

const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("access") ||
  localStorage.getItem("access_token") ||
  "";

const toAbs = (u) => {
  if (!u) return u;
  if (/^https?:\/\//i.test(u)) return u;
  const p = u.startsWith("/") ? u : `/${u}`;
  return `${API_ORIGIN}${p}`;
};

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
      return { label: "Live", className: "bg-rose-50 text-rose-700" };
    case "upcoming":
      return { label: "Upcoming", className: "bg-teal-50 text-teal-700" };
    case "past":
      return { label: "Past", className: "bg-slate-100 text-slate-700" };
    default:
      return { label: "—", className: "bg-slate-100 text-slate-700" };
  }
};

const fmtDateRange = (start, end) => {
  if (!start && !end) return "Not scheduled";
  try {
    const s = start ? new Date(start) : null;
    const e = end ? new Date(end) : null;
    if (s && e && s.toDateString() === e.toDateString()) {
      return `${s.toLocaleDateString(undefined, { dateStyle: "medium" })} • ${s.toLocaleTimeString(undefined, { timeStyle: "short" })} – ${e.toLocaleTimeString(undefined, { timeStyle: "short" })}`;
    }
    if (s && e) {
      return `${s.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })} → ${e.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`;
    }
    if (s) {
      return s.toLocaleString();
    }
    if (e) {
      return `Ends: ${e.toLocaleString()}`;
    }
  } catch {
    return `${start || ""} – ${end || ""}`;
  }
};

export default function EventManagePage() {
  const { eventId } = useParams();        // we’ll route as /admin/events/:eventId
  const location = useLocation();
  const navigate = useNavigate();

  // If we navigated with state (from card), use that immediately
  const initialEvent = location.state?.event || null;

  const [event, setEvent] = useState(initialEvent);
  const [loading, setLoading] = useState(!initialEvent);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!eventId) return;

    // If we already have full event with same id, skip fetch
    if (initialEvent && String(initialEvent.id) === String(eventId)) return;

    const token = getToken();
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_ROOT}/events/${eventId}/`, { headers });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(json?.detail || `HTTP ${res.status}`);
        }
        setEvent(json);
      } catch (e) {
        setErr(e?.message || "Unable to load event");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [eventId]);

  const status = useMemo(() => computeStatus(event || {}), [event]);
  const chip = statusChip(status);
  const resources = event?.resources || [];

  const createdAt =
    event?.created_at && new Date(event.created_at).toLocaleString();
  const updatedAt =
    event?.updated_at && new Date(event.updated_at).toLocaleString();
  const liveStartedAt =
    event?.live_started_at && new Date(event.live_started_at).toLocaleString();
  const liveEndedAt =
    event?.live_ended_at && new Date(event.live_ended_at).toLocaleString();

  return (
    <Box className="min-h-screen bg-slate-50">
      <Container
        maxWidth="lg"
        sx={{ py: 3, px: { xs: 1, sm: 2 } }}
      >
        {/* Top bar */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            mb: 2,
          }}
        >
          <IconButton
            size="small"
            onClick={() => navigate(-1)}
            sx={{ borderRadius: 2 }}
          >
            <ArrowBackIosNewRoundedIcon fontSize="small" />
          </IconButton>
          <Typography variant="h6" className="font-extrabold">
            Event Details
          </Typography>
        </Box>

        {loading && (
          <Box className="flex items-center justify-center py-16">
            <div className="w-64">
              <LinearProgress />
              <p className="text-center text-slate-500 mt-3">
                Loading event details…
              </p>
            </div>
          </Box>
        )}

        {!loading && !event && (
          <Paper elevation={0} className="rounded-2xl border border-slate-200">
            <Box className="p-8 text-center">
              <Typography variant="h6" className="font-semibold text-slate-700">
                Event not found
              </Typography>
              <Typography className="text-slate-500 mt-1">
                This event may have been deleted or you don’t have access.
              </Typography>
            </Box>
          </Paper>
        )}

        {!loading && event && (
          <Grid
            container
            spacing={{ xs: 2, md: 3 }}
            columns={{ xs: 12, md: 12 }}
          >
            {/* Left: main info */}
            <Grid item xs={12} md={8}>
              <Paper
                elevation={0}
                className="rounded-2xl border border-slate-200 overflow-hidden"
              >
                {/* Cover image */}
                <Box
                  sx={{
                    position: "relative",
                    width: "100%",
                    aspectRatio: "16 / 9",
                    "@supports not (aspect-ratio: 1 / 1)": { height: 240 },
                    bgcolor: "#e5e7eb",
                  }}
                >
                  {event.preview_image && (
                    <img
                      src={toAbs(event.preview_image)}
                      alt={event.title}
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  )}
                </Box>

                <Box className="p-4 sm:p-5">
                  {/* Status + category */}
                  <Stack
                    direction="row"
                    spacing={1.5}
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{ mb: 1.5, flexWrap: "wrap" }}
                  >
                    <Stack direction="row" spacing={1}>
                      <Chip
                        size="small"
                        label={chip.label}
                        className={`${chip.className} font-medium`}
                      />
                      {event.category && (
                        <Chip
                          size="small"
                          label={event.category}
                          className="bg-sky-50 text-sky-700"
                        />
                      )}
                      {event.format && (
                        <Chip
                          size="small"
                          label={event.format}
                          className="bg-amber-50 text-amber-700"
                        />
                      )}
                    </Stack>

                    {event.price !== null && event.price !== undefined && (
                      <Typography
                        variant="body2"
                        className="font-semibold text-slate-700"
                      >
                        {Number(event.price) > 0
                          ? `₹${Number(event.price).toFixed(2)}`
                          : "Free"}
                      </Typography>
                    )}
                  </Stack>

                  <Typography
                    variant="h5"
                    className="font-extrabold !leading-snug text-slate-900 mb-1"
                  >
                    {event.title}
                  </Typography>

                  {event.slug && (
                    <Typography
                      variant="body2"
                      className="text-slate-400 mb-2"
                    >
                      slug: {event.slug}
                    </Typography>
                  )}

                  {/* Time & location */}
                  <Stack spacing={0.5} sx={{ mb: 2.5 }}>
                    <Stack direction="row" spacing={1.2} alignItems="center">
                      <CalendarMonthRoundedIcon
                        fontSize="small"
                        className="text-slate-400"
                      />
                      <Typography
                        variant="body2"
                        className="text-slate-600"
                      >
                        {fmtDateRange(event.start_time, event.end_time)}
                      </Typography>
                    </Stack>
                    {event.location && (
                      <Stack
                        direction="row"
                        spacing={1.2}
                        alignItems="center"
                      >
                        <PlaceRoundedIcon
                          fontSize="small"
                          className="text-slate-400"
                        />
                        <Typography
                          variant="body2"
                          className="text-slate-600"
                        >
                          {event.location}
                        </Typography>
                      </Stack>
                    )}
                  </Stack>

                  <Divider sx={{ my: 2 }} />

                  {/* Description */}
                  <Typography
                    variant="subtitle2"
                    className="font-semibold text-slate-800 mb-1"
                  >
                    Description
                  </Typography>
                  <Typography
                    variant="body2"
                    className="text-slate-600 whitespace-pre-line"
                  >
                    {event.description || "No description provided."}
                  </Typography>

                  <Divider sx={{ my: 2 }} />

                  {/* Live / recording info */}
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1.5}
                    alignItems={{ xs: "flex-start", sm: "center" }}
                    justifyContent="space-between"
                  >
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <LiveTvRoundedIcon
                        fontSize="small"
                        className={
                          event.is_live ? "text-rose-500" : "text-slate-400"
                        }
                      />
                      <Typography
                        variant="body2"
                        className="text-slate-600"
                      >
                        Status:{" "}
                        <strong>
                          {event.is_live ? "Live" : event.status || "—"}
                        </strong>
                      </Typography>
                    </Stack>

                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <AccessTimeRoundedIcon
                        fontSize="small"
                        className="text-slate-400"
                      />
                      <Typography
                        variant="body2"
                        className="text-slate-600"
                      >
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

              {/* Meta: created / updated / live times */}
              <Paper
                elevation={0}
                className="mt-3 rounded-2xl border border-slate-200"
              >
                <Box className="p-4">
                  <Typography
                    variant="subtitle2"
                    className="font-semibold text-slate-800 mb-1"
                  >
                    Meta
                  </Typography>
                  <Stack spacing={0.5}>
                    {event.created_by_id && (
                      <Typography variant="body2" className="text-slate-600">
                        Created by user ID:{" "}
                        <strong>{event.created_by_id}</strong>
                      </Typography>
                    )}
                    {createdAt && (
                      <Typography variant="body2" className="text-slate-600">
                        Created at: <strong>{createdAt}</strong>
                      </Typography>
                    )}
                    {updatedAt && (
                      <Typography variant="body2" className="text-slate-600">
                        Updated at: <strong>{updatedAt}</strong>
                      </Typography>
                    )}
                    {liveStartedAt && (
                      <Typography variant="body2" className="text-slate-600">
                        Live started at: <strong>{liveStartedAt}</strong>
                      </Typography>
                    )}
                    {liveEndedAt && (
                      <Typography variant="body2" className="text-slate-600">
                        Live ended at: <strong>{liveEndedAt}</strong>
                      </Typography>
                    )}
                    {event.dyte_meeting_title && (
                      <Typography variant="body2" className="text-slate-600">
                        Dyte meeting:{" "}
                        <strong>{event.dyte_meeting_title}</strong>
                      </Typography>
                    )}
                    {event.dyte_meeting_id && (
                      <Typography variant="body2" className="text-slate-600">
                        Dyte meeting ID:{" "}
                        <strong>{event.dyte_meeting_id}</strong>
                      </Typography>
                    )}
                  </Stack>
                </Box>
              </Paper>
            </Grid>

            {/* Right: resources / quick info */}
            <Grid item xs={12} md={4}>
              <Stack spacing={2}>
                {/* Quick info card */}
                <Paper
                  elevation={0}
                  className="rounded-2xl border border-slate-200"
                >
                  <Box className="p-4">
                    <Typography
                      variant="subtitle2"
                      className="font-semibold text-slate-800 mb-1"
                    >
                      Quick info
                    </Typography>
                    <Stack spacing={0.5}>
                      <Typography
                        variant="body2"
                        className="text-slate-600"
                      >
                        ID: <strong>{event.id}</strong>
                      </Typography>
                      <Typography
                        variant="body2"
                        className="text-slate-600"
                      >
                        Community ID:{" "}
                        <strong>{event.community_id ?? "—"}</strong>
                      </Typography>
                      <Typography
                        variant="body2"
                        className="text-slate-600"
                      >
                        Status: <strong>{event.status || "—"}</strong>
                      </Typography>
                      <Typography
                        variant="body2"
                        className="text-slate-600"
                      >
                        Format: <strong>{event.format || "—"}</strong>
                      </Typography>
                      <Typography
                        variant="body2"
                        className="text-slate-600"
                      >
                        Category: <strong>{event.category || "—"}</strong>
                      </Typography>
                    </Stack>
                  </Box>
                </Paper>

                {/* Resources */}
                <Paper
                  elevation={0}
                  className="rounded-2xl border border-slate-200"
                >
                  <Box className="p-4">
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      sx={{ mb: 1 }}
                    >
                      <Typography
                        variant="subtitle2"
                        className="font-semibold text-slate-800"
                      >
                        Resources
                      </Typography>
                      <Chip
                        size="small"
                        label={resources.length}
                        className="bg-slate-100 text-slate-700"
                      />
                    </Stack>

                    {resources.length === 0 ? (
                      <Typography
                        variant="body2"
                        className="text-slate-500"
                      >
                        No resources attached.
                      </Typography>
                    ) : (
                      <Stack spacing={1.5}>
                        {resources.map((r) => {
                          const href =
                            r.file
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
                            <Box
                              key={r.id}
                              className="rounded-xl border border-slate-100 bg-slate-50/60 p-2"
                            >
                              <Stack spacing={0.5}>
                                <Stack
                                  direction="row"
                                  spacing={1}
                                  alignItems="center"
                                >
                                  <Chip
                                    size="small"
                                    label={typeLabel}
                                    className="bg-slate-200 text-slate-700"
                                  />
                                  {r.is_published === false && (
                                    <Chip
                                      size="small"
                                      label="Scheduled"
                                      className="bg-amber-50 text-amber-700"
                                    />
                                  )}
                                </Stack>
                                <Typography
                                  variant="body2"
                                  className="font-medium text-slate-800"
                                >
                                  {r.title ||
                                    r.link_url ||
                                    r.video_url ||
                                    r.file ||
                                    "Untitled resource"}
                                </Typography>
                                {href && (
                                  <Button
                                    size="small"
                                    component="a"
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    startIcon={<LinkRoundedIcon />}
                                    sx={{
                                      textTransform: "none",
                                      alignSelf: "flex-start",
                                      borderRadius: 2,
                                    }}
                                  >
                                    Open
                                  </Button>
                                )}
                              </Stack>
                            </Box>
                          );
                        })}
                      </Stack>
                    )}
                  </Box>
                </Paper>
              </Stack>
            </Grid>
          </Grid>
        )}

        <Snackbar
          open={!!err}
          autoHideDuration={4000}
          onClose={() => setErr("")}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert
            onClose={() => setErr("")}
            severity="error"
            variant="filled"
            sx={{ width: "100%" }}
          >
            {err}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
}
