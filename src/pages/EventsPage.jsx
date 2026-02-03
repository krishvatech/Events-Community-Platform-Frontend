// src/pages/EventsPage.jsx
// Public Events listing page — static only (no API / dynamic fetch).
// Reuses existing Header/Footer and our MUI + Tailwind setup.

import React, { useEffect, useMemo, useState } from "react";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Link, useNavigate } from "react-router-dom";
import RegisteredActions from "../components/RegisteredActions.jsx";
import {
  Box,
  Button,
  Container,
  Divider,
  Grid,
  Card as MUICard,
  CardContent,
  Pagination,
  Skeleton
} from "@mui/material";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PlaceIcon from "@mui/icons-material/Place";
import GroupsIcon from "@mui/icons-material/Groups";
import { FormControl, Select, MenuItem } from "@mui/material";
import dayjs from "dayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { Slider } from "@mui/material";
import Drawer from "@mui/material/Drawer";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import { isStaffUser, isOwnerUser } from "../utils/adminRole.js";
import { apiClient } from "../utils/api";

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api").replace(/\/$/, "");
const EVENTS_URL = `${API_BASE}/events/`;
const RAW_BASE = (import.meta.env.VITE_API_BASE_URL || "").trim();

const todayISO = () => dayjs().format("YYYY-MM-DD");

// ————————————————————————————————————————
// Helpers
// ————————————————————————————————————————
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

function authHeaders() {
  const t =
    localStorage.getItem("access_token") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("access");
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function fetchMyRegistrationForEvent(eventId) {
  try {
    const url = new URL(`${API_BASE}/event-registrations/`);
    url.searchParams.set("event", String(eventId));
    const res = await fetch(url.toString(), { headers: authHeaders() });
    if (!res.ok) return null;
    const data = await res.json();
    const list = Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : []);
    return list[0] || null;
  } catch {
    return null;
  }
}

async function addToCart(eventId, qty = 1) {
  try {
    const res = await fetch(`${API_BASE}/cart/items/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify({ event_id: eventId, quantity: qty }),
    });
    if (!res.ok) {
      const text = await res.text();
      toast.error(`Add to cart failed (${res.status}): ${text}`);
      return null;
    }
    const item = await res.json();

    // refresh badge count from server
    try {
      const r2 = await fetch(`${API_BASE}/cart/count/`, { headers: authHeaders() });
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
function bumpCartCount(qty = 1) {
  const prev = Number(localStorage.getItem("cart_count") || "0");
  const next = prev + qty;
  localStorage.setItem("cart_count", String(next));
  // notify any listeners (e.g., Header)
  window.dispatchEvent(new Event("cart:update"));
}

const toSlug = (s) => String(s).trim().toLowerCase().replace(/[\s-]+/g, "_");


function presetRangeISO(preset) {
  const t = dayjs();
  switch (preset) {
    case "This Month":
      return {
        start: t.format("YYYY-MM-DD"),
        end: t.endOf("month").format("YYYY-MM-DD"),
      };
    case "This Week":
      return {
        start: t.format("YYYY-MM-DD"),
        end: t.endOf("week").format("YYYY-MM-DD"),
      };
    case "Next 90 days":
      return {
        start: t.format("YYYY-MM-DD"),
        end: t.add(90, "day").format("YYYY-MM-DD"),
      };
    default:
      return { start: "", end: "" };
  }
}

function dmyToISO(s = "") {
  const [dd, mm, yyyy] = s.split("-").map(Number);
  if (!dd || !mm || !yyyy) return "";
  // use UTC so timezone can't shift the date
  return new Date(Date.UTC(yyyy, mm - 1, dd)).toISOString().slice(0, 10);
}


function truncate(text, n = 120) {
  if (!text) return "";
  return text.length > n ? text.slice(0, n - 1) + "…" : text;
}

// API_BASE may be like http://127.0.0.1:8000/api
// const API_BASE = RAW_BASE.replace(/\/+$/, "");
// Origin without the /api suffix
const API_ORIGIN = API_BASE.replace(/\/api$/, "");

const toAbs = (u) => {
  if (!u) return u;
  // already absolute?
  if (/^https?:\/\//i.test(u)) return u;
  // ensure leading slash then join to origin
  const p = u.startsWith("/") ? u : `/${u}`;
  return `${API_ORIGIN}${p}`;
};


function humanizeFormat(fmt = "") {
  return fmt.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function toCard(ev) {
  // map backend fields to the fields your UI already uses
  return {
    id: ev.id,
    slug: ev.slug,
    title: ev.title,
    description: ev.description,
    image: ev.preview_image,                 // URLField on your model
    start: ev.start_time,                    // DateTimeField
    end: ev.end_time,                        // DateTimeField
    location: ev.location,
    topics: [ev.category, humanizeFormat(ev.event_format || ev.format)].filter(Boolean),// ["Strategy", "In-Person"]
    attendees: Math.max(1, Number(ev.registrations_count ?? ev.attending_count ?? 0)),
    price: ev.price,
    is_free: ev.is_free || false,
    status: ev.status,
    is_live: ev.is_live,
    event_format: ev.event_format || ev.format, // virtual, hybrid, in_person
    registration_url: `/events/${ev.slug || ev.id}`, // tweak to your detail route
  };
}

function computeStatus(ev) {
  const now = Date.now();
  const s = ev.start ? new Date(ev.start).getTime() : 0;
  const e = ev.end ? new Date(ev.end).getTime() : 0;

  if (ev.status === "ended") return "past";
  if (ev.is_live && ev.status !== "ended") return "live";
  if (s && e && now >= s && now <= e && ev.status !== "ended") return "live";
  if (s && now < s) return "upcoming";
  if (e && now > e) return "past";
  return "upcoming";
}

function canJoinEarly(ev, minutes = 15) {
  if (!ev?.start) return false;

  const startMs = new Date(ev.start).getTime();
  if (!Number.isFinite(startMs)) return false;

  const now = Date.now();
  const diff = startMs - now;
  const windowMs = minutes * 60 * 1000;

  return diff > 0 && diff <= windowMs;
}
// ————————————————————————————————————————
// Card (thumbnail view)
// ————————————————————————————————————————
function EventCard({ ev, myRegistrations, setMyRegistrations, setRawEvents }) {
  const navigate = useNavigate();
  const owner = isOwnerUser();
  const reg = myRegistrations?.[ev.id];
  const status = computeStatus(ev);
  const isLive = status === "live" && ev.status !== "ended";
  const isWithinEarlyJoinWindow = canJoinEarly(ev, 15);
  const canShowActiveJoin = isLive || isWithinEarlyJoinWindow;

  const handleRegisterCard = async () => {
    const token =
      localStorage.getItem("access_token") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("access");
    if (!token) {
      navigate("/signin");
      return;
    }

    // FREE: create EventRegistration immediately
    if (Number(ev.price) === 0) {
      const res = await fetch(`${EVENTS_URL}${ev.id}/register/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
      });
      if (!res.ok) {
        const msg = await res.text();
        toast.error(`Registration failed (${res.status}): ${msg}`);
        return;
      }

      toast.success("Thank you very much for registering for this event.");

      // locally mark as registered and bump the shown count
      // We expect the backend to return the created registration, but if not we make a mock one
      const created = await res.clone().json().catch(() => ({}));
      const regFromApi = created?.id ? created : await fetchMyRegistrationForEvent(ev.id);
      const newReg = { ...(regFromApi || {}), event: ev, status: regFromApi?.status || "registered" };
      setMyRegistrations(prev => ({ ...prev, [ev.id]: newReg }));
      setRawEvents(prev =>
        (prev || []).map(e =>
          e.id === ev.id
            ? {
              ...e,
              // bump whichever field is present so toCard() shows the new number
              registrations_count: Number(e?.registrations_count ?? e?.attending_count ?? 0) + 1,
            }
            : e
        )
      );
      return;
    }

    const before = Number(localStorage.getItem("cart_count") || "0");

    const item = await addToCart(ev.id);
    if (item) {
      // addToCart() already tries to refresh /cart/count/ and dispatches "cart:update"
      // Fallback: only bump if count didn’t change (e.g., /cart/count failed)
      const after = Number(localStorage.getItem("cart_count") || "0");
      if (after === before) bumpCartCount(1);

      // ✅ DO NOT redirect anywhere
    }
  };

  const handleJoinCard = () => {
    const livePath = `/live/${ev.slug || ev.id}?id=${ev.id}&role=audience`;
    navigate(livePath, { state: { event: ev }, replace: false });
  };

  return (
    <MUICard
      elevation={0}
      className="group h-full w-full flex flex-col rounded-2xl border border-[#E8EEF2] bg-white shadow-sm
                transition-all duration-300 hover:shadow-xl hover:-translate-y-2.5
                hover:ring-1 hover:ring-teal-200 overflow-hidden cursor-pointer"
    >
      {/* MEDIA */}
      <Box className="relative w-full h-[180px] sm:h-[220px] md:h-[260px] lg:h-[300px] overflow-hidden">
        {ev.image ? (
          <img
            src={toAbs(ev.image)}
            alt={ev.title}
            loading="lazy"
            className="absolute inset-0 block w-full h-full object-cover object-center"
          />
        ) : (
          <div className="absolute inset-0 w-full h-full bg-slate-100" />
        )}

        {ev.topics?.[0] && (
          <span className="absolute top-3 left-3 inline-flex items-center rounded-full bg-teal-600 text-white px-3 py-1 text-xs font-semibold shadow-sm">
            {ev.topics[0]}
          </span>
        )}
        {ev.topics?.[1] && (
          <span className="absolute top-3 right-3 inline-flex items-center rounded-full bg-slate-200 text-slate-900 px-3 py-1 text-xs font-semibold shadow-sm">
            {ev.topics[1]}
          </span>
        )}
      </Box>

      <CardContent className="p-4 sm:p-5 md:p-6 flex-1 flex flex-col min-h-[260px] sm:min-h-[280px] md:min-h-[300px]">
        <h3 className="text-xl sm:text-2xl font-semibold text-neutral-900 leading-snug two-line">
          {ev.title}
        </h3>

        {ev.description && (
          <p className="mt-2 text-neutral-600 text-sm three-line">{ev.description}</p>
        )}

        <div className="mt-4 space-y-2 text-neutral-800 text-sm meta-rows sm:min-h-[88px] md:min-h-[96px]">
          <div className="flex items-center gap-6">
            <span className="inline-flex items-center gap-2">
              <CalendarMonthIcon fontSize="small" className="text-teal-700" />
              {new Date(ev.start).toLocaleDateString(undefined, {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            {ev.end && (
              <span className="inline-flex items-center gap-2">
                <AccessTimeIcon fontSize="small" className="text-teal-700" />
                {new Date(ev.start).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}{" "}
                – {new Date(ev.end).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
              </span>
            )}
          </div>

          {ev.location && (
            <div className="flex items-center gap-2">
              <PlaceIcon fontSize="small" className="text-teal-700" />
              <span className="truncate">{ev.location}</span>
            </div>
          )}

          {Number.isFinite(ev.attendees) && (
            <div className="flex items-center gap-2">
              <GroupsIcon fontSize="small" className="text-teal-700" />
              <span>{ev.attendees} registered</span>
            </div>
          )}
        </div>

        <div className="mt-auto" />
      </CardContent>

      {/* Footer */}
      <div className="flex items-center justify-between border-t p-6">
        <div className="text-base font-semibold text-neutral-900">
          {ev.isRegistered ? (
            <span className="text-teal-600">You are registered for this event.</span>
          ) : ev.is_free ? (
            <span className="text-teal-600">Free to Join</span>
          ) : (
            priceStr(ev.price)
          )}
        </div>

        {/* Hide register button for owner users */}
        {!owner && (
          ev.isRegistered ? (
            <div className="flex items-center gap-2">
              {/* Show Join button for virtual/hybrid events */}
              {(ev.event_format === "virtual" || ev.event_format === "hybrid") && (
                <Button
                  variant="contained"
                  size="medium"
                  onClick={handleJoinCard}
                  disabled={!canShowActiveJoin}
                  className="normal-case rounded-full px-4 bg-teal-500 hover:bg-teal-600"
                >
                  {canShowActiveJoin ? (isLive ? "Join Live" : "Join") : "Join (Not Live Yet)"}
                </Button>
              )}
              {/* Show Cancel Registration button only for free events */}
              {ev.is_free && reg && (
                <Button
                  variant="text"
                  size="medium"
                  color="error"
                  onClick={async () => {
                    try {
                      const res = await fetch(`${API_BASE}/event-registrations/${reg.id}/`, {
                        method: "DELETE",
                        headers: authHeaders(),
                      });
                      if (!res.ok) throw new Error(await res.text());

                      toast.info("You have unregistered from the event.");
                      setMyRegistrations((prev) => {
                        const next = { ...prev };
                        delete next[ev.id];
                        return next;
                      });
                      setRawEvents((prev) =>
                        (prev || []).map((e) =>
                          e.id === ev.id
                            ? {
                              ...e,
                              registrations_count: Math.max(
                                0,
                                Number(e?.registrations_count ?? e?.attending_count ?? 0) - 1
                              ),
                            }
                            : e
                        )
                      );
                    } catch (err) {
                      toast.error("Failed to cancel registration: " + err.message);
                    }
                  }}
                  className="normal-case rounded-full px-3 hover:bg-red-50"
                >
                  Cancel Registration
                </Button>
              )}
            </div>
          ) : (
            <Button
              variant="contained"
              size="medium"
              color="primary"
              onClick={handleRegisterCard}
              className="normal-case rounded-full px-4 bg-teal-500 hover:bg-teal-600"
            >
              Register Now
            </Button>
          )
        )}
      </div>
    </MUICard>
  );
}

// RegisteredActions moved to ../components/RegisteredActions.jsx

// ————————————————————————————————————————
// Row (details/list view)
// ————————————————————————————————————————
function EventRow({ ev, myRegistrations, setMyRegistrations, setRawEvents }) {
  const navigate = useNavigate();
  const reg = myRegistrations?.[ev.id];
  const status = computeStatus(ev);
  const isLive = status === "live" && ev.status !== "ended";
  const isWithinEarlyJoinWindow = canJoinEarly(ev, 15);
  const canShowActiveJoin = isLive || isWithinEarlyJoinWindow;

  const handleRegisterRow = async () => {
    const token =
      localStorage.getItem("access_token") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("access");
    if (!token) {
      navigate("/signin");
      return;
    }

    if (Number(ev.price) === 0) {
      const res = await fetch(`${EVENTS_URL}${ev.id}/register/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
      });
      if (!res.ok) {
        const msg = await res.text();
        toast.error(`Registration failed (${res.status}): ${msg}`);
        return;
      }

      toast.success("Thank you very much for registering for this event.");

      const created = await res.clone().json().catch(() => ({}));
      const regFromApi = created?.id ? created : await fetchMyRegistrationForEvent(ev.id);
      const newReg = { ...(regFromApi || {}), event: ev, status: regFromApi?.status || "registered" };
      setMyRegistrations(prev => ({ ...prev, [ev.id]: newReg }));
      setRawEvents(prev =>
        (prev || []).map(e =>
          e.id === ev.id
            ? { ...e, registrations_count: Number(e?.registrations_count ?? e?.attending_count ?? 0) + 1 }
            : e
        )
      );
      return;
    }

    const before = Number(localStorage.getItem("cart_count") || "0");

    const item = await addToCart(ev.id);
    if (item) {
      const after = Number(localStorage.getItem("cart_count") || "0");
      if (after === before) bumpCartCount(1);

      // ✅ DO NOT redirect anywhere
    }
  };

  const handleJoinRow = () => {
    const livePath = `/live/${ev.slug || ev.id}?id=${ev.id}&role=audience`;
    navigate(livePath, { state: { event: ev }, replace: false });
  };

  const startDate = new Date(ev.start);
  const endDate = ev.end ? new Date(ev.end) : undefined;

  return (
    <MUICard
      elevation={0}
      className="group rounded-2xl border border-[#E8EEF2] bg-white shadow-sm
                 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5
                 hover:ring-1 hover:ring-teal-200 overflow-hidden overflow-hidden"
    >
      <div className="md:flex">
        {/* Image / badges */}
        <div className="relative md:w-2/5">
          {ev.image ? (
            <img
              src={toAbs(ev.image)}
              alt={ev.title}
              className="w-full h-44 md:h-full object-cover transform-gpu transition-transform duration-700 ease-out group-hover:scale-105 will-change-transform"
            />
          ) : (
            <div className="w-full h-44 md:h-full object-cover">No image</div>
          )}

          {ev.topics?.[0] && (
            <span className="absolute top-3 left-3 inline-flex items-center rounded-full bg-teal-600 text-white px-3 py-1 text-xs font-semibold shadow-sm">
              {ev.topics[0]}
            </span>
          )}
          {ev.topics?.[1] && (
            <span className="absolute top-3 right-3 inline-flex items-center rounded-full bg-slate-200 text-slate-900 px-3 py-1 text-xs font-semibold shadow-sm">
              {ev.topics[1]}
            </span>
          )}
        </div>

        {/* Details */}
        <CardContent className="p-6 md:w-3/5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="text-xl md:text-2xl font-semibold text-neutral-900 leading-snug">
                {ev.title}
              </h3>
              {ev.description && (
                <p className="mt-2 text-neutral-600 text-sm md:text-base leading-relaxed">
                  {truncate(ev.description, 220)}
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-neutral-800 text-sm">
                <span className="inline-flex items-center gap-2">
                  <CalendarMonthIcon fontSize="small" className="text-teal-700" />
                  {startDate.toLocaleDateString(undefined, {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>

                {ev.end && (
                  <span className="inline-flex items-center gap-2">
                    <AccessTimeIcon fontSize="small" className="text-teal-700" />
                    {startDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })} -{" "}
                    {endDate?.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                  </span>
                )}

                {ev.location && (
                  <span className="inline-flex items-center gap-2">
                    <PlaceIcon fontSize="small" className="text-teal-700" />
                    {ev.location}
                  </span>
                )}

                {Number.isFinite(ev.attendees) && (
                  <span className="inline-flex items-center gap-2">
                    <GroupsIcon fontSize="small" className="text-teal-700" />
                    {ev.attendees} registered
                  </span>
                )}
              </div>

              <div className="mt-3 text-base font-semibold text-neutral-900">
                {ev.isRegistered ? (
                  <span className="text-teal-600">You are registered for this event.</span>
                ) : ev.is_free ? (
                  <span className="text-teal-600">Free to Join</span>
                ) : (
                  priceStr(ev.price)
                )}
              </div>
            </div>

            <div className="shrink-0">
              {/* Hide register button for owner users (assuming generic 'owner' check logic same as Card) */}
              {isOwnerUser() ? null : (
                ev.isRegistered ? (
                  <div className="flex flex-col items-end gap-2">
                    {/* Show Join button for virtual/hybrid events */}
                    {(ev.event_format === "virtual" || ev.event_format === "hybrid") && (
                      <Button
                        variant="contained"
                        size="medium"
                        onClick={handleJoinRow}
                        disabled={!canShowActiveJoin}
                        className="normal-case rounded-full px-4 bg-teal-500 hover:bg-teal-600"
                      >
                        {canShowActiveJoin ? (isLive ? "Join Live" : "Join") : "Join (Not Live Yet)"}
                      </Button>
                    )}
                    {/* Show Cancel Registration button only for free events */}
                    {ev.is_free && reg && (
                      <Button
                        variant="text"
                        size="medium"
                        color="error"
                        onClick={async () => {
                          try {
                            const res = await fetch(`${API_BASE}/event-registrations/${reg.id}/`, {
                              method: "DELETE",
                              headers: authHeaders(),
                            });
                            if (!res.ok) throw new Error(await res.text());

                            toast.info("You have unregistered from the event.");
                            setMyRegistrations((prev) => {
                              const next = { ...prev };
                              delete next[ev.id];
                              return next;
                            });
                            setRawEvents((prev) =>
                              (prev || []).map((e) =>
                                e.id === ev.id
                                  ? {
                                    ...e,
                                    registrations_count: Math.max(
                                      0,
                                      Number(e?.registrations_count ?? e?.attending_count ?? 0) - 1
                                    ),
                                  }
                                  : e
                              )
                            );
                          } catch (err) {
                            toast.error("Failed to cancel registration: " + err.message);
                          }
                        }}
                        className="normal-case rounded-full px-3 hover:bg-red-50"
                      >
                        Cancel Registration
                      </Button>
                    )}
                  </div>
                ) : (
                  <Button
                    variant="contained"
                    size="medium"
                    color="primary"
                    onClick={handleRegisterRow}
                    className="normal-case rounded-full px-4 bg-teal-500 hover:bg-teal-600"
                  >
                    Register Now
                  </Button>
                )
              )}
            </div>

          </div>
        </CardContent>
      </div>
    </MUICard>
  );
}

function EventCardSkeleton() {
  return (
    <MUICard className="rounded-3xl border border-slate-200 overflow-hidden">
      <Skeleton variant="rectangular" height={200} />
      <CardContent sx={{ p: 3 }}>
        <Skeleton variant="text" height={30} width="85%" />
        <Box sx={{ mt: 1 }}>
          <Skeleton variant="text" width="65%" />
          <Skeleton variant="text" width="75%" />
          <Skeleton variant="text" width="55%" />
        </Box>

        <Box sx={{ mt: 2 }}>
          <Skeleton variant="rounded" height={44} />
        </Box>
      </CardContent>
    </MUICard>
  );
}

function EventRowSkeleton() {
  return (
    <MUICard className="rounded-3xl border border-slate-200 overflow-hidden">
      <div className="flex flex-col md:flex-row">
        <Box sx={{ width: { xs: "100%", md: 260 }, flexShrink: 0 }}>
          <Skeleton variant="rectangular" height={170} />
        </Box>

        <CardContent sx={{ flex: 1 }}>
          <Skeleton variant="text" height={28} width="70%" />
          <Skeleton variant="text" width="90%" />
          <Skeleton variant="text" width="80%" />
          <Skeleton variant="text" width="60%" />
        </CardContent>

        <Box className="p-4 md:p-6 md:pl-0 shrink-0 w-full md:w-[240px]">
          <Skeleton variant="text" height={28} width="40%" />
          <Skeleton variant="rounded" height={44} />
        </Box>
      </div>
    </MUICard>
  );
}

// ————————————————————————————————————————
// Page
// ————————————————————————————————————————
export default function EventsPage() {
  const navigate = useNavigate();
  // which events the logged-in user has registered for
  const [myRegistrations, setMyRegistrations] = useState({}); // { eventId: registrationObj }
  // raw events payload coming from the server (we'll enrich it with the "registered" flag)
  const [rawEvents, setRawEvents] = useState([]);
  const [cmsLoading, setCmsLoading] = useState(true);
  const [cmsError, setCmsError] = useState("");
  const [cmsPage, setCmsPage] = useState(null);
  const PAGE_SIZE = 9; // 9 items per page
  const skeletonItems = useMemo(
    () => Array.from({ length: PAGE_SIZE }, (_, i) => i),
    [PAGE_SIZE]
  );

  const [page, setPage] = useState(1);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [view, setView] = useState("grid"); // 'grid' | 'list'
  const [dateRange, setDateRange] = useState(""); // "",
  const [topic, setTopic] = useState("");   // or "Topic/Industry" if you prefer
  const [format, setFormat] = useState(""); // or "Event Format"
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [locationOptionsCache, setLocationOptionsCache] = useState([]);
  const [total, setTotal] = useState(0);
  const CATEGORIES_URL = `${EVENTS_URL}categories/`; // /api/events/categories/
  const [categories, setCategories] = useState([]);
  const FORMATS_URL = `${EVENTS_URL}formats/`; // /api/events/formats/
  const [formats, setFormats] = useState([]);
  const [selectedFormats, setSelectedFormats] = useState([]);
  const [startDMY, setStartDMY] = useState(""); // "dd-mm-yyyy"
  const [endDMY, setEndDMY] = useState("");   // "dd-mm-yyyy"
  const [q, setQ] = useState("");
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [maxPrice, setMaxPrice] = useState(5000);
  const [priceRange, setPriceRange] = useState([0, maxPrice || 0]);
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("lg"));
  const [openSelect, setOpenSelect] = useState(null);
  const getOpenProps = (name) => ({
    open: openSelect === name,
    onOpen: () => setOpenSelect(name),
    onClose: () => setOpenSelect(null),
  });
  const handlePostEventClick = () => {
    if (isOwnerUser()) {
      navigate("/admin/events");
      return;
    }

    if (isStaffUser()) {
      toast.error("Only platform admins can post an event.");
      return;
    }

    toast.error("You are not allowing to Post an Event");
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const res = await apiClient.get("/cms/pages/events/");
        if (!mounted) return;
        setCmsPage(res.data);
        setCmsError("");
      } catch (e) {
        if (!mounted) return;
        const status = e?.response?.status;
        if (status === 404) {
          setCmsPage(null);
          setCmsError("");
        } else {
          setCmsError(e?.response?.data?.detail || e?.message || "Failed to load events page");
        }
      } finally {
        if (mounted) setCmsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // ✅ TOP-LEVEL: build UI objects with the isRegistered flag
  useEffect(() => {
    setEvents(
      (rawEvents || []).map(ev => {
        const ui = toCard(ev);
        return { ...ui, isRegistered: !!myRegistrations[ev.id] };
      })
    );
  }, [rawEvents, myRegistrations]);


  useEffect(() => {
    const ctrl = new AbortController();

    (async () => {
      try {
        const res = await fetch(`${EVENTS_URL}locations/`, {
          headers: authHeaders(),
          signal: ctrl.signal,
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const payload = await res.json();

        // Handle common shapes:
        // - { results: [...] }
        // - { locations: [...] }
        // - [ ... ]
        let arr =
          Array.isArray(payload?.results)
            ? payload.results
            : Array.isArray(payload?.locations)
              ? payload.locations
              : Array.isArray(payload)
                ? payload
                : [];

        // Convert objects → strings if necessary
        const values = arr
          .map((loc) =>
            typeof loc === "string"
              ? loc
              : (loc?.name || loc?.city || loc?.label || "")
          )
          .filter(Boolean);

        // ✅ Case-insensitive dedupe:
        // "india", "India", "INDIA" → single entry
        const canonicalMap = new Map(); // key = lowercased, value = first original
        values.forEach((v) => {
          const key = v.trim().toLowerCase();
          if (!canonicalMap.has(key)) {
            canonicalMap.set(key, v.trim());
          }
        });

        const distinct = Array.from(canonicalMap.values());
        setLocations(distinct);
      } catch (err) {
        console.error("Failed to load locations:", err);
        setLocations([]);
      }
    })();

    return () => ctrl.abort();
  }, []);
  // Get my registrations (only if logged-in)
  // /api/event-registrations/mine/?limit=1000 returns [{ id, event: { id, ... }, ... }, ...]
  useEffect(() => {
    const token =
      localStorage.getItem("access_token") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("access");

    // if not logged-in, clear any old state
    if (!token) {
      setMyRegistrations({});
      return;
    }

    const ctrl = new AbortController();
    (async () => {
      try {
        const url = new URL(`${API_BASE}/event-registrations/mine/`);
        url.searchParams.set("limit", "1000"); // plenty for typical accounts
        const res = await fetch(url, { signal: ctrl.signal, headers: authHeaders() });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        const items = Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : []);
        const map = {};
        for (const item of items) {
          const evid = item?.event?.id ?? item?.event_id;
          if (evid) map[evid] = item;
        }
        setMyRegistrations(map);
      } catch {
        setMyRegistrations({});
      }
    })();
    return () => ctrl.abort();
  }, []);

  // ✅ Locations based on currently displayed events (rawEvents = your current page results)
  const locationsFromEvents = useMemo(() => {
    const values = (rawEvents || [])
      .map((ev) => {
        // location might be string or object depending on backend
        if (typeof ev?.location === "string") return ev.location;
        return ev?.location?.name || ev?.location?.city || "";
      })
      .map((v) => String(v || "").trim())
      .filter(Boolean);

    // case-insensitive dedupe
    const canonical = new Map();
    values.forEach((v) => {
      const key = v.toLowerCase();
      if (!canonical.has(key)) canonical.set(key, v);
    });

    return Array.from(canonical.values());
  }, [rawEvents]);

  useEffect(() => {
    // When no location filter, store the "full" options list
    if (!selectedLocation && locationsFromEvents.length) {
      setLocationOptionsCache(locationsFromEvents);
    }
  }, [selectedLocation, locationsFromEvents]);

  const locationOptions = useMemo(() => {
    const base = selectedLocation
      ? (locationOptionsCache.length ? locationOptionsCache : locationsFromEvents)
      : locationsFromEvents;

    return base.length ? base : locations;
  }, [selectedLocation, locationOptionsCache, locationsFromEvents, locations]);


  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const url = new URL(`${EVENTS_URL}max-price/`);
        // same params you already send for the list:
        const topicsToSend = selectedTopics.length ? selectedTopics : (topic ? [topic] : []);
        topicsToSend.forEach((t) => url.searchParams.append("category", t));
        if (dateRange) url.searchParams.set("date_range", dateRange);
        if (selectedLocation) url.searchParams.set("location", selectedLocation);
        const preset = presetRangeISO(dateRange);
        const startISO = dmyToISO(startDMY) || preset.start || todayISO();
        const endISO = dmyToISO(endDMY) || preset.end || "";
        url.searchParams.set("exclude_ended", "1");

        if (startISO) url.searchParams.set("start_date", startISO);
        if (endISO) url.searchParams.set("end_date", endISO);
        const fmtsToSend = selectedFormats.length ? selectedFormats : (format ? [format] : []);
        fmtsToSend.forEach((f) => url.searchParams.append("event_format", f));

        if (q) url.searchParams.set("search", q);

        const r = await fetch(url, { signal: ctrl.signal, headers: authHeaders() });
        const d = await r.json();
        if (typeof d?.max_price !== "undefined") setMaxPrice(Number(d.max_price) || 0);
      } catch (_) { }
    })();
    return () => ctrl.abort();
  }, [topic, selectedTopics, format, selectedFormats, dateRange, startDMY, endDMY, selectedLocation, q]);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        setLoading(true);
        const headers = { "Content-Type": "application/json" };
        const token =
          localStorage.getItem("access_token") ||
          localStorage.getItem("access_token") ||
          localStorage.getItem("access"); // last for backwards compat
        if (token) headers.Authorization = `Bearer ${token}`;

        const url = new URL(EVENTS_URL);
        url.searchParams.set("limit", String(PAGE_SIZE));
        url.searchParams.set("offset", String((page - 1) * PAGE_SIZE));
        url.searchParams.set("min_price", String(priceRange[0]));
        url.searchParams.set("max_price", String(priceRange[1]));
        url.searchParams.set("ordering", "start_time");
        const topicsToSend = selectedTopics.length ? selectedTopics : (topic ? [topic] : []);
        topicsToSend.forEach((t) => url.searchParams.append("category", t));
        if (dateRange) url.searchParams.set("date_range", dateRange);
        if (selectedLocation) url.searchParams.set("location", selectedLocation);

        const preset = presetRangeISO(dateRange);
        const startISO = dmyToISO(startDMY) || preset.start || todayISO();
        const endISO = dmyToISO(endDMY) || preset.end || "";
        if (startISO) url.searchParams.set("start_date", startISO);
        if (endISO) url.searchParams.set("end_date", endISO);
        url.searchParams.set("exclude_ended", "1");
        const fmtsToSend = selectedFormats.length ? selectedFormats : (format ? [format] : []);
        fmtsToSend.forEach((f) => url.searchParams.append("event_format", f));
        if (q) url.searchParams.set("search", q);   // matches title, location, topic (if backend search_fields include them)

        const res = await fetch(url, { headers: { ...headers, ...authHeaders() }, signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        const items = data.results || [];
        const now = Date.now();

        const filtered = items.filter((ev) => {
          const isEndedStatus = String(ev?.status || "").toLowerCase() === "ended";
          const endMs = ev?.end_time ? new Date(ev.end_time).getTime() : null;
          const startMs = ev?.start_time ? new Date(ev.start_time).getTime() : null;

          const endedByTime = endMs ? endMs < now : (startMs ? startMs < now : false);
          return !(isEndedStatus || endedByTime);
        });

        setRawEvents(filtered);
        setTotal(Number(data.count ?? filtered.length));
      } catch (e) {
        if (e.name !== "AbortError") setError(String(e?.message || e));
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [page, topic, format, selectedFormats, selectedTopics, dateRange, startDMY, endDMY, selectedLocation, q, priceRange]);

  useEffect(() => { setPage(1); }, [topic, format, selectedTopics, dateRange, startDMY, endDMY, selectedLocation]);

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        // Build a categories URL that only returns topics having future/ongoing events
        const url = new URL(CATEGORIES_URL);
        const preset = presetRangeISO(dateRange);
        const startISO = dmyToISO(startDMY) || preset.start || todayISO();
        const endISO = dmyToISO(endDMY) || preset.end || "";

        // mirror the list filters so “past-only” topics drop out
        url.searchParams.set("exclude_ended", "1"); // hide topics with only ended events
        if (startISO) url.searchParams.set("start_date", startISO);
        if (endISO) url.searchParams.set("end_date", endISO);
        if (dateRange) url.searchParams.set("date_range", dateRange);
        if (selectedLocation) url.searchParams.set("location", selectedLocation);


        if (q) url.searchParams.set("search", q);

        const res = await fetch(url, { signal: ctrl.signal, headers: authHeaders() });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setCategories(Array.isArray(data?.results) ? data.results : []);
      } catch (_) { }
    })();
    return () => ctrl.abort();
  }, [dateRange, startDMY, endDMY, selectedLocation, format, selectedFormats, q]);

  useEffect(() => {
    if (!selectedLocation) return;

    const list = locationOptionsCache.length ? locationOptionsCache : locationOptions;
    const ok = list.some(
      (l) => l.toLowerCase() === String(selectedLocation).toLowerCase()
    );

    if (!ok) setSelectedLocation("");
  }, [selectedLocation, locationOptionsCache, locationOptions]);

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const url = new URL(FORMATS_URL);
        const res = await fetch(url, { signal: ctrl.signal, headers: authHeaders() });
        const payload = await res.json();

        // Accept many payload shapes then normalize to slugs
        const arr =
          Array.isArray(payload?.results) ? payload.results :
            Array.isArray(payload?.formats) ? payload.formats :
              Array.isArray(payload) ? payload :
                [];

        const values = arr
          .map(f => typeof f === "string"
            ? toSlug(f)
            : toSlug(f?.value ?? f?.slug ?? f?.name ?? "")
          )
          .filter(Boolean);

        const distinct = Array.from(new Set(values));
        setFormats(distinct.length ? distinct : ["in_person", "online", "hybrid"]);
      } catch {
        // optionally keep a fallback
        // setFormats(["in_person", "online", "hybrid"]);
      }
    })();
    return () => ctrl.abort();
  }, [dateRange, startDMY, endDMY, selectedLocation, q]);


  const selectSx = {
    height: 42,                       // 12 * 4px
    borderRadius: 1,                 // rounded-xl
    bgcolor: "white",
    minWidth: { xs: 200, sm: 190, lg: 160 },
    "& .MuiOutlinedInput-notchedOutline": { borderColor: "divider" },
    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#CBD5E1" },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
      borderColor: "primary.main",
      borderWidth: 2,
    },
    "& .MuiSelect-icon": { color: "text.secondary" },
  };

  const selectMenuProps = {
    // render in a portal so it won’t be clipped by parent containers
    disablePortal: false,
    container: () => document.body,

    // position
    anchorOrigin: { vertical: "bottom", horizontal: "left" },
    transformOrigin: { vertical: "top", horizontal: "left" },
    marginThreshold: 0,

    // IMPORTANT: keep body from scrolling when the menu is open
    disableScrollLock: false,

    PaperProps: {
      elevation: 8,
      // prevent wheel/touch inside the menu from bubbling to window
      onWheel: (e) => e.stopPropagation(),
      onTouchMove: (e) => e.stopPropagation(),
      sx: {
        zIndex: 2100,
        mt: 0.5,
        maxHeight: "60vh",
        overflowY: "auto",
        borderRadius: 1,
        minWidth: 220,
        boxShadow: "0 12px 28px rgba(16,24,40,.12)",
        "& .MuiMenuItem-root": {
          py: 1.25, px: 2, borderRadius: 1, fontSize: 13,
          "&.Mui-selected, &.Mui-selected:hover": { bgcolor: "grey.100" },
          "&:hover": { bgcolor: "grey.100" },
        },
      },
    },
  };


  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    // if the total dropped (e.g., 4 items total), don’t stay on page 2
    const pc = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (page > pc) setPage(pc);
  }, [total]);

  useEffect(() => {
    setPage(1);
  }, [topic, format, q]);

  useEffect(() => {
    setPriceRange((prev) => {
      const newMax = Number(maxPrice) || 0;
      const nextMin = Math.min(prev[0], newMax);
      const nextMax = newMax;

      // ✅ if same values, do NOT update state (prevents 2nd fetch)
      if (prev[0] === nextMin && prev[1] === nextMax) return prev;

      return [nextMin, nextMax];
    });
  }, [maxPrice]);

  useEffect(() => {
    const close = () => setOpenSelect(null);
    const onPageScroll = () => close();
    const onResize = () => close();

    window.addEventListener("scroll", onPageScroll, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("scroll", onPageScroll);
      window.removeEventListener("resize", onResize);
    };
  }, []);



  const handlePageChange = (_e, value) => {
    setPage(value);
    const el = document.getElementById("events");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const heroBg = cmsPage?.hero_image_url || "/images/events-hero-bg.png";
  const heroTitle = cmsPage?.hero_title || "Explore M&A Events";
  const heroSubtitle =
    cmsPage?.hero_subtitle ||
    "The leading platform for M&A professionals to connect, learn, and grow";
  const defaultButtons = [
    { key: "primary", label: "Explore events", url: "/events" },
    { key: "secondary", label: "Join Community", url: "/signup" },
    { key: "tertiary", label: "Post an event", url: "/signup" },
  ];
  const ctaButtons =
    Array.isArray(cmsPage?.cta_buttons) && cmsPage.cta_buttons.length
      ? cmsPage.cta_buttons
      : defaultButtons;

  return (
    <>
      {/* Hero (background image) */}
      <section className="relative">
        <div
          className="relative text-white text-center"
          style={{
            backgroundImage: `url("${heroBg}")`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-[#0d2046]/80 to-[#0d2046]/95" />
          <Container maxWidth={false} disableGutters>
            <div className="relative mx-auto max-w-7xl px-6 py-16 md:py-20">
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
                {heroTitle}
              </h1>
              <p className="mx-auto max-w-3xl text-lg md:text-xl text-white/80">
                {heroSubtitle}
              </p>
              <div className="mt-8 flex flex-wrap justify-center items-center gap-4">
                {ctaButtons
                  .filter((btn) => (btn?.label || "").trim())
                  .map((btn) => {
                    const label = String(btn?.label || "").trim();
                    const url = String(btn?.url || "").trim() || "#";
                    const isExternal = /^https?:\/\//i.test(url);
                    const isPostEvent =
                      btn?.key === "tertiary" ||
                      label.toLowerCase() === "post an event";

                    const baseProps = {
                      key: btn?.key || label,
                      size: "large",
                    };

                    if (isPostEvent) {
                      return (
                        <Button
                          {...baseProps}
                          onClick={handlePostEventClick}
                          variant="outlined"
                          className="normal-case rounded-xl border-white/30 text-white hover:border-white hover:bg-white/10"
                        >
                          {label}
                        </Button>
                      );
                    }

                    if (btn?.key === "primary") {
                      return (
                        <Button
                          {...baseProps}
                          component={isExternal ? "a" : Link}
                          href={isExternal ? url : undefined}
                          to={!isExternal ? url : undefined}
                          target={isExternal ? "_blank" : undefined}
                          rel={isExternal ? "noreferrer" : undefined}
                          variant="contained"
                          className="normal-case rounded-xl bg-teal-500 hover:bg-teal-600"
                        >
                          {label}
                        </Button>
                      );
                    }

                    if (btn?.key === "secondary") {
                      return (
                        <Button
                          {...baseProps}
                          component={isExternal ? "a" : Link}
                          href={isExternal ? url : undefined}
                          to={!isExternal ? url : undefined}
                          target={isExternal ? "_blank" : undefined}
                          rel={isExternal ? "noreferrer" : undefined}
                          variant="outlined"
                          className="normal-case rounded-xl border-white/30 text-black bg-white hover:border-white hover:bg-white/10"
                        >
                          {label}
                        </Button>
                      );
                    }

                    return (
                      <Button
                        {...baseProps}
                        component={isExternal ? "a" : Link}
                        href={isExternal ? url : undefined}
                        to={!isExternal ? url : undefined}
                        target={isExternal ? "_blank" : undefined}
                        rel={isExternal ? "noreferrer" : undefined}
                        variant="outlined"
                        className="normal-case rounded-xl border-white/30 text-white hover:border-white hover:bg-white/10"
                      >
                        {label}
                      </Button>
                    );
                  })}
              </div>
            </div>
          </Container>
        </div>
      </section>

      {/* Top filters / controls bar */}
      <Container maxWidth={false} disableGutters className="mt-6 px-4 sm:px-6">
        <div className="w-full rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 overflow-visible">
          {/* Responsive grid: 1 col on xs, 2 cols on sm, 12-col layout on lg+ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">

            {/* Search (full width on all, 4 cols on lg) */}
            <div className="col-span-1 lg:col-span-3">
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M21 21l-4.3-4.3M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Search events by keyword..."
                  className="w-full h-11 pl-12 pr-4 rounded-xl border border-slate-200 bg-white outline-none"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
            </div>

            {/* Date Range (2 cols on lg) */}
            <div className="col-span-1 lg:col-span-2">
              <FormControl fullWidth size="small">
                <Select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  displayEmpty
                  renderValue={(v) => v || "Date Range"}
                  MenuProps={selectMenuProps}
                  {...getOpenProps("date")}
                  sx={{
                    ...selectSx,
                    "& .MuiOutlinedInput-root": { height: 44, borderRadius: 12 },
                    "& .MuiSelect-select": { py: 0, display: "flex", alignItems: "center" },
                  }}
                >
                  <MenuItem value="This Week">This Week</MenuItem>
                  <MenuItem value="This Month">This Month</MenuItem>
                  <MenuItem value="Next 90 days">Next 90 days</MenuItem>
                </Select>
              </FormControl>
            </div>

            {/* Topic/Industry (2 cols on lg) */}
            <div className="col-span-1 lg:col-span-2">
              <FormControl fullWidth size="small">
                <Select
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  displayEmpty
                  renderValue={(v) => v || "Topic/Industry"}
                  MenuProps={selectMenuProps}
                  {...getOpenProps("topic")}
                  sx={{
                    ...selectSx,
                    "& .MuiOutlinedInput-root": { height: 44, borderRadius: 12 },
                    "& .MuiSelect-select": { py: 0, display: "flex", alignItems: "center" },
                  }}
                >
                  {categories.map((c) => (
                    <MenuItem key={c} value={c}>{c}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>

            {/* Event Format (2 cols on lg) */}
            <div className="col-span-1 lg:col-span-2">
              <FormControl fullWidth size="small">
                <Select
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  displayEmpty
                  renderValue={(v) => v || "Event Format"}
                  MenuProps={selectMenuProps}
                  {...getOpenProps("format")}
                  sx={{
                    ...selectSx, "& .MuiOutlinedInput-root": { height: 44, borderRadius: 12 },
                    "& .MuiSelect-select": { py: 0, display: "flex", alignItems: "center" }
                  }}
                >
                  {(formats || []).map((f, idx) => (
                    <MenuItem key={`${f}-${idx}`} value={f}>{f}</MenuItem>
                  ))}
                </Select>

              </FormControl>
            </div>

            {/* Advanced (full width on xs/sm; 1 col on lg) */}
            <div className="col-span-1 lg:col-span-2">
              <button
                onClick={() => setShowAdvanced((v) => !v)}
                type="button"
                className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-slate-600">
                  <path d="M3 5h18M6 12h12M10 19h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                Advanced
              </button>
            </div>

            {/* View toggle — always visible, 50/50 on all breakpoints */}
            {/* View toggle — hidden on mobile, 50/50 on sm+ */}
            <div
              className="hidden sm:block sm:col-span-2 lg:col-span-1 min-w-0"
              aria-hidden={false} // hidden only on xs due to Tailwind
            >
              <div className="flex w-full h-11 rounded-xl overflow-hidden border border-slate-200 bg-white">
                <button
                  aria-label="Grid view"
                  onClick={() => setView('grid')}
                  className={`flex-1 h-full grid place-items-center
                    ${view === 'grid' ? 'bg-[#0b0b23] text-white' : 'bg-white text-slate-800'}`}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="3" y="3" width="8" height="8" rx="1" />
                    <rect x="13" y="3" width="8" height="8" rx="1" />
                    <rect x="3" y="13" width="8" height="8" rx="1" />
                    <rect x="13" y="13" width="8" height="8" rx="1" />
                  </svg>
                </button>

                <button
                  aria-label="List view"
                  onClick={() => setView('list')}
                  className={`flex-1 h-full grid place-items-center border-l border-slate-200
                    ${view === 'list' ? 'bg-[#0b0b23] text-white' : 'bg-white text-slate-800'}`}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>



          </div>
        </div>
      </Container>

      {/* Results */}
      <Container id="events" maxWidth={false} disableGutters className="mt-8 mb-16 px-4 sm:px-6">
        <Grid container spacing={4} sx={{ alignItems: "flex-start" }}>
          {/* LEFT: Advanced Filters — desktop only */}
          {isDesktop && showAdvanced && (
            <Grid
              item
              xs={12}
              lg={2}
              sx={{
                minWidth: 240,
                maxWidth: 280,
                flexShrink: 0,
                display: { xs: "none", lg: "block" },
              }}
            >
              <div className="sticky top-24 h-fit">
                <div className="rounded-2xl bg-[#0d2046] text-white p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M3 5h18M8 12h8M10 19h4"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="text-lg font-semibold">Advanced Filters</span>
                  </div>

                  {/* Date Range */}
                  <div className="mb-5">
                    <div className="text-teal-300 font-semibold mb-2 flex items-center gap-2">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <rect
                          x="3"
                          y="4"
                          width="18"
                          height="18"
                          rx="2"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                        <path
                          d="M16 2v4M8 2v4M3 10h18"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                      </svg>
                      Date Range
                    </div>
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                      <DatePicker
                        className="text-white bg-teal-500"
                        label={null}
                        value={startDMY ? dayjs(dmyToISO(startDMY)) : null}
                        onChange={(v) => {
                          setStartDMY(v ? v.format("DD-MM-YYYY") : "");
                          setDateRange("");
                        }}
                        format="DD-MM-YYYY"
                        slotProps={{
                          textField: {
                            placeholder: "dd-mm-yyyy",
                            size: "small",
                            sx: {
                              "& .MuiOutlinedInput-root": {
                                height: 44,
                                background: "rgba(255, 255, 255, 0.1)",
                                borderRadius: 12,
                                color: "#fff",
                              },
                              "& .MuiOutlinedInput-notchedOutline": {
                                borderColor: "rgba(255,255,255,.2)",
                              },
                              "& .MuiInputBase-input::placeholder": {
                                color: "rgba(243, 240, 240, 0.7)",
                              },
                              mb: 1.5,
                            },
                          },
                        }}
                      />

                      <DatePicker
                        className="text-white bg-teal-500"
                        label={null}
                        value={endDMY ? dayjs(dmyToISO(endDMY)) : null}
                        onChange={(v) => {
                          setEndDMY(v ? v.format("DD-MM-YYYY") : "");
                          setDateRange("");
                        }}
                        format="DD-MM-YYYY"
                        slotProps={{
                          textField: {
                            placeholder: "dd-mm-yyyy",
                            size: "small",
                            sx: {
                              "& .MuiOutlinedInput-root": {
                                height: 44,
                                background: "rgba(255,255,255,.1)",
                                borderRadius: 12,
                                color: "#fff",
                              },
                              "& .MuiOutlinedInput-notchedOutline": {
                                borderColor: "rgba(255,255,255,.2)",
                              },
                              "& .MuiInputBase-input::placeholder": {
                                color: "rgba(255,255,255,.7)",
                              },
                            },
                          },
                        }}
                      />
                    </LocalizationProvider>
                  </div>

                  {/* Location */}
                  <FormControl size="small" className="w-full sm:w-[250px] mb-4 sm:mb-5">
                    <Select
                      value={selectedLocation}
                      onChange={(e) => {
                        const v = e.target.value;

                        // ✅ freeze the full list BEFORE applying location filter
                        if (!locationOptionsCache.length && locationsFromEvents.length) {
                          setLocationOptionsCache(locationsFromEvents);
                        }
                        setPage(1);
                        setSelectedLocation(v);
                      }}
                      displayEmpty
                      renderValue={(v) => v || "Location"}
                      MenuProps={selectMenuProps}
                      {...getOpenProps("location")}
                      sx={{
                        ...selectSx,
                        "& .MuiSelect-select": { px: 2.5, py: 2.25 },
                      }}
                    >
                      <MenuItem value="">
                        <em>Location</em>
                      </MenuItem>
                      {locationOptions.map((loc) => (
                        <MenuItem key={loc} value={loc}>
                          {loc}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {/* Topic/Industry */}
                  <div className="mb-6">
                    <div className="text-teal-300 font-semibold mb-2 flex items-center gap-2">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M4 7h16M4 12h16M4 17h16"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                      Topic/Industry
                    </div>
                    <div className="space-y-3 text-white/90">
                      {categories.map((x) => (
                        <label key={x} className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-white/30 bg-transparent"
                            checked={selectedTopics.includes(x)}
                            onChange={(e) =>
                              setSelectedTopics((prev) =>
                                e.target.checked
                                  ? [...prev, x]
                                  : prev.filter((v) => v !== x)
                              )
                            }
                          />
                          <span>{x}</span>
                        </label>
                      ))}
                      {selectedTopics.length > 0 && (
                        <button
                          type="button"
                          className="mt-2 text-xs underline text-white/70"
                          onClick={() => setSelectedTopics([])}
                        >
                          Clear all
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Event Format */}
                  <div className="mb-6">
                    <div className="text-teal-300 font-semibold mb-2 flex items-center gap-2">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M4 7h16M4 12h16M4 17h16"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                      Event Format
                    </div>
                    <div className="space-y-3 text-white/90">
                      {formats.map((x) => (
                        <label key={x} className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-white/30 bg-transparent"
                            checked={selectedFormats.includes(x)}
                            onChange={(e) =>
                              setSelectedFormats((prev) =>
                                e.target.checked
                                  ? [...prev, x]
                                  : prev.filter((v) => v !== x)
                              )
                            }
                          />
                          <span>{x}</span>
                        </label>
                      ))}
                      {selectedFormats.length > 0 && (
                        <button
                          type="button"
                          className="mt-2 text-xs underline text-white/70"
                          onClick={() => setSelectedFormats([])}
                        >
                          Clear all
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Price (visual) */}
                  <div className="mb-6">
                    <div className="text-teal-300 font-semibold mb-2 flex items-center gap-2">
                      <span>$</span> Price Range
                    </div>
                    <Slider
                      value={priceRange}
                      onChange={(_, v) => setPriceRange(v)}
                      valueLabelDisplay="auto"
                      min={0}
                      max={Math.max(0, Number(maxPrice) || 0)}
                      sx={{
                        "& .MuiSlider-thumb": { bgcolor: "white" },
                        "& .MuiSlider-track": { bgcolor: "white" },
                        "& .MuiSlider-rail": { opacity: 0.3 },
                      }}
                    />
                    <div className="flex justify-between text-sm mt-1 text-white/80">
                      <span>{priceStr(priceRange[0])}</span>
                      <span>{priceStr(priceRange[1])}+</span>
                    </div>
                  </div>

                  <button className="w-full h-11 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-semibold">
                    Apply Filters
                  </button>

                  <button
                    type="button"
                    className="w-full h-11 px-2 rounded-xl border-white/30 text-black bg-white hover:border-white hover:bg-white/10 mt-3"
                    onClick={() => {
                      setQ("");
                      setDateRange("");
                      setStartDMY("");
                      setEndDMY("");
                      setSelectedLocation("");
                      setTopic("");
                      setSelectedTopics([]);
                      setFormat("");
                      setSelectedFormats([]);
                      setPriceRange([0, Number(maxPrice) || 0]);
                      setPage(1);
                    }}
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            </Grid>
          )}

          {/* RIGHT: heading + cards/list */}
          <Grid
            item
            xs={12}
            lg={showAdvanced && isDesktop ? 10 : 12}
            sx={{ flex: 1, minWidth: 0 }}
          >
            <div className="w-full">
              <h2 className="text-3xl font-bold">Upcoming Events</h2>
              <p className="text-neutral-600 mt-1">
                {loading ? (
                  <Skeleton variant="text" width={140} sx={{ display: "inline-block" }} />
                ) : (
                  `${total} events found`
                )}
              </p>
              {error && (
                <p className="mt-2 text-red-600 text-sm">
                  Failed to load events: {error}
                </p>
              )}
            </div>

            {view === "grid" ? (
              <Box
                sx={{
                  mt: 3,
                  display: "grid",
                  gap: 3,
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "repeat(2, minmax(0,1fr))",
                    md: "repeat(3, minmax(0,1fr))",
                    lg: "repeat(3, minmax(0,1fr))",
                  },
                }}
              >
                {loading
                  ? skeletonItems.map((i) => (
                    <Box key={`sk-grid-${i}`}>
                      <EventCardSkeleton />
                    </Box>
                  ))
                  : events.map((ev) => (
                    <Box key={ev.id}>
                      <EventCard ev={ev} myRegistrations={myRegistrations} setMyRegistrations={setMyRegistrations} setRawEvents={setRawEvents} />
                    </Box>
                  ))}
              </Box>
            ) : (
              <Grid container spacing={3} direction="column">
                {loading
                  ? skeletonItems.map((i) => (
                    <Grid item key={`sk-list-${i}`} xs={12}>
                      <EventRowSkeleton />
                    </Grid>
                  ))
                  : events.map((ev) => (
                    <Grid item key={ev.id} xs={12}>
                      <EventRow ev={ev} myRegistrations={myRegistrations} setMyRegistrations={setMyRegistrations} setRawEvents={setRawEvents} />
                    </Grid>
                  ))}
              </Grid>
            )}
          </Grid>
        </Grid>

        {/* Mobile/Tablet FULL-SCREEN Advanced Filters */}
        {!isDesktop && (
          <Drawer
            anchor="left"
            variant="temporary"
            open={showAdvanced}
            onClose={() => setShowAdvanced(false)}
            ModalProps={{ keepMounted: true }}
            PaperProps={{
              sx: {
                width: '100%',          // not 100vw (avoids overshoot)
                maxWidth: '100%',
                height: '100dvh',       // better on mobile than 100vh
                bgcolor: '#0d2046',
                color: 'white',
                borderRadius: 0,
                boxSizing: 'border-box', // include border in width
                overflowX: 'clip',       // hide any stray overflow
              },
            }}
          >
            {/* Top bar */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-[#0d2046] border-b border-white/10 w-full">
              <span className="text-lg font-semibold">Advanced Filters</span>
              <Button size="small" variant="outlined" onClick={() => setShowAdvanced(false)}>
                Close
              </Button>
            </div>

            {/* Scrollable content */}
            <div
              className="p-4 overflow-y-auto w-full"
              style={{ height: 'calc(100dvh - 112px)', overflowX: 'clip' }}
            >
              {/* --- your existing fields unchanged --- */}

              {/* Date Range */}
              <div className="mb-5">
                <div className="text-teal-300 font-semibold mb-2 flex items-center gap-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                    <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" />
                  </svg>
                  Date Range
                </div>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DatePicker
                    className="text-white bg-teal-500"
                    label={null}
                    value={startDMY ? dayjs(dmyToISO(startDMY)) : null}
                    onChange={(v) => { setStartDMY(v ? v.format('DD-MM-YYYY') : ''); setDateRange(''); }}
                    format="DD-MM-YYYY"
                    slotProps={{
                      textField: {
                        placeholder: 'dd-mm-yyyy',
                        size: 'small',
                        sx: {
                          '& .MuiOutlinedInput-root': { height: 44, background: 'rgba(255,255,255,.1)', borderRadius: 12, color: '#fff' },
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,.2)' },
                          '& .MuiInputBase-input::placeholder': { color: 'rgba(255,255,255,.7)' },
                          mb: 1.5,
                        },
                      },
                    }}
                  />
                  <DatePicker
                    className="text-white bg-teal-500"
                    label={null}
                    value={endDMY ? dayjs(dmyToISO(endDMY)) : null}
                    onChange={(v) => { setEndDMY(v ? v.format('DD-MM-YYYY') : ''); setDateRange(''); }}
                    format="DD-MM-YYYY"
                    slotProps={{
                      textField: {
                        placeholder: 'dd-mm-yyyy',
                        size: 'small',
                        sx: {
                          '& .MuiOutlinedInput-root': { height: 44, background: 'rgba(255,255,255,.1)', borderRadius: 12, color: '#fff' },
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,.2)' },
                          '& .MuiInputBase-input::placeholder': { color: 'rgba(255,255,255,.7)' },
                        },
                      },
                    }}
                  />
                </LocalizationProvider>
              </div>

              {/* Location */}
              <FormControl size="small" className="w-full sm:w-[250px] mb-4 sm:mb-5">
                <Select
                  value={selectedLocation}
                  onChange={(e) => {
                    const v = e.target.value;

                    if (!locationOptionsCache.length && locationsFromEvents.length) {
                      setLocationOptionsCache(locationsFromEvents);
                    }
                    setPage(1);
                    setSelectedLocation(v);
                  }}
                  displayEmpty
                  renderValue={(v) => v || 'Location'}
                  MenuProps={selectMenuProps}
                  sx={{ ...selectSx, '& .MuiSelect-select': { px: 2.5, py: 2.25 } }}
                >
                  <MenuItem value="">
                    <em>Location</em>
                  </MenuItem>
                  {locationOptions.map((loc) => (
                    <MenuItem key={loc} value={loc}>{loc}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Topic/Industry */}
              <div className="mb-6">
                <div className="text-teal-300 font-semibold mb-2 flex items-center gap-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Topic/Industry
                </div>
                <div className="space-y-3 text-white/90">
                  {categories.map((x) => (
                    <label key={x} className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-white/30 bg-transparent"
                        checked={selectedTopics.includes(x)}
                        onChange={(e) =>
                          setSelectedTopics((prev) => e.target.checked ? [...prev, x] : prev.filter((v) => v !== x))
                        }
                      />
                      <span>{x}</span>
                    </label>
                  ))}
                  {selectedTopics.length > 0 && (
                    <button type="button" className="mt-2 text-xs underline text-white/70" onClick={() => setSelectedTopics([])}>
                      Clear all
                    </button>
                  )}
                </div>
              </div>

              {/* Event Format */}
              <div className="mb-6">
                <div className="text-teal-300 font-semibold mb-2 flex items-center gap-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Event Format
                </div>
                <div className="space-y-3 text-white/90">
                  {formats.map((x) => (
                    <label key={x} className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-white/30 bg-transparent"
                        checked={selectedFormats.includes(x)}
                        onChange={(e) =>
                          setSelectedFormats((prev) => e.target.checked ? [...prev, x] : prev.filter((v) => v !== x))
                        }
                      />
                      <span>{x}</span>
                    </label>
                  ))}
                  {selectedFormats.length > 0 && (
                    <button type="button" className="mt-2 text-xs underline text-white/70" onClick={() => setSelectedFormats([])}>
                      Clear all
                    </button>
                  )}
                </div>
              </div>

              {/* Price (visual) */}
              <div className="mb-6">
                <div className="text-teal-300 font-semibold mb-2 flex items-center gap-2">
                  <span>$</span> Price Range
                </div>
                <Slider
                  value={priceRange}
                  onChange={(_, v) => setPriceRange(v)}
                  valueLabelDisplay="auto"
                  min={0}
                  max={Math.max(0, Number(maxPrice) || 0)}
                  sx={{
                    '& .MuiSlider-thumb': { bgcolor: 'white' },
                    '& .MuiSlider-track': { bgcolor: 'white' },
                    '& .MuiSlider-rail': { opacity: 0.3 },
                  }}
                />
                <div className="flex justify-between text-sm mt-1 text-white/80">
                  <span>{priceStr(priceRange[0])}</span>
                  <span>{priceStr(priceRange[1])}+</span>
                </div>
              </div>
              {/* --- /fields --- */}
            </div>

            {/* Bottom action bar (no left/right offsets) */}
            <div className="sticky bottom-0 w-full bg-[#0d2046] border-t border-white/10 p-3 flex gap-2">
              <Button
                fullWidth
                variant="outlined"
                onClick={() => {
                  setQ(''); setDateRange(''); setStartDMY(''); setEndDMY('');
                  setSelectedLocation(''); setTopic(''); setSelectedTopics([]);
                  setFormat(''); setSelectedFormats([]);
                  setPriceRange([0, Number(maxPrice) || 0]); setPage(1);
                }}
              >
                Clear
              </Button>
              <Button fullWidth variant="contained" onClick={() => setShowAdvanced(false)}>
                Apply
              </Button>
            </div>
          </Drawer>
        )}

        {/* Pagination */}
        <Box
          className="mt-8 flex items-center justify-center"
          sx={{ opacity: loading ? 0.6 : 1, pointerEvents: loading ? "none" : "auto" }}
        >
          <Pagination
            count={pageCount}
            page={page}
            onChange={handlePageChange}
            color="primary"
            shape="rounded"
            siblingCount={1}
            boundaryCount={1}
          />
        </Box>
      </Container>
      <ToastContainer
        position="top-center"
        autoClose={2000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
    </>
  );
}
