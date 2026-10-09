// src/components/layout/AdminLayout.jsx
import * as React from "react";
import { Box, Container, Drawer, IconButton, List, ListItemButton, ListItemText, Stack, Typography } from "@mui/material";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { Outlet } from "react-router-dom";
import { useLocation, useNavigate } from "#navigation";
import { isMarketingHubPath } from "../../config/marketingNavigation";
import { logoutBrowserSession } from "../../utils/logoutSession";
import { getAccessToken as getStoredAccessToken } from "../../utils/tokenStore";
import "../../styles/adminParity.css";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api")
  .trim()
  .replace(/\/+$/, "");

const ADMIN_NAVIGATION = [
  { label: "Operations", items: [{ label: "Resources", to: "/admin" }, { label: "Events", to: "/admin/events" }, { label: "Series", to: "/admin/series" }, { label: "Recordings", to: "/admin/recordings" }] },
  { label: "Community", items: [{ label: "Members", to: "/admin/users" }, { label: "Groups", to: "/admin/groups" }, { label: "Moderation", to: "/admin/moderation" }, { label: "Posts", to: "/admin/posts" }] },
  { label: "Platform", items: [{ label: "Messages", to: "/admin/messages" }, { label: "Notifications", to: "/admin/notifications" }, { label: "Settings", to: "/admin/settings" }, { label: "Admin guide", to: "/admin/guide" }] },
];

// `children` is provided by the Next.js App Router admin layout; the Vite /
// legacy React Router route table renders nested routes through <Outlet />.
export default function AdminLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isK5FrozenPath = /\/admin\/(newsletter|marketing|email-templates)(\/|$)/.test(location.pathname);
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  React.useEffect(() => {
    const IDLE_MIN = 720; // configurable idle timeout (minutes)
    const IDLE_MS = IDLE_MIN * 60 * 1000;
    let lastActivityAt = Date.now();

    let t = null;

    const logIdleLogoutToServer = () => {
      try {
        const token = getStoredAccessToken();
        const payload = {
          reason: "idle_timeout",
          idle_minutes: IDLE_MIN,
          page: window.location.pathname,
          last_activity_at: new Date(lastActivityAt).toISOString(),
          fired_at: new Date().toISOString(),
        };

        fetch(`${API_BASE}/auth/session/logout/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch(() => {});
      } catch {
        // no-op
      }
    };

    const logoutNow = async (trigger = "idle_timeout") => {
      const now = Date.now();
      const idleSec = Math.max(0, Math.floor((now - lastActivityAt) / 1000));
      console.warn(
        `[AdminLayout] Auto logout: trigger=${trigger}, idleSec=${idleSec}, idleMinLimit=${IDLE_MIN}, path=${window.location.pathname}, at=${new Date(now).toISOString()}`
      );

      logIdleLogoutToServer();
      await logoutBrowserSession();
      navigate("/signin", { replace: true });
    };

    const reset = () => {
      lastActivityAt = Date.now();
      if (t) clearTimeout(t);
      t = setTimeout(() => logoutNow("idle_timeout"), IDLE_MS);
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

  if (isMarketingHubPath(location.pathname)) {
    return children ?? <Outlet />;
  }

  const activeNavigationPath = (to) => to === "/admin"
    ? location.pathname === "/admin"
    : location.pathname === to || location.pathname.startsWith(`${to}/`);

  const navigation = (
    <Box component="nav" aria-label="Admin navigation" className="ecp-admin-navigation">
      <Stack className="ecp-admin-brand" direction="row" alignItems="center" justifyContent="space-between">
        <Box><Typography component="strong">IMAA</Typography><Typography component="span">Administration</Typography></Box>
        <IconButton className="ecp-admin-drawer-close" aria-label="Close admin navigation" onClick={() => setDrawerOpen(false)}><CloseRoundedIcon /></IconButton>
      </Stack>
      {ADMIN_NAVIGATION.map((group) => (
        <Box className="ecp-admin-nav-group" key={group.label}>
          <Typography className="ecp-admin-nav-label">{group.label}</Typography>
          <List disablePadding>
            {group.items.map((item) => <ListItemButton key={item.to} selected={activeNavigationPath(item.to)} onClick={() => { setDrawerOpen(false); navigate(item.to); }}>
              <ListItemText primary={item.label} />
            </ListItemButton>)}
          </List>
        </Box>
      ))}
    </Box>
  );

  return (
    <Box className={isK5FrozenPath ? undefined : "ecp-admin-surface"}>
      {isK5FrozenPath ? <Container maxWidth="xl" sx={{ py: 3 }}>{children ?? <Outlet />}</Container> : <Box className="ecp-admin-shell">
        <Box component="aside" className="ecp-admin-sidebar">{navigation}</Box>
        <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} className="ecp-admin-mobile-drawer" PaperProps={{ className: "ecp-admin-mobile-paper" }}>{navigation}</Drawer>
        <Box className="ecp-admin-workspace">
          <Box component="header" className="ecp-admin-topbar"><IconButton aria-label="Open admin navigation" onClick={() => setDrawerOpen(true)}><MenuRoundedIcon /></IconButton><Typography>Administration</Typography></Box>
          <Container maxWidth={false} className="ecp-admin-main">
            <Box>
          {/* IMPORTANT: Without Outlet, /admin renders blank */}
          {children ?? <Outlet />}
            </Box>
          </Container>
        </Box>
      </Box>}
    </Box>
  );
}
