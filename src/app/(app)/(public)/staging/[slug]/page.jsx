"use client";

// Next.js route entry for /staging/:slug (design preview, green theme)
// Thin client-only wrapper around the existing page component (no SSR, like the Vite app).
import dynamic from "next/dynamic";

const EventLandingPage_Marketing = dynamic(() => import("@/legacy-pages/EventLandingPage_Marketing.jsx"), { ssr: false });

export default function Page() {
  return <EventLandingPage_Marketing theme="green" />;
}
