import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

import {
  React,
  cleanup,
  loadSource,
  queryByText,
  renderRoutes,
  router,
  signIn,
  waitFor,
} from "./helpers/blogDomHarness.mjs";
import {
  hasWebhookVerification,
  webhookDeliveryHostLabel,
  webhookDeliveryText,
  webhookMissingEventsText,
  webhookSecretLabel,
  webhookSubscribedLabel,
} from "../newsletterWebhookDiagnostics.js";

const { Route } = router;
const h = React.createElement;

// Assertions only compare strings/booleans (see schedulerHealth.test.mjs).

const { default: AdminNewsletterPage } = await loadSource("src/pages/AdminNewsletterPage.jsx");

const DIAGNOSTICS_URL = "/newsletter/admin/settings/mautic-diagnostics/";
const ALL_EVENTS = [
  "mautic.email_on_open",
  "mautic.email_on_send",
  "mautic.lead_channel_subscription_changed",
  "mautic.page_on_hit",
];

const BASE = {
  connection: { status: "Healthy", configured: true, reachable: true, authenticated: true },
  diagnostics: { status: "Healthy", warnings: [] },
};

const LEGACY_WEBHOOK = {
  receiver: "Ready",
  endpoint_path: "/api/newsletter/webhooks/mautic/",
  registration: "Not Verifiable",
  last_received_at: null,
  supported_event_types: ALL_EVENTS,
};

function serve(webhook) {
  globalThis.__testApiClient = {
    get: async (url) => ({ data: url === DIAGNOSTICS_URL ? { ...BASE, webhook } : { results: [] } }),
  };
}

async function renderSettings() {
  await renderRoutes(
    [h(Route, { key: "settings", path: "/admin/newsletter/settings", element: h(AdminNewsletterPage) })],
    { url: "/admin/newsletter/settings" }
  );
  await waitFor(() => assert.ok(queryByText("Webhooks")));
}

beforeEach(() => signIn({ superuser: true }));

afterEach(async () => {
  await cleanup();
  delete globalThis.__testApiClient;
});

test("secret, host and event labels", () => {
  assert.equal(webhookSecretLabel(true), "Matches");
  assert.equal(webhookSecretLabel(false), "Does not match");
  assert.equal(webhookSecretLabel(null), "Not verified");
  assert.equal(webhookDeliveryHostLabel({ delivery_host: "ecp.example.test", delivery_host_private: false }), "ecp.example.test");
  assert.equal(webhookDeliveryHostLabel({ delivery_host: "172.19.0.1", delivery_host_private: true }), "172.19.0.1 (private address)");
  assert.equal(webhookDeliveryHostLabel({ delivery_host: null }), "");
  const partial = { matching_hooks: 1, registered_events: ["mautic.email_on_send"], missing_events: ["mautic.email_on_open", "mautic.page_on_hit"] };
  assert.equal(webhookSubscribedLabel(partial), "1 of 3");
  assert.equal(webhookMissingEventsText(partial), "Not subscribed: Email opened, Link clicked");
  assert.equal(webhookSubscribedLabel({ matching_hooks: 0, missing_events: ALL_EVENTS }), "");
  assert.equal(webhookMissingEventsText({ matching_hooks: 0, missing_events: ALL_EVENTS }), "");
  assert.equal(hasWebhookVerification(LEGACY_WEBHOOK), false);
  assert.equal(hasWebhookVerification({ secret_matches: null }), true);
});

test("delivery evidence text", () => {
  assert.equal(webhookDeliveryText("accepted", { created: 2, duplicate: 1, ignored: 0, consent_synced: 1 }), "2 new, 1 duplicate, 0 ignored, 1 consent update");
  assert.equal(webhookDeliveryText("rejected", { reason: "invalid_signature" }), "Invalid signature");
  assert.equal(webhookDeliveryText("rejected", { reason: "too_many_events" }), "Too many events");
  assert.equal(webhookDeliveryText("failed", { failed: 2, error_types: ["OperationalError"] }), "2 events failed (OperationalError)");
  assert.equal(webhookDeliveryText("accepted", null), "");
});

test("Webhooks card shows registration, secret match, host, events and deliveries", async () => {
  serve({
    ...LEGACY_WEBHOOK,
    registration: "Registered",
    registration_detail: "A published Mautic webhook points at this receiver.",
    registered_events: ["mautic.email_on_send", "mautic.page_on_hit"],
    missing_events: ["mautic.email_on_open", "mautic.lead_channel_subscription_changed"],
    secret_matches: false,
    delivery_host: "172.19.0.1",
    delivery_host_private: true,
    matching_hooks: 1,
    deliveries: {
      observed: true,
      last_accepted: { at: "2026-10-15T06:14:41+00:00", created: 1, duplicate: 0, ignored: 0, consent_synced: 0 },
      last_rejected: { at: "2026-10-15T06:20:00+00:00", reason: "invalid_signature" },
      last_failed: null,
    },
  });
  await renderSettings();

  await waitFor(() => assert.ok(queryByText("Shared secret")));
  assert.equal(Boolean(queryByText("Registered")), true);
  assert.equal(Boolean(queryByText("A published Mautic webhook points at this receiver.")), true);
  assert.equal(Boolean(queryByText("Does not match")), true);
  assert.equal(Boolean(queryByText("172.19.0.1 (private address)")), true);
  assert.equal(Boolean(queryByText("2 of 4")), true);
  assert.equal(Boolean(queryByText("Not subscribed: Email opened, Subscription changed")), true);
  assert.equal(Boolean(queryByText(/· 1 new, 0 duplicate, 0 ignored$/)), true);
  assert.equal(Boolean(queryByText(/· Invalid signature$/)), true);
  assert.equal(Boolean(queryByText("None recorded")), true);
  // Existing fields are preserved.
  assert.equal(Boolean(queryByText("/api/newsletter/webhooks/mautic/")), true);
  assert.equal(Boolean(queryByText("Ready")), true);
  // Read-only: no control that could change Mautic's registration.
  assert.equal(Boolean(queryByText(/^(Register|Republish|Fix|Update) webhook/i, { selector: "button" })), false);
});

test("An older backend shows the original Webhooks card only", async () => {
  serve(LEGACY_WEBHOOK);
  await renderSettings();

  await waitFor(() => assert.ok(queryByText("Not Verifiable")));
  assert.equal(Boolean(queryByText("Shared secret")), false);
  assert.equal(Boolean(queryByText("Last accepted")), false);
});
