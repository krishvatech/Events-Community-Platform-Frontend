import { API_BASE } from "../utils/api";

export const DEACTIVATED_ACCOUNT_MESSAGE =
  "This account has been deactivated by an administrator. Please contact support.";

const ACCOUNT_STATUS_MESSAGES = {
  account_deleted: DEACTIVATED_ACCOUNT_MESSAGE,
  account_inactive: DEACTIVATED_ACCOUNT_MESSAGE,
  account_suspended: "Your account has been suspended. Please contact support for assistance.",
  account_disabled: "This account has been disabled due to policy violations.",
  account_memorialized: "This account has been memorialized.",
};

const readPayload = (payload = {}) => {
  const nestedDetail =
    payload?.detail && typeof payload.detail === "object" ? payload.detail : {};
  const code = String(
    payload?.code || nestedDetail?.code || payload?.error_code || ""
  ).trim();
  const detail = String(
    (typeof payload?.detail === "string" && payload.detail) ||
      nestedDetail?.detail ||
      payload?.error ||
      ACCOUNT_STATUS_MESSAGES[code] ||
      ""
  ).trim();
  return { code, detail };
};

/**
 * Check the authoritative Django account state before Cognito authentication.
 *
 * Network/server failures intentionally do not block normal authentication;
 * existing Cognito and backend guards still enforce access. A 403 account-state
 * response is terminal and is shown directly by AuthModal.
 */
export async function assertAccountCanLogin(identifier) {
  let response;
  try {
    response = await fetch(`${API_BASE}/auth/login-status/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({ identifier }),
    });
  } catch (networkError) {
    console.warn("Account status preflight unavailable:", networkError);
    return;
  }

  if (response.status !== 403) return;

  let payload = {};
  try {
    payload = await response.json();
  } catch {
    // Use the stable fallback message below.
  }

  const { code, detail } = readPayload(payload);
  const error = new Error(
    detail || ACCOUNT_STATUS_MESSAGES[code] || DEACTIVATED_ACCOUNT_MESSAGE
  );
  error.code = code || "account_deleted";
  error.isAccountStatusError = true;
  throw error;
}
