"use client";

// Next.js route entry for /account/profile
// Thin client-only wrapper around the existing page component (no SSR, like the Vite app).
import dynamic from "next/dynamic";

const ProfilePage = dynamic(() => import("@/legacy-pages/ProfilePage.jsx"), { ssr: false });

export default function Page() {
  return <ProfilePage />;
}
