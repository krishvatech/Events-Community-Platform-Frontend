// IPDT-773 — Signup-proof helper (prototype).
//
// Exchanges a Cloudflare Turnstile token for a short-lived, HMAC-signed signup
// proof issued by the backend (POST /auth/signup-proof/). The proof is handed
// to Cognito as clientMetadata.signup_proof for the Pre-Sign-up Lambda to
// enforce. This endpoint is inert (404) unless CAPTCHA_PROTOTYPE_ENABLED is on
// server-side, so callers must guard with isCaptchaPrototypeEnabled().
//
// Security: only the public Turnstile token transits here. The proof is never
// persisted to localStorage/sessionStorage; it is passed straight to the
// signup call. Any failure is reported as a failure — a proof is never faked.

// Node-safe API base resolution (mirrors utils/api.js) so this fetchImpl-
// injectable helper can be imported under `node --test` without Vite's
// import.meta.env. In the Vite build this resolves identically to api.js.
const API_BASE = (
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_BASE_URL) ||
  "http://127.0.0.1:8000/api"
).trim().replace(/\/+$/, "");

/**
 * Request a signed signup proof for a Turnstile token.
 *
 * @param {object} args
 * @param {string} args.token      Turnstile response token.
 * @param {string} args.email      Applicant email (the proof is bound to it).
 * @param {string} [args.operation] Defaults to "signup".
 * @param {typeof fetch} [args.fetchImpl]
 * @returns {Promise<{ ok: true, proof: string } | { ok: false, error: string }>}
 *   On success: { ok: true, proof }. On failure: { ok: false, error }, where
 *   error is "rate_limited" when the endpoint throttled the request, otherwise
 *   a short machine-readable reason ("captcha_failed", "email_required",
 *   "proof_unavailable", "disabled", "network_error", "bad_response").
 */
// IPDT-773 Phase 2.1: coalesce only truly-identical concurrent requests. The
// key includes operation + normalized email + the exact Turnstile token, so
// two overlapping calls with different tokens never share one result. Entries
// are cleared on settle (success or failure), so a later call always issues a
// fresh request — no stale or previously consumed proof is ever returned.
const _inflight = new Map();

export function requestSignupProof(args = {}) {
  const { token, email, operation = "signup" } = args;
  const key = `${operation}\u0000${String(email || "").trim().toLowerCase()}\u0000${token || ""}`;
  if (_inflight.has(key)) return _inflight.get(key);
  const p = _requestSignupProof(args).finally(() => _inflight.delete(key));
  _inflight.set(key, p);
  return p;
}

async function _requestSignupProof({ token, email, operation = "signup", fetchImpl = globalThis.fetch } = {}) {
  let response;
  try {
    response = await fetchImpl(`${API_BASE}/auth/signup-proof/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: String(token || ""),
        email: String(email || "").trim().toLowerCase(),
        operation: String(operation || "signup"),
      }),
    });
  } catch {
    // Fail closed: a network error is never a pass.
    return { ok: false, error: "network_error" };
  }

  if (response.status === 429) {
    return { ok: false, error: "rate_limited" };
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (response.ok && data && typeof data.proof === "string" && data.proof) {
    return { ok: true, proof: data.proof };
  }

  // The flag is off server-side (404), CAPTCHA was rejected (400), the signing
  // secret is missing (503), or the body was unexpected.
  if (response.status === 404) return { ok: false, error: "disabled" };
  const reason = data && typeof data.detail === "string" ? data.detail : "bad_response";
  return { ok: false, error: reason };
}
