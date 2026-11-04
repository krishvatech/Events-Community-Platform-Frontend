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

// Assertions compare strings/booleans only (see broadcastDuplicate.test.mjs).

const { default: ListPage } = await loadSource("src/pages/AdminNewsletterDynamicContentListPage.jsx");
const { default: EditorPage } = await loadSource("src/pages/AdminNewsletterDynamicContentEditorPage.jsx");
const { default: DetailsPage } = await loadSource("src/pages/AdminNewsletterDynamicContentDetailsPage.jsx");
const shared = await loadSource("src/pages/newsletterDynamicContentShared.jsx");
const pageDocument = await loadSource("src/components/marketing/landingPageDocument.js");
const { Route } = router;
const h = React.createElement;

const D = "/newsletter/admin/dynamic-content/";
const ITEM = {
  id: 5, name: "India banner", description: "", type: "html", slotName: "home-banner", isCampaignBased: false, isPublished: true, isLive: true,
  publishUp: null, publishDown: null, language: "en", category: null, filterCount: 1, content: "<p>Hello India</p>",
  filters: [{ glue: "and", field: "country", object: "lead", type: "country", operator: "=", filter: "India" }],
  utmTags: {}, stats: { shown: 7, contacts: 3 }, createdByUser: "Ada Admin", dateAdded: "2026-11-04T09:00:00+00:00",
  place: {
    slot: '<div data-slot="dwc" data-param-slot-name="home-banner">Default content for visitors who match no rule</div>',
    token: "{dwc=home-banner}",
    tracking: "<script>mt('send', 'pageview');</script>",
  },
};
const INSIGHTS = {
  totals: { shown: 7, contacts: 3 }, daily: [{ date: "2026-11-04", shown: 7 }],
  usage: { campaigns: [{ id: 9, name: "Welcome journey", published: true, roles: ["pushed"] }], pages: [{ id: 2, title: "Home", published: true }] },
};
const METADATA = { objects: ["lead"], operators: [], glue: ["and", "or"], fields: [{ alias: "country", object: "lead", label: "Country", type: "country", operators: [{ value: "=", label: "equals" }] }] };

let calls;
let deleteStatus;

function installApi() {
  calls = [];
  deleteStatus = 204;
  const respond = async (method, url, payload, config) => {
    calls.push({ method, url, payload, config });
    if (method === "get") {
      if (url === D) return { data: { count: 1, page: 1, num_pages: 1, results: [ITEM] } };
      if (url === `${D}5/`) return { data: ITEM };
      if (url === `${D}5/insights/`) return { data: INSIGHTS };
      if (url === `${D}rule-metadata/`) return { data: METADATA };
      return { data: {} };
    }
    if (method === "post" && url === D) return { data: { ...ITEM, id: 13 } };
    if (method === "post" && url === `${D}5/duplicate/`) return { data: { ...ITEM, id: 14, name: "Copy of India banner", isPublished: false } };
    if (method === "patch") return { data: { ...ITEM, ...payload } };
    if (method === "delete") {
      if (deleteStatus === 409) {
        const error = new Error("in use");
        error.response = { status: 409, data: { detail: "This Dynamic Content item is still used by campaign steps.", usage: INSIGHTS.usage } };
        throw error;
      }
      return { data: null, status: 204 };
    }
    return { data: {} };
  };
  globalThis.__testApiClient = {
    get: (url, config) => respond("get", url, undefined, config),
    post: (url, payload, config) => respond("post", url, payload, config),
    patch: (url, payload, config) => respond("patch", url, payload, config),
    delete: (url) => respond("delete", url),
  };
}

const hasText = (matcher) => queryByText(matcher) !== null;
const writes = (method, url) => calls.filter((c) => c.method === method && c.url === url);
const routes = () => [
  h(Route, { key: "list", path: "/admin/newsletter/dynamic-content", element: h(ListPage) }),
  h(Route, { key: "new", path: "/admin/newsletter/dynamic-content/new", element: h(EditorPage) }),
  h(Route, { key: "view", path: "/admin/newsletter/dynamic-content/:itemId", element: h(DetailsPage) }),
  h(Route, { key: "edit", path: "/admin/newsletter/dynamic-content/:itemId/edit", element: h(EditorPage) }),
];

beforeEach(installApi);
afterEach(async () => {
  await cleanup();
  delete globalThis.__testApiClient;
});

test("helpers check slots, rules and content, and build the payload", () => {
  assert.equal(shared.slotFromName("Home page banner!"), "home-page-banner");
  const rules = { ...shared.blankDynamicContent(), name: "B" };
  assert.equal(shared.validateDynamicContentDraft(rules).slotName, "Give the slot a name: it is how a page asks for this content.");
  assert.equal(shared.validateDynamicContentDraft(rules).filters, "Add at least one rule.");
  assert.equal(shared.validateDynamicContentDraft({ ...rules, slotName: "bad slot" }).slotName, 'Letters, numbers, "-" and "_" only, such as homepage-banner.');
  const campaign = { ...shared.blankDynamicContent(), name: "C", isCampaignBased: true, content: "<p onclick='x()'>a</p>" };
  assert.equal(shared.validateDynamicContentDraft(campaign).content, "The content is shown on public pages, so it cannot contain an event-handler attribute (onclick).");
  assert.equal(shared.validateDynamicContentDraft({ ...campaign, content: "{dwc=x}" }).content, "The content cannot contain another {dwc=…} token.");
  const draft = shared.dynamicContentToDraft(ITEM);
  assert.equal(draft.contentMode, "html");
  assert.equal(draft.filters[0].properties.filter, "India");
  const payload = shared.draftToPayload(draft);
  assert.equal(payload.filters[0].properties.filter, "India");
  assert.equal(payload.slotName, "home-banner");
  const asCampaign = shared.draftToPayload({ ...draft, isCampaignBased: true });
  assert.equal(asCampaign.slotName, "");
  assert.equal(asCampaign.filters.length, 0);
  assert.equal(shared.contentPreviewDocument("<b>x</b>", "text").includes("&lt;b&gt;x&lt;/b&gt;"), true);
  assert.equal(pageDocument.dynamicContentBlockMarkup("home-banner"),
    '<div data-slot="dwc" data-param-slot-name="home-banner" title="Dynamic Content: home-banner">Default content for visitors who match no rule</div>');
  assert.throws(() => pageDocument.dynamicContentBlockMarkup('x" onclick="y'));
});

test("the list shows each item with how it is shown and its stats", async () => {
  await renderRoutes(routes(), { url: "/admin/newsletter/dynamic-content" });
  await waitFor(() => assert.equal(hasText("India banner"), true));
  assert.equal(hasText("Shown by rules · slot home-banner"), true);
  assert.equal(getByRole("link", "India banner").getAttribute("href"), "/admin/newsletter/dynamic-content/5");
});

test("creating a campaign item sends no slot or rules and opens the new item", async () => {
  const view = await renderRoutes(routes(), { url: "/admin/newsletter/dynamic-content/new" });
  await waitFor(() => assert.equal(queryByRole("button", "Create Dynamic Content") !== null, true));
  await typeInto(getByRole("textbox", "Name"), "Renewal banner");
  await waitFor(() => assert.equal(getByRole("textbox", "Slot name").value, "renewal-banner"));
  await click(getByRole("button", "Chosen by a campaign"));
  await click(getByRole("button", "HTML code"));
  await typeInto(getByRole("textbox", "HTML"), "<h2>Renew now</h2>");
  await click(getByRole("button", "Create Dynamic Content"));
  await waitFor(() => assert.equal(view.path(), "/admin/newsletter/dynamic-content/13"));
  const body = writes("post", D)[0].payload;
  assert.equal(body.isCampaignBased, true);
  assert.equal(body.slotName, "");
  assert.equal(body.filters.length, 0);
  assert.equal(body.content, "<h2>Renew now</h2>");
  assert.equal(body.isPublished, false);
});

test("a rules item without rules never reaches the server", async () => {
  await renderRoutes(routes(), { url: "/admin/newsletter/dynamic-content/new" });
  await waitFor(() => assert.equal(queryByRole("button", "Create Dynamic Content") !== null, true));
  await typeInto(getByRole("textbox", "Name"), "Banner");
  await click(getByRole("button", "Create Dynamic Content"));
  await waitFor(() => assert.equal(hasText("Add at least one rule."), true));
  assert.equal(writes("post", D).length, 0);
});

test("details show how to place it, its stats and where it is used; publish and duplicate", async () => {
  const view = await renderRoutes(routes(), { url: "/admin/newsletter/dynamic-content/5" });
  await waitFor(() => assert.equal(getByRole("textbox", "Landing page token").value, "{dwc=home-banner}"));
  assert.equal(getByRole("textbox", "Slot for landing pages and websites").value.includes('data-param-slot-name="home-banner"'), true);
  assert.equal(getByRole("textbox", "Website tracking code").value.includes("pageview"), true);
  assert.equal(hasText('country is "India"'), true);
  await waitFor(() => assert.equal(hasText("Welcome journey"), true));
  assert.equal(getByRole("link", "Welcome journey").getAttribute("href"), "/admin/newsletter/builder/9");
  assert.equal(getByRole("link", "Home").getAttribute("href"), "/admin/newsletter/pages/2");
  await click(getByRole("button", "Unpublish"));
  await waitFor(() => assert.equal(writes("patch", `${D}5/`).length, 1));
  assert.equal(JSON.stringify(writes("patch", `${D}5/`)[0].payload), JSON.stringify({ isPublished: false }));
  await waitFor(() => assert.equal(queryByRole("button", "Publish") !== null, true));
  await click(getByRole("button", "Duplicate"));
  await waitFor(() => assert.equal(view.path(), "/admin/newsletter/dynamic-content/14"));
});

test("deleting an item a campaign uses shows where, and keeps it", async () => {
  deleteStatus = 409;
  await renderRoutes(routes(), { url: "/admin/newsletter/dynamic-content/5" });
  await click(await waitFor(() => getByRole("button", "Delete")));
  const dialog = await waitFor(() => getByRole("dialog", "Delete Dynamic Content?"));
  await click(getByRole("button", "Delete", { scope: dialog }));
  await waitFor(() => assert.equal(hasText("This Dynamic Content item is still used by campaign steps."), true));
  assert.equal(getByRole("button", "Delete", { scope: dialog }).disabled, true);
});
