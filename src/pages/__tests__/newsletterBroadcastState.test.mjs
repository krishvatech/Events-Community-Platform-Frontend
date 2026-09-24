import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { isBroadcastDetailLoaded } from "../newsletterBroadcastState.js";

const CAMPAIGN = { uuid: "u-1", name: "Broadcast", status: "draft" };

// A — a loaded broadcast stays loaded when an action fails
test("a sync failure does not hide an already-loaded broadcast", () => {
  assert.equal(
    isBroadcastDetailLoaded({
      isNew: false,
      loading: false,
      campaign: CAMPAIGN,
      // The page's error slot now holds a partial-success message.
    }),
    true
  );
});

test("any operational error leaves the editor rendered", () => {
  // The predicate no longer takes `error` into account at all, so passing one
  // cannot change the answer.
  for (const error of ["", "Draft saved in ECP, but Mautic sync failed: 400", "boom"]) {
    assert.equal(
      isBroadcastDetailLoaded({ isNew: false, loading: false, campaign: CAMPAIGN, error }),
      true,
      `error ${JSON.stringify(error)} must not hide the editor`
    );
  }
});

// B — a true load failure still shows the retry state
test("a failed detail load is still reported as not loaded", () => {
  // loadDetail() sets campaign back to null when the GET fails.
  assert.equal(
    isBroadcastDetailLoaded({ isNew: false, loading: false, campaign: null }),
    false
  );
});

test("a missing campaign is not loaded even with no error set", () => {
  assert.equal(
    isBroadcastDetailLoaded({ isNew: false, loading: false, campaign: undefined }),
    false
  );
});

// C — loading state
test("the editor does not render while the detail request is in flight", () => {
  assert.equal(
    isBroadcastDetailLoaded({ isNew: false, loading: true, campaign: null }),
    false
  );
  assert.equal(
    isBroadcastDetailLoaded({ isNew: false, loading: true, campaign: CAMPAIGN }),
    false
  );
});

// D — new broadcast
test("a new broadcast is always loaded, with or without loading state", () => {
  assert.equal(isBroadcastDetailLoaded({ isNew: true, loading: false, campaign: null }), true);
  assert.equal(isBroadcastDetailLoaded({ isNew: true, loading: true, campaign: null }), true);
});

// E/F — the page wires the predicate in and keeps partial-success handling
test("the page uses the predicate rather than coupling error to load state", () => {
  const source = fs.readFileSync(
    path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      "../AdminNewsletterPage.jsx"
    ),
    "utf8"
  );

  assert.ok(
    source.includes("isBroadcastDetailLoaded({ isNew, loading, campaign })"),
    "detailLoaded must come from the shared predicate"
  );
  assert.ok(
    !source.includes("!loading && !error && Boolean(campaign)"),
    "the old error-coupled condition must be gone"
  );
  // The persisted provider error must still be surfaced, not suppressed.
  assert.ok(
    source.includes("campaign?.last_error"),
    "campaign.last_error must still be displayed"
  );
  // Partial-success Save Draft semantics from the previous batch stay intact.
  assert.ok(
    source.includes("saveBroadcastDraft("),
    "Save Draft must still delegate to the save orchestrator"
  );
});
