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
      onError?.(new Error("missing_site_key"));
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
          callback: (token) => onVerify?.(token),
          "expired-callback": () => onExpire?.(),
          "error-callback": () => onError?.(new Error("turnstile_error")),
        });
      })
      .catch((err) => {
        if (!cancelled) onError?.(err);
      });

    return () => {
      cancelled = true;
      cleanup();
    };
    // Re-render only if the identity of the callbacks/config changes.
  }, [siteKey, action, theme, size, onVerify, onExpire, onError, cleanup]);

  if (!siteKey) {
    return (
      <Typography variant="caption" color="error">
        Security check unavailable (not configured).
      </Typography>
    );
  }

  return <Box ref={containerRef} sx={{ my: 1, minHeight: 65 }} />;
}
