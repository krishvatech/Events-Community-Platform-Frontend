import React, { useEffect, useRef, useCallback } from "react";
import { Box, Typography } from "@mui/material";
import { loadTurnstileScript, getTurnstileSiteKey } from "../utils/turnstile";

/**
 * IPDT-773 — reusable Cloudflare Turnstile widget (prototype).
 *
 * Renders the Turnstile challenge and reports its token via callbacks. The
 * token lives only in the parent's memory for the duration of the request;
 * this component never persists it. It explicitly resets on expiry/error and
 * removes the widget on unmount so no challenge state leaks between mounts.
 *
 * Props:
 *   onVerify(token)  — called with a fresh token on success
 *   onExpire()       — called when the token expires (parent should clear it)
 *   onError()        — called on script/challenge error
 *   action           — optional Turnstile "action" label for the operation
 *   theme/size       — passed through to Turnstile
 *
 * This component is inert until a caller renders it; wiring it into live
 * signup/application flows is gated by isCaptchaPrototypeEnabled() in Phase 1.
 */
export default function TurnstileWidget({
  onVerify,
  onExpire,
  onError,
  action,
  theme = "auto",
  size = "normal",
}) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const siteKey = getTurnstileSiteKey();

  // Keep the latest callbacks in refs so the render effect does NOT depend on
  // their identity. Parents pass inline callbacks, and a successful verify sets
  // parent state (the token), which re-renders the parent and hands us fresh
  // callback identities on every keystroke/state change. If those identities
  // were effect deps, the widget would be removed and re-rendered on each render
  // — an init/remove loop and repeated challenges. Reading them from refs lets
  // the render effect depend only on the actual widget configuration.
  const onVerifyRef = useRef(onVerify);
  const onExpireRef = useRef(onExpire);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onVerifyRef.current = onVerify;
    onExpireRef.current = onExpire;
    onErrorRef.current = onError;
  }); // every render; no deps — just keeps the refs current

  const cleanup = useCallback(() => {
    try {
      if (widgetIdRef.current != null && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
    } catch {
      // Best-effort cleanup; ignore if the widget is already gone.
    }
    widgetIdRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!siteKey) {
      // No site key configured — surface as an error rather than silently passing.
      onErrorRef.current?.(new Error("missing_site_key"));
      return undefined;
    }

    loadTurnstileScript()
      .then((turnstile) => {
        if (cancelled || !containerRef.current || !turnstile) return;
        widgetIdRef.current = turnstile.render(containerRef.current, {
          sitekey: siteKey,
          action,
          theme,
          size,
          callback: (token) => onVerifyRef.current?.(token),
          "expired-callback": () => onExpireRef.current?.(),
          // Capture Cloudflare's client error code for reporting. The code is a
          // short status string (e.g. "110200") — NEVER the token or a secret —
          // so it is safe to surface and log.
          "error-callback": (errorCode) => {
            const code = errorCode == null ? "unknown" : String(errorCode);
            // eslint-disable-next-line no-console
            console.warn("[TurnstileWidget] challenge error:", code);
            onErrorRef.current?.(new Error(`turnstile_error:${code}`));
          },
        });
      })
      .catch((err) => {
        if (!cancelled) onErrorRef.current?.(err);
      });

    return () => {
      cancelled = true;
      cleanup();
    };
    // Depend ONLY on the actual widget configuration — not on callback identity
    // (handled via refs above) — so parent re-renders don't re-init the widget.
    // `cleanup` is a stable useCallback([]) and intentionally omitted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey, action, theme, size]);

  if (!siteKey) {
    return (
      <Typography variant="caption" color="error">
        Security check unavailable (not configured).
      </Typography>
    );
  }

  return <Box ref={containerRef} sx={{ my: 1, minHeight: 65 }} />;
}
