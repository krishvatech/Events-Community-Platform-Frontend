process.env.TZ = "UTC";

import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

import {
  React,
  cleanup,
  click,
  getByRole,
  loadSource,
  queryByRole,
  queryByText,
  renderRoutes,
  router,
  waitFor,
} from "./helpers/blogDomHarness.mjs";

// Assertions compare strings/booleans only (see broadcastDuplicate.test.mjs).

const page = await loadSource("src/pages/AdminNewsletterCalendarPage.jsx");
const CalendarPage = page.default;
const { Route } = router;
const h = React.createElement;

const now = new Date();
const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
const at = (day, hour = 9) => `${ym}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:00:00+00:00`;
const ITEMS = [
  { kind: "broadcast_scheduled", id: "b1", at: at(10), title: "Weekly digest", subtitle: "Hello", resourceId: "uuid-1", lists: ["Weekly"] },
  { kind: "campaign_step", id: "c1", at: at(10, 11), title: "Send welcome", subtitle: "Onboarding", resourceId: 7, count: 42 },
  { kind: "page_publish", id: "p1", at: at(10, 12), title: "Summit page", resourceId: 51 },
  { kind: "report_email", id: "r1", at: at(10, 13), title: "Weekly sends", subtitle: "Weekly", resourceId: 4, count: 2 },
  { kind: "asset_unpublish", id: "a1", at: at(12), title: "Old guide", resourceId: 12 },
];

let calls;
let payload;

beforeEach(() => {
  calls = [];
  payload = { items: ITEMS, truncated: false, warning: "" };
  globalThis.__testApiClient = {
    get: async (url, config) => {
      calls.push({ url, params: config?.params });
      return { data: payload };
    },
  };
});

afterEach(async () => {
  await cleanup();
  delete globalThis.__testApiClient;
});

const hasText = (matcher) => queryByText(matcher) !== null;
const render = () => renderRoutes(
  [
    h(Route, { key: "calendar", path: "/admin/newsletter/calendar", element: h(CalendarPage) }),
    h(Route, { key: "any", path: "/admin/newsletter/*", element: h("p", null, "opened") }),
  ],
  { url: "/admin/newsletter/calendar" }
);

test("helpers: a Monday-first six-week grid, the fetch window and links", () => {
  const grid = page.monthGrid(new Date(2026, 10, 15));
  assert.equal(grid.length, 42);
  assert.equal(page.dayKey(grid[0]), "2026-10-26");
  assert.equal(grid[0].getDay(), 1);
  assert.equal(JSON.stringify(page.fetchWindow(grid[0], grid[41])), JSON.stringify({ from: "2026-10-25", to: "2026-12-08" }));
  assert.equal(page.itemLink(ITEMS[0]), "/admin/newsletter/uuid-1");
  assert.equal(page.itemLink(ITEMS[1]), "/admin/newsletter/builder/7");
  assert.equal(page.itemLink(ITEMS[2]), "/admin/newsletter/pages/51");
  assert.equal(page.itemLink(ITEMS[3]), "/admin/newsletter/reports/4");
  assert.equal(page.itemLink(ITEMS[4]), "/admin/newsletter/assets/12");
  assert.equal(page.itemDetail(ITEMS[1]), "Campaign step · Onboarding · 42 contacts");
  assert.equal(page.itemDetail(ITEMS[3]), "Report email · Weekly to 2 recipients");
});

test("the month shows items on their day, three per day then '+N more'", async () => {
  await render();
  await waitFor(() => assert.equal(hasText("+1 more"), true));
  const params = calls[0].params;
  assert.equal(/^\d{4}-\d{2}-\d{2}$/.test(params.from) && /^\d{4}-\d{2}-\d{2}$/.test(params.to), true);
  assert.equal(queryByRole("button", /Weekly digest, Broadcast scheduled · Weekly/) !== null, true);
  assert.equal(queryByRole("button", /Old guide, Asset unpublishes/) !== null, true);
  assert.equal(queryByRole("button", /Weekly sends/), null, "the fourth item of the 10th is behind +1 more");
  await click(getByRole("button", "+1 more"));
  const dialog = await waitFor(() => getByRole("dialog"));
  assert.equal(queryByRole("button", /Weekly sends/, { scope: dialog }) !== null, true);
});

test("type filters hide a whole group", async () => {
  await render();
  await waitFor(() => assert.equal(queryByRole("button", /Send welcome/) !== null, true));
  const chip = getByRole("button", "Campaign steps");
  await click(chip);
  await waitFor(() => assert.equal(queryByRole("button", /Send welcome/), null));
  assert.equal(chip.getAttribute("aria-pressed"), "false");
  assert.equal(hasText("+1 more"), false);
});

test("agenda lists each day with details and opens the item", async () => {
  const view = await render();
  await click(await waitFor(() => getByRole("button", "Agenda")));
  await waitFor(() => assert.equal(hasText("Campaign step · Onboarding · 42 contacts"), true));
  assert.equal(hasText("Broadcast scheduled · Weekly"), true);
  await click(getByRole("button", /Weekly sends/));
  await waitFor(() => assert.equal(view.path(), "/admin/newsletter/reports/4"));
});

test("a Mautic outage shows the warning with the Broadcasts", async () => {
  payload = { items: [ITEMS[0]], truncated: false, warning: "Mautic could not be read, so only Broadcasts are shown. Try again in a moment." };
  await render();
  await waitFor(() => assert.equal(hasText(/only Broadcasts are shown/), true));
  assert.equal(queryByRole("button", /Weekly digest/) !== null, true);
});
