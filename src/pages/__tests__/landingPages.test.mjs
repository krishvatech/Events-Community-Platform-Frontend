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

const { default: AdminNewsletterPagesPage } = await loadSource("src/pages/AdminNewsletterPagesPage.jsx");
const { default: AdminNewsletterPageDetailsPage } = await loadSource("src/pages/AdminNewsletterPageDetailsPage.jsx");
const { default: AdminNewsletterPageEditorPage } = await loadSource("src/pages/AdminNewsletterPageEditorPage.jsx");
const shared = await loadSource("src/pages/newsletterPageShared.jsx");
const { getMarketingSectionFromPath, marketingNavigationGroups } = await loadSource("src/config/marketingNavigation.js");

const { Route } = router;
const h = React.createElement;
const hasText = (matcher) => queryByText(matcher) !== null;
const tableRows = () => all("table[aria-label='Landing pages'] tbody tr[data-page-id]");

const makePage = (overrides = {}) => ({
  id: "51",
  title: "Spring Summit",
  alias: "spring-summit",
  publicUrl: "https://mautic.example/spring-summit",
  isPublished: false,
  isPreferenceCenter: false,
  language: "en",
  category: null,
  hits: 12,
  uniqueHits: 9,
  dateAdded: "2026-10-27T06:00:00Z",
  dateModified: "2026-10-27T06:10:00Z",
  createdBy: "Ecp DevProof",
  modifiedBy: "Ecp DevProof",
  customHtml: "<html><body><h1>Join us</h1></body></html>",
  template: "blank",
  metaDescription: "",
  noIndex: false,
  redirectType: "",
  redirectUrl: "",
  activeContent: [],
  htmlLocked: false,
  editable: true,
  publishBlockers: [],
  publishable: true,
  ...overrides,
});

const makeUsage = (overrides = {}) => ({
  campaignEvents: [],
  preferenceCenterEmails: [],
  pointActions: [],
  variantChildren: 0,
  translationChildren: 0,
  hasHeadScript: false,
  hasFooterScript: false,
  blocking: {},
  ...overrides,
});

const apiError = (status, data) => Object.assign(new Error(`HTTP ${status}`), { response: { status, data } });

const makeAbTest = (overrides = {}) => ({
  parentId: "51",
  criteria: "page.dwelltime",
  criteriaLabel: "Time on page (longest wins)",
  mixedCriteria: false,
  running: true,
  versions: [
    { id: "51", title: "Spring Summit", isMain: true, isPublished: true, weight: 70, variantHits: 14, uniqueHits: 14, result: 30, isLeading: false },
    { id: "52", title: "Summit B", isMain: false, isPublished: true, weight: 30, variantHits: 6, uniqueHits: 6, result: 45, isLeading: true },
  ],
  ...overrides,
});

function installPagesApi({ pages = [makePage()], usage = makeUsage(), handlers = {}, abtest = makeAbTest() } = {}) {
  const calls = [];
  const byId = Object.fromEntries(pages.map((page) => [String(page.id), page]));
  const respond = async (method, url, payload, config) => {
    calls.push({ method, url, payload, params: config?.params });
    const key = `${method} ${url}`;
    if (handlers[key]) return handlers[key](payload, config);
    if (method === "get" && url === "/newsletter/admin/pages/") {
      return { data: { count: pages.length, page: 1, page_size: 25, num_pages: pages.length ? 1 : 0, results: pages } };
    }
    if (method === "get" && url === "/newsletter/admin/forms/") {
      return { data: { count: 1, results: [{ id: "3", name: "Summit Signup", isPublished: true }] } };
    }
    if (method === "get" && url === "/newsletter/admin/pages/categories/") {
      return { data: { count: 1, results: [{ id: "4", title: "Events", bundle: "page" }] } };
    }
    const detail = url.match(/^\/newsletter\/admin\/pages\/([^/]+)\/$/);
    if (method === "get" && detail) {
      if (byId[detail[1]]) return { data: byId[detail[1]] };
      throw apiError(404, { detail: "Landing page not found in Mautic.", code: "page_not_found" });
    }
    if (method === "post" && url === "/newsletter/admin/pages/") return { data: makePage({ id: "60", ...payload, aliasAdjusted: false }) };
    if (method === "patch" && detail) return { data: { ...byId[detail[1]], ...payload, aliasAdjusted: false } };
    const publication = url.match(/^\/newsletter\/admin\/pages\/([^/]+)\/(publish|unpublish)\/$/);
    if (method === "post" && publication) return { data: { ...byId[publication[1]], isPublished: publication[2] === "publish" } };
    if (method === "get" && /^\/newsletter\/admin\/pages\/[^/]+\/usage\/$/.test(url)) return { data: usage };
    const family = url.match(/^\/newsletter\/admin\/pages\/([^/]+)\/(variants|translations|abtest|winner)\/$/);
    if (family) {
      const [, id, kind] = family;
      if (kind === "variants" && method === "post") return { data: makePage({ id: "70", role: "variant", title: payload.title || "Variant", familyParent: { id, title: "Spring Summit" } }) };
      if (kind === "translations" && method === "post") return { data: makePage({ id: "71", role: "translation", language: payload.language }) };
      if (kind === "abtest") return { data: abtest };
      if (kind === "winner" && method === "post") return { data: { winner: makePage({ id, role: "main" }), previousMainId: "51" } };
    }
    if (method === "delete" && detail) return { data: { deleted: true, id: detail[1], title: byId[detail[1]]?.title || "" } };
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

const renderPages = (url) =>
  renderRoutes(
    [
      h(Route, { key: "hub", path: "/admin/newsletter", element: h("div", null, "Marketing Hub home") }),
      h(Route, { key: "list", path: "/admin/newsletter/pages", element: h(AdminNewsletterPagesPage) }),
      h(Route, { key: "new", path: "/admin/newsletter/pages/new", element: h(AdminNewsletterPageEditorPage) }),
      h(Route, { key: "details", path: "/admin/newsletter/pages/:pageId", element: h(AdminNewsletterPageDetailsPage) }),
      h(Route, { key: "edit", path: "/admin/newsletter/pages/:pageId/edit", element: h(AdminNewsletterPageEditorPage) }),
    ],
    { url }
  );

afterEach(async () => {
  await cleanup();
  delete globalThis.__testApiClient;
});

// ---------------------------------------------------------- navigation --

test("Landing Pages sits under Campaigns and owns its pages", () => {
  const campaigns = marketingNavigationGroups.find((group) => group.label === "Campaigns");
  // Assets (downloadable files) follows the content items.
  assert.deepEqual(campaigns.items.map((item) => item.id), ["campaigns", "broadcasts", "templates", "pages", "assets"]);
  assert.equal(getMarketingSectionFromPath("/admin/newsletter/assets/12/edit"), "assets");
  for (const path of ["/admin/newsletter/pages", "/admin/newsletter/pages/new", "/admin/newsletter/pages/51", "/admin/newsletter/pages/51/edit"]) {
    assert.equal(getMarketingSectionFromPath(path), "pages", path);
  }
});

// ------------------------------------------------------------------ list --

test("the list shows pages with status, URL and visits and opens Details", async () => {
  installPagesApi({ pages: [makePage(), makePage({ id: "52", title: "Webinar", alias: "webinar", isPublished: true, hits: 40 })] });
  const view = await renderPages("/admin/newsletter/pages");
  await waitFor(() => assert.equal(tableRows().length, 2));

  const headers = all("table thead th").map((th) => th.textContent.trim());
  assert.deepEqual(headers, ["Page Title", "Status", "Page URL", "Visits", "Unique Visitors", "Last Updated", "Actions"]);
  const [first, second] = tableRows().map((row) => row.textContent);
  assert.match(first, /Spring Summit.*Unpublished.*\/spring-summit.*12.*9/);
  assert.match(second, /Webinar.*Published.*\/webinar.*40/);
  // Only a published page offers the live link.
  assert.equal(all("a[aria-label='Open Webinar']").length, 1);
  assert.equal(all("a[aria-label='Open Spring Summit']").length, 0);

  await click(tableRows()[1].querySelectorAll("td")[1]);
  await waitFor(() => assert.equal(view.path(), "/admin/newsletter/pages/52"));
});

test("search and status filter go to the backend", async () => {
  const api = installPagesApi();
  await renderPages("/admin/newsletter/pages");
  await waitFor(() => assert.equal(tableRows().length, 1));

  await typeInto(getByRole("textbox", "Search Landing Pages"), "Summit");
  await click(getByRole("button", "Search"));
  await waitFor(() => assert.equal(api.calls.at(-1).params.search, "Summit"));
  await chooseSelectOption(getByRole("combobox", /Status/), "Published");
  await waitFor(() => assert.equal(api.calls.at(-1).params.status, "published"));
});

test("preference-center pages have no edit or delete in the list", async () => {
  installPagesApi({ pages: [makePage({ isPreferenceCenter: true, editable: false })] });
  await renderPages("/admin/newsletter/pages");
  await waitFor(() => assert.equal(tableRows().length, 1));
  assert.equal(hasText("Preference center"), true);
  assert.equal(queryByRole("button", "Edit Spring Summit"), null);
  assert.equal(queryByRole("button", "Delete Spring Summit"), null);
});

test("an empty list offers to create the first page", async () => {
  installPagesApi({ pages: [] });
  await renderPages("/admin/newsletter/pages");
  await waitFor(() => assert.equal(hasText("No landing pages yet."), true));
  assert.equal(all("a[href='/admin/newsletter/pages/new']").length >= 1, true);
});

// --------------------------------------------------------------- details --

test("details show the public URL, settings, preview and usage", async () => {
  installPagesApi({ usage: makeUsage({ campaignEvents: [{ id: "9", campaignId: "5", campaignName: "Nurture", campaignPublished: true }] }) });
  await renderPages("/admin/newsletter/pages/51");
  await waitFor(() => assert.equal(hasText("Mautic landing page #51"), true));

  assert.equal(all("[data-testid='page-public-url']")[0].textContent, "https://mautic.example/spring-summit");
  assert.equal(hasText(/access-denied \(403\) page until it is published/), true);
  assert.equal(all("iframe[title='Preview of Spring Summit']")[0].getAttribute("sandbox"), "");
  await waitFor(() => assert.equal(hasText("Nurture"), true));
  assert.equal(queryByRole("button", "Publish") !== null, true);
  assert.equal(queryByRole("button", "Delete") !== null, true);
});

test("a page without content cannot be published and says why", async () => {
  installPagesApi({ pages: [makePage({ customHtml: "", publishable: false, publishBlockers: ["The page has no content yet. Add its HTML first."] })] });
  await renderPages("/admin/newsletter/pages/51");
  await waitFor(() => assert.equal(hasText("This page cannot be published yet."), true));
  assert.equal(getByRole("button", "Publish").disabled, true);
});

test("publishing confirms first and shows the state Mautic reports", async () => {
  const api = installPagesApi();
  await renderPages("/admin/newsletter/pages/51");
  await waitFor(() => assert.equal(hasText("Mautic landing page #51"), true));

  await click(getByRole("button", "Publish"));
  await waitFor(() => assert.equal(hasText("Publish landing page?"), true));
  assert.equal(api.writes("post").length, 0);
  await click(getByRole("button", "Publish", { scope: getByRole("dialog") }));
  await waitFor(() => assert.equal(hasText("Landing page published."), true));
  assert.deepEqual(api.writes("post").map((c) => c.url), ["/newsletter/admin/pages/51/publish/"]);
});

test("a preference-center page is read-only", async () => {
  installPagesApi({ pages: [makePage({ isPreferenceCenter: true, editable: false })] });
  await renderPages("/admin/newsletter/pages/51");
  await waitFor(() => assert.equal(hasText(/preference-center page/), true));
  for (const name of ["Edit Page", "Publish", "Delete", "Duplicate"]) assert.equal(queryByRole("button", name), null, name);
});

test("HTML that runs code is flagged and locked for non-superusers", async () => {
  installPagesApi({ pages: [makePage({ activeContent: ["a <script> element"], htmlLocked: true })] });
  await renderPages("/admin/newsletter/pages/51");
  await waitFor(() => assert.equal(hasText(/This page's HTML runs code/), true));
  assert.equal(getByRole("button", "Duplicate").disabled, true);
});

test("an unknown page is reported and an invalid link never reaches the API", async () => {
  const api = installPagesApi();
  await renderPages("/admin/newsletter/pages/99");
  await waitFor(() => assert.equal(hasText("Landing page not found."), true));
  await cleanup();
  await renderPages("/admin/newsletter/pages/abc");
  await waitFor(() => assert.equal(hasText("Invalid landing page link."), true));
  assert.equal(api.calls.filter((c) => c.url.includes("/abc")).length, 0);
});

// ---------------------------------------------------------------- editor --

test("create suggests a URL from the title, validates and opens the new page", async () => {
  const api = installPagesApi();
  const view = await renderPages("/admin/newsletter/pages/new");
  await waitFor(() => getByRole("button", "Create Page"));

  await click(getByRole("button", "Create Page"));
  await waitFor(() => assert.equal(hasText("Page title is required."), true));
  assert.equal(api.writes("post").length, 0);

  await typeInto(getByRole("textbox", /^Page title/), "Spring Summit 2027!");
  assert.equal(getByRole("textbox", /^Page URL/).value, "spring-summit-2027");
  await typeInto(getByRole("textbox", /^Page URL/), "api");
  await click(getByRole("button", "Create Page"));
  await waitFor(() => assert.equal(hasText(/is used by Mautic itself/), true));
  assert.equal(api.writes("post").length, 0);

  await typeInto(getByRole("textbox", /^Page URL/), "summit");
  await click(getByRole("button", "Create Page"));
  await waitFor(() => assert.equal(view.path(), "/admin/newsletter/pages/60"));
  const sent = api.writes("post")[0].payload;
  assert.equal(sent.title, "Spring Summit 2027!");
  assert.equal(sent.alias, "summit");
  assert.equal("isPublished" in sent, false);
  assert.equal("headScript" in sent, false);
  assert.equal(sent.customHtml.includes("<h1>Your headline</h1>"), true);
});

test("edit sends only changed settings and server field errors land on the field", async () => {
  const api = installPagesApi({ handlers: { "patch /newsletter/admin/pages/51/": async () => {
    throw apiError(403, { detail: "Only superusers can save page HTML that runs code.", code: "page_scripts_superuser_only", errors: { customHtml: "Only superusers can save page HTML that runs code." } });
  } } });
  await renderPages("/admin/newsletter/pages/51/edit");
  await waitFor(() => getByRole("button", "Save Page"));

  await typeInto(getByRole("textbox", /^Meta description/), "Join the summit");
  await typeInto(getByRole("textbox", /^Page HTML/), "<script>x()</script>");
  await click(getByRole("button", "Save Page"));
  await waitFor(() => assert.equal(api.writes("patch").length, 1));
  assert.equal(JSON.stringify(Object.keys(api.writes("patch")[0].payload).sort()), JSON.stringify(["customHtml", "metaDescription"]));
  await waitFor(() => assert.equal(all("p.Mui-error").some((p) => /Only superusers/.test(p.textContent)), true));
});

test("a locked page's HTML is read-only and never sent", async () => {
  const api = installPagesApi({ pages: [makePage({ activeContent: ["a <script> element"], htmlLocked: true })] });
  await renderPages("/admin/newsletter/pages/51/edit");
  await waitFor(() => getByRole("button", "Save Page"));
  assert.equal(getByRole("textbox", /^Page HTML/).readOnly, true);

  await typeInto(getByRole("textbox", /^Page title/), "Renamed");
  await click(getByRole("button", "Save Page"));
  await waitFor(() => assert.equal(api.writes("patch").length, 1));
  assert.equal(JSON.stringify(api.writes("patch")[0].payload), JSON.stringify({ title: "Renamed" }));
});

// ---------------------------------------------------------------- delete --

test("a page still in use cannot be deleted", async () => {
  const api = installPagesApi({ usage: makeUsage({ blocking: { campaigns: [{ id: "5", name: "Nurture" }], preferenceCenterEmails: [{ id: "8", name: "Weekly" }] } }) });
  await renderPages("/admin/newsletter/pages/51");
  await waitFor(() => assert.equal(hasText("Mautic landing page #51"), true));
  await click(getByRole("button", "Delete"));
  const dialog = await waitFor(() => getByRole("dialog"));
  await waitFor(() => assert.equal(hasText(/still in use and cannot be deleted/), true));
  assert.equal(hasText("Campaigns: Nurture (#5)"), true);
  assert.equal(hasText("Preference center of Emails: Weekly (#8)"), true);
  assert.equal(getByRole("button", "Delete", { scope: dialog }).disabled, true);
  assert.equal(api.writes("delete").length, 0);
});

test("deleting an unused page confirms and returns to the list", async () => {
  const api = installPagesApi();
  const view = await renderPages("/admin/newsletter/pages/51");
  await waitFor(() => assert.equal(hasText("Mautic landing page #51"), true));
  await click(getByRole("button", "Delete"));
  const dialog = await waitFor(() => getByRole("dialog"));
  await waitFor(() => assert.equal(getByRole("button", "Delete", { scope: dialog }).disabled, false));
  await click(getByRole("button", "Delete", { scope: dialog }));
  await waitFor(() => assert.equal(view.path(), "/admin/newsletter/pages"));
  assert.deepEqual(api.writes("delete").map((c) => c.url), ["/newsletter/admin/pages/51/"]);
});

// --------------------------------------------------------------- helpers --

test("draft rules mirror the backend", () => {
  const { validatePageDraft, draftToPayload, slugifyAlias, blankPage, describeBlocking } = shared;
  assert.equal(slugifyAlias("  Ünïcode Summit -- 2027 "), "unicode-summit-2027");
  assert.deepEqual(Object.keys(validatePageDraft({ ...blankPage, title: "T" }, { isNew: true })), []);
  assert.deepEqual(Object.keys(validatePageDraft({ ...blankPage, title: "T", alias: "" })), ["alias"]);
  for (const alias of ["Bad", "a--b", "-a", "s"]) {
    assert.deepEqual(Object.keys(validatePageDraft({ ...blankPage, title: "T", alias })), ["alias"], alias);
  }
  assert.deepEqual(Object.keys(validatePageDraft({ ...blankPage, title: "T", alias: "t", redirectType: "301", redirectUrl: "javascript:x" })), ["redirectUrl"]);
  assert.deepEqual(Object.keys(validatePageDraft({ ...blankPage, title: "T", alias: "t", language: "english" })), ["language"]);

  const created = draftToPayload({ ...blankPage, title: " T ", alias: "" });
  assert.equal("alias" in created, false);
  assert.equal("redirectType" in created, false);
  assert.equal(created.title, "T");

  const original = makePage();
  assert.deepEqual(draftToPayload(shared.pageToDraft(original), original), {});
  assert.deepEqual(
    draftToPayload({ ...shared.pageToDraft(original), redirectType: "302", redirectUrl: "https://x.example" }, original),
    { redirectType: "302", redirectUrl: "https://x.example" }
  );
  assert.deepEqual(describeBlocking({ children: { variants: 1, translations: 2 } }), ["1 A/B variant and 2 translations (managed in Mautic)"]);
});

// -------------------------------------------------------- visual builder --

const doc = await loadSource("src/components/marketing/landingPageDocument.js");
const { initialPageEditorMode } = await loadSource("src/components/marketing/LandingPageContentEditor.jsx");
const builderTextbox = () => queryByRole("textbox", "Page builder (test double)");
const BUILT_PAGE = '<!DOCTYPE html><html lang="en"><head><title>Built</title><style>h1{color:navy}</style><style>/* ecp-page-builder */ #i1{color:red;}</style></head><body class="lp"><main><h1>Built</h1></main></body></html>';

test("a new page opens in the visual builder and saves its document with the head kept", async () => {
  const api = installPagesApi();
  await renderPages("/admin/newsletter/pages/new");
  await waitFor(() => assert.equal(builderTextbox() !== null, true));
  assert.equal(getByRole("button", "Visual Builder").getAttribute("aria-pressed"), "true");

  await typeInto(getByRole("textbox", /^Page title/), "Summit");
  globalThis.__fakePageBuilder.edit("<section><h1>Built in the builder</h1></section>");
  await click(getByRole("button", "Create Page"));
  await waitFor(() => assert.equal(api.writes("post").length, 1));
  const html = api.writes("post")[0].payload.customHtml;
  assert.equal(html.startsWith("<!DOCTYPE html>"), true);
  assert.equal(html.includes("<title>Landing page</title>"), true);
  assert.equal(html.includes("max-width: 760px"), true);
  assert.equal(html.includes("<style>/* ecp-page-builder */\n#i1{color:red;}</style>"), true);
  assert.equal(html.includes("<section><h1>Built in the builder</h1></section>"), true);
  assert.equal(html.includes("Your headline"), false);
});

test("an untouched builder sends no HTML change", async () => {
  const api = installPagesApi({ pages: [makePage({ customHtml: BUILT_PAGE })] });
  await renderPages("/admin/newsletter/pages/51/edit");
  await waitFor(() => assert.equal(builderTextbox() !== null, true));
  await typeInto(getByRole("textbox", /^Page title/), "Renamed");
  await click(getByRole("button", "Save Page"));
  await waitFor(() => assert.equal(api.writes("patch").length, 1));
  assert.equal(JSON.stringify(api.writes("patch")[0].payload), JSON.stringify({ title: "Renamed" }));
});

test("a hand-written page opens as HTML and asks before opening the builder", async () => {
  installPagesApi();
  await renderPages("/admin/newsletter/pages/51/edit");
  await waitFor(() => getByRole("textbox", /^Page HTML/));
  assert.equal(builderTextbox(), null);

  await click(getByRole("button", "Visual Builder"));
  await waitFor(() => assert.equal(hasText("Open this page in the visual builder?"), true));
  await click(getByRole("button", "Stay in HTML Editor"));
  await waitFor(() => assert.equal(hasText("Open this page in the visual builder?"), false));
  assert.equal(builderTextbox(), null);

  await click(getByRole("button", "Visual Builder"));
  await click(await waitFor(() => getByRole("button", "Open Visual Builder")));
  await waitFor(() => assert.equal(builderTextbox()?.value, "<h1>Join us</h1>"));
});

test("builder edits carry into the HTML editor when switching back", async () => {
  installPagesApi({ pages: [makePage({ customHtml: BUILT_PAGE })] });
  await renderPages("/admin/newsletter/pages/51/edit");
  await waitFor(() => assert.equal(builderTextbox() !== null, true));
  globalThis.__fakePageBuilder.edit("<main><h1>Edited</h1></main>");
  await click(getByRole("button", "HTML Editor"));
  const textbox = await waitFor(() => getByRole("textbox", /^Page HTML/));
  assert.equal(textbox.value.includes("<h1>Edited</h1>"), true);
  assert.equal(textbox.value.includes("<title>Built</title>"), true);
  assert.equal(textbox.value.includes('<body class="lp">'), true);
});

test("HTML that runs code never opens in the builder", async () => {
  installPagesApi({ pages: [makePage({ customHtml: "<html><body><script>track()</script><p>x</p></body></html>", activeContent: ["a <script> element"] })] });
  await renderPages("/admin/newsletter/pages/51/edit");
  await waitFor(() => getByRole("textbox", /^Page HTML/));
  await click(getByRole("button", "Visual Builder"));
  await waitFor(() => assert.equal(hasText(/visual builder cannot open this page: it would remove a <script> element/), true));
  assert.equal(builderTextbox(), null);
});

test("Insert Mautic Form lists published Forms and adds the token", async () => {
  const api = installPagesApi({ pages: [makePage({ customHtml: BUILT_PAGE })] });
  await renderPages("/admin/newsletter/pages/51/edit");
  await waitFor(() => assert.equal(builderTextbox() !== null, true));
  await click(getByRole("button", "Insert Mautic Form"));
  await click(await waitFor(() => getByRole("button", /Summit Signup/)));
  await waitFor(() => assert.equal(builderTextbox().value.includes("{form=3}"), true));
  const formsCall = api.calls.find((c) => c.url === "/newsletter/admin/forms/");
  assert.equal(formsCall.params.status, "published");
});

test("unsaved builder changes hold navigation", async () => {
  installPagesApi({ pages: [makePage({ customHtml: BUILT_PAGE })] });
  const view = await renderPages("/admin/newsletter/pages/51/edit");
  await waitFor(() => assert.equal(builderTextbox() !== null, true));
  globalThis.__fakePageBuilder.edit("<p>changed</p>");
  await click(getByRole("button", "Back"));
  await waitFor(() => assert.equal(hasText("Leave without saving?"), true));
  await click(getByRole("button", "Keep Editing"));
  assert.equal(view.path(), "/admin/newsletter/pages/51/edit");
});

test("document helpers keep the head and rebuild one builder stylesheet", () => {
  const parts = doc.splitPageDocument(BUILT_PAGE);
  assert.equal(parts.builderCss, "#i1{color:red;}");
  assert.equal(parts.headHtml.includes("ecp-page-builder"), false);
  assert.equal(parts.bodyHtml, "<main><h1>Built</h1></main>");
  assert.deepEqual(parts.bodyAttrs, [["class", "lp"]]);
  assert.deepEqual(doc.headStyleMarkup(parts.headHtml), ["<style>h1{color:navy}</style>"]);
  assert.equal(doc.builderBodyContent('<body id="x"><p>a</p></body>'), "<p>a</p>");

  const rebuilt = doc.composePageDocument(parts, { bodyHtml: "<p>new</p>", css: "#i2{margin:0}</style><script>" });
  const again = doc.splitPageDocument(rebuilt);
  assert.equal(again.bodyHtml, "<p>new</p>");
  assert.equal(again.headHtml.includes("<title>Built</title>"), true);
  assert.equal((rebuilt.match(/ecp-page-builder/g) || []).length, 1);
  assert.equal(rebuilt.includes("</style><script>"), false);
  assert.equal(doc.composePageDocument(parts, { bodyHtml: "", css: "" }).includes("ecp-page-builder"), false);
  // Mautic strips attributes from <style>; the comment marker survives, so a save
  // round trip through Mautic still finds (and replaces) the builder stylesheet.
  const throughMautic = rebuilt.replace(/<style[^>]*>/g, "<style>");
  assert.equal(doc.hasBuilderStyle(throughMautic), true);
  assert.equal(doc.splitPageDocument(throughMautic).builderCss, "#i2{margin:0}<\\/style><script>");
});

test("active-content detection mirrors the backend policy", () => {
  assert.deepEqual(doc.findActiveContent('<p><a href="https://x.example">ok</a><iframe src="https://youtube.com/embed/x"></iframe>{form=3}</p>'), []);
  const findings = doc.findActiveContent('<script>a()</script><div onclick="x"></div><a href="java\tscript:x">j</a><iframe srcdoc="x"></iframe><base href="/">');
  for (const expected of ["a <script> element", "an event-handler attribute (onclick)", "a script URL in href", "an <iframe srcdoc> document", "a <base> element"]) {
    assert.equal(findings.includes(expected), true, expected);
  }
  assert.equal(doc.formBlockMarkup("3", 'A "quoted" <form>'), '<div data-ecp-mautic-form="3" title="Mautic Form: A &quot;quoted&quot; &lt;form&gt;">{form=3}</div>');
  assert.throws(() => doc.formBlockMarkup("x"));
});

test("the editor opens visual only for new or builder-made pages without code", () => {
  assert.equal(initialPageEditorMode({ isNew: true, html: "<p>x</p>" }), "visual");
  assert.equal(initialPageEditorMode({ isNew: false, html: BUILT_PAGE }), "visual");
  assert.equal(initialPageEditorMode({ isNew: false, html: "<p>hand-written</p>" }), "html");
  assert.equal(initialPageEditorMode({ isNew: true, html: "<script>x</script>" }), "html");
});

// ------------------------------------------------ A/B variants & translations --

const family = await loadSource("src/pages/newsletterPageFamily.jsx");
const MAIN = { role: "main", familyParent: null, variantChildrenCount: 0, translations: [] };

test("a main page offers A/B and translation sections; adding a variant opens it", async () => {
  const api = installPagesApi({ pages: [makePage({ ...MAIN }), makePage({ id: "70", role: "variant", title: "Variant" })] });
  const view = await renderPages("/admin/newsletter/pages/51");
  await waitFor(() => assert.equal(hasText("Mautic landing page #51"), true));
  assert.equal(all("[data-testid='ab-test-section']").length, 1);
  assert.equal(hasText("No translations yet."), true);
  // No variants yet: the test is not loaded.
  assert.equal(api.calls.some((c) => c.url.endsWith("/abtest/")), false);

  await click(getByRole("button", "Add Variant"));
  const dialog = await waitFor(() => getByRole("dialog"));
  assert.equal(getByRole("spinbutton", /Traffic weight/, { scope: dialog }).value, "50");
  await typeInto(getByRole("spinbutton", /Traffic weight/, { scope: dialog }), "0");
  await click(getByRole("button", "Create Variant", { scope: dialog }));
  await waitFor(() => assert.equal(hasText("Weight must be a whole number from 1 to 100."), true));
  await typeInto(getByRole("spinbutton", /Traffic weight/, { scope: dialog }), "25");
  await click(getByRole("button", "Create Variant", { scope: dialog }));
  await waitFor(() => assert.equal(view.path(), "/admin/newsletter/pages/70"));
  const sent = api.writes("post").find((c) => c.url.endsWith("/variants/")).payload;
  assert.equal(JSON.stringify(sent), JSON.stringify({ weight: 25, winnerCriteria: "page.dwelltime", title: "Spring Summit (Variant)" }));
});

test("a running test shows versions, weights, results and the leader", async () => {
  const api = installPagesApi({ pages: [makePage({ ...MAIN, variantChildrenCount: 1 })] });
  await renderPages("/admin/newsletter/pages/51");
  await waitFor(() => assert.equal(all("table[aria-label='A/B test versions'] tbody tr").length, 2));
  const [mainRow, variantRow] = all("table[aria-label='A/B test versions'] tbody tr").map((row) => row.textContent);
  assert.match(mainRow, /Spring Summit \(main\).*Published.*70%.*14.*30s/);
  assert.match(variantRow, /Summit B.*Leading.*30%.*6.*45s/);
  assert.equal(hasText(/Winner judged by: Time on page/), true);

  await click(getByRole("button", "Weight"));
  const dialog = await waitFor(() => getByRole("dialog"));
  await typeInto(getByRole("spinbutton", /Traffic weight/, { scope: dialog }), "40");
  await click(getByRole("button", "Save", { scope: dialog }));
  await waitFor(() => assert.equal(hasText(/Variant weight saved/), true));
  const patch = api.writes("patch").find((c) => c.url === "/newsletter/admin/pages/52/abtest/");
  assert.equal(JSON.stringify(patch.payload), JSON.stringify({ weight: 40 }));
});

test("making a variant the winner explains the switch and opens the new main page", async () => {
  const api = installPagesApi({ pages: [makePage({ ...MAIN, variantChildrenCount: 1 }), makePage({ id: "52", role: "main" })] });
  const view = await renderPages("/admin/newsletter/pages/51");
  await waitFor(() => assert.equal(all("table[aria-label='A/B test versions'] tbody tr").length, 2));
  await click(getByRole("button", "Make winner"));
  const dialog = await waitFor(() => getByRole("dialog"));
  assert.equal(hasText(/takes over its address, so existing links keep working/), true);
  assert.equal(hasText(/translations move to the winner/), true);
  await click(getByRole("button", "Make Winner", { scope: dialog }));
  await waitFor(() => assert.equal(view.path(), "/admin/newsletter/pages/52"));
  assert.deepEqual(api.writes("post").map((c) => c.url), ["/newsletter/admin/pages/52/winner/"]);
});

test("translations are listed and a new one is validated and opened", async () => {
  const api = installPagesApi({ pages: [
    makePage({ ...MAIN, translations: [{ id: "53", title: "Sommet", language: "fr", isPublished: true, publicUrl: "https://mautic.example/fr/sommet" }] }),
    makePage({ id: "71", role: "translation", language: "de" }),
  ] });
  const view = await renderPages("/admin/newsletter/pages/51");
  await waitFor(() => assert.equal(all("table[aria-label='Translations'] tbody tr").length, 1));
  assert.match(all("table[aria-label='Translations'] tbody tr")[0].textContent, /fr.*Sommet.*Published.*\/fr\/sommet/);

  await click(getByRole("button", "Add Translation"));
  const dialog = await waitFor(() => getByRole("dialog"));
  await typeInto(getByRole("textbox", /^Language/, { scope: dialog }), "German");
  await click(getByRole("button", "Create Translation", { scope: dialog }));
  await waitFor(() => assert.equal(hasText("Use a locale code such as fr or fr_CA."), true));
  assert.equal(api.writes("post").length, 0);
  await typeInto(getByRole("textbox", /^Language/, { scope: dialog }), "de");
  await click(getByRole("button", "Create Translation", { scope: dialog }));
  await waitFor(() => assert.equal(view.path(), "/admin/newsletter/pages/71"));
  assert.equal(JSON.stringify(api.writes("post")[0].payload), JSON.stringify({ language: "de" }));
});

test("a variant shows where it belongs and has no variant or translation of its own", async () => {
  installPagesApi({ pages: [makePage({
    id: "52", title: "Summit B", role: "variant", familyParent: { id: "51", title: "Spring Summit", alias: "spring-summit" },
    variantSettings: { weight: 30, winnerCriteria: "page.dwelltime" },
  })] });
  await renderPages("/admin/newsletter/pages/52");
  await waitFor(() => assert.equal(hasText("Mautic landing page #52"), true));
  assert.match(all("[data-testid='family-banner']")[0].textContent, /A\/B variant of Spring Summit with 30% of traffic/);
  assert.equal(hasText("A/B variant"), true);
  assert.equal(queryByRole("button", "Add Variant"), null);
  assert.equal(all("[data-testid='translations-section']").length, 0);
  // It still shows (and can steer) the test it belongs to.
  await waitFor(() => assert.equal(all("table[aria-label='A/B test versions'] tbody tr").length, 2));
});

test("a translation shows its language and own address, without an A/B section", async () => {
  installPagesApi({ pages: [makePage({
    id: "53", title: "Sommet", role: "translation", language: "fr", publicUrl: "https://mautic.example/fr/sommet",
    familyParent: { id: "51", title: "Spring Summit", alias: "spring-summit" },
  })] });
  await renderPages("/admin/newsletter/pages/53");
  await waitFor(() => assert.equal(hasText("Mautic landing page #53"), true));
  assert.match(all("[data-testid='family-banner']")[0].textContent, /fr translation of Spring Summit.*https:\/\/mautic\.example\/fr\/sommet/);
  assert.equal(all("[data-testid='ab-test-section']").length, 0);
});

test("the list marks variants and translations", async () => {
  installPagesApi({ pages: [makePage(), makePage({ id: "52", role: "variant" }), makePage({ id: "53", role: "translation", language: "fr" })] });
  await renderPages("/admin/newsletter/pages");
  await waitFor(() => assert.equal(tableRows().length, 3));
  const rows = tableRows().map((row) => row.textContent);
  assert.equal(/A\/B variant|Translation/.test(rows[0]), false);
  assert.match(rows[1], /A\/B variant/);
  assert.match(rows[2], /Translation \(fr\)/);
});

test("family helpers", () => {
  assert.equal(family.suggestedWeight([]), 50);
  assert.equal(family.suggestedWeight([{ isMain: true, weight: 40 }, { isMain: false, weight: 60 }]), 40);
  assert.equal(family.suggestedWeight([{ isMain: false, weight: 100 }]), 0);
  assert.deepEqual(["0", "101", "5.5", "x", "25"].map((v) => family.validateWeight(v) === ""), [false, false, false, false, true]);
  assert.deepEqual(["fr", "pt_BR", "French", "fr-FR", ""].map((v) => family.validateLanguage(v) === ""), [true, true, false, false, false]);
});
