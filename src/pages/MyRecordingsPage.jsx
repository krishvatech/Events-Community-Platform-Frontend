// src/pages/MyRecordingsPage.jsx
// Attendee view: shows recordings for events the logged-in user registered for.
import React, { useEffect, useMemo, useState } from "react";
import {
  Box, Button, Chip, Container, Divider, Grid,
  Card as MUICard, CardContent, LinearProgress, Paper,
  Typography, TextField, InputAdornment, Pagination,
  Select, MenuItem, FormControl, InputLabel, Skeleton
} from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import PlayCircleOutlineRoundedIcon from "@mui/icons-material/PlayCircleOutlineRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import PlaceIcon from "@mui/icons-material/Place";

const RAW_API = (import.meta.env?.VITE_API_BASE_URL || "http://localhost:8000").toString().replace(/\/+$/, "");
const API = RAW_API.endsWith("/api") ? RAW_API : `${RAW_API}/api`;
const S3_BUCKET_URL = "https://events-agora-recordings.s3.eu-central-1.amazonaws.com";

const getTokenHeader = () => {
  const t =
    localStorage.getItem("access_token") ||
    localStorage.getItem("access_token") ||
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
      className="rounded-2xl border border-slate-200 overflow-hidden"
      sx={{ height: "100%", display: "flex", flexDirection: "column" }}
    >
      <Box
        sx={{
          position: "relative",
          width: "100%",
          aspectRatio: "16/9",
          background: "#E5E7EB",
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
    <>
      <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }} sx={{ alignItems: "stretch" }}>
        {Array.from({ length: count }).map((_, idx) => (
          <Grid key={idx} item xs={12} sm={4} md={4} lg={4}>
            <RecordingCardSkeleton />
          </Grid>
        ))}
      </Grid>

      <Box className="mt-4 flex justify-center">
        <Skeleton variant="rounded" width={240} height={40} sx={{ borderRadius: 2 }} />
      </Box>
    </>
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
          .filter(isPast);

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
    <div className="min-h-screen bg-slate-50">
      <Container maxWidth="xl" className="py-6 sm:py-8">
        <div className="grid grid-cols-12 gap-3 md:gap-4">
          <main className="col-span-12">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div>
                <Typography variant="h4">My Recordings</Typography>
                <Typography variant="body2" color="text.secondary">
                  Watch or download recordings from your past events.
                </Typography>
              </div>
            </div>

            <Paper elevation={0} className="rounded-2xl border border-slate-200 p-3 sm:p-4 mb-3 sm:mb-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <FormControl size="small">
                  <InputLabel id="event-type-label">Event Type</InputLabel>
                  <Select labelId="event-type-label" value={eventType} label="Event Type" onChange={(e) => setEventType(e.target.value)}>
                    <MenuItem value="all">All</MenuItem>
                    {uniqueTypes.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                  </Select>
                </FormControl>

                <TextField
                  size="small"
                  placeholder="Search title, location, date…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> }}
                />
                <div />
              </div>
            </Paper>

            {loading && <RecordingsGridSkeleton count={PER_PAGE} />}

            {!loading && error && (
              <Paper elevation={0} className="rounded-2xl border border-slate-200 p-4">
                <Typography color="error">⚠️ {error}</Typography>
              </Paper>
            )}

            {!loading && !error && filtered.length > 0 && (
              <>
                <Grid
                  container
                  spacing={{ xs: 2, sm: 2.5, md: 3 }}
                  sx={{ alignItems: "stretch" }}
                >
                  {paged.map((ev) => {
                    const hasRec = !!ev.recording_url;
                    return (
                      <Grid
                        key={ev.id}
                        item
                        xs={12}   // 1 card per row on small mobiles (<600px)
                        sm={4}    // 3 cards per row on 768px tablet (>=600px)
                        md={4}    // 3 cards per row on 1024px and desktops
                        lg={4}    // 3 per row on large screens too
                      >
                        <MUICard
                          elevation={0}
                          className="rounded-2xl border border-slate-200 overflow-hidden"
                          sx={{
                            height: "100%",
                            display: "flex",
                            flexDirection: "column",
                          }}
                        >
                          <div
                            style={{
                              position: "relative",
                              width: "100%",
                              aspectRatio: "16/9",
                              background: hasRec ? "#0b1220" : "#E5E7EB",
                            }}
                          >
                            {hasRec ? (
                              <video
                                src={`${S3_BUCKET_URL}/${ev.recording_url}`}
                                controls
                                onPlay={() => handleTrackReplay(ev.id)}
                                style={{
                                  position: "absolute",
                                  inset: 0,
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
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
                                  px: 2,
                                }}
                              >
                                Recording not available yet
                              </Box>
                            )}
                          </div>

                          <CardContent
                            sx={{
                              display: "flex",
                              flexDirection: "column",
                              flexGrow: 1,
                            }}
                          >
                            <Typography
                              variant="subtitle1"
                              className="font-semibold line-clamp-2"
                            >
                              {ev.title || "Untitled Event"}
                            </Typography>

                            <Box className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                              <span>{fmtDateRange(ev.start_time, ev.end_time)}</span>
                            </Box>

                            {ev.location && (
                              <Box className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                                <span className="truncate">{ev.location}</span>
                              </Box>
                            )}

                            <Divider className="my-3" />

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
                              {hasRec ? (
                                <>
                                  <Button
                                    size="small"
                                    variant="contained"
                                    startIcon={<PlayCircleOutlineRoundedIcon />}
                                    component="a"
                                    href={`${S3_BUCKET_URL}/${ev.recording_url}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => handleTrackReplay(ev.id)}
                                    sx={{
                                      textTransform: "none",
                                      borderRadius: 2,
                                      width: { xs: "100%", sm: "auto" },
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
                                      borderRadius: 2,
                                      width: { xs: "100%", sm: "auto" },
                                    }}
                                  >
                                    Download
                                  </Button>
                                </>
                              ) : (
                                <Chip
                                  size="small"
                                  label="No recording yet"
                                  sx={{
                                    width: { xs: "100%", sm: "auto" },
                                    textAlign: "center",
                                  }}
                                />
                              )}
                            </Box>
                          </CardContent>
                        </MUICard>
                      </Grid>
                    );
                  })}
                </Grid>

                <Box className="mt-4 flex justify-center">
                  <Pagination
                    count={totalPages}
                    page={page}
                    onChange={(_, v) => setPage(v)}
                    color="primary"
                    shape="rounded"
                  />
                </Box>
              </>
            )}

            {!loading && !error && filtered.length === 0 && (
              <Paper elevation={0} className="rounded-2xl border border-slate-200 p-8 text-center">
                <Typography variant="h6" className="font-semibold mb-1">No past events yet</Typography>
                <Typography variant="body2" color="text.secondary">
                  You’ll see your past events here after you attend.
                </Typography>
              </Paper>
            )}
          </main>
        </div>
      </Container>
    </div>
  );
}
