"use client";

// Signed-in member routes. Same guard as App.jsx: <RequireAuth>
// (src/components/RequireAuth.jsx) sends logged-out users and guest sessions
// to /signin, passing { from } state for the post-login redirect.
import dynamic from "next/dynamic";
import useAuthRerender from "@/next/useAuthRerender";

const RequireAuth = dynamic(() => import("@/components/RequireAuth.jsx"), { ssr: false });

export default function MemberLayout({ children }) {
  useAuthRerender();
  return <RequireAuth>{children}</RequireAuth>;
}
