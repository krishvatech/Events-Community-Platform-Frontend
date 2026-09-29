"use client";

// Next.js route entry for /admin/events/:slug (event management)
// Thin client-only wrapper around the existing page component (no SSR, like the Vite app).
import dynamic from "next/dynamic";

const EventManagePage = dynamic(() => import("@/legacy-pages/EventManagePage.jsx"), { ssr: false });

export default function Page() {
  return <EventManagePage />;
}
