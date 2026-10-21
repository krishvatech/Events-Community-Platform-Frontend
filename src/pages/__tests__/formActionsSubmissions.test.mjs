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
const { default: AdminNewsletterFormDetailsPage } = await loadSource("src/pages/AdminNewsletterFormDetailsPage.jsx");
const { default: AdminNewsletterFormSubmissionsPage } = await loadSource("src/pages/AdminNewsletterFormSubmissionsPage.jsx");
const { default: AdminNewsletterFormSubmissionDetailPage } = await loadSource("src/pages/AdminNewsletterFormSubmissionDetailPage.jsx");
const rules = await loadSource("src/pages/newsletterFormActions.js");

const { Route } = router;
const h = React.createElement;
const hasText = (matcher) => queryByText(matcher) !== null;
const actionRows = () => all("ol[aria-label='Submit actions in order'] li[data-action-id]");

const TAGS = [{ id: "5", name: "Lead" }, { id: "6", name: "Webinar" }];
const action = (overrides) => ({
  id: "7", name: "Tag lead", description: "", type: "lead.changetags", typeLabel: "Modify tags", order: 1,
  policy: "allowed", policyReason: "", editable: true, lockReason: "", settingsLocked: "",
  addTags: [{ name: "Lead", id: "5" }], removeTags: [], ...overrides,
});
const makeForm = (overrides = {}) => ({
  id: "31", name: "Training Inquiry", description: "", isPublished: false, formType: "standalone",
  postAction: "message", postActionProperty: "Thanks", fields: [], fieldsEditable: true, publishable: false,
  publishBlockers: [], campaignSource: true,
  actions: [
    action({}),
    action({ id: "8", name: "Score", type: "lead.pointschange", typeLabel: "Adjust points", order: 2, operator: "plus", points: 5, addTags: undefined }),
    action({ id: "9", name: "Undo DNC", type: "lead.remove_do_not_contact", typeLabel: "Remove Do Not Contact", order: 3,
      policy: "prohibited", policyReason: "Remove Do Not Contact is not allowed by ECP policy.", editable: false, lockReason: "Remove Do Not Contact is not allowed by ECP policy." }),
  ],
  ...overrides,
});

const apiError = (status, data) => Object.assign(new Error(`HTTP ${status}`), { response: { status, data } });

const SUBMISSIONS = {
  form: { id: "31", name: "Training Inquiry" }, count: 26, page: 1, page_size: 25, num_pages: 2,
  results: [{ id: "44", dateSubmitted: "2026-10-20T10:00:00+00:00", contact: { id: "501", email: "dana@example.test" },
    preview: [{ label: "Email", value: "dana@example.test" }, { label: "Notes", value: "<img src=x onerror=alert(1)>" }] }],
};
const SUBMISSION = {
  form: { id: "31", name: "Training Inquiry" }, id: "44", dateSubmitted: "2026-10-20T10:00:00+00:00",
  contact: { id: "501", email: "dana@example.test" },
  values: [
    { alias: "email", label: "Email", type: "email", value: "dana@example.test", masked: false },
    { alias: "secret", label: "Secret", type: "password", value: null, masked: true },
    { alias: "notes", label: "Notes", type: "textarea", value: "<b>bold?</b>", masked: false },
  ],
};

function installApi({ form = makeForm(), handlers = {} } = {}) {
  const calls = [];
  let current = form;
  const respond = async (method, url, payload, config) => {
    calls.push({ method, url, payload, params: config?.params });
    const key = `${method} ${url}`;
    if (handlers[key]) return handlers[key](payload, config);
    if (url === "/newsletter/admin/forms/actions/metadata/") return { data: { actionTypes: [], tags: TAGS, policyNote: "" } };
    if (url === "/newsletter/admin/forms/builder/") return { data: { fieldTypes: [], contactFields: [] } };
    if (url === "/newsletter/admin/forms/31/usage/") {
      return { data: { campaignSources: [{ id: 3, name: "Nurture", published: true }], campaignEvents: [], pointActions: [], submissions: { total: 26, latest: "2026-10-20 10:00:00" } } };
    }
    if (method === "get" && url === "/newsletter/admin/forms/31/") return { data: current };
    if (method === "get" && url === "/newsletter/admin/forms/31/submissions/") return { data: { ...SUBMISSIONS, page: config?.params?.page || 1 } };
    if (method === "get" && url === "/newsletter/admin/forms/31/submissions/44/") return { data: SUBMISSION };
    if (method === "post" && url === "/newsletter/admin/forms/31/actions/") {
      current = { ...current, actions: [...current.actions, action({ id: "12", ...payload, type: payload.type })] };
      return { data: { ...current, actionId: "12" } };
    }
    const update = url.match(/^\/newsletter\/admin\/forms\/31\/actions\/(\d+)\/$/);
    if (method === "patch" && update) {
      current = { ...current, actions: current.actions.map((a) => (a.id === update[1] ? { ...a, ...payload } : a)) };
      return { data: current };
    }
    if (method === "post" && url === "/newsletter/admin/forms/31/actions/reorder/") {
      current = { ...current, actions: payload.order.map((id) => current.actions.find((a) => a.id === id)) };
      return { data: current };
    }
    throw apiError(404, { detail: "Not found." });
  };
  globalThis.__testApiClient = {
    get: (url, config) => respond("get", url, undefined, config),
    post: (url, payload) => respond("post", url, payload),
    patch: (url, payload) => respond("patch", url, payload),
    delete: (url) => respond("delete", url),
  };
  return { calls, writes: (method, url) => calls.filter((c) => c.method === method && (!url || c.url === url)) };
}

const render = (url) =>
  renderRoutes(
    [
      h(Route, { key: "list", path: "/admin/newsletter/forms", element: h("div", null, "Forms list") }),
      h(Route, { key: "details", path: "/admin/newsletter/forms/:formId", element: h(AdminNewsletterFormDetailsPage) }),
      h(Route, { key: "edit", path: "/admin/newsletter/forms/:formId/edit", element: h(AdminNewsletterFormEditorPage) }),
      h(Route, { key: "subs", path: "/admin/newsletter/forms/:formId/submissions", element: h(AdminNewsletterFormSubmissionsPage) }),
      h(Route, { key: "sub", path: "/admin/newsletter/forms/:formId/submissions/:submissionId", element: h(AdminNewsletterFormSubmissionDetailPage) }),
    ],
    { url }
  );

afterEach(async () => {
  await cleanup();
  delete globalThis.__testApiClient;
});

// ------------------------------------------------------------- rules --

test("action drafts validate like the backend and send only changes", () => {
  assert.deepEqual(Object.keys(rules.validateActionDraft(rules.blankActionDraft(rules.TAGS))).sort(), ["addTags", "name"]);
  assert.match(rules.validateActionDraft({ ...rules.blankActionDraft(rules.TAGS), name: "x", addTags: ["5"], removeTags: ["5"] }).removeTags, /both/);
  assert.match(rules.validateActionDraft({ ...rules.blankActionDraft(rules.POINTS), name: "x", points: "0" }).points, /1 to/);
  assert.match(rules.validateActionDraft({ ...rules.blankActionDraft(rules.POINTS), name: "x", operator: "times", points: "2" }).operator, /add or subtract/);
  assert.deepEqual(rules.actionDraftToPayload({ ...rules.blankActionDraft(rules.POINTS), name: " S ", points: "4" }, null),
    { type: "lead.pointschange", name: "S", description: "", operator: "plus", points: 4 });
  const saved = action({});
  assert.deepEqual(rules.actionDraftToPayload(rules.actionToDraft(saved), saved), {});
  assert.deepEqual(rules.actionDraftToPayload({ ...rules.actionToDraft(saved), addTags: ["5", "6"] }, saved), { addTags: ["5", "6"], removeTags: [] });
  assert.equal(rules.describeAction(action({})), "add Lead");
});

// ------------------------------------------------------------- editor --

test("the editor lists actions with prohibited ones read-only and flagged", async () => {
  installApi();
  await render("/admin/newsletter/forms/31/edit");
  await waitFor(() => assert.equal(actionRows().length, 3));
  assert.match(actionRows()[0].textContent, /Tag lead.*add Lead/);
  assert.match(actionRows()[1].textContent, /Score.*\+5 points/);
  assert.match(actionRows()[2].textContent, /not allowed by ECP policy/);
  assert.equal(getByRole("button", "Edit Undo DNC").disabled, true);
  assert.equal(getByRole("button", "Edit Tag lead").disabled, false);
});

test("adding a points action sends native-ready settings and shows Mautic's confirmed list", async () => {
  const api = installApi();
  await render("/admin/newsletter/forms/31/edit");
  await waitFor(() => assert.equal(actionRows().length, 3));
  await click(getByRole("button", "Add Action"));
  await chooseSelectOption(getByRole("combobox", /^Action Modify tags/), "Adjust points");
  await typeInto(getByRole("textbox", /^Action name/), "Score lead");
  await click(getByRole("button", "Add action"));
  await waitFor(() => assert.equal(hasText(/Points must be a whole number/), true));
  assert.equal(api.writes("post").length, 0);
  await typeInto(getByRole("textbox", /^Points/), "10");
  await click(getByRole("button", "Add action"));
  await waitFor(() => assert.equal(hasText("Submit action added and confirmed in Mautic."), true));
  assert.equal(JSON.stringify(api.writes("post", "/newsletter/admin/forms/31/actions/")[0].payload),
    JSON.stringify({ type: "lead.pointschange", name: "Score lead", description: "", operator: "plus", points: 10 }));
  assert.equal(actionRows().length, 4);
});

test("editing a tag action sends only the changed tag lists, by ID", async () => {
  const api = installApi();
  await render("/admin/newsletter/forms/31/edit");
  await waitFor(() => assert.equal(actionRows().length, 3));
  await click(getByRole("button", "Edit Tag lead"));
  await typeInto(getByRole("textbox", /^Action name/), "Tag lead v2");
  await click(getByRole("button", "Save action"));
  await waitFor(() => assert.equal(hasText("Submit action saved and confirmed in Mautic."), true));
  assert.equal(JSON.stringify(api.writes("patch")[0].payload), JSON.stringify({ name: "Tag lead v2" }));
});

test("a tag action whose stored tag is gone keeps its tag lists locked", async () => {
  installApi({ form: makeForm({ actions: [action({ addTags: [{ name: "Gone", id: null }], settingsLocked: "A stored tag no longer exists in Mautic, so the tag lists are managed in Mautic." })] }) });
  await render("/admin/newsletter/forms/31/edit");
  await waitFor(() => assert.equal(actionRows().length, 1));
  await click(getByRole("button", "Edit Tag lead"));
  await waitFor(() => assert.equal(hasText(/stored tag no longer exists/), true));
  assert.equal(all("input[role='combobox']").filter((input) => input.disabled).length >= 2, true);
});

test("re-ordering actions is held until saved", async () => {
  const api = installApi();
  await render("/admin/newsletter/forms/31/edit");
  await waitFor(() => assert.equal(actionRows().length, 3));
  await click(getByRole("button", "Move Score up"));
  await waitFor(() => assert.equal(hasText("The new action order is not saved yet."), true));
  await click(getByRole("button", "Save action order"));
  await waitFor(() => assert.equal(hasText("Submit action order saved and confirmed in Mautic."), true));
  assert.equal(JSON.stringify(api.writes("post", "/newsletter/admin/forms/31/actions/reorder/")[0].payload), JSON.stringify({ order: ["8", "7", "9"] }));
});

test("a refused action shows the provider's reason and keeps the draft", async () => {
  installApi({ handlers: { "post /newsletter/admin/forms/31/actions/": async () => {
    throw apiError(400, { detail: "Remove Do Not Contact is not allowed by ECP policy.", code: "form_action_prohibited" });
  } } });
  await render("/admin/newsletter/forms/31/edit");
  await waitFor(() => assert.equal(actionRows().length, 3));
  await click(getByRole("button", "Add Action"));
  await typeInto(getByRole("textbox", /^Action name/), "Tag");
  await chooseSelectOption(getByRole("combobox", /^Add tags/), "Webinar");
  await click(getByRole("button", "Add action"));
  await waitFor(() => assert.equal(hasText("Remove Do Not Contact is not allowed by ECP policy."), true));
  assert.equal(getByRole("textbox", /^Action name/).value, "Tag");
});

test("unsaved action work holds navigation", async () => {
  installApi();
  const view = await render("/admin/newsletter/forms/31/edit");
  await waitFor(() => assert.equal(actionRows().length, 3));
  await click(getByRole("button", "Edit Score"));
  await typeInto(getByRole("textbox", /^Points/), "9");
  await click(getByRole("link", "Forms"));
  await waitFor(() => assert.equal(hasText("Leave without saving?"), true));
  await click(getByRole("button", "Keep Editing"));
  assert.equal(view.path(), "/admin/newsletter/forms/31/edit");
});

// --------------------------------------------------------- details/usage --

test("details show usage and link to submissions", async () => {
  installApi();
  const view = await render("/admin/newsletter/forms/31");
  await waitFor(() => assert.equal(hasText(/Nurture \(#3\)/), true));
  assert.equal(hasText(/Stored submissions:/), true);
  await click(getByRole("button", "Submissions (26)"));
  await waitFor(() => assert.equal(view.path(), "/admin/newsletter/forms/31/submissions"));
});

// ---------------------------------------------------------- submissions --

test("the submissions list is paginated, minimal and shows values as text", async () => {
  const api = installApi();
  const view = await render("/admin/newsletter/forms/31/submissions");
  await waitFor(() => assert.equal(all("table[aria-label='Form submissions'] tbody tr[data-submission-id]").length, 1));
  assert.equal(hasText("dana@example.test"), true);
  assert.equal(all("table img").length, 0); // stored markup is never interpreted
  assert.equal(hasText(/<img src=x/), true);
  await click(getByRole("button", "Go to next page"));
  await waitFor(() => assert.equal(api.calls.at(-1).params.page, 2));
  await click(all("table tbody tr[data-submission-id] td")[1]);
  await waitFor(() => assert.equal(view.path(), "/admin/newsletter/forms/31/submissions/44"));
});

test("a submission shows labelled values, masks passwords and renders markup as text", async () => {
  installApi();
  await render("/admin/newsletter/forms/31/submissions/44");
  await waitFor(() => assert.equal(hasText("Submission #44"), true));
  await waitFor(() => assert.equal(hasText("Hidden for privacy"), true));
  assert.equal(hasText("<b>bold?</b>"), true);
  assert.equal(all("table b").length, 0);
  assert.equal(all("a[href='/admin/newsletter/contacts/501']").length, 1);
});

test("empty, refused and missing submission states", async () => {
  installApi({ handlers: { "get /newsletter/admin/forms/31/submissions/": async () => ({ data: { ...SUBMISSIONS, count: 0, num_pages: 0, results: [] } }) } });
  await render("/admin/newsletter/forms/31/submissions");
  await waitFor(() => assert.equal(hasText("No submissions yet."), true));
  await cleanup();

  installApi({ handlers: { "get /newsletter/admin/forms/31/submissions/": async () => { throw apiError(403, { detail: "Forbidden" }); } } });
  await render("/admin/newsletter/forms/31/submissions");
  await waitFor(() => assert.equal(hasText("You do not have access to Forms."), true));
  await cleanup();

  installApi({ handlers: { "get /newsletter/admin/forms/31/submissions/44/": async () => { throw apiError(404, { detail: "Submission not found for this Form." }); } } });
  await render("/admin/newsletter/forms/31/submissions/44");
  await waitFor(() => assert.equal(hasText("Submission not found."), true));
  assert.equal(queryByRole("table", "Submitted values"), null);
});
