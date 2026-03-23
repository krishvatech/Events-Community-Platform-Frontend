// src/pages/SignInPage.jsx
// Renders the landing-page background with the login modal open.
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Box } from "@mui/material";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AuthModal from "../components/AuthModal.jsx";
import { saveLoginPayload } from "../utils/authStorage";
import { getCognitoGroupsFromTokens, getRoleAndRedirectPath } from "../utils/roleRedirect";

export const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api").replace(/\/+$/, "");

const decodeJwtPayload = (token) => {
  try {
    const b64 = (token.split(".")[1] || "").replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(b64));
  } catch { return null; }
};

const fetchJSON = async (url, headers = {}) => {
  try {
    const r = await fetch(url, { headers, credentials: "include" });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
};

const fetchWithManyAuthStyles = async (url, access) => {
  const headerSets = [
    { Authorization: `Bearer ${access}`, Accept: "application/json" },
  ];
  for (const h of headerSets) {
    const obj = await fetchJSON(url, h);
    if (obj) return obj;
  }
  return null;
};

const resolveBackendUser = async (accessToken) => {
  const url = `${API_BASE}/users/me/`;
  const u = await fetchWithManyAuthStyles(url, accessToken);
  if (u) return u;
  return null;
};

const updateTimezone = async (accessToken) => {
  if (!accessToken) return;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  try {
    await fetch(`${API_BASE}/users/me/`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ profile: { timezone: tz } }),
    });
  } catch (e) {
    console.warn("Timezone update failed:", e);
  }
};

const resolveCurrentUser = async (access, fallbackEmail) => {
  const meCandidates = [
    `${API_BASE}/users/me/`,
    `${API_BASE}/auth/users/me/`,
    `${API_BASE}/auth/me/`,
    `${API_BASE}/me/`,
  ];
  for (const url of meCandidates) {
    const u = await fetchWithManyAuthStyles(url, access);
    if (u) return u;
  }

  const payload = decodeJwtPayload(access);
  const uid = payload?.user_id || payload?.id;
  if (uid) {
    const byId = [
      `${API_BASE}/users/${uid}/`,
      `${API_BASE}/auth/users/${uid}/`,
    ];
    for (const url of byId) {
      const u = await fetchWithManyAuthStyles(url, access);
      if (u) return u;
    }
  }

  if (payload) return payload;

  const name = (fallbackEmail || "").split("@")[0] || "Member";
  return { first_name: name, email: fallbackEmail };
};

const roleToLabel = (role) => {
  if (role === "admin") return "SuperAdmin";
  if (role === "staff") return "Staff";
  return "Normal User";
};

export default function SignInPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(true);

  const handleClose = () => {
    setOpen(false);
    navigate("/", { replace: true });
  };

  const handleLoginSuccess = async (data) => {
    try {
      // Store tokens
      const accessTokenValue = data?.access_token || data?.access || "";
      if (accessTokenValue) {
        localStorage.setItem("access_token", accessTokenValue);
      }
      if (data?.refresh) {
        localStorage.setItem("refresh_token", data.refresh);
      }

      const accessTokenForBackend = accessTokenValue || "";

      // Update timezone
      await updateTimezone(accessTokenForBackend);

      // Check backend user and suspension status
      let backendUser = null;
      if (accessTokenForBackend) {
        backendUser = await resolveBackendUser(accessTokenForBackend);
      }

      // Verify backend access
      if (accessTokenForBackend && !backendUser) {
        const checkRes = await fetch(`${API_BASE}/users/me/`, {
          headers: { Authorization: `Bearer ${accessTokenForBackend}` }
        });
        if (checkRes.status === 403) {
          console.error("Backend blocked login (Suspended user).");
          toast.error("Your account has been suspended. Please contact support.");
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          localStorage.removeItem("id_token");
          localStorage.removeItem("user");
          return;
        }
      }

      // Resolve user object
      let userObj = backendUser || data?.user || null;
      if (!userObj && accessTokenForBackend) {
        userObj = await resolveCurrentUser(accessTokenForBackend, data?.email || "");
      }

      localStorage.setItem("user", JSON.stringify(userObj || {}));
      saveLoginPayload(data, { email: data?.email || "" });

      // Get role and redirect path
      const accessTokenForGroups = data?.access || localStorage.getItem("access_token") || "";
      const cognitoGroups = getCognitoGroupsFromTokens(accessTokenForGroups);
      const params = new URLSearchParams(location.search);
      const intended = params.get("next") || location.state?.from?.pathname || "/account/profile";

      const { role, path } = getRoleAndRedirectPath({
        cognitoGroups,
        backendUser,
        defaultPath: intended || "/account/profile",
      });

      console.log("[auth] role redirect", {
        role,
        path,
        cognitoGroups,
        backendFlags: {
          is_staff: backendUser?.is_staff,
          is_superuser: backendUser?.is_superuser,
        },
      });

      toast.success(`Signed in as ${roleToLabel(role)}`);

      // Redirect
      setTimeout(() => {
        if (path === "/admin/events") {
          window.location.replace(path);
        } else {
          navigate(path, { replace: true });
        }
      }, 900);

    } catch (err) {
      console.error("Login success handler error:", err);
      toast.error("Authentication completed but redirect failed. Please refresh.");
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #e0f2fe 0%, #f0fdf4 50%, #f8fafc 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <AuthModal
        open={open}
        onClose={handleClose}
        initialMode="login"
        onLoginSuccess={handleLoginSuccess}
      />
      <ToastContainer
        position="top-center"
        autoClose={2000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
    </Box>
  );
}
