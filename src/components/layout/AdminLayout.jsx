// src/components/layout/AdminLayout.jsx
import * as React from "react";
import { Box, Container, IconButton, Typography } from "@mui/material";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import AdminSidebar from "../AdminSidebar";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";

function resolveActiveKey(pathname) {
  if (pathname === "/admin" || pathname === "/admin/") return "resources"; // default tab for /admin
  if (pathname.startsWith("/admin/events")) return "events";
  if (pathname.startsWith("/admin/resources")) return "resources";
  if (pathname.startsWith("/admin/recordings")) return "recordings";
  if (pathname.startsWith("/admin/community/groups")) return "groups";
  if (pathname.startsWith("/admin/groups")) return "groups";
  if (pathname.startsWith("/admin/posts")) return "posts";
  if (pathname.startsWith("/admin/carts")) return "carts";            
  if (pathname.startsWith("/admin/notifications")) return "notifications";
  if (pathname.startsWith("/admin/messages")) return "messages";
  if (pathname.startsWith("/admin/settings")) return "settings";
  if (pathname.startsWith("/admin/staff")) return "staff";
  return "resources";
}

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = React.useState(false);

  const active = React.useMemo(
    () => resolveActiveKey(location.pathname),
    [location.pathname]
  );

  const handleSelect = (key) => {
    if (!key) return;

    // Explicit map keeps navigation stable and avoids accidental "/" fallbacks.
    const map = {
      resources: "/admin/resources",
      recordings: "/admin/recordings",
      groups: "/admin/groups",
      events: "/admin/events",
      posts: "/admin/posts",
      carts: "/admin/carts",
      notifications: "/admin/notifications",
      messages: "/admin/messages",
      settings: "/admin/settings",
      staff: "/admin/staff",
    };

    navigate(map[key] ?? `/admin/${key}`);
    // Close drawer if we are on mobile
    setMobileOpen(false);
  };

  const handleOpenMobileSidebar = () => setMobileOpen(true);
  const handleCloseMobileSidebar = () => setMobileOpen(false);

  return (
    <Box sx={{ py: 3 }}>
      <Container maxWidth="xl">
        {/* Mobile header: title + hamburger button */}
        <Box
          sx={{
            display: { xs: "flex", md: "none" },
            alignItems: "center",
            justifyContent: "space-between",
            mb: 2,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Admin
          </Typography>
          <IconButton
            edge="start"
            onClick={handleOpenMobileSidebar}
            aria-label="open admin navigation"
          >
            <MenuRoundedIcon />
          </IconButton>
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "280px 1fr" },
            gap: 2,
          }}
        >
          {/* DESKTOP sidebar (static) */}
          <Box sx={{ display: { xs: "none", md: "block" } }}>
            <AdminSidebar
              active={active}
              onSelect={handleSelect}
              title="Admin"
            />
          </Box>

          {/* Main content */}
          <Box>
            {/* IMPORTANT: Without Outlet, /admin renders blank */}
            <Outlet />
          </Box>
        </Box>

        {/* MOBILE drawer instance (uses existing Drawer logic in AdminSidebar) */}
        <Box sx={{ display: { xs: "block", md: "none" } }}>
          <AdminSidebar
            active={active}
            onSelect={handleSelect}
            title="Admin"
            mobileOpen={mobileOpen}
            onMobileClose={handleCloseMobileSidebar}
          />
        </Box>
      </Container>
    </Box>
  );
}
