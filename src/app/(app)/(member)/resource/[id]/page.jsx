"use client";

// Next.js route entry for /resource/:id
// Thin client-only wrapper around the existing page component (no SSR, like the Vite app).
import dynamic from "next/dynamic";

const ResourceDetailsPage = dynamic(() => import("@/legacy-pages/ResourceDetailsPage.jsx"), { ssr: false });

export default function Page() {
  return <ResourceDetailsPage />;
}
