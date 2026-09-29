"use client";

// Next.js route entry for /admin/series/:seriesId
// Thin client-only wrapper around the existing page component (no SSR, like the Vite app).
import dynamic from "next/dynamic";

const SeriesManagePage = dynamic(() => import("@/legacy-pages/SeriesManagePage.jsx"), { ssr: false });

export default function Page() {
  return <SeriesManagePage />;
}
