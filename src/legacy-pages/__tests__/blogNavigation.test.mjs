import assert from "node:assert/strict";
import test from "node:test";

import {
  BLOGS_PATH,
  EXPLORE_BLOGS_ITEM,
  MY_BLOGS_ITEM,
  MY_BLOGS_PATH,
  NEW_BLOG_PATH,
  blogDetailPath,
  canManageBlogsFor,
  editBlogPath,
  getBlogSidebarItems,
  isBlogAdminPath,
  isBlogNavItemActive,
  isBlogReaderPath,
  previewBlogPath,
} from "../../config/blogNavigation.js";

test("every member gets Explore Blogs; only Blog managers get My Blogs", () => {
  const member = getBlogSidebarItems({ canManageBlogs: false });
  assert.deepEqual(member.explore.map((i) => i.label), ["Explore Blogs"]);
  assert.deepEqual(member.manage, []);

  const manager = getBlogSidebarItems({ canManageBlogs: true });
  assert.deepEqual(manager.explore.map((i) => i.label), ["Explore Blogs"]);
  assert.deepEqual(manager.manage.map((i) => [i.label, i.to]), [["My Blogs", "/admin/blogs"]]);

  assert.deepEqual(getBlogSidebarItems().manage, []);
});

test("Blog management follows Django is_superuser only, like the backend", () => {
  assert.equal(canManageBlogsFor({ is_superuser: true, is_staff: true }), true);
  assert.equal(canManageBlogsFor({ is_superuser: true, is_staff: false }), true);
  assert.equal(canManageBlogsFor({ is_superuser: "true" }), true);
  assert.equal(canManageBlogsFor({ is_superuser: false, is_staff: true }), false, "staff-only");
  assert.equal(canManageBlogsFor({ is_superuser: false, groups: ["platform_admin"] }), false, "platform_admin is not superuser");
  assert.equal(canManageBlogsFor({ is_superuser: "false" }), false);
  assert.equal(canManageBlogsFor({}), false);
  assert.equal(canManageBlogsFor(null), false);
});

test("paths", () => {
  assert.equal(BLOGS_PATH, "/blogs");
  assert.equal(MY_BLOGS_PATH, "/admin/blogs");
  assert.equal(NEW_BLOG_PATH, "/admin/blogs/new");
  assert.equal(blogDetailPath("m-a-update"), "/blogs/m-a-update");
  assert.equal(editBlogPath(12), "/admin/blogs/12/edit");
  assert.equal(previewBlogPath(12), "/admin/blogs/12/edit?preview=1");
});

test("draft preview never points at the public reader route", () => {
  assert.equal(isBlogReaderPath(previewBlogPath(12).split("?")[0]), false);
  assert.equal(isBlogAdminPath(previewBlogPath(12).split("?")[0]), true);
});

test("Explore Blogs is active on the list and on article pages only", () => {
  assert.equal(isBlogNavItemActive(EXPLORE_BLOGS_ITEM, "/blogs"), true);
  assert.equal(isBlogNavItemActive(EXPLORE_BLOGS_ITEM, "/blogs/"), true);
  assert.equal(isBlogNavItemActive(EXPLORE_BLOGS_ITEM, "/blogs/some-post"), true);
  assert.equal(isBlogNavItemActive(EXPLORE_BLOGS_ITEM, "/admin/blogs"), false);
  assert.equal(isBlogNavItemActive(EXPLORE_BLOGS_ITEM, "/blogsomething"), false);
  assert.equal(isBlogNavItemActive(EXPLORE_BLOGS_ITEM, "/events/blogs"), false);
});

test("My Blogs is active across the management routes", () => {
  for (const path of ["/admin/blogs", "/admin/blogs/new", "/admin/blogs/4/edit"]) {
    assert.equal(isBlogNavItemActive(MY_BLOGS_ITEM, path), true, path);
  }
  assert.equal(isBlogNavItemActive(MY_BLOGS_ITEM, "/blogs"), false);
  assert.equal(isBlogNavItemActive(MY_BLOGS_ITEM, "/admin/events"), false);
});

test("/blogs is a single-segment path, so App must exclude it from the event-page check", () => {
  // App.jsx treats any /<segment> path as a public single-event marketing page
  // (hiding the sidebar) unless it is explicitly excluded.
  const singleSegment = /^\/[a-zA-Z0-9\-]+\/?$/;
  assert.equal(singleSegment.test("/blogs"), true);
  assert.equal(isBlogReaderPath("/blogs"), true);
  assert.equal(isBlogReaderPath("/some-event-slug"), false);
});
