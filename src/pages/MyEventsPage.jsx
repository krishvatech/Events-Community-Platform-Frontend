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
import RegisteredActions from "../components/RegisteredActions.jsx";
import { getJoinButtonText, isPostEventLoungeOpen, isPreEventLoungeOpen } from "../utils/gracePeriodUtils";
import { useSecondTick } from "../utils/useGracePeriodTimer";
import { useJoinLiveState } from "../utils/sessionJoinLogic";
import { getNextUpcomingSession, formatSessionTimeRange } from "../utils/timezoneUtils";

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
// ---------------------- Date/status helpers ----------------------
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone);

function fmtDateRange(startISO, endISO, organizerTimezone) {
  try {
    const dateFormat = "MMM D, YYYY";
    const timeFormat = "h:mm A";

    // Organizer's timezone (if provided)
    const orgStartObj = (startISO && organizerTimezone)
      ? dayjs(startISO).tz(organizerTimezone)
      : dayjs(startISO);
    const orgEndObj = (endISO && organizerTimezone)
      ? dayjs(endISO).tz(organizerTimezone)
      : dayjs(endISO);
    const orgDateStr = orgStartObj.format(dateFormat);
    const orgTimeRangeKey = `${orgStartObj.format(timeFormat)} – ${orgEndObj.format(timeFormat)}`;

    // User's local timezone
    const localStartObj = dayjs(startISO).local();
    const localEndObj = dayjs(endISO).local();
    const localDateStr = localStartObj.format(dateFormat);
    const localTimeRangeKey = `${localStartObj.format(timeFormat)} – ${localEndObj.format(timeFormat)}`;

    // Check if times differ
    const userTimezoneName = dayjs.tz.guess();
    const timesDiffer = (orgTimeRangeKey !== localTimeRangeKey) || (orgDateStr !== localDateStr);

    return {
      primary: `${orgDateStr} ${orgTimeRangeKey}`,
      secondary: timesDiffer ? {
        label: `Your Time: ${localDateStr} ${localTimeRangeKey}`,
        timezone: userTimezoneName
      } : null
    };
  } catch {
    return { primary: "", secondary: null };
  }
}

function computeStatus(ev) {
  const now = Date.now();
  const s = ev.start_time ? new Date(ev.start_time).getTime() : 0;
  const e = ev.end_time ? new Date(ev.end_time).getTime() : 0;

  if (ev.status === "cancelled") return "cancelled";
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
    case "cancelled":
      return { label: "Cancelled", className: "bg-red-100 text-red-700" };
    default:
      return { label: "—", className: "bg-slate-100 text-slate-700" };
  }
}

// ---------------------- Event Card (kept, with small MOD) ----------------------
function EventCard({ ev, reg, onJoinLive, onUnregistered, onCancelRequested, isJoining, hideStatusChip }) {
  console.log(`[EventCard] Rendering event ${ev.id} (${ev.title}), is_multi_day=${ev.is_multi_day}`);

  const [imgFailed, setImgFailed] = useState(false);
  const isHost = Boolean(reg?.is_host);

  // ✅ NEW: Use session-based join logic for multi-day events
  console.log(`[EventCard] Event ${ev.id} input data:`, {
    is_multi_day: ev.is_multi_day,
    has_sessions: !!ev.sessions,
    sessions_count: ev.sessions?.length,
    sessions: ev.sessions,
  });
  const joinState = useJoinLiveState(ev);
  console.log(`[EventCard] Event ${ev.id} joinState:`, joinState);

  // For multi-day events, determine status from joinState instead of computeStatus
  let status = computeStatus(ev);
  if (ev.is_multi_day && joinState) {
    // Map joinState status to display status
    if (joinState.status === "in_session" || joinState.status === "session_starting_soon") {
      status = "live";
    } else if (joinState.status === "waiting_for_session") {
      status = "upcoming";
    } else if (joinState.status === "event_ended") {
      status = "past";
    }
  }
  const chip = statusChip(status);

  return (
    <Paper
      elevation={0}
      className="flex flex-col rounded-2xl border border-slate-200 overflow-hidden"
      sx={{
        borderRadius: 2,
        // Let the card grow to fill grid item height
        height: "100%",
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
          <Link to={`/events/${ev.slug || ev.id}?ref=my_events`} state={{ event: ev }}>
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
      <Box sx={{ p: 1.75, display: "flex", flexDirection: "column", gap: 1, flexGrow: 1 }}>
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

        <div className="text-sm text-slate-500">
          {(() => {
            // DEBUG: Log event data to see what we're receiving
            console.log(`[EventCard Debug] Event "${ev.title}":`, {
              is_multi_day: ev.is_multi_day,
              sessions_present: !!ev.sessions,
              sessions_count: ev.sessions?.length || 0,
              sessions: ev.sessions,
              timezone: ev.timezone,
            });

            // For multi-day events with sessions, show only the next upcoming session
            if (ev.is_multi_day && ev.sessions && ev.sessions.length > 0) {
              // Find next upcoming session
              const now = new Date();
              const nextSession = ev.sessions.find(s => new Date(s.end_time) > now);

              return (
                <div>
                  {/* Show location */}
                  <Typography
                    variant="caption"
                    className="block font-medium text-slate-900 mb-1"
                    sx={{ fontSize: 12.5 }}
                  >
                    {ev.location || "Virtual"}
                  </Typography>

                  {/* Show next upcoming session with timezone handling */}
                  {nextSession ? (
                    (() => {
                      const sessionTimeRange = formatSessionTimeRange(
                        nextSession.start_time,
                        nextSession.end_time,
                        ev.timezone
                      );
                      return (
                        <>
                          {/* Primary: Organizer Time */}
                          <Typography
                            variant="caption"
                            className="block text-xs font-medium text-slate-900"
                            sx={{ fontSize: 11, lineHeight: 1.4 }}
                          >
                            {sessionTimeRange.primary}
                          </Typography>

                          {/* Secondary: Your Time */}
                          {sessionTimeRange.secondary && (
                            <Typography
                              variant="caption"
                              className="block mt-1 text-xs text-neutral-600"
                              sx={{ fontSize: 11 }}
                            >
                              <span className="font-semibold text-teal-700">Your Time:</span>{" "}
                              {sessionTimeRange.secondary.label.replace('Your Time: ', '')}
                              <span className="text-neutral-400 ml-1">({sessionTimeRange.secondary.timezone})</span>
                            </Typography>
                          )}
                        </>
                      );
                    })()
                  ) : (
                    <Typography
                      variant="caption"
                      className="block text-xs text-neutral-600"
                      sx={{ fontSize: 11 }}
                    >
                      All sessions completed
                    </Typography>
                  )}
                </div>
              );
            }

            // For single-day events, show overall event time
            const dateRange = fmtDateRange(ev.start_time, ev.end_time, ev.timezone);
            return (
              <>
                {/* Primary: Organizer Time + Location */}
                <Typography
                  variant="caption"
                  className="block font-medium text-slate-900"
                  sx={{ fontSize: 12.5 }}
                >
                  {`${dateRange.primary} • ${ev.location || "Virtual"}`}
                </Typography>

                {/* Secondary: Your Time */}
                {dateRange.secondary && (
                  <Typography
                    variant="caption"
                    className="block mt-1 text-xs text-neutral-600"
                    sx={{ fontSize: 11 }}
                  >
                    <span className="font-semibold text-teal-700">Your Time:</span>{" "}
                    {dateRange.secondary.label}
                    <span className="text-neutral-400 ml-1">({dateRange.secondary.timezone})</span>
                  </Typography>
                )}
              </>
            );
          })()}
        </div>

        {/* Actions stick to bottom to keep equal heights */}
        <Box sx={{ mt: "auto", display: "flex", gap: 1 }}>
          {(() => {
            // derive simple flags from status
            if (status === "cancelled") {
              return (
                <Button
                  size="small"
                  disabled
                  variant="outlined"
                  sx={{
                    textTransform: "none",
                    py: 0.5,
                    px: 1.25,
                    borderRadius: 2,
                    backgroundColor: "#fef2f2 !important",
                    color: "#b91c1c !important",
                    borderColor: "#fecaca !important",
                  }}
                >
                  Cancelled
                </Button>
              );
            }

            const isPostEventLounge = isPostEventLoungeOpen(ev);
            const isPast = (status === "past" || ev.status === "ended") && !isPostEventLounge;
            const isLive = status === "live" && ev.status !== "ended";

            // ✅ allow users to join up to 15 minutes before the start time
            const isWithinEarlyJoinWindow = canJoinEarly(ev, 15);
            const isPreEventLounge = isPreEventLoungeOpen(ev);
            const canShowActiveJoin = isHost || isLive || isWithinEarlyJoinWindow || isPreEventLounge || isPostEventLounge;

            // ✅ NEW: For multi-day events with sessions, use session-based logic
            // For single-day events, use existing logic
            if (ev.is_multi_day) {
              console.log(`[EventCard] Event ${ev.id}: is_multi_day=true, joinState=`, joinState);
              if (joinState) {
                console.log(`[EventCard] Event ${ev.id}: Using session-based join logic:`, joinState.buttonText);
                // Multi-day event: show session-based button
                return (
                  <Button
                    onClick={() => onJoinLive?.(ev, isHost, joinState.sessionId)}
                    disabled={isJoining || !joinState.enabled}
                    variant={joinState.enabled ? "contained" : "outlined"}
                    sx={{
                      textTransform: "none",
                      backgroundColor: joinState.enabled ? "#10B8A6" : undefined,
                      "&:hover": { backgroundColor: joinState.enabled ? "#0EA5A4" : undefined },
                      py: 0.5,
                      px: 1.25,
                      borderRadius: 2,
                    }}
                  >
                    {isHost && joinState.enabled
                      ? (isJoining ? "Opening Host Access..." : "Join as Host")
                      : (isJoining ? `${joinState.buttonText}...` : joinState.buttonText)}
                  </Button>
                );
              } else {
                console.warn(`[EventCard] Event ${ev.id}: is_multi_day=true but joinState is undefined!`);
              }
            }

            // 1) LIVE or within 15 min before start → active Join button (SINGLE-DAY EVENTS)
            if (canShowActiveJoin) {
              return (
                <Button
                  onClick={() => onJoinLive?.(ev, isHost)}
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
                  {isHost
                    ? (isJoining ? "Opening Host Access..." : "Join as Host")
                    : getJoinButtonText(ev, isLive, isJoining, reg)}
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

          {/* Cancel / Unregister Actions */}
          {reg && status !== "cancelled" && (
            <RegisteredActions
              ev={ev}
              reg={reg}
              onUnregistered={onUnregistered}
              onCancelRequested={onCancelRequested}
              hideChip={hideStatusChip}
            />
          )}

          <Button
            size="small"
            component={Link}
            to={`/events/${ev.slug || ev.id}?ref=my_events`}
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
    localStorage.getItem("access_token") ||
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    "";

  const [tab, setTab] = useState(0);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [myRegistrations, setMyRegistrations] = useState({});

  // State to track which event is currently being joined (null when idle)
  const [joiningId, setJoiningId] = useState(null);
  const [errOpen, setErrOpen] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  // pagination state (MOD: added)
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // ✅ Force re-render every second to update grace period button text in real-time
  // This ensures "Join Live" changes to "Join Waiting Room" when grace period expires
  // Uses 1-second ticker for guaranteed button updates regardless of when page loads
  useSecondTick(); // Re-render every second while page is visible

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

  // PAGINATION: reset to first page on filter changes
  useEffect(() => {
    setPage(1);
  }, [q, tab]);

  // Helper map for tabs -> backend bucket
  const statusTabMap = { 1: "upcoming", 2: "live", 3: "past", 4: "cancelled" };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function load() {
      try {
        const url = new URL(urlJoin(API_BASE, "/events/mine/"));
        url.searchParams.set("limit", String(PAGE_SIZE));
        url.searchParams.set("offset", String((page - 1) * PAGE_SIZE));

        // Search
        if (q.trim()) {
          url.searchParams.set("search", q.trim());
        }

        // Bucket (Tab)
        const bucket = statusTabMap[tab];
        if (bucket) {
          url.searchParams.set("bucket", bucket);
        }

        // 1) Fetch paginated events
        const res = await fetch(url.toString(), {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const results = Array.isArray(data?.results) ? data.results : [];
        const count = typeof data?.count === "number" ? data.count : 0;

        if (cancelled) return;

        // 2) Fetch registration details for these events (for Unregister/Cancel)
        // We do this concurrently for the displayed page items.
        const newRegs = {};
        if (results.length > 0) {
          await Promise.all(results.map(async (ev) => {
            try {
              // Filter specifically for *my* registration for this event
              const regUrl = new URL(urlJoin(API_BASE, "/event-registrations/"));
              regUrl.searchParams.set("event", String(ev.id));
              // get_queryset on backend already filters by user=request.user
              const rRes = await fetch(regUrl.toString(), {
                headers: {
                  "Content-Type": "application/json",
                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
              });
              if (rRes.ok) {
                const rData = await rRes.json();
                const rList = asList(rData);
                if (rList.length > 0) {
                  newRegs[ev.id] = rList[0];
                }
              }
            } catch (e) {
              // ignore individual reg fetch failures
            }
          }));
        }

        if (cancelled) return;

        setEvents(results);
        setMyRegistrations(newRegs);
        // We need a total count for pagination. 
        // If the API returns count, great. If not (and we have results), we might guess, but DRF pagination usually returns count.
        // We'll store it in a new state or repurpose logic.
        // Let's rely on component derived state updates.
        // Wait, the component currently computes `pageCount` from `filtered.length`.
        // We need to store `totalCount` in state.
        setTotalCount(count);

      } catch (e) {
        if (!cancelled) {
          setEvents([]);
          setTotalCount(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [page, tab, q, token]); // Re-run when page/tab/q changes

  // ✅ NEW: Refresh registration status when page regains focus
  // This ensures button text updates when user returns from live meeting after admission
  useEffect(() => {
    const handleFocus = () => {
      console.log("[MyEvents] Page regained focus - refreshing registrations...");

      // Refresh all current registrations
      if (myRegistrations && Object.keys(myRegistrations).length > 0) {
        const refreshRegs = {};
        Promise.all(
          Object.entries(myRegistrations).map(async ([eventId, reg]) => {
            try {
              const regUrl = new URL(urlJoin(API_BASE, "/event-registrations/"));
              regUrl.searchParams.set("event", String(eventId));
              const rRes = await fetch(regUrl.toString(), {
                headers: {
                  "Content-Type": "application/json",
                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
              });
              if (rRes.ok) {
                const rData = await rRes.json();
                const rList = asList(rData);
                if (rList.length > 0) {
                  refreshRegs[eventId] = rList[0];
                  console.log(`[MyEvents] ✅ Updated registration for event ${eventId}:`, rList[0].admission_status);
                }
              }
            } catch (e) {
              console.warn(`[MyEvents] Failed to refresh registration for event ${eventId}:`, e);
            }
          })
        ).then(() => {
          setMyRegistrations(prev => ({ ...prev, ...refreshRegs }));
        });
      }
    };

    // Listen for page focus
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [token, myRegistrations]);

  // PAGINATION: derive current page slice
  // With server-side pagination, 'events' IS the page slice.
  // We need 'totalCount' logic.


  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const startIndex = (page - 1) * PAGE_SIZE;
  // With server-pagination, "events" IS the paged list.
  const paged = events;


  // -----------------------------------------------------------------------------
  // MOD: Controlled "Join Live" action
  // Generates an audience token; on success navigates to /live/:slug with state.
  // On failure: shows error, does NOT redirect.
  // Your LiveMeetingPage can read token from:
  //   1) history state: location.state?.agora
  //   2) sessionStorage key: live:EVENT_ID
  // -----------------------------------------------------------------------------
  const handleJoinLive = async (ev, isHost = false) => {
    if (!ev?.id) return;

    setJoiningId(ev.id);
    try {
      const isPreEventLounge = isPreEventLoungeOpen(ev);
      const isPostEventLounge = isPostEventLoungeOpen(ev);
      const livePath = `/live/${ev.slug || ev.id}?id=${ev.id}&role=${isHost ? "publisher" : "audience"}`;

      navigate(livePath, {
        state: {
          event: ev,
          openLounge: isPreEventLounge || isPostEventLounge,
          preEventLounge: isPreEventLounge,
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
          <main className="col-span-12">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div>
                <Typography variant="h4">
                  My Events
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  View, join, and manage events you’ve registered for.
                </Typography>
              </div>
            </div>
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
                <Tab label="Cancelled" />
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
            ) : events.length === 0 ? (
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
                          reg={myRegistrations[ev.id]}
                          onJoinLive={handleJoinLive}
                          isJoining={joiningId === ev.id}
                          hideStatusChip={true}
                          onUnregistered={(eventId) => {
                            setEvents(prev => prev.filter(e => e.id !== eventId));
                            setMyRegistrations(prev => {
                              const next = { ...prev };
                              delete next[eventId];
                              return next;
                            });
                          }}
                          onCancelRequested={(eventId, updatedReg) => {
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


                {totalCount > PAGE_SIZE && (
                  <Box className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-4 gap-3">
                    <Typography variant="body2" color="text.secondary">
                      Showing {startIndex + 1}–{Math.min(startIndex + PAGE_SIZE, totalCount)} of {totalCount}
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
