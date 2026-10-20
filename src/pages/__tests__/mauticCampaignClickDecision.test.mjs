import assert from "node:assert/strict";
import test from "node:test";

import {
  EVENT_STATUS_CONFIGURED,
  EVENT_STATUS_NEEDS_CONFIGURATION,
  emptyConfigurationIsNative,
  validateCampaignForSave,
  validateWorkflowEvent,
  workflowEventStatus,
} from "../mauticCampaignValidation.js";

// email.click as Mautic 7.1.3's capability endpoint reports it: one optional
// "Limit to Urls contains" list. Empty means any tracked link of the email.
const clickMetadata = {
  key: "email.click",
  eventType: "decision",
  label: "Clicks email",
  formSchema: {
    available: true,
    fields: [
      {
        name: "urls",
        label: "Limit to Urls contains",
        required: false,
        renderable: true,
        blockPrefixes: ["form", "sortablelist"],
        children: [{ name: "list", label: false, required: false, renderable: true, blockPrefixes: ["form", "collection"] }],
      },
    ],
  },
};

const click = (properties, id = "workflow-event-2") => ({
  id,
  key: "email.click",
  eventType: "decision",
  metadata: clickMetadata,
  properties,
});

const tags = (properties) => ({
  id: "workflow-event-3",
  key: "lead.changetags",
  eventType: "action",
  metadata: {
    key: "lead.changetags",
    label: "Modify tags",
    formSchema: {
      available: true,
      fields: [
        { name: "add_tags", label: "Add tags", multiple: true, renderable: true, choices: [{ label: "Gold", value: "Gold" }] },
        { name: "remove_tags", label: "Remove tags", multiple: true, renderable: true, choices: [{ label: "Gold", value: "Gold" }] },
      ],
    },
  },
  properties,
});

test("a Clicks email decision with no URL limit (any link) is valid", () => {
  for (const properties of [{}, { urls: { list: [] } }, { urls: { list: "" } }]) {
    assert.equal(validateWorkflowEvent(click(properties)).length, 0, JSON.stringify(properties));
    assert.equal(workflowEventStatus(click(properties)).state, EVENT_STATUS_CONFIGURED);
  }
});

test("a reloaded any-link decision (provider dropped the empty list) stays valid", () => {
  const reloaded = { ...click({}, "286"), metadata: { ...clickMetadata, id: "286", name: "Clicks email" } };
  assert.equal(validateWorkflowEvent(reloaded).length, 0);
});

test("a URL-limited decision is still valid and unchanged", () => {
  const event = click({ urls: { list: "https://example.test/one" } });
  assert.equal(validateWorkflowEvent(event).length, 0);
  assert.equal(event.properties.urls.list, "https://example.test/one");
});

test("other events with nothing configured still need configuration", () => {
  const issues = validateWorkflowEvent(tags({}));
  assert.equal(issues.length, 1);
  assert.equal(/choose at least one of/.test(issues[0].message), true);
  assert.equal(workflowEventStatus(tags({})).state, EVENT_STATUS_NEEDS_CONFIGURATION);
});

test("only the native any-link decision is exempt", () => {
  assert.equal(emptyConfigurationIsNative(click({})), true);
  assert.equal(emptyConfigurationIsNative({ ...click({}), eventType: "action" }), false);
  assert.equal(emptyConfigurationIsNative(tags({})), false);
  assert.equal(emptyConfigurationIsNative({ eventType: "decision", key: "email.open" }), false);
});

test("a campaign with an any-link decision can be saved", () => {
  const send = {
    id: "workflow-event-1",
    key: "email.send",
    eventType: "action",
    metadata: { key: "email.send", label: "Send email", formSchema: { available: true, fields: [
      { name: "email", label: "Email to send", required: true, renderable: true, choices: [{ label: "W (23)", value: "23" }] },
    ] } },
    properties: { email: "23", email_type: "marketing" },
  };
  const result = validateCampaignForSave({ name: "Nurture", lists: ["7"], forms: [], events: [send, click({}), tags({ add_tags: ["Gold"] })] });
  assert.equal(result.valid, true, result.errors.join(" "));
});
