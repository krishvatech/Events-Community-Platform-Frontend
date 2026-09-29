"use client";

// Next.js route entry for /newsletter
// Thin client-only wrapper around the existing page component (no SSR, like the Vite app).
import dynamic from "next/dynamic";

const NewsletterPage = dynamic(() => import("@/legacy-pages/NewsletterPage.jsx"), { ssr: false });

export default function Page() {
  return <NewsletterPage />;
}
