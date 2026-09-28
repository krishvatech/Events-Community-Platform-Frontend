"use client";

// Application layout for all migrated and legacy-fallback routes.
// Renders the client-only runtime (browser bootstrap + shared AppChrome:
// Header / UnifiedSidebar / KYC notice / Footer), exactly like the Vite app.
import dynamic from "next/dynamic";

const AppRuntime = dynamic(() => import("@/next/AppRuntime.jsx"), { ssr: false });

export default function AppLayout({ children }) {
  return <AppRuntime>{children}</AppRuntime>;
}
