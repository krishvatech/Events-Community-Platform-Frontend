import * as Sentry from "@sentry/react";

const dsn = import.meta.env.VITE_SENTRY_DSN;

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const filterSensitiveHeaders = (event) => {
  const headers = event?.request?.headers;
  if (!headers) return event;

  for (const key of Object.keys(headers)) {
    if (["authorization", "cookie", "x-csrftoken", "x-csrf-token"].includes(key.toLowerCase())) {
      headers[key] = "[Filtered]";
    }
  }

  return event;
};

const enableInDev = import.meta.env.VITE_SENTRY_ENABLE_IN_DEV === "true";
const isDevelopment = import.meta.env.MODE === "development";

if (dsn && (!isDevelopment || enableInDev)) {
  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE,
    release: import.meta.env.VITE_SENTRY_RELEASE || undefined,

    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        // Keep replay privacy-safe because this app can show profile, KYC,
        // billing, invoice, chat, Q&A, and event application data.
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    tracesSampleRate: toNumber(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE, 0.05),
    replaysSessionSampleRate: toNumber(
      import.meta.env.VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE,
      0
    ),
    replaysOnErrorSampleRate: toNumber(
      import.meta.env.VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE,
      1.0
    ),

    tracePropagationTargets: [
      /^\/api\//,
      /^https:\/\/api\.colligatus\.com\/api\//,
    ],

    beforeSend(event, hint) {
      const message =
        hint?.originalException?.message ||
        event?.exception?.values?.[0]?.value ||
        "";

      // Ignore known RealtimeKit SDK retry/polling timeout noise.
      if (message.includes("request timeout for callback")) {
        return null;
      }

      return filterSensitiveHeaders(event);
    },
  });
}

export default Sentry;
