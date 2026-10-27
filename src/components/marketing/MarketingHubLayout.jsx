import React, { useState } from "react";
import { Box, IconButton, Stack, Typography, useMediaQuery, useTheme } from "@mui/material";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import { Outlet } from "react-router-dom";

import MarketingHubSidebar from "./MarketingHubSidebar";
import MarketingNotificationsBell from "./MarketingNotificationsBell.jsx";

const SIDEBAR_WIDTH = 280;

export default function MarketingHubLayout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#F8FAFC" }}>
      {/* Desktop: a permanent fixed drawer. Mobile: a temporary drawer in a portal, reserving no width. */}
      <MarketingHubSidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />

      {/* The mobile bar and the content stack in one column; as siblings in the
          row above, the bar took half the screen beside the content. */}
      <Box
        data-testid="marketing-hub-content"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          width: { xs: "100%", md: `calc(100% - ${SIDEBAR_WIDTH}px)` },
          ml: { xs: 0, md: `${SIDEBAR_WIDTH}px` },
        }}
      >
        {isMobile && (
          <Box
            sx={{
              position: "sticky",
              top: 0,
              zIndex: 1100,
              height: 64,
              px: 1.5,
              display: "flex",
              alignItems: "center",
              gap: 1,
              bgcolor: "#ffffff",
              borderBottom: "1px solid #F0EEEB",
            }}
          >
            <IconButton
              aria-label="Open navigation menu"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
              sx={{ bgcolor: "#fff", boxShadow: 1, "&:hover": { bgcolor: "#f9fafb" } }}
            >
              <MenuRoundedIcon />
            </IconButton>
            <Stack spacing={0}>
              <Typography sx={{ fontWeight: 800, color: "#1B2A4A", lineHeight: 1.1 }}>IMAA</Typography>
              <Typography sx={{ fontWeight: 700, fontSize: 11, color: "#0A9396", letterSpacing: "0.12em" }}>MARKETING HUB</Typography>
            </Stack>
            <Box sx={{ ml: "auto" }}>
              <MarketingNotificationsBell />
            </Box>
          </Box>
        )}

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            minWidth: 0,
            px: { xs: 2, md: 3 },
            py: { xs: 2, md: 3 },
            pt: { xs: 2, md: 3 },
            // Scroll, not clip: content a page lays out too wide stays reachable
            // without the whole document scrolling sideways.
            overflowX: "auto",
          }}
        >
          <Box sx={{ maxWidth: "1600px", mx: "auto", minWidth: 0 }}>
            <Outlet />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
