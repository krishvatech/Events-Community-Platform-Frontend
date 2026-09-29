"use client";

// Next.js route entry for /admin/resources
// Same guard as App.jsx: <RequireStaffOrAdminForResources>. Thin client-only wrapper (no SSR, like the Vite app).
import dynamic from "next/dynamic";

const RequireStaffOrAdminForResources = dynamic(() => import("@/components/RoleBasedRoute.jsx").then((m) => m.RequireStaffOrAdminForResources), { ssr: false });
const AdminResources = dynamic(() => import("@/legacy-pages/AdminResources.jsx"), { ssr: false });

export default function Page() {
  return (
    <RequireStaffOrAdminForResources>
      <AdminResources />
    </RequireStaffOrAdminForResources>
  );
}
