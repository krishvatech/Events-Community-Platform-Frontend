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

const { default: AdminNewsletterPage } = await loadSource("src/pages/AdminNewsletterPage.jsx");
const { default: VersionEditorPage } = await loadSource("src/pages/AdminNewsletterBroadcastVersionEditorPage.jsx");
const { Route } = router;
const h = React.createElement;

const UUID = "33333333-3333-4333-8333-333333333333";
const C = `/newsletter/admin/campaigns/${UUID}/`;
const broadcast = (overrides = {}) => ({
  uuid: UUID, name: "Summit Newsletter", subject: "Summit A", preview_text: "", from_name: "IMAA", from_email: "news@example.test",
  html_content: "<p>Hello</p>", plain_text: "", status: "draft", audiences: [{ slug: "imaa-events", name: "IMAA Events" }],
  scheduled_at: null, schedule_owner: "", send_started_at: null, sent_at: null, mautic_email_id: "80", last_synced_to_mautic_at: null,
  last_error: "", created_at: "2026-10-29T09:00:00Z", updated_at: "2026-10-29T09:00:00Z", ...overrides,
});
const family = (overrides = {}) => ({
  editable: true, mauticEmailId: "80", language: "en",
  variants: [{ id: "81", name: "Summit Newsletter (Variant)", language: "en", isPublished: true }],
  translations: [{ id: "82", name: "Summit Newsletter (FR)", language: "fr", isPublished: true }],
  abTest: {
    parentId: "80", criteria: "email.openrate", criteriaLabel: "Open rate", running: true, versions: [
      { id: "80", name: "Summit Newsletter", subject: "Summit A", isMain: true, isPublished: true, weight: 50, sent: 0, opened: 0, clicked: 0, openRate: 0, clickRate: 0, isLeading: false },
      { id: "81", name: "Summit Newsletter (Variant)", subject: "Summit B", isMain: false, isPublished: true, weight: 50, sent: 0, opened: 0, clicked: 0, openRate: 0, clickRate: 0, isLeading: false },
    ],
  },
  ...overrides,
});

let calls;
let state;

function installApi() {
  calls = [];
  state = { broadcast: broadcast(), family: family(), version: null };
  const respond = async (method, url, payload) => {
    calls.push({ method, url, payload });
    if (method === "get") {
      if (url === C) return { data: state.broadcast };
      if (url === `${C}family/`) return { data: state.family };
      if (url === "/newsletter/admin/categories/") return { data: [{ slug: "imaa-events", name: "IMAA Events", is_active: true }] };
      if (url === `${C}versions/81/`) {
        return { data: { id: "81", name: "Summit Newsletter (Variant)", subject: "Summit B", preheaderText: "", plainText: "", customHtml: "<p>B</p>",
          language: "en", role: "variant", visualDesign: { status: "none" }, editable: state.family.editable, broadcast: { uuid: UUID, name: "Summit Newsletter" } } };
      }
      return { data: {} };
    }
    if (method === "post" && url === `${C}variants/`) return { data: { id: "83", role: "variant", name: "Summit Newsletter (Variant)" } };
    if (method === "post" && url === `${C}translations/`) {
      if (payload.language === "en_GB") {
        throw Object.assign(new Error("conflict"), { response: { status: 409, data: { detail: "The main broadcast is already in en. Add a translation in another language." } } });
      }
      return { data: { id: "84", role: "translation", language: payload.language } };
    }
    if (method === "patch" && url === `${C}abtest/`) return { data: family() };
    if (method === "patch" && url === `${C}versions/81/`) return { data: { id: "81", name: payload.name, subject: payload.subject, role: "variant", editable: true } };
    if (method === "delete") return { data: null, status: 204 };
    return { data: {} };
  };
  globalThis.__testApiClient = {
    get: (url) => respond("get", url),
    post: (url, payload) => respond("post", url, payload),
    patch: (url, payload) => respond("patch", url, payload),
    delete: (url) => respond("delete", url),
  };
}

const hasText = (matcher) => queryByText(matcher) !== null;
const writes = (method, url) => calls.filter((c) => c.method === method && c.url === url);

async function openBroadcast() {
  const view = await renderRoutes(
    [
      h(Route, { key: "detail", path: "/admin/newsletter/:campaignId", element: h(AdminNewsletterPage) }),
      h(Route, { key: "version", path: "/admin/newsletter/:campaignId/versions/:emailId", element: h(VersionEditorPage) }),
    ],
    { url: `/admin/newsletter/${UUID}` }
  );
  await waitFor(() => assert.equal(hasText("A/B Test & Translations"), true));
  return view;
}

beforeEach(installApi);

afterEach(async () => {
  await cleanup();
  delete globalThis.__testApiClient;
});

test("a draft shows its variants and translations and explains how they combine", async () => {
  await openBroadcast();
  await waitFor(() => assert.equal(hasText("A/B test · winner judged by Open rate"), true));
  assert.equal(hasText("Summit B"), true);
  assert.equal(hasText("Translations · this broadcast is en"), true);
  assert.equal(getByRole("link", "Summit Newsletter (FR)").getAttribute("href"), `/admin/newsletter/${UUID}/versions/82`);
  assert.equal(hasText(/translations only replace the main version/), true);
});

test("adding a variant creates it and opens it in the version editor", async () => {
  const view = await openBroadcast();
  await click(await waitFor(() => getByRole("button", "Add Variant")));
  const dialog = await waitFor(() => getByRole("dialog"));
  await click(getByRole("button", "Create Variant", { scope: dialog }));
  await waitFor(() => assert.equal(view.path(), `/admin/newsletter/${UUID}/versions/83`));
  assert.equal(JSON.stringify(writes("post", `${C}variants/`)[0].payload), JSON.stringify({ weight: 50, winnerCriteria: "email.openrate" }));
});

test("a refused translation keeps the dialog open with the reason", async () => {
  await openBroadcast();
  await click(await waitFor(() => getByRole("button", "Add Translation")));
  const dialog = await waitFor(() => getByRole("dialog"));
  await typeInto(getByRole("textbox", "Language", { scope: dialog }), "en_GB");
  await click(getByRole("button", "Create Translation", { scope: dialog }));
  await waitFor(() => assert.equal(hasText("The main broadcast is already in en. Add a translation in another language."), true));
});

test("changing a share and removing a version", async () => {
  await openBroadcast();
  await click(await waitFor(() => getByRole("button", "Change share of Summit Newsletter (Variant)")));
  let dialog = await waitFor(() => getByRole("dialog"));
  await typeInto(getByRole("spinbutton", "Share of the audience (%)", { scope: dialog }), "30");
  await click(getByRole("button", "Save", { scope: dialog }));
  await waitFor(() => assert.equal(writes("patch", `${C}abtest/`).length, 1));
  assert.equal(JSON.stringify(writes("patch", `${C}abtest/`)[0].payload), JSON.stringify({ emailId: "81", weight: 30 }));
  await waitFor(() => assert.equal(hasText("Share saved."), true));
  await waitFor(() => assert.equal(queryByRole("dialog") === null, true));
  await click(getByRole("button", "Remove Summit Newsletter (FR)"));
  await waitFor(() => assert.equal(hasText(/Remove "Summit Newsletter \(FR\)" from this broadcast\?/), true));
  dialog = getByRole("dialog");
  await click(getByRole("button", "Remove", { scope: dialog }));
  await waitFor(() => assert.equal(writes("delete", `${C}versions/82/`).length, 1));
});

test("a sent broadcast shows results read-only", async () => {
  state.broadcast = broadcast({ status: "sent" });
  state.family = family({ editable: false, abTest: { ...family().abTest, versions: family().abTest.versions.map((v, i) => ({ ...v, sent: 2, opened: i, openRate: i * 50, isLeading: i === 1 })) } });
  await openBroadcast();
  await waitFor(() => assert.equal(hasText("Leading"), true));
  assert.equal(hasText("1 (50%)"), true);
  assert.equal(hasText("Versions are fixed once the broadcast is scheduled or sent."), true);
  assert.equal(queryByRole("button", "Add Variant") === null, true);
  assert.equal(queryByRole("button", "Remove Summit Newsletter (FR)") === null, true);
});

test("unsaved broadcast changes block adding versions", async () => {
  await openBroadcast();
  await typeInto(await waitFor(() => getByRole("textbox", "Broadcast Name")), "Renamed");
  await waitFor(() => assert.equal(hasText(/Save the draft first: variants and translations start as a copy/), true));
  assert.equal(getByRole("button", "Add Variant").disabled, true);
});

test("the version editor saves subject and content", async () => {
  const view = await renderRoutes(
    [
      h(Route, { key: "detail", path: "/admin/newsletter/:campaignId", element: h(AdminNewsletterPage) }),
      h(Route, { key: "version", path: "/admin/newsletter/:campaignId/versions/:emailId", element: h(VersionEditorPage) }),
    ],
    { url: `/admin/newsletter/${UUID}/versions/81` }
  );
  await waitFor(() => assert.equal(hasText(/A\/B variant — Summit Newsletter \(Variant\)/), true));
  await typeInto(getByRole("textbox", "Subject"), "Summit B2");
  await click(getByRole("button", "Save Version"));
  await waitFor(() => assert.equal(view.path(), `/admin/newsletter/${UUID}`));
  const payload = writes("patch", `${C}versions/81/`)[0].payload;
  assert.equal(payload.subject, "Summit B2");
  assert.equal(payload.name, "Summit Newsletter (Variant)");
});
