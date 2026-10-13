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
  queryByText,
  renderRoutes,
  router,
  typeInto,
  waitFor,
} from "./helpers/blogDomHarness.mjs";

const { default: AuthModal } = await loadSource("src/components/AuthModal.jsx");
const { default: GuestRegistrationModal } = await loadSource("src/components/GuestRegistrationModal.jsx");
const { Route } = router;
const h = React.createElement;

// Assertions only compare strings/booleans/numbers (a failing assert on a jsdom
// node pretty-prints the whole DOM).

const DISPOSABLE = "Temporary or disposable email addresses are not supported. Please use your regular email address.";
const CHECK_FAILED = "We couldn't verify your email address right now. Please try again.";
const VALIDATE_URL = "http://localhost/api/auth/validate-signup-email/";

// The modal's check results are cached per address for the page's lifetime, so
// every test uses its own addresses.
let seq = 0;
const uniqueEmail = (domain) => `member${(seq += 1)}-${Date.now()}@${domain}`;

let requests;
let validateHandler;

const json = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

function installFakes() {
  requests = [];
  validateHandler = async (email) =>
    email.endsWith("@mailinator.com")
      ? json(200, { allowed: false, code: "disposable_email_domain", message: DISPOSABLE })
      : json(200, { allowed: true, code: "allowed", message: "" });
  globalThis.fetch = async (url, init = {}) => {
    const body = init.body ? JSON.parse(init.body) : null;
    requests.push({ url: String(url), method: init.method || "GET", body });
    if (String(url) === VALIDATE_URL) return validateHandler(body.email);
    if (String(url).includes("/auth/check-email/")) return json(200, { exists: false });
    throw new Error(`unexpected fetch ${url}`);
  };
  globalThis.__cognitoTestAuth = {
    calls: [],
    signUp: async () => ({ userSub: "sub-1" }),
    confirmSignUp: async () => "SUCCESS",
  };
}

const validateCalls = () => requests.filter((r) => r.url === VALIDATE_URL);
const checkEmailCalls = () => requests.filter((r) => r.url.includes("/auth/check-email/"));
const cognitoCalls = (name) => globalThis.__cognitoTestAuth.calls.filter((c) => c.name === name);

beforeEach(() => {
  window.localStorage.clear();
  installFakes();
});
afterEach(cleanup);

// ------------------------------------------------------------- AuthModal --
async function renderSignupModal() {
  await renderRoutes([h(Route, { key: "s", path: "/signup", element: h(AuthModal, { open: true, initialMode: "signup", onClose() {} }) })], {
    url: "/signup",
  });
  const inputs = all("[role='dialog'] input");
  return {
    firstName: inputs[0],
    lastName: inputs[1],
    email: all("[role='dialog'] input[type='email']")[0],
    password: all("[role='dialog'] input[type='password']")[0],
    confirm: all("[role='dialog'] input[type='password']")[1],
  };
}

async function fillSignup(fields, { email, password = "Str0ng!Pass" }) {
  await typeInto(fields.firstName, "Ada");
  await typeInto(fields.lastName, "Member");
  await typeInto(fields.email, email);
  await typeInto(fields.password, password);
  await typeInto(fields.confirm, password);
}

const submitSignup = () => click(getByRole("button", "Create account"));
const isConfirmStep = () => Boolean(queryByText("Verify your email"));

test("valid signup checks the domain, then continues to Cognito and the OTP step", async () => {
  const fields = await renderSignupModal();
  const email = uniqueEmail("company-example.com");
  await fillSignup(fields, { email });
  await submitSignup();

  await waitFor(() => assert.equal(isConfirmStep(), true));
  assert.equal(validateCalls().length, 1);
  assert.equal(validateCalls()[0].body.email, email);
  assert.equal(checkEmailCalls().length, 1);
  assert.equal(cognitoCalls("signUp").length, 1);
  assert.equal(cognitoCalls("signUp")[0].args.email, email);
});

test("disposable domain shows the inline error and never calls Cognito", async () => {
  const fields = await renderSignupModal();
  await fillSignup(fields, { email: uniqueEmail("mailinator.com") });
  await submitSignup();

  await waitFor(() => assert.equal(Boolean(queryByText(DISPOSABLE)), true));
  assert.equal(fields.email.getAttribute("aria-invalid"), "true");
  assert.equal(cognitoCalls("signUp").length, 0);
  assert.equal(checkEmailCalls().length, 0);
  assert.equal(isConfirmStep(), false);
});

test("leaving the email field shows the disposable error early", async () => {
  const fields = await renderSignupModal();
  await typeInto(fields.email, uniqueEmail("mailinator.com"));
  await act(async () => {
    fields.email.dispatchEvent(new window.FocusEvent("focusout", { bubbles: true }));
  });
  await waitFor(() => assert.equal(Boolean(queryByText(DISPOSABLE)), true));
  assert.equal(cognitoCalls("signUp").length, 0);
});

test("changing the email clears the error and the new address is checked", async () => {
  const fields = await renderSignupModal();
  await fillSignup(fields, { email: uniqueEmail("mailinator.com") });
  await submitSignup();
  await waitFor(() => assert.equal(Boolean(queryByText(DISPOSABLE)), true));

  const replacement = uniqueEmail("company-example.com");
  await typeInto(fields.email, replacement);
  assert.equal(Boolean(queryByText(DISPOSABLE)), false);

  await submitSignup();
  await waitFor(() => assert.equal(isConfirmStep(), true));
  assert.equal(validateCalls().at(-1).body.email, replacement);
  assert.equal(cognitoCalls("signUp").length, 1);
});

test("a failed check stops signup with a retry message instead of bypassing it", async () => {
  validateHandler = async () => {
    throw new TypeError("Failed to fetch");
  };
  const fields = await renderSignupModal();
  await fillSignup(fields, { email: uniqueEmail("company-example.com") });
  await submitSignup();

  await waitFor(() => assert.equal(Boolean(queryByText(CHECK_FAILED)), true));
  assert.equal(cognitoCalls("signUp").length, 0);
  assert.equal(isConfirmStep(), false);
  assert.equal(getByRole("button", "Create account").disabled, false);
});

test("existing email and password validation still run first, without API calls", async () => {
  const fields = await renderSignupModal();
  await fillSignup(fields, { email: "not-an-email" });
  await submitSignup();
  assert.equal(Boolean(queryByText("Enter a valid email address")), true);

  await typeInto(fields.email, uniqueEmail("company-example.com"));
  await typeInto(fields.password, "weak");
  await typeInto(fields.confirm, "weak");
  await submitSignup();
  assert.equal(all("[role='dialog'] .Mui-error").length > 0, true);
  assert.equal(Boolean(queryByText("Min 8 chars, 1 uppercase, 1 number, 1 special")), true);

  assert.equal(validateCalls().filter((r) => r.body.email === "not-an-email").length, 0);
  assert.equal(cognitoCalls("signUp").length, 0);
});

test("loading state blocks duplicate submissions while the check is pending", async () => {
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  validateHandler = async () => {
    await gate;
    return json(200, { allowed: true, code: "allowed", message: "" });
  };
  const fields = await renderSignupModal();
  await fillSignup(fields, { email: uniqueEmail("company-example.com") });
  const form = fields.email.closest("form");
  const button = form.querySelector("button[type='submit']");

  await click(button);
  assert.equal(button.disabled, true);
  assert.equal(form.querySelectorAll(".MuiCircularProgress-root").length, 1);
  // A second submit (e.g. Enter key) while the first is running is ignored.
  await act(async () => {
    form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
  });

  release();
  await waitFor(() => assert.equal(isConfirmStep(), true));
  assert.equal(validateCalls().length, 1);
  assert.equal(cognitoCalls("signUp").length, 1);
});

test("a Cognito Pre Sign-up rejection shows the same inline message", async () => {
  globalThis.__cognitoTestAuth.signUp = async () => {
    const error = new Error(`PreSignUp failed with error ${DISPOSABLE}.`);
    error.code = "UserLambdaValidationException";
    throw error;
  };
  const fields = await renderSignupModal();
  await fillSignup(fields, { email: uniqueEmail("company-example.com") });
  await submitSignup();

  await waitFor(() => assert.equal(Boolean(queryByText(DISPOSABLE)), true));
  assert.equal(isConfirmStep(), false);
});

test("OTP verification after an accepted signup is unchanged", async () => {
  const fields = await renderSignupModal();
  await fillSignup(fields, { email: uniqueEmail("company-example.com") });
  await submitSignup();
  await waitFor(() => assert.equal(isConfirmStep(), true));
  const pendingUsername = cognitoCalls("signUp")[0].args.username;

  await typeInto(all("[role='dialog'] input")[0], "123456");
  await click(getByRole("button", "Verify & continue"));

  await waitFor(() => assert.equal(cognitoCalls("confirmSignUp").length, 1));
  assert.deepEqual(cognitoCalls("confirmSignUp")[0].args, { username: pendingUsername, code: "123456" });
  assert.equal(validateCalls().length, 1);
});

// ------------------------------------------------- GuestRegistrationModal --
async function renderGuestModal(email) {
  window.localStorage.setItem("guest_email", email);
  window.localStorage.setItem("guest_name", "Ada Guest");
  await renderRoutes([h(Route, { key: "g", path: "/live/1", element: h(GuestRegistrationModal, { open: true, onClose() {} }) })], {
    url: "/live/1",
  });
  const passwords = all("[role='dialog'] input[type='password']");
  await typeInto(passwords[0], "Str0ng!Pass");
  await typeInto(passwords[1], "Str0ng!Pass");
}

const createGuestAccount = () => click(getByRole("button", "Create Your Account"));

test("guest conversion rejects a disposable email before Cognito", async () => {
  await renderGuestModal(uniqueEmail("mailinator.com"));
  await createGuestAccount();

  await waitFor(() => assert.equal(Boolean(queryByText(DISPOSABLE)), true));
  assert.equal(cognitoCalls("signUp").length, 0);
});

test("guest conversion with a regular email continues to verification", async () => {
  const email = uniqueEmail("company-example.com");
  await renderGuestModal(email);
  await createGuestAccount();

  await waitFor(() => assert.equal(Boolean(getByRole("button", "Verify Code")), true));
  assert.equal(validateCalls().length, 1);
  assert.equal(cognitoCalls("signUp")[0].args.email, email);
});

test("guest conversion does not bypass a failed check", async () => {
  validateHandler = async () => json(503, { detail: "unavailable" });
  await renderGuestModal(uniqueEmail("company-example.com"));
  await createGuestAccount();

  await waitFor(() => assert.equal(Boolean(queryByText(CHECK_FAILED)), true));
  assert.equal(cognitoCalls("signUp").length, 0);
});
