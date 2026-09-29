"use client";

// Next.js route entry for /admin/blogs/:id/edit (App.jsx renders BlogEditorPage key="edit")
// Thin client-only wrapper around the existing page component (no SSR, like the Vite app).
import dynamic from "next/dynamic";

const BlogEditorPage = dynamic(() => import("@/legacy-pages/blogs/BlogEditorPage.jsx"), { ssr: false });

export default function Page() {
  return <BlogEditorPage />;
}
