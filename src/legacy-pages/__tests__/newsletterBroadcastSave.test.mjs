import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  SAVE_STAGE_LOCAL,
  SAVE_STAGE_SYNC,
  SAVE_STATUS_SYNCED,
  SAVE_STATUS_SYNC_FAILED,
  saveBroadcastDraft,
} from "../newsletterBroadcastSave.js";

const CREATED = {
  uuid: "created-uuid",
  name: "Broadcast",
  mautic_email_id: "",
};

const SYNCED = {
  uuid: "created-uuid",
  name: "Broadcast",
  mautic_email_id: "77",
  last_synced_to_mautic_at: "2026-09-23T10:00:00Z",
  last_error: "",
};

const PAYLOAD = { name: "Broadcast", subject: "Subject" };

/** Records every dependency call in the order it happened. */
function harness({ createResult, updateResult, syncResult } = {}) {
  const calls = [];
  const state = { applied: [], errors: [], notices: [], navigated: [] };

  const resolve = (name, result) => async (...args) => {
    calls.push(name);
    if (result instanceof Error) throw result;
    return result;
  };

  return {
    calls,
    state,
    deps: {
      payload: PAYLOAD,
      createCampaign: resolve("create", createResult ?? CREATED),
      updateCampaign: resolve("update", updateResult ?? CREATED),
      syncCampaign: resolve("sync", syncResult ?? SYNCED),
      applySaved: (record) => {
        calls.push("applySaved");
        state.applied.push(record);
      },
      onError: (info) => {
        calls.push("onError");
        state.errors.push(info);
      },
      onNotify: (info) => {
        calls.push("onNotify");
        state.notices.push(info);
      },
      onNavigate: (uuid) => {
        calls.push("navigate");
        state.navigated.push(uuid);
      },
    },
  };
}

const countOf = (calls, name) => calls.filter((call) => call === name).length;

// A — new broadcast, both steps succeed
test("a new broadcast is created locally and then synced, in that order", async () => {
  const { calls, state, deps } = harness();

  const result = await saveBroadcastDraft({ isNew: true, ...deps });

  assert.equal(countOf(calls, "create"), 1);
  assert.equal(countOf(calls, "sync"), 1);
  assert.ok(
    calls.indexOf("create") < calls.indexOf("sync"),
    "the local draft must exist before it is synced"
  );
  assert.equal(countOf(calls, "update"), 0);
  assert.deepEqual(state.navigated, ["created-uuid"]);
  assert.deepEqual(state.notices, [{ status: SAVE_STATUS_SYNCED }]);
  assert.equal(state.errors.length, 0);
  // The synced record is authoritative: it carries the Mautic email id.
  assert.equal(result.mautic_email_id, "77");
  assert.equal(state.applied.at(-1).mautic_email_id, "77");
});

test("the new broadcast is synced by its freshly created uuid", async () => {
  const seen = [];
  const { deps } = harness();

  await saveBroadcastDraft({
    isNew: true,
    ...deps,
    syncCampaign: async (uuid) => {
      seen.push(uuid);
      return SYNCED;
    },
  });

  assert.deepEqual(seen, ["created-uuid"]);
});

// B — existing broadcast, both steps succeed
test("an existing broadcast is patched locally and then synced", async () => {
  const { calls, state, deps } = harness();

  await saveBroadcastDraft({
    isNew: false,
    campaignId: "existing-uuid",
    ...deps,
    updateCampaign: async (uuid, payload) => {
      calls.push("update");
      assert.equal(uuid, "existing-uuid");
      assert.deepEqual(payload, PAYLOAD);
      return { ...CREATED, uuid: "existing-uuid" };
    },
    syncCampaign: async (uuid) => {
      calls.push("sync");
      assert.equal(uuid, "existing-uuid");
      return { ...SYNCED, uuid: "existing-uuid" };
    },
  });

  assert.equal(countOf(calls, "update"), 1);
  assert.equal(countOf(calls, "sync"), 1);
  assert.equal(countOf(calls, "create"), 0);
  assert.ok(calls.indexOf("update") < calls.indexOf("sync"));
  // Editing must never navigate.
  assert.deepEqual(state.navigated, []);
  assert.deepEqual(state.notices, [{ status: SAVE_STATUS_SYNCED }]);
});

// C — new broadcast, local save succeeds, sync fails
test("a new draft survives a sync failure and still leaves /new", async () => {
  const syncError = new Error("mautic unavailable");
  const { calls, state, deps } = harness({ syncResult: syncError });

  const result = await saveBroadcastDraft({ isNew: true, ...deps });

  assert.equal(countOf(calls, "create"), 1, "no second draft may be created");
  assert.equal(countOf(calls, "sync"), 1, "sync must not be retried");
  // The saved draft is returned and kept, never rolled back.
  assert.equal(result.uuid, "created-uuid");
  assert.equal(state.applied.at(-1).uuid, "created-uuid");
  // Navigation still happens, or the next Save would duplicate the draft.
  assert.deepEqual(state.navigated, ["created-uuid"]);
  assert.deepEqual(state.errors, [{ stage: SAVE_STAGE_SYNC, error: syncError }]);
  assert.deepEqual(state.notices, [{ status: SAVE_STATUS_SYNC_FAILED }]);
});

// D — existing broadcast, local save succeeds, sync fails
test("an existing draft keeps its saved local state when sync fails", async () => {
  const syncError = new Error("mautic rejected");
  const { calls, state, deps } = harness({
    updateResult: { ...CREATED, uuid: "existing-uuid" },
    syncResult: syncError,
  });

  const result = await saveBroadcastDraft({
    isNew: false,
    campaignId: "existing-uuid",
    ...deps,
  });

  assert.equal(countOf(calls, "update"), 1, "no second PATCH may happen");
  assert.equal(countOf(calls, "sync"), 1);
  // applySaved ran with the patched record, so the form is not left dirty.
  assert.equal(state.applied.length, 1);
  assert.equal(state.applied[0].uuid, "existing-uuid");
  assert.equal(result.uuid, "existing-uuid");
  assert.deepEqual(state.navigated, [], "editing must not navigate");
  assert.equal(state.errors[0].stage, SAVE_STAGE_SYNC);
});

// E — local save fails
test("sync is never attempted when the local save fails", async () => {
  const localError = new Error("validation rejected");
  const { calls, state, deps } = harness({ createResult: localError });

  const result = await saveBroadcastDraft({ isNew: true, ...deps });

  assert.equal(result, null);
  assert.equal(countOf(calls, "sync"), 0, "Mautic must not be contacted");
  assert.equal(countOf(calls, "applySaved"), 0);
  assert.deepEqual(state.navigated, []);
  assert.deepEqual(state.errors, [{ stage: SAVE_STAGE_LOCAL, error: localError }]);
  assert.deepEqual(state.notices, []);
});

test("an existing draft whose PATCH fails does not reach Mautic either", async () => {
  const localError = new Error("conflict");
  const { calls, state, deps } = harness({ updateResult: localError });

  const result = await saveBroadcastDraft({
    isNew: false,
    campaignId: "existing-uuid",
    ...deps,
  });

  assert.equal(result, null);
  assert.equal(countOf(calls, "sync"), 0);
  assert.equal(state.errors[0].stage, SAVE_STAGE_LOCAL);
});

// F — no send or schedule side effects
test("saving performs exactly one local write and at most one sync", async () => {
  const { calls, deps } = harness();

  await saveBroadcastDraft({ isNew: true, ...deps });

  const providerCalls = calls.filter((call) =>
    ["create", "update", "sync"].includes(call)
  );
  assert.deepEqual(providerCalls, ["create", "sync"]);
});

test("the save orchestration cannot send, schedule or delete", () => {
  const source = fs.readFileSync(
    path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      "../newsletterBroadcastSave.js"
    ),
    "utf8"
  );

  for (const forbidden of [
    "sendNewsletterCampaign",
    "scheduleNewsletterCampaign",
    "cancelNewsletterCampaign",
    "deleteNewsletterCampaign",
    "sendNewsletterTestEmail",
    "previewNewsletterCampaign",
  ]) {
    assert.ok(
      !source.includes(forbidden),
      `${forbidden} must not be reachable from Save Draft`
    );
  }
});

test("the Save Draft button is wired to the orchestrator, not a bare create", () => {
  const source = fs.readFileSync(
    path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      "../AdminNewsletterPage.jsx"
    ),
    "utf8"
  );

  assert.ok(source.includes("syncNewsletterCampaign"), "sync helper must be imported");
  assert.ok(source.includes("saveBroadcastDraft("), "saveDraft must delegate to the orchestrator");
  // The existing helper is reused rather than a second client being added.
  assert.ok(
    source.includes('from "../services/newsletterService"'),
    "the existing newsletter service must remain the only API client"
  );
});
