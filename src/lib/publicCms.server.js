// src/lib/publicCms.server.js
// Server-side loader for the public CMS pages (Server Components only).
//
// Talks to the backend's public by-path endpoint
// (GET /api/cms/public/pages/by-path/?path=/privacy-policy/) without any credentials, and
// applies the precedence rules in ./publicCmsResponse.js: a published CMS page wins; approved
// default content is used only when the backend reports the page as genuinely absent; every
// other 404 is a real 404; failures throw PublicCmsUnavailableError so the route shows its
// error state instead of a 404 or substitute content.
import { cache } from "react";
import { cmsApiBaseUrl, isPublicStandardPageSlug, publicPagePath } from "./publicSite";
import { PublicCmsUnavailableError, choosePublicPageContent, readPublicPageResponse } from "./publicCmsResponse";
import { getPublicPageDefault } from "./publicPageDefaults.server";

export { PublicCmsUnavailableError };

// React `cache` memoises per request, so generateMetadata and the page share one fetch.
export const fetchPublicPageByPath = cache(async (path) => {
  const url = `${cmsApiBaseUrl()}/cms/public/pages/by-path/?path=${encodeURIComponent(path)}`;
  let response;
  try {
    // Always fresh: an unpublished page must stop rendering immediately.
    response = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } });
  } catch (error) {
    throw new PublicCmsUnavailableError(`CMS request failed: ${error?.message || error}`);
  }
  return readPublicPageResponse(response, path);
});

/** What /<slug> renders: {source: "cms" | "default", page}, or null for HTTP 404. */
export const loadPublicStandardPage = cache(async (slug) => {
  if (!isPublicStandardPageSlug(slug)) return null;
  const result = await fetchPublicPageByPath(publicPagePath(slug));
  return choosePublicPageContent(result, getPublicPageDefault(slug));
});
