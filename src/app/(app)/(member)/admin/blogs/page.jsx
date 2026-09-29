"use client";

// Next.js route entry for /admin/blogs (Blog management)
// Thin client-only wrapper around the existing page component (no SSR, like the Vite app).
import dynamic from "next/dynamic";

const MyBlogsPage = dynamic(() => import("@/legacy-pages/blogs/MyBlogsPage.jsx"), { ssr: false });

export default function Page() {
  return <MyBlogsPage />;
}
