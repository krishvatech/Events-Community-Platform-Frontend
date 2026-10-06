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
import heroFallbackImage from "../assets/cities.png";

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

// Keep the public Home headings in the corporate sans-serif stack.
const serifHeadingSx = { m: 0, fontFamily: "var(--imaa-font-sans)", fontWeight: 750, overflowWrap: "anywhere" };

// Retained for routes that inject no hero image, but the public home now uses
// a local photographic fallback to mirror the parent IMAA homepage composition.
const ChevronPattern = () => (
  <Box
    sx={{
      position: "absolute",
      right: { md: 24, lg: 52 },
      top: 0,
      bottom: 0,
      width: { xs: 0, md: "34%", lg: "36%" },
      overflow: "hidden",
      pointerEvents: "none",
    }}
    aria-hidden
  >
    {[
      { top: "12%", size: 220, color: TEAL },
      { top: "39%", size: 180, color: "var(--imaa-gold)" },
      { top: "61%", size: 145, color: ORANGE },
    ].map(({ top, size, color }, i) => (
      <svg key={i} style={{ position: "absolute", top, right: 0 }}
        width={size} height={size} viewBox="0 0 100 100" fill="none">
        <polyline points="20,50 50,20 80,50 50,80" fill="none"
          style={{ stroke: color }} strokeWidth="8" strokeLinecap="round"
          strokeLinejoin="round" opacity="0.72" />
      </svg>
    ))}
  </Box>
);

const FeatureCard = ({ icon: Icon, iconColor, title, desc }) => (
  <Box
    sx={{
      width: "100%",
      minHeight: { xs: 230, md: 250 },
      bgcolor: "#FFFFFF",
      border: "1px solid rgba(36,62,117,.08)",
      borderRadius: "0",
      boxShadow: "0 18px 46px rgba(36,62,117,.08)",
      px: { xs: 3, md: 3.75 },
      py: { xs: 3.25, md: 3.75 },
      display: "flex",
      flexDirection: "column",
      justifyContent: "flex-start",
      transition: "transform .18s ease, box-shadow .18s ease",
      "&:hover": {
        transform: "translateY(-4px)",
        boxShadow: "0 24px 54px rgba(36,62,117,.13)",
      },
      "@media (prefers-reduced-motion: reduce)": {
        transition: "none",
        "&:hover": { transform: "none" },
      },
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
        mb: 3,
        // Light tint of the icon colour behind the icon
        "&::before": { content: '""', position: "absolute", inset: 0, borderRadius: "inherit", bgcolor: iconColor, opacity: 0.08 },
      }}
    >
      <Icon sx={{ position: "relative", color: iconColor, fontSize: 22 }} />
    </Box>

    <Box component="h3" sx={{ ...serifHeadingSx, fontSize: "22px", lineHeight: 1.25, color: NAVY, mb: 1.5, fontWeight: 650 }}>
      {title}
    </Box>

    <Typography
      sx={{
        fontSize: "14px",
        lineHeight: 1.75,
        color: "#617398",
      }}
    >
      {desc}
    </Typography>
  </Box>
);

const StatBand = () => (
  <Box
    component="section"
    sx={{
      bgcolor: "#F7F8FA",
      borderTop: "1px solid rgba(36,62,117,.06)",
      borderBottom: "1px solid rgba(36,62,117,.06)",
    }}
  >
    <Container maxWidth="lg">
      <Box
        sx={{
          minHeight: { xs: "auto", md: 100 },
          py: { xs: 3, md: 0 },
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
          gap: { xs: 2.5, sm: 0 },
          alignItems: "center",
          textAlign: "center",
        }}
      >
        {[
          ["100+", "Global reach"],
          ["4100+", "Professional network"],
          ["2000+", "Company connections"],
        ].map(([value, label]) => (
          <Box key={label} sx={{ py: { xs: 1, sm: 0 }, borderRight: { sm: "1px solid rgba(36,62,117,.08)", "&:last-of-type": "none" } }}>
            <Typography sx={{ color: "#243E75", fontSize: { xs: 32, md: 38 }, lineHeight: 1, fontWeight: 400 }}>
              {value}
            </Typography>
            <Typography sx={{ mt: 1, color: "rgba(97,115,152,.68)", fontSize: 14 }}>
              {label}
            </Typography>
          </Box>
        ))}
      </Box>
    </Container>
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
  const heroImage = page?.hero_image_url || heroFallbackImage;
  const useLightHero = !heroImage;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#FFFFFF", color: NAVY, overflowX: "hidden" }}>

      {/* HERO */}
      <Box component="section" sx={{
        position: "relative", minHeight: { xs: 520, md: 570, lg: 610 }, overflow: "hidden",
        display: "flex", alignItems: "center",
        borderBottom: "0",
        mt: { xs: -7.25, md: -8.25 },
        pt: { xs: 7.25, md: 8.25 },
        background: heroImage
          ? `linear-gradient(90deg, rgba(255,255,255,.98) 0%, rgba(255,255,255,.91) 39%, rgba(255,255,255,.58) 58%, rgba(255,255,255,.2) 100%), url(${heroImage}) center/cover no-repeat`
          : "#F7F9FB",
      }}>
        {useLightHero && <ChevronPattern />}
        <Container
          maxWidth="lg"
          sx={{
            position: "relative",
            zIndex: 1,
            py: { xs: 7, md: 9 },
            display: "flex",
            justifyContent: "flex-start",
          }}
        >
          <Box
            sx={{
              width: "100%",
              maxWidth: { xs: "100%", md: 700 },
              textAlign: "left",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
            }}
          >
            <Box sx={{
              display: "none",
            }}>
              <Box aria-hidden sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: TEAL }} />
              IMAA Connect
            </Box>

            {/* Set the title colour locally so the global h1 rule cannot override it. */}
            <Box component="h1" sx={{
              ...serifHeadingSx,
              fontSize: { xs: 44, sm: 58, md: 72 }, lineHeight: 1.08,
              color: "#243E75", mb: 3, letterSpacing: 0, textWrap: "balance",
              fontWeight: 650,
            }}>
              {heroTitle}
            </Box>

            <Typography
              sx={{
                fontSize: { xs: 16, md: 19 },
                lineHeight: 1.7,
                mb: 4,
                color: "#617398",
                maxWidth: 620,
                textAlign: "left",
              }}
            >
              {heroSubtitle}
            </Typography>

            <Box
              sx={{
                display: "flex",
                gap: 2,
                flexWrap: "wrap",
                justifyContent: "flex-start",
                alignItems: "center",
              }}
            >
              {authed ? (
                <Button component={Link} to="/events" variant="contained" size="large"
                  sx={{ bgcolor: ORANGE_HOVER, color: "#FFFFFF", "&:hover": { bgcolor: "#A9361C" }, boxShadow: "none", borderRadius: "var(--imaa-radius-field)", minHeight: 48, px: 4, py: 1.5, fontWeight: 700, fontSize: 15, textTransform: "none" }}>
                  Explore Events
                </Button>
              ) : (
                <>
                  {/* Keep the primary label white for readable contrast on coral. */}
                  <Button onClick={openSignup} variant="contained" size="large"
                    sx={{ bgcolor: "#F05843", color: "#FFFFFF", "&:hover": { bgcolor: "#D9422E" }, boxShadow: "none", borderRadius: 999, minHeight: 46, px: 4.5, py: 1.25, fontWeight: 700, fontSize: 14, textTransform: "uppercase" }}>
                    Get started
                  </Button>
                  <Button onClick={openLogin} variant="outlined" size="large"
                    sx={{ borderColor: "transparent", bgcolor: "#FFFFFF", color: "#F05843", "&:hover": { borderColor: "transparent", bgcolor: "#F8F8F8" }, borderRadius: 999, minHeight: 46, px: 4.5, py: 1.25, fontWeight: 700, fontSize: 14, textTransform: "uppercase", boxShadow: "0 8px 24px rgba(36,62,117,.08)" }}>
                    Log in
                  </Button>
                </>
              )}
            </Box>
          </Box>
        </Container>
      </Box>

      <StatBand />

      {/* FEATURES */}
      {/* Sections alternate surfaces: hero (cool grey or photo) → white → cool grey → navy */}
      <Box
        component="section"
        sx={{
          py: { xs: 7, md: 9 },
          bgcolor: "#FFFFFF",
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr auto" },
              gap: 3,
              alignItems: "end",
              mb: { xs: 4.5, md: 6 },
            }}
          >
            <Box>
              <Typography
                sx={{
                  color: "#617398",
                  fontWeight: 400,
                  fontSize: { xs: 24, md: 30 },
                  mb: 0.75,
                }}
              >
                Why join
              </Typography>

              <Box
                component="h2"
                sx={{
                  ...serifHeadingSx,
                  fontSize: { xs: 38, md: 54 },
                  lineHeight: 1.12,
                  color: "#243E75",
                  fontWeight: 650,
                  maxWidth: 720,
                }}
              >
                Built for M&A professionals
              </Box>
            </Box>

            <Button
              onClick={authed ? undefined : openSignup}
              component={authed ? Link : "button"}
              to={authed ? "/events" : undefined}
              variant="contained"
              sx={{
                justifySelf: { xs: "start", md: "end" },
                bgcolor: "#F05843",
                color: "#FFFFFF",
                borderRadius: 999,
                boxShadow: "none",
                minHeight: 46,
                px: 4.5,
                fontSize: 14,
                fontWeight: 700,
                textTransform: "uppercase",
                "&:hover": { bgcolor: "#D9422E", boxShadow: "none" },
              }}
            >
              {authed ? "View events" : "Join now"}
            </Button>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(3, minmax(0, 1fr))" },
              gap: { xs: 2.5, md: 3.75 },
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
            py: { xs: 7, md: 10 },
            bgcolor: "#F0F4F5",
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
                backgroundColor: "#FFFFFF",
                borderRadius: "var(--imaa-radius-field)",
                overflow: "hidden",
                border: "1px solid var(--imaa-border)",
                boxShadow: "0 10px 32px rgba(27,42,74,.08)",
                textDecoration: "none",
                color: "inherit",
                "&:hover": {
                  boxShadow: "0 16px 40px rgba(27,42,74,.13)",
                  transform: "translateY(-3px)",
                },
                "&:hover .featured-event-cta": { bgcolor: "#A9361C" },
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
                    bgcolor: "#FEF2EE",
                    color: ORANGE_HOVER,
                    borderRadius: "var(--imaa-radius-field)",
                  }}
                />
                <Box
                  component="h2"
                  sx={{
                    ...serifHeadingSx,
                    fontSize: { xs: 24, md: 34 },
                    color: NAVY,
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
                    bgcolor: ORANGE_HOVER,
                    color: "#FFFFFF",
                    borderRadius: "var(--imaa-radius-field)",
                    boxShadow: "none",
                    fontWeight: 700,
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
          py: { xs: 7, md: 9 },
          bgcolor: NAVY, // flat navy (gradients retired)
          textAlign: "center",
        }}>
          <Container maxWidth="md">
            <Box component="h2" sx={{ ...serifHeadingSx, fontSize: { xs: 30, md: 42 }, lineHeight: 1.2, color: "#FFFFFF", mb: 2 }}>
              Ready to join the M&A network?
            </Box>
            <Typography sx={{ color: "rgba(255,255,255,.75)", fontSize: 17, mb: 5, lineHeight: 1.7 }}>
              Thousands of dealmakers, advisors, and executives already call IMAA Connect home.
            </Typography>
            <Box sx={{ display: "flex", justifyContent: "center", gap: 2, flexWrap: "wrap" }}>
              <Button onClick={openSignup} variant="contained" size="large"
                sx={{ bgcolor: ORANGE_HOVER, color: "#FFFFFF", "&:hover": { bgcolor: "#A9361C" }, boxShadow: "none", borderRadius: "var(--imaa-radius-field)", minHeight: 48, px: 5, py: 1.5, fontWeight: 700, fontSize: 15, textTransform: "none" }}>
                Create free account
              </Button>
              <Button onClick={openLogin} variant="outlined" size="large"
                sx={{ borderColor: "rgba(255,255,255,.65)", color: "#FFFFFF", "&:hover": { borderColor: "#FFFFFF", bgcolor: "rgba(255,255,255,.08)" }, borderRadius: "var(--imaa-radius-field)", minHeight: 48, px: 5, py: 1.5, fontWeight: 700, fontSize: 15, textTransform: "none" }}>
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
