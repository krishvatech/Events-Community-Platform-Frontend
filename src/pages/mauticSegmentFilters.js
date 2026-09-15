// Native Mautic dynamic segment filters.
//
// A filter row is Mautic's own structure — glue, field, object, type, operator and
// properties.filter — and every choice offered here (which fields exist, which
// operators a field accepts, what the value control is, what values are valid)
// comes from the provider's filter metadata at runtime. ECP keeps no catalog of
// fields or operators of its own.

import { asArray, isPlainObject } from "./mauticCampaignEventHydration.js";

export const DEFAULT_GLUE = "and";
export const GLUES = ["and", "or"];

const fieldKey = (object, alias) => `${object || "lead"}::${alias || ""}`;

export const buildFilterMetadataIndex = (metadata) => {
  const fields = new Map();
  const operators = new Map();

  asArray(metadata?.fields).forEach((field) => {
    if (!isPlainObject(field) || !field.alias) return;
    fields.set(fieldKey(field.object, field.alias), field);
  });

  asArray(metadata?.operators).forEach((operator) => {
    if (!isPlainObject(operator) || operator.value === undefined) return;
    operators.set(String(operator.value), operator);
  });

  return { fields, operators };
};

export const findFilterField = (index, row) =>
  index?.fields?.get(fieldKey(row?.object, row?.field)) || null;

export const filterFieldList = (index) => [...(index?.fields?.values() || [])];

export const operatorMeta = (index, operator) =>
  index?.operators?.get(String(operator ?? "")) || null;

/**
 * What the value input has to be for this field and operator.
 *
 * The field says how its values are chosen; the operator says how many of them
 * and whether any is needed at all.
 */
export const filterValueControl = (field, operator, index) => {
  const meta = operatorMeta(index, operator);
  const requiresValue = meta ? meta.requiresValue !== false : true;
  const multiple = Boolean(meta?.multiple) || Boolean(field?.multiple);

  return {
    control: field?.control || "text",
    requiresValue,
    multiple,
    choiceMode: field?.choiceMode || null,
    choices: asArray(field?.choices),
    choiceSource: field?.choiceSource || null,
  };
};

export const operatorsForField = (field) =>
  asArray(field?.operators).filter((operator) => isPlainObject(operator));

// Mautic stores the value under properties.filter and keeps a legacy top-level
// copy that a PATCH can leave stale, so the canonical one wins — exactly as
// ContactSegmentFilterCrate resolves it.
export const filterRowValue = (row) => {
  const properties = isPlainObject(row?.properties) ? row.properties : null;
  if (properties && "filter" in properties) return properties.filter;
  return row?.filter;
};

export const isBlankFilterValue = (value) =>
  value === undefined ||
  value === null ||
  value === "" ||
  (Array.isArray(value) && value.length === 0);

export const setFilterRowValue = (row, value) => ({
  ...row,
  properties: { ...(isPlainObject(row?.properties) ? row.properties : {}), filter: value },
});

export const newFilterRow = (field, { glue = DEFAULT_GLUE } = {}) => {
  const operators = operatorsForField(field);
  return {
    glue,
    field: field?.alias || "",
    object: field?.object || "lead",
    type: field?.type || "text",
    operator: operators.length ? String(operators[0].value) : "",
    properties: {},
  };
};

/**
 * Changing the field invalidates the operator and the value: a city's operators
 * are not a date's, and its values certainly are not.
 */
export const setFilterRowField = (row, field) => ({
  ...newFilterRow(field, { glue: row?.glue || DEFAULT_GLUE }),
});

/**
 * Changing the operator keeps the value only where it still makes sense: an
 * operator that takes no value clears it, and moving between one value and many
 * converts rather than discards.
 */
export const setFilterRowOperator = (row, operator, index) => {
  const next = { ...row, operator: String(operator ?? "") };
  const meta = operatorMeta(index, next.operator);
  const value = filterRowValue(row);

  if (meta && meta.requiresValue === false) {
    return { ...next, properties: {} };
  }

  if (isBlankFilterValue(value)) return { ...next, properties: {} };

  const wantsMany = Boolean(meta?.multiple);
  const hasMany = Array.isArray(value);
  if (wantsMany && !hasMany) return setFilterRowValue(next, [value]);
  if (!wantsMany && hasMany) return setFilterRowValue(next, value[0] ?? "");
  return setFilterRowValue(next, value);
};

export const setFilterRowGlue = (row, glue) => ({
  ...row,
  glue: GLUES.includes(String(glue)) ? String(glue) : DEFAULT_GLUE,
});

export const addFilterRow = (rows, field) => [
  ...asArray(rows),
  newFilterRow(field, { glue: asArray(rows).length ? DEFAULT_GLUE : DEFAULT_GLUE }),
];

export const removeFilterRow = (rows, position) =>
  asArray(rows).filter((_, index) => index !== position);

export const updateFilterRow = (rows, position, row) =>
  asArray(rows).map((current, index) => (index === position ? row : current));

/**
 * Saved filters as the editor holds them. Mautic forces the first row's glue to
 * "and" when it loads a segment, so the editor shows the same.
 */
export const hydrateFilterRows = (rows) =>
  asArray(rows)
    .filter(isPlainObject)
    .map((row, position) => ({
      glue: position === 0 ? DEFAULT_GLUE : (GLUES.includes(row.glue) ? row.glue : DEFAULT_GLUE),
      field: row.field || "",
      object: row.object || "lead",
      type: row.type || "text",
      operator: row.operator || "",
      properties: { filter: filterRowValue(row) },
    }))
    .map((row) =>
      isBlankFilterValue(row.properties.filter) ? { ...row, properties: {} } : row
    );

/**
 * The write shape: exactly what Mautic stores, nothing of the editor's own.
 */
export const toFilterPayload = (rows) =>
  asArray(rows).map((row, position) => {
    const value = filterRowValue(row);
    return {
      glue: position === 0 ? DEFAULT_GLUE : row.glue || DEFAULT_GLUE,
      field: row.field,
      object: row.object || "lead",
      type: row.type || "text",
      operator: row.operator,
      properties: isBlankFilterValue(value) ? {} : { filter: value },
    };
  });

/**
 * Friendly, provider-derived reasons a filter set cannot be saved.
 */
export const validateFilterRows = (rows, index) => {
  const issues = [];
  const report = (position, message) => issues.push({ position, message });

  asArray(rows).forEach((row, position) => {
    const label = `Filter ${position + 1}`;

    if (!row?.field) {
      report(position, `${label}: choose a field.`);
      return;
    }

    const field = findFilterField(index, row);
    if (!field) {
      report(
        position,
        `${label}: "${row.field}" is not a filter this Mautic instance offers.`
      );
      return;
    }

    const allowed = operatorsForField(field).map((operator) => String(operator.value));
    if (!row.operator) {
      report(position, `${label}: choose a condition for ${field.label}.`);
      return;
    }
    if (allowed.length && !allowed.includes(String(row.operator))) {
      report(position, `${label}: that condition is not available for ${field.label}.`);
      return;
    }

    const control = filterValueControl(field, row.operator, index);
    const value = filterRowValue(row);
    if (control.requiresValue && isBlankFilterValue(value)) {
      report(position, `${label}: ${field.label} needs a value.`);
      return;
    }

    if (
      control.requiresValue &&
      control.control === "number" &&
      !Array.isArray(value) &&
      !Number.isFinite(Number(value))
    ) {
      report(position, `${label}: ${field.label} must be a number.`);
      return;
    }

    // Only inline options can be checked here; remote catalogs are the
    // provider's to validate.
    if (control.choices.length && control.choiceMode !== "remote") {
      const allowedValues = new Set(control.choices.map((choice) => String(choice.value)));
      const selected = Array.isArray(value) ? value : [value];
      const unknown = selected
        .filter((item) => !isBlankFilterValue(item))
        .filter((item) => !allowedValues.has(String(item)));
      if (unknown.length) {
        report(position, `${label}: ${field.label} has a value Mautic no longer offers.`);
      }
    }
  });

  return issues;
};

export const validateSegmentFilters = (rows, index) => {
  const issues = validateFilterRows(rows, index);
  return { valid: issues.length === 0, errors: issues.map((issue) => issue.message), issues };
};
