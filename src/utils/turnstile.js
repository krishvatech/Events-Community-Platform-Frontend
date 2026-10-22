// IPDT-773 — Cloudflare Turnstile helpers (prototype).
//
// Loads the Turnstile script exactly once (shared promise) and exposes the
// prototype feature flag. The flag is OFF by default; while it is off, no
// Turnstile UI should be wired into live signup/application flows.
//
// Security: only the PUBLIC site key lives here (VITE_TURNSTILE_SITE_KEY).
// The verification secret is backend-only and must never appear in frontend
// code or env. Tokens are never persisted to localStorage/sessionStorage.

const TURNSTILE_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let scriptPromise = null;

// Node-safe env read (mirrors utils/captchaProof.js): in the Vite build this
// resolves from import.meta.env exactly as before; under `node --test` (no
// import.meta.env) it falls back to process.env so these helpers can be imported
// and exercised in unit tests.
function _viteEnv(key, fallback = "") {
  if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env[key] != null) {
    return import.meta.env[key];
  }
  if (typeof process !== "undefined" && process.env && process.env[key] != null) {
    return process.env[key];
  }
  return fallback;
}

// Prototype flag — default false. Any live wiring must check this.
export const isCaptchaPrototypeEnabled = () =>
  String(_viteEnv("VITE_CAPTCHA_PROTOTYPE", "false")).toLowerCase() === "true";

export const getTurnstileSiteKey = () =>
  String(_viteEnv("VITE_TURNSTILE_SITE_KEY", "")).trim();

// Load the external Turnstile script once; subsequent callers share the promise.
export function loadTurnstileScript() {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src^="${TURNSTILE_SRC.split("?")[0]}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(window.turnstile));
      existing.addEventListener("error", () => {
        scriptPromise = null;
        reject(new Error("turnstile_script_failed"));
      });
      if (window.turnstile) resolve(window.turnstile);
      return;
    }
    const script = document.createElement("script");
    script.src = TURNSTILE_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.turnstile);
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("turnstile_script_failed"));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}
