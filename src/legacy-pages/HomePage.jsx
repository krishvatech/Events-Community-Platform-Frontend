// src/pages/HomePage.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "#navigation";
import { apiClient } from "../utils/api";
import AuthModal from "../components/AuthModal.jsx";
import {
  Box,
  Container,
  Button,
  Typography,
  Card,
  Chip,
} from "@mui/material";
import {
  EventNote as EventNoteIcon,
  Group as GroupIcon,
  LibraryBooks as LibraryIcon,
  TrendingUp as TrendingIcon,
  VerifiedUser as VerifiedIcon,
  Groups as GroupsIcon,
  AccessTime as AccessTimeIcon,
} from "@mui/icons-material";
import { getAccessToken as getStoredAccessToken } from "../utils/tokenStore";

const getAccessToken = () => getStoredAccessToken();
const isAuthed = () => !!getAccessToken();

// IMAA design tokens (src/styles/brand.css)
const NAVY = "var(--imaa-navy)";
const NAVY_TEXT = "var(--imaa-dm-text, var(--imaa-navy))"; // as text: readable variant in dark mode
const TEAL = "var(--imaa-teal)";
const TEAL_TEXT = "var(--imaa-dm-teal-text, var(--imaa-teal-hover))"; // darker teal: AA contrast for small text
const ORANGE = "var(--imaa-orange)";
const ORANGE_HOVER = "var(--imaa-orange-hover)";
const INK_BODY = "var(--imaa-ink-body)";

// Headings are plain elements: index.css forces the sans font on MUI Typography
const serifHeadingSx = { m: 0, fontFamily: "var(--imaa-font-serif)", fontWeight: 700, overflowWrap: "anywhere" };

// Decorative chevrons on the light (no-image) hero, in flat brand colours
const ChevronPattern = () => (
  <Box
    sx={{
      position: "absolute", right: 0, top: 0, bottom: 0,
      width: { xs: 0, md: "42%" }, overflow: "hidden", pointerEvents: "none",
    }}
    aria-hidden
  >
    {[
      { top: "8%", size: 280, color: TEAL },
      { top: "38%", size: 220, color: "var(--imaa-gold)" },
      { top: "62%", size: 170, color: ORANGE },
    ].map(({ top, size, color }, i) => (
      <svg key={i} style={{ position: "absolute", top, right: -size * 0.2 }}
        width={size} height={size} viewBox="0 0 100 100" fill="none">
        <polyline points="20,50 50,20 80,50 50,80" fill="none"
          style={{ stroke: color }} strokeWidth="10" strokeLinecap="round"
          strokeLinejoin="round" opacity="0.65" />
      </svg>
    ))}
  </Box>
);

const FeatureCard = ({ icon: Icon, iconColor, title, desc }) => (
  <Box
    sx={{
      width: "100%",
      minHeight: { xs: 160, md: 152 },
      bgcolor: "var(--imaa-dm-surface, #FFFFFF)",
      border: "1px solid var(--imaa-border)",
      borderRadius: "var(--imaa-radius-card)",
      boxShadow: "var(--imaa-shadow-sm)",
      px: { xs: 3, md: 3.5 },
      py: { xs: 3, md: 3.25 },
      display: "flex",
      flexDirection: "column",
      justifyContent: "flex-start",
    }}
  >
    <Box
      sx={{
        position: "relative",
        width: 40,
        height: 40,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        mb: 2.5,
        // Light tint of the icon colour behind the icon
        "&::before": { content: '""', position: "absolute", inset: 0, borderRadius: "50%", bgcolor: iconColor, opacity: 0.08 },
      }}
    >
      <Icon sx={{ position: "relative", color: iconColor, fontSize: 20 }} />
    </Box>

    <Box component="h3" sx={{ ...serifHeadingSx, fontSize: "17px", lineHeight: 1.35, color: NAVY_TEXT, mb: 1.25 }}>
      {title}
    </Box>

    <Typography
      sx={{
        fontSize: "14px",
        lineHeight: 1.7,
        color: INK_BODY,
      }}
    >
      {desc}
    </Typography>
  </Box>
);

export default function HomePage() {
  const [searchParams] = useSearchParams();
  const authed = isAuthed();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("login");
  const [page, setPage] = useState(null);
  const [featuredEvent, setFeaturedEvent] = useState(null);

  useEffect(() => {
    const m = searchParams.get("openModal");
    if (m === "login" || m === "signup") { setModalMode(m); setModalOpen(true); }
  }, [searchParams]);

  useEffect(() => {
    apiClient.get("/cms/pages/home/").then(r => setPage(r.data)).catch(() => null);
  }, []);

  // Fetch hero event from optimized landing endpoint
  useEffect(() => {
    apiClient.get("/events/landing/")
      .then(r => {
        const heroEvent = r.data?.hero_event || null;
        setFeaturedEvent(heroEvent);
      })
      .catch(() => setFeaturedEvent(null));
  }, []);

  const openLogin = () => { setModalMode("login"); setModalOpen(true); };
  const openSignup = () => { setModalMode("signup"); setModalOpen(true); };

  const heroTitle = page?.hero_title || "The network that moves deals forward";
  const heroSubtitle = page?.hero_subtitle ||
    "IMAA Connect brings together M&A professionals worldwide — events, community, resources and more.";
  const heroImage = page?.hero_image_url || "";
  const useLightHero = !heroImage;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "var(--imaa-dm-surface, #FFFFFF)" }}>

      {/* HERO */}
      <Box component="section" sx={{
        position: "relative", minHeight: { xs: 520, md: 620 }, overflow: "hidden",
        display: "flex", alignItems: "center",
        // Photo hero: flat navy overlay (single-colour gradient layer). No photo: flat cool-grey surface.
        background: heroImage
          ? `linear-gradient(rgba(27,42,74,.65),rgba(27,42,74,.65)), url(${heroImage}) center/cover no-repeat`
          : "var(--imaa-bg-cool)",
      }}>
        {useLightHero && <ChevronPattern />}
        <Container
          maxWidth="lg"
          sx={{
            position: "relative",
            zIndex: 1,
            py: { xs: 8, md: 10 },
            display: "flex",
            justifyContent: "center",
          }}
        >
          <Box
            sx={{
              width: "100%",
              maxWidth: { xs: "100%", md: 760 },
              textAlign: "center",
              mx: "auto",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <Box sx={{
              display: "inline-flex", alignItems: "center", gap: 1,
              bgcolor: useLightHero ? "var(--imaa-teal-light)" : "rgba(255,255,255,.15)",
              color: useLightHero ? TEAL_TEXT : "rgba(255,255,255,.9)",
              border: `1px solid ${useLightHero ? "rgba(10,147,150,.2)" : "rgba(255,255,255,.3)"}`,
              borderRadius: 100, px: 1.5, py: 0.5, fontSize: 11, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.06em", mb: 3,
            }}>
              <Box aria-hidden sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: TEAL }} />
              IMAA Connect
            </Box>

            {/* Page title: serif heading; the colour is set here so the global h1 rule can't override it */}
            <Box component="h1" sx={{
              ...serifHeadingSx,
              fontSize: { xs: 34, md: 52 }, lineHeight: 1.1,
              color: useLightHero ? NAVY_TEXT : "#FFFFFF", mb: 2.5, letterSpacing: "-0.02em",
            }}>
              {heroTitle}
            </Box>

            <Typography
              sx={{
                fontSize: { xs: 16, md: 18 },
                lineHeight: 1.7,
                mb: 4,
                color: useLightHero ? INK_BODY : "rgba(255,255,255,.85)",
                maxWidth: 720,
                mx: "auto",
                textAlign: "center",
              }}
            >
              {heroSubtitle}
            </Typography>

            <Box
              sx={{
                display: "flex",
                gap: 2,
                flexWrap: "wrap",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {authed ? (
                <Button component={Link} to="/events" variant="contained" size="large"
                  sx={{ bgcolor: ORANGE, "&:hover": { bgcolor: ORANGE_HOVER }, boxShadow: "none", borderRadius: 2, px: 4, py: 1.5, fontWeight: 700, fontSize: 15, textTransform: "none" }}>
                  Explore Events
                </Button>
              ) : (
                <>
                  {/* On the navy (light-hero) variant the label is white: the theme's dark button text was ~1.4:1 on navy */}
                  <Button onClick={openSignup} variant="contained" size="large"
                    sx={{ bgcolor: useLightHero ? NAVY : ORANGE, color: useLightHero ? "#FFFFFF" : undefined, "&:hover": { bgcolor: useLightHero ? "var(--imaa-navy-2)" : ORANGE_HOVER }, boxShadow: "none", borderRadius: 2, px: 4, py: 1.5, fontWeight: 700, fontSize: 15, textTransform: "none" }}>
                    Get started
                  </Button>
                  <Button onClick={openLogin} variant="outlined" size="large"
                    sx={{ borderColor: useLightHero ? "var(--imaa-dm-border-strong, rgba(27,42,74,.3))" : "rgba(255,255,255,.5)", color: useLightHero ? NAVY_TEXT : "#FFFFFF", "&:hover": { borderColor: useLightHero ? NAVY : "#FFFFFF", bgcolor: useLightHero ? "var(--imaa-dm-overlay, rgba(27,42,74,.04))" : "rgba(255,255,255,.1)" }, borderRadius: 2, px: 4, py: 1.5, fontWeight: 600, fontSize: 15, textTransform: "none" }}>
                    Log in
                  </Button>
                </>
              )}
            </Box>
          </Box>
        </Container>
      </Box>

      {/* FEATURES */}
      {/* Sections alternate surfaces: hero (cool grey or photo) → white → cool grey → navy */}
      <Box
        component="section"
        sx={{
          py: { xs: 8, md: 10 },
          bgcolor: "var(--imaa-dm-surface, #FFFFFF)",
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ textAlign: "center", mb: { xs: 5, md: 6.5 } }}>
            <Typography
              sx={{
                color: TEAL_TEXT,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                fontSize: 12,
                mb: 1.5,
              }}
            >
              WHY JOIN
            </Typography>

            <Box
              component="h2"
              sx={{
                ...serifHeadingSx,
                fontSize: { xs: 28, md: 40 },
                lineHeight: 1.15,
                color: NAVY_TEXT,
                mb: 1.5,
                letterSpacing: "-0.01em",
              }}
            >
              Built for M&A professionals
            </Box>

            <Typography
              sx={{
                color: INK_BODY,
                maxWidth: 560,
                mx: "auto",
                fontSize: { xs: 15, md: 16 },
                lineHeight: 1.8,
              }}
            >
              Everything you need to grow your dealmaking network and career — in
              one place.
            </Typography>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
              gap: 3,
            }}
          >
            {[
              {
                icon: EventNoteIcon,
                iconColor: ORANGE,
                title: "Events & Webinars",
                desc: "Attend conferences, workshops, and live webinars tailored for M&A professionals worldwide.",
              },
              {
                icon: GroupIcon,
                iconColor: TEAL,
                title: "Professional Community",
                desc: "Connect with dealmakers, advisors, and executives across the full M&A spectrum.",
              },
              {
                icon: LibraryIcon,
                iconColor: "var(--imaa-purple)",
                title: "E-Library & Resources",
                desc: "Access curated research, templates, and thought leadership from industry experts.",
              },
              {
                icon: TrendingIcon,
                iconColor: "var(--imaa-gold)",
                title: "Courses & Training",
                desc: "Earn designations and upskill with structured M&A training programs.",
              },
              {
                icon: VerifiedIcon,
                iconColor: TEAL_TEXT,
                title: "Verified Profiles",
                desc: "Build credibility with identity verification and professional badges.",
              },
              {
                icon: GroupsIcon,
                iconColor: "var(--imaa-coral)",
                title: "Private Groups",
                desc: "Join invite-only groups, alumni networks, and deal communities.",
              },
            ].map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </Box>
        </Container>
      </Box>

      {/* FEATURED EVENT */}
      {featuredEvent && (
        <Box
          component="section"
          sx={{
            py: { xs: 8, md: 10 },
            bgcolor: "var(--imaa-bg-cool)",
          }}
        >
          <Container maxWidth="lg">
            {/* The whole card is the link to the event; "View Event" below is a visual label inside it, not a second link */}
            <Box
              component={Link}
              to={`/events/${featuredEvent.slug}`}
              sx={{
                display: "grid",
                // Single column when there is no image, so there is no empty half
                gridTemplateColumns: { xs: "1fr", md: featuredEvent.preview_image ? "1fr 1fr" : "1fr" },
                gap: 4,
                alignItems: "center",
                backgroundColor: "var(--imaa-dm-surface, #FFFFFF)",
                borderRadius: "var(--imaa-radius-card)",
                overflow: "hidden",
                border: `2px solid ${TEAL}`,
                boxShadow: "var(--imaa-shadow-sm)",
                textDecoration: "none",
                color: "inherit",
                "&:hover": {
                  boxShadow: "var(--imaa-shadow-md)",
                  transform: "translateY(-2px)",
                },
                "&:hover .featured-event-cta": { bgcolor: ORANGE_HOVER },
                transition: "box-shadow 0.2s ease, transform 0.2s ease",
                "@media (prefers-reduced-motion: reduce)": {
                  transition: "none",
                  "&:hover": { transform: "none" },
                },
              }}
            >
              {featuredEvent.preview_image && (
                <Box
                  sx={{
                    backgroundImage: `url(${featuredEvent.preview_image})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    height: { xs: 250, md: 400 },
                  }}
                />
              )}
              <Box sx={{ p: { xs: 3, md: 5 }, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <Chip
                  label={<><span aria-hidden="true">⭐</span> Featured Event</>}
                  sx={{
                    width: "fit-content",
                    mb: 2,
                    fontWeight: 600,
                    bgcolor: "var(--imaa-gold)",
                    color: NAVY_TEXT,
                  }}
                />
                <Box
                  component="h2"
                  sx={{
                    ...serifHeadingSx,
                    fontSize: { xs: 24, md: 34 },
                    color: NAVY_TEXT,
                    mb: 2,
                    lineHeight: 1.2,
                  }}
                >
                  {featuredEvent.title}
                </Box>
                <Typography sx={{ color: INK_BODY, mb: 3, lineHeight: 1.7, fontSize: { xs: 14, md: 16 } }}>
                  {featuredEvent.description?.substring(0, 200)}
                  {featuredEvent.description?.length > 200 ? "..." : ""}
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, fontSize: { xs: 13, md: 15 }, color: INK_BODY }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <AccessTimeIcon sx={{ fontSize: 20 }} />
                    <span>
                      {new Date(featuredEvent.start_time).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}{" "}
                      at{" "}
                      {new Date(featuredEvent.start_time).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <EventNoteIcon sx={{ fontSize: 20 }} />
                    <span>{featuredEvent.location || "Virtual"}</span>
                  </Box>
                </Box>
                {/* Button-styled label (same look as before); the surrounding card link handles the click */}
                <Box
                  component="span"
                  className="featured-event-cta"
                  sx={{
                    mt: 3,
                    alignSelf: "flex-start",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: ORANGE,
                    color: "var(--imaa-dm-text, rgba(0, 0, 0, 0.87))",
                    borderRadius: 2,
                    boxShadow: 2,
                    fontWeight: 600,
                    fontSize: "0.875rem",
                    lineHeight: 1.75,
                    px: 4,
                    py: 1.5,
                    transition: "background-color 0.2s ease",
                  }}
                >
                  View Event
                </Box>
              </Box>
            </Box>
          </Container>
        </Box>
      )}

      {/* CTA BANNER */}
      {!authed && (
        <Box component="section" sx={{
          py: { xs: 8, md: 10 },
          bgcolor: NAVY, // flat navy (gradients retired)
          textAlign: "center",
        }}>
          <Container maxWidth="md">
            <Box component="h2" sx={{ ...serifHeadingSx, fontSize: { xs: 28, md: 40 }, lineHeight: 1.2, color: "#FFFFFF", mb: 2 }}>
              Ready to join the M&A network?
            </Box>
            <Typography sx={{ color: "rgba(255,255,255,.75)", fontSize: 17, mb: 5, lineHeight: 1.7 }}>
              Thousands of dealmakers, advisors, and executives already call IMAA Connect home.
            </Typography>
            <Box sx={{ display: "flex", justifyContent: "center", gap: 2, flexWrap: "wrap" }}>
              <Button onClick={openSignup} variant="contained" size="large"
                sx={{ bgcolor: ORANGE, "&:hover": { bgcolor: ORANGE_HOVER }, boxShadow: "none", borderRadius: 2, px: 5, py: 1.5, fontWeight: 700, fontSize: 15, textTransform: "none" }}>
                Create free account
              </Button>
              <Button onClick={openLogin} variant="outlined" size="large"
                sx={{ borderColor: "rgba(255,255,255,.4)", color: "#FFFFFF", "&:hover": { borderColor: "#FFFFFF", bgcolor: "rgba(255,255,255,.08)" }, borderRadius: 2, px: 5, py: 1.5, fontWeight: 600, fontSize: 15, textTransform: "none" }}>
                Sign in
              </Button>
            </Box>
          </Container>
        </Box>
      )}

      <AuthModal open={modalOpen} onClose={() => setModalOpen(false)} initialMode={modalMode} key={modalMode} />
    </Box>
  );
}
