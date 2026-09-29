"use client";

// Next.js route entry for /admin/users
// Thin client-only wrapper around the existing page component (no SSR, like the Vite app).
import dynamic from "next/dynamic";

const AdminStaffPage = dynamic(() => import("@/legacy-pages/AdminStaffPage.jsx"), { ssr: false });

export default function Page() {
  return <AdminStaffPage />;
}
