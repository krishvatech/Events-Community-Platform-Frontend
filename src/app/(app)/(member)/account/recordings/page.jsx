"use client";

// Next.js route entry for /account/recordings
// Thin client-only wrapper around the existing page component (no SSR, like the Vite app).
import dynamic from "next/dynamic";

const MyRecordingsPage = dynamic(() => import("@/legacy-pages/MyRecordingsPage.jsx"), { ssr: false });

export default function Page() {
  return <MyRecordingsPage />;
}
