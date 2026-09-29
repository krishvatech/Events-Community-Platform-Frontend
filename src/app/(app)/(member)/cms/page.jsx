"use client";

// Next.js route entry for /cms (creates the Wagtail session, then redirects to the CMS)
// Thin client-only wrapper around the existing page component (no SSR, like the Vite app).
import dynamic from "next/dynamic";

const CmsBridge = dynamic(() => import("@/legacy-pages/CmsBridge.jsx"), { ssr: false });

export default function Page() {
  return <CmsBridge />;
}
