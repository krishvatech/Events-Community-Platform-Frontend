import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";

import {
  DISPOSABLE_EMAIL_MESSAGE,
  SIGNUP_EMAIL_CHECK_FAILED_MESSAGE,
  SIGNUP_EMAIL_CHECK_THROTTLED_MESSAGE,
  checkParticipantEmail,
  checkSignupEmail,
  clearSignupEmailCheckCache,
  getEmailRuleErrorMessage,
  isDisposableEmailSignupError,
  isEmailFormatValid,
} from "./signupEmailCheck.js";

const API = "http://api.test/api";

const jsonResponse = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

function fakeFetch(handler) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body), method: init.method });
    return handler(url, init);
  };
  return { calls, fetchImpl };
}

beforeEach(() => clearSignupEmailCheckCache());

test("allowed email posts the normalized address to the preflight endpoint", async () => {
  const { calls, fetchImpl } = fakeFetch(() => jsonResponse(200, { allowed: true, code: "allowed", message: "" }));
  const result = await checkSignupEmail(API, "  John@Gmail.com ", { fetchImpl });
  assert.deepEqual(result, { status: "allowed" });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, `${API}/auth/validate-signup-email/`);
  assert.equal(calls[0].method, "POST");
  assert.deepEqual(calls[0].body, { email: "john@gmail.com" });
});

test("disposable domain is blocked with the client-approved message", async () => {
  const { fetchImpl } = fakeFetch(() =>
    jsonResponse(200, { allowed: false, code: "disposable_email_domain", message: "server text" })
  );
  const result = await checkSignupEmail(API, "x@mailinator.com", { fetchImpl });
  assert.equal(result.status, "blocked");
  assert.equal(
    result.message,
    "Temporary or disposable email addresses are not supported. Please use your regular email address."
  );
});

test("backend-rejected format is reported as invalid", async () => {
  const { fetchImpl } = fakeFetch(() => jsonResponse(400, { allowed: false, code: "invalid_email" }));
  assert.equal((await checkSignupEmail(API, "x@bad", { fetchImpl })).status, "invalid");
});

test("failures never count as allowed", async () => {
  const cases = [
    [() => { throw new TypeError("Failed to fetch"); }, SIGNUP_EMAIL_CHECK_FAILED_MESSAGE],
    [() => jsonResponse(500, { detail: "boom" }), SIGNUP_EMAIL_CHECK_FAILED_MESSAGE],
    [() => jsonResponse(429, { detail: "throttled" }), SIGNUP_EMAIL_CHECK_THROTTLED_MESSAGE],
    [() => ({ ok: true, status: 200, json: async () => { throw new SyntaxError("html"); } }), SIGNUP_EMAIL_CHECK_FAILED_MESSAGE],
    [() => jsonResponse(200, { unexpected: true }), SIGNUP_EMAIL_CHECK_FAILED_MESSAGE],
    [() => jsonResponse(400, { code: "something_else" }), SIGNUP_EMAIL_CHECK_FAILED_MESSAGE],
  ];
  for (const [handler, message] of cases) {
    clearSignupEmailCheckCache();
    const { fetchImpl } = fakeFetch(handler);
    const result = await checkSignupEmail(API, "x@gmail.com", { fetchImpl });
    assert.equal(result.status, "error");
    assert.equal(result.message, message);
  }
});

test("definitive answers are cached; errors are retried", async () => {
  let fail = true;
  const { calls, fetchImpl } = fakeFetch(() => {
    if (fail) throw new TypeError("offline");
    return jsonResponse(200, { allowed: true });
  });
  assert.equal((await checkSignupEmail(API, "a@gmail.com", { fetchImpl })).status, "error");
  fail = false;
  assert.equal((await checkSignupEmail(API, "a@gmail.com", { fetchImpl })).status, "allowed");
  assert.equal((await checkSignupEmail(API, "A@GMAIL.COM ", { fetchImpl })).status, "allowed");
  assert.equal(calls.length, 2);
});

test("concurrent checks of one address share a single request", async () => {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const { calls, fetchImpl } = fakeFetch(async () => {
    await gate;
    return jsonResponse(200, { allowed: true });
  });
  const first = checkSignupEmail(API, "same@gmail.com", { fetchImpl });
  const second = checkSignupEmail(API, "same@gmail.com", { fetchImpl });
  release();
  assert.deepEqual(await Promise.all([first, second]), [{ status: "allowed" }, { status: "allowed" }]);
  assert.equal(calls.length, 1);
});

test("recognizes the Cognito Pre Sign-up rejection only", () => {
  const lambdaError = {
    code: "UserLambdaValidationException",
    message: `PreSignUp failed with error ${DISPOSABLE_EMAIL_MESSAGE}.`,
  };
  assert.equal(isDisposableEmailSignupError(lambdaError), true);
  assert.equal(isDisposableEmailSignupError(`PreSignUp failed with error ${DISPOSABLE_EMAIL_MESSAGE}.`), true);
  assert.equal(isDisposableEmailSignupError({ code: "UserLambdaValidationException", message: "PreSignUp failed with error other." }), false);
  assert.equal(isDisposableEmailSignupError({ code: "UsernameExistsException", message: "exists" }), false);
  assert.equal(isDisposableEmailSignupError(null), false);
});

test("participant check uses the signup preflight and blocks disposable domains", async () => {
  const { calls, fetchImpl } = fakeFetch(() =>
    jsonResponse(200, { allowed: false, code: "disposable_email_domain", message: DISPOSABLE_EMAIL_MESSAGE })
  );
  const result = await checkParticipantEmail(API, " Guest@Mailinator.com", { fetchImpl });
  assert.deepEqual(result, { status: "blocked", message: DISPOSABLE_EMAIL_MESSAGE });
  assert.deepEqual(calls[0].body, { email: "guest@mailinator.com" });
});

test("participant check never refuses the signed-in user's own account email", async () => {
  const { calls, fetchImpl } = fakeFetch(() => jsonResponse(200, { allowed: false, code: "disposable_email_domain" }));
  const result = await checkParticipantEmail(API, "legacy@mailinator.com", {
    accountEmail: "Legacy@Mailinator.com",
    fetchImpl,
  });
  assert.deepEqual(result, { status: "allowed" });
  assert.equal(calls.length, 0);
});

test("participant check still checks a different email typed by a signed-in user", async () => {
  const { calls, fetchImpl } = fakeFetch(() => jsonResponse(200, { allowed: false, code: "disposable_email_domain" }));
  const result = await checkParticipantEmail(API, "other@mailinator.com", { accountEmail: "me@example.com", fetchImpl });
  assert.equal(result.status, "blocked");
  assert.equal(calls.length, 1);
});

test("participant check reports a failed request as an error, never allowed", async () => {
  const fetchImpl = async () => {
    throw new Error("offline");
  };
  const result = await checkParticipantEmail(API, "guest@example.com", { fetchImpl });
  assert.deepEqual(result, { status: "error", message: SIGNUP_EMAIL_CHECK_FAILED_MESSAGE });
});

test("email format check matches the signup rule", () => {
  assert.equal(isEmailFormatValid(" guest@example.com "), true);
  assert.equal(isEmailFormatValid("guest@example"), false);
  assert.equal(isEmailFormatValid("sifoka"), false);
  assert.equal(isEmailFormatValid(""), false);
  assert.equal(isEmailFormatValid(undefined), false);
});

test("maps backend email rule refusals to field messages", () => {
  assert.equal(getEmailRuleErrorMessage({ code: "disposable_email_domain" }), DISPOSABLE_EMAIL_MESSAGE);
  assert.equal(getEmailRuleErrorMessage({ code: "invalid_email" }), "Enter a valid email address");
  assert.equal(getEmailRuleErrorMessage({ code: "account_exists" }), "");
  assert.equal(getEmailRuleErrorMessage(null), "");
});
