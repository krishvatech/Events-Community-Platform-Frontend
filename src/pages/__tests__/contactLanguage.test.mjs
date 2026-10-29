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

// Assertions compare strings/booleans only (see contactImport.test.mjs).

const { default: AdminNewsletterContactDetailPage } = await loadSource("src/pages/AdminNewsletterContactDetailPage.jsx");
const panel = await loadSource("src/components/marketing/ContactLanguagePanel.jsx");
const { Route } = router;
const h = React.createElement;

const CONTACT = "/newsletter/admin/contacts/3/";
let requests;
let locale;

function installApi() {
  requests = [];
  locale = "fr_FR";
  const contact = () => ({
    mautic_contact_id: "3", name: "Ada Lovelace", email: "ada@example.test", owner: null, subscription_lists: [], tags: [], dnc: [],
    contact_info: { first_name: "Ada", last_name: "Lovelace", email: "ada@example.test", preferred_locale: locale },
  });
  globalThis.__testApiClient = {
    get: async (url, config = {}) => {
      requests.push({ method: "get", url, params: config.params });
      if (url === CONTACT) return { data: contact() };
      if (url === "/newsletter/admin/fields/choices/locale/") {
        return { data: { results: [{ value: "fr_FR", label: "French (France)" }, { value: "de_DE", label: "German (Germany)" }] } };
      }
      if (url === "/newsletter/admin/contacts/3/campaigns/") return { data: { count: 0, results: [] } };
      return { data: {} };
    },
    post: async () => ({ data: {} }),
    patch: async (url, payload) => {
      requests.push({ method: "patch", url, payload });
      if (url === CONTACT && "preferred_locale" in payload) locale = payload.preferred_locale;
      return { data: contact() };
    },
  };
}

const hasText = (matcher) => queryByText(matcher) !== null;
const patches = () => requests.filter((r) => r.method === "patch" && r.url === CONTACT);

beforeEach(installApi);

afterEach(async () => {
  await cleanup();
  delete globalThis.__testApiClient;
});

async function openDetail() {
  await renderRoutes(
    [h(Route, { key: "detail", path: "/admin/newsletter/contacts/:mauticContactId", element: h(AdminNewsletterContactDetailPage) })],
    { url: "/admin/newsletter/contacts/3" }
  );
  await waitFor(() => assert.equal(hasText(/Translated templates go out in French \(France\)/), true));
}

test("the contact's preferred locale says which translation they get, and can be changed", async () => {
  await openDetail();
  assert.equal(getByRole("button", "Save Language").disabled, true);
  const box = getByRole("combobox", "Preferred locale");
  await typeInto(box, "German");
  await click(await waitFor(() => getByRole("option", "German (Germany) (de_DE)")));
  await click(getByRole("button", "Save Language"));
  await waitFor(() => assert.equal(hasText("Preferred locale saved in Mautic."), true));
  assert.equal(JSON.stringify(patches()[0].payload), JSON.stringify({ preferred_locale: "de_DE" }));
  await waitFor(() => assert.equal(hasText(/Translated templates go out in German \(Germany\)/), true));
});

test("clearing the locale sends a blank and explains the main version is used", async () => {
  await openDetail();
  await click(getByRole("button", "Clear"));
  await click(getByRole("button", "Save Language"));
  await waitFor(() => assert.equal(hasText("Preferred locale cleared in Mautic."), true));
  assert.equal(JSON.stringify(patches()[0].payload), JSON.stringify({ preferred_locale: "" }));
  await waitFor(() => assert.equal(hasText("No preferred locale: this contact always gets a template's main version."), true));
  assert.equal(queryByRole("alert") !== null, true);
});

test("describeLocale", () => {
  assert.equal(panel.describeLocale("pt_BR", "Portuguese (Brazil)"),
    "Translated templates go out in Portuguese (Brazil): an exact pt_BR version first, otherwise any pt version, otherwise the main template.");
});
