// src/components/GuestOnly.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";

function isAuthed() {
  // support both localStorage and sessionStorage (your app uses both)
  return (
    !!localStorage.getItem("token") ||
    !!localStorage.getItem("access_token") ||
    !!sessionStorage.getItem("access") ||
    !!sessionStorage.getItem("token")
  );
}

const GuestOnly = ({ children }) => {
  const loc = useLocation();
  if (isAuthed()) {
    const params = new URLSearchParams(loc.search);
    const next = params.get("next") || "/events";
    return <Navigate to={next} replace />;
  }
  return children;
};

export default GuestOnly;