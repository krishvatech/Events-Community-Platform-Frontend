import axios from "axios";

export const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

/**
 * Register new user
 */
export async function registerUser({ username, firstName, lastName, email, password }) {
  const res = await fetch(`${API_BASE}/auth/register/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username,
      first_name: firstName?.trim(),
      last_name: lastName?.trim(),
      email: email?.trim().toLowerCase(),
      password,
      password2: password,
    }),
  });

  if (!res.ok) {
    let data = null;
    try {
      data = await res.clone().json();
    } catch {}
    const text = data ? null : (await res.text().catch(() => null));

    const err = new Error(text || data?.detail || `HTTP ${res.status}`);
    err.response = { status: res.status, data: data ?? (text ? { detail: text } : {}) };
    throw err;
  }

  return res.json();
}

/**
 * Get LinkedIn OAuth URL
 */
export async function getLinkedInAuthUrl() {
  const res = await fetch(`${API_BASE}/auth/linkedin/url/`, { credentials: "include" });
  if (!res.ok) {
    let data = null;
    try {
      data = await res.clone().json();
    } catch {}
    const text = data ? null : (await res.text().catch(() => null));

    const err = new Error(text || data?.detail || `HTTP ${res.status}`);
    err.response = { status: res.status, data: data ?? (text ? { detail: text } : {}) };
    throw err;
  }
  return res.json();
}

/**
 * Token + CSRF helpers
 */
export const getToken = () =>
  localStorage.getItem("access_token") ||
  localStorage.getItem("token") ||
  sessionStorage.getItem("access") ||
  sessionStorage.getItem("token");

export const getCSRF = () =>
  document.cookie.split("; ").find((s) => s.startsWith("csrftoken="))?.split("=")[1];

export const authConfig = (extra = {}) => {
  const t = getToken();
  const headers = t
    ? { Authorization: `Bearer ${t}` }
    : { "X-CSRFToken": getCSRF() || "" };

  return {
    withCredentials: !t,
    headers: { ...headers, ...(extra.headers || {}) },
    ...extra,
  };
};

/**
 * Axios client with token interceptor
 */
export const apiClient = axios.create({
  baseURL: API_BASE,
});

apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});