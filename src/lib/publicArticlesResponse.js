// src/lib/publicArticlesResponse.js
// Pure response handling for the public article sections In The News and M&A Publications
// (src/app/(site)/in-the-news, src/app/(site)/publications). No React or Next.js imports: shared by
// the server loader (publicBatch3.server.js) and the node:test unit tests.
//
// The articles are Blog posts of the WordPress categories "news" and "publications", served
// anonymously by GET /api/blogs/public/<section>/ (paginated, ?page=, ?tag=, ?year=) and
// GET /api/blogs/public/<section>/<slug>/ (ecp-backend blogs/public_sections.py). They are never
// part of the member Blogs. A 404 is a real 404 (unknown article, page or year); every other
// failure is an error, never an empty archive.
import { PublicCmsUnavailableError } from "./publicCmsResponse.js";

export const ARTICLE_SECTIONS = Object.freeze({
  news: Object.freeze({ key: "news", api: "in-the-news", path: "/in-the-news", label: "In The News", noun: "news articles" }),
  publications: Object.freeze({ key: "publications", api: "publications", path: "/publications", label: "M&A Publications", noun: "publications" }),
});

export const ARCHIVE_PAGE_SIZE = 12;

const isPlainObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const list = (value) => (Array.isArray(value) ? value.filter(isPlainObject) : []);
const text = (value) => (typeof value === "string" ? value : "");
// Django's <slug:> converter.
const SLUG = /^[-a-zA-Z0-9_]+$/;
const YEAR = /^[0-9]{4}$/;
const httpUrl = (value) => (typeof value === "string" && /^https?:\/\/\S+$/i.test(value.trim()) ? value.trim() : "");
const isoDate = (value) => (typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : "");

function tags(value) {
  const seen = new Set();
  return list(value)
    .map((t) => ({ name: text(t.name).trim(), slug: text(t.slug).trim() }))
    .filter((t) => t.name && SLUG.test(t.slug) && !seen.has(t.slug) && seen.add(t.slug));
}

function article(value) {
  if (!isPlainObject(value)) return null;
  const slug = text(value.slug).trim();
  const title = text(value.title).trim();
  if (!SLUG.test(slug) || !title) return null;
  const author = (isPlainObject(value.author) ? text(value.author.full_name) : "").trim() || text(value.legacy_author_name).trim();
  return {
    slug,
    title,
    excerpt: text(value.excerpt).trim(),
    featured_image: httpUrl(value.featured_image),
    published_at: isoDate(value.published_at),
    author,
    tags: tags(value.tags),
  };
}

function filterOptions(value) {
  const data = isPlainObject(value) ? value : {};
  const years = list(data.years)
    .map((y) => ({ year: Number.isInteger(y.year) ? String(y.year) : "", count: Number.isInteger(y.count) ? y.count : 0 }))
    .filter((y) => YEAR.test(y.year) && y.count > 0);
  const tagOptions = list(data.tags)
    .map((t) => ({ name: text(t.name).trim(), slug: text(t.slug).trim(), count: Number.isInteger(t.count) ? t.count : 0 }))
    .filter((t) => t.name && SLUG.test(t.slug) && t.count > 0);
  return { years, tags: tagOptions };
}

async function readJson(response) {
  const { status } = response;
  if (status !== 200 && status !== 404) {
    throw new PublicCmsUnavailableError(`Articles API responded with HTTP ${status}`, { status });
  }
  let data;
  try {
    data = await response.json();
  } catch {
    throw new PublicCmsUnavailableError(`Articles API returned a non-JSON HTTP ${status} response`, { status });
  }
  if (status === 404) {
    if (!isPlainObject(data) || typeof data.detail !== "string") {
      throw new PublicCmsUnavailableError("Articles API returned an unrecognised 404 response", { status });
    }
    return null;
  }
  if (!isPlainObject(data)) throw new PublicCmsUnavailableError("Articles API returned a malformed response", { status });
  return data;
}

/**
 * GET /api/blogs/public/<section>/?page=&page_size=&tag=&year=
 * @returns {Promise<{status: "found", archive: object} | {status: "not_found"}>}
 */
export async function readArticleListResponse(response) {
  const data = await readJson(response);
  if (data === null) return { status: "not_found" };
  if (!Number.isInteger(data.count) || data.count < 0 || !Array.isArray(data.results)) {
    throw new PublicCmsUnavailableError("Articles API returned a malformed list", { status: response.status });
  }
  return {
    status: "found",
    archive: { count: data.count, results: data.results.map(article).filter(Boolean), filters: filterOptions(data.filters) },
  };
}

/**
 * GET /api/blogs/public/<section>/<slug>/ (content_html arrives sanitised for server rendering).
 * @returns {Promise<{status: "found", article: object} | {status: "not_found"}>}
 */
export async function readArticleDetailResponse(response) {
  const data = await readJson(response);
  if (data === null) return { status: "not_found" };
  const base = article(data);
  if (!base || typeof data.content_html !== "string") {
    throw new PublicCmsUnavailableError("Articles API returned a malformed article", { status: response.status });
  }
  return {
    status: "found",
    article: {
      ...base,
      content_html: data.content_html,
      seo_title: text(data.seo_title).trim(),
      seo_description: text(data.seo_description).trim(),
      updated_at: isoDate(data.updated_at),
    },
  };
}

// -- archive query (?page=, ?tag=, ?year=) ---------------------------------------------------------

const first = (value) => (Array.isArray(value) ? value[0] : value);

/** Valid archive parameters from Next.js searchParams; anything malformed is `invalid`. */
export function parseArchiveQuery(searchParams = {}) {
  const rawPage = text(first(searchParams.page)).trim();
  const tag = text(first(searchParams.tag)).trim();
  const year = text(first(searchParams.year)).trim();
  const page = rawPage === "" ? 1 : /^[1-9][0-9]{0,4}$/.test(rawPage) ? Number(rawPage) : NaN;
  const invalid = Number.isNaN(page) || (tag !== "" && !SLUG.test(tag)) || (year !== "" && !YEAR.test(year));
  return { page: invalid ? 1 : page, tag: invalid ? "" : tag, year: invalid ? "" : year, invalid };
}

/** Site link to an archive view; page 1 and empty filters are left out of the URL. */
export function archiveHref(path, { page = 1, tag = "", year = "" } = {}) {
  const params = new URLSearchParams();
  if (tag) params.set("tag", tag);
  if (year) params.set("year", year);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export const totalPages = (count, pageSize = ARCHIVE_PAGE_SIZE) => Math.max(1, Math.ceil(count / pageSize));

/** Page numbers to show: first, last and the neighbours of the current page, with gaps as null. */
export function paginationItems(current, total) {
  const pages = new Set([1, total, current - 1, current, current + 1].filter((n) => n >= 1 && n <= total));
  const sorted = [...pages].sort((a, b) => a - b);
  const items = [];
  sorted.forEach((n, i) => {
    if (i && n - sorted[i - 1] > 1) items.push(null);
    items.push(n);
  });
  return items;
}

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
export const formatArticleDate = (iso) => (iso ? DATE_FORMAT.format(new Date(iso)) : "");
