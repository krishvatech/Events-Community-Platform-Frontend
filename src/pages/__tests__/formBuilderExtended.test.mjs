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
  queryByText,
  renderRoutes,
  router,
  typeInto,
  waitFor,
} from "./helpers/blogDomHarness.mjs";

// Field types beyond the basics, field/action removal, the newer submit actions
// and the submission export. Assertions compare strings/booleans only: a
// failing assert on a jsdom node serializes the whole DOM graph.

const { default: AdminNewsletterFormEditorPage } = await loadSource("src/pages/AdminNewsletterFormEditorPage.jsx");
const { default: AdminNewsletterFormSubmissionsPage } = await loadSource("src/pages/AdminNewsletterFormSubmissionsPage.jsx");
const fieldRules = await loadSource("src/pages/newsletterFormFields.js");
const actionRules = await loadSource("src/pages/newsletterFormActions.js");

const { Route } = router;
const h = React.createElement;
const hasText = (matcher) => queryByText(matcher) !== null;
const fieldRows = () => all("ol[aria-label='Form fields in order'] li[data-field-id]");
const actionRows = () => all("ol[aria-label='Submit actions in order'] li[data-action-id]");

const SLIDER = {
  type: "slider", label: "Slider", options: false, placeholder: false, required: true, helpMessage: true, defaultValue: false,
  mapping: true, precision: false, multiple: false, input: true,
  settings: [
    { key: "minValue", label: "Minimum", kind: "integer", default: "0" },
    { key: "maxValue", label: "Maximum", kind: "integer", default: "100" },
    { key: "step", label: "Step", kind: "integer", default: "1" },
  ],
};
const HTML = {
  type: "freehtml", label: "HTML block", options: false, placeholder: false, required: false, helpMessage: false, defaultValue: false,
  mapping: false, precision: false, multiple: false, input: false,
  settings: [{ key: "content", label: "HTML", kind: "html", default: "", maxLength: 20000 }],
};
const TEXT = { ...fieldRules.DEFAULT_FIELD_TYPES[0] };

const field = (overrides) => ({
  label: "", alias: "", type: "text", typeLabel: "Text", isRequired: false, helpMessage: "", validationMessage: "",
  defaultValue: "", mappedObject: "", mappedField: "", placeholder: "", precision: "", multiple: false, options: [],
  editable: true, lockReason: "", ...overrides,
});
const action = (overrides) => ({
  id: "7", name: "Tag lead", description: "", type: "lead.changetags", typeLabel: "Modify tags", order: 1, policy: "allowed",
  policyReason: "", editable: true, lockReason: "", settingsLocked: "", removable: true, addTags: [{ name: "Lead", id: "5" }],
  removeTags: [], ...overrides,
});
const makeForm = () => ({
  id: "31", name: "Training Inquiry", description: "", isPublished: false, formType: "standalone", postAction: "message",
  postActionProperty: "Thanks", fieldsEditable: true, fieldsLockReason: "", publishable: true, publishBlockers: [],
  fields: [
    field({ id: "1", label: "Email", alias: "email", type: "email", typeLabel: "Email" }),
    field({ id: "2", label: "Notes", alias: "notes", type: "textarea", typeLabel: "Text area" }),
    field({ id: "3", label: "Submit", alias: "submit", type: "button", typeLabel: "Submit button" }),
  ],
  actions: [action({}), action({ id: "9", name: "Undo DNC", type: "lead.remove_do_not_contact", typeLabel: "Remove Do Not Contact",
    policy: "prohibited", policyReason: "Not allowed.", editable: false, lockReason: "Not allowed." })],
});
const METADATA = {
  actionTypes: [
    { type: "lead.changetags", label: "Modify tags" },
    { type: "email.send.user", label: "Send an email to users", description: "Send a published email to Mautic users." },
  ],
  tags: [{ id: "5", name: "Lead" }],
  users: [{ id: "6", name: "Ravi A" }],
  emails: [{ id: "40", name: "New lead alert" }],
  assets: [],
  contactFields: [],
  policyNote: "",
};

const apiError = (status, data) => Object.assign(new Error(`HTTP ${status}`), { response: { status, data } });

function installApi({ handlers = {} } = {}) {
  const calls = [];
  let current = makeForm();
  const respond = async (method, url, payload, config) => {
    calls.push({ method, url, payload, data: config?.data });
    const key = `${method} ${url}`;
    if (handlers[key]) return handlers[key]({ payload, data: config?.data, current, set: (next) => (current = next) });
    if (url === "/newsletter/admin/forms/builder/") return { data: { fieldTypes: [TEXT, SLIDER, HTML], contactFields: [] } };
    if (url === "/newsletter/admin/forms/actions/metadata/") return { data: METADATA };
    if (method === "get" && url === "/newsletter/admin/forms/31/") return { data: current };
    if (method === "post" && url === "/newsletter/admin/forms/31/actions/") {
      current = { ...current, actions: [...current.actions, action({ id: "12", ...payload, typeLabel: payload.type })] };
      return { data: current };
    }
    throw apiError(404, { detail: "Not found." });
  };
  globalThis.__testApiClient = {
    get: (url, config) => respond("get", url, undefined, config),
    post: (url, payload) => respond("post", url, payload),
    patch: (url, payload) => respond("patch", url, payload),
    delete: (url, config) => respond("delete", url, undefined, config),
  };
  return { calls, writes: (method, url) => calls.filter((c) => c.method === method && (!url || c.url === url)) };
}

const render = (url) => renderRoutes(
  [
    h(Route, { key: "details", path: "/admin/newsletter/forms/:formId", element: h("div", null, "Form details") }),
    h(Route, { key: "edit", path: "/admin/newsletter/forms/:formId/edit", element: h(AdminNewsletterFormEditorPage) }),
    h(Route, { key: "subs", path: "/admin/newsletter/forms/:formId/submissions", element: h(AdminNewsletterFormSubmissionsPage) }),
  ],
  { url }
);

afterEach(async () => {
  await cleanup();
  delete globalThis.__testApiClient;
});

// ------------------------------------------------------------- pure rules --

test("type settings start from the catalogue defaults, validate like the backend and are sent", () => {
  const types = [TEXT, SLIDER, HTML];
  const slider = { ...fieldRules.blankFieldDraft("slider", types), label: "Budget" };
  assert.equal(JSON.stringify(slider.settings), JSON.stringify({ minValue: "0", maxValue: "100", step: "1" }));
  assert.equal(JSON.stringify(fieldRules.fieldDraftToPayload(slider, null, types)),
    JSON.stringify({ type: "slider", label: "Budget", minValue: "0", maxValue: "100", step: "1" }));
  const inverted = { ...slider, settings: { minValue: "50", maxValue: "10", step: "1" } };
  assert.match(fieldRules.validateFieldDraft(inverted, { isNew: true, types }).maxValue, /greater than/);
  const script = { ...fieldRules.blankFieldDraft("freehtml", types), label: "Note", settings: { content: "<p>x</p><script>1</script>" } };
  assert.match(fieldRules.validateFieldDraft(script, { isNew: true, types }).content, /not allowed/);
  const prose = { ...script, settings: { content: "<p>Learn JavaScript: the basics</p>" } };
  assert.equal(fieldRules.validateFieldDraft(prose, { isNew: true, types }).content, undefined);

  const saved = field({ id: "4", type: "slider", alias: "budget", label: "Budget", minValue: "0", maxValue: "100", step: "1" });
  const edited = { ...fieldRules.fieldToDraft(saved), settings: { minValue: "0", maxValue: "250", step: "1" } };
  assert.equal(JSON.stringify(fieldRules.fieldDraftToPayload(edited, saved, types)), JSON.stringify({ maxValue: "250" }));
});

test("newer submit actions validate their consent rules and send backend-ready settings", () => {
  const userEmail = { ...actionRules.blankActionDraft("email.send.user"), name: "Alert", emailId: "40" };
  assert.match(actionRules.validateActionDraft(userEmail).userIds, /at least one Mautic user/);
  const results = { ...actionRules.blankActionDraft("form.email"), name: "Notify", subject: "New lead", to: "{formfield=email}" };
  assert.match(actionRules.validateActionDraft(results).to, /not a valid email address/);
  const http = { ...actionRules.blankActionDraft("form.repost"), name: "CRM", postUrl: "http://hooks.example.com" };
  assert.match(actionRules.validateActionDraft(http).postUrl, /public https/);
  const internal = { ...http, postUrl: "https://192.168.1.4/hook" };
  assert.match(actionRules.validateActionDraft(internal).postUrl, /public https/);

  const ok = { ...results, to: "a@imaa.org, b@imaa.org", emailToOwner: true, message: "<p>{formfield=email}</p>" };
  assert.equal(JSON.stringify(actionRules.validateActionDraft(ok)), "{}");
  assert.equal(JSON.stringify(actionRules.actionDraftToPayload(ok, null)), JSON.stringify({
    type: "form.email", name: "Notify", description: "", subject: "New lead", message: "<p>{formfield=email}</p>",
    to: ["a@imaa.org", "b@imaa.org"], cc: [], bcc: [], emailToOwner: true, replyToSubmitter: true,
  }));
  const stored = action({ type: "form.repost", postUrl: "https://a.example.com", failureEmail: "", hasAuthorizationHeader: true });
  const keep = { ...actionRules.actionToDraft(stored), postUrl: "https://b.example.com" };
  assert.equal(JSON.stringify(actionRules.actionDraftToPayload(keep, stored)), JSON.stringify({ postUrl: "https://b.example.com", failureEmail: "" }));
  assert.match(actionRules.describeAction(stored), /with authorization header/);
  assert.equal(String(actionRules.describeAction(stored)).includes("Bearer"), false);
});

// ------------------------------------------------------------------ DOM --

test("removing a field with stored submissions asks for explicit data-loss confirmation", async () => {
  const api = installApi({
    handlers: {
      "delete /newsletter/admin/forms/31/fields/2/": ({ data, current, set }) => {
        if (!data?.confirm) throw apiError(409, { detail: "Confirm", code: "form_field_removal_unconfirmed", submissions: 3 });
        const next = { ...current, fields: current.fields.filter((f) => f.id !== "2") };
        set(next);
        return { data: next };
      },
    },
  });
  await render("/admin/newsletter/forms/31/edit");
  await waitFor(() => assert.equal(fieldRows().length, 3));
  await click(getByRole("button", "Remove Notes"));
  await click(getByRole("button", "Remove field"));
  await waitFor(() => assert.equal(hasText(/3 stored submissions/), true));
  assert.equal(getByRole("button", "Remove and delete values").disabled, true);
  await click(getByRole("checkbox", /I understand/));
  await click(getByRole("button", "Remove and delete values"));
  await waitFor(() => assert.equal(fieldRows().length, 2));
  const deletes = api.writes("delete", "/newsletter/admin/forms/31/fields/2/");
  assert.equal(JSON.stringify(deletes.map((c) => c.data)), JSON.stringify([{}, { confirm: true }]));
  assert.equal(hasText(/Field “Notes” removed and confirmed in Mautic/), true);
});

test("a refused field removal shows Mautic's reason and keeps the field", async () => {
  installApi({
    handlers: {
      "delete /newsletter/admin/forms/31/fields/1/": () => {
        throw apiError(409, { detail: "Campaign condition(s) check this field: Welcome (#4). Change them first.", code: "form_not_publishable" });
      },
    },
  });
  await render("/admin/newsletter/forms/31/edit");
  await waitFor(() => assert.equal(fieldRows().length, 3));
  await click(getByRole("button", "Remove Email"));
  await click(getByRole("button", "Remove field"));
  await waitFor(() => assert.equal(hasText(/Welcome \(#4\)/), true));
  assert.equal(fieldRows().length, 3);
});

test("a new slider shows its range settings and adding a user-email action needs a user", async () => {
  const api = installApi({
    handlers: {
      "post /newsletter/admin/forms/31/fields/": ({ payload, current, set }) => {
        const next = { ...current, fields: [...current.fields, field({ id: "9", alias: "budget", ...payload })] };
        set(next);
        return { data: next };
      },
    },
  });
  await render("/admin/newsletter/forms/31/edit");
  await waitFor(() => assert.equal(fieldRows().length, 3));
  await click(getByRole("button", "Add Field"));
  await chooseSelectOption(getByRole("combobox", /^Field type/), "Slider");
  await typeInto(getByRole("textbox", /^Label/), "Budget");
  await typeInto(getByRole("textbox", /^Maximum/), "500");
  await click(getByRole("button", "Add field"));
  await waitFor(() => assert.equal(fieldRows().length, 4));
  assert.equal(JSON.stringify(api.writes("post", "/newsletter/admin/forms/31/fields/")[0].payload),
    JSON.stringify({ type: "slider", label: "Budget", minValue: "0", maxValue: "500", step: "1" }));

  await click(getByRole("button", "Add Action"));
  await chooseSelectOption(getByRole("combobox", /^Action Modify tags/), "Send an email to users");
  await typeInto(getByRole("textbox", /^Action name/), "Alert");
  await chooseSelectOption(getByRole("combobox", /^Email to send/), "New lead alert");
  await click(getByRole("button", "Add action"));
  await waitFor(() => assert.equal(hasText(/With none, Mautic would email the contact/), true));
  assert.equal(api.writes("post", "/newsletter/admin/forms/31/actions/").length, 0);
});

test("any submit action can be removed after confirming", async () => {
  const api = installApi({
    handlers: {
      "delete /newsletter/admin/forms/31/actions/9/": ({ current, set }) => {
        const next = { ...current, actions: current.actions.filter((a) => a.id !== "9") };
        set(next);
        return { data: next };
      },
    },
  });
  await render("/admin/newsletter/forms/31/edit");
  await waitFor(() => assert.equal(actionRows().length, 2));
  assert.equal(getByRole("button", "Edit Undo DNC").disabled, true);
  await click(getByRole("button", "Remove Undo DNC"));
  await click(getByRole("button", "Remove action"));
  await waitFor(() => assert.equal(actionRows().length, 1));
  assert.equal(api.writes("delete", "/newsletter/admin/forms/31/actions/9/").length, 1);
});

test("submissions export starts in the background and lists the finished file", async () => {
  let jobs = [];
  const api = installApi({
    handlers: {
      "get /newsletter/admin/forms/31/submissions/": () => ({ data: { form: { id: "31", name: "Training Inquiry" }, count: 1, page: 1, page_size: 25, num_pages: 1,
        results: [{ id: "44", dateSubmitted: "2026-10-20T10:00:00+00:00", contact: null, preview: [] }] } }),
      "get /newsletter/admin/forms/31/submissions/exports/": () => ({ data: { results: jobs } }),
      "post /newsletter/admin/forms/31/submissions/exports/": ({ payload }) => {
        jobs = [{ id: "job-1", status: "done", format: payload.format, rows: 1, created_at: "2026-11-02T10:00:00+00:00", filename: "f.csv" }];
        return { data: jobs[0] };
      },
    },
  });
  await render("/admin/newsletter/forms/31/submissions");
  await waitFor(() => assert.equal(hasText("Export"), true));
  await click(getByRole("button", "Export"));
  await chooseSelectOption(getByRole("combobox", /^Format/), "Excel (.xlsx)");
  await click(getByRole("button", "Start Export"));
  await waitFor(() => assert.equal(hasText("1 submissions ready"), true));
  assert.equal(JSON.stringify(api.writes("post", "/newsletter/admin/forms/31/submissions/exports/")[0].payload), JSON.stringify({ format: "xlsx" }));
});
