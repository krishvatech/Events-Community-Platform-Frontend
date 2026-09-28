// src/config/blogNavigation.js
//
// Single source of truth for Blog paths and sidebar entries. Kept free of
// React/MUI so it can be unit tested with node:test.
//
// Visibility here is UX only. The backend enforces every Blog permission and
// the admin routes are wrapped in the existing RequireSuperAdmin guard.

export const BLOGS_PATH = "/blogs";
export const MY_BLOGS_PATH = "/admin/blogs";
export const NEW_BLOG_PATH = `${MY_BLOGS_PATH}/new`;

export const blogDetailPath = (slug) => `${BLOGS_PATH}/${encodeURIComponent(slug)}`;
export const editBlogPath = (id) => `${MY_BLOGS_PATH}/${encodeURIComponent(id)}/edit`;
export const previewBlogPath = (id) => `${editBlogPath(id)}?preview=1`;

export const EXPLORE_BLOGS_ITEM = Object.freeze({
  id: "explore-blogs",
  label: "Explore Blogs",
  to: BLOGS_PATH,
});

export const MY_BLOGS_ITEM = Object.freeze({
  id: "my-blogs",
  label: "My Blogs",
  to: MY_BLOGS_PATH,
});

const normalize = (pathname = "") => pathname.replace(/\/+$/, "") || "/";

/** True for the reader routes: /blogs and /blogs/<slug>. */
export const isBlogReaderPath = (pathname) => {
  const path = normalize(pathname);
  return path === BLOGS_PATH || path.startsWith(`${BLOGS_PATH}/`);
};

/** True for the management routes under /admin/blogs. */
export const isBlogAdminPath = (pathname) => {
  const path = normalize(pathname);
  return path === MY_BLOGS_PATH || path.startsWith(`${MY_BLOGS_PATH}/`);
};

const truthyFlag = (flag) =>
  flag === true || flag === 1 || (typeof flag === "string" && ["true", "1"].includes(flag.trim().toLowerCase()));

/**
 * Blog management mirrors the backend rule exactly: Django `is_superuser`
 * (from the stored /users/me/ payload). Cognito platform_admin membership and
 * is_staff grant nothing here, unlike the platform-wide admin helpers.
 */
export const canManageBlogsFor = (backendUser) => truthyFlag(backendUser?.is_superuser);

/**
 * Sidebar Blog entries. "My Blogs" is shown only to users who can manage
 * Blogs; everyone else gets exactly what a normal member gets.
 */
export const getBlogSidebarItems = ({ canManageBlogs = false } = {}) => ({
  explore: [EXPLORE_BLOGS_ITEM],
  manage: canManageBlogs ? [MY_BLOGS_ITEM] : [],
});

export const isBlogNavItemActive = (item, pathname) => {
  if (item?.id === EXPLORE_BLOGS_ITEM.id) return isBlogReaderPath(pathname);
  if (item?.id === MY_BLOGS_ITEM.id) return isBlogAdminPath(pathname);
  return false;
};
