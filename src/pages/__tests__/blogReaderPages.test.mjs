import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

import {
  all,
  apiError,
  cleanup,
  click,
  fakeBlogService,
  getByRole,
  getByText,
  loadSource,
  makePost,
  page,
  queryByRole,
  queryByText,
  renderRoutes,
  setBlogApi,
  settle,
  signIn,
  signOut,
  typeInto,
  waitFor,
} from "./helpers/blogDomHarness.mjs";

const { blogReaderRoutes } = await loadSource("src/routes/blogRoutes.jsx");

const open = (url) => renderRoutes(blogReaderRoutes, { url });
const cards = () => all("[data-testid='blog-card']");

beforeEach(() => signIn());
afterEach(async () => {
  await cleanup();
  signOut();
});

// ------------------------------------------------------------ Explore --

test("shows a loading skeleton until blogs arrive", async () => {
  let resolve;
  setBlogApi(fakeBlogService({ listPublishedBlogs: () => new Promise((r) => { resolve = r; }) }));
  await open("/blogs");
  assert.ok(document.querySelector("[aria-busy='true']"), "skeleton should be visible");
  resolve(page([makePost()]));
  await waitFor(() => assert.equal(cards().length, 1));
  assert.equal(document.querySelector("[aria-busy='true']"), null);
});

test("renders published blog cards with title, excerpt, author, date and image", async () => {
  const api = fakeBlogService({
    listPublishedBlogs: async () => page([makePost({ wp_post_id: 987654, created_by: { id: 42 } })]),
  });
  setBlogApi(api);
  await open("/blogs");
  await waitFor(() => assert.equal(cards().length, 1));
  const card = cards()[0];

  assert.ok(queryByText("M&A Market Update", { scope: card, selector: "a" }));
  assert.ok(queryByText("Quarterly deal activity.", { scope: card }));
  assert.equal(card.querySelector("[data-testid='blog-card-author']").textContent, "Ada Lovelace");
  assert.equal(card.querySelector("time").textContent, "September 20, 2026");
  const img = card.querySelector("img");
  assert.equal(img.getAttribute("src"), "https://cdn.test/cover.jpg");
  assert.equal(img.getAttribute("alt"), "M&A Market Update");
  assert.ok(queryByText("Research", { scope: card }));
  assert.ok(queryByText("#Europe", { scope: card }));

  // Internal/migration data never reaches the UI, and only the reader API is used.
  assert.doesNotMatch(card.textContent, /987654/);
  assert.equal(api.callsTo("listAdminBlogs").length, 0);
});

test("falls back to the legacy author name when there is no ECP author", async () => {
  setBlogApi(fakeBlogService({
    listPublishedBlogs: async () => page([makePost({ author: null, legacy_author_name: "Historic Writer" })]),
  }));
  await open("/blogs");
  await waitFor(() => assert.equal(cards().length, 1));
  assert.equal(cards()[0].querySelector("[data-testid='blog-card-author']").textContent, "Historic Writer");
});

test("shows a placeholder for a missing or broken featured image", async () => {
  setBlogApi(fakeBlogService({
    listPublishedBlogs: async () =>
      page([makePost({ id: 1, featured_image: null }), makePost({ id: 2, slug: "two", featured_image: "https://cdn.test/broken.jpg" })]),
  }));
  await open("/blogs");
  await waitFor(() => assert.equal(cards().length, 2));
  assert.ok(cards()[0].querySelector("[data-testid='blog-image-placeholder']"));

  const broken = cards()[1].querySelector("img");
  await waitFor(() => broken.dispatchEvent(new window.Event("error")));
  await waitFor(() => assert.ok(cards()[1].querySelector("[data-testid='blog-image-placeholder']")));
});

test("Read more navigates to the article page", async () => {
  setBlogApi(fakeBlogService({ listPublishedBlogs: async () => page([makePost()]) }));
  const view = await open("/blogs");
  await waitFor(() => assert.equal(cards().length, 1));
  await click(getByRole("link", "Read more: M&A Market Update"));
  await waitFor(() => assert.equal(view.path(), "/blogs/m-a-market-update"));
});

test("search is debounced, sent to the API and resets to page 1", async () => {
  const api = fakeBlogService({ listPublishedBlogs: async () => page([makePost()], 45, "next") });
  setBlogApi(api);
  const view = await open("/blogs?page=2");
  await waitFor(() => assert.equal(cards().length, 1));
  assert.equal(api.callsTo("listPublishedBlogs")[0][1].page, 2);

  await typeInto(getByRole("textbox", "Search blogs"), "valuation");
  assert.equal(api.callsTo("listPublishedBlogs").length, 1, "no request per keystroke");
  await settle();
  await waitFor(() => {
    const last = api.callsTo("listPublishedBlogs").at(-1)[1];
    assert.equal(last.search, "valuation");
    assert.equal(last.page, 1);
  });
  assert.equal(view.path(), "/blogs?search=valuation");
});

test("pagination requests the chosen page", async () => {
  const api = fakeBlogService({ listPublishedBlogs: async () => page([makePost()], 45, "next") });
  setBlogApi(api);
  const view = await open("/blogs");
  await waitFor(() => assert.ok(getByRole("button", "Go to page 3")));
  await click(getByRole("button", "Go to page 2"));
  await waitFor(() => assert.equal(api.callsTo("listPublishedBlogs").at(-1)[1].page, 2));
  assert.equal(view.path(), "/blogs?page=2");
});

test("category and tag chips filter through the API and can be cleared", async () => {
  const api = fakeBlogService({ listPublishedBlogs: async () => page([makePost()]) });
  setBlogApi(api);
  const view = await open("/blogs");
  await waitFor(() => assert.equal(cards().length, 1));

  await click(getByText("Research", { scope: cards()[0] }));
  await waitFor(() => assert.equal(api.callsTo("listPublishedBlogs").at(-1)[1].category, "research"));
  assert.equal(view.path(), "/blogs?category=research");
  assert.ok(queryByText("Category: Research"));

  await click(getByText("#Europe", { scope: cards()[0] }));
  await waitFor(() => assert.equal(api.callsTo("listPublishedBlogs").at(-1)[1].tag, "europe"));

  const chip = getByText("Category: Research").closest(".MuiChip-root");
  await click(chip.querySelector(".MuiChip-deleteIcon"));
  await waitFor(() => assert.equal(api.callsTo("listPublishedBlogs").at(-1)[1].category, ""));
});

test("empty states distinguish 'nothing published' from 'no matches'", async () => {
  setBlogApi(fakeBlogService({ listPublishedBlogs: async () => page([]) }));
  await open("/blogs");
  await waitFor(() => assert.ok(queryByText("No blogs have been published yet.")));
  await cleanup();

  await open("/blogs?search=zzz");
  await waitFor(() => assert.ok(queryByText("No blogs match your search.")));
  assert.ok(getByRole("button", "Clear search and filters"));
});

test("an API error shows a friendly message with a working retry", async () => {
  let attempts = 0;
  setBlogApi(fakeBlogService({
    listPublishedBlogs: async () => {
      attempts += 1;
      if (attempts === 1) throw apiError(500, "Something went wrong on our side. Please try again.");
      return page([makePost()]);
    },
  }));
  await open("/blogs");
  await waitFor(() => assert.ok(queryByText("Something went wrong on our side. Please try again.")));
  await click(getByRole("button", "Retry"));
  await waitFor(() => assert.equal(cards().length, 1));
});

test("a page of 9 cards is laid out 3 / 2 / 1 per row (desktop / tablet / mobile)", async () => {
  const nine = Array.from({ length: 9 }, (_, i) => makePost({ id: i + 1, slug: `post-${i + 1}`, title: `Post ${i + 1}` }));
  setBlogApi(fakeBlogService({ listPublishedBlogs: async () => page(nine, 85, "next") }));
  await open("/blogs");
  await waitFor(() => assert.equal(cards().length, 9));
  const items = all("[data-testid='blog-grid'] > .MuiGrid-root");
  assert.equal(items.length, 9);
  for (const item of items) {
    for (const cls of ["MuiGrid-grid-xs-12", "MuiGrid-grid-sm-6", "MuiGrid-grid-md-4"]) {
      assert.ok(item.className.includes(cls), cls);
    }
  }
  assert.ok(getByRole("button", "Go to page 10"), "85 posts -> 10 pages of 9");
  assert.equal(queryByRole("button", "Go to page 11"), null, "no blank extra page");
});

test("Previous is disabled on the first page and Next on the last; paging shows loading", async () => {
  let resolveSecond;
  const api = fakeBlogService({
    listPublishedBlogs: (params) => (params.page === 2
      ? new Promise((r) => { resolveSecond = r; })
      : Promise.resolve(page([makePost()], 18, "next"))),
  });
  setBlogApi(api);
  const view = await open("/blogs");
  await waitFor(() => assert.ok(getByRole("button", "Go to page 2")));
  assert.equal(getByRole("button", "Go to previous page").disabled, true);
  assert.equal(getByRole("button", "Go to next page").disabled, false);

  await click(getByRole("button", "Go to next page"));
  await waitFor(() => assert.ok(document.querySelector("[aria-label='Loading blogs']")));
  assert.equal(view.path(), "/blogs?page=2");
  resolveSecond(page([makePost({ id: 9, slug: "last-one", title: "Last one" })], 18));
  await waitFor(() => assert.ok(queryByText("Last one", { selector: "a" })));
  assert.equal(getByRole("button", "Go to next page").disabled, true);
  assert.equal(getByRole("button", "Go to previous page").disabled, false);
  await click(getByRole("button", "Go to previous page"));
  await waitFor(() => assert.equal(view.path(), "/blogs"));
});

test("a category or tag filter returns to page 1", async () => {
  const api = fakeBlogService({ listPublishedBlogs: async () => page([makePost()], 30, "next") });
  setBlogApi(api);
  const view = await open("/blogs?page=3");
  await waitFor(() => assert.equal(cards().length, 1));
  await click(getByText("Research", { selector: "[data-testid='blog-card'] .MuiChip-label" }));
  await waitFor(() => assert.equal(view.path(), "/blogs?category=research"));
  const last = api.callsTo("listPublishedBlogs").at(-1)[1];
  assert.equal(last.page, 1);
  assert.equal(last.category, "research");
});

// ------------------------------------------------------------- Detail --

const DETAIL = makePost({
  seo_title: "SEO: M&A update",
  seo_description: "Deal activity summary",
  canonical_url: "https://imaa-institute.org/old-wordpress-url/",
  updated_at: "2026-09-21T00:00:00Z",
  content_html: `
    <h2>Deal volume</h2><p>First paragraph with <a href="https://imaa-institute.org/data">data</a>.</p>
    <script>window.__blogXss = true</script>
    <img src="https://cdn.test/chart.png" alt="Chart" onerror="window.__blogXss = true">
    <a href="javascript:window.__blogXss=true">bad link</a>
    <iframe src="https://evil.test/"></iframe>`,
});

test("renders the article: title, author, date, excerpt, image, categories and tags", async () => {
  setBlogApi(fakeBlogService({ getPublishedBlog: async () => DETAIL }));
  await open("/blogs/m-a-market-update");
  await waitFor(() => assert.ok(queryByText("M&A Market Update", { selector: "h1" })));
  assert.equal(document.querySelector("[data-testid='blog-detail-author']").textContent, "By Ada Lovelace");
  assert.ok(queryByText("September 20, 2026", { selector: "time" }));
  assert.ok(queryByText("Quarterly deal activity."));
  assert.ok(document.querySelector("img[src='https://cdn.test/cover.jpg']"));
  assert.ok(getByRole("link", "Research"));
  assert.ok(getByRole("link", "#Europe"));
  assert.equal(getByRole("link", "Research").getAttribute("href"), "/blogs?category=research");
});

test("content_html is rendered after sanitisation", async () => {
  setBlogApi(fakeBlogService({ getPublishedBlog: async () => DETAIL }));
  await open("/blogs/m-a-market-update");
  const article = await waitFor(() => {
    const el = document.querySelector("[data-testid='blog-article-content']");
    assert.ok(el);
    return el;
  });
  // Legitimate structure survives.
  assert.equal(article.querySelector("h2").textContent, "Deal volume");
  assert.match(article.querySelector("p").textContent, /First paragraph/);
  assert.equal(article.querySelector("a[href='https://imaa-institute.org/data']").textContent, "data");
  assert.ok(article.querySelector("img[alt='Chart']"));
  // Dangerous markup is gone.
  assert.equal(article.querySelector("script"), null);
  assert.equal(article.querySelector("iframe"), null);
  assert.equal(article.querySelector("[onerror]"), null);
  assert.doesNotMatch(article.innerHTML, /javascript:/i);
  assert.equal(window.__blogXss, undefined);
});

test("document metadata uses SEO fields and ignores a foreign canonical URL", async () => {
  setBlogApi(fakeBlogService({ getPublishedBlog: async () => DETAIL }));
  await open("/blogs/m-a-market-update");
  await waitFor(() => assert.equal(document.title, "SEO: M&A update"));
  assert.equal(document.querySelector("meta[name='description']").getAttribute("content"), "Deal activity summary");
  assert.equal(document.querySelector("link[rel='canonical']"), null);
});

test("missing and draft slugs both show the same not-found page", async () => {
  setBlogApi(fakeBlogService({ getPublishedBlog: async () => { throw apiError(404, "This blog could not be found."); } }));
  await open("/blogs/secret-draft");
  await waitFor(() => assert.ok(queryByText("Blog not found", { selector: "h1" })));
  assert.doesNotMatch(document.body.textContent, /draft/i);
  assert.ok(getByRole("link", "Browse blogs"));
});

test("a server error on the article page offers a retry", async () => {
  let attempts = 0;
  setBlogApi(fakeBlogService({
    getPublishedBlog: async () => {
      attempts += 1;
      if (attempts === 1) throw apiError(503, "Something went wrong on our side. Please try again.");
      return DETAIL;
    },
  }));
  await open("/blogs/m-a-market-update");
  await waitFor(() => assert.ok(queryByRole("button", "Retry")));
  await click(getByRole("button", "Retry"));
  await waitFor(() => assert.ok(queryByText("M&A Market Update", { selector: "h1" })));
});
