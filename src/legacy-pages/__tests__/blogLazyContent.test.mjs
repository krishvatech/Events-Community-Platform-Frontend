import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

import {
  React,
  all,
  apiError,
  cleanup,
  click,
  fakeBlogService,
  getByRole,
  intersect,
  intersectionObservers,
  loadSource,
  makePost,
  queryByText,
  renderRoutes,
  router,
  setBlogApi,
  settle,
  signIn,
  signOut,
  waitFor,
} from "./helpers/blogDomHarness.mjs";

const { blogReaderRoutes } = await loadSource("src/routes/blogRoutes.jsx");
const open = (url) => renderRoutes(blogReaderRoutes, { url });
const h = React.createElement;
const { Route, Outlet, Link } = router;
function WithNav() {
  return h(React.Fragment, null, h(Link, { to: "/blogs/other-read" }, "Go to other read"), h(Outlet));
}
const openWithNav = (url) => renderRoutes([h(Route, { key: "nav", element: h(WithNav) }, blogReaderRoutes)], { url });

const SENTINEL = "[data-testid='content-chunk-sentinel']";
const CHUNKS = {
  "long-read": [
    '<h2 id="intro">Intro</h2><p>Part one.</p>',
    '<p>Part two.</p><figure><img src="https://cdn.test/two.png" alt="Two"><figcaption>Fig 2</figcaption></figure>',
    '<h2 id="closing">Closing</h2><p>Part three.</p>',
  ],
  "other-read": ["<p>Other one.</p>", "<p>Other two.</p>"],
};
const firstChunkPost = (slug, title) =>
  makePost({ slug, title, seo_title: `SEO ${title}`, content_html: CHUNKS[slug][0], content_chunk: 1,
             content_chunks: CHUNKS[slug].length, content_has_more: CHUNKS[slug].length > 1 });
const POSTS = { "long-read": firstChunkPost("long-read", "Long read"), "other-read": firstChunkPost("other-read", "Other read") };
const chunkOf = (slug, n) => ({ chunk: n, content_html: CHUNKS[slug][n - 1], has_more: n < CHUNKS[slug].length, chunks: CHUNKS[slug].length });

function readerApi(extra = {}) {
  return fakeBlogService({
    getPublishedBlog: async (slug) => POSTS[slug],
    getPublishedBlogChunk: async (slug, n) => chunkOf(slug, n),
    ...extra,
  });
}
function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}
// Text of each rendered chunk, one space between its blocks.
const parts = () => all("[data-testid='blog-article-content']").map((el) =>
  [...el.children].map((block) => block.textContent.replace(/\s+/g, " ").trim()).join(" "));
const chunkCalls = (api) => api.callsTo("getPublishedBlogChunk").map((c) => [c[1], c[2]]);

async function openLongRead(api, url = "/blogs/long-read") {
  setBlogApi(api);
  const view = await open(url);
  await waitFor(() => assert.ok(queryByText("Long read", { selector: "h1" })));
  return view;
}

beforeEach(() => signIn());
afterEach(async () => {
  await cleanup();
  signOut();
});

test("the article opens with metadata and only its first chunk", async () => {
  const api = readerApi();
  await openLongRead(api);
  assert.deepEqual(api.callsTo("getPublishedBlog")[0].slice(1), ["long-read", { chunked: true }]);
  assert.deepEqual(parts(), ["Intro Part one."]);
  assert.equal(chunkCalls(api).length, 0, "nothing else fetched before the reader nears the end");
  assert.equal(document.querySelector("[data-testid='blog-detail-author']").textContent, "By Ada Lovelace");
  assert.equal(document.querySelector("img[src='https://cdn.test/cover.jpg']").getAttribute("loading"), "eager");
  assert.equal(queryByText("#Europe"), null, "tags wait for the end of the article");
  const [observer] = [...intersectionObservers];
  assert.match(observer.options.rootMargin, /800px/);
});

test("scrolling appends the next chunks of the same article, one at a time", async () => {
  const api = readerApi();
  await openLongRead(api);
  await intersect(SENTINEL);
  await waitFor(() => assert.equal(parts().length, 2));
  assert.deepEqual(parts()[1], "Part two. Fig 2");
  await intersect(SENTINEL);
  await waitFor(() => assert.equal(parts().length, 3));
  assert.deepEqual(chunkCalls(api), [["long-read", 2], ["long-read", 3]]);
  assert.deepEqual(parts(), ["Intro Part one.", "Part two. Fig 2", "Closing Part three."]);
  assert.equal(document.querySelector("#closing").textContent, "Closing", "heading IDs kept");
  assert.equal(document.querySelector("img[alt='Two']").getAttribute("loading"), "lazy", "inline images lazy");
  assert.ok(queryByText("#Europe"), "tags appear once the article is complete");
});

test("only one chunk request at a time and never the same chunk twice", async () => {
  const pending = deferred();
  const api = readerApi({ getPublishedBlogChunk: () => pending.promise });
  await openLongRead(api);
  await intersect(SENTINEL);
  await intersect(SENTINEL);
  await intersect(SENTINEL);
  await waitFor(() => assert.ok(queryByText("Loading more…")));
  assert.equal(chunkCalls(api).length, 1);
  assert.ok(queryByText("Part one."), "loaded content stays readable while loading");
  pending.resolve(chunkOf("long-read", 2));
  await waitFor(() => assert.equal(parts().length, 2));
  // An out-of-order answer (e.g. a replayed chunk 2) is ignored.
  const replay = readerApi({ getPublishedBlogChunk: async () => chunkOf("long-read", 2) });
  setBlogApi(replay);
  await intersect(SENTINEL);
  await settle(50);
  assert.equal(parts().length, 2, "chunk 2 not appended twice");
});

test("at the end the observer is gone and no more requests are made", async () => {
  const api = readerApi();
  await openLongRead(api);
  await intersect(SENTINEL);
  await waitFor(() => assert.equal(parts().length, 2));
  await intersect(SENTINEL);
  await waitFor(() => assert.equal(parts().length, 3));
  assert.equal(intersectionObservers.size, 0);
  assert.equal(all(SENTINEL).length, 0);
  assert.equal(await intersect(SENTINEL), 0);
  await settle(50);
  assert.equal(chunkCalls(api).length, 2);
});

test("a single-chunk article never asks for more", async () => {
  const api = readerApi({ getPublishedBlog: async () => makePost({ content_html: "<p>Short.</p>", content_chunk: 1, content_chunks: 1, content_has_more: false }) });
  setBlogApi(api);
  await open("/blogs/m-a-market-update");
  await waitFor(() => assert.ok(queryByText("Short.")));
  assert.equal(all(SENTINEL).length, 0);
  assert.equal(intersectionObservers.size, 0);
  assert.equal(chunkCalls(api).length, 0);
});

test("a failed chunk keeps the loaded content and Retry fetches only that chunk", async () => {
  let attempts = 0;
  const api = readerApi({
    getPublishedBlogChunk: async (slug, n) => {
      attempts += 1;
      if (attempts === 1) throw apiError(null, "Network error. Please check your connection and try again.");
      return chunkOf(slug, n);
    },
  });
  await openLongRead(api);
  await intersect(SENTINEL);
  await waitFor(() => assert.ok(queryByText("Couldn’t load more of this article.")));
  assert.deepEqual(parts(), ["Intro Part one."]);
  assert.equal(intersectionObservers.size, 0, "no automatic retry loop");
  await click(getByRole("button", "Retry"));
  await waitFor(() => assert.equal(parts().length, 2));
  assert.deepEqual(chunkCalls(api), [["long-read", 2], ["long-read", 2]]);
  assert.equal(api.callsTo("getPublishedBlog").length, 1, "the article itself is not reloaded");
});

test("navigating to another Blog clears chunks, cancels the old request and ignores its answer", async () => {
  const slow = deferred();
  let aborted = false;
  const api = readerApi({
    getPublishedBlogChunk: (slug, n, { signal } = {}) => {
      if (slug !== "long-read") return Promise.resolve(chunkOf(slug, n));
      signal?.addEventListener("abort", () => { aborted = true; });
      return slow.promise;
    },
  });
  setBlogApi(api);
  const view = await openWithNav("/blogs/long-read");
  await waitFor(() => assert.ok(queryByText("Long read", { selector: "h1" })));
  await intersect(SENTINEL); // chunk 2 of long-read in flight
  await click(getByRole("link", "Go to other read"));
  await waitFor(() => assert.ok(queryByText("Other read", { selector: "h1" })));
  assert.equal(view.path(), "/blogs/other-read");
  assert.ok(aborted, "old chunk request cancelled");
  slow.resolve(chunkOf("long-read", 2)); // stale answer arrives anyway
  await settle(50);
  assert.deepEqual(parts(), ["Other one."], "no chunk from the previous article");
  await intersect(SENTINEL);
  await waitFor(() => assert.deepEqual(parts(), ["Other one.", "Other two."]));
  assert.deepEqual(chunkCalls(api), [["long-read", 2], ["other-read", 2]]);
});

test("observers are disconnected on unmount", async () => {
  await openLongRead(readerApi());
  assert.ok(intersectionObservers.size > 0);
  await cleanup();
  assert.equal(intersectionObservers.size, 0);
});

test("the page is always one Blog: one h1, stable URL, title and canonical; no other Blog appended", async () => {
  const api = readerApi();
  const view = await openLongRead(api);
  await waitFor(() => assert.equal(document.title, "SEO Long read"));
  await intersect(SENTINEL);
  await intersect(SENTINEL);
  await waitFor(() => assert.equal(parts().length, 3));
  assert.equal(all("h1").length, 1);
  assert.equal(all("article").length, 1);
  assert.equal(view.path(), "/blogs/long-read");
  assert.equal(document.title, "SEO Long read");
  assert.ok(all("link[rel='canonical']", document.head).length <= 1);
  assert.equal(queryByText(/Next article/), null);
  assert.equal(api.callsTo("getPublishedBlog").length, 1, "no other Blog requested");
  assert.ok(chunkCalls(api).every(([slug]) => slug === "long-read"));
});

test("a link to a section in a later chunk loads until the section exists", async () => {
  const api = readerApi();
  await openLongRead(api, "/blogs/long-read#closing");
  await waitFor(() => assert.ok(document.getElementById("closing")));
  assert.deepEqual(chunkCalls(api), [["long-read", 2], ["long-read", 3]]);
});
