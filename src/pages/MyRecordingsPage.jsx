// src/pages/MyRecordingsPage.jsx
// Past events the user registered for. If an event has recording_url, show Watch/Download.

import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AdminSidebar from "../components/AdminSidebar.jsx";
import {
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Grid,
  Card as MUICard,
  CardContent,
  LinearProgress,
  Paper,
  Typography,
  TextField,
  InputAdornment,
  Pagination,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import PlayCircleOutlineRoundedIcon from "@mui/icons-material/PlayCircleOutlineRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import PlaceIcon from "@mui/icons-material/Place";
import AccountHero from "../components/AccountHero.jsx";
import AccountSidebar from "../components/AccountSidebar.jsx";

const RAW_API = (import.meta.env?.VITE_API_BASE_URL || "http://localhost:8000").toString().replace(/\/+$/, "");
const API = RAW_API.endsWith("/api") ? RAW_API : `${RAW_API}/api`;
const S3_BUCKET_URL = "https://events-agora-recordings.s3.eu-central-1.amazonaws.com";

const getTokenHeader = () => {
  const t =
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("access") ||
    localStorage.getItem("jwt");
  return t ? { Authorization: `Bearer ${t}` } : {};
};

const asList = (data) => (Array.isArray(data) ? data : (data?.results ?? []));
const isPast = (ev) => {
  if (ev?.recording_url) return true;     // show as soon as S3 URL is saved
  if (ev?.status === 'ended') return true;
  if (ev?.live_ended_at) return true;
  const end = ev?.end_time ? new Date(ev.end_time).getTime() : 0;
  return end && Date.now() > end;
};
const fmtDateRange = (startISO, endISO) => {
  try {
    const start = new Date(startISO);
    const end = new Date(endISO);
    const sameDay = start.toDateString() === end.toDateString();
    const d = start.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
    const e = end.toLocaleTimeString(undefined, { timeStyle: "short" });
    return sameDay ? `${d} – ${e}` : `${d} → ${end.toLocaleString()}`;
  } catch {
    return "";
  }
};

const handleDownload = async (recordingUrl, eventTitle) => {
  if (!recordingUrl || recordingUrl === '[null]') {
    alert('No recording available for this event');
    return;
  }

  try {
    console.log('🔽 Requesting download URL for:', recordingUrl);

    const response = await fetch(`${API}/events/download-recording/`, {
      method: 'POST',
      headers: {
        ...getTokenHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ recording_url: recordingUrl }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get download URL');
    }

    const data = await response.json();
    console.log('✅ Got download URL, starting download...');

    // Open the pre-signed URL - it will force download due to Content-Disposition header
    window.open(data.download_url, '_blank');

  } catch (error) {
    console.error('❌ Download failed:', error);
    alert(`Failed to download recording: ${error.message}`);
  }
};


export default function MyRecordingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = React.useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
  }, []);
  const isHostUser = Boolean(
    user?.is_staff || user?.is_superuser || user?.is_admin || user?.is_host ||
    user?.role === "host" || user?.role === "admin"
  );

  const HOST_MODE = React.useMemo(
    () => new URLSearchParams(location.search).get("scope") === "host",
    [location.search]
  );
  const showHero = !HOST_MODE;
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]); // array of event objects
  const [error, setError] = useState("");

  // ✨ New: search, type filter, pagination
  const [query, setQuery] = useState("");
  const [eventType, setEventType] = useState("all");
  const [page, setPage] = useState(1);
  const PER_PAGE = 6;

  // Build unique event-types from incoming events (fallbacks: type/category)
  const uniqueTypes = React.useMemo(() => {
    const set = new Set(
      items
        .map((e) => (e?.event_type ?? e?.type ?? e?.category ?? "").toString().trim())
        .filter(Boolean)
    );
    return Array.from(set).sort();
  }, [items]);

  // Text match helper
  const matchesQuery = (ev, q) => {
    if (!q) return true;
    const hay = [
      ev?.title,
      ev?.location,
      ev?.description,
      ev?.start_time,
      ev?.end_time,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(q.toLowerCase());
  };

  // Apply filters
  const filtered = React.useMemo(() => {
    return items.filter((ev) => {
      const typeVal = (ev?.event_type ?? ev?.type ?? ev?.category ?? "Other").toString().trim();
      const typeOk = eventType === "all" ? true : typeVal === eventType;
      const searchOk = matchesQuery(ev, query);
      return typeOk && searchOk;
    });
  }, [items, query, eventType]);

  // Reset to page 1 whenever filters/search change
  useEffect(() => {
    setPage(1);
  }, [query, eventType]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pagedItems = React.useMemo(() => {
    const start = (page - 1) * PER_PAGE;
    return filtered.slice(start, start + PER_PAGE);
  }, [filtered, page]);

  useEffect(() => {
    let alive = true;
    const ctrl = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setError("");

        // Host scope: show events I created; otherwise: my registrations
        const fetchUrl = HOST_MODE
          ? new URL(`${API}/events/`)
          : new URL(`${API}/event-registrations/mine/`);
        fetchUrl.searchParams.set("limit", "1000");
        if (HOST_MODE) fetchUrl.searchParams.set("created_by", "me");

        const res = await fetch(fetchUrl, { headers: getTokenHeader(), signal: ctrl.signal });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.detail || `HTTP ${res.status}`);

        const pastEvents = HOST_MODE
          // Events list → filter ended
          ? asList(json).filter(isPast)
          // Registrations → unwrap event → filter ended
          : asList(json)
            .map((r) => r?.event || null)
            .filter(Boolean)
            .filter(isPast);


        if (!alive) return;
        setItems(pastEvents);
      } catch (e) {
        // Ignore aborts caused by StrictMode double-invoke or fast tab switches
        if (e?.name === "AbortError" || /aborted/i.test(String(e?.message))) return;
        if (!alive) return;
        setError(e?.message || "Failed to load recordings");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
      ctrl.abort();
    };
  }, [location.search]);

  return (
    <div className="min-h-screen bg-slate-50">
      {showHero && <AccountHero />}
      <Container maxWidth="lg" className="py-6 sm:py-8">
        <div className="grid grid-cols-12 gap-6">
          <aside className="col-span-12 md:col-span-3">
            {HOST_MODE ? (
              <AdminSidebar active="recordings" />
            ) : (
              <AccountSidebar activeKey="recordings" />
            )}
          </aside>
          <main className="col-span-12 md:col-span-9">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div>
                <Typography variant="h5" className="font-semibold tracking-tight">
                  My Recordings
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Watch or download recordings from your past events.
                </Typography>
              </div>
            </div>

            {/* ✨ Filters / Search */}
            <Paper
              elevation={0}
              className="rounded-2xl border border-slate-200 p-3 sm:p-4 mb-3 sm:mb-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <FormControl size="small">
                  <InputLabel id="event-type-label">Event Type</InputLabel>
                  <Select
                    labelId="event-type-label"
                    value={eventType}
                    label="Event Type"
                    onChange={(e) => setEventType(e.target.value)}
                  >
                    <MenuItem value="all">All</MenuItem>
                    {uniqueTypes.map((t) => (
                      <MenuItem key={t} value={t}>{t}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  size="small"
                  placeholder="Search title, location, date…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchRoundedIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />

                {/* Spacer / future quick-filters slot */}
                <div />
              </div>
            </Paper>

            {loading && <LinearProgress />}

            {!loading && error && (
              <Paper elevation={0} className="rounded-2xl border border-slate-200 p-4">
                <Typography color="error">⚠️ {error}</Typography>
              </Paper>
            )}

            {!loading && !error && items.length === 0 && (
              <Paper elevation={0} className="rounded-2xl border border-slate-200 p-8 text-center">
                <Typography variant="h6" className="font-semibold mb-1">No past events yet</Typography>
                <Typography variant="body2" color="text.secondary">
                  You’ll see your past events here after you attend.
                </Typography>
              </Paper>
            )}

            {/* ✨ No results after filters/search */}
            {!loading && !error && items.length > 0 && filtered.length === 0 && (
              <Paper elevation={0} className="rounded-2xl border border-slate-200 p-8 text-center">
                <Typography variant="h6" className="font-semibold mb-1">No matches</Typography>
                <Typography variant="body2" color="text.secondary">
                  Try clearing the search or selecting a different event type.
                </Typography>
              </Paper>
            )}

            {!loading && !error && filtered.length > 0 && (
              <>
                <Grid container spacing={2}>
                  {pagedItems.map((ev) => {
                    const hasRec = !!ev.recording_url; // adjust if your field name differs
                    return (
                      <Grid key={ev.id} item xs={12} sm={6} md={4}>
                        <MUICard elevation={0} className="rounded-2xl border border-slate-200 overflow-hidden">
                          <div
                            style={{
                              position: "relative",
                              width: "100%",
                              aspectRatio: "16 / 9",
                              background: hasRec ? "#0b1220" : "#E5E7EB",
                            }}
                          >
                            {hasRec ? (
                              <video
                                src={`${S3_BUCKET_URL}/${ev.recording_url}`}
                                controls
                                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
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
                                }}
                              >
                                Recording not available yet
                              </Box>
                            )}
                          </div>

                          <CardContent>
                            <Typography variant="subtitle1" className="font-semibold line-clamp-2">
                              {ev.title || "Untitled Event"}
                            </Typography>
                            <Box className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                              <CalendarMonthIcon fontSize="small" />
                              <span>{fmtDateRange(ev.start_time, ev.end_time)}</span>
                            </Box>
                            {ev.location && (
                              <Box className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                                <PlaceIcon fontSize="small" />
                                <span className="truncate">{ev.location}</span>
                              </Box>
                            )}

                            <Divider className="my-3" />

                            <Box className="flex items-center gap-1.5 flex-wrap">
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
                                    sx={{ textTransform: "none", borderRadius: 2 }}
                                  >
                                    Watch
                                  </Button>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<DownloadRoundedIcon />}
                                    onClick={() => handleDownload(ev.recording_url, ev.title)}
                                    sx={{ textTransform: 'none', borderRadius: 2 }}
                                  >
                                    Download
                                  </Button>
                                </>
                              ) : (
                                <Chip size="small" label="No recording yet" />
                              )}

                            </Box>
                          </CardContent>
                        </MUICard>
                      </Grid>
                    );
                  })}
                </Grid>
                {/* ✨ Pagination */}
                <Box className="mt-4 flex justify-center">
                  <Pagination
                    count={totalPages}
                    page={page}
                    onChange={(_, val) => setPage(val)}
                    color="primary"
                    shape="rounded"
                  />
                </Box>
              </>
            )}
          </main>
        </div>
      </Container>
    </div>
  );
}