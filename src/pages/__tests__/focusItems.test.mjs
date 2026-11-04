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

const { default: ListPage } = await loadSource("src/pages/AdminNewsletterFocusItemsPage.jsx");
const { default: EditorPage } = await loadSource("src/pages/AdminNewsletterFocusEditorPage.jsx");
const { default: DetailsPage } = await loadSource("src/pages/AdminNewsletterFocusDetailsPage.jsx");
const shared = await loadSource("src/pages/newsletterFocusShared.jsx");
const pageDocument = await loadSource("src/components/marketing/landingPageDocument.js");
const { Route } = router;
const h = React.createElement;

const F = "/newsletter/admin/focus-items/";
const FOCUS = {
  id: 7, name: "Register bar", description: "", type: "link", style: "bar", htmlMode: "basic", editor: "", website: "",
  form: null, category: null, isPublished: true, isLive: true, publishUp: null, publishDown: null,
  utmTags: { utmSource: "", utmMedium: "", utmCampaign: "", utmContent: "" },
  properties: { ...shared.defaultProperties(), content: { ...shared.defaultProperties().content, headline: "Register", link_text: "Go", link_url: "https://example.test/" } },
  embed: { token: "{focus=7}", script: '<script src="https://m.example/focus/7.js" type="text/javascript" charset="utf-8" async="async"></script>' },
  stats: { views: 12, uniqueViews: 9, clicks: 3, submissions: 0 },
  createdByUser: "Ada Admin", dateAdded: "2026-11-04T09:00:00+00:00",
};
const INSIGHTS = {
  totals: { views: 12, uniqueViews: 9, clicks: 3, submissions: 0 },
  daily: [{ date: "2026-11-03", views: 4, clicks: 1, submissions: 0 }, { date: "2026-11-04", views: 8, clicks: 2, submissions: 0 }],
  usage: { campaigns: [{ id: 5, name: "Welcome journey", published: true }], pages: [{ id: 9, title: "Event page", published: false }] },
};

let calls;
let deleteStatus;

function installApi() {
  calls = [];
  deleteStatus = 204;
  const respond = async (method, url, payload, config) => {
    calls.push({ method, url, payload, config });
    if (method === "get") {
      if (url === F) return { data: { count: 1, page: 1, num_pages: 1, results: [FOCUS] } };
      if (url === `${F}7/`) return { data: FOCUS };
      if (url === `${F}7/insights/`) return { data: INSIGHTS };
      if (url === "/newsletter/admin/forms/") return { data: { results: [{ id: 21, name: "Newsletter signup" }] } };
      return { data: {} };
    }
    if (method === "post" && url === `${F}preview/`) return { data: { document: "<!doctype html><p>preview</p>" } };
    if (method === "post" && url === F) return { data: { ...FOCUS, id: 13 } };
    if (method === "post" && url === `${F}7/duplicate/`) return { data: { ...FOCUS, id: 14, name: "Copy of Register bar", isPublished: false } };
    if (method === "patch") return { data: { ...FOCUS, ...payload } };
    if (method === "delete") {
      if (deleteStatus === 409) {
        const error = new Error("in use");
        error.response = { status: 409, data: { detail: "This Focus Item is still used.", code: "focus_in_use", usage: INSIGHTS.usage } };
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
  h(Route, { key: "list", path: "/admin/newsletter/focus-items", element: h(ListPage) }),
  h(Route, { key: "new", path: "/admin/newsletter/focus-items/new", element: h(EditorPage) }),
  h(Route, { key: "view", path: "/admin/newsletter/focus-items/:focusId", element: h(DetailsPage) }),
  h(Route, { key: "edit", path: "/admin/newsletter/focus-items/:focusId/edit", element: h(EditorPage) }),
];

beforeEach(installApi);
afterEach(async () => {
  await cleanup();
  delete globalThis.__testApiClient;
});

test("helpers keep public-website rules and build the payload", () => {
  const draft = { ...shared.blankFocus(), name: "Bar" };
  draft.properties.content = { ...draft.properties.content, link_text: "Go", link_url: "javascript:alert(1)", css: "</style>" };
  const errors = shared.validateFocusDraft(draft);
  assert.equal(errors.link_url, "Start the link with http:// or https://.");
  assert.equal(errors.css.includes('no "<"'), true);
  assert.equal(shared.validateFocusDraft({ ...shared.blankFocus(), name: "F", type: "form" }).form, "Choose the published Form to show.");
  assert.equal(shared.validateFocusDraft({ ...shared.blankFocus(), name: "F", type: "notice", htmlMode: "editor", editor: "<p onclick='x()'>a</p>" }).editor,
    "The content cannot contain an event-handler attribute (onclick).");
  const ok = { ...shared.blankFocus(), name: " Bar ", type: "form", form: "21", publishUp: "2026-11-05T09:00" };
  assert.equal(Object.keys(shared.validateFocusDraft(ok)).length, 0);
  const payload = shared.draftToPayload(ok);
  assert.equal(payload.name, "Bar");
  assert.equal(payload.form, 21);
  assert.equal(payload.isPublished, false);
  assert.equal(payload.publishUp, new Date("2026-11-05T09:00").toISOString());
  assert.equal(Object.keys(shared.previewPayload(ok)).sort().join(","), "editor,form,htmlMode,properties,style,type,website");
  const merged = shared.focusToDraft({ ...FOCUS, properties: { bar: { placement: "bottom" }, colors: { text: "000000" } } });
  assert.equal(merged.properties.bar.placement, "bottom");
  assert.equal(merged.properties.bar.size, "large");
  assert.equal(merged.properties.colors.text, "000000");
  assert.equal(merged.properties.colors.button, "fdb933");
  assert.equal(pageDocument.focusBlockMarkup(7, 'A "quoted" <name>'),
    '<div data-ecp-mautic-focus="7" title="Focus Item: A &quot;quoted&quot; &lt;name&gt;">{focus=7}</div>');
});

test("the list shows each Focus Item with its stats", async () => {
  await renderRoutes(routes(), { url: "/admin/newsletter/focus-items" });
  await waitFor(() => assert.equal(hasText("Register bar"), true));
  assert.equal(hasText("Bar · Highlight a link"), true);
  assert.equal(hasText("(9 unique)"), true);
  assert.equal(getByRole("link", "Register bar").getAttribute("href"), "/admin/newsletter/focus-items/7");
});

test("creating sends the settings, previews without the name, and opens the new item", async () => {
  const view = await renderRoutes(routes(), { url: "/admin/newsletter/focus-items/new" });
  await waitFor(() => assert.equal(queryByRole("button", "Create Focus Item") !== null, true));
  await typeInto(getByRole("textbox", "Name"), "Asia bar");
  await typeInto(getByRole("textbox", "Headline"), "Register for Asia 2026");
  await typeInto(getByRole("textbox", "Button text"), "Register");
  await typeInto(getByRole("textbox", "Button link"), "https://example.test/register");
  await waitFor(() => assert.equal(writes("post", `${F}preview/`).length > 0, true), { timeout: 4000 });
  const preview = writes("post", `${F}preview/`).at(-1).payload;
  assert.equal("name" in preview, false);
  assert.equal(preview.properties.content.headline, "Register for Asia 2026");
  await click(getByRole("button", "Create Focus Item"));
  await waitFor(() => assert.equal(view.path(), "/admin/newsletter/focus-items/13"));
  const body = writes("post", F)[0].payload;
  assert.equal(body.name, "Asia bar");
  assert.equal(body.type, "link");
  assert.equal(body.isPublished, false);
  assert.equal(body.properties.content.link_url, "https://example.test/register");
  assert.equal(body.form, null);
});

test("a white-box style switches to dark text and warns about light text", async () => {
  assert.equal(shared.isLightColor("ffffff"), true);
  assert.equal(shared.isLightColor("1b2a4a"), false);
  await renderRoutes(routes(), { url: "/admin/newsletter/focus-items/new" });
  await waitFor(() => assert.equal(getByRole("textbox", "Text colour").value, "ffffff"));
  await click(getByRole("button", "Pop-up"));
  await waitFor(() => assert.equal(getByRole("textbox", "Text colour").value, "1b2a4a"));
  assert.equal(hasText(/very light text will be hard to read/), false);
  await typeInto(getByRole("textbox", "Text colour"), "fafafa");
  await waitFor(() => assert.equal(hasText(/very light text will be hard to read/), true));
  // A colour the admin chose is kept when the style changes.
  await click(getByRole("button", "Corner"));
  assert.equal(getByRole("textbox", "Text colour").value, "fafafa");
  await click(getByRole("button", "Bar"));
  await waitFor(() => assert.equal(hasText(/very light text will be hard to read/), false));
});

test("missing button details or a missing Form never reach the server", async () => {
  await renderRoutes(routes(), { url: "/admin/newsletter/focus-items/new" });
  await waitFor(() => assert.equal(queryByRole("button", "Create Focus Item") !== null, true));
  await typeInto(getByRole("textbox", "Name"), "Bar");
  await click(getByRole("button", "Create Focus Item"));
  await waitFor(() => assert.equal(hasText("Enter the page the button opens."), true));
  await click(getByRole("button", "Collect data"));
  await click(getByRole("button", "Create Focus Item"));
  await waitFor(() => assert.equal(hasText("Choose the published Form to show."), true));
  assert.equal(writes("post", F).length, 0);
});

test("details show the embed code, stats and where it is used; publish and duplicate", async () => {
  const view = await renderRoutes(routes(), { url: "/admin/newsletter/focus-items/7" });
  await waitFor(() => assert.equal(getByRole("textbox", "Landing page token").value, "{focus=7}"));
  assert.equal(getByRole("textbox", "Website embed code").value.includes("https://m.example/focus/7.js"), true);
  await waitFor(() => assert.equal(hasText("Welcome journey"), true));
  assert.equal(getByRole("link", "Welcome journey").getAttribute("href"), "/admin/newsletter/builder/5");
  assert.equal(getByRole("link", "Event page").getAttribute("href"), "/admin/newsletter/pages/9");
  assert.equal(hasText("9 unique visitors"), true);
  await click(getByRole("button", "Unpublish"));
  await waitFor(() => assert.equal(writes("patch", `${F}7/`).length, 1));
  assert.equal(JSON.stringify(writes("patch", `${F}7/`)[0].payload), JSON.stringify({ isPublished: false }));
  await waitFor(() => assert.equal(queryByRole("button", "Publish") !== null, true));
  await click(getByRole("button", "Duplicate"));
  await waitFor(() => assert.equal(view.path(), "/admin/newsletter/focus-items/14"));
});

test("a raw HTML item from Mautic opens read-only in the editor", async () => {
  const original = globalThis.__testApiClient.get;
  globalThis.__testApiClient.get = (url, config) => (url === `${F}7/` ? Promise.resolve({ data: { ...FOCUS, htmlMode: "html" } }) : original(url, config));
  await renderRoutes(routes(), { url: "/admin/newsletter/focus-items/7/edit" });
  await waitFor(() => assert.equal(hasText(/raw HTML can't be edited here/), true));
  assert.equal(getByRole("button", "Save").disabled, true);
  assert.equal(writes("patch", `${F}7/`).length, 0);
});

test("deleting an item that is still used shows where, and keeps it", async () => {
  deleteStatus = 409;
  await renderRoutes(routes(), { url: "/admin/newsletter/focus-items/7" });
  await click(await waitFor(() => getByRole("button", "Delete")));
  const dialog = await waitFor(() => getByRole("dialog", "Delete Focus Item?"));
  await click(getByRole("button", "Delete", { scope: dialog }));
  await waitFor(() => assert.equal(hasText("This Focus Item is still used."), true));
  assert.equal(getByRole("button", "Delete", { scope: dialog }).disabled, true);
  assert.equal(writes("delete", `${F}7/`).length, 1);
});
