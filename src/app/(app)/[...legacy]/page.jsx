"use client";

// TEMPORARY legacy fallback (removed in the final cleanup phase).
// Only URLs without a migrated App Router page reach it: /live/:meetingId (Live
// Meeting is deliberately out of the migration scope) and unknown URLs, which the
// legacy route table redirects to "/" exactly like the Vite app. Required
// catch-all ([...legacy]) because "/" is now a real App Router page.
import dynamic from "next/dynamic";

const LegacyFallback = dynamic(() => import("@/next/LegacyFallback.jsx"), { ssr: false });

export default function Page() {
  return <LegacyFallback />;
}
