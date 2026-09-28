"use client";

// Next.js route entry for /account/courses
// Thin client-only wrapper around the existing page component (no SSR, like the Vite app).
import dynamic from "next/dynamic";

const CoursesPage = dynamic(() => import("@/legacy-pages/CoursesPage.jsx"), { ssr: false });

export default function Page() {
  return <CoursesPage />;
}
