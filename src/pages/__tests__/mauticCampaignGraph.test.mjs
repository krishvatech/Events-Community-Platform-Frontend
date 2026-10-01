import assert from "node:assert/strict";
import test from "node:test";

import {
  canvasEdgeId,
  hydrateCanvasFromEvents,
  mapCanvasToExecution,
  mergeReportedNodes,
  preservedTiming,
  storedCanvasOrphans,
  toMauticCanvas,
  toCanvasEdge,
} from "../mauticCampaignGraph.js";
import { buildEventsPayload, persistedEventName } from "../mauticCampaignSavePayload.js";

// Events exactly as the builder API returns them: provider state in metadata.
const ev = (id, eventType, { parent = null, path = null, mode = "immediate", interval = 0, unit = null, date = null, name } = {}) => ({
  id: String(id),
  key: `${eventType}.key`,
  eventType,
  properties: { marker: `p${id}` },
  metadata: {
    name: name || `Event ${id}`,
    parent: parent === null ? null : String(parent),
    decisionPath: path,
    triggerMode: mode,
    triggerInterval: interval,
    triggerIntervalUnit: unit,
    triggerDate: date,
  },
});

const hydrate = (events, saved) => hydrateCanvasFromEvents(events, saved);
const serialize = (graph, events) => mapCanvasToExecution(graph.nodes, graph.edges, { events });

/** The graph-significant view of saved events: id, parent, path and timing. */
const shape = (executionEvents) =>
  Object.fromEntries(
    executionEvents.map((event) => [
      event.id,
      {
        parent: event.parent ?? null,
        path: event.decisionPath ?? null,
        mode: event.triggerMode,
        interval: event.triggerInterval ?? null,
        unit: event.triggerIntervalUnit ?? null,
        date: event.triggerDate ?? null,
      },
    ])
  );

const sourceShape = (events) =>
  Object.fromEntries(
    events.map((event) => [
      event.id,
      {
        parent: event.metadata.parent,
        path: event.metadata.decisionPath,
        mode: event.metadata.triggerMode,
        // Non-immediate timing is sent back exactly as stored, a 0 included.
        interval: event.metadata.triggerMode === "immediate" ? null : event.metadata.triggerInterval ?? null,
        unit: event.metadata.triggerMode === "immediate" ? null : event.metadata.triggerIntervalUnit || null,
        date: event.metadata.triggerDate || null,
      },
    ])
  );

const roundTrip = (events, saved) => {
  const graph = hydrate(events, saved);
  assert.deepEqual(graph.blockers, []);
  const result = serialize(graph, events);
  assert.deepEqual(result.errors, []);
  return { graph, result };
};

const assertPreserved = (events, saved) => {
  const { result } = roundTrip(events, saved);
  assert.deepEqual(shape(result.events), sourceShape(events));
  return result;
};

// ---------------------------------------------------------------- hydration --

test("1 linear workflow round-trips", () => {
  assertPreserved([ev(1, "action"), ev(2, "action", { parent: 1 }), ev(3, "action", { parent: 2 })]);
});

test("2-4 Condition YES child, NO child and both paths round-trip", () => {
  assertPreserved([ev(10, "condition"), ev(11, "action", { parent: 10, path: "yes" })]);
  assertPreserved([ev(10, "condition"), ev(12, "action", { parent: 10, path: "no" })]);
  const events = [ev(10, "condition"), ev(11, "action", { parent: 10, path: "yes" }), ev(12, "action", { parent: 10, path: "no" })];
  const { graph } = roundTrip(events);
  const fromCondition = graph.edges.filter((edge) => edge.source === "event-10");
  assert.deepEqual(fromCondition.map((edge) => [edge.target, edge.sourceHandle]).sort(), [["event-11", "yes"], ["event-12", "no"]]);
  assertPreserved(events);
});

test("5-6 Decision YES and NO children round-trip", () => {
  assertPreserved([
    ev(20, "action"),
    ev(21, "decision", { parent: 20 }),
    ev(22, "action", { parent: 21, path: "yes" }),
    ev(23, "action", { parent: 21, path: "no", mode: "interval", interval: 3, unit: "d" }),
  ]);
});

test("7 nested branches round-trip", () => {
  assertPreserved([
    ev(30, "condition"),
    ev(31, "action", { parent: 30, path: "yes" }),
    ev(32, "condition", { parent: 30, path: "no" }),
    ev(33, "action", { parent: 32, path: "yes" }),
    ev(34, "action", { parent: 32, path: "no" }),
    ev(35, "action", { parent: 33 }),
  ]);
});

test("8 several root events stay roots", () => {
  const { result } = roundTrip([ev(40, "action"), ev(41, "decision"), ev(42, "action", { parent: 41, path: "yes" })]);
  assert.equal(result.events.find((event) => event.id === "40").parent, null);
  assert.equal(result.events.find((event) => event.id === "41").parent, null);
});

test("9 persisted event ids are kept, so Mautic updates instead of duplicating", () => {
  const { result } = roundTrip([ev(50, "condition"), ev(51, "action", { parent: 50, path: "yes" })]);
  assert.deepEqual(result.events.map((event) => event.id).sort(), ["50", "51"]);
  assert.equal(result.events.some((event) => String(event.id).startsWith("new_")), false);
});

test("multiple children on one path and on an action are kept", () => {
  assertPreserved([
    ev(60, "condition"),
    ev(61, "action", { parent: 60, path: "yes" }),
    ev(62, "action", { parent: 60, path: "yes" }),
    ev(63, "action", { parent: 61 }),
    ev(64, "action", { parent: 61 }),
  ]);
});

// ------------------------------------------------------------ serialization --

const node = (id, nodeType, extra = {}) => ({ id, nodeType, type: nodeType, eventId: null, position: { x: 0, y: 0 }, ...extra });
const edge = (source, target, sourceHandle) => toCanvasEdge({ source, target, sourceHandle });
const local = (id, eventType) => ({ id, key: `${eventType}.key`, eventType, properties: {}, metadata: { label: id } });

const drawnBranch = (yesHandle = "yes", noHandle = "no") => {
  const events = [local("c", "condition"), local("a", "action"), local("b", "action")];
  const nodes = [node("t", "trigger"), node("nc", "condition", { eventId: "c" }), node("na", "action", { eventId: "a" }), node("nb", "action", { eventId: "b" })];
  const edges = [edge("t", "nc"), edge("nc", "na", yesHandle), edge("nc", "nb", noHandle)];
  return { events, nodes, edges };
};

test("10-13 a drawn YES/NO graph produces parents and decision paths", () => {
  const { events, nodes, edges } = drawnBranch();
  const result = mapCanvasToExecution(nodes, edges, { events });
  assert.deepEqual(result.errors, []);
  const byKey = Object.fromEntries(result.events.map((event) => [event.name, event]));
  assert.equal(byKey.c.parent, null);
  assert.equal(byKey.a.parent, byKey.c.id);
  assert.equal(byKey.a.decisionPath, "yes");
  assert.equal(byKey.b.parent, byKey.c.id);
  assert.equal(byKey.b.decisionPath, "no");
  assert.ok(String(byKey.c.id).startsWith("new_"), "new events use temporary ids");
  // The path reaches the provider payload unchanged.
  const payload = buildEventsPayload(result.events);
  assert.deepEqual(payload.map((event) => [event.name, event.decisionPath ?? null]), [["c", null], ["a", "yes"], ["b", "no"]]);
});

test("14 moving nodes never changes branch semantics", () => {
  const { events, nodes, edges } = drawnBranch();
  const before = mapCanvasToExecution(nodes, edges, { events });
  // Swap the visual positions of the YES and NO children.
  const moved = nodes.map((n) => (n.id === "na" ? { ...n, position: { x: 900, y: 900 } } : n.id === "nb" ? { ...n, position: { x: -50, y: -50 } } : n));
  const after = mapCanvasToExecution(moved, edges, { events });
  assert.deepEqual(after.events, before.events);
});

test("15 an unconnected node is reported, not saved", () => {
  const { events, nodes, edges } = drawnBranch();
  const result = mapCanvasToExecution([...nodes, node("loose", "action", { eventId: "x" })], edges, {
    events: [...events, local("x", "action")],
  });
  assert.equal(result.errors.some((error) => error.includes("not connected to the trigger")), true);
});

test("reconnecting the YES child to NO changes its path explicitly", () => {
  const { events, nodes } = drawnBranch();
  const result = mapCanvasToExecution(nodes, [edge("t", "nc"), edge("nc", "na", "no"), edge("nc", "nb", "no")], { events });
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.events.filter((event) => event.parent).map((event) => event.decisionPath), ["no", "no"]);
});

test("deleting the YES child leaves the NO path untouched", () => {
  const events = [ev(70, "condition"), ev(71, "action", { parent: 70, path: "yes" }), ev(72, "action", { parent: 70, path: "no" })];
  const graph = hydrate(events);
  const remaining = events.filter((event) => event.id !== "71");
  const nodes = graph.nodes.filter((n) => n.eventId !== "71");
  const edges = graph.edges.filter((e) => e.target !== "event-71" && e.source !== "event-71");
  const result = mapCanvasToExecution(nodes, edges, { events: remaining });
  assert.deepEqual(result.errors, []);
  assert.deepEqual(shape(result.events), sourceShape(remaining));
});

test("edge ids and edge state keep the path", () => {
  assert.equal(canvasEdgeId("a", "b", "yes"), "edge-a-yes-b");
  assert.deepEqual(toCanvasEdge({ id: "x", source: "a", target: "b", sourceHandle: "no", label: "NO", style: {} }), {
    id: "x", source: "a", target: "b", sourceHandle: "no",
  });
  assert.equal(toCanvasEdge({ source: "a", target: "b", sourceHandle: "out" }).sourceHandle, null);
});

// --------------------------------------------------------------- round trip --

test("16-17 hydrate -> serialize -> hydrate -> serialize is stable", () => {
  const events = [
    ev(80, "condition"),
    ev(81, "action", { parent: 80, path: "yes", mode: "interval", interval: 2, unit: "h" }),
    ev(82, "decision", { parent: 80, path: "no" }),
    ev(83, "action", { parent: 82, path: "yes" }),
    ev(84, "action", { parent: 82, path: "no", mode: "date", date: "2030-01-15T09:30:00+00:00" }),
  ];
  const first = roundTrip(events).result.events;
  const reloaded = first.map((saved) => ev(saved.id, events.find((e) => e.id === saved.id).eventType, {
    parent: saved.parent, path: saved.decisionPath ?? null, mode: saved.triggerMode,
    interval: saved.triggerInterval ?? 0, unit: saved.triggerIntervalUnit ?? null, date: saved.triggerDate ?? null,
  }));
  const second = roundTrip(reloaded).result.events;
  assert.deepEqual(shape(second), shape(first));
  assert.deepEqual(shape(first), sourceShape(events));
});

test("18 a natively built Mautic campaign survives unchanged, names included", () => {
  // The exact shape of a campaign built in Mautic's own builder.
  const events = [
    ev(77, "condition", { name: "C1 city is yes" }),
    ev(78, "action", { parent: 77, path: "yes", name: "A1 tag yes" }),
    ev(79, "action", { parent: 77, path: "no", mode: "interval", interval: 2, unit: "d", name: "A2 tag no" }),
    ev(80, "action", { parent: 79, mode: "date", date: "2030-01-15T09:30:00+00:00", name: "A3 tag after no" }),
  ];
  const saved = { nodes: [{ id: "lists", positionX: "400", positionY: "50" }, { id: "77", positionX: "400", positionY: "200" }], connections: [{ sourceId: "lists", targetId: "77", anchors: { source: "leadsource", target: "top" } }] };
  const result = assertPreserved(events, saved);
  assert.deepEqual(result.events.map((event) => event.name), ["C1 city is yes", "A1 tag yes", "A2 tag no", "A3 tag after no"]);
  const graph = hydrate(events, saved);
  // Layout comes back from Mautic's own canvas nodes.
  assert.deepEqual(graph.nodes.find((n) => n.eventId === "77").position, { x: 400, y: 200 });
  assert.deepEqual(graph.nodes.find((n) => n.nodeType === "trigger").position, { x: 400, y: 50 });
});

test("the stored canvas is Mautic's own graph and always passes its orphan rule", () => {
  const events = [ev(1, "condition"), ev(2, "action", { parent: 1, path: "yes", mode: "interval", interval: 1, unit: "d" })];
  const graph = hydrate(events);
  const result = serialize(graph, events);
  const canvas = toMauticCanvas(graph.nodes, result.nodeMap, { lists: ["7"] });
  // Only the source and the event nodes, keyed by the ids the save sends;
  // Trigger and Delay are builder-only and rebuilt on load.
  assert.deepEqual(canvas.nodes.map((n) => n.id).sort(), ["1", "2", "lists"]);
  assert.deepEqual(canvas.connections, []);
  const trigger = graph.nodes.find((n) => n.nodeType === "trigger");
  assert.equal(canvas.nodes.find((n) => n.id === "lists").positionX, String(Math.round(trigger.position.x)));
  // New events are keyed by their temporary ids, which Mautic maps on save.
  const { events: fresh, nodes, edges } = drawnBranch();
  const drawn = mapCanvasToExecution(nodes, edges, { events: fresh });
  assert.deepEqual(toMauticCanvas(nodes, drawn.nodeMap, { forms: ["3"] }).nodes.map((n) => n.id), ["forms", "new_1", "new_2", "new_3"]);
});

test("timing Mautic stores but the canvas cannot edit is kept verbatim", () => {
  const optimized = ev(90, "action", { mode: "optimized" });
  assert.deepEqual(preservedTiming(optimized), { triggerMode: "optimized", triggerInterval: 0 });
  const result = assertPreserved([ev(89, "action"), { ...optimized, metadata: { ...optimized.metadata, parent: "89" } }]);
  assert.equal(result.events.find((event) => event.id === "90").triggerMode, "optimized");
  // Years are a valid Mautic interval unit and stay years.
  assertPreserved([ev(91, "action", { mode: "interval", interval: 1, unit: "y" })]);
});

test("a pure interval becomes a Delay node in front of its event", () => {
  const graph = hydrate([ev(92, "condition"), ev(93, "action", { parent: 92, path: "no", mode: "interval", interval: 5, unit: "i" })]);
  const delay = graph.nodes.find((n) => n.nodeType === "delay");
  assert.deepEqual(delay.delay, { interval: 5, unit: "i" });
  assert.deepEqual(graph.edges.map((e) => [e.source, e.target, e.sourceHandle]).sort(), [
    [delay.id, "event-93", null],
    ["event-92", delay.id, "no"],
    ["trigger", "event-92", null],
  ].sort());
});

test("saved builder positions are reused for the matching events", () => {
  const events = [ev(94, "action"), ev(95, "action", { parent: 94 })];
  const saved = { nodes: [{ id: "node-x", nodeType: "action", eventId: "94", position: { x: 11, y: 22 } }] };
  const graph = hydrate(events, saved);
  const reused = graph.nodes.find((n) => n.eventId === "94");
  assert.equal(reused.id, "node-x");
  assert.deepEqual(reused.position, { x: 11, y: 22 });
});

// ------------------------------------------------------------------- safety --

test("19 structures the builder cannot represent are blockers", () => {
  const cases = [
    [[ev(1, "action", { parent: 999 })], /not part of this campaign/],
    [[ev(1, "condition"), ev(2, "action", { parent: 1, path: "maybe" })], /unknown branch path/],
    [[ev(1, "action"), ev(2, "action", { parent: 1, path: "yes" })], /no YES\/NO outputs/],
    [[ev(1, "action", { parent: 2 }), ev(2, "action", { parent: 1 })], /loop/],
    [[{ ...ev(1, "action"), eventType: "source" }], /event type/],
  ];
  for (const [events, pattern] of cases) {
    const { blockers } = hydrate(events);
    assert.equal(blockers.some((blocker) => pattern.test(blocker)), true, String(pattern));
  }
});

test("20 a Condition child with no YES/NO path is shown and refused, not flattened", () => {
  // What earlier saves left behind: a child of a Condition with no path.
  const events = [ev(1, "condition"), ev(2, "action", { parent: 1 })];
  const graph = hydrate(events);
  assert.deepEqual(graph.blockers, []);
  assert.equal(graph.edges.find((e) => e.target === "event-2").sourceHandle, null);
  const result = serialize(graph, events);
  assert.equal(result.errors.some((error) => error.includes("must use its YES or NO output")), true);
});

test("a step with two incoming connections is refused", () => {
  const { events, nodes, edges } = drawnBranch();
  const result = mapCanvasToExecution(nodes, [...edges, edge("na", "nb")], { events });
  assert.equal(result.errors.some((error) => error.includes("more than one incoming connection")), true);
});

test("a YES/NO handle on a step that has none, and two delays in a row, are refused", () => {
  const events = [local("a", "action"), local("b", "action")];
  const nodes = [node("t", "trigger"), node("na", "action", { eventId: "a" }), node("nb", "action", { eventId: "b" })];
  const wrongHandle = mapCanvasToExecution(nodes, [edge("t", "na"), edge("na", "nb", "yes")], { events });
  assert.equal(wrongHandle.errors.some((error) => error.includes("has no YES/NO outputs")), true);

  const delays = [node("d1", "delay", { delay: { interval: 1, unit: "d" } }), node("d2", "delay", { delay: { interval: 2, unit: "d" } })];
  const chained = mapCanvasToExecution([...nodes, ...delays], [edge("t", "d1"), edge("d1", "d2"), edge("d2", "na"), edge("na", "nb")], { events });
  assert.equal(chained.errors.some((error) => error.includes("follows another delay")), true);
});

test("without a canvas, events loaded with a parent are never flattened", () => {
  const result = mapCanvasToExecution([], [], { events: [ev(1, "condition"), ev(2, "action", { parent: 1, path: "yes" })] });
  assert.equal(result.errors.some((error) => error.includes("would detach its steps")), true);
  // A brand-new campaign driven by the Workflow Events tab still works.
  const fresh = mapCanvasToExecution([], [], { events: [local("a", "action")] });
  assert.deepEqual(fresh.errors, []);
});

test("persisted events keep their own name; new events use the provider label", () => {
  assert.equal(persistedEventName(ev(5, "action", { name: "Custom name" })), "Custom name");
  assert.equal(persistedEventName(local("event-123-abc", "action")), "");
});

test("dragging nodes keeps each node's delay, event and type", () => {
  const current = [
    node("t", "trigger"),
    node("d", "delay", { delay: { interval: 2, unit: "d" } }),
    node("a", "decision", { eventId: "5" }),
  ];
  // What the canvas reports after a drag: ids and positions only, one removed.
  const reported = [
    { id: "t", position: { x: 1, y: 1 }, data: { nodeType: "trigger" } },
    { id: "d", position: { x: 300, y: 40 }, data: { nodeType: "delay" } },
  ];
  assert.deepEqual(mergeReportedNodes(current, reported), [
    { ...current[0], position: { x: 1, y: 1 } },
    { ...current[1], position: { x: 300, y: 40 } },
  ]);
});

test("a stored canvas Mautic's orphan rule rejects is detected and blocks saving", () => {
  // Mautic refuses any change while a stored node has no incoming connection.
  const saved = {
    nodes: [{ id: "t", nodeType: "trigger" }, { id: "lists" }, { id: "1" }],
    connections: [{ sourceId: "lists", targetId: "1" }],
  };
  assert.deepEqual(storedCanvasOrphans(saved), ["t"]);
  assert.deepEqual(storedCanvasOrphans({ nodes: [{ id: "lists" }, { id: "1" }], connections: [{ targetId: "1" }] }), []);
  const { blockers } = hydrate([ev(1, "action")], saved);
  assert.equal(blockers.some((blocker) => blocker.includes("Mautic will refuse any change")), true);
});
