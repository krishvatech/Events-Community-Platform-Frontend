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
const BORDER = "var(--imaa-border)";
const COOL = "var(--imaa-bg-cool)";

// Dark-mode aware grounds and text. Each is the page's light value wrapped in its dark-mode
// override token (src/styles/brand.css "Dark-mode override tokens"): identical in light mode,
// readable on dark grounds in dark mode. BORDER, COOL, INK_BODY and TEAL_TEXT above already
// follow the dark palette through their brand tokens.
const PAGE_BG = "var(--imaa-dm-page, #FFFFFF)"; // white sections
const CARD_BG = "var(--imaa-dm-surface, #FFFFFF)";
const HEADING_TEXT = "var(--imaa-dm-text, #243E75)";
// Hero photo scrim: white in light mode, the dark page colour in dark mode, same alpha stops.
const heroScrim = (alpha) => `rgb(var(--imaa-dm-page-rgb, 255 255 255) / ${alpha})`;

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
      minHeight: { xs: 204, md: 224 },
      bgcolor: CARD_BG,
      border: `1px solid ${BORDER}`,
      borderRadius: "var(--imaa-radius-card)",
      boxShadow: "0 4px 16px rgba(27,42,74,.05)",
      px: { xs: 2.75, md: 3 },
      py: { xs: 2.75, md: 3 },
      display: "flex",
      flexDirection: "column",
      justifyContent: "flex-start",
      transition: "transform .2s ease, box-shadow .2s ease, border-color .2s ease",
      "&:hover": {
        transform: "translateY(-2px)",
        borderColor: "var(--imaa-dm-border-strong, rgba(27,42,74,.18))",
        boxShadow: "0 8px 22px rgba(27,42,74,.08)",
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
        borderRadius: "var(--imaa-radius-field)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        mb: 2,
        // Light tint of the icon colour behind the icon
        "&::before": { content: '""', position: "absolute", inset: 0, borderRadius: "inherit", bgcolor: iconColor, opacity: 0.07 },
      }}
    >
      <Icon sx={{ position: "relative", color: iconColor, fontSize: 20 }} />
    </Box>

    <Box component="h3" sx={{ ...serifHeadingSx, fontSize: "20px", lineHeight: 1.3, color: NAVY_TEXT, mb: 1, fontWeight: 700 }}>
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

const StatBand = () => (
  <Box
    component="section"
    sx={{
      bgcolor: PAGE_BG,
      borderTop: `1px solid ${BORDER}`,
      borderBottom: `1px solid ${BORDER}`,
    }}
  >
    <Container maxWidth="lg">
      <Box
        sx={{
          minHeight: { xs: "auto", md: 126 },
          py: { xs: 3.5, md: 0 },
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
          gap: { xs: 0, sm: 0 },
          alignItems: "center",
          textAlign: "center",
        }}
      >
        {[
          ["100+", "Global reach"],
          ["4100+", "Professional network"],
          ["2000+", "Company connections"],
        ].map(([value, label]) => (
          <Box key={label} sx={{ py: { xs: 2, sm: 0 }, borderRight: { sm: `1px solid ${BORDER}` }, borderBottom: { xs: `1px solid ${BORDER}`, sm: 0 }, "&:last-of-type": { borderRight: 0, borderBottom: 0 } }}>
            <Typography sx={{ color: NAVY_TEXT, fontSize: { xs: 34, md: 42 }, lineHeight: 1, fontWeight: 600, letterSpacing: "-.02em" }}>
              {value}
            </Typography>
            <Typography sx={{ mt: 1.25, color: INK_BODY, fontSize: 14, letterSpacing: ".01em" }}>
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
    <Box sx={{ minHeight: "100vh", bgcolor: PAGE_BG, color: NAVY_TEXT, overflowX: "hidden" }}>

      {/* HERO */}
      <Box component="section" sx={{
        position: "relative", minHeight: { xs: 500, md: 590, lg: 630 }, overflow: "hidden",
        display: "flex", alignItems: "center",
        borderBottom: "0",
        mt: { xs: -7.25, md: -8.25 },
        pt: { xs: 7.25, md: 8.25 },
        background: heroImage
          ? `linear-gradient(90deg, ${heroScrim(".99")} 0%, ${heroScrim(".95")} 37%, ${heroScrim(".68")} 57%, ${heroScrim(".12")} 100%), url(${heroImage}) center/cover no-repeat`
          : COOL,
      }}>
        {useLightHero && <ChevronPattern />}
        <Container
          maxWidth="lg"
          sx={{
            position: "relative",
            zIndex: 1,
            py: { xs: 7, md: 10 },
            display: "flex",
            justifyContent: "flex-start",
          }}
        >
          <Box
            sx={{
              width: "100%",
              maxWidth: { xs: "100%", md: 670 },
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
              fontSize: { xs: 42, sm: 56, md: 68 }, lineHeight: 1.08,
              color: NAVY_TEXT, mb: 3, letterSpacing: "-.025em", textWrap: "balance",
              fontWeight: 700,
            }}>
              {heroTitle}
            </Box>

            <Typography
              sx={{
                fontSize: { xs: 16, md: 19 },
                lineHeight: 1.7,
                mb: 4,
                color: INK_BODY,
                maxWidth: 590,
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
                  sx={{ bgcolor: ORANGE_HOVER, color: "#FFFFFF", "&:hover": { bgcolor: "#A9361C", boxShadow: "0 8px 18px rgba(169,54,28,.18)" }, boxShadow: "none", borderRadius: 999, minHeight: 48, px: 4, py: 1.5, fontWeight: 700, fontSize: 15, textTransform: "none" }}>
                  Explore Events
                </Button>
              ) : (
                <>
                  {/* Keep the primary label white for readable contrast on coral. */}
                  <Button onClick={openSignup} variant="contained" size="large"
                    sx={{ bgcolor: ORANGE_HOVER, color: "#FFFFFF", "&:hover": { bgcolor: "#A9361C", boxShadow: "0 8px 18px rgba(169,54,28,.18)" }, boxShadow: "none", borderRadius: 999, minHeight: 48, px: 4.5, py: 1.25, fontWeight: 700, fontSize: 14, textTransform: "uppercase", letterSpacing: ".02em" }}>
                    Get started
                  </Button>
                  {/* Dark mode: the translucent white pill becomes a translucent card surface with light text. */}
                  <Button onClick={openLogin} variant="outlined" size="large"
                    sx={{ borderColor: "var(--imaa-dm-border-strong, rgba(27,42,74,.2))", bgcolor: "rgb(var(--imaa-dm-surface-rgb, 255 255 255) / .94)", color: NAVY_TEXT, "&:hover": { borderColor: NAVY_TEXT, bgcolor: "var(--imaa-dm-surface-hover, #FFFFFF)" }, borderRadius: 999, minHeight: 48, px: 4.5, py: 1.25, fontWeight: 700, fontSize: 14, textTransform: "uppercase", letterSpacing: ".02em", boxShadow: "none" }}>
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
          pt: { xs: 7, md: 10 },
          pb: { xs: 6, md: 8 },
          bgcolor: COOL,
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
                  color: TEAL_TEXT,
                  fontWeight: 700,
                  fontSize: 13,
                  letterSpacing: ".12em",
                  textTransform: "uppercase",
                  mb: 1.25,
                }}
              >
                Why join
              </Typography>

              <Box
                component="h2"
                sx={{
                  ...serifHeadingSx,
                  fontSize: { xs: 36, md: 50 },
                  lineHeight: 1.12,
                  color: HEADING_TEXT,
                  fontWeight: 700,
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
                bgcolor: ORANGE_HOVER,
                color: "#FFFFFF",
                borderRadius: 999,
                boxShadow: "none",
                minHeight: 48,
                px: 4.5,
                fontSize: 14,
                fontWeight: 700,
                textTransform: "uppercase",
                "&:hover": { bgcolor: "#A9361C", boxShadow: "0 8px 18px rgba(169,54,28,.18)" },
              }}
            >
              {authed ? "View events" : "Join now"}
            </Button>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(3, minmax(0, 1fr))" },
              gap: { xs: 2.5, md: 3 },
            }}
          >
            {[
              {
                icon: EventNoteIcon,
                iconColor: ORANGE_HOVER,
                title: "Events & Webinars",
                desc: "Attend conferences, workshops, and live webinars tailored for M&A professionals worldwide.",
              },
              {
                icon: GroupIcon,
                iconColor: TEAL_TEXT,
                title: "Professional Community",
                desc: "Connect with dealmakers, advisors, and executives across the full M&A spectrum.",
              },
              {
                icon: LibraryIcon,
                iconColor: NAVY_TEXT, // navy icon in light; readable light icon on the dark card
                title: "E-Library & Resources",
                desc: "Access curated research, templates, and thought leadership from industry experts.",
              },
              {
                icon: TrendingIcon,
                iconColor: ORANGE_HOVER,
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
                iconColor: NAVY_TEXT, // navy icon in light; readable light icon on the dark card
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
            bgcolor: PAGE_BG,
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
                gap: 0,
                alignItems: "center",
                backgroundColor: CARD_BG,
                borderRadius: "var(--imaa-radius-card)",
                overflow: "hidden",
                border: "1px solid var(--imaa-border)",
                boxShadow: "0 12px 36px rgba(27,42,74,.08)",
                textDecoration: "none",
                color: "inherit",
                "&:hover": {
                  boxShadow: "0 18px 42px rgba(27,42,74,.12)",
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
                    minHeight: { xs: 240, md: 420 },
                  }}
                  role="img"
                  aria-label={featuredEvent.title}
                />
              )}
              <Box sx={{ p: { xs: 3.5, sm: 4, md: 5.5 }, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <Chip
                  label={<><span aria-hidden="true">⭐</span> Featured Event</>}
                  sx={{
                    width: "fit-content",
                    mb: 2,
                    fontWeight: 600,
                    bgcolor: "var(--imaa-dm-tint-orange, #FEF2EE)",
                    color: "var(--imaa-dm-orange-text, var(--imaa-orange-hover))",
                    borderRadius: 999,
                  }}
                />
                <Box
                  component="h2"
                  sx={{
                    ...serifHeadingSx,
                    fontSize: { xs: 26, md: 36 },
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
                    bgcolor: ORANGE_HOVER,
                    color: "#FFFFFF",
                    borderRadius: 999,
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
          py: { xs: 7, md: 8 },
          bgcolor: NAVY, // flat navy (gradients retired)
          textAlign: "center",
        }}>
          <Container maxWidth="md">
            <Box component="h2" sx={{ ...serifHeadingSx, fontSize: { xs: 30, md: 42 }, lineHeight: 1.2, color: "#FFFFFF", mb: 2, fontWeight: 700, letterSpacing: "-.015em" }}>
              Ready to join the M&A network?
            </Box>
            <Typography sx={{ color: "rgba(255,255,255,.75)", fontSize: 17, mb: 5, lineHeight: 1.7 }}>
              Thousands of dealmakers, advisors, and executives already call IMAA Connect home.
            </Typography>
            <Box sx={{ display: "flex", justifyContent: "center", gap: 2, flexWrap: "wrap" }}>
              <Button onClick={openSignup} variant="contained" size="large"
                sx={{ bgcolor: ORANGE_HOVER, color: "#FFFFFF", "&:hover": { bgcolor: "#A9361C" }, boxShadow: "none", borderRadius: 999, minHeight: 48, px: 5, py: 1.5, fontWeight: 700, fontSize: 15, textTransform: "none" }}>
                Create free account
              </Button>
              <Button onClick={openLogin} variant="outlined" size="large"
                sx={{ borderColor: "rgba(255,255,255,.65)", color: "#FFFFFF", "&:hover": { borderColor: "#FFFFFF", bgcolor: "rgba(255,255,255,.08)" }, borderRadius: 999, minHeight: 48, px: 5, py: 1.5, fontWeight: 700, fontSize: 15, textTransform: "none" }}>
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
