"use client";

// Next.js route entry for /events/:slug/companion
// Thin client-only wrapper around the existing page component (no SSR, like the Vite app).
import dynamic from "next/dynamic";

const EventCompanionAccessPage = dynamic(() => import("@/legacy-pages/EventCompanionAccessPage.jsx"), { ssr: false });

export default function Page() {
  return <EventCompanionAccessPage />;
}
