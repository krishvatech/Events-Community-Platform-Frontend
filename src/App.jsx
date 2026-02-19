// src/App.jsx

import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toolbar, Box, IconButton, useMediaQuery, useTheme } from "@mui/material";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded"; // Mobile toggle

import { isOwnerUser, isStaffUser } from "./utils/adminRole";
import KYCNotification from "./components/KYCNotification";
import Header from "./components/Header.jsx";
import UnifiedSidebar from "./components/UnifiedSidebar.jsx"; // [NEW]

import HomePage from "./pages/HomePage.jsx";
import SignInPage from "./pages/SignInPage.jsx";
import SignUpPage from "./pages/SignUpPage.jsx";
import AdminEvents from "./pages/AdminEvents.jsx";
import RequireAuth from "./components/RequireAuth.jsx";
import GuestOnly from "./components/PublicGate.jsx";
import EventsPage from "./pages/EventsPage.jsx";
import MyResourcesPage from "./pages/MyResourcesPage.jsx";
import MyCartPage from "./pages/MyCartPage.jsx";
import MyEventsPage from "./pages/MyEventsPage.jsx";
import EventDetailsPage from "./pages/EventDetailsPage.jsx";
import LiveMeetingPage from "./pages/LiveMeetingPage.jsx";
import Footer from "./components/Footer.jsx";
import MyRecordingsPage from "./pages/MyRecordingsPage.jsx"
import ProfilePage from "./pages/ProfilePage.jsx";
import ResourceDetailsPage from "./pages/ResourceDetailsPage.jsx";
import CommunityHubPage from "./pages/CommunityHubPage.jsx";
import GroupManagePage from "./pages/GroupManagePage";
import RichProfile from "./pages/community/RichProfile.jsx";
import GroupDetailsPage from "./pages/community/GroupDetailsPage.jsx";
import MyGroupsPage from "./pages/community/mygroups.jsx";
import AdminLayout from "./components/layout/AdminLayout.jsx";
import AdminPostsPage from "./pages/AdminPostsPage.jsx";
import AdminResources from "./pages/AdminResources.jsx";
import AdminGroups from "./pages/AdminGroups.jsx";
import AdminNotificationsPage from "./pages/AdminNotificationsPage.jsx";
import AdminSettings from "./pages/AdminSettings.jsx";
import AdminStaffPage from "./pages/AdminStaffPage.jsx"
import AdminRecordingsPage from "./pages/AdminRecordingsPage.jsx";
import AdminMessagesPage from "./pages/AdminMessagesPage.jsx";
import AdminModerationPage from "./pages/AdminModerationPage.jsx";
import AdminProfileModerationPage from "./pages/AdminProfileModerationPage.jsx";
import EventManagePage from "./pages/EventManagePage.jsx";
import AdminCarts from "./pages/AdminCarts.jsx";
import AdminNameRequestsPage from "./pages/AdminNameRequestsPage.jsx";
import KYCCallbackPage from "./pages/KYCCallbackPage.jsx";
import { useParams, useNavigate } from "react-router-dom";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import SocialOAuthCallback from "./pages/SocialOAuthCallback.jsx";
import CognitoOAuthCallback from "./pages/CognitoOAuthCallback.jsx";
import AboutPage from "./pages/AboutPage.jsx";
import CmsBridge from "./pages/CmsBridge.jsx";
import AdminRecordingDetailsPage from "./pages/AdminRecordingDetailsPage.jsx";
import { CircularProgress } from "@mui/material";


function RedirectGroupToAdmin() {
  const { idOrSlug } = useParams();
  return <Navigate to={`/admin/groups/${idOrSlug}`} replace />;
}

function RedirectGroupDetailsToAdmin() {
  const { groupId } = useParams();
  return <Navigate to={`/admin/community/groups/${groupId}`} replace />;
}

// Redirect numeric event IDs to slug-based URLs
function EventIdRedirect() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Only redirect if id is numeric
    if (!/^\d+$/.test(id)) {
      navigate('/events', { replace: true });
      return;
    }

    const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api').replace(/\/$/, '');

    fetch(`${API_BASE}/events/${id}/`)
      .then(r => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then(event => {
        if (event.slug) {
          navigate(`/events/${event.slug}`, { replace: true });
        } else {
          navigate('/events', { replace: true });
        }
      })
      .catch(() => {
        navigate('/events', { replace: true });
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) {
    return <CircularProgress sx={{ display: 'block', margin: '50px auto' }} />;
  }
  return null;
}

// Auth helper
const getAccessToken = () => localStorage.getItem("access_token");
const isAuthed = () => !!getAccessToken();

const AppShell = () => {
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [authed, setAuthed] = useState(isAuthed());
  const [mobileOpen, setMobileOpen] = useState(false);

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


  // Hide header & footer on auth pages and live meeting routes
  const hideChrome =
    location.pathname === "/signin" ||
    location.pathname === "/signup" ||
    location.pathname === "/forgot-password" ||
    location.pathname === "/reset-password" ||
    location.pathname === "/cognito/callback" ||
    location.pathname === "/live" ||
    location.pathname.startsWith("/live/");

  const showSidebar = authed && !hideChrome;
  const showHeader = !authed && !hideChrome;

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

      <KYCNotification />

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
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/cms" element={<RequireAuth><CmsBridge /></RequireAuth>} />
          <Route path="/signin" element={<GuestOnly><SignInPage /></GuestOnly>} />
          <Route path="/signup" element={<GuestOnly><SignUpPage /></GuestOnly>} />
          <Route path="/forgot-password" element={<GuestOnly><ForgotPassword /></GuestOnly>} />
          <Route path="/AdminEvents" element={<RequireAuth><AdminEvents /></RequireAuth>} />
          <Route path="/oauth/callback" element={<SocialOAuthCallback />} />
          <Route path="/cognito/callback" element={<CognitoOAuthCallback />} />

          {/* Admin routes - Layout is handled globally now, so AdminLayout just renders Outlet? */}
          <Route path="/admin" element={<RequireAuth><AdminLayout /></RequireAuth>}>
            <Route index element={<AdminResources />} />

            {/* main admin pages */}
            <Route path="events" element={<AdminEvents />} />
            <Route path="resources" element={<AdminResources />} />
            <Route path="posts" element={<AdminPostsPage />} />
            <Route path="groups" element={<AdminGroups />} />
            <Route path="messages" element={<AdminMessagesPage />} />
            <Route path="notifications" element={<AdminNotificationsPage />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="moderation" element={<AdminModerationPage />} />
            <Route path="moderation/profiles" element={<AdminProfileModerationPage />} />
            <Route path="name-requests" element={<AdminNameRequestsPage />} />
            <Route path="/admin/events/:eventId" element={<EventManagePage />} />
            {/* keep your recordings behavior same as before */}
            <Route path="recordings" element={<AdminRecordingsPage />} />
            <Route path="recordings/:id" element={<AdminRecordingDetailsPage />} />
            <Route path="groups/:idOrSlug" element={<GroupManagePage />} />
            <Route path="carts" element={<AdminCarts />} />
            <Route path="staff" element={<AdminStaffPage />} />
          </Route>
          <Route path="community/groups/:groupId" element={<GroupDetailsPage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/events/:slug" element={<EventDetailsPage />} />
          <Route path="/events/:id" element={<EventIdRedirect />} />
          <Route path="/account/cart" element={<MyCartPage />} />
          <Route path="/community" element={<CommunityHubPage />} />
          <Route path="/groups/:idOrSlug" element={<RequireAuth><RedirectGroupToAdmin /></RequireAuth>} />
          <Route path="/community/mygroups" element={<RequireAuth><MyGroupsPage /></RequireAuth>} />
          <Route path="/community/mygroups/:groupId" element={<RequireAuth><GroupDetailsPage /></RequireAuth>} />

          {/* My Events list and details */}
          <Route path="/account/events" element={<RequireAuth><MyEventsPage /></RequireAuth>} />
          <Route path="/account/events/:slug" element={<RequireAuth><EventDetailsPage /></RequireAuth>} />

          {/* LIVE meeting page — no header/footer */}
          <Route path="/live/:meetingId" element={<RequireAuth><LiveMeetingPage /></RequireAuth>} />

          <Route path="/account/resources" element={<RequireAuth><MyResourcesPage /></RequireAuth>} />
          <Route path="/account/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
          <Route path="/account/recordings" element={<RequireAuth><MyRecordingsPage /></RequireAuth>} />

          {/* ADD THIS ROUTE FOR RESOURCE DETAILS */}
          <Route path="/resource/:id" element={<RequireAuth><ResourceDetailsPage /></RequireAuth>} />
          {/* ADD THIS ROUTE FOR RICH PROFILE */}
          {/* <Route path="/account/members/:id" element={<RequireAuth><RichProfile /></RequireAuth>} /> */}
          <Route path="/community/rich-profile/:userId" element={<RichProfile />} />
          <Route path="/community/groups/:groupId" element={<RequireAuth><RedirectGroupDetailsToAdmin /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
          <Route path="/kyc/callback" element={<KYCCallbackPage />} />
        </Routes>
      </Box>

      {!hideChrome && !authed && typeof Footer !== "undefined" && <Footer />}
    </Box>
  );
};

export default AppShell;
