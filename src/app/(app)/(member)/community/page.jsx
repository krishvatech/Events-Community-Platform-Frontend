"use client";

// Next.js route entry for /community (?view=home|live|forum|groups|members|contacts|notify|myposts|...)
// Thin client-only wrapper around the existing page component (no SSR, like the Vite app).
import dynamic from "next/dynamic";

const CommunityHubPage = dynamic(() => import("@/legacy-pages/CommunityHubPage.jsx"), { ssr: false });

export default function Page() {
  return <CommunityHubPage />;
}
