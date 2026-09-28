"use client";

// Next.js route entry for /account/resources
// Thin client-only wrapper around the existing page component (no SSR, like the Vite app).
import dynamic from "next/dynamic";

const MyResourcesPage = dynamic(() => import("@/legacy-pages/MyResourcesPage.jsx"), { ssr: false });

export default function Page() {
  return <MyResourcesPage />;
}
