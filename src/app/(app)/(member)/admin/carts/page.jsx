"use client";

// Next.js route entry for /admin/carts
// Thin client-only wrapper around the existing page component (no SSR, like the Vite app).
import dynamic from "next/dynamic";

const AdminCarts = dynamic(() => import("@/legacy-pages/AdminCarts.jsx"), { ssr: false });

export default function Page() {
  return <AdminCarts />;
}
