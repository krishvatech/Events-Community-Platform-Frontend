"use client";

// Next.js route entry for /forgot-password
// Thin client-only wrapper around the existing page component (no SSR, like the Vite app).
import dynamic from "next/dynamic";

const ForgotPassword = dynamic(() => import("@/legacy-pages/ForgotPassword.jsx"), { ssr: false });

export default function Page() {
  return <ForgotPassword />;
}
