"use client";

// Next.js route entry for /admin/users/:userId/edit-profile
// Thin client-only wrapper around the existing page component (no SSR, like the Vite app).
import dynamic from "next/dynamic";

const AdminUserProfileEditPage = dynamic(() => import("@/legacy-pages/AdminUserProfileEditPage.jsx"), { ssr: false });

export default function Page() {
  return <AdminUserProfileEditPage />;
}
