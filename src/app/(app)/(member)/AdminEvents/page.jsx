"use client";

// Next.js route entry for /AdminEvents (App.jsx: RequireAuth only, outside the /admin layout)
// Thin client-only wrapper around the existing page component (no SSR, like the Vite app).
import dynamic from "next/dynamic";

const AdminEvents = dynamic(() => import("@/legacy-pages/AdminEvents.jsx"), { ssr: false });

export default function Page() {
  return <AdminEvents />;
}
