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
