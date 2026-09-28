"use client";

// Guest-only routes (/signin, /signup, /forgot-password).
// Same guard as App.jsx: <GuestOnly> (src/components/PublicGate.jsx) redirects an
// authenticated member to ?next= or their role destination.
import dynamic from "next/dynamic";
import useAuthRerender from "@/next/useAuthRerender";

const GuestOnly = dynamic(() => import("@/components/PublicGate.jsx"), { ssr: false });

export default function GuestLayout({ children }) {
  useAuthRerender();
  return <GuestOnly>{children}</GuestOnly>;
}
