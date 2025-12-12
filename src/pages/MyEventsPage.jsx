// src/pages/MyEventsPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Chip,
  Container,
  LinearProgress,
  Paper,
  Tab,
  Tabs,
  TextField,
  Typography,
  Stack,
  Snackbar,
  Alert,
  CircularProgress, // MOD: spinner for joining state
  Pagination,
  Skeleton
} from "@mui/material";
import Grid from '@mui/material/Grid';
import AccountSidebar from "../components/AccountSidebar.jsx";
import AccountHero from "../components/AccountHero.jsx";

// ---------------------- API base + helpers (kept) ----------------------
const RAW_BASE = (import.meta.env.VITE_API_BASE_URL || "").trim();
const API_BASE = RAW_BASE.endsWith("/") ? RAW_BASE.slice(0, -1) : RAW_BASE;
const PAGE_SIZE = 6;
const API_ORIGIN = API_BASE.replace(/\/api$/, "");
const toAbs = (u) => {
  if (!u) return u;
  // already absolute?
  if (/^https?:\/\//i.test(u)) return u;
  // ensure leading slash then join to origin
  const p = u.startsWith("/") ? u : `/${u}`;
  return `${API_ORIGIN}${p}`;
};
const urlJoin = (base, path) => {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
};

// unwrap DRF paginated or plain lists
const asList = (data) => (Array.isArray(data) ? data : (data?.results ?? []));

// ---------------------- Date/status helpers (kept) ----------------------
function fmtDateRange(startISO, endISO) {
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
}

function computeStatus(ev) {
  const now = Date.now();
  const s = ev.start_time ? new Date(ev.start_time).getTime() : 0;
  const e = ev.end_time ? new Date(ev.end_time).getTime() : 0;

  // FIRST check if meeting has been manually ended - return "past" immediately
  if (ev.status === "ended") return "past";

  // DON'T check is_live if status is ended
  if (ev.is_live && ev.status !== "ended") return "live";
  if (s && e && now >= s && now <= e && ev.status !== "ended") return "live";
  if (s && now < s) return "upcoming";
  if (e && now > e) return "past";
  return "upcoming";
}

// Allow join X minutes before the event start (same as staff view)
function canJoinEarly(ev, minutes = 15) {
  if (!ev?.start_time) return false;

  const startMs = new Date(ev.start_time).getTime();
  if (!Number.isFinite(startMs)) return false;

  const now = Date.now();
  const diff = startMs - now;             // ms until start
  const windowMs = minutes * 60 * 1000;   // e.g. 15 minutes

  // true only if event hasn't started yet, but is within the early-join window
  return diff > 0 && diff <= windowMs;
}





function statusChip(status) {
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
}

// ---------------------- Event Card (kept, with small MOD) ----------------------
function EventCard({ ev, onJoinLive, isJoining }) {
  const status = computeStatus(ev);
  const chip = statusChip(status);
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <Paper
      elevation={0}
      className="flex flex-col rounded-2xl border border-slate-200 overflow-hidden"
      sx={{
        borderRadius: 2,
        // Let the card grow with content so buttons are always visible
        height: "auto",
      }}
    >
      {/* SAME IMAGE SIZE for all cards: 16:9 area that always covers */}
      <Box
        sx={{
          position: "relative",
          width: "100%",
          aspectRatio: "16 / 9",
          "@supports not (aspect-ratio: 1 / 1)": { height: 200 },
        }}
      >
        {ev.preview_image && !imgFailed ? (
          <Link to={`/events/${ev.slug || ev.id}`} state={{ event: ev }}>
            <img
              src={toAbs(ev.preview_image)}
              alt={ev.title}
              loading="lazy"
              onError={() => setImgFailed(true)}   // 👈 fallback on broken URL
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </Link>
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "#E5E7EB",              // same grey placeholder
            }}
          />
        )}
      </Box>


      {/* Content area with fixed rhythm so cards line up */}
      <Box sx={{ p: 1.75, display: "flex", flexDirection: "column", gap: 1 }}>
        <div className="flex items-center justify-between gap-2">
          <Chip size="small" label={chip.label} className={`${chip.className} font-medium`} />
          {ev.category && <span className="text-[11px] text-slate-500">{ev.category}</span>}
        </div>

        {/* Title: 2-line clamp + fixed block height so rows align */}
        <Typography
          variant="subtitle1"
          className="text-slate-900"
          sx={{
            fontWeight: 800,
            lineHeight: 1.25,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            fontSize: { xs: 15, sm: 16 },
            minHeight: { xs: 0, md: '3.1em' },
          }}
        >
          {ev.title}
        </Typography>

        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12.5 }}>
          {fmtDateRange(ev.start_time, ev.end_time)}
          {ev.location && (
            <>
              <br />
              {ev.location}
            </>
          )}
        </Typography>

        {/* Actions stick to bottom to keep equal heights */}
        <Box sx={{ mt: "auto", display: "flex", gap: 1 }}>
          {(() => {
            // derive simple flags from status
            const isPast = status === "past" || ev.status === "ended";
            const isLive = status === "live" && ev.status !== "ended";

            // ✅ allow users to join up to 15 minutes before the start time
            const isWithinEarlyJoinWindow = canJoinEarly(ev, 15);
            const canShowActiveJoin = isLive || isWithinEarlyJoinWindow;

            // 1) LIVE or within 15 min before start → active Join button
            if (canShowActiveJoin) {
              return (
                <Button
                  onClick={() => onJoinLive?.(ev)}
                  disabled={isJoining}
                  variant="contained"
                  sx={{
                    textTransform: "none",
                    backgroundColor: "#10B8A6",
                    "&:hover": { backgroundColor: "#0EA5A4" },
                    py: 0.5,
                    px: 1.25,
                    borderRadius: 2,
                  }}
                >
                  {isJoining
                    ? "Joining…"
                    : isLive
                      ? "Join Live"
                      : "Join"}
                </Button>
              );
            }

            // 2) ENDED → Watch Recording (if URL present)
            if (isPast && ev.recording_url) {
              return (
                <Button
                  size="small"
                  component="a"
                  href={ev.recording_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="contained"
                  sx={{ textTransform: "none", py: 0.5, px: 1.25, borderRadius: 2 }}
                >
                  Watch Recording
                </Button>
              );
            }

            // 2b) ENDED but no recording → disabled info button
            if (isPast && !ev.recording_url) {
              return (
                <Button
                  size="small"
                  disabled
                  variant="contained"
                  sx={{
                    textTransform: "none",
                    py: 0.5,
                    px: 1.25,
                    borderRadius: 2,
                    backgroundColor: "#CBD5E1",
                  }}
                >
                  Event Ended
                </Button>
              );
            }

            // 3) Upcoming but more than 15 min away → disabled Join
            return (
              <Button
                size="small"
                disabled
                variant="contained"
                sx={{
                  textTransform: "none",
                  py: 0.5,
                  px: 1.25,
                  borderRadius: 2,
                  backgroundColor: "#CBD5E1",
                }}
              >
                Join (Not Live Yet)
              </Button>
            );
          })()}

          <Button
            size="small"
            component={Link}
            to={`/events/${ev.slug || ev.id}`}
            state={{ event: ev }}
            variant="outlined"
            sx={{ textTransform: "none", py: 0.5, px: 1.25, borderRadius: 2 }}
          >
            Details
          </Button>
        </Box>

      </Box>
    </Paper>
  );
}

function EventCardSkeleton() {
  return (
    <Paper
      elevation={0}
      className="flex flex-col rounded-2xl border border-slate-200 overflow-hidden"
      sx={{ borderRadius: 2, height: "auto" }}
    >
      {/* 16:9 image skeleton */}
      <Box
        sx={{
          position: "relative",
          width: "100%",
          aspectRatio: "16 / 9",
          "@supports not (aspect-ratio: 1 / 1)": { height: 200 },
        }}
      >
        <Skeleton
          variant="rectangular"
          sx={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        />
      </Box>

      <Box sx={{ p: 1.75, display: "flex", flexDirection: "column", gap: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
          <Skeleton variant="rounded" width={70} height={22} />
          <Skeleton width={60} height={16} />
        </Box>

        {/* title (2 lines) */}
        <Skeleton height={20} width="92%" />
        <Skeleton height={20} width="70%" />

        {/* date/location */}
        <Skeleton height={14} width="78%" />
        <Skeleton height={14} width="55%" />

        {/* actions */}
        <Box sx={{ mt: "auto", display: "flex", gap: 1 }}>
          <Skeleton variant="rounded" width={96} height={32} />
          <Skeleton variant="rounded" width={78} height={32} />
        </Box>
      </Box>
    </Paper>
  );
}


// ---------------------- Main Page (kept with token-join MOD) ----------------------
export default function MyEventsPage() {
  const navigate = useNavigate(); // MOD
  const storedUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }, []);
  const fullName = storedUser?.name || storedUser?.full_name || "Member";
  const first = (fullName || "Member").split(" ")[0];

  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    "";

  const [tab, setTab] = useState(0);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);

  // State to track which event is currently being joined (null when idle)
  const [joiningId, setJoiningId] = useState(null);
  const [errOpen, setErrOpen] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  // pagination state (MOD: added)
  const [page, setPage] = useState(1);

  // Small helper for JSON GET
  async function fetchJSON(path) {
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    const res = await fetch(urlJoin(API_BASE, path), { headers });
    if (!res.ok) {
      throw new Error(`${res.status}`);
    }
    return res.json();
  }

  useEffect(() => {
    let cancelled = false;

    async function getMe() {
      try {
        const me = await fetchJSON("/users/me/");
        return me;
      } catch {
        return null;
      }
    }

    async function load() {
      setLoading(true);
      try {
        const me = await getMe(); // for fallback query by id

        const candidates = [
          "/events/mine/",
          "/event-registrations/mine/",
          "/registrations/mine/",
          "/event-registrations/?user=me",
          me?.id ? `/event-registrations/?user=${me.id}` : null,
        ].filter(Boolean);

        let raw = [];
        for (const p of candidates) {
          try {
            const data = await fetchJSON(p);
            const list = asList(data);
            if (Array.isArray(list)) {
              raw = list;
              if (list.length > 0) break; // first non-empty wins
            }
          } catch {
            // try next
          }
        }

        // registrations -> events
        let list = [];
        if (raw.length > 0 && raw[0] && raw[0].event) {
          list = raw.map((r) => r.event).filter(Boolean);
        } else {
          list = raw;
        }

        // de-dup
        const seen = new Set();
        const dedup = [];
        for (const ev of list) {
          const k = ev?.id ?? ev?.slug;
          if (!k || seen.has(k)) continue;
          seen.add(k);
          dedup.push(ev);
        }

        if (!cancelled) setEvents(dedup);
      } catch {
        if (!cancelled) setEvents([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // PAGINATION: reset to first page on filter changes
  useEffect(() => {
    setPage(1);
  }, [q, tab]);


  const query = (q || "").trim().toLowerCase();
  const filtered = events.filter((ev) => {
    const searchHit =
      !query ||
      `${ev.title || ""} ${ev.category || ""} ${ev.location || ""}`.toLowerCase().includes(query);
    if (!searchHit) return false;
    const status = computeStatus(ev);
    if (tab === 1) return status === "upcoming";
    if (tab === 2) return status === "live";
    if (tab === 3) return status === "past";
    return true;
  });

  // PAGINATION: derive current page slice
  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const startIndex = (page - 1) * PAGE_SIZE;
  const paged = filtered.slice(startIndex, startIndex + PAGE_SIZE);


  // -----------------------------------------------------------------------------
  // MOD: Controlled "Join Live" action
  // Generates an audience token; on success navigates to /live/:slug with state.
  // On failure: shows error, does NOT redirect.
  // Your LiveMeetingPage can read token from:
  //   1) history state: location.state?.agora
  //   2) sessionStorage key: live:EVENT_ID
  // -----------------------------------------------------------------------------
  const handleJoinLive = async (ev) => {
    if (!ev?.id) return;

    setJoiningId(ev.id);
    try {
      const livePath = `/live/${ev.slug || ev.id}?id=${ev.id}&role=audience`;

      navigate(livePath, {
        state: {
          event: ev,
        },
        replace: false,
      });
    } catch (e) {
      setErrMsg(
        typeof e?.message === "string" && e.message.length
          ? `Unable to join live: ${e.message}`
          : "Unable to join live at the moment."
      );
      setErrOpen(true);
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Container maxWidth="xl" className="py-6 sm:py-8">
        <div className="grid grid-cols-12 gap-3 md:gap-4 items-start">
          <aside className="col-span-12 lg:col-span-3">
            <AccountSidebar />
          </aside>
          <main className="col-span-12 lg:col-span-9">
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

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              alignItems={{ xs: "stretch", sm: "center" }}
              className="mb-5"
            >
              <TextField
                size="small"
                placeholder="Search your events…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                sx={{ width: { xs: "100%", sm: 360 } }}
              />
              <Box sx={{ flex: 1, display: { xs: "none", sm: "block" } }} />
              <Button
                component={Link}
                to="/events"
                variant="contained"
                sx={{ textTransform: "none", backgroundColor: "#10b8a6", "&:hover": { backgroundColor: "#0ea5a4" } }}
                className="rounded-xl"
              >
                Explore more
              </Button>
            </Stack>

            {loading ? (
              <>
                <Box sx={{ flexGrow: 1 }}>
                  <Grid container spacing={{ xs: 2, md: 3 }} columns={{ xs: 4, sm: 12, md: 12 }}>
                    {Array.from({ length: PAGE_SIZE }).map((_, idx) => (
                      <Grid key={`sk-${idx}`} size={{ xs: 4, sm: 4, md: 4 }}>
                        <EventCardSkeleton />
                      </Grid>
                    ))}
                  </Grid>
                </Box>

                {/* pagination row skeleton */}
                <Box className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-4 gap-3">
                  <Skeleton width={240} height={22} />
                  <Skeleton variant="rounded" width={220} height={36} />
                </Box>
              </>
            ) : filtered.length === 0 ? (
              <Paper elevation={0} className="rounded-2xl border border-slate-200">
                <Box className="p-8 text-center">
                  <Typography variant="h6" className="font-semibold text-slate-700">
                    No events yet
                  </Typography>
                  <p className="text-slate-500 mt-1">
                    You haven’t registered or purchased any events on this account.
                  </p>
                  <Button
                    component={Link}
                    to="/events"
                    className="mt-4 rounded-xl"
                    sx={{ textTransform: "none", backgroundColor: "#10b8a6", "&:hover": { backgroundColor: "#0ea5a4" } }}
                    variant="contained"
                  >
                    Browse events
                  </Button>
                </Box>
              </Paper>
            ) : (
              <>
                {/* Events grid */}
                <Box sx={{ flexGrow: 1 }}>
                  <Grid
                    container
                    spacing={{ xs: 2, md: 3 }}
                    columns={{ xs: 4, sm: 12, md: 12 }}
                  >
                    {paged.map((ev) => (
                      <Grid key={ev.id ?? ev.slug} size={{ xs: 4, sm: 4, md: 4 }}>
                        <EventCard
                          ev={ev}
                          onJoinLive={handleJoinLive}
                          isJoining={joiningId === ev.id}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Box>


                {total > PAGE_SIZE && (
                  <Box className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-4 gap-3">
                    <Typography variant="body2" color="text.secondary">
                      Showing {startIndex + 1}–{Math.min(startIndex + PAGE_SIZE, total)} of {total}
                    </Typography>
                    <Pagination
                      count={pageCount}
                      page={page}
                      onChange={(_, p) => {
                        setPage(p);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      color="primary"
                      shape="rounded"
                    />
                  </Box>
                )}
              </>
            )}
          </main>
        </div>
      </Container>

      {/* MOD: Snackbar for errors when token generation fails */}
      <Snackbar open={errOpen} autoHideDuration={6000} onClose={() => setErrOpen(false)}>
        <Alert onClose={() => setErrOpen(false)} severity="error" variant="filled" sx={{ width: "100%" }}>
          {errMsg || "Unable to join live right now."}
        </Alert>
      </Snackbar>
    </div>
  );
}