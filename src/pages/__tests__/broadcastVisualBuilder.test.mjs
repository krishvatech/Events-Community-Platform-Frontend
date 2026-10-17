import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

import {
  React,
  act,
  cleanup,
  click,
  getByRole,
  loadSource,
  queryByRole,
  queryByText,
  renderRoutes,
  router,
  waitFor,
} from "./helpers/blogDomHarness.mjs";

const { default: AdminNewsletterPage } = await loadSource("src/pages/AdminNewsletterPage.jsx");
const { Route } = router;
const h = React.createElement;

// Assertions compare strings/booleans only (jsdom nodes in a failing assert
// exhaust memory).

const STYLES = { padding: { top: 0, right: 0, bottom: 0, left: 0 }, margin: { top: 0, right: 0, bottom: 0, left: 0 } };
const contentWith = (text) => ({
  blocks: [{ id: `p-${text}`, type: "paragraph", content: `<p>${text}</p>`, styles: STYLES }],
  settings: { width: 600, backgroundColor: "#ffffff", fontFamily: "Arial", locale: "en" },
});
const envelope = (text) => ({ editor: "templatical", version: 1, content: contentWith(text) });

const UUID = "55555555-5555-4555-8555-555555555555";
const VISUAL_DRAFT = {
  uuid: UUID,
  name: "Visual Broadcast",
  subject: "Deals",
  preview_text: "",
  from_name: "IMAA Connect",
  from_email: "newsletter@example.test",
  html_content: "<html>compiled from design</html>",
  plain_text: "Deals",
  status: "draft",
  audiences: [{ slug: "imaa-events", name: "IMAA Events" }],
  scheduled_at: null,
  schedule_owner: "",
  send_started_at: null,
  sent_at: null,
  mautic_email_id: "",
  last_synced_to_mautic_at: null,
  last_error: "",
  visual_design: { status: "in_sync", design: envelope("Saved broadcast design"), html_fingerprint: "c".repeat(64), updated_at: null },
  created_at: "2026-10-17T10:00:00Z",
  updated_at: "2026-10-17T10:00:00Z",
};

const TEMPLATE = {
  id: "18",
  name: "Visual Template",
  subject: "Template subject",
  preheaderText: "",
  plainText: "Template text",
  customHtml: "<html>template html</html>",
  emailType: "template",
  visualDesign: { status: "in_sync", design: envelope("Template design"), htmlFingerprint: "d".repeat(64), updatedAt: null },
};

let calls;

function installApi({ campaign = VISUAL_DRAFT } = {}) {
  calls = [];
  globalThis.__testApiClient = {
    get: async (url, config) => {
      calls.push({ method: "get", url, params: config?.params });
      if (url === "/newsletter/admin/categories/") return { data: [{ slug: "imaa-events", name: "IMAA Events", is_active: true }] };
      if (url === "/newsletter/admin/templates/tokens/") return { data: { results: [] } };
      if (url === "/newsletter/admin/templates/") return { data: { count: 1, results: [TEMPLATE] } };
      if (url === `/newsletter/admin/templates/${TEMPLATE.id}/`) return { data: TEMPLATE };
      if (url.endsWith("/analytics/")) return { data: {} };
      if (url === `/newsletter/admin/campaigns/${campaign.uuid}/`) return { data: campaign };
      return { data: {} };
    },
    patch: async (url, payload) => {
      calls.push({ method: "patch", url, payload });
      return {
        data: {
          ...campaign,
          ...payload,
          html_content: payload.design ? "<html>recompiled</html>" : payload.html_content,
          visual_design: payload.design
            ? { status: "in_sync", design: payload.design, html_fingerprint: "e".repeat(64), updated_at: null }
            : campaign.visual_design,
        },
      };
    },
    post: async (url, payload) => {
      calls.push({ method: "post", url, payload });
      if (url.endsWith("/sync/")) return { data: { ...campaign, mautic_email_id: "77" } };
      throw new Error(`unexpected POST ${url}`);
    },
  };
}

const visualEditor = () => document.querySelector("textarea[aria-label='Visual design (test double)']");
const hasText = (matcher) => queryByText(matcher) !== null;
const patches = () => calls.filter((call) => call.method === "patch");

async function openBroadcast(uuid = UUID) {
  await renderRoutes(h(Route, { path: "/admin/newsletter/:campaignId", element: h(AdminNewsletterPage) }), {
    url: `/admin/newsletter/${uuid}`,
  });
  await waitFor(() => getByRole("tab", "Content"));
}

async function goToContent() {
  await click(getByRole("tab", "Content"));
}

beforeEach(() => installApi());
afterEach(async () => {
  await cleanup();
  delete globalThis.__testApiClient;
  delete globalThis.__fakeVisualEditor;
});

test("a broadcast with an in-sync design reopens it in Visual Builder", async () => {
  await openBroadcast();
  await goToContent();
  await waitFor(() => assert.match(visualEditor()?.value || "", /Saved broadcast design/));
  assert.equal(queryByRole("textbox", "HTML Content") === null, true);
  assert.equal(globalThis.__fakeVisualEditor.designKey, `broadcast:${UUID}:0`);
});

test("design edits are unsaved changes, and Save Draft sends the design for the server to compile", async () => {
  await openBroadcast();
  await goToContent();
  await waitFor(() => assert.equal(Boolean(visualEditor()), true));
  const sendNow = () => getByRole("button", "Send Now");
  assert.equal(sendNow().disabled, false);

  await act(async () => globalThis.__fakeVisualEditor.edit(contentWith("Edited {contactfield=firstname}")));
  await waitFor(() => assert.equal(sendNow().disabled, true));

  await click(getByRole("button", "Save Draft"));
  await waitFor(() => assert.equal(patches().length, 1));
  const { payload } = patches()[0];
  assert.deepEqual(payload.design, { editor: "templatical", version: 1, content: contentWith("Edited {contactfield=firstname}") });
  assert.match(payload.mjml, /Edited \{contactfield=firstname\}/);
  await waitFor(() => assert.equal(sendNow().disabled, false));
});

test("moving between steps keeps unsaved design edits", async () => {
  await openBroadcast();
  await goToContent();
  await waitFor(() => assert.equal(Boolean(visualEditor()), true));
  await act(async () => globalThis.__fakeVisualEditor.edit(contentWith("Work in progress")));

  await click(getByRole("tab", "Info"));
  await click(getByRole("tab", "Content"));
  assert.match(visualEditor().value, /Work in progress/);
});

test("a broadcast whose Content step was never opened saves without touching its design", async () => {
  await openBroadcast();
  await click(getByRole("button", "Save Draft"));
  await waitFor(() => assert.equal(patches().length, 1));
  assert.equal("design" in patches()[0].payload, false);
  assert.equal(patches()[0].payload.html_content, VISUAL_DRAFT.html_content);
});

test("Start from Template copies the Template's design as an independent draft design", async () => {
  installApi({ campaign: { ...VISUAL_DRAFT, html_content: "<p>Legacy</p>", visual_design: { status: "none", design: null, html_fingerprint: "f".repeat(64), updated_at: null } } });
  await openBroadcast();
  await goToContent();
  await waitFor(() => getByRole("textbox", "HTML Content"));

  await click(getByRole("button", "Start from Template"));
  await waitFor(() => getByRole("button", /Visual Template/));
  await click(getByRole("button", /Visual Template/));
  await waitFor(() => getByRole("button", "Copy into Draft"));
  assert.equal(hasText(/including its visual design/), true);
  await click(getByRole("button", "Copy into Draft"));

  await waitFor(() => assert.match(visualEditor()?.value || "", /Template design/));
  assert.equal(hasText(/with its visual design/), true);
  await click(getByRole("button", "Save Draft"));
  await waitFor(() => assert.equal(patches().length, 1));
  assert.deepEqual(patches()[0].payload.design.content, contentWith("Template design"));
  // Only reads went to the Template.
  assert.equal(calls.some((call) => call.method !== "get" && call.url.includes("/templates/")), false);
});

test("non-draft broadcasts show their HTML read-only, with no Visual Builder", async () => {
  installApi({ campaign: { ...VISUAL_DRAFT, status: "sent", sent_at: "2026-10-17T11:00:00Z" } });
  await openBroadcast();
  await goToContent();
  await waitFor(() => getByRole("textbox", "HTML Content"));
  assert.equal(getByRole("textbox", "HTML Content").readOnly, true);
  assert.equal(queryByRole("button", "Visual Builder") === null, true);
  assert.equal(visualEditor() === null, true);
});

test("the visual editor waits for the Mautic token list so chips keep their labels", async () => {
  let releaseTokens;
  const tokensPending = new Promise((resolve) => {
    releaseTokens = resolve;
  });
  installApi();
  const base = globalThis.__testApiClient.get;
  globalThis.__testApiClient.get = async (url, config) => {
    if (url === "/newsletter/admin/templates/tokens/") {
      await tokensPending;
      return { data: { results: [{ token: "{contactfield=firstname}", label: "First Name", group: "Contact Fields" }] } };
    }
    return base(url, config);
  };
  await openBroadcast();
  await goToContent();
  await waitFor(() => assert.equal(queryByRole("progressbar", "Loading Mautic tokens") !== null || Boolean(document.querySelector("[aria-label='Loading Mautic tokens']")), true));
  assert.equal(visualEditor() === null, true);

  await act(async () => releaseTokens());
  await waitFor(() => assert.match(visualEditor()?.value || "", /Saved broadcast design/));
});
