import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_CHOICE_PAGE_SIZE,
  createChoiceLabelStore,
  selectionKey,
  appendChoicePage,
  choiceCacheKey,
  hasMoreChoices,
  nextChoiceStart,
  choiceRequestParams,
  choiceSourceKey,
  isRemoteChoiceField,
  mergeSelectedChoices,
  missingSelectedValues,
  normalizeChoiceResults,
  selectedValueList,
} from "../mauticCampaignChoices.js";

const inlineField = () => ({
  name: "priority",
  label: "Priority",
  choiceMode: "inline",
  choiceKind: "enum",
  choiceCount: 2,
  choices: [
    { label: "Normal", value: "2" },
    { label: "High", value: "1" },
  ],
});

const remoteEventField = () => ({
  name: "device_brand",
  label: "Device brand",
  multiple: true,
  choiceMode: "remote",
  choiceKind: "enum",
  choiceCount: 2106,
  choices: [],
  choiceSource: {
    type: "event_field",
    kind: "enum",
    searchable: true,
    paginated: true,
    total: 2106,
    scope: { eventType: "condition", key: "lead.device", field: "device_brand" },
  },
});

const remoteReferenceField = () => ({
  name: "state",
  label: "State",
  choiceMode: "remote",
  choiceKind: "reference",
  choiceCount: 3794,
  choices: [],
  choiceSource: { type: "region", kind: "reference", searchable: true, paginated: true },
});

test("inline choice fields are left exactly as they are", () => {
  assert.equal(isRemoteChoiceField(inlineField()), false);
  assert.equal(inlineField().choices.length, 2);
  // A legacy schema field with no choice metadata at all stays inline.
  assert.equal(isRemoteChoiceField({ name: "x", choices: [{ value: "1" }] }), false);
});

test("remote fields are recognised by their provider metadata", () => {
  assert.equal(isRemoteChoiceField(remoteEventField()), true);
  assert.equal(isRemoteChoiceField(remoteReferenceField()), true);
  // choiceMode without a source is not usable and must not claim to be remote.
  assert.equal(isRemoteChoiceField({ choiceMode: "remote" }), false);
});

test("event-field lookups carry the provider scope", () => {
  assert.deepEqual(
    choiceRequestParams(remoteEventField().choiceSource, { search: "apple" }),
    {
      source: "event_field",
      eventType: "condition",
      key: "lead.device",
      field: "device_brand",
      search: "apple",
      start: 0,
      limit: DEFAULT_CHOICE_PAGE_SIZE,
    }
  );
});

test("reference catalogs are requested from the existing bridge source", () => {
  assert.deepEqual(choiceRequestParams(remoteReferenceField().choiceSource, {}), {
    source: "region",
    start: 0,
    limit: DEFAULT_CHOICE_PAGE_SIZE,
  });
});

test("resolving saved values asks for those values, not a page", () => {
  const params = choiceRequestParams(remoteEventField().choiceSource, {
    values: ["AP", "SA"],
    search: "ignored",
  });

  assert.deepEqual(params.values, ["AP", "SA"]);
  assert.equal("search" in params, false);
  assert.equal("start" in params, false);
});

test("an incomplete provider scope yields no request at all", () => {
  assert.equal(
    choiceRequestParams({ type: "event_field", scope: { key: "lead.device" } }),
    null
  );
  assert.equal(choiceRequestParams(null), null);
});

test("the same catalog referenced twice shares one cache key", () => {
  const a = choiceSourceKey(remoteReferenceField().choiceSource);
  const b = choiceSourceKey({ type: "region", kind: "reference" });
  assert.equal(a, b);
  assert.notEqual(a, choiceSourceKey(remoteEventField().choiceSource));
});

test("provider results are normalised to value/label pairs", () => {
  const results = normalizeChoiceResults({
    results: [
      { value: "AP", label: "Apple" },
      { value: "AL", label: "Alabama", group: "United States" },
      { value: 0, label: "Zero" },
      { label: "no value" },
      "junk",
    ],
  });

  assert.deepEqual(results, [
    { value: "AP", label: "Apple" },
    { value: "AL", label: "Alabama", group: "United States" },
    { value: 0, label: "Zero" },
  ]);
});

test("single and multi select selections are read consistently", () => {
  assert.deepEqual(selectedValueList("23", false), ["23"]);
  assert.deepEqual(selectedValueList("", false), []);
  assert.deepEqual(selectedValueList(["4", "1"], true), ["4", "1"]);
  assert.deepEqual(selectedValueList([], true), []);
  assert.deepEqual(selectedValueList(undefined, true), []);
});

test("a saved selection stays visible when it is not on the loaded page", () => {
  const options = [
    { value: "2E", label: "2E" },
    { value: "5IVE", label: "5IVE" },
  ];
  const merged = mergeSelectedChoices(options, [{ value: "AP", label: "Apple" }], ["AP"]);

  assert.deepEqual(merged[0], { value: "AP", label: "Apple" });
  assert.equal(merged.length, 3);
});

test("an unresolvable saved value is shown raw, never dropped", () => {
  const merged = mergeSelectedChoices([{ value: "2E", label: "2E" }], [], ["GONE"]);

  assert.equal(merged.length, 2);
  assert.deepEqual(merged[0], { value: "GONE", label: "GONE", unresolved: true });
});

test("selected values are not duplicated once the page contains them", () => {
  const merged = mergeSelectedChoices(
    [{ value: "AP", label: "Apple" }],
    [{ value: "AP", label: "Apple" }],
    ["AP"]
  );

  assert.equal(merged.length, 1);
});

test("only unknown selected values are looked up", () => {
  assert.deepEqual(
    missingSelectedValues(["AP", "SA"], [{ value: "AP", label: "Apple" }]),
    ["SA"]
  );
  assert.deepEqual(missingSelectedValues([], []), []);
  assert.deepEqual(
    missingSelectedValues(["23"], [{ value: 23, label: "QA Email (23)" }]),
    [],
    "provider values may come back as numbers"
  );
});

// --- paging: a 2106-value provider list must never arrive in one go ---

test("the default page is small, never the whole catalog", () => {
  assert.ok(DEFAULT_CHOICE_PAGE_SIZE <= 50);
  assert.equal(
    choiceRequestParams(remoteEventField().choiceSource, {}).limit,
    DEFAULT_CHOICE_PAGE_SIZE
  );
  assert.notEqual(choiceRequestParams(remoteEventField().choiceSource, {}).limit, 2106);
});

test("opening asks for the first page only", () => {
  const params = choiceRequestParams(remoteEventField().choiceSource, {});
  assert.equal(params.start, 0);
  assert.equal(params.limit, DEFAULT_CHOICE_PAGE_SIZE);
  assert.equal("search" in params, false);
});

test("a search starts again at the first page", () => {
  const params = choiceRequestParams(remoteEventField().choiceSource, {
    search: "apple",
    start: 0,
  });
  assert.equal(params.start, 0);
  assert.equal(params.search, "apple");
  assert.equal(params.limit, DEFAULT_CHOICE_PAGE_SIZE);
});

test("the next page continues from where the provider said this one ended", () => {
  const page = { results: [], total: 2106, start: 0, limit: 25, hasMore: true };
  assert.equal(nextChoiceStart(page, 25), 25);
  assert.equal(nextChoiceStart({ start: 25, limit: 25 }, 50), 50);
  // Provider that omits paging metadata: continue after what we hold.
  assert.equal(nextChoiceStart({}, 40), 40);
});

test("paging stops when the provider says there is no more", () => {
  assert.equal(hasMoreChoices({ hasMore: true }), true);
  assert.equal(hasMoreChoices({ hasMore: false }), false);
  assert.equal(hasMoreChoices({ total: 2106 }), false);
  assert.equal(hasMoreChoices(undefined), false);
});

test("pages accumulate without duplicating a repeated provider value", () => {
  const page1 = [
    { value: "v1", label: "One" },
    { value: "v2", label: "Two" },
  ];
  const page2 = [
    { value: "v2", label: "Two" },
    { value: "v3", label: "Three" },
  ];

  const merged = appendChoicePage(page1, page2);

  assert.deepEqual(
    merged.map((choice) => choice.value),
    ["v1", "v2", "v3"]
  );
  assert.equal(appendChoicePage(merged, []).length, 3);
  assert.equal(appendChoicePage([], page1).length, 2);
});

test("each page and each search is cached under its own key", () => {
  const source = remoteEventField().choiceSource;
  const first = choiceCacheKey(source, { search: "", start: 0 });
  const second = choiceCacheKey(source, { search: "", start: 25 });
  const searched = choiceCacheKey(source, { search: "apple", start: 0 });

  assert.notEqual(first, second, "page 2 must not read page 1's cache");
  assert.notEqual(first, searched, "a search must not read the unfiltered cache");
  assert.equal(first, choiceCacheKey(source, { search: "", start: 0 }));
});

test("a value lookup is cached apart from any page, and order-independently", () => {
  const source = remoteEventField().choiceSource;
  const values = choiceCacheKey(source, { values: ["AP", "SA"] });

  assert.notEqual(values, choiceCacheKey(source, { search: "", start: 0 }));
  assert.equal(values, choiceCacheKey(source, { values: ["SA", "AP"] }));
});

test("two different sources never share a cache entry", () => {
  assert.notEqual(
    choiceCacheKey(remoteEventField().choiceSource, { search: "", start: 0 }),
    choiceCacheKey(remoteReferenceField().choiceSource, { search: "", start: 0 })
  );
});

test("resolving a saved value never asks for a page of the catalog", () => {
  const params = choiceRequestParams(remoteEventField().choiceSource, {
    values: ["AP"],
  });

  assert.deepEqual(params.values, ["AP"]);
  assert.equal("limit" in params, false, "a value lookup is not a page request");
  assert.equal("start" in params, false);
});

// --- saved provider values must read as human labels after a reload ---
// A saved event holds "AP"; the provider calls it "Apple". The stored value must
// never change, but the UI must not show the code once the label is known.

const eventSourceKey = () => choiceSourceKey(remoteEventField().choiceSource);

test("CASE A: a saved value is labelled without changing the stored value", () => {
  const store = createChoiceLabelStore();
  const key = eventSourceKey();

  assert.deepEqual(store.needed(key, ["AP"]), ["AP"]);
  store.markPending(key, ["AP"]);
  store.resolve(key, [{ value: "AP", label: "Apple" }]);

  assert.deepEqual(store.known(key, ["AP"]), [{ value: "AP", label: "Apple" }]);
  // The provider value is untouched: only the display label came from the lookup.
  assert.equal(store.known(key, ["AP"])[0].value, "AP");
  assert.deepEqual(store.needed(key, ["AP"]), [], "a labelled value is not re-fetched");
});

test("CASE B: the raw value is preserved while the lookup is in flight", () => {
  const store = createChoiceLabelStore();
  const key = eventSourceKey();

  store.markPending(key, ["AP"]);
  assert.equal(store.isPending(key, "AP"), true);
  assert.deepEqual(store.known(key, ["AP"]), [], "no label yet");
  // Nothing has replaced the selection; merging still shows the value itself.
  const merged = mergeSelectedChoices([], store.known(key, ["AP"]), ["AP"]);
  assert.deepEqual(merged, [{ value: "AP", label: "AP", unresolved: true }]);

  store.resolve(key, [{ value: "AP", label: "Apple" }]);
  assert.equal(store.isPending(key, "AP"), false);
  assert.deepEqual(mergeSelectedChoices([], store.known(key, ["AP"]), ["AP"]), [
    { value: "AP", label: "Apple" },
  ]);
});

test("CASE C: a lookup that never completed is retried, not burned", () => {
  const store = createChoiceLabelStore();
  const key = eventSourceKey();

  // Started before the source metadata was usable, then abandoned.
  store.markPending(key, ["AP"]);
  store.release(key, ["AP"]);

  assert.deepEqual(
    store.needed(key, ["AP"]),
    ["AP"],
    "an abandoned attempt must not block the next one"
  );
});

test("CASE C2: rebuilt event/field objects do not restart a settled resolution", () => {
  const store = createChoiceLabelStore();
  const key = eventSourceKey();
  store.resolve(key, [{ value: "AP", label: "Apple" }]);

  // The builder rebuilds its event objects; the selection is the same one.
  assert.equal(selectionKey(["AP"]), selectionKey(["AP"]));
  assert.deepEqual(store.needed(key, ["AP"]), []);
  assert.deepEqual(store.known(key, ["AP"]), [{ value: "AP", label: "Apple" }]);
});

test("selection identity ignores order and array identity", () => {
  assert.equal(selectionKey(["AP", "SA"]), selectionKey(["SA", "AP"]));
  assert.notEqual(selectionKey(["AP"]), selectionKey(["AP", "SA"]));
  assert.equal(selectionKey([]), "");
});

test("CASE D: several saved values resolve in one bounded lookup", () => {
  const store = createChoiceLabelStore();
  const key = eventSourceKey();

  assert.deepEqual(store.needed(key, ["AP", "SA"]), ["AP", "SA"]);
  store.markPending(key, ["AP", "SA"]);
  store.resolve(key, [
    { value: "AP", label: "Apple" },
    { value: "SA", label: "Samsung" },
  ]);

  assert.deepEqual(
    store.known(key, ["AP", "SA"]).map((choice) => choice.label),
    ["Apple", "Samsung"]
  );
});

test("CASE D2: a partly resolvable selection only re-asks for the rest", () => {
  const store = createChoiceLabelStore();
  const key = eventSourceKey();
  store.resolve(key, [{ value: "AP", label: "Apple" }]);

  assert.deepEqual(store.needed(key, ["AP", "SA"]), ["SA"]);
});

test("CASE E: an unresolvable value is kept and never retried in a loop", () => {
  const store = createChoiceLabelStore();
  const key = eventSourceKey();

  store.markPending(key, ["GONE"]);
  store.resolve(key, []); // the provider returned nothing for it
  store.markFailed(key, ["GONE"]);

  assert.equal(store.isFailed(key, "GONE"), true);
  assert.deepEqual(store.needed(key, ["GONE"]), [], "no endless retry");
  // The saved value is still shown, flagged rather than dropped.
  assert.deepEqual(mergeSelectedChoices([], store.known(key, ["GONE"]), ["GONE"]), [
    { value: "GONE", label: "GONE", unresolved: true },
  ]);
});

test("CASE F: a raw fallback never poisons the store", () => {
  const store = createChoiceLabelStore();
  const key = eventSourceKey();

  // What the UI shows while unresolved must not be cached as an answer.
  store.resolve(key, [{ value: "AP", label: "AP", unresolved: true }]);
  assert.deepEqual(store.known(key, ["AP"]), []);
  assert.deepEqual(store.needed(key, ["AP"]), ["AP"]);

  store.resolve(key, [{ value: "AP", label: "Apple" }]);
  assert.deepEqual(store.known(key, ["AP"]), [{ value: "AP", label: "Apple" }]);
});

test("CASE F2: a real label wins over an earlier failed attempt", () => {
  const store = createChoiceLabelStore();
  const key = eventSourceKey();

  store.markFailed(key, ["AP"]);
  store.resolve(key, [{ value: "AP", label: "Apple" }]);

  assert.deepEqual(store.known(key, ["AP"]), [{ value: "AP", label: "Apple" }]);
  assert.equal(store.isFailed(key, "AP"), false);
});

test("CASE G: resolution uses the values lookup, never a catalog page", () => {
  const params = choiceRequestParams(remoteEventField().choiceSource, {
    values: ["AP"],
  });

  assert.deepEqual(params.values, ["AP"]);
  assert.equal("start" in params, false);
  assert.equal("limit" in params, false);
  assert.notEqual(
    choiceCacheKey(remoteEventField().choiceSource, { values: ["AP"] }),
    choiceCacheKey(remoteEventField().choiceSource, { search: "", start: 0 })
  );
});

test("CASE H: the reload order — persisted event, then metadata, then label", () => {
  const store = createChoiceLabelStore();
  const persisted = { device_brand: ["AP"] }; // exactly what Mautic stores

  // 1. The campaign loads before capabilities: no source yet, nothing to ask.
  assert.equal(choiceRequestParams(undefined, { values: persisted.device_brand }), null);

  // 2. Capabilities arrive and the field becomes remote.
  const field = remoteEventField();
  assert.equal(isRemoteChoiceField(field), true);
  const key = choiceSourceKey(field.choiceSource);
  const selected = selectedValueList(persisted.device_brand, field.multiple);
  assert.deepEqual(selected, ["AP"]);

  // 3. The value is still unresolved, so it is looked up now.
  assert.deepEqual(store.needed(key, selected), ["AP"]);
  store.markPending(key, selected);
  store.resolve(key, [{ value: "AP", label: "Apple" }]);

  // 4. The UI reads Apple; Mautic still holds AP.
  assert.equal(mergeSelectedChoices([], store.known(key, selected), selected)[0].label, "Apple");
  assert.deepEqual(persisted.device_brand, ["AP"]);
});

test("labels are namespaced per provider source", () => {
  const store = createChoiceLabelStore();
  const deviceKey = eventSourceKey();
  const regionKey = choiceSourceKey(remoteReferenceField().choiceSource);

  store.resolve(deviceKey, [{ value: "AP", label: "Apple" }]);

  assert.deepEqual(store.known(regionKey, ["AP"]), [], "another field must not inherit it");
  assert.deepEqual(store.needed(regionKey, ["AP"]), ["AP"]);
});

test("a repeated value is looked up once", () => {
  const store = createChoiceLabelStore();
  assert.deepEqual(store.needed(eventSourceKey(), ["AP", "AP"]), ["AP"]);
});
