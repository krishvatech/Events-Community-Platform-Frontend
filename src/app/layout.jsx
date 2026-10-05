// Root layout for the Next.js App Router (Server Component).
// Mirrors the static shell of the Vite app (index.html + global CSS in src/main.jsx).
// Do not import browser-only modules here (fetchInterceptor, sentry, setupPolyfills,
// auth/session utilities); they touch window/document at import time.

import InitColorSchemeScript from "@mui/material/InitColorSchemeScript";
import AppProviders from "../providers/AppProviders";
import {
  COLOR_MODE_ATTRIBUTE,
  COLOR_MODE_STORAGE_KEY,
  COLOR_SCHEME_STORAGE_KEY,
  DARK_MODE_ENABLED,
  DEFAULT_COLOR_MODE,
  FORCE_LIGHT_INIT_SCRIPT,
} from "../theme/colorMode";

// Same global stylesheets, in the same order, as src/main.jsx
import "../index.css";
import "../styles/brand.css";
import "leaflet/dist/leaflet.css";

export const metadata = {
  title: "Events & Community Platform",
};

export default function RootLayout({ children }) {
  // suppressHydrationWarning: with dark mode enabled, the start-up scripts below set the
  // colour-mode attribute on <html>/<body> before React hydrates.
  return (
    <html lang="en" suppressHydrationWarning={DARK_MODE_ENABLED}>
      <head>
        {/* Same font loading as index.html. One request: Inter (body/UI, variable weight 400–900)
            and Source Serif 4 (design headings, 400–700 plus italic). */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400..900&family=Source+Serif+4:ital,wght@0,400..700;1,400..700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen antialiased imaa-body-text" suppressHydrationWarning={DARK_MODE_ENABLED}>
        {/* Dark mode only (flag on): apply the saved light/dark mode, and keep force-light
            routes light, before the first paint. See src/theme/colorMode.js. */}
        {DARK_MODE_ENABLED && (
          <>
            <InitColorSchemeScript
              attribute={COLOR_MODE_ATTRIBUTE}
              defaultMode={DEFAULT_COLOR_MODE}
              modeStorageKey={COLOR_MODE_STORAGE_KEY}
              colorSchemeStorageKey={COLOR_SCHEME_STORAGE_KEY}
            />
            <script dangerouslySetInnerHTML={{ __html: FORCE_LIGHT_INIT_SCRIPT }} />
          </>
        )}
        {/* index.css styles `html, body, #root`; keep the same mount element */}
        <div id="root">
          <AppProviders>{children}</AppProviders>
        </div>
      </body>
    </html>
  );
}
