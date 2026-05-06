// src/pages/EventDetailsPage.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useLocation, useNavigate } from "react-router-dom";
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
  Avatar,
  AvatarGroup,
  Tooltip,
  Alert,
  Divider,
  Collapse,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import RegisteredActions from "../components/RegisteredActions.jsx";
import GuestJoinModal from "../components/GuestJoinModal.jsx";
import GuestApplyModal from "../components/GuestApplyModal.jsx";
import ApplyNowModal from "../components/ApplyNowModal.jsx";
import PreEventQnAModal from "../components/PreEventQnAModal.jsx";
import PreEventQnaManager from "../components/PreEventQnaManager.jsx";
import { getJoinButtonText, isPostEventLoungeOpen, isPreEventLoungeOpen, willGoToWaitingRoom, getResolvedJoinLabel } from "../utils/gracePeriodUtils";
import { useSecondTick } from "../utils/useGracePeriodTimer";
import { useJoinLiveState } from "../utils/sessionJoinLogic";
import GroupsIcon from "@mui/icons-material/Groups";
import ParticipantListDialog from "../components/ParticipantListDialog";
import SpeedNetworkingMatchHistory from "../components/speed-networking/SpeedNetworkingMatchHistory";
import { isOwnerUser, isStaffUser, getBackendUserFromStorage } from "../utils/adminRole";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PeopleOutlineIcon from "@mui/icons-material/PeopleOutline";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import UnfoldLessIcon from "@mui/icons-material/UnfoldLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { normalizeTimezoneName, getBrowserTimezone } from "../utils/timezoneUtils";
import { resolveRecordingUrl } from "../utils/recordingUrl";
import { toast } from "react-toastify";
import { Helmet } from "react-helmet-async";

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

// Get location display text, handling virtual/hybrid events
function getEventLocation(event) {
  const format = event?.event_format || event?.format;
  if (format === "virtual" || format === "hybrid") {
    return "Virtual live";
  }
  // Use location_city + location_country if available (new format), fall back to location string
  if (event?.location_city || event?.location_country) {
    return [event?.location_city, event?.location_country].filter(Boolean).join(", ");
  }
  return event?.location || "";
}

function bumpCartCount(qty = 1) {
  const prev = Number(localStorage.getItem("cart_count") || "0");
  const next = prev + qty;
  localStorage.setItem("cart_count", String(next));
  window.dispatchEvent(new Event("cart:update"));
}

async function addToCart(eventId, qty = 1, token) {
  try {
    const res = await fetch(`${API_BASE}/cart/items/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ event_id: eventId, quantity: qty }),
    });
    if (!res.ok) {
      const text = await res.text();
      toast.error(`Add to cart failed (${res.status}): ${text}`);
      return null;
    }
    const item = await res.json();
    try {
      const r2 = await fetch(`${API_BASE}/cart/count/`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const d2 = await r2.json();
      localStorage.setItem("cart_count", String(d2?.count ?? 0));
      window.dispatchEvent(new Event("cart:update"));
    } catch { }
    return item;
  } catch {
    toast.error("Could not add to cart. Please try again.");
    return null;
  }
}

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

function isWithinGuestJoinWindow(eventStartTime) {
  if (!eventStartTime) return false;

  const now = Date.now();
  const startMs = parseDateSafe(eventStartTime)?.getTime();

  if (!startMs) return false;

  const timeUntilStartMs = startMs - now;
  const timeUntilStartMinutes = timeUntilStartMs / (1000 * 60);

  // Show button only when event is 1-2 hours away
  // 60 minutes <= time until start <= 120 minutes
  return timeUntilStartMinutes >= 60 && timeUntilStartMinutes <= 120;
}

function canViewParticipants(event, owner, staff) {
  if (!event) return false;
  if (owner || staff) return true;

  const now = Date.now();
  const startMs = parseDateSafe(event.start_time)?.getTime() || 0;
  const endMs = parseDateSafe(event.end_time)?.getTime() || 0;
  const isBefore = startMs > 0 && now < startMs;
  const isAfter = event.status === "ended" || (endMs > 0 && now > endMs);

  // For regular users, only allow pre-event list when explicitly enabled.
  if (isBefore) return event.show_participants_before_event === true;
  if (isAfter) return event.show_participants_after_event !== false;
  return true;
}
// in computeStatus
function computeStatus(ev) {
  const now = Date.now();
  const s = parseDateSafe(ev.start_time)?.getTime() || 0;
  const e = parseDateSafe(ev.end_time)?.getTime() || 0;

  if (ev.status === "cancelled") return "cancelled";

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

function displayPrice(event) {
  if (event.is_free) return "Free";
  if (event.price_label) return event.price_label;
  return priceStr(event.price);
}

function getSessionDescription(session) {
  if (!session || typeof session !== "object") return "";
  return (
    session.description ||
    session.session_description ||
    session.details ||
    session.summary ||
    session.agenda ||
    ""
  ).toString().trim();
}

function normalizeSession(session = {}) {
  return {
    ...session,
    description: getSessionDescription(session),
  };
}

function FeaturedParticipantsStrip({ participants = [], total = 0 }) {
  if (!participants.length) return null;

  return (
    <Box className="mt-4 rounded-xl border border-teal-100 bg-teal-50/70 p-3">
      <Box className="text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-700">
        Event Line-up
      </Box>
      <Box className="mt-2 space-y-2">
        {participants.map((person, index) => {
          const row = (
            <Box className="flex items-center gap-3 rounded-lg bg-white/80 px-2.5 py-2">
              <Avatar
                src={person.avatar_url || ""}
                alt={person.display_name}
                sx={{ width: 34, height: 34, fontSize: "0.9rem" }}
              >
                {(person.display_name?.[0] || "P").toUpperCase()}
              </Avatar>
              <Box className="min-w-0 flex-1">
                <Box className="truncate text-sm font-semibold text-neutral-900">
                  {person.display_name}
                </Box>
              </Box>
              <Box className="flex gap-1">
                <Chip
                  label={person.role_label || "Participant"}
                  size="small"
                  color={person.role === "host" ? "primary" : person.role === "speaker" ? "success" : "secondary"}
                  sx={{ height: 22, fontSize: "0.7rem" }}
                />
                {person.participant_type && (
                  <Chip
                    label={person.participant_type_label || person.participant_type}
                    size="small"
                    variant="outlined"
                    color={person.participant_type === "virtual" ? "info" : "default"}
                    sx={{ height: 22, fontSize: "0.7rem" }}
                  />
                )}
              </Box>
            </Box>
          );

          return person.is_profile_clickable && person.profile_url ? (
            <Link key={`${person.user_id || person.display_name}-${index}`} to={person.profile_url} className="block no-underline">
              {row}
            </Link>
          ) : (
            <Box key={`${person.user_id || person.display_name}-${index}`}>
              {row}
            </Box>
          );
        })}
      </Box>
      {total > participants.length && (
        <Box className="mt-2 text-xs font-medium text-teal-700">
          +{total - participants.length} more
        </Box>
      )}
    </Box>
  );
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
  const navigate = useNavigate();
  const token =
    localStorage.getItem("access_token") ||
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    "";
  const isGuest = localStorage.getItem("is_guest") === "true";
  const location = useLocation();
  const preload = location.state?.event || null;
  const fallbackId = preload?.id || null;

  const [event, setEvent] = useState(preload || null);
  const [loading, setLoading] = useState(!preload);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);

  // Participant List Dialog
  const [showParticipantsDialog, setShowParticipantsDialog] = useState(false);
  const [participantList, setParticipantList] = useState([]);
  const [participantHiddenRolesCount, setParticipantHiddenRolesCount] = useState(0);
  const [participantTotalRegisteredCount, setParticipantTotalRegisteredCount] = useState(0);
  const [expandedSessionDescriptions, setExpandedSessionDescriptions] = useState({});
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [participantError, setParticipantError] = useState(null);

  // Tabs & Speed Networking
  const [activeTab, setActiveTab] = useState(0);
  const [speedNetworkingSessionId, setSpeedNetworkingSessionId] = useState(null);
  const [checkingSpeedNetworking, setCheckingSpeedNetworking] = useState(false);

  // ✅ NEW: Real-time admission status updates
  const [admissionStatus, setAdmissionStatus] = useState(null);

  // Guest Join Modal
  const [guestModalOpen, setGuestModalOpen] = useState(false);

  // Guest Apply Modal (for apply-type events)
  const [guestApplyModalOpen, setGuestApplyModalOpen] = useState(false);

  // Apply Modal
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [myApplication, setMyApplication] = useState(null);

  // Pre-Event Q&A Modal
  const [preEventQnaModalOpen, setPreEventQnaModalOpen] = useState(false);
  const [preEventQnaRefreshTrigger, setPreEventQnaRefreshTrigger] = useState(0);

  // Participant Preview
  const [previewParticipants, setPreviewParticipants] = useState([]);
  const [previewParticipantsForbidden, setPreviewParticipantsForbidden] = useState(false);

  // Q&A Expand/Collapse
  const [expandedQaItems, setExpandedQaItems] = useState({});

  // Local questions state for real-time updates
  const [localQuestions, setLocalQuestions] = useState([]);

  // Q&A Status Filter
  const [qaStatusFilter, setQaStatusFilter] = useState('all'); // 'all', 'answered_live', 'answered_post_event', 'pending'

  // Q&A Groups state
  const [qaGroups, setQaGroups] = useState([]);

  // Component for clickable user names
  const ClickableAsker = ({ userId, name, isAnonymous }) => {
    if (isAnonymous) return "Anonymous";
    if (!userId) return name || "Unknown";
    const isCurrentUser = userId === currentUserId;
    if (isCurrentUser) return "Me";
    return (
      <Link
        to={`/community/rich-profile/${userId}`}
        style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}
        className="hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {name}
      </Link>
    );
  };

  const handleImageLoad = useCallback((e) => {
    const img = e.currentTarget;
  }, []);

  const refreshEventFromServer = useCallback(async () => {
    if (!event?.id) return;
    try {
      const res = await fetch(urlJoin(API_BASE, `/events/${event.id}/?include=questions`), {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) return;
      const latest = await res.json();
      setEvent(latest);
      // Also refresh groups since they might have changed
      fetchQaGroups(event.id);
    } catch (_) {
      // no-op: keep existing event state on transient network errors
    }
  }, [event?.id, token]);

  const fetchQaGroups = useCallback(async (eventId) => {
    if (!eventId) return;
    try {
      const res = await fetch(urlJoin(API_BASE, `/interactions/qna-groups/?event_id=${eventId}`), {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) return;
      const data = await res.json();
      setQaGroups(Array.isArray(data) ? data : (data.results || []));
    } catch (e) {
      console.error("Error fetching Q&A groups:", e);
    }
  }, [token]);

  // Handle invite_token from URL
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const inviteToken = searchParams.get("invite_token");
    const eventIdOrSlug = event?.id || slug;

    if (inviteToken && eventIdOrSlug && token) {
      const acceptInvite = async () => {
        try {
          const res = await fetch(urlJoin(API_BASE, `/events/${eventIdOrSlug}/invite-emails/accept/`), {
            method: "POST",
            headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify({ token: inviteToken })
          });
          const data = await res.json().catch(() => ({}));

          if (res.ok) {
            if (data?.status === "requires_payment") {
              toast.info("This is a paid event. Adding to cart...");
              const item = await addToCart(eventIdOrSlug, 1, token);
              if (item) {
                bumpCartCount(0);
              }
            } else {
              refreshEventFromServer();
              // Also refresh registration immediately
              const mineRes = await fetch(`${API_BASE}/event-registrations/mine/`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (mineRes.ok) {
                const mineData = await mineRes.json();
                const results = Array.isArray(mineData) ? mineData : (mineData.results || []);
                const mineForEvent = results.find((r) => Number(r?.event?.id) === Number(event?.id));
                setRegistration(mineForEvent || null);
              }
            }
          } else if (res.status !== 400 || data?.detail !== "Invalid or expired token.") {
            console.error(data?.detail || "Could not accept invite.");
          }

          const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
          window.history.replaceState({ path: newUrl }, '', newUrl);
        } catch (e) {
          console.error("Error accepting event invite:", e);
        }
      };

      // We only execute this if we already loaded the event to know its ID
      if (event?.id) {
        acceptInvite();
      }
    }
  }, [location.search, event?.id, slug, token, refreshEventFromServer]);

  useEffect(() => {
    if (!event?.id) return;

    setPreviewParticipantsForbidden(false);
  }, [event?.id]);

  useEffect(() => {
    if (!event?.id) return;
    if (previewParticipantsForbidden) return;
    if (!token) {
      setPreviewParticipants([]);
      return;
    }

    // Skip participant preview for guests (they don't have permission)
    const isGuest = localStorage.getItem("is_guest") === "true";
    if (isGuest) {
      setPreviewParticipants([]);
      return;
    }

    // Check visibility rules
    const owner = isOwnerUser();
    const staff = isStaffUser();
    const canView = canViewParticipants(event, owner, staff);

    if (!canView) {
      setPreviewParticipants([]);
      return;
    }

    let cancelled = false;
    const fetchPreview = async () => {
      try {
        const res = await fetch(`${API_BASE}/events/${event.id}/participants/?limit=5`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (cancelled) return;
        if (res.status === 403) {
          setPreviewParticipants([]);
          setPreviewParticipantsForbidden(true);
          return;
        }
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : (data.participants || data.results || []);
          setPreviewParticipants(list);
        }
      } catch (err) {
        console.error("Failed to load participant preview", err);
      }
    };

    fetchPreview();
    return () => { cancelled = true; };
  }, [event?.id, token, event?.start_time, event?.end_time, event?.show_participants_before_event, event?.show_participants_after_event, previewParticipantsForbidden]);


  const handleShowParticipants = async () => {
    setShowParticipantsDialog(true);
    setParticipantList([]);
    setParticipantHiddenRolesCount(0);
    setParticipantTotalRegisteredCount(0);
    setLoadingParticipants(true);
    setParticipantError(null);

    try {
      const res = await fetch(`${API_BASE}/events/${event.id}/participants/`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.status === 403) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail || "Participant list is not available right now.");
      }
      if (!res.ok) throw new Error("Failed to load participants");
      const data = await res.json();
      setParticipantList(Array.isArray(data) ? data : (data.participants || []));
      setParticipantHiddenRolesCount(Number(data?.hidden_roles_count || 0));
      setParticipantTotalRegisteredCount(
        Number(
          data?.total_registered ??
          (
            Number(data?.public_registered_count ?? data?.total_registered_count ?? 0) +
            Number(data?.public_guest_count ?? 0)
          )
        )
      );
    } catch (err) {
      setParticipantError(err.message);
    } finally {
      setLoadingParticipants(false);
    }
  };

  // Force re-render every second to keep join button text current
  useSecondTick();

  // Get session-aware join state for multi-day events
  const joinState = useJoinLiveState(event);

  // Fetch registration status
  const [registration, setRegistration] = useState(null);
  useEffect(() => {
    if (!event?.id || !token) return;
    let cancelled = false;
    (async () => {
      try {
        // Fetch only the current user's registrations, then pick this event.
        const res = await fetch(`${API_BASE}/event-registrations/mine/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          const results = Array.isArray(data) ? data : (data.results || []);
          const mineForEvent = results.find((r) => Number(r?.event?.id) === Number(event.id));
          setRegistration(mineForEvent || null);
        }
      } catch { }
    })();
    return () => { cancelled = true; };
  }, [event?.id, token]);

  // Fetch application status for events with apply registration type
  useEffect(() => {
    if (!event?.id) return;
    if (event.registration_type !== 'apply') {
      setMyApplication(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const headers = { "Content-Type": "application/json" };
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        // For unauthenticated users, check localStorage for cached email
        let url = `${API_BASE}/events/${event.id}/apply/`;
        if (!token) {
          const cached = localStorage.getItem("application_cache");
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              if (parsed.email) {
                url += `?email=${encodeURIComponent(parsed.email)}`;
              }
            } catch (err) {
              console.error("Failed to parse application_cache:", err);
            }
          }
        }

        const res = await fetch(url, {
          headers,
        });
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          setMyApplication(data);
        }
      } catch { }
    })();
    return () => { cancelled = true; };
  }, [event?.id, event?.registration_type, token]);

  // When application is approved, generate guest JWT if not already in localStorage
  useEffect(() => {
    if (myApplication?.status !== 'approved' || !event?.id) return;

    const guestToken = localStorage.getItem("guest_token");
    // Only generate if no guest token exists
    if (guestToken) return;

    let cancelled = false;
    (async () => {
      try {
        console.log("[EventDetails] Approved application detected without guest token, generating...");
        // Call guest-join to create/update GuestAttendee and get JWT
        const guestRes = await fetch(`${API_BASE}/events/${event.id}/guest-join/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            first_name: myApplication.first_name || "",
            last_name: myApplication.last_name || "",
            email: myApplication.email,
            job_title: myApplication.job_title || "",
            company_name: myApplication.company_name || "",
          }),
        });

        if (cancelled) return;

        if (guestRes.ok) {
          const guestData = await guestRes.json();
          // Store guest JWT token
          localStorage.setItem("guest_token", guestData.token);
          localStorage.setItem("guest_id", guestData.guest_id.toString());
          console.log("[EventDetails] ✅ Guest JWT token stored");
          console.log("[EventDetails] guest_id:", guestData.guest_id);
        }
      } catch (e) {
        console.warn("[EventDetails] Failed to generate guest JWT:", e);
      }
    })();
    return () => { cancelled = true; };
  }, [myApplication?.status, myApplication?.email, event?.id]);

  // When application is approved, refresh registration status (for authenticated users)
  useEffect(() => {
    if (myApplication?.status !== 'approved' || !event?.id || !token) return;

    let cancelled = false;
    (async () => {
      try {
        const mineRes = await fetch(`${API_BASE}/event-registrations/mine/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) return;
        if (mineRes.ok) {
          const data = await mineRes.json();
          const results = Array.isArray(data) ? data : (data.results || []);
          const mineForEvent = results.find((r) => Number(r?.event?.id) === Number(event.id));
          setRegistration(mineForEvent || null);
        }
      } catch { }
    })();
    return () => { cancelled = true; };
  }, [myApplication?.status, event?.id, token]);

  // For authenticated users, submit application directly without dialog
  const handleApplyDirect = async () => {
    if (!event?.id || !token) return;

    try {
      // First, fetch user profile to get their name and email
      const profileRes = await fetch(`${API_BASE}/auth/me/profile/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!profileRes.ok) {
        toast.error("Unable to fetch your profile. Please try again.");
        return;
      }

      const profile = await profileRes.json();
      console.log("Profile fetched:", profile);

      // Check if profile has required data
      const missingFields = [];
      if (!profile.first_name) missingFields.push("First Name");
      if (!profile.last_name) missingFields.push("Last Name");
      if (!profile.email) missingFields.push("Email");
      if (!profile.job_title) missingFields.push("Job Title");
      if (!profile.company) missingFields.push("Company");

      if (missingFields.length > 0) {
        toast.error(`Please complete your profile: ${missingFields.join(", ")}`);
        return;
      }

      const applicationData = {
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email,
        job_title: profile.job_title,
        company_name: profile.company,
        linkedin_url: "",
      };
      console.log("Submitting application with data:", applicationData);

      // Submit application with user's profile data
      const res = await fetch(`${API_BASE}/events/${event.id}/apply/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(applicationData),
      });

      if (res.ok) {
        const data = await res.json();
        setMyApplication(data);
        toast.success("Application submitted successfully!");
      } else if (res.status === 409) {
        toast.error("You have already applied to this event.");
      } else {
        const errData = await res.json().catch(() => ({}));
        console.error("Application submission error:", errData);
        toast.error(errData.detail || JSON.stringify(errData) || "Failed to submit application. Please try again.");
      }
    } catch (err) {
      toast.error("Error submitting application: " + err.message);
    }
  };

  const handleRegister = async () => {
    if (!event?.id) return;
    if (!token) {
      navigate(`/signin?next=/events/${encodeURIComponent(slug)}`);
      return;
    }

    if (!event.is_free) {
      toast.info("This is a paid event. Adding to cart...");
      const item = await addToCart(event.id, 1, token);
      if (item) bumpCartCount(0);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/events/${event.id}/register/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });

      if (!res.ok) return;

      const mineRes = await fetch(`${API_BASE}/event-registrations/mine/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (mineRes.ok) {
        const data = await mineRes.json();
        const results = Array.isArray(data) ? data : (data.results || []);
        const mineForEvent = results.find((r) => Number(r?.event?.id) === Number(event.id));
        setRegistration(mineForEvent || null);

        // Show success toast and dispatch unread notification event
        toast.success(`You have successfully registered for "${event?.title || "this event"}"!`);
        try {
          const prev = Number(localStorage.getItem("unread_notifications") || "0");
          const next = prev + 1;
          localStorage.setItem("unread_notifications", String(next));
          window.dispatchEvent(new CustomEvent("notify:unread", { detail: { count: next } }));
        } catch (_) {}
      }
    } catch (_) { }
  };

  useEffect(() => {
    let cancelled = false;
    async function fetchEvent() {
      setLoading(true);
      setError(null);
      setNotFound(false);
      try {
        // If we came from a list and have the ID, fetch by ID only (avoid slug 404 spam)
        if (fallbackId) {
          const byIdUrl = urlJoin(API_BASE, `/events/${fallbackId}/?include=questions`);
          const res = await fetch(byIdUrl, {
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            }
          });
          if (cancelled) return;
          if (res.ok) {
            const data = await res.json();
            setEvent(data);
            fetchQaGroups(data.id);
            setLoading(false);
            return;
          }
          if (res.status === 404) {
            setNotFound(true);
          }
          setError(`Couldn’t load event (HTTP ${res.status}) by id.`);
          setLoading(false);
          return;
        }
        // No ID in state? User probably hit a direct link — try by slug.
        const bySlugUrl = urlJoin(API_BASE, `/events/${encodeURIComponent(slug)}/?include=questions`);
        const resSlug = await fetch(bySlugUrl, {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (cancelled) return;
        if (resSlug.ok) {
          const data = await resSlug.json();
          setEvent(data);
          fetchQaGroups(data.id);
          setLoading(false);
          return;
        }
        if (resSlug.status === 404) {
          setNotFound(true);
        }
        setError(`Couldn’t load event (HTTP ${resSlug.status}) by slug.`);
        setLoading(false);
      } catch (e) {
        if (!cancelled) {
          setNotFound(false);
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

  useEffect(() => {
    if (!event?.id) return;

    const storageKey = `event_visibility_updated_${event.id}`;
    const handleFocus = () => {
      refreshEventFromServer();
    };
    const handleStorage = (evt) => {
      if (evt.key === storageKey) {
        refreshEventFromServer();
      }
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("storage", handleStorage);
    const intervalId = window.setInterval(() => {
      refreshEventFromServer();
    }, 10000);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("storage", handleStorage);
      window.clearInterval(intervalId);
    };
  }, [event?.id, refreshEventFromServer]);

  // Sync local questions from event (polling keeps this fresh; WebSocket patches inline)
  useEffect(() => {
    if (event?.questions) setLocalQuestions(event.questions);
  }, [event?.questions]);

  // Q&A WebSocket connection for real-time answer updates (during and after event)
  useEffect(() => {
    if (!event?.id || !['live', 'ended'].includes(event?.status)) return;

    const token = localStorage.getItem("access_token") || localStorage.getItem("access") || "";
    const WS_ROOT = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api")
      .replace(/^http/, "ws")
      .replace(/\/api\/?$/, "");
    const wsUrl = `${WS_ROOT}/ws/events/${event.id}/qna/${token ? `?token=${encodeURIComponent(token)}` : ""}`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "qna.answered") {
          const cUser = getBackendUserFromStorage();
          setLocalQuestions(prev =>
            prev.map(q => {
              if (q.id !== msg.question_id) return q;
              const updated = {
                ...q,
                is_answered: msg.is_answered,
                answered_at: msg.answered_at,
                answered_by: msg.answered_by,
                answer_text: msg.answer_text ?? q.answer_text,
                answered_phase: msg.answered_phase ?? q.answered_phase,
                requires_followup: msg.requires_followup ?? q.requires_followup,
              };
              // Toast only if it was the logged-in user's own question
              if (cUser?.id && q.user === cUser.id) {
                toast.success("Your question has been answered!");
              }
              return updated;
            })
          );
        }
      } catch (_) { }
    };

    return () => ws.close();
  }, [event?.id, event?.status]);

  const isPrivilegedUser = isOwnerUser() || isStaffUser();
  const canParticipantViewSpeedNetworkingMatchHistory =
    event?.show_speed_networking_match_history !== false;
  const showSpeedNetworkingTab =
    !!speedNetworkingSessionId &&
    (isPrivilegedUser || canParticipantViewSpeedNetworkingMatchHistory);

  // ✅ NEW: Show Sessions tab for multi-day events
  const showSessionsTab = event?.is_multi_day && event?.sessions && event.sessions.length > 0;
  const normalizedSessions = useMemo(
    () => (Array.isArray(event?.sessions) ? event.sessions.map(normalizeSession) : []),
    [event?.sessions]
  );

  // Show Q&A tab when event has ended and (has answered questions OR user has asked questions)
  const currentUserId = getBackendUserFromStorage()?.id;

  // Filter questions based on selected status
  const filterQuestionsByStatus = (questions) => {
    return questions.filter(q => {
      if (qaStatusFilter === 'all') return true;
      if (qaStatusFilter === 'answered_live') return q.is_answered && q.answered_phase === 'live';
      if (qaStatusFilter === 'answered_post_event') return q.is_answered && q.answered_phase === 'post_event';
      if (qaStatusFilter === 'pending') return !q.is_answered;
      return true;
    }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  };

  const showQaTab = event?.status === 'ended' && localQuestions.length > 0 && (
    localQuestions.some(q => q.is_answered) ||
    (currentUserId && localQuestions.some(q => q.user === currentUserId && !q.is_deleted))
  );

  useEffect(() => {
    if (!showSpeedNetworkingTab && !showSessionsTab && !showQaTab && activeTab !== 0) {
      setActiveTab(0);
    }
  }, [showSpeedNetworkingTab, showSessionsTab, showQaTab, activeTab]);


  if (loading) {
    return <EventDetailsSkeleton />;
  }
  if (notFound) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Container maxWidth="xl" className="py-6 sm:py-8">
          <Paper elevation={0} className="rounded-2xl border border-slate-200 p-8">
            <Typography variant="h4" fontWeight={800} sx={{ mb: 1 }}>
              404
            </Typography>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
              Event not found
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              The event slug in the URL does not exist or is no longer available.
            </Typography>
            <Stack direction="row" spacing={1.5}>
              <Button component={Link} to="/events" variant="contained" sx={{ textTransform: "none" }}>
                Go to Events
              </Button>
              <Button component={Link} to="/account/events" variant="outlined" sx={{ textTransform: "none" }}>
                My Events
              </Button>
            </Stack>
          </Paper>
        </Container>
      </div>
    );
  }
  if (!event) return null;
  const status = computeStatus(event);
  const chip = status === "live"
    ? { label: "Live", className: "bg-rose-50 text-rose-700" }
    : status === "upcoming"
      ? { label: "Upcoming", className: "bg-teal-50 text-teal-700" }
      : status === "cancelled"
        ? { label: "Cancelled", className: "bg-red-100 text-red-700" }
        : { label: "Past", className: "bg-slate-100 text-slate-700" };
  // Decide the best join URL:
  const currentUser = getBackendUserFromStorage();
  const isEventOwner = isOwnerUser() || Number(event.created_by_id) === Number(currentUserId);

  const isHost = isEventOwner || Boolean(registration?.is_host);
  const livePath = `/live/${encodeURIComponent(event.slug || event.id)}?id=${event.id}&role=${isHost ? "publisher" : "audience"}`;

  // Declare isLive and multiDayJoinLabel before they're used in primaryActionLabel
  const isLive = status === "live" && event.status !== "ended";
  const multiDayJoinLabel = event.is_multi_day ? joinState?.buttonText : null;

  const primaryActionLabel = isEventOwner ? "Host Now" : getResolvedJoinLabel(event, isLive, false, registration, isEventOwner, multiDayJoinLabel);
  const isPostEventLounge = isPostEventLoungeOpen(event);
  const isPast = (status === "past" || event.status === "ended") && !isPostEventLounge;
  const isWithinEarlyJoinWindow = canEarlyJoin(event);
  const isPreEventLounge = isPreEventLoungeOpen(event);
  const shouldOpenLoungeOnEntry =
    isPostEventLounge || (isPreEventLounge && (isHost || !willGoToWaitingRoom(event)));

  // For multi-day events, check session-based join state
  const multiDayCanJoin = event.is_multi_day ? joinState?.enabled : null;

  const canShowActiveJoin = event.is_multi_day
    ? (joinState?.enabled || isPreEventLounge || isPostEventLounge)
    : (isHost || isLive || isWithinEarlyJoinWindow || isPreEventLounge || isPostEventLounge);
  const canJoinEventNow = event.is_multi_day
    ? (joinState?.enabled || isPreEventLounge || isPostEventLounge || isHost)
    : (isHost || Boolean(registration));
  const canWatch = isPast && !!event.recording_url;
  const desc = event?.description ?? "";

  // Pre-event Q&A eligibility
  const isBeforeEventStart = event?.start_time
    ? Date.now() < new Date(event.start_time).getTime()
    : false;
  const hasActiveRegistration = registration?.status === "registered";
  const showPreEventQnaPrompt =
    isBeforeEventStart &&
    !isLive &&
    !isPast &&
    Boolean(event?.pre_event_qna_enabled) &&
    Boolean(token) &&
    !isGuest &&
    hasActiveRegistration;
  const showPreEventQnaRegisterHint =
    isBeforeEventStart &&
    Boolean(event?.pre_event_qna_enabled) &&
    Boolean(token) &&
    !isGuest &&
    !hasActiveRegistration;

  const searchParams = new URLSearchParams(location.search);
  const refParam = searchParams.get("ref");
  const backLabel = refParam === "my_events" ? "My Events" : "Explore Events";
  const backPath = refParam === "my_events" ? "/account/events" : "/events";

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Build cover image URL
  let coverImageUrl = event?.cover_image || event?.preview_image || '';
  if (coverImageUrl && !coverImageUrl.startsWith('http')) {
    const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/api\/?$/, '');
    coverImageUrl = `${apiBase}${coverImageUrl}`;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {event && (
        <Helmet>
          <title>{event.title}</title>
          <meta property="og:title" content={event.title} />
          <meta property="og:description" content={(event.description || '').slice(0, 160)} />
          {coverImageUrl && <meta property="og:image" content={coverImageUrl} />}
          <meta property="og:url" content={window.location.href} />
          <meta property="og:type" content="website" />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={event.title} />
          {coverImageUrl && <meta name="twitter:image" content={coverImageUrl} />}
        </Helmet>
      )}
      {/* BODY with LEFT NAV + MAIN */}
      <Container maxWidth="xl" className="py-6 sm:py-8">
        <div className="grid grid-cols-12 gap-3 md:gap-4 items-start">
          <main className="col-span-12">
            <div className="flex flex-col gap-6">

              {/* Only show breadcrumbs to logged-in users */}
              {token && (
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
              )}

              {/* TABS HEADER - MOVED TO TOP */}
              {(showSpeedNetworkingTab || showSessionsTab || showQaTab) && (
                <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                  <Tabs value={activeTab} onChange={handleTabChange} aria-label="event details tabs">
                    <Tab label="Overview" {...a11yProps(0)} />
                    {showSessionsTab && <Tab label="Sessions" {...a11yProps(1)} />}
                    {showQaTab && <Tab label="Q&A" {...a11yProps(showSessionsTab ? 2 : 1)} />}
                    {showSpeedNetworkingTab && (
                      <Tab label="Speed Networking" {...a11yProps(showSessionsTab && showQaTab ? 3 : (showSessionsTab || showQaTab ? 2 : 1))} />
                    )}
                  </Tabs>
                </Box>
              )}

              {/* TAB CONTENT: OVERVIEW */}
              {/* Only show when activeTab === 0 (or when no tabs exist) */}
              {((!showSpeedNetworkingTab && !showSessionsTab && !showQaTab) || activeTab === 0) && (
                <Box>
                  {/* EVENT HEADER CARD - NEW LAYOUT */}
                  <Paper elevation={0} className="rounded-2xl border border-slate-200 overflow-hidden mb-6">
                    {/* Top section: Image + Details in a grid */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: { xs: 0, md: 3 }, p: { xs: 2.5, sm: 3, md: 4 }, alignItems: 'start' }}>
                      {/* LEFT: Event Image */}
                      <Box
                        sx={{
                          backgroundColor: "#e5e7eb",
                          padding: 2,
                          borderRadius: 2,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          minHeight: "400px",
                        }}
                      >
                        {(event.cover_image || event.preview_image) ? (
                          <Box
                            component="img"
                            src={toAbs(event.cover_image || event.preview_image)}
                            alt={event.title}
                            loading="lazy"
                            onLoad={handleImageLoad}
                            sx={{
                              width: "100%",
                              maxHeight: "450px",
                              objectFit: "contain",
                              display: "block",
                              borderRadius: 1,
                            }}
                          />
                        ) : (
                          <Box
                            sx={{
                              width: "100%",
                              aspectRatio: "16/9",
                              bgcolor: "grey.200",
                              borderRadius: 2,
                            }}
                          />
                        )}
                      </Box>

                      {/* RIGHT: Event Details */}
                      <Stack spacing={2}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                          <Chip
                            size="small"
                            label={chip.label}
                            className={`${chip.className} font-medium`}
                          />
                          {event?.category ? (
                            <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'right' }}>
                              {event.category}
                            </Typography>
                          ) : null}
                        </Stack>

                        {/* Date & Time Display - Matches Events Page Format */}
                        {(event.start_time || event.end_time) && (
                          <Box>
                            {event.is_multi_day ? (
                              <Stack direction="row" spacing={1} alignItems="center" sx={{ fontSize: '0.875rem' }}>
                                <CalendarMonthIcon fontSize="small" sx={{ color: 'teal' }} />
                                <Typography variant="body2" fontWeight={500}>
                                  {(() => {
                                    const organizerTimezone = normalizeTimezoneName(event.timezone);
                                    const startDate = organizerTimezone ? dayjs(event.start_time).tz(organizerTimezone).format("MMM D, YYYY") : dayjs(event.start_time).format("MMM D, YYYY");
                                    const endDate = organizerTimezone ? dayjs(event.end_time).tz(organizerTimezone).format("MMM D, YYYY") : dayjs(event.end_time).format("MMM D, YYYY");
                                    return (
                                      <>
                                        {startDate}
                                        {event.end_time && event.end_time !== event.start_time ? ` – ${endDate}` : ""}
                                      </>
                                    );
                                  })()}
                                </Typography>
                              </Stack>
                            ) : (
                              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 2, sm: 6 }} sx={{ fontSize: '0.875rem' }}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <CalendarMonthIcon fontSize="small" sx={{ color: 'teal' }} />
                                  <Typography variant="body2">
                                    {(() => {
                                      const organizerTimezone = normalizeTimezoneName(event.timezone);
                                      return organizerTimezone ? dayjs(event.start_time).tz(organizerTimezone).format("MMM D, YYYY") : dayjs(event.start_time).format("MMM D, YYYY");
                                    })()}
                                  </Typography>
                                </Stack>
                                {event.end_time && (
                                  <Stack direction="row" spacing={1} alignItems="flex-start">
                                    <AccessTimeIcon fontSize="small" sx={{ color: 'teal', mt: 0.25 }} />
                                    <Box>
                                      {(() => {
                                        const organizerTimezone = normalizeTimezoneName(event.timezone);
                                        const orgStartTime = organizerTimezone ? dayjs(event.start_time).tz(organizerTimezone).format("h:mm A") : dayjs(event.start_time).format("h:mm A");
                                        const orgEndTime = organizerTimezone ? dayjs(event.end_time).tz(organizerTimezone).format("h:mm A") : dayjs(event.end_time).format("h:mm A");
                                        const localStartTime = dayjs(event.start_time).tz(dayjs.tz.guess()).format("h:mm A");
                                        const localEndTime = dayjs(event.end_time).tz(dayjs.tz.guess()).format("h:mm A");
                                        const isVirtualOrHybrid = (event?.event_format === 'virtual' || event?.event_format === 'hybrid') || (event?.format === 'virtual' || event?.format === 'hybrid');
                                        const timesDiffer = (orgStartTime !== localStartTime || orgEndTime !== localEndTime);

                                        return (
                                          <>
                                            <Typography variant="body2" fontWeight={500} sx={{ color: 'text.primary' }}>
                                              {orgStartTime} – {orgEndTime} <span style={{ color: '#9ca3af' }}>({event.timezone || 'UTC'})</span>
                                            </Typography>
                                            {isVirtualOrHybrid && timesDiffer && (
                                              <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary' }}>
                                                <span style={{ fontWeight: 600, color: '#10b8a6' }}>Your Time:</span> {localStartTime} – {localEndTime} <span style={{ color: '#9ca3af' }}>({dayjs.tz.guess()})</span>
                                              </Typography>
                                            )}
                                          </>
                                        );
                                      })()}
                                    </Box>
                                  </Stack>
                                )}
                              </Stack>
                            )}
                          </Box>
                        )}

                        {/* Location */}
                        {(() => {
                          const locDisplay = getEventLocation(event);
                          return locDisplay ? (
                            <Stack direction="row" spacing={0.75} alignItems="flex-start">
                              <span role="img" aria-label="location" style={{ marginTop: '2px' }}>📍</span>
                              <Typography variant="body2" color="text.secondary">
                                {locDisplay}
                              </Typography>
                            </Stack>
                          ) : null;
                        })()}

                        {/* Venue Details - Only shown to registered/accepted members */}
                        {(() => {
                          if (!event?.venue_name && !event?.venue_address) {
                            return null; // No venue details to show
                          }
                          return (
                            <Stack direction="row" spacing={0.75} alignItems="flex-start">
                              <span role="img" aria-label="venue" style={{ marginTop: '2px' }}>🏢</span>
                              <Box>
                                {event?.venue_name && (
                                  <Typography variant="body2" color="text.secondary">
                                    {event.venue_name}
                                  </Typography>
                                )}
                                {event?.venue_address && (
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                    {event.venue_address}
                                  </Typography>
                                )}
                              </Box>
                            </Stack>
                          );
                        })()}

                        {/* Participant Count */}
                        {(() => {
                          const totalRegisteredCount = Number(
                            event.total_registered ??
                            (
                              Number(event.public_registered_count ?? event.registrations_count ?? event.attending_count ?? 0) +
                              Number(event.public_guest_count ?? 0)
                            )
                          );
                          if (!Number.isFinite(totalRegisteredCount)) return null;
                          const owner = isOwnerUser();
                          const staff = isStaffUser();
                          const canView = canViewParticipants(event, owner, staff);
                          const label = `${Math.max(0, totalRegisteredCount)} registered`;

                          if (canView) {
                            return (
                              <Box
                                onClick={totalRegisteredCount > 0 ? handleShowParticipants : undefined}
                                sx={{
                                  p: 1.5,
                                  border: '1px solid',
                                  borderColor: 'grey.200',
                                  borderRadius: 2,
                                  cursor: totalRegisteredCount > 0 ? 'pointer' : 'default',
                                  transition: 'all 0.2s',
                                  '&:hover': totalRegisteredCount > 0 ? {
                                    bgcolor: 'grey.50',
                                    borderColor: 'primary.main',
                                  } : {}
                                }}
                              >
                                <Stack direction="row" alignItems="center" justifyContent="space-between">
                                  <Stack direction="row" spacing={1.5} alignItems="center">
                                    {totalRegisteredCount > 0 && (
                                      <AvatarGroup
                                        max={5}
                                        sx={{
                                          '& .MuiAvatar-root': {
                                            width: 32,
                                            height: 32,
                                            fontSize: '0.875rem',
                                            border: '2px solid #fff'
                                          }
                                        }}
                                      >
                                        {previewParticipants.map((p) => (
                                          <Tooltip
                                            key={p.registration_id || p.id}
                                            title={p.primary_role ? `${p.display_name || "User"} • ${p.role_labels?.[0] || p.primary_role}` : (p.display_name || "User")}
                                          >
                                            <Avatar
                                              src={p.avatar_url}
                                              alt={p.display_name || "User"}
                                            >
                                              {(p.display_name?.[0] || "U").toUpperCase()}
                                            </Avatar>
                                          </Tooltip>
                                        ))}
                                      </AvatarGroup>
                                    )}
                                    <Box>
                                      <Typography variant="body2" fontWeight={600} color="text.primary">
                                        {label}
                                      </Typography>
                                      {totalRegisteredCount > 0 && (
                                        <Typography variant="caption" color="text.secondary">
                                          Click to view list
                                        </Typography>
                                      )}
                                    </Box>
                                  </Stack>
                                  <GroupsIcon sx={{ color: 'text.secondary', opacity: 0.5 }} />
                                </Stack>
                              </Box>
                            );
                          } else {
                            return (
                              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ cursor: 'default', opacity: 0.7 }}>
                                <GroupsIcon fontSize="small" className="text-teal-700" />
                                <Typography variant="body2" color="text.secondary">
                                  {label}
                                </Typography>
                              </Stack>
                            );
                          }
                        })()}

                        {event?.cpd_cpe_minutes && event?.show_cpd_cpe !== false ? (
                          <Typography variant="body2" color="text.secondary">
                            CPD/CPE Credits: {Number(event.cpd_cpe_credits ?? (event.cpd_cpe_minutes / (event.cpd_cpe_minutes_per_credit || 60))).toFixed(2).replace(/\.?0+$/, "")} (calculated at {event.cpd_cpe_minutes_per_credit || 60} minutes per credit)
                          </Typography>
                        ) : null}

                        {/* Session Counts and Hours Breakdown (Multi-day events only) */}
                        {event?.is_multi_day && (event?.main_sessions_count > 0 || event?.breakout_sessions_count > 0 || event?.workshops_count > 0 || event?.networking_count > 0 || event?.calculated_hours_display) && (
                          <Stack spacing={1.5} sx={{
                            p: 1.5,
                            border: '1px solid',
                            borderColor: 'grey.200',
                            borderRadius: 2,
                            bgcolor: 'grey.50'
                          }}>
                            <Typography variant="body2" fontWeight={600} color="text.primary">
                              Session Breakdown
                            </Typography>
                            <Stack spacing={0.75}>
                              {event?.main_sessions_count > 0 && (
                                <Typography variant="caption" color="text.secondary">
                                  📌 {event.main_sessions_count} Main Session{event.main_sessions_count !== 1 ? 's' : ''}
                                </Typography>
                              )}
                              {event?.breakout_sessions_count > 0 && (
                                <Typography variant="caption" color="text.secondary">
                                  🔀 {event.breakout_sessions_count} Breakout Session{event.breakout_sessions_count !== 1 ? 's' : ''}
                                </Typography>
                              )}
                              {event?.workshops_count > 0 && (
                                <Typography variant="caption" color="text.secondary">
                                  🛠️ {event.workshops_count} Workshop{event.workshops_count !== 1 ? 's' : ''}
                                </Typography>
                              )}
                              {event?.networking_count > 0 && (
                                <Typography variant="caption" color="text.secondary">
                                  🤝 {event.networking_count} Networking Session{event.networking_count !== 1 ? 's' : ''}
                                </Typography>
                              )}
                              {event?.calculated_hours_display && (
                                <Typography variant="body2" fontWeight={600} color="text.primary" sx={{ mt: 1 }}>
                                  ⏱️ {event.calculated_hours_display}
                                </Typography>
                              )}
                            </Stack>
                          </Stack>
                        )}

                        {/* Event Line-up */}
                        {event?.featured_participants && event.featured_participants.length > 0 && (
                          <Box sx={{ mt: 2 }}>
                            <FeaturedParticipantsStrip
                              participants={event.featured_participants}
                              total={event.featured_participants_total || event.featured_participants.length}
                            />
                          </Box>
                        )}
                      </Stack>
                    </Box>

                    {/* Bottom section: Title + Description */}
                    <Box sx={{ borderTop: '1px solid', borderColor: 'divider', p: { xs: 2.5, sm: 3, md: 4 }, pt: { xs: 2.5, sm: 3, md: 3 } }}>
                      <Stack spacing={2}>
                        {event?.title ? (
                          <Typography variant="h5" fontWeight={800} lineHeight={1.2}>
                            {event.title}
                          </Typography>
                        ) : null}
                        <Box>
                          <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>
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
                        </Box>
                      </Stack>
                    </Box>
                  </Paper>

                  {/* ATTEND CARD */}
                  <Paper elevation={0} className="rounded-2xl border border-slate-200">
                    <Box className="p-5">
                      <Typography variant="h6" className="font-extrabold">Attend</Typography>
                      <Typography variant="h5" className="font-bold text-teal-600 mt-1 mb-2">
                        {isEventOwner || registration ? "You are registered for this event." : displayPrice(event)}
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

                        {status === "cancelled" ? (
                          <Button
                            disabled
                            variant="outlined"
                            sx={{ textTransform: "none", backgroundColor: "#fef2f2", color: "#b91c1c", borderColor: "#fecaca" }}
                            className="rounded-xl"
                          >
                            Event Cancelled
                          </Button>
                        ) : canShowActiveJoin && canJoinEventNow ? (
                          <Button
                            onClick={() => {
                              // If not authenticated, show guest modal; otherwise navigate
                              if (!token) {
                                setGuestModalOpen(true);
                              } else {
                                navigate(livePath, {
                                  state: {
                                    event,
                                    openLounge: shouldOpenLoungeOnEntry,
                                    preEventLounge: isPreEventLounge,
                                  },
                                });
                              }
                            }}
                            sx={{
                              textTransform: "none",
                              backgroundColor: "#10b8a6",
                              "&:hover": { backgroundColor: "#0ea5a4" },
                            }}
                            className="rounded-xl"
                            variant="contained"
                          >
                            {primaryActionLabel}
                          </Button>
                        ) : event.is_multi_day && joinState && !joinState.enabled && joinState.status === "waiting_for_session" && (event.registration_type !== 'apply' || (myApplication && myApplication.status === 'approved')) ? (
                          <Button
                            disabled
                            variant="contained"
                            sx={{ textTransform: "none", backgroundColor: "#CBD5E1" }}
                            className="rounded-xl"
                          >
                            {multiDayJoinLabel}
                          </Button>
                        ) : !isEventOwner && event.registration_type === 'apply' && !canJoinEventNow && !isPast ? (
                          // --- APPLY FLOW ---
                          (<>
                            {(!myApplication || myApplication.status === 'none') && (!token ? isWithinGuestJoinWindow(event.start_time) : true)
                              ? (
                                <>
                                  <Button
                                    onClick={() => {
                                      // For authenticated users, submit directly
                                      if (token) {
                                        handleApplyDirect();
                                      } else {
                                        // For guests, open guest apply modal
                                        setGuestApplyModalOpen(true);
                                      }
                                    }}
                                    variant="contained"
                                    sx={{
                                      textTransform: "none",
                                      backgroundColor: "#10b8a6",
                                      "&:hover": { backgroundColor: "#0ea5a4" },
                                    }}
                                    className="rounded-xl"
                                  >
                                    {token ? "Apply Now" : "Apply as Guest"}
                                  </Button>
                                </>
                              )
                              : myApplication?.status === 'approved'
                                ? (() => {
                                  // After approval, check if user can join with guest token or is registered
                                  const guestToken = typeof localStorage !== 'undefined' ? localStorage.getItem("guest_token") : null;
                                  if (guestToken) {
                                    // Guest has JWT token - can join only if event is live
                                    if (isLive) {
                                      return (
                                        <Button
                                          onClick={() => navigate(`/live/${encodeURIComponent(event.slug || event.id)}?id=${event.id}&role=audience`)}
                                          variant="contained"
                                          sx={{
                                            textTransform: "none",
                                            backgroundColor: "#10b8a6",
                                            "&:hover": { backgroundColor: "#0ea5a4" },
                                          }}
                                          className="rounded-xl"
                                        >
                                          Join Live
                                        </Button>
                                      );
                                    } else {
                                      // Event not live yet
                                      return (
                                        <Chip
                                          label="Waiting for Event to Go Live"
                                          variant="outlined"
                                          sx={{
                                            py: 2.5,
                                            borderColor: "#10b8a6",
                                            color: "#10b8a6",
                                            fontWeight: 500
                                          }}
                                        />
                                      );
                                    }
                                  } else if (registration) {
                                    // Registered user
                                    return (
                                      <Chip
                                        label="Registered"
                                        color="success"
                                        variant="outlined"
                                        sx={{ py: 2.5 }}
                                      />
                                    );
                                  } else {
                                    // Not registered yet
                                    return (
                                      <Chip
                                        label="Approved - Refresh to Register"
                                        color="success"
                                        variant="outlined"
                                        sx={{ py: 2.5 }}
                                      />
                                    );
                                  }
                                })()
                                : myApplication?.status === 'pending'
                                  ? (
                                    <Chip
                                      label="Application Pending"
                                      color="warning"
                                      variant="outlined"
                                      sx={{ py: 2.5 }}
                                    />
                                  )
                                  : myApplication?.status === 'declined'
                                    ? (
                                      <Chip
                                        label="Application Declined"
                                        color="error"
                                        variant="outlined"
                                        sx={{ py: 2.5 }}
                                      />
                                    )
                                    : null
                            }
                          </>)
                        ) : !isEventOwner && !canJoinEventNow && !isPast ? (
                          <>
                            <Button
                              onClick={handleRegister}
                              variant="contained"
                              sx={{
                                textTransform: "none",
                                backgroundColor: "#10b8a6",
                                "&:hover": { backgroundColor: "#0ea5a4" },
                              }}
                              className="rounded-xl"
                            >
                              Register Now
                            </Button>
                            {(!token || isGuest) && isWithinGuestJoinWindow(event.start_time) && (
                              <Button
                                onClick={() => setGuestModalOpen(true)}
                                variant="outlined"
                                sx={{
                                  textTransform: "none",
                                  borderColor: "#10b8a6",
                                  color: "#10b8a6",
                                  "&:hover": { borderColor: "#0ea5a4", backgroundColor: "rgba(16,184,166,0.04)" },
                                }}
                                className="rounded-xl"
                              >
                                {isGuest ? "Continue as Guest" : "Join as Guest"}
                              </Button>
                            )}
                            {showPreEventQnaRegisterHint && (
                              <Alert severity="info" sx={{ mt: 2 }} variant="outlined">
                                Register for this event to submit pre-event questions.
                              </Alert>
                            )}
                          </>
                        ) : canWatch ? (
                          <Button
                            component="a"
                            href={resolveRecordingUrl(event.recording_url)}
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

                        {(isEventOwner || registration) && status !== "cancelled" && (
                          <Box className="flex justify-center py-2">
                            <RegisteredActions
                              ev={event}
                              reg={registration}
                              onUnregistered={() => setRegistration(null)}
                              onCancelRequested={(_, updated) => setRegistration(updated)}
                            />
                          </Box>
                        )}

                        {/* Pre-Event Q&A for Registered Users */}
                        {showPreEventQnaPrompt && (
                          <Box
                            sx={{
                              mt: 2,
                              p: 2,
                              borderRadius: 2,
                              bgcolor: "rgba(16,184,166,0.06)",
                              border: "1px solid rgba(16,184,166,0.2)",
                            }}
                          >
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              Send your questions in advance so the host can review them before the session begins.
                            </Typography>
                            <Button
                              variant="outlined"
                              fullWidth
                              onClick={() => setPreEventQnaModalOpen(true)}
                              sx={{
                                textTransform: "none",
                                borderColor: "#10b8a6",
                                color: "#10b8a6",
                                "&:hover": { borderColor: "#0ea5a4", bgcolor: "rgba(16,184,166,0.04)" },
                              }}
                              className="rounded-xl"
                            >
                              Submit your questions prior to event
                            </Button>

                            {/* Pre-event Q&A Manager: view / edit / delete / AI advisor */}
                            <PreEventQnaManager
                              eventId={event.id}
                              token={token}
                              isBeforeEventStart={isBeforeEventStart}
                              qnaModerationEnabled={Boolean(event?.qna_moderation_enabled)}
                              refreshTrigger={preEventQnaRefreshTrigger}
                            />
                          </Box>
                        )}


                        {token && (
                          <Button
                            component={Link}
                            to="/account/events"
                            variant="outlined"
                            sx={{ textTransform: "none" }}
                            className="rounded-xl"
                          >
                            Back to my events
                          </Button>
                        )}
                      </div>
                    </Box>
                  </Paper>
                </Box>
              )}

              {/* TAB CONTENT: SESSIONS */}
              {showSessionsTab && activeTab === 1 && (
                <Paper elevation={0} className="rounded-2xl border border-slate-200">
                  <Box sx={{ p: 3 }}>
                    <Typography variant="h6" fontWeight={800} sx={{ mb: 3 }}>
                      Event Sessions ({normalizedSessions.length})
                    </Typography>
                    <Stack spacing={2}>
                      {(() => {
                        // Group sessions by date
                        const sessionsByDate = {};
                        const dateOrder = [];
                        normalizedSessions.forEach((session) => {
                          const dateKey = session.session_date || new Date(session.start_time).toISOString().split("T")[0];
                          if (!sessionsByDate[dateKey]) {
                            sessionsByDate[dateKey] = [];
                            dateOrder.push(dateKey);
                          }
                          sessionsByDate[dateKey].push(session);
                        });

                        return dateOrder.map((dateKey, dateIdx) => (
                          <Box key={dateKey}>
                            {/* Day Header */}
                            <Typography
                              variant="subtitle2"
                              sx={{
                                fontWeight: 700,
                                color: "#0284c7",
                                mb: 1.5,
                                mt: dateIdx > 0 ? 2 : 0,
                                pb: 1,
                                borderBottom: "2px solid #f0f9ff",
                              }}
                            >
                              Day {dateIdx + 1} — {new Date(dateKey).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </Typography>

                            {/* Sessions for this day */}
                            {sessionsByDate[dateKey].map((session, sessionIdx) => {
                        const sessionDescription = getSessionDescription(session);
                        const sessionKey = session.id || sessionIdx;
                        const isExpanded = Boolean(expandedSessionDescriptions[sessionKey]);
                        const isLongDescription = sessionDescription.length > 180;
                        return (
                          <Paper key={session.id || sessionIdx} elevation={0} sx={{ p: 2, bgcolor: 'grey.50', border: '1px solid', borderColor: 'divider' }}>
                            <Stack spacing={1.5}>
                              <Stack direction="row" justifyContent="space-between" alignItems="start">
                                <Box>
                                  <Typography variant="subtitle1" fontWeight={700}>
                                    {session.title || `Session ${idx + 1}`}
                                  </Typography>
                                  <Chip
                                    size="small"
                                    label={session.session_type ? session.session_type.charAt(0).toUpperCase() + session.session_type.slice(1) + ' Session' : 'Session'}
                                    sx={{ mt: 1 }}
                                  />
                                </Box>
                              </Stack>

                              {/* Duration and Breaks */}
                              {session.effective_duration_minutes && (
                                <Stack direction="row" spacing={1} sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    <strong>Duration:</strong> {(() => {
                                      const m = session.effective_duration_minutes;
                                      const h = Math.floor(m / 60);
                                      const min = m % 60;
                                      return h > 0 ? `${h}h ${min}m` : `${min}m`;
                                    })()}
                                  </Typography>
                                  {session.session_breaks && session.session_breaks.length > 0 && (
                                    <Typography variant="body2" sx={{ color: '#6b7280' }}>
                                      (includes {session.session_breaks.map(b => b.label || b.break_type).join(", ")} – {session.session_breaks.reduce((sum, b) => sum + b.duration_minutes, 0)}m break)
                                    </Typography>
                                  )}
                                </Stack>
                              )}

                              <Stack direction="row" spacing={2} sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                  <CalendarMonthIcon fontSize="small" sx={{ color: 'teal.700' }} />
                                  <Typography variant="body2">
                                    {event.timezone ? dayjs(session.start_time).tz(normalizeTimezoneName(event.timezone)).format("MMM D, YYYY") : dayjs(session.start_time).format("MMM D, YYYY")}
                                  </Typography>
                                </Stack>
                                <Stack direction="column" spacing={0.5}>
                                  <Stack direction="row" spacing={0.5} alignItems="center">
                                    <AccessTimeIcon fontSize="small" sx={{ color: 'teal.700' }} />
                                    <Typography variant="body2">
                                      {event.timezone ? dayjs(session.start_time).tz(normalizeTimezoneName(event.timezone)).format("h:mm A") : dayjs(session.start_time).format("h:mm A")} – {event.timezone ? dayjs(session.end_time).tz(normalizeTimezoneName(event.timezone)).format("h:mm A") : dayjs(session.end_time).format("h:mm A")}
                                      {event.timezone && (
                                        <span style={{ color: '#9ca3af' }}>({normalizeTimezoneName(event.timezone)})</span>
                                      )}
                                    </Typography>
                                  </Stack>
                                  {((event?.event_format === 'virtual' || event?.event_format === 'hybrid') || (event?.format === 'virtual' || event?.format === 'hybrid')) && (
                                    <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 500, ml: 3.5 }}>
                                      Your Time: {dayjs(session.start_time).tz(getBrowserTimezone()).format("h:mm A")} – {dayjs(session.end_time).tz(getBrowserTimezone()).format("h:mm A")} ({getBrowserTimezone()})
                                    </Typography>
                                  )}
                                </Stack>
                              </Stack>

                              {sessionDescription ? (
                                <Box>
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{
                                      ...(isExpanded
                                        ? {}
                                        : {
                                          display: "-webkit-box",
                                          WebkitBoxOrient: "vertical",
                                          WebkitLineClamp: 3,
                                          overflow: "hidden",
                                        }),
                                    }}
                                  >
                                    {sessionDescription}
                                  </Typography>
                                  {isLongDescription && (
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      onClick={() =>
                                        setExpandedSessionDescriptions((prev) => ({
                                          ...prev,
                                          [sessionKey]: !prev[sessionKey],
                                        }))
                                      }
                                      sx={{ mt: 1, textTransform: "none", fontWeight: 700 }}
                                    >
                                      {isExpanded ? "Show less" : "Read More"}
                                    </Button>
                                  )}
                                </Box>
                              ) : (
                                <Typography variant="body2" color="text.disabled" sx={{ fontStyle: "italic" }}>
                                  No description provided.
                                </Typography>
                              )}
                            </Stack>
                          </Paper>
                        );
                            })}
                          </Box>
                        ));
                      })()}
                    </Stack>
                  </Box>
                </Paper>
              )}

              {/* TAB CONTENT: Q&A */}
              {showQaTab && activeTab === (showSessionsTab ? 2 : 1) && (
                <Paper elevation={0} className="rounded-2xl border border-slate-200">
                  <Box sx={{ p: { xs: 2.5, sm: 3, md: 4 } }}>
                    {/* Header with Sort Option */}
                    <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" fontWeight={800} sx={{ mb: 0.5 }}>
                          Questions & Answers
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Answers to questions asked during this event.
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexShrink: 0 }}>
                        <Typography variant="caption" sx={{ color: '#6b7280', whiteSpace: 'nowrap' }}>
                          Filter by:
                        </Typography>
                        <Box
                          component="select"
                          value={qaStatusFilter}
                          onChange={(e) => setQaStatusFilter(e.target.value)}
                          sx={{
                            px: 1.5,
                            py: 0.75,
                            borderRadius: 1,
                            border: '1px solid #e5e7eb',
                            bgcolor: '#ffffff',
                            color: '#111827',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            cursor: 'pointer',
                            '&:hover': { borderColor: '#d1d5db' },
                            '&:focus': { outline: 'none', borderColor: '#3b82f6', boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)' }
                          }}
                        >
                          <option value="all">All Questions</option>
                          <option value="answered_live">Answered Live</option>
                          <option value="answered_post_event">Answered Post-Event</option>
                          <option value="pending">Pending</option>
                        </Box>
                      </Box>
                    </Box>

                    {/* Filtered Questions by Status */}
                    {(() => {
                      const filteredQs = filterQuestionsByStatus(localQuestions);
                      const statusLabel = qaStatusFilter === 'all' ? 'All Questions'
                        : qaStatusFilter === 'answered_live' ? 'Answered Live'
                          : qaStatusFilter === 'answered_post_event' ? 'Answered Post-Event'
                            : 'Pending';

                      if (filteredQs.length === 0) {
                        return (
                          <Box sx={{ py: 4, textAlign: 'center' }}>
                            <Typography variant="body2" color="text.secondary">
                              No {statusLabel.toLowerCase()} questions.
                            </Typography>
                          </Box>
                        );
                      }

                      return null;
                    })()}

                    {/* Filtered Q&A Items */}
                    <Stack spacing={2}>
                      {(() => {
                        const filteredQs = filterQuestionsByStatus(localQuestions);
                        const groupedQuestions = {};
                        const ungroupedQuestions = [];
                        const visibleGroups = qaGroups;

                        visibleGroups.forEach(g => { groupedQuestions[g.id] = []; });

                        filteredQs.forEach(q => {
                          let assigned = false;
                          for (const g of visibleGroups) {
                            if (g.memberships && g.memberships.some(m => Number(m.question) === Number(q.id))) {
                              groupedQuestions[g.id].push(q);
                              assigned = true;
                              break;
                            }
                          }
                          if (!assigned) ungroupedQuestions.push(q);
                        });

                        const renderQuestion = (q, isSubQuestion = false) => {
                          const isExpanded = expandedQaItems[q.id] === true;
                          const statusChip = !q.is_answered
                            ? { label: 'Pending', bgcolor: '#fef9c3', color: '#854d0e', border: '1px solid #fef08a' }
                            : q.answered_phase === 'live'
                              ? { label: 'Answered Live', bgcolor: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }
                              : { label: 'Answered Post-Event', bgcolor: '#dbeafe', color: '#1e40af', border: '1px solid #bfdbfe' };

                          return (
                            <Box
                              key={q.id}
                              sx={{
                                bgcolor: isSubQuestion ? 'transparent' : '#f8fafb',
                                border: isSubQuestion ? 'none' : '1px solid #e5e7eb',
                                borderTop: isSubQuestion ? '1px solid rgba(0,0,0,0.05)' : '1px solid #e5e7eb',
                                borderRadius: isSubQuestion ? 0 : 2,
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                  bgcolor: isSubQuestion ? 'rgba(0,0,0,0.01)' : '#ffffff',
                                  borderColor: isSubQuestion ? 'none' : '#d1d5db',
                                  boxShadow: isSubQuestion ? 'none' : '0 1px 3px rgba(0,0,0,0.1)'
                                }
                              }}
                            >
                              {/* Question Header - Clickable */}
                              <Box
                                onClick={() => setExpandedQaItems(prev => ({ ...prev, [q.id]: !isExpanded }))}
                                sx={{
                                  p: isSubQuestion ? { xs: 1.5, sm: 2 } : { xs: 2, sm: 2.5 },
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'flex-start',
                                  gap: 2,
                                  cursor: 'pointer',
                                  userSelect: 'none',
                                  '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' }
                                }}
                              >
                                <Box sx={{ flex: 1, pr: 1 }}>
                                  <Typography variant={isSubQuestion ? "body2" : "subtitle2"} fontWeight={isSubQuestion ? 500 : 700} sx={{ mb: 0.5, color: '#111827' }}>
                                    {isSubQuestion ? "" : "Q: "}{q.content}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                                    Asked by <ClickableAsker userId={q.user} name={q.user_display} isAnonymous={q.is_anonymous} />
                                  </Typography>
                                </Box>
                                {/* Status Chip - hide for subquestions unless they differ from group? Actually let's show them */}
                                {!isSubQuestion && (
                                  <Chip
                                    size="small"
                                    label={statusChip.label}
                                    sx={{
                                      bgcolor: statusChip.bgcolor,
                                      color: statusChip.color,
                                      border: statusChip.border,
                                      fontWeight: 600,
                                      fontSize: '0.7rem',
                                      flexShrink: 0,
                                      height: 'auto',
                                      padding: '4px 8px',
                                      '& .MuiChip-label': { padding: 0 }
                                    }}
                                  />
                                )}
                                {/* Expand/Collapse Icon - only if has answer */}
                                {q.is_answered && q.answer_text && (
                                  <Box
                                    sx={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      minWidth: 32,
                                      height: 32,
                                      flexShrink: 0
                                    }}
                                  >
                                    <Box
                                      sx={{
                                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                        transition: 'transform 0.3s ease',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#6b7280',
                                        fontSize: 14
                                      }}
                                    >
                                      ▼
                                    </Box>
                                  </Box>
                                )}
                              </Box>

                              {/* Answer Section - Collapsible, only if answered */}
                              <Collapse in={isExpanded}>
                                {q.is_answered && q.answer_text && (
                                  <Box sx={{
                                    p: { xs: 2, sm: 2.5 },
                                    pt: 0,
                                    borderTop: isSubQuestion ? 'none' : '1px solid #e5e7eb'
                                  }}>
                                    <Box sx={{
                                      p: 2,
                                      bgcolor: q.answered_phase === 'live' ? '#ecfdf5' : '#eff6ff',
                                      border: q.answered_phase === 'live' ? '1px solid #a7f3d0' : '1px solid #bfdbfe',
                                      borderRadius: 1.5
                                    }}>
                                      <Typography variant="caption" sx={{
                                        fontWeight: 700,
                                        color: q.answered_phase === 'live' ? '#059669' : '#1d4ed8',
                                        display: 'block',
                                        mb: 0.75,
                                        textTransform: 'uppercase',
                                        fontSize: '0.7rem',
                                        letterSpacing: '0.5px'
                                      }}>
                                        Answer
                                      </Typography>
                                      <Typography variant="body2" sx={{
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                        color: q.answered_phase === 'live' ? '#065f46' : '#1e3a5f',
                                        lineHeight: 1.6
                                      }}>
                                        {q.answer_text}
                                      </Typography>
                                    </Box>
                                  </Box>
                                )}
                              </Collapse>
                            </Box>
                          );
                        };

                        const renderGroup = (g, members) => {
                          const isExpanded = expandedQaItems[`group_${g.id}`] === true;
                          const summaryText = g.summary?.trim() || g.title?.trim() || "Grouped question";
                          const authorNames = Array.from(
                            members
                              .filter((q) => !q.is_anonymous && q.user_display)
                              .reduce((acc, q) => {
                                acc.set(q.user, { id: q.user, name: q.user_display });
                                return acc;
                              }, new Map())
                              .values()
                          );
                          const voteCount = g.aggregated_vote_count ?? 0;

                          // Consider group answered if ANY question in it is answered
                          const anyAnswered = members.some(q => q.is_answered);
                          const answeredPhase = members.find(q => q.is_answered)?.answered_phase || 'post_event';

                          const statusChip = !anyAnswered
                            ? { label: 'Pending', bgcolor: '#fef9c3', color: '#854d0e', border: '1px solid #fef08a' }
                            : answeredPhase === 'live'
                              ? { label: 'Answered Live', bgcolor: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }
                              : { label: 'Answered Post-Event', bgcolor: '#dbeafe', color: '#1e40af', border: '1px solid #bfdbfe' };

                          return (
                            <Box
                              key={`group_${g.id}`}
                              sx={{
                                bgcolor: '#f0f4ff',
                                border: '1.5px solid #dbeafe',
                                borderRadius: 3,
                                overflow: 'hidden',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                  borderColor: '#bfdbfe',
                                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.08)'
                                }
                              }}
                            >
                              {/* Group Header */}
                              <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
                                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                                  <Chip
                                    size="small"
                                    label={`${members.length} combined`}
                                    sx={{
                                      bgcolor: 'rgba(59, 130, 246, 0.1)',
                                      color: '#1d4ed8',
                                      fontWeight: 600,
                                      fontSize: '0.65rem',
                                      height: 20
                                    }}
                                  />
                                  {voteCount > 0 && (
                                    <Chip
                                      size="small"
                                      label={`▲ ${voteCount}`}
                                      sx={{
                                        bgcolor: 'rgba(245, 158, 11, 0.1)',
                                        color: '#d97706',
                                        fontWeight: 700,
                                        fontSize: '0.65rem',
                                        height: 20
                                      }}
                                    />
                                  )}
                                  <Box sx={{ flex: 1 }} />
                                  <Chip
                                    size="small"
                                    label={statusChip.label}
                                    sx={{
                                      bgcolor: statusChip.bgcolor,
                                      color: statusChip.color,
                                      border: statusChip.border,
                                      fontWeight: 600,
                                      fontSize: '0.65rem',
                                      height: 20
                                    }}
                                  />
                                </Stack>

                                <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1, color: '#1e3a8a', lineHeight: 1.4 }}>
                                  {summaryText}
                                </Typography>

                                {authorNames.length > 0 && (
                                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                                    <PeopleOutlineIcon sx={{ fontSize: 16, color: '#64748b' }} />
                                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                                      Asked by {authorNames.map((auth, idx) => (
                                        <React.Fragment key={auth.id || idx}>
                                          <ClickableAsker userId={auth.id} name={auth.name} />
                                          {idx < authorNames.length - 1 ? " • " : ""}
                                        </React.Fragment>
                                      ))}
                                    </Typography>
                                  </Stack>
                                )}

                                {/* Group Actions / Unfold */}
                                <Button
                                  variant="text"
                                  size="small"
                                  onClick={() => setExpandedQaItems(prev => ({ ...prev, [`group_${g.id}`]: !isExpanded }))}
                                  startIcon={isExpanded ? <UnfoldLessIcon /> : <UnfoldMoreIcon />}
                                  sx={{
                                    textTransform: 'none',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    color: '#3b82f6',
                                    p: 0,
                                    '&:hover': { bgcolor: 'transparent', color: '#2563eb' }
                                  }}
                                >
                                  {isExpanded ? "Hide original questions" : `View ${members.length} original questions`}
                                </Button>
                              </Box>

                              {/* Collapsible Sub-questions */}
                              <Collapse in={isExpanded}>
                                <Box sx={{ bgcolor: 'rgba(255,255,255,0.5)', borderTop: '1px solid #dbeafe' }}>
                                  {members.map(member => renderQuestion(member, true))}
                                </Box>
                              </Collapse>
                            </Box>
                          );
                        };

                        return (
                          <React.Fragment>
                            {visibleGroups.map(g => {
                              const members = groupedQuestions[g.id];
                              if (members.length === 0) return null;
                              return renderGroup(g, members);
                            })}
                            {ungroupedQuestions.map(q => renderQuestion(q))}
                          </React.Fragment>
                        );
                      })()}
                    </Stack>
                  </Box>
                </Paper>
              )}

              {/* TAB CONTENT: SPEED NETWORKING */}
              {showSpeedNetworkingTab && activeTab === (showSessionsTab && showQaTab ? 3 : (showSessionsTab || showQaTab ? 2 : 1)) && (
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
        hiddenRolesCount={participantHiddenRolesCount}
        totalRegisteredCount={participantTotalRegisteredCount}
      />
      {/* Guest Join Modal */}
      {event && (
        <>
          <GuestJoinModal
            open={guestModalOpen}
            onClose={() => setGuestModalOpen(false)}
            event={event}
            livePath={livePath}
          />

          <ApplyNowModal
            open={applyModalOpen}
            onClose={() => setApplyModalOpen(false)}
            event={event}
            token={token}
            onSuccess={(app) => setMyApplication(app)}
          />

          <PreEventQnAModal
            open={preEventQnaModalOpen}
            onClose={({ eventStarted }) => {
              setPreEventQnaModalOpen(false);
            }}
            event={event}
            onSuccess={() => {
              setPreEventQnaRefreshTrigger((prev) => prev + 1);
            }}
          />

          <GuestApplyModal
            open={guestApplyModalOpen}
            onClose={() => setGuestApplyModalOpen(false)}
            event={event}
            livePath={livePath}
          />
        </>
      )}
    </div>
  );
}
