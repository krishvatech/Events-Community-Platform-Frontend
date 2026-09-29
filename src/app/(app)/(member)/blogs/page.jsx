"use client";

// Next.js route entry for /blogs (Explore Blogs)
// Thin client-only wrapper around the existing page component (no SSR, like the Vite app).
import dynamic from "next/dynamic";

const ExploreBlogsPage = dynamic(() => import("@/legacy-pages/blogs/ExploreBlogsPage.jsx"), { ssr: false });

export default function Page() {
  return <ExploreBlogsPage />;
}
