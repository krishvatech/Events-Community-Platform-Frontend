// src/components/layout/AdminLayout.jsx
import * as React from "react";
import { Box, Container, IconButton, Typography } from "@mui/material";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import AdminSidebar from "../AdminSidebar";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import { isStaffUser } from "../../utils/adminRole.js";
import { clearAuth } from "../../utils/authStorage";

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
  if (pathname.startsWith("/admin/name-requests")) return "name-requests";
  return "resources";
}

export default function AdminLayout() {
  const staff = isStaffUser();
  const sidebarTitle = staff ? "Staff" : "Admin";

  const location = useLocation();
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    const IDLE_MIN = 20; // ✅ choose 15–30
    const IDLE_MS = IDLE_MIN * 60 * 1000;

    let t = null;

    const logoutNow = () => {
      clearAuth();
      navigate("/signin", { replace: true });
    };

    const reset = () => {
      if (t) clearTimeout(t);
      t = setTimeout(logoutNow, IDLE_MS);
    };

    // activity events
    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));

    reset(); // start timer

    return () => {
      if (t) clearTimeout(t);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [navigate]);

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
      "name-requests": "/admin/name-requests",
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
            {sidebarTitle}
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
              title={sidebarTitle}
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
            title={sidebarTitle}
            mobileOpen={mobileOpen}
            onMobileClose={handleCloseMobileSidebar}
          />
        </Box>
      </Container>
    </Box>
  );
}
