"use client";

// Next.js route entry for /admin/blogs/new (App.jsx renders BlogEditorPage key="new"; a separate route remounts it the same way)
// Thin client-only wrapper around the existing page component (no SSR, like the Vite app).
import dynamic from "next/dynamic";

const BlogEditorPage = dynamic(() => import("@/legacy-pages/blogs/BlogEditorPage.jsx"), { ssr: false });

export default function Page() {
  return <BlogEditorPage />;
}
