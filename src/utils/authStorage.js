// access_token is stored in localStorage; profile data uses sessionStorage.
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
  const access = data?.access_token || data?.id_token || data?.access || data?.token || "";
  if (access) localStorage.setItem("access_token", access);
  if (data?.refresh) localStorage.setItem("refresh_token", data.refresh);
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
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    localStorage.removeItem("loginPayload");

    // sessionStorage variants you use
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("refresh");
  } catch { }

  // ✅ notify app immediately (same tab) — important for KYC banner, counts, etc.
  try {
    window.dispatchEvent(new Event("auth:changed"));
  } catch { }
}
