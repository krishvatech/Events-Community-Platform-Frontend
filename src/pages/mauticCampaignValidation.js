// What has to be true before a campaign may be saved.
//
// Every rule is derived from the provider's own form schema at runtime — no event
// type is named here, so an event Mautic adds tomorrow is validated the same way.
// Messages are written for the person configuring the campaign, not for the API.

import { asArray, getEventLabel, isPlainObject } from "./mauticCampaignEventHydration.js";
import {
  findChoiceByValue,
  getEventPropertyFields,
  getNestedValue,
  isSelectableEntityChoice,
  optionValue,
} from "./mauticCampaignFields.js";

export const CAMPAIGN_SAVE = "save";
export const CAMPAIGN_PUBLISH = "publish";
export const CAMPAIGN_UNPUBLISH = "unpublish";

/**
 * Unpublishing is how an administrator switches a campaign off, and a published
 * campaign is exactly where stale provider configuration shows up — an email
 * deleted, a segment gone, a plugin capability withdrawn. None of that may stand
 * between the administrator and the off switch, so the workflow is not validated
 * (and not resubmitted) when a campaign is being unpublished.
 */
export const requiresWorkflowValidation = (action) => action !== CAMPAIGN_UNPUBLISH;

export const isBlankValue = (value) =>
  value === undefined ||
  value === null ||
  value === "" ||
  (Array.isArray(value) && value.length === 0) ||
  (isPlainObject(value) && Object.keys(value).length === 0);

const fieldValue = (event, field) => getNestedValue(event?.properties, field.path);

/**
 * A provider UI command standing in a choice list — Mautic's "Create new…" entry
 * — is an instruction to the browser, not a selection, so it configures nothing.
 */
export const isProviderCommandValue = (field, value) => {
  if (!field?.entity || isBlankValue(value)) return false;
  const choice = findChoiceByValue(field.choices, value);
  return Boolean(choice) && !isSelectableEntityChoice(choice);
};

const isConfigured = (event, field) => {
  const value = fieldValue(event, field);
  if (isBlankValue(value)) return false;

  const selected = Array.isArray(value) ? value : [value];
  return selected
    .filter((item) => !isBlankValue(item))
    .some((item) => !isProviderCommandValue(field, item));
};

const eventName = (event) => getEventLabel(event?.metadata) || "Workflow event";

const listLabels = (fields) => fields.map((field) => field.label).join(" or ");

const isNumericValue = (value) =>
  typeof value !== "boolean" &&
  !Array.isArray(value) &&
  !isPlainObject(value) &&
  String(value).trim() !== "" &&
  Number.isFinite(Number(value));

/**
 * One event's problems, in the order a user would fix them.
 *
 * @returns {Array<{eventId: string, path: string, message: string}>}
 */
export const validateWorkflowEvent = (event) => {
  const fields = getEventPropertyFields(event);
  if (!fields.length) return [];

  const issues = [];
  const problem = (field, message) =>
    issues.push({ eventId: String(event?.id ?? ""), path: field?.path ?? "", message });

  const requiredFields = fields.filter((field) => field.required === true);

  requiredFields.forEach((field) => {
    if (!isConfigured(event, field)) {
      problem(field, `${eventName(event)}: ${field.label} is required.`);
    }
  });

  // No field is individually required, so the event itself carries the rule: a
  // step that does nothing is not a step. Which fields count comes from the
  // schema, so "add or remove tags" reads correctly without naming that event.
  if (!requiredFields.length && !fields.some((field) => isConfigured(event, field))) {
    issues.push({
      eventId: String(event?.id ?? ""),
      path: fields[0].path,
      message: `${eventName(event)}: choose at least one of ${listLabels(fields)}.`,
    });
  }

  fields.forEach((field) => {
    if (!isConfigured(event, field)) return;
    const value = fieldValue(event, field);

    if (field.kind === "number" && !isNumericValue(value)) {
      problem(field, `${eventName(event)}: ${field.label} must be a number.`);
      return;
    }

    // Only inline choices can be checked here; a remote field's options live on
    // the provider and are validated there.
    if (field.kind === "select" && !field.remote && field.choices?.length) {
      // The same accessor the renderer uses, so what is offered and what is
      // accepted can only ever be the same thing.
      const allowed = new Set(field.choices.map((choice) => String(optionValue(choice))));
      const selected = Array.isArray(value) ? value : [value];
      const unknown = selected
        .filter((item) => !isBlankValue(item))
        .filter((item) => !allowed.has(String(item)));
      if (unknown.length) {
        problem(
          field,
          `${eventName(event)}: ${field.label} has a value that Mautic no longer offers.`
        );
      }
    }
  });

  return issues;
};

export const EVENT_STATUS_NO_CONFIGURATION = "no-configuration";
export const EVENT_STATUS_CONFIGURED = "configured";
export const EVENT_STATUS_NEEDS_CONFIGURATION = "needs-configuration";

/**
 * How an event reads on its badge — the same three answers the save-time
 * validator gives, so the badge can never disagree with the save.
 *
 * An event with nothing to configure is finished as it stands; an event with
 * fields is either valid or still needs attention.
 */
export const workflowEventStatus = (event) => {
  if (!getEventPropertyFields(event).length) {
    return {
      state: EVENT_STATUS_NO_CONFIGURATION,
      complete: true,
      message: "No configuration needed",
      issues: [],
    };
  }

  const issues = validateWorkflowEvent(event);

  return issues.length
    ? {
        state: EVENT_STATUS_NEEDS_CONFIGURATION,
        complete: false,
        message: "Needs configuration",
        issues,
      }
    : { state: EVENT_STATUS_CONFIGURED, complete: true, message: "Configured", issues: [] };
};

export const validateWorkflowEvents = (events) =>
  asArray(events).flatMap((event) => validateWorkflowEvent(event));

/**
 * The graph has to point at things that exist: every node at a real event, every
 * connection at real nodes.
 */
export const validateCampaignCanvas = ({ events, canvasNodes, canvasEdges } = {}) => {
  const nodes = asArray(canvasNodes);
  if (!nodes.length) return [];

  const eventIds = new Set(asArray(events).map((event) => String(event?.id)));
  const nodeIds = new Set(nodes.map((node) => String(node?.id)));
  const issues = [];

  nodes.forEach((node) => {
    if (node?.eventId && !eventIds.has(String(node.eventId))) {
      issues.push({
        nodeId: String(node.id),
        message:
          "A step on the canvas points at a workflow event that no longer exists. Remove the step or link it to an event.",
      });
    }
  });

  asArray(canvasEdges).forEach((edge) => {
    const source = edge?.source ?? edge?.sourceId;
    const target = edge?.target ?? edge?.targetId;
    if (!nodeIds.has(String(source)) || !nodeIds.has(String(target))) {
      issues.push({
        nodeId: String(source ?? ""),
        message: "A connection on the canvas leads to a step that is not there any more.",
      });
    }
    if (source && target && String(source) === String(target)) {
      issues.push({
        nodeId: String(source),
        message: "A step on the canvas is connected to itself.",
      });
    }
  });

  return issues;
};

/**
 * Everything that must hold before the campaign is sent to Mautic.
 *
 * @returns {{valid: boolean, errors: string[], issues: object[]}}
 */
export const validateCampaignForSave = ({
  name,
  lists,
  forms,
  events,
  canvasNodes,
  canvasEdges,
} = {}) => {
  const errors = [];

  if (!String(name ?? "").trim()) {
    errors.push("Campaign name is required.");
  }
  if (!asArray(lists).length && !asArray(forms).length) {
    errors.push("Select at least one Segment or Form source.");
  }
  if (!asArray(events).length) {
    errors.push("Add at least one workflow event.");
  }

  const issues = [
    ...validateWorkflowEvents(events),
    ...validateCampaignCanvas({ events, canvasNodes, canvasEdges }),
  ];

  // The same problem on several events is worth saying once per event, but an
  // identical message repeated is noise.
  const messages = [...errors, ...issues.map((issue) => issue.message)];
  const unique = messages.filter((message, index) => messages.indexOf(message) === index);

  return { valid: unique.length === 0, errors: unique, issues };
};

/**
 * What a given campaign action must be able to prove before it is attempted.
 * Save and publish put the workflow into service, so it has to be sound;
 * unpublish takes it out of service and is never blocked by it.
 */
export const validateCampaignAction = (action, state) =>
  requiresWorkflowValidation(action)
    ? validateCampaignForSave(state)
    : { valid: true, errors: [], issues: [] };
