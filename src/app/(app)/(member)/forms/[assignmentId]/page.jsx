"use client";

// Next.js route entry for /forms/:assignmentId (post-acceptance forms)
// Thin client-only wrapper around the existing page component (no SSR, like the Vite app).
import dynamic from "next/dynamic";

const AttendeeFormPage = dynamic(() => import("@/legacy-pages/AttendeeFormPage.jsx"), { ssr: false });

export default function Page() {
  return <AttendeeFormPage />;
}
