"use client";

// Next.js route entry for /community/mygroups
// Thin client-only wrapper around the existing page component (no SSR, like the Vite app).
import dynamic from "next/dynamic";

const MyGroupsPage = dynamic(() => import("@/legacy-pages/community/mygroups.jsx"), { ssr: false });

export default function Page() {
  return <MyGroupsPage />;
}
