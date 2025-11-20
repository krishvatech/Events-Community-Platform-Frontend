// src/pages/AdminRecordingsPage.jsx
// Host/Admin view: shows events created by the logged-in admin (ended/past or with recording_url)

import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Chip,
  Divider,
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

const RAW_API = (import.meta.env?.VITE_API_BASE_URL || "http://localhost:8000")
  .toString()
  .replace(/\/+$/, "");
const API = RAW_API.endsWith("/api") ? RAW_API : `${RAW_API}/api`;
const S3_BUCKET_URL =
  "https://events-agora-recordings.s3.eu-central-1.amazonaws.com";

const getTokenHeader = () => {
  const t =
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("access") ||
    localStorage.getItem("jwt");
  return t ? { Authorization: `Bearer ${t}` } : {};
};

const asList = (data) =>
  Array.isArray(data) ? data : data?.results ?? [];

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
    const sd = s.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
    const et = e.toLocaleTimeString(undefined, { timeStyle: "short" });
    return same ? `${sd} – ${et}` : `${sd} → ${e.toLocaleString()}`;
  } catch {
    return "";
  }
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

export default function AdminRecordingsPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // always host mode here
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [eventType, setEventType] = useState("all");
  const [page, setPage] = useState(1);
  const PER_PAGE = 6;
  const [me, setMe] = useState(null);

  // Make sure the URL shows ?scope=host (as you requested)
  useEffect(() => {
    const qs = new URLSearchParams(location.search);
    if (qs.get("scope") !== "host") {
      qs.set("scope", "host");
      navigate(
        { pathname: "/admin/recordings", search: `?${qs.toString()}` },
        { replace: true }
      );
    }
  }, [location.search, navigate]);

  // load /users/me
  useEffect(() => {
    let alive = true;
    const ctrl = new AbortController();

    (async () => {
      try {
        const res = await fetch(`${API}/users/me/`, {
          headers: getTokenHeader(),
          signal: ctrl.signal,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`);

        if (!alive) return;
        setMe(data); // data.is_superuser will be used below
      } catch (e) {
        if (e?.name === "AbortError") return;
        if (!alive) return;
        setError(e?.message || "Failed to load user");
      }
    })();

    return () => {
      alive = false;
      ctrl.abort();
    };
  }, []);

  // load events / registrations once we know who user is
  useEffect(() => {
    if (!me) return;

    let alive = true;
    const ctrl = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setError("");

        let past = [];

        if (me.is_superuser) {
          // SUPERUSER: all events with recordings / past
          const url = new URL(`${API}/events/`);
          url.searchParams.set("limit", "1000");
          const res = await fetch(url, {
            headers: getTokenHeader(),
            signal: ctrl.signal,
          });
          const json = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(json?.detail || `HTTP ${res.status}`);

          past = asList(json).filter(isPast);
        } else {
          // NORMAL USER: only events they registered for
          const url = new URL(`${API}/event-registrations/mine/`);
          url.searchParams.set("limit", "1000");
          const res = await fetch(url, {
            headers: getTokenHeader(),
            signal: ctrl.signal,
          });
          const json = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(json?.detail || `HTTP ${res.status}`);

          past = asList(json)
            .map((r) => r?.event || null)
            .filter(Boolean)
            .filter(isPast);
        }

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

    return () => {
      alive = false;
      ctrl.abort();
    };
  }, [me]);

  const uniqueTypes = useMemo(() => {
    const set = new Set(
      items
        .map(
          (e) =>
            (e?.event_type ?? e?.type ?? e?.category ?? "")
              .toString()
              .trim()
        )
        .filter(Boolean)
    );
    return Array.from(set).sort();
  }, [items]);

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

  const filtered = useMemo(
    () =>
      items.filter((ev) => {
        const kind = (
          ev?.event_type ??
          ev?.type ??
          ev?.category ??
          "Other"
        )
          .toString()
          .trim();
        const typeOk = eventType === "all" ? true : kind === eventType;
        return typeOk && matchesQuery(ev, query);
      }),
    [items, query, eventType]
  );

  useEffect(() => {
    setPage(1);
  }, [query, eventType]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paged = useMemo(
    () =>
      filtered.slice(
        (page - 1) * PER_PAGE,
        (page - 1) * PER_PAGE + PER_PAGE
      ),
    [filtered, page]
  );

  return (
    <div className="max-w-screen-lg mx-auto py-6 sm:py-8">
      {/* Header (same style as AdminGroups) */}
      <Box className="flex items-center justify-between mb-4">
        <div>
          <Typography
            variant="h5"
            className="font-extrabold tracking-tight"
          >
            My Recordings
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            className="text-slate-500"
          >
            Watch or download recordings from your past hosted events.
          </Typography>
        </div>
      </Box>

      {/* Filters card */}
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
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
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
          <div />
        </div>
      </Paper>

      {loading && (
        <Box className="mt-1">
          <LinearProgress />
        </Box>
      )}

      {!loading && error && (
        <Paper
          elevation={0}
          className="rounded-2xl border border-slate-200 p-4 mt-3"
        >
          <Typography color="error">⚠️ {error}</Typography>
        </Paper>
      )}

      {!loading && !error && filtered.length > 0 && (
        <>
          {/* Card grid – same responsive pattern as AdminGroups */}
          <div className="grid grid-cols-4 sm:grid-cols-8 md:grid-cols-12 gap-2 md:gap-3 mt-3">
            {paged.map((ev) => {
              const hasRec = !!ev.recording_url;
              return (
                <div
                  key={ev.id}
                  className="col-span-4 flex"
                >
                  <MUICard
                    elevation={0}
                    className="rounded-2xl border border-slate-200 overflow-hidden flex flex-col w-full"
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
                          }}
                        >
                          Recording not available yet
                        </Box>
                      )}
                    </div>

                    <CardContent className="flex-1 flex flex-col">
                      <Typography
                        variant="subtitle1"
                        className="font-semibold line-clamp-2"
                      >
                        {ev.title || "Untitled Event"}
                      </Typography>

                      <Box className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                        <CalendarMonthIcon fontSize="small" />
                        <span>
                          {fmtDateRange(ev.start_time, ev.end_time)}
                        </span>
                      </Box>

                      <Divider className="my-3" />

                      <Box className="flex items-center gap-1.5 flex-wrap mt-auto">
                        {hasRec ? (
                          <>
                            <Button
                              size="small"
                              variant="contained"
                              startIcon={
                                <PlayCircleOutlineRoundedIcon />
                              }
                              component="a"
                              href={`${S3_BUCKET_URL}/${ev.recording_url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{
                                textTransform: "none",
                                borderRadius: 2,
                              }}
                            >
                              Watch
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<DownloadRoundedIcon />}
                              onClick={() =>
                                handleDownload(ev.recording_url)
                              }
                              sx={{
                                textTransform: "none",
                                borderRadius: 2,
                              }}
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
                </div>
              );
            })}
          </div>

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
        <Paper
          elevation={0}
          className="rounded-2xl border border-slate-200 p-8 text-center mt-4"
        >
          <Typography
            variant="h6"
            className="font-semibold mb-1"
          >
            No recordings yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            You’ll see recordings here once your hosted events end and
            upload a recording URL.
          </Typography>
        </Paper>
      )}
    </div>
  );
}
