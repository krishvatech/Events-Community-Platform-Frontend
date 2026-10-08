"use client";

// src/components/public/PublicColorModeGuard.jsx
// The server-rendered public routes (src/app/(site)) render outside AppChrome, which normally
// applies the per-route force-light rule on navigation. This does the same for them, with the
// same test (src/theme/colorMode.js), so client navigation between the two trees keeps the
// colour mode consistent. First paint is handled by the start-up script in src/app/layout.jsx.
import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import { COLOR_MODE_ATTRIBUTE, DARK_MODE_ENABLED, isForceLightPath } from "../../theme/colorMode";

export default function PublicColorModeGuard() {
  const pathname = usePathname() || "/";
  useLayoutEffect(() => {
    if (!DARK_MODE_ENABLED) return;
    if (isForceLightPath(pathname)) document.body.setAttribute(COLOR_MODE_ATTRIBUTE, "light");
    else document.body.removeAttribute(COLOR_MODE_ATTRIBUTE);
  }, [pathname]);
  return null;
}
