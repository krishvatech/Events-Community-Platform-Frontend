import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_GLUE,
  addFilterRow,
  buildFilterMetadataIndex,
  filterRowValue,
  filterValueControl,
  findFilterField,
  hydrateFilterRows,
  isBlankFilterValue,
  newFilterRow,
  operatorsForField,
  removeFilterRow,
  setFilterRowField,
  setFilterRowGlue,
  setFilterRowOperator,
  setFilterRowValue,
  toFilterPayload,
  updateFilterRow,
  validateFilterRows,
  validateSegmentFilters,
} from "../mauticSegmentFilters.js";

// Shapes below are what the bridge really returns for this Mautic instance.
const metadata = () => ({
  objects: ["lead", "company"],
  operators: [
    { value: "=", label: "equals", requiresValue: true, multiple: false },
    { value: "!=", label: "not equal", requiresValue: true, multiple: false },
    { value: "empty", label: "empty", requiresValue: false, multiple: false },
    { value: "!empty", label: "not empty", requiresValue: false, multiple: false },
    { value: "like", label: "like", requiresValue: true, multiple: false },
    { value: "gte", label: "greater than or equal", requiresValue: true, multiple: false },
    { value: "in", label: "including any of", requiresValue: true, multiple: true },
    { value: "!in", label: "excluding any of", requiresValue: true, multiple: true },
  ],
  fields: [
    {
      alias: "city",
      object: "lead",
      label: "City",
      type: "text",
      control: "text",
      multiple: false,
      operators: [
        { value: "=", label: "equals" },
        { value: "!=", label: "not equal" },
        { value: "empty", label: "empty" },
        { value: "like", label: "like" },
      ],
    },
    {
      alias: "points",
      object: "lead",
      label: "Points",
      type: "number",
      control: "number",
      multiple: false,
      operators: [
        { value: "=", label: "equals" },
        { value: "gte", label: "greater than or equal" },
      ],
    },
    {
      alias: "country",
      object: "lead",
      label: "Country",
      type: "country",
      control: "select",
      multiple: false,
      choiceMode: "remote",
      choices: [],
      choiceSource: { type: "country", searchable: true },
      operators: [
        { value: "=", label: "equals" },
        { value: "in", label: "including any of" },
      ],
    },
    {
      alias: "tags",
      object: "lead",
      label: "Tags",
      type: "tags",
      control: "select",
      multiple: true,
      choiceMode: "inline",
      choiceCount: 2,
      choices: [
        { value: "1", label: "Hiii" },
        { value: "4", label: "QA Campaign Builder Tag" },
      ],
      operators: [
        { value: "in", label: "including any of" },
        { value: "empty", label: "empty" },
      ],
    },
    {
      alias: "companycity",
      object: "company",
      label: "Company City",
      type: "text",
      control: "text",
      multiple: false,
      operators: [{ value: "=", label: "equals" }],
    },
  ],
});

const index = () => buildFilterMetadataIndex(metadata());
const fieldNamed = (alias, object = "lead") =>
  findFilterField(index(), { field: alias, object });

// --- metadata ---------------------------------------------------------------

test("fields are keyed by object and alias, so contact and company never collide", () => {
  const idx = index();

  assert.equal(findFilterField(idx, { field: "city", object: "lead" }).label, "City");
  assert.equal(
    findFilterField(idx, { field: "companycity", object: "company" }).label,
    "Company City"
  );
  assert.equal(findFilterField(idx, { field: "city", object: "company" }), null);
  assert.equal(findFilterField(idx, { field: "nope", object: "lead" }), null);
});

test("a field's operators come from the provider, never from a local list", () => {
  assert.deepEqual(
    operatorsForField(fieldNamed("city")).map((operator) => operator.value),
    ["=", "!=", "empty", "like"]
  );
  assert.deepEqual(
    operatorsForField(fieldNamed("points")).map((operator) => operator.value),
    ["=", "gte"]
  );
  assert.deepEqual(operatorsForField(null), []);
});

// --- value control ----------------------------------------------------------

test("the value control follows the field, and how many values follows the operator", () => {
  const idx = index();

  const text = filterValueControl(fieldNamed("city"), "=", idx);
  assert.equal(text.control, "text");
  assert.equal(text.multiple, false);
  assert.equal(text.requiresValue, true);

  const many = filterValueControl(fieldNamed("country"), "in", idx);
  assert.equal(many.control, "select");
  assert.equal(many.multiple, true, "an in-operator takes a set of values");

  const one = filterValueControl(fieldNamed("country"), "=", idx);
  assert.equal(one.multiple, false);
});

test("an operator that takes no value says so", () => {
  const control = filterValueControl(fieldNamed("city"), "empty", index());

  assert.equal(control.requiresValue, false);
});

test("inline options travel with the field; a reference catalog does not", () => {
  const tags = filterValueControl(fieldNamed("tags"), "in", index());
  assert.equal(tags.choiceMode, "inline");
  assert.equal(tags.choices.length, 2);

  const country = filterValueControl(fieldNamed("country"), "=", index());
  assert.equal(country.choiceMode, "remote");
  assert.deepEqual(country.choices, []);
  assert.deepEqual(country.choiceSource, { type: "country", searchable: true });
});

// --- rows -------------------------------------------------------------------

test("a new row takes the field's first operator and no value", () => {
  const row = newFilterRow(fieldNamed("city"));

  assert.deepEqual(row, {
    glue: "and",
    field: "city",
    object: "lead",
    type: "text",
    operator: "=",
    properties: {},
  });
});

test("changing the field resets the operator and the value", () => {
  const row = setFilterRowValue(newFilterRow(fieldNamed("city")), "Surat");
  const changed = setFilterRowField(row, fieldNamed("points"));

  assert.equal(changed.field, "points");
  assert.equal(changed.type, "number");
  assert.equal(changed.operator, "=", "an operator City accepts may not suit Points");
  assert.deepEqual(changed.properties, {}, "Surat is not a points value");
});

test("changing the field keeps the row's place in the chain", () => {
  const row = setFilterRowGlue(newFilterRow(fieldNamed("city")), "or");

  assert.equal(setFilterRowField(row, fieldNamed("points")).glue, "or");
});

test("switching to an operator that takes no value clears the value", () => {
  const idx = index();
  const row = setFilterRowValue(newFilterRow(fieldNamed("city")), "Surat");

  const emptied = setFilterRowOperator(row, "empty", idx);

  assert.equal(emptied.operator, "empty");
  assert.deepEqual(emptied.properties, {});
});

test("switching between one value and many converts rather than discards", () => {
  const idx = index();
  const single = setFilterRowValue(newFilterRow(fieldNamed("country")), "India");

  const many = setFilterRowOperator(single, "in", idx);
  assert.deepEqual(filterRowValue(many), ["India"]);

  const backToOne = setFilterRowOperator(many, "=", idx);
  assert.equal(filterRowValue(backToOne), "India");
});

test("the glue is only and or or", () => {
  const row = newFilterRow(fieldNamed("city"));

  assert.equal(setFilterRowGlue(row, "or").glue, "or");
  assert.equal(setFilterRowGlue(row, "maybe").glue, DEFAULT_GLUE);
});

test("rows are added, updated and removed by position", () => {
  let rows = addFilterRow([], fieldNamed("city"));
  rows = addFilterRow(rows, fieldNamed("points"));
  assert.deepEqual(rows.map((row) => row.field), ["city", "points"]);

  rows = updateFilterRow(rows, 1, setFilterRowValue(rows[1], 10));
  assert.equal(filterRowValue(rows[1]), 10);

  rows = removeFilterRow(rows, 0);
  assert.deepEqual(rows.map((row) => row.field), ["points"]);
  assert.equal(filterRowValue(rows[0]), 10, "the surviving row keeps its value");
});

test("blank values are recognised the way the provider treats them", () => {
  assert.equal(isBlankFilterValue(""), true);
  assert.equal(isBlankFilterValue([]), true);
  assert.equal(isBlankFilterValue(null), true);
  assert.equal(isBlankFilterValue(undefined), true);
  assert.equal(isBlankFilterValue(0), false);
  assert.equal(isBlankFilterValue("0"), false);
});

// --- hydration (§9: reopening must show exactly what was saved) --------------

test("saved filters reload exactly: same fields, operators, values and glue", () => {
  const saved = [
    {
      glue: "and",
      field: "country",
      object: "lead",
      type: "country",
      operator: "=",
      properties: { filter: "India" },
    },
    {
      glue: "and",
      field: "city",
      object: "lead",
      type: "text",
      operator: "=",
      properties: { filter: "Surat" },
    },
  ];

  const rows = hydrateFilterRows(saved);

  assert.deepEqual(rows, saved);
  assert.deepEqual(toFilterPayload(rows), saved, "a round trip changes nothing");
});

test("an OR chain survives the round trip", () => {
  const saved = [
    { glue: "and", field: "city", object: "lead", type: "text", operator: "=", properties: { filter: "Surat" } },
    { glue: "or", field: "points", object: "lead", type: "number", operator: "gte", properties: { filter: "10" } },
  ];

  assert.deepEqual(toFilterPayload(hydrateFilterRows(saved)), saved);
});

test("the stale legacy value a PATCH leaves behind is ignored", () => {
  // Mautic keeps a legacy top-level `filter` that a PATCH can leave out of date;
  // ContactSegmentFilterCrate reads properties.filter first, and so must this.
  const saved = [
    {
      glue: "and",
      field: "city",
      object: "lead",
      type: "text",
      operator: "like",
      properties: { filter: "Sur" },
      filter: "Surat",
      display: null,
    },
  ];

  const [row] = hydrateFilterRows(saved);

  assert.equal(filterRowValue(row), "Sur");
  assert.equal("filter" in row, false, "no legacy key is carried into the editor");
  assert.equal("display" in row, false);
});

test("a legacy row with only the flat value still hydrates", () => {
  const [row] = hydrateFilterRows([
    { glue: "and", field: "city", object: "lead", type: "text", operator: "=", filter: "Surat" },
  ]);

  assert.equal(filterRowValue(row), "Surat");
});

test("the first row is always joined with and, as Mautic stores it", () => {
  const [row] = hydrateFilterRows([
    { glue: "or", field: "city", object: "lead", type: "text", operator: "=", properties: { filter: "x" } },
  ]);

  assert.equal(row.glue, "and");
  assert.equal(toFilterPayload([{ ...row, glue: "or" }])[0].glue, "and");
});

test("an operator with no value is written without one", () => {
  const rows = [setFilterRowOperator(newFilterRow(fieldNamed("city")), "empty", index())];

  assert.deepEqual(toFilterPayload(rows)[0].properties, {});
});

test("no filters means a static segment", () => {
  assert.deepEqual(toFilterPayload([]), []);
  assert.deepEqual(hydrateFilterRows(undefined), []);
  assert.deepEqual(hydrateFilterRows(null), []);
});

// --- validation -------------------------------------------------------------

test("a complete filter set is valid", () => {
  const rows = [
    setFilterRowValue(newFilterRow(fieldNamed("city")), "Surat"),
    setFilterRowGlue(setFilterRowValue(newFilterRow(fieldNamed("points")), 10), "or"),
  ];

  const result = validateSegmentFilters(rows, index());

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("a missing value is reported against its row", () => {
  const rows = [newFilterRow(fieldNamed("city"))];

  const issues = validateFilterRows(rows, index());

  assert.equal(issues.length, 1);
  assert.equal(issues[0].position, 0);
  assert.equal(issues[0].message, "Filter 1: City needs a value.");
});

test("an operator the field does not accept is rejected", () => {
  const rows = [{ ...newFilterRow(fieldNamed("city")), operator: "gte", properties: { filter: "x" } }];

  assert.match(
    validateFilterRows(rows, index())[0].message,
    /that condition is not available for City/
  );
});

test("a field this Mautic does not offer is rejected", () => {
  const rows = [
    { glue: "and", field: "invented", object: "lead", operator: "=", properties: { filter: "x" } },
  ];

  assert.match(validateFilterRows(rows, index())[0].message, /not a filter this Mautic/);
});

test("an operator that needs no value passes without one", () => {
  const rows = [setFilterRowOperator(newFilterRow(fieldNamed("city")), "empty", index())];

  assert.deepEqual(validateFilterRows(rows, index()), []);
});

test("a number field rejects a value that is not a number", () => {
  const rows = [setFilterRowValue(newFilterRow(fieldNamed("points")), "lots")];

  assert.match(validateFilterRows(rows, index())[0].message, /must be a number/);
  assert.deepEqual(
    validateFilterRows([setFilterRowValue(newFilterRow(fieldNamed("points")), "10")], index()),
    []
  );
});

test("an inline option that no longer exists is rejected", () => {
  const rows = [
    setFilterRowValue(
      setFilterRowOperator(newFilterRow(fieldNamed("tags")), "in", index()),
      ["999"]
    ),
  ];

  assert.match(validateFilterRows(rows, index())[0].message, /no longer offers/);
  assert.deepEqual(
    validateFilterRows(
      [setFilterRowValue(setFilterRowOperator(newFilterRow(fieldNamed("tags")), "in", index()), ["4"])],
      index()
    ),
    []
  );
});

test("a remote catalog value is left to the provider", () => {
  const rows = [setFilterRowValue(newFilterRow(fieldNamed("country")), "India")];

  assert.deepEqual(validateFilterRows(rows, index()), []);
});

test("every broken row is reported, not just the first", () => {
  const rows = [newFilterRow(fieldNamed("city")), newFilterRow(fieldNamed("points"))];

  assert.equal(validateFilterRows(rows, index()).length, 2);
});

test("no rows at all is valid — that is a static segment", () => {
  assert.equal(validateSegmentFilters([], index()).valid, true);
});

// --- the contract the Segments page depends on ------------------------------
// The page crashed once because the helpers were extracted into this module but
// never imported by their consumer. These tests hold the module's side of that
// contract: the names the page imports exist, are callable, and work on real
// provider metadata.

import * as segmentFilters from "../mauticSegmentFilters.js";
import { segmentFilterMetadata as providerMetadata } from "../__fixtures__/segmentFilterMetadata.mjs";

test("every helper the Segments page imports is exported and callable", () => {
  for (const name of [
    "buildFilterMetadataIndex",
    "hydrateFilterRows",
    "toFilterPayload",
    "validateSegmentFilters",
  ]) {
    assert.equal(typeof segmentFilters[name], "function", `${name} must be exported`);
  }

  // And callable on nothing at all, which is how the page first renders.
  assert.doesNotThrow(() => segmentFilters.buildFilterMetadataIndex(undefined));
  assert.doesNotThrow(() => segmentFilters.hydrateFilterRows(undefined));
  assert.doesNotThrow(() => segmentFilters.toFilterPayload(undefined));
  assert.doesNotThrow(() =>
    segmentFilters.validateSegmentFilters(undefined, segmentFilters.buildFilterMetadataIndex(null))
  );
});

test("every helper the filter editor imports is exported and callable", () => {
  for (const name of [
    "GLUES",
    "addFilterRow",
    "filterFieldList",
    "filterRowValue",
    "filterValueControl",
    "findFilterField",
    "operatorsForField",
    "removeFilterRow",
    "setFilterRowField",
    "setFilterRowGlue",
    "setFilterRowOperator",
    "setFilterRowValue",
    "updateFilterRow",
    "validateFilterRows",
  ]) {
    assert.ok(segmentFilters[name] !== undefined, `${name} must be exported`);
  }
});

test("an empty or missing metadata response yields a safe, empty index", () => {
  for (const input of [undefined, null, {}, { fields: null, operators: "nonsense" }]) {
    const idx = segmentFilters.buildFilterMetadataIndex(input);
    assert.equal(idx.fields.size, 0);
    assert.equal(idx.operators.size, 0);
    assert.deepEqual(segmentFilters.filterFieldList(idx), []);
    assert.equal(segmentFilters.findFilterField(idx, { field: "city", object: "lead" }), null);
  }
});

test("real provider metadata builds the field lookup the editor reads", () => {
  const idx = segmentFilters.buildFilterMetadataIndex(providerMetadata);

  assert.equal(idx.fields.size, providerMetadata.fields.length);
  assert.equal(idx.operators.size, providerMetadata.operators.length);

  const city = segmentFilters.findFilterField(idx, { field: "city", object: "lead" });
  assert.equal(city.label, "City");
  assert.equal(city.control, "text");
  assert.ok(
    segmentFilters.operatorsForField(city).some((operator) => operator.value === "like"),
    "a field keeps the operators the provider gave it"
  );

  // Mautic labels a company field plainly — contact "City" and company "City"
  // share a label and are told apart only by their object, which is why the
  // index is keyed by both and the editor groups the list by object.
  const companyCity = segmentFilters.findFilterField(idx, {
    field: "companycity",
    object: "company",
  });
  assert.equal(companyCity.label, "City");
  assert.equal(companyCity.object, "company");
  assert.notEqual(companyCity.alias, city.alias);
  assert.equal(segmentFilters.findFilterField(idx, { field: "companycity", object: "lead" }), null);
});

test("behavioural fields keep their labels and options", () => {
  const idx = segmentFilters.buildFilterMetadataIndex(providerMetadata);
  const tags = segmentFilters.findFilterField(idx, { field: "tags", object: "lead" });

  assert.equal(tags.label, "Tags");
  assert.equal(tags.control, "select");
  assert.deepEqual(
    tags.choices.map((choice) => choice.label),
    ["Hiii", "QA Campaign Builder Tag"],
    "options are labelled, not shown as raw ids"
  );

  const control = segmentFilters.filterValueControl(tags, "in", idx);
  assert.equal(control.multiple, true);
  assert.equal(control.choices.length, 2);

  const segmentMembership = segmentFilters.findFilterField(idx, {
    field: "leadlist",
    object: "lead",
  });
  assert.equal(segmentMembership.label, "Segment Membership");
  assert.ok(segmentMembership.choices.length, "segments are listed by name");
});

test("a saved QA filter set round-trips against real metadata", () => {
  const idx = segmentFilters.buildFilterMetadataIndex(providerMetadata);
  const saved = [
    { glue: "and", field: "city", object: "lead", type: "text", operator: "=", properties: { filter: "Surat" } },
    { glue: "or", field: "tags", object: "lead", type: "tags", operator: "in", properties: { filter: ["4"] } },
  ];

  const rows = segmentFilters.hydrateFilterRows(saved);

  assert.deepEqual(segmentFilters.toFilterPayload(rows), saved);
  assert.equal(segmentFilters.validateSegmentFilters(rows, idx).valid, true);
});
