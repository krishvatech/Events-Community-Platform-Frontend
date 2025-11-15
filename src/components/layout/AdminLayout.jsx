// src/components/layout/AdminLayout.jsx
import * as React from "react";
import { Box, Container } from "@mui/material";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import AdminSidebar from "../AdminSidebar";

function resolveActiveKey(pathname) {
  if (pathname === "/admin" || pathname === "/admin/") return "resources"; // default tab for /admin
  if (pathname.startsWith("/admin/events")) return "events";
  if (pathname.startsWith("/admin/resources")) return "resources";
  if (pathname.startsWith("/admin/recordings")) return "recordings";
  if (pathname.startsWith("/admin/community/groups")) return "groups";
  if (pathname.startsWith("/admin/groups")) return "groups";
  if (pathname.startsWith("/admin/posts")) return "posts";
  if (pathname.startsWith("/admin/notifications")) return "notifications";
  if (pathname.startsWith("/admin/settings")) return "settings";
  if (pathname.startsWith("/admin/staff")) return "staff";
  return "resources";
}

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();

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
      notifications: "/admin/notifications",
      settings: "/admin/settings",
      staff: "/admin/staff",
    };

    navigate(map[key] ?? `/admin/${key}`);
  };

  return (
    <Box sx={{ py: 3 }}>
      <Container maxWidth="xl">
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "280px 1fr" },
            gap: 2,
          }}
        >
          <Box>
            <AdminSidebar
              active={active}
              onSelect={handleSelect}
              title="Admin"
            />
          </Box>

          <Box>
            {/* IMPORTANT: Without Outlet, /admin renders blank */}
            <Outlet />
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
