/**
 * Browser client for the first-party secure-auth Worker endpoints.
 *
 * IMPORTANT: this integration is disabled unless
 * VITE_SECURE_AUTH_SESSION_ENABLED=true at build time. With the default/absent
 * flag the existing Cognito refresh flow remains unchanged.
 */

export const SECURE_AUTH_HEADER = "X-ECP-Secure-Auth";
export const SECURE_AUTH_HEADER_VALUE = "1";

export const SECURE_AUTH_ROUTES = Object.freeze({
  establish: "/_auth/session/establish",
  refresh: "/_auth/session/refresh",
  logout: "/_auth/session/logout",
});

const envFlag = (name, fallback = "") => {
  try {
    return import.meta.env?.[name] ?? fallback;
  } catch {
    return fallback;
  }
};

export const isSecureAuthSessionEnabled = () =>
  String(envFlag("VITE_SECURE_AUTH_SESSION_ENABLED", "false"))
    .trim()
    .toLowerCase() === "true";

const normalizeToken = (value) => {
  if (value === null || value === undefined) return null;
  const token = String(value).trim();
  if (!token || token === "null" || token === "undefined") return null;
  return token;
};

const responseCode = (payload, status) => {
  const code = payload?.code || payload?.detail || payload?.error;
  if (typeof code === "string" && code.trim()) return code.trim();
  return `secure_auth_http_${status}`;
};

export class SecureAuthSessionError extends Error {
  constructor(message, { status = 0, code = "secure_auth_failed" } = {}) {
    super(message);
    this.name = "SecureAuthSessionError";
    this.status = status;
    this.code = code;
  }
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

export function createSecureAuthClient({
  enabled = true,
  fetchImpl = (...args) => globalThis.fetch(...args),
  routes = SECURE_AUTH_ROUTES,
} = {}) {
  let refreshPromise = null;

  const requireEnabled = () => {
    if (!enabled) {
      throw new SecureAuthSessionError("Secure auth session is disabled.", {
        code: "secure_auth_disabled",
      });
    }
  };

  const post = async (path, { accessToken = null, body = null } = {}) => {
    requireEnabled();

    const headers = {
      Accept: "application/json",
      [SECURE_AUTH_HEADER]: SECURE_AUTH_HEADER_VALUE,
    };

    const bearer = normalizeToken(accessToken);
    if (bearer) headers.Authorization = `Bearer ${bearer}`;

    let requestBody;
    if (body !== null && body !== undefined) {
      headers["Content-Type"] = "application/json";
      requestBody = JSON.stringify(body);
    }

    let response;
    try {
      response = await fetchImpl(path, {
        method: "POST",
        headers,
        body: requestBody,
        credentials: "include",
        cache: "no-store",
        redirect: "error",
      });
    } catch {
      throw new SecureAuthSessionError("Secure auth service is unavailable.", {
        code: "secure_auth_unavailable",
      });
    }

    const payload = await readJson(response);
    if (!response.ok) {
      throw new SecureAuthSessionError("Secure auth request failed.", {
        status: response.status,
        code: responseCode(payload, response.status),
      });
    }

    return payload;
  };

  const requireAccessToken = (payload) => {
    const accessToken = normalizeToken(payload?.access_token);
    if (!accessToken) {
      throw new SecureAuthSessionError(
        "Secure auth response did not include an access token.",
        { code: "secure_auth_missing_access_token" },
      );
    }
    return accessToken;
  };

  return {
    async establish({ accessToken, refreshToken }) {
      const bearer = normalizeToken(accessToken);
      const refresh = normalizeToken(refreshToken);
      if (!bearer || !refresh) {
        throw new SecureAuthSessionError(
          "Both access and refresh tokens are required to establish a secure session.",
          { code: "secure_auth_missing_credentials" },
        );
      }

      const payload = await post(routes.establish, {
        accessToken: bearer,
        body: { refresh_token: refresh },
      });
      return { ...payload, accessToken: requireAccessToken(payload) };
    },

    async refresh() {
      requireEnabled();
      if (!refreshPromise) {
        refreshPromise = post(routes.refresh)
          .then((payload) => ({
            ...payload,
            accessToken: requireAccessToken(payload),
          }))
          .finally(() => {
            refreshPromise = null;
          });
      }
      return refreshPromise;
    },

    async logout() {
      return post(routes.logout);
    },
  };
}

const defaultClient = createSecureAuthClient({
  enabled: isSecureAuthSessionEnabled(),
});

export const establishSecureAuthSession = (credentials) =>
  defaultClient.establish(credentials);

export const refreshSecureAuthSession = () => defaultClient.refresh();

export const logoutSecureAuthSession = () => defaultClient.logout();
