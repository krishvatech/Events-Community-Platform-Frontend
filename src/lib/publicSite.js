// src/lib/publicSite.js
// Configuration shared by the server-rendered public website routes (src/app/(site)).
// Server-safe: no window/document access. Also imported by client components for the
// slug list, so keep it free of server-only modules.

// Wagtail StandardPage slugs served at "/<slug>". Published CMS pages always win.
// Text-only pages have approved defaults if no CMS page exists; image-bearing pages
// (References) are CMS-only so all logo image URLs come from S3-backed Wagtail media.
// The Wagtail page must be a direct child of the Site's root page; see
// ecp-backend/docs/public-website-pages.md. Keep in sync with PUBLIC_PAGES in
// ecp-backend/cms/public_page_content/__init__.py (the tests compare it with the content files).
export const PUBLIC_STANDARD_PAGE_SLUGS = Object.freeze([
  "frequently-asked-questions",
  "references",
  "terms-and-conditions",
  "privacy-policy",
  "imprint",
]);

export const isPublicStandardPageSlug = (slug) => PUBLIC_STANDARD_PAGE_SLUGS.includes(slug);

// Relative page path as the CMS resolver expects it (Wagtail style, trailing slash).
export const publicPagePath = (slug) => `/${slug}/`;

// Public website origin for canonical / Open Graph URLs, e.g. https://connect.imaa-institute.org
// (no trailing slash). Empty when not configured: canonical tags are then omitted rather than
// pointing at the wrong host.
export function publicSiteOrigin() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || process.env.PUBLIC_WEBSITE_ORIGIN || "";
  return raw.trim().replace(/\/+$/, "");
}

// Canonical URLs follow the Next.js default of no trailing slash (next.config.mjs sets none).
export function canonicalUrl(pathname) {
  const origin = publicSiteOrigin();
  if (!origin) return undefined;
  const clean = `/${String(pathname || "").replace(/^\/+/, "")}`.replace(/\/+$/, "") || "/";
  return `${origin}${clean === "/" ? "" : clean}` || origin;
}

// Backend API base for server-side CMS fetches. CMS_API_BASE_URL is a server-only runtime
// override (for example an internal backend URL); otherwise the public API base is used
// (NEXT_PUBLIC_API_BASE_URL is inlined by next.config.mjs from VITE_API_BASE_URL at build
// time, and the runtime VITE_* fallback covers server-only environments that set the Vite name).
export function cmsApiBaseUrl() {
  const raw =
    process.env.CMS_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.VITE_API_BASE_URL ||
    "http://127.0.0.1:8000/api";
  return raw.trim().replace(/\/+$/, "");
}
