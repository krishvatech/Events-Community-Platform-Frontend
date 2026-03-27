// src/components/RoleBasedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { isOwnerUser, isAdminUser } from "../utils/adminRole";

/**
 * HOC to protect routes that only Super Admin (Platform Admin) can access.
 * Redirects to "/" if user is not a Super Admin.
 */
export const RequireSuperAdmin = ({ children }) => {
  if (!isOwnerUser()) {
    return <Navigate to="/" replace />;
  }
  return children;
};

/**
 * HOC to protect routes that only Staff and Super Admin can access.
 * Redirects to "/" if user is a Normal user.
 */
export const RequireStaffOrAdmin = ({ children }) => {
  if (!isAdminUser()) {
    return <Navigate to="/" replace />;
  }
  return children;
};
