// Field Builder rules for native Mautic Form fields. They mirror the backend
// (newsletter/form_fields.py) so mistakes show before a save; the backend and
// the Mautic bridge still decide.

export const OPTION_TYPES = new Set(["select", "radiogrp", "checkboxgrp"]);
export const ALIAS_PATTERN = /^[a-z][a-z0-9_]{0,24}$/;
export const RESERVED_ALIASES = new Set(["formid", "formname", "return", "messenger"]);
export const LABEL_MAX_LENGTH = 255;
export const TEXT_MAX_LENGTH = 255;
export const MAX_OPTIONS = 100;

// Used until the backend catalogue loads, and as its shape.
export const DEFAULT_FIELD_TYPES = [
  ["text", "Text"], ["email", "Email"], ["tel", "Telephone"], ["textarea", "Text area"], ["number", "Number"],
  ["select", "Dropdown"], ["radiogrp", "Radio group"], ["checkboxgrp", "Checkbox group"], ["date", "Date"],
  ["country", "Country"], ["hidden", "Hidden"], ["button", "Submit button"],
].map(([type, label]) => ({
  type,
  label,
  options: OPTION_TYPES.has(type),
  placeholder: ["text", "email", "tel", "date", "number", "select", "country"].includes(type),
  required: !["button", "hidden"].includes(type),
  helpMessage: !["button", "hidden"].includes(type),
  defaultValue: !["button", "checkboxgrp", "country"].includes(type),
  mapping: type !== "button",
  precision: type === "number",
  multiple: type === "select",
}));

export const capabilityFor = (types, type) =>
  (types || DEFAULT_FIELD_TYPES).find((entry) => entry.type === type) || null;

let optionKey = 0;
const withKey = (option) => ({ ...option, key: option.key || `option-${(optionKey += 1)}` });

export const blankFieldDraft = (type = "text") => ({
  type,
  label: "",
  alias: "",
  isRequired: false,
  helpMessage: "",
  validationMessage: "",
  defaultValue: "",
  mappedField: "",
  placeholder: "",
  precision: "",
  multiple: false,
  options: OPTION_TYPES.has(type) ? [withKey({ label: "", value: "" })] : [],
});

/** The editable state of a saved field (as the backend normalises it). */
export const fieldToDraft = (field) => ({
  type: field.type,
  label: field.label || "",
  alias: field.alias || "",
  isRequired: Boolean(field.isRequired),
  helpMessage: field.helpMessage || "",
  validationMessage: field.validationMessage || "",
  defaultValue: field.defaultValue || "",
  mappedField: field.mappedField || "",
  placeholder: field.placeholder || "",
  precision: field.precision || "",
  multiple: Boolean(field.multiple),
  options: (field.options || []).map((option) => withKey({ label: option.label, value: option.value })),
});

/**
 * Changing the type of an unsaved field keeps everything that still applies
 * (label, help text, options between option types) and drops what does not.
 */
export function changeDraftType(draft, type, types) {
  const capability = capabilityFor(types, type) || {};
  const next = { ...draft, type };
  if (!capability.required) next.isRequired = false;
  if (!capability.helpMessage) next.helpMessage = "";
  if (!capability.placeholder) next.placeholder = "";
  if (!capability.precision) next.precision = "";
  if (!capability.multiple) next.multiple = false;
  if (!capability.mapping) next.mappedField = "";
  if (capability.options) {
    next.options = draft.options.length ? draft.options : [withKey({ label: "", value: "" })];
  }
  if (!capability.defaultValue) next.defaultValue = "";
  return next;
}

export const optionValueFromLabel = (label) =>
  String(label || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60);

export const suggestAlias = (label, taken = new Set()) => {
  let base = String(label || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 25) || "field";
  if (!/^[a-z]/.test(base)) base = `f_${base}`.slice(0, 25);
  if (RESERVED_ALIASES.has(base)) base = `f_${base}`;
  let alias = base;
  for (let counter = 2; taken.has(alias); counter += 1) {
    const suffix = `_${counter}`;
    alias = base.slice(0, 25 - suffix.length) + suffix;
  }
  return alias;
};

/** Field errors keyed like the backend's `errors`; `options` covers the list. */
export function validateFieldDraft(draft, { isNew, fields = [], types, contactFields = [], fieldId } = {}) {
  const errors = {};
  const capability = capabilityFor(types, draft.type);
  if (!capability) {
    errors.type = "Choose a supported field type.";
    return errors;
  }
  const label = draft.label.trim();
  if (!label) errors.label = "Field label is required.";
  else if (label.length > LABEL_MAX_LENGTH) errors.label = `Field label must be ${LABEL_MAX_LENGTH} characters or fewer.`;

  if (isNew && draft.alias) {
    if (!ALIAS_PATTERN.test(draft.alias)) errors.alias = "Use 1-25 lowercase letters, digits or underscores, starting with a letter.";
    else if (RESERVED_ALIASES.has(draft.alias)) errors.alias = "This alias is reserved by Mautic.";
    else if (fields.some((field) => field.alias === draft.alias)) errors.alias = "Another field already uses this alias.";
  }
  if (isNew && draft.type === "button" && fields.some((field) => field.type === "button")) {
    errors.type = "The Form already has a submit button.";
  }
  for (const key of ["helpMessage", "validationMessage", "defaultValue", "placeholder"]) {
    if (draft[key].trim().length > TEXT_MAX_LENGTH) errors[key] = `Use ${TEXT_MAX_LENGTH} characters or fewer.`;
  }
  if (capability.precision && draft.precision !== "" && !(/^\d+$/.test(draft.precision) && Number(draft.precision) <= 10)) {
    errors.precision = "Use a whole number from 0 to 10.";
  }

  if (capability.options) {
    const values = new Set();
    if (!draft.options.length) errors.options = "Add at least one option.";
    else if (draft.options.length > MAX_OPTIONS) errors.options = `Use ${MAX_OPTIONS} options or fewer.`;
    for (const option of draft.options) {
      if (!option.label.trim() || !option.value.trim()) {
        errors.options = "Every option needs a label and a value.";
        break;
      }
      if (values.has(option.value.trim())) {
        errors.options = `Option value "${option.value.trim()}" is used more than once.`;
        break;
      }
      values.add(option.value.trim());
    }
  }

  const fallback = draft.defaultValue.trim();
  if (fallback && capability.defaultValue) {
    if (capability.options && !draft.options.some((option) => option.value.trim() === fallback)) {
      errors.defaultValue = "The default must be one of the option values.";
    } else if (draft.type === "number" && Number.isNaN(Number(fallback))) {
      errors.defaultValue = "The default must be a number.";
    } else if (draft.type === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(fallback)) {
      errors.defaultValue = "The default must be a date (YYYY-MM-DD).";
    }
  }

  if (draft.mappedField) {
    const target = contactFields.find((field) => field.alias === draft.mappedField);
    const taken = fields.find((field) => field.id !== fieldId && field.mappedField === draft.mappedField && (field.mappedObject || "contact") === "contact");
    if (taken) errors.mappedField = `"${taken.label || taken.alias}" is already mapped to this Contact field.`;
    else if (target && !target.fieldTypes.includes(draft.type)) errors.mappedField = "This Contact field does not accept this field type.";
  }
  return errors;
}

const SENT_KEYS = ["label", "isRequired", "helpMessage", "validationMessage", "defaultValue", "mappedField", "placeholder", "precision", "multiple", "options"];

const cleanValue = (key, value) => {
  if (key === "options") return value.map((option) => ({ label: option.label.trim(), value: option.value.trim() }));
  if (typeof value === "string") return value.trim();
  return value;
};

const appliesTo = (capability, key) => ({
  isRequired: capability.required,
  validationMessage: capability.required,
  helpMessage: capability.helpMessage,
  defaultValue: capability.defaultValue,
  mappedField: capability.mapping,
  placeholder: capability.placeholder,
  precision: capability.precision,
  multiple: capability.multiple,
  options: capability.options,
}[key] ?? true);

/**
 * The request body for a field save: every applicable setting for a new
 * field, only what changed for an existing one.
 */
export function fieldDraftToPayload(draft, original, types) {
  const capability = capabilityFor(types, draft.type);
  const payload = {};
  if (!original) {
    payload.type = draft.type;
    if (draft.alias.trim()) payload.alias = draft.alias.trim();
  }
  const before = original ? fieldToDraft(original) : null;
  for (const key of SENT_KEYS) {
    if (!appliesTo(capability, key)) continue;
    const value = cleanValue(key, draft[key]);
    if (before && JSON.stringify(value) === JSON.stringify(cleanValue(key, before[key]))) continue;
    if (!before && (value === "" || value === false)) continue;
    payload[key] = value;
  }
  return payload;
}

export const draftsEqual = (a, b) =>
  JSON.stringify({ ...a, options: a.options.map(({ label, value }) => ({ label, value })) }) ===
  JSON.stringify({ ...b, options: b.options.map(({ label, value }) => ({ label, value })) });

export const moveItem = (list, index, delta) => {
  const target = index + delta;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
};
