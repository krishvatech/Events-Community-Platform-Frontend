"use client";

// Next.js route entry for /account/events/:slug
// Thin client-only wrapper around the existing page component (no SSR, like the Vite app).
import dynamic from "next/dynamic";

const EventDetailsPage = dynamic(() => import("@/legacy-pages/EventDetailsPage.jsx"), { ssr: false });

export default function Page() {
  return <EventDetailsPage />;
}
