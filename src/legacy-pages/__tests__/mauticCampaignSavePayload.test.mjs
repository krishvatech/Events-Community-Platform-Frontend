import assert from "node:assert/strict";
import test from "node:test";

import {
  buildEventsPayload,
  buildFlatExecutionEvents,
  executionEventId,
  isEcpCanvasNode,
  isPersistedEventId,
  persistedTriggerFields,
  toEventPayload,
} from "../mauticCampaignSavePayload.js";

// A saved event as the builder holds it after hydration.
const persistedEmailSend = () => ({
  id: "12",
  key: "email.send",
  eventType: "action",
  properties: { email: "23" },
  metadata: {
    id: "12",
    name: "Send email",
    type: "email.send",
    label: "Send email",
    order: 1,
    triggerMode: null,
    triggerInterval: 0,
  },
});

// An event just added from the capability picker: no provider ID yet.
const newChangeTags = () => ({
  id: "event-1736-abc123",
  key: "lead.changetags",
  eventType: "action",
  properties: { add_tags: ["4"], remove_tags: [] },
  metadata: {
    key: "lead.changetags",
    label: "Modify contact's tags",
    eventType: "action",
    providerMetadataAvailable: true,
  },
});

test("provider IDs are recognised, UI-local IDs are not", () => {
  assert.equal(isPersistedEventId("12"), true);
  assert.equal(isPersistedEventId(12), true);
  assert.equal(isPersistedEventId("event-1736-abc123"), false);
  assert.equal(isPersistedEventId("new_2"), false);
  assert.equal(isPersistedEventId(""), false);
  assert.equal(isPersistedEventId(undefined), false);
});

test("a persisted event keeps its ID, a new one gets a temp ID", () => {
  assert.equal(executionEventId(persistedEmailSend(), 1), "12");
  assert.equal(executionEventId(newChangeTags(), 2), "new_2");
});

test("THE BUG: an existing event plus a newly added one yields two events", () => {
  const payload = buildEventsPayload(
    buildFlatExecutionEvents([persistedEmailSend(), newChangeTags()])
  );

  assert.equal(payload.length, 2);
  assert.deepEqual(
    payload.map((event) => event.key),
    ["email.send", "lead.changetags"]
  );
  assert.deepEqual(
    payload.map((event) => event.id),
    ["12", "new_2"]
  );
  assert.deepEqual(payload[0].properties, { email: "23" });
  assert.deepEqual(payload[1].properties, { add_tags: ["4"], remove_tags: [] });
});

test("every event in the payload carries an id, so none is ignored", () => {
  const payload = buildEventsPayload(
    buildFlatExecutionEvents([persistedEmailSend(), newChangeTags(), newChangeTags()])
  );

  assert.deepEqual(
    payload.map((event) => event.id),
    ["12", "new_2", "new_3"]
  );
  payload.forEach((event) => {
    assert.ok(event.id, "an event without an id is dropped by the provider");
    assert.ok(event.name);
    assert.equal(typeof event.order, "number");
  });
});

test("two new events are both sent", () => {
  const payload = buildEventsPayload(
    buildFlatExecutionEvents([newChangeTags(), newChangeTags()])
  );

  assert.deepEqual(
    payload.map((event) => event.id),
    ["new_1", "new_2"]
  );
});

test("events of different provider types do not overwrite each other", () => {
  const condition = {
    id: "9",
    key: "lead.field_value",
    eventType: "condition",
    properties: { field: "country" },
    metadata: { label: "Contact field value" },
  };

  const payload = buildEventsPayload(
    buildFlatExecutionEvents([condition, persistedEmailSend(), newChangeTags()])
  );

  assert.deepEqual(
    payload.map((event) => [event.id, event.key, event.eventType]),
    [
      ["9", "lead.field_value", "condition"],
      ["12", "email.send", "action"],
      ["new_3", "lead.changetags", "action"],
    ]
  );
});

test("two events of the same provider type both survive", () => {
  const payload = buildEventsPayload(
    buildFlatExecutionEvents([persistedEmailSend(), { ...persistedEmailSend(), id: "event-x" }])
  );

  assert.deepEqual(
    payload.map((event) => [event.id, event.key]),
    [
      ["12", "email.send"],
      ["new_2", "email.send"],
    ]
  );
});

test("ordering is preserved as shown in the Workflow Events tab", () => {
  const payload = buildEventsPayload(
    buildFlatExecutionEvents([newChangeTags(), persistedEmailSend()])
  );

  assert.deepEqual(
    payload.map((event) => [event.id, event.order]),
    [
      ["new_1", 1],
      ["12", 2],
    ]
  );
});

test("string, number, boolean false and empty-list properties all survive", () => {
  const properties = {
    email: "23",
    attempts: 3,
    notify: false,
    remove_tags: [],
    nested: { flag: false, items: [] },
  };

  const payload = buildEventsPayload(
    buildFlatExecutionEvents([{ ...persistedEmailSend(), properties }])
  );

  assert.deepEqual(payload[0].properties, properties);
});

test("a persisted delay keeps its trigger timing", () => {
  const delayed = {
    ...persistedEmailSend(),
    metadata: {
      ...persistedEmailSend().metadata,
      triggerMode: "interval",
      triggerInterval: 3,
      triggerIntervalUnit: "d",
    },
  };

  assert.deepEqual(persistedTriggerFields(delayed), {
    triggerMode: "interval",
    triggerInterval: 3,
    triggerIntervalUnit: "d",
  });

  const payload = buildEventsPayload(buildFlatExecutionEvents([delayed]));
  assert.equal(payload[0].triggerMode, "interval");
  assert.equal(payload[0].triggerInterval, 3);
  assert.equal(payload[0].triggerIntervalUnit, "d");
});

test("an event with no stored timing defaults to immediate", () => {
  assert.deepEqual(persistedTriggerFields(newChangeTags()), {
    triggerMode: "immediate",
  });
});

test("canvas-mapped events keep parent links and IDs in the payload", () => {
  // Shape produced by the canvas mapper: persisted parent, new child.
  const payload = buildEventsPayload([
    {
      id: "12",
      name: "Send email",
      key: "email.send",
      eventType: "action",
      properties: { email: "23" },
      order: 1,
      parent: null,
      triggerMode: "immediate",
    },
    {
      id: "new_2",
      name: "Modify contact's tags",
      key: "lead.changetags",
      eventType: "action",
      properties: { add_tags: ["4"] },
      order: 2,
      parent: "12",
      triggerMode: "interval",
      triggerInterval: 2,
      triggerIntervalUnit: "d",
    },
  ]);

  assert.equal(payload[0].parent, null);
  assert.equal(payload[1].parent, "12");
  assert.equal(payload[1].triggerInterval, 2);
});

test("only this builder's own canvas nodes are treated as canvas nodes", () => {
  assert.equal(isEcpCanvasNode({ id: "node-1", nodeType: "trigger" }), true);
  assert.equal(isEcpCanvasNode({ id: "node-2", type: "delay" }), true);
  // The provider-native graph Django adds: keyed by event id, no nodeType.
  assert.equal(isEcpCanvasNode({ id: "12", positionX: "380" }), false);
  assert.equal(isEcpCanvasNode({ id: "lists", positionX: "380" }), false);
  assert.equal(isEcpCanvasNode(null), false);
});

test("toEventPayload never sends children, which the provider rebuilds", () => {
  const payload = toEventPayload({
    id: "12",
    key: "email.send",
    eventType: "action",
    properties: { email: "23" },
    order: 1,
    children: ["13"],
  });

  assert.equal("children" in payload, false);
  assert.equal(payload.id, "12");
});
