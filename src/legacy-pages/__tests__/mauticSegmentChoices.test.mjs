// Segment filter values that Mautic describes by reference rather than inlining.
//
// Everything here is decided from the provider metadata in the fixture — no test
// names a country, a region or a locale, and none asserts on a field alias to
// choose a control.

import test from "node:test";
import assert from "node:assert/strict";

import { segmentFilterMetadata } from "../__fixtures__/segmentFilterMetadata.mjs";
import {
  buildFilterMetadataIndex,
  filterValueControl,
  findFilterField,
  newFilterRow,
  setFilterRowField,
  setFilterRowOperator,
  setFilterRowValue,
  filterRowValue,
} from "../mauticSegmentFilters.js";
import {
  SEGMENT_REFERENCE_SOURCES,
  isServableChoiceSource,
  remoteChoiceFieldDescriptor,
  segmentChoiceRequestParams,
  usesRemoteChoices,
} from "../mauticSegmentChoices.js";
import {
  appendChoicePage,
  choiceCacheKey,
  createChoiceLabelStore,
  hasMoreChoices,
  mergeSelectedChoices,
  nextChoiceStart,
  normalizeChoiceResults,
  selectedValueList,
} from "../mauticCampaignChoices.js";

const index = buildFilterMetadataIndex(segmentFilterMetadata);

const field = (alias, object = "lead") => {
  const found = findFilterField(index, { field: alias, object });
  assert.ok(found, `fixture is missing ${object}.${alias}`);
  return found;
};

// The fixture's own classification, so the tests follow the provider rather than
// a list of field names kept here.
const aliasWithSource = (type) => {
  const match = (segmentFilterMetadata.fields || []).find(
    (entry) => entry.choiceSource?.type === type
  );
  assert.ok(match, `fixture has no field sourced from ${type}`);
  return match;
};

const REFERENCE = aliasWithSource("country"); // servable reference catalog
const SECOND_REFERENCE = aliasWithSource("region"); // a different servable one
const UNSERVABLE = aliasWithSource("segment_field"); // remote, but nothing serves it

const controlFor = (entry, operator) =>
  filterValueControl(field(entry.alias, entry.object), operator, index);

// 1. remote provider metadata chooses remote selector
test("a field the provider describes by reference gets the remote selector", () => {
  const control = controlFor(REFERENCE, "=");
  assert.equal(control.choiceMode, "remote");
  assert.equal(control.choices.length, 0);
  assert.equal(usesRemoteChoices(control), true);
});

// 2. text field remains text
test("a plain text field is still typed in", () => {
  const text = (segmentFilterMetadata.fields || []).find(
    (entry) => !entry.choiceMode && entry.control !== "select"
  );
  assert.ok(text, "fixture has no plain text field");
  const control = controlFor(text, "=");
  assert.equal(usesRemoteChoices(control), false);
  assert.equal(control.choices.length, 0);
});

// 3. inline field remains inline select
test("a field whose choices the provider inlined is still an inline select", () => {
  const inline = (segmentFilterMetadata.fields || []).find(
    (entry) => entry.choiceMode === "inline"
  );
  assert.ok(inline, "fixture has no inline choice field");
  const control = controlFor(inline, "=");
  assert.equal(usesRemoteChoices(control), false);
  assert.ok(control.choices.length > 0);
});

test("a remote source ECP cannot serve falls back rather than offering an empty list", () => {
  const control = controlFor(UNSERVABLE, "=");
  assert.equal(control.choiceMode, "remote");
  assert.equal(isServableChoiceSource(control.choiceSource), false);
  assert.equal(usesRemoteChoices(control), false);
});

test("only the catalogs the bridge publishes are treated as servable", () => {
  assert.deepEqual([...SEGMENT_REFERENCE_SOURCES].sort(), [
    "country",
    "locale",
    "region",
    "timezone",
  ]);
});

// 4. remote single selection
test("a single-value operator selects one provider value", () => {
  const control = controlFor(REFERENCE, "=");
  assert.equal(control.multiple, false);

  const descriptor = remoteChoiceFieldDescriptor(
    field(REFERENCE.alias, REFERENCE.object),
    control,
    0
  );
  assert.equal(descriptor.multiple, false);
  assert.deepEqual(selectedValueList("India", descriptor.multiple), ["India"]);
});

// 5. remote multi selection
test("a multi-value operator selects several provider values", () => {
  const multiOperator = (REFERENCE.operators || []).find((operator) =>
    ["in", "!in"].includes(String(operator.value))
  );
  assert.ok(multiOperator, "fixture field has no multi-value operator");

  const control = controlFor(REFERENCE, multiOperator.value);
  assert.equal(control.multiple, true);

  const descriptor = remoteChoiceFieldDescriptor(
    field(REFERENCE.alias, REFERENCE.object),
    control,
    2
  );
  assert.equal(descriptor.multiple, true);
  assert.deepEqual(
    selectedValueList(["India", "Indonesia"], descriptor.multiple),
    ["India", "Indonesia"]
  );
});

// 6. search behaviour, as far as it is pure: a search is a fresh first page and
// can never be answered out of another query's cache entry.
test("a search asks for a fresh first page under its own cache key", () => {
  const source = REFERENCE.choiceSource;

  const unfiltered = segmentChoiceRequestParams(source, { search: "", start: 0 });
  const searched = segmentChoiceRequestParams(source, { search: "ind", start: 0 });

  assert.equal(unfiltered.search, undefined); // no empty term sent to the provider
  assert.equal(searched.search, "ind");
  assert.equal(searched.start, 0);
  assert.notEqual(
    choiceCacheKey(source, { search: "", start: 0 }),
    choiceCacheKey(source, { search: "ind", start: 0 })
  );
});

// 7. pagination / Load More
test("paging asks for the next page and stops when the provider says so", () => {
  const source = REFERENCE.choiceSource;
  const first = segmentChoiceRequestParams(source, { start: 0, limit: 25 });
  assert.deepEqual(first, { source: "country", start: 0, limit: 25 });

  const page = { results: [{ value: "A", label: "A" }], start: 0, limit: 25, hasMore: true };
  assert.equal(hasMoreChoices(page), true);
  assert.equal(nextChoiceStart(page, 25), 25);

  const second = segmentChoiceRequestParams(source, { start: 25, limit: 25 });
  assert.equal(second.start, 25);

  const last = { results: [], start: 25, limit: 25, hasMore: false };
  assert.equal(hasMoreChoices(last), false);
});

test("a page keeps its own cache entry per source, search and offset", () => {
  const source = REFERENCE.choiceSource;
  const other = SECOND_REFERENCE.choiceSource;
  const keys = new Set([
    choiceCacheKey(source, { start: 0 }),
    choiceCacheKey(source, { start: 25 }),
    choiceCacheKey(source, { search: "ind", start: 0 }),
    choiceCacheKey(other, { start: 0 }),
  ]);
  assert.equal(keys.size, 4);
});

// 8. selected-value hydration
test("a saved value is resolved by value lookup, not by paging the catalog", () => {
  const source = REFERENCE.choiceSource;
  const params = segmentChoiceRequestParams(source, { values: ["India"] });
  assert.deepEqual(params, { source: "country", values: ["India"] });
  assert.equal("start" in params, false);
  assert.equal("limit" in params, false);
});

test("a saved value reads as its provider label once resolved", () => {
  const store = createChoiceLabelStore();
  store.markPending("segment::country", ["India"]);
  store.resolve("segment::country", [{ value: "India", label: "India" }]);

  const known = store.known("segment::country", ["India"]);
  assert.deepEqual(known, [{ value: "India", label: "India" }]);
});

test("a saved value stays visible even when the loaded page does not contain it", () => {
  const rendered = mergeSelectedChoices(
    [{ value: "Albania", label: "Albania" }],
    [{ value: "India", label: "India" }],
    ["India"]
  );
  assert.ok(rendered.some((choice) => String(choice.value) === "India"));
});

// 9. raw provider value preserved
test("the row stores the provider's own value, never its label", () => {
  const row = setFilterRowValue(
    newFilterRow(field(REFERENCE.alias, REFERENCE.object)),
    "India"
  );
  assert.equal(filterRowValue(row), "India");

  const normalized = normalizeChoiceResults({
    results: [{ value: "India", label: "India" }],
  });
  assert.equal(normalized[0].value, "India");
});

// 10. field change clears remote value
test("changing the field drops a value that belonged to the old field", () => {
  const start = setFilterRowValue(
    newFilterRow(field(REFERENCE.alias, REFERENCE.object)),
    "India"
  );
  const moved = setFilterRowField(
    start,
    field(SECOND_REFERENCE.alias, SECOND_REFERENCE.object)
  );

  assert.equal(moved.field, SECOND_REFERENCE.alias);
  const carried = filterRowValue(moved);
  assert.ok(
    carried === "" || carried === undefined || carried === null ||
      (Array.isArray(carried) && carried.length === 0),
    `value survived a field change: ${JSON.stringify(carried)}`
  );
});

// 11. operator scalar→multi normalization
test("moving between single and multi value operators keeps the value usable", () => {
  const multiOperator = (REFERENCE.operators || []).find((operator) =>
    ["in", "!in"].includes(String(operator.value))
  );
  assert.ok(multiOperator);

  const single = setFilterRowValue(
    newFilterRow(field(REFERENCE.alias, REFERENCE.object)),
    "India"
  );
  const asMulti = setFilterRowOperator(single, multiOperator.value, index);
  assert.deepEqual(filterRowValue(asMulti), ["India"]);

  const backToSingle = setFilterRowOperator(asMulti, "=", index);
  assert.equal(filterRowValue(backToSingle), "India");
});

// 12. operator with no value does not fetch choices
test("an operator that takes no value offers no picker and no request", () => {
  const empty = (REFERENCE.operators || []).find(
    (operator) => String(operator.value) === "empty"
  );
  assert.ok(empty, "fixture field has no valueless operator");

  const control = controlFor(REFERENCE, empty.value);
  assert.equal(control.requiresValue, false);
  assert.equal(usesRemoteChoices(control), false);
});

// 13. failed lookup preserves safe fallback
test("a lookup that fails keeps the saved value and is not retried in a loop", () => {
  const store = createChoiceLabelStore();
  store.markPending("segment::country", ["Atlantis"]);
  store.markFailed("segment::country", ["Atlantis"]);

  assert.equal(store.isFailed("segment::country", "Atlantis"), true);
  assert.deepEqual(store.needed("segment::country", ["Atlantis"]), [], "no retry loop");

  // A failed lookup stores no label; the saved value is still shown, flagged.
  assert.deepEqual(store.known("segment::country", ["Atlantis"]), []);
  assert.deepEqual(
    mergeSelectedChoices([], store.known("segment::country", ["Atlantis"]), ["Atlantis"]),
    [{ value: "Atlantis", label: "Atlantis", unresolved: true }]
  );
});

test("an unservable source produces no request at all", () => {
  assert.equal(segmentChoiceRequestParams(UNSERVABLE.choiceSource, {}), null);
  assert.equal(segmentChoiceRequestParams(null, {}), null);
  assert.equal(segmentChoiceRequestParams({ type: "nonsense" }, {}), null);
});

// 14. stale response cannot overwrite current field selection
test("a page fetched for one source or search can never answer another", () => {
  const source = REFERENCE.choiceSource;
  const other = SECOND_REFERENCE.choiceSource;

  // Namespacing is what keeps the segment editor's cache apart from the
  // campaign builder's, even where both name the same provider catalog.
  const segmentKey = `segment::${choiceCacheKey(source, { search: "ind", start: 0 })}`;
  const campaignKey = choiceCacheKey(source, { search: "ind", start: 0 });
  assert.notEqual(segmentKey, campaignKey);

  assert.notEqual(
    choiceCacheKey(source, { search: "ind", start: 0 }),
    choiceCacheKey(other, { search: "ind", start: 0 })
  );
});

test("a later page cannot duplicate values an earlier one already showed", () => {
  const merged = appendChoicePage(
    [{ value: "India", label: "India" }],
    [{ value: "India", label: "India" }, { value: "Indonesia", label: "Indonesia" }]
  );
  assert.equal(merged.length, 2);
});

test("the descriptor the picker receives is built from provider metadata only", () => {
  const entryField = field(REFERENCE.alias, REFERENCE.object);
  const control = controlFor(REFERENCE, "=");
  const descriptor = remoteChoiceFieldDescriptor(entryField, control, 3);

  // Labelled like every other control in the value column; the field's own
  // label is carried for the search box, not for the control.
  assert.equal(descriptor.label, "Value");
  assert.equal(descriptor.searchLabel, entryField.label);
  assert.equal(descriptor.required, false);
  assert.deepEqual(descriptor.choiceSource, control.choiceSource);
  assert.ok(descriptor.path.includes("3"));
});

test("the provider's region catalog is not scoped to a country", () => {
  // Mautic's region list is global and grouped by country; nothing in the
  // metadata couples it to a country filter, so nothing here may invent one.
  const source = SECOND_REFERENCE.choiceSource;
  assert.equal(source.scope, undefined);
  assert.deepEqual(segmentChoiceRequestParams(source, { start: 0, limit: 25 }), {
    source: "region",
    start: 0,
    limit: 25,
  });
});
