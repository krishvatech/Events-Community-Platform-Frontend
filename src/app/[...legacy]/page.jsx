// TEMPORARY legacy fallback (removed in the final cleanup phase).
//
// Only URLs without a migrated App Router page reach this catch-all. The Vite route table
// (src/App.jsx) is still the source of truth for ONE route family, Live Meeting, which is
// deliberately out of the migration's scope; it is rendered through the React Router bridge
// inside the client-only application runtime (src/next/LegacyFallbackClient.jsx), exactly
// as the (app) group's layout would.
//
// Every other URL that lands here is genuinely unknown and returns a real HTTP 404. The
// catch-all sits at the app root rather than inside src/app/(app) on purpose: that group's
// client layout opens a Suspense boundary above its pages, so the shell is already streamed
// with status 200 before `notFound()` can run (a "soft 404"). The Vite app's own `*` route,
// which redirects to "/", is unchanged for the Vite build.
//
// Checked against the complete route table: every other App.jsx route has an App Router
// page, so nothing else is listed here. Single-segment unknown URLs are handled by
// src/app/(site)/[slug]/page.jsx, which 404s anything outside its slug allow-list.
import { notFound } from "next/navigation";
import LegacyFallbackClient from "@/next/LegacyFallbackClient.jsx";

// App.jsx: <Route path="/live/:meetingId" .../>
const LEGACY_ONLY_ROUTES = [/^live\/[^/]+$/];

const safeDecode = (segment) => {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
};

export default async function Page({ params }) {
  const { legacy = [] } = await params;
  const path = legacy.map(safeDecode).join("/");

  if (!LEGACY_ONLY_ROUTES.some((pattern) => pattern.test(path))) notFound();

  return <LegacyFallbackClient />;
}
