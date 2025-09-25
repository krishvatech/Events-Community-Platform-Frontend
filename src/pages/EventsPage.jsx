// src/pages/EventsPage.jsx
// Public Events listing page — static only (no API / dynamic fetch).
// Reuses existing Header/Footer and our MUI + Tailwind setup.

import React, { useMemo, useState } from "react";
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


// ————————————————————————————————————————
// Static demo events
// ————————————————————————————————————————
const EVENTS = [
  {
    id: "ai-ma-summit-2025",
    title: "AI & Mergers Summit 2025",
    description:
      "Explore the intersection of artificial intelligence and merger & acquisition strategy with top operators and coaches.",
    image:
      "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=1600&auto=format&fit=crop",
    start: "2025-03-15T09:00:00",
    end: "2025-03-15T17:00:00",
    location: "New York, NY",
    topics: ["M&A Strategy", "In-Person"],
    attendees: 450,
    price: 899,
    registration_url: "/signup",
  },
  {
    id: "global-ma-leaders-forum",
    title: "Global M&A Leaders Forum",
    description:
      "Connect with top M&A professionals and learn about the latest integration trends, governance, and cross-border tactics.",
    image:
      "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=1600&auto=format&fit=crop",
    start: "2025-03-22T10:00:00",
    end: "2025-03-22T18:00:00",
    location: "London, UK",
    topics: ["Leadership", "Hybrid"],
    attendees: 680,
    price: 1299,
    registration_url: "/signup",
  },
  {
    id: "corp-strategy-masterclass",
    title: "Corporate Strategy Masterclass",
    description:
      "Deep dive into advanced corporate strategy frameworks and their real-world implementation in M&A contexts.",
    image:
      "https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?q=80&w=1600&auto=format&fit=crop",
    start: "2025-04-05T14:00:00",
    end: "2025-04-05T20:00:00",
    location: "Singapore",
    topics: ["Strategy", "In-Person"],
    attendees: 200,
    price: 649,
    registration_url: "/signup",
  },
  {
    id: "deal-making-excellence",
    title: "Deal Making Excellence Workshop",
    description:
      "Master the art of successful deal negotiation and execution with hands-on case studies and expert guidance.",
    image:
      "https://images.unsplash.com/photo-1557425493-6f90ae4659fc?q=80&w=1600&auto=format&fit=crop",
    start: "2025-04-12T09:00:00",
    end: "2025-04-12T16:00:00",
    location: "Virtual",
    topics: ["Workshop", "Online"],
    attendees: 320,
    price: 399,
    registration_url: "/signup",
  },
  {
    id: "private-equity-summit",
    title: "Private Equity Summit",
    description:
      "Comprehensive conference focusing on private equity trends, value creation, and portfolio strategy.",
    image:
      "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?q=80&w=1600&auto=format&fit=crop",
    start: "2025-04-20T08:30:00",
    end: "2025-04-20T18:30:00",
    location: "Chicago, IL",
    topics: ["Private Equity", "In-Person"],
    attendees: 520,
    price: 1099,
    registration_url: "/signup",
  },
  {
    id: "financial-dd-intensive",
    title: "Financial Due Diligence Intensive",
    description:
      "Intensive training on financial due diligence processes and risk assessment for transactions.",
    image:
      "https://images.unsplash.com/photo-1518085250887-2f903c200fee?q=80&w=1600&auto=format&fit=crop",
    start: "2025-05-08T09:00:00",
    end: "2025-05-08T17:00:00",
    location: "Boston, MA",
    topics: ["Due Diligence", "In-Person"],
    attendees: 150,
    price: 799,
    registration_url: "/signup",
  },
  // extra to reach 12 for pagination demo
  {
    id: "cross-border-ma-bootcamp",
    title: "Cross-Border M&A Bootcamp",
    description:
      "Tactics for navigating regulatory environments and cultural challenges in cross-border deals.",
    image:
      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1600&auto=format&fit=crop",
    start: "2025-05-20T09:00:00",
    end: "2025-05-20T17:00:00",
    location: "Toronto, Canada",
    topics: ["Governance", "In-Person"],
    attendees: 180,
    price: 699,
    registration_url: "/signup",
  },
  {
    id: "integration-strategy-lab",
    title: "Post-Merger Integration Strategy Lab",
    description:
      "Hands-on lab for building integration roadmaps and tracking value creation.",
    image:
      "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=1600&auto=format&fit=crop",
    start: "2025-06-02T10:00:00",
    end: "2025-06-02T17:00:00",
    location: "Munich, Germany",
    topics: ["Integration", "Workshop"],
    attendees: 140,
    price: 549,
    registration_url: "/signup",
  },
  {
    id: "valuation-modeling-mastery",
    title: "Valuation & Modeling Mastery",
    description:
      "Practical DCF, comps, and LBO modeling patterns used by leading PE funds.",
    image:
      "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?q=80&w=1600&auto=format&fit=crop",
    start: "2025-06-15T09:30:00",
    end: "2025-06-15T18:00:00",
    location: "Austin, TX",
    topics: ["Valuation", "In-Person"],
    attendees: 260,
    price: 899,
    registration_url: "/signup",
  },
  {
    id: "legal-dd-workshop",
    title: "Legal Due Diligence Workshop",
    description:
      "Spot contractual red flags and mitigate exposure in complex transactions.",
    image:
      "https://images.unsplash.com/photo-1587620962725-abab7fe55159?q=80&w=1600&auto=format&fit=crop",
    start: "2025-07-01T09:00:00",
    end: "2025-07-01T16:00:00",
    location: "Remote",
    topics: ["Legal & Compliance", "Online"],
    attendees: 110,
    price: 349,
    registration_url: "/signup",
  },
  {
    id: "sell-side-readiness",
    title: "Sell-Side Readiness Clinic",
    description:
      "Prepare management teams, clean data rooms, and streamline the process for bidders.",
    image:
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1600&auto=format&fit=crop",
    start: "2025-07-10T11:00:00",
    end: "2025-07-10T17:30:00",
    location: "Dubai, UAE",
    topics: ["Process", "Hybrid"],
    attendees: 175,
    price: 599,
    registration_url: "/signup",
  },
  {
    id: "networking-evening-ma",
    title: "M&A Professionals Networking Evening",
    description:
      "Meet dealmakers from banks, funds, and corporates in a relaxed setting.",
    image:
      "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=1600&auto=format&fit=crop",
    start: "2025-07-22T18:30:00",
    end: "2025-07-22T21:30:00",
    location: "Bengaluru, India",
    topics: ["Networking", "In-Person"],
    attendees: 220,
    price: 99,
    registration_url: "/signup",
  },
  {
    id: "ai-ma-summit-2025",
    title: "AI & Mergers Summit 2025",
    description:
      "Explore the intersection of artificial intelligence and merger & acquisition strategy with top operators and coaches.",
    image:
      "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=1600&auto=format&fit=crop",
    start: "2025-03-15T09:00:00",
    end: "2025-03-15T17:00:00",
    location: "New York, NY",
    topics: ["M&A Strategy", "In-Person"],
    attendees: 450,
    price: 899,
    registration_url: "/signup",
  },
  {
    id: "global-ma-leaders-forum",
    title: "Global M&A Leaders Forum",
    description:
      "Connect with top M&A professionals and learn about the latest integration trends, governance, and cross-border tactics.",
    image:
      "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=1600&auto=format&fit=crop",
    start: "2025-03-22T10:00:00",
    end: "2025-03-22T18:00:00",
    location: "London, UK",
    topics: ["Leadership", "Hybrid"],
    attendees: 680,
    price: 1299,
    registration_url: "/signup",
  },
  {
    id: "corp-strategy-masterclass",
    title: "Corporate Strategy Masterclass",
    description:
      "Deep dive into advanced corporate strategy frameworks and their real-world implementation in M&A contexts.",
    image:
      "https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?q=80&w=1600&auto=format&fit=crop",
    start: "2025-04-05T14:00:00",
    end: "2025-04-05T20:00:00",
    location: "Singapore",
    topics: ["Strategy", "In-Person"],
    attendees: 200,
    price: 649,
    registration_url: "/signup",
  },
  {
    id: "deal-making-excellence",
    title: "Deal Making Excellence Workshop",
    description:
      "Master the art of successful deal negotiation and execution with hands-on case studies and expert guidance.",
    image:
      "https://images.unsplash.com/photo-1557425493-6f90ae4659fc?q=80&w=1600&auto=format&fit=crop",
    start: "2025-04-12T09:00:00",
    end: "2025-04-12T16:00:00",
    location: "Virtual",
    topics: ["Workshop", "Online"],
    attendees: 320,
    price: 399,
    registration_url: "/signup",
  },
  {
    id: "private-equity-summit",
    title: "Private Equity Summit",
    description:
      "Comprehensive conference focusing on private equity trends, value creation, and portfolio strategy.",
    image:
      "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?q=80&w=1600&auto=format&fit=crop",
    start: "2025-04-20T08:30:00",
    end: "2025-04-20T18:30:00",
    location: "Chicago, IL",
    topics: ["Private Equity", "In-Person"],
    attendees: 520,
    price: 1099,
    registration_url: "/signup",
  },
  {
    id: "financial-dd-intensive",
    title: "Financial Due Diligence Intensive",
    description:
      "Intensive training on financial due diligence processes and risk assessment for transactions.",
    image:
      "https://images.unsplash.com/photo-1518085250887-2f903c200fee?q=80&w=1600&auto=format&fit=crop",
    start: "2025-05-08T09:00:00",
    end: "2025-05-08T17:00:00",
    location: "Boston, MA",
    topics: ["Due Diligence", "In-Person"],
    attendees: 150,
    price: 799,
    registration_url: "/signup",
  },
  // extra to reach 12 for pagination demo
  {
    id: "cross-border-ma-bootcamp",
    title: "Cross-Border M&A Bootcamp",
    description:
      "Tactics for navigating regulatory environments and cultural challenges in cross-border deals.",
    image:
      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1600&auto=format&fit=crop",
    start: "2025-05-20T09:00:00",
    end: "2025-05-20T17:00:00",
    location: "Toronto, Canada",
    topics: ["Governance", "In-Person"],
    attendees: 180,
    price: 699,
    registration_url: "/signup",
  },
  {
    id: "integration-strategy-lab",
    title: "Post-Merger Integration Strategy Lab",
    description:
      "Hands-on lab for building integration roadmaps and tracking value creation.",
    image:
      "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=1600&auto=format&fit=crop",
    start: "2025-06-02T10:00:00",
    end: "2025-06-02T17:00:00",
    location: "Munich, Germany",
    topics: ["Integration", "Workshop"],
    attendees: 140,
    price: 549,
    registration_url: "/signup",
  },
  {
    id: "valuation-modeling-mastery",
    title: "Valuation & Modeling Mastery",
    description:
      "Practical DCF, comps, and LBO modeling patterns used by leading PE funds.",
    image:
      "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?q=80&w=1600&auto=format&fit=crop",
    start: "2025-06-15T09:30:00",
    end: "2025-06-15T18:00:00",
    location: "Austin, TX",
    topics: ["Valuation", "In-Person"],
    attendees: 260,
    price: 899,
    registration_url: "/signup",
  },
];

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
function truncate(text, n = 120) {
  if (!text) return "";
  return text.length > n ? text.slice(0, n - 1) + "…" : text;
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
  

  const pageCount = Math.max(1, Math.ceil(EVENTS.length / PAGE_SIZE));
  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return EVENTS.slice(start, start + PAGE_SIZE);
  }, [page]);

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
            />
          </div>

          <FormControl size="small">
            <Select
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
              <MenuItem value="">Date Range</MenuItem>
              <MenuItem value="this_week">This Week</MenuItem>
              <MenuItem value="this_month">This Month</MenuItem>
              <MenuItem value="next_90_days">Next 90 days</MenuItem> {/* ← unique */}
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
               <MenuItem value="">Topic/Industry</MenuItem>
               <MenuItem value="M&A Strategy">M&A Strategy</MenuItem>
               <MenuItem value="Leadership">Leadership</MenuItem>
               <MenuItem value="Private Equity">Private Equity</MenuItem>
               <MenuItem value="Due Diligence">Due Diligence</MenuItem>
               <MenuItem value="Strategy">Strategy</MenuItem>
               <MenuItem value="Workshop">Workshop</MenuItem>
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
               <MenuItem value="">Event Format</MenuItem>
               <MenuItem value="In-Person">In-Person</MenuItem>
               <MenuItem value="Virtual">Virtual</MenuItem>
               <MenuItem value="Hybrid">Hybrid</MenuItem>
               <MenuItem value="Workshop">Workshop</MenuItem>
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
                  <input
                    placeholder="dd-mm-yyyy"
                    className="w-full h-11 px-3 rounded-xl bg-white/10 border border-white/20 placeholder-white/70 outline-none mb-3"
                  />
                  <input
                    placeholder="dd-mm-yyyy"
                    className="w-full h-11 px-3 rounded-xl bg-white/10 border border-white/20 placeholder-white/70 outline-none"
                  />
                </div>

                {/* Location */}
                <div className="mb-5">
                  <div className="text-teal-300 font-semibold mb-2 flex items-center gap-2">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M12 22s7-7 7-11a7 7 0 1 0-14 0c0 4 7 11 7 11Z"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                      <circle cx="12" cy="11" r="2.5" stroke="currentColor" strokeWidth="2" />
                    </svg>
                    Location
                  </div>
                  <select className="w-full h-11 px-3 rounded-xl bg-white/10 border border-white/20 outline-none">
                    <option className="bg-white text-black">Select location</option>
                    <option className="bg-white text-black">New York, NY</option>
                    <option className="bg-white text-black">London, UK</option>
                    <option className="bg-white text-black">Singapore</option>
                  </select>
                </div>

                {/* Topic/Industry */}
                <div className="mb-6">
                  <div className="text-teal-300 font-semibold mb-2 flex items-center gap-2">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    Topic/Industry
                  </div>
                  <div className="space-y-3 text-white/90">
                    {[
                      "M&A Strategy",
                      "Due Diligence",
                      "Private Equity",
                      "Investment Banking",
                      "Corporate Finance",
                      "Legal & Compliance",
                    ].map((x) => (
                      <label key={x} className="flex items-center gap-3">
                        <input type="checkbox" className="h-4 w-4 rounded border-white/30 bg-transparent" />
                        <span>{x}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Event Format */}
                <div className="mb-6">
                  <div className="text-teal-300 font-semibold mb-2">Event Format</div>
                  <div className="space-y-3 text-white/90">
                    {["In-Person", "Virtual", "Hybrid", "Workshop", "Networking"].map((x) => (
                      <label key={x} className="flex items-center gap-3">
                        <input type="checkbox" className="h-4 w-4 rounded border-white/30 bg-transparent" />
                        <span>{x}</span>
                      </label>
                    ))}
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
                <p className="text-neutral-600 mt-1">{EVENTS.length} events found</p>
              </div>

              {view === "grid" ? (
                 <Grid container spacing={3}>
                   {pageItems.map((ev) => (
                     <Grid key={ev.id} size={{ xs: 12, md: 4 }}>
                       <EventCard ev={ev} />
                     </Grid>
                   ))}
                 </Grid>
               ) : (
                 <Grid container spacing={3} direction="column">
                   {pageItems.map((ev) => (
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
              <p className="text-neutral-600 mt-1">{EVENTS.length} events found</p>
            </div>

            {view === "grid" ? (
             <Grid container spacing={3}>
               {pageItems.map((ev) => (
                 <Grid key={ev.id} size={{ xs: 12, md: 4 }}>
                   <EventCard ev={ev} />
                 </Grid>
               ))}
             </Grid>
           ) : (
             <Grid container spacing={3} direction="column">
               {pageItems.map((ev) => (
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
