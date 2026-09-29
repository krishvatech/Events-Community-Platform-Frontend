"use client";

// Next.js route entry for /landing/:slug
// Thin client-only wrapper around the existing page component (no SSR, like the Vite app).
import dynamic from "next/dynamic";

const SingleEventMarketingPage = dynamic(() => import("@/legacy-pages/SingleEventMarketingPage.jsx"), { ssr: false });

export default function Page() {
  return <SingleEventMarketingPage />;
}
