// src/lib/publicBatch3.server.js
// Server-side loaders (Server Components only) for the Testimonials, Contact Us, In The News and
// M&A Publications pages. Anonymous and uncached: an unpublished page or article must stop rendering
// immediately, and the Contact Us form token is issued per request. See ./publicTestimonialsResponse.js
// and ./publicArticlesResponse.js for the response rules.
import { cache } from "react";
import { cmsApiBaseUrl } from "./publicSite";
import { PublicCmsUnavailableError } from "./publicCmsResponse";
import {
  CONTACT_PAGE_PATH,
  TESTIMONIALS_PAGE_PATH,
  readContactPageResponse,
  readTestimonialsPageResponse,
} from "./publicTestimonialsResponse";
import { ARCHIVE_PAGE_SIZE, ARTICLE_SECTIONS, readArticleDetailResponse, readArticleListResponse } from "./publicArticlesResponse";

async function getJson(url) {
  try {
    return await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } });
  } catch (error) {
    throw new PublicCmsUnavailableError(`Request failed: ${error?.message || error}`);
  }
}

const byPathUrl = (path) => `${cmsApiBaseUrl()}/cms/public/pages/by-path/?path=${encodeURIComponent(path)}`;

/** The published TestimonialsPage, or null for HTTP 404. */
export const loadPublicTestimonialsPage = cache(async () => {
  const result = await readTestimonialsPageResponse(await getJson(byPathUrl(TESTIMONIALS_PAGE_PATH)), TESTIMONIALS_PAGE_PATH);
  return result.status === "found" ? result.page : null;
});

/** The published ContactPage (with a fresh form token), or null for HTTP 404. */
export const loadPublicContactPage = cache(async () => {
  const result = await readContactPageResponse(await getJson(byPathUrl(CONTACT_PAGE_PATH)), CONTACT_PAGE_PATH);
  return result.status === "found" ? result.page : null;
});

/** One archive page of a section ("news" | "publications"), or null for HTTP 404 (page/year out of range). */
export const loadArticleArchive = cache(async (sectionKey, page = 1, tag = "", year = "") => {
  const section = ARTICLE_SECTIONS[sectionKey];
  const params = new URLSearchParams({ page: String(page), page_size: String(ARCHIVE_PAGE_SIZE) });
  if (tag) params.set("tag", tag);
  if (year) params.set("year", year);
  const result = await readArticleListResponse(await getJson(`${cmsApiBaseUrl()}/blogs/public/${section.api}/?${params}`));
  return result.status === "found" ? result.archive : null;
});

/** One published article of a section, or null for HTTP 404. */
export const loadArticle = cache(async (sectionKey, slug) => {
  const section = ARTICLE_SECTIONS[sectionKey];
  const result = await readArticleDetailResponse(
    await getJson(`${cmsApiBaseUrl()}/blogs/public/${section.api}/${encodeURIComponent(slug)}/`)
  );
  return result.status === "found" ? result.article : null;
});
