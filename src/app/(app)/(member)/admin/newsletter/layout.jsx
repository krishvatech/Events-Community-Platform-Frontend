"use client";

// /admin/newsletter/* (Marketing Hub). Same wrappers as App.jsx:
// <RequireMarketingAccess><MarketingHubLayout> + the child route element.
// The child is rendered HERE (not by the page.jsx files) so it stays mounted
// across in-hub navigation exactly like React Router did - see
// src/next/MarketingHubRoutes.jsx. The page.jsx files only declare the routes.
import dynamic from "next/dynamic";

const RequireMarketingAccess = dynamic(() => import("@/components/RoleBasedRoute.jsx").then((m) => m.RequireMarketingAccess), { ssr: false });
const MarketingHubLayout = dynamic(() => import("@/components/marketing/MarketingHubLayout.jsx"), { ssr: false });
const MarketingHubRoutes = dynamic(() => import("@/next/MarketingHubRoutes.jsx"), { ssr: false });

export default function MarketingHubRouteLayout() {
  return (
    <RequireMarketingAccess>
      <MarketingHubLayout>
        <MarketingHubRoutes />
      </MarketingHubLayout>
    </RequireMarketingAccess>
  );
}
