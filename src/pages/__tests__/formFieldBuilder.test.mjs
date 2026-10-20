import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import {
  React,
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
  typeInto,
  waitFor,
} from "./helpers/blogDomHarness.mjs";

// Assertions compare strings/booleans only: a failing assert on a jsdom node
// serializes the whole DOM graph and exhausts memory.

const { default: AdminNewsletterFormEditorPage } = await loadSource("src/pages/AdminNewsletterFormEditorPage.jsx");
const rules = await loadSource("src/pages/newsletterFormFields.js");

const { Route } = router;
const h = React.createElement;
const hasText = (matcher) => queryByText(matcher) !== null;
const fieldRows = () => all("ol[aria-label='Form fields in order'] li[data-field-id]");

const field = (overrides) => ({
  label: "", alias: "", type: "text", typeLabel: "Text", isRequired: false, helpMessage: "", validationMessage: "",
  defaultValue: "", mappedObject: "", mappedField: "", placeholder: "", precision: "", multiple: false, options: [],
  editable: true, lockReason: "", ...overrides,
});

const makeForm = (overrides = {}) => ({
  id: "31",
  name: "Training Inquiry",
  description: "",
  isPublished: false,
  formType: "standalone",
  postAction: "message",
  postActionProperty: "Thanks",
  fields: [
    field({ id: "1", label: "Email", alias: "email", type: "email", typeLabel: "Email", isRequired: true, mappedObject: "contact", mappedField: "email" }),
    field({ id: "2", label: "Interest", alias: "interest", type: "select", typeLabel: "Dropdown", options: [{ label: "A", value: "a" }] }),
  ],
  actions: [],
  publishable: false,
  publishBlockers: ["The Form has no submit button. Add one in Mautic first."],
  fieldsEditable: true,
  fieldsLockReason: "",
  ...overrides,
});

const CONTACT_FIELDS = [
  { alias: "email", label: "Email", type: "email", fieldTypes: ["email"] },
  { alias: "firstname", label: "First Name", type: "text", fieldTypes: ["hidden", "select", "text"] },
  { alias: "country", label: "Country", type: "country", fieldTypes: ["country"] },
];

const apiError = (status, data) => Object.assign(new Error(`HTTP ${status}`), { response: { status, data } });

function installApi({ form = makeForm(), handlers = {} } = {}) {
  const calls = [];
  let current = form;
  const respond = async (method, url, payload) => {
    calls.push({ method, url, payload });
    const key = `${method} ${url}`;
    if (handlers[key]) return handlers[key](payload);
    if (method === "get" && url === "/newsletter/admin/forms/builder/") return { data: { fieldTypes: [], contactFields: CONTACT_FIELDS } };
    if (method === "get" && url === "/newsletter/admin/forms/31/") return { data: current };
    if (method === "post" && url === "/newsletter/admin/forms/31/fields/") {
      current = { ...current, fields: [...current.fields, field({ id: "9", alias: payload.alias || "new", ...payload })] };
      return { data: { ...current, fieldId: "9" } };
    }
    const update = url.match(/^\/newsletter\/admin\/forms\/31\/fields\/(\d+)\/$/);
    if (method === "patch" && update) {
      current = { ...current, fields: current.fields.map((f) => (f.id === update[1] ? { ...f, ...payload } : f)) };
      return { data: current };
    }
    if (method === "post" && url === "/newsletter/admin/forms/31/fields/reorder/") {
      current = { ...current, fields: payload.order.map((id) => current.fields.find((f) => f.id === id)) };
      return { data: current };
    }
    throw new Error(`unexpected ${method} ${url}`);
  };
  globalThis.__testApiClient = {
    get: (url) => respond("get", url),
    post: (url, payload) => respond("post", url, payload),
    patch: (url, payload) => respond("patch", url, payload),
    delete: (url) => respond("delete", url),
  };
  return { calls, writes: (method, url) => calls.filter((c) => c.method === method && (!url || c.url === url)) };
}

const openEditor = async () => {
  const view = await renderRoutes(
    [
      h(Route, { key: "details", path: "/admin/newsletter/forms/:formId", element: h("div", null, "Form details") }),
      h(Route, { key: "list", path: "/admin/newsletter/forms", element: h("div", null, "Forms list") }),
      h(Route, { key: "edit", path: "/admin/newsletter/forms/:formId/edit", element: h(AdminNewsletterFormEditorPage) }),
    ],
    { url: "/admin/newsletter/forms/31/edit" }
  );
  await waitFor(() => assert.equal(fieldRows().length, 2));
  return view;
};

afterEach(async () => {
  await cleanup();
  delete globalThis.__testApiClient;
});

// ------------------------------------------------------------- pure rules --

test("draft validation mirrors the backend", () => {
  const blank = rules.blankFieldDraft("select");
  const errors = rules.validateFieldDraft(blank, { isNew: true, fields: [] });
  assert.deepEqual(Object.keys(errors).sort(), ["label", "options"]);

  const dup = { ...rules.blankFieldDraft("radiogrp"), label: "Level", options: [{ key: "a", label: "A", value: "x" }, { key: "b", label: "B", value: "x" }] };
  assert.match(rules.validateFieldDraft(dup, { isNew: true }).options, /more than once/);

  const badDefault = { ...rules.blankFieldDraft("select"), label: "S", options: [{ key: "a", label: "A", value: "a" }], defaultValue: "z" };
  assert.match(rules.validateFieldDraft(badDefault, { isNew: true }).defaultValue, /option values/);

  const fields = [{ id: "1", alias: "email", type: "button", mappedField: "email", mappedObject: "contact", label: "Email" }];
  assert.match(rules.validateFieldDraft({ ...rules.blankFieldDraft("button"), label: "Go" }, { isNew: true, fields }).type, /already has a submit button/);
  assert.match(rules.validateFieldDraft({ ...rules.blankFieldDraft("text"), label: "X", alias: "email" }, { isNew: true, fields }).alias, /already uses/);
  assert.match(rules.validateFieldDraft({ ...rules.blankFieldDraft("email"), label: "X", mappedField: "email" }, { isNew: true, fields, contactFields: CONTACT_FIELDS }).mappedField, /already mapped/);
  assert.match(rules.validateFieldDraft({ ...rules.blankFieldDraft("tel"), label: "X", mappedField: "country" }, { isNew: true, contactFields: CONTACT_FIELDS }).mappedField, /does not accept/);
  assert.equal(rules.validateFieldDraft({ ...rules.blankFieldDraft("number"), label: "N", defaultValue: "x" }, { isNew: true }).defaultValue, "The default must be a number.");
});

test("payloads send native-ready settings: all for new fields, only changes for saved ones", () => {
  const draft = { ...rules.blankFieldDraft("select"), label: " Topic ", options: [{ key: "k", label: "Valuation", value: "valuation" }], isRequired: true, helpMessage: "Pick one" };
  assert.deepEqual(rules.fieldDraftToPayload(draft, null), {
    type: "select", label: "Topic", isRequired: true, helpMessage: "Pick one", options: [{ label: "Valuation", value: "valuation" }],
  });
  const saved = field({ id: "2", label: "Interest", alias: "interest", type: "select", options: [{ label: "A", value: "a" }] });
  const edited = { ...rules.fieldToDraft(saved), label: "Interest area" };
  assert.deepEqual(rules.fieldDraftToPayload(edited, saved), { label: "Interest area" });
  assert.deepEqual(rules.fieldDraftToPayload(rules.fieldToDraft(saved), saved), {});
  const button = { ...rules.blankFieldDraft("button"), label: "Send", isRequired: true, mappedField: "email" };
  assert.deepEqual(rules.fieldDraftToPayload(button, null), { type: "button", label: "Send" });
});

test("changing an unsaved field's type keeps what still applies", () => {
  const draft = { ...rules.blankFieldDraft("select"), label: "Topic", helpMessage: "Help", options: [{ key: "k", label: "A", value: "a" }], multiple: true };
  const radio = rules.changeDraftType(draft, "radiogrp");
  assert.equal(radio.label, "Topic");
  assert.equal(radio.options.length, 1);
  assert.equal(radio.multiple, false);
  const hidden = rules.changeDraftType({ ...draft, isRequired: true }, "hidden");
  assert.equal(hidden.isRequired, false);
  assert.equal(hidden.helpMessage, "");
  assert.equal(hidden.label, "Topic");
  assert.equal(rules.suggestAlias("First Name", new Set(["first_name"])), "first_name_2");
});

// ------------------------------------------------------------------- UI --

test("the editor lists saved fields in order with their settings and blockers", async () => {
  installApi();
  await openEditor();
  const [first, second] = fieldRows().map((row) => row.textContent);
  assert.match(first, /Email.*Required.*→ email/);
  assert.match(second, /Interest.*Dropdown/);
  assert.equal(hasText(/no submit button/), true);
  assert.equal(queryByRole("button", /Delete|Remove field/), null);
});

test("adding a mapped required field sends it and shows Mautic's confirmed list", async () => {
  const api = installApi();
  await openEditor();
  await click(getByRole("button", "Add Field"));
  await chooseSelectOption(getByRole("combobox", /Field type/), "Text");
  await typeInto(getByRole("textbox", /^Label/), "First name");
  // MUI's Switch: the checkbox input sits inside its label.
  await click(all("label").find((label) => label.textContent.trim() === "Required").querySelector("input[type='checkbox']"));
  await typeInto(getByRole("textbox", /Message when missing/), "Tell us your name");
  await chooseSelectOption(getByRole("combobox", /Save to Contact field/), "First Name (firstname)");
  await click(getByRole("button", "Add field"));

  await waitFor(() => assert.equal(hasText("Field added and confirmed in Mautic."), true));
  assert.equal(JSON.stringify(api.writes("post", "/newsletter/admin/forms/31/fields/")[0].payload), JSON.stringify({
    type: "text", label: "First name", isRequired: true, validationMessage: "Tell us your name", mappedField: "firstname",
  }));
  assert.equal(fieldRows().length, 3);
});

test("dropdown options are edited natively and invalid ones never reach the API", async () => {
  const api = installApi();
  await openEditor();
  await click(getByRole("button", "Add Field"));
  await chooseSelectOption(getByRole("combobox", /Field type/), "Dropdown");
  await typeInto(getByRole("textbox", /^Label/), "Topic");
  await typeInto(getByRole("textbox", "Option 1 label"), "Valuation");
  await typeInto(getByRole("textbox", "Option 1 value"), "same");
  await click(getByRole("button", "Add option"));
  await typeInto(getByRole("textbox", "Option 2 label"), "Integration");
  await typeInto(getByRole("textbox", "Option 2 value"), "same");
  await click(getByRole("button", "Add field"));
  await waitFor(() => assert.equal(hasText(/is used more than once/), true));
  assert.equal(api.writes("post").length, 0);

  await typeInto(getByRole("textbox", "Option 2 value"), "integration");
  await click(getByRole("button", "Move option 2 up"));
  await click(getByRole("button", "Add field"));
  await waitFor(() => assert.equal(api.writes("post").length, 1));
  assert.equal(JSON.stringify(api.writes("post")[0].payload.options), JSON.stringify([
    { label: "Integration", value: "integration" }, { label: "Valuation", value: "same" },
  ]));
});

test("re-ordering is held until Save order, then confirmed", async () => {
  const api = installApi();
  await openEditor();
  await click(getByRole("button", "Move Email down"));
  await waitFor(() => assert.equal(hasText("The new field order is not saved yet."), true));
  assert.equal(api.writes("post").length, 0);
  await click(getByRole("button", "Save order"));
  await waitFor(() => assert.equal(hasText("Field order saved and confirmed in Mautic."), true));
  assert.equal(JSON.stringify(api.writes("post")[0].payload), JSON.stringify({ order: ["2", "1"] }));
  assert.match(fieldRows()[0].textContent, /Interest/);
});

test("editing a saved field sends only the change; type and alias are locked", async () => {
  const api = installApi();
  await openEditor();
  await click(getByRole("button", "Edit Interest"));
  assert.equal(getByRole("textbox", /^Alias/).disabled, true);
  await typeInto(getByRole("textbox", /^Label/), "Interest area");
  await click(getByRole("button", "Save field"));
  await waitFor(() => assert.equal(hasText("Field saved and confirmed in Mautic."), true));
  assert.equal(JSON.stringify(api.writes("patch")[0].payload), JSON.stringify({ label: "Interest area" }));
});

test("provider and permission errors keep the draft and point at the field", async () => {
  installApi({ handlers: { "post /newsletter/admin/forms/31/fields/": async () => {
    throw apiError(400, { detail: 'The "ecp_newsletter_opt_in" Contact field records consent or system data and cannot be filled by a Form.', errors: { mappedField: "Consent fields cannot be filled by a Form." } });
  } } });
  await openEditor();
  await click(getByRole("button", "Add Field"));
  await typeInto(getByRole("textbox", /^Label/), "Opt in");
  await click(getByRole("button", "Add field"));
  await waitFor(() => assert.equal(hasText("Consent fields cannot be filled by a Form."), true));
  assert.equal(getByRole("textbox", /^Label/).value, "Opt in");

  await cleanup();
  installApi({ handlers: { "post /newsletter/admin/forms/31/fields/": async () => {
    throw apiError(403, { detail: "Your Mautic user is not allowed to perform this operation.", code: "mautic_permission_denied" });
  } } });
  await openEditor();
  await click(getByRole("button", "Add Field"));
  await typeInto(getByRole("textbox", /^Label/), "X");
  await click(getByRole("button", "Add field"));
  await waitFor(() => assert.equal(hasText("Your Mautic user is not allowed to perform this operation."), true));
});

test("unsaved field work is protected: switching fields asks, leaving the page asks", async () => {
  installApi();
  const view = await openEditor();
  await click(getByRole("button", "Edit Interest"));
  await typeInto(getByRole("textbox", /^Label/), "Changed");
  await click(getByRole("button", "Edit Email"));
  await waitFor(() => assert.equal(hasText("Discard field changes?"), true));
  await click(getByRole("button", "Keep Editing"));
  assert.equal(getByRole("textbox", /^Label/).value, "Changed");

  await click(getByRole("link", "Forms"));
  await waitFor(() => assert.equal(hasText("Leave without saving?"), true));
  await click(getByRole("button", "Leave Without Saving"));
  await waitFor(() => assert.equal(view.path(), "/admin/newsletter/forms"));
});

test("Forms whose fields Mautic must manage are read-only here", async () => {
  installApi({ form: makeForm({ fieldsEditable: false, fieldsLockReason: "This Form has conditional fields, so its fields are managed in Mautic." }) });
  await openEditor();
  assert.equal(hasText(/conditional fields/), true);
  assert.equal(getByRole("button", "Add Field").disabled, true);
  assert.equal(getByRole("button", "Edit Interest").disabled, true);
});
