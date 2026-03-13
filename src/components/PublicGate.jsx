// src/components/GuestOnly.jsx
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

function isAuthed() {
  const token = localStorage.getItem("access_token");
  if (!token) return false;
  if (localStorage.getItem("is_guest") === "true") return false;
  const claims = decodeJwtPayload(token);
  if (claims?.token_type === "guest") return false;
  return true;
}

const GuestOnly = ({ children }) => {
  const loc = useLocation();
  if (isAuthed()) {
    const params = new URLSearchParams(loc.search);
    const next = params.get("next") || "/account/profile";
    return <Navigate to={next} replace />;
  }
  return children;
};

export default GuestOnly;
