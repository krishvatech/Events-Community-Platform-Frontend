// access_token is stored in localStorage; profile data uses sessionStorage.
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
  if (access) localStorage.setItem("access_token", access);
  if (data?.refresh) localStorage.setItem("refresh_token", data.refresh);
  localStorage.setItem("user_name", name || "");
  if (data?.user) sessionStorage.setItem("user", JSON.stringify(data.user));

  // Persist auth identifiers for flows like forgot-password after logout.
  const payloadUser = data?.user || {};
  const candidateUsername =
    payloadUser?.["cognito:username"] ||
    payloadUser?.username ||
    claims?.["cognito:username"] ||
    claims?.username ||
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
    // localStorage variants you use
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
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
