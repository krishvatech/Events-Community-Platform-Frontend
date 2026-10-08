"use client";

// src/next/LegacyFallbackClient.jsx
// Client-only loader for the legacy React Router fallback, used by the root catch-all
// (src/app/[...legacy]/page.jsx). It reproduces exactly what the (app) group's layout gives
// every migrated page: the client-only application runtime (browser bootstrap + AppChrome,
// `ssr: false`) around the legacy route table. The catch-all lives outside the (app) group
// so that unknown URLs can return a real HTTP 404 before any shell is streamed.
import dynamic from "next/dynamic";

const AppRuntime = dynamic(() => import("./AppRuntime.jsx"), { ssr: false });
const LegacyFallback = dynamic(() => import("./LegacyFallback.jsx"), { ssr: false });

export default function LegacyFallbackClient() {
  return (
    <AppRuntime>
      <LegacyFallback />
    </AppRuntime>
  );
}
