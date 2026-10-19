// Email type of a native Mautic "Send email" campaign action.
//
// Mautic 7.1.3 stores `properties.email_type` as "marketing" or
// "transactional". Its campaign form defaults to marketing, but at runtime an
// action stored WITHOUT the property is sent as transactional: Do Not Contact
// is ignored and the same contact can receive the email again. So a new action
// starts with the provider's default (marketing), a saved action is shown as
// stored, and choosing transactional needs an explicit confirmation that the
// backend checks too (`transactionalEmailConfirmed`).

import { isPlainObject } from "./mauticCampaignEventHydration.js";

// Same rule as mauticCampaignSavePayload's isPersistedEventId (which imports
// this module, so it is not imported back): a provider ID is all digits.
const isPersistedEventId = (id) => /^\d+$/.test(String(id ?? "").trim());

export const EMAIL_SEND_EVENT_KEY = "email.send";
export const EMAIL_TYPE_PATH = "email_type";
export const EMAIL_TYPE_MARKETING = "marketing";
export const EMAIL_TYPE_TRANSACTIONAL = "transactional";
export const EMAIL_TYPES = [EMAIL_TYPE_TRANSACTIONAL, EMAIL_TYPE_MARKETING];
export const TRANSACTIONAL_CONFIRMATION_FIELD = "transactionalEmailConfirmed";
export const EMAIL_TYPE_CONFIRMATION_ISSUE = "transactional-email-unconfirmed";

const isBlank = (value) => value === undefined || value === null || String(value).trim() === "";

export const isEmailSendAction = (event) =>
  (event?.key || event?.type) === EMAIL_SEND_EVENT_KEY && event?.eventType === "action";

// The provider's own default for a new action: the `data` of the email_type
// field in the capability form schema, when it is one of the known types.
export const providerEmailTypeDefault = (metadata) => {
  const fields = Array.isArray(metadata?.formSchema?.fields) ? metadata.formSchema.fields : [];
  const field = fields.find((candidate) => candidate?.name === EMAIL_TYPE_PATH);
  return EMAIL_TYPES.includes(field?.data) ? field.data : EMAIL_TYPE_MARKETING;
};

/**
 * A newly added Send email action, with the provider default email type when
 * none is set. Every other event, and any explicit value, is returned as is.
 */
export const withNewEventEmailTypeDefault = (event) => {
  if (!isEmailSendAction(event)) return event;
  const properties = isPlainObject(event.properties) ? event.properties : {};
  if (!isBlank(properties[EMAIL_TYPE_PATH])) return event;
  return {
    ...event,
    properties: { ...properties, [EMAIL_TYPE_PATH]: providerEmailTypeDefault(event.metadata) },
  };
};

/**
 * The type a loaded event has in Mautic, recorded once at load so the builder
 * can tell a stored transactional action from one chosen in this session.
 * Properties themselves are never changed here.
 */
export const withPersistedEmailType = (event) => {
  if (!isEmailSendAction(event)) return event;
  const stored = isPlainObject(event.properties) ? event.properties[EMAIL_TYPE_PATH] : undefined;
  return { ...event, persistedEmailType: isBlank(stored) ? null : stored };
};

export const emailTypeState = (event) => {
  if (!isEmailSendAction(event)) return { applies: false };
  const raw = isPlainObject(event.properties) ? event.properties[EMAIL_TYPE_PATH] : undefined;
  const value = isBlank(raw) ? null : raw;
  const persisted = isPersistedEventId(event.id);
  const storedType = persisted ? event.persistedEmailType ?? null : null;
  const transactional = value === EMAIL_TYPE_TRANSACTIONAL;
  const needsConfirmation = transactional && storedType !== EMAIL_TYPE_TRANSACTIONAL;
  return {
    applies: true,
    value,
    persisted,
    // A saved action with no type: Mautic runs it as transactional.
    legacyMissing: persisted && value === null,
    invalid: value !== null && !EMAIL_TYPES.includes(value),
    transactional,
    marketing: value === EMAIL_TYPE_MARKETING,
    needsConfirmation,
    confirmed: needsConfirmation && event[TRANSACTIONAL_CONFIRMATION_FIELD] === true,
  };
};

// What the save payload carries for the event: the confirmation flag only when
// it is needed and given.
export const transactionalConfirmationFields = (event) => {
  const state = emailTypeState(event);
  return state.applies && state.needsConfirmation && state.confirmed
    ? { [TRANSACTIONAL_CONFIRMATION_FIELD]: true }
    : {};
};

/**
 * Send email events that may not be put into service: a saved action with no
 * type (Mautic sends it as transactional) or an unsupported value. New actions
 * always carry a type, so in practice these are legacy or duplicated steps.
 */
export const unresolvedEmailSendEvents = (events) =>
  (Array.isArray(events) ? events : []).filter((event) => {
    const state = emailTypeState(event);
    return state.applies && (state.value === null || state.invalid);
  });

export const PUBLISH_EMAIL_TYPE_ISSUE = "email-type-unresolved-for-publish";

export const publishEmailTypeIssues = (events, eventName) =>
  unresolvedEmailSendEvents(events).map((event) => ({
    eventId: String(event?.id ?? ""),
    path: EMAIL_TYPE_PATH,
    kind: PUBLISH_EMAIL_TYPE_ISSUE,
    message:
      `${eventName(event)}: choose Marketing or Transactional before publishing. ` +
      "Without an email type Mautic sends it as Transactional, to contacts who " +
      "unsubscribed or are marked Do Not Contact too.",
  }));

export const emailTypeIssues = (event, eventName) => {
  const state = emailTypeState(event);
  if (!state.applies) return [];
  const issues = [];
  if (state.invalid) {
    issues.push({
      eventId: String(event?.id ?? ""),
      path: EMAIL_TYPE_PATH,
      message: `${eventName}: Email type must be Marketing or Transactional.`,
    });
  }
  if (state.needsConfirmation && !state.confirmed) {
    issues.push({
      eventId: String(event?.id ?? ""),
      path: EMAIL_TYPE_PATH,
      kind: EMAIL_TYPE_CONFIRMATION_ISSUE,
      message:
        `${eventName}: confirm the Transactional email type. Transactional emails ` +
        "are sent even to contacts who unsubscribed or are marked Do Not Contact.",
    });
  }
  return issues;
};
