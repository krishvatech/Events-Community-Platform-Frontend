"use client";

// Next.js route entry for /account/cart (public in App.jsx: no RequireAuth)
// Thin client-only wrapper around the existing page component (no SSR, like the Vite app).
import dynamic from "next/dynamic";

const MyCartPage = dynamic(() => import("@/legacy-pages/MyCartPage.jsx"), { ssr: false });

export default function Page() {
  return <MyCartPage />;
}
