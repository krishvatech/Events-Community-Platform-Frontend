"use client";

// Next.js route entry for /admin/recordings/:slug
// Thin client-only wrapper around the existing page component (no SSR, like the Vite app).
import dynamic from "next/dynamic";

const AdminRecordingDetailsPage = dynamic(() => import("@/legacy-pages/AdminRecordingDetailsPage.jsx"), { ssr: false });

export default function Page() {
  return <AdminRecordingDetailsPage />;
}
