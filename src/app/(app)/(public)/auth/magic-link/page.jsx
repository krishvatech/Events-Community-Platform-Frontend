"use client";

// Next.js route entry for /auth/magic-link
// Thin client-only wrapper around the existing page component (no SSR, like the Vite app).
import dynamic from "next/dynamic";

const MagicLinkPage = dynamic(() => import("@/legacy-pages/MagicLinkPage.jsx"), { ssr: false });

export default function Page() {
  return <MagicLinkPage />;
}
