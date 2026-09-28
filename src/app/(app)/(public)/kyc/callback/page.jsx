"use client";

// Next.js route entry for /kyc/callback
// Thin client-only wrapper around the existing page component (no SSR, like the Vite app).
import dynamic from "next/dynamic";

const KYCCallbackPage = dynamic(() => import("@/legacy-pages/KYCCallbackPage.jsx"), { ssr: false });

export default function Page() {
  return <KYCCallbackPage />;
}
