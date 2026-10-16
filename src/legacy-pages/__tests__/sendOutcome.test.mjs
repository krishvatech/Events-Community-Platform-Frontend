import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

import {
  React,
  all,
  cleanup,
  click,
  loadSource,
  queryByRole,
  queryByText,
  renderRoutes,
  router,
  waitFor,
} from "./helpers/blogDomHarness.mjs";

const { default: AdminNewsletterPage } = await loadSource("src/legacy-pages/AdminNewsletterPage.jsx");
const { Route } = router;
const h = React.createElement;

// Assertions only ever compare strings/booleans: a failing assert on a live
// jsdom node makes Node pretty-print the whole DOM graph and exhaust memory.

const UUID = "33333333-3333-4333-8333-333333333333";
const EVENT = "44444444-4444-4444-8444-444444444444";
const UNCERTAIN =
  "Mautic did not confirm this broadcast send. Delivery may have completed or may still be in progress, so it will not be retried automatically. (timeout)";

const CAMPAIGN = {
  uuid: UUID,
  name: "B11 Lost Response",
  subject: "Hello",
  preview_text: "",
  from_name: "IMAA Connect",
  from_email: "newsletter@example.test",
  html_content: "<p>Hello</p>",
  plain_text: "Hello",
  status: "sending",
  audiences: [{ slug: "imaa-events", name: "IMAA Events" }],
  scheduled_at: null,
  schedule_owner: "",
  send_started_at: "2026-10-14T09:00:00Z",
  sent_at: null,
  mautic_email_id: "88",
  last_synced_to_mautic_at: null,
  last_error: UNCERTAIN,
  created_at: "2026-10-14T08:00:00Z",
  updated_at: "2026-10-14T09:00:00Z",
};

const outcome = (overrides = {}) => ({
  observed_at: "2026-10-14T10:00:00Z",
  applicable: true,
  classification: "confirmed_sent",
  reason: "confirmed_sent",
  allowed_resolution: "confirmed_sent",
  explanation: "Mautic recorded sends for this email after this Send Now started.",
  investigation_complete: true,
  send_event: {
    event_uuid: EVENT,
    status: "processing",
    requested_at: "2026-10-14T08:59:58Z",
    processing_started_at: "2026-10-14T08:59:59Z",
    provider_send_started_at: "2026-10-14T09:00:00Z",
    uncertain_response: true,
  },
  evidence: {
    mautic_email_id: 88,
    sent_count: 3,
    stats: { since: 3, before_since: 0 },
    pending: 0,
    queued: 0,
    tracking_events_since_send: 1,
    limitations: "Recorded sends mean Mautic handed the message to the mail transport.",
  },
  ...overrides,
});

let campaign;
let inspection;
let gets;
let posts;
let onResolve;

function installApi() {
  campaign = { ...CAMPAIGN };
  inspection = { campaign: { status: "sending" }, send_outcome: outcome() };
  gets = [];
  posts = [];
  onResolve = async () => {
    campaign = { ...campaign, status: "sent", last_error: "" };
    return { data: { result: { new_state: "succeeded/sent" }, inspection: { send_outcome: { applicable: false } } } };
  };
  globalThis.__testApiClient = {
    get: async (url) => {
      gets.push(url);
      if (url === "/newsletter/admin/campaigns/") return { data: [campaign] };
      if (url === "/newsletter/admin/categories/") {
        return { data: [{ slug: "imaa-events", name: "IMAA Events", is_active: true }] };
      }
      if (url === `/newsletter/admin/campaigns/${UUID}/delivery-inspection/`) return { data: inspection };
      if (url === `/newsletter/admin/campaigns/${UUID}/`) return { data: campaign };
      return { data: {} };
    },
    post: async (url, payload) => {
      posts.push({ url, payload });
      if (url === `/newsletter/admin/campaigns/${UUID}/send-outcome/resolve/`) return onResolve(payload);
      throw new Error(`unexpected POST ${url}`);
    },
  };
}

async function renderAt(url) {
  return renderRoutes(
    [
      h(Route, { key: "list", path: "/admin/newsletter/broadcasts", element: h(AdminNewsletterPage) }),
      h(Route, { key: "detail", path: "/admin/newsletter/:campaignId", element: h(AdminNewsletterPage) }),
    ],
    { url }
  );
}

const hasText = (matcher) => queryByText(matcher) !== null;
const button = (name) => queryByRole("button", name);
const inspectionGets = () => gets.filter((url) => url.endsWith("/delivery-inspection/")).length;

async function renderDetail() {
  await renderAt(`/admin/newsletter/${UUID}`);
  await waitFor(() => assert.equal(Boolean(button("Investigate Send Outcome")), true));
}

beforeEach(() => installApi());
afterEach(async () => {
  await cleanup();
  delete globalThis.__testApiClient;
});

test("the list marks an unconfirmed send as uncertain, not failed", async () => {
  await renderAt("/admin/newsletter/broadcasts");
  await waitFor(() => assert.equal(hasText("Sending — Outcome Uncertain"), true));
  // The row's status chip, not the list's "Failed" filter tab.
  assert.equal(all(".MuiChip-label").some((chip) => chip.textContent.trim() === "Failed"), false);
});

test("the detail shows a protected warning and loads evidence only on request", async () => {
  await renderDetail();
  assert.equal(hasText("Provider Response Unavailable"), true);
  assert.equal(hasText(/never be retried or resent automatically/), true);
  assert.equal(all(".MuiAlert-standardError").length, 0);
  assert.equal(all(".MuiAlert-standardWarning").length > 0, true);
  assert.equal(inspectionGets(), 0);
  assert.equal(Boolean(button(/Retry|Resend|Send Again/)), false);
  assert.equal(Boolean(button("Send Now")), false);

  await click(button("Investigate Send Outcome"));
  await waitFor(() => assert.equal(hasText("Confirmed Sent"), true));
  assert.equal(inspectionGets(), 1);
  assert.equal(hasText(EVENT), true);
  assert.equal(hasText("Contacts still due"), true);
  assert.equal(hasText(/handed the message to the mail transport/), true);
  assert.equal(Boolean(button("Mark as Sent")), true);
  assert.equal(Boolean(button("Mark as Not Sent")), false);
});

test("a decision needs deliberate confirmation and sends no email", async () => {
  await renderDetail();
  await click(button("Investigate Send Outcome"));
  await waitFor(() => assert.equal(Boolean(button("Mark as Sent")), true));
  await click(button("Mark as Sent"));

  await waitFor(() => assert.equal(hasText(/No email will be sent\./), true));
  assert.equal(hasText(EVENT), true);
  assert.equal(button("Confirm Decision").disabled, true);
  await click(all("input[type='checkbox']")[0]);
  await waitFor(() => assert.equal(button("Confirm Decision").disabled, false));
  await click(button("Confirm Decision"));

  await waitFor(() => assert.equal(posts.length, 1));
  assert.deepEqual(posts[0].payload, {
    event_uuid: EVENT,
    resolution: "confirmed_sent",
    confirm: true,
    note: "",
  });
  assert.equal(posts.some((entry) => entry.url.endsWith("/send/")), false);
  // The broadcast is reloaded and now shows its resolved status.
  await waitFor(() => assert.equal(hasText("Completed"), true));
  assert.equal(Boolean(button("Investigate Send Outcome")), false);
});

test("unprovable evidence offers no decision", async () => {
  inspection = {
    send_outcome: outcome({
      classification: "uncertain",
      reason: "partially_sent",
      allowed_resolution: null,
      explanation: "Mautic recorded some sends, but contacts are still due.",
    }),
  };
  await renderDetail();
  await click(button("Investigate Send Outcome"));
  await waitFor(() => assert.equal(hasText("Outcome Uncertain"), true));
  assert.equal(Boolean(button("Mark as Sent")), false);
  assert.equal(Boolean(button("Mark as Not Sent")), false);
  assert.equal(hasText(/the send stays protected meanwhile/), true);
});

test("no sends recorded is shown as uncertain and never offers Not Sent, even if offered", async () => {
  inspection = {
    send_outcome: outcome({
      classification: "uncertain",
      reason: "no_sends_recorded",
      // An older backend offering the removed decision must still get no button.
      allowed_resolution: "confirmed_not_sent",
      explanation: "Mautic has recorded no send for this email yet. That does not prove nothing will be sent.",
    }),
  };
  await renderDetail();
  await click(button("Investigate Send Outcome"));
  await waitFor(() => assert.equal(hasText("Outcome Uncertain"), true));
  assert.equal(Boolean(button(/Not Sent/)), false);
  assert.equal(Boolean(button(/Mark as/)), false);
  assert.equal(hasText(/the send stays protected meanwhile/), true);
  assert.equal(hasText(/Confirmed Not Sent/), false);
});

test("a conflict refreshes the evidence and explains that nothing changed", async () => {
  onResolve = async () => {
    const error = new Error("HTTP 409");
    error.response = {
      status: 409,
      data: {
        code: "evidence_does_not_support",
        detail: "Current evidence does not support this decision (uncertain: partially_sent).",
        inspection: { send_outcome: outcome({ classification: "uncertain", allowed_resolution: null }) },
      },
    };
    throw error;
  };
  await renderDetail();
  await click(button("Investigate Send Outcome"));
  await waitFor(() => assert.equal(Boolean(button("Mark as Sent")), true));
  await click(button("Mark as Sent"));
  await click(all("input[type='checkbox']")[0]);
  await waitFor(() => assert.equal(button("Confirm Decision").disabled, false));
  await click(button("Confirm Decision"));

  await waitFor(() => assert.equal(hasText(/does not support this decision/), true));
  await waitFor(() => assert.equal(hasText("Outcome Uncertain"), true));
});

test("an investigation error is shown without changing anything", async () => {
  globalThis.__testApiClient.get = async (url) => {
    if (url.endsWith("/delivery-inspection/")) {
      const error = new Error("HTTP 503");
      error.response = { status: 503, data: { detail: "Mautic could not be read." } };
      throw error;
    }
    if (url === "/newsletter/admin/categories/") return { data: [] };
    return { data: campaign };
  };
  await renderDetail();
  await click(button("Investigate Send Outcome"));
  await waitFor(() => assert.equal(hasText("Mautic could not be read."), true));
  assert.equal(posts.length, 0);
});

test("a send that is merely in progress shows no uncertainty", async () => {
  campaign = { ...CAMPAIGN, last_error: "" };
  await renderDetail();
  assert.equal(hasText("Sending — Outcome Uncertain"), false);
  assert.equal(hasText(/Investigate if it stays in this state/), true);
});
