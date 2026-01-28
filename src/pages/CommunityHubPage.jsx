// src/pages/CommunityHubPage.jsx
import * as React from "react";
import { useSearchParams } from "react-router-dom";
import { Box } from "@mui/material";

import HomePage from "./community/HomePage.jsx";
import LiveFeedPage from "./community/LiveFeedPage.jsx";
import NotificationsPage from "./community/NotificationsPage.jsx";
import GroupsPage from "./community/GroupsPage.jsx";
import MembersPage from "./community/MembersPage.jsx";
import MessagesPage from "./community/MessagesPage.jsx";
import MyPostsPage from "./community/MyPostsPage";

export default function CommunityHubPage() {
  const [searchParams] = useSearchParams();
  const initialView = (searchParams.get("view") || "home").toLowerCase();

  // Note: We rely on the searchParams and parent routing now.
  // UnifiedSidebar drives the ?view=... param.

  const view = initialView;

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 1200, // Reasonable content max width
        mx: "auto",
        px: { xs: 2, md: 3 },
        py: 3,
        boxSizing: "border-box",
      }}
    >
      {view === "home" ? (
        <HomePage />
      ) : view === "myposts" ? (
        <MyPostsPage />
      ) : view === "live" ? (
        <LiveFeedPage />
      ) : view === "notify" ? (
        <NotificationsPage />
      ) : view === "messages" ? (
        <MessagesPage />
      ) : view === "members" ? (
        <MembersPage />
      ) : (
        <GroupsPage />
      )}
    </Box>
  );
}
