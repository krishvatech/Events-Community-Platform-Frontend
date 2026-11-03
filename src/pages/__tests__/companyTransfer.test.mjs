import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import {
  React, all, chooseSelectOption, cleanup, click, getByRole, loadSource, queryByText, renderRoutes, router, selectFile, waitFor,
} from "./helpers/blogDomHarness.mjs";

// Assertions compare strings/booleans only.
const { CompanyExportDialog, CompanyImportDialog, importStatusLabel } = await loadSource("src/components/marketing/CompanyTransferDialogs.jsx");
const { Route } = router;
const h = React.createElement;
const hasText = (matcher) => queryByText(matcher) !== null;

const FIELDS = [
  { alias: "companyname", label: "Company Name", type: "text" },
  { alias: "companywebsite", label: "Website", type: "url" },
];
const preview = (mapping, checks) => ({
  headers: ["Name", "Site"],
  fields: FIELDS,
  mapping,
  preview: [{ Name: "Acme", Site: "acme.test" }],
  rows: 2,
  checks,
});
const CHECKS = { rows: 2, without_name: 0, duplicate_names: 0, issues: [{ row: 2, column: "Site", message: '"bad" is not a web address.' }] };

afterEach(async () => {
  await cleanup();
  delete globalThis.__testApiClient;
});

const render = (element) => renderRoutes([h(Route, { key: "x", path: "/x", element })], { url: "/x" });

test("import statuses read as plain sentences", () => {
  assert.equal(importStatusLabel({ status_name: "imported", inserted: 3, updated: 1, ignored: 0 }), "Done: 3 created, 1 updated, 0 skipped");
  assert.equal(importStatusLabel({ status_name: "in_progress", progress_percentage: 40 }), "Importing… 40%");
  assert.equal(importStatusLabel({ status_name: "failed", status_info: "bad file" }), "Failed: bad file");
});

test("the import needs a name column and queues the chosen mapping and mode", async () => {
  const posts = [];
  globalThis.__testApiClient = {
    get: async () => ({ data: { results: [] } }),
    post: async (url, form) => {
      const mapping = form.get("mapping");
      posts.push({ url, mapping, mode: form.get("mode"), attempt: form.get("attempt"), hasFile: form.has("file") });
      if (url.endsWith("/preview/")) {
        const chosen = mapping ? JSON.parse(mapping) : { Name: "companyname", Site: "companywebsite" };
        return { data: { ...preview(chosen, Object.values(chosen).includes("companyname") ? CHECKS : null), attempt: "f".repeat(32) } };
      }
      return { data: { import: { id: 7 }, duplicate: false } };
    },
  };
  await render(h(CompanyImportDialog, { open: true, onClose: () => {} }));
  await selectFile(document.querySelector('input[type="file"]'), new window.File(["Name,Site\nAcme,acme.test\n"], "co.csv", { type: "text/csv" }));
  await waitFor(() => assert.equal(hasText(/2 companies will be imported/), true));
  assert.equal(hasText(/Row 2, Site: "bad" is not a web address/), true);
  const start = () => getByRole("button", "Start import");
  assert.equal(start().disabled, false);

  await chooseSelectOption(getByRole("combobox", /Field for Name/), "Do not import");
  await waitFor(() => assert.equal(hasText(/Choose which column holds the company name/), true));
  assert.equal(start().disabled, true);
  await chooseSelectOption(getByRole("combobox", /Field for Name/), "Company Name");
  await waitFor(() => assert.equal(start().disabled, false));

  await click(all('input[type="radio"]').find((radio) => radio.value === "skip_existing"));
  await click(start());
  await waitFor(() => assert.equal(hasText(/Import queued/), true));
  const queued = posts.at(-1);
  assert.equal(queued.url, "/newsletter/admin/companies/imports/");
  assert.equal(queued.mode, "skip_existing");
  assert.equal(queued.attempt, "f".repeat(32));
  // The harness's FormData stringifies jsdom Files; the real upload is covered in Chrome.
  assert.equal(queued.hasFile, true);
  assert.equal(hasText(/Change file \(co\.csv\)/), true);
  assert.equal(queued.mapping, JSON.stringify({ Name: "companyname", Site: "companywebsite" }));
});

test("the export starts with the list's search and offers ready files", async () => {
  const posts = [];
  const deleted = [];
  let jobs = [{ id: "job-1", status: "done", format: "csv", search: "", rows: 12, filename: "companies.csv" }];
  globalThis.__testApiClient = {
    get: async () => ({ data: { results: jobs } }),
    post: async (url, payload) => {
      posts.push({ url, payload });
      jobs = [{ id: "job-2", status: "done", format: "xlsx", search: "acme", rows: 1, filename: "companies.xlsx" }, ...jobs];
      return { data: jobs[0] };
    },
    delete: async (url) => {
      deleted.push(url);
      jobs = jobs.filter((job) => !url.includes(job.id));
      return { data: {} };
    },
  };
  await render(h(CompanyExportDialog, { open: true, onClose: () => {}, search: "acme" }));
  await waitFor(() => assert.equal(hasText("12 companies ready"), true));
  assert.equal(hasText(/Companies matching "acme"/), true);
  await chooseSelectOption(getByRole("combobox", /Format/), "Excel (.xlsx)");
  await click(getByRole("button", "Start Export"));
  await waitFor(() => assert.equal(hasText("1 companies ready"), true));
  assert.equal(JSON.stringify(posts), JSON.stringify([{ url: "/newsletter/admin/companies/exports/", payload: { format: "xlsx", search: "acme" } }]));
  await click(all('button[aria-label="Delete this export"]')[1]);
  await waitFor(() => assert.equal(hasText("12 companies ready"), false));
  assert.equal(JSON.stringify(deleted), JSON.stringify(["/newsletter/admin/companies/exports/job-1/"]));
});
