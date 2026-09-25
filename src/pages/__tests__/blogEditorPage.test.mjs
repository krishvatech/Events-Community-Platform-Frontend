import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

import {
  React,
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
  router,
  selectFile,
  setBlogApi,
  signIn,
  signOut,
  typeInto,
  waitFor,
} from "./helpers/blogDomHarness.mjs";

const { blogAdminRoutes } = await loadSource("src/routes/blogRoutes.jsx");
const { Route, Outlet } = router;
const h = React.createElement;

const open = (url) =>
  renderRoutes([h(Route, { key: "admin", path: "/admin", element: h(Outlet) }, blogAdminRoutes)], { url });

const CATEGORIES = [{ id: 1, name: "Research", slug: "research" }, { id: 3, name: "Valuation", slug: "valuation" }];
const TAGS = [{ id: 2, name: "Europe", slug: "europe" }, { id: 4, name: "Asia", slug: "asia" }];

const DRAFT = {
  ...makePost({ id: 5, published_at: null, author: { id: 3, full_name: "Ada Lovelace", avatar_url: "" } }),
  status: "draft",
  content_html: "<p>Draft body</p>",
  seo_title: "",
  seo_description: "",
  canonical_url: "",
  categories: [CATEGORIES[0]],
  tags: [TAGS[0]],
};
const PUBLISHED = { ...DRAFT, status: "published", published_at: "2026-09-20T09:00:00Z" };

const service = (overrides = {}) =>
  fakeBlogService({
    listBlogCategories: async () => page(CATEGORIES),
    listBlogTags: async () => page(TAGS),
    getAdminBlog: async () => DRAFT,
    // Like the real API, PATCH returns the full record (numeric id).
    updateBlog: async (_id, payload) => ({ ...DRAFT, ...payload }),
    ...overrides,
  });

const field = (label) => getByRole("textbox", label);
const button = (label) => getByRole("button", label);
const contentBox = () => document.querySelector("[data-testid='visual-editor'], textarea[aria-labelledby='blog-content-label']");

async function pickOption(label, optionText) {
  const input = getByRole("combobox", label);
  await typeInto(input, optionText.slice(0, 3));
  const option = await waitFor(() => getByRole("option", optionText));
  await click(option);
}

beforeEach(() => signIn({ superuser: true }));
afterEach(async () => {
  await cleanup();
  signOut();
});

// ------------------------------------------------------------ Create --

test("create page loads for a superuser with Save Draft only", async () => {
  setBlogApi(service());
  await open("/admin/blogs/new");
  await waitFor(() => assert.ok(queryByText("Create Blog", { selector: "h1" })));
  assert.ok(button("Save Draft"));
  assert.equal(queryByRole("button", "Publish"), null, "a new blog is never published on submit");
  assert.ok(field("Title"));
  assert.ok(field("Slug"));
  assert.ok(field("Excerpt"));
  assert.ok(field("SEO title"));
  assert.ok(field("SEO description"));
  assert.ok(field("Canonical URL"));
});

test("title is required before anything is sent", async () => {
  const api = service();
  setBlogApi(api);
  await open("/admin/blogs/new");
  await waitFor(() => assert.ok(button("Save Draft")));
  await click(button("Save Draft"));
  await waitFor(() => assert.ok(queryByText("Title is required.")));
  assert.equal(api.callsTo("createBlog").length, 0);
});

test("save draft sends content_html, taxonomy, SEO fields and a blank slug for generation", async () => {
  const api = service();
  setBlogApi(api);
  const view = await open("/admin/blogs/new");
  await waitFor(() => assert.ok(button("Save Draft")));

  await typeInto(field("Title"), "  New insights  ");
  await typeInto(field("Excerpt"), "Short teaser");
  await typeInto(await waitFor(() => { const el = contentBox(); assert.ok(el); return el; }), "<h2>Intro</h2><p>Body</p>");
  await pickOption("Categories", "Valuation");
  await pickOption("Tags", "Asia");
  await typeInto(field("SEO title"), "SEO title here");
  await typeInto(field("SEO description"), "SEO description here");
  await typeInto(field("Canonical URL"), "https://connect.imaa.test/blogs/new-insights");
  await click(button("Save Draft"));

  await waitFor(() => assert.equal(api.callsTo("createBlog").length, 1));
  const payload = api.callsTo("createBlog")[0][1];
  assert.equal(payload.title, "New insights");
  assert.equal("slug" in payload, false, "blank slug is left to the backend");
  assert.equal(payload.excerpt, "Short teaser");
  assert.equal(payload.content_html, "<h2>Intro</h2><p>Body</p>");
  assert.deepEqual(payload.category_ids, [3]);
  assert.deepEqual(payload.tag_ids, [4]);
  assert.equal(payload.seo_title, "SEO title here");
  assert.equal(payload.seo_description, "SEO description here");
  assert.equal(payload.canonical_url, "https://connect.imaa.test/blogs/new-insights");
  assert.equal(payload.author_id, null);
  assert.equal("status" in payload, false);
  assert.equal(api.callsTo("publishBlog").length, 0);

  await waitFor(() => assert.equal(view.path(), "/admin/blogs/50/edit"));
});

test("an explicit slug is sent exactly as intended", async () => {
  const api = service();
  setBlogApi(api);
  await open("/admin/blogs/new");
  await waitFor(() => assert.ok(button("Save Draft")));
  await typeInto(field("Title"), "Title");
  await typeInto(field("Slug"), " my-custom-slug ");
  await click(button("Save Draft"));
  await waitFor(() => assert.equal(api.callsTo("createBlog").length, 1));
  assert.equal(api.callsTo("createBlog")[0][1].slug, "my-custom-slug");
});

test("API validation errors are shown on the matching fields", async () => {
  setBlogApi(service({
    createBlog: async () => {
      throw apiError(400, "Please fix the highlighted fields and try again.", {
        slug: "This slug is already in use.",
        category_ids: 'Invalid pk "999" - object does not exist.',
      });
    },
  }));
  await open("/admin/blogs/new");
  await waitFor(() => assert.ok(button("Save Draft")));
  await typeInto(field("Title"), "Title");
  await typeInto(field("Slug"), "taken");
  await click(button("Save Draft"));
  await waitFor(() => assert.ok(queryByText("This slug is already in use.")));
  assert.ok(queryByText('Invalid pk "999" - object does not exist.'));
  assert.ok(queryByText("Please fix the highlighted fields."));
  assert.equal(field("Title").value, "Title", "form state is preserved");
});

test("choosing a featured image previews it and uploads it after the draft is created", async () => {
  const api = service();
  setBlogApi(api);
  await open("/admin/blogs/new");
  await waitFor(() => assert.ok(button("Choose image")));
  const file = new File(["png"], "cover.png", { type: "image/png" });
  await selectFile(document.querySelector("[data-testid='featured-image-input']"), file);
  await waitFor(() => assert.ok(document.querySelector("img[alt='Featured image preview']")));

  await typeInto(field("Title"), "With image");
  await click(button("Save Draft"));
  await waitFor(() => assert.equal(api.callsTo("uploadBlogFeaturedImage").length, 1));
  assert.deepEqual(api.calls.map((c) => c[0]).filter((n) => n === "createBlog" || n === "uploadBlogFeaturedImage"), ["createBlog", "uploadBlogFeaturedImage"]);
  assert.equal(api.callsTo("uploadBlogFeaturedImage")[0][2], file);
});

test("invalid and oversized images are rejected before upload", async () => {
  setBlogApi(service());
  await open("/admin/blogs/new");
  await waitFor(() => assert.ok(button("Choose image")));
  const input = document.querySelector("[data-testid='featured-image-input']");
  await selectFile(input, new File(["%PDF"], "doc.pdf", { type: "application/pdf" }));
  await waitFor(() => assert.ok(queryByText(/Please choose an image file/)));
  const huge = new File(["x"], "huge.png", { type: "image/png" });
  Object.defineProperty(huge, "size", { value: 11 * 1024 * 1024 });
  await selectFile(input, huge);
  await waitFor(() => assert.ok(queryByText("Featured image must be 10 MB or smaller.")));
  assert.equal(document.querySelector("img[alt='Featured image preview']"), null);
});

// -------------------------------------------------------------- Edit --

test("edit page loads existing values", async () => {
  setBlogApi(service());
  await open("/admin/blogs/5/edit");
  await waitFor(() => assert.equal(field("Title").value, "M&A Market Update"));
  assert.equal(field("Slug").value, "m-a-market-update");
  assert.equal(field("Excerpt").value, "Quarterly deal activity.");
  assert.equal(contentBox().value, "<p>Draft body</p>");
  assert.equal(getByRole("combobox", "Author").value, "Ada Lovelace");
  assert.ok(queryByText("Research", { selector: ".MuiChip-label" }));
  assert.ok(queryByText("Europe", { selector: ".MuiChip-label" }));
  assert.ok(document.querySelector("img[src='https://cdn.test/cover.jpg']"));
  assert.equal(document.querySelector("[data-testid='blog-status']").textContent, "Draft");
});

test("Save Changes PATCHes edits without regenerating the slug", async () => {
  const api = service();
  setBlogApi(api);
  await open("/admin/blogs/5/edit");
  await waitFor(() => assert.equal(field("Title").value, "M&A Market Update"));
  await typeInto(field("Title"), "A completely different title");
  assert.equal(field("Slug").value, "m-a-market-update", "slug field is not regenerated");
  await pickOption("Tags", "Asia");
  await click(button("Save Changes"));

  await waitFor(() => assert.equal(api.callsTo("updateBlog").length, 1));
  const [, id, payload] = api.callsTo("updateBlog")[0];
  assert.equal(id, "5");
  assert.equal(payload.title, "A completely different title");
  assert.equal(payload.slug, "m-a-market-update");
  assert.deepEqual(payload.category_ids, [1]);
  assert.deepEqual(payload.tag_ids, [2, 4]);
  assert.equal(api.callsTo("createBlog").length, 0);
  await waitFor(() => assert.ok(queryByText("Changes saved.")));
});

test("a slug collision on edit is shown clearly", async () => {
  setBlogApi(service({
    updateBlog: async () => { throw apiError(400, "Please fix the highlighted fields and try again.", { slug: "This slug is already in use." }); },
  }));
  await open("/admin/blogs/5/edit");
  await waitFor(() => assert.ok(button("Save Changes")));
  await typeInto(field("Slug"), "existing-post");
  await click(button("Save Changes"));
  await waitFor(() => assert.ok(queryByText("This slug is already in use.")));
});

test("replacing and removing the featured image", async () => {
  const replaceApi = service();
  setBlogApi(replaceApi);
  await open("/admin/blogs/5/edit");
  await waitFor(() => assert.ok(button("Replace image")));
  await selectFile(document.querySelector("[data-testid='featured-image-input']"), new File(["png"], "new.png", { type: "image/png" }));
  await click(button("Save Changes"));
  await waitFor(() => assert.equal(replaceApi.callsTo("uploadBlogFeaturedImage").length, 1));
  assert.equal(replaceApi.callsTo("clearBlogFeaturedImage").length, 0);
  await cleanup();

  const clearApi = service();
  setBlogApi(clearApi);
  await open("/admin/blogs/5/edit");
  await waitFor(() => assert.ok(button("Remove image")));
  await click(button("Remove image"));
  assert.ok(queryByText("No featured image."));
  await click(button("Save Changes"));
  await waitFor(() => assert.equal(clearApi.callsTo("clearBlogFeaturedImage").length, 1));
  assert.equal(clearApi.callsTo("clearBlogFeaturedImage")[0][1], 5);
});

test("an existing image-rich article opens in HTML mode so nothing is stripped", async () => {
  setBlogApi(service({ getAdminBlog: async () => ({ ...DRAFT, content_html: "<figure><img src='a.png'></figure><table><tr><td>1</td></tr></table>" }) }));
  await open("/admin/blogs/5/edit");
  await waitFor(() => assert.ok(queryByText(/cannot preserve/)));
  assert.equal(document.querySelector("[data-testid='visual-editor']"), null);
});

// -------------------------------------------------- Publish / unpublish --

test("Publish on an unchanged draft calls only the publish action and updates the UI", async () => {
  const api = service({
    publishBlog: async (id) => ({ ...DRAFT, id, status: "published", published_at: "2026-09-25T10:00:00Z" }),
  });
  setBlogApi(api);
  await open("/admin/blogs/5/edit");
  await waitFor(() => assert.ok(button("Publish")));
  await click(button("Publish"));

  await waitFor(() => assert.equal(document.querySelector("[data-testid='blog-status']").textContent, "Published"));
  assert.deepEqual(api.callsTo("publishBlog").map((c) => c[1]), [5]);
  assert.equal(api.callsTo("updateBlog").length, 0, "no status PATCH shortcut");
  assert.ok(queryByText("Published September 25, 2026"));
  assert.ok(button("Unpublish"));
  assert.equal(getByRole("link", "View Published").getAttribute("href"), "/blogs/m-a-market-update");
});

test("Save & Publish saves first, then publishes the saved record", async () => {
  const api = service({
    publishBlog: async (id) => ({ ...DRAFT, id, status: "published", published_at: "2026-09-25T10:00:00Z" }),
    updateBlog: async (id, payload) => ({ ...DRAFT, ...payload, id: 5 }),
  });
  setBlogApi(api);
  await open("/admin/blogs/5/edit");
  await waitFor(() => assert.ok(button("Publish")));
  await typeInto(field("Excerpt"), "Updated teaser");
  await click(button("Save & Publish"));
  await waitFor(() => assert.equal(api.callsTo("publishBlog").length, 1));
  const order = api.calls.map((c) => c[0]).filter((n) => n === "updateBlog" || n === "publishBlog");
  assert.deepEqual(order, ["updateBlog", "publishBlog"]);
  assert.equal(api.callsTo("updateBlog")[0][2].excerpt, "Updated teaser");
  assert.equal("status" in api.callsTo("updateBlog")[0][2], false);
});

test("a failed save prevents publishing", async () => {
  const api = service({
    updateBlog: async () => { throw apiError(400, "Please fix the highlighted fields and try again.", { title: "Title cannot be blank." }); },
  });
  setBlogApi(api);
  await open("/admin/blogs/5/edit");
  await waitFor(() => assert.ok(button("Publish")));
  await typeInto(field("Excerpt"), "changed");
  await click(button("Save & Publish"));
  await waitFor(() => assert.ok(queryByText("Title cannot be blank.")));
  assert.equal(api.callsTo("publishBlog").length, 0);
});

test("the publish button is disabled while the request is active", async () => {
  let resolvePublish;
  const api = service({ publishBlog: () => new Promise((r) => { resolvePublish = r; }) });
  setBlogApi(api);
  await open("/admin/blogs/5/edit");
  await waitFor(() => assert.ok(button("Publish")));
  await click(button("Publish"));
  const busy = await waitFor(() => getByRole("button", "Publishing…"));
  assert.equal(busy.disabled, true);
  assert.equal(button("Save Changes").disabled, true);
  await click(busy);
  assert.equal(api.callsTo("publishBlog").length, 1, "no double publish");
  resolvePublish({ ...DRAFT, status: "published", published_at: "2026-09-25T10:00:00Z" });
  await waitFor(() => assert.ok(button("Unpublish")));
});

test("publish rejected by the backend shows the content error", async () => {
  setBlogApi(service({
    publishBlog: async () => { throw apiError(400, "Please fix the highlighted fields and try again.", { content_html: "A published blog requires article content." }); },
  }));
  await open("/admin/blogs/5/edit");
  await waitFor(() => assert.ok(button("Publish")));
  await click(button("Publish"));
  await waitFor(() => assert.ok(queryByText("A published blog requires article content.")));
  assert.equal(document.querySelector("[data-testid='blog-status']").textContent, "Draft");
});

test("Unpublish confirms, calls the unpublish action and keeps the historical date", async () => {
  const api = service({
    getAdminBlog: async () => PUBLISHED,
    unpublishBlog: async (id) => ({ ...PUBLISHED, id: Number(id), status: "draft" }),
  });
  setBlogApi(api);
  await open("/admin/blogs/5/edit");
  await waitFor(() => assert.ok(button("Unpublish")));
  assert.ok(getByRole("link", "View Published"));
  await click(button("Unpublish"));
  const dialog = await waitFor(() => getByRole("dialog"));
  await click(getByRole("button", "Unpublish", { scope: dialog }));

  await waitFor(() => assert.equal(document.querySelector("[data-testid='blog-status']").textContent, "Draft"));
  assert.deepEqual(api.callsTo("unpublishBlog").map((c) => c[1]), ["5"]);
  assert.equal(api.callsTo("updateBlog").length, 0);
  assert.ok(queryByText("First published September 20, 2026"));
  assert.ok(button("Publish"));
});

test("draft preview uses admin data and never the public reader API", async () => {
  const api = service();
  setBlogApi(api);
  await open("/admin/blogs/5/edit?preview=1");
  const dialog = await waitFor(() => getByRole("dialog"));
  assert.match(dialog.textContent, /draft, not visible to members/);
  assert.ok(getByText("Draft body", { scope: dialog }));
  assert.equal(api.callsTo("getPublishedBlog").length, 0);
});

test("a missing blog on the edit route shows a not-found message", async () => {
  setBlogApi(service({ getAdminBlog: async () => { throw apiError(404, "This blog could not be found."); } }));
  await open("/admin/blogs/999/edit");
  await waitFor(() => assert.ok(queryByText("This blog could not be found.")));
  assert.ok(getByRole("link", "Back to My Blogs"));
});
