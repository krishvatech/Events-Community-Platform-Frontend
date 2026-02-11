import axios from "axios";
import { cognitoRefreshSession } from "./cognitoAuth";
import { getUserName, clearAuth } from "./authStorage";

// Refresh queue controls
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

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

    // Handle 401 (Unauthorized Token) or 403 (Forbidden - might be expired token or actual ban)
    // We attempt refresh for both statuses. If 403 persists after refresh, it's a real ban.
    const status = error?.response?.status;
    if (!status || (status !== 401 && status !== 403)) {
      return Promise.reject(error);
    }

    // prevent infinite loop
    if (original._retry) {
      return Promise.reject(error);
    }

    // Try refresh
    try {
      if (!isRefreshing) {
        isRefreshing = true;
        original._retry = true;

        const refreshToken = getRefreshToken();
        let username = getUserName();

        console.log(`[Auth] ${status} detected. Attempting token refresh...`);

        // Fallback 1: Try getting username from localStorage 'user' object
        if (!username) {
          try {
            const u = JSON.parse(localStorage.getItem("user") || "{}");
            username = u.username || u.email || "";
          } catch { }
        }

        // Fallback 2: Decode the expired token to find a username/sub
        if (!username) {
          const t = getToken();
          if (t) {
            try {
              const parts = t.split('.');
              if (parts.length === 3) {
                const payload = JSON.parse(atob(parts[1]));
                username = payload.username || payload['cognito:username'] || payload.sub;
              }
            } catch { }
          }
        }

        if (!refreshToken || !username) {
          // If 403 (Forbidden) without refresh token, it's likely a permission error, not expired session.
          // Do not logout, just fail the request.
          if (status === 403) {
            console.warn("[Auth] 403 Forbidden and no refresh token available. Treating as permission denied.");
            return Promise.reject(error);
          }

          console.error("[Auth] Missing refresh token or username. Logging out.");
          throw new Error("No refresh token or username available");
        }

        console.log(`[Auth] Refreshing session for user: ${username}`);

        // Call our new helper
        const { idToken, refreshToken: newRefresh } = await cognitoRefreshSession({
          username,
          refreshToken,
        });

        // Save new tokens
        localStorage.setItem("access_token", idToken);
        if (newRefresh) {
          localStorage.setItem("refresh_token", newRefresh);
        }

        // Process queue
        processQueue(null, idToken);
        isRefreshing = false;

        // Retry original
        original.headers.Authorization = `Bearer ${idToken}`;
        const retryResponse = await apiClient(original);

        // Check retry response for persistent auth issues
        if (retryResponse.status === 401 || retryResponse.status === 403) {
          console.warn("[Auth] Request still failed with auth error after refresh. User access denied (banned/restricted).");
          clearAuth();
        }

        return retryResponse;

      } else {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            original.headers.Authorization = `Bearer ${token}`;
            return apiClient(original);
          })
          .catch((err) => Promise.reject(err));
      }

    } catch (refreshErr) {
      console.error("[Auth] Token refresh failed:", refreshErr);
      processQueue(refreshErr, null);
      isRefreshing = false;

      // Clear auth and redirect
      clearAuth();
      return Promise.reject(refreshErr);
    }
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


// ===================== Admin • KYC Verifications =====================
const ADMIN_KYC_BASE = "/auth/admin/kyc";

/**
 * List all KYC verifications.
 * Supports filtering: { kyc_status: 'pending' }
 */
export const getAdminKYCVerifications = (params = {}) =>
  apiClient.get(`${ADMIN_KYC_BASE}/`, { params }).then((r) => r.data);

/**
 * Override KYC status for a user.
 * Payload: { kyc_status: 'approved' | 'declined' | 'pending' | 'review', admin_note: "..." }
 */
export const overrideKYCStatus = (userId, kyc_status, admin_note = "") =>
  apiClient.post(`${ADMIN_KYC_BASE}/${userId}/override-status/`, { kyc_status, admin_note }).then((r) => r.data);

/**
 * Reset KYC process for a user.
 * Payload: { admin_note: "..." }
 */
export const resetKYCProcess = (userId, admin_note = "") =>
  apiClient.post(`${ADMIN_KYC_BASE}/${userId}/reset/`, { admin_note }).then((r) => r.data);

/**
 * Manually approve KYC for a user.
 * Payload: FormData with 'proof' (file) and 'reason' (text)
 */
export const manualApproveKYC = (userId, formData) =>
  apiClient.post(`${ADMIN_KYC_BASE}/${userId}/manual-approve/`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  }).then((r) => r.data);



export async function createWagtailSession() {
  const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");
  const token =
    localStorage.getItem("access_token") ||
    localStorage.getItem("access") ||
    "";

  const r = await fetch(`${API_BASE}/auth/wagtail/session/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include", // IMPORTANT: to receive session cookie
  });

  if (!r.ok) {
    const msg = await r.text().catch(() => "");
    throw new Error(msg || "Failed to create CMS session");
  }

  // backend root (remove /api)
  const backendRoot = API_BASE.replace(/\/api$/, "");
  return `${backendRoot}/cms/`;
}

export async function getSaleorDashboardUrl() {
  const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");
  const token = localStorage.getItem("access_token") || localStorage.getItem("access") || "";
  const r = await fetch(`${API_BASE}/auth/saleor/sso/`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
  });
  if (!r.ok) {
    const msg = await r.text().catch(() => "");
    throw new Error(msg || "Forbidden");
  }
  return r.json(); // { url }
}

// ===================== Event Participants =====================
// Note: Participants are managed via event endpoints, not standalone

/**
 * Fetch staff users for participant selection
 * Uses existing listAdminUsers, re-exported for convenience
 */
export const fetchStaffUsers = (params = {}) =>
  listAdminUsers({ ...params, is_staff: true });
