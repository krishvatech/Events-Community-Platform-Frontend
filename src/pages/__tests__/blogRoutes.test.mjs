import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import {
  React,
  cleanup,
  fakeBlogService,
  loadSource,
  makePost,
  page,
  queryByText,
  renderRoutes,
  router,
  setBlogApi,
  signIn,
  signOut,
  waitFor,
} from "./helpers/blogDomHarness.mjs";

const { blogReaderRoutes, blogAdminRoutes } = await loadSource("src/routes/blogRoutes.jsx");
const { RequireSuperAdmin } = await loadSource("src/components/RoleBasedRoute.jsx");
const { Route, Outlet, Navigate } = router;
const h = React.createElement;

const Marker = (label) => () => h("div", null, label);

/** Mirrors App.jsx: reader routes at top level, admin routes under /admin, plus neighbours. */
const appLikeRoutes = () => [
  h(Route, { key: "home", path: "/", element: h(Marker("HOME PAGE")) }),
  h(Route, { key: "signin", path: "/signin", element: h(Marker("SIGN IN PAGE")) }),
  h(Route, { key: "admin", path: "/admin", element: h(Outlet) }, blogAdminRoutes,
    h(Route, { key: "admin-events", path: "/admin/events/:slug", element: h(Marker("EVENT MANAGE PAGE")) }),
    // A non-Blog route behind the unchanged global guard, for regression checks.
    h(Route, { key: "admin-saleor", path: "/admin/saleor", element: h(RequireSuperAdmin, null, h(Marker("SALEOR MANAGER PAGE"))) })),
  h(Route, { key: "events", path: "/events", element: h(Marker("EVENTS PAGE")) }),
  h(Route, { key: "event", path: "/events/:slug", element: h(Marker("EVENT DETAIL PAGE")) }),
  h(Route, { key: "public", path: "/public/:slug", element: h(Marker("PUBLIC EVENT PAGE")) }),
  blogReaderRoutes,
  h(Route, { key: "rest", path: "*", element: h(Navigate, { to: "/", replace: true }) }),
];

const service = () =>
  fakeBlogService({
    listPublishedBlogs: async () => page([makePost()]),
    getPublishedBlog: async () => makePost({ content_html: "<p>Article body</p>" }),
    listAdminBlogs: async () => page([{ ...makePost(), status: "draft" }]),
    getAdminBlog: async () => ({ ...makePost(), status: "draft", content_html: "<p>x</p>" }),
  });

afterEach(async () => {
  await cleanup();
  signOut();
});

test("signed-out visitors are sent to sign in from /blogs and /blogs/:slug", async () => {
  setBlogApi(service());
  for (const url of ["/blogs", "/blogs/m-a-market-update"]) {
    const view = await renderRoutes(appLikeRoutes(), { url });
    await waitFor(() => assert.equal(view.path(), "/signin"));
    await cleanup();
  }
});

test("an authenticated member can open /blogs and a published /blogs/:slug", async () => {
  signIn();
  setBlogApi(service());
  await renderRoutes(appLikeRoutes(), { url: "/blogs" });
  await waitFor(() => assert.ok(queryByText("M&A Market Update", { selector: "a" })));
  await cleanup();

  await renderRoutes(appLikeRoutes(), { url: "/blogs/m-a-market-update" });
  await waitFor(() => assert.ok(queryByText("Article body")));
});

const ADMIN_API_METHODS = [
  "listAdminBlogs", "getAdminBlog", "createBlog", "updateBlog", "uploadBlogFeaturedImage",
  "clearBlogFeaturedImage", "publishBlog", "unpublishBlog", "listBlogCategories",
  "createBlogCategory", "updateBlogCategory", "listBlogTags", "createBlogTag", "updateBlogTag",
  "searchBlogAuthors",
];

const BLOCKED_ROLES = [
  ["normal member", {}],
  ["staff-only user", { staff: true }],
  // Cognito platform_admin (synced to is_staff) but NOT a Django superuser.
  ["platform_admin-only user", { platformAdmin: true, staff: true }],
];

for (const [role, flags] of BLOCKED_ROLES) {
  test(`a ${role} is redirected away from every Blog admin route without any admin API call`, async () => {
    signIn(flags);
    const api = service();
    setBlogApi(api);
    for (const url of ["/admin/blogs", "/admin/blogs/new", "/admin/blogs/5/edit", "/admin/blogs/5/edit?preview=1", "/admin/blogs?tab=categories", "/admin/blogs?tab=tags"]) {
      const view = await renderRoutes(appLikeRoutes(), { url });
      // Same redirect target as the existing RequireSuperAdmin guard.
      await waitFor(() => assert.equal(view.path(), "/"));
      assert.ok(queryByText("HOME PAGE"));
      assert.equal(queryByText("My Blogs", { selector: "h1" }), null);
      await cleanup();
    }
    for (const method of ADMIN_API_METHODS) {
      assert.equal(api.callsTo(method).length, 0, `${method} must not be called`);
    }
  });
}

const ALLOWED_ROLES = [
  ["Django superuser", { superuser: true }],
  ["platform_admin who is also a Django superuser", { superuser: true, platformAdmin: true }],
  ["Django superuser without is_staff", { superuser: true, staff: false }],
];

for (const [role, flags] of ALLOWED_ROLES) {
  test(`a ${role} can open every Blog admin route`, async () => {
    signIn(flags);
    setBlogApi(service());
    const expectations = [
      ["/admin/blogs", "My Blogs"],
      ["/admin/blogs/new", "Create Blog"],
      ["/admin/blogs/5/edit", "Edit Blog"],
    ];
    for (const [url, heading] of expectations) {
      const view = await renderRoutes(appLikeRoutes(), { url });
      await waitFor(() => assert.ok(queryByText(heading, { selector: "h1" }), `${url} should show ${heading}`));
      assert.equal(view.location().pathname, url);
      await cleanup();
    }
  });
}

test("the global RequireSuperAdmin guard is unchanged for non-Blog admin routes", async () => {
  setBlogApi(service());
  const cases = [
    [{ platformAdmin: true, staff: true }, true], // platform_admin keeps platform-wide admin access
    [{ superuser: true }, true], // superuser + staff
    [{}, false],
    [{ staff: true }, false],
    [{ superuser: true, staff: false }, false], // unchanged: isOwnerUser needs staff too
  ];
  for (const [flags, allowed] of cases) {
    signIn(flags);
    const view = await renderRoutes(appLikeRoutes(), { url: "/admin/saleor" });
    if (allowed) {
      await waitFor(() => assert.ok(queryByText("SALEOR MANAGER PAGE"), JSON.stringify(flags)));
    } else {
      await waitFor(() => assert.equal(view.path(), "/", JSON.stringify(flags)));
    }
    await cleanup();
  }
});

test("Blog routes do not capture event, admin-event or unknown routes", async () => {
  signIn({ superuser: true });
  setBlogApi(service());
  const expectations = [
    ["/events", "EVENTS PAGE"],
    ["/events/blogs", "EVENT DETAIL PAGE"],
    ["/public/blogs", "PUBLIC EVENT PAGE"],
    ["/admin/events/blogs", "EVENT MANAGE PAGE"],
  ];
  for (const [url, text] of expectations) {
    await renderRoutes(appLikeRoutes(), { url });
    await waitFor(() => assert.ok(queryByText(text), `${url} should render ${text}`));
    await cleanup();
  }
  const unknown = await renderRoutes(appLikeRoutes(), { url: "/blogs/a/b" });
  await waitFor(() => assert.equal(unknown.path(), "/"));
});
