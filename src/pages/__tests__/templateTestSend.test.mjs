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

const { default: AdminNewsletterTemplatesPanel, templateTestSendBlocker } = await loadSource(
  "src/pages/AdminNewsletterTemplatesPanel.jsx"
);
const { Route } = router;
const h = React.createElement;

const TEMPLATE = {
  id: "18",
  name: "Reusable Newsletter",
  subject: "Monthly update",
  preheaderText: "",
  fromName: "IMAA Connect",
  fromAddress: "eventncommunity@gmail.com",
  plainText: "Plain content",
  customHtml: "<h1>HTML content</h1>",
  emailType: "template",
  category: null,
  template: "",
  isPublished: false,
  sentCount: 0,
  readCount: 0,
};

let posts;

/** Answers the panel's own reads; POSTs go to `onPost`. Nothing leaves the process. */
function installApi({ templates = [TEMPLATE], onPost = async () => ({ data: {} }) } = {}) {
  posts = [];
  globalThis.__testApiClient = {
    get: async (url) => {
      if (url === "/newsletter/admin/templates/") {
        return { data: { count: templates.length, page: 1, page_size: 25, num_pages: 1, results: templates } };
      }
      return { data: { count: 0, results: [] } };
    },
    post: async (url, payload) => {
      posts.push({ url, payload });
      return onPost(url, payload);
    },
  };
}

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const testSendButtons = () => all("button[aria-label='Send test email']");

async function renderPanel() {
  await renderRoutes([h(Route, { key: "t", path: "*", element: h(AdminNewsletterTemplatesPanel) })]);
  await waitFor(() => assert.equal(testSendButtons().length >= 1, true));
}

async function openDialog(index = 0) {
  await click(testSendButtons()[index]);
  const dialog = await waitFor(() => getByRole("dialog"));
  const input = dialog.querySelector("input[type='email']");
  assert.ok(input, "the dialog asks for a recipient email");
  return { dialog, input };
}

// Assertions only ever compare booleans: a failing assert on a live jsdom node
// makes Node pretty-print the whole circular DOM graph and exhaust memory.
const dialogOpen = () => queryByRole("dialog") !== null;

const sendButton = (dialog) => getByRole("button", "Send Test", { scope: dialog });

beforeEach(() => installApi());
afterEach(async () => {
  await cleanup();
  delete globalThis.__testApiClient;
});

test("Test Send is enabled for a template with a subject and content", async () => {
  await renderPanel();
  const [button] = testSendButtons();
  assert.equal(button.disabled, false);
  assert.equal(queryByText(/requires a verified Mautic test-send bridge/) === null, true);
});

test("Test Send is disabled, with a reason, for a template that cannot be sent", async () => {
  installApi({
    templates: [TEMPLATE, { ...TEMPLATE, id: "19", name: "No subject", subject: "" }],
  });
  await renderPanel();
  const [complete, incomplete] = testSendButtons();
  assert.equal(complete.disabled, false);
  assert.equal(incomplete.disabled, true);

  assert.equal(templateTestSendBlocker(TEMPLATE), "");
  assert.match(templateTestSendBlocker({ ...TEMPLATE, subject: " " }), /subject/);
  assert.match(
    templateTestSendBlocker({ ...TEMPLATE, customHtml: " ", plainText: "" }),
    /content/
  );
});

test("the dialog opens with the template name and a recipient field", async () => {
  await renderPanel();
  const { dialog } = await openDialog();
  assert.match(dialog.textContent, /Reusable Newsletter/);
  assert.match(dialog.textContent, /temporary copy/);
  assert.equal(sendButton(dialog).disabled, true, "nothing to send until an address is typed");
});

test("an invalid email is rejected without a request", async () => {
  await renderPanel();
  const { dialog, input } = await openDialog();

  await typeInto(input, "not-an-email");

  assert.match(dialog.textContent, /Enter a valid email address/);
  assert.equal(sendButton(dialog).disabled, true);
  await click(sendButton(dialog));
  assert.equal(posts.length, 0);
});

test("a valid email posts the trimmed address to the template's test-send endpoint", async () => {
  installApi({
    onPost: async () => ({ data: { success: true, recipient_email: "qa@example.test" } }),
  });
  await renderPanel();
  const { dialog, input } = await openDialog();

  await typeInto(input, "  qa@example.test  ");
  await click(sendButton(dialog));

  await waitFor(() => assert.equal(posts.length, 1));
  assert.deepEqual(posts[0], {
    url: "/newsletter/admin/templates/18/test-send/",
    payload: { email: "qa@example.test" },
  });
});

test("while sending, the dialog shows progress and blocks a second submission", async () => {
  const pending = deferred();
  installApi({ onPost: () => pending.promise });
  await renderPanel();
  const { dialog, input } = await openDialog();
  await typeInto(input, "qa@example.test");

  const button = sendButton(dialog);
  // Two clicks in the same tick, before React can re-render the disabled state.
  await act(async () => {
    button.click();
    button.click();
  });

  await waitFor(() => assert.equal(dialog.querySelector("[role='progressbar']") !== null, true));
  assert.equal(button.disabled, true);
  assert.equal(getByRole("button", "Cancel", { scope: dialog }).disabled, true);
  assert.equal(input.disabled, true);
  await click(button);
  assert.equal(posts.length, 1, "exactly one request is sent");

  await act(async () => {
    pending.resolve({ data: { success: true, recipient_email: "qa@example.test" } });
  });
  await waitFor(() => assert.equal(dialogOpen(), false, "dialog closed"));
});

test("success closes the dialog and confirms the recipient", async () => {
  installApi({
    onPost: async () => ({ data: { success: true, recipient_email: "qa@example.test" } }),
  });
  await renderPanel();
  const { dialog, input } = await openDialog();
  await typeInto(input, "qa@example.test");
  await click(sendButton(dialog));

  await waitFor(() => assert.equal(dialogOpen(), false, "dialog closed"));
  await waitFor(() => assert.equal(queryByText("Test email sent to qa@example.test.") !== null, true));
});

test("a backend error is shown in the dialog and the address is kept for a retry", async () => {
  installApi({
    onPost: async () => {
      const error = new Error("Request failed with status code 502");
      error.response = { status: 502, data: { detail: "Mautic rejected the test email." } };
      throw error;
    },
  });
  await renderPanel();
  const { dialog, input } = await openDialog();
  await typeInto(input, "qa@example.test");
  await click(sendButton(dialog));

  await waitFor(() => assert.match(dialog.textContent, /Mautic rejected the test email\./));
  assert.equal(dialogOpen(), true, "the dialog stays open");
  assert.equal(input.value, "qa@example.test");
  assert.equal(sendButton(dialog).disabled, false, "the user can retry");
});

test("a network error gets its own message", async () => {
  installApi({
    onPost: async () => {
      throw new Error("Network Error");
    },
  });
  await renderPanel();
  const { dialog, input } = await openDialog();
  await typeInto(input, "qa@example.test");
  await click(sendButton(dialog));

  await waitFor(() => assert.match(dialog.textContent, /could not reach the server/));
});

test("Cancel closes the dialog without sending", async () => {
  await renderPanel();
  const { dialog, input } = await openDialog();
  await typeInto(input, "qa@example.test");
  await click(getByRole("button", "Cancel", { scope: dialog }));

  await waitFor(() => assert.equal(dialogOpen(), false, "dialog closed"));
  assert.equal(posts.length, 0);
});
