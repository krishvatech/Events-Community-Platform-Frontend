"use client";

// src/next/useAuthRerender.js
// In the Vite app, route guards (RequireAuth / GuestOnly) are re-rendered by
// AppShell whenever auth changes ("auth:changed" / cross-tab "storage") or the
// path changes. Next.js layouts do not re-render their children on their own,
// so the guard layouts use this hook to keep the same re-evaluation points.

//
// The re-render is scheduled as a transition: Next.js router navigations are
// transitions, so an "auth:changed" dispatched right before navigate() (e.g.
// sidebar logout -> navigate("/")) is rendered together with that navigation,
// exactly like React Router batched AppShell's setAuthed with its navigate().
// An urgent update here would re-run RequireAuth on the old route first and
// redirect to /signin instead of "/".

import { startTransition, useEffect, useReducer } from "react";
import { usePathname } from "next/navigation";

export default function useAuthRerender() {
  const [, bump] = useReducer((n) => n + 1, 0);
  usePathname(); // re-render on navigation, like AppShell did

  useEffect(() => {
    const onAuthChange = () => startTransition(() => bump());
    window.addEventListener("auth:changed", onAuthChange);
    window.addEventListener("storage", onAuthChange);
    return () => {
      window.removeEventListener("auth:changed", onAuthChange);
      window.removeEventListener("storage", onAuthChange);
    };
  }, []);
}
