// src/components/layout/AppChrome.jsx
// Application chrome shared by the Vite app (src/App.jsx) and the Next.js app
// (src/next/AppRuntime.jsx): member-session bootstrap, auth state sync, public
// Header / member UnifiedSidebar / KYC notice / Footer, and the main content
// wrapper. Extracted verbatim from App.jsx's AppShell; routes are passed as children.

import React, { useState, useEffect } from "react";
import { useLocation } from "#navigation";
import { Toolbar, Box, IconButton, useMediaQuery, useTheme, CircularProgress } from "@mui/material";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded"; // Mobile toggle

import KYCNotification from "../KYCNotification";
import Header from "../Header.jsx";
import UnifiedSidebar from "../UnifiedSidebar.jsx";
import Footer from "../Footer.jsx";
import { isMarketingHubPath } from "../../config/marketingNavigation";
import { isBlogReaderPath } from "../../config/blogNavigation";
import { getAccessToken as getStoredAccessToken } from "../../utils/tokenStore";
import { isSecureAuthSessionEnabled } from "../../utils/secureAuthSession";
import { bootstrapMemberAuthSession } from "../../utils/memberAuthSession";

// Auth helper
const getAccessToken = () => getStoredAccessToken();
const isAuthed = () => {
  // Treat guest sessions as NOT authenticated for dashboard/sidebar sections.
  // Guests are only allowed on /live/* via RequireAuth special handling.
  if (localStorage.getItem("is_guest") === "true") return false;
  return !!getAccessToken();
};

const AppChrome = ({ children }) => {
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [authed, setAuthed] = useState(isAuthed());
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authReady, setAuthReady] = useState(!isSecureAuthSessionEnabled());

  // Secure-session mode keeps the member access token in memory only. After a
  // full page reload, restore it once from the HttpOnly session cookie before
  // route guards/header/sidebar decide whether the user is authenticated.
  useEffect(() => {
    let cancelled = false;

    if (!isSecureAuthSessionEnabled()) {
      setAuthReady(true);
      return () => { cancelled = true; };
    }

    const initialPath = window.location.pathname.replace(/\/$/, "") || "/";
    const callbackCreatesSession =
      initialPath === "/cognito/callback" ||
      initialPath === "/oauth/callback" ||
      initialPath === "/auth/magic-link";

    if (callbackCreatesSession) {
      setAuthReady(true);
      return () => { cancelled = true; };
    }

    bootstrapMemberAuthSession()
      .catch(() => null)
      .finally(() => {
        if (cancelled) return;
        setAuthed(isAuthed());
        setAuthReady(true);
        try {
          window.dispatchEvent(new Event("auth:changed"));
        } catch {
          // no-op
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Sync auth state
  useEffect(() => {
    const syncAuth = () => setAuthed(isAuthed());
    window.addEventListener("storage", syncAuth);
    window.addEventListener("auth:changed", syncAuth);
    return () => {
      window.removeEventListener("storage", syncAuth);
      window.removeEventListener("auth:changed", syncAuth);
    };
  }, []);

  // Sync auth on location change (sometimes needed)
  useEffect(() => {
    setAuthed(isAuthed());
    setMobileOpen(false); // Close mobile drawer on nav
  }, [location.pathname]);


  // Hide header & footer on auth pages, live meeting routes, and public branded event pages
  // Also hide chrome on event marketing pages (single slug route or /landing/:slug)
  // And hide on IMAA standalone public pages
  const normalizedPath = location.pathname.replace(/\/$/, "");
  const isImaaStandalonePublicPage =
    normalizedPath === "/m-and-a-trainings" ||
    normalizedPath.startsWith("/m-and-a-trainings/") ||
    normalizedPath === "/recognition" ||
    normalizedPath.startsWith("/recognition/");

  const isCompanionPage = location.pathname.includes("/companion");
  const isMarketingHub = isMarketingHubPath(location.pathname);
  const isSsoRedirectPage = normalizedPath === "/sso/imaa";
  const isSingleEventPage = (location.pathname.startsWith("/landing/") && location.pathname !== "/landing") ||
                            (!location.pathname.startsWith("/events") &&
                            !location.pathname.startsWith("/account") &&
                            !location.pathname.startsWith("/admin") &&
                            !location.pathname.startsWith("/community") &&
                            !location.pathname.startsWith("/landing") &&
                            !location.pathname.startsWith("/newsletter") &&
                            !isBlogReaderPath(location.pathname) &&
                            location.pathname !== "/" &&
                            location.pathname !== "/about" &&
                            location.pathname !== "/cms" &&
                            location.pathname.match(/^\/[a-zA-Z0-9\-]+\/?$/));
  const hideChrome =
    isSsoRedirectPage ||
    isImaaStandalonePublicPage ||
    location.pathname === "/signin" ||
    location.pathname === "/signup" ||
    location.pathname === "/forgot-password" ||
    location.pathname === "/reset-password" ||
    location.pathname === "/auth/magic-link" ||
    location.pathname === "/cognito/callback" ||
    location.pathname === "/live" ||
    location.pathname.startsWith("/live/") ||
    location.pathname.startsWith("/public/") ||
    location.pathname.startsWith("/staging/") ||
    isCompanionPage ||
    isSingleEventPage;

  const showSidebar = authed && !hideChrome && !isMarketingHub;
  const showHeader = !authed && !hideChrome;

  if (!authReady) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress size={30} />
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>

      {/* 1. Unauthorized User -> Header */}
      {showHeader && (
        <>
          <Header />
          <Toolbar />
        </>
      )}

      {/* 2. Authorized User -> Sidebar */}
      {showSidebar && (
        <>
          <UnifiedSidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />

          {/* Mobile Handburger for Authed User */}
          {isMobile && (
            <Box sx={{ position: "fixed", top: 12, left: 12, zIndex: 1200 }}>
              <IconButton
                onClick={() => setMobileOpen(true)}
                sx={{ bgcolor: "white", boxShadow: 1, "&:hover": { bgcolor: "#f9fafb" } }}
              >
                <MenuRoundedIcon />
              </IconButton>
            </Box>
          )}
        </>
      )}

      {!isCompanionPage && !isImaaStandalonePublicPage && !isSsoRedirectPage && <KYCNotification />}

      {/* Main Content Wrapper */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: showSidebar && !isMobile ? "calc(100% - 280px)" : "100%",
          ml: showSidebar && !isMobile ? "280px" : 0,
          pt: isMobile && showSidebar ? 6 : 0, // spacing for mobile hamburger?
        }}
      >
        {children}
      </Box>

      {!hideChrome && !authed && typeof Footer !== "undefined" && <Footer />}
    </Box>
  );
};

export default AppChrome;
