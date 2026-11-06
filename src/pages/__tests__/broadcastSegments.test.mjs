import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

import {
  React,
  all,
  cleanup,
  click,
  getByRole,
  loadSource,
  queryByRole,
  queryByText,
  renderRoutes,
  router,
  typeInto,
  waitFor,
} from "./helpers/blogDomHarness.mjs";

const { default: AdminNewsletterPage } = await loadSource("src/pages/AdminNewsletterPage.jsx");
const { segmentPickerRows, selectedSegmentNames } = await loadSource("src/components/marketing/BroadcastSegmentPicker.jsx");
const {
  ECP_NEWSLETTER_ENABLED,
  getMarketingSectionFromPath,
  visibleMarketingNavigationGroups,
} = await loadSource("src/config/marketingNavigation.js");
const { blankTemplate } = await loadSource("src/pages/newsletterTemplateShared.jsx");
const { Route } = router;
const h = React.createElement;

// Mautic's own "E-mail address to send mail from" setting. The Hub saves a sender
// on every email, which overrides that setting, so the two have to match.
const DEFAULT_SENDER = { name: "IMAA Connect", email: "no-reply@news.imaa-institute.org" };

// Assertions compare strings/booleans only: a failing assert on a live jsdom
// node serializes the whole DOM graph and exhausts memory.

const SEGMENTS = [
  { id: "7", name: "Investors", isPublished: true, is_dynamic: false, is_static: true, contact_count: null },
  { id: "9", name: "Bankers", isPublished: true, is_dynamic: true, is_static: false, contact_count: 1200 },
  { id: "12", name: "Hidden Draft Segment", isPublished: false, is_dynamic: false, is_static: true, contact_count: null },
];
const DRAFT = {
  uuid: "33333333-3333-4333-8333-333333333333",
  name: "October",
  subject: "October news",
  preview_text: "",
  from_name: "IMAA Connect",
  from_email: "sender@example.test",
  html_content: "<p>Body</p>",
  plain_text: "Body",
  status: "draft",
  audiences: [],
  segments: [{ id: "7", name: "Investors" }],
  scheduled_at: null,
  schedule_owner: "",
  send_started_at: null,
  sent_at: null,
  mautic_email_id: "50",
  last_synced_to_mautic_at: null,
  last_error: "",
  created_at: "2026-10-16T10:00:00Z",
  updated_at: "2026-10-16T10:00:00Z",
};
const SENT = { ...DRAFT, uuid: "44444444-4444-4444-8444-444444444444", status: "sent", sent_at: "2026-10-16T11:00:00Z" };

let calls;
let segmentsResponse;

function installApi() {
  calls = [];
  segmentsResponse = async () => ({ data: SEGMENTS });
  const byUuid = { [DRAFT.uuid]: DRAFT, [SENT.uuid]: SENT };
  globalThis.__testApiClient = {
    get: async (url) => {
      calls.push({ method: "get", url });
      if (url === "/newsletter/admin/mautic/segments/") return segmentsResponse();
      if (url === "/newsletter/admin/templates/tokens/") return { data: { results: [] } };
      const match = url.match(/^\/newsletter\/admin\/campaigns\/([^/]+)\/$/);
      if (match && byUuid[match[1]]) return { data: byUuid[match[1]] };
      return { data: {} };
    },
    post: async (url, payload) => {
      calls.push({ method: "post", url, payload });
      if (url === "/newsletter/admin/campaigns/") return { data: { ...DRAFT, ...payload, segments: [] } };
      return { data: DRAFT };
    },
    patch: async (url, payload) => {
      calls.push({ method: "patch", url, payload });
      return { data: DRAFT };
    },
    put: async () => ({ data: {} }),
    delete: async () => ({ data: {} }),
  };
}

const render = (url) => renderRoutes(
  [
    h(Route, { key: "new", path: "/admin/newsletter/new", element: h(AdminNewsletterPage) }),
    h(Route, { key: "one", path: "/admin/newsletter/:campaignId", element: h(AdminNewsletterPage) }),
  ],
  { url },
);
const openSegments = async (url) => {
  await render(url);
  await waitFor(() => getByRole("tab", "Segments"));
  await click(getByRole("tab", "Segments"));
};
const hasText = (matcher) => queryByText(matcher) !== null;
const checkbox = (name) => queryByRole("checkbox", new RegExp(name));

beforeEach(installApi);
afterEach(cleanup);

test("the Hub menu hides Subscription Lists but keeps Broadcasts and Segments", () => {
  assert.equal(ECP_NEWSLETTER_ENABLED, false);
  const ids = visibleMarketingNavigationGroups.flatMap((group) => group.items.map((item) => item.id));
  assert.equal(ids.includes("lists"), false);
  assert.equal(ids.includes("broadcasts"), true);
  assert.equal(ids.includes("segments"), true);
  // Its code stays routable the moment the switch is on.
  assert.equal(getMarketingSectionFromPath("/admin/newsletter/lists"), "lists");
});

test("picker rows offer published segments and keep a chosen one that left", () => {
  const options = SEGMENTS.filter((segment) => segment.isPublished);
  const rows = segmentPickerRows({ options, selectedIds: ["7", "33"], savedSegments: [{ id: "33", name: "Old" }], loaded: true });
  assert.deepEqual(rows.map((row) => row.id), ["33", "7", "9"]);
  assert.equal(rows[0].name, "Old");
  assert.equal(rows[0].unavailable, true);
  assert.equal(Boolean(rows[1].unavailable), false);
});

test("a chosen segment is not called unavailable while the list has not loaded", () => {
  const rows = segmentPickerRows({ options: [], selectedIds: ["7"], savedSegments: [{ id: "7", name: "Investors" }], loaded: false });
  assert.equal(rows[0].name, "Investors");
  assert.equal(rows[0].unavailable, false);
});

test("read-only rows are only the chosen segments", () => {
  const rows = segmentPickerRows({ options: SEGMENTS, selectedIds: ["9"], loaded: true, readOnly: true });
  assert.deepEqual(rows.map((row) => row.id), ["9"]);
  assert.deepEqual(selectedSegmentNames({ options: SEGMENTS, selectedIds: ["9", "44"] }), ["Bankers", "Segment 44"]);
});

test("the form offers published Mautic segments, with no Subscription List wording", async () => {
  await openSegments("/admin/newsletter/new");
  await waitFor(() => assert.ok(checkbox("Investors")));
  assert.ok(checkbox("Bankers"));
  assert.equal(checkbox("Hidden Draft Segment"), null);
  assert.equal(hasText(/Subscription List/i), false);
  assert.equal(hasText("1,200 contacts"), true);
  assert.equal(calls.some((call) => call.url === "/newsletter/admin/categories/"), false);
});

test("a new broadcast cannot be saved without a segment", async () => {
  await render("/admin/newsletter/new");
  await waitFor(() => getByRole("button", "Save Draft"));
  await typeInto(getByRole("textbox", /Broadcast Name/), "New one");
  await typeInto(getByRole("textbox", /^Subject/), "Subject");
  await click(getByRole("button", "Save Draft"));
  await click(getByRole("tab", "Segments"));
  await waitFor(() => assert.equal(hasText("Select at least one segment."), true));
  assert.equal(calls.some((call) => call.method === "post"), false);
});

test("saving sends the chosen segment ids as numbers", async () => {
  await openSegments(`/admin/newsletter/${DRAFT.uuid}`);
  await waitFor(() => assert.ok(checkbox("Bankers")));
  assert.equal(checkbox("Investors").checked, true);
  await click(checkbox("Bankers"));
  await click(getByRole("button", "Save Draft"));
  await waitFor(() => assert.ok(calls.some((call) => call.method === "patch")));
  const saved = calls.find((call) => call.method === "patch").payload;
  assert.deepEqual(saved.segment_ids, [7, 9]);
  assert.equal("audience_slugs" in saved, false);
});

test("a segment that left Mautic is flagged and can be unticked", async () => {
  segmentsResponse = async () => ({ data: SEGMENTS.filter((segment) => segment.id !== "7") });
  await openSegments(`/admin/newsletter/${DRAFT.uuid}`);
  await waitFor(() => assert.equal(hasText(/No longer available in Mautic/), true));
  await click(checkbox("Investors"));
  await waitFor(() => assert.equal(checkbox("Investors"), null));
});

test("Mautic being down does not stop a draft opening, and Retry recovers", async () => {
  segmentsResponse = async () => {
    throw Object.assign(new Error("down"), { response: { data: { detail: "Mautic is temporarily unavailable." } } });
  };
  await openSegments(`/admin/newsletter/${DRAFT.uuid}`);
  await waitFor(() => assert.equal(hasText("Mautic is temporarily unavailable."), true));
  assert.ok(checkbox("Investors"));
  assert.equal(hasText(/No longer available/), false);
  segmentsResponse = async () => ({ data: SEGMENTS });
  await click(getByRole("button", "Retry"));
  await waitFor(() => assert.ok(checkbox("Bankers")));
});

test("a sent broadcast shows only its segment, read-only", async () => {
  await openSegments(`/admin/newsletter/${SENT.uuid}`);
  await waitFor(() => assert.ok(checkbox("Investors")));
  assert.equal(all('input[type="checkbox"]').length, 1);
  assert.equal(checkbox("Investors").disabled, true);
  assert.equal(queryByRole("textbox", "Search segments"), null);
});

test("the default email carries an unsubscribe link", async () => {
  await render("/admin/newsletter/new");
  await waitFor(() => getByRole("button", "Save Draft"));
  await typeInto(getByRole("textbox", /Broadcast Name/), "With footer");
  await typeInto(getByRole("textbox", /^Subject/), "Subject");
  await click(getByRole("tab", "Segments"));
  await waitFor(() => assert.ok(checkbox("Investors")));
  await click(checkbox("Investors"));
  await click(getByRole("button", "Save Draft"));
  await waitFor(() => assert.ok(calls.some((call) => call.method === "post" && call.url === "/newsletter/admin/campaigns/")));
  const body = calls.find((call) => call.method === "post" && call.url === "/newsletter/admin/campaigns/").payload;
  assert.equal(body.html_content.includes('href="{unsubscribe_url}"'), true);
  assert.equal(body.plain_text.includes("{unsubscribe_url}"), true);
  assert.equal(body.from_name, DEFAULT_SENDER.name);
  assert.equal(body.from_email, DEFAULT_SENDER.email);
});

test("a new Template starts with the same sender as a new Broadcast", () => {
  assert.equal(blankTemplate.fromName, DEFAULT_SENDER.name);
  assert.equal(blankTemplate.fromAddress, DEFAULT_SENDER.email);
});
