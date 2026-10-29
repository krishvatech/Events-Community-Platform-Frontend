import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { cleanup, click, getByRole, loadSource, queryByRole, queryByText, typeInto, waitFor } from "./helpers/blogDomHarness.mjs";
import { installTemplatesApi, makeTemplate, renderTemplatePages } from "./helpers/templatePagesHarness.mjs";

// Assertions compare strings/booleans only (see templatesPages.test.mjs).

const family = await loadSource("src/pages/newsletterTemplateFamily.jsx");
const hasText = (matcher) => queryByText(matcher) !== null;

const main = (overrides = {}) => makeTemplate({
  role: "main", language: "en", variantParentId: null, translationParentId: null,
  variants: [{ id: "19", name: "Reusable Newsletter B", language: "en", isPublished: true }],
  translations: [{ id: "21", name: "Reusable Newsletter (FR)", language: "fr", isPublished: false }],
  ...overrides,
});
const variant = makeTemplate({ id: "19", name: "Reusable Newsletter B", role: "variant", variantParentId: "18", variants: [], translations: [], language: "en" });
const abTest = (overrides = {}) => ({
  parentId: "18", criteria: "email.openrate", criteriaLabel: "Open rate", mixedCriteria: false, running: true, startedAt: "2026-10-29T06:00:00Z",
  versions: [
    { id: "18", name: "Reusable Newsletter", subject: "A subject", isMain: true, isPublished: true, weight: 50, sent: 2, opened: 0, clicked: 0, openRate: 0, clickRate: 0, isLeading: false },
    { id: "19", name: "Reusable Newsletter B", subject: "B subject", isMain: false, isPublished: true, weight: 50, sent: 2, opened: 2, clicked: 1, openRate: 100, clickRate: 50, isLeading: true },
  ],
  ...overrides,
});

afterEach(async () => {
  await cleanup();
  delete globalThis.__testApiClient;
});

test("the main template shows its A/B test results and its translations", async () => {
  installTemplatesApi({ templates: [main(), variant], handlers: { "get /newsletter/admin/templates/18/abtest/": async () => ({ data: abTest() }) } });
  await renderTemplatePages("/admin/newsletter/templates/18");
  await waitFor(() => assert.equal(hasText("2 (100%)"), true));
  assert.equal(hasText("Winner judged by: Open rate. The test is running."), true);
  assert.equal(hasText("Leading"), true);
  assert.equal(hasText("1 (50%)"), true);
  assert.equal(hasText("B subject"), true);
  assert.equal(hasText("This template is en. Contacts whose preferred locale matches a published translation get it instead."), true);
  assert.equal(getByRole("link", "Reusable Newsletter (FR)").getAttribute("href"), "/admin/newsletter/templates/21");
  assert.equal(queryByRole("alert") === null || !hasText(/This is an A\/B variant/), true);
});

test("adding a variant sends its share and criteria and opens the new variant", async () => {
  const api = installTemplatesApi({
    templates: [main({ variants: [] }), { ...variant, id: "30", name: "Reusable Newsletter (Variant)", isPublished: false }],
    handlers: { "post /newsletter/admin/templates/18/variants/": async (payload) => ({ data: { ...variant, id: "30", ...payload } }) },
  });
  const view = await renderTemplatePages("/admin/newsletter/templates/18");
  await click(await waitFor(() => getByRole("button", "Add Variant")));
  const dialog = await waitFor(() => getByRole("dialog"));
  await typeInto(getByRole("spinbutton", "Share of sends (%)", { scope: dialog }), "30");
  await click(getByRole("button", "Create Variant", { scope: dialog }));
  await waitFor(() => assert.equal(view.path(), "/admin/newsletter/templates/30"));
  assert.equal(JSON.stringify(api.writes("post", "/newsletter/admin/templates/18/variants/")[0].payload),
    JSON.stringify({ weight: 30, winnerCriteria: "email.openrate", name: "Reusable Newsletter (Variant)" }));
  await waitFor(() => assert.equal(hasText(/Variant created \(unpublished\)/), true));
});

test("a variant page explains where it belongs and can win; the winner opens the main template", async () => {
  const api = installTemplatesApi({
    templates: [main(), variant],
    handlers: {
      "get /newsletter/admin/templates/19/abtest/": async () => ({ data: abTest() }),
      "get /newsletter/admin/templates/18/abtest/": async () => ({ data: abTest({ running: false }) }),
      "post /newsletter/admin/templates/19/winner/": async () => ({ data: { template: main({ subject: "B subject" }), winnerId: "19" } }),
    },
  });
  const view = await renderTemplatePages("/admin/newsletter/templates/19");
  await waitFor(() => assert.equal(hasText(/This is an A\/B variant of/), true));
  assert.equal(hasText("A/B variant"), true);
  assert.equal(queryByRole("button", "Add Variant") === null, true);
  await click(await waitFor(() => getByRole("button", "Make Reusable Newsletter B the winner")));
  const dialog = await waitFor(() => getByRole("dialog"));
  assert.equal(hasText(/which keeps its ID, so Campaigns sending it carry on unchanged/), true);
  await click(getByRole("button", "Make Winner", { scope: dialog }));
  await waitFor(() => assert.equal(view.path(), "/admin/newsletter/templates/18"));
  assert.equal(api.writes("post", "/newsletter/admin/templates/19/winner/").length, 1);
  await waitFor(() => assert.equal(hasText(/won\. Its content is now the main template's\./), true));
});

test("changing a variant's share and the test's criteria", async () => {
  const api = installTemplatesApi({
    templates: [main(), variant],
    handlers: {
      "get /newsletter/admin/templates/18/abtest/": async () => ({ data: abTest() }),
      "patch /newsletter/admin/templates/19/abtest/": async () => ({ data: abTest() }),
      "patch /newsletter/admin/templates/18/abtest/": async (payload) => ({ data: abTest({ criteria: payload.winnerCriteria, criteriaLabel: "Click-through rate" }) }),
    },
  });
  await renderTemplatePages("/admin/newsletter/templates/18");
  await click(await waitFor(() => getByRole("button", "Change share of Reusable Newsletter B")));
  let dialog = await waitFor(() => getByRole("dialog"));
  await typeInto(getByRole("spinbutton", "Share of sends (%)", { scope: dialog }), "200");
  await click(getByRole("button", "Save", { scope: dialog }));
  await waitFor(() => assert.equal(hasText("Weight must be a whole number from 1 to 100."), true));
  await typeInto(getByRole("spinbutton", "Share of sends (%)", { scope: dialog }), "40");
  await click(getByRole("button", "Save", { scope: dialog }));
  await waitFor(() => assert.equal(api.writes("patch", "/newsletter/admin/templates/19/abtest/").length, 1));
  assert.equal(JSON.stringify(api.writes("patch", "/newsletter/admin/templates/19/abtest/")[0].payload), JSON.stringify({ weight: 40 }));
  await waitFor(() => assert.equal(queryByRole("dialog") === null, true));
  await waitFor(() => assert.equal(hasText(/Share saved/), true));
});

test("adding a translation validates the language and refusals are shown", async () => {
  installTemplatesApi({
    templates: [main()],
    handlers: {
      "get /newsletter/admin/templates/18/abtest/": async () => ({ data: abTest() }),
      "post /newsletter/admin/templates/18/translations/": async () => {
        throw Object.assign(new Error("conflict"), { response: { status: 409, data: { detail: "The main template is already in en. Add a translation in another language." } } });
      },
    },
  });
  await renderTemplatePages("/admin/newsletter/templates/18");
  await click(await waitFor(() => getByRole("button", "Add Translation")));
  const dialog = await waitFor(() => getByRole("dialog"));
  await typeInto(getByRole("textbox", "Language", { scope: dialog }), "fil_PH");
  await click(getByRole("button", "Create Translation", { scope: dialog }));
  await waitFor(() => assert.equal(hasText("Use a locale code such as fr, de or pt_BR."), true));
  await typeInto(getByRole("textbox", "Language", { scope: dialog }), "en_GB");
  await click(getByRole("button", "Create Translation", { scope: dialog }));
  await waitFor(() => assert.equal(hasText("The main template is already in en. Add a translation in another language."), true));
});

test("a translation page has no A/B or translations section of its own", async () => {
  installTemplatesApi({ templates: [makeTemplate({ id: "21", role: "translation", language: "fr", translationParentId: "18", variants: [], translations: [] })] });
  await renderTemplatePages("/admin/newsletter/templates/21");
  await waitFor(() => assert.equal(hasText(/This is the fr translation of/), true));
  assert.equal(queryByRole("region", "A/B Test") === null, true);
  assert.equal(queryByRole("region", "Translations") === null, true);
});

test("family helpers", () => {
  assert.equal(family.suggestedWeight([{ isMain: true, weight: 70 }, { isMain: false, weight: 30 }]), 50);
  assert.equal(family.suggestedWeight([{ isMain: false, weight: 80 }]), 20);
  assert.equal(family.validateWeight("0"), "Weight must be a whole number from 1 to 100.");
  assert.equal(family.validateWeight("45"), "");
  assert.equal(family.validateLanguage("pt_BR"), "");
  assert.equal(family.validateLanguage("fil_PH") !== "", true);
  assert.equal(family.roleLabel({ role: "translation", language: "de" }), "Translation (de)");
});
