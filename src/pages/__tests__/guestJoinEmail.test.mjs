import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import {
  React,
  cleanup,
  click,
  getByRole,
  loadSource,
  queryByRole,
  renderRoutes,
  router,
  typeInto,
  waitFor,
} from "./helpers/blogDomHarness.mjs";

const { default: GuestJoinModal } = await loadSource("src/components/GuestJoinModal.jsx");
const { Route } = router;
const h = React.createElement;

const EVENT_ID = 811;
const DISPOSABLE_MESSAGE =
  "Temporary or disposable email addresses are not supported. Please use your regular email address.";
const realFetch = globalThis.fetch;

let calls;

/** Mocks the email preflight and guest-join. Nothing leaves the process. */
function installFetch({ disposable = ["mailinator.com"], onJoin } = {}) {
  calls = [];
  globalThis.fetch = async (url, init = {}) => {
    const body = init.body ? JSON.parse(init.body) : null;
    calls.push({ url: String(url), body });
    if (String(url).endsWith("/auth/validate-signup-email/")) {
      const blocked = disposable.includes(body.email.split("@")[1]);
      return new Response(
        JSON.stringify(blocked
          ? { allowed: false, code: "disposable_email_domain", message: DISPOSABLE_MESSAGE }
          : { allowed: true, code: "allowed", message: "" }),
        { status: 200 }
      );
    }
    if (String(url).endsWith(`/events/${EVENT_ID}/guest-join/`)) {
      return onJoin ? onJoin(body) : new Response(JSON.stringify({ otp_required: true }), { status: 200 });
    }
    throw new Error(`unexpected fetch ${url}`);
  };
}

const joinCalls = () => calls.filter((c) => c.url.endsWith("/guest-join/"));
const checkCalls = () => calls.filter((c) => c.url.endsWith("/auth/validate-signup-email/"));
const emailInput = () => document.querySelector("input[type='email']");
const submit = () => click(getByRole("button", /^(Send Verification Code|Continue as Guest)/));

async function renderModal(email) {
  await renderRoutes(
    h(Route, { path: "/", element: h(GuestJoinModal, { open: true, onClose: () => {}, event: { id: EVENT_ID } }) })
  );
  await typeInto(getByRole("textbox", /^First Name/), "Rahul");
  await typeInto(getByRole("textbox", /^Last Name/), "Sharma");
  await typeInto(emailInput(), email);
}

afterEach(async () => {
  await cleanup();
  globalThis.fetch = realFetch;
  try { localStorage.clear(); } catch { /* not available */ }
});

test("disposable email shows the field message and never requests a code", async () => {
  installFetch();
  await renderModal("guest@mailinator.com");
  await submit();

  await waitFor(() => assert.equal(emailInput().getAttribute("aria-invalid"), "true"));
  assert.match(document.body.textContent, /Temporary or disposable email addresses are not supported/);
  assert.equal(joinCalls().length, 0);
});

test("malformed email is caught before any request", async () => {
  installFetch();
  await renderModal("guest@example");
  await submit();

  await waitFor(() => assert.equal(emailInput().getAttribute("aria-invalid"), "true"));
  assert.match(document.body.textContent, /Please enter a valid email address/);
  assert.equal(calls.length, 0);
});

test("regular email continues to guest-join with the normalized address", async () => {
  installFetch();
  await renderModal(" Guest@Example.com ");
  assert.equal(emailInput().value, "Guest@Example.com", "spaces are removed while typing");
  await submit();

  await waitFor(() => assert.equal(joinCalls().length, 1));
  assert.equal(joinCalls()[0].body.email, "guest@example.com");
  assert.equal(checkCalls().length >= 1, true);
});

test("backend disposable refusal shows the field message", async () => {
  installFetch({
    disposable: [],
    onJoin: async () =>
      new Response(JSON.stringify({ error: DISPOSABLE_MESSAGE, code: "disposable_email_domain" }), { status: 400 }),
  });
  await renderModal("guest@new-throwaway.example");
  await submit();

  await waitFor(() => assert.equal(emailInput().getAttribute("aria-invalid"), "true"));
  assert.equal(queryByRole("alert"), null, "shown under the field, not as a banner");
});

test("a failed email check blocks the join instead of allowing it", async () => {
  installFetch();
  globalThis.fetch = async () => { throw new Error("offline"); };
  await renderModal("offline@example.com");
  await submit();

  await waitFor(() => assert.match(queryByRole("alert")?.textContent || "", /couldn't verify your email address/));
});
