"use client";

// Next.js route entry for /events/:slug. App.jsx also declares /events/:id (EventIdRedirect), but React Router
// always matches the earlier /events/:slug, so numeric ids render EventDetailsPage here too
// Thin client-only wrapper around the existing page component (no SSR, like the Vite app).
import dynamic from "next/dynamic";

const EventDetailsPage = dynamic(() => import("@/legacy-pages/EventDetailsPage.jsx"), { ssr: false });

export default function Page() {
  return <EventDetailsPage />;
}
