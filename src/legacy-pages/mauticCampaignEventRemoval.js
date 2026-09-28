// Removing a workflow event.
//
// An event the user just added exists only in this builder, so removing it is a
// local edit. An event Mautic has already assigned a provider ID to exists in the
// campaign, and only the provider can remove it — omitting it from a campaign
// update does not delete it.

import { asArray, isPlainObject } from "./mauticCampaignEventHydration.js";
import { isPersistedEventId } from "./mauticCampaignSavePayload.js";

export const requiresProviderDeletion = (event) => isPersistedEventId(event?.id);

export const findWorkflowEvent = (events, eventId) =>
  asArray(events).find((event) => String(event?.id) === String(eventId)) || null;

/**
 * The builder state after one event is gone: the event itself, the canvas node
 * that stood for it, and any connection touching that node. Everything else —
 * other events, their configuration, unrelated nodes and the current selection —
 * is left exactly as it was.
 */
export const removeWorkflowEventFromState = (state, eventId) => {
  const target = String(eventId);
  const events = asArray(state?.events).filter(
    (event) => String(event?.id) !== target
  );

  const removedNodeIds = new Set(
    asArray(state?.canvasNodes)
      .filter((node) => node && String(node.eventId) === target)
      .map((node) => node.id)
  );

  const keepNode = (node) => Boolean(node) && !removedNodeIds.has(node.id);
  const keepEdge = (edge) =>
    Boolean(edge) &&
    !removedNodeIds.has(edge.source ?? edge.sourceId) &&
    !removedNodeIds.has(edge.target ?? edge.targetId);

  const canvasSettings = isPlainObject(state?.canvasSettings)
    ? state.canvasSettings
    : { nodes: [], edges: [] };

  return {
    events,
    canvasNodes: asArray(state?.canvasNodes).filter(keepNode),
    canvasSettings: {
      ...canvasSettings,
      nodes: asArray(canvasSettings.nodes).filter(keepNode),
      edges: asArray(canvasSettings.edges).filter(keepEdge),
    },
    // A selection that pointed at what was removed has to let go; any other
    // selection is untouched.
    selectedWorkflowEventId:
      String(state?.selectedWorkflowEventId) === target
        ? ""
        : state?.selectedWorkflowEventId || "",
    selectedCanvasNodeId: removedNodeIds.has(state?.selectedCanvasNodeId)
      ? ""
      : state?.selectedCanvasNodeId || "",
    removedNodeIds: [...removedNodeIds],
  };
};
