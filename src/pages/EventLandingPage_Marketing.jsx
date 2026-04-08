import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button, Alert } from "@mui/material";
import ApplyNowModal from "../components/ApplyNowModal";
import GuestJoinModal from "../components/GuestJoinModal.jsx";
import heroImg from "../assets/oxford/Oxford_Jesus-College.png";
import receptionImg from "../assets/oxford/Oxford_Reception.png";
import dinnerImg from "../assets/oxford/Oxford_CollegeDinner_2.png";
import puntingImg from "../assets/oxford/Oxford_Punting.png";
import bbqImg from "../assets/oxford/Oxford_BBQ_2.png";
import jesuCollegeLogo from "../assets/oxford/Jesus_College_Crest_Logo.png";
import bancorLogo from "../assets/oxford/Bancor_Logo.jpeg";
import "../styles/OxfordSymposium2026.css";

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
                Register Interest
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
                Register Interest
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
            <p
              style={{
                fontFamily: F.body,
                fontSize: 15,
                lineHeight: 1.7,
                color: C.cool50,
                margin: "0 0 32px",
                maxWidth: 460,
                ...a(0.7),
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {description}
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
                  Register Interest
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

      return {
        name: participant.display_name || 'Participant',
        role: participant.role_label || '', // Role label (Speaker, Host, Moderator, etc.)
        org: professionalInfo, // Professional info / experience from job_title or bio
        initials,
        bio: participant.professional_info || '', // Full info for bio panel
        image: participant.avatar_url,
      };
    });
  };

  const speakers = transformParticipants(eventData.featured_participants);

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
          Speakers provoke, challenge, and frame insights through diverse expertise and conviction.
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
                    borderRadius: "50%",
                    background: `linear-gradient(135deg, ${C.deepBlue}, ${C.midBlue})`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 14,
                    filter: "grayscale(100%)",
                  }}
                >
                  <span style={{ fontFamily: F.body, fontSize: 16, fontWeight: 700, color: C.white }}>
                    {s.initials}
                  </span>
                </div>
              )}
              <div style={{ fontFamily: F.display, fontSize: 16, fontWeight: 700, color: C.deepBlue, lineHeight: 1.25, marginBottom: 4 }}>
                {s.name}
              </div>
              {s.role && (
                <div style={{ fontFamily: F.body, fontSize: 12, color: C.cool60, lineHeight: 1.4, marginBottom: 2 }}>
                  {s.role}
                </div>
              )}
              <div style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.cool80, marginBottom: s.bio ? 10 : 0 }}>
                {s.org}
              </div>
              {s.bio && (
                <span style={{ fontSize: 10, fontWeight: 600, color: C.brightBlue, fontFamily: F.body }}>
                  {activeBio === i ? "Close" : "View bio"} →
                </span>
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
function Programme({ eventData = {} }) {
  // Helper function to format time in event's timezone
  const formatTimeInTimezone = (isoString, timezone) => {
    try {
      const date = new Date(isoString);
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone || "UTC",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      return formatter.format(date);
    } catch (e) {
      return "TBD";
    }
  };

  // Transform API sessions into day cards
  const transformSessions = (sessions, isMultiDay, timezone, startTime, endTime) => {
    if (!isMultiDay || !sessions || !Array.isArray(sessions)) return [];

    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const colors = [C.coral, C.brightBlue, C.green, C.oxfordGold];

    // Get event date range
    const eventStartDate = startTime ? new Date(startTime).toISOString().split('T')[0] : null;
    const eventEndDate = endTime ? new Date(endTime).toISOString().split('T')[0] : null;

    // Group sessions by date, only include those within event date range
    const groupedByDate = {};
    sessions.forEach((session) => {
      const sessionDate = session.session_date;

      // Filter: only include sessions within the event's date range
      if (eventStartDate && eventEndDate) {
        if (sessionDate < eventStartDate || sessionDate > eventEndDate) {
          return; // Skip sessions outside event date range
        }
      }

      const key = sessionDate;
      if (!groupedByDate[key]) {
        groupedByDate[key] = { date: key, sessions: [], title: null };
      }
      groupedByDate[key].sessions.push(session);
      // Use session title as evening activity
      if (session.session_type === "main" && !groupedByDate[key].title) {
        groupedByDate[key].title = session.title;
      }
    });

    // Convert to array and format
    return Object.values(groupedByDate)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map((day, idx) => {
        const date = new Date(day.date);
        const dayName = dayNames[date.getDay()];
        const dateStr = `${monthNames[date.getMonth()]} ${date.getDate()}`;

        return {
          day: dayName,
          date: dateStr,
          color: colors[idx % colors.length],
          sessions: day.sessions.map((s) => ({
            time: `${formatTimeInTimezone(s.start_time, timezone)} – ${formatTimeInTimezone(s.end_time, timezone)}`,
            label: s.session_type === "main" ? s.title : "Sessions",
          })),
          evening: day.title,
        };
      });
  };

  const days = transformSessions(eventData.sessions, eventData.is_multi_day, eventData.timezone, eventData.start_time, eventData.end_time);

  // Hide section if not multi-day or no sessions
  if (!eventData.is_multi_day || days.length === 0) {
    return null;
  }

  // Calculate optimal grid columns based on number of days
  const getGridColumns = (dayCount) => {
    if (dayCount <= 4) return dayCount; // 1-4 days: use actual count
    if (dayCount === 5) return 3; // 5 days: 3 + 2 layout
    if (dayCount <= 8) return 4; // 6-8 days: 4 + 2/3/4 layout
    return 5; // 9+ days: 5 columns
  };

  const gridCols = getGridColumns(days.length);

  return (
    <Section bg={C.white} style={{ padding: "64px 0" }} id="programme">
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
            At A Glance
          </div>
        </div>
        <h3 style={{ fontSize: 36, fontWeight: 700, color: C.deepBlue, fontFamily: F.display, margin: "0 0 12px", lineHeight: 1.25 }}>{days.length} days, one trajectory.</h3>
      </FadeIn>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
          gap: 20,
          marginTop: 32,
          overflowX: "auto",
          overflowY: "hidden",
          scrollBehavior: "smooth",
          paddingBottom: 12,
          marginBottom: -12,
        }}
      >
        {days.map((d, i) => (
          <FadeIn key={i} delay={i * 0.1}>
            <div style={{ padding: "24px", border: `1px solid ${C.cool20}`, borderTop: `4px solid ${d.color}`, borderRadius: 4, background: C.white, minWidth: "calc(50% - 10px)" }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.deepBlue, fontFamily: F.display, marginBottom: 2 }}>{d.day}</div>
                <div style={{ fontSize: 11, color: C.cool60, fontFamily: F.body, letterSpacing: "0.05em", textTransform: "uppercase" }}>{d.date}</div>
              </div>
              {d.sessions.map((s, j) => (
                <div key={j} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: C.cool60, fontFamily: F.body }}>{s.time}</div>
                </div>
              ))}
              {d.evening && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.cool20}`, fontSize: 13, fontWeight: 600, color: C.deepBlue, fontFamily: F.display, fontStyle: "italic" }}>{d.evening}</div>
              )}
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
        minHeight: 460,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        borderLeft: `3px solid ${ev.accent}`,
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
        }}
      />
      <div style={{ position: "relative", padding: "20px 18px", zIndex: 1 }}>
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: ev.accent,
            fontFamily: F.body,
            marginBottom: 6,
            display: "block",
          }}
        >
          {ev.day}
        </span>
        <div
          style={{
            fontFamily: F.display,
            fontSize: 18,
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
function OxfordExperience({ eventData = {} }) {
  // Fallback static images
  const fallbackImages = [receptionImg, dinnerImg, puntingImg, bbqImg];
  const colors = [C.coral, C.brightBlue, C.green, C.oxfordGold];
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  // Build evenings dynamically from sessions
  const buildEveonings = (sessions) => {
    if (!sessions || !Array.isArray(sessions)) {
      // No sessions - use fallback static data
      return [
        {
          day: "Monday",
          title: "Welcome Reception & Dinner",
          desc: "A reception and dinner to close the first day. No formalities beyond a brief welcome. Informal, unhurried, and shaped by the inspiration that the first day's sessions have set in motion.",
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
          title: "Punting & Dinner",
          desc: "An optional early evening on the Cherwell by punt, followed by a riverside dinner. No prior punting ability required. Quintessentially Oxford.",
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
    }

    // Group sessions by date and get unique days
    const groupedByDate = {};
    sessions.forEach((session) => {
      const sessionDate = session.session_date;
      if (!groupedByDate[sessionDate]) {
        groupedByDate[sessionDate] = { date: sessionDate, sessions: [] };
      }
      groupedByDate[sessionDate].sessions.push(session);
    });

    // Convert to array and map to evening cards
    return Object.values(groupedByDate)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map((dayObj, idx) => {
        const date = new Date(dayObj.date);
        const dayName = dayNames[date.getDay()];

        // Use first session as evening data
        const firstSession = dayObj.sessions[0] || {};

        return {
          day: dayName,
          title: firstSession.title || `Evening ${idx + 1}`,
          desc: firstSession.description || `An evening activity for ${dayName}.`,
          accent: colors[idx % colors.length],
          img: firstSession.session_image || fallbackImages[idx % fallbackImages.length],
        };
      });
  };

  const evenings = buildEveonings(eventData.sessions);

  // Hide section if not multi-day or no sessions
  if (!eventData.is_multi_day || evenings.length === 0) {
    return null;
  }

  // Determine grid columns based on number of sessions
  const getGridColumns = (count) => {
    if (count <= 4) return 4;
    return 3; // 5+ sessions: 3 columns (3 in first row, 2+ in second row)
  };

  const gridCols = getGridColumns(evenings.length);

  return (
    <Section bg={C.white} style={{ padding: "64px 0" }} id="experience">
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
        id="evenings"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
          gap: 12,
          marginTop: 20,
          overflowX: "auto",
          overflowY: "hidden",
          scrollBehavior: "smooth",
          paddingBottom: 12,
          marginBottom: -12,
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
        <div id="partners" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 60 }}>
          {[
            { name: "Jesus College", sub: "Oxford University", logo: jesuCollegeLogo },
            { name: "IMAA", sub: "Institute for Mergers, Acquisitions & Alliances", textOnly: true },
            { name: "Bancor International Limited", sub: "Hong Kong", logo: bancorLogo },
          ].map((p, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
              <div style={{ height: 140, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                {p.textOnly ? (
                  <div style={{ fontFamily: F.display, fontSize: 48, fontWeight: 700, color: C.deepBlue, letterSpacing: "0.05em" }}>IMAA</div>
                ) : (
                  <img src={p.logo} alt={p.name} style={{ height: i === 0 ? 120 : i === 2 ? 55 : 100, objectFit: "contain" }} />
                )}
              </div>
              <div style={{ fontFamily: F.display, fontSize: 16, fontWeight: 700, color: C.deepBlue, marginBottom: 2 }}>{p.name}</div>
              {p.sub && <div style={{ fontFamily: F.body, fontSize: 11, color: C.cool50, lineHeight: 1.4 }}>{p.sub}</div>}
            </div>
          ))}
        </div>
        {/* Strategic Partners - Hidden for now */}
        {/* <div style={{ marginTop: 28, paddingTop: 24, borderTop: `1px solid ${C.cool20}` }}>
          <div style={{ textAlign: "center", marginBottom: 18 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: C.cool50, fontFamily: F.body }}>Strategic Partners</span>
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 36, alignItems: "center", flexWrap: "wrap" }}>
            {["Partner 1", "Partner 2", "Partner 3", "Partner 4"].map((n, i) => (
              <div key={i} style={{ opacity: 0.35 }}>
                <div style={{ width: 100, height: 32, border: `1.5px solid ${C.cool50}`, borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 8, fontWeight: 700, color: C.cool50, fontFamily: F.body, letterSpacing: "0.06em" }}>{n}</span>
                </div>
              </div>
            ))}
          </div>
        </div> */}
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

// MAIN COMPONENT
export default function OxfordSymposium2026() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [applyOpen, setApplyOpen] = useState(false);
  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Apply workflow state
  const token = localStorage.getItem("access_token") || localStorage.getItem("access");
  const isGuest = localStorage.getItem("is_guest") === "true";
  const [myApplication, setMyApplication] = useState(null);
  const [applyAsGuestOnly, setApplyAsGuestOnly] = useState(false);

  // Guest join modal state
  const [guestModalOpen, setGuestModalOpen] = useState(false);
  const [guestJoinEvent, setGuestJoinEvent] = useState(null);

  const handleGuestJoinRequested = (eventData) => {
    setGuestJoinEvent(eventData);
    setGuestModalOpen(true);
  };

  useEffect(() => {
    const fetchEventData = async () => {
      try {
        setLoading(true);
        // Fetch event by slug from the API
        // Using Vite's import.meta.env for environment variables
        const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
        const response = await fetch(`${apiUrl}/events/by-slug/${slug}/`);
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

  const handleApplyClick = () => {
    // Prevent guest users from applying
    if (isGuest) {
      return;
    }

    // For guest users on free events
    if (!token) {
      const isFreeEvent = !eventData?.price || Number(eventData?.price) === 0;

      // Open registration + free = show guest join modal
      if (eventData?.registration_type === 'open' && isFreeEvent) {
        handleGuestJoinRequested(eventData);
        return;
      }

      // Apply registration + free = show apply modal as guest
      if (eventData?.registration_type === 'apply' && isFreeEvent) {
        setApplyAsGuestOnly(true);
        setApplyOpen(true);
        return;
      }
    }

    // Default: show apply modal for authenticated users or paid events
    setApplyAsGuestOnly(false);
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

    // Only auto-join if guest application was APPROVED (not pending)
    if (app.guest_token && app.guest_id && applyAsGuestOnly && app.status === "approved") {
      // Store guest session
      localStorage.setItem("guest_token", app.guest_token);
      localStorage.setItem("guest_id", String(app.guest_id));
      localStorage.setItem("is_guest", "true");

      // Navigate to meeting
      if (eventData?.slug) {
        navigate(`/live/${eventData.slug}?id=${eventData.id}&role=audience`);
      } else if (eventData?.id) {
        navigate(`/live/${eventData.id}?id=${eventData.id}&role=audience`);
      }
    }
  };

  return (
    <div style={{ fontFamily: F.body, WebkitFontSmoothing: "antialiased" }}>
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
      <ApplyNowModal
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        event={eventData}
        token={token}
        onSuccess={handleApplicationSuccess}
        guestOnly={applyAsGuestOnly}
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
    </div>
  );
}
