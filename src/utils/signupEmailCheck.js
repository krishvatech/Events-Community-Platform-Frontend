// Signup preflight for disposable email domains.
//
// The backend (POST /auth/validate-signup-email/) owns the domain list, so the
// frontend never keeps its own copy. This check is for early, friendly feedback
// only: the Cognito Pre Sign-up trigger and the backend enforce the rule.
//
// A failed check is never treated as "allowed". Callers stop the signup and ask
// the user to try again.

export const DISPOSABLE_EMAIL_MESSAGE =
  "Temporary or disposable email addresses are not supported. Please use your regular email address.";
export const SIGNUP_EMAIL_CHECK_FAILED_MESSAGE =
  "We couldn't verify your email address right now. Please try again.";
export const SIGNUP_EMAIL_CHECK_THROTTLED_MESSAGE =
  "Too many attempts. Please wait a minute and try again.";
const INVALID_EMAIL_MESSAGE = "Enter a valid email address";

// Only definitive answers are cached, so a retry after a network error calls the API again.
const definitiveResults = new Map();
// Concurrent checks of one address (e.g. field blur + submit click) share a request.
const pendingChecks = new Map();

export const normalizeSignupEmail = (email) => String(email || "").trim().toLowerCase();

/**
 * Returns one of:
 *   { status: "allowed" }
 *   { status: "blocked", message }  disposable domain
 *   { status: "invalid", message }  the backend rejected the address format
 *   { status: "error",   message }  the check could not be completed
 */
export function checkSignupEmail(apiBase, email, { fetchImpl = globalThis.fetch } = {}) {
  const normalized = normalizeSignupEmail(email);
  if (definitiveResults.has(normalized)) return Promise.resolve(definitiveResults.get(normalized));
  if (pendingChecks.has(normalized)) return pendingChecks.get(normalized);

  const pending = requestSignupEmailCheck(apiBase, normalized, fetchImpl).finally(() => {
    pendingChecks.delete(normalized);
  });
  pendingChecks.set(normalized, pending);
  return pending;
}

async function requestSignupEmailCheck(apiBase, normalized, fetchImpl) {
  let response;
  try {
    response = await fetchImpl(`${apiBase}/auth/validate-signup-email/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: normalized }),
    });
  } catch {
    return { status: "error", message: SIGNUP_EMAIL_CHECK_FAILED_MESSAGE };
  }

  if (response.status === 429) {
    return { status: "error", message: SIGNUP_EMAIL_CHECK_THROTTLED_MESSAGE };
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  let result = null;
  if (response.ok && data?.allowed === true) {
    result = { status: "allowed" };
  } else if (response.ok && data?.allowed === false && data?.code === "disposable_email_domain") {
    result = { status: "blocked", message: DISPOSABLE_EMAIL_MESSAGE };
  } else if (response.status === 400 && data?.code === "invalid_email") {
    result = { status: "invalid", message: INVALID_EMAIL_MESSAGE };
  }

  if (!result) return { status: "error", message: SIGNUP_EMAIL_CHECK_FAILED_MESSAGE };
  definitiveResults.set(normalized, result);
  return result;
}

/** True when Cognito rejected a signup through the Pre Sign-up disposable-email trigger. */
export function isDisposableEmailSignupError(error) {
  const code = String(error?.code || error?.name || "");
  const message = String(error?.message || error || "");
  return (
    (code === "UserLambdaValidationException" || /PreSignUp failed/i.test(message)) &&
    /disposable email/i.test(message)
  );
}

export function clearSignupEmailCheckCache() {
  definitiveResults.clear();
  pendingChecks.clear();
}
