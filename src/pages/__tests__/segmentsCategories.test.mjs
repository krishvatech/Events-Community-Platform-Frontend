import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import {
  React, all, chooseSelectOption, cleanup, click, getByRole, loadSource, queryByText, renderRoutes, router, typeInto, waitFor,
} from "./helpers/blogDomHarness.mjs";

// Assertions compare strings/booleans only.
const { default: CategoriesPage } = await loadSource("src/pages/AdminNewsletterMauticCategoriesPage.jsx");
const { default: SegmentsPanel } = await loadSource("src/pages/AdminNewsletterNativeSegmentsPanel.jsx");
const { getMarketingSectionFromPath, marketingNavigationGroups } = await loadSource("src/config/marketingNavigation.js");
const { Route } = router;
const h = React.createElement;
const hasText = (matcher) => queryByText(matcher) !== null;
const render = (element) => renderRoutes([h(Route, { key: "x", path: "/x", element })], { url: "/x" });

const CATEGORIES = [
  { id: 1, title: "Board", alias: "board", bundle: "segment", color: "4E5D9D", isPublished: true, protected: false,
    usage: { items: 3, by_type: [{ type: "segments", count: 2 }, { type: "emails", count: 1 }], contact_preferences: 0 } },
  { id: 4, title: "ECP Subscription Lists", alias: "ecp-subscription-lists", bundle: "segment", isPublished: true, protected: true,
    usage: { items: 2, by_type: [], contact_preferences: 0 } },
  { id: 6, title: "Unused", alias: "unused", bundle: "email", isPublished: false, protected: false,
    usage: { items: 0, by_type: [], contact_preferences: 0 } },
  { id: 7, title: "Prefs", alias: "prefs", bundle: "email", isPublished: true, protected: false,
    usage: { items: 0, by_type: [], contact_preferences: 4 } },
];
const SEGMENTS = [
  { id: "9", name: "Board", alias: "board", description: "", isPublished: true, is_dynamic: false, is_static: true, filters: [],
    publicName: "Board public", isGlobal: true, isPreferenceCenter: false, category: { id: 1, title: "Board" }, protected: false },
  { id: "12", name: "Consent gate", alias: "gate", isPublished: true, filters: [], consent_marked: true, protected: true,
    category: { id: 4, title: "ECP Subscription Lists" } },
];
const USED = { total: 1, usage: { campaigns: [{ id: 3, name: "Welcome flow", published: true, roles: ["condition"] }],
  emails: [], forms: [], segments: [], reports: [], point_triggers: [] } };

afterEach(async () => {
  await cleanup();
  delete globalThis.__testApiClient;
});

test("Categories sit under Administration with their own section", () => {
  const admin = marketingNavigationGroups.find((group) => group.label === "Administration");
  assert.equal(admin.items.some((item) => item.id === "categories" && item.path === "/admin/newsletter/categories"), true);
  assert.equal(getMarketingSectionFromPath("/admin/newsletter/categories"), "categories");
});

test("the consent category is listed but locked; others can be edited", async () => {
  globalThis.__testApiClient = { get: async () => ({ data: { results: CATEGORIES, usage_available: true } }) };
  await render(h(CategoriesPage));
  await waitFor(() => assert.equal(hasText("Board"), true));
  assert.equal(hasText("Managed by ECP"), true);
  assert.equal(all('button[aria-label="Edit ECP Subscription Lists"]').length, 0);
  assert.equal(all('button[aria-label="Delete ECP Subscription Lists"]').length, 0);
  assert.equal(all('button[aria-label="Edit Board"]').length, 1);
  assert.equal(hasText("3 items"), true);
  assert.equal(hasText("Unpublished"), true);
});

test("a new category posts the checked fields", async () => {
  const posts = [];
  globalThis.__testApiClient = {
    get: async () => ({ data: { results: CATEGORIES, usage_available: true } }),
    post: async (url, payload) => {
      posts.push({ url, payload });
      return { data: { id: 8, title: "Webinars", bundle: "segment" } };
    },
  };
  await render(h(CategoriesPage));
  await waitFor(() => assert.equal(hasText("Board"), true));
  await click(getByRole("button", "New Category"));
  await typeInto(getByRole("textbox", /Title/), "  Webinars ");
  await chooseSelectOption(getByRole("combobox", /Used for/), "Segments");
  await click(getByRole("button", "Create"));
  await waitFor(() => assert.equal(posts.length, 1));
  assert.equal(JSON.stringify(posts[0]), JSON.stringify({ url: "/newsletter/admin/mautic-categories/",
    payload: { title: "Webinars", bundle: "segment", description: "", color: "", isPublished: true } }));
});

test("a category in use can't be deleted; preferences only need a confirmation", async () => {
  const deletes = [];
  globalThis.__testApiClient = {
    get: async () => ({ data: { results: CATEGORIES, usage_available: true } }),
    delete: async (url, config) => {
      deletes.push({ url, params: config?.params });
      return { data: {} };
    },
  };
  await render(h(CategoriesPage));
  await waitFor(() => assert.equal(hasText("Board"), true));
  const remove = () => all("button").find((button) => button.textContent === "Delete");
  await click(getByRole("button", "Delete Board"));
  await waitFor(() => assert.equal(hasText(/so it can't be deleted/), true));
  assert.equal(remove().disabled, true);
  assert.equal(all('input[type="checkbox"]').length, 0);
  await click(getByRole("button", "Cancel"));

  await click(getByRole("button", "Delete Prefs"));
  await waitFor(() => assert.equal(hasText(/4 contacts have email preferences/), true));
  assert.equal(remove().disabled, true);
  await click(getByRole("checkbox", /I understand/));
  await click(remove());
  await waitFor(() => assert.equal(deletes.length, 1));
  assert.equal(JSON.stringify(deletes[0]), JSON.stringify({ url: "/newsletter/admin/mautic-categories/7/", params: { confirm: 1 } }));

  await click(getByRole("button", "Delete Unused"));
  await waitFor(() => assert.equal(hasText("Nothing uses this category."), true));
  await click(remove());
  await waitFor(() => assert.equal(deletes.length, 2));
  assert.equal(JSON.stringify(deletes[1].params), "{}");
});

const segmentApi = (overrides = {}) => ({
  get: async (url, config) => {
    if (url === "/newsletter/admin/mautic/segments/") return { data: SEGMENTS };
    if (url.endsWith("/usage/")) return { data: overrides.usage || { total: 0, usage: {} } };
    if (url === "/newsletter/admin/mautic-categories/") return { data: { results: [CATEGORIES[0]] , bundle: config?.params?.bundle } };
    if (url.endsWith("/filter-metadata/")) return { data: { fields: [], operators: [] } };
    if (url === "/newsletter/admin/mautic/segments/9/") return { data: SEGMENTS[0] };
    return { data: {} };
  },
  ...overrides,
});

test("consent gates are protected; other segments can be duplicated", async () => {
  const posts = [];
  globalThis.__testApiClient = segmentApi({
    post: async (url, payload) => {
      posts.push({ url, payload });
      return { data: { id: "20", name: payload.name } };
    },
  });
  await render(h(SegmentsPanel));
  await waitFor(() => assert.equal(hasText("Consent gate"), true));
  assert.equal(hasText("Protected"), true);
  assert.equal(all('button[aria-label="Duplicate Consent gate"]').length, 0);
  await click(getByRole("button", "Duplicate Board"));
  const name = getByRole("textbox", /Name of the copy/);
  assert.equal(name.value, "Copy of Board");
  await typeInto(name, "Board (EU)");
  await click(getByRole("button", "Duplicate"));
  await waitFor(() => assert.equal(posts.length, 1));
  assert.equal(JSON.stringify(posts[0]), JSON.stringify({ url: "/newsletter/admin/mautic/segments/9/duplicate/", payload: { name: "Board (EU)" } }));
});

test("a segment in use cannot be deleted and shows where it is used", async () => {
  globalThis.__testApiClient = segmentApi({ usage: USED, delete: async () => assert.fail("must not delete") });
  await render(h(SegmentsPanel));
  await waitFor(() => assert.equal(hasText("Consent gate"), true));
  await click(all('button[aria-label="Delete segment"]')[0]);
  await waitFor(() => assert.equal(hasText("Welcome flow"), true));
  assert.equal(hasText(/in use, so it can't be deleted/), true);
  assert.equal(hasText("Condition"), true);
  const remove = all("button").find((button) => button.textContent === "Delete");
  assert.equal(remove.disabled, true);
});

test("the Used in tab links each campaign to its builder", async () => {
  globalThis.__testApiClient = segmentApi({ usage: USED });
  await render(h(SegmentsPanel));
  await waitFor(() => assert.equal(hasText("Consent gate"), true));
  await click(all('button[aria-label="View segment"]')[0]);
  await waitFor(() => assert.equal(hasText("Board public"), true));
  await click(getByRole("button", "Used in"));
  await waitFor(() => assert.equal(hasText("Welcome flow"), true));
  const link = all("a").find((anchor) => anchor.textContent === "Welcome flow");
  assert.equal(link.getAttribute("href"), "/admin/newsletter/builder/3");
});

test("editing saves the public name, category and both switches", async () => {
  const patches = [];
  globalThis.__testApiClient = segmentApi({
    patch: async (url, payload) => {
      patches.push({ url, payload });
      return { data: SEGMENTS[0] };
    },
  });
  await render(h(SegmentsPanel));
  await waitFor(() => assert.equal(hasText("Consent gate"), true));
  await click(all('button[aria-label="Edit segment"]')[0]);
  await waitFor(() => assert.equal(getByRole("textbox", /Public Name/).value, "Board public"));
  await click(getByRole("checkbox", /Show in preference center/));
  await click(getByRole("button", "Save"));
  await waitFor(() => assert.equal(patches.length, 1));
  const payload = patches[0].payload;
  assert.equal(JSON.stringify([payload.publicName, payload.category, payload.isGlobal, payload.isPreferenceCenter]),
    JSON.stringify(["Board public", 1, true, true]));
});
