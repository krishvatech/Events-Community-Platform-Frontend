// src/theme/colorMode.js
// Dark mode (phase D2): the single source of truth for colour-mode configuration, shared by
// the Next.js app (src/app/layout.jsx, src/providers/AppProviders.jsx) and the Vite app
// (src/main.jsx, index.html). Server-safe: no window/document access at import time.
//
// How it fits together
// - MUI owns the mode state (ThemeProvider with the colour-scheme theme from src/muiTheme.js).
// - The active scheme is written to <html data-imaa-color-mode="light|dark">. MUI's CSS
//   variables and the --imaa-* semantic variables in src/styles/brand.css both key off it.
// - Pages that are not dark-ready get data-imaa-color-mode="light" on <body> ("force light"),
//   which re-declares the light variables for everything inside <body>, including MUI portals.
//
// While VITE_ENABLE_DARK_MODE is not "true", none of this is active: the original light theme
// is used, nothing is read from or written to storage, and no attribute is set.

// Feature flag. Next.js passes VITE_ENABLE_DARK_MODE / NEXT_PUBLIC_ENABLE_DARK_MODE through
// next.config.mjs (same convention as VITE_ENABLE_IMAA_SSO).
export const DARK_MODE_ENABLED =
  String(import.meta.env.VITE_ENABLE_DARK_MODE || "false").toLowerCase() === "true";

// Persisted preference. D2 supports only "light" and "dark" (no "system" yet).
export const COLOR_MODE_STORAGE_KEY = "imaa_color_mode";
// MUI also reads per-mode scheme names under `${key}-light` / `${key}-dark`; namespaced so it
// never touches MUI's default keys. Not written by the D2 switch.
export const COLOR_SCHEME_STORAGE_KEY = "imaa_color_scheme";
export const COLOR_MODES = ["light", "dark"];
export const DEFAULT_COLOR_MODE = "light";

// DOM attribute for the active scheme (MUI `colorSchemeSelector`, InitColorSchemeScript
// `attribute`, brand.css selectors and the Vite start-up script all use this exact name).
export const COLOR_MODE_ATTRIBUTE = "data-imaa-color-mode";

// Which routes may show dark mode. Both patterns are tested against the pathname; keep the
// copies in index.html (Vite start-up script) in sync.
//
// Dark mode is opt-in per route: a route follows the saved preference only when it matches
// DARK_READY_PATH_PATTERN (its pages and shared components have been converted to the
// semantic colours) and does not match FORCE_LIGHT_PATH_PATTERN. Every other route, including
// any new or unknown route, stays fully light, so no page can end up half dark.
//
// Always light: special branding, standalone IMAA pages, event landing pages, the event
// companion and Live Meeting.
export const FORCE_LIGHT_PATH_PATTERN =
  "^/(m-and-a-trainings|recognition)(/|$)|^/(public|staging|landing)/|^/live(/|$)|/companion(/|$)";
// Reviewed for dark mode.
export const DARK_READY_PATH_PATTERN =
  "^/($|about/?$|signin/?$|signup/?$|forgot-password/?$|reset-password/?$|auth/|cognito/|oauth/|sso/|kyc/|" +
  "events(/|$)|account(/|$)|community(/|$)|groups(/|$)|forms(/|$)|series(/|$)|blogs(/|$)|resource(/|$)|" +
  "newsletter(/|$)|cms(/|$)|admin(/|$)|AdminEvents(/|$))";

export function isForceLightPath(pathname = "") {
  return (
    new RegExp(FORCE_LIGHT_PATH_PATTERN).test(pathname) || !new RegExp(DARK_READY_PATH_PATTERN).test(pathname)
  );
}

const normalizeMode = (value) => (COLOR_MODES.includes(value) ? value : null);

// localStorage manager for MUI's ThemeProvider (same interface as MUI's built-in manager,
// including cross-tab sync via the `storage` event). For the mode key it accepts only
// "light"/"dark"; anything else (e.g. "system" or a stale value) is treated as light and
// replaced, so the start-up script agrees on the next load.
export function colorModeStorageManager({ key, storageWindow }) {
  const win = storageWindow ?? (typeof window !== "undefined" ? window : undefined);
  const isModeKey = key === COLOR_MODE_STORAGE_KEY;
  return {
    get(defaultValue) {
      if (typeof window === "undefined") return undefined;
      if (!win) return defaultValue;
      let value;
      try {
        value = win.localStorage.getItem(key);
        if (isModeKey && value !== null && !normalizeMode(value)) {
          value = DEFAULT_COLOR_MODE;
          win.localStorage.setItem(key, value);
        }
      } catch {
        // Storage unavailable (private mode, blocked): fall back to the default.
      }
      return value || defaultValue;
    },
    set(value) {
      if (!win) return;
      if (isModeKey && !normalizeMode(value)) return;
      try {
        win.localStorage.setItem(key, value);
      } catch {
        // Storage unavailable: the choice still applies for this page view.
      }
    },
    subscribe(handler) {
      if (!win) return () => {};
      const listener = (event) => {
        if (event.key !== key) return;
        handler(isModeKey ? normalizeMode(event.newValue) : event.newValue);
      };
      win.addEventListener("storage", listener);
      return () => win.removeEventListener("storage", listener);
    },
  };
}

// Extra ThemeProvider props used only when dark mode is enabled.
export const colorModeProviderProps = {
  defaultMode: DEFAULT_COLOR_MODE,
  modeStorageKey: COLOR_MODE_STORAGE_KEY,
  colorSchemeStorageKey: COLOR_SCHEME_STORAGE_KEY,
  storageManager: colorModeStorageManager,
  disableTransitionOnChange: true,
};

// Inline <body> start-up script (Next.js): marks light-only routes before first paint
// (same test as isForceLightPath).
export const FORCE_LIGHT_INIT_SCRIPT = `(function(){try{var p=window.location.pathname;if(new RegExp(${JSON.stringify(
  FORCE_LIGHT_PATH_PATTERN
)}).test(p)||!new RegExp(${JSON.stringify(DARK_READY_PATH_PATTERN)}).test(p)){document.body.setAttribute(${JSON.stringify(
  COLOR_MODE_ATTRIBUTE
)},"light");}}catch(e){}})();`;
