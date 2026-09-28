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
const rows = () => all("[data-testid='admin-blog-row']");

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
  assert.equal(queryByText(/Import from WordPress/i), null, "no WordPress import yet");
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
    await waitFor(() => assert.ok(all("tbody tr").length > 0, url));
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
