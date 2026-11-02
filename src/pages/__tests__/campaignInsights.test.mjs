import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { React, all, cleanup, click, getByRole, loadSource, queryByText, renderRoutes, router, typeInto, waitFor } from "./helpers/blogDomHarness.mjs";

// Assertions compare strings/booleans only (a failing assert on a jsdom node
// serializes the whole DOM graph).

const { CampaignContactsPanel, CampaignStatsPanel } = await loadSource("src/components/marketing/CampaignInsights.jsx");
const { Route } = router;
const h = React.createElement;
const hasText = (matcher) => queryByText(matcher) !== null;

const STATS = {
  campaignId: "31",
  contacts: { current: 9, removed: 1 },
  events: [
    { id: 6, name: "Send welcome", type: "email.send", eventType: "action", parentId: null, decisionPath: null, deleted: false, processed: 4, pending: 6, yes: 10, no: 0, failed: 1 },
    { id: 7, name: "Opened?", type: "email.open", eventType: "decision", parentId: 6, decisionPath: null, deleted: false, processed: 5, pending: 0, yes: 3, no: 2, failed: 0 },
    { id: 8, name: "Old step", type: "lead.changetags", eventType: "action", parentId: null, decisionPath: null, deleted: true, processed: 2, pending: 0, yes: 2, no: 0, failed: 0 },
  ],
};

function installApi(handler) {
  const calls = [];
  globalThis.__testApiClient = {
    get: async (url, config) => {
      calls.push({ url, params: config?.params });
      return handler(url, config?.params || {});
    },
  };
  return calls;
}

const render = (element) => renderRoutes([h(Route, { key: "x", path: "/x", element })], { url: "/x" });

afterEach(async () => {
  await cleanup();
  delete globalThis.__testApiClient;
});

test("step statistics group steps, split decisions into yes/no and hide removed steps until asked", async () => {
  installApi(() => ({ data: STATS }));
  await render(h(CampaignStatsPanel, { campaignId: "31" }));
  await waitFor(() => assert.equal(hasText("In campaign: 9"), true));
  const action = all("table[aria-label='Actions statistics'] tbody tr[data-event-id]");
  assert.equal(action.length, 1);
  assert.equal(action[0].textContent.replace(/\s+/g, " ").includes("461"), true); // processed 4, pending 6, failed 1
  const decision = all("table[aria-label='Decisions statistics'] tbody tr[data-event-id='7'] td").map((cell) => cell.textContent);
  assert.equal(JSON.stringify(decision.slice(1)), JSON.stringify(["5", "0", "3", "2", "0"]));
  assert.equal(hasText("Old step"), false);
  await click(getByRole("checkbox", "Show removed steps"));
  await waitFor(() => assert.equal(hasText("Old step"), true));
});

test("campaign contacts are paged, searched with Enter and link to the contact", async () => {
  const calls = installApi((url, params) => ({
    data: {
      count: 26, page: params.page, page_size: 25, num_pages: 2,
      results: params.search
        ? [{ id: "71", email: "ann@x.test", name: "Ann Lee", dateAdded: "2026-11-01 10:00:00", manuallyAdded: true, lastActivity: null }]
        : [{ id: "70", email: "bob@x.test", name: "", dateAdded: "2026-11-01 09:00:00", manuallyAdded: false, lastActivity: "2026-11-02 08:00:00" }],
    },
  }));
  await render(h(CampaignContactsPanel, { campaignId: "31" }));
  await waitFor(() => assert.equal(all("table[aria-label='Contacts in campaign'] tbody tr[data-contact-id]").length, 1));
  assert.equal(getByRole("link", "bob@x.test").getAttribute("href"), "/admin/newsletter/contacts/70");
  assert.equal(hasText("Campaign source"), true);
  await click(getByRole("button", "Go to next page"));
  await waitFor(() => assert.equal(calls.at(-1).params.page, 2));
  const input = getByRole("textbox", "Search name or email");
  await typeInto(input, "ann");
  input.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  await waitFor(() => assert.equal(hasText("Ann Lee"), true));
  assert.equal(JSON.stringify(calls.at(-1).params), JSON.stringify({ page: 1, page_size: 25, search: "ann" }));
  assert.equal(calls.at(-1).url, "/newsletter/admin/mautic-campaigns/31/contacts/");
});
