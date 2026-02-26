// src/pages/CommunityHubPage.jsx
import * as React from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { Box } from "@mui/material";

import HomePage from "./community/HomePage.jsx";
import LiveFeedPage from "./community/LiveFeedPage.jsx";
import NotificationsPage from "./community/NotificationsPage.jsx";
import GroupsPage from "./community/GroupsPage.jsx";
import MembersPage from "./community/MembersPage.jsx";
import MessagesPage from "./community/MessagesPage.jsx";
import MyPostsPage from "./community/MyPostsPage";
import MyContacts from "./community/mycontacts.jsx";

export default function CommunityHubPage() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const viewRaw = searchParams.get("view") || "home";
  const view = viewRaw.toLowerCase().trim();

  // Debugging view changes
  React.useEffect(() => {
    console.log("CommunityHubPage active view:", view);
  }, [view]);

  const renderContent = () => {
    switch (view) {
      case "home":
        return <HomePage />;
      case "myposts":
        return <MyPostsPage />;
      case "live":
        return <LiveFeedPage />;
      case "notify":
        return <NotificationsPage />;
      case "messages":
        return <MessagesPage />;
      case "members":
        return <MembersPage />;
      case "contacts":
        return <MyContacts />;
      case "groups":
      case "feed":
      default:
        return <GroupsPage />;
    }
  };

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 1200,
        mx: "auto",
        px: { xs: 2, md: 3 },
        py: 3,
        boxSizing: "border-box",
      }}
    >
      {renderContent()}
    </Box>
  );
}
