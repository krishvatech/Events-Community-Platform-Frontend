import React, { useState } from "react";
import { Box, IconButton, Stack, Typography, useMediaQuery, useTheme } from "@mui/material";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import { Outlet } from "react-router-dom";

import MarketingHubSidebar from "./MarketingHubSidebar";

const SIDEBAR_WIDTH = 280;

export default function MarketingHubLayout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#F8FAFC" }}>
      <MarketingHubSidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />

      {isMobile && (
        <Box
          sx={{
            position: "sticky",
            top: 0,
            zIndex: 1100,
            width: "100%",
            height: 64,
            px: 1.5,
            display: "flex",
            alignItems: "center",
            gap: 1,
            bgcolor: "#ffffff",
            borderBottom: "1px solid #F0EEEB",
          }}
        >
          <IconButton onClick={() => setMobileOpen(true)} sx={{ bgcolor: "#fff", boxShadow: 1, "&:hover": { bgcolor: "#f9fafb" } }}>
            <MenuRoundedIcon />
          </IconButton>
          <Stack spacing={0}>
            <Typography sx={{ fontWeight: 800, color: "#1B2A4A", lineHeight: 1.1 }}>IMAA</Typography>
            <Typography sx={{ fontWeight: 700, fontSize: 11, color: "#0A9396", letterSpacing: "0.12em" }}>MARKETING HUB</Typography>
          </Stack>
        </Box>
      )}

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { xs: "100%", md: `calc(100% - ${SIDEBAR_WIDTH}px)` },
          ml: { xs: 0, md: `${SIDEBAR_WIDTH}px` },
          px: { xs: 2, md: 3 },
          py: { xs: 2, md: 3 },
          pt: { xs: 2, md: 3 },
          overflowX: "hidden",
        }}
      >
        <Box sx={{ maxWidth: "1600px", mx: "auto" }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
