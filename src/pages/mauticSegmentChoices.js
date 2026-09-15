// Segment-side adapter for the shared remote-choice field.
//
// A segment filter value can come from one of Mautic's bundled reference
// catalogs (country, region, timezone, locale). The provider names the catalog
// in the field's choiceSource; this module turns that into a request and says
// which sources ECP can actually serve — no catalog and no field name lives
// here.

import { asArray, isPlainObject } from "./mauticCampaignEventHydration.js";

/**
 * The catalogs the marketing bridge publishes and the Django endpoint serves.
 * A source outside this set has no picker yet and falls back to a typed value.
 */
export const SEGMENT_REFERENCE_SOURCES = ["country", "region", "timezone", "locale"];

export const isServableChoiceSource = (source) =>
  isPlainObject(source) && SEGMENT_REFERENCE_SOURCES.includes(String(source.type));

/**
 * Whether this field's value should be picked from the provider rather than
 * typed. An operator that takes no value gets no picker, so an empty/not-empty
 * condition never asks the provider for a catalog.
 */
export const usesRemoteChoices = (control) =>
  control?.choiceMode === "remote" &&
  control?.requiresValue !== false &&
  isServableChoiceSource(control.choiceSource);

export const segmentChoiceRequestParams = (
  source,
  { search = "", start = 0, limit = 25, values = [] } = {}
) => {
  if (!isServableChoiceSource(source)) return null;

  const params = { source: String(source.type) };
  const wanted = asArray(values)
    .filter((value) => value !== "" && value !== null && value !== undefined)
    .map(String);

  if (wanted.length) {
    params.values = wanted;
    return params;
  }

  if (search) params.search = search;
  params.start = start;
  params.limit = limit;
  return params;
};

/**
 * The descriptor the shared remote-choice field expects, built from one filter
 * row's provider metadata. `multiple` follows the operator, as Mautic does.
 *
 * The control is labelled "Value" like every other control in that column — the
 * field is already named in its own column — and the provider's field label is
 * carried separately, for the search box inside the list. It is not marked
 * required: an empty row is reported once, by the row's own validation, rather
 * than turning red the moment the filter is added.
 */
export const remoteChoiceFieldDescriptor = (field, control, position) => ({
  path: `filter-${position}-${field?.object || "lead"}-${field?.alias || "value"}`,
  label: "Value",
  searchLabel: field?.label || "value",
  required: false,
  multiple: Boolean(control?.multiple),
  choiceSource: control?.choiceSource || null,
  choiceCount: control?.choiceSource?.total,
});
