import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

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
  typeInto,
  waitFor,
} from "./helpers/blogDomHarness.mjs";

// Assertions compare strings/booleans only: a failing assert on a jsdom node
// serializes the whole DOM graph and exhausts memory.

const { default: AdminNewsletterFormsPage } = await loadSource("src/pages/AdminNewsletterFormsPage.jsx");
const { default: AdminNewsletterFormDetailsPage } = await loadSource("src/pages/AdminNewsletterFormDetailsPage.jsx");
const { default: AdminNewsletterFormEditorPage } = await loadSource("src/pages/AdminNewsletterFormEditorPage.jsx");
const shared = await loadSource("src/pages/newsletterFormShared.jsx");
const { getMarketingSectionFromPath, marketingNavigationGroups } = await loadSource("src/config/marketingNavigation.js");

const { Route } = router;
const h = React.createElement;
const hasText = (matcher) => queryByText(matcher) !== null;
const tableRows = () => all("table[aria-label='Forms'] tbody tr[data-form-id]");

const makeForm = (overrides = {}) => ({
  id: "31",
  name: "Training Inquiry",
  alias: "traininginq",
  description: "Lead capture",
  isPublished: false,
  formType: "standalone",
  postAction: "message",
  postActionProperty: "Thank you",
  category: null,
  fieldCount: 2,
  actionCount: 1,
  dateAdded: "2026-10-20T06:00:00Z",
  dateModified: "2026-10-20T06:10:00Z",
  createdBy: "Ecp DevProof",
  modifiedBy: "Ecp DevProof",
  fields: [
    { id: "1", label: "Email", alias: "email", type: "email", isRequired: true, mappedObject: "contact", mappedField: "email" },
    { id: "2", label: "Submit", alias: "submit", type: "button", isRequired: false, mappedObject: "", mappedField: "" },
  ],
  actions: [{ id: "7", name: "Tag inquiry", type: "lead.changetags", policy: "allowed", policyReason: "" }],
  publishable: true,
  publishBlockers: [],
  ...overrides,
});

const apiError = (status, data) => Object.assign(new Error(`HTTP ${status}`), { response: { status, data } });

function installFormsApi({ forms = [makeForm()], handlers = {} } = {}) {
  const calls = [];
  const byId = Object.fromEntries(forms.map((form) => [String(form.id), form]));
  const respond = async (method, url, payload, config) => {
    calls.push({ method, url, payload, params: config?.params });
    const key = `${method} ${url}`;
    if (handlers[key]) return handlers[key](payload, config);
    if (method === "get" && url === "/newsletter/admin/forms/") {
      return { data: { count: forms.length, page: 1, page_size: 25, num_pages: forms.length ? 1 : 0, results: forms } };
    }
    if (method === "get" && url === "/newsletter/admin/forms/builder/") {
      return { data: { fieldTypes: [], contactFields: [{ alias: "email", label: "Email", type: "email", fieldTypes: ["email"] }] } };
    }
    const detail = url.match(/^\/newsletter\/admin\/forms\/([^/]+)\/$/);
    if (method === "get" && detail) {
      if (byId[detail[1]]) return { data: byId[detail[1]] };
      throw apiError(404, { detail: "Form not found in Mautic.", code: "form_not_found" });
    }
    if (method === "post" && url === "/newsletter/admin/forms/") return { data: makeForm({ id: "40", ...payload, fields: [], actions: [] }) };
    if (method === "patch" && detail) return { data: { ...byId[detail[1]], ...payload } };
    const publication = url.match(/^\/newsletter\/admin\/forms\/([^/]+)\/(publish|unpublish)\/$/);
    if (method === "post" && publication) return { data: { ...byId[publication[1]], isPublished: publication[2] === "publish" } };
    throw new Error(`unexpected ${method} ${url}`);
  };
  globalThis.__testApiClient = {
    get: (url, config) => respond("get", url, undefined, config),
    post: (url, payload) => respond("post", url, payload),
    patch: (url, payload) => respond("patch", url, payload),
    delete: (url) => respond("delete", url),
  };
  return { calls, writes: (method) => calls.filter((c) => c.method === method) };
}

const renderForms = (url) =>
  renderRoutes(
    [
      h(Route, { key: "hub", path: "/admin/newsletter", element: h("div", null, "Marketing Hub home") }),
      h(Route, { key: "list", path: "/admin/newsletter/forms", element: h(AdminNewsletterFormsPage) }),
      h(Route, { key: "new", path: "/admin/newsletter/forms/new", element: h(AdminNewsletterFormEditorPage) }),
      h(Route, { key: "details", path: "/admin/newsletter/forms/:formId", element: h(AdminNewsletterFormDetailsPage) }),
      h(Route, { key: "edit", path: "/admin/newsletter/forms/:formId/edit", element: h(AdminNewsletterFormEditorPage) }),
    ],
    { url }
  );

afterEach(async () => {
  await cleanup();
  delete globalThis.__testApiClient;
});

// ---------------------------------------------------------- navigation --

test("Forms sits under Audience and owns its pages", () => {
  const audience = marketingNavigationGroups.find((group) => group.label === "Audience");
  assert.deepEqual(audience.items.map((item) => item.id), ["contacts", "companies", "lists", "segments", "forms"]);
  for (const path of ["/admin/newsletter/forms", "/admin/newsletter/forms/new", "/admin/newsletter/forms/31", "/admin/newsletter/forms/31/edit"]) {
    assert.equal(getMarketingSectionFromPath(path), "forms", path);
  }
});

// ------------------------------------------------------------------ list --

test("the list shows Forms with status and opens Details on click", async () => {
  installFormsApi({ forms: [makeForm(), makeForm({ id: "32", name: "Webinar Signup", isPublished: true, postAction: "redirect" })] });
  const view = await renderForms("/admin/newsletter/forms");
  await waitFor(() => assert.equal(tableRows().length, 2));

  const headers = all("table thead th").map((th) => th.textContent.trim());
  assert.deepEqual(headers, ["Form Name", "Status", "Fields", "Submit Actions", "After Submit", "Last Updated", "Actions"]);
  const [first, second] = tableRows().map((row) => row.textContent);
  assert.match(first, /Training Inquiry.*Unpublished.*Show a message/);
  assert.match(second, /Webinar Signup.*Published.*Redirect to a URL/);
  assert.equal(hasText(/Delete/), false);

  await click(tableRows()[1].querySelectorAll("td")[1]);
  await waitFor(() => assert.equal(view.path(), "/admin/newsletter/forms/32"));
});

test("search and status filter go to the backend", async () => {
  const api = installFormsApi();
  await renderForms("/admin/newsletter/forms");
  await waitFor(() => assert.equal(tableRows().length, 1));

  await typeInto(getByRole("textbox", "Search Forms"), "Inquiry");
  await click(getByRole("button", "Search"));
  await waitFor(() => assert.equal(api.calls.at(-1).params.search, "Inquiry"));
  await chooseSelectOption(getByRole("combobox", /Status/), "Published");
  await waitFor(() => assert.equal(api.calls.at(-1).params.status, "published"));
  assert.equal(api.calls.at(-1).params.search, "Inquiry");
  assert.equal(api.calls.at(-1).params.page, 1);
});

test("an empty list offers to create the first Form", async () => {
  installFormsApi({ forms: [] });
  await renderForms("/admin/newsletter/forms");
  await waitFor(() => assert.equal(hasText("No Forms yet."), true));
  assert.equal(all("a[href='/admin/newsletter/forms/new']").length >= 1, true);
});

test("a list load failure is shown with Retry", async () => {
  installFormsApi({ handlers: { "get /newsletter/admin/forms/": async () => { throw apiError(502, { detail: "Mautic did not complete the Form request." }); } } });
  await renderForms("/admin/newsletter/forms");
  await waitFor(() => assert.equal(hasText("Mautic did not complete the Form request."), true));
  assert.equal(queryByRole("button", "Retry") !== null, true);
});

// --------------------------------------------------------------- details --

test("details show settings, read-only fields and actions, and no delete", async () => {
  installFormsApi();
  await renderForms("/admin/newsletter/forms/31");
  await waitFor(() => assert.equal(hasText("Mautic Form #31"), true));

  assert.equal(hasText("Fields (2)"), true);
  assert.equal(hasText("contact.email"), true);
  assert.equal(hasText("Submit Actions (1)"), true);
  assert.equal(hasText("Tag inquiry"), true);
  assert.equal(queryByRole("button", /Delete/), null);
  assert.equal(queryByRole("button", "Publish") !== null, true);
  assert.equal(all("table[aria-label='Form fields'] input").length, 0);
});

test("an unpublishable Form explains why and cannot be published", async () => {
  installFormsApi({ forms: [makeForm({
    publishable: false,
    publishBlockers: ["The Form has no submit button. Add one in Mautic first."],
    actions: [{ id: "8", name: "Undo DNC", type: "lead.remove_do_not_contact", policy: "prohibited", policyReason: "Remove Do Not Contact is not allowed by ECP policy." }],
  })] });
  await renderForms("/admin/newsletter/forms/31");
  await waitFor(() => assert.equal(hasText("This Form cannot be published yet."), true));
  assert.equal(hasText("The Form has no submit button. Add one in Mautic first."), true);
  assert.equal(hasText("Not allowed by ECP"), true);
  assert.equal(getByRole("button", "Publish").disabled, true);
});

test("publishing confirms first and shows the state Mautic reports", async () => {
  const api = installFormsApi();
  await renderForms("/admin/newsletter/forms/31");
  await waitFor(() => assert.equal(hasText("Mautic Form #31"), true));

  await click(getByRole("button", "Publish"));
  await waitFor(() => assert.equal(hasText("Publish Form?"), true));
  assert.equal(api.writes("post").length, 0);
  const dialog = getByRole("dialog");
  await click(getByRole("button", "Publish", { scope: dialog }));
  await waitFor(() => assert.equal(hasText("Form published."), true));
  assert.deepEqual(api.writes("post").map((c) => c.url), ["/newsletter/admin/forms/31/publish/"]);
  await waitFor(() => assert.equal(queryByRole("button", "Unpublish") !== null, true));
});

test("a refused publish keeps the Form unpublished and says why", async () => {
  installFormsApi({ handlers: { "post /newsletter/admin/forms/31/publish/": async () => {
    throw apiError(409, { detail: "The Form cannot be published yet: The Form has no submit button.", code: "form_not_publishable" });
  } } });
  await renderForms("/admin/newsletter/forms/31");
  await waitFor(() => assert.equal(hasText("Mautic Form #31"), true));
  await click(getByRole("button", "Publish"));
  await click(getByRole("button", "Publish", { scope: await waitFor(() => getByRole("dialog")) }));
  await waitFor(() => assert.equal(hasText(/no submit button/), true));
  assert.equal(hasText("Form published."), false);
  assert.equal(hasText("Unpublished"), true);
});

test("an unknown Form is reported as not found", async () => {
  installFormsApi();
  await renderForms("/admin/newsletter/forms/99");
  await waitFor(() => assert.equal(hasText("Form not found."), true));
});

test("an invalid Form link never reaches the API", async () => {
  const api = installFormsApi();
  await renderForms("/admin/newsletter/forms/abc");
  await waitFor(() => assert.equal(hasText("Invalid Form link."), true));
  assert.equal(api.calls.filter((c) => c.url.includes("/abc")).length, 0);
});

// ---------------------------------------------------------------- editor --

test("create validates locally, sends basic settings only and opens the new Form", async () => {
  const api = installFormsApi();
  const view = await renderForms("/admin/newsletter/forms/new");
  await waitFor(() => getByRole("button", "Create Form"));

  await click(getByRole("button", "Create Form"));
  await waitFor(() => assert.equal(hasText("Form name is required."), true));
  assert.equal(api.writes("post").length, 0);

  await typeInto(getByRole("textbox", /^Form name/), "Training Inquiry");
  await chooseSelectOption(getByRole("combobox", /After submit/), "Redirect to a URL");
  await typeInto(getByRole("textbox", /^Redirect URL/), "javascript:alert(1)");
  await click(getByRole("button", "Create Form"));
  await waitFor(() => assert.equal(hasText(/full http:\/\/ or https:\/\/ address\./), true));
  assert.equal(api.writes("post").length, 0);

  await typeInto(getByRole("textbox", /^Redirect URL/), "https://imaa.example/thanks");
  await click(getByRole("button", "Create Form"));
  await waitFor(() => assert.equal(view.path(), "/admin/newsletter/forms/40"));
  assert.equal(JSON.stringify(api.writes("post")[0].payload), JSON.stringify({
    name: "Training Inquiry", description: "", postAction: "redirect", postActionProperty: "https://imaa.example/thanks",
  }));
});

test("an uncertain create lists the matching Form instead of retrying", async () => {
  const api = installFormsApi({ handlers: { "post /newsletter/admin/forms/": async () => {
    throw apiError(502, {
      detail: "Mautic did not confirm the create, but it has a matching Form (#44).",
      code: "form_create_uncertain",
      candidates: [{ id: "44", name: "Training Inquiry", isPublished: false }],
    });
  } } });
  const view = await renderForms("/admin/newsletter/forms/new");
  await typeInto(await waitFor(() => getByRole("textbox", /^Form name/)), "Training Inquiry");
  await typeInto(getByRole("textbox", /^Message after submit/), "Thanks");
  await click(getByRole("button", "Create Form"));

  await waitFor(() => assert.equal(hasText(/matching Form \(#44\)/), true));
  assert.equal(api.writes("post").length, 1);
  assert.equal(view.path(), "/admin/newsletter/forms/new");
  assert.equal(all("a[href='/admin/newsletter/forms/44']").length, 1);
});

test("edit sends only changed settings, and server field errors land on the field", async () => {
  const api = installFormsApi({ handlers: { "patch /newsletter/admin/forms/31/": async (payload) => {
    if (payload.postActionProperty === "bad") {
      throw apiError(400, { detail: "postActionProperty: Fill in a valid URL.", errors: { postActionProperty: "Fill in a valid URL." } });
    }
    return { data: makeForm(payload) };
  } } });
  const view = await renderForms("/admin/newsletter/forms/31/edit");
  const nameBox = await waitFor(() => getByRole("textbox", /^Form name/));
  assert.equal(nameBox.value, "Training Inquiry");

  await typeInto(getByRole("textbox", /^Message after submit/), "bad");
  await click(getByRole("button", "Save Settings"));
  await waitFor(() => assert.equal(hasText("Fill in a valid URL."), true));
  assert.equal(view.path(), "/admin/newsletter/forms/31/edit");

  await typeInto(getByRole("textbox", /^Message after submit/), "Thank you");
  await typeInto(getByRole("textbox", /^Form name/), "Renamed Inquiry");
  await click(getByRole("button", "Save Settings"));
  await waitFor(() => assert.equal(view.path(), "/admin/newsletter/forms/31"));
  assert.equal(JSON.stringify(api.writes("patch").at(-1).payload), JSON.stringify({ name: "Renamed Inquiry" }));
});

test("leaving the editor with unsaved changes asks first", async () => {
  installFormsApi();
  const view = await renderForms("/admin/newsletter/forms/31/edit");
  await typeInto(await waitFor(() => getByRole("textbox", /^Form name/)), "Changed");

  await click(getByRole("button", "Back"));
  await waitFor(() => assert.equal(hasText("Leave without saving?"), true));
  await click(getByRole("button", "Keep Editing"));
  await waitFor(() => assert.equal(hasText("Leave without saving?"), false));
  assert.equal(view.path(), "/admin/newsletter/forms/31/edit");
  assert.equal(getByRole("textbox", /^Form name/).value, "Changed");

  await click(getByRole("link", "Forms"));
  await waitFor(() => assert.equal(hasText("Leave without saving?"), true));
  await click(getByRole("button", "Leave Without Saving"));
  await waitFor(() => assert.equal(view.path(), "/admin/newsletter/forms"));
});

// ------------------------------------------------------------ shared rules --

test("draft rules mirror the backend", () => {
  assert.deepEqual(Object.keys(shared.validateFormDraft({ name: "", postAction: "message", postActionProperty: "" })).sort(), ["name", "postActionProperty"]);
  assert.deepEqual(shared.validateFormDraft({ name: "F", postAction: "return", postActionProperty: "" }), {});
  for (const url of ["ftp://x/y", "/thanks", "https://h/{contactfield=email}", "https://u:p@h/x", "https://h/a b"]) {
    assert.notEqual(shared.validateRedirectUrl(url), "", url);
  }
  assert.equal(shared.validateRedirectUrl("https://imaa.example/thanks"), "");
  assert.deepEqual(Object.keys(shared.validateFormDraft({ name: "F", postAction: "hideform", postActionProperty: "" })), ["postActionProperty"]);
  assert.equal(shared.formToDraft(makeForm({ postAction: "hideform", postActionProperty: "Bye" })).postAction, "hideform");
  assert.equal(shared.postActionLabel("hideform"), "Hide the form and show a message");
  const original = makeForm();
  assert.deepEqual(shared.draftToPayload(shared.formToDraft(original), original), {});
  assert.deepEqual(shared.draftToPayload({ ...shared.formToDraft(original), postAction: "return" }, original), { postAction: "return", postActionProperty: "" });
  assert.equal("fields" in shared.draftToPayload(shared.formToDraft(original)), false);
  assert.equal("isPublished" in shared.draftToPayload(shared.formToDraft(original)), false);
});

test("nothing here can delete a Form", async () => {
  const service = await loadSource("src/services/newsletterService.js");
  assert.equal(Object.keys(service).some((name) => /delete.*form/i.test(name)), false);
  await act(async () => {});
});
