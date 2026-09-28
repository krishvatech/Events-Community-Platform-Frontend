"use client";

// src/next/LegacyFallback.jsx
// TEMPORARY: renders the Vite app's React Router route table for every URL that
// has no migrated App Router page yet (official Next.js incremental-migration
// pattern). Navigation is driven by Next.js through ReactRouterBridge.
// Removed in Phase 9 once all routes are migrated.

import ReactRouterBridge from "./ReactRouterBridge.jsx";
import { LegacyRoutes } from "../App.jsx";

export default function LegacyFallback() {
  return (
    <ReactRouterBridge>
      <LegacyRoutes />
    </ReactRouterBridge>
  );
}
