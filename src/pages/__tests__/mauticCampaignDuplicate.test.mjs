// Campaign Duplicate from the Campaign list and from the builder: one backend
// operation, one click = one copy, the list survives a failure, a success opens
// the (unpublished) copy, and a campaign the builder blocks cannot be copied.
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
  waitFor,
} from "./helpers/blogDomHarness.mjs";

const { default: CampaignsPanel } = await loadSource("src/pages/AdminNewsletterMauticCampaignsPanel.jsx");
const { default: BuilderPage } = await loadSource("src/pages/AdminNewsletterMauticCampaignBuilderPage.jsx");
const { duplicateFailureMessage } = await loadSource("src/pages/mauticCampaignDuplicate.js");
const { Route } = router;
const h = React.createElement;

// Assertions only ever compare strings/numbers/booleans: a failing assert on
// a live jsdom node makes Node print the whole DOM graph.

const tagField = (name, label) => ({
  name, label, type: "Mautic\\LeadBundle\\Form\\Type\\TagType", blockPrefixes: ["form", "choice", "entity", "lead_tag"],
  required: false, multiple: true, mapped: true, renderable: true, controlType: "field", choiceKind: "entity", choiceMode: "inline",
  choices: [{ label: "Gold", value: "Gold", data: { id: 24 } }, { label: "Silver", value: "Silver", data: { id: 25 } }],
});
const CAPABILITIES = {
  actions: [{ key: "lead.changetags", type: "lead.changetags", eventType: "action", label: "Modify contact's tags",
    formSchema: { available: true, fields: [tagField("add_tags", "Add tags"), tagField("remove_tags", "Remove tags")] } }],
  conditions: [{ key: "lead.field_value", type: "lead.field_value", eventType: "condition", label: "Field value", formSchema: { available: false, fields: [] } }],
  decisions: [],
  sources: { segments: [{ id: "54", name: "Seg" }], forms: [] },
};
const meta = (id, key, eventType, extra = {}) => ({ id, name: `Step ${id}`, type: key, eventType, parent: null, decisionPath: null, triggerMode: "immediate", ...extra });
const campaign = (id, { name = "Spring", isPublished = false, canvasSettings } = {}) => ({
  id, name, description: "", isPublished,
  sources: { segments: [{ id: "54", name: "Seg" }], forms: [] },
  events: [
    { id: "207", key: "lead.field_value", eventType: "condition", properties: {}, metadata: meta("207", "lead.field_value", "condition") },
    { id: "208", key: "lead.changetags", eventType: "action", properties: { add_tags: ["Gold"] }, metadata: meta("208", "lead.changetags", "action", { parent: "207", decisionPath: "yes" }) },
  ],
  // A copy made by the backend carries Mautic's own canvas: numeric positions.
  canvasSettings: canvasSettings || {
    nodes: [{ id: "lists", positionX: 380, positionY: 100 }, { id: "207", positionX: 380, positionY: 260 }, { id: "208", positionX: 380, positionY: 420 }],
    connections: [
      { sourceId: "lists", targetId: "207", anchors: { source: "leadsource", target: "top" } },
      { sourceId: "207", targetId: "208", anchors: { source: "yes", target: "top" } },
    ],
  },
});
const LIST = {
  count: 2, page: 1, page_size: 25, num_pages: 1,
  results: [
    { id: "88", name: "Spring", isPublished: true, lists: [{ id: "54" }], forms: [], events: [], contactCount: 2 },
    { id: "89", name: "Summer", isPublished: false, lists: [{ id: "54" }], forms: [], events: [], contactCount: 0 },
  ],
};

let requests;
let pendingDuplicate;
function installApi({ builders = {}, duplicate } = {}) {
  requests = [];
  globalThis.__testApiClient = {
    get: async (url) => {
      requests.push(["GET", url]);
      if (url.endsWith("/capabilities/")) return { data: CAPABILITIES };
      const builder = url.match(/mautic-campaigns\/(\d+)\/builder\/$/);
      if (builder) return { data: builders[builder[1]] };
      if (url.endsWith("/mautic-campaigns/")) return { data: LIST };
      return { data: {} };
    },
    post: async (url) => {
      requests.push(["POST", url]);
      if (url.endsWith("/duplicate/")) return duplicate ? duplicate(url) : new Promise((resolve, reject) => { pendingDuplicate = { resolve, reject }; });
      throw new Error(`unexpected POST ${url}`);
    },
    patch: async (url) => { throw new Error(`unexpected PATCH ${url}`); },
    delete: async (url) => { throw new Error(`unexpected DELETE ${url}`); },
  };
}

const posts = () => requests.filter(([method]) => method === "POST").map(([, url]) => url);
const duplicateButtons = () => all("button").filter((b) => b.getAttribute("aria-label") === "Duplicate Campaign");
const button = (label) => all("button").find((b) => b.textContent.trim() === label);
const BuilderAt = (path) => h(Route, { key: path, path, element: h(BuilderPage) });

async function renderList(api) {
  installApi(api);
  await renderRoutes(
    [
      h(Route, { key: "list", path: "/admin/newsletter/campaigns", element: h(CampaignsPanel) }),
      h(Route, { key: "builder", path: "/admin/newsletter/builder/:campaignId", element: h("div", null, "builder page") }),
    ],
    { url: "/admin/newsletter/campaigns" }
  );
  await waitFor(() => assert.equal(duplicateButtons().length, 2));
}

afterEach(async () => {
  await cleanup();
  delete globalThis.__testApiClient;
  pendingDuplicate = null;
});

test("the failure message carries the backend's reasons", () => {
  const message = duplicateFailureMessage({ response: { data: { detail: "This campaign cannot be duplicated safely.", reasons: ["event 5 is not on Mautic's canvas", "b", "c", "d"] } } });
  assert.equal(message, "This campaign cannot be duplicated safely. event 5 is not on Mautic's canvas b c (+1 more)");
  assert.equal(duplicateFailureMessage(new Error("boom")), "We could not duplicate this campaign.");
});

test("each list row offers Duplicate, and it copies that row's campaign once", async () => {
  await renderList({});

  // Two clicks in the same tick, before React can disable anything…
  const first = duplicateButtons()[0];
  await act(async () => {
    first.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    first.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  });
  // …then clicks on the now-disabled buttons, which must not open a campaign either.
  await click(duplicateButtons()[0]);
  await act(async () => { duplicateButtons()[1].dispatchEvent(new window.MouseEvent("click", { bubbles: true })); });

  assert.deepEqual(posts(), ["/newsletter/admin/mautic-campaigns/88/duplicate/"]);
  assert.equal(duplicateButtons().every((b) => b.disabled), true, "all Duplicate buttons wait for the copy");
  // The busy row shows a spinner in place of its copy icon; the others keep theirs.
  const copyIcon = (b) => Boolean(b.querySelector("[data-testid='ContentCopyRoundedIcon']"));
  assert.deepEqual(duplicateButtons().map(copyIcon), [false, true]);

  await act(async () => { pendingDuplicate.resolve({ data: { id: "93", name: "Spring Copy", isPublished: false, sourceId: "88" } }); });
  await waitFor(() => assert.equal(queryByText("builder page") !== null, true));
  assert.deepEqual(posts(), ["/newsletter/admin/mautic-campaigns/88/duplicate/"]);
});

test("a refused copy keeps the list, explains why, and can be retried", async () => {
  await renderList({});

  await click(duplicateButtons()[1]);
  await act(async () => {
    pendingDuplicate.reject(Object.assign(new Error("409"), {
      response: { status: 409, data: { detail: "This campaign cannot be duplicated safely.", reasons: ["event 12 is not on Mautic's canvas"] } },
    }));
  });

  await waitFor(() => assert.equal(queryByText(/cannot be duplicated safely\. event 12 is not on Mautic's canvas/) !== null, true));
  assert.equal(queryByText("builder page"), null, "no navigation to a copy that does not exist");
  assert.equal(queryByText("Spring") !== null && queryByText("Summer") !== null, true, "the list is still there");
  assert.equal(duplicateButtons().every((b) => !b.disabled), true);
});

test("the builder duplicates through the same endpoint and opens the unpublished copy", async () => {
  installApi({
    builders: { 88: campaign("88", { isPublished: true }), 93: campaign("93", { name: "Spring Copy" }) },
    duplicate: async () => ({ data: { id: "93", name: "Spring Copy", isPublished: false, sourceId: "88" } }),
  });
  await renderRoutes([BuilderAt("/admin/newsletter/builder/:campaignId")], { url: "/admin/newsletter/builder/88" });
  await waitFor(() => assert.equal(all("input").some((i) => i.value === "Spring"), true), { timeout: 8000 });
  assert.equal(Boolean(button("Unpublish")), true, "the source is published");

  await click(button("Duplicate"));

  assert.deepEqual(posts(), ["/newsletter/admin/mautic-campaigns/88/duplicate/"]);
  await waitFor(() => assert.equal(all("input").some((i) => i.value === "Spring Copy"), true), { timeout: 8000 });
  assert.equal(Boolean(button("Publish")) && !button("Unpublish"), true, "the copy starts unpublished");
  assert.equal(queryByText(/The copy is unpublished/) !== null, true);
  assert.equal(queryByText(/cannot safely edit/), null, "Mautic's own canvas on the copy loads without blockers");

  // Its Modify Tags values are the tag names, shown as such.
  await click(getByRole("tab", "Workflow Events"));
  const configure = all("button").filter((b) => b.textContent.trim() === "Configure");
  await click(configure[configure.length - 1]);
  await waitFor(() => assert.equal(getByRole("combobox", "Add tags").textContent, "Gold"));
});

test("a campaign the builder blocks cannot be duplicated from the builder", async () => {
  // Frozen: an orphaned node left by an old ECP save in the stored canvas.
  const frozen = campaign("81", {
    canvasSettings: {
      nodes: [{ id: "node-1-trig", nodeType: "trigger" }, { id: "lists" }, { id: "207" }, { id: "208" }],
      connections: [{ sourceId: "lists", targetId: "207" }, { sourceId: "207", targetId: "208", anchors: { source: "yes" } }],
    },
  });
  installApi({ builders: { 81: frozen }, duplicate: async () => { throw new Error("must not be called"); } });
  await renderRoutes([BuilderAt("/admin/newsletter/builder/:campaignId")], { url: "/admin/newsletter/builder/81" });
  await waitFor(() => assert.equal(queryByText(/Mautic will refuse any change/) !== null, true), { timeout: 8000 });

  assert.equal(button("Duplicate").disabled, true);
  await act(async () => { button("Duplicate").dispatchEvent(new window.MouseEvent("click", { bubbles: true })); });
  assert.deepEqual(posts(), []);
});

test("a failed duplicate from the builder stays on the source and re-enables the button", async () => {
  installApi({
    builders: { 88: campaign("88") },
    duplicate: async () => {
      throw Object.assign(new Error("502"), {
        response: { status: 502, data: { detail: "The campaign could not be duplicated faithfully, so the incomplete copy was removed.", reasons: ["event 177 -> 190: properties differs"] } },
      });
    },
  });
  await renderRoutes([BuilderAt("/admin/newsletter/builder/:campaignId")], { url: "/admin/newsletter/builder/88" });
  await waitFor(() => assert.equal(all("input").some((i) => i.value === "Spring"), true), { timeout: 8000 });

  await click(button("Duplicate"));

  await waitFor(() => assert.equal(queryByText(/incomplete copy was removed/) !== null, true));
  assert.equal(all("input").some((i) => i.value === "Spring"), true, "still on the source");
  assert.equal(button("Duplicate").disabled, false);
  assert.deepEqual(posts(), ["/newsletter/admin/mautic-campaigns/88/duplicate/"]);
});
