"use client";

// Next.js route entry for /account/set-password (signed-in federated users setting a first password)
// Thin client-only wrapper around the existing page component (no SSR, like the Vite app).
import dynamic from "next/dynamic";

const ForgotPassword = dynamic(() => import("@/legacy-pages/ForgotPassword.jsx"), { ssr: false });

export default function Page() {
  return <ForgotPassword authedMode />;
}
