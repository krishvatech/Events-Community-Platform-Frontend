import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { React, cleanup, click, getByRole, loadSource, queryByText, renderRoutes, router, waitFor } from "./helpers/blogDomHarness.mjs";

// Assertions compare strings/booleans only.
const { default: ContactSendEmailDialog, sendBlocker } = await loadSource("src/components/marketing/ContactSendEmailDialog.jsx");
const { Route } = router;
const h = React.createElement;
const hasText = (matcher) => queryByText(matcher) !== null;

const CONTACT = { email: "dana@example.test", communication_restrictions: [] };
const TEMPLATES = [
  { id: "22", name: "Welcome", subject: "Hi", isPublished: true, role: "main" },
  { id: "23", name: "Draft one", subject: "x", isPublished: false, role: "main" },
  { id: "24", name: "Welcome B", subject: "x", isPublished: true, role: "variant" },
];

afterEach(async () => {
  await cleanup();
  delete globalThis.__testApiClient;
});

test("contacts without an address or with an email Do Not Contact cannot be emailed", () => {
  assert.equal(sendBlocker(CONTACT), "");
  assert.match(sendBlocker({ email: "" }), /no email address/);
  assert.match(sendBlocker({ email: "a@x.test", communication_restrictions: [{ channel: "email" }] }), /Do Not Contact/);
});

test("only published main templates are offered and the send posts just the template id", async () => {
  const posts = [];
  let sent = null;
  globalThis.__testApiClient = {
    get: async (url) => (url === "/newsletter/admin/templates/" ? { data: { results: TEMPLATES } } : { data: {} }),
    post: async (url, payload) => {
      posts.push({ url, payload });
      return { data: { sent: true, to: "dana@example.test", templateName: "Welcome" } };
    },
  };
  await renderRoutes([h(Route, { key: "x", path: "/x", element: h(ContactSendEmailDialog, {
    open: true, contact: CONTACT, mauticContactId: "51", onClose: () => {}, onSent: (result) => { sent = result; },
  }) })], { url: "/x" });
  await click(getByRole("combobox", /Template/));
  await waitFor(() => assert.equal(Boolean(getByRole("option", /Welcome/)), true));
  assert.equal(hasText("Draft one"), false);
  assert.equal(hasText("Welcome B"), false);
  await click(getByRole("option", /^Welcome/));
  await click(getByRole("button", "Send email"));
  await waitFor(() => assert.equal(Boolean(sent), true));
  assert.equal(JSON.stringify(posts), JSON.stringify([{ url: "/newsletter/admin/contacts/51/send-email/", payload: { emailId: "22" } }]));
});

test("a Do Not Contact contact sees why and cannot send", async () => {
  globalThis.__testApiClient = { get: async () => ({ data: { results: TEMPLATES } }), post: async () => assert.fail("must not send") };
  await renderRoutes([h(Route, { key: "x", path: "/x", element: h(ContactSendEmailDialog, {
    open: true, contact: { email: "a@x.test", communication_restrictions: [{ channel: "email" }] }, mauticContactId: "51", onClose: () => {},
  }) })], { url: "/x" });
  await waitFor(() => assert.equal(hasText(/marked Do Not Contact for email/), true));
  assert.equal(getByRole("button", "Send email").disabled, true);
});
