"use client";

// Next.js route entry for /admin/marketing/activity.
// Same as App.jsx: <RequireSuperAdmin><MarketingHubLayout> with AdminMarketingAuditPage as index.
import dynamic from "next/dynamic";

const RequireSuperAdmin = dynamic(() => import("@/components/RoleBasedRoute.jsx").then((m) => m.RequireSuperAdmin), { ssr: false });
const MarketingHubLayout = dynamic(() => import("@/components/marketing/MarketingHubLayout.jsx"), { ssr: false });
const AdminMarketingAuditPage = dynamic(() => import("@/legacy-pages/AdminMarketingAuditPage.jsx"), { ssr: false });

export default function Page() {
  return (
    <RequireSuperAdmin>
      <MarketingHubLayout>
        <AdminMarketingAuditPage />
      </MarketingHubLayout>
    </RequireSuperAdmin>
  );
}
