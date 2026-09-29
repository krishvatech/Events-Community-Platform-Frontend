import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

import {
  React,
  all,
  apiError,
  chooseSelectOption,
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
  setBlogApi,
  settle,
  signIn,
  signOut,
  typeInto,
  waitFor,
} from "./helpers/blogDomHarness.mjs";

const { blogAdminRoutes, blogReaderRoutes } = await loadSource("src/routes/blogRoutes.jsx");
const { Route, Outlet } = router;
const h = React.createElement;

const routes = () => [
  h(Route, { key: "admin", path: "/admin", element: h(Outlet) }, blogAdminRoutes),
  h(React.Fragment, { key: "reader" }, blogReaderRoutes),
];
const open = (url = "/admin/blogs") => renderRoutes(routes(), { url });
// Admin Blog cards (the Blog listing is a card grid, not a table).
const rows = () => all("[data-testid='admin-blog-grid'] [data-testid='blog-card']");

const DRAFT = { ...makePost({ id: 2, title: "Draft thoughts", slug: "draft-thoughts", published_at: null }), status: "draft", updated_at: "2026-09-24T00:00:00Z" };
const LIVE = { ...makePost({ id: 1 }), status: "published", updated_at: "2026-09-21T00:00:00Z" };

beforeEach(() => signIn({ superuser: true }));
afterEach(async () => {
  await cleanup();
  signOut();
});

test("lists drafts and published blogs with text status badges", async () => {
  setBlogApi(fakeBlogService({ listAdminBlogs: async () => page([DRAFT, LIVE]) }));
  await open();
  await waitFor(() => assert.equal(rows().length, 2));
  const [draftRow, liveRow] = rows();
  assert.ok(queryByText("Draft thoughts", { scope: draftRow }));
  assert.equal(draftRow.querySelector("[data-testid='blog-status']").textContent, "Draft");
  assert.equal(liveRow.querySelector("[data-testid='blog-status']").textContent, "Published");
  assert.ok(queryByText("September 20, 2026", { scope: liveRow }));
  assert.ok(queryByText("Ada Lovelace", { scope: liveRow }));
  assert.ok(getByRole("button", "Create Blog"));
  assert.ok(queryByRole("button", "Import from WordPress"), "Batch 4 adds the WordPress import action");
});

test("the Blog list is a card grid (no table) with admin badges, dates and actions", async () => {
  const MEMBERS = { ...makePost({ id: 3, title: "Members report", slug: "members-report" }), status: "draft",
                    wp_status: "publish", wp_membership_restricted: true, updated_at: "2026-09-27T00:00:00Z" };
  const WP_DRAFT = { ...DRAFT, id: 4, title: "WP idea", slug: "wp-idea", wp_status: "draft" };
  setBlogApi(fakeBlogService({ listAdminBlogs: async () => page([LIVE, MEMBERS, WP_DRAFT]) }));
  await open();
  await waitFor(() => assert.equal(rows().length, 3));
  assert.equal(all("table").length, 0, "the Blog listing no longer uses a table");
  const grid = document.querySelector("[data-testid='admin-blog-grid']");
  for (const item of all(":scope > .MuiGrid-root", grid)) {
    assert.ok(item.className.includes("MuiGrid-grid-md-4") && item.className.includes("MuiGrid-grid-sm-6"));
  }
  const [live, members, wpDraft] = rows();
  assert.equal(live.dataset.variant, "admin", "same BlogCard, admin variant");
  assert.ok(queryByText("Quarterly deal activity.", { scope: live }), "excerpt shown");
  assert.match(live.querySelector("[data-testid='blog-card-updated']").textContent, /Updated September 21, 2026/);
  assert.ok(!live.querySelector("[data-testid='blog-members-only']"));
  assert.equal(members.querySelector("[data-testid='blog-members-only']").textContent, "WP members-only");
  assert.equal(members.querySelector("[data-testid='blog-status']").textContent, "Draft");
  assert.equal(wpDraft.querySelector("[data-testid='blog-wp-source']").textContent, "WordPress draft");
  assert.equal(queryByText(/Read more/, { scope: live }), null, "admin cards show actions instead of Read more");
  assert.ok(getByRole("link", "Edit M&A Market Update", { scope: live }));
  assert.ok(getByRole("button", "Unpublish M&A Market Update", { scope: live }));
  assert.ok(getByRole("button", "Publish Members report", { scope: members }));
  // Title links follow the existing view behaviour: public page vs draft preview.
  assert.equal(queryByText("M&A Market Update", { scope: live, selector: "a" }).getAttribute("href"), "/blogs/m-a-market-update");
  assert.equal(queryByText("Members report", { scope: members, selector: "a" }).getAttribute("href"), "/admin/blogs/3/edit?preview=1");
});

test("My Blogs shows 9 cards per page from backend pagination", async () => {
  const nine = Array.from({ length: 9 }, (_, i) => ({ ...makePost({ id: i + 10, slug: `p-${i}`, title: `Post ${i}` }), status: "published" }));
  const api = fakeBlogService({ listAdminBlogs: async () => page(nine, 104, "next") });
  setBlogApi(api);
  await open();
  await waitFor(() => assert.equal(rows().length, 9));
  assert.ok(getByRole("button", "Go to page 12"), "104 blogs -> 12 pages of 9");
  assert.equal(queryByRole("button", "Go to page 13"), null);
});

test("a page that no longer exists falls back to the previous page", async () => {
  const api = fakeBlogService({
    listAdminBlogs: async (params) => {
      if ((params.page || 1) === 2) throw apiError(404, "Invalid page.");
      return page([DRAFT], 10, "next");
    },
  });
  setBlogApi(api);
  await open();
  await waitFor(() => assert.ok(getByRole("button", "Go to page 2")));
  await click(getByRole("button", "Go to page 2"));
  await waitFor(() => assert.equal(api.callsTo("listAdminBlogs").at(-1)[1].page, 1));
  await waitFor(() => assert.equal(rows().length, 1));
  assert.equal(queryByText("Invalid page."), null, "no error shown");
});

test("status filter and search are sent to the admin API", async () => {
  const api = fakeBlogService({ listAdminBlogs: async () => page([DRAFT, LIVE]) });
  setBlogApi(api);
  await open();
  await waitFor(() => assert.equal(rows().length, 2));

  await chooseSelectOption(getByRole("combobox", "Status"), "Draft");
  await waitFor(() => assert.equal(api.callsTo("listAdminBlogs").at(-1)[1].status, "draft"));

  await typeInto(getByRole("textbox", "Search blogs"), "thoughts");
  await settle();
  await waitFor(() => {
    const params = api.callsTo("listAdminBlogs").at(-1)[1];
    assert.equal(params.search, "thoughts");
    assert.equal(params.status, "draft");
    assert.equal(params.page, 1);
  });
});

test("pagination loads the next page", async () => {
  const api = fakeBlogService({ listAdminBlogs: async () => page([DRAFT], 41, "next") });
  setBlogApi(api);
  await open();
  await waitFor(() => assert.ok(queryByRole("button", "Go to page 3")));
  await click(getByRole("button", "Go to page 2"));
  await waitFor(() => assert.equal(api.callsTo("listAdminBlogs").at(-1)[1].page, 2));
});

test("edit, view and draft preview actions point at the right routes", async () => {
  setBlogApi(fakeBlogService({ listAdminBlogs: async () => page([DRAFT, LIVE]) }));
  const view = await open();
  await waitFor(() => assert.equal(rows().length, 2));

  assert.equal(getByRole("link", "View M&A Market Update").getAttribute("href"), "/blogs/m-a-market-update");
  const preview = getByRole("link", "Preview Draft thoughts");
  assert.equal(preview.getAttribute("href"), "/admin/blogs/2/edit?preview=1");
  assert.equal(queryByRole("link", "View Draft thoughts"), null, "drafts never link to the public route");

  await click(getByRole("link", "Edit Draft thoughts"));
  await waitFor(() => assert.equal(view.path(), "/admin/blogs/2/edit"));
});

test("publish uses the publish action after confirmation and refreshes the list", async () => {
  let resolvePublish;
  let listCalls = 0;
  const api = fakeBlogService({
    listAdminBlogs: async () => {
      listCalls += 1;
      return page([listCalls > 1 ? { ...DRAFT, status: "published", published_at: "2026-09-25T10:00:00Z" } : DRAFT]);
    },
    publishBlog: () => new Promise((r) => { resolvePublish = r; }),
  });
  setBlogApi(api);
  await open();
  await waitFor(() => assert.equal(rows().length, 1));

  await click(getByRole("button", "Publish Draft thoughts"));
  const dialog = await waitFor(() => getByRole("dialog"));
  assert.match(dialog.textContent, /visible to every member/);
  await click(getByRole("button", "Publish", { scope: dialog }));

  await waitFor(() => assert.equal(api.callsTo("publishBlog").length, 1));
  assert.equal(api.callsTo("publishBlog")[0][1], 2);
  assert.equal(getByRole("button", "Publish Draft thoughts").disabled, true, "disabled while publishing");
  await click(getByRole("button", "Publish Draft thoughts"));
  assert.equal(api.callsTo("publishBlog").length, 1, "no double publish");

  resolvePublish({ id: 2, status: "published" });
  await waitFor(() => assert.equal(rows()[0].querySelector("[data-testid='blog-status']").textContent, "Published"));
  assert.ok(queryByText(/is now published/));
  assert.equal(api.callsTo("updateBlog").length, 0, "never PATCHes status");
});

test("unpublish uses the unpublish action and keeps the list in sync", async () => {
  let listCalls = 0;
  const api = fakeBlogService({
    listAdminBlogs: async () => {
      listCalls += 1;
      return page([listCalls > 1 ? { ...LIVE, status: "draft" } : LIVE]);
    },
  });
  setBlogApi(api);
  await open();
  await waitFor(() => assert.equal(rows().length, 1));

  await click(getByRole("button", "Unpublish M&A Market Update"));
  const dialog = await waitFor(() => getByRole("dialog"));
  assert.match(dialog.textContent, /original publication date is kept/);
  await click(getByRole("button", "Unpublish", { scope: dialog }));

  await waitFor(() => assert.equal(api.callsTo("unpublishBlog").length, 1));
  assert.equal(api.callsTo("unpublishBlog")[0][1], 1);
  await waitFor(() => assert.equal(rows()[0].querySelector("[data-testid='blog-status']").textContent, "Draft"));
  assert.ok(queryByText("September 20, 2026", { scope: rows()[0] }), "published date is still shown");
});

test("a rejected publish shows the backend reason", async () => {
  setBlogApi(fakeBlogService({
    listAdminBlogs: async () => page([DRAFT]),
    publishBlog: async () => {
      throw apiError(400, "Please fix the highlighted fields and try again.", { content_html: "A published blog requires article content." });
    },
  }));
  await open();
  await waitFor(() => assert.equal(rows().length, 1));
  await click(getByRole("button", "Publish Draft thoughts"));
  await click(getByRole("button", "Publish", { scope: await waitFor(() => getByRole("dialog")) }));
  await waitFor(() => assert.ok(queryByText("A published blog requires article content.")));
});

test("a 403 from the admin API shows a permission message", async () => {
  setBlogApi(fakeBlogService({ listAdminBlogs: async () => { throw apiError(403, "You do not have permission to do this."); } }));
  await open();
  await waitFor(() => assert.ok(queryByText("You do not have permission to manage blogs.")));
});

test("no delete UI exists anywhere on My Blogs", async () => {
  setBlogApi(fakeBlogService({
    listAdminBlogs: async () => page([DRAFT, LIVE]),
    listBlogCategories: async () => page([{ id: 1, name: "Research", slug: "research" }]),
    listBlogTags: async () => page([{ id: 2, name: "Europe", slug: "europe" }]),
  }));
  for (const url of ["/admin/blogs", "/admin/blogs?tab=categories", "/admin/blogs?tab=tags"]) {
    await open(url);
    await waitFor(() => assert.ok((url === "/admin/blogs" ? rows() : all("tbody tr")).length > 0, url));
    assert.equal(all("button, a").filter((el) => /delete/i.test(`${el.getAttribute("aria-label") || ""} ${el.textContent}`)).length, 0, url);
    await cleanup();
  }
});

// ------------------------------------------------------ Categories/Tags --

for (const kind of [
  { tab: "categories", singular: "Category", plural: "Categories", list: "listBlogCategories", create: "createBlogCategory", update: "updateBlogCategory" },
  { tab: "tags", singular: "Tag", plural: "Tags", list: "listBlogTags", create: "createBlogTag", update: "updateBlogTag" },
]) {
  test(`superuser can view, create and edit ${kind.plural.toLowerCase()}`, async () => {
    const api = fakeBlogService({
      [kind.list]: async () => page([{ id: 7, name: "Research", slug: "research" }]),
    });
    setBlogApi(api);
    await open(`/admin/blogs?tab=${kind.tab}`);
    await waitFor(() => assert.ok(queryByText("research", { selector: "td" })));
    assert.ok(queryByText("Research", { selector: "td" }));

    // Create: blank slug is omitted so the backend generates it.
    await click(getByRole("button", `New ${kind.singular}`));
    let dialog = await waitFor(() => getByRole("dialog"));
    await typeInto(dialog.querySelector("input"), "Private Equity");
    await click(getByRole("button", "Save", { scope: dialog }));
    await waitFor(() => assert.equal(api.callsTo(kind.create).length, 1));
    assert.deepEqual(api.callsTo(kind.create)[0][1], { name: "Private Equity" });
    await waitFor(() => assert.ok(queryByText(`${kind.singular} created.`)));

    // Edit name and slug.
    await click(getByRole("button", `Edit ${kind.singular.toLowerCase()} Research`));
    dialog = await waitFor(() => getByRole("dialog"));
    const [nameInput, slugInput] = dialog.querySelectorAll("input");
    assert.equal(nameInput.value, "Research");
    await typeInto(nameInput, "Research & Data");
    await typeInto(slugInput, "research-data");
    await click(getByRole("button", "Save", { scope: dialog }));
    await waitFor(() => assert.equal(api.callsTo(kind.update).length, 1));
    assert.deepEqual(api.callsTo(kind.update)[0].slice(1), [7, { name: "Research & Data", slug: "research-data" }]);
  });

  test(`${kind.plural.toLowerCase()} show validation errors from the API`, async () => {
    setBlogApi(fakeBlogService({
      [kind.list]: async () => page([]),
      [kind.create]: async () => {
        throw apiError(400, "Please fix the highlighted fields and try again.", { name: "An entry with this name already exists." });
      },
    }));
    await open(`/admin/blogs?tab=${kind.tab}`);
    await waitFor(() => assert.ok(queryByText(`No ${kind.plural.toLowerCase()} yet.`)));
    await click(getByRole("button", `New ${kind.singular}`));
    const dialog = await waitFor(() => getByRole("dialog"));

    await click(getByRole("button", "Save", { scope: dialog }));
    await waitFor(() => assert.ok(getByText("Name is required.", { scope: dialog })));

    await typeInto(dialog.querySelector("input"), "Valuation");
    await click(getByRole("button", "Save", { scope: dialog }));
    await waitFor(() => assert.ok(getByText("An entry with this name already exists.", { scope: dialog })));
  });
}
