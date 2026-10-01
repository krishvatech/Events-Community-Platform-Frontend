/**
 * Whether the Broadcast editor has data to render.
 *
 * This answers one question only: did the broadcast load? It deliberately
 * ignores the page's `error` state, because that slot is shared with
 * *operational* errors such as a failed Mautic sync. A sync failure leaves the
 * broadcast saved and fully loaded, so treating it as a load failure used to
 * replace a working editor with "Broadcast could not be loaded."
 *
 * A genuine load failure is still distinguishable: loadDetail() sets the
 * campaign back to null when the detail GET fails, so a null campaign — not the
 * presence of an error message — is what means "could not be loaded".
 */
export function isBroadcastDetailLoaded({ isNew, loading, campaign }) {
  if (isNew) return true;
  return !loading && Boolean(campaign);
}

/**
 * Statuses in which a broadcast has been handed over for delivery. A draft,
 * scheduled or cancelled broadcast has no sends, so the list shows "—" for it
 * without asking for analytics.
 */
const STATUSES_WITH_SEND_DATA = new Set(["sending", "sent", "failed"]);

export function broadcastHasSendData(status) {
  return STATUSES_WITH_SEND_DATA.has(String(status || "").toLowerCase());
}

/**
 * How to show one rate (`open_rate` or `click_rate`) from a backend analytics
 * payload — the per-broadcast response or one entry of the list summary,
 * which share the same shape and semantics.
 *
 * The backend returns rate 0 both for "never sent" and for a real 0%, so the
 * difference is read from its own denominator (delivered, else provider
 * sends): no denominator means no send data, not 0%.
 *
 * @returns {{ kind: "loading" | "unavailable" | "none" | "value", value?: number }}
 */
export function broadcastRate(analytics, rateKey) {
  if (!analytics || analytics.loading) return { kind: "loading" };
  if (analytics.error) return { kind: "unavailable" };
  const metadata = analytics.metadata || {};
  // Opens and provider sends come from Mautic; without it they would read as 0.
  if (metadata.mautic_email_id && metadata.mautic_available === false) {
    return { kind: "unavailable" };
  }
  const denominator =
    Number(analytics.engagement?.delivered_count) || Number(analytics.send_summary?.sent_count) || 0;
  if (!denominator) return { kind: "none" };
  const value = Number(analytics.rates?.[rateKey]);
  if (analytics.rates?.[rateKey] == null || !Number.isFinite(value)) return { kind: "unavailable" };
  return { kind: "value", value };
}

/** A rate (0–1) as a percentage with at most one decimal: 0.5 → "50%", 0.4234 → "42.3%". */
export function formatRate(value) {
  const number = Number(value);
  if (value == null || !Number.isFinite(number)) return "";
  return `${Number((number * 100).toFixed(1))}%`;
}

/** Text for a rate cell: "—" for no send data, never "0%" unless it is a real 0%. */
export function broadcastRateText(analytics, rateKey) {
  const rate = broadcastRate(analytics, rateKey);
  if (rate.kind === "value") return formatRate(rate.value);
  if (rate.kind === "none") return "—";
  if (rate.kind === "unavailable") return "Unavailable";
  return "";
}

/** Mirrors the backend cutoff: native changes stop one minute before the send minute. */
const NATIVE_CHANGE_CUTOFF_MS = 60 * 1000;

/**
 * Which schedule actions the editor offers for a broadcast.
 *
 * Only a draft can be scheduled and only a scheduled broadcast can be
 * rescheduled or cancelled, so a sent broadcast offers neither. A broadcast
 * Mautic delivers itself (schedule_owner "mautic") also stops offering them
 * once its send minute is about to start, because Mautic may already be
 * sending it. The backend enforces the same rule; this only avoids offering a
 * button that would be refused. Evaluated at render time, with no timers.
 */
export function broadcastScheduleActions({
  detailLoaded,
  isNew,
  status,
  scheduleOwner,
  scheduledAt,
  now = Date.now(),
}) {
  if (!detailLoaded || isNew) return { canSchedule: false, canCancel: false };
  const scheduled = status === "scheduled";
  let canSchedule = status === "draft" || scheduled;
  let canCancel = scheduled;

  if (scheduled && scheduleOwner === "mautic" && scheduledAt) {
    const due = new Date(scheduledAt).getTime();
    if (!Number.isNaN(due)) {
      const sendMinute = due - (due % 60000);
      if (now >= sendMinute - NATIVE_CHANGE_CUTOFF_MS) {
        canSchedule = false;
        canCancel = false;
      }
    }
  }
  return { canSchedule, canCancel };
}
