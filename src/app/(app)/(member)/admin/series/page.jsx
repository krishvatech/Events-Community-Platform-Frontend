"use client";

// Next.js route entry for /admin/series
// Thin client-only wrapper around the existing page component (no SSR, like the Vite app).
import dynamic from "next/dynamic";

const SeriesList = dynamic(() => import("@/legacy-pages/SeriesList.jsx"), { ssr: false });

export default function Page() {
  return <SeriesList />;
}
