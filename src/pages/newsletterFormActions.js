// Submit-action rules for native Mautic Forms. They mirror the backend
// (newsletter/form_actions.py) so mistakes show before a save; the backend and
// the Mautic bridge still decide.

export const TAGS = "lead.changetags";
export const POINTS = "lead.pointschange";
export const COMPANY_SCORE = "lead.scorecontactscompanies";
export const UPDATE_CONTACT = "lead.updatelead";
export const UTM_TAGS = "lead.addutmtags";
export const ASSET = "asset.download";
export const RESULTS_EMAIL = "form.email";
export const USER_EMAIL = "email.send.user";
export const REPOST = "form.repost";
export const MAX_POINTS = 10000;
export const MAX_TAGS = 50;
export const MAX_SCORE = 10000;
export const MAX_RECIPIENTS = 20;
export const MAX_USERS = 20;
export const MAX_CONTACT_FIELDS = 30;

export const DEFAULT_ACTION_TYPES = [
  { type: TAGS, label: "Modify tags", description: "Add or remove tags on the submitting contact." },
  { type: POINTS, label: "Adjust points", description: "Add or subtract points for the submitting contact.",
    operators: [{ value: "plus", label: "Add" }, { value: "minus", label: "Subtract" }], maxPoints: MAX_POINTS },
];

const EMAIL_PATTERN = /^[^\s@,{}]+@[^\s@,{}]+\.[^\s@,{}]+$/;
// Mirrors the backend's active-content check for the results message.
const ACTIVE_CONTENT = /<\s*(script|object|embed|applet|base|frame|frameset)\b|<[^>]*?[\s/"']on[a-z]+\s*=|srcdoc\s*=|=\s*["']?\s*(javascript|vbscript)\s*:/i;

let rowKey = 0;
const fieldRow = (alias = "", value = "") => ({ key: `row-${(rowKey += 1)}`, alias, value });

export const blankActionDraft = (type = TAGS) => ({
  type,
  name: "",
  description: "",
  addTags: [],
  removeTags: [],
  operator: "plus",
  points: "",
  score: "",
  fieldValues: type === UPDATE_CONTACT ? [fieldRow()] : [],
  assetId: "",
  subject: "",
  message: "",
  to: "",
  cc: "",
  bcc: "",
  emailToOwner: false,
  replyToSubmitter: true,
  emailId: "",
  userIds: [],
  postUrl: "",
  failureEmail: "",
  // Write-only: a saved header is never shown. Blank keeps it; clearHeader removes it.
  authorizationHeader: "",
  clearHeader: false,
});

const text = (value) => (value === null || value === undefined ? "" : String(value));

/** The editable state of a saved action (tags as IDs, as the backend maps them). */
export const actionToDraft = (action) => ({
  ...blankActionDraft(action.type),
  type: action.type,
  name: action.name || "",
  description: action.description || "",
  addTags: (action.addTags || []).map((ref) => ref.id).filter(Boolean),
  removeTags: (action.removeTags || []).map((ref) => ref.id).filter(Boolean),
  operator: action.operator || "plus",
  points: text(action.points),
  score: text(action.score),
  fieldValues: Object.entries(action.fieldValues || {}).map(([alias, value]) => fieldRow(alias, text(value))),
  assetId: text(action.assetId),
  subject: action.subject || "",
  message: action.message || "",
  to: (action.to || []).join(", "),
  cc: (action.cc || []).join(", "),
  bcc: (action.bcc || []).join(", "),
  emailToOwner: Boolean(action.emailToOwner),
  replyToSubmitter: action.replyToSubmitter !== false,
  emailId: text(action.emailId),
  userIds: (action.userIds || []).map(String),
  postUrl: action.postUrl || "",
  failureEmail: action.failureEmail || "",
});

const addressList = (value) => String(value || "").split(",").map((item) => item.trim()).filter(Boolean);

const addressError = (value, label) => {
  const items = addressList(value);
  if (items.length > MAX_RECIPIENTS) return `${label}: use ${MAX_RECIPIENTS} addresses or fewer.`;
  const bad = items.find((item) => !EMAIL_PATTERN.test(item));
  return bad ? `"${bad}" is not a valid email address (tokens are not allowed).` : "";
};

const wholeError = (value, low, high, { nonzero = false } = {}) => {
  const raw = String(value ?? "").trim();
  if (!/^[+-]?\d+$/.test(raw) || Number(raw) < low || Number(raw) > high || (nonzero && Number(raw) === 0)) {
    return `Use a whole number from ${low} to ${high}${nonzero ? ", not 0" : ""}.`;
  }
  return "";
};

export const isPublicHttpsUrl = (value) => {
  let url;
  try {
    url = new URL(String(value || "").trim());
  } catch {
    return false;
  }
  const host = url.hostname.toLowerCase();
  return url.protocol === "https:" && !url.username && !url.password && (!url.port || url.port === "443")
    && host !== "localhost" && !/\.(localhost|local|internal)$/.test(host)
    && !/^(10|127|0)\.|^192\.168\.|^169\.254\.|^172\.(1[6-9]|2\d|3[01])\./.test(host);
};

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
  } else if (draft.type === COMPANY_SCORE) {
    const problem = wholeError(draft.score, -MAX_SCORE, MAX_SCORE, { nonzero: true });
    if (problem) errors.score = problem;
  } else if (draft.type === UPDATE_CONTACT) {
    const rows = draft.fieldValues.filter((row) => row.alias);
    if (!rows.length) errors.fieldValues = "Choose at least one contact field to set.";
    else if (rows.length > MAX_CONTACT_FIELDS) errors.fieldValues = `Set up to ${MAX_CONTACT_FIELDS} contact fields.`;
    else if (new Set(rows.map((row) => row.alias)).size !== rows.length) errors.fieldValues = "Each contact field can be set once.";
    else if (rows.some((row) => row.value.length > 255)) errors.fieldValues = "Values must be 255 characters or fewer.";
  } else if (draft.type === ASSET) {
    if (!draft.assetId) errors.assetId = "Choose the asset to download.";
  } else if (draft.type === RESULTS_EMAIL) {
    if (!draft.subject.trim()) errors.subject = "The email needs a subject.";
    else if (draft.subject.trim().length > 255) errors.subject = "Use 255 characters or fewer.";
    for (const [key, label] of [["to", "To"], ["cc", "Cc"], ["bcc", "Bcc"]]) {
      const problem = addressError(draft[key], label);
      if (problem) errors[key] = problem;
    }
    if (!errors.to && !errors.cc && !errors.bcc && !draft.emailToOwner
        && ![draft.to, draft.cc, draft.bcc].some((value) => addressList(value).length)) {
      errors.to = "Send the results to at least one address or to the contact owner.";
    }
    if (ACTIVE_CONTENT.test(draft.message)) errors.message = "Scripts and event handlers are not allowed in the message.";
  } else if (draft.type === USER_EMAIL) {
    if (!draft.emailId) errors.emailId = "Choose the email to send.";
    if (!draft.userIds.length) errors.userIds = "Choose at least one Mautic user. (With none, Mautic would email the contact instead.)";
    else if (draft.userIds.length > MAX_USERS) errors.userIds = `Choose up to ${MAX_USERS} users.`;
  } else if (draft.type === REPOST) {
    if (!isPublicHttpsUrl(draft.postUrl)) errors.postUrl = "Use a public https:// address on the standard port, without a user name or password.";
    if (draft.failureEmail.trim() && !EMAIL_PATTERN.test(draft.failureEmail.trim())) errors.failureEmail = "Use one email address.";
    if (/[\r\n]/.test(draft.authorizationHeader) || draft.authorizationHeader.length > 1000) {
      errors.authorizationHeader = "One line of up to 1000 characters.";
    }
  } else if (draft.type !== UTM_TAGS) {
    errors.type = "Choose a supported submit action.";
  }
  return errors;
}

const sameList = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

/** The type's settings as the backend takes them. */
function settingsFor(draft) {
  switch (draft.type) {
    case TAGS:
      return { addTags: draft.addTags, removeTags: draft.removeTags };
    case POINTS:
      return { operator: draft.operator, points: Number(String(draft.points).trim()) };
    case COMPANY_SCORE:
      return { score: Number(String(draft.score).trim()) };
    case UPDATE_CONTACT:
      return { fieldValues: Object.fromEntries(draft.fieldValues.filter((row) => row.alias).map((row) => [row.alias, row.value])) };
    case ASSET:
      return { assetId: draft.assetId };
    case RESULTS_EMAIL:
      return {
        subject: draft.subject.trim(), message: draft.message.trim(), to: addressList(draft.to), cc: addressList(draft.cc),
        bcc: addressList(draft.bcc), emailToOwner: Boolean(draft.emailToOwner), replyToSubmitter: Boolean(draft.replyToSubmitter),
      };
    case USER_EMAIL:
      return { emailId: draft.emailId, userIds: draft.userIds };
    case REPOST: {
      const settings = { postUrl: draft.postUrl.trim(), failureEmail: draft.failureEmail.trim() };
      if (draft.authorizationHeader.trim()) settings.authorizationHeader = draft.authorizationHeader.trim();
      else if (draft.clearHeader) settings.authorizationHeader = "";
      return settings;
    }
    default:
      return {};
  }
}

/** Request body: every setting for a new action, only what changed for a saved one. */
export function actionDraftToPayload(draft, original) {
  const name = draft.name.trim();
  const description = draft.description.trim();
  const settings = settingsFor(draft);
  if (!original) return { type: draft.type, name, description, ...settings };
  const before = actionToDraft(original);
  const payload = {};
  if (name !== before.name.trim()) payload.name = name;
  if (description !== before.description.trim()) payload.description = description;
  if (draft.type === TAGS) {
    if (!sameList(draft.addTags, before.addTags) || !sameList(draft.removeTags, before.removeTags)) Object.assign(payload, settings);
  } else if (draft.type === POINTS) {
    if (draft.operator !== before.operator || String(draft.points).trim() !== before.points) Object.assign(payload, settings);
  } else if (JSON.stringify(settings) !== JSON.stringify(settingsFor(before))) {
    Object.assign(payload, settings);
  }
  return payload;
}

const comparable = (draft) => ({ ...draft, fieldValues: draft.fieldValues.map(({ alias, value }) => ({ alias, value })) });
export const actionDraftsEqual = (a, b) => JSON.stringify(comparable(a)) === JSON.stringify(comparable(b));

export const describeAction = (action, names = {}) => {
  if (action.type === TAGS) {
    const tags = (refs) => (refs || []).map((ref) => ref.name || names.tags?.[ref.id] || ref.id).join(", ");
    const parts = [];
    if (action.addTags?.length) parts.push(`add ${tags(action.addTags)}`);
    if (action.removeTags?.length) parts.push(`remove ${tags(action.removeTags)}`);
    return parts.join("; ") || "No tags";
  }
  if (action.type === POINTS) {
    const sign = { plus: "+", minus: "−", times: "×", divide: "÷" }[action.operator] || action.operator || "";
    return `${sign}${action.points ?? ""} points`;
  }
  if (action.type === COMPANY_SCORE) return `Company score ${Number(action.score) > 0 ? "+" : ""}${action.score}`;
  if (action.type === UPDATE_CONTACT) {
    const entries = Object.entries(action.fieldValues || {});
    return entries.length ? `Set ${entries.map(([alias, value]) => `${alias} = “${value}”`).join(", ")}` : "No fields";
  }
  if (action.type === UTM_TAGS) return "Store the visit's UTM tags";
  if (action.type === ASSET) return `Download ${names.assets?.[action.assetId] || `asset ${action.assetId}`}`;
  if (action.type === RESULTS_EMAIL) {
    const to = [...(action.to || []), ...(action.emailToOwner ? ["the contact owner"] : [])];
    return `Email “${action.subject}” to ${to.join(", ") || "nobody"}`;
  }
  if (action.type === USER_EMAIL) {
    const users = (action.userIds || []).map((id) => names.users?.[id] || `user ${id}`);
    return `Send ${names.emails?.[action.emailId] || `email ${action.emailId}`} to ${users.join(", ") || "no users"}`;
  }
  if (action.type === REPOST) return `Post to ${action.postUrl}${action.hasAuthorizationHeader ? " (with authorization header)" : ""}`;
  return action.typeLabel || action.type;
};
