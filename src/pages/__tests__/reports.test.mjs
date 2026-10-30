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
  typeInto,
  waitFor,
} from "./helpers/blogDomHarness.mjs";

// Assertions compare strings/booleans only (see broadcastDuplicate.test.mjs).

const { default: ReportsPage } = await loadSource("src/pages/AdminNewsletterReportsPage.jsx");
const { default: EditorPage } = await loadSource("src/pages/AdminNewsletterReportEditorPage.jsx");
const { default: ViewerPage } = await loadSource("src/pages/AdminNewsletterReportViewerPage.jsx");
const shared = await loadSource("src/pages/newsletterReportShared.jsx");
const { Route } = router;
const h = React.createElement;

const R = "/newsletter/admin/reports/";
const META = {
  source: "email.stats",
  columns: [
    { key: "e.subject", label: "Subject", type: "string", alias: "subject" },
    { key: "es.date_sent", label: "Date sent", type: "datetime", alias: "date_sent" },
  ],
  groupByColumns: ["e.subject"],
  filters: [
    { key: "e.subject", label: "Subject", type: "string", operators: [{ value: "like", label: "like" }, { value: "eq", label: "equals" }] },
  ],
  graphs: [{ key: "mautic.email.graph.line.stats", label: "Emails sent", type: "line" }],
};
const REPORT = {
  id: 4, name: "Opens by subject", description: "", source: "email.stats", sourceLabel: "Emails Sent", isPublished: true, system: false,
  isScheduled: true, toAddress: "a@x.test", scheduleUnit: "WEEKLY", scheduleDay: "MO", scheduleMonthFrequency: null,
  columns: ["e.subject"], filters: [{ column: "e.subject", glue: "and", condition: "like", value: "%", dynamic: 1 }],
  tableOrder: [], graphs: ["mautic.email.graph.line.stats", "mautic.email.graph.pie.x", "mautic.email.table.most"],
  groupBy: [], aggregators: [], settings: { showGraphsAboveTable: 0, showDynamicFilters: 1, hideDateRangeFilter: 0 },
  createdByUser: "Ada Admin", dateModified: "2026-10-29T09:00:00+00:00",
};
const DATA = {
  totalResults: 2, page: 1, limit: 50, dateFrom: "2026-09-30", dateTo: "2026-10-30",
  columns: [{ key: "e.subject", alias: "subject", label: "Subject", type: "string" }],
  rows: [{ subject: "Summit invite" }, { subject: "=cmd()" }],
  graphs: [
    { key: "mautic.email.graph.line.stats", label: "Emails sent", type: "line", labels: ["Oct 1", "Oct 2"], datasets: [{ label: "Sent", data: [3, 5] }, { label: "Read", data: [1, 2] }] },
    { key: "mautic.email.graph.pie.x", label: "Read / failed", type: "pie", labels: ["Read", "Failed"], datasets: [{ label: "", data: [4, 1] }] },
    { key: "mautic.email.table.most", label: "Most emails sent", type: "table", rows: [{ id: "7", title: "Summit invite", sent: "5" }] },
  ],
};

let calls;

function installApi() {
  calls = [];
  const respond = async (method, url, payload, config) => {
    calls.push({ method, url, payload, params: config?.params });
    if (method === "get") {
      if (url === R) return { data: { results: [REPORT, { ...REPORT, id: 5, name: "Page hits", source: "page.hits", sourceLabel: "Page hits", isScheduled: false }] } };
      if (url === `${R}sources/`) return { data: { results: [{ source: "email.stats", label: "Emails Sent", groupLabel: "Emails" }] } };
      if (url === `${R}sources/email.stats/`) return { data: META };
      if (url === `${R}4/`) return { data: REPORT };
      if (url === `${R}4/data/`) return { data: DATA };
      if (url === `${R}4/exports/`) return { data: { results: [] } };
      return { data: {} };
    }
    if (method === "post" && url === R) return { data: { ...REPORT, id: 9 } };
    if (method === "patch") return { data: REPORT };
    if (method === "post" && url === `${R}4/exports/`) return { data: { id: "job-1", status: "queued" } };
    if (method === "delete") return { data: null, status: 204 };
    return { data: {} };
  };
  globalThis.__testApiClient = {
    get: (url, config) => respond("get", url, undefined, config),
    post: (url, payload) => respond("post", url, payload),
    patch: (url, payload) => respond("patch", url, payload),
    delete: (url) => respond("delete", url),
  };
}

const hasText = (matcher) => queryByText(matcher) !== null;
const writes = (method, url) => calls.filter((c) => c.method === method && c.url === url);
const routes = () => [
  h(Route, { key: "list", path: "/admin/newsletter/reports", element: h(ReportsPage) }),
  h(Route, { key: "new", path: "/admin/newsletter/reports/new", element: h(EditorPage) }),
  h(Route, { key: "view", path: "/admin/newsletter/reports/:reportId", element: h(ViewerPage) }),
  h(Route, { key: "edit", path: "/admin/newsletter/reports/:reportId/edit", element: h(EditorPage) }),
];

async function pick(combobox, text) {
  await typeInto(combobox, text);
  await click(await waitFor(() => getByRole("option", text)));
}

beforeEach(installApi);

afterEach(async () => {
  await cleanup();
  delete globalThis.__testApiClient;
});

test("payload and schedule helpers send the whole definition", () => {
  const draft = { ...shared.reportToDraft(REPORT), scheduleUnit: "MONTHLY", scheduleMonthFrequency: "-1", toAddress: "A@x.test, b@x.test;a@x.test" };
  const payload = shared.draftToPayload(draft, { includeSource: false });
  assert.equal(payload.toAddress, "a@x.test,b@x.test");
  assert.equal(payload.scheduleMonthFrequency, "-1");
  assert.equal("source" in payload, false);
  assert.equal(payload.filters[0].dynamic, true);
  assert.equal(shared.scheduleSummary(REPORT), "Weekly on Monday");
  assert.equal(shared.validateReportDraft({ ...draft, aggregators: [{ function: "COUNT", column: "e.subject" }] }), "Calculations need at least one group-by column.");
  assert.equal(shared.validateReportDraft({ ...draft, toAddress: "nope" }), "nope is not a valid email address.");
  assert.equal(shared.validateReportDraft(draft), "");
});

test("the list shows each report's data source and schedule, and filters by source", async () => {
  await renderRoutes(routes(), { url: "/admin/newsletter/reports" });
  await waitFor(() => assert.equal(hasText("Opens by subject"), true));
  assert.equal(hasText("Page hits"), true);
  assert.equal(hasText("Scheduled"), true);
  assert.equal(getByRole("link", "Opens by subject").getAttribute("href"), "/admin/newsletter/reports/4");
  await typeInto(getByRole("textbox", "Search reports"), "page");
  await waitFor(() => assert.equal(hasText("Opens by subject"), false));
});

test("creating a report: source, columns and a filter, then the viewer", async () => {
  const view = await renderRoutes(routes(), { url: "/admin/newsletter/reports/new" });
  await waitFor(() => assert.equal(hasText("Create Report"), true));
  await typeInto(getByRole("textbox", "Report name"), "Weekly sends");
  await click(getByRole("button", "Create Report"));
  await waitFor(() => assert.equal(hasText("Choose a data source."), true));
  assert.equal(writes("post", R).length, 0);

  await pick(getByRole("combobox", "Data source"), "Emails Sent");
  await waitFor(() => assert.equal(queryByRole("combobox", "Columns") !== null, true));
  await pick(getByRole("combobox", "Columns"), "Subject");
  await click(getByRole("button", "Add Filter"));
  await pick(await waitFor(() => getByRole("combobox", "Filter 1 field")), "Subject");
  await typeInto(getByRole("textbox", "Value"), "Summit");
  await click(getByRole("checkbox", /Emails sent/));
  await click(getByRole("button", "Create Report"));

  await waitFor(() => assert.equal(view.path(), "/admin/newsletter/reports/9"));
  const payload = writes("post", R)[0].payload;
  assert.equal(payload.name, "Weekly sends");
  assert.equal(payload.source, "email.stats");
  assert.equal(JSON.stringify(payload.columns), JSON.stringify(["e.subject"]));
  assert.equal(JSON.stringify(payload.filters), JSON.stringify([{ column: "e.subject", glue: "and", condition: "like", value: "Summit", dynamic: false }]));
  assert.equal(JSON.stringify(payload.graphs), JSON.stringify(["mautic.email.graph.line.stats"]));
  assert.equal(payload.isScheduled, false);
});

test("editing keeps the source and saves the whole definition", async () => {
  await renderRoutes(routes(), { url: "/admin/newsletter/reports/4/edit" });
  await waitFor(() => assert.equal(hasText("Edit Opens by subject"), true));
  await waitFor(() => assert.equal(queryByRole("combobox", "Columns") !== null, true));
  assert.equal(getByRole("combobox", "Data source").disabled, true);
  assert.equal(getByRole("textbox", "Send to").value, "a@x.test");
  await typeInto(getByRole("textbox", "Report name"), "Opens by subject v2");
  await click(getByRole("button", "Save Report"));
  await waitFor(() => assert.equal(writes("patch", `${R}4/`).length, 1));
  const payload = writes("patch", `${R}4/`)[0].payload;
  assert.equal(payload.name, "Opens by subject v2");
  assert.equal("source" in payload, false);
  assert.equal(payload.scheduleUnit, "WEEKLY");
  assert.equal(payload.scheduleDay, "MO");
  assert.equal(payload.filters[0].dynamic, true);
});

test("the viewer runs the report with graphs, dynamic filters and export", async () => {
  await renderRoutes(routes(), { url: "/admin/newsletter/reports/4" });
  await waitFor(() => assert.equal(hasText("Summit invite"), true));
  assert.equal(hasText("2 rows · 2026-09-30 to 2026-10-30"), true);
  assert.equal(queryByRole("figure", "Emails sent") !== null, true);
  assert.equal(queryByRole("figure", "Read / failed") !== null, true);
  // Table graphs show their rows straight away.
  const tableGraph = getByRole("figure", "Most emails sent");
  assert.equal(queryByText("5", { scope: tableGraph }) !== null, true);
  assert.equal(hasText("Weekly on Monday to 1 recipient(s)"), true);
  const first = calls.find((c) => c.url === `${R}4/data/`);
  assert.equal(first.params.graphs, 1);
  assert.equal(first.params.limit, 50);

  // Dynamic filter: labelled from the source metadata, sent only when applied.
  const subject = await waitFor(() => getByRole("textbox", "Subject"));
  await typeInto(subject, "Summit");
  await click(getByRole("button", "Apply"));
  await waitFor(() => assert.equal(calls.filter((c) => c.url === `${R}4/data/` && c.params.dynamicFilters).length > 0, true));
  const applied = calls.filter((c) => c.url === `${R}4/data/` && c.params.dynamicFilters).pop();
  assert.equal(applied.params.dynamicFilters, JSON.stringify({ "e.subject": "Summit" }));

  await click(getByRole("button", "Export"));
  const dialog = await waitFor(() => getByRole("dialog"));
  await click(getByRole("button", "Start Export", { scope: dialog }));
  await waitFor(() => assert.equal(writes("post", `${R}4/exports/`).length, 1));
  const exportPayload = writes("post", `${R}4/exports/`)[0].payload;
  assert.equal(exportPayload.format, "csv");
  assert.equal(JSON.stringify(exportPayload.dynamicFilters), JSON.stringify({ "e.subject": "Summit" }));
  assert.equal(typeof exportPayload.dateFrom, "string");
});
