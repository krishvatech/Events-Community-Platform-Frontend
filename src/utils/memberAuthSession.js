import {
  establishSecureAuthSession,
  isSecureAuthSessionEnabled,
  refreshSecureAuthSession,
} from "./secureAuthSession";
import {
  TOKEN_STORAGE_KEYS,
  clearCognitoAuthTokens,
  getAccessToken,
  purgePersistedMemberTokens,
  removeIdToken,
  removeRefreshToken,
  setAccessToken,
  setCognitoAccessToken,
  setIdToken,
  setRefreshToken,
} from "./tokenStore";

const normalizeToken = (value) => {
  if (value === null || value === undefined) return "";
  const token = String(value).trim();
  if (!token || token === "null" || token === "undefined") return "";
  return token;
};

const readLegacyPersistedMemberTokens = () => {
  try {
    if (typeof localStorage === "undefined") return {};

    return {
      accessToken: normalizeToken(localStorage.getItem(TOKEN_STORAGE_KEYS.access)),
      idToken: normalizeToken(localStorage.getItem(TOKEN_STORAGE_KEYS.id)),
      refreshToken: normalizeToken(localStorage.getItem(TOKEN_STORAGE_KEYS.refresh)),
      cognitoAccessToken: normalizeToken(localStorage.getItem(TOKEN_STORAGE_KEYS.cognitoAccess)),
    };
  } catch {
    return {};
  }
};

/**
 * Complete a successful member login.
 *
 * Secure mode:
 *   - hands the Cognito refresh token to the first-party secure-session endpoint
 *   - keeps only the returned short-lived ID token in JS memory
 *   - removes member credential keys from persistent browser storage
 *
 * Legacy mode:
 *   - preserves the pre-migration localStorage behaviour exactly
 */
export async function establishMemberAuthSession({
  accessToken,
  idToken,
  refreshToken,
  cognitoAccessToken,
} = {}) {
  const bearer = normalizeToken(idToken || accessToken);
  const refresh = normalizeToken(refreshToken);
  const cognitoAccess = normalizeToken(cognitoAccessToken);

  if (!bearer) {
    throw new Error("Member login did not return an access token.");
  }

  if (!isSecureAuthSessionEnabled()) {
    setAccessToken(bearer);
    if (refresh) setRefreshToken(refresh);
    if (idToken) setIdToken(idToken);
    if (cognitoAccess) setCognitoAccessToken(cognitoAccess);
    return bearer;
  }

  if (!refresh) {
    throw new Error("Secure member login requires a Cognito refresh token.");
  }

  const result = await establishSecureAuthSession({
    accessToken: bearer,
    refreshToken: refresh,
  });

  // The refresh credential has now been handed to Django. Remove any stale
  // member-token keys left by older releases before exposing the signed-in UI.
  purgePersistedMemberTokens();
  clearCognitoAuthTokens();
  setAccessToken(result.accessToken);

  // The real Cognito access token is occasionally useful for Cognito-only
  // calls. In secure mode tokenStore keeps it in memory only.
  if (cognitoAccess) setCognitoAccessToken(cognitoAccess);

  // Do not retain duplicate ID/refresh credentials after the hand-off.
  removeRefreshToken();
  removeIdToken();

  return result.accessToken;
}

/**
 * Restore a secure member session after a page reload.
 * Returns a fresh short-lived ID token or null when no valid HttpOnly session
 * cookie exists. Legacy mode simply returns the currently stored token.
 */
export async function bootstrapMemberAuthSession() {
  if (!isSecureAuthSessionEnabled()) {
    return getAccessToken();
  }

  // Guest auth intentionally remains a separate flow and uses guest_token.
  if (typeof localStorage !== "undefined" && localStorage.getItem("is_guest") === "true") {
    return null;
  }

  // Capture credentials written by the previous frontend release before
  // removing them. This is a one-time rollout bridge only: if the browser
  // already has the new HttpOnly cookie we never use these values. If it does
  // not, we make one secure hand-off attempt and immediately purge the old
  // persistent credentials either way. This prevents a forced sign-in for
  // users who were already logged in when secure-session mode is enabled.
  const legacyTokens = readLegacyPersistedMemberTokens();
  purgePersistedMemberTokens();
  clearCognitoAuthTokens();

  try {
    const result = await refreshSecureAuthSession();
    setAccessToken(result.accessToken);
    return result.accessToken;
  } catch {
    const legacyBearer = normalizeToken(legacyTokens.idToken || legacyTokens.accessToken);
    const legacyRefresh = normalizeToken(legacyTokens.refreshToken);

    if (legacyBearer && legacyRefresh) {
      try {
        return await establishMemberAuthSession({
          accessToken: legacyBearer,
          idToken: legacyTokens.idToken,
          refreshToken: legacyRefresh,
          cognitoAccessToken: legacyTokens.cognitoAccessToken,
        });
      } catch {
        // Old SimpleJWT/non-Cognito credentials are intentionally not accepted
        // by the secure-session endpoint. They are already purged above.
      }
    }

    clearCognitoAuthTokens();
    purgePersistedMemberTokens();
    return null;
  }
}

export function clearMemberAuthSessionLocalState() {
  clearCognitoAuthTokens();
  purgePersistedMemberTokens();
}
