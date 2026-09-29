"use client";

// Next.js route entry for / (Home)
// Thin client-only wrapper around the existing page component (no SSR, like the Vite app).
import dynamic from "next/dynamic";

const HomePage = dynamic(() => import("@/legacy-pages/HomePage.jsx"), { ssr: false });

export default function Page() {
  return <HomePage />;
}
