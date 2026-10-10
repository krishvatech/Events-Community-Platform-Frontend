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
  selectFile,
  typeInto,
  waitFor,
} from "./helpers/blogDomHarness.mjs";

const { default: AdminNewsletterContactsPage } = await loadSource("src/pages/AdminNewsletterContactsPage.jsx");
const { Route } = router;
const h = React.createElement;
globalThis.FormData = window.FormData;

// Assertions only compare strings/booleans (a failing assert on a jsdom node
// pretty-prints the whole DOM).

const DELETE = "/newsletter/admin/contacts/delete/";
const contact = (id) => ({
  mautic_contact_id: id,
  name: `Test Contact ${id}`,
  email: `del-${id}@example.test`,
  location: "",
  points: 0,
  current_stage: null,
  subscription_lists: [],
});
const plan = (overrides = {}) => ({
  plan_id: "plan_abcdefghijklmnop",
  mode: "selected",
  state: "ready",
  expires_at: 4102444800,
  summary: { requested: 2, deletable: 2, protected: {}, not_found: 0, in_campaigns: 0 },
  samples: { deletable: [{ id: 1, email: "del-1@example.test", campaigns: 0 }, { id: 2, email: "del-2@example.test", campaigns: 0 }], excluded: [] },
  progress: { total: 2, processed: 0, remaining: 2, percentage: 0 },
  results: { deleted: 0, already_gone: 0, failed: 0, skipped: {}, skipped_labels: {} },
  failures: [],
  ...overrides,
});

let requests;
let prepareResponse;
let executeResponses;
let contactLists;

function installApi() {
  requests = [];
  prepareResponse = async () => ({ data: plan() });
  executeResponses = [
    async () => ({ data: plan({ state: "completed", progress: { total: 2, processed: 2, remaining: 0, percentage: 100 }, results: { deleted: 2, already_gone: 0, failed: 0, skipped: {}, skipped_labels: {} } }) }),
  ];
  contactLists = 0;
  globalThis.__testApiClient = {
    get: async (url, config = {}) => {
      requests.push({ method: "get", url, params: config.params });
      if (url === "/newsletter/admin/contacts/") {
        contactLists += 1;
        return { data: { count: 3, page: 1, num_pages: 1, results: [contact(1), contact(2), contact(3)] } };
      }
      if (url === "/newsletter/admin/stages/") return { data: { results: [] } };
      return { data: {} };
    },
    post: async (url, body) => {
      requests.push({ method: "post", url, body });
      if (url === `${DELETE}prepare/`) return prepareResponse(body);
      if (url.endsWith("/execute/")) return (executeResponses.length > 1 ? executeResponses.shift() : executeResponses[0])();
      if (url.endsWith("/cancel/")) return { data: plan({ state: "cancelled", progress: { total: 2, processed: 0, remaining: 2, percentage: 0 } }) };
      throw new Error(`unexpected POST ${url}`);
    },
  };
}

const posts = (suffix) => requests.filter((r) => r.method === "post" && r.url.endsWith(suffix));
const hasText = (matcher) => queryByText(matcher) !== null;
const button = (name) => queryByRole("button", name);
const rowBoxes = () => all("tbody input[type='checkbox']");
const confirmInput = () => document.querySelector("input[aria-label='Confirm number of contacts to delete']");
const deleteButton = () => all("[role='dialog'] button").find((b) => /permanently$/.test(b.textContent.trim()));

async function renderPage() {
  const view = await renderRoutes(
    [h(Route, { key: "contacts", path: "/admin/newsletter/contacts", element: h(AdminNewsletterContactsPage) })],
    { url: "/admin/newsletter/contacts" }
  );
  await waitFor(() => assert.equal(rowBoxes().length, 3));
  return view;
}

async function reviewSelected(count = 2) {
  await renderPage();
  for (const box of rowBoxes().slice(0, count)) await click(box);
  await waitFor(() => assert.equal(Boolean(button(`Delete selected (${count})`)), true));
  await click(button(`Delete selected (${count})`));
  await waitFor(() => assert.equal(Boolean(confirmInput()), true));
}

beforeEach(() => installApi());
afterEach(async () => {
  await cleanup();
  delete globalThis.__testApiClient;
});

test("Bulk Delete by CSV is always offered; Delete selected only with a selection", async () => {
  await renderPage();
  assert.equal(Boolean(button("Bulk Delete by CSV")), true);
  assert.equal(Boolean(button("Import CSV")), true);
  assert.equal(all("button").some((b) => /^Delete selected/.test(b.textContent.trim())), false);
  await click(rowBoxes()[0]);
  await waitFor(() => assert.equal(button("Delete selected (1)")?.disabled, false));
});

test("selected contacts are prepared server-side and need the exact count to delete", async () => {
  await reviewSelected(2);
  assert.deepEqual(posts("prepare/")[0].body, { mode: "selected", contact_ids: ["1", "2"] });
  assert.equal(hasText(/Deleting contacts is permanent/), true);
  assert.equal(deleteButton().disabled, true);
  await typeInto(confirmInput(), "3");
  assert.equal(deleteButton().disabled, true);
  await typeInto(confirmInput(), "2");
  await waitFor(() => assert.equal(deleteButton().disabled, false));
  assert.equal(posts("/execute/").length, 0);
});

test("confirmed deletion runs batches until done, then refreshes the list", async () => {
  executeResponses = [
    async () => ({ data: plan({ state: "running", progress: { total: 2, processed: 1, remaining: 1, percentage: 50 }, results: { deleted: 1, already_gone: 0, failed: 0, skipped: {}, skipped_labels: {} } }) }),
    async () => ({ data: plan({ state: "completed", progress: { total: 2, processed: 2, remaining: 0, percentage: 100 }, results: { deleted: 2, already_gone: 0, failed: 0, skipped: {}, skipped_labels: {} } }) }),
  ];
  await reviewSelected(2);
  await typeInto(confirmInput(), "2");
  const listsBefore = contactLists;
  const target = deleteButton();
  await act(async () => {
    target.click();
    target.click();
  });
  await waitFor(() => assert.equal(hasText("Deletion finished."), true));
  assert.equal(posts("/execute/").length, 2);
  assert.deepEqual(posts("/execute/").map((p) => p.body.confirm_count), [2, 2]);
  await click(button("Close"));
  await waitFor(() => assert.equal(contactLists > listsBefore, true));
  const refresh = requests.filter((r) => r.url === "/newsletter/admin/contacts/").at(-1);
  assert.equal(refresh.params.refresh, 1);
});

test("protected and missing contacts are shown and nothing deletable disables deletion", async () => {
  prepareResponse = async () => ({
    data: plan({
      summary: { requested: 2, deletable: 0, protected: { do_not_contact: 1, linked_ecp_account: 1 }, not_found: 0 },
      samples: { deletable: [], excluded: [{ id: 1, email: "del-1@example.test", reason: "do_not_contact", label: "Has a Do Not Contact record (deleting would remove the suppression)" }] },
      state: "empty",
    }),
  });
  await renderPage();
  await click(rowBoxes()[0]);
  await click(rowBoxes()[1]);
  await click(button("Delete selected (2)"));
  await waitFor(() => assert.equal(hasText("No contacts can be deleted."), true));
  assert.equal(hasText(/Protected — Has a Do Not Contact record/), true);
  assert.equal(hasText(/Protected — Linked to an ECP account/), true);
  assert.equal(deleteButton().disabled, true);
});

test("a failed batch offers a safe retry and Stop cancels the plan", async () => {
  executeResponses = [
    async () => {
      const error = new Error("Bad gateway");
      error.response = { status: 502, data: { detail: "Mautic did not answer for this batch.", code: "retry" } };
      throw error;
    },
  ];
  await reviewSelected(2);
  await typeInto(confirmInput(), "2");
  await click(deleteButton());
  await waitFor(() => assert.equal(hasText(/Retrying is safe/), true));
  await click(button("Stop after this batch"));
  await waitFor(() => assert.equal(hasText(/Deletion stopped/), true));
  assert.equal(posts("/cancel/").length, 1);
});

test("CSV deletion uploads the file for a plan and never deletes before confirmation", async () => {
  prepareResponse = async () => ({
    data: plan({
      mode: "csv",
      summary: { requested: 4, deletable: 2, protected: { ambiguous_email: 1 }, not_found: 1, invalid: 0, duplicate: 0, email_column: "Email" },
    }),
  });
  await renderPage();
  await click(button("Bulk Delete by CSV"));
  await waitFor(() => assert.equal(Boolean(document.getElementById("contact-delete-file")), true));
  assert.equal(posts("prepare/").length, 0);
  await selectFile(document.getElementById("contact-delete-file"), new window.File(["Email\na@example.test\n"], "delete.csv", { type: "text/csv" }));
  await click(button("Check contacts"));
  await waitFor(() => assert.equal(Boolean(confirmInput()), true));
  const form = posts("prepare/")[0].body;
  assert.equal(form.get("mode"), "csv");
  assert.equal(form.get("file").name, "delete.csv");
  assert.equal(hasText(/Protected — Email matches more than one contact/), true);
  assert.equal(posts("/execute/").length, 0);
});

test("a CSV without a recognisable Email column asks for the column name", async () => {
  prepareResponse = async () => {
    const error = new Error("Bad request");
    error.response = { status: 400, data: { detail: "No Email column was found.", code: "email_column_required" } };
    throw error;
  };
  await renderPage();
  await click(button("Bulk Delete by CSV"));
  await selectFile(document.getElementById("contact-delete-file"), new window.File(["Contact\na@example.test\n"], "d.csv", { type: "text/csv" }));
  await click(button("Check contacts"));
  await waitFor(() => assert.equal(hasText("No Email column was found."), true));
  assert.equal(Boolean(document.querySelector("[role='dialog'] input[type='text']")), true);
});
