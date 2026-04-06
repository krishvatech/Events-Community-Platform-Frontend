// src/components/GuestOnly.jsx
import { Navigate, useLocation } from "react-router-dom";
import { getRoleAndRedirectPath, getCognitoGroupsFromTokens } from "../utils/roleRedirect";

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
    let next = params.get("next");

    if (!next) {
      // Get role and determine correct redirect based on user type
      const token = localStorage.getItem("access_token");
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const cognitoGroups = getCognitoGroupsFromTokens(token);

      const { path } = getRoleAndRedirectPath({
        cognitoGroups,
        backendUser: user,
        defaultPath: "/account/profile",
      });

      next = path;
    }

    return <Navigate to={next} replace />;
  }
  return children;
};

export default GuestOnly;
