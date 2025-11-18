// src/pages/CommunityHubPage.jsx
import * as React from "react";
import { useSearchParams } from "react-router-dom";
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
  const [searchParams, setSearchParams] = useSearchParams();
  const initialView = (searchParams.get("view") || "home").toLowerCase();
  const [view, setView] = React.useState(initialView); // "home" | "live" | "notify" | "messages" | "members" | "feed"
  const [navOpen, setNavOpen] = React.useState(false);

  const titleMap = {
    home: "Community Home",
    live: "Live Feed",
    notify: "Notifications",
    messages: "Messages",
    members: "Member Directory",
    feed: "Groups",
  };
  const subtitleMap = {
    home: "Your personalised community home with posts, groups, and friends.",
    live: "See what’s happening right now in your community feed.",
    notify: "All your community notifications in one place.",
    messages: "Chat with members and groups you’re part of.",
    members: "Browse and connect with community members.",
    feed: "Discover and manage your groups.",
  };

  const title = titleMap[view] || "Community";
  const subtitle =
    subtitleMap[view] ||
    "Browse posts, groups, messages, and members in your community.";

  const handleChangeView = (key) => {
    setView(key);
    setSearchParams(key === "home" ? {} : { view: key }, { replace: true });
  };

  return (
    <Box
      sx={{
        // less padding on small screens so content doesn’t get cropped
        px: { xs: 1, sm: 1.5, md: 3 },
        py: 2,
        maxWidth: 1480,
        mx: "auto",
        width: "100%",
        boxSizing: "border-box",
        overflowX: "hidden", // avoid horizontal cut / scrollbar on 768px
      }}
    >
      {/* Top header + mobile menu trigger */}
      <Paper
        elevation={0}
        sx={{
          mb: 2,
          px: 2,
          py: 1.5,
          borderRadius: 3,
          border: "1px solid #e2e8f0",
          // show only on mobile / tablet, hide on desktop
          display: { xs: "flex", md: "none" },
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Box>
          <Typography
            variant="overline"
            sx={{ fontWeight: 600, color: "text.secondary", letterSpacing: 1 }}
          >
            Community
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              mt: 0.5,
              display: { xs: "none", sm: "block" },
            }}
          >
            {subtitle}
          </Typography>
        </Box>

        {/* Mobile burger icon – opens the drawer */}
        <IconButton
          onClick={() => setNavOpen(true)}
          sx={{ display: { xs: "inline-flex", md: "none" } }}
          aria-label="Open community navigation"
        >
          <MenuRoundedIcon />
        </IconButton>
      </Paper>

      {/* Mobile drawer for the left nav */}
      <Drawer
        open={navOpen}
        onClose={() => setNavOpen(false)}
        sx={{ display: { xs: "block", md: "none" } }}
        PaperProps={{
          sx: {
            width: 280,

            // 👇 ONLY for very small screens (e.g. 375–425px)
            // move drawer below header + keep full visible height
            mt: { xs: 7, sm: 0 },                     // 7 * 8px = 56px ≈ header height
            height: { xs: "calc(100% - 56px)", sm: "100%" },
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <CommunitySideBar
            view={view}
            topics={TOPICS}
            onChangeView={(key) => {
              handleChangeView(key);
              setNavOpen(false); // close drawer after selecting
            }}
          />
        </Box>
      </Drawer>

      {/* ===== MAIN LAYOUT (desktop/tablet) ===== */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          alignItems: "flex-start",
          gap: { xs: 2, md: 3 },
        }}
      >
        {/* Left rail (desktop) */}
        <Box
          sx={{
            width: { xs: "100%", md: 260 }, // fixed-ish width on md+ (works at 1024px and 1440px)
            flexShrink: 0,
            display: { xs: "none", md: "block" },
          }}
        >
          <CommunitySideBar
            view={view}
            topics={TOPICS}
            onChangeView={handleChangeView}
          />
        </Box>

        {/* Main area */}
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            width: "100%",
            maxWidth: "100%", // prevent inner Box from being wider than viewport
          }}
        >
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
        </Box>
      </Box>
    </Box>
  );
}
