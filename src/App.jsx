// src/App.jsx

import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toolbar } from "@mui/material";
import { isOwnerUser, isStaffUser } from "./utils/adminRole";
import KYCNotification from "./components/KYCNotification";
import Header from "./components/Header.jsx";
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
import AdminLayout from "./components/layout/AdminLayout.jsx";
import AdminPostsPage from "./pages/AdminPostsPage.jsx";
import AdminResources from "./pages/AdminResources.jsx";
import AdminGroups from "./pages/AdminGroups.jsx";
import AdminNotificationsPage from "./pages/AdminNotificationsPage.jsx";
import AdminSettings from "./pages/AdminSettings.jsx";
import AdminStaffPage from "./pages/AdminStaffPage.jsx"
import AdminRecordingsPage from "./pages/AdminRecordingsPage.jsx";
import AdminMessagesPage from "./pages/AdminMessagesPage.jsx";
import EventManagePage from "./pages/EventManagePage.jsx";
import AdminCarts from "./pages/AdminCarts.jsx";
import AdminNameRequestsPage from "./pages/AdminNameRequestsPage.jsx";
import KYCCallbackPage from "./pages/KYCCallbackPage.jsx";
import { useParams } from "react-router-dom";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import SocialOAuthCallback from "./pages/SocialOAuthCallback.jsx";
import CognitoOAuthCallback from "./pages/CognitoOAuthCallback.jsx";
import AboutPage from "./pages/AboutPage.jsx";


function RedirectGroupToAdmin() {
  const { idOrSlug } = useParams();
  return <Navigate to={`/admin/groups/${idOrSlug}`} replace />;
}

function RedirectGroupDetailsToAdmin() {
  const { groupId } = useParams();
  return <Navigate to={`/admin/community/groups/${groupId}`} replace />;
}

const AppShell = () => {
  const location = useLocation();

  // Hide header & footer on auth pages and live meeting routes
  const hideChrome =
    location.pathname === "/signin" ||
    location.pathname === "/signup" ||
    location.pathname === "/forgot-password" ||
    location.pathname === "/reset-password" ||
    location.pathname === "/cognito/callback" ||
    location.pathname === "/live" ||
    location.pathname.startsWith("/live/");

  return (
    <>
      {!hideChrome && (
        <>
          <Header />
          {/* Spacer under fixed header */}
          <Toolbar />
        </>
      )}

      <KYCNotification />

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/signin" element={<GuestOnly><SignInPage /></GuestOnly>} />
        <Route path="/signup" element={<GuestOnly><SignUpPage /></GuestOnly>} />
        <Route path="/forgot-password" element={<GuestOnly><ForgotPassword /></GuestOnly>} />
        <Route path="/AdminEvents" element={<RequireAuth><AdminEvents /></RequireAuth>} />
        <Route path="/oauth/callback" element={<SocialOAuthCallback />} />
        <Route path="/cognito/callback" element={<CognitoOAuthCallback />} />
        {/* Admin area driven by AdminSidebar */}
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
          <Route path="name-requests" element={<AdminNameRequestsPage />} />
          <Route path="/admin/events/:eventId" element={<EventManagePage />} />
          {/* keep your recordings behavior same as before */}
          <Route path="recordings" element={<AdminRecordingsPage />} />
          <Route path="groups/:idOrSlug" element={<GroupManagePage />} />
          <Route path="carts" element={<AdminCarts />} />
          <Route path="staff" element={<AdminStaffPage />} />
        </Route>
        <Route path="community/groups/:groupId" element={<GroupDetailsPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/events/:id" element={<EventDetailsPage />} />
        <Route path="/account/cart" element={<MyCartPage />} />
        <Route path="/community" element={<CommunityHubPage />} />
        <Route path="/groups/:idOrSlug" element={<RequireAuth><RedirectGroupToAdmin /></RequireAuth>} />

        {/* My Events list and details */}
        <Route path="/account/events" element={<RequireAuth><MyEventsPage /></RequireAuth>} />
        <Route path="/account/events/:id" element={<RequireAuth><EventDetailsPage /></RequireAuth>} />

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

      {!hideChrome && typeof Footer !== "undefined" && <Footer />}
    </>
  );
};

export default AppShell;