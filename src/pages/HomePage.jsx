// src/pages/HomePage.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams, Navigate } from "react-router-dom";
import { apiClient } from "../utils/api";
import AuthModal from "../components/AuthModal.jsx";
import {
  Box,
  Container,
  Button,
  Typography,
  Card,
} from "@mui/material";
import {
  EventNote as EventNoteIcon,
  Group as GroupIcon,
  LibraryBooks as LibraryIcon,
  TrendingUp as TrendingIcon,
  VerifiedUser as VerifiedIcon,
  Groups as GroupsIcon,
} from "@mui/icons-material";

const getAccessToken = () => localStorage.getItem("access_token");
const isAuthed = () => !!getAccessToken();

const NAVY = "#1B2A4A";
const TEAL = "#0A9396";
const ORANGE = "#E8532F";

const ChevronPattern = () => (
  <Box
    sx={{
      position: "absolute", right: 0, top: 0, bottom: 0,
      width: { xs: 0, md: "42%" }, overflow: "hidden", pointerEvents: "none",
    }}
    aria-hidden
  >
    {[
      { top: "8%", size: 280, colors: ["#38BDF8", "#34D399"] },
      { top: "38%", size: 220, colors: ["#FBBF24", "#F97316"] },
      { top: "62%", size: 170, colors: ["#A78BFA", "#EC4899"] },
    ].map(({ top, size, colors }, i) => (
      <svg key={i} style={{ position: "absolute", top, right: -size * 0.2 }}
        width={size} height={size} viewBox="0 0 100 100" fill="none">
        <polyline points="20,50 50,20 80,50 50,80" fill="none"
          stroke={`url(#g${i})`} strokeWidth="10" strokeLinecap="round"
          strokeLinejoin="round" opacity="0.65" />
        <defs>
          <linearGradient id={`g${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors[0]} />
            <stop offset="100%" stopColor={colors[1]} />
          </linearGradient>
        </defs>
      </svg>
    ))}
  </Box>
);

const FeatureCard = ({ icon: Icon, iconColor, title, desc }) => (
  <Box
    sx={{
      width: "100%",
      minHeight: { xs: 160, md: 152 },
      bgcolor: "#FFFFFF",
      border: "1px solid #D9E2EC",
      borderRadius: "28px",
      px: { xs: 3, md: 3.5 },
      py: { xs: 3, md: 3.25 },
      display: "flex",
      flexDirection: "column",
      justifyContent: "flex-start",
    }}
  >
    <Box
      sx={{
        width: 40,
        height: 40,
        borderRadius: "50%",
        bgcolor: `${iconColor}14`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        mb: 2.5,
      }}
    >
      <Icon sx={{ color: iconColor, fontSize: 20 }} />
    </Box>

    <Typography
      sx={{
        fontWeight: 700,
        fontSize: "15px",
        lineHeight: 1.35,
        color: NAVY,
        mb: 1.25,
      }}
    >
      {title}
    </Typography>

    <Typography
      sx={{
        fontSize: "14px",
        lineHeight: 1.7,
        color: "#6B7A90",
      }}
    >
      {desc}
    </Typography>
  </Box>
);

export default function HomePage() {
  // TEMPORARY: Redirect to default event instead of marketing landing page
  return <Navigate to="/events/m-a-in-uncertain-times" replace />;

  /* COMMENTED OUT: Original marketing landing page code - restore by removing the above redirect
  const [searchParams] = useSearchParams();
  const authed = isAuthed();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("login");
  const [page, setPage] = useState(null);

  useEffect(() => {
    const m = searchParams.get("openModal");
    if (m === "login" || m === "signup") { setModalMode(m); setModalOpen(true); }
  }, [searchParams]);

  useEffect(() => {
    apiClient.get("/cms/pages/home/").then(r => setPage(r.data)).catch(() => null);
  }, []);

  const openLogin = () => { setModalMode("login"); setModalOpen(true); };
  const openSignup = () => { setModalMode("signup"); setModalOpen(true); };

  const heroTitle = page?.hero_title || "The network that moves deals forward";
  const heroSubtitle = page?.hero_subtitle ||
    "IMAA Connect brings together M&A professionals worldwide — events, community, resources and more.";
  const heroImage = page?.hero_image_url || "";
  const useLightHero = !heroImage;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#FFFFFF" }}>

      {/* HERO *//*
      <Box component="section" sx={{
        position: "relative", minHeight: { xs: 520, md: 620 }, overflow: "hidden",
        display: "flex", alignItems: "center",
        background: heroImage
          ? `linear-gradient(rgba(15,32,64,.55),rgba(15,32,64,.65)), url(${heroImage}) center/cover no-repeat`
          : "linear-gradient(120deg, #E0F2FE 0%, #ECFDF5 55%, #F8FAFC 100%)",
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
              bgcolor: useLightHero ? TEAL + "1A" : "rgba(255,255,255,.15)",
              color: useLightHero ? TEAL : "#E0F2FE",
              border: `1px solid ${useLightHero ? TEAL + "33" : "rgba(255,255,255,.3)"}`,
              borderRadius: 100, px: 1.5, py: 0.5, fontSize: 11, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.06em", mb: 3,
            }}>
              <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: useLightHero ? TEAL : "#34D399" }} />
              IMAA Connect
            </Box>

            <Typography variant="h1" sx={{
              fontSize: { xs: 34, md: 52 }, fontWeight: 800, lineHeight: 1.1,
              color: useLightHero ? NAVY : "#FFFFFF", mb: 2.5, letterSpacing: "-0.02em",
            }}>
              {heroTitle}
            </Typography>

            <Typography
              sx={{
                fontSize: { xs: 16, md: 18 },
                lineHeight: 1.7,
                mb: 4,
                color: useLightHero ? "#475569" : "rgba(255,255,255,.85)",
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
                  sx={{ bgcolor: ORANGE, "&:hover": { bgcolor: "#CC4422" }, boxShadow: "none", borderRadius: 2, px: 4, py: 1.5, fontWeight: 700, fontSize: 15, textTransform: "none" }}>
                  Explore Events
                </Button>
              ) : (
                <>
                  <Button onClick={openSignup} variant="contained" size="large"
                    sx={{ bgcolor: useLightHero ? NAVY : ORANGE, "&:hover": { bgcolor: useLightHero ? "#2C3E5A" : "#CC4422" }, boxShadow: "none", borderRadius: 2, px: 4, py: 1.5, fontWeight: 700, fontSize: 15, textTransform: "none" }}>
                    Get started
                  </Button>
                  <Button onClick={openLogin} variant="outlined" size="large"
                    sx={{ borderColor: useLightHero ? "#CBD5E1" : "rgba(255,255,255,.5)", color: useLightHero ? NAVY : "#FFFFFF", "&:hover": { borderColor: useLightHero ? NAVY : "#FFFFFF", bgcolor: useLightHero ? "rgba(15,32,64,.04)" : "rgba(255,255,255,.1)" }, borderRadius: 2, px: 4, py: 1.5, fontWeight: 600, fontSize: 15, textTransform: "none" }}>
                    Log in
                  </Button>
                </>
              )}
            </Box>
          </Box>
        </Container>
      </Box>

      {/* FEATURES *//*
      <Box
        component="section"
        sx={{
          py: { xs: 8, md: 10 },
          bgcolor: "#F5F8FC",
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ textAlign: "center", mb: { xs: 5, md: 6.5 } }}>
            <Typography
              sx={{
                color: TEAL,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                fontSize: 12,
                mb: 1.5,
              }}
            >
              WHY JOIN
            </Typography>

            <Typography
              variant="h2"
              sx={{
                fontSize: { xs: 30, md: 52 },
                fontWeight: 800,
                lineHeight: 1.15,
                color: NAVY,
                mb: 1.5,
                letterSpacing: "-0.02em",
              }}
            >
              Built for M&A professionals
            </Typography>

            <Typography
              sx={{
                color: "#6B7A90",
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
                iconColor: "#F0643B",
                title: "Events & Webinars",
                desc: "Attend conferences, workshops, and live webinars tailored for M&A professionals worldwide.",
              },
              {
                icon: GroupIcon,
                iconColor: "#159AA5",
                title: "Professional Community",
                desc: "Connect with dealmakers, advisors, and executives across the full M&A spectrum.",
              },
              {
                icon: LibraryIcon,
                iconColor: "#8B5CF6",
                title: "E-Library & Resources",
                desc: "Access curated research, templates, and thought leadership from industry experts.",
              },
              {
                icon: TrendingIcon,
                iconColor: "#E8A11A",
                title: "Courses & Training",
                desc: "Earn designations and upskill with structured M&A training programs.",
              },
              {
                icon: VerifiedIcon,
                iconColor: "#18B67A",
                title: "Verified Profiles",
                desc: "Build credibility with identity verification and professional badges.",
              },
              {
                icon: GroupsIcon,
                iconColor: "#EC4899",
                title: "Private Groups",
                desc: "Join invite-only groups, alumni networks, and deal communities.",
              },
            ].map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </Box>
        </Container>
      </Box>

      {/* CTA BANNER *//*
      {!authed && (
        <Box component="section" sx={{
          py: { xs: 8, md: 10 },
          background: `linear-gradient(120deg, ${NAVY} 0%, #1E3A5F 100%)`,
          textAlign: "center",
        }}>
          <Container maxWidth="md">
            <Typography variant="h2" sx={{ fontSize: { xs: 28, md: 40 }, fontWeight: 800, color: "#FFFFFF", mb: 2 }}>
              Ready to join the M&A network?
            </Typography>
            <Typography sx={{ color: "rgba(255,255,255,.75)", fontSize: 17, mb: 5, lineHeight: 1.7 }}>
              Thousands of dealmakers, advisors, and executives already call IMAA Connect home.
            </Typography>
            <Box sx={{ display: "flex", justifyContent: "center", gap: 2, flexWrap: "wrap" }}>
              <Button onClick={openSignup} variant="contained" size="large"
                sx={{ bgcolor: ORANGE, "&:hover": { bgcolor: "#CC4422" }, boxShadow: "none", borderRadius: 2, px: 5, py: 1.5, fontWeight: 700, fontSize: 15, textTransform: "none" }}>
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
  */
}
