"use client";

// Next.js route entry for /account/courses/:courseId
// Thin client-only wrapper around the existing page component (no SSR, like the Vite app).
import dynamic from "next/dynamic";

const CoursePlayerPage = dynamic(() => import("@/legacy-pages/CoursePlayerPage.jsx"), { ssr: false });

export default function Page() {
  return <CoursePlayerPage />;
}
