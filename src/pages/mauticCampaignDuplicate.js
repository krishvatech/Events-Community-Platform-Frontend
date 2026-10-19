// Campaign Duplicate is one backend operation (POST …/mautic-campaigns/:id/duplicate/)
// reached from both the Campaign list and the builder; these keep their wording
// identical. The backend refuses campaigns it cannot copy faithfully (409, with
// reasons) and removes a copy that fails its read-back check (502).

const MAX_REASONS_SHOWN = 3;

export const duplicateFailureMessage = (err) => {
  const data = err?.response?.data || {};
  const detail =
    typeof data.detail === "string" && data.detail.trim()
      ? data.detail.trim()
      : "We could not duplicate this campaign.";
  const reasons = Array.isArray(data.reasons)
    ? data.reasons.filter((reason) => typeof reason === "string" && reason.trim())
    : [];
  if (!reasons.length) return detail;
  const shown = reasons.slice(0, MAX_REASONS_SHOWN).join(" ");
  const more = reasons.length > MAX_REASONS_SHOWN ? ` (+${reasons.length - MAX_REASONS_SHOWN} more)` : "";
  return `${detail} ${shown}${more}`;
};

// Send email steps copied from the source without an email type; the backend
// lists them so the copy can be fixed before it is published.
export const duplicateUnresolvedEmailSteps = (copy) =>
  Array.isArray(copy?.emailTypeUnresolved) ? copy.emailTypeUnresolved : [];

export const duplicateSuccessMessage = (copy) => {
  const base = `Duplicated as "${copy?.name || "a new campaign"}". The copy is unpublished — review it before publishing.`;
  const unresolved = duplicateUnresolvedEmailSteps(copy);
  if (!unresolved.length) return base;
  const steps = unresolved.length === 1 ? "1 Send email step has" : `${unresolved.length} Send email steps have`;
  return `${base} ${steps} no email type (copied from the original) and must be set to Marketing or Transactional before the copy can be published.`;
};

export const duplicateSuccessSeverity = (copy) =>
  duplicateUnresolvedEmailSteps(copy).length ? "warning" : "success";
