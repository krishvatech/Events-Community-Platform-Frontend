// src/App.jsx

import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import { isOwnerUser, isStaffUser } from "./utils/adminRole";
import AppChrome from "./components/layout/AppChrome.jsx";
import MarketingHubLayout from "./components/marketing/MarketingHubLayout.jsx";
import { blogAdminRoutes, blogReaderRoutes } from "./routes/blogRoutes.jsx";

import HomePage from "./legacy-pages/HomePage.jsx";
import SignInPage from "./legacy-pages/SignInPage.jsx";
import SignUpPage from "./legacy-pages/SignUpPage.jsx";
import AdminEvents from "./legacy-pages/AdminEvents.jsx";
import RequireAuth from "./components/RequireAuth.jsx";
import GuestOnly from "./components/PublicGate.jsx";
import EventsPage from "./legacy-pages/EventsPage.jsx";
import MyResourcesPage from "./legacy-pages/MyResourcesPage.jsx";
import MyCartPage from "./legacy-pages/MyCartPage.jsx";
import MyEventsPage from "./legacy-pages/MyEventsPage.jsx";
import EventDetailsPage from "./legacy-pages/EventDetailsPage.jsx";
import EventCompanionDirectoryPage from "./legacy-pages/EventCompanionDirectoryPage.jsx";
import EventCompanionAccessPage from "./legacy-pages/EventCompanionAccessPage.jsx";
import EventCompanionGuard from "./components/EventCompanionGuard.jsx";
import LiveMeetingPage from "./legacy-pages/LiveMeetingPage.jsx";
import MyRecordingsPage from "./legacy-pages/MyRecordingsPage.jsx"
import ProfilePage from "./legacy-pages/ProfilePage.jsx";
import SettingsPage from "./legacy-pages/SettingsPage.jsx";
import NewsletterPage from "./legacy-pages/NewsletterPage.jsx";
import AdminNewsletterDashboardPage from "./legacy-pages/AdminNewsletterDashboardPage.jsx";
import AdminNewsletterPage from "./legacy-pages/AdminNewsletterPage.jsx";
import AdminNewsletterAnalyticsPage from "./legacy-pages/AdminNewsletterAnalyticsPage.jsx";
import AdminNewsletterContactsPage from "./legacy-pages/AdminNewsletterContactsPage.jsx";
import AdminNewsletterContactDetailPage from "./legacy-pages/AdminNewsletterContactDetailPage.jsx";
import AdminNewsletterCompaniesPage from "./legacy-pages/AdminNewsletterCompaniesPage.jsx";
import AdminNewsletterCompanyDetailPage from "./legacy-pages/AdminNewsletterCompanyDetailPage.jsx";
import AdminNewsletterStagesPage from "./legacy-pages/AdminNewsletterStagesPage.jsx";
import AdminNewsletterPointsPage from "./legacy-pages/AdminNewsletterPointsPage.jsx";
import AdminNewsletterListManagePage from "./legacy-pages/AdminNewsletterListManagePage.jsx";
import AdminMarketingAuditPage from "./legacy-pages/AdminMarketingAuditPage.jsx";
import ResourceDetailsPage from "./legacy-pages/ResourceDetailsPage.jsx";
import CommunityHubPage from "./legacy-pages/CommunityHubPage.jsx";
import GroupManagePage from "./legacy-pages/GroupManagePage";
import RichProfile from "./legacy-pages/community/RichProfile.jsx";
import GroupDetailsPage from "./legacy-pages/community/GroupDetailsPage.jsx";
import PublicGroupLandingPage from "./legacy-pages/community/PublicGroupLandingPage.jsx";
import MyGroupsPage from "./legacy-pages/community/mygroups.jsx";
import AdminLayout from "./components/layout/AdminLayout.jsx";
import AdminPostsPage from "./legacy-pages/AdminPostsPage.jsx";
import AdminResources from "./legacy-pages/AdminResources.jsx";
import AdminGroups from "./legacy-pages/AdminGroups.jsx";
import AdminNotificationsPage from "./legacy-pages/AdminNotificationsPage.jsx";
import AdminSettings from "./legacy-pages/AdminSettings.jsx";
import AdminStaffPage from "./legacy-pages/AdminStaffPage.jsx"
import AdminUserProfileEditPage from "./legacy-pages/AdminUserProfileEditPage.jsx";
import AdminRecordingsPage from "./legacy-pages/AdminRecordingsPage.jsx";
import AdminMessagesPage from "./legacy-pages/AdminMessagesPage.jsx";
import AdminModerationPage from "./legacy-pages/AdminModerationPage.jsx";
import AdminProfileModerationPage from "./legacy-pages/AdminProfileModerationPage.jsx";
import EventManagePage from "./legacy-pages/EventManagePage.jsx";
import SeriesList from "./legacy-pages/SeriesList.jsx";
import SeriesManagePage from "./legacy-pages/SeriesManagePage.jsx";
import PublicSeriesLanding from "./legacy-pages/PublicSeriesLanding.jsx";
import AdminCarts from "./legacy-pages/AdminCarts.jsx";
import AdminNameRequestsPage from "./legacy-pages/AdminNameRequestsPage.jsx";
import KYCCallbackPage from "./legacy-pages/KYCCallbackPage.jsx";
import { RedirectGroupToAdmin, RedirectGroupDetailsToAdmin, EventIdRedirect } from "./routes/routeRedirects.jsx";
import { RequireSuperAdmin, RequireStaffOrAdmin, RequireStaffOrAdminForResources, RequireMarketingAccess } from "./components/RoleBasedRoute.jsx";
import ForgotPassword from "./legacy-pages/ForgotPassword.jsx";
import SocialOAuthCallback from "./legacy-pages/SocialOAuthCallback.jsx";
import CognitoOAuthCallback from "./legacy-pages/CognitoOAuthCallback.jsx";
import ImaaSsoRedirect from "./legacy-pages/ImaaSsoRedirect.jsx";
import MagicLinkPage from "./legacy-pages/MagicLinkPage.jsx";
import AboutPage from "./legacy-pages/AboutPage.jsx";
import CmsBridge from "./legacy-pages/CmsBridge.jsx";
import CoursesPage from "./legacy-pages/CoursesPage.jsx";
import CoursePlayerPage from "./legacy-pages/CoursePlayerPage.jsx";
import AdminRecordingDetailsPage from "./legacy-pages/AdminRecordingDetailsPage.jsx";
import VirtualSpeakersPage from "./legacy-pages/VirtualSpeakersPage.jsx";
import SaleorManager from "./legacy-pages/SaleorManager.jsx";
import EmailTemplatesPage from "./legacy-pages/admin/EmailTemplatesPage.jsx";
import AdminGuidePage from "./legacy-pages/AdminGuidePage.jsx";
import EventLandingPage_Marketing from "./legacy-pages/EventLandingPage_Marketing.jsx";
import SingleEventMarketingPage from "./legacy-pages/SingleEventMarketingPage.jsx";
import AttendeeFormPage from "./legacy-pages/AttendeeFormPage.jsx";
import TrainingProgramsPage from "./legacy-pages/TrainingProgramsPage.jsx";
import RecognitionDirectoryPage from "./legacy-pages/RecognitionDirectoryPage.jsx";


// Route table of the Vite app. Also rendered by the Next.js legacy fallback
// (src/app/(app)/[[...legacy]]/page.jsx) for routes not yet migrated.
export const LegacyRoutes = () => (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/cms" element={<RequireAuth><CmsBridge /></RequireAuth>} />
	          <Route path="/signin" element={<GuestOnly><SignInPage /></GuestOnly>} />
	          <Route path="/signup" element={<GuestOnly><SignUpPage /></GuestOnly>} />
	          <Route path="/forgot-password" element={<GuestOnly><ForgotPassword /></GuestOnly>} />
	          <Route path="/reset-password" element={<Navigate to="/forgot-password" replace />} />
	          <Route path="/auth/magic-link" element={<MagicLinkPage />} />
      <Route path="/AdminEvents" element={<RequireAuth><AdminEvents /></RequireAuth>} />
      <Route path="/oauth/callback" element={<SocialOAuthCallback />} />
      <Route path="/cognito/callback" element={<CognitoOAuthCallback />} />
      <Route path="/sso/imaa" element={<ImaaSsoRedirect />} />

      {/* Admin routes - Layout is handled globally now, so AdminLayout just renders Outlet? */}
      <Route path="/admin" element={<RequireAuth><AdminLayout /></RequireAuth>}>
        <Route index element={<RequireStaffOrAdminForResources><AdminResources /></RequireStaffOrAdminForResources>} />

        {/* main admin pages */}
        <Route path="events" element={<AdminEvents />} />
        <Route path="series" element={<SeriesList />} />
        <Route path="series/:seriesId" element={<SeriesManagePage />} />
        <Route path="resources" element={<RequireStaffOrAdminForResources><AdminResources /></RequireStaffOrAdminForResources>} />
        <Route path="posts" element={<AdminPostsPage />} />
        {/* Platform-level pages: group admins/moderators are scoped to their
            own group and must not reach these. */}
        <Route path="groups" element={<RequireStaffOrAdmin><AdminGroups /></RequireStaffOrAdmin>} />
        <Route path="messages" element={<AdminMessagesPage />} />
        <Route path="notifications" element={<AdminNotificationsPage />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="moderation" element={<RequireStaffOrAdmin><AdminModerationPage /></RequireStaffOrAdmin>} />
        <Route path="moderation/profiles" element={<RequireStaffOrAdmin><AdminProfileModerationPage /></RequireStaffOrAdmin>} />
        <Route path="name-requests" element={<AdminNameRequestsPage />} />
        <Route path="/admin/events/:slug" element={<EventManagePage />} />
        {/* recordings with slug-based routing */}
        <Route path="recordings" element={<AdminRecordingsPage />} />
        <Route path="recordings/:slug" element={<AdminRecordingDetailsPage />} />
        <Route path="groups/:idOrSlug" element={<RequireStaffOrAdmin><GroupManagePage /></RequireStaffOrAdmin>} />
        <Route path="carts" element={<AdminCarts />} />
        <Route path="users" element={<AdminStaffPage />} />
        <Route path="users/:userId/edit-profile" element={<AdminUserProfileEditPage />} />
        <Route path="virtual-speakers" element={<RequireSuperAdmin><VirtualSpeakersPage /></RequireSuperAdmin>} />
        <Route path="saleor" element={<RequireSuperAdmin><SaleorManager /></RequireSuperAdmin>} />
        <Route path="email-templates" element={<RequireSuperAdmin><EmailTemplatesPage /></RequireSuperAdmin>} />
        <Route path="marketing/activity" element={<RequireSuperAdmin><MarketingHubLayout /></RequireSuperAdmin>}>
          <Route index element={<AdminMarketingAuditPage />} />
        </Route>
        <Route path="newsletter" element={<RequireMarketingAccess><MarketingHubLayout /></RequireMarketingAccess>}>
          <Route index element={<AdminNewsletterDashboardPage />} />
          <Route path="campaigns" element={<AdminNewsletterPage />} />
          <Route path="broadcasts" element={<AdminNewsletterPage />} />
          <Route path="templates" element={<AdminNewsletterPage />} />
          <Route path="lists" element={<AdminNewsletterPage />} />
          <Route path="segments" element={<AdminNewsletterPage />} />
          <Route path="analytics" element={<AdminNewsletterAnalyticsPage />} />
          <Route path="settings" element={<AdminNewsletterPage />} />
          <Route path="new" element={<AdminNewsletterPage />} />
          <Route path="audiences/*" element={<Navigate to="/admin/newsletter" replace />} />
          <Route path="contacts" element={<AdminNewsletterContactsPage />} />
          <Route path="contacts/:mauticContactId" element={<AdminNewsletterContactDetailPage />} />
          <Route path="companies" element={<AdminNewsletterCompaniesPage />} />
          <Route path="companies/:companyId" element={<AdminNewsletterCompanyDetailPage />} />
          <Route path="builder" element={<AdminNewsletterPage />} />
          <Route path="builder/:campaignId" element={<AdminNewsletterPage />} />
          <Route path="stages" element={<AdminNewsletterStagesPage />} />
          <Route path="points" element={<AdminNewsletterPointsPage />} />
          <Route path="lists/:slug" element={<AdminNewsletterListManagePage />} />
          <Route path=":campaignId" element={<AdminNewsletterPage />} />
        </Route>
        <Route path="guide" element={<RequireStaffOrAdmin><AdminGuidePage /></RequireStaffOrAdmin>} />
        {blogAdminRoutes}
      </Route>
      <Route path="community/groups/:groupId" element={<GroupDetailsPage />} />
      <Route path="/groups/public/:slug" element={<PublicGroupLandingPage />} />
      <Route path="/events" element={<EventsPage />} />
      <Route path="/public/:slug" element={<EventLandingPage_Marketing />} />
      {/* Design preview (IPDT-749) - same page, green theme */}
      <Route path="/staging/:slug" element={<EventLandingPage_Marketing theme="green" />} />
      <Route path="/landing/:slug" element={<SingleEventMarketingPage />} />
      <Route path="/series/:slug" element={<PublicSeriesLanding />} />
      <Route path="/events/:slug/companion" element={<EventCompanionAccessPage />} />
      <Route path="/events/:slug" element={<EventDetailsPage />} />
      <Route path="/events/:id" element={<EventIdRedirect />} />
      <Route path="/account/cart" element={<MyCartPage />} />
      <Route path="/community" element={<RequireAuth><CommunityHubPage /></RequireAuth>} />
      <Route path="/groups/:idOrSlug" element={<RequireAuth><RedirectGroupToAdmin /></RequireAuth>} />
      <Route path="/community/mygroups" element={<RequireAuth><MyGroupsPage /></RequireAuth>} />
      <Route path="/community/mygroups/:groupId" element={<RequireAuth><GroupDetailsPage /></RequireAuth>} />

      {/* My Events list and details */}
      <Route path="/account/events" element={<RequireAuth><MyEventsPage /></RequireAuth>} />
      <Route path="/account/events/:slug" element={<RequireAuth><EventDetailsPage /></RequireAuth>} />

      {/* Post-Acceptance Forms */}
      <Route path="/forms/:assignmentId" element={<RequireAuth><AttendeeFormPage /></RequireAuth>} />

      {/* LIVE meeting page — no header/footer */}
      <Route path="/live/:meetingId" element={<RequireAuth><LiveMeetingPage /></RequireAuth>} />

      <Route path="/account/courses" element={<RequireAuth><CoursesPage /></RequireAuth>} />
      <Route path="/account/courses/:courseId" element={<RequireAuth><CoursePlayerPage /></RequireAuth>} />
      <Route path="/account/resources" element={<RequireAuth><MyResourcesPage /></RequireAuth>} />
      <Route path="/account/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
      {/* Signed-in federated (e.g. Google) users setting a password for the
          first time. Reuses the ForgotPassword screen/OTP flow; the public
          /forgot-password route is left untouched. */}
      <Route path="/account/set-password" element={<RequireAuth><ForgotPassword authedMode /></RequireAuth>} />
      <Route path="/account/recordings" element={<RequireAuth><MyRecordingsPage /></RequireAuth>} />
      <Route path="/account/settings" element={<RequireAuth><SettingsPage /></RequireAuth>} />
      <Route path="/newsletter" element={<RequireAuth><NewsletterPage /></RequireAuth>} />

      {/* Blogs: Explore Blogs + reader (signed-in members) */}
      {blogReaderRoutes}

      {/* ADD THIS ROUTE FOR RESOURCE DETAILS */}
      <Route path="/resource/:id" element={<RequireAuth><ResourceDetailsPage /></RequireAuth>} />
      {/* ADD THIS ROUTE FOR RICH PROFILE */}
      {/* <Route path="/account/members/:id" element={<RequireAuth><RichProfile /></RequireAuth>} /> */}
      <Route path="/community/rich-profile/:userId" element={<RichProfile />} />
      <Route path="/community/groups/:groupId" element={<RequireAuth><RedirectGroupDetailsToAdmin /></RequireAuth>} />

      {/* IMAA Standalone Public Pages */}
      <Route path="/m-and-a-trainings" element={<TrainingProgramsPage />} />
      <Route path="/m-and-a-trainings/*" element={<TrainingProgramsPage />} />
      <Route path="/recognition" element={<RecognitionDirectoryPage />} />
      <Route path="/recognition/*" element={<RecognitionDirectoryPage />} />

      <Route path="*" element={<Navigate to="/" replace />} />
      <Route path="/kyc/callback" element={<KYCCallbackPage />} />
    </Routes>
);

const AppShell = () => (
  <AppChrome>
    <LegacyRoutes />
  </AppChrome>
);

export default AppShell;
