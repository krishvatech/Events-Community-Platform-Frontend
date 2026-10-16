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

const { Route } = router;
const h = React.createElement;

// Assertions only ever compare strings/booleans: a failing assert on a live
// jsdom node makes Node pretty-print the whole DOM graph and exhaust memory.

const { default: AdminNewsletterPage } = await loadSource("src/legacy-pages/AdminNewsletterPage.jsx");

const DIAGNOSTICS_URL = "/newsletter/admin/settings/mautic-diagnostics/";

const component = (name, status, detail, extra = {}) => ({
  component: name,
  status,
  reason: "",
  detail,
  last_success_at: null,
  last_attempt_at: null,
  ...extra,
});

let requests;

function serve(diagnostics) {
  globalThis.__testApiClient = {
    get: async (url) => {
      requests.push(url);
      if (url === DIAGNOSTICS_URL) return { data: diagnostics };
      return { data: { results: [] } };
    },
  };
}

const BASE = {
  connection: { status: "Healthy", configured: true, reachable: true, authenticated: true },
  diagnostics: { status: "Healthy", warnings: [] },
};

async function renderSettings() {
  await renderRoutes(
    [h(Route, { key: "settings", path: "/admin/newsletter/settings", element: h(AdminNewsletterPage) })],
    { url: "/admin/newsletter/settings" }
  );
  await waitFor(() => assert.ok(queryByText("Mautic Instance")));
}

beforeEach(() => {
  signIn({ superuser: true });
  requests = [];
});

afterEach(async () => {
  await cleanup();
  delete globalThis.__testApiClient;
});

test("Scheduler Health shows each scheduler with its own status and explains problems", async () => {
  serve({
    ...BASE,
    scheduler_monitoring: {
      status: "Unhealthy",
      components: {
        celery_beat: component("Celery Beat", "Unhealthy", "Celery Beat has stopped publishing scheduled tasks.", {
          last_success_at: "2026-10-14T04:00:00+00:00",
        }),
        scheduled_tasks: component("Scheduled task execution", "Healthy", "Scheduled newsletter tasks are being executed by a worker."),
        celery_worker: component("Celery worker", "Healthy", "1 worker(s) answered a ping."),
        redis_broker: component("Redis broker", "Healthy", "The broker answered a ping."),
        mautic_cron: component("Mautic cron", "Warning", "A Mautic cron job is running later than scheduled."),
        mautic_worker: component("Mautic worker", "Unknown", "Mautic could not be reached, so its background evidence is unavailable."),
      },
    },
  });
  await renderSettings();

  await waitFor(() => assert.ok(queryByText("Scheduler Health")));
  for (const label of ["Celery Beat", "Scheduled task execution", "Celery Worker", "Redis Broker", "Mautic Cron", "Mautic Worker"]) {
    assert.equal(Boolean(queryByText(label)), true, label);
  }
  assert.equal(Boolean(queryByText("Celery Beat has stopped publishing scheduled tasks.")), true);
  assert.equal(Boolean(queryByText("A Mautic cron job is running later than scheduled.")), true);
  // Healthy components do not repeat their detail text.
  assert.equal(Boolean(queryByText("The broker answered a ping.")), false);
  assert.equal(Boolean(queryByText("Warning")), true);
  assert.equal(Boolean(queryByText("Unknown")), true);
  // Loaded with the diagnostics request itself; no extra polling endpoint.
  assert.equal(requests.filter((url) => url === DIAGNOSTICS_URL).length, 1);
  assert.equal(requests.some((url) => /scheduler|background-health/.test(url)), false);
});

test("An older backend without scheduler monitoring shows no Scheduler Health card", async () => {
  serve(BASE);
  await renderSettings();
  assert.equal(Boolean(queryByText("Scheduler Health")), false);
});
