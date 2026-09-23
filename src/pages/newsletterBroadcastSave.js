/**
 * Save Draft orchestration for an Email Broadcast.
 *
 * ECP and Mautic are separate systems, so saving is two independent steps
 * rather than one transaction:
 *
 *   1. store the draft in ECP (create or update)
 *   2. synchronise it to Mautic
 *
 * Step 2 may fail without invalidating step 1. When it does, the local draft
 * stays saved, the caller is told which stage failed, and a newly created
 * draft still leaves /new so the next Save cannot create a second draft.
 *
 * Kept out of the page component so the ordering and the failure paths can be
 * tested directly, following the same convention as the other extracted
 * helpers beside these pages.
 */

export const SAVE_STAGE_LOCAL = "local";
export const SAVE_STAGE_SYNC = "sync";

export const SAVE_STATUS_SYNCED = "synced";
export const SAVE_STATUS_SYNC_FAILED = "sync_failed";

/**
 * @param {object} options
 * @param {boolean} options.isNew           creating rather than editing
 * @param {string}  options.campaignId      existing draft uuid, when editing
 * @param {object}  options.payload         validated form payload
 * @param {Function} options.createCampaign (payload) => Promise<campaign>
 * @param {Function} options.updateCampaign (uuid, payload) => Promise<campaign>
 * @param {Function} options.syncCampaign   (uuid) => Promise<campaign>
 * @param {Function} options.applySaved     (campaign) => void, adopts saved state
 * @param {Function} options.onError        ({stage, error}) => void
 * @param {Function} options.onNotify       ({status}) => void
 * @param {Function} options.onNavigate     (uuid) => void, only for a new draft
 * @returns {Promise<object|null>} the authoritative campaign, or null if the
 *   local save failed and nothing was stored.
 */
export async function saveBroadcastDraft({
  isNew,
  campaignId,
  payload,
  createCampaign,
  updateCampaign,
  syncCampaign,
  applySaved,
  onError,
  onNotify,
  onNavigate,
}) {
  let saved;
  try {
    saved = isNew
      ? await createCampaign(payload)
      : await updateCampaign(campaignId, payload);
  } catch (error) {
    // Nothing was stored, so there is nothing to synchronise. Mautic is not
    // contacted at all on this path.
    onError({ stage: SAVE_STAGE_LOCAL, error });
    return null;
  }

  // The draft is durable from here on.
  applySaved(saved);

  try {
    // Creates the Mautic list email on the first sync and updates that same
    // email afterwards. Exactly one attempt per Save: a failure is reported
    // and left for the admin to retry explicitly.
    const synced = await syncCampaign(saved.uuid);
    applySaved(synced);
    onNotify({ status: SAVE_STATUS_SYNCED });
    if (isNew) onNavigate(saved.uuid);
    return synced;
  } catch (error) {
    onError({ stage: SAVE_STAGE_SYNC, error });
    onNotify({ status: SAVE_STATUS_SYNC_FAILED });
    // Still leave /new: the draft exists, and staying would make the next
    // Save create a duplicate.
    if (isNew) onNavigate(saved.uuid);
    return saved;
  }
}
