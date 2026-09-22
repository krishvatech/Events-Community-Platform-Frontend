import {
  clearCognitoAuthTokens,
  setAccessToken,
  setRefreshToken,
} from "./tokenStore";
import { isSecureAuthSessionEnabled } from "./secureAuthSession";

// Profile/identity metadata may persist; secure-session mode keeps credentials in memory only.
function decodeJwtPayload(token) {
  try {
    const part = String(token || "").split(".")[1] || "";
    if (!part) return {};
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return {};
  }
}

export function saveLoginPayload(data, { email, firstName } = {}) {
  // Try to find a name in the login response
  let name =
    data?.user?.first_name ||
    data?.user?.name ||
    data?.first_name ||
    data?.profile?.first_name ||
    "";
  // Fallbacks if backend didn't send a name:
  if (!name) name = firstName || "";               // from your login form (if you have it)
  if (!name && email) name = email.split("@")[0];  // use email prefix as last resort
  // Save what you need
  const access = data?.access_token || data?.id_token || data?.access || data?.token || "";
  const idToken = data?.id_token || "";
  const accessToken = data?.access || "";
  const claims = decodeJwtPayload(idToken || accessToken || access || "");
  if (access) setAccessToken(access);
  // In secure-session mode the refresh token must be handed to Django by the
  // login flow and must never be retained in browser storage/memory afterwards.
  if (data?.refresh && !isSecureAuthSessionEnabled()) setRefreshToken(data.refresh);
  localStorage.setItem("user_name", name || "");
  if (data?.user) sessionStorage.setItem("user", JSON.stringify(data.user));

  // Persist auth identifiers for flows like forgot-password after logout.
  const payloadUser = data?.user || {};
  // Order matters: this value is used as the Cognito username for SDK calls
  // (e.g. change password), so prefer identifiers that come from the signed
  // Cognito token. `payloadUser.username` is the Django username on the
  // Google/OAuth path — a real value, but not a Cognito one — so it is only a
  // last resort.
  const candidateUsername =
    payloadUser?.["cognito:username"] ||
    claims?.["cognito:username"] ||
    claims?.username ||
    payloadUser?.username ||
    "";
  const candidateEmail =
    (email || payloadUser?.email || claims?.email || "").toString().trim().toLowerCase();

  if (candidateUsername) localStorage.setItem("last_cognito_username", String(candidateUsername).trim());
  if (candidateEmail) localStorage.setItem("last_login_email", candidateEmail);
}
export function getUserName() {
  return localStorage.getItem("user_name") || sessionStorage.getItem("user_name") || "";
}
export function clearLogin() {
  sessionStorage.clear();
}

export function clearAuth() {
  try {
    // Clear all member Cognito credentials (persistent legacy copies + memory).
    clearCognitoAuthTokens();
    localStorage.removeItem("user_name");
    localStorage.removeItem("user");
    localStorage.removeItem("loginPayload");
    localStorage.removeItem("unread_messages");
    localStorage.removeItem("unread_notifications");

    // Intentionally keep these for password recovery after logout:
    // - last_cognito_username
    // - last_login_email

    // sessionStorage variants you use
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("user_name");
    sessionStorage.removeItem("refresh");
  } catch { }

  // ✅ notify app immediately (same tab) — important for KYC banner, counts, etc.
  try {
    window.dispatchEvent(new Event("auth:changed"));
    window.dispatchEvent(new CustomEvent("messages:unread", { detail: { count: 0 } }));
    window.dispatchEvent(new CustomEvent("notify:unread", { detail: { count: 0 } }));
  } catch { }
}
