/** IPDT-776: event-scoped Attend CTA presentation. Preserve the Saleor price/checkout path. */
export const hasActiveSaleorPrice = (event) =>
  !event?.is_free && Number(event?.price) > 0;

export const getExternalAttendUrl = (event) => {
  const url = String(event?.attend_primary_button_url || "").trim();
  if (!url || hasActiveSaleorPrice(event)) return "";
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname && !parsed.username && !parsed.password
      ? parsed.href : "";
  } catch {
    return "";
  }
};

export const getAttendPrimaryLabel = (event) =>
  String(event?.attend_primary_button_text || "").trim() || "Register Here";

export const getAttendSecondaryLabel = (event, isAuthenticated) =>
  String(event?.attend_secondary_button_text || "").trim() ||
  (isAuthenticated ? "Apply Now" : "Apply as Guest");

/** IPDT-776: listing cards may expose Attend CTAs only in eligible pre-registration states.
 *  Rendering still follows each card's existing application/register/replay branches.
 */
export const getListingAttendUrl = (event, {
  isEventOwner = false,
  isPaymentPending = false,
  isConfirmedRegistered = false,
  isEffectivelyPast = false,
  status = "upcoming",
  isReplayEvent = false,
  applicationStatus = "none",
} = {}) => {
  if (isEventOwner || isPaymentPending || isConfirmedRegistered || isEffectivelyPast ||
      isReplayEvent || status !== "upcoming" || event?.is_full === true) return "";
  if (event?.registration_type === "apply" &&
      !["none", "cancelled", "declined"].includes(applicationStatus)) return "";
  return getExternalAttendUrl(event);
};
