import React, { useState } from "react";
import { Box, IconButton, Stack, Typography, useMediaQuery, useTheme } from "@mui/material";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import { Outlet } from "react-router-dom";

import MarketingHubSidebar from "./MarketingHubSidebar";

const SIDEBAR_WIDTH = 280;

// `children` is provided by the Next.js App Router Marketing Hub layouts; the
// Vite / legacy React Router route table renders nested routes through <Outlet />.
export default function MarketingHubLayout({ children }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, minHeight: "100vh", minWidth: 0, bgcolor: "var(--imaa-bg-member)" }}>
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
            bgcolor: "var(--imaa-dm-surface, #ffffff)",
            borderBottom: "1px solid var(--imaa-dm-border, #F0EEEB)",
          }}
        >
          <IconButton aria-label="Open Marketing Hub navigation" onClick={() => setMobileOpen(true)} sx={{ minWidth: 44, minHeight: 44, bgcolor: "var(--imaa-dm-surface, #fff)", border: "1px solid var(--imaa-border)", "&:hover": { bgcolor: "var(--imaa-bg-cool)" } }}>
            <MenuRoundedIcon />
          </IconButton>
          <Stack spacing={0}>
            <Typography sx={{ fontWeight: 800, color: "var(--imaa-dm-text, #1B2A4A)", lineHeight: 1.1 }}>IMAA</Typography>
            <Typography sx={{ fontWeight: 700, fontSize: 11, color: "var(--imaa-dm-teal-text, #0A9396)", letterSpacing: "0.12em" }}>MARKETING HUB</Typography>
          </Stack>
        </Box>
      )}

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          maxWidth: "100%",
          width: { xs: "100%", md: `calc(100% - ${SIDEBAR_WIDTH}px)` },
          ml: { xs: 0, md: `${SIDEBAR_WIDTH}px` },
          px: { xs: 2, md: 3 },
          py: { xs: 2, md: 3 },
          pt: { xs: 2, md: 3 },
          overflowX: "hidden",
        }}
      >
        <Box sx={{ maxWidth: "1600px", mx: "auto" }}>
          {children ?? <Outlet />}
        </Box>
      </Box>
    </Box>
  );
}
