import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

import {
  React,
  act,
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

// B13: broadcast delivery investigation. Scenario IDs match the B13 plan.
// Assertions only ever compare strings/booleans: a failing assert on a live
// jsdom node makes Node pretty-print the whole DOM graph and exhaust memory.

const { default: AdminNewsletterPage } = await loadSource("src/pages/AdminNewsletterPage.jsx");
const { default: SendOutcomePanel } = await loadSource("src/pages/AdminNewsletterSendOutcomePanel.jsx");
const { Route } = router;
const h = React.createElement;

const UUID_A = "55555555-5555-4555-8555-555555555555";
const UUID_B = "66666666-6666-4666-8666-666666666666";
const EVENT = "77777777-7777-4777-8777-777777777777";
const LOST =
  "Mautic did not confirm this broadcast send. Delivery may have completed or may still be in progress, so it will not be retried automatically. (timeout)";

const base = {
  subject: "Hello", preview_text: "", from_name: "IMAA", from_email: "n@example.test",
  html_content: "<p>Hi</p>", plain_text: "Hi", audiences: [{ slug: "imaa-events", name: "IMAA Events" }],
  scheduled_at: null, schedule_owner: "", send_started_at: null, sent_at: null, mautic_email_id: "88",
  last_synced_to_mautic_at: null, last_error: "", created_at: "2026-10-14T08:00:00Z", updated_at: "2026-10-14T09:00:00Z",
};
const broadcast = (overrides) => ({ ...base, uuid: UUID_A, name: "B13 Broadcast", status: "sending", ...overrides });

const outcome = (overrides = {}) => ({
  observed_at: "2026-10-14T10:00:00Z", applicable: true, classification: "uncertain", reason: "no_sends_recorded",
  allowed_resolution: null, explanation: "Mautic has recorded no send for this email yet.",
  send_event: { event_uuid: EVENT, status: "processing", requested_at: "2026-10-14T08:59:58Z",
                provider_send_started_at: "2026-10-14T09:00:00Z", uncertain_response: true },
  evidence: { mautic_email_id: 88, mautic_observed_at: "2026-10-14T10:00:00Z", sent_count: 0,
              stats: { since: 0, before_since: 0 }, pending: 3, queued: 0, tracking_events_since_send: 0,
              limitations: "Recorded sends mean Mautic handed the message to the mail transport." },
  ...overrides,
});

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};
const httpError = (status, data = {}) => Object.assign(new Error(`HTTP ${status}`), { response: { status, data } });

let campaigns;
let gets;
let posts;
let onInspect;
let onResolve;

function installApi() {
  campaigns = { [UUID_A]: broadcast({ last_error: LOST }) };
  gets = [];
  posts = [];
  onInspect = async () => ({ data: { send_outcome: outcome() } });
  onResolve = async () => ({ data: { result: {}, inspection: { send_outcome: { applicable: false } } } });
  globalThis.__testApiClient = {
    get: async (url, config) => {
      gets.push({ url, config });
      if (url === "/newsletter/admin/campaigns/") return { data: Object.values(campaigns) };
      if (url === "/newsletter/admin/categories/") return { data: [{ slug: "imaa-events", name: "IMAA Events", is_active: true }] };
      const inspection = url.match(/\/campaigns\/([^/]+)\/delivery-inspection\/$/);
      if (inspection) return onInspect(inspection[1]);
      const detail = url.match(/\/campaigns\/([^/]+)\/$/);
      if (detail && campaigns[detail[1]]) return { data: campaigns[detail[1]] };
      return { data: {} };
    },
    post: async (url, payload) => {
      posts.push({ url, payload });
      if (url.endsWith("/send-outcome/resolve/")) return onResolve(payload);
      throw new Error(`unexpected POST ${url}`);
    },
  };
}

const detailRoute = () =>
  h(Route, { key: "detail", path: "/admin/newsletter/:campaignId", element: h(AdminNewsletterPage) });
const renderDetail = (uuid = UUID_A) => renderRoutes([detailRoute()], { url: `/admin/newsletter/${uuid}` });
const button = (name) => queryByRole("button", name);
const hasText = (matcher) => queryByText(matcher) !== null;
const inspections = () => gets.filter((entry) => entry.url.endsWith("/delivery-inspection/")).length;
const sendPosts = () => posts.filter((entry) => /\/send\/$/.test(entry.url)).length;
const unsafeButtons = () => Boolean(button(/Send Now|Retry|Resend|Not Sent|Force|Reset to Draft/));

async function openInvestigation() {
  await waitFor(() => assert.equal(Boolean(button("Investigate Send Outcome")), true));
  await click(button("Investigate Send Outcome"));
}

beforeEach(() => installApi());
afterEach(async () => {
  await cleanup();
  delete globalThis.__testApiClient;
});

test("B13-01/21 a draft keeps its normal editor and actions and is never investigated", async () => {
  campaigns[UUID_A] = broadcast({ status: "draft", mautic_email_id: null });
  await renderDetail();
  await waitFor(() => assert.equal(Boolean(button("Save Draft")), true));
  assert.equal(Boolean(button("Send Now")), true);
  assert.equal(Boolean(button("Investigate Send Outcome")), false);
  assert.equal(inspections(), 0);
});

test("B13-04 a sending broadcast exposes no resend action", async () => {
  campaigns[UUID_A] = broadcast({ last_error: "" });
  await renderDetail();
  await waitFor(() => assert.equal(Boolean(button("Investigate Send Outcome")), true));
  assert.equal(unsafeButtons(), false);
  assert.equal(hasText(/ECP has not recorded the outcome yet/), true);
});

test("an unrelated error on a sending broadcast is not called a lost provider response", async () => {
  campaigns[UUID_A] = broadcast({ last_error: "Some other recorded problem." });
  await renderAt("/admin/newsletter/broadcasts");
  await waitFor(() => assert.equal(all(".MuiChip-label").some((chip) => chip.textContent.trim() === "Sending"), true));
  assert.equal(hasText("Sending — Outcome Uncertain"), false);
});

async function renderAt(url) {
  return renderRoutes(
    [h(Route, { key: "list", path: "/admin/newsletter/broadcasts", element: h(AdminNewsletterPage) }), detailRoute()],
    { url }
  );
}

test("B13-05/06 zero sends: protected warning and an uncertain explanation with a safe next step", async () => {
  await renderDetail();
  await waitFor(() => assert.equal(hasText("Provider Response Unavailable"), true));
  assert.equal(hasText(/never be retried or resent automatically/), true);
  await openInvestigation();
  await waitFor(() => assert.equal(hasText("Outcome Uncertain"), true));
  assert.equal(hasText(/no send for this email yet/), true);
  assert.equal(hasText(/the send stays protected meanwhile/), true);
  assert.equal(unsafeButtons(), false);
  assert.equal(Boolean(button("Mark as Sent")), false);
});

test("B13-07 partial delivery explains who is still due and offers nothing", async () => {
  onInspect = async () => ({
    data: { send_outcome: outcome({ reason: "partially_sent", explanation: "Mautic recorded some sends.",
      evidence: { ...outcome().evidence, sent_count: 2, stats: { since: 2, before_since: 0 }, pending: 4 } }) },
  });
  await renderDetail();
  await openInvestigation();
  await waitFor(() => assert.equal(hasText("Contacts still due"), true));
  const rows = all("p").map((p) => p.textContent.trim());
  assert.equal(rows.includes("4"), true);
  assert.equal(Boolean(button(/Mark as/)), false);
});

test("B13-09 evidence unavailable is shown as such, with a safe next step", async () => {
  onInspect = async () => ({
    data: { send_outcome: outcome({ classification: "evidence_unavailable", reason: "evidence_unavailable",
      explanation: "Mautic could not be read.", evidence: null }) },
  });
  await renderDetail();
  await openInvestigation();
  await waitFor(() => assert.equal(hasText("Evidence Unavailable"), true));
  assert.equal(hasText(/Check Again when Mautic is reachable/), true);
  assert.equal(Boolean(button(/Mark as/)), false);
});

test("B13-10 a timed-out check does not freeze the panel and asks for a bounded request", async () => {
  onInspect = async () => { throw Object.assign(new Error("timeout"), { code: "ECONNABORTED" }); };
  await renderDetail();
  await openInvestigation();
  await waitFor(() => assert.equal(hasText(/timed out\. Nothing was changed/), true));
  assert.equal(button("Investigate Send Outcome").disabled, false);
  const request = gets.find((entry) => entry.url.endsWith("/delivery-inspection/"));
  assert.equal(request.config.timeout > 0, true);
});

test("B13-12 a permission error shows no privileged controls and no server detail", async () => {
  onInspect = async () => { throw httpError(403, { detail: "internal-permission-class-name" }); };
  await renderDetail();
  await openInvestigation();
  await waitFor(() => assert.equal(hasText("You do not have permission to do this."), true));
  assert.equal(hasText(/internal-permission-class-name/), false);
  assert.equal(Boolean(button(/Mark as/)), false);
});

test("server errors are shown generically, never as raw output", async () => {
  for (const status of [404, 429, 500, 502]) {
    onInspect = async () => { throw httpError(status, "<html>Traceback mautic-password=secret</html>"); };
    await renderDetail();
    await openInvestigation();
    await waitFor(() => assert.equal(hasText(/Nothing was changed|could not be found|Too many requests/), true));
    assert.equal(hasText(/Traceback|secret/), false);
    await cleanup();
  }
});

test("B13-13 a malformed response falls back safely", async () => {
  for (const data of ["<html>oops</html>", {}, null, { send_outcome: null }]) {
    onInspect = async () => ({ data });
    await renderDetail();
    await openInvestigation();
    await waitFor(() => assert.equal(hasText(/The response could not be read/), true));
    assert.equal(Boolean(button(/Mark as/)), false);
    await cleanup();
  }
});

test("B13-14 rapid Investigate clicks send one request", async () => {
  const pending = deferred();
  onInspect = () => pending.promise;
  await renderDetail();
  await waitFor(() => assert.equal(Boolean(button("Investigate Send Outcome")), true));
  const target = button("Investigate Send Outcome");
  await act(async () => { target.click(); target.click(); target.click(); });
  assert.equal(inspections(), 1);
  await act(async () => { pending.resolve({ data: { send_outcome: outcome() } }); await pending.promise; });
  await waitFor(() => assert.equal(hasText("Outcome Uncertain"), true));
  assert.equal(inspections(), 1);
});

test("the panel works under React StrictMode (mount, unmount, remount)", async () => {
  const campaign = broadcast({ last_error: LOST });
  await renderRoutes(
    [h(Route, { key: "s", path: "/", element: h(React.StrictMode, null, h(SendOutcomePanel, { campaign })) })],
    { url: "/" }
  );
  await click(button("Investigate Send Outcome"));
  await waitFor(() => assert.equal(hasText("Outcome Uncertain"), true));
  assert.equal(hasText("Checking…"), false);
});

test("B13-15 switching broadcasts never shows the previous broadcast's evidence", async () => {
  const slowA = deferred();
  onInspect = (uuid) => (uuid === UUID_A ? slowA.promise : Promise.resolve({ data: { send_outcome: outcome({
    send_event: { ...outcome().send_event, event_uuid: "B-EVENT" } }) } }));
  const campaignA = broadcast({ uuid: UUID_A, name: "Broadcast A", last_error: LOST });
  const campaignB = broadcast({ uuid: UUID_B, name: "Broadcast B", last_error: LOST });
  let switchTo;
  function Harness() {
    const [current, setCurrent] = React.useState(campaignA);
    switchTo = setCurrent;
    return h(SendOutcomePanel, { campaign: current });
  }
  await renderRoutes([h(Route, { key: "h", path: "/", element: h(Harness) })], { url: "/" });
  await click(button("Investigate Send Outcome"));            // A's request is still pending
  await act(async () => { switchTo(campaignB); });
  await act(async () => { slowA.resolve({ data: { send_outcome: outcome() } }); await slowA.promise; });
  assert.equal(hasText(EVENT), false);                         // A's late answer is dropped
  assert.equal(Boolean(button("Investigate Send Outcome")), true);
  await click(button("Investigate Send Outcome"));
  await waitFor(() => assert.equal(hasText("B-EVENT"), true));
  assert.equal(hasText(EVENT), false);
});

test("B13-16/17 a decision needs the checkbox, is submitted once, and refreshes the broadcast", async () => {
  const pendingResolve = deferred();
  onInspect = async () => ({ data: { send_outcome: outcome({ classification: "confirmed_sent", reason: "confirmed_sent",
    allowed_resolution: "confirmed_sent", explanation: "The original send completed." }) } });
  onResolve = () => pendingResolve.promise;
  await renderDetail();
  await openInvestigation();
  await waitFor(() => assert.equal(Boolean(button("Mark as Sent")), true));
  await click(button("Mark as Sent"));
  await waitFor(() => assert.equal(Boolean(button("Confirm Decision")), true));
  assert.equal(button("Confirm Decision").disabled, true);
  await click(all("input[type='checkbox']")[0]);
  await waitFor(() => assert.equal(button("Confirm Decision").disabled, false));
  const confirm = button("Confirm Decision");
  await act(async () => { confirm.click(); confirm.click(); });
  assert.equal(posts.length, 1);
  campaigns[UUID_A] = { ...campaigns[UUID_A], status: "sent", last_error: "" };
  await act(async () => {
    pendingResolve.resolve({ data: { result: {}, inspection: { send_outcome: { applicable: false } } } });
    await pendingResolve.promise;
  });
  await waitFor(() => assert.equal(hasText("Completed"), true));
  assert.equal(sendPosts(), 0);
});

test("B13-18 a refused decision leaves the send protected and keeps the explanation visible", async () => {
  onInspect = async () => ({ data: { send_outcome: outcome({ classification: "confirmed_sent", reason: "confirmed_sent",
    allowed_resolution: "confirmed_sent" }) } });
  onResolve = async () => {
    throw httpError(409, { code: "evidence_does_not_support", detail: "Current evidence does not support this decision.",
      inspection: { send_outcome: outcome({ reason: "partially_sent" }) } });
  };
  await renderDetail();
  await openInvestigation();
  await waitFor(() => assert.equal(Boolean(button("Mark as Sent")), true));
  await click(button("Mark as Sent"));
  await click(all("input[type='checkbox']")[0]);
  await waitFor(() => assert.equal(button("Confirm Decision").disabled, false));
  await click(button("Confirm Decision"));
  await waitFor(() => assert.equal(hasText(/does not support this decision/), true));
  assert.equal(button("Confirm Decision").disabled, true);    // no decision left to confirm
  assert.equal(hasText("Provider Response Unavailable"), true);
  assert.equal(sendPosts(), 0);
});

test("B13-22 analytics never present an unresolved send as 'No sends yet'", async () => {
  await renderDetail();
  await waitFor(() => assert.equal(hasText(/Delivery is not confirmed yet/), true));
  assert.equal(hasText(/No sends yet/), false);
});

test("native scheduled broadcasts show Mautic's delivery state read-only", async () => {
  campaigns[UUID_A] = broadcast({ status: "scheduled", schedule_owner: "mautic", last_error: "",
    scheduled_at: "2026-10-14T09:00:00Z" });
  onInspect = async () => ({ data: {
    checked_at: "2026-10-14T10:00:00Z", campaign: { scheduled_at: "2026-10-14T09:00:00Z", mautic_email_id: "88" },
    provider: { sent_count: 0 },
    delivery: { category: "native_due_no_sends_recorded", guidance: "Mautic has recorded no sends although the broadcast is past due." },
    send_outcome: { applicable: false },
  } });
  await renderDetail();
  await waitFor(() => assert.equal(Boolean(button("Check Delivery Status")), true));
  await click(button("Check Delivery Status"));
  await waitFor(() => assert.equal(hasText("Due — No Sends Recorded"), true));
  assert.equal(hasText(/no sends although the broadcast is past due/), true);
  assert.equal(Boolean(button(/Mark as/)), false);
  assert.equal(posts.length, 0);
});

test("an ECP-scheduled broadcast shows no delivery investigation", async () => {
  campaigns[UUID_A] = broadcast({ status: "scheduled", schedule_owner: "ecp", last_error: "" });
  await renderDetail();
  await waitFor(() => assert.equal(Boolean(button(/Reschedule|Schedule/)), true));
  assert.equal(Boolean(button(/Investigate|Check Delivery Status/)), false);
});
