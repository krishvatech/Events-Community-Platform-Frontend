import React from "react";
import { Navigate } from "react-router-dom";
import { canManageBlogs } from "../../utils/blogAccess";

/**
 * Route guard for Blog management. Same redirect as RequireSuperAdmin, but
 * decided by Django is_superuser only, so a platform_admin who is not a Django
 * superuser never renders a Blog admin page (and never calls its APIs).
 */
export default function RequireBlogManager({ children }) {
  if (!canManageBlogs()) {
    return <Navigate to="/" replace />;
  }
  return children;
}
