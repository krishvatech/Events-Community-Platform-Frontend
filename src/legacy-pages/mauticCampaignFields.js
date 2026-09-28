// How a provider form schema becomes the fields this builder renders and
// validates. Both the renderer and the save-time validator read the same
// descriptors, so what a user sees and what is checked cannot drift apart.

import { asArray, isPlainObject } from "./mauticCampaignEventHydration.js";
import { isRemoteChoiceField } from "./mauticCampaignChoices.js";

export const propertyPath = (parts) => parts.join(".");

export const getNestedValue = (value, path) =>
  path.split(".").reduce((current, part) => {
    if (!isPlainObject(current)) return undefined;
    return current[part];
  }, value);

export const setNestedValue = (value, path, nextValue) => {
  const parts = path.split(".");
  const root = isPlainObject(value) ? { ...value } : {};
  let current = root;

  parts.forEach((part, index) => {
    if (index === parts.length - 1) {
      current[part] = nextValue;
      return;
    }

    current[part] = isPlainObject(current[part]) ? { ...current[part] } : {};
    current = current[part];
  });

  return root;
};

export const optionLabel = (option) => {
  if (isPlainObject(option)) {
    return option.label || option.name || option.title || option.value || option.id || "Option";
  }
  return String(option);
};

export const optionValue = (option) => {
  if (isPlainObject(option)) {
    return option.value ?? option.id ?? option.key ?? option.label ?? option.name ?? "";
  }
  return option;
};

/**
 * Whether a choice in a provider *entity* selector actually identifies a stored
 * entity.
 *
 * Mautic's EntityLookupChoiceLoader prepends a "Create new…" => "new" choice to
 * any entity field that has a creation modal. It is a UI command that opens that
 * modal — never a selection — so it carries no entity identifier, while a real
 * choice carries the entity id in `data` (`23`, or `{id: 4}`).
 */
const isEntityIdentifier = (data) => {
  if (isPlainObject(data)) return data.id !== undefined && data.id !== null && data.id !== "";
  if (typeof data === "number") return Number.isFinite(data);
  if (typeof data === "string") return data.trim() !== "" && Number.isFinite(Number(data));
  return false;
};

export const isSelectableEntityChoice = (choice) =>
  !isPlainObject(choice) || isEntityIdentifier(choice.data ?? choice.value);

/**
 * The choice an entity field's stored value refers to, if the field lists it.
 */
export const findChoiceByValue = (choices, value) =>
  asArray(choices).find((choice) => String(optionValue(choice)) === String(value)) || null;

export const optionChoices = (value) => {
  if (Array.isArray(value)) return value;
  if (isPlainObject(value?.choices)) return Object.entries(value.choices).map(([key, label]) => ({ value: key, label }));
  if (Array.isArray(value?.choices)) return value.choices;
  if (Array.isArray(value?.options)) return value.options;
  return [];
};

export const flattenSchemaChoices = (choices) =>
  asArray(choices).flatMap((choice) => {
    if (Array.isArray(choice?.choices)) return flattenSchemaChoices(choice.choices);
    return [choice];
  });

export const fieldKindFromSchema = (field) => {
  const prefixes = asArray(field?.blockPrefixes).map((prefix) => String(prefix).toLowerCase());
  const type = String(field?.type || "").toLowerCase();
  if (field?.choices?.length || prefixes.includes("choice") || type.includes("choicetype")) {
    return "select";
  }
  if (prefixes.includes("checkbox") || prefixes.includes("switch") || type.includes("checkboxtype")) {
    return "boolean";
  }
  if (prefixes.includes("textarea") || type.includes("textareatype")) return "textarea";
  if (prefixes.includes("integer") || prefixes.includes("number") || type.includes("integertype") || type.includes("numbertype")) {
    return "number";
  }
  return "text";
};

export const schemaFieldLabel = (field) => {
  if (typeof field?.label === "string" && field.label.trim()) return field.label;
  return field?.name || "Field";
};

// Provider UI controls, not event data: buttons, submit/reset, hidden inputs and
// anything the form does not map onto the event's properties. The plugin marks
// these renderable:false and gives them a controlType; the block prefixes are the
// same signal straight from Symfony, for payloads that carry neither.
const NON_DATA_CONTROL_TYPES = new Set(["action", "hidden", "internal"]);
const NON_DATA_BLOCK_PREFIXES = new Set(["button", "submit", "reset", "hidden"]);

export const isConfigurableSchemaField = (field) => {
  if (!isPlainObject(field) || !field.name) return false;
  if (field.renderable === false) return false;
  if (field.mapped === false) return false;
  if (NON_DATA_CONTROL_TYPES.has(String(field.controlType || "").toLowerCase())) {
    return false;
  }
  return !asArray(field.blockPrefixes).some((prefix) =>
    NON_DATA_BLOCK_PREFIXES.has(String(prefix).toLowerCase())
  );
};

export const buildSchemaPropertyFields = (fields, prefix = []) =>
  asArray(fields).flatMap((field) => {
    if (!isConfigurableSchemaField(field)) return [];
    const path = propertyPath([...prefix, field.name]);
    const children = asArray(field.children);
    const choices = flattenSchemaChoices(field.choices);
    const remote = isRemoteChoiceField(field);
    const kind = remote ? "select" : fieldKindFromSchema(field);

    if (children.length && !choices.length && !remote && kind !== "boolean") {
      return buildSchemaPropertyFields(children, [...prefix, field.name]);
    }

    return [{
      path,
      label: schemaFieldLabel(field),
      kind,
      choices,
      required: Boolean(field.required),
      multiple: Boolean(field.multiple),
      // Provider entity selector: its choices point at stored entities, so a
      // value has to be one of those rather than a UI command.
      entity: field.choiceKind === "entity",
      help: field.help || field.attr?.tooltip || field.attr?.help || "",
      // Present only when the provider list is served by reference.
      remote,
      choiceSource: remote ? field.choiceSource : null,
      choiceCount: field.choiceCount,
    }];
  });

export const buildPropertyFields = (value, prefix = []) => {
  if (!isPlainObject(value)) return [];

  return Object.entries(value).flatMap(([key, child]) => {
    const pathParts = [...prefix, key];
    if (Array.isArray(child) || Array.isArray(child?.choices) || Array.isArray(child?.options) || isPlainObject(child?.choices)) {
      return [{ path: propertyPath(pathParts), label: key, kind: "select", choices: optionChoices(child) }];
    }
    if (typeof child === "boolean") {
      return [{ path: propertyPath(pathParts), label: key, kind: "boolean" }];
    }
    if (typeof child === "string" || typeof child === "number") {
      return [{ path: propertyPath(pathParts), label: key, kind: "text" }];
    }
    if (isPlainObject(child)) {
      return buildPropertyFields(child, pathParts);
    }
    return [];
  });
};

export const getEventPropertyFields = (event) => {
  const schemaFields = buildSchemaPropertyFields(event?.metadata?.formSchema?.fields);
  if (schemaFields.length) return schemaFields;
  return buildPropertyFields(event?.metadata?.formTypeOptions);
};
