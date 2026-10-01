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

const noSchema = { available: false, fields: [] };
const CAPABILITIES = {
  actions: [{ key: "lead.changetags", type: "lead.changetags", eventType: "action", label: "Modify tags", formSchema: noSchema }],
  conditions: [{ key: "lead.field_value", type: "lead.field_value", eventType: "condition", label: "Field value", formSchema: noSchema }],
  decisions: [{ key: "page.pagehit", type: "page.pagehit", eventType: "decision", label: "Visits a page", formSchema: noSchema }],
  sources: { segments: [{ id: "7", name: "Seg A" }], forms: [] },
};

const mauticEvent = (id, key, eventType, metadata = {}) => ({
  id,
  key,
  eventType,
  properties: {},
  metadata: { id, name: `Step ${id}`, type: key, eventType, parent: null, decisionPath: null, triggerMode: "immediate", triggerInterval: 0, ...metadata },
});

const BRANCHED = {
  id: "57",
  name: "Branched",
  description: "",
  isPublished: false,
  sources: { segments: [{ id: "7", name: "Seg A" }], forms: [] },
  events: [
    mauticEvent("81", "lead.field_value", "condition"),
    mauticEvent("82", "lead.changetags", "action", { parent: "81", decisionPath: "yes" }),
    mauticEvent("83", "lead.changetags", "action", { parent: "81", decisionPath: "no", triggerMode: "interval", triggerInterval: 2, triggerIntervalUnit: "d" }),
    mauticEvent("84", "page.pagehit", "decision", { parent: "82" }),
    mauticEvent("85", "lead.changetags", "action", { parent: "84", decisionPath: "no", triggerMode: "date", triggerDate: "2030-01-15T09:30:00+00:00" }),
  ],
  canvasSettings: { nodes: [], connections: [] },
};

let requests;
function installApi({ builder = BRANCHED, onPatch, onPost } = {}) {
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
      return onPatch ? onPatch(payload) : { data: { id: builder.id } };
    },
    post: async (url, payload) => {
      requests.push(["POST", url, payload]);
      return onPost ? onPost(payload) : { data: { id: "99" } };
    },
    delete: async (url) => {
      throw new Error(`unexpected DELETE ${url}`);
    },
  };
}

const button = (label) => all("button").find((b) => b.textContent.trim() === label);
const patches = () => requests.filter(([method]) => method === "PATCH");
const builderGets = () => requests.filter(([method, url]) => method === "GET" && url.endsWith("/builder/"));

async function renderEdit(builder = BRANCHED) {
  const view = await renderRoutes(
    [h(Route, { key: "b", path: "/admin/newsletter/builder/:campaignId", element: h(BuilderPage) })],
    { url: `/admin/newsletter/builder/${builder.id}` }
  );
  await waitFor(() => assert.equal(all("input").some((input) => input.value === builder.name), true), { timeout: 8000 });
  return view;
}

afterEach(async () => {
  await cleanup();
  delete globalThis.__testApiClient;
});

test("saving a loaded branched campaign sends its exact graph and reloads it", async () => {
  installApi();
  await renderEdit();

  await click(button("Update Campaign"));

  await waitFor(() => assert.equal(patches().length, 1));
  const sent = Object.fromEntries(patches()[0][2].events.map((event) => [event.id, event]));
  assert.deepEqual(
    Object.values(sent)
      .map((event) => [event.id, event.parent, event.decisionPath ?? null, event.triggerMode])
      .sort((a, b) => a[0].localeCompare(b[0])),
    [
      ["81", null, null, "immediate"],
      ["82", "81", "yes", "immediate"],
      ["83", "81", "no", "interval"],
      ["84", "82", null, "immediate"],
      ["85", "84", "no", "date"],
    ]
  );
  assert.equal(sent["83"].triggerInterval, 2);
  assert.equal(sent["85"].triggerDate, "2030-01-15T09:30:00+00:00");
  assert.equal(sent["82"].name, "Step 82", "the saved name is kept");
  // Only Mautic's own canvas is stored: the source and one node per event
  // (the backend draws each event's connection from parent + path), so
  // Mautic's orphan rule always holds.
  const canvas = patches()[0][2].canvasSettings;
  assert.deepEqual(canvas.nodes.map((n) => n.id).sort(), ["81", "82", "83", "84", "85", "lists"]);
  assert.deepEqual(canvas.connections, []);
  // Reloaded so new events would get their real ids before another save.
  await waitFor(() => assert.equal(builderGets().length, 2));
});

test("Publish sends the same graph as Update", async () => {
  installApi();
  await renderEdit();
  await click(button("Update Campaign"));
  await waitFor(() => assert.equal(patches().length, 1));
  await waitFor(() => assert.equal(builderGets().length, 2));

  await click(button("Publish"));

  await waitFor(() => assert.equal(patches().length, 2));
  const [update, publish] = patches().map(([, , payload]) => payload);
  assert.deepEqual(publish.events, update.events);
  assert.equal(publish.isPublished, true);
});

test("a workflow the builder cannot represent blocks Update and Publish", async () => {
  installApi({
    builder: {
      ...BRANCHED,
      id: "58",
      events: [mauticEvent("90", "lead.changetags", "action", { parent: "999" })],
    },
  });
  await renderEdit({ ...BRANCHED, id: "58" });

  await waitFor(() => assert.equal(queryByText(/cannot safely edit/) !== null, true));
  assert.equal(button("Update Campaign").disabled, true);
  assert.equal(button("Publish").disabled, true);
  assert.equal(patches().length, 0);
});

test("a condition child without a YES/NO path is refused instead of flattened", async () => {
  installApi({
    builder: {
      ...BRANCHED,
      events: [mauticEvent("81", "lead.field_value", "condition"), mauticEvent("82", "lead.changetags", "action", { parent: "81" })],
    },
  });
  await renderEdit();

  await click(button("Update Campaign"));

  await waitFor(() => assert.equal(queryByText(/must use its YES or NO output/) !== null, true));
  assert.equal(patches().length, 0);
});

test("the canvas shows YES and NO outputs on Conditions and Decisions", async () => {
  installApi();
  await renderEdit();

  await click(getByRole("tab", "Canvas"));

  await waitFor(() => assert.equal(all(".react-flow__handle").length > 0, true));
  // Two branching nodes (a Condition and a Decision), each with YES and NO.
  assert.equal(all(".react-flow__handle[data-handleid='yes']").length, 2);
  assert.equal(all(".react-flow__handle[data-handleid='no']").length, 2);
  assert.equal(all("span").filter((el) => el.textContent === "DECISION").length + all("*").filter((el) => el.children.length === 0 && el.textContent === "Decision").length > 0, true);
});

test("after creating a campaign the canvas still works (post-create state)", async () => {
  installApi();
  await renderRoutes([h(Route, { key: "n", path: "/admin/newsletter/builder", element: h(BuilderPage) })], {
    url: "/admin/newsletter/builder",
  });
  await waitFor(() => assert.equal(Boolean(button("Create Campaign")), true));

  await typeInto(getByRole("textbox", "Campaign Name"), "Fresh");
  await chooseSelectOption(getByRole("combobox", "Segments"), "Seg A");
  // A multi-select keeps its menu open; close it as a user would.
  await act(async () => {
    all("[role='listbox']")[0].dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  });
  await waitFor(() => assert.equal(all("[role='listbox']").length, 0));
  await click(getByRole("tab", "Workflow Events"));
  await chooseSelectOption(getByRole("combobox", "Event"), /^Modify tags/);
  await click(button("Add Event"));
  await click(button("Create Campaign"));
  await waitFor(() => assert.equal(requests.filter(([method]) => method === "POST").length, 1));
  await waitFor(() => assert.equal(queryByText(/Campaign #99 created/) !== null, true));

  // Before the fix the reset dropped canvasSettings and this crashed.
  await click(getByRole("tab", "Canvas"));
  await click(button("Add Node"));
  const trigger = await waitFor(() => {
    const item = all("[role='menuitem']").find((el) => el.textContent.trim() === "Trigger");
    if (!item) throw new Error("menu");
    return item;
  });
  await click(trigger);
  await waitFor(() => assert.equal(queryByText("Campaign Entry") !== null, true));
});
