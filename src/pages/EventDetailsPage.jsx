// src/pages/EventDetailsPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate, useLocation } from "react-router-dom";
import {
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  Stack,
  Divider,
  LinearProgress,
  Paper,
  Typography,
} from "@mui/material";
import AccountSidebar from "../components/AccountSidebar.jsx";
import AccountHero from "../components/AccountHero.jsx";
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
const STATIC_EVENT = {
  id: 10001,
  slug: "ai-ma-summit-2025",
  title: "AI & Mergers Summit 2025",
  preview_image:
    "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=1600&auto=format&fit=crop",
  location: "New York, NY",
  category: "M&A Strategy",
  start_time: "2025-12-15T09:00:00Z",
  end_time: "2025-12-15T17:00:00Z",
  is_live: false,
  recording_url: "",
  description:
    "Explore the intersection of AI and mergers with top operators. Hands-on sessions, case studies, and Q&A.",
  // meeting_url: "https://example.com/your-live-room", // set this from your API if you have it
  // agora_channel: "channel_abc123",                    // optional: if you use /live/:slug internally
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
  if (ev.is_live) return "live";
  if (s && e && now >= s && now <= e) return "live";
  if (s && now < s) return "upcoming";
  if (e && now > e) return "past";
  return "upcoming";
}
export default function EventDetailsPage() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const storedUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
  }, []);
  const fullName = storedUser?.name || storedUser?.full_name || "Member";
  const first = (fullName || "Member").split(" ")[0];

  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    "";
  const location = useLocation();
  const preload = location.state?.event || null;
  const fallbackId = preload?.id || null;

  const [event, setEvent] = useState(preload || null);
  const [loading, setLoading] = useState(!preload);
  const [error, setError] = useState(null);
  const [nowTick, setNowTick] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 30 * 1000);
    return () => clearInterval(id);
  }, []);
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
  if (loading) {
    return (
      <Box className="min-h-screen flex items-center justify-center">
        <div className="w-64">
          <LinearProgress />
          <p className="text-center text-slate-500 mt-3">Loading event…</p>
        </div>
      </Box>
    );
  }
  if (!event) return null;
  const status = computeStatus(event);
  const chip = status === "live"
    ? { label: "Live", className: "bg-rose-50 text-rose-700" }
    : status === "upcoming"
      ? { label: "Upcoming", className: "bg-teal-50 text-teal-700" }
      : { label: "Past", className: "bg-slate-100 text-slate-700" };
  // Decide the best join URL:
  const joinUrl =
    (event.meeting_url && event.meeting_url.trim()) ||
    (event.join_url && event.join_url.trim()) ||
    (event.live_url && event.live_url.trim()) ||
    `/live/${event.slug}`; // fallback internal route
  const earlyJoin = !!(joinUrl && status === "upcoming" && canEarlyJoin(event));
  const canJoin = (status === "live" || earlyJoin) && !!joinUrl;
  const canWatch = status === "past" && !!event.recording_url;
  const desc = event?.description ?? "";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Shared Account hero */}
      <AccountHero />
      {/* BODY with LEFT NAV + MAIN */}
      <Container maxWidth="lg" className="py-6 sm:py-8">
        <div className="grid grid-cols-12 gap-6">
          {/* LEFT SIDEBAR */}
          <aside className="col-span-12 md:col-span-3">
            <AccountSidebar />
          </aside>
          {/* MAIN */}
          <main className="col-span-12 md:col-span-9">
            {/* Stack vertically so Attend appears AFTER the event card */}
            <div className="flex flex-col gap-6">
              {/* EVENT CARD */}
              <Paper elevation={0} className="rounded-2xl border border-slate-200 overflow-hidden">
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
                    {event?.location ? (
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <span role="img" aria-label="location">📍</span>
                        <Typography variant="body2" color="text.secondary">
                          {event.location}
                        </Typography>
                      </Stack>
                    ) : null}
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
              {/* ATTEND CARD (now BELOW the event card) */}
              <Paper elevation={0} className="rounded-2xl border border-slate-200">
                <Box className="p-5">
                  <Typography variant="h6" className="font-extrabold">Attend</Typography>
                  <div className="mt-3 flex flex-col gap-2">
                    <Button
                      component={canJoin ? (joinUrl.startsWith("http") ? "a" : Link) : "button"}
                      {...(canJoin
                        ? (joinUrl.startsWith("http")
                          ? { href: joinUrl, target: "_blank", rel: "noopener noreferrer" }
                          : { to: joinUrl })
                        : {})}
                      disabled={!canJoin}
                      sx={{ textTransform: "none", backgroundColor: "#10b8a6", "&:hover": { backgroundColor: "#0ea5a4" } }}
                      className="rounded-xl"
                      variant="contained"
                    >
                      {earlyJoin ? "Join (Early Access)" : canJoin ? "Join Live" : "Join (Unavailable)"}
                    </Button>
                    {canWatch && (
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
                    )}
                    <Button
                      component={Link}
                      to={`/events`}
                      variant="outlined"
                      sx={{ textTransform: "none" }}
                      className="rounded-xl"
                    >
                      Browse more events
                    </Button>
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