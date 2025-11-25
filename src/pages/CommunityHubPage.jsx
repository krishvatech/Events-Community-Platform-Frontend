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
import MyPostsPage from "./community/MyPostsPage";

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
        // keep left padding, reduce right padding on desktop
        pl: { xs: 1, sm: 1.5, md: 3 },
        pr: { xs: 1, sm: 1.5, md: 1 },   // 🔑 less blank space on far right
        py: 2,
        maxWidth: 1480,
        mx: "auto",
        width: "100%",
        boxSizing: "border-box",
        overflowX: "hidden",
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
      {/* Mobile + tablet drawer for the left nav */}
      <Drawer
        open={navOpen}
        onClose={() => setNavOpen(false)}
        sx={{
          // drawer is used on xs + sm (320–899, includes 768), hidden on md+
          display: { xs: "block", md: "none" },
          "& .MuiBackdrop-root": {
            backgroundColor: "rgba(15, 23, 42, 0.45)", // dim background
          },
        }}
        PaperProps={{
          sx: {
            width: { xs: "80vw", sm: 280 },      // mobile narrower, tablet fixed 280
            maxWidth: "100vw",
            borderRadius: 0,
            borderTopRightRadius: 24,
            borderBottomRightRadius: 24,

            // 👉 same top spacing for mobile + tablet (like your header)
            position: "fixed",
            left: 0,
            right: "auto",
            top: 56,                              // adjust if header is taller/shorter
            height: "calc(100% - 56px)",
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
            width: { xs: "100%", md: 260 },
            flexShrink: 0,
            display: { xs: "none", md: "block" },

            // we draw our own full-height vertical line on the right (md+ only)
            position: "relative",
            pr: { md: 3 },
            mr: { md: 3 },
            "&::after": {
              content: '""',
              position: "absolute",
              top: 0,
              right: 0,
              width: "1px",
              height: "100%",        // full height of the column
              backgroundColor: "#e2e8f0",
              display: { xs: "none", md: "block" },
            },
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
          ) : view === "myposts" ? (   // <--- Added this block
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
      </Box>
    </Box>
  );
}
