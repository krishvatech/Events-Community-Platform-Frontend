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

export const duplicateSuccessMessage = (copy) =>
  `Duplicated as "${copy?.name || "a new campaign"}". The copy is unpublished — review it before publishing.`;
