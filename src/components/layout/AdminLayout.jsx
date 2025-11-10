// src/components/layout/AdminLayout.jsx
import * as React from "react";
import { Box, Container } from "@mui/material";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import AdminSidebar from "../AdminSidebar";

// Map current URL to the sidebar's active key
function getActiveKey(pathname) {
  if (pathname.startsWith("/admin/posts")) return "posts";
  if (pathname.startsWith("/admin/resources")) return "resources";
  if (pathname.startsWith("/admin/recordings")) return "recordings";
  if (pathname.startsWith("/admin/groups")) return "groups";
  if (pathname.startsWith("/admin/events")) return "events";
  if (pathname.startsWith("/admin/community/groups")) return "groups"; // group details alias
  if (pathname.startsWith("/admin/notifications")) return "notifications";
  if (pathname.startsWith("/admin/settings")) return "settings";
  return "resources"; // default
}

export default function AdminLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const active = getActiveKey(pathname);

  const handleSelect = (key) => {
    if (key === "recordings") {
      // keep your current behavior for recordings
      navigate("/account/recordings?scope=host");
      return;
    }
    if (key === "events") {
    navigate("/admin/events");
    return;
  }
    // default: go to /admin/<key>
    navigate(`/admin/${key}`);
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
            <AdminSidebar active={active} onSelect={handleSelect} title="Admin" />
          </Box>
          <Box>
            <Outlet />
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
