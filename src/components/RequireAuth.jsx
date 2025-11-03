// src/components/RequireAuth.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";

const RequireAuth = ({ children }) => {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("access_token") ||
    sessionStorage.getItem("access") ||
    sessionStorage.getItem("token");
  const location = useLocation();
  if (!token) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }
  return children;
};

export default RequireAuth;