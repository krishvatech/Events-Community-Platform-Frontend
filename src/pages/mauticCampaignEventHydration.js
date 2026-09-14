// Saved Mautic campaign events carry only provider-owned state (key/type,
// properties, trigger and graph data). Labels, formType and formSchema are
// runtime capability metadata that Mautic re-derives on every request and that
// we deliberately never persist. When an existing campaign is opened for
// editing we therefore rejoin each persisted event with the CURRENT capability
// definition by its provider event key.

export const isPlainObject = (value) =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const asArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return Object.values(value);
  return [];
};

export const getEventKey = (event) =>
  event?.key || event?.type || event?.eventType || "unknown";

export const getEventLabel = (event) =>
  event?.label || event?.name || getEventKey(event);

// Runtime-only fields: the live capability always wins for these, because they
// describe how the provider wants the event rendered right now.
export const RUNTIME_METADATA_KEYS = [
  "label",
  "description",
  "formType",
  "formTypeOptions",
  "formTheme",
  "formSchema",
  "channel",
  "channelIdField",
  "triggerModes",
  "category",
  "connectionRestrictions",
];

const CAPABILITY_GROUPS = [
  ["actions", "action"],
  ["conditions", "condition"],
  ["decisions", "decision"],
];

const indexKey = (eventType, key) =>
  `${String(eventType || "").toLowerCase()}::${String(key || "")}`;

export const buildCapabilityIndex = (capabilities) => {
  const index = new Map();
  if (!isPlainObject(capabilities)) return index;

  CAPABILITY_GROUPS.forEach(([field, defaultEventType]) => {
    asArray(capabilities[field]).forEach((capability) => {
      if (!isPlainObject(capability)) return;
      const key = getEventKey(capability);
      if (!key || key === "unknown") return;
      const eventType = capability.eventType || defaultEventType;
      index.set(indexKey(eventType, key), capability);
      // Key-only fallback for persisted events saved without an eventType.
      if (!index.has(indexKey("", key))) index.set(indexKey("", key), capability);
    });
  });

  return index;
};

export const findEventCapability = (capabilityIndex, event) => {
  if (!(capabilityIndex instanceof Map) || !capabilityIndex.size) return null;
  const key = getEventKey(event);
  if (!key || key === "unknown") return null;
  return (
    capabilityIndex.get(indexKey(event?.eventType, key)) ||
    capabilityIndex.get(indexKey("", key)) ||
    null
  );
};

export const isProviderMetadataUnavailable = (event) =>
  event?.metadata?.providerMetadataAvailable === false;

export const isProviderMetadataHydrated = (event) =>
  event?.metadata?.providerMetadataAvailable === true;

// Persisted provider state wins for everything editable; the live capability
// wins for schema/labels. Never mutates the capability object.
export const hydrateWorkflowEvent = (event, capabilityIndex) => {
  if (!isPlainObject(event)) return event;

  const persisted = isPlainObject(event.metadata) ? event.metadata : {};
  const capability = findEventCapability(capabilityIndex, event);

  if (!capability) {
    if (persisted.providerMetadataAvailable === false) return event;
    return {
      ...event,
      metadata: { ...persisted, providerMetadataAvailable: false },
      properties: isPlainObject(event.properties) ? event.properties : {},
    };
  }

  const runtime = {};
  RUNTIME_METADATA_KEYS.forEach((field) => {
    if (capability[field] !== undefined) runtime[field] = capability[field];
  });

  const unchanged =
    persisted.providerMetadataAvailable === true &&
    Object.entries(runtime).every(([field, value]) => persisted[field] === value);
  if (unchanged) return event;

  return {
    ...event,
    metadata: { ...persisted, ...runtime, providerMetadataAvailable: true },
    properties: isPlainObject(event.properties) ? event.properties : {},
  };
};

// Returns the same array instance when nothing changed so React can bail out of
// the re-render and the rehydration effect cannot loop.
export const hydrateWorkflowEvents = (events, capabilityIndex) => {
  if (!Array.isArray(events) || !events.length) return events;
  if (!(capabilityIndex instanceof Map) || !capabilityIndex.size) return events;

  let changed = false;
  const hydrated = events.map((event) => {
    const next = hydrateWorkflowEvent(event, capabilityIndex);
    if (next !== event) changed = true;
    return next;
  });

  return changed ? hydrated : events;
};
