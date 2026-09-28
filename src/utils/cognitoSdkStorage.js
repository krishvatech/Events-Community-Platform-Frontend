/**
 * Storage controls for amazon-cognito-identity-js.
 *
 * By default that SDK persists Cognito ID/access/refresh tokens in localStorage
 * under CognitoIdentityServiceProvider.* keys. Secure-session mode must not
 * leave those duplicate credentials script-readable after they have been handed
 * to the first-party HttpOnly session endpoint.
 */

export const COGNITO_SDK_STORAGE_PREFIX = "CognitoIdentityServiceProvider.";

const COGNITO_SDK_TOKEN_SUFFIX_RE = /\.(?:accessToken|idToken|refreshToken)$/i;

export const isPersistedCognitoSdkTokenKey = (key) => {
  const normalized = String(key || "");
  return (
    normalized.startsWith(COGNITO_SDK_STORAGE_PREFIX) &&
    COGNITO_SDK_TOKEN_SUFFIX_RE.test(normalized)
  );
};

/**
 * Minimal synchronous Storage-compatible implementation backed only by memory.
 * It intentionally mirrors the Web Storage string semantics used by the Cognito
 * SDK but never writes credentials to localStorage/sessionStorage/IndexedDB.
 */
export function createMemoryStorage() {
  const values = new Map();

  return {
    get length() {
      return values.size;
    },

    key(index) {
      const keys = Array.from(values.keys());
      return keys[index] ?? null;
    },

    getItem(key) {
      const normalizedKey = String(key);
      return values.has(normalizedKey) ? values.get(normalizedKey) : null;
    },

    setItem(key, value) {
      values.set(String(key), String(value));
    },

    removeItem(key) {
      values.delete(String(key));
    },

    clear() {
      values.clear();
    },
  };
}

// One store per page lifetime so Cognito SDK calls made during the same page
// can still use the session they just created. A reload intentionally discards
// it; the HttpOnly secure-session cookie restores the member session instead.
const secureCognitoMemoryStorage = createMemoryStorage();

export const getCognitoSdkStorage = (secureSessionEnabled) =>
  secureSessionEnabled ? secureCognitoMemoryStorage : undefined;

/**
 * Remove only Cognito SDK credential values from persistent localStorage.
 * Metadata such as LastAuthUser/clockDrift is deliberately left alone to keep
 * password-recovery and other non-secret compatibility behaviour unchanged.
 */
export function purgePersistedCognitoSdkTokens(storage = null) {
  let target = storage;
  if (!target) {
    try {
      target = globalThis.localStorage || null;
    } catch {
      target = null;
    }
  }

  if (!target) return 0;

  let keys = [];
  try {
    // Snapshot first because removing entries changes Storage indexes.
    for (let index = 0; index < target.length; index += 1) {
      const key = target.key(index);
      if (isPersistedCognitoSdkTokenKey(key)) keys.push(key);
    }
  } catch {
    return 0;
  }

  let removed = 0;
  keys.forEach((key) => {
    try {
      target.removeItem(key);
      removed += 1;
    } catch {
      // Best effort. A storage failure must not break login/logout rendering.
    }
  });
  return removed;
}
