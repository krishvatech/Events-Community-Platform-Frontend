"use client";

// Next.js route entry for /cognito/callback (Cognito Hosted UI / PKCE callback)
// Thin client-only wrapper around the existing page component (no SSR, like the Vite app).
import dynamic from "next/dynamic";

const CognitoOAuthCallback = dynamic(() => import("@/legacy-pages/CognitoOAuthCallback.jsx"), { ssr: false });

export default function Page() {
  return <CognitoOAuthCallback />;
}
