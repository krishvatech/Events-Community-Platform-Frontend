// src/components/layout/AdminLayout.jsx
import * as React from "react";
import { Box, Container } from "@mui/material";
import { Outlet, useNavigate } from "react-router-dom";
import { clearAuth } from "../../utils/authStorage";


export default function AdminLayout() {
  const navigate = useNavigate();

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
