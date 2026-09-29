// src/services/blogService.js
//
// Blog API service. Pure module: the HTTP client is injected, so production
// binds it to the shared authenticated `apiClient` (see blogApi.js) and tests
// pass a recording fake. No auth headers or tokens are handled here.
//
// Backend contract (ecp-backend `blogs` app):
//   Reader (any authenticated user, published only):
//     GET  /blogs/                      ?page ?page_size ?search ?category ?tag
//     GET  /blogs/<slug>/               ?content_mode=chunked -> first content chunk only
//     GET  /blogs/<slug>/content/       ?chunk=N  -> {chunk, content_html, has_more, chunks}
//   Management (superuser only):
//     GET  /blogs/admin/                ?page ?page_size ?status ?search ?category ?tag
//     POST /blogs/admin/
//     GET  /blogs/admin/<id>/
//     PATCH /blogs/admin/<id>/
//     POST /blogs/admin/<id>/publish/
//     POST /blogs/admin/<id>/unpublish/
//     GET/POST /blogs/admin/categories/ , GET/PATCH /blogs/admin/categories/<id>/
//     GET/POST /blogs/admin/tags/       , GET/PATCH /blogs/admin/tags/<id>/
// There is intentionally no PUT and no DELETE.

export const BLOG_API = Object.freeze({
  list: "/blogs/",
  detail: (slug) => `/blogs/${encodeURIComponent(slug)}/`,
  content: (slug) => `/blogs/${encodeURIComponent(slug)}/content/`,
  adminList: "/blogs/admin/",
  adminDetail: (id) => `/blogs/admin/${encodeURIComponent(id)}/`,
  publish: (id) => `/blogs/admin/${encodeURIComponent(id)}/publish/`,
  unpublish: (id) => `/blogs/admin/${encodeURIComponent(id)}/unpublish/`,
  categories: "/blogs/admin/categories/",
  category: (id) => `/blogs/admin/categories/${encodeURIComponent(id)}/`,
  tags: "/blogs/admin/tags/",
  tag: (id) => `/blogs/admin/tags/${encodeURIComponent(id)}/`,
  wordpressImports: "/blogs/admin/wordpress-import/",
  wordpressImport: (id) => `/blogs/admin/wordpress-import/${encodeURIComponent(id)}/`,
  wordpressImportLatest: "/blogs/admin/wordpress-import/latest/",
});

export const IMPORT_TERMINAL_STATUSES = Object.freeze(["succeeded", "partial", "failed"]);
export const isImportActive = (run) => Boolean(run) && !IMPORT_TERMINAL_STATUSES.includes(run.status);

// Matches the backend's DRF PAGE_SIZE for these endpoints.
export const BLOG_PAGE_SIZE = 20;

// Blog card grids (Explore Blogs, My Blogs): 3 x 3 on desktop.
export const BLOG_CARD_PAGE_SIZE = 9;

// Mirrors the backend FEATURED_IMAGE_MAX_BYTES so the UI can fail fast.
export const BLOG_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

const cleanParams = (params = {}) =>
  Object.fromEntries(
    Object.entries(params)
      .map(([key, value]) => [key, typeof value === "string" ? value.trim() : value])
      .filter(([, value]) => value !== undefined && value !== null && value !== "")
      .filter(([key, value]) => !(key === "page" && Number(value) <= 1))
  );

/** Normalises a DRF page ({count,next,previous,results}) or a bare array. */
export const normalizePage = (data) => {
  if (Array.isArray(data)) {
    return { count: data.length, next: null, previous: null, results: data };
  }
  return {
    count: Number(data?.count) || 0,
    next: data?.next || null,
    previous: data?.previous || null,
    results: Array.isArray(data?.results) ? data.results : [],
  };
};

export const totalPagesFor = (count, pageSize = BLOG_PAGE_SIZE) =>
  Math.max(1, Math.ceil((Number(count) || 0) / pageSize));

const firstMessage = (value) => {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return firstMessage(value[0]);
  if (typeof value === "object") return firstMessage(Object.values(value)[0]);
  return String(value);
};

const GENERIC_MESSAGES = {
  400: "Please fix the highlighted fields and try again.",
  401: "Your session has expired. Please sign in again.",
  403: "You do not have permission to do this.",
  404: "This blog could not be found.",
  413: "The image is too large. Please choose an image under 10 MB.",
};

/**
 * Turns an axios/DRF error into { status, message, fieldErrors }.
 * Never exposes stack traces or raw HTML error pages.
 */
export const normalizeBlogError = (error) => {
  const status = error?.response?.status ?? null;
  const data = error?.response?.data;
  const fieldErrors = {};
  let message = "";

  if (data && typeof data === "object" && !Array.isArray(data)) {
    for (const [key, value] of Object.entries(data)) {
      if (key === "detail" || key === "non_field_errors") continue;
      const text = firstMessage(value);
      if (text) fieldErrors[key] = text;
    }
    message = firstMessage(data.detail) || firstMessage(data.non_field_errors);
  }

  if (!status) {
    message = "Network error. Please check your connection and try again.";
  } else if (status >= 500) {
    message = "Something went wrong on our side. Please try again.";
  } else if (!message) {
    message = GENERIC_MESSAGES[status] || "Request failed. Please try again.";
  }

  return { status, message, fieldErrors };
};

export class BlogApiError extends Error {
  constructor(normalized) {
    super(normalized.message);
    this.name = "BlogApiError";
    this.status = normalized.status;
    this.fieldErrors = normalized.fieldErrors;
  }
}

export function createBlogService(client) {
  const call = async (request) => {
    try {
      const response = await request();
      return response?.data;
    } catch (error) {
      throw new BlogApiError(normalizeBlogError(error));
    }
  };

  const listPage = (url, params) =>
    call(() => client.get(url, { params: cleanParams(params) })).then(normalizePage);

  return {
    // Reader
    listPublishedBlogs: (params) => listPage(BLOG_API.list, { page_size: BLOG_CARD_PAGE_SIZE, ...params }),
    /** `chunked: true` returns metadata plus only the first content chunk. */
    getPublishedBlog: (slug, { chunked = false } = {}) =>
      call(() => client.get(BLOG_API.detail(slug), chunked ? { params: { content_mode: "chunked" } } : undefined)),
    /** One later chunk of a published article: {chunk, content_html, has_more}. */
    getPublishedBlogChunk: (slug, chunk, { signal } = {}) =>
      call(() => client.get(BLOG_API.content(slug), { params: { chunk }, ...(signal ? { signal } : {}) })),

    // Management
    listAdminBlogs: (params) => listPage(BLOG_API.adminList, { page_size: BLOG_CARD_PAGE_SIZE, ...params }),
    getAdminBlog: (id) => call(() => client.get(BLOG_API.adminDetail(id))),
    createBlog: (payload) => call(() => client.post(BLOG_API.adminList, payload)),
    updateBlog: (id, payload) => call(() => client.patch(BLOG_API.adminDetail(id), payload)),
    uploadBlogFeaturedImage: (id, file) => {
      const form = new FormData();
      form.append("featured_image", file);
      return call(() =>
        client.patch(BLOG_API.adminDetail(id), form, {
          headers: { "Content-Type": "multipart/form-data" },
        })
      );
    },
    clearBlogFeaturedImage: (id) =>
      call(() => client.patch(BLOG_API.adminDetail(id), { featured_image: null })),
    publishBlog: (id) => call(() => client.post(BLOG_API.publish(id))),
    unpublishBlog: (id) => call(() => client.post(BLOG_API.unpublish(id))),

    // Taxonomy
    listBlogCategories: (params) => listPage(BLOG_API.categories, params),
    createBlogCategory: (payload) => call(() => client.post(BLOG_API.categories, payload)),
    updateBlogCategory: (id, payload) => call(() => client.patch(BLOG_API.category(id), payload)),
    listBlogTags: (params) => listPage(BLOG_API.tags, params),
    createBlogTag: (payload) => call(() => client.post(BLOG_API.tags, payload)),
    updateBlogTag: (id, payload) => call(() => client.patch(BLOG_API.tag(id), payload)),

    // WordPress import (superuser only). Starting never waits for the import:
    // the backend answers 202 with a queued run. A 409 means an import is
    // already running; that run is returned (flagged) instead of an error.
    startWordPressBlogImport: async () => {
      try {
        const response = await client.post(BLOG_API.wordpressImports, {});
        return { ...response.data, alreadyRunning: false };
      } catch (error) {
        const active = error?.response?.status === 409 ? error.response.data?.active_run : null;
        if (active) return { ...active, alreadyRunning: true };
        throw new BlogApiError(normalizeBlogError(error));
      }
    },
    getWordPressBlogImport: (id) => call(() => client.get(BLOG_API.wordpressImport(id))),
    getLatestWordPressBlogImport: async () => {
      try {
        const response = await client.get(BLOG_API.wordpressImportLatest);
        return response.data;
      } catch (error) {
        if (error?.response?.status === 404) return null; // no imports yet
        throw new BlogApiError(normalizeBlogError(error));
      }
    },
  };
}

/** Fetches every page of a paginated taxonomy list (small, admin-only data). */
export async function listAllPages(listFn, params = {}, maxPages = 25) {
  const all = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const data = await listFn({ ...params, page });
    all.push(...data.results);
    if (!data.next) break;
  }
  return all;
}
