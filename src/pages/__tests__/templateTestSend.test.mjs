import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { act, cleanup, click, getByRole, loadSource, queryByText, typeInto, waitFor } from "./helpers/blogDomHarness.mjs";
import { installTemplatesApi, makeTemplate, renderTemplatePages } from "./helpers/templatePagesHarness.mjs";

const { templateTestSendBlocker } = await loadSource("src/pages/AdminNewsletterTemplatesPanel.jsx");

// Test Send lives inline on the Template Details page. Assertions compare
// booleans/strings only: a failing assert on a jsdom node exhausts memory.

const deferred = () => {
  let resolve;
  const promise = new Promise((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

const panel = () => {
  const section = document.querySelector("section[aria-label='Send Test Email']");
  if (!section) throw new Error("Send Test Email panel not rendered yet");
  return section;
};
const input = () => panel().querySelector("input[type='email']");
const sendButton = () => getByRole("button", "Send Test", { scope: panel() });

let api;
async function openDetails({ template = makeTemplate(), onTestSend } = {}) {
  api = installTemplatesApi({
    templates: [template],
    handlers: onTestSend ? { [`post /newsletter/admin/templates/${template.id}/test-send/`]: onTestSend } : {},
  });
  await renderTemplatePages(`/admin/newsletter/templates/${template.id}`);
  await waitFor(() => panel());
}
const testSends = () => api.writes("post").filter((c) => c.url.endsWith("/test-send/"));

afterEach(async () => {
  await cleanup();
  delete globalThis.__testApiClient;
});

test("the panel names the Template and nothing is sent on page load", async () => {
  await openDetails();
  assert.match(panel().textContent, /Reusable Newsletter/);
  assert.match(panel().textContent, /temporary copy/);
  assert.equal(sendButton().disabled, true, "nothing to send until an address is typed");
  assert.equal(testSends().length, 0);
});

test("a Template that cannot be sent explains why and disables sending", async () => {
  await openDetails({ template: makeTemplate({ subject: " " }) });
  assert.match(panel().textContent, /Add a subject before sending a test email/);
  assert.equal(input().disabled, true);
  assert.equal(sendButton().disabled, true);

  assert.equal(templateTestSendBlocker(makeTemplate()), "");
  assert.match(templateTestSendBlocker(makeTemplate({ customHtml: " ", plainText: "" })), /content/);
});

test("an invalid email is rejected without a request", async () => {
  await openDetails();
  await typeInto(input(), "not-an-email");
  assert.match(panel().textContent, /Enter a valid email address/);
  assert.equal(sendButton().disabled, true);
  await click(sendButton());
  assert.equal(testSends().length, 0);
});

test("a valid email posts the trimmed address to the Template's test-send endpoint", async () => {
  await openDetails({ onTestSend: async () => ({ data: { success: true, recipient_email: "qa@example.test" } }) });
  await typeInto(input(), "  qa@example.test  ");
  await click(sendButton());
  await waitFor(() => assert.equal(testSends().length, 1));
  assert.deepEqual(
    { url: testSends()[0].url, payload: testSends()[0].payload },
    { url: "/newsletter/admin/templates/18/test-send/", payload: { email: "qa@example.test" } }
  );
});

test("while sending, the panel shows progress and blocks a second submission", async () => {
  const pending = deferred();
  await openDetails({ onTestSend: () => pending.promise });
  await typeInto(input(), "qa@example.test");

  const button = sendButton();
  // Two clicks in the same tick, before React can re-render the disabled state.
  await act(async () => {
    button.click();
    button.click();
  });
  await waitFor(() => assert.equal(panel().querySelector("[role='progressbar']") !== null, true));
  assert.equal(button.disabled, true);
  assert.equal(input().disabled, true);
  await click(button);
  assert.equal(testSends().length, 1, "exactly one request is sent");

  await act(async () => {
    pending.resolve({ data: { success: true, recipient_email: "qa@example.test" } });
  });
  await waitFor(() => assert.equal(queryByText("Test email sent to qa@example.test.") !== null, true));
});

test("a backend error is shown and the address is kept for a retry", async () => {
  await openDetails({
    onTestSend: async () => {
      throw Object.assign(new Error("Request failed with status code 502"), {
        response: { status: 502, data: { detail: "Mautic rejected the test email." } },
      });
    },
  });
  await typeInto(input(), "qa@example.test");
  await click(sendButton());
  await waitFor(() => assert.match(panel().textContent, /Mautic rejected the test email\./));
  assert.equal(input().value, "qa@example.test");
  assert.equal(sendButton().disabled, false, "the user can retry");
});

test("a network error gets its own message", async () => {
  await openDetails({
    onTestSend: async () => {
      throw new Error("Network Error");
    },
  });
  await typeInto(input(), "qa@example.test");
  await click(sendButton());
  await waitFor(() => assert.match(panel().textContent, /could not reach the server/));
});

test("the list's Test Send action lands on this panel", async () => {
  await openDetails();
  await cleanup();
  installTemplatesApi();
  const view = await renderTemplatePages("/admin/newsletter/templates/18?testSend=1");
  await waitFor(() => panel());
  assert.equal(view.path(), "/admin/newsletter/templates/18?testSend=1");
  await waitFor(() => assert.equal(document.activeElement === input(), true));
});
