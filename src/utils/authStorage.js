// If you want persistence across browser restarts, change sessionStorage -> localStorage.
export function saveLoginPayload(data, { email, firstName } = {}) {
  // Try to find a name in the login response
  let name =
    data?.user?.first_name ||
    data?.user?.name ||
    data?.first_name ||
    data?.profile?.first_name ||
    "";
  // Fallbacks if backend didn’t send a name:
  if (!name) name = firstName || "";               // from your login form (if you have it)
  if (!name && email) name = email.split("@")[0];  // use email prefix as last resort
  // Save what you need
  sessionStorage.setItem("access", data?.access || data?.token || "");
  if (data?.id_token) {
    sessionStorage.setItem("id_token", data.id_token);
  }
  if (data?.refresh) sessionStorage.setItem("refresh", data.refresh);
  sessionStorage.setItem("user_name", name || "");
  if (data?.user) sessionStorage.setItem("user", JSON.stringify(data.user));
}
export function getUserName() {
  return sessionStorage.getItem("user_name") || "";
}
export function clearLogin() {
  sessionStorage.clear();
}

export function clearAuth() {
  try {
    // localStorage variants you use
    localStorage.removeItem("id_token");
    localStorage.removeItem("token");
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("cognito_access_token");
    localStorage.removeItem("user");
    localStorage.removeItem("loginPayload");

    // sessionStorage variants you use
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("access");
    sessionStorage.removeItem("id_token");
    sessionStorage.removeItem("refresh");
    sessionStorage.removeItem("user");
  } catch { }

  // ✅ notify app immediately (same tab) — important for KYC banner, counts, etc.
  try {
    window.dispatchEvent(new Event("auth:changed"));
  } catch { }
}
