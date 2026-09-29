"use client";

// Next.js route entry for /admin/posts
// Thin client-only wrapper around the existing page component (no SSR, like the Vite app).
import dynamic from "next/dynamic";

const AdminPostsPage = dynamic(() => import("@/legacy-pages/AdminPostsPage.jsx"), { ssr: false });

export default function Page() {
  return <AdminPostsPage />;
}
