import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

import {
  React,
  apiError,
  cleanup,
  click,
  fakeBlogService,
  getByRole,
  loadSource,
  makeImportRun,
  page,
  queryByRole,
  queryByText,
  renderRoutes,
  router,
  setBlogApi,
  settle,
  signIn,
  signOut,
  waitFor,
} from "./helpers/blogDomHarness.mjs";

const { default: WordPressImportPanel } = await loadSource("src/components/blogs/WordPressImportPanel.jsx");
const { blogAdminRoutes } = await loadSource("src/routes/blogRoutes.jsx");
const { Route, Outlet } = router;
const h = React.createElement;

const finished = [];
const renderPanel = () =>
  renderRoutes([h(Route, { key: "p", path: "*", element: h(WordPressImportPanel, { pollInterval: 20, onFinished: (r) => finished.push(r) }) })]);

const running = (overrides = {}) =>
  makeImportRun({ status: "running", current_step: "syncing_blogs", total_importable: 3, progress: { processed: 1, total: 3, media_processed: 2, media_total: 10 }, ...overrides });
const allStatusSummary = {
  errors: [], media_failures: [], restricted_post_ids: [84],
  restricted: { detected: 1, imported_as_draft: 1, teaser_only_not_imported: 0, teaser_only_post_ids: [] },
  source_status_counts: { publish: 93, draft: 11, pending: 0, future: 2, private: 0 },
  ecp_status_counts: { published: 85, draft: 21, restricted_draft: 8 },
};
const done = (overrides = {}) =>
  makeImportRun({ status: "succeeded", current_step: "completed", created_count: 3, restricted_count: 1, media_migrated_count: 7, links_rewritten_count: 2, finished_at: "2026-09-26T08:10:00Z", summary: allStatusSummary, ...overrides });

/** Service whose status endpoint walks through the given runs, then repeats the last. */
function sequence(runs, extra = {}) {
  let i = 0;
  return fakeBlogService({
    getWordPressBlogImport: async () => runs[Math.min(i++, runs.length - 1)],
    ...extra,
  });
}

/** Service whose status endpoint returns `state.run`; the test advances it explicitly. */
function controlled(initial, extra = {}) {
  const state = { run: initial };
  const api = fakeBlogService({ getWordPressBlogImport: async () => state.run, ...extra });
  return { api, state };
}

beforeEach(() => {
  finished.length = 0;
  signIn({ superuser: true });
});
afterEach(async () => {
  await cleanup();
  signOut();
});

test("button opens a confirmation modal; Cancel starts nothing", async () => {
  const api = fakeBlogService();
  setBlogApi(api);
  await renderPanel();
  await click(getByRole("button", "Import from WordPress"));
  const dialog = await waitFor(() => getByRole("dialog"));
  for (const text of [
    /WordPress Blogs will be synchronized into ECP/,
    /Published public Blogs are imported as Published/,
    /drafts, pending, scheduled or private Blogs are imported as Drafts/,
    /Membership-restricted Blogs are imported as Drafts so restricted content is not accidentally exposed/,
    /unchanged Blogs are skipped/,
    /No ECP Blog is automatically deleted/,
    /several minutes/,
  ]) {
    assert.match(dialog.textContent, text);
  }
  assert.doesNotMatch(dialog.textContent, /Restricted\) Blogs are skipped|Published, public WordPress Blogs are synchronized/);
  await click(getByRole("button", "Cancel", { scope: dialog }));
  await waitFor(() => assert.ok(!queryByRole("dialog"), "dialog closed"));
  assert.equal(api.callsTo("startWordPressBlogImport").length, 0);
});

test("start -> progress polling -> completion, then polling stops and the list is refreshed", async () => {
  const { api, state } = controlled(running());
  setBlogApi(api);
  await renderPanel();
  await click(getByRole("button", "Import from WordPress"));
  await click(getByRole("button", "Start Import", { scope: await waitFor(() => getByRole("dialog")) }));

  await waitFor(() => assert.ok(queryByText("Importing from WordPress…", { selector: ".MuiAlertTitle-root" })));
  assert.equal(api.callsTo("startWordPressBlogImport").length, 1);
  assert.equal(getByRole("button", "Importing from WordPress…").disabled, true, "cannot start twice");
  await waitFor(() => assert.ok(queryByText(/Processed 1 \/ 3/)));
  assert.ok(queryByText(/Images 2 \/ 10/));
  assert.ok(queryByText("Importing Blogs…"));

  state.run = running({ current_step: "migrating_media", progress: { processed: 3, total: 3, media_processed: 6, media_total: 10 } });
  await waitFor(() => assert.ok(queryByText(/Processed 3 \/ 3/)));
  assert.ok(queryByText("Migrating images…"));
  state.run = running({ current_step: "migrating_media", restricted_count: 8, progress: { processed: 3, total: 3, media_processed: 7, media_total: 10 } });
  await waitFor(() => assert.ok(queryByText("Restricted: 8")));
  assert.ok(!document.querySelector("[data-testid='import-progress']").textContent.includes("skipped"),
    "an active run never claims restricted posts were skipped");
  assert.equal(finished.length, 0);

  state.run = done();
  await waitFor(() => assert.ok(queryByText("WordPress import completed.")));
  const result = document.querySelector("[data-testid='import-result']").textContent;
  for (const text of ["Created: 3", "Restricted → Draft: 1", "Failed: 0", "Media migrated: 7", "Links rewritten: 2",
                      "WordPress: Published 93 · Draft 11 · Scheduled 2", "In ECP: 85 Published · 21 Draft (8 members-only)"]) {
    assert.ok(result.includes(text), text);
  }
  assert.ok(!result.includes("Pending") && !result.includes("Private"), "empty rare statuses are not listed");
  assert.ok(!result.includes("skipped): "), "restricted posts are not reported as skipped");
  assert.equal(finished.length, 1);
  const polls = api.callsTo("getWordPressBlogImport").length;
  await settle(120);
  assert.equal(api.callsTo("getWordPressBlogImport").length, polls, "polling stopped");
  assert.equal(getByRole("button", "Import from WordPress").disabled, false);
});

test("partial completion shows a warning with failure IDs, no stack traces", async () => {
  setBlogApi(sequence([done({
    status: "partial", failed_count: 1,
    summary: { errors: [{ wp_post_id: 42, message: "import failed and was rolled back: RuntimeError" }],
               media_failures: [{ wp_post_id: 7, kind: "inline", code: "timeout", message: "download timed out" }] },
  })]));
  await renderPanel();
  await click(getByRole("button", "Import from WordPress"));
  await click(getByRole("button", "Start Import", { scope: await waitFor(() => getByRole("dialog")) }));
  await waitFor(() => assert.ok(queryByText("Import completed with warnings.")));
  const problems = document.querySelector("[data-testid='import-problems']").textContent;
  assert.match(problems, /WordPress post 42: import failed and was rolled back: RuntimeError/);
  assert.match(problems, /Post 7 inline image: download timed out/);
});

test("a failed run shows the safe error message", async () => {
  setBlogApi(sequence([makeImportRun({ status: "failed", current_step: "failed", error_message: "WordPress was unavailable after retries: HTTP 503" })]));
  await renderPanel();
  await click(getByRole("button", "Import from WordPress"));
  await click(getByRole("button", "Start Import", { scope: await waitFor(() => getByRole("dialog")) }));
  await waitFor(() => assert.ok(queryByText("WordPress import failed.")));
  assert.ok(queryByText("WordPress was unavailable after retries: HTTP 503"));
});

test("409 attaches to the running import instead of failing", async () => {
  setBlogApi(sequence([running()], {
    startWordPressBlogImport: async () => ({ ...running(), alreadyRunning: true }),
  }));
  await renderPanel();
  await click(getByRole("button", "Import from WordPress"));
  await click(getByRole("button", "Start Import", { scope: await waitFor(() => getByRole("dialog")) }));
  await waitFor(() => assert.ok(queryByText("An import is already running.")));
  await waitFor(() => assert.ok(!queryByRole("dialog"), "dialog closed"));
});

test("start errors stay in the modal", async () => {
  setBlogApi(fakeBlogService({
    startWordPressBlogImport: async () => { throw apiError(503, "Authenticated WordPress Blog import is not configured."); },
  }));
  await renderPanel();
  await click(getByRole("button", "Import from WordPress"));
  const dialog = await waitFor(() => getByRole("dialog"));
  await click(getByRole("button", "Start Import", { scope: dialog }));
  await waitFor(() => assert.ok(queryByText("Authenticated WordPress Blog import is not configured.")));
  assert.ok(queryByRole("dialog"));
});

test("teaser-only members posts are reported as not imported, never as drafts", async () => {
  setBlogApi(fakeBlogService({ getLatestWordPressBlogImport: async () => done({
    restricted_count: 3,
    summary: { ...allStatusSummary, restricted: { detected: 3, imported_as_draft: 1, teaser_only_not_imported: 2, teaser_only_post_ids: [5, 6] } },
  }) }));
  await renderPanel();
  await waitFor(() => assert.ok(queryByText("WordPress import completed.")));
  const result = document.querySelector("[data-testid='import-result']").textContent;
  assert.ok(result.includes("Restricted → Draft: 1"));
  assert.ok(result.includes("Restricted (not imported): 2"));
});

test("runs from before draft sync keep their original restricted meaning", async () => {
  setBlogApi(fakeBlogService({ getLatestWordPressBlogImport: async () => done({
    restricted_count: 8, summary: { errors: [], media_failures: [], restricted_post_ids: [1, 2] },
  }) }));
  await renderPanel();
  await waitFor(() => assert.ok(queryByText("WordPress import completed.")));
  const result = document.querySelector("[data-testid='import-result']").textContent;
  assert.ok(result.includes("Restricted (skipped): 8"));
  assert.ok(!result.includes("→ Draft"));
  assert.ok(!document.querySelector("[data-testid='import-status-breakdown']"), "no breakdown for old runs");
});

test("an active import is restored after a page refresh and keeps polling", async () => {
  const { api, state } = controlled(running(), { getLatestWordPressBlogImport: async () => running() });
  setBlogApi(api);
  await renderPanel();
  await waitFor(() => assert.ok(queryByText(/Processed 1 \/ 3/)));
  assert.equal(api.callsTo("startWordPressBlogImport").length, 0);
  await waitFor(() => assert.ok(api.callsTo("getWordPressBlogImport").length >= 2, "keeps polling"));
  state.run = done();
  await waitFor(() => assert.ok(queryByText("WordPress import completed.")));
});

test("the last finished import is summarised on load", async () => {
  setBlogApi(fakeBlogService({ getLatestWordPressBlogImport: async () => done() }));
  await renderPanel();
  await waitFor(() => assert.match(document.querySelector("[data-testid='last-import']").textContent, /completed September 26, 2026/));
});

test("network errors while polling are retried; unmount stops polling", async () => {
  let fail = true;
  const api = fakeBlogService({
    getLatestWordPressBlogImport: async () => running(),
    getWordPressBlogImport: async () => {
      if (fail) { fail = false; throw apiError(null, "Network error. Please check your connection and try again."); }
      return running();
    },
  });
  setBlogApi(api);
  await renderPanel();
  await waitFor(() => assert.ok(api.callsTo("getWordPressBlogImport").length >= 2));
  await cleanup();
  const polls = api.callsTo("getWordPressBlogImport").length;
  await settle(120);
  assert.equal(api.callsTo("getWordPressBlogImport").length, polls, "no timers after unmount");
});

test("My Blogs shows the button and refreshes the list when an import finishes", async () => {
  let listCalls = 0;
  const api = fakeBlogService({
    listAdminBlogs: async () => { listCalls += 1; return page([]); },
    getLatestWordPressBlogImport: async () => running(),
    getWordPressBlogImport: async () => done(),
  });
  setBlogApi(api);
  await renderRoutes([h(Route, { key: "admin", path: "/admin", element: h(Outlet) }, blogAdminRoutes)], { url: "/admin/blogs" });
  await waitFor(() => assert.ok(queryByRole("button", "Importing from WordPress…")));
  const before = listCalls;
  await settle(3300); // real page uses the default 3 s poll interval
  await waitFor(() => assert.ok(queryByText("WordPress import completed.")));
  await waitFor(() => assert.ok(listCalls > before, "My Blogs list reloaded"));
});
