// src/lib/publicCmsResponse.js
// Pure decision logic for the server-rendered public CMS pages (src/app/(site)/[slug]).
// No React, Next.js or JSON imports, so it is shared by the server loader
// (publicCms.server.js) and its node:test unit tests.
//
// Precedence, deliberately strict:
// 1. A published CMS page that the backend resolves is rendered as it is, even when an
//    editor left fields empty. CMS fields are never mixed with default content.
// 2. Approved text-only defaults are rendered only when the backend explicitly
//    reports a genuinely absent page (404 code "page_absent"). Pages with image
//    media, including References, require a published CMS page (S3-backed media).
// 3. Every other 404 (draft, unpublished, expired, archived, restricted, blocked ancestor,
//    redirect, unknown path, older backend without the code) is a real 404.
// 4. Anything else (network failure, throttling, 5xx, malformed or non-JSON responses) is
//    an error, never a reason to show defaults.

export const PAGE_ABSENT_CODE = "page_absent";

export class PublicCmsUnavailableError extends Error {
  constructor(message, { status } = {}) {
    super(message);
    this.name = "PublicCmsUnavailableError";
    this.status = status;
  }
}

const isPlainObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const optionalString = (value) => (typeof value === "string" ? value : "");

/**
 * Interpret a fetch Response from GET /api/cms/public/pages/by-path/?path=...
 *
 * @returns {Promise<{status: "found", page: object} | {status: "absent"} | {status: "not_found"}>}
 * @throws {PublicCmsUnavailableError} for every response that is not a recognisable answer.
 */
export async function readPublicPageResponse(response, path) {
  const { status } = response;
  if (status !== 200 && status !== 404) {
    throw new PublicCmsUnavailableError(`CMS responded with HTTP ${status}`, { status });
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new PublicCmsUnavailableError(`CMS returned a non-JSON HTTP ${status} response`, { status });
  }

  if (status === 404) {
    if (!isPlainObject(data) || typeof data.detail !== "string") {
      throw new PublicCmsUnavailableError("CMS returned an unrecognised 404 response", { status });
    }
    return data.code === PAGE_ABSENT_CODE ? { status: "absent" } : { status: "not_found" };
  }

  if (!isPlainObject(data) || typeof data.title !== "string" || !data.title.trim() || typeof data.type !== "string") {
    throw new PublicCmsUnavailableError("CMS returned a malformed page", { status });
  }
  // These routes render StandardPages only. Another page type at the path is real content
  // that this renderer cannot show: a 404, not a default.
  if (data.type !== "StandardPage") return { status: "not_found" };
  if (typeof data.body_html !== "string") {
    throw new PublicCmsUnavailableError("CMS returned a StandardPage without body_html", { status });
  }

  // Only the fields the public renderer needs; nothing else from the response is forwarded.
  return {
    status: "found",
    page: {
      title: data.title,
      slug: optionalString(data.slug),
      type: data.type,
      path: optionalString(data.path) || path,
      body_html: data.body_html,
      seo_title: optionalString(data.seo_title),
      search_description: optionalString(data.search_description),
      first_published_at: optionalString(data.first_published_at) || null,
      last_published_at: optionalString(data.last_published_at) || null,
    },
  };
}

/**
 * Map a content file (src/content/public-pages/<slug>.json) to a renderable page, or null
 * when the page has no migrated content.
 */
export function toDefaultPage(file) {
  if (!isPlainObject(file) || file.migration_status !== "migrated") return null;
  if (!Array.isArray(file.body_html) || file.body_html.length === 0) return null;
  if (typeof file.title !== "string" || !file.title.trim()) return null;
  // Never serve local media URLs or unresolved media: placeholders from Next.js.
  // Image-bearing pages must be published through Wagtail, whose CMS HTML
  // contains the S3/CDN image URLs from the configured media storage.
  if (Array.isArray(file.media) && file.media.length > 0) return null;
  if (file.body_html.some((line) => typeof line !== "string" || line.includes("media:"))) return null;
  return {
    title: file.title,
    slug: file.slug,
    type: "StandardPage",
    path: `/${file.slug}/`,
    body_html: file.body_html.join("\n"),
    seo_title: optionalString(file.seo_title),
    search_description: optionalString(file.search_description),
    content_sha256: optionalString(file.content_sha256),
  };
}

/**
 * What the public route renders: {source: "cms" | "default", page}, or null for HTTP 404.
 */
export function choosePublicPageContent(result, defaultPage) {
  if (result?.status === "found" && result.page) return { source: "cms", page: result.page };
  if (result?.status === "absent" && defaultPage) return { source: "default", page: defaultPage };
  return null;
}
