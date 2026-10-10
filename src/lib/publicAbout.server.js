// src/lib/publicAbout.server.js
// Server-side loader for the About page (Server Components only). Reads the published
// AboutPage from the backend's public by-path endpoint without credentials; see
// ./publicAboutResponse.js for the response rules.
import { cache } from "react";
import { cmsApiBaseUrl } from "./publicSite";
import { PublicCmsUnavailableError } from "./publicCmsResponse";
import { ABOUT_PAGE_PATHS, readAboutPageResponse } from "./publicAboutResponse";

async function fetchAboutAt(path) {
  const url = `${cmsApiBaseUrl()}/cms/public/pages/by-path/?path=${encodeURIComponent(path)}`;
  let response;
  try {
    // Always fresh: an unpublished page must stop rendering immediately.
    response = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } });
  } catch (error) {
    throw new PublicCmsUnavailableError(`CMS request failed: ${error?.message || error}`);
  }
  return readAboutPageResponse(response, path);
}

/** The published AboutPage (first of ABOUT_PAGE_PATHS that has one), or null for HTTP 404. */
export const loadPublicAboutPage = cache(async () => {
  for (const path of ABOUT_PAGE_PATHS) {
    const result = await fetchAboutAt(path);
    if (result.status === "found") return result.page;
  }
  return null;
});
