"use client";

// Next.js route entry for /admin/notifications
// Thin client-only wrapper around the existing page component (no SSR, like the Vite app).
import dynamic from "next/dynamic";

const AdminNotificationsPage = dynamic(() => import("@/legacy-pages/AdminNotificationsPage.jsx"), { ssr: false });

export default function Page() {
  return <AdminNotificationsPage />;
}
