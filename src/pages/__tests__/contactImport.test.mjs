import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

import {
  React,
  act,
  all,
  chooseSelectOption,
  cleanup,
  click,
  getByRole,
  loadSource,
  queryByRole,
  queryByText,
  renderRoutes,
  router,
  selectFile,
  waitFor,
} from "./helpers/blogDomHarness.mjs";

const { default: AdminNewsletterContactsPage } = await loadSource("src/pages/AdminNewsletterContactsPage.jsx");
const { Route } = router;
const h = React.createElement;

// jsdom Files only fit jsdom's FormData (Node's own rejects them).
globalThis.FormData = window.FormData;

// Assertions only ever compare strings/booleans: a failing assert on a live
// jsdom node makes Node pretty-print the whole DOM graph and exhaust memory.

const IMPORTS = "/newsletter/admin/contacts/imports/";
const TARGETS = [
  { alias: "email", label: "Email", type: "email", group: "core", importable: true, special: false, reason: "" },
  { alias: "firstname", label: "First Name", type: "text", group: "core", importable: true, special: false, reason: "" },
  { alias: "city", label: "City", type: "text", group: "core", importable: true, special: false, reason: "" },
  { alias: "points", label: "Points", type: "number", group: "core", importable: false, special: false, reason: "Set by Mautic; cannot be imported." },
  { alias: "tags", label: "Tags", type: "tags", group: "special", importable: true, special: true, reason: "" },
  { alias: "doNotEmail", label: "Do Not Contact (email)", type: "dnc", group: "special", importable: true, special: true, reason: "" },
];
const PREVIEW = {
  file: { name: "contacts.csv", size: 120, sha256: "x", delimiter: "comma" },
  total_rows: 3,
  empty_rows: 0,
  total_columns: 3,
  headers: ["Email", "First Name", "City"],
  sample_rows: [
    { row: 2, cells: ["user1@example.test", "<img src=x onerror=alert(1)>", "Surat"] },
    { row: 3, cells: ["user2@example.test", "=HYPERLINK(\"x\")", "Mumbai"] },
    { row: 4, cells: ["user3@example.test", "Zoë", ""] },
  ],
  missing_values: { Email: 0, "First Name": 0, City: 1 },
  detected_email_column: "Email",
  duplicate_email_rows: 0,
  missing_email_rows: 0,
  suggested_mapping: { Email: "email", "First Name": "firstname", City: "city" },
  warnings: [],
};
const VALIDATION = {
  file: { name: "contacts.csv", size: 120, sha256: "x" },
  mapping: [
    { column: "Email", field: "email", label: "Email", type: "email" },
    { column: "First Name", field: "firstname", label: "First Name", type: "text" },
  ],
  options: { existing_mode: "skip_existing", tag_separator: "|" },
  summary: {
    total_rows: 3,
    to_create: 2,
    to_skip: 1,
    to_update: 0,
    to_import: 2,
    invalid_rows: 0,
    duplicate_rows: 0,
    dnc_rows: 0,
    existing_suppressed: 1,
    existing_checked: true,
    existing_mode: "skip_existing",
  },
  issues: [],
  issue_count: 0,
  issues_truncated: false,
  warnings: ["1 matching Mautic contacts already have email Do Not Contact; it is kept."],
  validation_token: "signed-token",
};
const job = (overrides = {}) => ({
  id: 77,
  state: "queued",
  terminal: false,
  file_name: "contacts.csv",
  total_rows: 3,
  rows_sent: 2,
  processed: 0,
  progress_percentage: 0,
  created: 0,
  updated: 0,
  skipped_existing: 1,
  failed: 0,
  excluded_invalid: 0,
  ...overrides,
});

let requests;
let startResponse;
let jobResponses;

function installApi({ history = [] } = {}) {
  requests = [];
  startResponse = async () => ({ data: { import: job(), duplicate: false } });
  jobResponses = [job({ state: "completed", terminal: true, processed: 2, created: 2, progress_percentage: 100 })];
  globalThis.__testApiClient = {
    get: async (url, config = {}) => {
      requests.push({ method: "get", url, params: config.params });
      if (url === "/newsletter/admin/contacts/") return { data: { count: 0, page: 1, num_pages: 1, results: [] } };
      if (url === "/newsletter/admin/stages/") return { data: { results: [] } };
      if (url === `${IMPORTS}fields/`) return { data: { results: TARGETS, limits: { max_bytes: 1024 * 1024, max_rows: 20000 } } };
      if (url === IMPORTS) return { data: { count: history.length, results: history } };
      if (url === `${IMPORTS}77/`) return { data: jobResponses.length > 1 ? jobResponses.shift() : jobResponses[0] };
      if (url === `${IMPORTS}77/errors/`) {
        return { data: { count: 1, results: [{ row: 4, line: 3, category: "skipped_existing", message: "A contact with this email already exists in Mautic, so the row was skipped." }] } };
      }
      return { data: {} };
    },
    post: async (url, form) => {
      requests.push({ method: "post", url, form });
      if (url === `${IMPORTS}preview/`) return { data: PREVIEW };
      if (url === `${IMPORTS}validate/`) return { data: VALIDATION };
      if (url === `${IMPORTS}start/`) return startResponse();
      throw new Error(`unexpected POST ${url}`);
    },
  };
}

const posts = (suffix) => requests.filter((r) => r.method === "post" && r.url === `${IMPORTS}${suffix}`);
const hasText = (matcher) => queryByText(matcher) !== null;
const button = (name) => queryByRole("button", name);
const confirmBox = () => document.querySelector("[role='dialog'] input[type='checkbox']");
const csvFile = (name = "contacts.csv", content = "Email,First Name,City\nuser1@example.test,A,B\n") =>
  new window.File([content], name, { type: "text/csv" });

async function renderPage() {
  const view = await renderRoutes(
    [h(Route, { key: "contacts", path: "/admin/newsletter/contacts", element: h(AdminNewsletterContactsPage) })],
    { url: "/admin/newsletter/contacts" }
  );
  await waitFor(() => assert.equal(Boolean(button("Import CSV")), true));
  return view;
}

async function openWizard() {
  await renderPage();
  await click(button("Import CSV"));
  await waitFor(() => assert.equal(Boolean(queryByRole("dialog")), true));
  await waitFor(() => assert.equal(requests.some((r) => r.url === `${IMPORTS}fields/`), true));
}

async function uploadAndPreview(file = csvFile()) {
  await selectFile(document.getElementById("contact-import-file"), file);
  await click(button("Upload and preview"));
  await waitFor(() => assert.equal(hasText(/Showing the first 3 of 3 rows/), true));
}

async function goToReview() {
  await uploadAndPreview();
  await click(button("Map fields"));
  await waitFor(() => assert.equal(Boolean(button("Validate all rows")), true));
  await click(button("Validate all rows"));
  await waitFor(() => assert.equal(Boolean(button("Start import")), true));
}

beforeEach(() => {
  window.sessionStorage.clear();
  installApi();
});
afterEach(async () => {
  await cleanup();
  delete globalThis.__testApiClient;
});

test("Import CSV sits beside the existing Contacts actions without replacing them", async () => {
  await renderPage();
  assert.equal(Boolean(button("Create Contact")), true);
  assert.equal(Boolean(button("Refresh")), true);
  assert.equal(Boolean(button("Import CSV")), true);
  assert.equal(queryByRole("dialog"), null);
  assert.equal(requests.some((r) => r.url.startsWith(IMPORTS)), false);
});

test("unsupported and empty files are rejected before any upload", async () => {
  await openWizard();
  await selectFile(document.getElementById("contact-import-file"), csvFile("contacts.xlsx"));
  await waitFor(() => assert.equal(hasText("Only .csv files can be imported."), true));
  assert.equal(button("Upload and preview").disabled, true);

  await selectFile(document.getElementById("contact-import-file"), csvFile("empty.csv", ""));
  await waitFor(() => assert.equal(hasText("The file is empty."), true));
  assert.equal(posts("preview/").length, 0);
});

test("preview shows a capped, escaped, read-only sample", async () => {
  await openWizard();
  await uploadAndPreview();
  const form = posts("preview/")[0].form;
  assert.equal(form.get("file").name, "contacts.csv");
  assert.equal(hasText("<img src=x onerror=alert(1)>"), true);
  assert.equal(all("dialog img, [role='dialog'] img").length, 0);
  assert.equal(hasText('=HYPERLINK("x")'), true);
  assert.equal(hasText("Email column: Email"), true);
  assert.equal(posts("validate/").length + posts("start/").length, 0);
});

test("mapping uses the suggestions, blocks duplicates and requires email", async () => {
  await openWizard();
  await uploadAndPreview();
  await click(button("Map fields"));
  await waitFor(() => assert.equal(Boolean(button("Validate all rows")), true));
  assert.equal(button("Validate all rows").disabled, false);

  const selects = all("[role='combobox']", getByRole("dialog"));
  await chooseSelectOption(selects[2], /^First Name/);
  await waitFor(() => assert.equal(hasText("Another column is mapped to this field.") || queryByText(/Another column is mapped/) !== null, true));
  assert.equal(button("Validate all rows").disabled, true);

  await chooseSelectOption(all("[role='combobox']", getByRole("dialog"))[2], /^Skip this column/);
  await chooseSelectOption(all("[role='combobox']", getByRole("dialog"))[0], /^Skip this column/);
  await waitFor(() => assert.equal(hasText("Map one column to Email to continue."), true));
  assert.equal(button("Validate all rows").disabled, true);
});

test("validation sends the full mapping and options, and Start needs explicit confirmation", async () => {
  await openWizard();
  await goToReview();
  const form = posts("validate/")[0].form;
  assert.deepEqual(JSON.parse(form.get("mapping")), { Email: "email", "First Name": "firstname", City: "city" });
  assert.deepEqual(JSON.parse(form.get("options")), { existing_mode: "skip_existing", tag_separator: "|" });
  assert.equal(hasText("New contacts to create"), true);
  assert.equal(hasText(/already have email Do Not Contact/), true);

  assert.equal(button("Start import").disabled, true);
  await click(confirmBox());
  await waitFor(() => assert.equal(button("Start import").disabled, false));
});

test("a double click on Start sends one request and opens progress, then results", async () => {
  let release;
  startResponse = () => new Promise((resolve) => {
    release = () => resolve({ data: { import: job(), duplicate: false } });
  });
  await openWizard();
  await goToReview();
  await click(confirmBox());
  const start = button("Start import");
  await act(async () => {
    start.click();
    start.click();
  });
  await waitFor(() => assert.equal(Boolean(button("Starting import…")), true));
  assert.equal(posts("start/").length, 1);
  const form = posts("start/")[0].form;
  assert.equal(form.get("validation_token"), "signed-token");
  assert.equal(form.get("confirm"), "true");

  await act(async () => release());
  await waitFor(() => assert.equal(hasText("Waiting for Mautic's import queue to pick up this import."), true));
  assert.equal(window.sessionStorage.getItem("ecp.contactImport.activeImportId"), "77");

  // The first poll lands after the bounded 3 s delay.
  await waitFor(() => assert.equal(Boolean(document.querySelector("table[aria-label='Import results']")), true), { timeout: 6000 });
  assert.equal(hasText("Completed"), true);
  assert.equal(window.sessionStorage.getItem("ecp.contactImport.activeImportId"), null);
  assert.equal(posts("start/").length, 1);
});

test("changing the mapping after validation requires validating again", async () => {
  await openWizard();
  await goToReview();
  await click(button("Back to mapping"));
  await chooseSelectOption(all("[role='combobox']", getByRole("dialog"))[2], /^Skip this column/);
  await click(button("Validate all rows"));
  await waitFor(() => assert.equal(posts("validate/").length, 2));
  assert.deepEqual(JSON.parse(posts("validate/")[1].form.get("mapping")).City, "");
});

test("a start failure is reported and an expired validation must be redone", async () => {
  startResponse = async () => {
    const error = new Error("Request failed");
    error.response = { status: 400, data: { detail: "This validation has expired. Validate the file again before importing.", code: "validation_expired" } };
    throw error;
  };
  await openWizard();
  await goToReview();
  await click(confirmBox());
  await click(button("Start import"));
  await waitFor(() => assert.equal(hasText(/This validation has expired/), true));
  assert.equal(Boolean(button("Validate again")), true);
  assert.equal(button("Start import"), null);
  assert.equal(confirmBox().disabled, true);
});

test("results show Unknown instead of inventing counts and list row errors", async () => {
  installApi({
    history: [job({ state: "completed_with_errors", terminal: true, processed: 2, created: 1, failed: null, skipped_existing: null })],
  });
  await openWizard();
  await waitFor(() => assert.equal(Boolean(button("Open")), true));
  await click(button("Open"));
  await waitFor(() => assert.equal(Boolean(document.querySelector("table[aria-label='Import results']")), true));
  assert.equal(all("td").filter((td) => td.textContent === "Unknown").length >= 2, true);

  await click(button("View skipped and failed rows"));
  await waitFor(() => assert.equal(hasText(/already exists in Mautic/), true));
  assert.deepEqual(requests.find((r) => r.url === `${IMPORTS}77/errors/`).params, { page: 1, page_size: 25 });
});

test("an import still running is resumed when the dialog is reopened", async () => {
  window.sessionStorage.setItem("ecp.contactImport.activeImportId", "77");
  jobResponses = [job({ state: "processing", processed: 1, progress_percentage: 50 })];
  await openWizard();
  await waitFor(() => assert.equal(hasText("1 of 2 rows processed (50%)."), true));
  assert.equal(Boolean(button("Close")), true);
  assert.equal(hasText(/has not reported progress/), false);
});

test("a stalled import explains what happens next instead of spinning silently", async () => {
  window.sessionStorage.setItem("ecp.contactImport.activeImportId", "77");
  jobResponses = [job({ state: "processing", processed: 1, progress_percentage: 50, stalled: true })];
  await openWizard();
  await waitFor(() => assert.equal(hasText(/Mautic has not reported progress for over 15 minutes/), true));
});
