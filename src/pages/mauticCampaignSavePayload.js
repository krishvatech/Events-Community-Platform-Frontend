// Outgoing Campaign save payload rules.
//
// Mautic owns campaign event identity: a persisted event has a numeric provider
// ID and must be sent back under that ID so the provider updates it in place,
// while an event added in the UI has no provider ID yet and is sent under a
// `new_N` temporary ID that Mautic swaps for a real one on save. Dropping either
// kind of ID makes the provider either duplicate or ignore the event.

import { getEventLabel, isPlainObject } from "./mauticCampaignEventHydration.js";

export const isPersistedEventId = (id) => /^\d+$/.test(String(id ?? "").trim());

// Canvas nodes are an ECP concept; the provider-native canvas that Django adds
// is keyed by event ID and carries no nodeType, so it is filtered out on read.
export const ECP_CANVAS_NODE_TYPES = new Set([
  "trigger",
  "action",
  "condition",
  "decision",
  "delay",
]);

export const isEcpCanvasNode = (node) =>
  Boolean(node) && ECP_CANVAS_NODE_TYPES.has(node.nodeType || node.type);

export const executionEventId = (event, sequence) =>
  isPersistedEventId(event?.id) ? String(event.id) : `new_${sequence}`;

// Keep whatever timing the provider already stored; only fall back to immediate.
export const persistedTriggerFields = (event) => {
  const metadata = isPlainObject(event?.metadata) ? event.metadata : {};
  const trigger = {};

  if (metadata.triggerMode) trigger.triggerMode = metadata.triggerMode;
  if (metadata.triggerInterval) {
    trigger.triggerMode = metadata.triggerMode || "interval";
    trigger.triggerInterval = metadata.triggerInterval;
    trigger.triggerIntervalUnit = metadata.triggerIntervalUnit || "d";
  }
  if (metadata.triggerDate) {
    trigger.triggerMode = metadata.triggerMode || "date";
    trigger.triggerDate = metadata.triggerDate;
  }

  return Object.keys(trigger).length ? trigger : { triggerMode: "immediate" };
};

// Used when the campaign has no canvas: every event hangs off the campaign
// source, in the order the Workflow Events tab shows them.
export const buildFlatExecutionEvents = (events) =>
  (Array.isArray(events) ? events : []).map((event, index) => ({
    id: executionEventId(event, index + 1),
    name: getEventLabel(event?.metadata),
    key: event?.key,
    eventType: event?.eventType,
    properties: isPlainObject(event?.properties) ? event.properties : {},
    order: index + 1,
    parent: null,
    ...persistedTriggerFields(event),
  }));

// `children` is rebuilt provider-side and must not be sent.
export const toEventPayload = (workflowEvent) => {
  const payload = {
    id: workflowEvent?.id,
    name: workflowEvent?.name,
    key: workflowEvent?.key,
    eventType: workflowEvent?.eventType,
    properties: isPlainObject(workflowEvent?.properties)
      ? workflowEvent.properties
      : {},
    order: workflowEvent?.order,
    parent: workflowEvent?.parent ?? null,
  };

  if (workflowEvent?.triggerMode) payload.triggerMode = workflowEvent.triggerMode;
  if (workflowEvent?.triggerInterval) {
    payload.triggerInterval = workflowEvent.triggerInterval;
    payload.triggerIntervalUnit = workflowEvent.triggerIntervalUnit;
  }
  if (workflowEvent?.triggerDate) payload.triggerDate = workflowEvent.triggerDate;
  if (workflowEvent?.decisionPath) payload.decisionPath = workflowEvent.decisionPath;

  return payload;
};

export const buildEventsPayload = (executionEvents) =>
  (Array.isArray(executionEvents) ? executionEvents : []).map(toEventPayload);
