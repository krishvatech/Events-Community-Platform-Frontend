import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { React, chooseSelectOption, cleanup, click, getByRole, loadSource, queryByText, renderRoutes, router, waitFor } from "./helpers/blogDomHarness.mjs";

// Assertions compare strings/booleans only.
const { default: CampaignSettingsPanel, settingsChanges } = await loadSource("src/components/marketing/CampaignSettingsPanel.jsx");
const { draftToPayload, formToDraft, validateFormDraft } = await loadSource("src/pages/newsletterFormShared.jsx");
const { fromLocalInput, toLocalInput } = await loadSource("src/components/marketing/PublishWindowFields.jsx");
const { Route } = router;
const h = React.createElement;
const hasText = (matcher) => queryByText(matcher) !== null;

afterEach(async () => {
  await cleanup();
  delete globalThis.__testApiClient;
});

test("publish dates round-trip between the browser's time and ISO", () => {
  const iso = "2026-12-01T09:30:00.000Z";
  assert.equal(fromLocalInput(toLocalInput(iso)), iso);
  assert.equal(fromLocalInput(""), null);
  assert.equal(toLocalInput(null), "");
});

test("campaign settings send only what changed; clearing a date sends null", () => {
  const saved = { category: 1, allowRestart: false, publishUp: toLocalInput("2026-12-01T09:00:00Z"), publishDown: "" };
  assert.equal(JSON.stringify(settingsChanges({ ...saved }, saved)), "{}");
  assert.equal(JSON.stringify(settingsChanges({ ...saved, allowRestart: true, publishUp: "" }, saved)),
    JSON.stringify({ allowRestart: true, publishUp: null }));
});

test("the Settings tab saves the category and restart rule only", async () => {
  const patches = [];
  globalThis.__testApiClient = {
    get: async (url) => {
      if (url === "/newsletter/admin/mautic-categories/") {
        return { data: { results: [{ id: 1, title: "Onboarding", bundle: "campaign" }] } };
      }
      return { data: { id: "7", name: "Welcome", category: null, allowRestart: false, publishUp: null, publishDown: null } };
    },
    patch: async (url, payload) => {
      patches.push({ url, payload });
      return { data: { id: "7", category: { id: 1, title: "Onboarding" }, allowRestart: true, publishUp: null, publishDown: null } };
    },
  };
  await renderRoutes([h(Route, { key: "x", path: "/x", element: h(CampaignSettingsPanel, { campaignId: "7" }) })], { url: "/x" });
  await waitFor(() => assert.equal(hasText("Campaign Settings"), true));
  const save = () => getByRole("button", "Save Settings");
  assert.equal(save().disabled, true);
  await chooseSelectOption(getByRole("combobox", /Category/), "Onboarding");
  await click(getByRole("checkbox", /Contacts can restart/));
  await click(save());
  await waitFor(() => assert.equal(hasText("Settings saved."), true));
  assert.equal(JSON.stringify(patches), JSON.stringify([{ url: "/newsletter/admin/mautic-campaigns/7/settings/",
    payload: { category: 1, allowRestart: true } }]));
  assert.equal(save().disabled, true);
});

test("form settings: edits send only changes; a new Form sends only what was set", () => {
  const original = { name: "Inquiry", description: "", postAction: "message", postActionProperty: "Thanks", category: { id: "2" },
    inKioskMode: false, noIndex: false, progressiveProfilingLimit: 3, publishUp: null, publishDown: null };
  const draft = formToDraft(original);
  assert.equal(JSON.stringify(draftToPayload(draft, original)), "{}");
  assert.equal(JSON.stringify(draftToPayload({ ...draft, category: null, progressiveProfilingLimit: "", noIndex: true }, original)),
    JSON.stringify({ category: null, noIndex: true, progressiveProfilingLimit: null }));
  const created = draftToPayload({ ...formToDraft({}), name: "New", postActionProperty: "Hi", inKioskMode: true });
  assert.equal(JSON.stringify(created), JSON.stringify({ name: "New", description: "", postAction: "message", postActionProperty: "Hi", inKioskMode: true }));
});

test("form settings: limit and window are checked before saving", () => {
  const base = { ...formToDraft({}), name: "X", postActionProperty: "Hi" };
  assert.equal(validateFormDraft({ ...base, progressiveProfilingLimit: "0" }).progressiveProfilingLimit !== undefined, true);
  assert.equal(validateFormDraft({ ...base, progressiveProfilingLimit: "101" }).progressiveProfilingLimit !== undefined, true);
  assert.equal(validateFormDraft({ ...base, progressiveProfilingLimit: "5" }).progressiveProfilingLimit, undefined);
  assert.equal(validateFormDraft({ ...base, publishUp: "2026-12-05T10:00", publishDown: "2026-12-04T10:00" }).publishDown !== undefined, true);
});
