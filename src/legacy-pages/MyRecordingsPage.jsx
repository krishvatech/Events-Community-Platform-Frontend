// src/pages/MyRecordingsPage.jsx
// Attendee view: shows recordings for events the logged-in user registered for.
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert, Box, Button, Chip, Container, Divider, Grid,
  Card as MUICard, CardContent,
  Typography, TextField, InputAdornment, Pagination,
  Select, MenuItem, FormControl, InputLabel, Skeleton
} from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import PlayCircleOutlineRoundedIcon from "@mui/icons-material/PlayCircleOutlineRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import PlaceIcon from "@mui/icons-material/Place";
import OndemandVideoRoundedIcon from "@mui/icons-material/OndemandVideoRounded";
import { resolveRecordingUrl } from "../utils/recordingUrl";
import { getAccessToken as getStoredAccessToken } from "../utils/tokenStore";
import PageHeader from "../components/page/PageHeader.jsx";
import FilterToolbar from "../components/page/FilterToolbar.jsx";
import EmptyState from "../components/page/EmptyState.jsx";

const RAW_API = (import.meta.env?.VITE_API_BASE_URL || "http://localhost:8000").toString().replace(/\/+$/, "");
const API = RAW_API.endsWith("/api") ? RAW_API : `${RAW_API}/api`;

const getTokenHeader = () => {
  const t =
    getStoredAccessToken() ||
    getStoredAccessToken() ||
    localStorage.getItem("access") ||
    localStorage.getItem("jwt");
  return t ? { Authorization: `Bearer ${t}` } : {};
};

const asList = (data) => (Array.isArray(data) ? data : (data?.results ?? []));
const isPast = (ev) => {
  if (ev?.recording_url) return true;
  if (ev?.status === "ended") return true;
  if (ev?.live_ended_at) return true;
  const end = ev?.end_time ? new Date(ev.end_time).getTime() : 0;
  return end && Date.now() > end;
};
const fmtDateRange = (startISO, endISO) => {
  try {
    const s = new Date(startISO);
    const e = new Date(endISO);
    const same = s.toDateString() === e.toDateString();
    const sd = s.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
    const et = e.toLocaleTimeString(undefined, { timeStyle: "short" });
    return same ? `${sd} – ${et}` : `${sd} → ${e.toLocaleString()}`;
  } catch { return ""; }
};

const getDaysAgo = (dateISO) => {
  if (!dateISO) return null;
  try {
    const now = new Date();
    const then = new Date(dateISO);
    const diffMs = now.getTime() - then.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "1 day ago";
    return `${days} days ago`;
  } catch { return null; }
};

const computeReplayState = (ev) => {
  const hasRec = !!ev.recording_url;
  const isVisible = ev.replay_visible_to_participants === true;
  const isAvailable = ev.replay_available === true;

  // Check if expired
  let isExpired = false;
  if (isAvailable && ev.replay_availability_duration && ev.replay_availability_duration !== "Unlimited") {
    const days = parseInt(ev.replay_availability_duration);
    if (!isNaN(days) && days > 0) {
      const endTime = ev.end_time ? new Date(ev.end_time).getTime() : (ev.live_ended_at ? new Date(ev.live_ended_at).getTime() : 0);
      if (endTime > 0) {
        const expiryTime = endTime + (days * 24 * 60 * 60 * 1000);
        if (Date.now() > expiryTime) {
          isExpired = true;
        }
      }
    }
  }

  // Determine state
  if (hasRec && isVisible && !isExpired) return "available";      // can watch
  if (hasRec && isVisible && isExpired) return "expired";
  if (isAvailable && !isVisible) return "pending_review";         // host reviewing
  return "processing";                                            // not yet ready (default for all other past events)
};

const handleDownload = async (recordingUrl) => {
  if (!recordingUrl || recordingUrl === "[null]") {
    alert("No recording available for this event");
    return;
  }
  try {
    const res = await fetch(`${API}/events/download-recording/`, {
      method: "POST",
      headers: { ...getTokenHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({ recording_url: recordingUrl }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Failed to get download URL");
    window.open(data.download_url, "_blank");
  } catch (err) {
    console.error("Download failed:", err);
    alert(`Failed to download recording: ${err.message}`);
  }
};

const handleTrackReplay = async (eventId) => {
  try {
    await fetch(`${API}/events/${eventId}/track-replay/`, {
      method: "POST",
      headers: getTokenHeader(),
    });
  } catch (err) {
    console.error("Failed to track replay:", err);
  }
};

function RecordingCardSkeleton() {
  return (
    <MUICard
      elevation={0}
      aria-hidden="true"
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        border: "1px solid var(--imaa-border)",
        borderRadius: "var(--imaa-radius-card)",
      }}
    >
      <Box
        sx={{
          position: "relative",
          width: "100%",
          aspectRatio: "16/9",
          background: "var(--imaa-dm-muted, #E5E7EB)",
        }}
      >
        <Skeleton
          variant="rectangular"
          sx={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        />
      </Box>

      <CardContent sx={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>
        <Skeleton variant="text" height={26} width="85%" />
        <Skeleton variant="text" height={18} width="65%" />
        <Skeleton variant="text" height={18} width="55%" />

        <Divider className="my-3" />

        <Box
          sx={{
            mt: 1.5,
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            gap: 1.5,
            alignItems: { xs: "stretch", sm: "center" },
          }}
        >
          <Skeleton variant="rounded" height={32} sx={{ borderRadius: 2, width: { xs: "100%", sm: 110 } }} />
          <Skeleton variant="rounded" height={32} sx={{ borderRadius: 2, width: { xs: "100%", sm: 120 } }} />
        </Box>
      </CardContent>
    </MUICard>
  );
}

function RecordingsGridSkeleton({ count = 6 }) {
  return (
    <Box role="status" aria-live="polite" aria-label="Loading recordings">
      <Grid container spacing={{ xs: 2, md: 3 }} columns={{ xs: 4, sm: 12, md: 12 }}>
        {Array.from({ length: count }).map((_, idx) => (
          <Grid key={idx} size={{ xs: 4, sm: 4, md: 4 }}>
            <RecordingCardSkeleton />
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 3, display: "flex", justifyContent: "center" }}>
        <Skeleton variant="rounded" width={240} height={40} sx={{ borderRadius: 2 }} />
      </Box>
    </Box>
  );
}

export default function MyRecordingsPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [eventType, setEventType] = useState("all");
  const [page, setPage] = useState(1);
  const PER_PAGE = 6;

  useEffect(() => {
    let alive = true;
    const ctrl = new AbortController();

    (async () => {
      try {
        setLoading(true); setError("");

        // ✅ attendee-only endpoint
        const url = new URL(`${API}/event-registrations/mine/`);
        url.searchParams.set("limit", "1000");

        const res = await fetch(url, { headers: getTokenHeader(), signal: ctrl.signal });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.detail || `HTTP ${res.status}`);

        const past = asList(json)
          .map((r) => r?.event || null)
          .filter(Boolean)
          .filter((ev) =>
            isPast(ev) &&
            ev?.replay_available === true &&
            ev?.replay_visible_to_participants === true &&
            !!ev?.recording_url
          );

        if (!alive) return;
        setItems(past);
      } catch (e) {
        if (e?.name === "AbortError") return;
        if (!alive) return;
        setError(e?.message || "Failed to load recordings");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => { alive = false; ctrl.abort(); };
  }, []);

  const uniqueTypes = useMemo(() => {
    const set = new Set(
      items.map((e) => (e?.event_type ?? e?.type ?? e?.category ?? "").toString().trim()).filter(Boolean)
    );
    return Array.from(set).sort();
  }, [items]);

  const matchesQuery = (ev, q) => {
    if (!q) return true;
    const hay = [ev?.title, ev?.location, ev?.description, ev?.start_time, ev?.end_time]
      .filter(Boolean).join(" ").toLowerCase();
    return hay.includes(q.toLowerCase());
  };

  const filtered = useMemo(() => {
    return items.filter((ev) => {
      const kind = (ev?.event_type ?? ev?.type ?? ev?.category ?? "Other").toString().trim();
      return (eventType === "all" ? true : kind === eventType) && matchesQuery(ev, query);
    });
  }, [items, query, eventType]);

  useEffect(() => { setPage(1); }, [query, eventType]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paged = useMemo(
    () => filtered.slice((page - 1) * PER_PAGE, (page - 1) * PER_PAGE + PER_PAGE),
    [filtered, page]
  );

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "var(--imaa-bg-member)", width: "100%", minWidth: 0, overflow: "hidden" }}>
      <Container maxWidth="lg" sx={{ py: { xs: 2.5, sm: 3.5 }, px: { xs: 2, sm: 3 } }}>
        <div className="grid grid-cols-12 gap-3 md:gap-4">
          <main className="col-span-12">
            <PageHeader
              title="My Recordings"
              subtitle="Watch or download recordings from your past events."
              sx={{ mb: 3 }}
            />

            <FilterToolbar surface aria-label="Recording filters" sx={{ mb: 3 }}>
                <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 180 } }}>
                  <InputLabel id="event-type-label">Event Type</InputLabel>
                  <Select labelId="event-type-label" value={eventType} label="Event Type" onChange={(e) => setEventType(e.target.value)}>
                    <MenuItem value="all">All</MenuItem>
                    {uniqueTypes.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                  </Select>
                </FormControl>

                <TextField
                  size="small"
                  label="Search recordings"
                  placeholder="Search title, location, date…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> }}
                  sx={{ flexGrow: 1, minWidth: { xs: "100%", sm: 280 }, bgcolor: "background.paper" }}
                />
            </FilterToolbar>

            {loading && <RecordingsGridSkeleton count={PER_PAGE} />}

            {!loading && error && (
              <Alert severity="error" role="alert" sx={{ borderRadius: "var(--imaa-radius-card)" }}>
                {error}
              </Alert>
            )}

            {!loading && !error && filtered.length > 0 && (
              <>
                <Grid
                  container
                  spacing={{ xs: 2, md: 3 }}
                  columns={{ xs: 4, sm: 12, md: 12 }}
                >
                  {paged.map((ev) => {
                    const replayState = computeReplayState(ev);
                    const canWatch = replayState === "available";
                    const daysAgoEnded = getDaysAgo(ev.live_ended_at || ev.end_time);
                    const hasRec = !!ev.recording_url;
                    const isAvailable = ev.replay_available === true;
                    const isVisible = ev.replay_visible_to_participants === true;

                    return (
                      <Grid
                        key={ev.id}
                        size={{ xs: 4, sm: 4, md: 4 }}
                      >
                        <MUICard
                          elevation={0}
                          sx={{
                            height: "100%",
                            display: "flex",
                            flexDirection: "column",
                            minWidth: 0,
                            overflow: "hidden",
                            border: "1px solid var(--imaa-border)",
                            borderRadius: "var(--imaa-radius-card)",
                            boxShadow: "var(--imaa-shadow-sm)",
                            transition: "border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease",
                            "&:hover": {
                              borderColor: "var(--imaa-border-hover)",
                              boxShadow: "var(--imaa-shadow-md)",
                              transform: "translateY(-2px)",
                            },
                            "&:focus-within": {
                              borderColor: "var(--imaa-teal)",
                              boxShadow: "var(--imaa-shadow-md)",
                            },
                          }}
                        >
                          <Box
                            sx={{
                              position: "relative",
                              width: "100%",
                              aspectRatio: "16 / 9",
                              overflow: "hidden",
                              bgcolor: canWatch ? "var(--imaa-navy)" : "var(--imaa-bg-cool)",
                              borderBottom: "1px solid var(--imaa-border)",
                            }}
                          >
                            {canWatch ? (
                              <video
                                src={resolveRecordingUrl(ev.recording_url)}
                                controls
                                onPlay={() => handleTrackReplay(ev.id)}
                                aria-label={`Recording player: ${ev.title || "Untitled Event"}`}
                                style={{
                                  position: "absolute",
                                  inset: 0,
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "contain",
                                  backgroundColor: "var(--imaa-navy)",
                                }}
                              />
                            ) : (
                              <Box
                                sx={{
                                  position: "absolute",
                                  inset: 0,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "text.secondary",
                                  fontSize: 14,
                                  textAlign: "center",
                                  flexDirection: "column",
                                  px: 2,
                                  gap: 1
                                }}
                              >
                                <OndemandVideoRoundedIcon aria-hidden="true" sx={{ fontSize: 32, color: "var(--imaa-ink-meta)" }} />
                                <Typography component="span" variant="body2" sx={{ color: "var(--imaa-ink-body)" }}>
                                  {replayState === "available" && "Replay available"}
                                  {replayState === "expired" && "Replay has expired"}
                                  {replayState === "pending_review" && "Replay will be made available soon"}
                                  {replayState === "processing" && "Replay will be made available soon"}
                                </Typography>
                              </Box>
                            )}
                          </Box>

                          <CardContent
                            sx={{
                              display: "flex",
                              flexDirection: "column",
                              flexGrow: 1,
                              minWidth: 0,
                              p: { xs: 2, sm: 2.5 },
                            }}
                          >
                            <Typography
                              variant="subtitle1"
                              component="h2"
                              sx={{
                                fontFamily: "var(--imaa-font-serif)",
                                fontWeight: 700,
                                fontSize: "1.125rem",
                                lineHeight: 1.35,
                                color: "var(--imaa-ink)",
                                overflowWrap: "anywhere",
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                              }}
                            >
                              {ev.title || "Untitled Event"}
                            </Typography>

                            <Box sx={{ mt: 1, display: "flex", alignItems: "flex-start", gap: 1, color: "var(--imaa-ink-body)", minWidth: 0 }}>
                              <CalendarMonthIcon aria-hidden="true" sx={{ mt: "2px", fontSize: 17, flex: "0 0 auto" }} />
                              <Typography component="span" variant="body2" sx={{ lineHeight: 1.5, overflowWrap: "anywhere" }}>
                                {fmtDateRange(ev.start_time, ev.end_time)}
                              </Typography>
                            </Box>

                            {ev.location && (
                              <Box sx={{ mt: 0.75, display: "flex", alignItems: "flex-start", gap: 1, color: "var(--imaa-ink-body)", minWidth: 0 }}>
                                <PlaceIcon aria-hidden="true" sx={{ mt: "2px", fontSize: 17, flex: "0 0 auto" }} />
                                <Typography component="span" variant="body2" sx={{ lineHeight: 1.5, overflowWrap: "anywhere" }}>
                                  {ev.location}
                                </Typography>
                              </Box>
                            )}

                            {/* Timing and Duration Info */}
                            {(replayState === "processing" || replayState === "pending_review") && daysAgoEnded && (
                              <Box className="mt-2">
                                <Chip
                                  size="small"
                                  label={`Event ended ${daysAgoEnded}`}
                                  variant="outlined"
                                  className="text-xs"
                                />
                              </Box>
                            )}
                            {replayState === "available" && ev.replay_availability_duration && (
                              <Box className="mt-2">
                                <Chip
                                  size="small"
                                  label={`Available for ${ev.replay_availability_duration}`}
                                  color="primary"
                                  variant="outlined"
                                  className="text-xs"
                                />
                              </Box>
                            )}
                            {replayState === "expired" && (
                              <Box className="mt-2">
                                <Chip
                                  size="small"
                                  label="Expired"
                                  variant="outlined"
                                  className="text-xs"
                                />
                              </Box>
                            )}

                            <Divider sx={{ mt: "auto", mb: 0, pt: 2, borderColor: "var(--imaa-border)" }} />

                            <Box
                              className="flex flex-wrap"
                              sx={{
                                mt: 1.5,
                                display: "flex",
                                flexDirection: { xs: "column", sm: "row" },
                                gap: 1.5,
                                alignItems: { xs: "stretch", sm: "center" },
                              }}
                            >
                              {replayState === "available" ? (
                                <>
                                  <Button
                                    size="small"
                                    variant="contained"
                                    startIcon={<PlayCircleOutlineRoundedIcon />}
                                    component="a"
                                    href={resolveRecordingUrl(ev.recording_url)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => handleTrackReplay(ev.id)}
                                    sx={{
                                      textTransform: "none",
                                      borderRadius: "var(--imaa-radius-field)",
                                      minHeight: 44,
                                      fontWeight: 700,
                                      bgcolor: "var(--imaa-teal-hover)",
                                      width: { xs: "100%", sm: "auto" },
                                      "&:hover": { bgcolor: "var(--imaa-navy)" },
                                      "&:focus-visible": { outline: "var(--imaa-focus-width) solid var(--imaa-focus-color)", outlineOffset: "var(--imaa-focus-offset)" },
                                    }}
                                  >
                                    Watch
                                  </Button>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<DownloadRoundedIcon />}
                                    onClick={() => handleDownload(ev.recording_url)}
                                    sx={{
                                      textTransform: "none",
                                      borderRadius: "var(--imaa-radius-field)",
                                      minHeight: 44,
                                      fontWeight: 700,
                                      width: { xs: "100%", sm: "auto" },
                                      "&:focus-visible": { outline: "var(--imaa-focus-width) solid var(--imaa-focus-color)", outlineOffset: "var(--imaa-focus-offset)" },
                                    }}
                                  >
                                    Download
                                  </Button>
                                </>
                              ) : (
                                <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center" }}>
                                  {replayState === "pending_review" && "Replay will be made available soon. We'll notify you when it's ready."}
                                  {replayState === "processing" && "Replay will be made available soon. We'll notify you when it's ready."}
                                  {replayState === "expired" && "This replay has expired"}
                                </Typography>
                              )}
                            </Box>
                          </CardContent>
                        </MUICard>
                      </Grid>
                    );
                  })}
                </Grid>

                <Box sx={{ mt: 3, display: "flex", justifyContent: "center", overflowX: "auto", pb: 0.5 }}>
                  <Pagination
                    count={totalPages}
                    page={page}
                    onChange={(_, v) => setPage(v)}
                    color="primary"
                    shape="rounded"
                    aria-label="Recording pages"
                  />
                </Box>
              </>
            )}

            {!loading && !error && filtered.length === 0 && (
              <EmptyState
                icon={<OndemandVideoRoundedIcon />}
                title={items.length > 0 ? "No recordings found" : "No past events yet"}
                description={items.length > 0
                  ? "Try changing your search or event type filter."
                  : "You’ll see your past events and their recordings here once you attend them."}
              />
            )}
          </main>
        </div>
      </Container>
    </Box>
  );
}
