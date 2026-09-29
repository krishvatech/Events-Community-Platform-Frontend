"use client";

// /admin/blogs/* : same guard as App.jsx blogAdminRoutes (RequireBlogManager =
// Django is_superuser only, matching the Blog API).
import dynamic from "next/dynamic";

const RequireBlogManager = dynamic(() => import("@/components/blogs/RequireBlogManager.jsx"), { ssr: false });

export default function BlogAdminLayout({ children }) {
  return <RequireBlogManager>{children}</RequireBlogManager>;
}
