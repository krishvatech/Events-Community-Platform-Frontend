// Root layout for the Next.js App Router (Server Component).
// Mirrors the static shell of the Vite app (index.html + global CSS in src/main.jsx).
// Do not import browser-only modules here (fetchInterceptor, sentry, setupPolyfills,
// auth/session utilities); they touch window/document at import time.

import AppProviders from "../providers/AppProviders";

// Same global stylesheets, in the same order, as src/main.jsx
import "../index.css";
import "../styles/brand.css";
import "leaflet/dist/leaflet.css";

export const metadata = {
  title: "Events & Community Platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
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
      <body className="min-h-screen antialiased text-gray-900">
        {/* index.css styles `html, body, #root`; keep the same mount element */}
        <div id="root">
          <AppProviders>{children}</AppProviders>
        </div>
      </body>
    </html>
  );
}
