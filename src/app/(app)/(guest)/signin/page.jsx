"use client";

// Next.js route entry for /signin
// Thin client-only wrapper around the existing page component (no SSR, like the Vite app).
import dynamic from "next/dynamic";

const SignInPage = dynamic(() => import("@/legacy-pages/SignInPage.jsx"), { ssr: false });

export default function Page() {
  return <SignInPage />;
}
