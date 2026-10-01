import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

import {
  React,
  act,
  all,
  cleanup,
  click,
  getByRole,
  loadSource,
  queryByText,
  renderRoutes,
  router,
  typeInto,
  waitFor,
} from "./helpers/blogDomHarness.mjs";
import {
  broadcastRate,
  broadcastRateText,
  formatRate,
} from "../newsletterBroadcastState.js";

const { default: AdminNewsletterPage } = await loadSource("src/pages/AdminNewsletterPage.jsx");
const { Route } = router;
const h = React.createElement;

// Assertions only ever compare strings/booleans: a failing assert on a live
// jsdom node makes Node pretty-print the whole DOM graph and exhaust memory.

const base = {
  preview_text: "",
  from_name: "IMAA Connect",
  from_email: "newsletter@example.test",
  html_content: "<p>Hello</p>",
  plain_text: "Hello",
  audiences: [{ slug: "imaa-events", name: "IMAA Events" }],
  scheduled_at: null,
  schedule_owner: "",
  send_started_at: null,
  sent_at: null,
  mautic_email_id: null,
  last_synced_to_mautic_at: null,
  last_error: "",
  created_at: "2026-09-29T10:00:00Z",
  updated_at: "2026-09-29T10:00:00Z",
};
const uid = (n) => `${n}${n}${n}${n}${n}${n}${n}${n}-0000-4000-8000-00000000000${n}`;
const DRAFT = { ...base, uuid: uid(1), name: "Draft Broadcast", subject: "Draft subject", status: "draft" };
const ENGAGED = { ...base, uuid: uid(2), name: "Engaged Broadcast", subject: "Engaged subject", status: "sent", mautic_email_id: "77" };
const QUIET = { ...base, uuid: uid(3), name: "Quiet Broadcast", subject: "Quiet subject", status: "sent" };
const DOWN = { ...base, uuid: uid(4), name: "Down Broadcast", subject: "Down subject", status: "sent", mautic_email_id: "79" };
const ROWS = [DRAFT, ENGAGED, QUIET, DOWN];

const analytics = ({ sent, delivered = 0, opens = 0, clicks = 0, bounced = 0, unsub = 0, openRate, clickRate, mautic }) => ({
  send_summary: { sent_count: sent, failed_count: 0 },
  engagement: {
    delivered_count: delivered,
    opened_count: opens,
    unique_open_count: opens,
    clicked_count: clicks,
    unique_click_count: clicks,
    bounced_count: bounced,
    unsubscribe_count: unsub,
  },
  rates: { open_rate: openRate, click_rate: clickRate, unsubscribe_rate: 0 },
  metadata: mautic || { mautic_email_id: null, mautic_available: false, send_summary_source: "ecp" },
});
const SUMMARY = {
  [ENGAGED.uuid]: analytics({
    sent: 4, opens: 2, clicks: 1, bounced: 1, unsub: 1, openRate: 0.5, clickRate: 0.25,
    mautic: { mautic_email_id: "77", mautic_available: true, send_summary_source: "mautic" },
  }),
  [QUIET.uuid]: analytics({ sent: 10, openRate: 0, clickRate: 0 }),
  [DOWN.uuid]: analytics({
    sent: 0, openRate: 0, clickRate: 0,
    mautic: { mautic_email_id: "79", mautic_available: false, send_summary_source: "" },
  }),
};

let gets;

function installApi({ summary = async () => ({ data: { results: SUMMARY } }), detailAnalytics } = {}) {
  gets = [];
  globalThis.__testApiClient = {
    get: async (url, config) => {
      gets.push({ url, params: config?.params });
      if (url === "/newsletter/admin/campaigns/") return { data: ROWS };
      if (url === "/newsletter/admin/campaigns/analytics-summary/") return summary(config?.params);
      if (url === "/newsletter/admin/categories/") {
        return { data: [{ slug: "imaa-events", name: "IMAA Events", is_active: true }] };
      }
      const analyticsMatch = url.match(/^\/newsletter\/admin\/campaigns\/([^/]+)\/analytics\/$/);
      if (analyticsMatch) return detailAnalytics(analyticsMatch[1]);
      const detailMatch = url.match(/^\/newsletter\/admin\/campaigns\/([^/]+)\/$/);
      if (detailMatch) return { data: ROWS.find((row) => row.uuid === detailMatch[1]) };
      return { data: {} };
    },
    post: async (url) => {
      throw new Error(`unexpected POST ${url}`);
    },
  };
}

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

async function renderAt(url) {
  return renderRoutes(
    [
      h(Route, { key: "list", path: "/admin/newsletter/broadcasts", element: h(AdminNewsletterPage) }),
      h(Route, { key: "detail", path: "/admin/newsletter/:campaignId", element: h(AdminNewsletterPage) }),
    ],
    { url }
  );
}

/** Open Rate / Click Rate cell text of a list row, by broadcast name. */
const rowRates = (name) => {
  const row = all("tbody tr").find((tr) => tr.textContent.includes(name));
  if (!row) return null;
  const cells = [...row.querySelectorAll("td")];
  return { open: cells[6].textContent.trim(), click: cells[7].textContent.trim() };
};
const summaryGets = () => gets.filter((entry) => entry.url.endsWith("/analytics-summary/"));

/** The value shown in a metric card of the editor's analytics panel. */
const metric = (label) => {
  const labelNode = all("p").find((node) => node.textContent.trim() === label);
  if (!labelNode) return null;
  return labelNode.parentElement.textContent.slice(label.length).trim();
};

beforeEach(() => installApi());
afterEach(async () => {
  await cleanup();
  delete globalThis.__testApiClient;
});

// ------------------------------------------------------------------- list --

test("list shows real rates, real zeros, neutral drafts and unavailable rows", async () => {
  await renderAt("/admin/newsletter/broadcasts");

  await waitFor(() => assert.equal(rowRates("Engaged Broadcast")?.open, "50%"));
  assert.deepEqual(rowRates("Engaged Broadcast"), { open: "50%", click: "25%" });
  assert.deepEqual(rowRates("Quiet Broadcast"), { open: "0%", click: "0%" });
  assert.deepEqual(rowRates("Draft Broadcast"), { open: "—", click: "—" });
  assert.deepEqual(rowRates("Down Broadcast"), { open: "Unavailable", click: "Unavailable" });
  assert.equal(queryByText("No data available") === null, true);
});

test("list loads analytics in one request for sent broadcasts only", async () => {
  await renderAt("/admin/newsletter/broadcasts");

  await waitFor(() => assert.equal(rowRates("Engaged Broadcast")?.open, "50%"));
  assert.equal(summaryGets().length, 1);
  assert.equal(summaryGets()[0].params.uuids, [ENGAGED.uuid, QUIET.uuid, DOWN.uuid].join(","));
  assert.equal("refresh" in summaryGets()[0].params, false);
  assert.equal(gets.some((entry) => /\/analytics\/$/.test(entry.url)), false, "no per-row requests");
});

test("list Refresh asks for fresh analytics", async () => {
  await renderAt("/admin/newsletter/broadcasts");
  await waitFor(() => assert.equal(rowRates("Engaged Broadcast")?.open, "50%"));

  await click(getByRole("button", "Refresh"));

  await waitFor(() => assert.equal(summaryGets().length, 2));
  assert.equal(summaryGets()[1].params.refresh, 1);
});

test("a failed summary leaves the list usable and marks only sent rows unavailable", async () => {
  installApi({
    summary: async () => {
      throw new Error("Network Error");
    },
  });
  await renderAt("/admin/newsletter/broadcasts");

  await waitFor(() => assert.equal(rowRates("Engaged Broadcast")?.open, "Unavailable"));
  assert.deepEqual(rowRates("Draft Broadcast"), { open: "—", click: "—" });
  assert.equal(all("tbody tr").length, ROWS.length, "every broadcast is still listed");
});

test("list filters keep working with analytics loaded", async () => {
  await renderAt("/admin/newsletter/broadcasts");
  await waitFor(() => assert.equal(rowRates("Engaged Broadcast")?.open, "50%"));

  await click(getByRole("tab", "Draft"));

  await waitFor(() => assert.equal(all("tbody tr").length, 1));
  assert.deepEqual(rowRates("Draft Broadcast"), { open: "—", click: "—" });
  assert.equal(summaryGets().length, 1, "filtering does not refetch analytics");
});

// ----------------------------------------------------------------- editor --

test("editor shows the analytics it already fetches, mapped to the right fields", async () => {
  installApi({ detailAnalytics: async () => ({ data: SUMMARY[ENGAGED.uuid] }) });
  await renderAt(`/admin/newsletter/${ENGAGED.uuid}`);

  await waitFor(() => assert.equal(metric("Open Rate"), "50%"));
  assert.equal(metric("Sent"), "4");
  assert.equal(metric("Unique Opens"), "2");
  assert.equal(metric("Unique Clicks"), "1");
  assert.equal(metric("Click Rate"), "25%");
  assert.equal(metric("Bounced"), "1");
  assert.equal(metric("Unsubscribed"), "1");
  const analyticsGets = gets.filter((entry) => /\/analytics\/$/.test(entry.url));
  assert.equal(analyticsGets.length, 1, "exactly the one existing analytics request");
  assert.equal(summaryGets().length, 0);
});

test("editor shows real 0% for a sent broadcast without engagement", async () => {
  installApi({ detailAnalytics: async () => ({ data: SUMMARY[QUIET.uuid] }) });
  await renderAt(`/admin/newsletter/${QUIET.uuid}`);

  await waitFor(() => assert.equal(metric("Open Rate"), "0%"));
  assert.equal(metric("Click Rate"), "0%");
  assert.equal(metric("Sent"), "10");
  assert.equal(queryByText(/No sends yet/) === null, true);
});

test("editor shows a no-sends state for a draft", async () => {
  installApi({ detailAnalytics: async () => ({ data: analytics({ sent: 0, openRate: 0, clickRate: 0 }) }) });
  await renderAt(`/admin/newsletter/${DRAFT.uuid}`);

  await waitFor(() => assert.equal(queryByText(/No sends yet/) !== null, true));
  assert.equal(metric("Open Rate"), "—");
  assert.equal(metric("Click Rate"), "—");
});

test("a synced draft stays 'no sends' even when Mautic is unavailable", async () => {
  // Found in local E2E: the list shows "—" by status, so the editor must too.
  installApi({
    detailAnalytics: async () => ({
      data: analytics({
        sent: 0, openRate: 0, clickRate: 0,
        mautic: { mautic_email_id: "90", mautic_available: false, send_summary_source: "" },
      }),
    }),
  });
  await renderAt(`/admin/newsletter/${DRAFT.uuid}`);

  await waitFor(() => assert.equal(queryByText(/No sends yet/) !== null, true));
  assert.equal(metric("Open Rate"), "—");
  assert.equal(queryByText(/temporarily unavailable/) === null, true);
});

test("editor shows skeletons while analytics load and the content is already editable", async () => {
  const pending = deferred();
  installApi({ detailAnalytics: () => pending.promise });
  await renderAt(`/admin/newsletter/${ENGAGED.uuid}`);

  await waitFor(() => assert.equal(queryByText("Broadcast Analytics") !== null, true));
  const panel = queryByText("Broadcast Analytics").closest(".MuiPaper-root");
  assert.equal(panel.querySelectorAll(".MuiSkeleton-root").length > 0, true);

  await act(async () => {
    pending.resolve({ data: SUMMARY[ENGAGED.uuid] });
  });
  await waitFor(() => assert.equal(metric("Open Rate"), "50%"));
});

test("an analytics failure does not break the editor or its content", async () => {
  installApi({
    detailAnalytics: async () => {
      const error = new Error("Request failed with status code 502");
      error.response = { status: 502, data: { detail: "Mautic stats unavailable." } };
      throw error;
    },
  });
  const view = await renderAt(`/admin/newsletter/${ENGAGED.uuid}`);

  await waitFor(() => assert.equal(queryByText(/Mautic stats unavailable\./) !== null, true));
  assert.equal(view.path(), `/admin/newsletter/${ENGAGED.uuid}`);
  const subject = getByRole("textbox", "Subject");
  assert.equal(subject.value, "Engaged subject");
  await typeInto(subject, "Edited subject");
  assert.equal(getByRole("textbox", "Subject").value, "Edited subject");
  assert.equal(metric("Open Rate"), "—");
});

test("editor reports Mautic-unavailable statistics instead of showing 0%", async () => {
  installApi({ detailAnalytics: async () => ({ data: SUMMARY[DOWN.uuid] }) });
  await renderAt(`/admin/newsletter/${DOWN.uuid}`);

  await waitFor(() => assert.equal(queryByText(/Mautic statistics are temporarily unavailable/) !== null, true));
  assert.equal(metric("Open Rate"), "Unavailable");
  // Mautic-sourced counts are not shown as 0; ECP-sourced clicks still are real.
  assert.equal(metric("Unique Opens"), "Unavailable");
  assert.equal(metric("Sent"), "Unavailable");
  assert.equal(metric("Unique Clicks"), "0");
});

test("with Mautic down, sends recorded by ECP stay visible", async () => {
  installApi({
    detailAnalytics: async () => ({
      data: analytics({
        sent: 10, openRate: 0, clickRate: 0,
        mautic: { mautic_email_id: "91", mautic_available: false, send_summary_source: "ecp" },
      }),
    }),
  });
  await renderAt(`/admin/newsletter/${QUIET.uuid}`);

  await waitFor(() => assert.equal(metric("Open Rate"), "Unavailable"));
  assert.equal(metric("Sent"), "10");
  assert.equal(metric("Unique Opens"), "Unavailable");
});

// ------------------------------------------------------------- semantics --

test("rate formatting keeps one decimal and separates null from zero", () => {
  assert.equal(formatRate(0.5), "50%");
  assert.equal(formatRate(0.42345), "42.3%");
  assert.equal(formatRate(0.004), "0.4%");
  assert.equal(formatRate(0), "0%");
  assert.equal(formatRate(null), "");
  assert.equal(formatRate(undefined), "");

  const sent = analytics({ sent: 10, openRate: 0, clickRate: 0 });
  const never = analytics({ sent: 0, openRate: 0, clickRate: 0 });
  assert.equal(broadcastRateText(sent, "open_rate"), "0%");
  assert.equal(broadcastRateText(never, "open_rate"), "—");
  assert.equal(broadcastRate(undefined, "open_rate").kind, "loading");
  assert.equal(broadcastRate({ error: "unavailable" }, "open_rate").kind, "unavailable");
  // Delivered is the denominator when reported, as in the backend.
  const delivered = analytics({ sent: 0, delivered: 8, openRate: 0.25, clickRate: 0 });
  assert.equal(broadcastRateText(delivered, "open_rate"), "25%");
});
