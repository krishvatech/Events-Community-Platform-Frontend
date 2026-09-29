"use client";

// Next.js route entry for /account/events
// Thin client-only wrapper around the existing page component (no SSR, like the Vite app).
import dynamic from "next/dynamic";

const MyEventsPage = dynamic(() => import("@/legacy-pages/MyEventsPage.jsx"), { ssr: false });

export default function Page() {
  return <MyEventsPage />;
}
