import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button, Alert, Snackbar } from "@mui/material";
import { Helmet } from "react-helmet-async";
import ApplyNowModal from "../components/ApplyNowModal";
import { isOwnerUser } from "../utils/adminRole.js";
import GuestJoinModal from "../components/GuestJoinModal.jsx";
import GuestApplyModal from "../components/GuestApplyModal.jsx";
import heroImg from "../assets/oxford/Oxford_Jesus-College.png";
import oxfordBgHero from "../assets/oxford/BG 1.png";
import oxfordBgSkyline from "../assets/oxford/BG 2.png";
import oxfordBgHighlights from "../assets/oxford/BG 3.png";
import receptionImg from "../assets/oxford/Oxford_Reception.png";
import dinnerImg from "../assets/oxford/Oxford_CollegeDinner_2.png";
import puntingImg from "../assets/oxford/Oxford_Punting.png";
import bbqImg from "../assets/oxford/Oxford_BBQ_2.png";
import jesuCollegeLogo from "../assets/oxford/Jesus_College_Crest_Logo.png";
import imaaLogo from "../assets/oxford/IMAA_Logo.svg";
import bancorLogo from "../assets/Bancor Gray Different file format/Bancor Gray Transparent BG.png";
import polskyLogo from "../assets/oxford/Polsky_logo_stacked_Color_RGB.png";
import "../styles/OxfordSymposium2026.css";

// Strategic partner artwork lives in assets/oxford/partners/. It is resolved through
// import.meta.glob rather than a static import so that a partner listed below whose
// artwork has not been committed yet degrades to "not shown" instead of failing the
// build. Drop the file in and it appears; no other change needed.
const partnerLogos = import.meta.glob(
  "../assets/oxford/partners/*.{png,jpg,jpeg,svg}",
  { eager: true, import: "default" }
);

const STRATEGIC_PARTNERS = [
  { name: "Global Group Corp.", file: "GGCI_Logo.png", logoHeight: 80 },
]
  .map((partner) => ({
    ...partner,
    logo: partnerLogos[`../assets/oxford/partners/${partner.file}`] || null,
  }))
  .filter((partner) => partner.logo);

// Design System
const C = {
  deepBlue: "#284D61",
  midBlue: "#37738D",
  brightBlue: "#159AC9",
  lightBlue: "#B9CED7",
  bgBlue1: "#D7E3E8",
  bgBlue2: "#E6EDF0",
  cool10: "#F0F4F5",
  cool20: "#D9DFE1",
  cool30: "#C7CDD0",
  cool50: "#93A6B0",
  cool60: "#5E7A88",
  cool80: "#3A4853",
  cool90: "#292F39",
  cool100: "#21262E",
  coral: "#F05843",
  green: "#76B82A",
  yellow: "#FED746",
  white: "#FFFFFF",
  oxfordGold: "#C9A84C",
};

const F = {
  body: "'Roboto', Arial, sans-serif",
  display: "'Roboto Slab', Georgia, serif",
};

// Mobile responsiveness hook
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" && window.innerWidth < breakpoint
  );
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [breakpoint]);
  return isMobile;
}

// Icon Components
const Ic = {
  mapPin: (color) => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  calendar: (color) => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  users: (color) => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  bulb: (color) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
      <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
  award: (color) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
      <circle cx="12" cy="8" r="7" />
      <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
    </svg>
  ),
  usersLarge: (color) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
};

// Helper Components
function Section({ bg, children, style, id }) {
  return (
    <section id={id} style={{ background: bg, ...style }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 40px" }}>
        {children}
      </div>
    </section>
  );
}

function FadeIn({ children, delay = 0 }) {
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay * 1000);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(24px)",
        transition: `all 0.7s cubic-bezier(0.22,1,0.36,1) ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

// Helper: Status display for application (shows badge or Join button)
function ApplyStatusDisplay({ status, eventData, onJoinClick, style, buttonSize = 'small' }) {
  if (!status || status === 'none') return null;

  const guestToken = typeof localStorage !== 'undefined' ? localStorage.getItem("guest_token") : null;

  // After approval - show Join Live button if guest_token exists
  if (status === 'approved') {
    if (guestToken && eventData?.slug) {
      // Check if event is live before showing Join Live button
      const isLive = eventData?.is_live || eventData?.status === 'live';

      if (isLive) {
        // User can join immediately with guest token
        return (
          <button
            onClick={onJoinClick}
            style={{
              fontSize: buttonSize === 'small' ? 13 : 14,
              fontWeight: 700,
              color: C.white,
              background: '#22c55e',
              padding: buttonSize === 'small' ? '6px 16px' : '12px 24px',
              border: 'none',
              borderRadius: 3,
              cursor: 'pointer',
              fontFamily: "'Roboto', Arial, sans-serif",
              ...style
            }}
          >
            Join Live
          </button>
        );
      } else {
        // Event not live yet
        return (
          <span style={{
            fontSize: buttonSize === 'small' ? 13 : 14, fontWeight: 700, color: '#F97316',
            border: '1px solid #F97316', borderRadius: 3,
            padding: buttonSize === 'small' ? '6px 16px' : '12px 24px',
            fontFamily: "'Roboto', Arial, sans-serif",
            ...style
          }}>Waiting for Event to Go Live</span>
        );
      }
    } else {
      // Approved but waiting for guest token or event data
      return (
        <span style={{
          fontSize: buttonSize === 'small' ? 13 : 14, fontWeight: 700, color: '#22c55e',
          border: '1px solid #22c55e', borderRadius: 3,
          padding: buttonSize === 'small' ? '6px 16px' : '12px 24px',
          fontFamily: "'Roboto', Arial, sans-serif",
          ...style
        }}>Approved ✓</span>
      );
    }
  }

  // Other statuses - just show badge
  const map = {
    pending: { label: 'Application Pending', color: '#F97316' },
    declined: { label: 'Application Declined', color: '#ef4444' },
  };
  const cfg = map[status];
  if (!cfg) return null;
  return (
    <span style={{
      fontSize: buttonSize === 'small' ? 13 : 14, fontWeight: 700, color: cfg.color,
      border: `1px solid ${cfg.color}`, borderRadius: 3,
      padding: buttonSize === 'small' ? '6px 16px' : '12px 24px',
      fontFamily: "'Roboto', Arial, sans-serif",
      ...style
    }}>{cfg.label}</span>
  );
}

// 1. HERO
function Hero({ onApplyClick, onJoinClick, eventData = {}, myApplication }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();

  // Format event data from API response
  const formatEventData = (data) => {
    if (!data || !data.start_time) return null;

    const startDate = new Date(data.start_time);
    const endDate = new Date(data.end_time || data.start_time);
    const eventTimezone = data.timezone || 'UTC';

    // Helper function to format date in event's timezone
    const getDateInTimezone = (date, timezone) => {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      const parts = formatter.formatToParts(date);
      const result = {};
      parts.forEach(({ type, value }) => {
        result[type] = value;
      });
      return {
        day: parseInt(result.day),
        month: parseInt(result.month),
        year: parseInt(result.year),
      };
    };

    // Format dates in event's timezone
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const startDateInTZ = getDateInTimezone(startDate, eventTimezone);
    const endDateInTZ = getDateInTimezone(endDate, eventTimezone);

    const startDay = startDateInTZ.day;
    const month = monthNames[startDateInTZ.month - 1];
    const year = startDateInTZ.year;

    // Get registration type badge
    const registrationTypeBadges = {
      'open': 'Open Registration',
      'apply': 'By Invitation & Application Only',
    };
    const badgeText = registrationTypeBadges[data.registration_type] || 'By Invitation & Application Only';

    // Format format string (e.g., "hybrid" -> "4 Days Hybrid")
    const formatMap = {
      'in_person': 'Onsite',
      'virtual': 'Virtual',
      'hybrid': 'Hybrid',
    };
    const formatLabel = formatMap[data.format] || data.format || 'Onsite';

    // Build location string without timezone (timezone shown in time)
    const buildLocationString = () => {
      const baseLocation = data.location_city || data.location || '';

      // For virtual events, show "Virtual live"
      if (data.format === 'virtual') {
        return 'Virtual live';
      }

      if (data.is_multi_day) {
        return `Onsite · ${baseLocation}`;
      } else {
        return `${formatLabel} · ${baseLocation}`;
      }
    };

    const locationStr = buildLocationString();

    // Calculate days if multi-day (in event timezone)
    const numDays = data.is_multi_day
      ? Math.abs(endDateInTZ.day - startDateInTZ.day) + 1
      : 1;

    // Format date display - for single day events show full date, for multi-day show date range
    const isSingleDay = numDays === 1;
    const startDateStr = isSingleDay
      ? `${month} ${startDay}, ${year}`
      : `${month} ${startDay}`;
    const endDateStr = isSingleDay
      ? ''
      : `${endDateInTZ.day}`;
    const yearDisplay = isSingleDay ? '' : year;

    // For multi-day events, show days count only
    const formatDisplay = numDays > 1 ? `${numDays} Days` : formatLabel;

    // Get cover image URL (handle both relative and absolute URLs)
    let coverImageUrl = data.cover_image || heroImg;
    if (coverImageUrl && !coverImageUrl.startsWith('http')) {
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      const apiOrigin = apiBase.replace(/\/api\/?$/, '');
      coverImageUrl = `${apiOrigin}${coverImageUrl}`;
    }

    return {
      title: data.title,
      subtitle: data.description?.split('\n')[0] || 'Event',
      description: data.description || '',
      venue_name: data.venue_name || 'Venue',
      venue_location: `${data.location_city || ''}${data.location_country ? ', ' + data.location_country : ''}`.trim(),
      start_date: startDateStr,
      end_date: endDateStr,
      year: yearDisplay,
      format: formatDisplay,
      location: locationStr,
      badge_text: badgeText,
      organizer_name: "IMAA INSTITUTE",
      organizer_abbreviation: "IM",
      hero_image: coverImageUrl,
    };
  };

  const {
    title = "The Oxford M&A Symposium 2026",
    subtitle = "Sustainable Value Creation in Times of Uncertainty",
    description = "Four days of rigorous dialogue among senior dealmakers, sovereign wealth principals, and strategic leaders - at the heart of Oxford.",
    venue_name = "Jesus College",
    venue_location = "Oxford University",
    start_date = "Sep 14",
    end_date = "17",
    year = "2026",
    format = "Onsite",
    location = "Onsite, Oxford",
    badge_text = "By Invitation & Application Only",
    organizer_name = "IMAA INSTITUTE",
    organizer_abbreviation = "IM",
    hero_image = heroImg,
  } = formatEventData(eventData) || {};

  const [ld, sLd] = useState(false);
  useEffect(() => {
    setTimeout(() => sLd(true), 300);
  }, []);

  const a = (d) => ({
    opacity: ld ? 1 : 0,
    transform: ld ? "translateY(0)" : "translateY(24px)",
    transition: `all 0.7s cubic-bezier(0.22,1,0.36,1) ${d}s`,
  });

  const handleSmoothScroll = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      {eventData && (
        <Helmet>
          <title>{eventData.title}</title>
          <meta property="og:title" content={eventData.title} />
          <meta property="og:description" content={(eventData.description || '').slice(0, 160)} />
          <meta property="og:image" content={hero_image} />
          <meta property="og:url" content={window.location.href} />
          <meta property="og:type" content="website" />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={eventData.title} />
          <meta name="twitter:image" content={hero_image} />
        </Helmet>
      )}
      <section style={{ background: C.deepBlue }}>
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "20px 40px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: `1px solid ${C.midBlue}40`,
          opacity: ld ? 1 : 0,
          transition: "opacity 0.7s ease 0.2s",
          width: "100%",
        }}
      >
        {/* Logo - Always Left */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 3,
              background: C.coral,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ color: C.white, fontSize: 10, fontWeight: 700, fontFamily: F.body }}>
              {organizer_abbreviation}
            </span>
          </div>
          <span
            style={{
              color: C.white,
              fontSize: 13,
              fontWeight: 500,
              fontFamily: F.body,
              letterSpacing: "0.06em",
            }}
          >
            {organizer_name}
          </span>
        </div>

        {/* Spacer - grows to push nav/hamburger right */}
        <div style={{ flex: 1 }} />

        {/* Desktop Nav */}
        {!isMobile && (
          <div style={{ display: "flex", gap: 28, alignItems: "center" }}>
            {["Themes", "Experience", "Programme"].map((i) => (
              <a
                key={i}
                href={`#${i.toLowerCase()}`}
                onClick={(e) => {
                  e.preventDefault();
                  handleSmoothScroll(i.toLowerCase());
                }}
                style={{
                  fontSize: 12,
                  color: C.lightBlue,
                  fontWeight: 500,
                  cursor: "pointer",
                  textDecoration: "none",
                  fontFamily: F.body,
                }}
              >
                {i}
              </a>
            ))}
            {!myApplication || myApplication.status === 'none' ? (
              <button
                onClick={onApplyClick}
                style={{
                  fontSize: 12,
                  color: C.white,
                  fontWeight: 700,
                  background: C.coral,
                  padding: "6px 16px",
                  border: "none",
                  borderRadius: 3,
                  cursor: "pointer",
                  fontFamily: F.body,
                }}
              >
                Apply
              </button>
            ) : (
              <ApplyStatusDisplay status={myApplication.status} eventData={eventData} onJoinClick={onJoinClick} buttonSize="small" />
            )}
          </div>
        )}

        {/* Mobile Hamburger Menu - Always Right */}
        {isMobile && (
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 8,
              display: "flex",
              flexDirection: "column",
              gap: 6,
              minHeight: 32,
              minWidth: 32,
              justifyContent: "center",
              alignItems: "center",
              flexShrink: 0,
            }}
            aria-label="Toggle menu"
          >
            <div style={{ width: 24, height: 2.5, background: C.white, borderRadius: 1.5 }} />
            <div style={{ width: 24, height: 2.5, background: C.white, borderRadius: 1.5 }} />
            <div style={{ width: 24, height: 2.5, background: C.white, borderRadius: 1.5 }} />
          </button>
        )}
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobile && mobileMenuOpen && (
        <div style={{ background: C.midBlue, padding: "12px 20px", borderTop: `1px solid ${C.midBlue}40` }}>
          {["Themes", "Experience", "Programme"].map((i) => (
            <a
              key={i}
              href={`#${i.toLowerCase()}`}
              onClick={(e) => {
                e.preventDefault();
                handleSmoothScroll(i.toLowerCase());
                setMobileMenuOpen(false);
              }}
              style={{
                display: "block",
                fontSize: 14,
                color: C.lightBlue,
                fontWeight: 500,
                cursor: "pointer",
                textDecoration: "none",
                fontFamily: F.body,
                padding: "10px 0",
                borderBottom: `1px solid ${C.midBlue}40`,
              }}
            >
              {i}
            </a>
          ))}
          <div style={{ paddingTop: 12 }}>
            {!myApplication || myApplication.status === 'none' ? (
              <button
                onClick={() => {
                  onApplyClick();
                  setMobileMenuOpen(false);
                }}
                style={{
                  width: "100%",
                  fontSize: 14,
                  color: C.white,
                  fontWeight: 700,
                  background: C.coral,
                  padding: "12px 16px",
                  border: "none",
                  borderRadius: 3,
                  cursor: "pointer",
                  fontFamily: F.body,
                }}
              >
                Apply
              </button>
            ) : (
              <ApplyStatusDisplay status={myApplication.status} eventData={eventData} onJoinClick={onJoinClick} buttonSize="small" style={{ width: "100%" }} />
            )}
          </div>
        </div>
      )}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "52px 40px 72px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "center" }}>
          <div>
            <div
              style={{
                ...a(0.4),
                display: "inline-block",
                padding: "5px 12px",
                borderRadius: 3,
                background: `${C.oxfordGold}22`,
                marginBottom: 24,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: C.oxfordGold,
                  fontFamily: F.body,
                }}
              >
                {badge_text}
              </span>
            </div>
            <h1
              style={{
                fontFamily: F.display,
                fontSize: 42,
                fontWeight: 700,
                lineHeight: 1.15,
                color: C.white,
                margin: "0 0 16px",
                ...a(0.5),
              }}
            >
              {title}
            </h1>
            <p
              style={{
                fontFamily: F.display,
                fontSize: 22,
                lineHeight: 1.5,
                color: C.lightBlue,
                fontWeight: 300,
                margin: "0 0 8px",
                ...a(0.6),
              }}
            >
              {subtitle}
            </p>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", ...a(0.85) }}>
              {!myApplication || myApplication.status === 'none' ? (
                <button
                  onClick={onApplyClick}
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: C.deepBlue,
                    background: C.white,
                    padding: "14px 36px",
                    border: "none",
                    borderRadius: 3,
                    cursor: "pointer",
                    fontFamily: F.body,
                  }}
                >
                  Apply
                </button>
              ) : (
                <ApplyStatusDisplay status={myApplication.status} eventData={eventData} onJoinClick={onJoinClick} buttonSize="large" />
              )}
              <button
                onClick={() => handleSmoothScroll("themes")}
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: C.white,
                  background: "transparent",
                  border: "2px solid rgba(255,255,255,0.3)",
                  padding: "12px 36px",
                  borderRadius: 3,
                  cursor: "pointer",
                  fontFamily: F.body,
                }}
              >
                Explore Themes
              </button>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, ...a(0.7) }}>
            {hero_image && eventData.format !== 'virtual' && (
              <div style={{ height: 200, borderRadius: 4, position: "relative", overflow: "hidden" }}>
                <img
                  src={hero_image}
                  alt={venue_name}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: "center 40%",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(to top, rgba(40,77,97,0.88) 0%, rgba(40,77,97,0.3) 55%, transparent 100%)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end",
                    padding: 20,
                    zIndex: 1,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    {Ic.mapPin(C.lightBlue)}
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        color: C.lightBlue,
                        fontFamily: F.body,
                      }}
                    >
                      Venue
                    </span>
                  </div>
                  <div style={{ fontFamily: F.display, fontSize: 22, fontWeight: 700, color: C.white, lineHeight: 1.2 }}>
                    {venue_name}
                  </div>
                  <div style={{ fontFamily: F.body, fontSize: 13, color: C.lightBlue, marginTop: 2 }}>
                    {venue_location}
                  </div>
                </div>
              </div>
            )}
            {hero_image && eventData.format === 'virtual' && (
              <div style={{ height: 200, borderRadius: 4, position: "relative", overflow: "hidden" }}>
                <img
                  src={hero_image}
                  alt="Event banner"
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: "center",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(to top, rgba(40,77,97,0.88) 0%, rgba(40,77,97,0.3) 55%, transparent 100%)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end",
                    padding: 20,
                    zIndex: 1,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    {Ic.users(C.lightBlue)}
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        color: C.lightBlue,
                        fontFamily: F.body,
                      }}
                    >
                      Venue
                    </span>
                  </div>
                  <div style={{ fontFamily: F.display, fontSize: 22, fontWeight: 700, color: C.white, lineHeight: 1.2 }}>
                    {venue_name}
                  </div>
                  <div style={{ fontFamily: F.body, fontSize: 13, color: C.lightBlue, marginTop: 2 }}>
                    Virtual live
                  </div>
                </div>
              </div>
            )}
            {!hero_image && eventData.format === 'virtual' && (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  {Ic.users(C.lightBlue)}
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: C.lightBlue,
                      fontFamily: F.body,
                    }}
                  >
                    Venue
                  </span>
                </div>
                <div style={{ fontFamily: F.display, fontSize: 22, fontWeight: 700, color: C.white }}>
                  Virtual live
                </div>
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div
                style={{
                  padding: "16px 18px",
                  background: C.midBlue,
                  borderRadius: 4,
                  borderLeft: `3px solid ${C.coral}`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  {Ic.calendar(C.lightBlue)}
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: C.lightBlue,
                      fontFamily: F.body,
                    }}
                  >
                    Dates
                  </span>
                </div>
                <div style={{ fontFamily: F.display, fontSize: 17, fontWeight: 700, color: C.white }}>
                  {end_date ? `${start_date} - ${end_date}` : start_date}
                </div>
                {year && (
                  <div style={{ fontSize: 12, color: C.lightBlue, fontFamily: F.body, marginTop: 2 }}>
                    {year}
                  </div>
                )}
              </div>
              <div
                style={{
                  padding: "16px 18px",
                  background: C.midBlue,
                  borderRadius: 4,
                  borderLeft: `3px solid ${C.brightBlue}`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  {Ic.users(C.lightBlue)}
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: C.lightBlue,
                      fontFamily: F.body,
                    }}
                  >
                    Format
                  </span>
                </div>
                <div style={{ fontFamily: F.display, fontSize: 17, fontWeight: 700, color: C.white }}>
                  {format}
                </div>
                <div style={{ fontSize: 12, color: C.lightBlue, fontFamily: F.body, marginTop: 2 }}>
                  {location}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
    </>
  );
}

// 2. POSITIONING
function PositioningStatement() {
  return (
    <Section bg={C.cool10} style={{ padding: "64px 0" }} id="positioning">
      <FadeIn>
        <p
          style={{
            fontSize: 24,
            lineHeight: 1.7,
            color: C.cool80,
            fontFamily: F.display,
            fontWeight: 300,
            maxWidth: 860,
          }}
        >
          You <span style={{ fontWeight: 700, color: C.deepBlue }}>shape</span> the Symposium, and it{" "}
          <span style={{ fontWeight: 700, color: C.deepBlue }}>shapes you</span>. In the sessions, over dinner, and in
          every conversation between.
        </p>
      </FadeIn>
    </Section>
  );
}

// 3. SPEAKERS & HOSTS
function Speakers({ eventData = {} }) {
  const [offset, setOffset] = useState(0);
  const [activeBio, setActiveBio] = useState(null);
  const isMobile = useIsMobile();

  // Truncate text to 5 words max with "..." if longer
  const truncateToFiveWords = (text) => {
    if (!text) return '';
    const words = text.split(' ');
    if (words.length > 5) {
      return words.slice(0, 5).join(' ') + '...';
    }
    return text;
  };

  // Transform API featured_participants data to component format
  const transformParticipants = (apiParticipants) => {
    if (!apiParticipants || !Array.isArray(apiParticipants)) return [];

    return apiParticipants.map((participant) => {
      // Generate initials from display_name
      const initials = participant.display_name
        ?.split(' ')
        .slice(0, 2)
        .map((word) => word[0])
        .join('')
        .toUpperCase() || '?';

      // Extract professional info (job_title from profile or bio text)
      const professionalInfo = participant.professional_info?.split('\n')[0] || participant.participant_type_label || '';
      // For expanded view, use bio field if available, otherwise fallback to professional_info
      const bioText = participant.bio || participant.professional_info || '';

      return {
        name: participant.display_name || 'Participant',
        role: participant.role_label || '', // Role label (Speaker, Host, Moderator, etc.)
        org: professionalInfo, // Professional info / experience from job_title or bio
        initials,
        bio: bioText, // Full info for bio panel
        image: participant.avatar_url,
      };
    });
  };

  const speakers = transformParticipants(eventData.featured_participants);

  // Debug: log featured participants
  useEffect(() => {
    console.log('Featured participants from API:', eventData.featured_participants);
    console.log('Transformed speakers:', speakers);
  }, [eventData.featured_participants, speakers]);

  // Hide section if no speakers
  if (!speakers || speakers.length === 0) {
    return null;
  }

  const visible = isMobile ? 1 : 3;
  const maxOffset = speakers.length - visible;
  const canPrev = offset > 0;
  const canNext = offset < maxOffset;

  return (
    <Section bg={C.white} style={{ padding: "64px 0" }} id="speakers">
      <FadeIn>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 2,
                  background: C.brightBlue,
                }}
              />
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: C.brightBlue,
                  fontFamily: F.body,
                }}
              >
                Speakers & Panellists
              </div>
            </div>
            <h3
              style={{
                fontSize: 36,
                fontWeight: 700,
                color: C.deepBlue,
                fontFamily: F.display,
                margin: 0,
                lineHeight: 1.25,
              }}
            >
              Selected to challenge, not to confirm.
            </h3>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setOffset(Math.max(0, offset - 1))}
              disabled={!canPrev}
              style={{
                width: isMobile ? 44 : 32,
                height: isMobile ? 44 : 32,
                borderRadius: 4,
                border: `1px solid ${canPrev ? C.cool20 : C.cool10}`,
                background: canPrev ? C.white : C.cool10,
                cursor: canPrev ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s",
              }}
              aria-label="Previous speaker"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke={canPrev ? C.cool60 : C.cool30}
                strokeWidth="2"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              onClick={() => setOffset(Math.min(maxOffset, offset + 1))}
              disabled={!canNext}
              style={{
                width: isMobile ? 44 : 32,
                height: isMobile ? 44 : 32,
                borderRadius: 4,
                border: `1px solid ${canNext ? C.cool20 : C.cool10}`,
                background: canNext ? C.white : C.cool10,
                cursor: canNext ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s",
              }}
              aria-label="Next speaker"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke={canNext ? C.cool60 : C.cool30}
                strokeWidth="2"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>
        <p
          style={{
            fontSize: 15,
            color: C.cool60,
            lineHeight: 1.7,
            marginBottom: 8,
            maxWidth: 640,
            fontFamily: F.body,
          }}
        >
          Speakers provoke, challenge, and frame. So does every participant - each bringing experience, conviction, and perspective. That is where insight is created that cannot be found anywhere else.
        </p>
        <p style={{ fontSize: 12, color: C.cool50, marginBottom: 28, fontFamily: F.body, fontStyle: "italic" }}>
          A selection from a growing list of confirmed speakers and panellists.
        </p>
      </FadeIn>
      <div style={{ overflow: "hidden" }}>
        <div
          style={{
            display: "flex",
            gap: 12,
            transform: `translateX(-${offset * (100 / visible + 1.2)}%)`,
            transition: "transform 0.45s cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          {speakers.map((s, i) => (
            <div
              key={i}
              onClick={() => s.bio && setActiveBio(activeBio === i ? null : i)}
              style={{
                minWidth: `calc(${100 / visible}% - 8px)`,
                background: C.cool10,
                border: `1px solid ${activeBio === i ? C.brightBlue : C.cool20}`,
                borderRadius: 4,
                padding: "24px 20px",
                flexShrink: 0,
                cursor: s.bio ? "pointer" : "default",
                transition: "border-color 0.3s",
              }}
            >
              {s.image ? (
                <img
                  src={s.image}
                  alt={s.name}
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: "50%",
                    marginBottom: 14,
                    objectFit: "cover",
                    filter: "grayscale(100%)",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 52,
                    height: 52,
                    marginBottom: 14,
                  }}
                />
              )}
              <div style={{ fontFamily: F.display, fontSize: 16, fontWeight: 700, color: C.deepBlue, lineHeight: 1.25, marginBottom: 4 }}>
                {s.name}
              </div>
              <div style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.cool80, marginBottom: 10 }}>
                {truncateToFiveWords(s.org)}
              </div>
              {(s.bio || s.role) && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    {s.bio && (
                      <span style={{ fontSize: 10, fontWeight: 600, color: C.brightBlue, fontFamily: F.body }}>
                        {activeBio === i ? "Close" : "View bio"} →
                      </span>
                    )}
                  </div>
                  {s.role && (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "4px 10px",
                        borderRadius: 999,
                        background: C.bgBlue2,
                        border: `1px solid ${C.cool20}`,
                        fontFamily: F.body,
                        fontSize: 11,
                        fontWeight: 700,
                        color: C.deepBlue,
                        lineHeight: 1,
                        whiteSpace: "nowrap",
                        marginLeft: "auto",
                      }}
                    >
                      {s.role}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      {activeBio !== null && speakers[activeBio].bio && (
        <div
          style={{
            marginTop: 16,
            padding: "24px 28px",
            background: C.white,
            border: `1px solid ${C.cool20}`,
            borderRadius: 4,
            borderLeft: `3px solid ${C.brightBlue}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            {speakers[activeBio].image ? (
              <img
                src={speakers[activeBio].image}
                alt={speakers[activeBio].name}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  objectFit: "cover",
                  filter: "grayscale(100%)",
                }}
              />
            ) : (
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${C.deepBlue}, ${C.midBlue})`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  filter: "grayscale(100%)",
                }}
              >
                <span style={{ fontFamily: F.body, fontSize: 12, fontWeight: 700, color: C.white }}>
                  {speakers[activeBio].initials}
                </span>
              </div>
            )}
            <div>
              <div style={{ fontFamily: F.display, fontSize: 17, fontWeight: 700, color: C.deepBlue }}>
                {speakers[activeBio].name}
              </div>
              <div style={{ fontFamily: F.body, fontSize: 12, color: C.cool60 }}>
                {speakers[activeBio].role}
                {speakers[activeBio].role && " · "}
                {speakers[activeBio].org}
              </div>
            </div>
          </div>
          <p style={{ fontFamily: F.body, fontSize: 14, color: C.cool60, lineHeight: 1.7, margin: 0 }}>
            {speakers[activeBio].bio}
          </p>
        </div>
      )}
    </Section>
  );
}

// ThemeToggle Component
function ThemeToggle({ num, title, desc, isOpen, onToggle, isFirst }) {
  return (
    <div
      style={{
        borderTop: isFirst ? `1px solid ${C.cool20}` : "none",
        borderBottom: `1px solid ${C.cool20}`,
      }}
    >
      <button
        onClick={onToggle}
        style={{
          display: "grid",
          gridTemplateColumns: "56px 1fr 28px",
          gap: 20,
          alignItems: "center",
          padding: "22px 0",
          width: "100%",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 4,
            background: isOpen ? C.deepBlue : C.cool10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.3s",
          }}
        >
          <span
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: isOpen ? C.white : C.deepBlue,
              fontFamily: F.display,
              transition: "color 0.3s",
            }}
          >
            {num}
          </span>
        </div>
        <div
          style={{
            fontFamily: F.display,
            fontSize: 20,
            fontWeight: 700,
            color: C.deepBlue,
            lineHeight: 1.3,
          }}
        >
          {title}
        </div>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke={isOpen ? C.coral : C.cool50}
          strokeWidth="2"
          style={{
            transition: "transform 0.3s, stroke 0.3s",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <div
        style={{
          maxHeight: isOpen ? 200 : 0,
          overflow: "hidden",
          transition: "max-height 0.4s cubic-bezier(0.22,1,0.36,1), opacity 0.3s",
          opacity: isOpen ? 1 : 0,
        }}
      >
        <div style={{ paddingLeft: 76, paddingBottom: 24 }}>
          <p
            style={{
              fontFamily: F.body,
              fontSize: 14,
              color: C.cool60,
              lineHeight: 1.7,
              margin: 0,
              maxWidth: 640,
            }}
          >
            {desc}
          </p>
        </div>
      </div>
    </div>
  );
}

// 4. THEMES
function Themes() {
  const [openTheme, setOpenTheme] = useState(0);
  const themes = [
    {
      num: "I",
      title: "The New Energy Order Rewired",
      desc: "Global energy markets face their greatest stress test in a generation: oil prices swinging, strategic reserves being tapped into, AI-driven demand soaring - the rules of energy investment are being rewritten.",
    },
    {
      num: "II",
      title: "Defence Capital Paving the Way to a New Security Architecture",
      desc: "Defence spending is surging, venture capital is flooding into the sector, boundaries between civilian and defence industries are blurring - raising the fundamental question about who builds, who funds, and who leads.",
    },
    {
      num: "III",
      title: "AI and the Race for Digital Sovereignty",
      desc: "A handful of companies are deploying vast amounts of capital into AI, regulatory frameworks are diverging, and governments are asserting control over data. The race for technological dominance is no longer just corporate - it is sovereign.",
    },
    {
      num: "IV",
      title: "The New Frontiers of Impact Investment",
      desc: "Post-conflict reconstruction, food security under stress, water scarcity accelerating - this will be the defining moment for the next generation of impact investment. Can private capital move from the sidelines to the centre of the pitch?",
    },
    {
      num: "V",
      title: "Supply Chains Unchained",
      desc: "For decades, the invisible hand fuelled the steady growth of globalisation. Now visible hands are dismantling it - through protective tariffs, export controls, and the race for critical resources. What is a global supply chain worth when the chain itself is the risk?",
    },
  ];

  return (
    <Section bg={C.white} style={{ padding: "64px 0" }} id="themes">
      <FadeIn>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              width: 40,
              height: 2,
              background: C.brightBlue,
            }}
          />
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: C.brightBlue,
              fontFamily: F.body,
            }}
          >
            What We Will Explore
          </div>
        </div>
        <h3
          style={{
            fontSize: 36,
            fontWeight: 700,
            color: C.deepBlue,
            fontFamily: F.display,
            margin: "0 0 12px",
            lineHeight: 1.25,
          }}
        >
          The Questions That Matter
        </h3>
        <p
          style={{
            fontFamily: F.body,
            fontSize: 16,
            color: C.cool60,
            lineHeight: 1.75,
            margin: "0 0 32px",
            maxWidth: 680,
          }}
        >
          The Symposium is built around the strategic tensions that currently define how capital is deployed, how deals are shaped and structured, and how value is redefined.
        </p>
      </FadeIn>
      {themes.map((t, i) => (
        <FadeIn key={i} delay={i * 0.06}>
          <ThemeToggle
            {...t}
            isOpen={openTheme === i}
            onToggle={() => setOpenTheme(openTheme === i ? -1 : i)}
            isFirst={i === 0}
          />
        </FadeIn>
      ))}
    </Section>
  );
}

// 5. OXFORD EXPERIENCE
// 6. MORE THAN SESSIONS
function MoreThanSessions() {
  const [sel, setSel] = useState(0);
  const isMobile = useIsMobile();
  const items = [
    {
      icon: Ic.bulb,
      title: "Meet the Innovators",
      desc: "Selected start-ups and researchers presenting their research and investment opportunities. These are not polished pitches, but substantive work-in-progress. Gain early visibility into emerging opportunities you would not encounter through conventional deal flow, and presenters receive the calibre of feedback that no accelerator can offer.",
    },
    {
      icon: Ic.award,
      title: "Professional Development",
      desc: "Focused executive sessions by IMAA for those who wish to deepen their insights in M&A governance, leadership, and standards. Sessions are case-anchored and practitioner-led. Those who wish to continue may pursue a recognised professional credential by IMAA. Building knowledge and insights beyond the Symposium.",
    },
    {
      icon: Ic.usersLarge,
      title: "Connections That Last",
      desc: "Beyond the sessions, breaks, and evening events, a dedicated space is available for bilateral conversations and for spontaneous exchange. The Symposium is designed so that the right people find each other - by architecture, not by accident.",
    },
  ];
  const item = items[sel];

  return (
    <Section bg={C.cool10} style={{ padding: "64px 0" }} id="more-than-sessions">
      <FadeIn>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              width: 40,
              height: 2,
              background: C.brightBlue,
            }}
          />
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: C.brightBlue,
              fontFamily: F.body,
            }}
          >
            Beyond the Programme
          </div>
        </div>
        <h3 style={{ fontSize: 36, fontWeight: 700, color: C.deepBlue, fontFamily: F.display, margin: "0 0 12px", lineHeight: 1.25 }}>More Than Sessions</h3>
      </FadeIn>
      <FadeIn delay={0.1}>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 10, marginBottom: 12 }}>
          {items.map((it, i) => (
            <button
              key={i}
              onClick={() => setSel(i)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: isMobile ? "16px 14px" : "14px 18px",
                background: sel === i ? C.deepBlue : C.white,
                border: `1px solid ${sel === i ? C.deepBlue : C.cool20}`,
                borderRadius: 4,
                cursor: "pointer",
                transition: "all 0.3s",
                minHeight: isMobile ? 44 : "auto",
              }}
              aria-label={it.title}
            >
              {it.icon(sel === i ? C.white : C.cool50)}
              <span
                style={{
                  fontFamily: F.body,
                  fontSize: 13,
                  fontWeight: 700,
                  color: sel === i ? C.white : C.deepBlue,
                  transition: "color 0.3s",
                }}
              >
                {it.title}
              </span>
            </button>
          ))}
        </div>
      </FadeIn>
      <FadeIn delay={0.15}>
        <div
          style={{
            padding: "28px 28px",
            background: C.white,
            border: `1px solid ${C.cool20}`,
            borderRadius: 4,
            borderLeft: `3px solid ${C.brightBlue}`,
            minHeight: 200,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 4,
                background: `${C.brightBlue}10`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {item.icon(C.brightBlue)}
            </div>
            <div style={{ fontFamily: F.display, fontSize: 20, fontWeight: 700, color: C.deepBlue }}>{item.title}</div>
          </div>
          <p style={{ fontFamily: F.body, fontSize: 14, color: C.cool60, lineHeight: 1.7, margin: 0, maxWidth: 640 }}>{item.desc}</p>
        </div>
      </FadeIn>
    </Section>
  );
}

// 7. PROGRAMME SCHEDULE
function Programme() {
  const isMobile = useIsMobile();
  const days = [
    {
      day: "Monday",
      date: "Sep 14",
      sessions: ["1 pm - 5 pm  Sessions"],
      evening: "Welcome Reception",
      accent: C.coral,
    },
    {
      day: "Tuesday",
      date: "Sep 15",
      sessions: ["9 am - 12 pm  Sessions", "1 pm - 5 pm  Sessions"],
      evening: "College Dinner",
      accent: C.oxfordGold,
    },
    {
      day: "Wednesday",
      date: "Sep 16",
      sessions: ["9 am - 12 pm  Sessions", "1 pm - 5 pm  Sessions"],
      evening: "Punting",
      accent: C.green,
    },
    {
      day: "Thursday",
      date: "Sep 17",
      sessions: ["9 am - 12 pm  Sessions", "1 pm - 5 pm  Sessions"],
      evening: "BBQ Dinner",
      accent: C.brightBlue,
    },
  ];

  return (
    <Section bg={C.cool10} style={{ padding: "80px 0" }} id="programme">
      <FadeIn>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              width: 40,
              height: 2,
              background: C.brightBlue,
            }}
          />
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: C.brightBlue,
              fontFamily: F.body,
            }}
          >
            At a Glance
          </div>
        </div>
        <h3
          style={{
            fontSize: 42,
            fontWeight: 700,
            color: C.deepBlue,
            fontFamily: F.display,
            margin: "0 0 36px",
            lineHeight: 1.25,
          }}
        >
          Four days, one trajectory.
        </h3>
      </FadeIn>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(4, 1fr)",
          gap: 12,
          marginTop: 20,
          alignItems: "stretch",
        }}
      >
        {days.map((d, i) => (
          <FadeIn key={i} delay={i * 0.08} style={{ height: "100%" }}>
            <div
              style={{
                background: C.white,
                border: `1px solid ${C.cool20}`,
                borderRadius: 4,
                padding: "22px 20px",
                borderTop: `3px solid ${d.accent}`,
                height: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  fontFamily: F.display,
                  fontSize: 20,
                  fontWeight: 700,
                  color: C.deepBlue,
                }}
              >
                {d.day}
              </div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: C.cool50,
                  fontFamily: F.body,
                  marginBottom: 16,
                  paddingBottom: 14,
                  borderBottom: `1px solid ${C.cool20}`,
                }}
              >
                {d.date}
              </div>
              <div style={{ flex: 1 }}>
                {d.sessions.map((s, j) => (
                  <div
                    key={j}
                    style={{
                      fontFamily: F.body,
                      fontSize: 13,
                      color: C.cool60,
                      lineHeight: 2,
                    }}
                  >
                    {s}
                  </div>
                ))}
              </div>
              <div
                style={{
                  marginTop: 12,
                  paddingTop: 12,
                  borderTop: `1px solid ${C.cool20}`,
                }}
              >
                <div
                  style={{
                    fontFamily: F.display,
                    fontSize: 14,
                    fontWeight: 600,
                    color: C.deepBlue,
                    fontStyle: "italic",
                  }}
                >
                  {d.evening}
                </div>
              </div>
            </div>
          </FadeIn>
        ))}
      </div>
    </Section>
  );
}

// 8. OXFORD EXPERIENCE - EVENING CARD COMPONENT
function EveningCard({ ev, img }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 6,
        overflow: "hidden",
        position: "relative",
        minHeight: 480,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        border: `3px solid ${ev.accent}`,
        cursor: "default",
      }}
    >
      <img
        src={img}
        alt={ev.title}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transition: "transform 0.6s cubic-bezier(0.22,1,0.36,1)",
          transform: hovered ? "scale(1.04)" : "scale(1)",
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: hovered
            ? "linear-gradient(to top, rgba(20,26,38,0.92) 0%, rgba(20,26,38,0.6) 55%, rgba(20,26,38,0.15) 100%)"
            : "linear-gradient(to top, rgba(20,26,38,0.85) 0%, rgba(20,26,38,0.2) 35%, transparent 60%)",
          transition: "background 0.4s ease",
          zIndex: 1,
        }}
      />
      <div style={{ position: "relative", padding: "28px 20px", zIndex: 2 }}>
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: ev.accent,
            fontFamily: F.body,
            marginBottom: 8,
            display: "block",
          }}
        >
          {ev.day}
        </span>
        <div
          style={{
            fontFamily: F.display,
            fontSize: 20,
            fontWeight: 700,
            color: C.white,
            lineHeight: 1.25,
            marginBottom: hovered ? 8 : 0,
            transition: "margin 0.3s ease",
          }}
        >
          {ev.title}
        </div>
        <div
          style={{
            maxHeight: hovered ? 120 : 0,
            opacity: hovered ? 1 : 0,
            overflow: "hidden",
            transition: "max-height 0.4s cubic-bezier(0.22,1,0.36,1), opacity 0.3s ease",
          }}
        >
          <p
            style={{
              fontFamily: F.body,
              fontSize: 12,
              color: C.lightBlue,
              lineHeight: 1.65,
              margin: 0,
            }}
          >
            {ev.desc}
          </p>
        </div>
      </div>
    </div>
  );
}

// 8. OXFORD EXPERIENCE
function OxfordExperience() {
  const isMobile = useIsMobile();
  const evenings = [
    {
      day: "Monday",
      title: "Welcome Reception",
      desc: "A reception to close the first day. No formalities beyond a brief welcome. Informal, unhurried, and shaped by the inspiration that the first day's sessions have set in motion.",
      accent: C.coral,
      img: receptionImg,
    },
    {
      day: "Tuesday",
      title: "College Dinner",
      desc: "A black-tie dinner in the Great Hall of Jesus College, conducted in the Oxford tradition. An evening that belongs to the room that is forming around you.",
      accent: C.oxfordGold,
      img: dinnerImg,
    },
    {
      day: "Wednesday",
      title: "Punting",
      desc: "An optional early evening on the Cherwell by punt. No prior punting ability required. Quintessentially Oxford.",
      accent: C.green,
      img: puntingImg,
    },
    {
      day: "Thursday",
      title: "BBQ Dinner",
      desc: "The final evening. By Thursday, the programme ends. The conversations do not.",
      accent: C.brightBlue,
      img: bbqImg,
    },
  ];

  return (
    <Section bg={C.white} style={{ padding: "80px 0" }} id="evenings">
      <FadeIn>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              width: 40,
              height: 2,
              background: C.brightBlue,
            }}
          />
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: C.brightBlue,
              fontFamily: F.body,
            }}
          >
            The Oxford Experience
          </div>
        </div>
        <h3
          style={{
            fontSize: 42,
            fontWeight: 700,
            color: C.deepBlue,
            fontFamily: F.display,
            margin: "0 0 36px",
            lineHeight: 1.25,
          }}
        >
          Not every important conversation happens in a room.
        </h3>
      </FadeIn>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(4, 1fr)",
          gap: 12,
          marginTop: 20,
        }}
      >
        {evenings.map((ev, i) => (
          <FadeIn key={i} delay={i * 0.08}>
            <EveningCard ev={ev} img={ev.img} />
          </FadeIn>
        ))}
      </div>
    </Section>
  );
}

// 9. ABOUT - ORGANISED IN PARTNERSHIP
function About() {
  return (
    <Section bg={C.white} style={{ padding: "64px 0" }} id="about">
      <FadeIn>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              width: 40,
              height: 2,
              background: C.brightBlue,
            }}
          />
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: C.brightBlue,
              fontFamily: F.body,
            }}
          >
            About the Symposium
          </div>
        </div>
        <h3 style={{ fontSize: 36, fontWeight: 700, color: C.deepBlue, fontFamily: F.display, margin: "0 0 12px", lineHeight: 1.25 }}>Organised in Partnership</h3>
        <p style={{ fontFamily: F.body, fontSize: 15, lineHeight: 1.7, color: C.cool60, margin: "0 0 36px", maxWidth: 700 }}>Organised in partnership by Jesus College at Oxford University with the Institute for Mergers, Acquisitions and Alliances (IMAA) and Bancor International Limited, the Symposium brings together senior dealmakers, sovereign wealth principals, defence and technology leaders, corporate strategists, and leading international academic faculty for four days of rigorous dialogue, case discussions, and high-level peer exchange culminating in a College Dinner.</p>
      </FadeIn>
      <FadeIn delay={0.1}>
        <div id="partners" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 48 }}>
          {[
            { name: "Jesus College", sub: "Oxford University", logo: jesuCollegeLogo, logoHeight: 120 },
            { name: "IMAA", sub: "Institute for Mergers, Acquisitions & Alliances", textOnly: true },
            { name: "Bancor International Limited", sub: "Hong Kong", logo: bancorLogo, logoHeight: 45 },
            { name: "POLSKY Center for Entrepreneurship and Innovation", sub: "University of Chicago", logo: polskyLogo, logoHeight: 70 },
          ].map((p, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", minWidth: 0 }}>
              <div style={{ height: 140, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                {p.textOnly ? (
                  <div style={{ fontFamily: F.display, fontSize: 48, fontWeight: 700, color: C.deepBlue, letterSpacing: "0.05em" }}>IMAA</div>
                ) : (
                  // maxWidth keeps wide logos (Bancor is ~5:1) inside their grid cell
                  // instead of forcing the track wider and overflowing the section.
                  <img src={p.logo} alt={p.name} style={{ height: p.logoHeight, maxWidth: "100%", objectFit: "contain" }} />
                )}
              </div>
              <div style={{ fontFamily: F.display, fontSize: 16, fontWeight: 700, color: C.deepBlue, marginBottom: 2 }}>{p.name}</div>
              {p.sub && <div style={{ fontFamily: F.body, fontSize: 11, color: C.cool50, lineHeight: 1.4 }}>{p.sub}</div>}
            </div>
          ))}
        </div>
        {/* Strategic Partners */}
        {STRATEGIC_PARTNERS.length > 0 && (
          <div style={{ marginTop: 28, paddingTop: 24, borderTop: `1px solid ${C.cool20}` }}>
            <div style={{ textAlign: "center", marginBottom: 18 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: C.cool50, fontFamily: F.body }}>Strategic Partners</span>
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 36, alignItems: "center", flexWrap: "wrap" }}>
              {STRATEGIC_PARTNERS.map((p) => (
                <div key={p.name} style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                  <div style={{ height: 96, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                    <img src={p.logo} alt={p.name} style={{ height: p.logoHeight, objectFit: "contain" }} />
                  </div>
                  <div style={{ fontFamily: F.display, fontSize: 14, fontWeight: 700, color: C.deepBlue }}>{p.name}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </FadeIn>
    </Section>
  );
}

// 10. CTA & APPLY
function FinalCTA({ onApplyClick, onJoinClick, eventData = {}, myApplication }) {
  const eventTitle = eventData.title || 'The Oxford M&A Symposium 2026';
  const eventName = eventTitle.replace(' 2026', '').replace(/\d{4}$/, '').trim();

  return (
    <section id="apply" style={{ background: `linear-gradient(135deg, ${C.deepBlue}, ${C.midBlue})`, padding: "80px 0" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 40px", textAlign: "center" }}>
        <FadeIn>
          <div
            style={{
              fontFamily: F.display,
              fontSize: 20,
              fontWeight: 400,
              color: C.lightBlue,
              lineHeight: 1.5,
              margin: "0 0 8px",
              fontStyle: "italic",
            }}
          >
            {eventName}
          </div>
          <div
            style={{
              fontFamily: F.display,
              fontSize: 42,
              fontWeight: 700,
              color: C.white,
              lineHeight: 1.15,
              margin: "0 0 16px",
            }}
          >
            Request an Invitation
          </div>
          <p
            style={{
              fontFamily: F.body,
              fontSize: 15,
              lineHeight: 1.7,
              color: C.lightBlue,
              margin: "0 0 32px",
            }}
          >
            Attendance is by application only.
            <br />
            Places are allocated to ensure the calibre of exchange that defines the Symposium.
          </p>
          {!myApplication || myApplication.status === 'none' ? (
            <button
              onClick={onApplyClick}
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: C.white,
                background: C.coral,
                padding: "14px 44px",
                border: "none",
                borderRadius: 3,
                cursor: "pointer",
                fontFamily: F.body,
              }}
            >
              Apply
            </button>
          ) : (
            <ApplyStatusDisplay status={myApplication.status} eventData={eventData} onJoinClick={onJoinClick} buttonSize="large" />
          )}
          <div style={{ marginTop: 16 }}>
            <span style={{ fontFamily: F.body, fontSize: 12, color: C.lightBlue, opacity: 0.5 }}>
              A participation fee applies. Details are shared upon successful application.
            </span>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}


// 11. FOOTER
function Footer() {
  return (
    <footer style={{ background: C.cool100, padding: "48px 0" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 40px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: C.cool60, fontFamily: F.body }}>© 2026 Oxford M&A Symposium</span>
          <div style={{ display: "flex", gap: 20 }}>
            {["Privacy Policy", "Terms", "Imprint"].map((t) => (
              <span key={t} style={{ fontSize: 11, color: C.cool60, cursor: "pointer", fontFamily: F.body, transition: "color 0.3s" }} onMouseEnter={(e) => e.target.style.color = C.white} onMouseLeave={(e) => e.target.style.color = C.cool60}>
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

const oxfordFallbackDescription =
  "The Oxford M&A Symposium brings together senior practitioners for a compact day of market insight, practical dealmaking conversations, and high-quality networking across founders, acquirers, investors, lenders, lawyers, and advisors.";

const oxfordHeroDescription =
  "A focused gathering for M&A practitioners, investors, founders, advisors, and corporate leaders shaping the next cycle of strategic growth.";

const oxfordThemeFallback = "Sustainable Value Creation in Times of Uncertainty";

function toAbsoluteMediaUrl(value) {
  if (!value || typeof value !== "string") return "";
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  if (value.startsWith("/src/") || value.startsWith("/assets/")) return value;
  const apiBase = import.meta.env.VITE_API_BASE_URL || "";
  const apiOrigin = apiBase.replace(/\/api\/?$/, "");
  return `${apiOrigin}${value}`;
}

function scrollToOxfordSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function getOxfordDate(eventData = {}) {
  if (eventData?.slug === "the-oxford-m-a-symposium-2026") {
    return { month: "September", range: "14–17", year: "2026", days: 4 };
  }

  if (!eventData?.start_time) {
    return { month: "September", range: "14–17", year: "2026", days: 4 };
  }

  const timeZone = eventData.timezone || "UTC";
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const numericFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
  const partsFor = (value) => {
    const result = {};
    formatter.formatToParts(new Date(value)).forEach(({ type, value: partValue }) => {
      result[type] = partValue;
    });
    return result;
  };
  const numericPartsFor = (value) => {
    const result = {};
    numericFormatter.formatToParts(new Date(value)).forEach(({ type, value: partValue }) => {
      result[type] = Number(partValue);
    });
    return result;
  };

  const start = partsFor(eventData.start_time);
  const end = partsFor(eventData.end_time || eventData.start_time);
  const startNumeric = numericPartsFor(eventData.start_time);
  const endNumeric = numericPartsFor(eventData.end_time || eventData.start_time);
  const startDayUtc = Date.UTC(startNumeric.year, startNumeric.month - 1, startNumeric.day);
  const endDayUtc = Date.UTC(endNumeric.year, endNumeric.month - 1, endNumeric.day);
  const days = Math.max(1, Math.round((endDayUtc - startDayUtc) / 86400000) + 1);

  return {
    month: start.month || "September",
    range: start.day === end.day ? start.day : `${start.day}–${end.day}`,
    year: start.year || end.year || "2026",
    days,
  };
}

function getOxfordStats(eventData = {}) {
  const sessionTotal = [
    eventData.main_sessions_count,
    eventData.breakout_sessions_count,
    eventData.workshops_count,
    eventData.networking_count,
  ]
    .map((value) => Number(value) || 0)
    .reduce((sum, value) => sum + value, 0);
  const sessionsFromArray = Array.isArray(eventData.sessions) ? eventData.sessions.length : 0;
  const speakerTotal = Number(eventData.featured_participants_total || eventData.featured_participants?.length || 0);
  const delegates = Number(eventData.capacity || eventData.max_attendees || eventData.attendee_limit || 0);
  const date = getOxfordDate(eventData);

  return [
    { value: delegates > 0 ? `${delegates}+` : "250+", label: "Delegates" },
    { value: speakerTotal > 0 ? `${Math.max(speakerTotal, 15)}+` : "15+", label: "Speakers" },
    { value: date.days || 4, label: "Days" },
    { value: sessionTotal > 0 ? `${sessionTotal}+` : sessionsFromArray > 0 ? `${sessionsFromArray}+` : "XX+", label: "Sessions" },
  ];
}

function getOxfordEventCopy(eventData = {}) {
  const rawDescription = (eventData.description || "").trim();
  const slugLikeDescription =
    rawDescription === eventData.slug ||
    rawDescription === "the-oxford-m-a-symposium-2026" ||
    /^[a-z0-9]+(?:-[a-z0-9]+)+$/.test(rawDescription);
  return {
    title: eventData.title || "The Oxford M&A Symposium 2026",
    description: rawDescription && !slugLikeDescription ? rawDescription : oxfordFallbackDescription,
    theme: eventData.theme || eventData.subtitle || oxfordThemeFallback,
    badge:
      eventData.registration_type === "open"
        ? "Open Registration"
        : "By invitation & application only",
  };
}

function getOxfordHighlights(eventData = {}) {
  const sessionItems = Array.isArray(eventData.sessions)
    ? eventData.sessions.filter(Boolean).slice(0, 4).map((session, index) => ({
        title: session.title || session.name || `Session ${index + 1}`,
        desc: session.description || session.summary || session.abstract || "Programme details will be announced soon.",
        img: toAbsoluteMediaUrl(session.image || session.cover_image || session.preview_image) || [receptionImg, dinnerImg, puntingImg, bbqImg][index % 4],
      }))
    : [];

  if (sessionItems.length) return sessionItems;

  return [
    {
      title: "Welcome Reception",
      desc: "A reception to close the first day. Informal, unhurried, and shaped by the inspiration that the first day's sessions have set in motion.",
      img: receptionImg,
    },
    {
      title: "College Dinner",
      desc: "A black-tie dinner in the Great Hall of Jesus College, conducted in the Oxford tradition.",
      img: dinnerImg,
    },
    {
      title: "Punting",
      desc: "An optional early evening on the Cherwell by punt. No prior punting ability required. Quintessentially Oxford.",
      img: puntingImg,
    },
    {
      title: "BBQ Dinner",
      desc: "The final evening. By Thursday, the programme ends. The conversations do not.",
      img: bbqImg,
    },
  ];
}

function getOxfordSpeakers(eventData = {}) {
  if (!Array.isArray(eventData.featured_participants)) return [];
  return eventData.featured_participants.map((participant) => {
    const professionalInfo =
      participant.professional_info?.split("\n")[0] ||
      participant.job_title ||
      participant.company ||
      participant.participant_type_label ||
      "";
    const initials =
      participant.display_name
        ?.split(" ")
        .slice(0, 2)
        .map((word) => word[0])
        .join("")
        .toUpperCase() || "?";

    return {
      name: participant.display_name || "Participant",
      role: participant.role_label || professionalInfo,
      org: professionalInfo,
      initials,
      image: toAbsoluteMediaUrl(participant.avatar_url || participant.image || participant.photo_url),
      profileUrl: participant.is_profile_clickable ? participant.profile_url : "",
    };
  });
}

function getOxfordFaqs(eventData = {}) {
  const apiFaqs = eventData.faqs || eventData.faq || eventData.frequently_asked_questions;
  if (Array.isArray(apiFaqs) && apiFaqs.length) {
    return apiFaqs.map((item, index) => ({
      q: item.question || item.title || `Question ${index + 1}`,
      a: item.answer || item.content || item.description || "",
    }));
  }

  return [
    {
      q: "What is Oxford M&A Symposium 2026?",
      a: "A focused gathering for M&A practitioners, investors, founders, advisors, and corporate leaders shaping the next cycle of strategic growth.",
    },
    {
      q: "When and Where is Oxford M&A Symposium 2026?",
      a: "The Symposium is currently planned for September 14-17, 2026, in Oxford.",
    },
    {
      q: "How do I apply?",
      a: "Use the Apply button on this page. Attendance is by application or invitation, and places are allocated to preserve a senior, relevant exchange.",
    },
  ];
}

function OxfordApplyAction({ onApplyClick, onJoinClick, eventData, myApplication, className = "", children = "Apply" }) {
  if (!myApplication || myApplication.status === "none") {
    return (
      <button type="button" className={className || "ox-reference-button ox-reference-button-primary"} onClick={onApplyClick}>
        {children}
      </button>
    );
  }

  return (
    <ApplyStatusDisplay
      status={myApplication.status}
      eventData={eventData}
      onJoinClick={onJoinClick}
      buttonSize="large"
      style={{ borderRadius: 999 }}
    />
  );
}

function OxfordHeroReference({ onApplyClick, onJoinClick, eventData = {}, myApplication }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const copy = getOxfordEventCopy(eventData);
  const date = getOxfordDate(eventData);
  const stats = getOxfordStats(eventData);
  const heroImage = oxfordBgHero;
  const navItems = [
    { label: "Home", id: "oxford-hero" },
    { label: "About", id: "why-attend" },
    { label: "Partners", id: "partners" },
    { label: "Agenda", id: "event-highlights" },
    { label: "Speakers", id: "speakers" },
  ];

  return (
    <>
      {eventData && (
        <Helmet>
          <title>{copy.title}</title>
          <meta property="og:title" content={copy.title} />
          <meta property="og:description" content={copy.description.slice(0, 160)} />
          <meta property="og:image" content={heroImage} />
          <meta property="og:url" content={window.location.href} />
          <meta property="og:type" content="website" />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={copy.title} />
          <meta name="twitter:image" content={heroImage} />
        </Helmet>
      )}
      <section id="oxford-hero" className="ox-reference-hero">
        <img className="ox-reference-hero-bg" src={heroImage} alt="" aria-hidden="true" />
        <div className="ox-reference-hero-overlay" />
        <img className="ox-reference-hero-skyline" src={oxfordBgSkyline} alt="" aria-hidden="true" />
        <nav className="ox-reference-nav" aria-label="Oxford Symposium navigation">
          <button type="button" className="ox-reference-brand" onClick={() => scrollToOxfordSection("oxford-hero")}>
            <img src={imaaLogo} alt="IMAA" />
          </button>
          <button
            type="button"
            className="ox-reference-menu-button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-expanded={mobileMenuOpen}
            aria-controls="oxford-mobile-menu"
            aria-label="Toggle navigation"
          >
            <span />
            <span />
            <span />
          </button>
          <div id="oxford-mobile-menu" className={`ox-reference-nav-links ${mobileMenuOpen ? "is-open" : ""}`}>
            {navItems.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => {
                  scrollToOxfordSection(item.id);
                  setMobileMenuOpen(false);
                }}
              >
                {item.label}
              </button>
            ))}
            <OxfordApplyAction
              onApplyClick={() => {
                onApplyClick();
                setMobileMenuOpen(false);
              }}
              onJoinClick={onJoinClick}
              eventData={eventData}
              myApplication={myApplication}
              className="ox-reference-nav-apply"
            />
          </div>
        </nav>

        <div className="ox-reference-hero-inner">
          <div className="ox-reference-hero-copy">
            <div className="ox-reference-badge">
              <span className="ox-reference-badge-icon" aria-hidden="true">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path d="M12 3.25 14.18 5.1l2.86-.12.66 2.78 2.28 1.72-1.08 2.65 1.08 2.65-2.28 1.72-.66 2.78-2.86-.12L12 20.75l-2.18-1.85-2.86.12-.66-2.78-2.28-1.72 1.08-2.65-1.08-2.65L6.3 7.5l.66-2.78 2.86.12L12 3.25Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                  <path d="m8.7 12 2.05 2.05 4.55-4.55" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              {copy.badge}
            </div>
            <div className="ox-reference-title-lockup" aria-label={copy.title}>
              <span className="ox-reference-oxford">Oxford</span>
              <span className="ox-reference-symposium">
                <strong>M&amp;A</strong>
                <span>Symposium</span>
              </span>
            </div>
            <p className="ox-reference-hero-description">{oxfordHeroDescription}</p>
            {copy.theme && <p className="ox-reference-theme">"{copy.theme}"</p>}
            <div className="ox-reference-hero-actions">
              <OxfordApplyAction
                onApplyClick={onApplyClick}
                onJoinClick={onJoinClick}
                eventData={eventData}
                myApplication={myApplication}
              />
              <button type="button" className="ox-reference-button ox-reference-button-light" onClick={() => scrollToOxfordSection("event-highlights")}>
                View Agenda
              </button>
            </div>
          </div>

          <aside className="ox-reference-date-panel" aria-label="Event dates and details">
            <div className="ox-reference-date-top">
              <span>{date.month}</span>
              <span>{date.year}</span>
            </div>
            <div className="ox-reference-date-range">{date.range}</div>
            <div className="ox-reference-stat-grid">
              {stats.map((stat) => (
                <div key={stat.label} className="ox-reference-stat-card">
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </div>
              ))}
            </div>
          </aside>
        </div>

      </section>
    </>
  );
}

function OxfordWhyAttend({ eventData = {} }) {
  const copy = getOxfordEventCopy(eventData);

  return (
    <section id="why-attend" className="ox-reference-section ox-reference-section-light ox-reference-why">
      <div className="ox-reference-container ox-reference-centered">
        <p className="ox-reference-kicker">Why Attend</p>
        <h2>Connecting Oxford's M&amp;A, private capital and corporate growth community</h2>
        <p>{copy.description}</p>
      </div>
    </section>
  );
}

function OxfordHighlightsReference({ eventData = {} }) {
  const highlights = getOxfordHighlights(eventData);

  return (
    <section id="event-highlights" className="ox-reference-section ox-reference-highlights">
      <img className="ox-reference-section-bg" src={oxfordBgHighlights} alt="" aria-hidden="true" />
      <div className="ox-reference-section-overlay" />
      <div className="ox-reference-container">
        <div className="ox-reference-section-header">
          <div>
            <p className="ox-reference-kicker">What's Happening</p>
            <h2>2026 Event Highlights</h2>
          </div>
          <button type="button" className="ox-reference-pill-button" onClick={() => scrollToOxfordSection("event-highlights")}>
            View Full Agenda
          </button>
        </div>
        <div className="ox-reference-highlight-grid">
          {highlights.map((item) => (
            <article className="ox-reference-highlight-card" key={item.title}>
              <img src={item.img} alt={item.title} />
              <div className="ox-reference-card-shade" />
              <div>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function OxfordSpeakersReference({ eventData = {} }) {
  const [showAllSpeakers, setShowAllSpeakers] = useState(false);
  const isBelowDesktop = useIsMobile(1025);
  const isSmallMobile = useIsMobile(481);
  const speakers = getOxfordSpeakers(eventData);
  if (!speakers.length) return null;

  const initialSpeakerCount = isSmallMobile ? 2 : isBelowDesktop ? 4 : 10;
  const canExpandSpeakers = speakers.length > initialSpeakerCount;
  const visibleSpeakers = showAllSpeakers ? speakers : speakers.slice(0, initialSpeakerCount);

  return (
    <section id="speakers" className="ox-reference-section ox-reference-section-light ox-reference-speakers">
      <div className="ox-reference-container">
        <div className="ox-reference-section-header">
          <div>
            <p className="ox-reference-kicker">Featured Speakers</p>
            <h2>Learn from the best</h2>
          </div>
          {canExpandSpeakers && (
            <button type="button" className="ox-reference-pill-button" onClick={() => setShowAllSpeakers((current) => !current)}>
              {showAllSpeakers ? "Show Fewer" : "View All Speakers"}
            </button>
          )}
        </div>
        <div className="ox-reference-speaker-grid">
          {visibleSpeakers.map((speaker, index) => {
            const card = (
              <article className="ox-reference-speaker-card">
                {speaker.image ? (
                  <img src={speaker.image} alt={speaker.name} />
                ) : (
                  <div className="ox-reference-speaker-fallback" aria-hidden="true">{speaker.initials}</div>
                )}
                <div className="ox-reference-speaker-shade" />
                <div className="ox-reference-speaker-meta">
                  <h3>{speaker.name}</h3>
                  {(speaker.org || speaker.role) && <p>{speaker.org || speaker.role}</p>}
                </div>
              </article>
            );

            return speaker.profileUrl ? (
              <a className="ox-reference-speaker-link" href={speaker.profileUrl} key={`${speaker.name}-${index}`}>
                {card}
              </a>
            ) : (
              <div key={`${speaker.name}-${index}`}>{card}</div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function OxfordPartnersReference() {
  const partners = [
    { name: "Jesus College Oxford", logo: jesuCollegeLogo, className: "jesus-logo" },
    { name: "IMAA Institute for Mergers, Acquisitions & Alliances", logo: imaaLogo, className: "imaa-logo" },
    { name: "Bancor International Limited", logo: bancorLogo, className: "bancor-logo" },
    { name: "Polsky Center for Entrepreneurship and Innovation", logo: polskyLogo, className: "polsky-logo" },
    ...STRATEGIC_PARTNERS.map((partner) => ({ name: partner.name, logo: partner.logo, className: "strategic-logo" })),
  ].filter((partner) => partner.logo);

  return (
    <section id="partners" className="ox-reference-section ox-reference-partners">
      <div className="ox-reference-container ox-reference-centered">
        <p className="ox-reference-kicker">About the Symposium</p>
        <h2>Organised in Partnership</h2>
        <p>
          The Oxford M&amp;A Symposium brings together senior practitioners for a compact day of market insight, practical dealmaking conversations, and high-quality networking across founders, acquirers, investors, lenders, lawyers, and advisors.
        </p>
        <div className="ox-reference-logo-grid">
          {partners.map((partner) => (
            <div className={`ox-reference-logo-cell ${partner.className}`} key={partner.name}>
              <img src={partner.logo} alt={partner.name} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function OxfordFAQReference({ eventData = {} }) {
  const [openIndex, setOpenIndex] = useState(0);
  const faqs = getOxfordFaqs(eventData);

  return (
    <section id="faq" className="ox-reference-section ox-reference-faq">
      <div className="ox-reference-container">
        <p className="ox-reference-kicker">Questions</p>
        <h2>Frequently Asked Questions</h2>
        <p className="ox-reference-faq-intro">
          This FAQ is for anyone interested in attending, partnering, or supporting Oxford M&amp;A Symposium. For any additional questions, please contact email.
        </p>
        <div className="ox-reference-faq-list">
          {faqs.map((item, index) => {
            const isOpen = openIndex === index;
            const answerId = `oxford-faq-answer-${index}`;
            return (
              <div className={`ox-reference-faq-item ${isOpen ? "is-open" : ""}`} key={item.q}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={answerId}
                  onClick={() => setOpenIndex(isOpen ? -1 : index)}
                >
                  <span>{item.q}</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <div id={answerId} className="ox-reference-faq-answer">
                  <p>{item.a}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function OxfordInvitationCTAReference({ onApplyClick, onJoinClick, eventData = {}, myApplication }) {
  return (
    <section id="apply" className="ox-reference-section ox-reference-section-light ox-reference-cta">
      <div className="ox-reference-container ox-reference-centered">
        <p className="ox-reference-kicker">The Oxford M&amp;A Symposium</p>
        <h2>Request an Invitation</h2>
        <p>
          Attendance is by application only.
          <br />
          Places are allocated to ensure the calibre of exchange that defines the Symposium.
        </p>
        <OxfordApplyAction
          onApplyClick={onApplyClick}
          onJoinClick={onJoinClick}
          eventData={eventData}
          myApplication={myApplication}
        />
      </div>
    </section>
  );
}

function OxfordFooterReference() {
  return (
    <footer className="ox-reference-footer">
      <div className="ox-reference-container">
        <span>© 2026 Oxford M&amp;A Symposium</span>
      </div>
    </footer>
  );
}

// MAIN COMPONENT
/**
 * @param {object} props
 * @param {"blue"|"green"} [props.theme] Colour palette. "green" is the /staging
 *   design preview; everything else about the page is identical.
 */
export default function OxfordSymposium2026({ theme = "blue" }) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [applyOpen, setApplyOpen] = useState(false);
  const [adminApplyNoticeOpen, setAdminApplyNoticeOpen] = useState(false);
  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Apply workflow state
  const token = localStorage.getItem("access_token") || localStorage.getItem("access");
  const isGuest = localStorage.getItem("is_guest") === "true";
  const isAdminViewer = Boolean(token) && !isGuest && isOwnerUser();
  const [myApplication, setMyApplication] = useState(null);

  // Guest join modal state
  const [guestModalOpen, setGuestModalOpen] = useState(false);
  const [guestJoinEvent, setGuestJoinEvent] = useState(null);

  // Guest apply modal state (for apply-type events)
  const [guestApplyModalOpen, setGuestApplyModalOpen] = useState(false);

  const ALLOWED_SLUG = 'the-oxford-m-a-symposium-2026';

  const handleGuestJoinRequested = (eventData) => {
    setGuestJoinEvent(eventData);
    setGuestModalOpen(true);
  };

  useEffect(() => {
    // Validate slug - only allow specific event
    if (slug && slug !== ALLOWED_SLUG) {
      navigate('/events');
      return;
    }

    const fetchEventData = async () => {
      try {
        setLoading(true);
        // Fetch event by slug from the API
        // Using Vite's import.meta.env for environment variables
        const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
        // featured_all=true: show all speakers/hosts/moderators regardless of visibility settings
        const response = await fetch(`${apiUrl}/events/by-slug/${slug}/?featured_all=true`);
        if (!response.ok) {
          throw new Error(`Failed to fetch event data: ${response.statusText}`);
        }
        const data = await response.json();
        setEventData(data);
      } catch (err) {
        console.error("Error fetching event:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchEventData();
    }
  }, [slug]);

  // Fetch application status for apply-type events
  useEffect(() => {
    if (!eventData?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
        const headers = { "Content-Type": "application/json" };
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        let url = `${apiUrl}/events/${eventData.id}/apply/`;
        if (!token) {
          const cached = localStorage.getItem("application_cache");
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              if (Number(parsed.event_id) === Number(eventData.id) && parsed.email) {
                url += `?email=${encodeURIComponent(parsed.email)}`;
              }
            } catch (err) {
              console.error("Failed to parse application_cache:", err);
            }
          }
        }

        const res = await fetch(url, { headers });
        if (!cancelled && res.ok) {
          const data = await res.json();
          setMyApplication(data);
        }
      } catch (err) {
        console.error("Failed to fetch application status:", err);
      }
    })();
    return () => { cancelled = true; };
  }, [eventData?.id, token]);

  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,300;0,400;0,500;0,700;0,900;1,400&family=Roboto+Slab:wght@300;400;500;600;700&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }, []);

  if (loading) {
    return <div style={{ padding: "100px 40px", textAlign: "center" }}>Loading event...</div>;
  }

  if (error) {
    return <div style={{ padding: "100px 40px", textAlign: "center", color: "red" }}>Error: {error}</div>;
  }

  const handleGuestApplyRequested = (eventData) => {
    setGuestApplyModalOpen(true);
  };

  const handleApplyClick = () => {
    if (isAdminViewer) {
      setAdminApplyNoticeOpen(true);
      return;
    }

    // For unauthenticated users on free events
    if (!token) {
      const isFreeEvent = !eventData?.price || Number(eventData?.price) === 0;

      // Open registration + free = show guest join modal
      if (eventData?.registration_type === 'open' && isFreeEvent) {
        handleGuestJoinRequested(eventData);
        return;
      }

      // Apply registration + free = show guest apply modal
      if (eventData?.registration_type === 'apply' && isFreeEvent) {
        handleGuestApplyRequested(eventData);
        return;
      }
    }

    // Default: show apply modal for authenticated users or paid events
    setApplyOpen(true);
  };

  const handleJoinClick = () => {
    if (eventData?.slug) {
      navigate(`/live/${eventData.slug}?id=${eventData.id}&role=audience`);
    } else if (eventData?.id) {
      navigate(`/live/${eventData.id}?id=${eventData.id}&role=audience`);
    }
  };

  const handleApplicationSuccess = (app) => {
    setMyApplication(app);
    // Guest token is now handled by GuestApplyModal with OTP verification
  };

  const isStagingPreview = theme === "green";

	  return (
	    <div
	      className={isStagingPreview ? "ox-reference-page ox-theme-green" : "ox-public-page"}
	      style={{ fontFamily: F.body, WebkitFontSmoothing: "antialiased" }}
	    >
      {isStagingPreview ? (
        <>
          <OxfordHeroReference onApplyClick={handleApplyClick} onJoinClick={handleJoinClick} eventData={eventData} myApplication={myApplication} />
          <OxfordWhyAttend eventData={eventData} />
          <OxfordHighlightsReference eventData={eventData} />
          <OxfordSpeakersReference eventData={eventData} />
          <OxfordPartnersReference />
          <OxfordFAQReference eventData={eventData} />
          <OxfordInvitationCTAReference onApplyClick={handleApplyClick} onJoinClick={handleJoinClick} eventData={eventData} myApplication={myApplication} />
          <OxfordFooterReference />
        </>
      ) : (
        <>
          <Hero onApplyClick={handleApplyClick} onJoinClick={handleJoinClick} eventData={eventData} myApplication={myApplication} />
          <PositioningStatement />
          <Speakers eventData={eventData} />
          <Themes />
          <MoreThanSessions />
          <OxfordExperience eventData={eventData} />
          <Programme eventData={eventData} />
          <About />
          <FinalCTA onApplyClick={handleApplyClick} onJoinClick={handleJoinClick} eventData={eventData} myApplication={myApplication} />
          <Footer />
        </>
      )}
      <ApplyNowModal
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        event={eventData}
        token={token}
        onSuccess={handleApplicationSuccess}
      />
      {guestJoinEvent && (
        <GuestJoinModal
          open={guestModalOpen}
          onClose={() => {
            setGuestModalOpen(false);
            setGuestJoinEvent(null);
          }}
          event={guestJoinEvent}
          livePath={`/live/${guestJoinEvent.slug || guestJoinEvent.id}?id=${guestJoinEvent.id}&role=audience`}
        />
      )}
      <GuestApplyModal
        open={guestApplyModalOpen}
        onClose={() => setGuestApplyModalOpen(false)}
        event={eventData}
        livePath={eventData ? `/live/${eventData.slug || eventData.id}?id=${eventData.id}&role=audience` : ""}
      />

      <Snackbar
        open={adminApplyNoticeOpen}
        autoHideDuration={5000}
        onClose={() => setAdminApplyNoticeOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity="info"
          variant="filled"
          onClose={() => setAdminApplyNoticeOpen(false)}
          sx={{ width: "100%" }}
        >
          You are an admin/superuser, so you can manage this event and do not need to register or apply.
        </Alert>
      </Snackbar>
    </div>
  );
}
