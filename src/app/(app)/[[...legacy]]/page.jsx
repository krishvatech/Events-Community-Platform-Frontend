"use client";

// TEMPORARY legacy fallback (removed in Phase 9).
// Every URL without a migrated App Router page (Events, Community, Blogs,
// Newsletter, Admin, Live Meeting, Home, About, ...) is rendered by the Vite
// app's React Router route table, client-side, inside the shared app chrome.
import dynamic from "next/dynamic";

const LegacyFallback = dynamic(() => import("@/next/LegacyFallback.jsx"), { ssr: false });

export default function Page() {
  return <LegacyFallback />;
}
