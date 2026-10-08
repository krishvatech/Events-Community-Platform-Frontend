// Mautic's tag pickers ("Modify contact's tags" and the "Contact tags"
// condition) store tag NAMES: the provider form renders tag IDs, and its model
// transformer turns them into names on submit. The capabilities plugin now
// offers that stored name as each choice's value (the ID stays in `data`), so
// the builder must carry names end to end and never turn them back into IDs.
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

const { findChoiceByEntityId, validateWorkflowEvent } = await loadSource("src/legacy-pages/mauticCampaignValidation.js");
const { getEventPropertyFields, withSavedChoices } = await loadSource("src/legacy-pages/mauticCampaignFields.js");
const graph = await loadSource("src/legacy-pages/mauticCampaignGraph.js");
const { buildEventsPayload } = await loadSource("src/legacy-pages/mauticCampaignSavePayload.js");
const { default: BuilderPage } = await loadSource("src/legacy-pages/AdminNewsletterMauticCampaignBuilderPage.jsx");
const { Route } = router;
const h = React.createElement;

// Assertions only ever compare strings/numbers/booleans: a failing assert on
// a live jsdom node makes Node print the whole DOM graph.

// The shape the plugin returns for these fields (trimmed from a live response).
// "24" is a tag literally named 24 (id 31) — a leftover of the old ID-valued
// saves — so a name that looks numeric must still be treated as a name.
const TAGS = [
  { id: 4, name: "VIP" },
  { id: 13, name: "Customer" },
  { id: 12, name: "Old" },
  { id: 31, name: "24" },
];
const tagField = (name, label) => ({
  name,
  fullName: `modify_lead_tags[${name}][]`,
  type: "Mautic\\LeadBundle\\Form\\Type\\TagType",
  blockPrefixes: ["form", "choice", "entity", "lead_tag", `_modify_lead_tags_${name}`],
  label,
  required: false,
  multiple: true,
  mapped: true,
  renderable: true,
  controlType: "field",
  choiceKind: "entity",
  choiceMode: "inline",
  choiceCount: TAGS.length,
  choices: TAGS.map((tag) => ({ label: tag.name, value: tag.name, data: { id: tag.id } })),
});
const MODIFY_TAGS = {
  key: "lead.changetags",
  type: "lead.changetags",
  eventType: "action",
  label: "Modify contact's tags",
  formSchema: { available: true, fields: [tagField("add_tags", "Add tags"), tagField("remove_tags", "Remove tags")] },
};
const HAS_TAGS = {
  key: "lead.tags",
  type: "lead.tags",
  eventType: "condition",
  label: "Contact tags",
  formSchema: { available: true, fields: [{ ...tagField("tags", "Tags"), blockPrefixes: ["form", "choice", "entity", "lead_tag", "_campaignevent_lead_tags_tags"] }] },
};
const CAPABILITIES = {
  actions: [MODIFY_TAGS],
  conditions: [HAS_TAGS],
  decisions: [],
  sources: { segments: [{ id: "7", name: "Seg A" }], forms: [] },
};

const tagsEvent = (properties) => ({
  id: "136",
  key: "lead.changetags",
  eventType: "action",
  properties,
  metadata: { ...MODIFY_TAGS, name: "Tag them" },
});

// ------------------------------------------------------------- validation --

test("tag names are valid values: add, remove and several at once", () => {
  assert.deepEqual(
    validateWorkflowEvent(tagsEvent({ add_tags: ["VIP", "Customer"], remove_tags: ["Old"] })).map((i) => i.message),
    []
  );
  assert.deepEqual(validateWorkflowEvent(tagsEvent({ add_tags: [], remove_tags: ["Old"] })).map((i) => i.message), []);
  // A tag literally named "24" is a name like any other.
  assert.deepEqual(validateWorkflowEvent(tagsEvent({ add_tags: ["24"] })).map((i) => i.message), []);
});

test("a saved tag ID is reported with the tag it stands for, on add and remove", () => {
  const messages = validateWorkflowEvent(tagsEvent({ add_tags: ["4"], remove_tags: ["12"] })).map((i) => i.message);
  assert.deepEqual(messages, [
    `Modify contact's tags: Add tags contains "4", which is the ID of "VIP", not its value. Remove "4" and select "VIP" again.`,
    `Modify contact's tags: Remove tags contains "12", which is the ID of "Old", not its value. Remove "12" and select "Old" again.`,
  ]);
});

test("an ID is reported even when a junk tag with that number as its name exists", () => {
  // Tag 4 is "VIP"; suppose an old save already created a tag literally named
  // "4". The value is ambiguous, so it is never silently accepted or converted.
  const event = tagsEvent({ add_tags: ["4"] });
  const field = getEventPropertyFields(event).find((f) => f.path === "add_tags");
  field.choices = [...field.choices, { label: "4", value: "4", data: { id: 40 } }];
  assert.equal(findChoiceByEntityId(field, "4")?.label, "VIP");
});

test("a tag name Mautic no longer offers is reported, not converted", () => {
  const messages = validateWorkflowEvent(tagsEvent({ add_tags: ["Renamed away", "VIP"] })).map((i) => i.message);
  assert.deepEqual(messages, ["Modify contact's tags: Add tags has a value that Mautic no longer offers."]);
});

test("ID detection only applies where values are not the entity IDs", () => {
  const emailField = { entity: true, choices: [{ label: "Welcome", value: "23", data: { id: 23 } }] };
  assert.equal(findChoiceByEntityId(emailField, "23"), null, "an email picker stores the ID itself");
  const enumField = { entity: false, choices: [{ label: "VIP", value: "VIP", data: { id: 4 } }] };
  assert.equal(findChoiceByEntityId(enumField, "4"), null);
});

test("saved values that are not offered stay visible and can be unticked", () => {
  const choices = [{ label: "VIP", value: "VIP", data: { id: 4 } }];
  const options = withSavedChoices(choices, ["4", "VIP", "4"]);
  assert.deepEqual(
    options.map((o) => [String(o.value), String(o.label), Boolean(o.unresolved)]),
    [["4", "4", true], ["VIP", "VIP", false]]
  );
  assert.equal(withSavedChoices(choices, []).length, 1);
});

// ------------------------------------------------------- graph round trip --

test("tag names go through hydrate, map and payload unchanged (no numeric conversion)", () => {
  const events = [
    { id: "135", key: "lead.tags", eventType: "condition", properties: { tags: ["Old"] }, metadata: { ...HAS_TAGS, name: "Has old", parent: null } },
    {
      id: "136",
      key: "lead.changetags",
      eventType: "action",
      properties: { add_tags: ["VIP", "24"], remove_tags: ["Old"] },
      metadata: { ...MODIFY_TAGS, name: "Tag them", parent: "135", decisionPath: "yes" },
    },
  ];
  const hydrated = graph.hydrateCanvasFromEvents(events, {});
  assert.deepEqual(hydrated.blockers, []);
  const mapped = graph.mapCanvasToExecution(hydrated.nodes, hydrated.edges, { events });
  assert.deepEqual(mapped.errors, []);
  const sent = Object.fromEntries(buildEventsPayload(mapped.events).map((event) => [event.id, event.properties]));
  assert.deepEqual(JSON.stringify(sent["136"]), JSON.stringify({ add_tags: ["VIP", "24"], remove_tags: ["Old"] }));
  assert.deepEqual(JSON.stringify(sent["135"]), JSON.stringify({ tags: ["Old"] }));
});

// --------------------------------------------------------------- the page --

let requests;
function installApi(builder) {
  requests = [];
  globalThis.__testApiClient = {
    get: async (url) => {
      requests.push(["GET", url]);
      if (url.endsWith("/capabilities/")) return { data: CAPABILITIES };
      if (builder && url.endsWith("/builder/")) return { data: builder };
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

const NATIVE = (properties) => ({
  id: "74",
  name: "Native tags",
  description: "",
  isPublished: false,
  sources: { segments: [{ id: "7", name: "Seg A" }], forms: [] },
  events: [
    { id: "135", key: "lead.tags", eventType: "condition", properties: { tags: ["Old"] }, metadata: { id: "135", name: "Has old", type: "lead.tags", eventType: "condition", parent: null, decisionPath: null, triggerMode: "immediate" } },
    { id: "136", key: "lead.changetags", eventType: "action", properties, metadata: { id: "136", name: "Tag them", type: "lead.changetags", eventType: "action", parent: "135", decisionPath: "yes", triggerMode: "immediate" } },
  ],
  canvasSettings: { nodes: [], connections: [] },
});

const button = (label) => all("button").find((b) => b.textContent.trim() === label);
const patches = () => requests.filter(([method]) => method === "PATCH").map(([, , payload]) => payload);
const sentProperties = (payload, id) => JSON.stringify(payload.events.find((event) => String(event.id) === id).properties);
const closeMenu = async () => {
  await act(async () => {
    all("[role='listbox']")[0].dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  });
  await waitFor(() => assert.equal(all("[role='listbox']").length, 0));
};

async function renderEdit(builder) {
  installApi(builder);
  await renderRoutes([h(Route, { key: "b", path: "/admin/newsletter/builder/:campaignId", element: h(BuilderPage) })], {
    url: `/admin/newsletter/builder/${builder.id}`,
  });
  await waitFor(() => assert.equal(all("input").some((input) => input.value === builder.name), true), { timeout: 8000 });
}

async function configureTagsEvent() {
  await click(getByRole("tab", "Workflow Events"));
  const configure = all("button").filter((b) => b.textContent.trim() === "Configure");
  await click(configure[configure.length - 1]);
  return waitFor(() => getByRole("combobox", "Add tags"));
}

afterEach(async () => {
  await cleanup();
  delete globalThis.__testApiClient;
});

test("a native tag-name configuration shows the tag names and saves unchanged", async () => {
  await renderEdit(NATIVE({ add_tags: ["VIP", "Customer"], remove_tags: ["Old"] }));

  const addTags = await configureTagsEvent();
  assert.equal(addTags.textContent, "VIP, Customer");
  assert.equal(getByRole("combobox", "Remove tags").textContent, "Old");

  await click(button("Update Campaign"));
  await waitFor(() => assert.equal(patches().length, 1));
  assert.equal(sentProperties(patches()[0], "136"), JSON.stringify({ add_tags: ["VIP", "Customer"], remove_tags: ["Old"] }));
  assert.equal(sentProperties(patches()[0], "135"), JSON.stringify({ tags: ["Old"] }));

  // Publish sends the very same configuration.
  await waitFor(() => assert.equal(Boolean(button("Publish")) && !button("Publish").disabled, true));
  await click(button("Publish"));
  await waitFor(() => assert.equal(patches().length, 2));
  assert.equal(sentProperties(patches()[1], "136"), sentProperties(patches()[0], "136"));
  assert.equal(patches()[1].isPublished, true);
});

test("creating a campaign stores the selected tag names, never their IDs", async () => {
  installApi(null);
  await renderRoutes([h(Route, { key: "n", path: "/admin/newsletter/builder", element: h(BuilderPage) })], {
    url: "/admin/newsletter/builder",
  });
  await waitFor(() => assert.equal(Boolean(button("Create Campaign")), true));
  await typeInto(getByRole("textbox", "Campaign Name"), "Fresh");
  await chooseSelectOption(getByRole("combobox", "Segments"), "Seg A");
  await closeMenu();
  await click(getByRole("tab", "Workflow Events"));
  await chooseSelectOption(getByRole("combobox", "Event"), /^Modify contact's tags/);
  await click(button("Add Event"));

  const addTags = await configureTagsEvent();
  await chooseSelectOption(addTags, "VIP");
  await chooseSelectOption(getByRole("combobox", "Add tags"), "24");
  await closeMenu();
  await chooseSelectOption(getByRole("combobox", "Remove tags"), "Old");
  await closeMenu();
  assert.equal(getByRole("combobox", "Add tags").textContent, "VIP, 24");

  await click(button("Create Campaign"));

  await waitFor(() => assert.equal(requests.filter(([method]) => method === "POST").length, 1));
  const [, , created] = requests.find(([method]) => method === "POST");
  assert.equal(JSON.stringify(created.events[0].properties), JSON.stringify({ add_tags: ["VIP", "24"], remove_tags: ["Old"] }));
});

test("a legacy tag ID blocks the save with the tag it meant, and can be repaired", async () => {
  await renderEdit(NATIVE({ add_tags: ["4"], remove_tags: ["Old"] }));

  await click(button("Update Campaign"));
  await waitFor(() => assert.equal(queryByText(/contains "4", which is the ID of "VIP"/) !== null, true));
  assert.equal(patches().length, 0);

  // The saved ID is listed (flagged) so it can be unticked, then the tag chosen.
  const addTags = await configureTagsEvent();
  await chooseSelectOption(addTags, /^4Saved value/);
  await chooseSelectOption(getByRole("combobox", "Add tags"), "VIP");
  await closeMenu();

  await click(button("Update Campaign"));
  await waitFor(() => assert.equal(patches().length, 1));
  assert.equal(sentProperties(patches()[0], "136"), JSON.stringify({ add_tags: ["VIP"], remove_tags: ["Old"] }));
});

test("a tag name Mautic no longer offers blocks the save instead of being dropped", async () => {
  await renderEdit(NATIVE({ add_tags: ["Renamed away"], remove_tags: [] }));

  await click(button("Update Campaign"));
  await waitFor(() => assert.equal(queryByText(/Add tags has a value that Mautic no longer offers/) !== null, true));
  assert.equal(patches().length, 0);

  const addTags = await configureTagsEvent();
  assert.equal(addTags.textContent, "Renamed away");
  await act(async () => {
    addTags.dispatchEvent(new window.MouseEvent("mousedown", { bubbles: true, button: 0 }));
  });
  await waitFor(() => assert.equal(all("[role='option']").some((o) => o.textContent === "Renamed awaySaved value — not offered by Mautic"), true));
});
