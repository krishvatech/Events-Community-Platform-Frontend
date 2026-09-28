import assert from "node:assert/strict";
import test from "node:test";

import {
  CAMPAIGN_PUBLISH,
  CAMPAIGN_SAVE,
  CAMPAIGN_UNPUBLISH,
  isBlankValue,
  requiresWorkflowValidation,
  validateCampaignAction,
  workflowEventStatus,
  EVENT_STATUS_CONFIGURED,
  EVENT_STATUS_NEEDS_CONFIGURATION,
  EVENT_STATUS_NO_CONFIGURATION,
  validateCampaignCanvas,
  validateCampaignForSave,
  validateWorkflowEvent,
  validateWorkflowEvents,
} from "../mauticCampaignValidation.js";

// Schemas below are the real shapes the capability bridge returns for these
// events; nothing in the validator knows their names.

const sendEmail = (properties = {}) => ({
  id: "12",
  key: "email.send",
  eventType: "action",
  properties,
  metadata: {
    label: "Send email",
    formSchema: {
      available: true,
      fields: [
        {
          name: "email",
          label: "Email to send",
          required: true,
          renderable: true,
          choiceMode: "inline",
          choices: [{ label: "QA Campaign Builder Email (23)", value: "23" }],
        },
        {
          name: "priority",
          label: "Priority",
          renderable: true,
          choiceMode: "inline",
          choices: [
            { label: "Normal", value: "2" },
            { label: "High", value: "1" },
          ],
        },
        {
          name: "attempts",
          label: "Attempts",
          renderable: true,
          blockPrefixes: ["form", "number", "_emailsend_list_attempts"],
        },
      ],
    },
  },
});

const changeTags = (properties = {}) => ({
  id: "23",
  key: "lead.changetags",
  eventType: "action",
  properties,
  metadata: {
    label: "Modify contact's tags",
    formSchema: {
      available: true,
      fields: [
        {
          name: "add_tags",
          label: "Add tags",
          multiple: true,
          renderable: true,
          choiceMode: "inline",
          choices: [{ label: "QA Campaign Builder Tag", value: "4" }],
        },
        {
          name: "remove_tags",
          label: "Remove tags",
          multiple: true,
          renderable: true,
          choiceMode: "inline",
          choices: [{ label: "QA Campaign Builder Tag", value: "4" }],
        },
      ],
    },
  },
});

const changeLists = (properties = {}) => ({
  id: "24",
  key: "lead.changelist",
  eventType: "action",
  properties,
  metadata: {
    label: "Modify contact's segments",
    formSchema: {
      available: true,
      fields: [
        {
          name: "addToLists",
          label: "Add contact to selected segment(s)",
          multiple: true,
          renderable: true,
          choiceMode: "inline",
          choices: [{ label: "QA Campaign Builder Segment (10)", value: "10" }],
        },
        {
          name: "removeFromLists",
          label: "Remove contact from selected segment(s)",
          multiple: true,
          renderable: true,
          choiceMode: "inline",
          choices: [{ label: "QA Campaign Builder Segment (10)", value: "10" }],
        },
      ],
    },
  },
});

const changePoints = (properties = {}) => ({
  id: "25",
  key: "lead.changepoints",
  eventType: "action",
  properties,
  metadata: {
    label: "Adjust contact points",
    formSchema: {
      available: true,
      fields: [
        {
          name: "points",
          label: "Points (+/-)",
          required: true,
          renderable: true,
          blockPrefixes: ["form", "number", "_leadpoints_action_points"],
        },
        { name: "group", label: "Point group", renderable: true, choiceMode: "inline" },
      ],
    },
  },
});

const contactDevice = (properties = {}) => ({
  id: "26",
  key: "lead.device",
  eventType: "condition",
  properties,
  metadata: {
    label: "Contact device",
    formSchema: {
      available: true,
      fields: [
        {
          name: "device_type",
          label: "Device type",
          multiple: true,
          renderable: true,
          choiceMode: "inline",
          choices: [{ label: "Desktop", value: "desktop" }],
        },
        {
          name: "device_brand",
          label: "Device brand",
          multiple: true,
          renderable: true,
          choiceMode: "remote",
          choices: [],
          choiceSource: {
            type: "event_field",
            scope: { eventType: "condition", key: "lead.device", field: "device_brand" },
          },
        },
      ],
    },
  },
});

const messages = (issues) => issues.map((issue) => issue.message);

// --- required fields -------------------------------------------------------

test("a missing required field blocks the save and names the field", () => {
  const issues = validateWorkflowEvent(sendEmail({}));

  assert.equal(issues.length, 1);
  assert.equal(issues[0].message, "Send email: Email to send is required.");
  assert.equal(issues[0].path, "email");
  assert.equal(issues[0].eventId, "12");
});

test("a required field that is present passes", () => {
  assert.deepEqual(validateWorkflowEvent(sendEmail({ email: "23" })), []);
});

test("an empty string, empty list or empty object does not count as configured", () => {
  assert.equal(isBlankValue(""), true);
  assert.equal(isBlankValue([]), true);
  assert.equal(isBlankValue({}), true);
  assert.equal(isBlankValue(null), true);
  assert.equal(isBlankValue(undefined), true);
  // Real values, including the falsy ones a provider legitimately stores.
  assert.equal(isBlankValue(0), false);
  assert.equal(isBlankValue("0"), false);
  assert.equal(isBlankValue(false), false);

  assert.equal(messages(validateWorkflowEvent(sendEmail({ email: "" })))[0],
    "Send email: Email to send is required.");
});

// --- events whose schema marks nothing required ----------------------------

test("add/remove tags cannot both be empty, and the message says which fields", () => {
  const issues = validateWorkflowEvent(changeTags({ add_tags: [], remove_tags: [] }));

  assert.equal(issues.length, 1);
  assert.equal(
    issues[0].message,
    "Modify contact's tags: choose at least one of Add tags or Remove tags."
  );
});

test("either side of add/remove tags on its own is enough", () => {
  assert.deepEqual(validateWorkflowEvent(changeTags({ add_tags: ["4"] })), []);
  assert.deepEqual(validateWorkflowEvent(changeTags({ remove_tags: ["4"] })), []);
});

test("segments need an add or remove selection", () => {
  assert.equal(
    messages(validateWorkflowEvent(changeLists({})))[0],
    "Modify contact's segments: choose at least one of Add contact to selected segment(s) or Remove contact from selected segment(s)."
  );
  assert.deepEqual(validateWorkflowEvent(changeLists({ addToLists: ["10"] })), []);
});

test("a condition with no criteria at all is rejected", () => {
  assert.equal(validateWorkflowEvent(contactDevice({})).length, 1);
  assert.deepEqual(validateWorkflowEvent(contactDevice({ device_brand: ["AP"] })), []);
});

// --- numbers ---------------------------------------------------------------

test("points must be a number", () => {
  assert.equal(
    messages(validateWorkflowEvent(changePoints({ points: "many" })))[0],
    "Adjust contact points: Points (+/-) must be a number."
  );
  assert.equal(
    messages(validateWorkflowEvent(changePoints({ points: [] })))[0],
    "Adjust contact points: Points (+/-) is required."
  );
});

test("valid point values pass, including negative, zero and numeric strings", () => {
  for (const points of [10, "10", -5, "-5", 0, "0", 2.5]) {
    assert.deepEqual(
      validateWorkflowEvent(changePoints({ points })),
      [],
      `points=${points}`
    );
  }
});

test("a missing required number is reported as required, not as a bad number", () => {
  assert.equal(
    messages(validateWorkflowEvent(changePoints({})))[0],
    "Adjust contact points: Points (+/-) is required."
  );
});

test("an optional number is only checked when it has a value", () => {
  assert.deepEqual(validateWorkflowEvent(sendEmail({ email: "23" })), []);
  assert.equal(
    messages(validateWorkflowEvent(sendEmail({ email: "23", attempts: "soon" })))[0],
    "Send email: Attempts must be a number."
  );
  assert.deepEqual(validateWorkflowEvent(sendEmail({ email: "23", attempts: 3 })), []);
});

// --- choices ---------------------------------------------------------------

test("an inline choice value the provider no longer offers is reported", () => {
  assert.equal(
    messages(validateWorkflowEvent(sendEmail({ email: "23", priority: "99" })))[0],
    "Send email: Priority has a value that Mautic no longer offers."
  );
  assert.deepEqual(validateWorkflowEvent(sendEmail({ email: "23", priority: "1" })), []);
});

test("remote choice values are left to the provider", () => {
  // device_brand's options live on Mautic; the browser holds one page at most.
  assert.deepEqual(validateWorkflowEvent(contactDevice({ device_brand: ["AP"] })), []);
});

test("an event with no provider schema is not blocked", () => {
  const unknown = {
    id: "31",
    key: "plugin.removed.action",
    properties: { legacy: "keep" },
    metadata: { providerMetadataAvailable: false },
  };

  assert.deepEqual(validateWorkflowEvent(unknown), []);
});

test("several events are reported together", () => {
  const issues = validateWorkflowEvents([
    sendEmail({}),
    changeTags({}),
    changePoints({ points: 10 }),
  ]);

  assert.deepEqual(messages(issues), [
    "Send email: Email to send is required.",
    "Modify contact's tags: choose at least one of Add tags or Remove tags.",
  ]);
});

// --- canvas ----------------------------------------------------------------

const canvas = () => ({
  events: [sendEmail({ email: "23" })],
  canvasNodes: [
    { id: "node-trigger", nodeType: "trigger", eventId: null },
    { id: "node-a", nodeType: "action", eventId: "12" },
  ],
  canvasEdges: [{ id: "e1", source: "node-trigger", target: "node-a" }],
});

test("a sound canvas raises nothing", () => {
  assert.deepEqual(validateCampaignCanvas(canvas()), []);
  assert.deepEqual(validateCampaignCanvas({}), [], "no canvas is not an error");
});

test("a step pointing at a removed event is caught", () => {
  const state = canvas();
  state.canvasNodes.push({ id: "node-gone", nodeType: "action", eventId: "999" });

  const issues = validateCampaignCanvas(state);

  assert.equal(issues.length, 1);
  assert.match(issues[0].message, /no longer exists/);
  assert.equal(issues[0].nodeId, "node-gone");
});

test("a connection to a missing step is caught", () => {
  const state = canvas();
  state.canvasEdges.push({ id: "e2", source: "node-a", target: "node-missing" });

  assert.match(validateCampaignCanvas(state)[0].message, /not there any more/);
});

test("connections are read in provider form too", () => {
  const state = canvas();
  state.canvasEdges = [{ id: "e1", sourceId: "node-trigger", targetId: "node-nope" }];

  assert.equal(validateCampaignCanvas(state).length, 1);
});

test("a step connected to itself is caught", () => {
  const state = canvas();
  state.canvasEdges.push({ id: "loop", source: "node-a", target: "node-a" });

  assert.match(validateCampaignCanvas(state)[0].message, /connected to itself/);
});

// --- the whole campaign ----------------------------------------------------

const validCampaign = () => ({
  name: "QA Provider Schema Campaign",
  lists: [10],
  forms: [],
  events: [sendEmail({ email: "23" }), changeTags({ add_tags: ["4"] })],
  canvasNodes: [],
  canvasEdges: [],
});

test("a valid campaign passes", () => {
  const result = validateCampaignForSave(validCampaign());

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("campaign basics are required", () => {
  assert.deepEqual(
    validateCampaignForSave({ ...validCampaign(), name: "   " }).errors,
    ["Campaign name is required."]
  );
  assert.deepEqual(
    validateCampaignForSave({ ...validCampaign(), lists: [], forms: [] }).errors,
    ["Select at least one Segment or Form source."]
  );
  assert.deepEqual(
    validateCampaignForSave({ ...validCampaign(), events: [] }).errors,
    ["Add at least one workflow event."]
  );
});

test("an invalid event blocks the save", () => {
  const result = validateCampaignForSave({
    ...validCampaign(),
    events: [sendEmail({}), changeTags({ add_tags: ["4"] })],
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, ["Send email: Email to send is required."]);
  assert.equal(result.issues[0].eventId, "12");
});

test("campaign, event and canvas problems are reported together, without repeats", () => {
  const result = validateCampaignForSave({
    name: "",
    lists: [],
    forms: [],
    events: [sendEmail({}), sendEmail({})],
    canvasNodes: [{ id: "node-x", nodeType: "action", eventId: "999" }],
    canvasEdges: [],
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [
    "Campaign name is required.",
    "Select at least one Segment or Form source.",
    "Send email: Email to send is required.",
    "A step on the canvas points at a workflow event that no longer exists. Remove the step or link it to an event.",
  ]);
  // Both events are still reported individually for the UI to point at.
  assert.equal(result.issues.filter((issue) => issue.eventId === "12").length, 2);
});

// --- which action has to prove the workflow is sound ------------------------

test("save and publish validate the workflow; unpublish does not", () => {
  assert.equal(requiresWorkflowValidation(CAMPAIGN_SAVE), true);
  assert.equal(requiresWorkflowValidation(CAMPAIGN_PUBLISH), true);
  assert.equal(requiresWorkflowValidation(CAMPAIGN_UNPUBLISH), false);
});

test("publish is refused while an event is invalid", () => {
  const broken = { ...validCampaign(), events: [sendEmail({})] };

  const result = validateCampaignAction(CAMPAIGN_PUBLISH, broken);

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, ["Send email: Email to send is required."]);
});

test("save is refused while an event is invalid", () => {
  const broken = { ...validCampaign(), events: [changeTags({})] };

  assert.equal(validateCampaignAction(CAMPAIGN_SAVE, broken).valid, false);
});

test("unpublish is never refused, however stale the workflow is", () => {
  // An email deleted in Mautic, a segment withdrawn, a capability gone: the
  // administrator must still be able to switch the campaign off.
  const stale = {
    name: "",
    lists: [],
    forms: [],
    events: [sendEmail({}), changeTags({}), changePoints({ points: "gone" })],
    canvasNodes: [{ id: "node-x", nodeType: "action", eventId: "999" }],
    canvasEdges: [{ id: "e", source: "node-x", target: "node-missing" }],
  };

  const result = validateCampaignAction(CAMPAIGN_UNPUBLISH, stale);

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.issues, []);
  // The same campaign really is invalid for the actions that put it into service.
  assert.equal(validateCampaignAction(CAMPAIGN_PUBLISH, stale).valid, false);
});

test("an unknown action is validated rather than waved through", () => {
  assert.equal(requiresWorkflowValidation(undefined), true);
  assert.equal(
    validateCampaignAction("something-else", { ...validCampaign(), events: [sendEmail({})] })
      .valid,
    false
  );
});

// --- what counts as a configurable field ------------------------------------

const withFields = (fields, properties = {}) => ({
  id: "90",
  key: "provider.event",
  eventType: "action",
  properties,
  metadata: { label: "Provider event", formSchema: { available: true, fields } },
});

test("an event with no schema fields at all is valid with empty properties", () => {
  // e.g. Mautic's "Delete contact" action: nothing to configure.
  const noSchema = {
    id: "91",
    key: "lead.deletecontact",
    eventType: "action",
    properties: {},
    metadata: { label: "Delete contact", formSchema: { available: true, fields: [] } },
  };

  assert.deepEqual(validateWorkflowEvent(noSchema), []);
  assert.equal(validateCampaignForSave({ ...validCampaign(), events: [noSchema] }).valid, true);
});

test("an event whose only controls are buttons is valid with empty properties", () => {
  const buttonsOnly = withFields([
    {
      name: "newEmailButton",
      label: "New Email",
      renderable: false,
      controlType: "action",
      blockPrefixes: ["button", "_newEmailButton"],
    },
    {
      name: "save",
      label: "Save",
      controlType: "action",
      blockPrefixes: ["submit", "_save"],
    },
  ]);

  assert.deepEqual(validateWorkflowEvent(buttonsOnly), []);
});

test("a renderable:false field never triggers the at-least-one rule", () => {
  assert.deepEqual(validateWorkflowEvent(withFields([
    { name: "hiddenThing", label: "Hidden", renderable: false },
  ])), []);
});

test("an unmapped provider control never triggers the at-least-one rule", () => {
  assert.deepEqual(validateWorkflowEvent(withFields([
    { name: "uiOnly", label: "UI only", mapped: false },
    { name: "internalThing", label: "Internal", controlType: "internal" },
    { name: "hiddenInput", label: "Hidden", blockPrefixes: ["hidden", "_x"] },
  ])), []);
});

test("one real field among the controls does carry the rule", () => {
  const mixed = withFields([
    { name: "newEmailButton", label: "New Email", renderable: false, controlType: "action" },
    { name: "note", label: "Note", renderable: true },
  ]);

  assert.equal(
    messages(validateWorkflowEvent(mixed))[0],
    "Provider event: choose at least one of Note."
  );
  assert.deepEqual(validateWorkflowEvent(withFields([
    { name: "newEmailButton", label: "New Email", renderable: false, controlType: "action" },
    { name: "note", label: "Note", renderable: true },
  ], { note: "hello" })), []);
});

test("a button-group choice field is real configuration, not a button", () => {
  // ButtonGroupType's prefixes contain "button_group", which is not "button".
  const buttonGroup = withFields([
    {
      name: "email_type",
      label: "Email type",
      renderable: true,
      choiceMode: "inline",
      blockPrefixes: ["form", "choice", "button_group", "_email_type"],
      choices: [{ label: "Transactional", value: "transactional" }],
    },
  ]);

  assert.equal(validateWorkflowEvent(buttonGroup).length, 1, "it is configurable");
  assert.deepEqual(
    validateWorkflowEvent({ ...buttonGroup, properties: { email_type: "transactional" } }),
    []
  );
});

// --- provider UI commands are not selections --------------------------------
// Mautic prepends "Create new…" => "new" to any entity field with a creation
// modal. Picking it opens a modal; it never means an entity was chosen.

const emailWithCreateNew = (properties = {}) => ({
  id: "12",
  key: "email.send",
  eventType: "action",
  properties,
  metadata: {
    label: "Send email",
    formSchema: {
      available: true,
      fields: [
        {
          name: "email",
          label: "Email to send",
          required: true,
          renderable: true,
          choiceKind: "entity",
          choiceMode: "inline",
          choices: [
            { label: "Create new...", labelKey: null, value: "new", data: "new", attr: [] },
            {
              label: "en",
              choices: [
                { label: "QA Campaign Builder Email (23)", value: "23", data: 23, attr: [] },
              ],
            },
          ],
        },
      ],
    },
  },
});

test("a real entity choice satisfies a required entity field", () => {
  assert.deepEqual(validateWorkflowEvent(emailWithCreateNew({ email: "23" })), []);
});

test("the provider's Create new command does not satisfy a required entity field", () => {
  const issues = validateWorkflowEvent(emailWithCreateNew({ email: "new" }));

  assert.equal(issues.length, 1);
  assert.equal(issues[0].message, "Send email: Email to send is required.");
});

test("an empty required entity field fails", () => {
  assert.equal(
    messages(validateWorkflowEvent(emailWithCreateNew({ email: "" })))[0],
    "Send email: Email to send is required."
  );
});

test("a command value does not count towards the at-least-one rule either", () => {
  const optionalEntity = {
    id: "40",
    key: "provider.entity.event",
    properties: { thing: "new" },
    metadata: {
      label: "Provider event",
      formSchema: {
        available: true,
        fields: [
          {
            name: "thing",
            label: "Thing",
            renderable: true,
            choiceKind: "entity",
            choices: [
              { label: "Create new...", value: "new", data: "new" },
              { label: "Real thing (5)", value: "5", data: 5 },
            ],
          },
        ],
      },
    },
  };

  assert.equal(
    messages(validateWorkflowEvent(optionalEntity))[0],
    "Provider event: choose at least one of Thing."
  );
  assert.deepEqual(
    validateWorkflowEvent({ ...optionalEntity, properties: { thing: "5" } }),
    []
  );
});

test("a multi-select entity field needs at least one real entity", () => {
  const multi = {
    id: "41",
    key: "provider.entity.multi",
    properties: { things: ["new"] },
    metadata: {
      label: "Provider event",
      formSchema: {
        available: true,
        fields: [
          {
            name: "things",
            label: "Things",
            required: true,
            multiple: true,
            renderable: true,
            choiceKind: "entity",
            choices: [
              { label: "Create new...", value: "new", data: "new" },
              { label: "Tag (4)", value: "4", data: { id: 4 } },
            ],
          },
        ],
      },
    },
  };

  assert.equal(validateWorkflowEvent(multi).length, 1, "only the command selected");
  assert.deepEqual(
    validateWorkflowEvent({ ...multi, properties: { things: ["new", "4"] } }),
    [],
    "a real entity alongside the command is a real selection"
  );
});

test("a non-entity choice field is unaffected by the command rule", () => {
  // Segments and stages are plain choice fields: their values are ids, and no
  // "Create new…" entry exists to confuse.
  assert.deepEqual(validateWorkflowEvent(changeLists({ addToLists: ["10"] })), []);
  assert.deepEqual(validateWorkflowEvent(sendEmail({ email: "23", priority: "1" })), []);
});

test("a command value in a remote entity field cannot be judged here", () => {
  // Remote fields hold no inline choices, so nothing local can classify the
  // value; the provider is the one that rejects it.
  assert.deepEqual(validateWorkflowEvent(contactDevice({ device_brand: ["AP"] })), []);
});

// --- status badge -----------------------------------------------------------
// Three answers only, all derived from the validator so the badge and the save
// can never disagree.

test("zero configurable fields reads as No configuration needed", () => {
  const nothingToConfigure = {
    id: "91",
    key: "lead.deletecontact",
    properties: {},
    metadata: { label: "Delete contact", formSchema: { available: true, fields: [] } },
  };

  const status = workflowEventStatus(nothingToConfigure);

  assert.equal(status.state, EVENT_STATUS_NO_CONFIGURATION);
  assert.equal(status.message, "No configuration needed");
  assert.equal(status.complete, true);
});

test("an event made only of provider UI controls also needs no configuration", () => {
  const buttonsOnly = {
    id: "92",
    key: "provider.event",
    properties: {},
    metadata: {
      label: "Provider event",
      formSchema: {
        available: true,
        fields: [
          { name: "newButton", label: "New", renderable: false, controlType: "action" },
        ],
      },
    },
  };

  assert.equal(workflowEventStatus(buttonsOnly).message, "No configuration needed");
});

test("optional fields all blank read as Needs configuration, not as done", () => {
  // This is the case the old badge got wrong: it said "No configuration needed"
  // while the save was correctly refusing it.
  for (const event of [changeTags({}), changeLists({}), contactDevice({})]) {
    const status = workflowEventStatus(event);
    assert.equal(status.state, EVENT_STATUS_NEEDS_CONFIGURATION, event.key);
    assert.equal(status.message, "Needs configuration", event.key);
    assert.equal(status.complete, false, event.key);
    assert.ok(status.issues.length, "the badge carries the reason");
  }
});

test("one populated optional field reads as Configured", () => {
  assert.equal(workflowEventStatus(changeTags({ add_tags: ["4"] })).message, "Configured");
  assert.equal(
    workflowEventStatus(changeLists({ removeFromLists: ["10"] })).message,
    "Configured"
  );
  assert.equal(
    workflowEventStatus(contactDevice({ device_brand: ["AP"] })).state,
    EVENT_STATUS_CONFIGURED
  );
});

test("a missing required field reads as Needs configuration", () => {
  assert.equal(workflowEventStatus(sendEmail({})).message, "Needs configuration");
  assert.equal(workflowEventStatus(changePoints({})).message, "Needs configuration");
});

test("a valid required field reads as Configured", () => {
  assert.equal(workflowEventStatus(sendEmail({ email: "23" })).message, "Configured");
  assert.equal(workflowEventStatus(changePoints({ points: 10 })).message, "Configured");
});

test("the provider's Create new command leaves the event needing configuration", () => {
  assert.equal(
    workflowEventStatus(emailWithCreateNew({ email: "new" })).message,
    "Needs configuration"
  );
  assert.equal(
    workflowEventStatus(emailWithCreateNew({ email: "23" })).message,
    "Configured"
  );
});

test("an invalid value reads as Needs configuration, not Configured", () => {
  assert.equal(
    workflowEventStatus(changePoints({ points: "many" })).message,
    "Needs configuration"
  );
});

test("the badge agrees with the save for every one of these events", () => {
  const cases = [
    sendEmail({}),
    sendEmail({ email: "23" }),
    changeTags({}),
    changeTags({ add_tags: ["4"] }),
    contactDevice({}),
    emailWithCreateNew({ email: "new" }),
  ];

  cases.forEach((event) => {
    const status = workflowEventStatus(event);
    const blocked = validateWorkflowEvents([event]).length > 0;
    assert.equal(
      status.complete,
      !blocked,
      `${event.key}: badge says ${status.message} while save ${blocked ? "blocks" : "allows"}`
    );
  });
});
