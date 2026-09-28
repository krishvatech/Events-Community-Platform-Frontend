import assert from "node:assert/strict";
import { afterEach, before, test } from "node:test";

import {
  React,
  all,
  cleanup,
  loadSource,
  renderRoutes,
  router,
  signIn,
  signOut,
  waitFor,
} from "./helpers/blogDomHarness.mjs";

// The sidebar polls badge counts; keep it offline.
before(() => {
  globalThis.fetch = async () => {
    throw new Error("network disabled in tests");
  };
});

const { default: UnifiedSidebar } = await loadSource("src/components/UnifiedSidebar.jsx");
const { Route } = router;
const h = React.createElement;

const renderSidebar = (url) =>
  renderRoutes([h(Route, { key: "all", path: "*", element: h(UnifiedSidebar, { mobileOpen: false, onMobileClose() {} }) })], { url });

const navItem = (label) =>
  all(".MuiListItemButton-root").find((el) => el.textContent.trim() === label) || null;

afterEach(async () => {
  await cleanup();
  signOut();
});

test("a normal member sees Explore Blogs but not My Blogs", async () => {
  signIn();
  await renderSidebar("/community");
  await waitFor(() => assert.ok(navItem("Explore Blogs")));
  assert.equal(navItem("My Blogs"), null);
  // Existing navigation is intact.
  for (const label of ["Live Feed", "Explore Groups", "Explore Members", "Upcoming Events"]) {
    assert.ok(navItem(label), `${label} missing`);
  }
});

test("a staff-only user does not see My Blogs", async () => {
  signIn({ staff: true });
  await renderSidebar("/community");
  await waitFor(() => assert.ok(navItem("Explore Blogs")));
  assert.equal(navItem("My Blogs"), null);
  assert.ok(navItem("Moderation"), "staff navigation still renders");
});

test("a superuser sees Explore Blogs and My Blogs (after My Series)", async () => {
  signIn({ superuser: true });
  await renderSidebar("/community");
  await waitFor(() => assert.ok(navItem("My Blogs")));
  assert.ok(navItem("Explore Blogs"));
  const labels = all(".MuiListItemButton-root").map((el) => el.textContent.trim());
  assert.equal(labels.indexOf("My Blogs"), labels.indexOf("My Series") + 1);
  for (const label of ["My Posts", "My Events", "My Groups"]) {
    assert.ok(navItem(label), `${label} missing`);
  }
});

test("Explore Blogs is highlighted on /blogs and on article pages", async () => {
  signIn({ superuser: true });
  for (const url of ["/blogs", "/blogs/m-a-market-update"]) {
    await renderSidebar(url);
    await waitFor(() => assert.ok(navItem("Explore Blogs")?.classList.contains("Mui-selected"), url));
    assert.equal(navItem("My Blogs").classList.contains("Mui-selected"), false);
    await cleanup();
  }
});

test("My Blogs is highlighted on the management routes only", async () => {
  signIn({ superuser: true });
  for (const url of ["/admin/blogs", "/admin/blogs/new", "/admin/blogs/4/edit"]) {
    await renderSidebar(url);
    await waitFor(() => assert.ok(navItem("My Blogs")?.classList.contains("Mui-selected"), url));
    assert.equal(navItem("Explore Blogs").classList.contains("Mui-selected"), false);
    await cleanup();
  }
});

test("clicking Explore Blogs navigates to /blogs", async () => {
  signIn();
  const view = await renderSidebar("/community");
  const item = await waitFor(() => {
    const el = navItem("Explore Blogs");
    assert.ok(el);
    return el;
  });
  await waitFor(() => item.click());
  await waitFor(() => assert.equal(view.location().pathname, "/blogs"));
});

test("a platform_admin who is not a Django superuser keeps admin items but gets no My Blogs", async () => {
  signIn({ platformAdmin: true, staff: true });
  await renderSidebar("/community");
  await waitFor(() => assert.ok(navItem("Explore Blogs")));
  assert.equal(navItem("My Blogs"), null);
  // Platform-wide platform_admin navigation is unchanged.
  for (const label of ["My Posts", "My Events", "My Series", "Virtual Speakers", "Users", "Identity Verification"]) {
    assert.ok(navItem(label), `${label} missing`);
  }
});

test("a platform_admin who is also a Django superuser sees My Blogs", async () => {
  signIn({ platformAdmin: true, superuser: true });
  await renderSidebar("/community");
  await waitFor(() => assert.ok(navItem("My Blogs")));
  assert.ok(navItem("Explore Blogs"));
});

test("a Django superuser without is_staff still sees My Blogs, as the backend allows", async () => {
  signIn({ superuser: true, staff: false });
  await renderSidebar("/community");
  await waitFor(() => assert.ok(navItem("My Blogs")));
});

test("non-Blog sidebar items are identical to before for every role", async () => {
  const blogLabels = new Set(["Explore Blogs", "My Blogs"]);
  const roles = [
    ["normal", {}, ["Messages", "Notifications", "Newsletter", "My Events", "My Groups", "My Contacts", "My Posts", "My Orders", "Profile"]],
    ["staff", { staff: true }, ["Messages", "Notifications", "Newsletter", "My Events", "My Groups", "My Contacts", "My Posts", "Profile", "Moderation", "Admin Guide"]],
    ["platform_admin", { platformAdmin: true, staff: true }, ["My Posts", "My Events", "My Series", "Virtual Speakers", "My Groups", "Messages", "Notifications", "Newsletter", "My Contacts", "Profile", "Moderation", "Identity Verification", "Users", "Email Templates", "CMS", "Admin Guide"]],
  ];
  const discover = ["Dashboard", "Upcoming Events", "Live Feed", "Discussion Forum", "Explore Groups", "Explore Members"];
  for (const [name, flags, expected] of roles) {
    signIn(flags);
    await renderSidebar("/community");
    await waitFor(() => assert.ok(navItem("Explore Blogs")));
    const labels = all(".MuiListItemButton-root .MuiListItemText-primary").map((el) => el.textContent.trim()).filter((l) => !blogLabels.has(l));
    for (const label of [...discover, ...expected]) {
      assert.ok(labels.includes(label), `${name}: ${label} missing`);
    }
    await cleanup();
  }
});
