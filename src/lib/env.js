// src/lib/env.js
// Centralized environment access for the Next.js App Router migration.
//
// Next.js inlines NEXT_PUBLIC_* values into client bundles at build time ONLY
// when they are referenced with a literal `process.env.NEXT_PUBLIC_X` expression.
// Never replace these with dynamic lookups such as `process.env[name]`.
//
// Values are kept as raw strings (or undefined), exactly like import.meta.env in
// the Vite app, so call sites keep their existing parsing/fallback semantics when
// they are migrated from VITE_* in later phases.
//
// Build-only credentials (SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT) must never
// be given a NEXT_PUBLIC_ prefix and are intentionally not exposed here.
//
// Live Meeting / realtime tuning variables (VITE_RTK_*, VITE_SPEED_NETWORKING_*,
// VITE_WAITING_ROOM_*, VITE_BREAKOUT_*, VITE_LOUNGE_*, VITE_MEETING_*, VITE_LIVE_*,
// VITE_ENABLE_VIRTUAL_BG) are out of scope until the Live Meeting phase.

export const env = Object.freeze({
  // Replaces import.meta.env.DEV / import.meta.env.MODE
  NODE_ENV: process.env.NODE_ENV,
  IS_DEV: process.env.NODE_ENV === "development",

  // Backend
  API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL, // VITE_API_BASE_URL
  MEDIA_BASE_URL: process.env.NEXT_PUBLIC_MEDIA_BASE_URL, // VITE_MEDIA_BASE_URL

  // Authentication / Cognito
  AUTH_PROVIDER: process.env.NEXT_PUBLIC_AUTH_PROVIDER, // VITE_AUTH_PROVIDER
  COGNITO_REGION: process.env.NEXT_PUBLIC_COGNITO_REGION, // VITE_COGNITO_REGION
  COGNITO_USER_POOL_ID: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID, // VITE_COGNITO_USER_POOL_ID
  COGNITO_CLIENT_ID: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID, // VITE_COGNITO_CLIENT_ID
  COGNITO_DOMAIN: process.env.NEXT_PUBLIC_COGNITO_DOMAIN, // VITE_COGNITO_DOMAIN
  COGNITO_REDIRECT_URI: process.env.NEXT_PUBLIC_COGNITO_REDIRECT_URI, // VITE_COGNITO_REDIRECT_URI
  COGNITO_LOGOUT_URI: process.env.NEXT_PUBLIC_COGNITO_LOGOUT_URI, // VITE_COGNITO_LOGOUT_URI
  COGNITO_IMAA_IDP_NAME: process.env.NEXT_PUBLIC_COGNITO_IMAA_IDP_NAME, // VITE_COGNITO_IMAA_IDP_NAME
  ENABLE_IMAA_SSO: process.env.NEXT_PUBLIC_ENABLE_IMAA_SSO, // VITE_ENABLE_IMAA_SSO
  SECURE_AUTH_SESSION_ENABLED: process.env.NEXT_PUBLIC_SECURE_AUTH_SESSION_ENABLED, // VITE_SECURE_AUTH_SESSION_ENABLED

  // Feature flags / diagnostics
  CMS_ENABLED: process.env.NEXT_PUBLIC_CMS_ENABLED, // VITE_CMS_ENABLED
  ENABLE_DARK_MODE: process.env.NEXT_PUBLIC_ENABLE_DARK_MODE, // VITE_ENABLE_DARK_MODE
  MEMBER_DIRECTORY_PERF_LOGS: process.env.NEXT_PUBLIC_MEMBER_DIRECTORY_PERF_LOGS, // VITE_MEMBER_DIRECTORY_PERF_LOGS

  // Sentry (browser SDK configuration only; the DSN is public by design)
  SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN, // VITE_SENTRY_DSN
  SENTRY_ENVIRONMENT: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT, // VITE_SENTRY_ENVIRONMENT
  SENTRY_RELEASE: process.env.NEXT_PUBLIC_SENTRY_RELEASE, // VITE_SENTRY_RELEASE
  SENTRY_TRACES_SAMPLE_RATE: process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE, // VITE_SENTRY_TRACES_SAMPLE_RATE
  SENTRY_REPLAYS_SESSION_SAMPLE_RATE: process.env.NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE, // VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE
  SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE: process.env.NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE, // VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE
  SENTRY_ENABLE_IN_DEV: process.env.NEXT_PUBLIC_SENTRY_ENABLE_IN_DEV, // VITE_SENTRY_ENABLE_IN_DEV
});

export default env;
