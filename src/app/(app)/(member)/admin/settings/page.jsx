"use client";

// Next.js route entry for /admin/settings
// Thin client-only wrapper around the existing page component (no SSR, like the Vite app).
import dynamic from "next/dynamic";

const AdminSettings = dynamic(() => import("@/legacy-pages/AdminSettings.jsx"), { ssr: false });

export default function Page() {
  return <AdminSettings />;
}
