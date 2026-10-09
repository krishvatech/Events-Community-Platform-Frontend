// src/pages/DashboardPage.jsx
// Redesigned to match imaa-connect-v3 reference
import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "#navigation";
import { apiClient } from "../utils/api";
import { Badge, Box } from "@mui/material";
import {
  Search as SearchIcon,
  NotificationsRounded as NotifIcon,
  ChatBubbleRounded as MsgIcon,
  Language as GlobeIcon,
  EventNote as EventNoteIcon,
  PeopleAlt as PeopleIcon,
  // School as SchoolIcon,
  // LibraryBooks as LibraryIcon,
  Shield as ShieldIcon,
  ChevronRight as ChevronIcon,
} from "@mui/icons-material";
import { isOwnerUser, isStaffUser } from "../utils/adminRole";

// Brand hex values (identical to the --imaa-* tokens). Kept as hex because they are combined with
// alpha suffixes (e.g. `${O}15`). Surfaces, borders and text use the CSS tokens below.
const O = "#E8532F";
const N = "#1B2A4A";
const T = "#0A9396";
// const P = "#7B2D8E"; // COMMENTED OUT - used only in commented Community section
// const G = "#D4920B"; // COMMENTED OUT - used only in commented Community section
const BG = "var(--imaa-bg-member)"; // member page surface (was cream #FAF9F7)
const BORDER = "var(--imaa-border)";
const FONT = "var(--imaa-font-sans)"; // Inter (design token in src/styles/brand.css)
const SERIF = "var(--imaa-font-serif)"; // Source Serif 4 for page/section headings
const INK = "var(--imaa-ink)";
const INK_BODY = "var(--imaa-ink-body)"; // secondary text that meets AA contrast
const ORANGE_DARK = "var(--imaa-orange-hover)"; // white text on it meets AA (plain orange does not)
const TEAL_DARK = "var(--imaa-teal-hover)"; // AA as text, and white text on it meets AA
const TEAL_DARK_TEXT = "var(--imaa-dm-teal-text, var(--imaa-teal-hover))"; // as text: readable variant in dark mode
const CARD_RADIUS = "var(--imaa-radius-card)";
const FIELD_RADIUS = "var(--imaa-radius-field)";
const PAGE_PX = { xs: 2, sm: 3, md: 5 }; // 16 / 24 / 40px side padding
// Events grid: 1 column on phones, 2 on tablets, 3 from lg (room for the member sidebar)
const EVENT_GRID_COLUMNS = { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(3, minmax(0, 1fr))" };

// Local SVG placeholder — works even when external images are blocked on staging
const PLACEHOLDER_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='400'%3E%3Crect width='800' height='400' fill='%23F5F4F2'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='28' fill='%23C0BAB4'%3EEvent%3C/text%3E%3C/svg%3E";

// Recovered verbatim from the pre-M2 Dashboard (99e0711). This is a separate,
// approved Dashboard feature -- it is not a substitute for landing API events.
const STATIC_FEATURED_EVENT = {
  id: "evt-1",
  title: "The Annual M&A Summit",
  description: "Industry leaders gather to discuss the latest M&A trends and deal-making innovations.",
  start_date: null,
  location: "New York, NY",
  event_type: "Conference",
  image_url: "https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&q=80",
};

const STATIC_DISCUSSIONS = [
  { id: 1, title: "Best practices for cross-border M&A due diligence", views: 284, comments_count: 14, reactions_count: 32, emoji: "🌐" },
  { id: 2, title: "How are you valuing tech targets in 2025?", views: 195, comments_count: 9, reactions_count: 28, emoji: "💻" },
  { id: 3, title: "Post-merger integration challenges — share your experience", views: 152, comments_count: 22, reactions_count: 41, emoji: "🔗" },
];

const STATIC_GROUPS = [
  { id: 1, name: "M&A Deal Professionals", members: 480, color: "#E8532F", icon: "🤝" },
  { id: 2, name: "Corporate Development Leaders", members: 312, color: "#0A9396", icon: "🏢" },
  { id: 3, name: "Private Equity Network", members: 275, color: "#7B2D8E", icon: "📈" },
];

const EVENT_ACCENT = { Conference: "#E8532F", Webinar: "#0A9396", Workshop: "#D4920B", Networking: "#7B2D8E", Seminar: "#1B2A4A" };
const getAccent = (type) => EVENT_ACCENT[type] || "#E8532F";

function resolveAvatar(user) {
  const raw = user?.profile?.user_image || user?.profile?.user_image_url || user?.avatar || user?.user_image || "";
  if (!raw) return "";
  if (raw.startsWith("http") || raw.startsWith("blob:")) return raw;
  const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
  return raw.startsWith("/") ? `${base}${raw}` : `${base}/${raw}`;
}

function getEventLocation(event) {
  // For virtual and hybrid events, show "Virtual live" instead of physical location
  if (event?.format === "virtual" || event?.format === "hybrid") {
    return "Virtual live";
  }
  return event?.location || event?.location_city || event?.location_country || "";
}

function getEventStartValue(event) {
  return event?.start_time || event?.start_date || event?.date || null;
}

function getEventType(event) {
  return event?.event_type || event?.category || event?.format || "Event";
}

function getEventHref(event) {
  const key = event?.slug || event?.id || "";
  return key ? `/events/${key}` : "/events";
}

function isStaticFeaturedEvent(event) {
  const featuredId = String(STATIC_FEATURED_EVENT.id);
  if (event?.id != null && String(event.id) === featuredId) return true;

  // A matching canonical destination is also safe. Do not deduplicate by title.
  const eventKey = event?.slug || event?.id;
  return Boolean(eventKey && getEventHref(event) === getEventHref(STATIC_FEATURED_EVENT));
}

// Dashboard-only event copy: prefer an API-provided short field, then derive a
// readable preview from the real description without mutating the event data.
function getEventPreview(event, limit = 280) {
  const source = [event?.excerpt, event?.summary, event?.short_description, event?.description, event?.desc, event?.content]
    .find((value) => typeof value === "string" && value.trim());
  if (!source) return "";

  // Render as text only. DOMParser also decodes entities; the fallback keeps
  // this client-only legacy page safe if the DOM is unavailable during tooling.
  const text = typeof DOMParser !== "undefined"
    ? new DOMParser().parseFromString(source, "text/html").body.textContent || ""
    : source.replace(/<[^>]*>/g, " ");
  const normalized = text
    .replace(/https?:\/\/[^\s]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (normalized.length <= limit) return normalized;

  const boundary = normalized.lastIndexOf(" ", limit - 1);
  return `${normalized.slice(0, boundary > 0 ? boundary : limit).trimEnd()}…`;
}

// ── FadeIn Animation ─────────────────────────────────────────────────────────
function FadeIn({ children, delay = 0 }) {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Fallback: force visible after delay + 800ms in case observer never fires
    // (can happen when element has no height yet or inside a scrollable container)
    const fallback = setTimeout(() => setVis(true), delay + 800);
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { clearTimeout(fallback); setVis(true); obs.disconnect(); } },
      { threshold: 0, rootMargin: "0px 0px 100px 0px" }
    );
    obs.observe(el);
    return () => { obs.disconnect(); clearTimeout(fallback); };
  }, [delay]);
  return (
    <Box ref={ref} sx={{
      opacity: vis ? 1 : 0,
      transform: vis ? "translateY(0)" : "translateY(16px)",
      transition: `opacity 0.5s ${delay}ms ease, transform 0.5s ${delay}ms ease`,
      // Reduced motion: content is shown straight away, without the fade/slide
      "@media (prefers-reduced-motion: reduce)": { opacity: 1, transform: "none", transition: "none" },
    }}>
      {children}
    </Box>
  );
}

// ── Internal Topbar ───────────────────────────────────────────────────────────
function DashTopbar({ notifCount, messageCount, isAdmin }) {
  const navigate = useNavigate();
  const isOwner = isOwnerUser();
  const isStaff = isStaffUser();

  const handleMessagesClick = () => {
    if (isOwner || isStaff) {
      navigate("/admin/messages");
    } else {
      navigate("/community?view=messages");
    }
  };

  const handleNotificationsClick = () => {
    if (isOwner) {
      navigate("/admin/notifications");
    } else {
      navigate("/community?view=notify");
    }
  };

  return (
    <Box sx={{
      minHeight: 50, bgcolor: "var(--imaa-dm-surface, #fff)", borderBottom: `1px solid ${BORDER}`,
      display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: 2, rowGap: 1,
      px: { xs: 2, md: 3.5 }, py: 1,
      // Sticky on desktop. Below md it scrolls with the page, so it never sits under the shell's
      // fixed menu button (AppChrome shows that button below md).
      position: { xs: "static", md: "sticky" }, top: 0, zIndex: 100, fontFamily: FONT,
    }}>
      <Box sx={{ order: 1, display: "flex", alignItems: "center", gap: 0.75, flexShrink: 0 }}>
        <span style={{ fontSize: 12, color: INK_BODY, fontWeight: 500 }}>Home</span>
        <ChevronIcon sx={{ fontSize: 14, color: INK_BODY }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: INK }}>Dashboard</span>
      </Box>
      {/* Search field: visual only (no search behaviour is wired up). Full-width row on phones. */}
      <Box sx={{
        order: { xs: 3, md: 2 }, flex: { xs: "1 1 100%", md: "1 1 auto" }, maxWidth: { md: 360 }, minWidth: 0,
        height: 34, bgcolor: BG, border: `1px solid ${BORDER}`, borderRadius: FIELD_RADIUS,
        display: "flex", alignItems: "center", gap: 1, px: 1.5,
        // The input hides its own outline (inline style), so keyboard focus is shown on the field
        "&:focus-within": { outline: "var(--imaa-focus-width) solid var(--imaa-focus-color)", outlineOffset: "1px" },
      }}>
        <SearchIcon sx={{ fontSize: 16, color: INK_BODY }} />
        <Box
          component="input"
          aria-label="Search events, people, resources"
          placeholder="Search events, people, resources…"
          style={{ outline: "none" }}
          sx={{
            flex: 1, minWidth: 0, border: "none", background: "transparent",
            fontSize: { xs: 16, md: 13 }, color: INK, fontFamily: FONT,
            "&::placeholder": { color: INK_BODY, opacity: 1 },
          }}
        />
      </Box>
      <Box sx={{ order: { xs: 2, md: 3 }, display: "flex", alignItems: "center", gap: 1, ml: "auto" }}>
        <Box
          component="button"
          type="button"
          aria-label="Messages"
          onClick={handleMessagesClick}
          sx={iconButtonSx}
        >
          <Badge badgeContent={messageCount || 0} color="error" sx={{ "& .MuiBadge-badge": { fontSize: 9, height: 14, minWidth: 14, padding: "0 3px" } }}>
            <MsgIcon sx={{ fontSize: 17, color: INK_BODY }} />
          </Badge>
        </Box>
        <Box
          component="button"
          type="button"
          aria-label="Notifications"
          onClick={handleNotificationsClick}
          sx={iconButtonSx}
        >
          <Badge badgeContent={notifCount || 0} color="error" sx={{ "& .MuiBadge-badge": { fontSize: 9, height: 14, minWidth: 14, padding: "0 3px" } }}>
            <NotifIcon sx={{ fontSize: 17, color: INK_BODY }} />
          </Badge>
        </Box>
        {isAdmin ? (
          <Box
            component="button"
            type="button"
            onClick={() => navigate("/admin/events")}
            sx={{ ...topActionSx, bgcolor: ORANGE_DARK }}
          >
            + Post Event
          </Box>
        ) : (
          <Box
            component="button"
            type="button"
            onClick={() => navigate("/events")}
            sx={{ ...topActionSx, bgcolor: N }}
          >
            Explore Events
          </Box>
        )}
      </Box>
    </Box>
  );
}

const iconButtonSx = {
  bgcolor: BG, border: `1px solid ${BORDER}`, borderRadius: FIELD_RADIUS, width: 34, height: 34, p: 0,
  display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
  "&:hover": { bgcolor: "var(--imaa-bg-cool)" },
};

const topActionSx = {
  height: 34, px: 2, color: "#fff", border: "none", borderRadius: FIELD_RADIUS,
  fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT, whiteSpace: "nowrap",
  "&:hover": { filter: "brightness(0.92)" },
};

// ── Shared look for the notice banners (profile, verification, pending forms) ──
// Flat white surface, token border, coloured left edge (was a tinted gradient). Wraps on phones.
const bannerSx = (accent, hasDismiss) => ({
  position: "relative", bgcolor: "var(--imaa-dm-surface, #fff)",
  border: `1px solid ${BORDER}`, borderLeft: `4px solid ${accent}`, borderRadius: CARD_RADIUS,
  boxShadow: "var(--imaa-shadow-sm)",
  py: 1.75, pl: { xs: 2, sm: 2.5 }, pr: hasDismiss ? { xs: 5, sm: 6 } : { xs: 2, sm: 2.5 },
  display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2, fontFamily: FONT,
});
// Icon/ring + text stay on one row; the call-to-action wraps below them when space runs out
const bannerBodySx = { display: "flex", alignItems: "center", gap: 2, flex: "1 1 260px", minWidth: 0 };
const bannerTitleSx = { fontSize: 13, fontWeight: 700, color: INK, mb: 0.25, fontFamily: FONT };
const bannerTextSx = { fontSize: 12, color: INK_BODY, lineHeight: 1.5, fontFamily: FONT };
const bannerCtaSx = (bg) => ({
  display: "inline-block", fontSize: 12, fontWeight: 700, color: "#fff", bgcolor: bg, textDecoration: "none",
  whiteSpace: "nowrap", px: 1.75, py: 0.75, borderRadius: FIELD_RADIUS, border: "none", cursor: "pointer",
  fontFamily: FONT, "&:hover": { filter: "brightness(0.92)" },
});
const dismissSx = {
  position: "absolute", top: 8, right: 8, width: 28, height: 28, p: 0,
  display: "flex", alignItems: "center", justifyContent: "center",
  background: "none", border: "none", borderRadius: FIELD_RADIUS, cursor: "pointer",
  fontSize: 18, color: INK_BODY, lineHeight: 1, "&:hover": { bgcolor: "var(--imaa-bg-cool)" },
};

// ── Format missing sections into readable text ────────────────────────────────
function formatMissingSections(missing) {
  if (!missing || missing.length === 0) return "Add to your profile to stand out to M&A peers.";

  const sectionLabels = {
    bio: "bio",
    skills: "skills",
    experience: "experience",
    education: "education",
    certifications: "certifications",
    memberships: "memberships",
    email: "email",
    phone: "phone numbers",
    social_links: "social links",
    websites: "websites",
  };

  const labels = missing.map(s => sectionLabels[s] || s).filter(Boolean);

  if (labels.length === 0) return "Add to your profile to stand out to M&A peers.";
  if (labels.length === 1) {
    return `Add your ${labels[0]} to stand out to M&A peers.`;
  } else if (labels.length === 2) {
    return `Add your ${labels[0]} and ${labels[1]} to stand out to M&A peers.`;
  } else {
    const lastLabel = labels.pop();
    return `Add your ${labels.join(", ")}, and ${lastLabel} to stand out to M&A peers.`;
  }
}

// ── Profile Completion Banner ─────────────────────────────────────────────────
function ProfileBanner({ completion, onDismiss, profile }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const filled = circ * (completion / 100);
  const gap = circ - filled;
  const missing = profile?.missing_sections || [];
  const helperText = formatMissingSections(missing);

  return (
    <Box sx={{ ...bannerSx(O, true), mx: PAGE_PX, mb: 1.75 }}>
      <Box sx={bannerBodySx}>
        <svg width="52" height="52" style={{ flexShrink: 0 }} role="img" aria-label={`Profile ${completion}% complete`}>
          <circle cx="26" cy="26" r={r} fill="none" stroke={`${O}20`} strokeWidth="3" />
          <circle cx="26" cy="26" r={r} fill="none" stroke={O} strokeWidth="3"
            strokeDasharray={`${filled} ${gap}`} strokeLinecap="round"
            transform="rotate(-90 26 26)" />
          {/* Darker orange so the percentage meets AA contrast */}
          <text x="26" y="31" textAnchor="middle" fontSize="11" fontWeight="800" style={{ fill: ORANGE_DARK }} fontFamily={FONT}>
            {completion}%
          </text>
        </svg>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={bannerTitleSx}>Complete your profile</Box>
          <Box sx={bannerTextSx}>
            {helperText}
          </Box>
        </Box>
      </Box>
      <Box component="a" href="/account/profile" sx={bannerCtaSx(ORANGE_DARK)}>
        Update Profile →
      </Box>
      <Box component="button" type="button" onClick={onDismiss} aria-label="Dismiss profile completion reminder" sx={dismissSx}>
        ×
      </Box>
    </Box>
  );
}

// ── Verify Identity Banner ────────────────────────────────────────────────────
function VerifyBanner({ onDismiss }) {
  return (
    <Box sx={{ ...bannerSx(T, true), mx: PAGE_PX, mb: 2.5 }}>
      <Box sx={bannerBodySx}>
        <Box aria-hidden="true" sx={{
          width: 48, height: 48, borderRadius: CARD_RADIUS, bgcolor: `${T}15`,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <ShieldIcon sx={{ color: T, fontSize: 22 }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={bannerTitleSx}>Verify your identity</Box>
          <Box sx={bannerTextSx}>
            Unlock full platform features and boost credibility with verified status.
          </Box>
        </Box>
      </Box>
      <Box component="a" href="/account/profile#verify" sx={bannerCtaSx(TEAL_DARK)}>
        Get Verified →
      </Box>
      <Box component="button" type="button" onClick={onDismiss} aria-label="Dismiss identity verification reminder" sx={dismissSx}>
        ×
      </Box>
    </Box>
  );
}

// ── Pending Forms Banner ──────────────────────────────────────────────────────
function PendingFormsBanner({ forms }) {
  const navigate = useNavigate();
  if (!forms || forms.length === 0) return null;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mx: PAGE_PX, mb: 2.5 }}>
      {forms.map((form, idx) => {
        const formTitle = form.form_template?.title || (form.form_type === 'promotional_profile' ? 'Promotional Profile' : 'Participant Information');
        const eventTitle = form.event?.title || 'Your Event';

        return (
          <Box key={form.id} sx={bannerSx(O, false)}>
            <Box sx={bannerBodySx}>
              <Box aria-hidden="true" sx={{
                width: 48, height: 48, borderRadius: CARD_RADIUS, bgcolor: `${O}15`,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <EventNoteIcon sx={{ color: O, fontSize: 22 }} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={bannerTitleSx}>Pending Form: {formTitle}</Box>
                <Box sx={bannerTextSx}>
                  {eventTitle} — Due {form.deadline ? new Date(form.deadline).toLocaleDateString() : 'soon'}
                </Box>
              </Box>
            </Box>
            <Box
              component="button"
              type="button"
              onClick={() => navigate(`/forms/${form.id}`)}
              sx={bannerCtaSx(ORANGE_DARK)}>
              Complete →
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

// ── Featured Event Hero ───────────────────────────────────────────────────────
function FeaturedHero({ event }) {
  const accent = getAccent(getEventType(event));
  const heroLabel = event?.is_featured === true ? "Featured" : (event?.is_pinned === true ? "Pinned" : "Featured");
  const imgSrc = event?.cover_image || event?.preview_image || event?.image_url || event?.image || PLACEHOLDER_IMG;
  const startValue = getEventStartValue(event);
  const dateStr = startValue
    ? new Date(startValue).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "";
  const eventLocation = getEventLocation(event);
  const href = getEventHref(event);
  const preview = getEventPreview(event);
  return (
    // The whole card is one link (unchanged destination). Two columns from lg; stacked below.
    <Box component="a" href={href} sx={{
      textDecoration: "none", color: "inherit", mb: 3,
      borderRadius: CARD_RADIUS, overflow: "hidden", border: `1px solid ${BORDER}`, bgcolor: "var(--imaa-dm-surface, #fff)",
      display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
      boxShadow: "var(--imaa-shadow-sm)", position: "relative",
      transition: "box-shadow .2s", "&:hover": { boxShadow: "var(--imaa-shadow-md)" },
    }}>
      {/* Event-type colour stripe (kept: it identifies the event type) */}
      <Box sx={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, bgcolor: accent, zIndex: 3 }} />
      <Box sx={{ p: { xs: 2.5, sm: 4 }, display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 0 }}>
        <Box component="span" sx={{
          fontSize: 11, fontWeight: 800, color: INK, bgcolor: `${accent}1A`,
          px: 1.25, py: 0.375, borderRadius: 100, display: "inline-flex", alignItems: "center", gap: 0.75, mb: 1.75,
          textTransform: "uppercase", letterSpacing: 1, width: "fit-content", fontFamily: FONT,
        }}>
          <Box component="span" aria-hidden="true" sx={{ color: accent }}>✦</Box>
          {heroLabel} — {getEventType(event)}
        </Box>
        {/* h3: the featured event sits inside the "Upcoming Events" section (h2) */}
        <Box component="h3" sx={{ fontFamily: SERIF, fontSize: { xs: 20, sm: 22 }, fontWeight: 700, color: INK, m: "0 0 10px", lineHeight: 1.3, overflowWrap: "anywhere" }}>
          {event?.title}
        </Box>
        {preview && (
          <Box component="p" sx={{ fontSize: 14, color: INK_BODY, lineHeight: 1.65, m: "0 0 16px", fontFamily: FONT, display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {preview}
          </Box>
        )}
        {(dateStr || eventLocation) && (
          <Box sx={{ fontSize: 13, color: INK_BODY, mb: 2.5, display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap", fontFamily: FONT }}>
            <EventNoteIcon sx={{ fontSize: 15, color: INK_BODY }} />
            {dateStr}{eventLocation && <> · {eventLocation}</>}
          </Box>
        )}
        {/* Navy so the white label meets AA on every event type (the coloured stripe keeps the type colour) */}
        <Box component="span" sx={{ display: "inline-block", bgcolor: N, color: "#fff", px: 2.5, py: 1.125, borderRadius: FIELD_RADIUS, fontSize: 13, fontWeight: 700, width: "fit-content", fontFamily: FONT }}>
          {event?.registration_type === 'apply' ? 'Apply Now →' : 'Register Now →'}
        </Box>
      </Box>
      <Box sx={{ height: { xs: 200, sm: 240, lg: 300 }, overflow: "hidden", order: { xs: -1, lg: 0 } }}>
          <img src={imgSrc} alt={event?.title || "Event"}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e) => {
              if (!e.target.dataset.err) {
                e.target.dataset.err = "1";
                e.target.src = PLACEHOLDER_IMG;
              } else if (e.target.dataset.err === "1") {
                e.target.dataset.err = "2";
                e.target.src = PLACEHOLDER_IMG;
              }
            }}
          />
      </Box>
    </Box>
  );
}

// ── Event Card (grid) ─────────────────────────────────────────────────────────
function DashEventCard({ event, index }) {
  const accent = getAccent(getEventType(event));
  const imgSrc = event?.cover_image || event?.preview_image || event?.image_url || event?.image || PLACEHOLDER_IMG;
  const startValue = getEventStartValue(event);
  const dateStr = startValue
    ? new Date(startValue).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "";
  const eventLocation = getEventLocation(event);
  const href = getEventHref(event);
  return (
    // One link per card (unchanged destination). Hover is CSS now (was JS style mutation).
    <Box component="a" href={href} sx={{
      textDecoration: "none", color: "inherit",
      borderRadius: CARD_RADIUS, overflow: "hidden", border: `1px solid ${BORDER}`, bgcolor: "var(--imaa-dm-surface, #fff)",
      boxShadow: "var(--imaa-shadow-sm)", cursor: "pointer", position: "relative",
      transition: "box-shadow .2s, border-color .2s", display: "flex", flexDirection: "column", minHeight: 0,
      "&:hover": { boxShadow: "var(--imaa-shadow-md)", borderColor: `${accent}50` },
    }}>
        {/* Event-type colour stripe (kept: it identifies the event type) */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accent, zIndex: 2 }} />
        <div style={{ height: 152, overflow: "hidden", flexShrink: 0 }}>
          <img src={imgSrc} alt={event?.title || "Event"}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e) => {
              if (!e.target.dataset.err) {
                e.target.dataset.err = "1";
                e.target.src = PLACEHOLDER_IMG;
              } else if (e.target.dataset.err === "1") {
                e.target.dataset.err = "2";
                e.target.src = PLACEHOLDER_IMG;
              }
            }}
          />
        </div>
        <div style={{ padding: "14px 16px 18px", fontFamily: FONT, flex: 1, display: "flex", flexDirection: "column" }}>
          {(dateStr || getEventType(event)) && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
              {/* Date in ink (accent-coloured small text was below AA contrast) */}
              {dateStr && <span style={{ fontSize: 12, fontWeight: 700, color: INK, textTransform: "uppercase", letterSpacing: 0.5 }}>{dateStr}</span>}
              {getEventType(event) && <span style={{ fontSize: 11, color: INK_BODY, background: "var(--imaa-bg-cool)", padding: "2px 6px", borderRadius: 4 }}>{getEventType(event)}</span>}
            </div>
          )}
          <h3 style={{ fontSize: 15, fontWeight: 700, color: INK, margin: "0 0 4px", lineHeight: 1.35, fontFamily: SERIF, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {event?.title}
          </h3>
          <div style={{ marginTop: "auto" }}>
            {eventLocation && <div style={{ fontSize: 12, color: INK_BODY, marginTop: 4 }}><span aria-hidden="true">📍</span> {eventLocation}</div>}
          </div>
        </div>
    </Box>
  );
}

// ── Discussion Row ──────────────────────────────────────────────────────────── [COMMENTED OUT - will restore with community section]
/*
function DiscRow({ d, index }) {
  const accents = [P, O, T, G];
  const accent = accents[index % accents.length];
  return (
    <div style={{ display: "flex", gap: 12, padding: "14px 0", borderBottom: `1px solid ${BORDER}` }}>
      <div style={{ width: 34, height: 34, borderRadius: 8, background: `${accent}14`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 15 }}>
        {d.emoji || "💬"}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <a href={d.url || "/community?view=feed"}
          style={{ fontSize: 13, fontWeight: 600, color: INK, textDecoration: "none", lineHeight: 1.4, display: "block", marginBottom: 6, fontFamily: FONT }}>
          {d.title || (d.content ? d.content.substring(0, 80) + (d.content.length > 80 ? "…" : "") : "Discussion")}
        </a>
        <div style={{ display: "flex", gap: 14 }}>
          <span style={{ fontSize: 11, color: "#AAA", fontFamily: FONT }}>👁 {d.views || 0}</span>
          <span style={{ fontSize: 11, color: "#AAA", fontFamily: FONT }}>💬 {d.comments_count || d.replies || 0}</span>
          <span style={{ fontSize: 11, color: "#AAA", fontFamily: FONT }}>❤️ {d.reactions_count || d.likes || 0}</span>
        </div>
      </div>
    </div>
  );
}
*/

// ── Group Row ─────────────────────────────────────────────────────────────────  [COMMENTED OUT - will restore with community section]
/*
function GroupRow({ g }) {
  return (
    <a href={`/community/groups/${g.id}/`} style={{ textDecoration: "none" }}>
      <div
        style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 10px", borderRadius: 10, marginBottom: 4, cursor: "pointer", transition: "background .15s" }}
        onMouseEnter={e => { e.currentTarget.style.background = BG; }}
        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
      >
        <div style={{ width: 38, height: 38, borderRadius: 9, background: `${g.color || O}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 16 }}>
          {g.icon || "👥"}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: INK, lineHeight: 1.3, fontFamily: FONT }}>{g.name}</div>
          <div style={{ fontSize: 11, color: "#AAA", marginTop: 1, fontFamily: FONT }}>{g.members_count || g.members || 0} members</div>
        </div>
        <ChevronIcon sx={{ fontSize: 14, color: "#C0BAB4" }} />
      </div>
    </a>
  );
}
*/

// ── USP Strip ─────────────────────────────────────────────────────────────────
const USP_ITEMS = [
  { value: "4,000+", label: "Members", Icon: PeopleIcon, color: O },
  { value: "100+", label: "Countries", Icon: GlobeIcon, color: T },
  // { value: "500+", label: "Events / Year", Icon: EventNoteIcon, color: P },
  // { value: "50+", label: "Courses & Certs", Icon: SchoolIcon, color: G },
  // { value: "10K+", label: "Resources", Icon: LibraryIcon, color: "#6EC1E4" },
];

function USPStrip() {
  return (
    <Box sx={{ bgcolor: N, py: 4.5, px: PAGE_PX, display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: 3, fontFamily: FONT }}>
      {USP_ITEMS.map(({ value, label, Icon, color }) => (
        <div key={label} style={{ textAlign: "center", minWidth: 100 }}>
          <div aria-hidden="true" style={{ width: 44, height: 44, borderRadius: 8, background: `${color}22`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px", border: `1px solid ${color}30` }}>
            <Icon sx={{ color, fontSize: 20 }} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.01em", fontFamily: FONT }}>{value}</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.75)", marginTop: 3, fontFamily: FONT }}>{label}</div>
        </div>
      ))}
    </Box>
  );
}

// ── Footer CTA ────────────────────────────────────────────────────────────────
// Flat navy (gradient retired). Darker teal/orange button fills so the white labels meet AA.
const footerHeadingSx = { m: "0 0 10px", fontFamily: SERIF, fontSize: { xs: 22, sm: 26 }, fontWeight: 700, color: "#fff", lineHeight: 1.25 };
const footerTextSx = { fontSize: 14, color: "rgba(255,255,255,.75)", maxWidth: 460, m: "0 auto 28px", lineHeight: 1.65, fontFamily: FONT };
const footerButtonSx = (bg) => ({
  display: "inline-block", bgcolor: bg, color: "#fff", px: { xs: 3, sm: 3.75 }, py: 1.625, borderRadius: CARD_RADIUS,
  fontSize: 14, fontWeight: 700, textDecoration: "none", fontFamily: FONT, "&:hover": { filter: "brightness(0.92)" },
});

function FooterCTA({ isMember }) {
  return (
    <Box sx={{ bgcolor: N, py: { xs: 5, md: 6.5 }, px: PAGE_PX, textAlign: "center", fontFamily: FONT }}>
      {isMember ? (
        <>
          <Box component="h2" sx={footerHeadingSx}>Grow the IMAA Community</Box>
          <Box sx={footerTextSx}>
            Help your colleagues find the world's largest M&A network. Invite them to join today.
          </Box>
          <Box component="a" href="mailto:?subject=Join%20IMAA%20Connect&body=I%20wanted%20to%20share%20this%20great%20network%20with%20you%3A%20https%3A%2F%2Fconnect.imaa-institute.org"
            sx={footerButtonSx(TEAL_DARK)}>
            Invite a Colleague →
          </Box>
        </>
      ) : (
        <>
          <Box component="h2" sx={footerHeadingSx}>Unlock Full IMAA Membership</Box>
          <Box sx={footerTextSx}>
            Access unlimited events, certifications, the E-Library, and the complete IMAA professional network.
          </Box>
          <Box component="a" href="https://imaa-institute.org/membership" target="_blank" rel="noopener noreferrer"
            sx={footerButtonSx(ORANGE_DARK)}>
            Upgrade to Membership →
          </Box>
        </>
      )}
    </Box>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  // const [discussions, setDiscussions] = useState([]); // COMMENTED OUT - will restore when community section is re-enabled
  // const [groups, setGroups] = useState([]); // COMMENTED OUT - will restore when community section is re-enabled
  const [loading, setLoading] = useState(true);
  const [showProfileBanner, setShowProfileBanner] = useState(true);
  const [showVerifyBanner, setShowVerifyBanner] = useState(true);
  const [pendingForms, setPendingForms] = useState([]);
  const isAdminUser = isOwnerUser() || isStaffUser();

  useEffect(() => {
    let active = true;
    Promise.all([
      apiClient.get("/users/me/").then(r => r.data).catch(() => null),
      apiClient.get("/events/landing/").then(r => r.data).catch(() => ({ hero_event: null, upcoming_events: [] })),
      apiClient.get("/post-acceptance-form-assignments/my/").then(r => {
        const d = r.data; return Array.isArray(d) ? d : (d?.results || []);
      }).catch(() => []),
    ]).then(([userData, eventsData, formsData]) => {
      if (!active) return;
      setUser(userData);

      setEvents(Array.isArray(eventsData?.upcoming_events) ? eventsData.upcoming_events.slice(0, 10) : []);

      setPendingForms(formsData); // Show all pending forms
      setLoading(false);
    });

    return () => { active = false; };
  }, []);

  const profile = user?.profile || {};
  const kycApproved = profile.kyc_status === "approved";
  const profileCompletion = profile.profile_completion_percentage ?? 0;
  const firstName = user?.first_name || user?.username || "there";
  const isMember = profile.is_member || user?.is_member || false;
  // Sort real grid events: pinned first, then upcoming by start time.
  const sortGridEvents = (eventList, excludeEvent) => {
    // Exclude featured/hero event only. Keep other real pinned events in the grid.
    const excludeKey = excludeEvent?.id || excludeEvent?.slug;
    const filtered = [...eventList].filter(e => {
      const eventKey = e?.id || e?.slug;
      return !excludeKey || eventKey !== excludeKey;
    });

    // Sort by: pinned DESC > pin_priority ASC > pinned_at DESC > start date ASC
    return filtered.sort((a, b) => {
      // Pinned events first
      const aPinned = a.is_pinned === true ? 1 : 0;
      const bPinned = b.is_pinned === true ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;

      // Within pinned: lower pin_priority first
      if (aPinned && bPinned) {
        const aPriority = Number.isFinite(Number(a.pin_priority)) ? Number(a.pin_priority) : 999999;
        const bPriority = Number.isFinite(Number(b.pin_priority)) ? Number(b.pin_priority) : 999999;
        if (aPriority !== bPriority) return aPriority - bPriority;

        // Same priority: most recent pinned_at first
        const aPinnedTime = a.pinned_at ? new Date(a.pinned_at).getTime() : 0;
        const bPinnedTime = b.pinned_at ? new Date(b.pinned_at).getTime() : 0;
        if (aPinnedTime !== bPinnedTime) return bPinnedTime - aPinnedTime;
      }

      // Non-pinned events: nearest by start_time first
      const aStartValue = getEventStartValue(a);
      const bStartValue = getEventStartValue(b);
      const aStart = aStartValue ? new Date(aStartValue).getTime() : Infinity;
      const bStart = bStartValue ? new Date(bStartValue).getTime() : Infinity;
      return aStart - bStart;
    });
  };

  // Keep real landing events below the restored feature block. The static
  // feature never consumes the first API event; only a matching stable ID or
  // canonical destination is omitted to prevent a duplicate.
  const realGridEvents = sortGridEvents(events.filter(event => !isStaticFeaturedEvent(event))).slice(0, 3);
  const gridEvents = realGridEvents;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: BG, fontFamily: FONT }}>
      <DashTopbar notifCount={0} messageCount={0} isAdmin={isAdminUser} />

      {/* Welcome Section */}
      <FadeIn>
        <Box sx={{ pt: { xs: 3, md: 4 }, pb: 2.5, px: PAGE_PX, maxWidth: 1200, mx: "auto" }}>
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2.25, flexWrap: "wrap" }}>
            <Box aria-hidden="true" sx={{ width: 52, height: 52, borderRadius: CARD_RADIUS, bgcolor: N, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke={T} strokeWidth="1.5" />
                <ellipse cx="12" cy="12" rx="4" ry="10" stroke={O} strokeWidth="1.5" />
                <line x1="2" y1="12" x2="22" y2="12" stroke={T} strokeWidth="1.5" />
              </svg>
            </Box>
            <Box sx={{ flex: "1 1 240px", minWidth: 0 }}>
              {loading ? (
                <>
                  {/* Page heading for screen readers while the welcome text loads */}
                  <h1 className="sr-only">Dashboard</h1>
                  <Box sx={{ height: 32, width: 300, maxWidth: "100%", bgcolor: BORDER, borderRadius: 1 }} />
                </>
              ) : (
                <Box component="h1" sx={{ fontFamily: SERIF, fontSize: { xs: 24, md: 28 }, fontWeight: 700, color: INK, m: 0, letterSpacing: "-0.01em", lineHeight: 1.2, overflowWrap: "anywhere" }}>
                  Welcome back, {firstName} <span aria-hidden="true">👋</span>
                </Box>
              )}
              {loading ? (
                <Box sx={{ height: 16, width: 360, maxWidth: "100%", bgcolor: BORDER, borderRadius: 1, mt: 1.25 }} />
              ) : (
                <Box component="p" sx={{ fontSize: 14, color: INK_BODY, m: "8px 0 0", lineHeight: 1.7, fontFamily: FONT }}>
                  {kycApproved && <> <span aria-hidden="true">✅</span> Your identity is verified.</>}
                  {" "}Explore events, connect with peers, and grow your career.
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      </FadeIn>

      {/* Banners */}
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {showProfileBanner && !loading && profileCompletion < 100 && (
          <FadeIn delay={80}>
            <ProfileBanner completion={profileCompletion} onDismiss={() => setShowProfileBanner(false)} profile={user?.profile} />
          </FadeIn>
        )}
        {showVerifyBanner && !loading && !kycApproved && (
          <FadeIn delay={160}>
            <VerifyBanner onDismiss={() => setShowVerifyBanner(false)} />
          </FadeIn>
        )}
        {pendingForms.length > 0 && !loading && (
          <FadeIn delay={240}>
            <PendingFormsBanner forms={pendingForms} />
          </FadeIn>
        )}
      </div>

      {/* Events Section */}
      <FadeIn delay={200}>
        <Box component="section" aria-labelledby="dashboard-upcoming-events" sx={{ pt: 1.5, pb: 6, px: PAGE_PX, maxWidth: 1200, mx: "auto" }}>
          <Box sx={{ bgcolor: "var(--imaa-dm-surface, #fff)", border: `1px solid ${BORDER}`, borderRadius: CARD_RADIUS, boxShadow: "var(--imaa-shadow-sm)", p: { xs: 2, sm: 3, md: 4 } }}>
          <Box sx={{ textAlign: "left", mb: 3.5 }}>
            <Box component="span" sx={{ fontSize: 11, fontWeight: 800, color: TEAL_DARK_TEXT, textTransform: "uppercase", letterSpacing: 2, display: "block", mb: 0.75, fontFamily: FONT }}>
              WHAT'S HAPPENING
            </Box>
            {/* Section heading: smaller than the page h1 */}
            <Box component="h2" id="dashboard-upcoming-events" sx={{ fontFamily: SERIF, fontSize: { xs: 20, md: 22 }, fontWeight: 700, color: INK, m: 0 }}>Upcoming Events</Box>
          </Box>
          {loading ? (
            <Box sx={{ display: "grid", gridTemplateColumns: EVENT_GRID_COLUMNS, gap: 2.5 }}>
              {[0, 1, 2].map(i => (
                <Box key={i} sx={{ height: 240, borderRadius: CARD_RADIUS, bgcolor: BORDER, opacity: 0.5 }} />
              ))}
            </Box>
          ) : (
            <>
              <FeaturedHero event={STATIC_FEATURED_EVENT} />
              {gridEvents.length > 0 ? (
                <Box sx={{ display: "grid", gridTemplateColumns: EVENT_GRID_COLUMNS, gap: 2.5 }}>
                  {gridEvents.map((ev, i) => (
                    <DashEventCard key={ev.id || i} event={ev} index={i} />
                  ))}
                </Box>
              ) : (
                <Box role="status" sx={{ border: `1px dashed ${BORDER}`, borderRadius: CARD_RADIUS, px: 2.5, py: 4, textAlign: "center", color: INK_BODY, fontSize: 14, lineHeight: 1.6 }}>
                  There are no upcoming events to show right now.
                </Box>
              )}
            </>
          )}
          <Box sx={{ textAlign: "center", mt: 3.5 }}>
            {/* Navy outline: the orange text/border was below AA contrast */}
            <Box component="a" href="/events" sx={{ display: "inline-block", fontSize: 13, fontWeight: 700, color: INK, textDecoration: "none", border: `1.5px solid ${INK}`, px: 2.75, py: 1.125, borderRadius: FIELD_RADIUS, fontFamily: FONT, "&:hover": { bgcolor: "var(--imaa-dm-surface, #fff)" } }}>
              Browse All Events →
            </Box>
          </Box>
          </Box>
        </Box>
      </FadeIn>

      {/* Community Section - COMMENTED OUT FOR NOW - will add back in future
      <FadeIn delay={300}>
        <div style={{ background: "#fff", borderTop: `1px solid ${BORDER}`, padding: "48px 40px" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 300px", gap: 48 }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 800, color: P, textTransform: "uppercase", letterSpacing: 2, display: "block", marginBottom: 6, fontFamily: FONT }}>
                COMMUNITY
              </span>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: N, margin: "0 0 4px", fontFamily: FONT }}>Trending Discussions</h2>
              <p style={{ fontSize: 13, color: "#888", margin: "0 0 20px", fontFamily: FONT }}>What M&A professionals are talking about right now</p>
              <div>
                {discussions.map((d, i) => <DiscRow key={d.id || i} d={d} index={i} />)}
              </div>
              <a href="/community?view=feed" style={{ marginTop: 16, display: "inline-block", fontSize: 12, fontWeight: 700, color: P, textDecoration: "none", fontFamily: FONT }}>
                Join the discussion →
              </a>
            </div>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: N, margin: "0 0 14px", fontFamily: FONT }}>Featured Groups</h3>
              {groups.map((g, i) => <GroupRow key={g.id || i} g={g} />)}
              <a href="/community?view=feed" style={{ marginTop: 12, display: "block", fontSize: 12, fontWeight: 700, color: T, textDecoration: "none", fontFamily: FONT }}>
                Explore all groups →
              </a>
            </div>
          </div>
        </div>
      </FadeIn>
      */}

      {/* Footer CTA */}
      <FadeIn delay={500}><FooterCTA isMember={isMember} /></FadeIn>
    </Box>
  );
}
