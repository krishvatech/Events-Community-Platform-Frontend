// Campaign workflow graph: Mautic events <-> builder canvas.
//
// Mautic is the source of truth for the workflow. Each event names its parent
// event, and a child of a Condition or Decision also names the path it hangs
// off: decisionPath "yes" or "no". Mautic only runs such a child when that path
// is set (Event::getPositiveChildren / getNegativeChildren), and it reads both
// parent and path from the canvas connection anchors on save.
//
// On the canvas, an event is a node and a parent link is an edge. The YES/NO
// path is the edge's `sourceHandle`, so it is explicit graph data that survives
// layout changes, never something read from node positions. Delay nodes are a
// builder concept: a pure interval wait before an event.

import { getEventLabel, isPlainObject } from "./mauticCampaignEventHydration.js";
import { buildFlatExecutionEvents, executionEventId, persistedEventName } from "./mauticCampaignSavePayload.js";

export const BRANCH_PATHS = ["yes", "no"];
export const EVENT_NODE_TYPES = new Set(["action", "condition", "decision"]);
const BRANCHING_NODE_TYPES = new Set(["condition", "decision"]);

export const isBranchingNodeType = (nodeType) => BRANCHING_NODE_TYPES.has(String(nodeType || ""));
export const isBranchPath = (value) => BRANCH_PATHS.includes(value);

// The interval units Mautic accepts for event timing.
export const DELAY_UNIT_OPTIONS = [
  { value: "i", label: "Minutes" },
  { value: "h", label: "Hours" },
  { value: "d", label: "Days" },
  { value: "m", label: "Months" },
  { value: "y", label: "Years" },
];
const DELAY_UNITS = new Set(DELAY_UNIT_OPTIONS.map((option) => option.value));

export const readDelay = (node) => {
  const interval = Number(node?.delay?.interval);
  if (!Number.isFinite(interval) || interval <= 0) return null;
  const unit = node?.delay?.unit;
  return {
    interval,
    unit: DELAY_UNITS.has(unit) ? unit : "d",
  };
};

export const canvasNodeTypeLabel = (nodeType) =>
  ({ trigger: "Trigger", action: "Action", condition: "Condition", decision: "Decision", delay: "Delay" }[
    nodeType
  ] || "Node");

export const canvasNodeDescription = (node) => {
  const typeLabel = canvasNodeTypeLabel(node?.nodeType);
  return node?.eventId && node?.label ? `${typeLabel} "${node.label}"` : `${typeLabel} node`;
};

export const canvasEdgeId = (source, target, sourceHandle) =>
  sourceHandle ? `edge-${source}-${sourceHandle}-${target}` : `edge-${source}-${target}`;

/** The edge fields the builder keeps: identity, ends and the branch path. */
export const toCanvasEdge = (edge) => ({
  id: edge.id || canvasEdgeId(edge.source, edge.target, edge.sourceHandle),
  source: edge.source,
  target: edge.target,
  sourceHandle: isBranchPath(edge.sourceHandle) ? edge.sourceHandle : null,
});

/**
 * Apply what the canvas reports after a drag or delete: new positions and
 * removed nodes. Everything else a node carries (its delay, linked event and
 * type) stays as the builder holds it; the canvas does not carry it back.
 */
export const mergeReportedNodes = (currentNodes, reportedNodes) => {
  const reported = new Map((reportedNodes || []).map((n) => [n.id, n]));
  return (currentNodes || [])
    .filter((node) => reported.has(node.id))
    .map((node) => ({ ...node, position: reported.get(node.id).position || node.position }));
};

export const buildCanvasGraph = (canvasNodes, canvasEdges) => {
  const byId = new Map((canvasNodes || []).map((node) => [node.id, node]));
  const outgoing = new Map();
  const incoming = new Map();

  for (const edge of canvasEdges || []) {
    if (!byId.has(edge?.source) || !byId.has(edge?.target)) continue;
    if (!outgoing.has(edge.source)) outgoing.set(edge.source, []);
    outgoing.get(edge.source).push(edge);
    if (!incoming.has(edge.target)) incoming.set(edge.target, []);
    incoming.get(edge.target).push(edge.source);
  }

  return { byId, outgoing, incoming };
};

// --- timing -------------------------------------------------------------------

const persistedTiming = (event) => {
  const metadata = isPlainObject(event?.metadata) ? event.metadata : {};
  return {
    triggerMode: metadata.triggerMode || "",
    triggerInterval: metadata.triggerInterval,
    triggerIntervalUnit: metadata.triggerIntervalUnit || "",
    triggerDate: metadata.triggerDate || "",
  };
};

/** A saved wait the canvas shows as a Delay node: a plain interval. */
export const isDelayTiming = (timing) =>
  timing.triggerMode === "interval" &&
  Number(timing.triggerInterval) > 0 &&
  DELAY_UNITS.has(timing.triggerIntervalUnit);

/**
 * Saved timing the canvas cannot edit (a date, an optimized send, …). It is
 * sent back exactly as Mautic stored it, never replaced by "immediate".
 */
export const preservedTiming = (event) => {
  const timing = persistedTiming(event);
  if (!timing.triggerMode || timing.triggerMode === "immediate" || isDelayTiming(timing)) {
    return null;
  }
  const preserved = { triggerMode: timing.triggerMode };
  if (timing.triggerInterval != null && timing.triggerInterval !== "") {
    preserved.triggerInterval = timing.triggerInterval;
  }
  if (timing.triggerIntervalUnit) preserved.triggerIntervalUnit = timing.triggerIntervalUnit;
  if (timing.triggerDate) preserved.triggerDate = timing.triggerDate;
  return preserved;
};

export const timingLabel = (event) => {
  const preserved = preservedTiming(event);
  if (!preserved) return "";
  if (preserved.triggerMode === "date") return `Runs at ${preserved.triggerDate} (kept as saved)`;
  return `Timing: ${preserved.triggerMode} (kept as saved)`;
};

// --- canvas -> Mautic events ----------------------------------------------------

/**
 * Walk the canvas from its Trigger and produce the Mautic events to save.
 * Every event gets the parent event it follows and, below a Condition or
 * Decision, the path of the connection it hangs off. Anything ambiguous is an
 * error, never a guess: a save must not silently re-parent or flatten.
 */
export const mapCanvasToExecution = (canvasNodes, canvasEdges, form) => {
  const nodes = canvasNodes || [];
  if (!nodes.length) {
    // No canvas: every event hangs off the campaign source. Refused when the
    // events came from Mautic with a parent, which this would detach.
    const linked = (form.events || []).filter((event) => event?.metadata?.parent != null && event.metadata.parent !== "");
    return {
      events: buildFlatExecutionEvents(form.events || []),
      errors: linked.length
        ? ["The workflow graph is not loaded, so saving would detach its steps. Reload the campaign."]
        : [],
      nodeMap: new Map(),
      reachable: new Set(),
    };
  }

  const errors = [];
  const { byId, outgoing, incoming } = buildCanvasGraph(nodes, canvasEdges);
  const triggerNodes = nodes.filter((node) => node.nodeType === "trigger");
  if (!triggerNodes.length) {
    errors.push("Workflow must start with a Trigger node.");
  }

  for (const node of nodes) {
    if (node.nodeType !== "trigger" && (incoming.get(node.id) || []).length > 1) {
      errors.push(
        `${canvasNodeDescription(node)} has more than one incoming connection. A step can follow only one step.`
      );
    }
  }

  const executionEvents = [];
  const nodeMap = new Map();
  const reachable = new Set();
  let sequence = 0;

  // Walk forward from the trigger so each event learns its parent event and
  // path; a delay in between is folded into the next event.
  const queue = triggerNodes.map((node) => ({
    nodeId: node.id,
    parentEventId: null,
    path: null,
    delay: null,
  }));

  while (queue.length) {
    const { nodeId, parentEventId, path, delay } = queue.shift();
    if (reachable.has(nodeId)) continue;
    reachable.add(nodeId);

    const node = byId.get(nodeId);
    if (!node) continue;

    let nextParentEventId = parentEventId;
    let nextPath = path;
    let nextDelay = delay;
    const edges = outgoing.get(nodeId) || [];

    if (node.nodeType === "delay") {
      nextDelay = readDelay(node);
      if (!nextDelay) {
        errors.push(`${canvasNodeDescription(node)} needs a delay interval before it can be saved.`);
      }
      if (delay) {
        errors.push(`${canvasNodeDescription(node)} follows another delay. Combine them into one delay.`);
      }
      if (!edges.length) {
        errors.push(`${canvasNodeDescription(node)} has nothing after it — a delay must lead to an action.`);
      }
    } else if (EVENT_NODE_TYPES.has(node.nodeType)) {
      const event = form.events?.find((candidate) => candidate.id === node.eventId);
      if (!event) {
        errors.push(`${canvasNodeDescription(node)} has no linked event. Link one or remove the node.`);
      } else {
        sequence += 1;
        // Persisted events keep their provider ID so Mautic updates them in
        // place instead of creating a duplicate alongside the original.
        const executionId = executionEventId(event, sequence);
        const executionEvent = {
          id: executionId,
          name: persistedEventName(event) || getEventLabel(event.metadata),
          key: event.key,
          eventType: event.eventType,
          properties: isPlainObject(event.properties) ? event.properties : {},
          order: sequence,
          parent: parentEventId,
        };
        if (parentEventId && path) executionEvent.decisionPath = path;

        const preserved = preservedTiming(event);
        if (delay) {
          executionEvent.triggerMode = "interval";
          executionEvent.triggerInterval = delay.interval;
          executionEvent.triggerIntervalUnit = delay.unit;
        } else if (preserved) {
          Object.assign(executionEvent, preserved);
        } else {
          executionEvent.triggerMode = "immediate";
        }

        executionEvents.push(executionEvent);
        nodeMap.set(node.id, { executionId, event, nodeType: node.nodeType });
        nextParentEventId = executionId;
        nextPath = null;
        nextDelay = null;
      }
    }

    const branching = EVENT_NODE_TYPES.has(node.nodeType) && isBranchingNodeType(node.nodeType);
    for (const edge of edges) {
      let edgePath = nextPath;
      if (branching) {
        if (!isBranchPath(edge.sourceHandle)) {
          const target = byId.get(edge.target);
          errors.push(
            `The connection from ${canvasNodeDescription(node)} to ${canvasNodeDescription(target)} must use its YES or NO output.`
          );
        }
        edgePath = isBranchPath(edge.sourceHandle) ? edge.sourceHandle : null;
      } else if (isBranchPath(edge.sourceHandle)) {
        errors.push(`${canvasNodeDescription(node)} has no YES/NO outputs; reconnect its next step.`);
      }
      queue.push({
        nodeId: edge.target,
        parentEventId: nextParentEventId,
        path: edgePath,
        delay: nextDelay,
      });
    }
  }

  for (const node of nodes) {
    if (node.nodeType !== "trigger" && !reachable.has(node.id)) {
      errors.push(`${canvasNodeDescription(node)} is not connected to the trigger.`);
    }
  }

  // Every workflow event must be represented by a node, or Mautic receives an
  // event with no place in the graph and rejects the campaign as orphaned.
  const linkedEventIds = new Set(
    nodes
      .filter((node) => node.eventId && EVENT_NODE_TYPES.has(node.nodeType))
      .map((node) => node.eventId)
  );
  for (const event of form.events || []) {
    if (!linkedEventIds.has(event.id)) {
      errors.push(`Event "${getEventLabel(event.metadata)}" is not on the canvas. Link it to a node or remove it.`);
    }
  }

  if (!executionEvents.length && !errors.length) {
    errors.push("Workflow has no runnable step. Add an action after the trigger and link it to an event.");
  }

  return { events: executionEvents, errors: Array.from(new Set(errors)), nodeMap, reachable };
};

/**
 * The canvas Mautic stores for a save: Mautic's own graph only.
 *
 * One node per event, keyed by the id the save sends for it (a Mautic id, or
 * new_N for an event created by this save), carrying the builder's position,
 * plus the campaign source node ("lists" or "forms") at the Trigger's
 * position. No builder-only nodes and no connections: the backend draws each
 * event's connection from its parent and YES/NO path, so every stored node is
 * the target of a connection and Mautic's orphan rule (which refuses any later
 * change otherwise) always holds. The builder rebuilds Trigger and Delay nodes
 * from the events on load.
 */
export const toMauticCanvas = (canvasNodes, nodeMap, { lists = [], forms = [] } = {}) => {
  const point = (node) => ({
    positionX: String(Math.round(node?.position?.x ?? 0)),
    positionY: String(Math.round(node?.position?.y ?? 0)),
  });
  const nodes = [];
  const trigger = (canvasNodes || []).find((node) => node.nodeType === "trigger");
  const sourceId = lists.length ? "lists" : forms.length ? "forms" : null;
  if (sourceId && trigger) nodes.push({ id: sourceId, ...point(trigger) });
  for (const node of canvasNodes || []) {
    const mapped = nodeMap?.get(node.id);
    if (mapped) nodes.push({ id: String(mapped.executionId), ...point(node) });
  }
  return { nodes, connections: [] };
};

// --- Mautic events -> canvas ----------------------------------------------------

/** Stored canvas node ids Mautic's orphan rule rejects (Campaign::hasOrphanEvents). */
export const storedCanvasOrphans = (savedCanvas = {}) => {
  const nodes = Array.isArray(savedCanvas?.nodes) ? savedCanvas.nodes : [];
  const targets = new Set(
    (Array.isArray(savedCanvas?.connections) ? savedCanvas.connections : [])
      .map((connection) => String(connection?.targetId ?? ""))
      .filter(Boolean)
  );
  return nodes
    .map((node) => String(node?.id ?? ""))
    .filter((id) => id && id !== "lists" && id !== "forms" && !targets.has(id));
};

const hasPosition = (node) =>
  Boolean(node?.position) && Number.isFinite(node.position.x) && Number.isFinite(node.position.y);

const savedPosition = (node) => {
  if (!node) return null;
  if (hasPosition(node)) return node.position;
  const x = Number(node.positionX);
  const y = Number(node.positionY);
  return Number.isFinite(x) && Number.isFinite(y) && node.positionX !== undefined ? { x, y } : null;
};

const parentOf = (event) => {
  const parent = event?.metadata?.parent;
  return parent === null || parent === undefined || parent === "" ? null : String(parent);
};

/**
 * Rebuild the builder canvas from the campaign's Mautic events.
 *
 * Parent links and YES/NO paths come from Mautic, so what the canvas shows is
 * what Mautic will run. The canvas saved with the campaign only lends node
 * positions (and the ids of builder nodes, so their layout is kept).
 *
 * `blockers` lists structures the builder cannot represent faithfully; while
 * there are any, saving must be refused instead of approximating them. A child
 * of a Condition/Decision with no path is shown with an unassigned connection,
 * which the save validation then asks the user to resolve.
 */
export const hydrateCanvasFromEvents = (events, savedCanvas = {}) => {
  const list = Array.isArray(events) ? events : [];
  const blockers = [];
  if (!list.length) return { nodes: [], edges: [], blockers };

  const byEventId = new Map(list.map((event) => [String(event.id), event]));
  const describe = (event) => `"${event?.metadata?.name || getEventLabel(event?.metadata)}"`;

  for (const event of list) {
    if (!EVENT_NODE_TYPES.has(event.eventType)) {
      blockers.push(`Step ${describe(event)} has an event type (${event.eventType || "none"}) the builder cannot edit.`);
    }
    const parent = parentOf(event);
    const path = event?.metadata?.decisionPath;
    if (parent && !byEventId.has(parent)) {
      blockers.push(`Step ${describe(event)} follows a step that is not part of this campaign.`);
    }
    if (path !== null && path !== undefined && path !== "" && !isBranchPath(path)) {
      blockers.push(`Step ${describe(event)} has an unknown branch path "${path}".`);
    }
    if (isBranchPath(path) && parent && byEventId.has(parent) && !isBranchingNodeType(byEventId.get(parent).eventType)) {
      blockers.push(`Step ${describe(event)} is on a ${path.toUpperCase()} path of a step that has no YES/NO outputs.`);
    }
  }

  // Mautic validates a change against the canvas it already stores and refuses
  // any change while a stored node (other than the lists/forms sources) has no
  // connection leading to it. Earlier ECP saves stored such a Trigger node.
  const storedOrphans = storedCanvasOrphans(savedCanvas);
  if (storedOrphans.length) {
    blockers.push(
      `Mautic will refuse any change to this campaign: its saved canvas has ${storedOrphans.length === 1 ? "a step" : "steps"} with no incoming connection (${storedOrphans.join(", ")}), left by an earlier ECP save. To repair it, open the campaign in Mautic, choose Launch Campaign Builder, then Close Builder, then Save & Close (saving without opening the builder keeps the broken canvas), and reload this page.`
    );
  }

  // Cycles: Mautic graphs are trees; a loop could never be saved faithfully.
  for (const event of list) {
    const seen = new Set([String(event.id)]);
    let cursor = parentOf(event);
    while (cursor && byEventId.has(cursor)) {
      if (seen.has(cursor)) {
        blockers.push(`Step ${describe(event)} is part of a loop of steps.`);
        break;
      }
      seen.add(cursor);
      cursor = parentOf(byEventId.get(cursor));
    }
  }

  const savedNodes = Array.isArray(savedCanvas?.nodes) ? savedCanvas.nodes : [];
  const savedEdges = [...(savedCanvas?.edges || []), ...(savedCanvas?.connections || [])].map((edge) => ({
    source: edge?.source || edge?.sourceId,
    target: edge?.target || edge?.targetId,
  }));
  const builderNodes = savedNodes.filter((node) => node?.id && (node.nodeType || node.type) && !/^\d+$/.test(String(node.id)));
  const savedByEvent = new Map(
    builderNodes.filter((node) => node.eventId && byEventId.has(String(node.eventId))).map((node) => [String(node.eventId), node])
  );
  const savedTrigger = builderNodes.find((node) => (node.nodeType || node.type) === "trigger");
  const savedDelayBefore = new Map();
  for (const node of builderNodes) {
    if ((node.nodeType || node.type) !== "delay") continue;
    for (const edge of savedEdges) {
      const target = savedNodes.find((candidate) => candidate.id === edge.target);
      if (edge.source === node.id && target?.eventId && byEventId.has(String(target.eventId))) {
        savedDelayBefore.set(String(target.eventId), node);
      }
    }
  }
  // Mautic's own canvas nodes (keyed by event id, or the "lists"/"forms"
  // sources) hold the layout ECP saved, or the one drawn in Mautic.
  const providerNodes = savedNodes.filter(
    (node) => node?.id && (byEventId.has(String(node.id)) || node.id === "lists" || node.id === "forms")
  );
  const providerPosition = new Map(providerNodes.map((node) => [String(node.id), savedPosition(node)]));

  const nodes = [];
  const edges = [];
  const triggerId = savedTrigger?.id || "trigger";
  nodes.push({
    id: triggerId,
    type: "trigger",
    nodeType: "trigger",
    eventId: null,
    label: "Trigger",
    position: savedPosition(savedTrigger) || providerPosition.get("lists") || providerPosition.get("forms") || null,
  });

  const nodeIdFor = new Map();
  for (const event of list) {
    const id = String(event.id);
    const saved = savedByEvent.get(id);
    nodeIdFor.set(id, saved?.id || `event-${id}`);
  }

  for (const event of list) {
    const id = String(event.id);
    const nodeId = nodeIdFor.get(id);
    const saved = savedByEvent.get(id);
    nodes.push({
      id: nodeId,
      type: event.eventType,
      nodeType: event.eventType,
      eventId: id,
      label: event?.metadata?.name || getEventLabel(event.metadata),
      position: savedPosition(saved) || providerPosition.get(id) || null,
    });

    const parent = parentOf(event);
    const sourceId = parent && nodeIdFor.has(parent) ? nodeIdFor.get(parent) : triggerId;
    const parentEvent = parent ? byEventId.get(parent) : null;
    const path = event?.metadata?.decisionPath;
    const sourceHandle = parentEvent && isBranchingNodeType(parentEvent.eventType) && isBranchPath(path) ? path : null;

    const timing = persistedTiming(event);
    let targetOfParent = nodeId;
    if (isDelayTiming(timing)) {
      const savedDelay = savedDelayBefore.get(id);
      const delayId = savedDelay?.id || `delay-${id}`;
      nodes.push({
        id: delayId,
        type: "delay",
        nodeType: "delay",
        eventId: null,
        label: "Delay",
        delay: { interval: Number(timing.triggerInterval), unit: timing.triggerIntervalUnit },
        position: savedPosition(savedDelay) || null,
      });
      edges.push(toCanvasEdge({ source: delayId, target: nodeId }));
      targetOfParent = delayId;
    }
    edges.push(toCanvasEdge({ source: sourceId, target: targetOfParent, sourceHandle }));
  }

  return { nodes: layoutMissingPositions(nodes, edges, triggerId), edges, blockers };
};

/** Left-to-right tree layout for nodes that have no saved position. */
const layoutMissingPositions = (nodes, edges, rootId) => {
  const depth = new Map([[rootId, 0]]);
  const queue = [rootId];
  while (queue.length) {
    const current = queue.shift();
    for (const edge of edges) {
      if (edge.source === current && !depth.has(edge.target)) {
        depth.set(edge.target, depth.get(current) + 1);
        queue.push(edge.target);
      }
    }
  }
  const rows = new Map();
  return nodes.map((node) => {
    if (hasPosition(node)) return node;
    const level = depth.get(node.id) ?? 0;
    const row = rows.get(level) || 0;
    rows.set(level, row + 1);
    return { ...node, position: { x: 60 + level * 260, y: 80 + row * 150 } };
  });
};
