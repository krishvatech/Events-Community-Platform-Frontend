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

const { default: AdminNewsletterContactDetailPage } = await loadSource("src/pages/AdminNewsletterContactDetailPage.jsx");
const { Route } = router;
const h = React.createElement;

const CONTACT = "/newsletter/admin/contacts/3/";
const CAMPAIGNS = "/newsletter/admin/contacts/3/campaigns/";
const MERGE = "/newsletter/admin/contacts/3/merge/";
const BULK = "/newsletter/admin/contacts/bulk/";

const person = (id, name, extra = {}) => ({
  mautic_contact_id: id, name, email: `${name.split(" ")[0].toLowerCase()}@example.test`, points: 2, owner: null,
  linked_ecp_user_id: null, ...extra,
});

let requests;
let memberships;
let preview;
let bulkResult;
let mergeError;

function installApi() {
  requests = [];
  memberships = [{ id: "21", name: "Welcome Series", published: false, manually_added: true, date_added: "2026-10-28 09:00:00" }];
  preview = { kept: person("3", "Ada Lovelace"), merged_away: person("4", "Ada L"), blockers: [], can_merge: true };
  bulkResult = null;
  mergeError = null;
  globalThis.__testApiClient = {
    get: async (url, config = {}) => {
      requests.push({ method: "get", url, params: config.params });
      if (url === CONTACT) {
        return { data: { mautic_contact_id: "3", name: "Ada Lovelace", email: "ada@example.test", owner: null,
          contact_info: { first_name: "Ada", last_name: "Lovelace", email: "ada@example.test" }, subscription_lists: [], tags: [], dnc: [] } };
      }
      if (url === CAMPAIGNS) return { data: { count: memberships.length, results: memberships } };
      if (url === "/newsletter/admin/mautic-campaigns/") {
        return { data: { count: 2, results: [{ id: "21", name: "Welcome Series", isPublished: false }, { id: "22", name: "Summit Follow-up", isPublished: true }] } };
      }
      if (url === "/newsletter/admin/contacts/") {
        return { data: { count: 2, results: [{ mautic_contact_id: "3", name: "Ada Lovelace", email: "ada@example.test" },
          { mautic_contact_id: "4", name: "Ada L", email: "ada.l@example.test" }] } };
      }
      if (url === MERGE) return { data: preview };
      return { data: {} };
    },
    post: async (url, payload) => {
      requests.push({ method: "post", url, payload });
      if (url === BULK) {
        const result = bulkResult || { updated: 1, skipped: 0, failed: 0, results: [{ mautic_contact_id: "3", name: "Ada", status: "updated", message: "" }] };
        if (result.results[0].status === "updated") {
          memberships = payload.action === "campaign_add"
            ? [...memberships, { id: payload.campaign_id, name: "Summit Follow-up", published: true, manually_added: true, date_added: null }]
            : memberships.filter((row) => row.id !== payload.campaign_id);
        }
        return { data: result };
      }
      if (url === MERGE) {
        if (mergeError) throw mergeError;
        return { data: { mautic_contact_id: "3", merged_contact_id: "4", kept: preview.kept, merged_away: preview.merged_away } };
      }
      return { data: {} };
    },
    patch: async () => ({ data: {} }),
  };
}

const hasText = (matcher) => queryByText(matcher) !== null;
const posts = (url) => requests.filter((r) => r.method === "post" && r.url === url);
const gets = (url) => requests.filter((r) => r.method === "get" && r.url === url);

async function openDetail() {
  await renderRoutes(
    [h(Route, { key: "detail", path: "/admin/newsletter/contacts/:mauticContactId", element: h(AdminNewsletterContactDetailPage) })],
    { url: "/admin/newsletter/contacts/3" }
  );
  await waitFor(() => assert.equal(hasText("Welcome Series"), true));
}

async function openMergePreview() {
  await openDetail();
  await click(getByRole("button", "Merge"));
  const dialog = await waitFor(() => getByRole("dialog"));
  await typeInto(getByRole("textbox", "Search contacts", { scope: dialog }), "ada");
  await click(getByRole("button", "Search", { scope: dialog }));
  await waitFor(() => assert.equal(Boolean(queryByRole("button", "Choose Ada L")), true));
  return dialog;
}

beforeEach(installApi);

afterEach(async () => {
  await cleanup();
  delete globalThis.__testApiClient;
});

// -------------------------------------------------------------- campaigns --

test("the campaigns panel lists unpublished campaigns and adds one as this contact", async () => {
  await openDetail();
  assert.equal(hasText("Unpublished"), true);
  assert.equal(hasText(/Added manually/), true);
  await click(getByRole("combobox", /Add to campaign/));
  await waitFor(() => assert.equal(Boolean(queryByRole("option", "Summit Follow-up")), true));
  assert.equal(queryByRole("option", /Welcome Series/) === null, true); // already a member
  await click(getByRole("option", "Summit Follow-up"));
  await click(getByRole("button", "Add", { scope: getByRole("region", "Campaigns") }));
  await waitFor(() => assert.equal(hasText("Added to Summit Follow-up."), true));
  assert.equal(JSON.stringify(posts(BULK)[0].payload), JSON.stringify({ action: "campaign_add", contact_ids: ["3"], campaign_id: "22" }));
  await waitFor(() => assert.equal(gets(CAMPAIGNS).length >= 2, true));
});

test("removing asks first and reports a skipped change", async () => {
  bulkResult = { updated: 0, skipped: 1, failed: 0, results: [{ mautic_contact_id: "3", name: "Ada", status: "skipped", message: "Not in the campaign." }] };
  await openDetail();
  await click(getByRole("button", "Remove from Welcome Series"));
  const dialog = await waitFor(() => getByRole("dialog"));
  assert.equal(hasText(/Remove Ada Lovelace from "Welcome Series"\? Mautic stops their remaining events/), true);
  await click(getByRole("button", "Remove", { scope: dialog }));
  await waitFor(() => assert.equal(hasText("Not in the campaign."), true));
  assert.equal(JSON.stringify(posts(BULK)[0].payload), JSON.stringify({ action: "campaign_remove", contact_ids: ["3"], campaign_id: "21" }));
});

// ------------------------------------------------------------------ merge --

test("merge finds the duplicate, explains the merge and keeps this contact", async () => {
  const dialog = await openMergePreview();
  assert.equal(queryByRole("button", "Choose Ada Lovelace") === null, true); // never offers itself
  await click(getByRole("button", "Choose Ada L"));
  await waitFor(() => assert.equal(hasText("Ada L will be merged into Ada Lovelace and then deleted. This cannot be undone."), true));
  assert.equal(gets(MERGE)[0].params.other_contact_id, "4");
  assert.equal(hasText(/Points are added together/), true);
  assert.equal(hasText("Do Not Contact records are kept."), true);
  assert.equal(hasText("Merged in and deleted"), true);

  const contactLoads = gets(CONTACT).length;
  await click(getByRole("button", "Merge", { scope: dialog }));
  await waitFor(() => assert.equal(hasText("Ada L was merged into this contact and deleted."), true));
  assert.equal(JSON.stringify(posts(MERGE)[0].payload), JSON.stringify({ other_contact_id: "4" }));
  await waitFor(() => assert.equal(queryByRole("dialog") === null, true));
  await waitFor(() => assert.equal(gets(CONTACT).length > contactLoads, true));
});

test("blockers are shown and the merge cannot be confirmed", async () => {
  preview = { ...preview, can_merge: false, blockers: [{ code: "linked_contact_merged_away",
    message: "Ada L is linked to an ECP account, so it must be the contact you keep. Open that contact and merge this one into it." }] };
  const dialog = await openMergePreview();
  await click(getByRole("button", "Choose Ada L"));
  await waitFor(() => assert.equal(hasText(/linked to an ECP account, so it must be the contact you keep/), true));
  assert.equal(getByRole("button", "Merge", { scope: dialog }).disabled, true);
  assert.equal(hasText(/will be merged into/), false);
  await click(getByRole("button", "Back", { scope: dialog }));
  await waitFor(() => assert.equal(Boolean(queryByRole("button", "Choose Ada L")), true));
});

test("a refused merge keeps the dialog open with the reason", async () => {
  mergeError = new Error("Request failed");
  mergeError.response = { status: 409, data: { detail: "The contact to merge away is subscribed to a Subscription List the kept contact is not.", code: "subscription_list_conflict" } };
  const dialog = await openMergePreview();
  await click(getByRole("button", "Choose Ada L"));
  await waitFor(() => assert.equal(hasText(/will be merged into/), true));
  await click(getByRole("button", "Merge", { scope: dialog }));
  await waitFor(() => assert.equal(hasText(/subscribed to a Subscription List the kept contact is not/), true));
  assert.equal(queryByRole("dialog") === null, false);
});
