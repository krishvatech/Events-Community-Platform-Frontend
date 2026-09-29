"use client";

// Layout for the migrated /admin/* routes (Blogs, Newsletter/Marketing Hub).
// Same wrapper as App.jsx's /admin route: RequireAuth (from the (member) group)
// + AdminLayout (idle auto-logout, admin container / Marketing Hub passthrough).
// Admin routes that are not migrated yet are served by the legacy fallback.
import dynamic from "next/dynamic";

const AdminLayout = dynamic(() => import("@/components/layout/AdminLayout.jsx"), { ssr: false });

export default function AdminRouteLayout({ children }) {
  return <AdminLayout>{children}</AdminLayout>;
}
