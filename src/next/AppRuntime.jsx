"use client";

// src/next/AppRuntime.jsx
// Client-only root for migrated (and legacy-fallback) routes. Loaded by
// src/app/(app)/layout.jsx with next/dynamic { ssr: false }, matching the Vite
// app's client-side rendering: browser bootstrap first, then the shared
// application chrome (Header / UnifiedSidebar / Footer / auth state).

import "./browserBootstrap";
import { HelmetProvider } from "react-helmet-async";
import AppChrome from "../components/layout/AppChrome.jsx";

export default function AppRuntime({ children }) {
  return (
    <HelmetProvider>
      <AppChrome>{children}</AppChrome>
    </HelmetProvider>
  );
}
