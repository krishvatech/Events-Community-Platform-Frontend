// src/pages/EventsPage.jsx
// Public Events listing page — static only (no API / dynamic fetch).
// Reuses existing Header/Footer and our MUI + Tailwind setup.

import React, {useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";
import {
  Box,
  Button,
  Container,
  Divider,
  Grid,
  Card as MUICard,
  CardContent,
  Pagination,
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
const API_BASE =
  (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api").replace(/\/$/, "");
const EVENTS_URL = `${API_BASE}/events/`;

function humanizeFormat(fmt = "") {
  return fmt.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function toCard(ev) {
  // map backend fields to the fields your UI already uses
  return {
    id: ev.id,
    title: ev.title,
    description: ev.description,
    image: ev.preview_image,                 // URLField on your model
    start: ev.start_time,                    // DateTimeField
    end: ev.end_time,                        // DateTimeField
    location: ev.location,
    topics: [ev.category, humanizeFormat(ev.format)].filter(Boolean), // ["Strategy", "In-Person"]
    attendees: ev.attending_count,
    price: ev.price,
    registration_url: `/events/${ev.slug || ev.id}`, // tweak to your detail route
  };
}
// ————————————————————————————————————————
// Card (thumbnail view)
// ————————————————————————————————————————
function EventCard({ ev }) {
  const startDate = new Date(ev.start);
  const endDate = ev.end ? new Date(ev.end) : undefined;

  return (
    <MUICard
      elevation={0}
      className="group rounded-2xl border border-[#E8EEF2] bg-white shadow-sm
                 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5
                 hover:border-teal-200 overflow-hidden"
    >
      {/* Media with overlay badges */}
      <Box className="relative">
        {ev.image ? (
          <img
            src={ev.image}
            alt={ev.title}
            className="w-full h-56 md:h-64 object-cover
                        transition-transform duration-700 ease-out          /* smooth & slow */
                        group-hover:scale-105                               /* zoom on card hover */
                        will-change-transform"
          />
        ) : (
          <div className="w-full h-56 md:h-64 object-cover
                        transition-transform duration-700 ease-out          /* smooth & slow */
                        group-hover:scale-105                               /* zoom on card hover */
                        will-change-transform">
            No image
          </div>
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

      <CardContent className="p-6">
        <h3 className="text-2xl font-semibold  hover:text-teal-700 text-neutral-900 leading-snug">
          {ev.title}
        </h3>
        {ev.description && (
          <p className="mt-2 text-neutral-600 text-sm leading-relaxed">
            {truncate(ev.description, 160)}
          </p>
        )}

        <div className="mt-4 space-y-2 text-neutral-800 text-sm">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <CalendarMonthIcon fontSize="small" className="text-teal-700" />
              <span>
                {new Date(ev.start).toLocaleDateString(undefined, {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
            {ev.end && (
              <div className="flex items-center gap-2">
                <AccessTimeIcon fontSize="small" className="text-teal-700" />
                <span>
                  {new Date(ev.start).toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "2-digit",
                  })}{" "}
                  -{" "}
                  {new Date(ev.end).toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            )}
          </div>

          {ev.location && (
            <div className="flex items-center gap-2">
              <PlaceIcon fontSize="small" className="text-teal-700" />
              <span>{ev.location}</span>
            </div>
          )}

          {!!ev.attendees && (
            <div className="flex items-center gap-2">
              <GroupsIcon fontSize="small" className="text-teal-700" />
              <span>{ev.attendees} attending</span>
            </div>
          )}
        </div>

        <Divider className="my-5" />

        <div className="flex items-center justify-between">
          <div className="text-xl font-semibold text-neutral-900">
            {priceStr(ev.price)}
          </div>
          <Button
            variant="contained"
            size="large"
            color="primary"
            component={Link}
            to={ev.registration_url}
            className="normal-case rounded-full px-5 bg-teal-500 hover:bg-teal-600"
          >
            Register Now
          </Button>
        </div>
      </CardContent>
    </MUICard>
  );
}

// ————————————————————————————————————————
// Row (details/list view)
// ————————————————————————————————————————
function EventRow({ ev }) {
  const startDate = new Date(ev.start);
  const endDate = ev.end ? new Date(ev.end) : undefined;

  return (
    <MUICard
      elevation={0}
      className="group rounded-2xl border border-[#E8EEF2] bg-white shadow-sm
                 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5
                 hover:border-teal-200 overflow-hidden overflow-hidden"
    >
      <div className="md:flex">
        {/* Image / badges */}
        <div className="relative md:w-2/5">
          {ev.image ? (
            <img
              src={ev.image}
              alt={ev.title}
              className="w-full h-44 md:h-full object-cover
                         transform-gpu transition-transform duration-700 ease-out
                         group-hover:scale-105 will-change-transform"
            />
          ) : (
            <div className="w-full h-44 md:h-full object-cover
                         transform-gpu transition-transform duration-700 ease-out
                         group-hover:scale-105 will-change-transform">
              No image
            </div>
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
                    {startDate.toLocaleTimeString(undefined, {
                      hour: "numeric",
                      minute: "2-digit",
                    })}{" "}
                    -{" "}
                    {endDate?.toLocaleTimeString(undefined, {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                )}

                {ev.location && (
                  <span className="inline-flex items-center gap-2">
                    <PlaceIcon fontSize="small" className="text-teal-700" />
                    {ev.location}
                  </span>
                )}

                {!!ev.attendees && (
                  <span className="inline-flex items-center gap-2">
                    <GroupsIcon fontSize="small" className="text-teal-700" />
                    {ev.attendees} attending
                  </span>
                )}
              </div>

              <div className="mt-3 text-base font-semibold text-neutral-900">
                {priceStr(ev.price)}
              </div>
            </div>

            <div className="shrink-0">
              <Button
                variant="contained"
                size="large"
                color="primary"
                component={Link}
                to={ev.registration_url}
                className="normal-case rounded-full px-5 bg-teal-500 hover:bg-teal-600"
              >
                Register Now
              </Button>
            </div>
          </div>
        </CardContent>
      </div>
    </MUICard>
  );
}

// ————————————————————————————————————————
// Page
// ————————————————————————————————————————
export default function EventsPage() {
  const PAGE_SIZE = 9; // 9 items per page
  const [page, setPage] = useState(1);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [view, setView] = useState("grid"); // 'grid' | 'list'
  const [dateRange, setDateRange] = useState(""); // "",
  const [topic, setTopic] = useState("");   // or "Topic/Industry" if you prefer
  const [format, setFormat] = useState(""); // or "Event Format"
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [total, setTotal] = useState(0);
  const CATEGORIES_URL = `${EVENTS_URL}categories/`; // /api/events/categories/
  const [categories, setCategories] = useState([]);
  const FORMATS_URL = `${EVENTS_URL}formats/`; // /api/events/formats/
  const [formats, setFormats] = useState([]);
  const [selectedFormats, setSelectedFormats] = useState([]);
  const [startDMY, setStartDMY] = useState(""); // "dd-mm-yyyy"
  const [endDMY, setEndDMY]   = useState("");   // "dd-mm-yyyy"
  const [q, setQ] = useState("");
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedTopics, setSelectedTopics] = useState([]);


  useEffect(() => {
  fetch(`${EVENTS_URL}locations/`)
    .then(r => r.json())
    .then(d => setLocations(d?.results || []))
    .catch(() => setLocations([]));
}, []);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        setLoading(true);
        const headers = { "Content-Type": "application/json" };
        const token = localStorage.getItem("access");
        if (token) headers.Authorization = `Bearer ${token}`;

        const url = new URL(EVENTS_URL);
        url.searchParams.set("limit", String(PAGE_SIZE));
        url.searchParams.set("offset", String((page - 1) * PAGE_SIZE));
        const topicsToSend = selectedTopics.length ? selectedTopics : (topic ? [topic] : []);
        topicsToSend.forEach((t) => url.searchParams.append("category", t));
        if (dateRange) url.searchParams.set("date_range", dateRange);
        if (selectedLocation) url.searchParams.set("location", selectedLocation);

        const startISO = dmyToISO(startDMY);
        const endISO   = dmyToISO(endDMY);
        if (startISO) url.searchParams.set("start_date", startISO);
        if (endISO)   url.searchParams.set("end_date", endISO);
        const fmtsToSend = selectedFormats.length ? selectedFormats : (format ? [format] : []);
        fmtsToSend.forEach((f) => url.searchParams.append("event_format", f));
        if (q) url.searchParams.set("search", q);   // matches title, location, topic (if backend search_fields include them)

        const res = await fetch(url, { headers, signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        setEvents((data.results || []).map(toCard));
        setTotal(Number(data.count ?? (data.results || []).length));
      } catch (e) {
        if (e.name !== "AbortError") setError(String(e?.message || e));
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [page, topic, format, selectedFormats, selectedTopics,dateRange, startDMY, endDMY,selectedLocation,q]);

  useEffect(() => { setPage(1); }, [topic, format,selectedTopics, dateRange, startDMY, endDMY,selectedLocation]);

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch(CATEGORIES_URL, { signal: ctrl.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setCategories(Array.isArray(data?.results) ? data.results : []);
      } catch (_) {}
    })();
    return () => ctrl.abort();
  }, []);


  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch(FORMATS_URL, { signal: ctrl.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setFormats(Array.isArray(data?.results) ? data.results : []);
      } catch (_) {}
    })();
    return () => ctrl.abort();
  }, []);

  const selectSx = {
   height: 42,                       // 12 * 4px
   borderRadius: 1,                 // rounded-xl
   bgcolor: "white",
   minWidth: 190,
   "& .MuiOutlinedInput-notchedOutline": { borderColor: "divider" },
   "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#CBD5E1" },
   "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
     borderColor: "primary.main",
     borderWidth: 2,
   },
   "& .MuiSelect-icon": { color: "text.secondary" },
 };

 const selectMenuProps = {
   PaperProps: {
     elevation: 8,
     sx: {
       mt: 0.5,
       borderRadius: 1,
       minWidth: 220,
       boxShadow: "0 12px 28px rgba(16,24,40,.12)",
       "& .MuiMenuItem-root": {
         py: 1.25,
         px: 2,
         borderRadius: 1,
         "&.Mui-selected, &.Mui-selected:hover": { bgcolor: "grey.100" },
         "&:hover": { bgcolor: "grey.100" },
        fontSize:13,
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
}, [topic, format,q]);


  const handlePageChange = (_e, value) => {
    setPage(value);
    const el = document.getElementById("events");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <Header />
      {/* Hero (background image) */}
            <section className="relative">
              <div
                className="relative text-white text-center"
                style={{
                  backgroundImage: "url(/images/events-hero-bg.png)",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-[#0d2046]/80 to-[#0d2046]/95" />
                <Container maxWidth={false} disableGutters>
                  <div className="relative mx-auto max-w-7xl px-6 py-16 md:py-20">
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
                      Explore M&A Events
                    </h1>
                    <p className="mx-auto max-w-3xl text-lg md:text-xl text-white/80">
                      The leading platform for M&A professionals to connect, learn, and grow
                    </p>
                    <div className="mt-8 flex flex-wrap justify-center items-center gap-4">
                      <Button
                        component={Link}
                        to="/events"
                        size="large"
                        variant="contained"
                        className="normal-case rounded-xl bg-teal-500 hover:bg-teal-600"
                      >
                        Explore events
                      </Button>
                      <Button
                        component={Link}
                        to="/signup"
                        size="large"
                        variant="outlined"
                        className="normal-case rounded-xl border-white/30 text-black bg-white hover:border-white hover:bg-white/10"
                      >
                        Join Community
                      </Button>
                      <Button
                        component={Link}
                        to="/signup"
                        size="large"
                        variant="outlined"
                        className="normal-case rounded-xl border-white/30 text-white hover:border-white hover:bg-white/10"
                      >
                        Post an event
                      </Button>
                    </div>
                  </div>
                </Container>
              </div>
            </section>  

      {/* Top filters / controls bar */}
      <Container maxWidth="lg" className="mt-6">
        <div className="w-full flex flex-wrap items-center gap-3 p-3 bg-[#F7FAFC] rounded-xl border border-slate-200">
          {/* Search */}
          <div className="relative flex-1 min-w-[240px]">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M21 21l-4.3-4.3M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search events by keyword..."
              className="w-full h-12 pl-12 pr-4 rounded-xl border border-slate-200 bg-white outline-none"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <FormControl size="small">
            <Select
              label="Date Range"
              value={dateRange}              // ← fallback so text shows
              onChange={(e) => setDateRange(e.target.value)}
              displayEmpty
              renderValue={(v) => v || 'Date Range'}
              MenuProps={selectMenuProps}
              sx={{
                ...selectSx,
                // make sure styles don’t hide the text
                '& .MuiSelect-select': { opacity: 1, color: 'inherit', textIndent: 0 },
              }}
            >
              
              <MenuItem value="This Week">This Week</MenuItem>
              <MenuItem value="This Month">This Month</MenuItem>
              <MenuItem value="Next 90 days">Next 90 days</MenuItem> {/* ← unique */}
            </Select>
          </FormControl>


          {/* Topic/Industry */}
          <FormControl size="small">
             <Select
               value={topic}
               onChange={(e) => setTopic(e.target.value)}
               displayEmpty
               renderValue={(v) => v || 'Topic/Industry'}
               MenuProps={selectMenuProps}
               sx={selectSx}
             >
               
                {categories.map((c) => (
                  <MenuItem key={c} value={c}>{c}</MenuItem>
                ))}
             </Select>
          </FormControl>

          {/* Event Format */}
          <FormControl size="small">
             <Select
               value={format}
               onChange={(e) => setFormat(e.target.value)}
               displayEmpty
               renderValue={(v) => v || 'Event Format'}
               MenuProps={selectMenuProps}
               sx={selectSx}
             >
                  {formats.map((f) => (
                    <MenuItem key={f} value={f}>{f}</MenuItem>
                  ))}
             </Select>
          </FormControl>

          {/* Advanced toggle */}
          <button
            onClick={() => setShowAdvanced(v => !v)} 
            type="button"
            className="h-12 px-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white text-sm"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-slate-600">
              <path d="M3 5h18M6 12h12M10 19h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Advanced
          </button>

          {/* View toggle (now functional) */}
          <div className="ml-auto flex items-center border border-slate-200 rounded-xl overflow-hidden">
            <button
              aria-label="Thumbnail view"
              onClick={() => setView("grid")}
              className={`px-3 py-2 ${view === "grid" ? "bg-[#0b0b23] text-white" : "bg-white text-slate-800"}`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <rect x="3" y="3" width="8" height="8" rx="1"></rect>
                <rect x="13" y="3" width="8" height="8" rx="1"></rect>
                <rect x="3" y="13" width="8" height="8" rx="1"></rect>
                <rect x="13" y="13" width="8" height="8" rx="1"></rect>
              </svg>
            </button>
            <button
              aria-label="Details list view"
              onClick={() => setView("list")}
              className={`px-3 py-2 border-l border-slate-200 ${view === "list" ? "bg-[#0b0b23] text-white" : "bg-white text-slate-800"}`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      </Container>

      {/* Results */}
      <Container id="events" maxWidth="xl" className="mt-8 mb-16">
        {showAdvanced ? (
          <Grid container spacing={4} sx={{ alignItems: 'flex-start' }}>
            {/* LEFT: Advanced Filters panel */}
            <Grid size={{ xs: 12, lg: 3 }} sx={{ minWidth: 300, flexShrink: 0 }}>
              <div className="rounded-2xl bg-[#0d2046] text-white p-6 sticky top-24 h-fit hidden lg:block">
                <div className="flex items-center gap-2 mb-6">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M3 5h18M8 12h8M10 19h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <span className="text-lg font-semibold">Advanced Filters</span>
                </div>

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
                  value={startDMY ? dayjs(dmyToISO(startDMY)) : null}   // use your helper
                  onChange={(v) => { setStartDMY(v ? v.format("DD-MM-YYYY") : ""); setDateRange(""); }}
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
                        "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,.2)" },
                        "& .MuiInputBase-input::placeholder": { color: "rgba(243, 240, 240, 0.7)" },
                        mb: 1.5,
                      },
                    },
                  }}
                />

                <DatePicker
                  className="text-white bg-teal-500"
                  label={null}
                  value={endDMY ? dayjs(dmyToISO(endDMY)) : null}
                  onChange={(v) => { setEndDMY(v ? v.format("DD-MM-YYYY") : ""); setDateRange(""); }}
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
                        "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,.2)" },
                        "& .MuiInputBase-input::placeholder": { color: "rgba(255,255,255,.7)" },
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
                      onChange={(e) => setSelectedLocation(e.target.value)}
                      displayEmpty
                      renderValue={(v) => v || 'Location'}
                      MenuProps={selectMenuProps}
                      sx={{ ...selectSx, '& .MuiSelect-select': { px: 2.5, py: 2.25 } }}
                    >
                      {/* allow clearing back to 'Location' */}
                      <MenuItem value="">
                        <em>Location</em>
                      </MenuItem>

                      {locations.map((loc) => (
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
                              setSelectedTopics((prev) =>
                                e.target.checked ? [...prev, x] : prev.filter((v) => v !== x)
                              )
                            }
                          />

                        <span>{x}</span>
                      </label>
                    ))}
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
                            setSelectedFormats((prev) =>
                              e.target.checked ? [...prev, x] : prev.filter((v) => v !== x)
                            )
                          }
                        />
                        <span>{x}</span>
                      </label>
                    ))}
                    {/* quick "clear all" */}
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
                  <input type="range" className="w-full accent-white" />
                  <div className="flex justify-between text-sm mt-1 text-white/80">
                    <span>$0</span>
                    <span>$5,000+</span>
                  </div>
                </div>

                <button className="w-full h-11 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-semibold">
                  Apply Filters
                </button>
              </div>
            </Grid>

            {/* RIGHT: heading + cards/list */}
            <Grid size={{ xs: 12, lg: 9 }} sx={{ flex: 1, minWidth: 0 }}>
              <div className="w-full">
                <h2 className="text-3xl font-bold">Upcoming Events</h2>
                <p className="text-neutral-600 mt-1">
                    {loading ? "Loading…" : `${total} events found`}
                  </p>
                  {error && (
                    <p className="mt-2 text-red-600 text-sm">Failed to load events: {error}</p>
                  )}
              </div>

              {view === "grid" ? (
                 <Grid container spacing={3}>
                   {events.map((ev) => (
                     <Grid key={ev.id} size={{ xs: 12, md: 4 }}>
                       <EventCard ev={ev} />
                     </Grid>
                   ))}
                 </Grid>
               ) : (
                 <Grid container spacing={3} direction="column">
                   {events.map((ev) => (
                     <Grid key={ev.id} size={12}>
                       <EventRow ev={ev} />
                     </Grid>
                   ))}
                 </Grid>
               )}
            </Grid>
          </Grid>
        ) : (
          <>
            <div className="mb-4">
              <h2 className="text-3xl font-bold">Upcoming Events</h2>
              <p className="text-neutral-600 mt-1">
                {loading ? "Loading…" : `${total} events found`}
              </p>
              {error && (
                <p className="mt-2 text-red-600 text-sm">Failed to load events: {error}</p>
              )}
            </div>

            {view === "grid" ? (
             <Grid container spacing={3}>
               {events.map((ev) => (
                 <Grid key={ev.id} size={{ xs: 12, md: 4 }}>
                   <EventCard ev={ev} />
                 </Grid>
               ))}
             </Grid>
           ) : (
             <Grid container spacing={3} direction="column">
               {events.map((ev) => (
                 <Grid key={ev.id} size={12}>
                   <EventRow ev={ev} />
                 </Grid>
               ))}
             </Grid>
           )}

          </>
        )}

        {/* Pagination */}
        <Box className="mt-8 flex items-center justify-center">
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

      <Footer />
    </>
  );
}
