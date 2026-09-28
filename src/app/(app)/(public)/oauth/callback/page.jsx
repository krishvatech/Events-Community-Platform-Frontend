"use client";

// Next.js route entry for /oauth/callback (legacy backend social OAuth callback)
// Thin client-only wrapper around the existing page component (no SSR, like the Vite app).
import dynamic from "next/dynamic";

const SocialOAuthCallback = dynamic(() => import("@/legacy-pages/SocialOAuthCallback.jsx"), { ssr: false });

export default function Page() {
  return <SocialOAuthCallback />;
}
