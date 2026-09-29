"use client";

// Next.js route entry for /about
// Thin client-only wrapper around the existing page component (no SSR, like the Vite app).
import dynamic from "next/dynamic";

const AboutPage = dynamic(() => import("@/legacy-pages/AboutPage.jsx"), { ssr: false });

export default function Page() {
  return <AboutPage />;
}
