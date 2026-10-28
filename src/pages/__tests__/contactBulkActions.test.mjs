import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

import {
  React,
  chooseSelectOption,
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

// Assertions compare strings/booleans only (see contactImport.test.mjs).

const { default: AdminNewsletterContactsPage } = await loadSource("src/pages/AdminNewsletterContactsPage.jsx");
const { default: AdminNewsletterContactDetailPage } = await loadSource("src/pages/AdminNewsletterContactDetailPage.jsx");
const dialogModule = await loadSource("src/components/marketing/ContactBulkActionDialog.jsx");
const { Route } = router;
const h = React.createElement;

const CONTACTS_URL = "/newsletter/admin/contacts/";
const BULK = "/newsletter/admin/contacts/bulk/";
const OWNERS = "/newsletter/admin/contacts/owners/";
const OWNER_ROWS = [
  { id: "6", name: "Ravi Admin", email: "ravi@example.test" },
  { id: "8", name: "Sam Sales", email: "sam@example.test" },
];
const CONTACTS = [
  { mautic_contact_id: "3", name: "Ada Lovelace", email: "ada@example.test", points: 0, owner: { id: "6", name: "Ravi Admin", email: "" } },
  { mautic_contact_id: "12", name: "Grace Hopper", email: "grace@example.test", points: 0, owner: null },
];
const SEGMENTS = [
  { id: "4", name: "Summit Leads", is_static: true, managed_by_subscription_list: false },
  { id: "5", name: "Newsletter", is_static: true, managed_by_subscription_list: true },
  { id: "7", name: "Gmail users", is_static: false, managed_by_subscription_list: false },
];

let requests;
let bulkResponse;
let detail;

function installApi() {
  requests = [];
  bulkResponse = null;
  detail = { mautic_contact_id: "3", name: "Ada Lovelace", email: "ada@example.test", owner: { id: "6", name: "Ravi Admin", email: "" },
    contact_info: { first_name: "Ada", last_name: "Lovelace", email: "ada@example.test" }, subscription_lists: [], tags: [], dnc: [] };
  globalThis.__testApiClient = {
    get: async (url, config = {}) => {
      requests.push({ method: "get", url, params: config.params });
      if (url === CONTACTS_URL) return { data: { count: 2, page: 1, num_pages: 1, results: CONTACTS } };
      if (url === "/newsletter/admin/stages/") return { data: { results: [] } };
      if (url === OWNERS) return { data: { count: OWNER_ROWS.length, results: OWNER_ROWS } };
      if (url === "/newsletter/admin/mautic/segments/") return { data: SEGMENTS };
      if (url === "/newsletter/admin/mautic-campaigns/") {
        return { data: { count: 1, results: [{ id: "21", name: "Welcome Series", isPublished: false }] } };
      }
      if (url === `${CONTACTS_URL}3/`) return { data: detail };
      return { data: {} };
    },
    post: async (url, payload) => {
      requests.push({ method: "post", url, payload });
      if (url === BULK) {
        if (bulkResponse instanceof Error) throw bulkResponse;
        return { data: bulkResponse };
      }
      return { data: {} };
    },
    patch: async (url, payload) => {
      requests.push({ method: "patch", url, payload });
      const owner = payload.owner ? OWNER_ROWS.find((row) => row.id === String(payload.owner)) : null;
      detail = { ...detail, owner };
      return { data: detail };
    },
  };
}

const hasText = (matcher) => queryByText(matcher) !== null;
const bulkPosts = () => requests.filter((r) => r.method === "post" && r.url === BULK);
const contactLoads = () => requests.filter((r) => r.method === "get" && r.url === CONTACTS_URL);
const result = (overrides = {}) => ({
  action: "segment_add", target: { type: "segment", id: "4", name: "Summit Leads" }, requested: 2, updated: 1, skipped: 1, failed: 0,
  results: [
    { mautic_contact_id: "3", name: "Ada Lovelace", status: "updated", message: "" },
    { mautic_contact_id: "12", name: "Grace Hopper", status: "skipped", message: "Already in the segment." },
  ],
  ...overrides,
});

async function openContacts() {
  await renderRoutes(
    [h(Route, { key: "contacts", path: "/admin/newsletter/contacts", element: h(AdminNewsletterContactsPage) })],
    { url: "/admin/newsletter/contacts" }
  );
  await waitFor(() => assert.equal(Boolean(queryByRole("checkbox", "Select Ada Lovelace")), true));
}

async function tickBoth() {
  await click(getByRole("checkbox", "Select Ada Lovelace"));
  await click(getByRole("checkbox", "Select Grace Hopper"));
}

async function chooseBulk(label) {
  await click(getByRole("button", "Bulk actions"));
  await click(await waitFor(() => getByRole("menuitem", label)));
  return waitFor(() => getByRole("dialog"));
}

beforeEach(installApi);

afterEach(async () => {
  await cleanup();
  delete globalThis.__testApiClient;
});

// ------------------------------------------------------------------- list --

test("the list shows each contact's owner and filters by owner", async () => {
  await openContacts();
  assert.equal(hasText("No owner"), true);
  await waitFor(() => assert.equal(requests.some((r) => r.url === OWNERS), true));
  await chooseSelectOption(getByRole("combobox", /Owner/), "Sam Sales");
  await waitFor(() => assert.equal(contactLoads().some((r) => r.params?.owner_id === "8"), true));
  await chooseSelectOption(getByRole("combobox", /Owner/), "No owner");
  await waitFor(() => assert.equal(contactLoads().some((r) => r.params?.owner_id === "none"), true));
});

test("Bulk actions only appears once contacts are ticked", async () => {
  await openContacts();
  assert.equal(queryByRole("button", "Bulk actions") === null, true);
  await click(getByRole("checkbox", "Select Ada Lovelace"));
  assert.equal(queryByRole("button", "Bulk actions") === null, false);
});

test("add to segment offers static, non Subscription List segments and reports the result", async () => {
  bulkResponse = result();
  await openContacts();
  await tickBoth();
  const dialog = await chooseBulk("Add to segment…");
  await waitFor(() => assert.equal(requests.some((r) => r.url === "/newsletter/admin/mautic/segments/"), true));
  await click(getByRole("combobox", /Segment/, { scope: dialog }));
  await waitFor(() => assert.equal(Boolean(queryByRole("option", "Summit Leads")), true));
  assert.equal(queryByRole("option", "Newsletter") === null, true);
  assert.equal(queryByRole("option", "Gmail users") === null, true);
  await click(getByRole("option", "Summit Leads"));
  await waitFor(() => assert.equal(hasText('Add 2 contacts to the segment "Summit Leads".'), true));

  const loadsBefore = contactLoads().length;
  await click(getByRole("button", "Add", { scope: dialog }));
  await waitFor(() => assert.equal(hasText("1 updated, 1 skipped, 0 failed."), true));
  assert.equal(JSON.stringify(bulkPosts()[0].payload), JSON.stringify({ action: "segment_add", contact_ids: ["3", "12"], segment_id: "4" }));
  assert.equal(hasText("Grace Hopper · Skipped"), true);
  assert.equal(hasText("Already in the segment."), true);
  assert.equal(hasText("Ada Lovelace · Skipped"), false);

  await click(getByRole("button", "Done"));
  await waitFor(() => assert.equal(queryByRole("dialog") === null, true));
  await waitFor(() => assert.equal(contactLoads().length > loadsBefore, true));
  assert.equal(contactLoads().at(-1).params?.refresh, 1);
});

test("campaign removal names the campaign and marks it unpublished", async () => {
  bulkResponse = result({ action: "campaign_remove", updated: 2, skipped: 0, results: [] });
  await openContacts();
  await tickBoth();
  const dialog = await chooseBulk("Remove from campaign…");
  await chooseSelectOption(getByRole("combobox", /Campaign/, { scope: dialog }), "Welcome Series (unpublished)");
  await waitFor(() => assert.equal(hasText(/Remove 2 contacts from the campaign "Welcome Series"/), true));
  await click(getByRole("button", "Remove", { scope: dialog }));
  await waitFor(() => assert.equal(hasText("2 updated, 0 skipped, 0 failed."), true));
  assert.equal(JSON.stringify(bulkPosts()[0].payload), JSON.stringify({ action: "campaign_remove", contact_ids: ["3", "12"], campaign_id: "21" }));
});

test("change owner can clear the owner", async () => {
  bulkResponse = result({ action: "owner_set", updated: 2, skipped: 0, results: [] });
  await openContacts();
  await tickBoth();
  const dialog = await chooseBulk("Change owner…");
  await chooseSelectOption(getByRole("combobox", /Owner/, { scope: dialog }), "No owner");
  await waitFor(() => assert.equal(hasText("Clear the owner of 2 contacts."), true));
  await click(getByRole("button", "Change Owner", { scope: dialog }));
  await waitFor(() => assert.equal(bulkPosts().length, 1));
  assert.equal(JSON.stringify(bulkPosts()[0].payload), JSON.stringify({ action: "owner_set", contact_ids: ["3", "12"], owner_id: null }));
});

test("Do Not Contact sends the reason and shows failures and errors", async () => {
  bulkResponse = result({
    action: "dnc_add", updated: 1, skipped: 0, failed: 1,
    results: [
      { mautic_contact_id: "3", name: "Ada Lovelace", status: "updated", message: "" },
      { mautic_contact_id: "12", name: "Grace Hopper", status: "failed", message: "Mautic did not save the change." },
    ],
  });
  await openContacts();
  await tickBoth();
  const dialog = await chooseBulk("Mark as Do Not Contact…");
  assert.equal(hasText(/Mark 2 contacts as Do Not Contact for email/), true);
  await typeInto(getByRole("textbox", "Reason (optional)", { scope: dialog }), "  Asked at the Summit  ");
  await click(getByRole("button", "Mark Do Not Contact", { scope: dialog }));
  await waitFor(() => assert.equal(hasText("1 updated, 0 skipped, 1 failed."), true));
  assert.equal(JSON.stringify(bulkPosts()[0].payload), JSON.stringify({ action: "dnc_add", contact_ids: ["3", "12"], reason: "Asked at the Summit" }));
  assert.equal(hasText("Grace Hopper · Failed"), true);
});

test("a refused request keeps the dialog open with the server's message", async () => {
  const err = new Error("Request failed");
  err.response = { status: 409, data: { detail: "Subscription List segments are managed by ECP.", code: "subscription_list_segment" } };
  bulkResponse = err;
  await openContacts();
  await tickBoth();
  const dialog = await chooseBulk("Mark as Do Not Contact…");
  await click(getByRole("button", "Mark Do Not Contact", { scope: dialog }));
  await waitFor(() => assert.equal(hasText("Subscription List segments are managed by ECP."), true));
  assert.equal(queryByRole("dialog") === null, false);
});

// ----------------------------------------------------------------- detail --

test("the contact detail page shows and changes the owner", async () => {
  await renderRoutes(
    [h(Route, { key: "detail", path: "/admin/newsletter/contacts/:mauticContactId", element: h(AdminNewsletterContactDetailPage) })],
    { url: "/admin/newsletter/contacts/3" }
  );
  await waitFor(() => assert.equal(Boolean(queryByRole("combobox", /Assign owner/)), true));
  assert.equal(hasText("Ravi Admin"), true);
  assert.equal(getByRole("button", "Save Owner").disabled, true);

  await chooseSelectOption(getByRole("combobox", /Assign owner/), "Sam Sales");
  await click(getByRole("button", "Save Owner"));
  await waitFor(() => assert.equal(hasText("Owner assigned in Mautic."), true));
  assert.equal(JSON.stringify(requests.find((r) => r.method === "patch").payload), JSON.stringify({ owner: "8" }));

  await chooseSelectOption(getByRole("combobox", /Assign owner/), "No owner");
  await click(getByRole("button", "Save Owner"));
  await waitFor(() => assert.equal(hasText("Owner cleared in Mautic."), true));
  assert.equal(JSON.stringify(requests.filter((r) => r.method === "patch")[1].payload), JSON.stringify({ owner: "" }));
  assert.equal(hasText("No owner assigned."), true);
});

// ---------------------------------------------------------------- helpers --

test("bulk helpers", () => {
  const { bulkPayload, manualSegments, describeBulkAction, BULK_ACTIONS } = dialogModule;
  assert.equal(BULK_ACTIONS.map((item) => item.key).join(","), "segment_add,segment_remove,campaign_add,campaign_remove,owner_set,dnc_add");
  assert.equal(manualSegments(SEGMENTS).map((segment) => segment.id).join(","), "4");
  assert.equal(JSON.stringify(bulkPayload({ action: "owner_set", contactIds: ["3"], targetId: "6", reason: "" })),
    JSON.stringify({ action: "owner_set", contact_ids: ["3"], owner_id: "6" }));
  assert.equal(JSON.stringify(bulkPayload({ action: "dnc_add", contactIds: ["3"], targetId: "", reason: "   " })),
    JSON.stringify({ action: "dnc_add", contact_ids: ["3"] }));
  assert.equal(describeBulkAction("owner_set", 1, "Ravi Admin"), "Make Ravi Admin the owner of 1 contact.");
});
