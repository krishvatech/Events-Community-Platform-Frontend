import assert from "node:assert/strict";
import test from "node:test";

import {
  EMAIL_TYPE_CONFIRMATION_ISSUE,
  emailTypeIssues,
  emailTypeState,
  providerEmailTypeDefault,
  transactionalConfirmationFields,
  withNewEventEmailTypeDefault,
  withPersistedEmailType,
} from "../mauticCampaignEmailType.js";
import { hydrateWorkflowEvent, buildCapabilityIndex } from "../mauticCampaignEventHydration.js";
import { buildFlatExecutionEvents, toEventPayload } from "../mauticCampaignSavePayload.js";
import { mapCanvasToExecution } from "../mauticCampaignGraph.js";
import { validateWorkflowEvent } from "../mauticCampaignValidation.js";

// The email.send schema as Mautic 7.1.3's capability endpoint reports it.
const emailSendCapability = (data = "marketing") => ({
  key: "email.send",
  type: "email.send",
  eventType: "action",
  label: "Send email",
  formSchema: {
    available: true,
    fields: [
      { name: "email", label: "Email to send", required: true, choices: [{ label: "QA (23)", value: "23" }] },
      {
        name: "email_type",
        label: "Email type",
        required: false,
        data,
        blockPrefixes: ["form", "choice", "button_group"],
        choices: [
          { label: "Transactional", value: "transactional" },
          { label: "Marketing", value: "marketing" },
        ],
      },
    ],
  },
});

const newSend = (properties = {}) => ({
  id: "workflow-event-1",
  key: "email.send",
  eventType: "action",
  metadata: emailSendCapability(),
  properties,
});

const savedSend = (properties = { email: "23" }) =>
  withPersistedEmailType({
    id: "72",
    key: "email.send",
    eventType: "action",
    metadata: emailSendCapability(),
    properties,
  });

test("the provider default is read from the capability and falls back to marketing", () => {
  assert.equal(providerEmailTypeDefault(emailSendCapability()), "marketing");
  assert.equal(providerEmailTypeDefault(emailSendCapability("transactional")), "transactional");
  assert.equal(providerEmailTypeDefault(emailSendCapability("bogus")), "marketing");
  assert.equal(providerEmailTypeDefault({}), "marketing");
});

test("a new Send email action starts as marketing; explicit values and other events are kept", () => {
  assert.deepEqual(withNewEventEmailTypeDefault(newSend()).properties, { email_type: "marketing" });
  assert.deepEqual(withNewEventEmailTypeDefault(newSend({ email: "23", email_type: "" })).properties, {
    email: "23",
    email_type: "marketing",
  });
  assert.deepEqual(
    withNewEventEmailTypeDefault(newSend({ email_type: "transactional" })).properties,
    { email_type: "transactional" }
  );
  const tags = { id: "x", key: "lead.changetags", eventType: "action", properties: {} };
  assert.equal(withNewEventEmailTypeDefault(tags), tags);
});

test("hydration never adds or changes a saved event's email type", () => {
  const loaded = { id: "72", key: "email.send", eventType: "action", metadata: {}, properties: { email: "23" } };
  const hydrated = hydrateWorkflowEvent(loaded, buildCapabilityIndex({ actions: [emailSendCapability()] }));
  assert.deepEqual(hydrated.properties, { email: "23" });
  assert.equal(withPersistedEmailType(hydrated).properties, hydrated.properties);
});

test("a saved action without a type is legacy and needs no confirmation to keep", () => {
  const state = emailTypeState(savedSend());
  assert.equal(state.legacyMissing, true);
  assert.equal(state.needsConfirmation, false);
  assert.equal(emailTypeIssues(savedSend(), "Send email").length, 0);
});

test("choosing transactional needs a confirmation unless it is already stored", () => {
  const chosen = { ...savedSend(), properties: { email: "23", email_type: "transactional" } };
  assert.equal(emailTypeState(chosen).needsConfirmation, true);
  const issues = emailTypeIssues(chosen, "Send email");
  assert.equal(issues.length, 1);
  assert.equal(issues[0].kind, EMAIL_TYPE_CONFIRMATION_ISSUE);
  assert.equal(validateWorkflowEvent(chosen).some((issue) => issue.kind === EMAIL_TYPE_CONFIRMATION_ISSUE), true);

  const confirmed = { ...chosen, transactionalEmailConfirmed: true };
  assert.equal(emailTypeIssues(confirmed, "Send email").length, 0);
  assert.deepEqual(transactionalConfirmationFields(confirmed), { transactionalEmailConfirmed: true });

  const stored = savedSend({ email: "23", email_type: "transactional" });
  assert.equal(emailTypeState(stored).needsConfirmation, false);
  assert.deepEqual(transactionalConfirmationFields(stored), {});
});

test("an unsupported value is reported", () => {
  const event = { ...newSend({ email: "23", email_type: "list" }) };
  assert.equal(emailTypeIssues(event, "Send email").length, 1);
});

test("the confirmation reaches the payload through the canvas, the flat list and toEventPayload", () => {
  const event = { ...newSend({ email: "23", email_type: "transactional" }), transactionalEmailConfirmed: true };
  assert.equal(buildFlatExecutionEvents([event])[0].transactionalEmailConfirmed, true);
  assert.equal(toEventPayload(buildFlatExecutionEvents([event])[0]).transactionalEmailConfirmed, true);

  const nodes = [
    { id: "trigger", nodeType: "trigger" },
    { id: "node-1", nodeType: "action", eventId: event.id },
  ];
  const edges = [{ id: "e1", source: "trigger", target: "node-1" }];
  const mapping = mapCanvasToExecution(nodes, edges, { events: [event] });
  assert.deepEqual(mapping.errors, []);
  assert.equal(mapping.events[0].transactionalEmailConfirmed, true);

  const marketing = { ...newSend({ email: "23", email_type: "marketing" }), transactionalEmailConfirmed: true };
  assert.equal("transactionalEmailConfirmed" in buildFlatExecutionEvents([marketing])[0], false);
  assert.equal("transactionalEmailConfirmed" in toEventPayload(buildFlatExecutionEvents([marketing])[0]), false);
});

test("only untyped or unsupported saved Send email steps block publishing", async () => {
  const { unresolvedEmailSendEvents, publishEmailTypeIssues, PUBLISH_EMAIL_TYPE_ISSUE } = await import(
    "../mauticCampaignEmailType.js"
  );
  const { validateCampaignForSave } = await import("../mauticCampaignValidation.js");
  const legacy = savedSend();
  const typed = savedSend({ email: "23", email_type: "marketing" });
  const fresh = withNewEventEmailTypeDefault(newSend({ email: "23" }));

  assert.deepEqual(unresolvedEmailSendEvents([legacy, typed, fresh]).map((e) => e.id), ["72"]);
  const issues = publishEmailTypeIssues([legacy], () => "Welcome");
  assert.equal(issues.length, 1);
  assert.equal(issues[0].kind, PUBLISH_EMAIL_TYPE_ISSUE);

  const base = { name: "Lead nurture", lists: ["7"], forms: [], events: [legacy] };
  assert.equal(validateCampaignForSave(base).valid, true, "a draft still saves");
  const publishing = validateCampaignForSave({ ...base, publishing: true });
  assert.equal(publishing.valid, false);
  assert.equal(publishing.issues.some((issue) => issue.kind === PUBLISH_EMAIL_TYPE_ISSUE), true);
  assert.equal(validateCampaignForSave({ ...base, events: [typed], publishing: true }).valid, true);
});

test("a duplicate with inherited untyped steps is reported as a warning", async () => {
  const { duplicateSuccessMessage, duplicateSuccessSeverity } = await import("../mauticCampaignDuplicate.js");
  const clean = { id: "9", name: "Copy", emailTypeUnresolved: [] };
  const inherited = { id: "9", name: "Copy", emailTypeUnresolved: [{ id: "901", name: "Welcome", state: "missing" }] };

  assert.equal(duplicateSuccessSeverity(clean), "success");
  assert.equal(duplicateSuccessSeverity({ id: "9", name: "Copy" }), "success");
  assert.equal(duplicateSuccessSeverity(inherited), "warning");
  assert.equal(/1 Send email step has no email type/.test(duplicateSuccessMessage(inherited)), true);
  assert.equal(/no email type/.test(duplicateSuccessMessage(clean)), false);
});
