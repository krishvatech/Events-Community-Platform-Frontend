// next.config.mjs
// Next.js side of the Vite -> Next.js migration adapters. Everything here keeps
// the SAME source files working under both bundlers until Vite is removed.
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));

// Browser-visible configuration. Each Next.js name falls back to the existing
// Vite name, so the same .env / Amplify variables work during the migration.
// Explicit allow-list only: never add build credentials (SENTRY_AUTH_TOKEN,
// SENTRY_ORG, SENTRY_PROJECT) or other secrets here.
// Live Meeting tuning variables (VITE_RTK_*, VITE_SPEED_NETWORKING_*, ...) are
// deliberately not mapped yet; that code falls back to its built-in defaults.
const PUBLIC_ENV = [
  ["NEXT_PUBLIC_API_BASE_URL", "VITE_API_BASE_URL"],
  ["NEXT_PUBLIC_MEDIA_BASE_URL", "VITE_MEDIA_BASE_URL"],
  ["NEXT_PUBLIC_AUTH_PROVIDER", "VITE_AUTH_PROVIDER"],
  ["NEXT_PUBLIC_COGNITO_REGION", "VITE_COGNITO_REGION"],
  ["NEXT_PUBLIC_COGNITO_USER_POOL_ID", "VITE_COGNITO_USER_POOL_ID"],
  ["NEXT_PUBLIC_COGNITO_CLIENT_ID", "VITE_COGNITO_CLIENT_ID"],
  ["NEXT_PUBLIC_COGNITO_DOMAIN", "VITE_COGNITO_DOMAIN"],
  ["NEXT_PUBLIC_COGNITO_REDIRECT_URI", "VITE_COGNITO_REDIRECT_URI"],
  ["NEXT_PUBLIC_COGNITO_LOGOUT_URI", "VITE_COGNITO_LOGOUT_URI"],
  ["NEXT_PUBLIC_COGNITO_IMAA_IDP_NAME", "VITE_COGNITO_IMAA_IDP_NAME"],
  ["NEXT_PUBLIC_ENABLE_IMAA_SSO", "VITE_ENABLE_IMAA_SSO"],
  ["NEXT_PUBLIC_SECURE_AUTH_SESSION_ENABLED", "VITE_SECURE_AUTH_SESSION_ENABLED"],
  ["NEXT_PUBLIC_CMS_ENABLED", "VITE_CMS_ENABLED"],
  ["NEXT_PUBLIC_MEMBER_DIRECTORY_PERF_LOGS", "VITE_MEMBER_DIRECTORY_PERF_LOGS"],
  ["NEXT_PUBLIC_SENTRY_DSN", "VITE_SENTRY_DSN"],
  ["NEXT_PUBLIC_SENTRY_ENVIRONMENT", "VITE_SENTRY_ENVIRONMENT"],
  ["NEXT_PUBLIC_SENTRY_RELEASE", "VITE_SENTRY_RELEASE"],
  ["NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE", "VITE_SENTRY_TRACES_SAMPLE_RATE"],
  ["NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE", "VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE"],
  ["NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE", "VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE"],
  ["NEXT_PUBLIC_SENTRY_ENABLE_IN_DEV", "VITE_SENTRY_ENABLE_IN_DEV"],
];

const publicEnv = {}; // NEXT_PUBLIC_* -> value (read by src/lib/env.js)
const legacyViteEnv = {}; // VITE_* -> value (read by shared code via import.meta.env)
for (const [nextName, viteName] of PUBLIC_ENV) {
  const value = process.env[nextName] ?? process.env[viteName];
  if (value === undefined) continue;
  publicEnv[nextName] = value;
  legacyViteEnv[viteName] = value;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optional override so a verification build/start can run next to a
  // developer's `next dev` without sharing (and clobbering) the same .next folder.
  distDir: process.env.NEXT_DIST_DIR || ".next",

  env: publicEnv,

  // Vite returns a URL string for `import logo from "./x.png"`; Next's default
  // static-image import returns an object. Keep Vite semantics for shared code.
  images: { disableStaticImages: true },

  webpack(config, { dev, isServer, webpack }) {
    // Shared components import navigation from "#navigation" (package.json
    // "imports" -> React Router). Under Next.js it resolves to the Next adapter.
    config.resolve.alias = {
      ...config.resolve.alias,
      "#navigation$": path.join(ROOT, "src/navigation/next.jsx"),
    };

    // Shared (Vite-era) modules read import.meta.env.VITE_*; provide the same
    // object shape from the explicit mapping above.
    const importMetaEnv = {
      ...legacyViteEnv,
      MODE: dev ? "development" : "production",
      DEV: dev,
      PROD: !dev,
      SSR: isServer,
      BASE_URL: "/",
    };
    config.plugins.push(
      new webpack.DefinePlugin({ "import.meta.env": JSON.stringify(importMetaEnv) })
    );

    config.module.rules.push(
      {
        test: /\.(png|jpe?g|gif|webp|avif|ico|svg)$/i,
        type: "asset/resource",
      },
      {
        test: /\.(js|jsx)$/,
        include: path.join(ROOT, "src"),
        enforce: "pre",
        use: [path.join(ROOT, "next-support/vite-compat-loader.cjs")],
      }
    );

    return config;
  },
};

export default nextConfig;
