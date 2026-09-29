"use client";

// Next.js route entry for /admin/moderation/profiles
// Same guard as App.jsx: <RequireStaffOrAdmin>. Thin client-only wrapper (no SSR, like the Vite app).
import dynamic from "next/dynamic";

const RequireStaffOrAdmin = dynamic(() => import("@/components/RoleBasedRoute.jsx").then((m) => m.RequireStaffOrAdmin), { ssr: false });
const AdminProfileModerationPage = dynamic(() => import("@/legacy-pages/AdminProfileModerationPage.jsx"), { ssr: false });

export default function Page() {
  return (
    <RequireStaffOrAdmin>
      <AdminProfileModerationPage />
    </RequireStaffOrAdmin>
  );
}
