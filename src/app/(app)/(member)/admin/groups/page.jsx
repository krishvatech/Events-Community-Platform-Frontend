"use client";

// Next.js route entry for /admin/groups
// Same guard as App.jsx: <RequireStaffOrAdmin>. Thin client-only wrapper (no SSR, like the Vite app).
import dynamic from "next/dynamic";

const RequireStaffOrAdmin = dynamic(() => import("@/components/RoleBasedRoute.jsx").then((m) => m.RequireStaffOrAdmin), { ssr: false });
const AdminGroups = dynamic(() => import("@/legacy-pages/AdminGroups.jsx"), { ssr: false });

export default function Page() {
  return (
    <RequireStaffOrAdmin>
      <AdminGroups />
    </RequireStaffOrAdmin>
  );
}
