"use client";

// src/next/ReactRouterBridge.jsx
// TEMPORARY migration adapter (remove with the legacy fallback in Phase 9).
// A React Router <Router> whose location comes from Next.js and whose navigator
// calls the Next.js router. Legacy (not yet migrated) React Router pages render
// inside it, so every navigation goes through Next.js: migrated routes are served
// by their App Router pages, everything else by the legacy route table.

import { useMemo } from "react";
import { Router } from "react-router-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { readNavigationState, resolveHref, writeNavigationState } from "../navigation/navigationState";

export default function ReactRouterBridge({ children }) {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const params = useSearchParams();
  const query = params ? params.toString() : "";
  const search = query ? `?${query}` : "";

  const location = useMemo(
    () => ({
      pathname,
      search,
      hash: typeof window !== "undefined" ? window.location.hash : "",
      state: readNavigationState(pathname, search),
      key: `${pathname}${search}`,
    }),
    [pathname, search]
  );

  const navigator = useMemo(
    () => ({
      createHref: (to) => resolveHref(to),
      go: (delta) => window.history.go(delta),
      push: (to, state) => {
        const href = resolveHref(to);
        writeNavigationState(href, state);
        router.push(href, { scroll: false });
      },
      replace: (to, state) => {
        const href = resolveHref(to);
        writeNavigationState(href, state);
        router.replace(href, { scroll: false });
      },
    }),
    [router]
  );

  return (
    <Router location={location} navigator={navigator}>
      {children}
    </Router>
  );
}
