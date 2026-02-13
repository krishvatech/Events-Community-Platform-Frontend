// src/pages/EventDetailsPage.jsx
import React, { useEffect, useState } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import {
  Box,
  Button,
  Chip,
  Container,
  Stack,
  Paper,
  Typography,
  Breadcrumbs,
  Skeleton,
  Tabs,
  Tab,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import RegisteredActions from "../components/RegisteredActions.jsx";
import { getJoinButtonText, isPostEventLoungeOpen, isPreEventLoungeOpen } from "../utils/gracePeriodUtils";
import { useSecondTick } from "../utils/useGracePeriodTimer";
import GroupsIcon from "@mui/icons-material/Groups";
import ParticipantListDialog from "../components/ParticipantListDialog";
import SpeedNetworkingMatchHistory from "../components/speed-networking/SpeedNetworkingMatchHistory";
import { isOwnerUser, isStaffUser } from "../utils/adminRole";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import AccessTimeIcon from "@mui/icons-material/AccessTime";

dayjs.extend(utc);
dayjs.extend(timezone);
const RAW_BASE = (import.meta.env.VITE_API_BASE_URL || "").trim();
const API_BASE = RAW_BASE.endsWith("/") ? RAW_BASE.slice(0, -1) : RAW_BASE;
const urlJoin = (base, path) => `${base}${path.startsWith("/") ? path : `/${path}`}`;
const API_ORIGIN = API_BASE.replace(/\/api$/, "");
const toAbs = (u) => {
  if (!u) return u;
  if (/^https?:\/\//i.test(u)) return u;
  const p = u.startsWith("/") ? u : `/${u}`;
  return `${API_ORIGIN}${p}`;
};
const EARLY_JOIN_MINUTES = 15;
function parseDateSafe(s) {
  if (!s) return null;
  if (typeof s === "string") {
    let v = s.trim();
    // convert "YYYY-MM-DD HH:mm:ss+05:30" -> "YYYY-MM-DDTHH:mm:ss+05:30"
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(v) && !v.includes("T")) {
      v = v.replace(" ", "T");
    }
    const t = Date.parse(v);
    return Number.isNaN(t) ? null : new Date(t);
  }
  const d = new Date(s);
  return Number.isNaN(d) ? null : d;
}
function canEarlyJoin(ev) {
  const startMs = parseDateSafe(ev?.start_time)?.getTime();
  if (!startMs) return false;
  const now = Date.now();
  return now >= startMs - EARLY_JOIN_MINUTES * 60 * 1000 && now < startMs;
}
// in computeStatus
function computeStatus(ev) {
  const now = Date.now();
  const s = parseDateSafe(ev.start_time)?.getTime() || 0;
  const e = parseDateSafe(ev.end_time)?.getTime() || 0;

  // ✅ match MyEventsPage behavior
  if (ev.status === "ended") return "past";

  if (ev.is_live && ev.status !== "ended") return "live";
  if (s && e && now >= s && now <= e && ev.status !== "ended") return "live";
  if (s && now < s) return "upcoming";
  if (e && now > e) return "past";
  return "upcoming";
}

function priceStr(p) {
  if (p === 0) return "Free";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(Number(p));
  } catch {
    return `$${p}`;
  }
}


function EventDetailsSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Container maxWidth="xl" className="py-6 sm:py-8">
        <div className="grid grid-cols-12 gap-3 md:gap-4 items-start">
          <main className="col-span-12">
            <div className="flex flex-col gap-6">
              <Breadcrumbs sx={{ mb: 2 }}>
                <Link to="/account/events" style={{ textDecoration: "none", color: "#666" }}>
                  My Events
                </Link>
                <Skeleton variant="text" width={220} />
              </Breadcrumbs>
              {/* EVENT CARD skeleton */}
              <Paper elevation={0} className="rounded-2xl border border-slate-200 overflow-hidden">
                <Skeleton
                  variant="rectangular"
                  sx={{ width: "100%", height: { xs: 160, sm: 200, md: 240 } }}
                />
                <Box sx={{ p: { xs: 2.5, sm: 3, md: 4 } }}>
                  <Stack spacing={2}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Skeleton variant="rounded" width={72} height={24} />
                      <Skeleton width={90} height={16} />
                    </Stack>

                    <Skeleton height={34} width="72%" />
                    <Skeleton height={16} width="48%" />

                    <Skeleton height={26} width="40%" />
                    <Skeleton height={18} width="96%" />
                    <Skeleton height={18} width="92%" />
                    <Skeleton height={18} width="84%" />
                  </Stack>
                </Box>
              </Paper>

              {/* ATTEND CARD skeleton */}
              <Paper elevation={0} className="rounded-2xl border border-slate-200">
                <Box className="p-5">
                  <Skeleton height={28} width={120} />
                  <div className="mt-3 flex flex-col gap-2">
                    <Skeleton variant="rounded" height={40} />
                    <Skeleton variant="rounded" height={40} />
                    <Skeleton variant="rounded" height={40} />
                  </div>
                </Box>
              </Paper>
            </div>
          </main>
        </div>
      </Container>
    </div>
  );
}

function CustomTabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

export default function EventDetailsPage() {
  const { slug } = useParams();
  const token =
    localStorage.getItem("access_token") ||
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    "";
  const location = useLocation();
  const preload = location.state?.event || null;
  const fallbackId = preload?.id || null;

  const [event, setEvent] = useState(preload || null);
  const [loading, setLoading] = useState(!preload);
  const [error, setError] = useState(null);

  // Participant List Dialog
  const [showParticipantsDialog, setShowParticipantsDialog] = useState(false);
  const [participantList, setParticipantList] = useState([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [participantError, setParticipantError] = useState(null);

  // Tabs & Speed Networking
  const [activeTab, setActiveTab] = useState(0);
  const [speedNetworkingSessionId, setSpeedNetworkingSessionId] = useState(null);
  const [checkingSpeedNetworking, setCheckingSpeedNetworking] = useState(false);


  const handleShowParticipants = async () => {
    setShowParticipantsDialog(true);
    setParticipantList([]);
    setLoadingParticipants(true);
    setParticipantError(null);

    try {
      const res = await fetch(`${API_BASE}/events/${event.id}/participants/`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to load participants");
      const data = await res.json();
      setParticipantList(data);
    } catch (err) {
      setParticipantError(err.message);
    } finally {
      setLoadingParticipants(false);
    }
  };

  // Force re-render every second to keep join button text current
  useSecondTick();

  // Fetch registration status
  const [registration, setRegistration] = useState(null);
  useEffect(() => {
    if (!event?.id || !token) return;
    let cancelled = false;
    (async () => {
      try {
        // Uses the backend filter ?event={id}
        const res = await fetch(`${API_BASE}/event-registrations/?event=${event.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          const results = Array.isArray(data) ? data : (data.results || []);
          if (results.length > 0) setRegistration(results[0]);
        }
      } catch { }
    })();
    return () => { cancelled = true; };
  }, [event?.id, token]);

  useEffect(() => {
    let cancelled = false;
    async function fetchEvent() {
      setLoading(true);
      setError(null);
      try {
        // If we came from a list and have the ID, fetch by ID only (avoid slug 404 spam)
        if (fallbackId) {
          const byIdUrl = urlJoin(API_BASE, `/events/${fallbackId}/`);
          const res = await fetch(byIdUrl, {
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            }
          });
          if (cancelled) return;
          if (res.ok) {
            setEvent(await res.json());
            setLoading(false);
            return;
          }
          setError(`Couldn’t load event (HTTP ${res.status}) by id.`);
          setLoading(false);
          return;
        }
        // No ID in state? User probably hit a direct link — try by slug.
        const bySlugUrl = urlJoin(API_BASE, `/events/${encodeURIComponent(slug)}/`);
        const resSlug = await fetch(bySlugUrl, {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (cancelled) return;
        if (resSlug.ok) {
          setEvent(await resSlug.json());
          setLoading(false);
          return;
        }
        setError(`Couldn’t load event (HTTP ${resSlug.status}) by slug.`);
        setLoading(false);
      } catch (e) {
        if (!cancelled) {
          setError("Network error while loading event.");
          setLoading(false);
        }
      }
    }
    fetchEvent();
    return () => { cancelled = true; };
  }, [slug, token, fallbackId]);


  // Check for Speed Networking Session
  useEffect(() => {
    if (!event?.id || !token) return;

    let cancelled = false;
    const fetchActiveSession = async () => {
      setCheckingSpeedNetworking(true);
      try {
        const url = `${API_BASE}/events/${event.id}/speed-networking/`.replace(/([^:]\/)\/+/g, "$1");
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (cancelled) return;

        if (res.ok) {
          const data = await res.json();
          // Check for active or ended sessions.
          // If exist, we show the tab. Ideally checking for ANY session relevant to display.
          const existingSession = data.results?.find(s => s.status === 'ACTIVE' || s.status === 'ENDED' || s.status === 'SCHEDULED'); // Including SCHEDULED just in case
          if (existingSession) {
            setSpeedNetworkingSessionId(existingSession.id);
          }
        }
      } catch (err) {
        console.error('[EventDetails] Error fetching session:', err);
      } finally {
        if (!cancelled) setCheckingSpeedNetworking(false);
      }
    };

    fetchActiveSession();
    return () => { cancelled = true; };
  }, [event?.id, token]);


  if (loading) {
    return <EventDetailsSkeleton />;
  }
  if (!event) return null;
  const status = computeStatus(event);
  const chip = status === "live"
    ? { label: "Live", className: "bg-rose-50 text-rose-700" }
    : status === "upcoming"
      ? { label: "Upcoming", className: "bg-teal-50 text-teal-700" }
      : { label: "Past", className: "bg-slate-100 text-slate-700" };
  // Decide the best join URL:
  const isHost = Boolean(registration?.is_host);
  const livePath = `/live/${event.slug || event.id}?id=${event.id}&role=${isHost ? "publisher" : "audience"}`;
  const isPostEventLounge = isPostEventLoungeOpen(event);
  const isPast = (status === "past" || event.status === "ended") && !isPostEventLounge;
  const isLive = status === "live" && event.status !== "ended";
  const isWithinEarlyJoinWindow = canEarlyJoin(event);
  const isPreEventLounge = isPreEventLoungeOpen(event);

  const canShowActiveJoin = isHost || isLive || isWithinEarlyJoinWindow || isPreEventLounge || isPostEventLounge;
  const canWatch = isPast && !!event.recording_url;
  const desc = event?.description ?? "";

  const searchParams = new URLSearchParams(location.search);
  const refParam = searchParams.get("ref");
  const backLabel = refParam === "my_events" ? "My Events" : "Explore Events";
  const backPath = refParam === "my_events" ? "/account/events" : "/events";

  const showSpeedNetworkingTab = !!speedNetworkingSessionId;

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* BODY with LEFT NAV + MAIN */}
      <Container maxWidth="xl" className="py-6 sm:py-8">
        <div className="grid grid-cols-12 gap-3 md:gap-4 items-start">
          <main className="col-span-12">
            <div className="flex flex-col gap-6">

              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <Button
                  startIcon={<ArrowBackRoundedIcon />}
                  component={Link}
                  to={backPath}
                  sx={{
                    textTransform: "none",
                    color: "text.primary",
                    fontWeight: 600,
                    minWidth: "auto",
                    px: 1,
                    "&:hover": { bgcolor: "rgba(0,0,0,0.04)" }
                  }}
                >
                  Back
                </Button>
                <Breadcrumbs separator="›">
                  <Link to={backPath} style={{ textDecoration: "none", color: "#666" }}>
                    {backLabel}
                  </Link>
                  <Typography color="text.primary">
                    {event?.title || "Event"}
                  </Typography>
                </Breadcrumbs>
              </Stack>

              {/* TABS HEADER - MOVED TO TOP */}
              {showSpeedNetworkingTab && (
                <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                  <Tabs value={activeTab} onChange={handleTabChange} aria-label="event details tabs">
                    <Tab label="Overview" {...a11yProps(0)} />
                    <Tab label="Speed Networking" {...a11yProps(1)} />
                  </Tabs>
                </Box>
              )}

              {/* TAB CONTENT: OVERVIEW */}
              {/* If tabs are hidden (no speed networking), always show content. Otherwise check activeTab === 0 */}
              {(!showSpeedNetworkingTab || activeTab === 0) && (
                <Box>
                  {/* EVENT HEADER CARD */}
                  <Paper elevation={0} className="rounded-2xl border border-slate-200 overflow-hidden mb-6">
                    {event.preview_image ? (
                      <Box
                        component="img"
                        src={toAbs(event.preview_image)}
                        alt={event.title}
                        loading="lazy"
                        sx={{
                          width: "100%",
                          height: { xs: 160, sm: 200, md: 240 },
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: "100%",
                          height: { xs: 160, sm: 200, md: 240 },
                          bgcolor: "grey.200",
                        }}
                      />
                    )}
                    <Box sx={{ p: { xs: 2.5, sm: 3, md: 4 } }}>
                      <Stack spacing={2}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Chip
                            size="small"
                            label={chip.label}
                            className={`${chip.className} font-medium`}
                          />
                          {event?.category ? (
                            <Typography variant="caption" color="text.secondary">
                              {event.category}
                            </Typography>
                          ) : null}
                        </Stack>
                        {event?.title ? (
                          <Typography variant="h5" fontWeight={800} lineHeight={1.2}>
                            {event.title}
                          </Typography>
                        ) : null}

                        {/* Date & Time Display */}
                        {(event.start_time || event.end_time) && (
                          <Stack direction="row" spacing={3} alignItems="center" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <CalendarMonthIcon fontSize="small" className="text-teal-700" />
                              <Typography variant="body2">
                                {dayjs(event.start_time).format("MMMM D, YYYY")}
                              </Typography>
                            </Stack>
                            {event.end_time && (
                              <Stack direction="row" spacing={1} alignItems="center">
                                <AccessTimeIcon fontSize="small" className="text-teal-700" />
                                <Typography variant="body2">
                                  {dayjs(event.start_time).format("h:mm A")} – {dayjs(event.end_time).format("h:mm A")}
                                </Typography>
                              </Stack>
                            )}
                          </Stack>
                        )}
                        {event?.location ? (
                          <Stack direction="row" spacing={0.75} alignItems="center">
                            <span role="img" aria-label="location">📍</span>
                            <Typography variant="body2" color="text.secondary">
                              {event.location}
                            </Typography>
                          </Stack>
                        ) : null}

                        {/* Participant Count */}
                        {Number.isFinite(event.registrations_count) && (() => {
                          const owner = isOwnerUser();
                          const staff = isStaffUser();
                          const now = Date.now();
                          const s = event.start_time ? parseDateSafe(event.start_time).getTime() : 0;
                          const e = event.end_time ? parseDateSafe(event.end_time).getTime() : 0;
                          const isBefore = s && now < s;
                          const isAfter = e && now > e;

                          let canView = true;
                          if (!owner && !staff) {
                            if (isBefore && event.show_participants_before_event === false) canView = false;
                            else if (isAfter && event.show_participants_after_event === false) canView = false;
                          }

                          if (canView) {
                            return (
                              <Stack direction="row" spacing={0.75} alignItems="center"
                                sx={{ cursor: 'pointer', '&:hover': { color: 'teal' }, transition: 'color 0.2s' }}
                                onClick={handleShowParticipants}
                              >
                                <GroupsIcon fontSize="small" className="text-teal-700" />
                                <Typography variant="body2" color="text.secondary" sx={{ '&:hover': { color: 'teal' } }}>
                                  {event.registrations_count} registered
                                </Typography>
                              </Stack>
                            );
                          } else {
                            return (
                              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ cursor: 'default' }}>
                                <GroupsIcon fontSize="small" className="text-teal-700" />
                                <Typography variant="body2" color="text.secondary">
                                  {event.registrations_count} registered
                                </Typography>
                              </Stack>
                            );
                          }
                        })()}
                        <Typography variant="h6" fontWeight={800}>
                          About this event
                        </Typography>
                        {desc?.trim() ? (
                          <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
                            {desc}
                          </Typography>
                        ) : (
                          <Typography variant="body1" color="text.secondary">
                            Event details will be announced soon.
                          </Typography>
                        )}
                      </Stack>
                    </Box>
                  </Paper>

                  {/* ATTEND CARD */}
                  <Paper elevation={0} className="rounded-2xl border border-slate-200">
                    <Box className="p-5">
                      <Typography variant="h6" className="font-extrabold">Attend</Typography>
                      <Typography variant="h5" className="font-bold text-teal-600 mt-1 mb-2">
                        {event.is_free ? "Free" : priceStr(event.price)}
                      </Typography>
                      <div className="mt-3 flex flex-col gap-2">
                        {/* Replay Info Badge */}
                        {event.replay_available && (
                          <Box className="mt-2 mb-3 bg-indigo-50 border border-indigo-100 rounded-lg p-3">
                            <Typography variant="subtitle2" className="text-indigo-800 font-semibold">
                              Replay will be available
                            </Typography>
                            {event.replay_availability_duration && (
                              <Typography variant="caption" className="text-indigo-600 block mt-0.5">
                                Accessible for: {event.replay_availability_duration}
                              </Typography>
                            )}
                          </Box>
                        )}

                        {canShowActiveJoin ? (
                          <Button
                            component={Link}
                            to={livePath}
                            state={{ event, openLounge: isPreEventLounge || isPostEventLounge, preEventLounge: isPreEventLounge }}
                            sx={{
                              textTransform: "none",
                              backgroundColor: "#10b8a6",
                              "&:hover": { backgroundColor: "#0ea5a4" },
                            }}
                            className="rounded-xl"
                            variant="contained"
                          >
                            {isHost ? "Join as Host" : getJoinButtonText(event, isLive, false)}
                          </Button>
                        ) : canWatch ? (
                          <Button
                            component="a"
                            href={event.recording_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            variant="outlined"
                            sx={{ textTransform: "none" }}
                            className="rounded-xl"
                          >
                            Watch Recording
                          </Button>
                        ) : isPast ? (
                          <Button
                            disabled
                            variant="contained"
                            sx={{ textTransform: "none", backgroundColor: "#CBD5E1" }}
                            className="rounded-xl"
                          >
                            Event Ended
                          </Button>
                        ) : (
                          <Button
                            disabled
                            variant="contained"
                            sx={{ textTransform: "none", backgroundColor: "#CBD5E1" }}
                            className="rounded-xl"
                          >
                            Join (Not Live Yet)
                          </Button>


                        )}

                        {registration && (
                          <Box className="flex justify-center py-2">
                            <RegisteredActions
                              ev={event}
                              reg={registration}
                              onUnregistered={() => setRegistration(null)}
                              onCancelRequested={(_, updated) => setRegistration(updated)}
                            />
                          </Box>
                        )}

                        <Button
                          component={Link}
                          to="/account/events"
                          variant="outlined"
                          sx={{ textTransform: "none" }}
                          className="rounded-xl"
                        >
                          Back to my events
                        </Button>
                      </div>
                    </Box>
                  </Paper>
                </Box>
              )}

              {/* TAB CONTENT: SPEED NETWORKING */}
              {showSpeedNetworkingTab && activeTab === 1 && (
                <Paper elevation={0} className="rounded-2xl border border-slate-200">
                  <Box className="p-5">
                    <SpeedNetworkingMatchHistory eventId={event.id} sessionId={speedNetworkingSessionId} />
                  </Box>
                </Paper>
              )}


            </div>
          </main>
        </div>
      </Container>

      <ParticipantListDialog
        open={showParticipantsDialog}
        onClose={() => setShowParticipantsDialog(false)}
        participants={participantList}
        eventTitle={event?.title || "Event"}
        loading={loadingParticipants}
        error={participantError}
      />
    </div>
  );
}
