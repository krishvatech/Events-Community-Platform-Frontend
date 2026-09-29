"use client";

// Next.js route entry for /groups/public/:slug
// Thin client-only wrapper around the existing page component (no SSR, like the Vite app).
import dynamic from "next/dynamic";

const PublicGroupLandingPage = dynamic(() => import("@/legacy-pages/community/PublicGroupLandingPage.jsx"), { ssr: false });

export default function Page() {
  return <PublicGroupLandingPage />;
}
