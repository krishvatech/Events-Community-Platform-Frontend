import { clearAuth } from "./authStorage";
import {
  isSecureAuthSessionEnabled,
  logoutSecureAuthSession,
} from "./secureAuthSession";
import { getAccessToken, getRefreshToken } from "./tokenStore";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api")
  .trim()
  .replace(/\/+$/, "");

const isJwtLike = (value) =>
  typeof value === "string" && value.split(".").length === 3;

/**
 * Central browser logout used by member-facing navigation.
 *
 * Secure mode revokes the server-side Cognito refresh session and clears the
 * HttpOnly cookie. Legacy mode preserves the previous SimpleJWT logout call.
 * Wagtail/Django session logout remains best-effort in both modes.
 */
export async function logoutBrowserSession() {
  const access = getAccessToken();
  const refresh = getRefreshToken();

  try {
    if (isSecureAuthSessionEnabled()) {
      await logoutSecureAuthSession();
    } else if (
      import.meta.env.VITE_AUTH_PROVIDER !== "cognito" &&
      access &&
      refresh &&
      isJwtLike(refresh)
    ) {
      await fetch(`${API_BASE}/auth/logout/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${access}`,
        },
        body: JSON.stringify({ refresh }),
        credentials: "include",
      });
    }
  } catch {
    // Logout must always continue with local cleanup.
  }

  try {
    if (access) {
      await fetch(`${API_BASE}/auth/wagtail/logout/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${access}` },
        credentials: "include",
      });
    }
  } catch {
    // Wagtail logout is best-effort.
  }

  clearAuth();

  try {
    // Cross-tab signal contains no credential data.
    localStorage.setItem("ecp_auth_logout_at", String(Date.now()));
  } catch {
    // no-op
  }
}
