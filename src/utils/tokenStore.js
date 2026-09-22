/**
 * Central browser token storage facade.
 *
 * Legacy mode preserves the original localStorage behaviour.
 * Secure-session mode keeps member Cognito credentials in memory only and
 * actively removes old persisted copies so XSS cannot exfiltrate a long-lived
 * refresh token from browser storage.
 */

import { isSecureAuthSessionEnabled } from "./secureAuthSession";

export const TOKEN_STORAGE_KEYS = Object.freeze({
  access: "access_token",
  refresh: "refresh_token",
  id: "id_token",
  cognitoAccess: "cognito_access_token",
});

const memoryTokens = new Map();

const normalizeToken = (value) => {
  if (value === null || value === undefined) return null;
  const token = String(value).trim();
  if (!token || token === "null" || token === "undefined") return null;
  return token;
};

const storage = () => {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
};

const removePersistedToken = (key) => {
  try {
    storage()?.removeItem(key);
  } catch {
    // best effort
  }
};

const readToken = (key) => {
  if (isSecureAuthSessionEnabled()) {
    return normalizeToken(memoryTokens.get(key));
  }

  try {
    return normalizeToken(storage()?.getItem(key));
  } catch {
    return null;
  }
};

const writeToken = (key, value) => {
  const token = normalizeToken(value);

  if (isSecureAuthSessionEnabled()) {
    // Secure mode never persists member Cognito credentials.
    removePersistedToken(key);
    if (token) memoryTokens.set(key, token);
    else memoryTokens.delete(key);
    return token;
  }

  try {
    if (token) storage()?.setItem(key, token);
    else storage()?.removeItem(key);
  } catch {
    // Preserve existing best-effort browser-storage behaviour.
  }
  return token;
};

const removeToken = (key) => {
  memoryTokens.delete(key);
  removePersistedToken(key);
};

export const purgePersistedMemberTokens = () => {
  Object.values(TOKEN_STORAGE_KEYS).forEach(removePersistedToken);
};

export const getAccessToken = () => readToken(TOKEN_STORAGE_KEYS.access);
export const setAccessToken = (token) => writeToken(TOKEN_STORAGE_KEYS.access, token);
export const removeAccessToken = () => removeToken(TOKEN_STORAGE_KEYS.access);

export const getRefreshToken = () => readToken(TOKEN_STORAGE_KEYS.refresh);
export const setRefreshToken = (token) => writeToken(TOKEN_STORAGE_KEYS.refresh, token);
export const removeRefreshToken = () => removeToken(TOKEN_STORAGE_KEYS.refresh);

export const getIdToken = () => readToken(TOKEN_STORAGE_KEYS.id);
export const setIdToken = (token) => writeToken(TOKEN_STORAGE_KEYS.id, token);
export const removeIdToken = () => removeToken(TOKEN_STORAGE_KEYS.id);

export const getCognitoAccessToken = () => readToken(TOKEN_STORAGE_KEYS.cognitoAccess);
export const setCognitoAccessToken = (token) => writeToken(TOKEN_STORAGE_KEYS.cognitoAccess, token);
export const removeCognitoAccessToken = () => removeToken(TOKEN_STORAGE_KEYS.cognitoAccess);

export const clearPrimaryAuthTokens = () => {
  removeAccessToken();
  removeRefreshToken();
};

export const clearCognitoAuthTokens = () => {
  removeAccessToken();
  removeRefreshToken();
  removeIdToken();
  removeCognitoAccessToken();
};

// A secure-session logout in another tab must also clear this tab's in-memory
// access token. The storage event carries only a timestamp, never credentials.
if (typeof window !== "undefined" && window.addEventListener) {
  window.addEventListener("storage", (event) => {
    if (event.key !== "ecp_auth_logout_at") return;
    clearCognitoAuthTokens();
    try {
      window.dispatchEvent(new Event("auth:changed"));
    } catch {
      // no-op
    }
  });
}
