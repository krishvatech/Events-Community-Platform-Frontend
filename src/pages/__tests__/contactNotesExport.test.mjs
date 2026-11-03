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

// Assertions compare strings/booleans only (see contactImport.test.mjs).

const { default: ContactNoteItem } = await loadSource("src/components/marketing/ContactNoteItem.jsx");
const { default: AdminNewsletterContactDetailPage } = await loadSource("src/pages/AdminNewsletterContactDetailPage.jsx");
const { Route } = router;
const h = React.createElement;
const hasText = (matcher) => queryByText(matcher) !== null;

const NOTE = "/newsletter/admin/contacts/3/notes/9/";
const EXPORT = "/newsletter/admin/contacts/3/data-export/";

let requests;
let failWith;
let changed;

beforeEach(() => {
  requests = [];
  failWith = null;
  changed = [];
  globalThis.__testApiClient = {
    get: async (url, config = {}) => {
      requests.push({ method: "get", url, config });
      if (url === "/newsletter/admin/contacts/3/") {
        return { data: { mautic_contact_id: "3", name: "Ada Lovelace", email: "ada@example.test", owner: null,
          contact_info: { first_name: "Ada", last_name: "Lovelace", email: "ada@example.test" }, subscription_lists: [], tags: [], dnc: [] } };
      }
      if (url === EXPORT) {
        if (failWith) throw failWith;
        return { data: new Blob(["zip"], { type: "application/zip" }) };
      }
      return { data: {} };
    },
    patch: async (url, payload) => {
      requests.push({ method: "patch", url, payload });
      if (failWith) throw failWith;
      return { data: { id: 9, ...payload } };
    },
    delete: async (url) => {
      requests.push({ method: "delete", url });
      if (failWith) throw failWith;
      return { data: null };
    },
  };
});

afterEach(async () => {
  await cleanup();
  delete globalThis.__testApiClient;
});

const sent = (method) => requests.filter((r) => r.method === method);

function renderNote() {
  const element = h(ContactNoteItem, { contactId: "3", note: { id: 9, text: "Called about renewal", type: "call" }, meta: "call",
    onChanged: (message) => changed.push(message) });
  return renderRoutes([h(Route, { key: "n", path: "/n", element })], { url: "/n" });
}

test("editing a note sends only what changed", async () => {
  await renderNote();
  await click(getByRole("button", /Edit note: Called about renewal/));
  const dialog = await waitFor(() => getByRole("dialog"));
  await click(getByRole("button", "Save", { scope: dialog })); // nothing changed: no request
  await waitFor(() => assert.equal(changed.length, 1));
  assert.equal(sent("patch").length, 0);
  await click(getByRole("button", /Edit note/));
  const second = await waitFor(() => getByRole("dialog"));
  const box = getByRole("textbox", "Note", { scope: second });
  await typeInto(box, "Renewal confirmed");
  await click(getByRole("button", "Save", { scope: second }));
  await waitFor(() => assert.equal(sent("patch").length, 1));
  assert.equal(sent("patch")[0].url, NOTE);
  assert.equal(JSON.stringify(sent("patch")[0].payload), JSON.stringify({ text: "Renewal confirmed" }));
  await waitFor(() => assert.equal(changed[1], "Note saved."));
});

test("an empty note cannot be saved and a refused save keeps the dialog open", async () => {
  await renderNote();
  await click(getByRole("button", /Edit note/));
  const dialog = await waitFor(() => getByRole("dialog"));
  await typeInto(getByRole("textbox", "Note", { scope: dialog }), "   ");
  assert.equal(getByRole("button", "Save", { scope: dialog }).disabled, true);
  failWith = { response: { status: 404, data: { detail: "Note not found." } } };
  await typeInto(getByRole("textbox", "Note", { scope: dialog }), "Changed");
  await click(getByRole("button", "Save", { scope: dialog }));
  await waitFor(() => assert.equal(hasText("Note not found."), true));
  assert.equal(Boolean(queryByRole("dialog")), true);
  assert.equal(changed.length, 0);
});

test("deleting a note asks first, then deletes it once", async () => {
  await renderNote();
  await click(getByRole("button", /Delete note: Called about renewal/));
  const dialog = await waitFor(() => getByRole("dialog"));
  assert.equal(hasText(/cannot be undone/), true);
  assert.equal(sent("delete").length, 0);
  await click(getByRole("button", "Delete", { scope: dialog }));
  await waitFor(() => assert.equal(changed[0], "Note deleted."));
  assert.equal(JSON.stringify(sent("delete").map((r) => r.url)), JSON.stringify([NOTE]));
});

async function openDetail() {
  await renderRoutes(
    [h(Route, { key: "detail", path: "/admin/newsletter/contacts/:mauticContactId", element: h(AdminNewsletterContactDetailPage) })],
    { url: "/admin/newsletter/contacts/3" }
  );
  await waitFor(() => assert.equal(getByRole("button", "Export data").disabled, false));
}

test("Export data downloads the contact's ZIP", async () => {
  const saved = [];
  const { createObjectURL, revokeObjectURL } = URL;
  URL.createObjectURL = (blob) => { saved.push(blob.type); return "blob:x"; };
  URL.revokeObjectURL = () => {};
  try {
    await openDetail();
    await click(getByRole("button", "Export data"));
    await waitFor(() => assert.equal(saved.length, 1));
    assert.equal(saved[0], "application/zip");
    assert.equal(sent("get").find((r) => r.url === EXPORT).config.responseType, "blob");
  } finally {
    Object.assign(URL, { createObjectURL, revokeObjectURL });
  }
});

test("a failed export shows the server's reason", async () => {
  failWith = { response: { status: 502, data: new Blob([JSON.stringify({ detail: "Mautic is unavailable." })], { type: "application/json" }) } };
  await openDetail();
  await click(getByRole("button", "Export data"));
  await waitFor(() => assert.equal(hasText("Mautic is unavailable."), true));
});
