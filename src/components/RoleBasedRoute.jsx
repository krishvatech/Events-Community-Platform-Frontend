// src/components/RoleBasedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { isOwnerUser, isAdminUser } from "../utils/adminRole";
import useMarketingAccess from "../hooks/useMarketingAccess";

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

/**
 * HOC to protect the Marketing Hub.
 *
 * Access is decided by the backend, not by local role flags: it needs an active
 * ECP superuser WITH an active Mautic mapping. Typing the URL directly gets the
 * same answer as the hidden sidebar entry. The backend independently rejects
 * the underlying APIs, so this is UX, not the security boundary.
 *
 * While the status is loading nothing is rendered and no redirect happens, so a
 * slow check cannot bounce a legitimate user or cause a redirect loop.
 */
export const RequireMarketingAccess = ({ children }) => {
  const { loading, hasMarketingAccess } = useMarketingAccess();

  if (loading) return null;
  if (!hasMarketingAccess) {
    return <Navigate to="/" replace />;
  }
  return children;
};

/**
 * HOC to protect routes that only Super Admin (Platform Admin) can access.
 * Redirects to "/account/resources" if user is not a Super Admin.
 */
export const RequireStaffOrAdminForResources = ({ children }) => {
  if (!isOwnerUser()) {
    return <Navigate to="/account/resources" replace />;
  }
  return children;
};
