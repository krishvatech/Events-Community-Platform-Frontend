"use client";

// Next.js route entry for /events
// Thin client-only wrapper around the existing page component (no SSR, like the Vite app).
import dynamic from "next/dynamic";

const EventsPage = dynamic(() => import("@/legacy-pages/EventsPage.jsx"), { ssr: false });

export default function Page() {
  return <EventsPage />;
}
