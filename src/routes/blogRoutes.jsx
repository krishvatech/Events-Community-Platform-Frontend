// src/routes/blogRoutes.jsx
//
// Blog routes, rendered inside App.jsx's <Routes>.
//   Reader routes: any signed-in member (RequireAuth).
//   Admin routes: nested under the existing /admin layout (already RequireAuth)
//   and wrapped in RequireBlogManager (Django is_superuser only, exactly like
//   the backend). The global RequireSuperAdmin also admits Cognito
//   platform_admin users, whom the Blog API rejects, so it is not used here.

import React from "react";
import { Route } from "react-router-dom";
import RequireAuth from "../components/RequireAuth.jsx";
import RequireBlogManager from "../components/blogs/RequireBlogManager.jsx";
import ExploreBlogsPage from "../pages/blogs/ExploreBlogsPage.jsx";
import BlogDetailPage from "../pages/blogs/BlogDetailPage.jsx";
import MyBlogsPage from "../pages/blogs/MyBlogsPage.jsx";
import BlogEditorPage from "../pages/blogs/BlogEditorPage.jsx";

/** Top-level reader routes: /blogs and /blogs/:slug */
export const blogReaderRoutes = (
  <>
    <Route path="/blogs" element={<RequireAuth><ExploreBlogsPage /></RequireAuth>} />
    <Route path="/blogs/:slug" element={<RequireAuth><BlogDetailPage /></RequireAuth>} />
  </>
);

/** Children of the /admin route: /admin/blogs, /admin/blogs/new, /admin/blogs/:id/edit */
export const blogAdminRoutes = (
  <>
    <Route path="blogs" element={<RequireBlogManager><MyBlogsPage /></RequireBlogManager>} />
    <Route path="blogs/new" element={<RequireBlogManager><BlogEditorPage key="new" /></RequireBlogManager>} />
    <Route path="blogs/:id/edit" element={<RequireBlogManager><BlogEditorPage key="edit" /></RequireBlogManager>} />
  </>
);
