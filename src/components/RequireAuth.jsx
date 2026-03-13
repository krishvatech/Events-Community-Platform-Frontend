// src/components/RequireAuth.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";

const decodeJwtPayload = (token) => {
  try {
    const b64 = (token?.split(".")[1] || "").replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(b64));
  } catch {
    return null;
  }
};

const RequireAuth = ({ children }) => {
  const token = localStorage.getItem("access_token");
  const claims = decodeJwtPayload(token);
  const isGuest = localStorage.getItem("is_guest") === "true" || claims?.token_type === "guest";
  const location = useLocation();

  const isLiveRoute = location.pathname.startsWith("/live/");

  if (!token) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  // Guest sessions are allowed only on live routes.
  // Everywhere else should behave like logged-out.
  if (isGuest && !isLiveRoute) {
    return <Navigate to="/signin" replace />;
  }

  return children;
};

export default RequireAuth;
