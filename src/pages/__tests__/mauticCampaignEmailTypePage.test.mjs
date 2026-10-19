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
  queryByText,
  renderRoutes,
  router,
  typeInto,
  waitFor,
} from "./helpers/blogDomHarness.mjs";

const { default: BuilderPage } = await loadSource("src/pages/AdminNewsletterMauticCampaignBuilderPage.jsx");
const { Route } = router;
const h = React.createElement;

// Assertions only ever compare strings/numbers/booleans: a failing assert on
// a live jsdom node makes Node print the whole DOM graph.

// email.send as Mautic 7.1.3's capability endpoint reports it.
const EMAIL_SEND = {
  key: "email.send",
  type: "email.send",
  eventType: "action",
  label: "Send email",
  formSchema: {
    available: true,
    fields: [
      {
        name: "email",
        label: "Email to send",
        required: true,
        renderable: true,
        blockPrefixes: ["form", "choice"],
        choices: [{ label: "Welcome (23)", value: "23" }],
      },
      {
        name: "email_type",
        label: "Email type",
        required: false,
        renderable: true,
        data: "marketing",
        blockPrefixes: ["form", "choice", "button_group"],
        choices: [
          { label: "Transactional", value: "transactional" },
          { label: "Marketing", value: "marketing" },
        ],
      },
    ],
  },
};

const CAPABILITIES = {
  actions: [EMAIL_SEND],
  conditions: [],
  decisions: [],
  sources: { segments: [{ id: "7", name: "Seg A" }], forms: [] },
};

const legacyCampaign = (properties = { email: "23" }) => ({
  id: "54",
  name: "Lead nurture",
  description: "",
  isPublished: false,
  sources: { segments: [{ id: "7", name: "Seg A" }], forms: [] },
  events: [
    {
      id: "72",
      key: "email.send",
      eventType: "action",
      properties,
      metadata: { id: "72", name: "Welcome", type: "email.send", eventType: "action", parent: null, decisionPath: null, triggerMode: "immediate", triggerInterval: 0 },
    },
  ],
  canvasSettings: { nodes: [], connections: [] },
});

let requests;
function installApi({ builder = legacyCampaign() } = {}) {
  requests = [];
  globalThis.__testApiClient = {
    get: async (url) => {
      requests.push(["GET", url]);
      if (url.endsWith("/capabilities/")) return { data: CAPABILITIES };
      if (url.endsWith("/builder/")) return { data: builder };
      return { data: {} };
    },
    patch: async (url, payload) => {
      requests.push(["PATCH", url, payload]);
      return { data: { id: builder.id } };
    },
    post: async (url, payload) => {
      requests.push(["POST", url, payload]);
      return { data: { id: "99" } };
    },
    delete: async (url) => {
      throw new Error(`unexpected DELETE ${url}`);
    },
  };
}

const button = (label) => all("button").find((b) => b.textContent.trim() === label);
const sent = (method) => requests.filter(([m]) => m === method);
const testId = (id) => document.querySelector(`[data-testid='${id}']`) !== null;

async function renderEdit(builder) {
  await renderRoutes(
    [h(Route, { key: "b", path: "/admin/newsletter/builder/:campaignId", element: h(BuilderPage) })],
    { url: `/admin/newsletter/builder/${builder.id}` }
  );
  await waitFor(() => assert.equal(all("input").some((input) => input.value === builder.name), true), { timeout: 8000 });
  await click(getByRole("tab", "Workflow Events"));
  await click(await waitFor(() => {
    const configure = button("Configure");
    if (!configure) throw new Error("no Configure button");
    return configure;
  }));
}

afterEach(async () => {
  await cleanup();
  delete globalThis.__testApiClient;
});

test("a saved Send email step without a type is flagged and saved unchanged", async () => {
  installApi();
  await renderEdit(legacyCampaign());

  await waitFor(() => assert.equal(testId("email-type-legacy"), true));
  await click(button("Update Campaign"));

  await waitFor(() => assert.equal(sent("PATCH").length, 1));
  const event = sent("PATCH")[0][2].events[0];
  assert.equal(event.id, "72");
  assert.equal(JSON.stringify(event.properties), JSON.stringify({ email: "23" }));
  assert.equal("transactionalEmailConfirmed" in event, false);
});

test("choosing Transactional is blocked until it is confirmed, then the confirmation is sent", async () => {
  installApi();
  await renderEdit(legacyCampaign());

  await chooseSelectOption(getByRole("combobox", "Email type"), "Transactional");
  await waitFor(() => assert.equal(testId("email-type-transactional"), true));
  await click(button("Update Campaign"));
  await waitFor(() => assert.equal(queryByText(/confirm the Transactional email type/) !== null, true));
  assert.equal(sent("PATCH").length, 0);

  assert.equal(queryByText("I confirm this step sends a transactional email") !== null, true);
  await click(document.querySelector("[data-testid='email-type-transactional'] input[type='checkbox']"));
  await click(button("Update Campaign"));

  await waitFor(() => assert.equal(sent("PATCH").length, 1));
  const event = sent("PATCH")[0][2].events[0];
  assert.equal(event.properties.email_type, "transactional");
  assert.equal(event.transactionalEmailConfirmed, true);
});

test("a stored transactional step saves without asking again", async () => {
  installApi({ builder: legacyCampaign({ email: "23", email_type: "transactional" }) });
  await renderEdit(legacyCampaign({ email: "23", email_type: "transactional" }));

  await waitFor(() => assert.equal(testId("email-type-transactional"), true));
  assert.equal(queryByText("I confirm this step sends a transactional email") === null, true);
  await click(button("Update Campaign"));

  await waitFor(() => assert.equal(sent("PATCH").length, 1));
  const event = sent("PATCH")[0][2].events[0];
  assert.equal(event.properties.email_type, "transactional");
  assert.equal("transactionalEmailConfirmed" in event, false);
});

test("a new Send email step is created as Marketing", async () => {
  installApi();
  await renderRoutes([h(Route, { key: "n", path: "/admin/newsletter/builder", element: h(BuilderPage) })], {
    url: "/admin/newsletter/builder",
  });
  await waitFor(() => assert.equal(Boolean(button("Create Campaign")), true));

  await typeInto(getByRole("textbox", "Campaign Name"), "Fresh");
  await chooseSelectOption(getByRole("combobox", "Segments"), "Seg A");
  await act(async () => {
    all("[role='listbox']")[0].dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  });
  await waitFor(() => assert.equal(all("[role='listbox']").length, 0));
  await click(getByRole("tab", "Workflow Events"));
  await chooseSelectOption(getByRole("combobox", "Event"), /^Send email/);
  await click(button("Add Event"));
  await waitFor(() => assert.equal(testId("email-type-marketing"), true));
  await chooseSelectOption(getByRole("combobox", "Email to send *"), "Welcome (23)");
  await click(button("Create Campaign"));

  await waitFor(() => assert.equal(sent("POST").length, 1));
  const event = sent("POST")[0][2].events[0];
  assert.equal(event.key, "email.send");
  assert.equal(JSON.stringify(event.properties), JSON.stringify({ email_type: "marketing", email: "23" }));
});

const publishedLegacy = () => ({ ...legacyCampaign(), isPublished: true });
const buttonDisabled = (label) => Boolean(button(label)?.disabled);

test("a published campaign with an untyped step: Update is blocked, Unpublish works and sends only the state", async () => {
  installApi({ builder: publishedLegacy() });
  await renderEdit(publishedLegacy());

  await waitFor(() => assert.equal(testId("email-type-publish-blocker"), true));
  assert.equal(buttonDisabled("Update Campaign"), true);
  assert.equal(buttonDisabled("Unpublish"), false);

  await click(button("Unpublish"));
  await waitFor(() => assert.equal(sent("PATCH").length, 1));
  assert.equal(JSON.stringify(sent("PATCH")[0][2]), JSON.stringify({ isPublished: false }));
});

test("choosing Marketing on the untyped step of a published campaign unblocks Update", async () => {
  installApi({ builder: publishedLegacy() });
  await renderEdit(publishedLegacy());

  await chooseSelectOption(getByRole("combobox", "Email type"), "Marketing");
  await waitFor(() => assert.equal(testId("email-type-publish-blocker"), false));
  assert.equal(buttonDisabled("Update Campaign"), false);
  await click(button("Update Campaign"));

  await waitFor(() => assert.equal(sent("PATCH").length, 1));
  const payload = sent("PATCH")[0][2];
  assert.equal(payload.isPublished, true);
  assert.equal(payload.events[0].id, "72");
  assert.equal(payload.events[0].properties.email_type, "marketing");
});

test("a draft with an untyped step saves, but Publish is disabled", async () => {
  installApi();
  await renderEdit(legacyCampaign());

  await waitFor(() => assert.equal(testId("email-type-publish-blocker"), true));
  assert.equal(buttonDisabled("Publish"), true);
  assert.equal(buttonDisabled("Update Campaign"), false);
});
