import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

import {
  React,
  cleanup,
  click,
  loadSource,
  queryByRole,
  queryByText,
  renderRoutes,
  router,
  selectFile,
  waitFor,
} from "./helpers/blogDomHarness.mjs";

const { default: AttendeeImportDialog } = await loadSource("src/components/AttendeeImportDialog.jsx");
const helpers = await loadSource("src/utils/attendeeImport.js");
const { Route } = router;
const h = React.createElement;
globalThis.FormData = window.FormData;

// Assertions only compare strings/booleans (a failing assert on a jsdom node
// pretty-prints the whole DOM). Dummy data only.

const OPEN_EVENT = { id: 7, title: "Dummy Open Event", registration_type: "open" };
const APPLY_EVENT = { id: 8, title: "Dummy Apply Event", registration_type: "apply" };

const previewRow = (overrides = {}) => ({
  row: 2,
  email: "new.person@example.test",
  first_name: "New",
  last_name: "Person",
  type: "attendee",
  type_label: "Attendee",
  action: "register",
  account: "create",
  application: null,
  reason: "",
  warnings: [],
  ...overrides,
});

const previewPayload = (event, overrides = {}) => ({
  plan_id: "a".repeat(32),
  expires_in: 1800,
  event: { id: event.id, title: event.title, registration_type: event.registration_type, track: null },
  summary: { total: 2, create_account: 1, existing_account: 0, register: 1, accept_application: 0, skip: 1, error: 0 },
  capacity_warning: null,
  rows: [
    previewRow(),
    previewRow({ row: 3, email: "member@example.test", account: "existing", action: "skip", reason: "already_registered" }),
  ],
  ...overrides,
});

const donePayload = {
  job_id: "b".repeat(32),
  status: "done",
  total: 2,
  processed: 2,
  summary: { total: 2, registered: 1, accounts_created: 1, skipped: 1, errors: 0, emails_failed: 0 },
  results: [
    { ...previewRow(), status: "register", emails: { credentials: true, registration_confirmation: true } },
    { ...previewRow({ row: 3, email: "member@example.test", account: "existing", action: "skip", reason: "already_registered" }), status: "skip", emails: {} },
  ],
};

let requests;
let previewResponse;
let tracks;

function installApi() {
  requests = [];
  previewResponse = async () => ({ data: previewPayload(OPEN_EVENT) });
  tracks = [];
  globalThis.__testApiClient = {
    get: async (url) => {
      requests.push({ method: "get", url });
      if (url.endsWith("/application-tracks/")) return { data: tracks };
      if (url.includes("/attendee-import/status/")) return { data: donePayload };
      throw new Error(`unexpected GET ${url}`);
    },
    post: async (url, body) => {
      requests.push({ method: "post", url, body });
      if (url.endsWith("/attendee-import/preview/")) return previewResponse(body);
      if (url.endsWith("/attendee-import/apply/")) return { data: { job_id: "b".repeat(32), status: "queued" } };
      throw new Error(`unexpected POST ${url}`);
    },
  };
}

const posts = (suffix) => requests.filter((r) => r.method === "post" && r.url.endsWith(suffix));
const hasText = (matcher) => queryByText(matcher) !== null;
const button = (name) => queryByRole("button", name);
const fileInput = () => document.querySelector("input[aria-label='Attendee file']");
const csvFile = () => new window.File(["email,first_name,last_name,type\n"], "attendees.csv", { type: "text/csv" });

async function renderDialog(event, extra = {}) {
  const imported = [];
  await renderRoutes(
    [
      h(Route, {
        key: "dialog",
        path: "/",
        element: h(AttendeeImportDialog, { open: true, onClose: () => {}, event, onImported: (job) => imported.push(job), ...extra }),
      }),
    ],
    { url: "/" }
  );
  await waitFor(() => assert.equal(Boolean(fileInput()), true));
  return imported;
}

beforeEach(() => installApi());
afterEach(async () => {
  await cleanup();
  delete globalThis.__testApiClient;
});

// ---------------------------------------------------------------- helpers --

test("reason labels explain duplicates and known codes", () => {
  assert.equal(helpers.reasonLabel("duplicate_email_in_file:row_4"), "Same email as row 4");
  assert.equal(helpers.reasonLabel("disposable_email"), "Disposable email addresses are not allowed");
  assert.equal(helpers.reasonLabel("something_new"), "something_new");
});

test("row descriptions cover open and application events", () => {
  assert.equal(helpers.describeRow({ action: "register", account: "create" }).label, "New account + register");
  assert.equal(helpers.describeRow({ action: "register", account: "existing" }).label, "Register");
  assert.equal(
    helpers.describeRow({ action: "accept_application", account: "create", application: "new" }).label,
    "New account + create & accept application"
  );
  assert.equal(
    helpers.describeRow({ action: "accept_application", account: "existing", application: "existing" }).label,
    "Accept application"
  );
  // A result's status wins over the planned action
  assert.equal(helpers.describeRow({ action: "register", status: "error" }).label, "Error");
});

test("report CSV escapes commas and quotes", () => {
  const csv = helpers.buildReportCsv([
    { row: 2, email: "a@example.test", first_name: "Ann, Jr", last_name: 'O"Neil', type_label: "Sponsor", status: "register", account: "existing", emails: { registration_confirmation: true } },
  ]);
  const [header, line] = csv.split("\r\n");
  assert.equal(header, "Row,Email,First Name,Last Name,Type,Result,Notes,Emails");
  assert.equal(line, '2,a@example.test,"Ann, Jr","O""Neil",Sponsor,Register,,Confirmation sent');
});

test("only open, active tracks can be chosen", () => {
  const ids = helpers
    .importableTracks([{ id: 1, status: "open" }, { id: 2, status: "closed" }, { id: 3, status: "open", is_active: false }])
    .map((t) => t.id);
  assert.deepEqual(ids, [1]);
});

// ----------------------------------------------------------------- dialog --

test("open event: upload, preview, import and report", async () => {
  const imported = await renderDialog(OPEN_EVENT);
  assert.equal(button("Preview").disabled, true);

  await selectFile(fileInput(), csvFile());
  assert.equal(hasText("attendees.csv"), true);
  await click(button("Preview"));

  await waitFor(() => assert.equal(hasText("Nothing has been saved yet. Review what will happen to each row, then confirm."), true));
  const sent = posts("/attendee-import/preview/")[0].body;
  assert.equal(sent.get("file").name, "attendees.csv");
  assert.equal(sent.has("track_id"), false);
  assert.equal(hasText("New account + register"), true);
  assert.equal(hasText("Already registered"), true);
  assert.equal(requests.some((r) => r.url.endsWith("/application-tracks/")), false);

  await click(button("Import 1 person"));
  await waitFor(() => assert.equal(hasText(/Registered 1 · New accounts 1 · Skipped 1 · Errors 0/), true));
  assert.equal(posts("/attendee-import/apply/")[0].body.plan_id, "a".repeat(32));
  assert.equal(hasText("Login details sent · Confirmation sent"), true);
  assert.equal(Boolean(button("Download report")), true);
  assert.equal(imported.length, 1);
});

test("application event: track is required and its roles are shown", async () => {
  tracks = [
    { id: 11, label: "Dummy Delegates", status: "open", is_active: true, role_mappings_on_acceptance: ["attendee", "sponsor"] },
    { id: 12, label: "Dummy Closed", status: "closed", is_active: true, role_mappings_on_acceptance: [] },
  ];
  previewResponse = async () => ({
    data: previewPayload(APPLY_EVENT, {
      event: { ...previewPayload(APPLY_EVENT).event, track: { id: 11, label: "Dummy Delegates", roles: ["attendee", "sponsor"] } },
      summary: { total: 1, create_account: 1, existing_account: 0, register: 0, accept_application: 1, skip: 0, error: 0 },
      rows: [previewRow({ action: "accept_application", application: "new", warnings: ["was_declined"] })],
    }),
  });

  await renderDialog(APPLY_EVENT);
  // The only open track is picked automatically
  await waitFor(() => assert.equal(hasText(/with roles: attendee, sponsor\./), true));

  await selectFile(fileInput(), csvFile());
  await click(button("Preview"));
  await waitFor(() => assert.equal(hasText("New account + create & accept application"), true));
  assert.equal(posts("/attendee-import/preview/")[0].body.get("track_id"), "11");
  assert.equal(hasText("Was declined"), true);
  assert.equal(hasText(/gives these roles: attendee, sponsor/), true);
});

test("capacity warning is shown and a file error is reported", async () => {
  previewResponse = async () => ({
    data: previewPayload(OPEN_EVENT, { capacity_warning: { max_participants: 1, current: 1, after_import: 2 } }),
  });
  await renderDialog(OPEN_EVENT);
  await selectFile(fileInput(), csvFile());
  await click(button("Preview"));
  await waitFor(() => assert.equal(hasText(/over its limit of 1/), true));

  await click(button("Back"));
  previewResponse = async () => {
    const error = new Error("Request failed");
    error.response = { status: 400, data: { detail: "Missing required column(s): type.", code: "missing_columns" } };
    throw error;
  };
  await click(button("Preview"));
  await waitFor(() => assert.equal(hasText("Missing required column(s): type."), true));
});

test("nothing to import disables the confirm button", async () => {
  previewResponse = async () => ({
    data: previewPayload(OPEN_EVENT, {
      summary: { total: 1, create_account: 0, existing_account: 0, register: 0, accept_application: 0, skip: 1, error: 0 },
      rows: [previewRow({ action: "skip", account: "existing", reason: "already_registered" })],
    }),
  });
  await renderDialog(OPEN_EVENT);
  await selectFile(fileInput(), csvFile());
  await click(button("Preview"));
  await waitFor(() => assert.equal(Boolean(button("Import 0 people")), true));
  assert.equal(button("Import 0 people").disabled, true);
});
