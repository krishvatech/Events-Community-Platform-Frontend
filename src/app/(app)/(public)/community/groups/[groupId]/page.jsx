"use client";

// Next.js route entry for /community/groups/:groupId. App.jsx declares it twice; React Router matches the first,
// unguarded GroupDetailsPage route, so no RequireAuth here (RedirectGroupDetailsToAdmin is unreachable)
// Thin client-only wrapper around the existing page component (no SSR, like the Vite app).
import dynamic from "next/dynamic";

const GroupDetailsPage = dynamic(() => import("@/legacy-pages/community/GroupDetailsPage.jsx"), { ssr: false });

export default function Page() {
  return <GroupDetailsPage />;
}
