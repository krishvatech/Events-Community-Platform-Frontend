"use client";

// Next.js route entry for /groups/:idOrSlug (redirects to /admin/groups/:idOrSlug)
// Thin client-only wrapper around the existing page component (no SSR, like the Vite app).
import dynamic from "next/dynamic";

const RedirectGroupToAdmin = dynamic(() => import("@/routes/routeRedirects.jsx").then((m) => m.RedirectGroupToAdmin), { ssr: false });

export default function Page() {
  return <RedirectGroupToAdmin />;
}
