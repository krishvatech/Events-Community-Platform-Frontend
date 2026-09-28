// src/next/browserBootstrap.js
// Browser-only startup for the Next.js app: the subset of src/main.jsx that
// migrated routes need. Imported only by client-only modules (loaded with
// next/dynamic { ssr: false }), so none of this ever runs on the server.
//
// Intentionally NOT migrated yet:
//  - Sentry (src/sentry.js)            -> dedicated Sentry step
//  - RealtimeKit unhandledrejection filter -> Live Meeting phase

import "../setupPolyfills"; // Buffer/process/global for amazon-cognito-identity-js
import { applyEnUsLocaleOverrides } from "../bootstrap/enUsLocale";
import "../utils/fetchInterceptor"; // global fetch auth refresh / 403 cache / timeouts

applyEnUsLocaleOverrides();
