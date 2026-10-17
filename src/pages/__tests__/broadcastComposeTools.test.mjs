import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

import {
  React,
  act,
  all,
  cleanup,
  click,
  getByRole,
  loadSource,
  queryByRole,
  queryByText,
  renderRoutes,
  router,
  typeInto,
  waitFor,
} from "./helpers/blogDomHarness.mjs";

const { default: AdminNewsletterPage, applyTemplateContentToDraft } = await loadSource("src/pages/AdminNewsletterPage.jsx");
const { default: EmailPreviewFrame, highlightTokensForPreview } = await loadSource(
  "src/components/marketing/EmailPreviewFrame.jsx"
);
const { Route } = router;
const h = React.createElement;

// Assertions compare strings/booleans only: a failing assert on a live jsdom
// node serializes the whole DOM graph and exhausts memory.

const DRAFT = {
  uuid: "33333333-3333-4333-8333-333333333333",
  name: "October Newsletter",
  subject: "",
  preview_text: "",
  from_name: "IMAA Connect",
  from_email: "newsletter@example.test",
  html_content: "<p>Old draft body</p>",
  plain_text: "Old draft body",
  status: "draft",
  audiences: [{ slug: "imaa-events", name: "IMAA Events" }],
  scheduled_at: null,
  schedule_owner: "",
  send_started_at: null,
  sent_at: null,
  mautic_email_id: "",
  last_synced_to_mautic_at: null,
  last_error: "",
  created_at: "2026-10-16T10:00:00Z",
  updated_at: "2026-10-16T10:00:00Z",
};
const SENT = { ...DRAFT, uuid: "44444444-4444-4444-8444-444444444444", status: "sent", sent_at: "2026-10-16T11:00:00Z" };

const TEMPLATE = {
  id: "18",
  name: "Monthly Deals Template",
  subject: "Deals this month",
  preheaderText: "Top transactions",
  fromName: "IMAA Connect",
  fromAddress: "template@example.test",
  plainText: "Hello {contactfield=firstname}",
  customHtml: '<p>Hello {contactfield=firstname}</p><a href="{unsubscribe_url}">Unsubscribe</a>',
  emailType: "template",
  category: null,
  template: "",
  isPublished: true,
};
const TOKENS = [
  { token: "{unsubscribe_url}", label: "Unsubscribe URL", group: "Email" },
  { token: "{contactfield=firstname}", label: "First Name", group: "Contact Fields" },
];

let calls;

function installApi({ templateDetail = TEMPLATE } = {}) {
  calls = [];
  const byUuid = { [DRAFT.uuid]: DRAFT, [SENT.uuid]: SENT };
  const record = (method) => async (url, payload) => {
    calls.push({ method, url, payload });
    throw new Error(`unexpected ${method} ${url}`);
  };
  globalThis.__testApiClient = {
    get: async (url, config) => {
      calls.push({ method: "get", url, params: config?.params });
      if (url === "/newsletter/admin/categories/") return { data: [{ slug: "imaa-events", name: "IMAA Events", is_active: true }] };
      if (url === "/newsletter/admin/templates/tokens/") return { data: { results: TOKENS } };
      if (url === "/newsletter/admin/templates/") return { data: { count: 1, results: [TEMPLATE] } };
      if (url === `/newsletter/admin/templates/${TEMPLATE.id}/`) return { data: templateDetail };
      if (url.endsWith("/analytics/")) return { data: {} };
      const match = url.match(/^\/newsletter\/admin\/campaigns\/([^/]+)\/$/);
      if (match && byUuid[match[1]]) return { data: byUuid[match[1]] };
      return { data: {} };
    },
    post: record("post"),
    patch: record("patch"),
    put: record("put"),
    delete: record("delete"),
  };
}

async function openContentStep(uuid = DRAFT.uuid) {
  await renderRoutes(h(Route, { path: "/admin/newsletter/:campaignId", element: h(AdminNewsletterPage) }), {
    url: `/admin/newsletter/${uuid}`,
  });
  await waitFor(() => getByRole("tab", "Content"));
  await click(getByRole("tab", "Content"));
  return waitFor(() => getByRole("textbox", "HTML Content"));
}

const htmlValue = () => getByRole("textbox", "HTML Content").value;
const hasText = (matcher) => queryByText(matcher) !== null;
const writes = () => calls.filter((call) => call.method !== "get");

beforeEach(() => installApi());
afterEach(cleanup);

// --------------------------------------------------------------- helpers --

test("template content replaces the body but never overwrites the draft's own subject or preview text", () => {
  const content = {
    html_content: "<p>T</p>",
    plain_text: "T",
    subject: "Template subject",
    preview_text: "Template preheader",
    templateName: "T",
  };
  const empty = applyTemplateContentToDraft({ ...DRAFT, subject: " ", preview_text: "" }, content);
  assert.equal(empty.html_content, "<p>T</p>");
  assert.equal(empty.plain_text, "T");
  assert.equal(empty.subject, "Template subject");
  assert.equal(empty.preview_text, "Template preheader");

  const filled = applyTemplateContentToDraft({ ...DRAFT, subject: "Mine", preview_text: "My preheader" }, content);
  assert.equal(filled.subject, "Mine");
  assert.equal(filled.preview_text, "My preheader");
  assert.equal(filled.from_email, DRAFT.from_email);
  assert.equal(filled.name, DRAFT.name);
});

test("token highlighting marks visible tokens only and never touches links", () => {
  const html = '<p>Hi {contactfield=firstname}!</p><a href="{unsubscribe_url}">Unsubscribe</a><style>p{color:red}</style>';
  const preview = highlightTokensForPreview(html);
  assert.match(preview, /<mark data-preview-token=""[^>]*>\{contactfield=firstname\}<\/mark>/);
  assert.match(preview, /href="\{unsubscribe_url\}"/);
  assert.equal((preview.match(/data-preview-token/g) || []).length, 1);
  assert.equal(highlightTokensForPreview(""), "");
});

test("preview frame shows the exact HTML by default and switches width and highlighting on request", async () => {
  const html = "<p>Hi {contactfield=firstname}</p>";
  await renderRoutes(h(Route, { path: "/", element: h(EmailPreviewFrame, { title: "Email preview", html }) }));
  const frame = () => document.querySelector("iframe[title='Email preview']");
  assert.equal(frame().getAttribute("srcdoc"), html);
  assert.equal(frame().getAttribute("sandbox"), "");
  assert.equal(frame().getAttribute("data-viewport"), "desktop");

  await click(getByRole("button", "Mobile preview"));
  assert.equal(frame().getAttribute("data-viewport"), "mobile");

  await click(document.querySelector("input[type='checkbox']"));
  assert.match(frame().getAttribute("srcdoc"), /<mark data-preview-token/);
});

// ------------------------------------------------------- broadcast editor --

test("Start from Template copies a Template into the draft without writing to Mautic", async () => {
  await openContentStep();
  assert.equal(htmlValue(), DRAFT.html_content);

  await click(getByRole("button", "Start from Template"));
  await waitFor(() => getByRole("button", /Monthly Deals Template/));
  await click(getByRole("button", /Monthly Deals Template/));
  await waitFor(() => getByRole("button", "Copy into Draft"));
  assert.equal(hasText(/will be replaced/), true);
  await click(getByRole("button", "Copy into Draft"));

  await waitFor(() => assert.equal(htmlValue(), TEMPLATE.customHtml));
  assert.equal(getByRole("textbox", "Plain Text Fallback").value, TEMPLATE.plainText);
  assert.equal(hasText(/Copied from Template "Monthly Deals Template"/), true);
  // Read-only towards Mautic and ECP: nothing saved until the admin saves the draft.
  assert.deepEqual(writes(), []);
  assert.equal(calls.some((call) => call.url === `/newsletter/admin/templates/${TEMPLATE.id}/`), true);

  // The copied subject/preheader fill the draft's empty fields.
  await click(getByRole("tab", "Info"));
  await waitFor(() => assert.equal(getByRole("textbox", "Subject").value, "Deals this month"));
  assert.equal(getByRole("textbox", "Preview Text").value, "Top transactions");
});

test("a Template without HTML cannot be copied", async () => {
  installApi({ templateDetail: { ...TEMPLATE, customHtml: "  " } });
  await openContentStep();
  await click(getByRole("button", "Start from Template"));
  await waitFor(() => getByRole("button", /Monthly Deals Template/));
  await click(getByRole("button", /Monthly Deals Template/));
  await waitFor(() => assert.equal(hasText("This Template has no HTML content to copy."), true));
  assert.equal(queryByRole("button", "Copy into Draft") === null, true);
  assert.equal(htmlValue(), DRAFT.html_content);
});

test("Insert Token puts the chosen Mautic token at the cursor of the focused field", async () => {
  await openContentStep();
  const textarea = getByRole("textbox", "HTML Content");
  await typeInto(textarea, "<p>Hello !</p>");
  await act(async () => {
    textarea.focus();
    textarea.setSelectionRange(9, 9);
  });

  await click(getByRole("button", "Insert Token"));
  await waitFor(() => getByRole("button", "First Name"));
  await click(getByRole("button", "First Name"));
  await waitFor(() => assert.equal(htmlValue(), "<p>Hello {contactfield=firstname}!</p>"));
  assert.deepEqual(writes(), []);
});

test("field tokens Mautic does not know are flagged before saving", async () => {
  await openContentStep();
  await typeInto(getByRole("textbox", "HTML Content"), "<p>{contactfield=nickname} {contactfield=firstname}</p>");
  await waitFor(() => assert.equal(hasText(/will send them as empty text: \{contactfield=nickname\}$/), true));
});

test("non-draft broadcasts offer no content tools", async () => {
  await openContentStep(SENT.uuid);
  assert.equal(queryByRole("button", "Start from Template") === null, true);
  assert.equal(queryByRole("button", "Insert Token") === null, true);
  assert.equal(getByRole("textbox", "HTML Content").readOnly, true);
  // Read-only views do not even load the token list.
  assert.equal(calls.some((call) => call.url === "/newsletter/admin/templates/tokens/"), false);
  assert.equal(all("textarea").length > 0, true);
});
