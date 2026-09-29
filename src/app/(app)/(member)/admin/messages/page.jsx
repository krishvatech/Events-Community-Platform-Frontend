"use client";

// Next.js route entry for /admin/messages
// Thin client-only wrapper around the existing page component (no SSR, like the Vite app).
import dynamic from "next/dynamic";

const AdminMessagesPage = dynamic(() => import("@/legacy-pages/AdminMessagesPage.jsx"), { ssr: false });

export default function Page() {
  return <AdminMessagesPage />;
}
