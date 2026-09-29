"use client";

// Next.js route entry for /admin/virtual-speakers
// Same guard as App.jsx: <RequireSuperAdmin>. Thin client-only wrapper (no SSR, like the Vite app).
import dynamic from "next/dynamic";

const RequireSuperAdmin = dynamic(() => import("@/components/RoleBasedRoute.jsx").then((m) => m.RequireSuperAdmin), { ssr: false });
const VirtualSpeakersPage = dynamic(() => import("@/legacy-pages/VirtualSpeakersPage.jsx"), { ssr: false });

export default function Page() {
  return (
    <RequireSuperAdmin>
      <VirtualSpeakersPage />
    </RequireSuperAdmin>
  );
}
