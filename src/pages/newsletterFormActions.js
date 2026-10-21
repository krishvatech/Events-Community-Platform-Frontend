// Submit-action rules for native Mautic Forms. They mirror the backend
// (newsletter/form_actions.py) so mistakes show before a save; the backend and
// the Mautic bridge still decide.

export const TAGS = "lead.changetags";
export const POINTS = "lead.pointschange";
export const MAX_POINTS = 10000;
export const MAX_TAGS = 50;

export const DEFAULT_ACTION_TYPES = [
  { type: TAGS, label: "Modify tags", description: "Add or remove tags on the submitting contact." },
  { type: POINTS, label: "Adjust points", description: "Add or subtract points for the submitting contact.",
    operators: [{ value: "plus", label: "Add" }, { value: "minus", label: "Subtract" }], maxPoints: MAX_POINTS },
];

export const blankActionDraft = (type = TAGS) => ({
  type,
  name: "",
  description: "",
  addTags: [],
  removeTags: [],
  operator: "plus",
  points: "",
});

/** The editable state of a saved action (tags as IDs, as the backend maps them). */
export const actionToDraft = (action) => ({
  type: action.type,
  name: action.name || "",
  description: action.description || "",
  addTags: (action.addTags || []).map((ref) => ref.id).filter(Boolean),
  removeTags: (action.removeTags || []).map((ref) => ref.id).filter(Boolean),
  operator: action.operator || "plus",
  points: action.points === null || action.points === undefined ? "" : String(action.points),
});

export function validateActionDraft(draft) {
  const errors = {};
  const name = draft.name.trim();
  if (!name) errors.name = "Action name is required.";
  else if (name.length > 191) errors.name = "Action name must be 191 characters or fewer.";
  if (draft.description.trim().length > 2000) errors.description = "Description must be 2000 characters or fewer.";
  if (draft.type === TAGS) {
    if (!draft.addTags.length && !draft.removeTags.length) errors.addTags = "Choose at least one tag to add or remove.";
    else if (draft.addTags.some((id) => draft.removeTags.includes(id))) errors.removeTags = "A tag cannot be both added and removed.";
    else if (draft.addTags.length > MAX_TAGS || draft.removeTags.length > MAX_TAGS) errors.addTags = `Choose up to ${MAX_TAGS} tags.`;
  } else if (draft.type === POINTS) {
    if (!["plus", "minus"].includes(draft.operator)) errors.operator = "Choose whether to add or subtract points.";
    if (!/^\d+$/.test(String(draft.points).trim()) || Number(draft.points) < 1 || Number(draft.points) > MAX_POINTS) {
      errors.points = `Points must be a whole number from 1 to ${MAX_POINTS}.`;
    }
  } else {
    errors.type = "Choose a supported submit action.";
  }
  return errors;
}

const sameList = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

/** Request body: every setting for a new action, only what changed for a saved one. */
export function actionDraftToPayload(draft, original) {
  const name = draft.name.trim();
  const description = draft.description.trim();
  const settings = draft.type === TAGS
    ? { addTags: draft.addTags, removeTags: draft.removeTags }
    : { operator: draft.operator, points: Number(String(draft.points).trim()) };
  if (!original) return { type: draft.type, name, description, ...settings };
  const before = actionToDraft(original);
  const payload = {};
  if (name !== before.name.trim()) payload.name = name;
  if (description !== before.description.trim()) payload.description = description;
  if (draft.type === TAGS && (!sameList(draft.addTags, before.addTags) || !sameList(draft.removeTags, before.removeTags))) {
    Object.assign(payload, settings);
  }
  if (draft.type === POINTS && (draft.operator !== before.operator || String(draft.points).trim() !== before.points)) {
    Object.assign(payload, settings);
  }
  return payload;
}

export const actionDraftsEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export const describeAction = (action, tagNames = {}) => {
  if (action.type === TAGS) {
    const names = (refs) => (refs || []).map((ref) => ref.name || tagNames[ref.id] || ref.id).join(", ");
    const parts = [];
    if (action.addTags?.length) parts.push(`add ${names(action.addTags)}`);
    if (action.removeTags?.length) parts.push(`remove ${names(action.removeTags)}`);
    return parts.join("; ") || "No tags";
  }
  if (action.type === POINTS) {
    const sign = { plus: "+", minus: "−", times: "×", divide: "÷" }[action.operator] || action.operator || "";
    return `${sign}${action.points ?? ""} points`;
  }
  return action.typeLabel || action.type;
};
