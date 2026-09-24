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
