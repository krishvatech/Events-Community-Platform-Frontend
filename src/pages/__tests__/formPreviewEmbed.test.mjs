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
  waitFor,
} from "./helpers/blogDomHarness.mjs";

// Assertions compare strings/booleans only: a failing assert on a jsdom node
// serializes the whole DOM graph and exhausts memory.

const { default: AdminNewsletterFormDetailsPage } = await loadSource("src/pages/AdminNewsletterFormDetailsPage.jsx");
const { default: BuilderPage } = await loadSource("src/pages/AdminNewsletterMauticCampaignBuilderPage.jsx");
const { liveFrameSandbox } = await loadSource("src/pages/NewsletterFormPreviewEmbed.jsx");

const { Route } = router;
const h = React.createElement;
const hasText = (matcher) => queryByText(matcher) !== null;

const makeForm = (overrides = {}) => ({
  id: "31", name: "Training Inquiry", description: "", isPublished: false, formType: "standalone", postAction: "message",
  postActionProperty: "Thanks", fields: [], actions: [], publishable: true, publishBlockers: [], campaignSource: true, ...overrides,
});
const DOCUMENT = "<!doctype html><html><head><meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'\"></head><body><form><label>Email</label></form></body></html>";
const JS_CODE = '<script type="text/javascript" src="https://mautic.example.org/form/generate.js?id=31"></script>';
const apiError = (status, data) => Object.assign(new Error(`HTTP ${status}`), { response: { status, data } });

function installApi({ form = makeForm(), preview, embed, handlers = {} } = {}) {
  const calls = [];
  globalThis.__testApiClient = {
    get: async (url) => {
      calls.push(url);
      if (handlers[url]) return handlers[url]();
      if (url === "/newsletter/admin/forms/31/") return { data: form };
      if (url === "/newsletter/admin/forms/31/usage/") {
        return { data: { campaignSources: [{ id: 57, name: "Nurture", published: false }], campaignEvents: [{ id: 9, type: "form.submit", campaignId: 58, campaignName: "Follow-up" }], pointActions: [], submissions: { total: 0, latest: null } } };
      }
      if (url === "/newsletter/admin/forms/31/preview/") {
        return { data: preview || { formId: "31", name: "Training Inquiry", isPublished: false, isLive: false, savedAt: "2026-10-21T08:00:00Z", document: DOCUMENT, liveUrl: null, note: "This is the last saved version, rendered by Mautic. Unsaved changes in the editor are not included." } };
      }
      if (url === "/newsletter/admin/forms/31/embed/") {
        return { data: embed || { formId: "31", name: "Training Inquiry", isPublished: false, isLive: false, publicUrl: "https://mautic.example.org",
          formUrl: "https://mautic.example.org/form/31", submitBase: "https://mautic.example.org",
          methods: [{ method: "javascript", label: "JavaScript (recommended)", code: JS_CODE, help: "Paste where the Form should appear." },
            { method: "iframe", label: "iframe", code: '<iframe src="https://mautic.example.org/form/31" width="300" height="300" title="Embedded form"><p>Your browser does not support iframes.</p></iframe>', help: "Adjust." }],
          warnings: ["This Form is not published, so the embed codes will show nothing until it is published."] } };
      }
      throw apiError(404, { detail: "Not found." });
    },
    post: async (url) => { throw new Error(`unexpected POST ${url}`); },
    patch: async (url) => { throw new Error(`unexpected PATCH ${url}`); },
    delete: async (url) => { throw new Error(`unexpected DELETE ${url}`); },
  };
  return calls;
}

const renderDetails = (url = "/admin/newsletter/forms/31") =>
  renderRoutes([h(Route, { key: "details", path: "/admin/newsletter/forms/:formId", element: h(AdminNewsletterFormDetailsPage) })], { url });

afterEach(async () => {
  await cleanup();
  delete globalThis.__testApiClient;
  delete globalThis.navigator.clipboard;
});

test("live frames only get same-origin rights on Mautic's own, different origin", () => {
  assert.equal(liveFrameSandbox("https://mautic.example.org/form/31", "https://ecp.example.org"), "allow-scripts allow-forms allow-same-origin");
  assert.equal(liveFrameSandbox("https://ecp.example.org/form/31", "https://ecp.example.org"), "allow-scripts allow-forms");
  assert.equal(liveFrameSandbox("not a url", "https://ecp.example.org"), "");
});

test("a draft previews from the saved native render in a fully sandboxed frame", async () => {
  installApi();
  await renderDetails();
  await click(await waitFor(() => getByRole("button", "Preview Form")));
  const frame = await waitFor(() => {
    const found = all("iframe[title='Native form preview']")[0];
    assert.equal(Boolean(found), true);
    return found;
  });
  assert.equal(frame.getAttribute("sandbox"), "");
  assert.equal(frame.getAttribute("srcdoc").includes("Content-Security-Policy"), true);
  assert.equal(hasText(/must be published before a native public preview is available/), true);
  assert.equal(hasText(/Unsaved changes in the editor are not included/), true);
  assert.equal(getByRole("tab", "Live public form").disabled, true);
});

test("a published form also offers its live public page", async () => {
  installApi({ preview: { formId: "31", name: "Training Inquiry", isPublished: true, isLive: true, savedAt: null, document: DOCUMENT,
    liveUrl: "https://mautic.example.org/form/31", note: "Last saved version." } });
  await renderDetails();
  await click(await waitFor(() => getByRole("button", "Preview Form")));
  await click(await waitFor(() => getByRole("tab", "Live public form")));
  const live = await waitFor(() => {
    const found = all("iframe[title='Live public form']")[0];
    assert.equal(Boolean(found), true);
    return found;
  });
  assert.equal(live.getAttribute("src"), "https://mautic.example.org/form/31");
  assert.equal(live.getAttribute("sandbox").includes("allow-top-navigation"), false);
  assert.equal(hasText(/creates a real submission/), true);
});

test("?preview=1 from the editor opens the preview", async () => {
  installApi();
  await renderDetails("/admin/newsletter/forms/31?preview=1");
  await waitFor(() => assert.equal(all("iframe[title='Native form preview']").length, 1));
});

test("embed codes are shown as text and copied verbatim", async () => {
  const calls = installApi();
  const copied = [];
  Object.defineProperty(globalThis.navigator, "clipboard", { value: { writeText: async (text) => copied.push(text) }, configurable: true });
  await renderDetails();
  await click(await waitFor(() => getByRole("button", "Embed Form")));
  await waitFor(() => assert.equal(hasText(/will show nothing until it is published/), true));
  const pre = all("pre[data-embed-method='javascript']")[0];
  assert.equal(pre.textContent, JS_CODE);
  assert.equal(all("pre script").length, 0); // never executed or parsed as markup
  await click(getByRole("button", "Copy JavaScript (recommended) code"));
  await waitFor(() => assert.equal(copied.length, 1));
  assert.equal(copied[0], JS_CODE);
  assert.equal(hasText("Copied"), true);
  assert.equal(calls.some((url) => /publish/.test(url)), false);
});

test("embed codes are refused cleanly when Mautic's public address is unavailable", async () => {
  installApi({ handlers: { "/newsletter/admin/forms/31/embed/": async () => {
    throw apiError(503, { detail: "Mautic's public address is not available, so embed codes cannot be generated.", code: "form_public_url_unavailable" });
  } } });
  await renderDetails();
  await click(await waitFor(() => getByRole("button", "Embed Form")));
  await waitFor(() => assert.equal(hasText(/public address is not available/), true));
  assert.equal(all("pre[data-embed-method]").length, 0);
});

test("usage links each Campaign to the builder", async () => {
  installApi();
  await renderDetails();
  await waitFor(() => assert.equal(all("a[href='/admin/newsletter/builder/57']").length, 1));
  assert.equal(all("a[href='/admin/newsletter/builder/58']").length, 1);
  assert.equal(hasText(/Submits form/), true);
});

// ------------------------------------------------------- Campaign Builder --

const noSchema = { available: false, fields: [] };
const CAPABILITIES = {
  actions: [{ key: "lead.changetags", type: "lead.changetags", eventType: "action", label: "Modify tags", formSchema: noSchema }],
  conditions: [],
  decisions: [],
  sources: {
    segments: [{ id: "7", name: "Seg A", isPublished: true }],
    forms: [{ id: "31", name: "Training Inquiry", isPublished: false }, { id: "32", name: "Webinar Signup", isPublished: true }],
  },
};
const CAMPAIGN = {
  id: "57", name: "Form journey", description: "", isPublished: false,
  sources: { segments: [], forms: [{ id: "31", name: "Training Inquiry" }, { id: "99", name: "" }] },
  events: [{ id: "81", key: "lead.changetags", eventType: "action", properties: {},
    metadata: { id: "81", name: "Tag", type: "lead.changetags", eventType: "action", parent: null, decisionPath: null, triggerMode: "immediate", triggerInterval: 0 } }],
  canvasSettings: { nodes: [], connections: [] },
};

test("Form sources show publication status, flag unavailable Forms and link to Form details", async () => {
  const patches = [];
  globalThis.__testApiClient = {
    get: async (url) => (url.endsWith("/capabilities/") ? { data: CAPABILITIES } : url.endsWith("/builder/") ? { data: CAMPAIGN } : { data: {} }),
    patch: async (url, payload) => {
      patches.push(payload);
      return { data: { id: "57" } };
    },
    post: async (url) => { throw new Error(`unexpected POST ${url}`); },
    delete: async (url) => { throw new Error(`unexpected DELETE ${url}`); },
  };
  await renderRoutes([h(Route, { key: "b", path: "/admin/newsletter/builder/:campaignId", element: h(BuilderPage) })], { url: "/admin/newsletter/builder/57" });
  await waitFor(() => assert.equal(all("input").some((input) => input.value === "Form journey"), true), { timeout: 8000 });

  assert.equal(hasText(/Form: Training Inquiry \(unpublished\)/), true);
  assert.equal(hasText(/Form: Form #99 \(unavailable\)/), true);
  assert.equal(all("a[href='/admin/newsletter/forms/31']").length >= 1, true);
  assert.equal(hasText(/A Form submission is not marketing\s+consent/), true);

  await chooseSelectOption(getByRole("combobox", /^Forms/), "Webinar Signup");
  await waitFor(() => assert.equal(hasText(/Form: Webinar Signup/), true));
});

test("Form sources are not called unavailable while the source list is still loading", async () => {
  let release;
  const pending = new Promise((resolve) => { release = resolve; });
  globalThis.__testApiClient = {
    get: async (url) => {
      if (url.endsWith("/capabilities/")) {
        await pending;
        return { data: CAPABILITIES };
      }
      return url.endsWith("/builder/") ? { data: CAMPAIGN } : { data: {} };
    },
    patch: async (url) => { throw new Error(`unexpected PATCH ${url}`); },
    post: async (url) => { throw new Error(`unexpected POST ${url}`); },
    delete: async (url) => { throw new Error(`unexpected DELETE ${url}`); },
  };
  await renderRoutes([h(Route, { key: "b", path: "/admin/newsletter/builder/:campaignId", element: h(BuilderPage) })], { url: "/admin/newsletter/builder/57" });
  await waitFor(() => assert.equal(all("input").some((input) => input.value === "Form journey"), true), { timeout: 8000 });
  assert.equal(hasText(/Form #99/), true);
  assert.equal(hasText(/unavailable/), false);
  release();
  await waitFor(() => assert.equal(hasText(/Form: Form #99 \(unavailable\)/), true));
});
