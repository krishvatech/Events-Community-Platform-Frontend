"use client";

// Next.js route entry for /admin/recordings
// Thin client-only wrapper around the existing page component (no SSR, like the Vite app).
import dynamic from "next/dynamic";

const AdminRecordingsPage = dynamic(() => import("@/legacy-pages/AdminRecordingsPage.jsx"), { ssr: false });

export default function Page() {
  return <AdminRecordingsPage />;
}
