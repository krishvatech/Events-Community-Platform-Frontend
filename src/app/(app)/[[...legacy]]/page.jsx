"use client";

// TEMPORARY legacy fallback (removed in Phase 9).
// Every URL without a migrated App Router page (Home, About, CMS, the Admin
// platform outside Blogs/Marketing Hub, /AdminEvents, Live Meeting, unknown
// URLs -> "/") is rendered by
// the Vite app's React Router route table, client-side, inside the shared app chrome.
import dynamic from "next/dynamic";

const LegacyFallback = dynamic(() => import("@/next/LegacyFallback.jsx"), { ssr: false });

export default function Page() {
  return <LegacyFallback />;
}
