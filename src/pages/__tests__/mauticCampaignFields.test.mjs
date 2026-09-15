import assert from "node:assert/strict";
import test from "node:test";

import * as fields from "../mauticCampaignFields.js";

const {
  buildSchemaPropertyFields,
  getEventPropertyFields,
  optionLabel,
  optionValue,
} = fields;

// The renderer reads an inline choice through optionValue/optionLabel rather
// than through .value/.label, because a choice may arrive provider-shaped, as a
// plain string, or as a number. These are the accessors every consumer must use,
// and they have to stay exported for the renderer that imports them.

test("the accessors the renderer needs are exported and callable", () => {
  for (const name of [
    "optionValue",
    "optionLabel",
    "optionChoices",
    "getEventPropertyFields",
    "getNestedValue",
    "setNestedValue",
    "buildSchemaPropertyFields",
    "buildPropertyFields",
    "isConfigurableSchemaField",
  ]) {
    assert.equal(typeof fields[name], "function", `${name} must be exported`);
  }
});

test("a provider choice keeps its value and label", () => {
  const choice = { value: "1", label: "Example" };

  assert.equal(optionValue(choice), "1");
  assert.equal(optionLabel(choice), "Example");
});

test("the full provider choice shape is read correctly", () => {
  // What the capability bridge actually emits.
  const choice = { label: "QA Campaign Builder Email (23)", labelKey: null, value: "23", data: 23, attr: [] };

  assert.equal(optionValue(choice), "23");
  assert.equal(optionLabel(choice), "QA Campaign Builder Email (23)");
});

test("plain and numeric choices are read without a wrapper", () => {
  assert.equal(optionValue("desktop"), "desktop");
  assert.equal(optionLabel("desktop"), "desktop");
  assert.equal(optionValue(2), 2);
  assert.equal(optionLabel(2), "2");
});

test("falsy provider values survive the accessor", () => {
  assert.equal(optionValue({ value: "0", label: "Zero" }), "0");
  assert.equal(optionValue({ value: 0, label: "Zero" }), 0);
  assert.equal(optionValue({ value: "", label: "Blank" }), "");
});

test("a choice with no value falls back rather than returning undefined", () => {
  assert.equal(optionValue({ label: "Only a label" }), "Only a label");
  assert.equal(optionLabel({ id: 7 }), 7);
  assert.notEqual(optionValue({ label: "x" }), undefined);
});

// --- the contract the Configure panel depends on ---------------------------

const schemaField = (overrides) => ({
  name: "priority",
  label: "Priority",
  renderable: true,
  choiceMode: "inline",
  choices: [
    { label: "Normal", labelKey: null, value: "2", data: 2, attr: [] },
    { label: "High", labelKey: null, value: "1", data: 1, attr: [] },
  ],
  blockPrefixes: ["form", "choice", "_priority"],
  ...overrides,
});

test("every rendered choice yields a usable value and a non-empty label", () => {
  const [descriptor] = buildSchemaPropertyFields([schemaField({})]);

  assert.equal(descriptor.kind, "select");
  descriptor.choices.forEach((choice) => {
    assert.notEqual(optionValue(choice), undefined);
    assert.ok(String(optionLabel(choice)).length, "a choice must be labelled");
  });
  assert.deepEqual(
    descriptor.choices.map((choice) => [optionValue(choice), optionLabel(choice)]),
    [
      ["2", "Normal"],
      ["1", "High"],
    ]
  );
});

test("grouped provider choices stay readable once flattened for the menu", () => {
  const [descriptor] = buildSchemaPropertyFields([
    schemaField({
      name: "email",
      label: "Email to send",
      choices: [
        { label: "Create new...", value: "new", data: "new", attr: [] },
        {
          label: "en",
          choices: [{ label: "QA Campaign Builder Email (23)", value: "23", data: 23 }],
        },
      ],
    }),
  ]);

  assert.deepEqual(
    descriptor.choices.map((choice) => optionValue(choice)),
    ["new", "23"]
  );
  assert.equal(optionLabel(descriptor.choices[1]), "QA Campaign Builder Email (23)");
});

test("legacy formTypeOptions choices are readable through the same accessors", () => {
  const legacy = {
    id: "9",
    key: "legacy.event",
    properties: {},
    metadata: { formTypeOptions: { mode: { choices: { add: "Add", remove: "Remove" } } } },
  };

  const [descriptor] = getEventPropertyFields(legacy);

  assert.equal(descriptor.kind, "select");
  assert.deepEqual(
    descriptor.choices.map((choice) => [optionValue(choice), optionLabel(choice)]),
    [
      ["add", "Add"],
      ["remove", "Remove"],
    ]
  );
});

test("a remote field is a select with no inline choices to read", () => {
  const [descriptor] = buildSchemaPropertyFields([
    schemaField({
      name: "device_brand",
      label: "Device brand",
      multiple: true,
      choiceMode: "remote",
      choices: [],
      choiceSource: {
        type: "event_field",
        scope: { eventType: "condition", key: "lead.device", field: "device_brand" },
      },
    }),
  ]);

  assert.equal(descriptor.kind, "select");
  assert.equal(descriptor.remote, true);
  assert.deepEqual(descriptor.choices, []);
});

test("field kinds the panel switches on are all derivable from the schema", () => {
  const descriptors = buildSchemaPropertyFields([
    schemaField({}),
    {
      name: "attempts",
      label: "Attempts",
      renderable: true,
      blockPrefixes: ["form", "number", "_attempts"],
    },
    { name: "note", label: "Note", renderable: true, blockPrefixes: ["form", "text"] },
    {
      name: "email_type",
      label: "Email type",
      renderable: true,
      choiceMode: "inline",
      blockPrefixes: ["form", "choice", "button_group", "_email_type"],
      choices: [{ label: "Transactional", value: "transactional" }],
    },
  ]);

  assert.deepEqual(
    descriptors.map((descriptor) => [descriptor.path, descriptor.kind]),
    [
      ["priority", "select"],
      ["attempts", "number"],
      ["note", "text"],
      ["email_type", "select"],
    ]
  );
});
