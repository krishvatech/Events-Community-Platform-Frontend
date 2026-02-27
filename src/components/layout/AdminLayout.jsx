// src/components/layout/AdminLayout.jsx
import * as React from "react";
import { Box, Container } from "@mui/material";
import { Outlet, useNavigate } from "react-router-dom";
import { clearAuth } from "../../utils/authStorage";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api")
  .trim()
  .replace(/\/+$/, "");

export default function AdminLayout() {
  const navigate = useNavigate();

  React.useEffect(() => {
    const IDLE_MIN = 720; // configurable idle timeout (minutes)
    const IDLE_MS = IDLE_MIN * 60 * 1000;
    let lastActivityAt = Date.now();

    let t = null;

    const logIdleLogoutToServer = () => {
      try {
        const token = localStorage.getItem("access_token");
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

    const logoutNow = (trigger = "idle_timeout") => {
      const now = Date.now();
      const idleSec = Math.max(0, Math.floor((now - lastActivityAt) / 1000));
      console.warn(
        `[AdminLayout] Auto logout: trigger=${trigger}, idleSec=${idleSec}, idleMinLimit=${IDLE_MIN}, path=${window.location.pathname}, at=${new Date(now).toISOString()}`
      );

      logIdleLogoutToServer();
      clearAuth();
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

  return (
    <Box sx={{ py: 3 }}>
      <Container maxWidth="xl">
        <Box>
          {/* IMPORTANT: Without Outlet, /admin renders blank */}
          <Outlet />
        </Box>
      </Container>
    </Box>
  );
}

