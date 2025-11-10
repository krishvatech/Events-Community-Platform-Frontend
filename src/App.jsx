// src/App.jsx

import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toolbar } from "@mui/material";
import Header from "./components/Header.jsx";
import HomePage from "./pages/HomePage.jsx";
import SignInPage from "./pages/SignInPage.jsx";
import SignUpPage from "./pages/SignUpPage.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import RequireAuth from "./components/RequireAuth.jsx";
import GuestOnly from "./components/PublicGate.jsx";
import EventsPage from "./pages/EventsPage.jsx";
import ActivityPage from "./pages/ActivityPage.jsx";
import CartPage from "./pages/CartPage.jsx";
import MyEventsPage from "./pages/MyEventsPage.jsx";
import EventDetailsPage from "./pages/EventDetailsPage.jsx";
import LiveMeetingPage from "./pages/LiveMeetingPage.jsx";
import Footer from "./components/Footer.jsx";
import MyRecordingsPage from "./pages/MyRecordingsPage.jsx"
import ProfilePage from "./pages/ProfilePage.jsx";
import ConversationPage from "./pages/ConversationPage.jsx";
import MessagesDirectory from "./pages/MessagesDirectory.jsx";
import ResourceDetails from "./pages/ResourceDetails.jsx";
import CommunityHubPage from "./pages/CommunityHubPage.jsx";
import GroupManagePage from "./pages/GroupManagePage";
import RichProfile from "./pages/community/RichProfile.jsx";
import GroupDetailsPage from "./pages/community/GroupDetailsPage.jsx";
import AdminLayout from "./components/layout/AdminLayout.jsx";
import AdminPostsPage from "./pages/AdminPostsPage.jsx";
import MyResourcesAdmin from "./pages/MyResourcesAdmin.jsx";
import GroupsAdmin from "./pages/GroupsAdmin.jsx";
import AdminNotificationsPage from "./pages/AdminNotificationsPage.jsx";
import AdminSettings from "./pages/AdminSettings.jsx";

import { useParams } from "react-router-dom";

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

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/signin" element={<GuestOnly><SignInPage /></GuestOnly>} />
        <Route path="/signup" element={<GuestOnly><SignUpPage /></GuestOnly>} />
        <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
        {/* Admin area driven by AdminSidebar */}
        <Route path="/admin" element={<RequireAuth><AdminLayout /></RequireAuth>}>
          {/* default page under /admin */}
          <Route index element={<MyResourcesAdmin />} />

          {/* main admin pages */}
          <Route path="events" element={<Dashboard />} />
          <Route path="resources" element={<MyResourcesAdmin />} />
          <Route path="posts" element={<AdminPostsPage />} />
          <Route path="groups" element={<GroupsAdmin />} />
          <Route path="notifications" element={<AdminNotificationsPage />} />
          <Route path="settings" element={<AdminSettings />} />

          {/* keep your recordings behavior same as before */}
          <Route path="recordings" element={<Navigate to="/account/recordings?scope=host" replace />} />

          {/* aliases so the sidebar appears on group manage/details too */}
          <Route path="groups/:idOrSlug" element={<GroupManagePage />} />
        </Route>
         <Route path="community/groups/:groupId" element={<GroupDetailsPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/events/:id" element={<EventDetailsPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/community" element={<CommunityHubPage />} />
        <Route path="/groups/:idOrSlug" element={<RequireAuth><RedirectGroupToAdmin /></RequireAuth>} />

        {/* My Events list and details */}
        <Route path="/myevents" element={<RequireAuth><MyEventsPage /></RequireAuth>} />
        <Route path="/myevents/:id" element={<RequireAuth><EventDetailsPage /></RequireAuth>} />

        {/* LIVE meeting page — no header/footer */}
        <Route path="/live/:meetingId" element={<RequireAuth><LiveMeetingPage /></RequireAuth>} />

        <Route path="/account" element={<RequireAuth><ActivityPage /></RequireAuth>} />
        <Route path="/account/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
        <Route path="/account/recordings" element={<RequireAuth><MyRecordingsPage /></RequireAuth>} />
        <Route path="/account/messages" element={<RequireAuth><MessagesDirectory /></RequireAuth>} />
        <Route path="/account/messages/:conversationId" element={<RequireAuth><ConversationPage /></RequireAuth>} />

        {/* ADD THIS ROUTE FOR RESOURCE DETAILS */}
        <Route path="/resource/:id" element={<RequireAuth><ResourceDetails /></RequireAuth>} />
        {/* ADD THIS ROUTE FOR RICH PROFILE */}
        {/* <Route path="/account/members/:id" element={<RequireAuth><RichProfile /></RequireAuth>} /> */}
        <Route path="/community/rich-profile/:userId" element={<RichProfile />} />
        <Route path="/community/groups/:groupId" element={<RequireAuth><RedirectGroupDetailsToAdmin /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {!hideChrome && typeof Footer !== "undefined" && <Footer />}
    </>
  );
};

export default AppShell;