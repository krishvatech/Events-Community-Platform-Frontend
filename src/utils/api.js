import axios from "axios";

export const API_BASE =
  (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").trim().replace(/\/+$/, "");

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
    } catch { }
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
    } catch { }
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
export const getRefreshToken = () =>
  localStorage.getItem("refresh_token");

const normalizeToken = (token) => {
  if (!token) return null;
  const t = String(token).trim();
  if (!t || t === "null" || t === "undefined") return null;
  return t;
};

export const getToken = () =>
  normalizeToken(localStorage.getItem("access_token"));

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

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error?.config;

    // if no response or not 401, reject
    if (!error?.response || error.response.status !== 401) {
      return Promise.reject(error);
    }

    // Cognito-only: no refresh flow here. Clear auth and reject.
    try {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      window.dispatchEvent(new Event("auth:changed"));
    } catch { }
    return Promise.reject(error);
  }
);

// ===================== Admin • Staff Management =====================
const ADMIN_USERS_BASE = "/auth/admin/users";

export const listAdminUsers = (params = {}) =>
  apiClient.get(`${ADMIN_USERS_BASE}/`, { params }).then((r) => r.data);

export const patchStaff = (id, is_staff) =>
  apiClient.patch(`${ADMIN_USERS_BASE}/${id}/`, { is_staff }).then((r) => r.data);

export const bulkSetStaff = (ids, is_staff) =>
  apiClient.post(`${ADMIN_USERS_BASE}/bulk-set-staff/`, { ids, is_staff }).then((r) => r.data);



// ======================= KYC - DIDIT =============================

/**
 * Start Initial KYC Session
 * Calls POST /users/me/start-kyc/
 */
export async function startKYC() {
  const res = await fetch(`${API_BASE}/users/me/start-kyc/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authConfig().headers
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to start verification");
  }

  return res.json(); // Returns { session_id, url }
}

/**
 * Submit Name Change Request
 * Calls POST /users/me/name-change-request/
 */
export async function submitNameChangeRequest(data) {
  const res = await fetch(`${API_BASE}/users/me/name-change-request/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authConfig().headers
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to submit request");
  }

  return res.json(); // Returns request object + { kyc_url }
}


// ===================== Admin • Name Requests =====================
const ADMIN_NAME_REQUESTS_BASE = "/auth/admin/name-requests";

/**
 * List all name change requests.
 * Supports filtering: { status: 'pending' }
 */
export const getAdminNameRequests = (params = {}) =>
  apiClient.get(`${ADMIN_NAME_REQUESTS_BASE}/`, { params }).then((r) => r.data);

/**
 * Approve or Reject a request.
 * Payload: { status: 'approved' | 'rejected', admin_note: "..." }
 */
export const decideNameRequest = (id, status, admin_note = "") =>
  apiClient.post(`${ADMIN_NAME_REQUESTS_BASE}/${id}/decide/`, { status, admin_note }).then((r) => r.data);
