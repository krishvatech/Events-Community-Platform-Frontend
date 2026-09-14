import assert from "node:assert/strict";
import test from "node:test";

import {
  findWorkflowEvent,
  removeWorkflowEventFromState,
  requiresProviderDeletion,
} from "../mauticCampaignEventRemoval.js";

// A campaign as the builder holds it: four events Mautic has IDs for, one the
// user just added and has not saved yet.
const builderState = () => ({
  events: [
    { id: "12", key: "email.send", properties: { email: "23" }, metadata: { label: "Send email" } },
    { id: "23", key: "lead.changetags", properties: { add_tags: ["4"] }, metadata: { label: "Modify contact's tags" } },
    { id: "26", key: "lead.device", properties: { device_brand: ["AP"] }, metadata: { label: "Contact device" } },
    { id: "event-1736-new", key: "lead.changepoints", properties: { points: 5 }, metadata: { label: "Adjust contact points" } },
  ],
  canvasNodes: [
    { id: "node-trigger", nodeType: "trigger", eventId: null },
    { id: "node-a", nodeType: "action", eventId: "12" },
    { id: "node-b", nodeType: "condition", eventId: "26" },
    { id: "node-c", nodeType: "action", eventId: "event-1736-new" },
  ],
  canvasSettings: {
    nodes: [
      { id: "node-trigger", nodeType: "trigger", eventId: null },
      { id: "node-a", nodeType: "action", eventId: "12" },
      { id: "node-b", nodeType: "condition", eventId: "26" },
      { id: "node-c", nodeType: "action", eventId: "event-1736-new" },
    ],
    edges: [
      { id: "e1", source: "node-trigger", target: "node-a" },
      { id: "e2", source: "node-a", target: "node-b" },
      { id: "e3", source: "node-b", target: "node-c" },
    ],
  },
  selectedWorkflowEventId: "26",
  selectedCanvasNodeId: "node-b",
});

test("an unsaved event is removed locally, a persisted one needs the provider", () => {
  const state = builderState();

  assert.equal(requiresProviderDeletion(findWorkflowEvent(state.events, "26")), true);
  assert.equal(requiresProviderDeletion(findWorkflowEvent(state.events, "12")), true);
  assert.equal(
    requiresProviderDeletion(findWorkflowEvent(state.events, "event-1736-new")),
    false,
    "an event Mautic has never seen is local only"
  );
  assert.equal(requiresProviderDeletion(null), false);
});

test("an event is found by its provider ID", () => {
  const state = builderState();

  assert.equal(findWorkflowEvent(state.events, "12").key, "email.send");
  assert.equal(findWorkflowEvent(state.events, 12).key, "email.send", "numeric id");
  assert.equal(findWorkflowEvent(state.events, "999"), null);
  assert.equal(findWorkflowEvent(undefined, "12"), null);
});

test("only the target event leaves; every other event keeps its configuration", () => {
  const next = removeWorkflowEventFromState(builderState(), "26");

  assert.deepEqual(
    next.events.map((event) => event.id),
    ["12", "23", "event-1736-new"]
  );
  assert.deepEqual(next.events[0].properties, { email: "23" });
  assert.deepEqual(next.events[1].properties, { add_tags: ["4"] });
  assert.deepEqual(next.events[2].properties, { points: 5 });
});

test("the canvas node standing for the event, and its connections, go with it", () => {
  const next = removeWorkflowEventFromState(builderState(), "26");

  assert.deepEqual(
    next.canvasNodes.map((node) => node.id),
    ["node-trigger", "node-a", "node-c"]
  );
  assert.deepEqual(
    next.canvasSettings.nodes.map((node) => node.id),
    ["node-trigger", "node-a", "node-c"]
  );
  // e2 and e3 both touched node-b and must not be left dangling.
  assert.deepEqual(
    next.canvasSettings.edges.map((edge) => edge.id),
    ["e1"]
  );
  assert.deepEqual(next.removedNodeIds, ["node-b"]);
});

test("connections are matched in provider form too", () => {
  const state = builderState();
  state.canvasSettings.edges = [
    { id: "e1", sourceId: "node-a", targetId: "node-b" },
    { id: "e2", sourceId: "node-trigger", targetId: "node-a" },
  ];

  const next = removeWorkflowEventFromState(state, "26");

  assert.deepEqual(
    next.canvasSettings.edges.map((edge) => edge.id),
    ["e2"]
  );
});

test("removing the selected event clears the selection", () => {
  const next = removeWorkflowEventFromState(builderState(), "26");

  assert.equal(next.selectedWorkflowEventId, "");
  assert.equal(next.selectedCanvasNodeId, "");
});

test("removing another event leaves the current selection alone", () => {
  const next = removeWorkflowEventFromState(builderState(), "12");

  assert.equal(next.selectedWorkflowEventId, "26");
  assert.equal(next.selectedCanvasNodeId, "node-b");
  assert.deepEqual(
    next.canvasNodes.map((node) => node.id),
    ["node-trigger", "node-b", "node-c"]
  );
});

test("an unsaved event is removed from state exactly like a persisted one", () => {
  const next = removeWorkflowEventFromState(builderState(), "event-1736-new");

  assert.deepEqual(
    next.events.map((event) => event.id),
    ["12", "23", "26"]
  );
  assert.deepEqual(next.removedNodeIds, ["node-c"]);
});

test("an event with no canvas node removes cleanly", () => {
  const state = builderState();
  state.canvasNodes = [];
  state.canvasSettings.nodes = [];
  state.canvasSettings.edges = [];

  const next = removeWorkflowEventFromState(state, "23");

  assert.deepEqual(
    next.events.map((event) => event.id),
    ["12", "26", "event-1736-new"]
  );
  assert.deepEqual(next.removedNodeIds, []);
});

test("an event whose provider capability is gone is still removable by ID", () => {
  const state = builderState();
  state.events.push({
    id: "31",
    key: "plugin.removed.action",
    properties: { legacy: "keep" },
    metadata: { providerMetadataAvailable: false },
  });

  assert.equal(requiresProviderDeletion(findWorkflowEvent(state.events, "31")), true);
  const next = removeWorkflowEventFromState(state, "31");
  assert.equal(findWorkflowEvent(next.events, "31"), null);
  assert.equal(next.events.length, 4);
});

test("removing an unknown id changes nothing", () => {
  const before = builderState();
  const next = removeWorkflowEventFromState(before, "999");

  assert.deepEqual(
    next.events.map((event) => event.id),
    before.events.map((event) => event.id)
  );
  assert.deepEqual(
    next.canvasSettings.edges.map((edge) => edge.id),
    ["e1", "e2", "e3"]
  );
  assert.equal(next.selectedWorkflowEventId, "26");
});

test("a failed provider deletion means no state change at all", () => {
  // The page only applies removeWorkflowEventFromState after the provider call
  // resolves, so the failure path is simply the untouched state.
  const before = builderState();
  const unchanged = {
    events: before.events.map((event) => event.id),
    nodes: before.canvasNodes.map((node) => node.id),
    selected: before.selectedWorkflowEventId,
  };

  assert.deepEqual(unchanged.events, ["12", "23", "26", "event-1736-new"]);
  assert.deepEqual(unchanged.nodes, ["node-trigger", "node-a", "node-b", "node-c"]);
  assert.equal(unchanged.selected, "26");
});

test("the original state object is not mutated", () => {
  const state = builderState();
  removeWorkflowEventFromState(state, "26");

  assert.equal(state.events.length, 4);
  assert.equal(state.canvasNodes.length, 4);
  assert.equal(state.canvasSettings.edges.length, 3);
  assert.equal(state.selectedWorkflowEventId, "26");
});
