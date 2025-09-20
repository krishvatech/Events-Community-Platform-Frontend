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
      password2:  password,
    }),
  });

  if (!res.ok) {
    const raw = await res.text();
    throw new Error(raw || "Failed to register");
  }
  return res.json();
}

export async function getLinkedInAuthUrl() {
  const res = await fetch(`${API_BASE}/auth/linkedin/url/`, { credentials: "include" });
  if (!res.ok) {
    const raw = await res.text();
    throw new Error(raw || "Failed to fetch LinkedIn auth URL");
  }
  return res.json();
}
