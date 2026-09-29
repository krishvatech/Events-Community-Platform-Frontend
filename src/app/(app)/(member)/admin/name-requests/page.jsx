"use client";

// Next.js route entry for /admin/name-requests
// Thin client-only wrapper around the existing page component (no SSR, like the Vite app).
import dynamic from "next/dynamic";

const AdminNameRequestsPage = dynamic(() => import("@/legacy-pages/AdminNameRequestsPage.jsx"), { ssr: false });

export default function Page() {
  return <AdminNameRequestsPage />;
}
