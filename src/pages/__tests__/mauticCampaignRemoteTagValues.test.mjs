// Tag pickers served by reference (more than 50 tags): the capabilities carry
// no choices, so an old tag ID saved by earlier builder versions can only be
// proven by asking the provider. The builder must apply the same rule as for an
// inline list — block Update and Publish until the ID is replaced — without
// loading the catalog, and must leave real tag names (numeric ones included)
// alone.
import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import {
  React,
  act,
  all,
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

const { getEventPropertyFields } = await loadSource("src/pages/mauticCampaignFields.js");
const { remoteEntityIdLookups, validateWorkflowEvent } = await loadSource("src/pages/mauticCampaignValidation.js");
const { normalizeChoiceResults } = await loadSource("src/pages/mauticCampaignChoices.js");
const { default: BuilderPage } = await loadSource("src/pages/AdminNewsletterMauticCampaignBuilderPage.jsx");
const { Route } = router;
const h = React.createElement;

// Assertions only ever compare strings/numbers/booleans: a failing assert on
// a live jsdom node makes Node print the whole DOM graph.

// 60 tags, so every tag field is served by reference. "24" is a real tag whose
// NAME is numeric (id 75); no tag has id 24.
const CATALOG = [
  { id: 4, name: "VIP" },
  { id: 13, name: "Customer" },
  { id: 12, name: "Old" },
  { id: 75, name: "24" },
  ...Array.from({ length: 56 }, (_, n) => ({ id: 100 + n, name: `bulk-${String(n).padStart(2, "0")}` })),
];

// The provider's lookup, as the plugin answers it: by stored value (the name),
// and — on a field whose values are not IDs — the entity whose ID was asked for.
function choicesBackend(catalog = CATALOG) {
  const rows = catalog.map((tag) => ({ value: tag.name, label: tag.name, entityId: String(tag.id) }));
  return (params) => {
    if (params.values) {
      const wanted = params.values.map(String);
      const results = rows.filter((row) => wanted.includes(row.value) || (wanted.includes(row.entityId) && row.entityId !== row.value));
      return { results, total: results.length, start: 0, limit: results.length, hasMore: false };
    }
    const needle = String(params.search || "").toLowerCase();
    const matched = rows.filter((row) => !needle || row.label.toLowerCase().includes(needle));
    const start = Number(params.start || 0);
    const limit = Number(params.limit || 25);
    return { results: matched.slice(start, start + limit), total: matched.length, start, limit, hasMore: start + limit < matched.length };
  };
}

// Each test gets its own source scope: the remote field caches pages per source
// for the whole module, and the page bundle's cache cannot be reset from here.
let scopeSeq = 0;
function remoteTagField(name, label, eventType, key, scope) {
  return {
    name,
    type: "Mautic\\LeadBundle\\Form\\Type\\TagType",
    blockPrefixes: ["form", "choice", "entity", "lead_tag", `_${name}`],
    label,
    required: false,
    multiple: true,
    mapped: true,
    renderable: true,
    controlType: "field",
    choiceKind: "entity",
    choiceMode: "remote",
    choiceCount: CATALOG.length,
    choices: [],
    choiceSource: {
      type: "event_field",
      kind: "entity",
      searchable: true,
      paginated: true,
      total: CATALOG.length,
      scope: { eventType: `${eventType}${scope}`, key, field: name },
    },
  };
}
function capabilities() {
  const scope = `#${(scopeSeq += 1)}`;
  return {
    actions: [{
      key: "lead.changetags",
      type: "lead.changetags",
      eventType: "action",
      label: "Modify contact's tags",
      formSchema: {
        available: true,
        fields: [
          remoteTagField("add_tags", "Add tags", "action", "lead.changetags", scope),
          remoteTagField("remove_tags", "Remove tags", "action", "lead.changetags", scope),
        ],
      },
    }],
    conditions: [{
      key: "lead.tags",
      type: "lead.tags",
      eventType: "condition",
      label: "Contact tags",
      formSchema: { available: true, fields: [remoteTagField("tags", "Tags", "condition", "lead.tags", scope)] },
    }],
    decisions: [],
    sources: { segments: [{ id: "7", name: "Seg A" }], forms: [] },
  };
}

const CAPS = capabilities();
const tagsEvent = (properties) => ({
  id: "143",
  key: "lead.changetags",
  eventType: "action",
  properties,
  metadata: { ...CAPS.actions[0], name: "Tag them" },
});
const resolvedRows = (sourceKey, params) => ({ [sourceKey]: normalizeChoiceResults(choicesBackend()(params)) });

// ------------------------------------------------------------- unit rules --

test("more than 50 tags: the tag fields are served by reference, with no inline choices", () => {
  const fields = getEventPropertyFields(tagsEvent({ add_tags: ["VIP"] }));
  assert.deepEqual(
    fields.map((field) => [field.path, field.remote, field.entity, field.choices.length]),
    [["add_tags", true, true, 0], ["remove_tags", true, true, 0]]
  );
});

test("only whole-number values are looked up, one group per source, names never", () => {
  const events = [
    tagsEvent({ add_tags: ["VIP", "4", "Customer", "24"], remove_tags: ["Old", "12"] }),
    { ...tagsEvent({ add_tags: ["4", "bulk-01"] }), id: "144" },
  ];
  assert.deepEqual(
    remoteEntityIdLookups(events).map((group) => [group.source.scope.field, group.values.join(",")]),
    [["add_tags", "4,24"], ["remove_tags", "12"]]
  );
  assert.deepEqual(remoteEntityIdLookups([tagsEvent({ add_tags: ["VIP", "Customer"], remove_tags: ["Old"] })]), []);
});

test("a remote legacy ID is reported only once the provider identifies it", () => {
  const event = tagsEvent({ add_tags: ["VIP", "4", "Customer"], remove_tags: [] });
  const [lookup] = remoteEntityIdLookups([event]);

  assert.deepEqual(validateWorkflowEvent(event).map((i) => i.message), [], "unresolved: nothing proven, nothing claimed");

  const remoteChoices = resolvedRows(lookup.sourceKey, { values: lookup.values });
  assert.deepEqual(validateWorkflowEvent(event, { remoteChoices }).map((i) => [i.message, i.kind]), [[
    `Modify contact's tags: Add tags contains "4", which is the ID of "VIP", not its value. Remove "4" and select "VIP" again.`,
    "legacy-entity-id",
  ]]);
});

test("a real numeric tag name is not an ID; a number that is another tag's ID still is", () => {
  const named24 = tagsEvent({ add_tags: ["24"] });
  const [lookup] = remoteEntityIdLookups([named24]);
  const remoteChoices = resolvedRows(lookup.sourceKey, { values: lookup.values });
  assert.deepEqual(validateWorkflowEvent(named24, { remoteChoices }).map((i) => i.message), []);

  // Ambiguous: tag 24 exists ("Gold") and so does a tag named "24". The provider
  // names both; the conservative rule still refuses to guess.
  const ambiguous = normalizeChoiceResults(
    choicesBackend([...CATALOG, { id: 24, name: "Gold" }])({ values: ["24"] })
  );
  assert.deepEqual(
    validateWorkflowEvent(named24, { remoteChoices: { [lookup.sourceKey]: ambiguous } }).map((i) => i.message),
    [`Modify contact's tags: Add tags contains "24", which is the ID of "Gold", not its value. Remove "24" and select "Gold" again.`]
  );
});

// --------------------------------------------------------------- the page --

let requests;
function installApi(builder, caps, backend = choicesBackend()) {
  requests = [];
  globalThis.__testApiClient = {
    get: async (url, config = {}) => {
      requests.push(["GET", url, config.params]);
      if (url.endsWith("/capabilities/")) return { data: caps };
      if (url.endsWith("/builder/")) return { data: builder };
      if (url.endsWith("/choices/")) return { data: backend(config.params || {}) };
      return { data: {} };
    },
    patch: async (url, payload) => {
      requests.push(["PATCH", url, payload]);
      return { data: { id: builder.id } };
    },
    post: async (url) => {
      throw new Error(`unexpected POST ${url}`);
    },
    delete: async (url) => {
      throw new Error(`unexpected DELETE ${url}`);
    },
  };
}

const campaign = ({ add, remove = ["Old"], condition = ["Old"], isPublished = false }) => ({
  id: "78",
  name: "Remote tags",
  description: "",
  isPublished,
  sources: { segments: [{ id: "7", name: "Seg A" }], forms: [] },
  events: [
    { id: "142", key: "lead.tags", eventType: "condition", properties: { tags: condition }, metadata: { id: "142", name: "Has old", type: "lead.tags", eventType: "condition", parent: null, decisionPath: null, triggerMode: "immediate" } },
    { id: "143", key: "lead.changetags", eventType: "action", properties: { add_tags: add, remove_tags: remove }, metadata: { id: "143", name: "Tag them", type: "lead.changetags", eventType: "action", parent: "142", decisionPath: "yes", triggerMode: "immediate" } },
  ],
  canvasSettings: { nodes: [], connections: [] },
});

const button = (label) => all("button").find((b) => b.textContent.trim() === label);
const patches = () => requests.filter(([method]) => method === "PATCH").map(([, , payload]) => payload);
const choiceRequests = () => requests.filter(([method, url]) => method === "GET" && url.endsWith("/choices/")).map(([, , params]) => params);
const sentProperties = (payload, id) => JSON.stringify(payload.events.find((event) => String(event.id) === id).properties);
const settle = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)); });

async function renderEdit(builder, backend) {
  installApi(builder, capabilities(), backend);
  await renderRoutes([h(Route, { key: "b", path: "/admin/newsletter/builder/:campaignId", element: h(BuilderPage) })], {
    url: `/admin/newsletter/builder/${builder.id}`,
  });
  await waitFor(() => assert.equal(all("input").some((input) => input.value === builder.name), true), { timeout: 8000 });
  await settle();
}

afterEach(async () => {
  await cleanup();
  delete globalThis.__testApiClient;
});

test("a remote legacy ID disables Update and Publish with the tag it meant", async () => {
  await renderEdit(campaign({ add: ["VIP", "4", "Customer"] }));

  await waitFor(() => assert.equal(queryByText(/contains "4", which is the ID of "VIP"/) !== null, true));
  assert.equal(queryByText(/Update and Publish\s+are disabled until each is replaced/) !== null, true);
  assert.equal(button("Update Campaign").disabled, true);
  assert.equal(button("Publish").disabled, true);
  // One small lookup for the one value that could be an ID; no catalog load.
  assert.deepEqual(choiceRequests().map((p) => [p.field, (p.values || []).join(",")]), [["add_tags", "4"]]);

  await click(button("Update Campaign"));
  await click(button("Publish"));
  await settle();
  assert.equal(patches().length, 0);
});

test("a published campaign with a legacy ID can still be unpublished", async () => {
  await renderEdit(campaign({ add: ["4"], isPublished: true }));
  await waitFor(() => assert.equal(button("Update Campaign").disabled, true));
  assert.equal(button("Unpublish").disabled, false);
});

test("the Contact tags condition gets the same protection", async () => {
  await renderEdit(campaign({ add: ["VIP"], condition: ["12"] }));
  await waitFor(() => assert.equal(queryByText(/Tags contains "12", which is the ID of "Old"/) !== null, true));
  assert.equal(button("Update Campaign").disabled, true);
});

test("the legacy value stays visible, can be removed, and the real tag found by search", async () => {
  await renderEdit(campaign({ add: ["4", "Customer"] }));
  await waitFor(() => assert.equal(button("Update Campaign").disabled, true));

  await click(getByRole("tab", "Workflow Events"));
  const configure = all("button").filter((b) => b.textContent.trim() === "Configure");
  await click(configure[configure.length - 1]);
  const addTags = await waitFor(() => getByRole("combobox", "Add tags"));
  await waitFor(() => assert.equal(addTags.textContent, "4, Customer"));

  await act(async () => {
    addTags.dispatchEvent(new window.MouseEvent("mousedown", { bubbles: true, button: 0 }));
  });
  const saved = await waitFor(() => {
    const option = all("[role='option']").find((o) => o.textContent === "4Saved value — not offered by Mautic");
    if (!option) throw new Error("saved option");
    return option;
  });
  await click(saved);

  const search = all("input").find((input) => input.placeholder === "Search add tags…");
  await typeInto(search, "VIP");
  const vip = await waitFor(() => {
    const option = all("[role='option']").find((o) => o.textContent === "VIP");
    if (!option) throw new Error("search result");
    return option;
  }, { timeout: 4000 });
  await click(vip);
  await act(async () => {
    all("[role='listbox']")[0].dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  });

  await waitFor(() => assert.equal(button("Update Campaign").disabled, false));
  assert.equal(queryByText(/which is the ID of/), null);
  await click(button("Update Campaign"));
  await waitFor(() => assert.equal(patches().length, 1));
  assert.equal(sentProperties(patches()[0], "143"), JSON.stringify({ add_tags: ["Customer", "VIP"], remove_tags: ["Old"] }));
});

test("native tag names in a large catalog are accepted, ask nothing, and save unchanged", async () => {
  await renderEdit(campaign({ add: ["VIP", "Customer"] }));

  assert.equal(button("Update Campaign").disabled, false);
  assert.equal(choiceRequests().length, 0, "no value could be an ID, so nothing is looked up");

  await click(button("Update Campaign"));
  await waitFor(() => assert.equal(patches().length, 1));
  assert.equal(sentProperties(patches()[0], "143"), JSON.stringify({ add_tags: ["VIP", "Customer"], remove_tags: ["Old"] }));
  assert.equal(sentProperties(patches()[0], "142"), JSON.stringify({ tags: ["Old"] }));
});

test("a real tag named \"24\" is looked up once, not flagged, and saves unchanged", async () => {
  await renderEdit(campaign({ add: ["24", "VIP"] }));

  await waitFor(() => assert.equal(choiceRequests().length, 1));
  assert.equal(button("Update Campaign").disabled, false);
  await click(button("Update Campaign"));
  await waitFor(() => assert.equal(patches().length, 1));
  assert.equal(sentProperties(patches()[0], "143"), JSON.stringify({ add_tags: ["24", "VIP"], remove_tags: ["Old"] }));
  assert.equal(choiceRequests().length, 1, "the save reuses the lookup");
});

test("a lookup that fails proves nothing: the value is kept and the save is not blocked", async () => {
  await renderEdit(campaign({ add: ["4"] }), () => {
    throw new Error("Mautic unreachable");
  });

  assert.equal(button("Update Campaign").disabled, false);
  await click(button("Update Campaign"));
  await waitFor(() => assert.equal(patches().length, 1));
  assert.equal(sentProperties(patches()[0], "143"), JSON.stringify({ add_tags: ["4"], remove_tags: ["Old"] }));
});
