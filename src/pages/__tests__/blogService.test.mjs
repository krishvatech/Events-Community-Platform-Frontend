import assert from "node:assert/strict";
import test from "node:test";

import {
  BLOG_API,
  BlogApiError,
  createBlogService,
  listAllPages,
  normalizeBlogError,
  normalizePage,
  totalPagesFor,
} from "../../services/blogService.js";

/** Axios-shaped fake that records every call. */
function recordingClient(responder = () => ({ data: {} })) {
  const calls = [];
  const make = (method) => async (url, bodyOrConfig, maybeConfig) => {
    const hasBody = method !== "get";
    const call = {
      method,
      url,
      body: hasBody ? bodyOrConfig : undefined,
      config: hasBody ? maybeConfig : bodyOrConfig,
    };
    calls.push(call);
    return responder(call);
  };
  return { calls, client: { get: make("get"), post: make("post"), patch: make("patch"), put: make("put"), delete: make("delete") } };
}

const PAGE = { count: 1, next: null, previous: null, results: [{ id: 1 }] };

test("published list uses the reader endpoint and returns a normalised page", async () => {
  const { calls, client } = recordingClient(() => ({ data: PAGE }));
  const page = await createBlogService(client).listPublishedBlogs({ search: "deals" });
  assert.equal(calls[0].method, "get");
  assert.equal(calls[0].url, "/blogs/");
  assert.deepEqual(calls[0].config.params, { search: "deals" });
  assert.deepEqual(page, PAGE);
});

test("published detail encodes the slug", async () => {
  const { calls, client } = recordingClient(() => ({ data: { id: 1 } }));
  await createBlogService(client).getPublishedBlog("m-a/update");
  assert.equal(calls[0].url, "/blogs/m-a%2Fupdate/");
});

test("query params are trimmed, empty ones dropped and page 1 omitted", async () => {
  const { calls, client } = recordingClient(() => ({ data: PAGE }));
  const service = createBlogService(client);
  await service.listPublishedBlogs({ page: 1, search: "  ", category: "research", tag: "" });
  assert.deepEqual(calls[0].config.params, { category: "research" });
  await service.listAdminBlogs({ page: 3, status: "draft", search: " q ", tag: "europe" });
  assert.equal(calls[1].url, "/blogs/admin/");
  assert.deepEqual(calls[1].config.params, { page: 3, status: "draft", search: "q", tag: "europe" });
});

test("admin detail, create and PATCH edit hit the management endpoints", async () => {
  const { calls, client } = recordingClient(({ body }) => ({ data: { id: 7, ...body } }));
  const service = createBlogService(client);
  await service.getAdminBlog(7);
  await service.createBlog({ title: "New" });
  await service.updateBlog(7, { title: "Edited" });
  assert.deepEqual(
    calls.map((c) => [c.method, c.url]),
    [["get", "/blogs/admin/7/"], ["post", "/blogs/admin/"], ["patch", "/blogs/admin/7/"]]
  );
  assert.deepEqual(calls[2].body, { title: "Edited" });
});

test("publish and unpublish use the explicit action endpoints, never a status PATCH", async () => {
  const { calls, client } = recordingClient(() => ({ data: { id: 7 } }));
  const service = createBlogService(client);
  await service.publishBlog(7);
  await service.unpublishBlog(7);
  assert.deepEqual(
    calls.map((c) => [c.method, c.url]),
    [["post", "/blogs/admin/7/publish/"], ["post", "/blogs/admin/7/unpublish/"]]
  );
  assert.ok(calls.every((c) => c.method !== "patch" && c.method !== "put"));
});

test("category requests", async () => {
  const { calls, client } = recordingClient(() => ({ data: PAGE }));
  const service = createBlogService(client);
  await service.listBlogCategories({ search: "res" });
  await service.createBlogCategory({ name: "Research" });
  await service.updateBlogCategory(3, { name: "Research 2" });
  assert.deepEqual(
    calls.map((c) => [c.method, c.url]),
    [
      ["get", "/blogs/admin/categories/"],
      ["post", "/blogs/admin/categories/"],
      ["patch", "/blogs/admin/categories/3/"],
    ]
  );
});

test("tag requests", async () => {
  const { calls, client } = recordingClient(() => ({ data: PAGE }));
  const service = createBlogService(client);
  await service.listBlogTags();
  await service.createBlogTag({ name: "Europe" });
  await service.updateBlogTag(4, { slug: "eu" });
  assert.deepEqual(
    calls.map((c) => [c.method, c.url]),
    [["get", "/blogs/admin/tags/"], ["post", "/blogs/admin/tags/"], ["patch", "/blogs/admin/tags/4/"]]
  );
});

test("featured image upload is multipart with only the file; clearing sends JSON null", async () => {
  const { calls, client } = recordingClient(() => ({ data: { id: 7 } }));
  const service = createBlogService(client);
  const file = new Blob(["img"], { type: "image/png" });
  await service.uploadBlogFeaturedImage(7, file);
  await service.clearBlogFeaturedImage(7);

  const upload = calls[0];
  assert.equal(upload.method, "patch");
  assert.equal(upload.url, "/blogs/admin/7/");
  assert.ok(upload.body instanceof FormData);
  assert.deepEqual([...upload.body.keys()], ["featured_image"]);
  assert.equal(upload.config.headers["Content-Type"], "multipart/form-data");

  assert.deepEqual(calls[1].body, { featured_image: null });
});

test("the service exposes no delete or put helpers", () => {
  const service = createBlogService(recordingClient().client);
  const names = Object.keys(service).join(" ").toLowerCase();
  assert.ok(!names.includes("delete"));
  assert.ok(!names.includes("put"));
});

test("errors are normalised into BlogApiError with field errors", async () => {
  const failing = recordingClient(() => {
    const error = new Error("Request failed");
    error.response = { status: 400, data: { slug: ["This slug is already in use."], title: ["Required."] } };
    throw error;
  });
  await assert.rejects(createBlogService(failing.client).createBlog({}), (err) => {
    assert.ok(err instanceof BlogApiError);
    assert.equal(err.status, 400);
    assert.deepEqual(err.fieldErrors, { slug: "This slug is already in use.", title: "Required." });
    assert.equal(err.message, "Please fix the highlighted fields and try again.");
    return true;
  });
});

test("normalizeBlogError maps statuses to safe messages without leaking server output", () => {
  assert.equal(normalizeBlogError({ response: { status: 404, data: { detail: "No BlogPost matches the given query." } } }).message,
    "No BlogPost matches the given query.");
  assert.equal(normalizeBlogError({ response: { status: 403, data: {} } }).message, "You do not have permission to do this.");
  assert.equal(normalizeBlogError({ response: { status: 401, data: {} } }).status, 401);
  assert.match(normalizeBlogError({ response: { status: 413, data: "<html>too big</html>" } }).message, /10 MB/);
  const server = normalizeBlogError({ response: { status: 500, data: "<html>Traceback (most recent call last)</html>" } });
  assert.equal(server.message, "Something went wrong on our side. Please try again.");
  assert.doesNotMatch(server.message, /Traceback/);
  const network = normalizeBlogError(new Error("Network Error"));
  assert.equal(network.status, null);
  assert.match(network.message, /Network error/);
  const publish = normalizeBlogError({ response: { status: 400, data: { content_html: "A published blog requires article content." } } });
  assert.equal(publish.fieldErrors.content_html, "A published blog requires article content.");
});

test("pagination helpers", async () => {
  assert.deepEqual(normalizePage([{ id: 1 }]), { count: 1, next: null, previous: null, results: [{ id: 1 }] });
  assert.equal(totalPagesFor(0), 1);
  assert.equal(totalPagesFor(20), 1);
  assert.equal(totalPagesFor(21), 2);

  const pages = { 1: { results: [1, 2], next: "n" }, 2: { results: [3], next: null } };
  const seen = [];
  const all = await listAllPages(async ({ page }) => {
    seen.push(page);
    return pages[page];
  });
  assert.deepEqual(all, [1, 2, 3]);
  assert.deepEqual(seen, [1, 2]);
});

test("endpoint table matches the backend contract", () => {
  assert.equal(BLOG_API.adminList, "/blogs/admin/");
  assert.equal(BLOG_API.category(1), "/blogs/admin/categories/1/");
  assert.equal(BLOG_API.tag(1), "/blogs/admin/tags/1/");
});
