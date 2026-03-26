// src/pages/DashboardPage.jsx
// Redesigned to match imaa-connect-v3 reference
import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiClient } from "../utils/api";
import { Badge } from "@mui/material";
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

const O = "#E8532F";
const N = "#1B2A4A";
const T = "#0A9396";
// const P = "#7B2D8E"; // COMMENTED OUT - used only in commented Community section
// const G = "#D4920B"; // COMMENTED OUT - used only in commented Community section
const BG = "#FAF9F7";
const BORDER = "#EEECEA";
const FONT = "'DM Sans', 'Helvetica Neue', sans-serif";

const FALLBACK_IMGS = [
  "https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&q=80",
  "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80",
  "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80",
  "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&q=80",
];
// Local SVG placeholder — works even when external images are blocked on staging
const PLACEHOLDER_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='400'%3E%3Crect width='800' height='400' fill='%23F5F4F2'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='28' fill='%23C0BAB4'%3EEvent%3C/text%3E%3C/svg%3E";

const STATIC_EVENTS = [
  { id: "evt-1", title: "The Annual M&A Summit", description: "Industry leaders gather to discuss the latest M&A trends and deal-making innovations.", start_date: null, location: "New York, NY", event_type: "Conference", image_url: "https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&q=80" },
  { id: "evt-2", title: "Networking Mixer for Dealmakers", description: "Connect with M&A professionals in a relaxed, informal setting.", start_date: null, location: "Chicago, IL", event_type: "Networking", image_url: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80" },
  { id: "evt-3", title: "Advanced Valuation Techniques", description: "Hands-on workshop by experienced valuation experts.", start_date: null, location: "Online", event_type: "Workshop", image_url: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80" },
  { id: "evt-4", title: "Cross-Border M&A: Navigating Complexity", description: "Strategies for successfully executing international deals.", start_date: null, location: "London, UK", event_type: "Webinar", image_url: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&q=80" },
];

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
  return event?.location || "";
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
    <div ref={ref} style={{
      opacity: vis ? 1 : 0,
      transform: vis ? "translateY(0)" : "translateY(16px)",
      transition: `opacity 0.5s ${delay}ms ease, transform 0.5s ${delay}ms ease`,
    }}>
      {children}
    </div>
  );
}

// ── Internal Topbar ───────────────────────────────────────────────────────────
function DashTopbar({ notifCount, messageCount, isAdmin }) {
  const navigate = useNavigate();
  return (
    <div style={{
      height: 50, background: "#fff", borderBottom: `1px solid ${BORDER}`,
      display: "flex", alignItems: "center", padding: "0 28px",
      position: "sticky", top: 0, zIndex: 100, gap: 16, fontFamily: FONT,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        <span style={{ fontSize: 12, color: "#C0BAB4", fontWeight: 500 }}>Home</span>
        <ChevronIcon sx={{ fontSize: 14, color: "#C0BAB4" }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: N }}>Dashboard</span>
      </div>
      <div style={{
        flex: 1, maxWidth: 360, height: 34,
        background: BG, border: `1px solid ${BORDER}`, borderRadius: 8,
        display: "flex", alignItems: "center", gap: 8, padding: "0 12px",
      }}>
        <SearchIcon sx={{ fontSize: 16, color: "#C0BAB4" }} />
        <input
          placeholder="Search events, people, resources…"
          style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: 12, color: N, fontFamily: FONT }}
        />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
        <button
          onClick={() => navigate("/community?view=messages")}
          style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 8, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
        >
          <Badge badgeContent={messageCount || 0} color="error" sx={{ "& .MuiBadge-badge": { fontSize: 9, height: 14, minWidth: 14, padding: "0 3px" } }}>
            <MsgIcon sx={{ fontSize: 17, color: "#888" }} />
          </Badge>
        </button>
        <button
          onClick={() => navigate("/community?view=notify")}
          style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 8, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
        >
          <Badge badgeContent={notifCount || 0} color="error" sx={{ "& .MuiBadge-badge": { fontSize: 9, height: 14, minWidth: 14, padding: "0 3px" } }}>
            <NotifIcon sx={{ fontSize: 17, color: "#888" }} />
          </Badge>
        </button>
        {isAdmin ? (
          <button
            onClick={() => navigate("/admin/events")}
            style={{ height: 34, padding: "0 16px", background: O, color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT, whiteSpace: "nowrap" }}
          >
            + Post Event
          </button>
        ) : (
          <button
            onClick={() => navigate("/events")}
            style={{ height: 34, padding: "0 16px", background: N, color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT, whiteSpace: "nowrap" }}
          >
            Explore Events
          </button>
        )}
      </div>
    </div>
  );
}

// ── Profile Completion Banner ─────────────────────────────────────────────────
function ProfileBanner({ completion, onDismiss }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const filled = circ * (completion / 100);
  const gap = circ - filled;
  return (
    <div style={{
      margin: "0 40px 14px",
      background: `linear-gradient(135deg, ${O}08 0%, ${O}14 100%)`,
      border: `1px solid ${O}28`, borderRadius: 12,
      padding: "14px 20px", display: "flex", alignItems: "center", gap: 16,
      fontFamily: FONT, position: "relative",
    }}>
      <svg width="52" height="52" style={{ flexShrink: 0 }}>
        <circle cx="26" cy="26" r={r} fill="none" stroke={`${O}20`} strokeWidth="3" />
        <circle cx="26" cy="26" r={r} fill="none" stroke={O} strokeWidth="3"
          strokeDasharray={`${filled} ${gap}`} strokeLinecap="round"
          transform="rotate(-90 26 26)" />
        <text x="26" y="31" textAnchor="middle" fontSize="11" fontWeight="800" fill={O} fontFamily={FONT}>
          {completion}%
        </text>
      </svg>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: N, marginBottom: 2, fontFamily: FONT }}>Complete your profile</div>
        <div style={{ fontSize: 12, color: "#777", lineHeight: 1.5, fontFamily: FONT }}>
          Add your experience, photo, and bio to stand out to M&A peers.
        </div>
      </div>
      <a href="/account/profile"
        style={{ fontSize: 12, fontWeight: 700, color: O, textDecoration: "none", whiteSpace: "nowrap", background: `${O}14`, padding: "6px 14px", borderRadius: 7, fontFamily: FONT }}>
        Update Profile →
      </a>
      <button onClick={onDismiss} aria-label="Dismiss"
        style={{ position: "absolute", top: 10, right: 12, background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#C0BAB4", lineHeight: 1 }}>
        ×
      </button>
    </div>
  );
}

// ── Verify Identity Banner ────────────────────────────────────────────────────
function VerifyBanner({ onDismiss }) {
  return (
    <div style={{
      margin: "0 40px 20px",
      background: `linear-gradient(135deg, ${T}08 0%, ${T}14 100%)`,
      border: `1px solid ${T}28`, borderRadius: 12,
      padding: "14px 20px", display: "flex", alignItems: "center", gap: 16,
      fontFamily: FONT, position: "relative",
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 10, background: `${T}15`,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <ShieldIcon sx={{ color: T, fontSize: 22 }} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: N, marginBottom: 2, fontFamily: FONT }}>Verify your identity</div>
        <div style={{ fontSize: 12, color: "#777", lineHeight: 1.5, fontFamily: FONT }}>
          Unlock full platform features and boost credibility with verified status.
        </div>
      </div>
      <a href="/account/profile#verify"
        style={{ fontSize: 12, fontWeight: 700, color: T, textDecoration: "none", whiteSpace: "nowrap", background: `${T}14`, padding: "6px 14px", borderRadius: 7, fontFamily: FONT }}>
        Get Verified →
      </a>
      <button onClick={onDismiss} aria-label="Dismiss"
        style={{ position: "absolute", top: 10, right: 12, background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#C0BAB4", lineHeight: 1 }}>
        ×
      </button>
    </div>
  );
}

// ── Featured Event Hero ───────────────────────────────────────────────────────
function FeaturedHero({ event }) {
  const accent = getAccent(event?.event_type);
  const imgSrc = event?.cover_image || event?.image_url || event?.image || FALLBACK_IMGS[0];
  const dateStr = event?.start_date
    ? new Date(event.start_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "";
  const eventLocation = getEventLocation(event);
  const href = `/events/${event?.id || event?.slug || ""}`;
  return (
    <a href={href} style={{ textDecoration: "none", display: "block", marginBottom: 24 }}>
      <div style={{
        borderRadius: 16, overflow: "hidden", border: `1px solid ${BORDER}`,
        display: "grid", gridTemplateColumns: "1fr 1fr",
        boxShadow: "0 2px 14px rgba(0,0,0,.07)", position: "relative",
      }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: accent, zIndex: 3 }} />
        <div style={{ padding: "32px 32px 32px", background: "#fff", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <span style={{
            fontSize: 10, fontWeight: 800, color: accent, background: `${accent}14`,
            padding: "3px 10px", borderRadius: 100, display: "inline-block", marginBottom: 14,
            textTransform: "uppercase", letterSpacing: 1, width: "fit-content", fontFamily: FONT,
          }}>
            ✦ Featured — {event?.event_type || "Event"}
          </span>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: N, margin: "0 0 10px", lineHeight: 1.3, fontFamily: FONT }}>
            {event?.title}
          </h2>
          <p style={{ fontSize: 13, color: "#666", lineHeight: 1.65, margin: "0 0 16px", fontFamily: FONT }}>
            {event?.description || event?.desc || event?.short_description || "Join fellow M&A professionals at this premier industry event."}
          </p>
          {(dateStr || eventLocation) && (
            <div style={{ fontSize: 12, color: "#888", marginBottom: 20, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", fontFamily: FONT }}>
              <EventNoteIcon sx={{ fontSize: 14, color: "#C0BAB4" }} />
              {dateStr}{eventLocation && <> · {eventLocation}</>}
            </div>
          )}
          <span style={{ display: "inline-block", background: accent, color: "#fff", padding: "9px 20px", borderRadius: 8, fontSize: 13, fontWeight: 700, width: "fit-content", fontFamily: FONT }}>
            {event?.registration_type === 'apply' ? 'Apply Now →' : 'Register Now →'}
          </span>
        </div>
        <div style={{ height: 300, overflow: "hidden" }}>
          <img src={imgSrc} alt={event?.title || "Event"}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e) => {
              if (!e.target.dataset.err) {
                e.target.dataset.err = "1";
                e.target.src = FALLBACK_IMGS[0];
              } else if (e.target.dataset.err === "1") {
                e.target.dataset.err = "2";
                e.target.src = PLACEHOLDER_IMG;
              }
            }}
          />
        </div>
      </div>
    </a>
  );
}

// ── Event Card (grid) ─────────────────────────────────────────────────────────
function DashEventCard({ event, index }) {
  const accent = getAccent(event?.event_type);
  const imgSrc = event?.cover_image || event?.image_url || event?.image || FALLBACK_IMGS[index % FALLBACK_IMGS.length];
  const dateStr = event?.start_date
    ? new Date(event.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "";
  const eventLocation = getEventLocation(event);
  const href = `/events/${event?.id || event?.slug || ""}`;
  return (
    <a href={href} style={{ textDecoration: "none" }}>
      <div
        style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${BORDER}`, background: "#fff", cursor: "pointer", position: "relative", transition: "box-shadow .2s", display: "flex", flexDirection: "column", height: 280 }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,.09)"; e.currentTarget.style.borderColor = accent + "50"; }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = BORDER; }}
      >
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accent, zIndex: 2 }} />
        <div style={{ height: 152, overflow: "hidden", flexShrink: 0 }}>
          <img src={imgSrc} alt={event?.title || "Event"}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e) => {
              if (!e.target.dataset.err) {
                e.target.dataset.err = "1";
                e.target.src = FALLBACK_IMGS[index % FALLBACK_IMGS.length];
              } else if (e.target.dataset.err === "1") {
                e.target.dataset.err = "2";
                e.target.src = PLACEHOLDER_IMG;
              }
            }}
          />
        </div>
        <div style={{ padding: "14px 16px 18px", fontFamily: FONT, flex: 1, display: "flex", flexDirection: "column" }}>
          {(dateStr || event?.event_type) && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
              {dateStr && <span style={{ fontSize: 11, fontWeight: 700, color: accent, textTransform: "uppercase", letterSpacing: 0.5 }}>{dateStr}</span>}
              {event?.event_type && <span style={{ fontSize: 10, color: "#AAA", background: "#F5F4F2", padding: "2px 6px", borderRadius: 4 }}>{event.event_type}</span>}
            </div>
          )}
          <h3 style={{ fontSize: 13, fontWeight: 700, color: N, margin: "0 0 4px", lineHeight: 1.4, fontFamily: FONT, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {event?.title}
          </h3>
          <div style={{ marginTop: "auto" }}>
            {eventLocation && <div style={{ fontSize: 11, color: "#AAA", marginTop: 4 }}>📍 {eventLocation}</div>}
          </div>
        </div>
      </div>
    </a>
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
          style={{ fontSize: 13, fontWeight: 600, color: N, textDecoration: "none", lineHeight: 1.4, display: "block", marginBottom: 6, fontFamily: FONT }}>
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
          <div style={{ fontSize: 13, fontWeight: 600, color: N, lineHeight: 1.3, fontFamily: FONT }}>{g.name}</div>
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
    <div style={{ background: N, padding: "36px 40px", display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: 24, fontFamily: FONT }}>
      {USP_ITEMS.map(({ value, label, Icon, color }) => (
        <div key={label} style={{ textAlign: "center", minWidth: 100 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: `${color}22`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px", border: `1px solid ${color}30` }}>
            <Icon sx={{ color, fontSize: 20 }} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.01em", fontFamily: FONT }}>{value}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)", marginTop: 3, fontFamily: FONT }}>{label}</div>
        </div>
      ))}
    </div>
  );
}

// ── Footer CTA ────────────────────────────────────────────────────────────────
function FooterCTA({ isMember }) {
  return (
    <div style={{ background: `linear-gradient(135deg, ${N} 0%, #2C3E5A 100%)`, padding: "52px 40px", textAlign: "center", fontFamily: FONT }}>
      {isMember ? (
        <>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#fff", marginBottom: 10, fontFamily: FONT }}>Grow the IMAA Community</div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,.65)", maxWidth: 460, margin: "0 auto 28px", lineHeight: 1.65, fontFamily: FONT }}>
            Help your colleagues find the world's largest M&A network. Invite them to join today.
          </div>
          <a href="mailto:?subject=Join%20IMAA%20Connect&body=I%20wanted%20to%20share%20this%20great%20network%20with%20you%3A%20https%3A%2F%2Fconnect.imaa-institute.org"
            style={{ display: "inline-block", background: T, color: "#fff", padding: "13px 30px", borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: "none", fontFamily: FONT }}>
            Invite a Colleague →
          </a>
        </>
      ) : (
        <>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#fff", marginBottom: 10, fontFamily: FONT }}>Unlock Full IMAA Membership</div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,.65)", maxWidth: 460, margin: "0 auto 28px", lineHeight: 1.65, fontFamily: FONT }}>
            Access unlimited events, certifications, the E-Library, and the complete IMAA professional network.
          </div>
          <a href="https://imaa-institute.org/membership" target="_blank" rel="noopener noreferrer"
            style={{ display: "inline-block", background: O, color: "#fff", padding: "13px 30px", borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: "none", fontFamily: FONT }}>
            Upgrade to Membership →
          </a>
        </>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  // const [discussions, setDiscussions] = useState([]); // COMMENTED OUT - will restore when community section is re-enabled
  // const [groups, setGroups] = useState([]); // COMMENTED OUT - will restore when community section is re-enabled
  const [loading, setLoading] = useState(true);
  const [notifCount, setNotifCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);
  const [showProfileBanner, setShowProfileBanner] = useState(true);
  const [showVerifyBanner, setShowVerifyBanner] = useState(true);
  const isAdminUser = isOwnerUser() || isStaffUser();

  useEffect(() => {
    let active = true;
    Promise.all([
      apiClient.get("/users/me/").then(r => r.data).catch(() => null),
      apiClient.get("/events/?bucket=upcoming&ordering=start_date&page_size=4").then(r => {
        const d = r.data; return Array.isArray(d) ? d : (d?.results || []);
      }).catch(() => []),
      apiClient.get("/content/posts/?page_size=3").then(r => {
        const d = r.data; return Array.isArray(d) ? d : (d?.results || []);
      }).catch(() => []),
      apiClient.get("/groups/?page_size=3").then(r => {
        const d = r.data; return Array.isArray(d) ? d : (d?.results || []);
      }).catch(() => []),
    ]).then(([userData, eventsData, postsData, groupsData]) => {
      if (!active) return;
      setUser(userData);
      setEvents(eventsData.slice(0, 4));
      // setDiscussions(postsData.length ? postsData.slice(0, 3) : STATIC_DISCUSSIONS); // COMMENTED OUT
      // setGroups(groupsData.length ? groupsData.slice(0, 3) : STATIC_GROUPS); // COMMENTED OUT
      setLoading(false);
    });

    const syncBadges = async () => {
      try {
        const nr = await apiClient.get("/notifications/?unread=1&page_size=1");
        const nj = nr.data;
        setNotifCount(typeof nj.count === "number" ? nj.count : (nj?.results?.length || 0));
      } catch { }
      try {
        const mr = await apiClient.get("/messaging/conversations/");
        const md = Array.isArray(mr.data) ? mr.data : (mr.data?.results || []);
        setMessageCount(md.reduce((a, c) => a + (c.unread_count || 0), 0));
      } catch { }
    };
    syncBadges();
    return () => { active = false; };
  }, []);

  const profile = user?.profile || {};
  const kycApproved = profile.kyc_status === "approved";
  const profileCompletion = profile.profile_completion_percentage ?? 0;
  const firstName = user?.first_name || user?.username || "there";
  const isMember = profile.is_member || user?.is_member || false;
  const displayEvents = events.length >= 2 ? events : STATIC_EVENTS;
  const featuredEvent = displayEvents[0];
  const gridEvents = displayEvents.slice(1, 4);

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: FONT }}>
      <DashTopbar notifCount={notifCount} messageCount={messageCount} isAdmin={isAdminUser} />

      {/* Welcome Section */}
      <FadeIn>
        <div style={{ padding: "32px 40px 20px", maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 18, flexWrap: "wrap" }}>
            <div style={{ width: 52, height: 52, borderRadius: 12, background: N, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke={T} strokeWidth="1.5" />
                <ellipse cx="12" cy="12" rx="4" ry="10" stroke={O} strokeWidth="1.5" />
                <line x1="2" y1="12" x2="22" y2="12" stroke={T} strokeWidth="1.5" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              {loading ? (
                <div style={{ height: 32, width: 300, background: BORDER, borderRadius: 4 }} />
              ) : (
                <h1 style={{ fontSize: 26, fontWeight: 800, color: N, margin: 0, letterSpacing: "-0.01em", lineHeight: 1.2, fontFamily: FONT }}>
                  Welcome back, {firstName} 👋
                </h1>
              )}
              {loading ? (
                <div style={{ height: 16, width: 360, background: BORDER, borderRadius: 4, marginTop: 10 }} />
              ) : (
                <p style={{ fontSize: 14, color: "#666", margin: "8px 0 0", lineHeight: 1.7, fontFamily: FONT }}>
                  You are part of a global network of{" "}
                  <strong style={{ color: O }}>4,000+ M&A professionals</strong> across{" "}
                  <strong style={{ color: T }}>100+ countries</strong>.
                  {kycApproved && <> ✅ Your identity is verified.</>}
                  {" "}Explore events, connect with peers, and grow your career.
                </p>
              )}
            </div>
          </div>
        </div>
      </FadeIn>

      {/* Banners */}
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {showProfileBanner && !loading && profileCompletion < 100 && (
          <FadeIn delay={80}>
            <ProfileBanner completion={profileCompletion || 40} onDismiss={() => setShowProfileBanner(false)} />
          </FadeIn>
        )}
        {showVerifyBanner && !loading && !kycApproved && (
          <FadeIn delay={160}>
            <VerifyBanner onDismiss={() => setShowVerifyBanner(false)} />
          </FadeIn>
        )}
      </div>

      {/* Events Section */}
      <FadeIn delay={200}>
        <div style={{ padding: "12px 40px 48px", maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: T, textTransform: "uppercase", letterSpacing: 2, display: "block", marginBottom: 6, fontFamily: FONT }}>
              WHAT'S HAPPENING
            </span>
            <h2 style={{ fontSize: 27, fontWeight: 800, color: N, margin: 0, fontFamily: FONT }}>Upcoming Events</h2>
          </div>
          {loading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ height: 240, borderRadius: 12, background: BORDER, opacity: 0.5 }} />
              ))}
            </div>
          ) : (
            <>
              <FeaturedHero event={featuredEvent} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
                {gridEvents.map((ev, i) => (
                  <DashEventCard key={ev.id || i} event={ev} index={i} />
                ))}
              </div>
            </>
          )}
          <div style={{ textAlign: "center", marginTop: 28 }}>
            <a href="/events" style={{ display: "inline-block", fontSize: 13, fontWeight: 700, color: O, textDecoration: "none", border: `1.5px solid ${O}`, padding: "9px 22px", borderRadius: 8, fontFamily: FONT }}>
              Browse All Events →
            </a>
          </div>
        </div>
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

      {/* USP Strip */}
      <FadeIn delay={400}><USPStrip /></FadeIn>

      {/* Footer CTA */}
      <FadeIn delay={500}><FooterCTA isMember={isMember} /></FadeIn>
    </div>
  );
}
