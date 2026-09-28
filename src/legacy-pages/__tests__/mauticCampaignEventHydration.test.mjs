import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCapabilityIndex,
  getEventLabel,
  hydrateWorkflowEvent,
  hydrateWorkflowEvents,
  isProviderMetadataHydrated,
  isProviderMetadataUnavailable,
} from "../mauticCampaignEventHydration.js";

const emailSendCapability = () => ({
  key: "email.send",
  type: "email.send",
  eventType: "action",
  label: "Send email",
  formType: "Mautic\\EmailBundle\\Form\\Type\\EmailSendType",
  formSchema: {
    available: true,
    fields: [
      {
        name: "email",
        label: "Email to send",
        required: true,
        renderable: true,
        choices: [
          { label: "Create new...", value: "new" },
          { label: "en", choices: [{ label: "QA Campaign Builder Email (23)", value: "23" }] },
        ],
      },
    ],
  },
});

const capabilities = () => ({
  actions: [emailSendCapability()],
  conditions: [],
  decisions: [],
});

// The shape the builder API returns for a saved campaign: provider-owned state
// only, with no runtime label/formType/formSchema.
const savedEmailSendEvent = () => ({
  id: "12",
  key: "email.send",
  eventType: "action",
  properties: { email: "23" },
  metadata: {
    id: "12",
    name: "Send email",
    type: "email.send",
    eventType: "action",
    order: 1,
    parent: null,
    triggerMode: null,
    triggerInterval: 0,
    properties: { email: "23" },
  },
});

test("CASE 1: a saved event is rejoined with current provider metadata", () => {
  const index = buildCapabilityIndex(capabilities());
  const hydrated = hydrateWorkflowEvent(savedEmailSendEvent(), index);

  assert.equal(getEventLabel(hydrated.metadata), "Send email");
  assert.equal(
    hydrated.metadata.formType,
    "Mautic\\EmailBundle\\Form\\Type\\EmailSendType"
  );
  assert.equal(hydrated.metadata.formSchema.available, true);
  assert.equal(hydrated.metadata.formSchema.fields[0].name, "email");
  assert.equal(isProviderMetadataHydrated(hydrated), true);

  // Persisted values win for everything editable.
  assert.deepEqual(hydrated.properties, { email: "23" });
  assert.equal(hydrated.id, "12");
  assert.equal(hydrated.metadata.order, 1);
  assert.equal(hydrated.metadata.triggerInterval, 0);
  assert.equal(hydrated.metadata.parent, null);
});

test("CASE 1: hydration never mutates the capability or the persisted event", () => {
  const runtimeCapabilities = capabilities();
  const index = buildCapabilityIndex(runtimeCapabilities);
  const saved = savedEmailSendEvent();
  const hydrated = hydrateWorkflowEvent(saved, index);

  hydrated.properties = { email: "99" };
  assert.deepEqual(saved.properties, { email: "23" });
  assert.deepEqual(runtimeCapabilities.actions[0], emailSendCapability());
  assert.equal(saved.metadata.formType, undefined);
});

test("CASE 2: campaign arrives before capabilities, then rehydrates", () => {
  const emptyIndex = buildCapabilityIndex(null);
  const events = [savedEmailSendEvent()];

  const beforeCapabilities = hydrateWorkflowEvents(events, emptyIndex);
  assert.equal(beforeCapabilities, events, "must not mark events unknown yet");
  assert.equal(isProviderMetadataHydrated(beforeCapabilities[0]), false);
  assert.equal(isProviderMetadataUnavailable(beforeCapabilities[0]), false);

  const afterCapabilities = hydrateWorkflowEvents(
    beforeCapabilities,
    buildCapabilityIndex(capabilities())
  );
  assert.equal(getEventLabel(afterCapabilities[0].metadata), "Send email");
  assert.deepEqual(afterCapabilities[0].properties, { email: "23" });
});

test("CASE 3: capabilities arrive before the campaign, same hydrated result", () => {
  const index = buildCapabilityIndex(capabilities());
  const fromLoad = hydrateWorkflowEvents([savedEmailSendEvent()], index);
  const fromEffect = hydrateWorkflowEvents(
    hydrateWorkflowEvents([savedEmailSendEvent()], buildCapabilityIndex(null)),
    index
  );

  assert.deepEqual(fromLoad[0], fromEffect[0]);
});

test("hydration is idempotent and returns the same array when unchanged", () => {
  const index = buildCapabilityIndex(capabilities());
  const once = hydrateWorkflowEvents([savedEmailSendEvent()], index);
  const twice = hydrateWorkflowEvents(once, index);

  assert.equal(twice, once, "re-running hydration must not create new state");
});

test("CASE 4: an unknown provider event keeps its properties and is flagged", () => {
  const saved = {
    id: "44",
    key: "plugin.removed.action",
    eventType: "action",
    properties: { legacyField: "keep-me", count: 0 },
    metadata: { id: "44", name: "Removed action", type: "plugin.removed.action" },
  };

  const hydrated = hydrateWorkflowEvent(saved, buildCapabilityIndex(capabilities()));

  assert.equal(isProviderMetadataUnavailable(hydrated), true);
  assert.deepEqual(hydrated.properties, { legacyField: "keep-me", count: 0 });
  assert.equal(hydrated.key, "plugin.removed.action");
  assert.equal(hydrated.metadata.name, "Removed action");
  assert.equal(hydrated.metadata.formType, undefined);

  // Stable: flagging it again must not churn state.
  assert.equal(
    hydrateWorkflowEvent(hydrated, buildCapabilityIndex(capabilities())),
    hydrated
  );
});

test("CASE 5: legacy formTypeOptions capabilities still hydrate", () => {
  const legacy = {
    actions: [
      {
        key: "lead.changepoints",
        eventType: "action",
        label: "Adjust contact points",
        formType: "Mautic\\LeadBundle\\Form\\Type\\PointActionType",
        formTypeOptions: { points: { required: true } },
      },
    ],
  };

  const hydrated = hydrateWorkflowEvent(
    {
      id: "7",
      key: "lead.changepoints",
      eventType: "action",
      properties: { points: 5 },
      metadata: { id: "7", type: "lead.changepoints" },
    },
    buildCapabilityIndex(legacy)
  );

  assert.equal(hydrated.metadata.formSchema, undefined);
  assert.deepEqual(hydrated.metadata.formTypeOptions, { points: { required: true } });
  assert.equal(getEventLabel(hydrated.metadata), "Adjust contact points");
  assert.deepEqual(hydrated.properties, { points: 5 });
});

test("CASE 6: false, 0 and empty-list provider values survive hydration", () => {
  const properties = {
    email: "23",
    enabled: false,
    attempts: 0,
    tags: [],
    nested: { flag: false, items: [] },
  };

  const hydrated = hydrateWorkflowEvent(
    { id: "12", key: "email.send", eventType: "action", properties, metadata: {} },
    buildCapabilityIndex(capabilities())
  );

  assert.deepEqual(hydrated.properties, properties);
});

test("events saved without an eventType still match by provider key", () => {
  const hydrated = hydrateWorkflowEvent(
    { id: "12", key: "email.send", properties: { email: "23" }, metadata: {} },
    buildCapabilityIndex(capabilities())
  );

  assert.equal(hydrated.metadata.label, "Send email");
});

test("a capability for another event type is never matched", () => {
  const hydrated = hydrateWorkflowEvent(
    { id: "12", key: "email.send", eventType: "condition", properties: {}, metadata: {} },
    buildCapabilityIndex({
      actions: [emailSendCapability()],
      conditions: [
        { key: "email.open", eventType: "condition", label: "Opened email" },
      ],
    })
  );

  // Key-only fallback resolves to the one capability with this key, not to a
  // different event that happens to share the requested event type.
  assert.equal(hydrated.metadata.label, "Send email");
});
