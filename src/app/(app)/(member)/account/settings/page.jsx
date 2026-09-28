"use client";

// Next.js route entry for /account/settings
// Thin client-only wrapper around the existing page component (no SSR, like the Vite app).
import dynamic from "next/dynamic";

const SettingsPage = dynamic(() => import("@/legacy-pages/SettingsPage.jsx"), { ssr: false });

export default function Page() {
  return <SettingsPage />;
}
