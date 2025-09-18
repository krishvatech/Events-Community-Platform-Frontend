// api.js
// Single-origin in dev: http://127.0.0.1:8000 when you serve React from Django build
// In your current setup (separate dev servers) keep this:
export const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

export async function registerUser({ username, firstName, lastName, email, password }) {
  const res = await fetch(`${API_BASE}/auth/register/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username,
      first_name: firstName?.trim(),
      last_name:  lastName?.trim(),
      email:      email?.trim().toLowerCase(),
      password,
      password2:  password, // serializer requires this
    }),
  });

  const raw = await res.text();
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch { data = { detail: raw }; }

  if (!res.ok) {
    const msg =
      data?.detail ||
      data?.non_field_errors?.[0] ||
      data?.password?.[0] ||
      data?.username?.[0] ||
      data?.email?.[0] ||
      (typeof data.detail === "string" ? data.detail.slice(0, 200) : null) ||
      "Registration failed";
    throw new Error(msg);
  }
  return data;
}

// NEW: fetch LinkedIn authorization URL
export async function getLinkedInAuthUrl() {
  const res = await fetch(`${API_BASE}/auth/linkedin/url/`, {
    credentials: "include", // if backend sets cookies
  });

  if (!res.ok) {
    const raw = await res.text();
    throw new Error(raw || "Failed to fetch LinkedIn auth URL");
  }
  return res.json(); // { auth_url: "https://www.linkedin.com/oauth/v2/authorization?..." }
}
