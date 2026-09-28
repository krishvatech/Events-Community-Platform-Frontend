"use client";

// Next.js route entry for /signup
// Thin client-only wrapper around the existing page component (no SSR, like the Vite app).
import dynamic from "next/dynamic";

const SignUpPage = dynamic(() => import("@/legacy-pages/SignUpPage.jsx"), { ssr: false });

export default function Page() {
  return <SignUpPage />;
}
