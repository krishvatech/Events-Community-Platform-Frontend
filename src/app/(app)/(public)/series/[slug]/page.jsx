"use client";

// Next.js route entry for /series/:slug
// Thin client-only wrapper around the existing page component (no SSR, like the Vite app).
import dynamic from "next/dynamic";

const PublicSeriesLanding = dynamic(() => import("@/legacy-pages/PublicSeriesLanding.jsx"), { ssr: false });

export default function Page() {
  return <PublicSeriesLanding />;
}
