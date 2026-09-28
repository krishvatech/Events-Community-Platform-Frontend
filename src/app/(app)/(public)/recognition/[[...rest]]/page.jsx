"use client";

// Next.js route entry for /recognition and /recognition/*
// Thin client-only wrapper around the existing page component (no SSR, like the Vite app).
import dynamic from "next/dynamic";

const RecognitionDirectoryPage = dynamic(() => import("@/legacy-pages/RecognitionDirectoryPage.jsx"), { ssr: false });

export default function Page() {
  return <RecognitionDirectoryPage />;
}
