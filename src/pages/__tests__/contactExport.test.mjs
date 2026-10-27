import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

import {
  React,
  act,
  all,
  chooseSelectOption,
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

// Assertions compare strings/booleans only (see contactImport.test.mjs).

const { default: AdminNewsletterContactsPage } = await loadSource("src/pages/AdminNewsletterContactsPage.jsx");
const dialogModule = await loadSource("src/components/marketing/ContactExportDialog.jsx");
const bellModule = await loadSource("src/components/marketing/MarketingNotificationsBell.jsx");
const { Route } = router;
const h = React.createElement;

const EXPORTS = "/newsletter/admin/contacts/exports/";
const NOTIFICATIONS = "/newsletter/admin/notifications/";
const CONTACTS = [
  { mautic_contact_id: "3", name: "Ada Lovelace", email: "ada@example.test", points: 0, subscriptions: [] },
  { mautic_contact_id: "12", name: "Grace Hopper", email: "grace@example.test", points: 0, subscriptions: [] },
];
const job = (overrides = {}) => ({
  id: "job-abcdefghijklmnop", status: "queued", format: "csv", scope: "filter", filters: { search: "", stage_id: "" },
  total: null, processed: 0, rows: 0, created_at: "2026-10-27T09:00:00Z", finished_at: null, expires_at: null,
  error: "", filename: "", ...overrides,
});
const readyNote = (overrides = {}) => ({
  id: 7, title: "Contact export ready", description: "42 contacts exported as CSV. Download it within 24 hours.",
  is_read: false, created_at: "2026-10-27T09:01:00Z", type: "marketing_contact_export",
  data: { job_id: "job-abcdefghijklmnop", status: "done", filename: "contacts-20261027-0901.csv", rows: 42 }, ...overrides,
});

let requests;
let recent;
let notes;
let saved;

function installApi() {
  requests = [];
  recent = [];
  notes = [];
  globalThis.__testApiClient = {
    get: async (url, config = {}) => {
      requests.push({ method: "get", url, params: config.params, config });
      if (url === "/newsletter/admin/contacts/") return { data: { count: 42, page: 1, num_pages: 1, results: CONTACTS } };
      if (url === "/newsletter/admin/stages/") return { data: { results: [{ id: 9, name: "Subscriber" }] } };
      if (url === EXPORTS) return { data: { results: recent } };
      if (url === NOTIFICATIONS) return { data: { unread: notes.filter((n) => !n.is_read).length, results: notes } };
      if (url === `${EXPORTS}job-abcdefghijklmnop/download/`) return { data: new window.Blob(["Mautic ID\n3\n"], { type: "text/csv" }) };
      return { data: {} };
    },
    post: async (url, payload) => {
      requests.push({ method: "post", url, payload });
      if (url === EXPORTS) return { data: job({ scope: payload.contact_ids ? "selected" : "filter", format: payload.format }) };
      if (url === `${NOTIFICATIONS}read/`) {
        notes = notes.map((n) => (payload.all || payload.ids?.includes(n.id) ? { ...n, is_read: true } : n));
        return { data: { updated: 1, unread: notes.filter((n) => !n.is_read).length } };
      }
      throw new Error(`unexpected POST ${url}`);
    },
    delete: async (url) => {
      requests.push({ method: "delete", url });
      recent = [];
      return { data: null };
    },
  };
}

const hasText = (matcher) => queryByText(matcher) !== null;
const exportPosts = () => requests.filter((r) => r.method === "post" && r.url === EXPORTS);

async function openContacts() {
  await renderRoutes(
    [h(Route, { key: "contacts", path: "/admin/newsletter/contacts", element: h(AdminNewsletterContactsPage) })],
    { url: "/admin/newsletter/contacts" }
  );
  await waitFor(() => assert.equal(Boolean(queryByRole("button", "Export")), true));
}

beforeEach(() => {
  installApi();
  saved = [];
  globalThis.URL.createObjectURL = (blob) => {
    saved.push(blob);
    return "blob:test";
  };
  globalThis.URL.revokeObjectURL = () => {};
});

afterEach(async () => {
  await cleanup();
  delete globalThis.__testApiClient;
});

// ------------------------------------------------------------------ dialog --

test("starting an export sends the applied filter, closes the dialog and says it will notify", async () => {
  let started = 0;
  window.addEventListener("marketing:work-started", () => { started += 1; });
  await openContacts();
  await chooseSelectOption(getByRole("combobox", /Stage/), "Subscriber");
  await waitFor(() => assert.equal(requests.some((r) => r.url === "/newsletter/admin/contacts/" && r.params?.stage_id === "9"), true));

  await click(getByRole("button", "Export"));
  const dialog = await waitFor(() => getByRole("dialog"));
  assert.equal(hasText("All 42 contacts matching stage: Subscriber"), true);
  assert.equal(hasText(/runs in the background: you can keep working/), true);
  await click(getByRole("radio", "Excel (.xlsx)", { scope: dialog }));
  await click(getByRole("button", "Start Export", { scope: dialog }));
  await waitFor(() => assert.equal(exportPosts().length, 1));
  assert.equal(JSON.stringify(exportPosts()[0].payload), JSON.stringify({ format: "xlsx", stage_id: "9" }));
  await waitFor(() => assert.equal(queryByRole("dialog") === null, true));
  assert.equal(hasText(/Export started\. You can keep working; the bell/), true);
  assert.equal(started, 1);
});

test("ticked contacts are offered first and exported by id", async () => {
  await openContacts();
  await waitFor(() => assert.equal(Boolean(queryByRole("checkbox", "Select Ada Lovelace")), true));
  await click(getByRole("checkbox", "Select Ada Lovelace"));
  await click(getByRole("button", "Export"));
  const dialog = await waitFor(() => getByRole("dialog"));
  assert.equal(getByRole("radio", "The 1 ticked contact", { scope: dialog }).checked, true);
  await click(getByRole("button", "Start Export", { scope: dialog }));
  await waitFor(() => assert.equal(exportPosts().length, 1));
  assert.equal(JSON.stringify(exportPosts()[0].payload), JSON.stringify({ format: "csv", contact_ids: ["3"] }));
});

test("recent exports show progress or failure, and finished ones download or delete", async () => {
  recent = [
    job({ id: "job-running-0000000001", status: "running", total: 100, processed: 40 }),
    job({ id: "job-failed-00000000001", status: "failed", error: "Mautic could not be read." }),
    job({ status: "done", rows: 5, filename: "contacts-20261027-0900.csv", scope: "selected", filters: { selected: 5 } }),
  ];
  await openContacts();
  await click(getByRole("button", "Export"));
  await waitFor(() => assert.equal(all("[aria-label='Your exports'] li").length, 3));
  assert.equal(hasText(/In progress: 40 of 100/), true);
  assert.equal(hasText(/Failed: Mautic could not be read\./), true);
  assert.equal(hasText(/5 selected contacts · CSV/), true);
  await click(getByRole("button", "Download contacts-20261027-0900.csv"));
  await waitFor(() => assert.equal(saved.length, 1));
  assert.equal(requests.find((r) => r.url.endsWith("/download/")).config.responseType, "blob");
  const deletes = all("[aria-label='Your exports'] li button[aria-label^='Delete export']");
  assert.equal(deletes[0].disabled, true);
  await click(deletes[2]);
  await waitFor(() => assert.equal(requests.some((r) => r.method === "delete" && r.url === `${EXPORTS}job-abcdefghijklmnop/`), true));
});

// -------------------------------------------------------------------- bell --

const renderBell = () =>
  renderRoutes([h(Route, { key: "bell", path: "/", element: h(bellModule.default, { pollMs: 60, fastPollMs: 30 }) })], { url: "/" });

test("the bell shows unread marketing notifications and downloads a ready export", async () => {
  notes = [readyNote(), readyNote({ id: 6, title: "Contact export failed", description: "Mautic could not be read.", is_read: true,
    data: { job_id: "job-x", status: "failed" } })];
  await renderBell();
  await waitFor(() => assert.equal(Boolean(queryByRole("button", "Notifications, 1 unread")), true));
  await click(getByRole("button", "Notifications, 1 unread"));
  await waitFor(() => assert.equal(all("[aria-label='Marketing notifications'] li").length, 2));
  assert.equal(all("[aria-label='Marketing notifications'] li")[1].textContent.includes("Download"), false);
  await click(getByRole("button", "Download"));
  await waitFor(() => assert.equal(saved.length, 1));
  await waitFor(() => assert.equal(requests.some((r) => r.url === `${NOTIFICATIONS}read/` && JSON.stringify(r.payload) === '{"ids":[7]}'), true));
  await waitFor(() => assert.equal(Boolean(queryByRole("button", "Notifications")), true));
});

test("a newly arrived notification pops a toast with Download", async () => {
  await renderBell();
  await waitFor(() => assert.equal(requests.filter((r) => r.url === NOTIFICATIONS).length >= 1, true));
  assert.equal(hasText("Contact export ready"), false);
  await act(async () => {
    notes = [readyNote()];
    bellModule.notifyMarketingWorkStarted();
  });
  await waitFor(() => assert.equal(hasText(/42 contacts exported as CSV/), true));
  await click(getByRole("button", "Download", { scope: getByRole("alert") }));
  await waitFor(() => assert.equal(saved.length, 1));
});

test("mark all read clears the badge", async () => {
  notes = [readyNote(), readyNote({ id: 8 })];
  await renderBell();
  await click(await waitFor(() => getByRole("button", "Notifications, 2 unread")));
  await click(await waitFor(() => getByRole("button", "Mark all read")));
  await waitFor(() => assert.equal(Boolean(queryByRole("button", "Notifications")), true));
  assert.equal(JSON.stringify(requests.find((r) => r.url === `${NOTIFICATIONS}read/`).payload), '{"all":true}');
});

test("export helpers", () => {
  const { exportPayload, describeExport } = dialogModule;
  assert.equal(JSON.stringify(exportPayload({ scope: "filter", format: "csv", selectedIds: ["3"], search: "ada", stageFilter: "none" })),
    JSON.stringify({ format: "csv", search: "ada", stage_id: "none" }));
  assert.equal(JSON.stringify(exportPayload({ scope: "selected", format: "xlsx", selectedIds: ["3"], search: "ada", stageFilter: "" })),
    JSON.stringify({ format: "xlsx", contact_ids: ["3"] }));
  assert.equal(describeExport(job({ filters: { search: "", stage_id: "" } })), "All contacts");
  assert.equal(describeExport(job({ filters: { search: "ada", stage_id: "none" } })), 'Contacts matching search "ada", no stage');
});
