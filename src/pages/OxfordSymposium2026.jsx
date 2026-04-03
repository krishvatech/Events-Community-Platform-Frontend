import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Dialog, DialogTitle, DialogContent, TextField, Button, CircularProgress, Alert } from "@mui/material";
import heroImg from "../assets/oxford/Oxford_Jesus-College.png";
import dinnerImg from "../assets/oxford/Oxford_CollegeDinner_2.png";
import puntingImg from "../assets/oxford/Oxford_Punting.png";
import bbqImg from "../assets/oxford/Oxford_BBQ_2.png";
import jesuCollegeLogo from "../assets/oxford/Jesus_College_Crest_Logo.png";
import imaaLogo from "../assets/oxford/IMAA_Logo.svg";
import bancorLogo from "../assets/oxford/Bancor_Logo.jpeg";

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
  mono: "'Roboto Mono', monospace",
};

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
};

// Helper Components
function Section({ bg, children, style }) {
  return (
    <section style={{ background: bg, ...style }}>
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


// 1. HERO
function Hero({ onApplyClick, eventData = {} }) {
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

    // Get user's timezone
    const getUserTimezone = () => {
      try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
      } catch (e) {
        return 'User Time';
      }
    };

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
    const userTZ = getUserTimezone();
    const userTimezone = '';

    // Calculate days if multi-day (in event timezone)
    const numDays = data.is_multi_day
      ? Math.abs(endDateInTZ.day - startDateInTZ.day) + 1
      : 1;

    // Format date display - for single day events show full date, for multi-day show date range
    const isSingleDay = numDays === 1;

    // Add time/timezone information based on event type
    let eventTimeStr = '';
    let userTimeStr = '';

    if (data.start_time) {
      const formatTimeInTimezone = (isoString, timezone) => {
        try {
          const date = new Date(isoString);
          const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone || 'UTC',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          });
          return formatter.format(date);
        } catch (e) {
          return '';
        }
      };

      if (isSingleDay) {
        // Single-day: show actual times
        const eventStartTime = formatTimeInTimezone(data.start_time, eventTimezone);
        const userStartTime = formatTimeInTimezone(data.start_time, userTZ);
        const isSameTimezone = eventTimezone === userTZ;

        if (eventStartTime) eventTimeStr = `${eventStartTime} (${eventTimezone})`;
        if (userStartTime && !isSameTimezone) userTimeStr = `${userStartTime} (${userTZ})`;
      } else {
        // Multi-day: show timezone labels only
        eventTimeStr = `Event's timezone: (${eventTimezone})`;
        userTimeStr = `User's timezone: (${userTZ})`;
      }
    }
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
      userTimezone,
      eventTimeStr,
      userTimeStr,
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
    userTimezone = "User Time",
    eventTimeStr = "",
    userTimeStr = "",
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
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
        </div>
      </div>
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
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", ...a(0.85) }}>
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
                {eventTimeStr && (
                  <div style={{ fontSize: 12, color: C.lightBlue, fontFamily: F.body, marginTop: 2 }}>
                    {eventTimeStr}
                  </div>
                )}
                {userTimeStr ? (
                  <div style={{ fontSize: 12, color: C.lightBlue, fontFamily: F.body, marginTop: 2 }}>
                    {userTimeStr}
                  </div>
                ) : userTimezone ? (
                  <div style={{ fontSize: 12, color: C.lightBlue, fontFamily: F.body, marginTop: eventTimeStr ? 2 : 4 }}>
                    {userTimezone}
                  </div>
                ) : null}
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
    <Section bg={C.cool10} style={{ padding: "64px 0" }}>
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

  const visible = 3;
  const maxOffset = speakers.length - visible;
  const canPrev = offset > 0;
  const canNext = offset < maxOffset;

  return (
    <Section bg={C.white} style={{ padding: "64px 0" }}>
      <FadeIn>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: C.oxfordGold,
                fontFamily: F.body,
                marginBottom: 8,
              }}
            >
              Speakers & Hosts
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
                width: 32,
                height: 32,
                borderRadius: 4,
                border: `1px solid ${canPrev ? C.cool20 : C.cool10}`,
                background: canPrev ? C.white : C.cool10,
                cursor: canPrev ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
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
                width: 32,
                height: 32,
                borderRadius: 4,
                border: `1px solid ${canNext ? C.cool20 : C.cool10}`,
                background: canNext ? C.white : C.cool10,
                cursor: canNext ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
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
                }}
              >
                <span style={{ fontFamily: F.body, fontSize: 16, fontWeight: 700, color: C.white }}>
                  {s.initials}
                </span>
              </div>
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
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${C.deepBlue}, ${C.midBlue})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ fontFamily: F.body, fontSize: 12, fontWeight: 700, color: C.white }}>
                {speakers[activeBio].initials}
              </span>
            </div>
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

// 4. THEMES
function Themes() {
  const [openTheme, setOpenTheme] = useState(0);
  const themes = [
    {
      num: "01",
      title: "Sustainable Value Creation",
      desc: "Navigating dealmaking in a world of environmental responsibility.",
    },
    {
      num: "02",
      title: "Geopolitical Risk & Opportunity",
      desc: "How global tensions reshape M&A strategy and capital allocation.",
    },
    {
      num: "03",
      title: "Technology & Disruption",
      desc: "Building defensible positions in rapidly evolving sectors.",
    },
  ];

  return (
    <Section bg={C.white} style={{ padding: "64px 0" }} id="themes">
      <FadeIn>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: C.oxfordGold,
            fontFamily: F.body,
            marginBottom: 8,
          }}
        >
          Key Topics
        </div>
        <h3
          style={{
            fontSize: 36,
            fontWeight: 700,
            color: C.deepBlue,
            fontFamily: F.display,
            margin: "0 0 32px",
            lineHeight: 1.25,
          }}
        >
          Four days. Three focused themes.
        </h3>
      </FadeIn>
      {themes.map((t, i) => (
        <div key={i} style={{ borderTop: i === 0 ? `1px solid ${C.cool20}` : "none", borderBottom: `1px solid ${C.cool20}` }}>
          <button
            onClick={() => setOpenTheme(openTheme === i ? -1 : i)}
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
                fontSize: 14,
                fontWeight: 700,
                color: C.oxfordGold,
                fontFamily: F.display,
              }}
            >
              {t.num}
            </div>
            <div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: C.deepBlue,
                  fontFamily: F.display,
                  marginBottom: 4,
                }}
              >
                {t.title}
              </div>
              {openTheme === i && (
                <p
                  style={{
                    fontSize: 14,
                    color: C.cool60,
                    lineHeight: 1.6,
                    margin: 0,
                    fontFamily: F.body,
                  }}
                >
                  {t.desc}
                </p>
              )}
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 300,
                color: openTheme === i ? C.brightBlue : C.cool30,
                transition: "color 0.3s",
              }}
            >
              {openTheme === i ? "−" : "+"}
            </div>
          </button>
        </div>
      ))}
    </Section>
  );
}

// 5. OXFORD EXPERIENCE
// 6. MORE THAN SESSIONS
function MoreThanSessions() {
  const [activeTab, setActiveTab] = useState(0);
  const tabs = [
    {
      label: "Meet the Innovators",
      description: "Selected start-ups and researchers presenting their research and investment opportunities. These are not polished pitches, but substantive work-in-progress.",
    },
    {
      label: "Professional Development",
      description: "Curated sessions designed to develop leadership skills and strategic thinking for senior dealmakers and investors.",
    },
    {
      label: "Connections That Last",
      description: "Structured networking opportunities and peer exchange designed to build lasting professional relationships.",
    },
  ];

  return (
    <Section bg={C.white} style={{ padding: "64px 0" }}>
      <FadeIn>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.oxfordGold, fontFamily: F.body, marginBottom: 8 }}>Beyond the Programme</div>
        <h3 style={{ fontSize: 36, fontWeight: 700, color: C.deepBlue, fontFamily: F.display, margin: "0 0 12px", lineHeight: 1.25 }}>More Than Sessions</h3>
        <p style={{ fontSize: 15, color: C.cool60, lineHeight: 1.7, marginBottom: 32, maxWidth: 640, fontFamily: F.body }}>Designed so that the right people find each other — not by accident, but by architecture.</p>
      </FadeIn>
      <div style={{ display: "flex", gap: 16, marginBottom: 32, borderBottom: `1px solid ${C.cool20}` }}>
        {tabs.map((tab, i) => (
          <button key={i} onClick={() => setActiveTab(i)} style={{ padding: "16px 0", fontSize: 14, fontWeight: 500, color: activeTab === i ? C.deepBlue : C.cool60, background: "none", border: "none", borderBottom: activeTab === i ? `3px solid ${C.brightBlue}` : "none", cursor: "pointer", fontFamily: F.body, transition: "all 0.3s" }}>
            {tab.label}
          </button>
        ))}
      </div>
      <div style={{ padding: "32px", background: C.cool10, borderRadius: 4, borderLeft: `4px solid ${C.brightBlue}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 4, background: C.brightBlue, display: "flex", alignItems: "center", justifyContent: "center" }}>✨</div>
          <h4 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: C.deepBlue, fontFamily: F.display }}>{tabs[activeTab].label}</h4>
        </div>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: C.cool60, fontFamily: F.body }}>{tabs[activeTab].description}</p>
      </div>
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

  // Helper function to get user's timezone
  const getUserTimezone = () => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (e) {
      return 'User Time';
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

        // Show event timezone in parentheses and user timezone
        const timezoneLabel = timezone ? `(${timezone})` : '';
        const userTZ = getUserTimezone();

        return {
          day: dayName,
          date: dateStr,
          color: colors[idx % colors.length],
          sessions: day.sessions.map((s) => ({
            time: `${formatTimeInTimezone(s.start_time, timezone)} – ${formatTimeInTimezone(s.end_time, timezone)} ${timezoneLabel}`,
            userTime: `${formatTimeInTimezone(s.start_time, userTZ)} – ${formatTimeInTimezone(s.end_time, userTZ)} (${userTZ})`,
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
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.oxfordGold, fontFamily: F.body, marginBottom: 8 }}>At A Glance</div>
        <h3 style={{ fontSize: 36, fontWeight: 700, color: C.deepBlue, fontFamily: F.display, margin: "0 0 12px", lineHeight: 1.25 }}>{days.length} days, one trajectory.</h3>
      </FadeIn>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${gridCols}, 1fr)`, gap: 20, marginTop: 32 }}>
        {days.map((d, i) => (
          <FadeIn key={i} delay={i * 0.1}>
            <div style={{ padding: "24px", border: `1px solid ${C.cool20}`, borderTop: `4px solid ${d.color}`, borderRadius: 4, background: C.white }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.deepBlue, fontFamily: F.display, marginBottom: 2 }}>{d.day}</div>
                <div style={{ fontSize: 11, color: C.cool60, fontFamily: F.body, letterSpacing: "0.05em", textTransform: "uppercase" }}>{d.date}</div>
              </div>
              {d.sessions.map((s, j) => (
                <div key={j} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: C.cool60, fontFamily: F.body }}>{s.time}</div>
                  <div style={{ fontSize: 11, color: C.cool60, fontFamily: F.body, marginTop: 2 }}>{s.userTime}</div>
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

// 8. OXFORD EXPERIENCE
function OxfordExperience() {
  const activities = [
    { title: "College Dinner", img: dinnerImg },
    { title: "Punting on the Cherwell", img: puntingImg },
    { title: "BBQ Reception", img: bbqImg },
  ];

  return (
    <Section bg={C.cool10} style={{ padding: "64px 0" }} id="experience">
      <FadeIn>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: C.oxfordGold,
            fontFamily: F.body,
            marginBottom: 8,
          }}
        >
          The Oxford Experience
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
          More than sessions.
        </h3>
        <p
          style={{
            fontSize: 15,
            color: C.cool60,
            lineHeight: 1.7,
            marginBottom: 36,
            maxWidth: 640,
            fontFamily: F.body,
          }}
        >
          Conversations extend far beyond the seminar room. Evening receptions, formal dinners, and traditional college
          experiences create space for deeper engagement.
        </p>
      </FadeIn>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
        {activities.map((a, i) => (
          <FadeIn key={i} delay={i * 0.1}>
            <div style={{ height: 280, borderRadius: 4, overflow: "hidden", position: "relative" }}>
              <img
                src={a.img}
                alt={a.title}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "linear-gradient(to top, rgba(40,77,97,0.9) 0%, rgba(40,77,97,0) 50%)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-end",
                  padding: 20,
                }}
              >
                <div style={{ fontFamily: F.display, fontSize: 18, fontWeight: 700, color: C.white }}>
                  {a.title}
                </div>
              </div>
            </div>
          </FadeIn>
        ))}
      </div>
    </Section>
  );
}

// 9. ABOUT - ORGANISED IN PARTNERSHIP
function About() {
  return (
    <Section bg={C.white} style={{ padding: "64px 0" }}>
      <FadeIn>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.oxfordGold, fontFamily: F.body, marginBottom: 8 }}>About the Symposium</div>
        <h3 style={{ fontSize: 36, fontWeight: 700, color: C.deepBlue, fontFamily: F.display, margin: "0 0 12px", lineHeight: 1.25 }}>Organised in Partnership</h3>
        <p style={{ fontFamily: F.body, fontSize: 15, lineHeight: 1.7, color: C.cool60, margin: "0 0 36px", maxWidth: 700 }}>Organised in partnership by Jesus College at Oxford University with the Institute for Mergers, Acquisitions and Alliances (IMAA) and Bancor International Limited, the Symposium brings together senior dealmakers, sovereign wealth principals, defence and technology leaders, corporate strategists, and leading international academic faculty for four days of rigorous dialogue, case discussions, and high-level peer exchange culminating in a College Dinner.</p>
      </FadeIn>
      <FadeIn delay={0.1}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0, border: `1px solid ${C.cool20}`, borderRadius: 4, overflow: "hidden" }}>
          {[
            { name: "Jesus College", sub: "Oxford University", logo: jesuCollegeLogo },
            { name: "IMAA", sub: "Institute for Mergers, Acquisitions & Alliances", logo: imaaLogo },
            { name: "Bancor International", sub: "Limited", logo: bancorLogo },
          ].map((p, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 24px", background: C.white, borderRight: i < 2 ? `1px solid ${C.cool20}` : "none", textAlign: "center" }}>
              <img src={p.logo} alt={p.name} style={{ height: 50, marginBottom: 14, objectFit: "contain" }} />
              <div style={{ fontFamily: F.display, fontSize: 16, fontWeight: 700, color: C.deepBlue, marginBottom: 2 }}>{p.name}</div>
              {p.sub && <div style={{ fontFamily: F.body, fontSize: 11, color: C.cool50, lineHeight: 1.4 }}>{p.sub}</div>}
            </div>
          ))}
        </div>
      </FadeIn>
    </Section>
  );
}

// 10. CTA & APPLY
function FinalCTA({ onApplyClick, eventData = {} }) {
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 40, marginBottom: 40, paddingBottom: 40, borderBottom: `1px solid ${C.cool20}` }}>
          {[{ name: "Jesus College", sub: "Oxford University" }, { name: "IMAA", sub: "Institute for Mergers, Acquisitions & Alliances" }, { name: "Bancor International", sub: "" }].map((p, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ fontFamily: F.display, fontSize: 14, fontWeight: 700, color: C.white, marginBottom: 2 }}>{p.name}</div>
              {p.sub && <div style={{ fontFamily: F.body, fontSize: 11, color: C.cool60 }}>{p.sub}</div>}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: C.cool60, fontFamily: F.body }}>© 2026 Oxford M&A Symposium</span>
          <div style={{ display: "flex", gap: 20 }}>
            {["Privacy Policy", "Terms", "Imprint"].map((t) => (
              <span key={t} style={{ fontSize: 11, color: C.cool60, cursor: "pointer", fontFamily: F.body, transition: "color 0.3s", "&:hover": { color: C.white } }}>
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

// 12. APPLY DIALOG
function ApplyDialog({ open, onClose }) {
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    company_name: "",
    job_title: "",
    linkedin_url: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // First, try to find the Oxford event by slug, then fallback to ID
      const eventIdOrSlug = "oxford-m-a-symposium-2026"; // Will be updated with actual event ID
      const response = await fetch(`/api/events/${eventIdOrSlug}/apply/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Application submission failed");
      }

      setSuccess(true);
      setTimeout(() => {
        setFormData({ first_name: "", last_name: "", email: "", company_name: "", job_title: "", linkedin_url: "" });
        setSuccess(false);
        onClose();
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontFamily: F.display, fontWeight: 700, color: C.deepBlue, fontSize: 24 }}>
        Register Your Interest
      </DialogTitle>
      <DialogContent>
        {success ? (
          <Alert severity="success" sx={{ mt: 2 }}>
            Thank you! Your application has been received. We will be in touch shortly.
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 16 }}>
            <TextField
              label="First Name"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              fullWidth
              required
              size="small"
            />
            <TextField
              label="Last Name"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              fullWidth
              required
              size="small"
            />
            <TextField
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              fullWidth
              required
              size="small"
            />
            <TextField
              label="Company/Organisation"
              name="company_name"
              value={formData.company_name}
              onChange={handleChange}
              fullWidth
              size="small"
            />
            <TextField
              label="Role/Title"
              name="job_title"
              value={formData.job_title}
              onChange={handleChange}
              fullWidth
              size="small"
            />
            <TextField
              label="LinkedIn Profile (Optional)"
              name="linkedin_url"
              type="url"
              value={formData.linkedin_url}
              onChange={handleChange}
              fullWidth
              size="small"
            />
            {error && <Alert severity="error">{error}</Alert>}
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              sx={{
                background: C.coral,
                color: C.white,
                fontFamily: F.body,
                fontWeight: 700,
                mt: 2,
              }}
            >
              {loading ? <CircularProgress size={20} /> : "Submit Application"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// MAIN COMPONENT
export default function OxfordSymposium2026() {
  const { slug } = useParams();
  const [applyOpen, setApplyOpen] = useState(false);
  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  return (
    <div style={{ fontFamily: F.body, WebkitFontSmoothing: "antialiased" }}>
      <Hero onApplyClick={() => setApplyOpen(true)} eventData={eventData} />
      <PositioningStatement />
      <Speakers eventData={eventData} />
      <Themes />
      <MoreThanSessions />
      <OxfordExperience />
      <Programme eventData={eventData} />
      <About />
      <FinalCTA onApplyClick={() => setApplyOpen(true)} eventData={eventData} />
      <Footer />
      <ApplyDialog open={applyOpen} onClose={() => setApplyOpen(false)} />
    </div>
  );
}
