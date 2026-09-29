"use client";

// Next.js route entry for /community/rich-profile/:userId (public in App.jsx)
// Thin client-only wrapper around the existing page component (no SSR, like the Vite app).
import dynamic from "next/dynamic";

const RichProfile = dynamic(() => import("@/legacy-pages/community/RichProfile.jsx"), { ssr: false });

export default function Page() {
  return <RichProfile />;
}
