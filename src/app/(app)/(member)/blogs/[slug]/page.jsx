"use client";

// Next.js route entry for /blogs/:slug
// Thin client-only wrapper around the existing page component (no SSR, like the Vite app).
import dynamic from "next/dynamic";

const BlogDetailPage = dynamic(() => import("@/legacy-pages/blogs/BlogDetailPage.jsx"), { ssr: false });

export default function Page() {
  return <BlogDetailPage />;
}
