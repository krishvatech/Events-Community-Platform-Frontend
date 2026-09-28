"use client";

// Next.js route entry for /sso/imaa (IMAA WordPress SSO entry)
// Thin client-only wrapper around the existing page component (no SSR, like the Vite app).
import dynamic from "next/dynamic";

const ImaaSsoRedirect = dynamic(() => import("@/legacy-pages/ImaaSsoRedirect.jsx"), { ssr: false });

export default function Page() {
  return <ImaaSsoRedirect />;
}
