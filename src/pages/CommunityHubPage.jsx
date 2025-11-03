// src/pages/CommunityHubPage.jsx
import * as React from "react";
import { Box, Grid, IconButton, Paper, Typography, Drawer } from "@mui/material";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";

import CommunitySideBar from "../components/CommunitySideBar.jsx";
import HomePage from "./community/HomePage.jsx";
import LiveFeedPage from "./community/LiveFeedPage.jsx";
import NotificationsPage from "./community/NotificationsPage.jsx";
import GroupsPage from "./community/GroupsPage.jsx";
import MembersPage from "./community/MembersPage.jsx";
import MessagesPage from "./community/MessagesPage.jsx";

// Keep a light topics list for the sidebar (safe mock; replace from API anytime)
const TOPICS = [
  "Eco-Friendly tips",
  "Sustainable Living",
  "Climate Action & Advocacy",
  "Recycling & Upcycling",
];

export default function CommunityHubPage() {
  const [view, setView] = React.useState("feed"); // "home" | "live" | "notify" | "messages" | "members" | "feed"
  const [navOpen, setNavOpen] = React.useState(false);

  const titleMap = {
    home: "Community Home",
    live: "Live Feed",
    notify: "Notifications",
    messages: "Messages",
    members: "Member Directory",
    feed: "Groups",
  };
  const title = titleMap[view] || "Community";

  return (
    <Box sx={{ px: { xs: 2, md: 3 }, py: 2, maxWidth: 1280, mx: "auto" }}>
      {/* Title bar */}
      <Paper
        elevation={0}
        sx={{
          mb: 2,
          p: 2,
          border: theme => `1px solid ${theme.palette.divider}`,
          borderRadius: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 800 }}>{title}</Typography>
        <IconButton
          sx={{ display: { xs: "inline-flex", md: "none" } }}
          onClick={() => setNavOpen(true)}
          aria-label="Open navigation"
        >
          <MenuRoundedIcon />
        </IconButton>
      </Paper>

      {/* Mobile drawer for the left nav */}
      <Drawer
        open={navOpen}
        onClose={() => setNavOpen(false)}
        PaperProps={{ sx: { width: 280 } }}
        sx={{ display: { xs: "block", md: "none" } }}
      >
        <Box sx={{ p: 2 }}>
          <CommunitySideBar
            view={view}
            topics={TOPICS}
            onChangeView={(key) => {
              setView(key);
              setNavOpen(false);
            }}
          />
        </Box>
      </Drawer>

      <Grid container spacing={2}>
        {/* Left rail (desktop) */}
        <Grid
          item
          xs={12}
          md={3}
          order={{ xs: 2, md: 1 }}
          sx={{ display: { xs: "none", md: "block" } }}
        >
          <CommunitySideBar
            view={view}
            topics={TOPICS}
            onChangeView={(key) => setView(key)}
          />
        </Grid>

        {/* Main area */}
        <Grid item xs={12} md={9} order={{ xs: 1, md: 2 }}>
          {view === "home" ? (
            <HomePage />
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
        </Grid>
      </Grid>
    </Box>
  );
}