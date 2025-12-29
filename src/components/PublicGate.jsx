// src/components/GuestOnly.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";

function isAuthed() {
  // Cognito access token only
  return (
    !!localStorage.getItem("access_token")
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
