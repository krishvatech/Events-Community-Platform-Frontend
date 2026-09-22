import test from "node:test";
import assert from "node:assert/strict";

import {
  SECURE_AUTH_ROUTES,
  SecureAuthSessionError,
  createSecureAuthClient,
} from "./secureAuthSession.js";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("disabled client performs no network request", async () => {
  let calls = 0;
  const client = createSecureAuthClient({
    enabled: false,
    fetchImpl: async () => {
      calls += 1;
      return jsonResponse({});
    },
  });

  await assert.rejects(client.refresh(), (error) => {
    assert.equal(error.code, "secure_auth_disabled");
    return true;
  });
  assert.equal(calls, 0);
});

test("establish sends credentials only to the same-origin Worker route", async () => {
  const client = createSecureAuthClient({
    fetchImpl: async (url, init) => {
      assert.equal(url, SECURE_AUTH_ROUTES.establish);
      assert.equal(init.method, "POST");
      assert.equal(init.credentials, "include");
      assert.equal(init.cache, "no-store");
      assert.equal(init.redirect, "error");
      assert.equal(init.headers.Authorization, "Bearer current-id-token");
      assert.equal(init.headers["X-ECP-Secure-Auth"], "1");
      assert.deepEqual(JSON.parse(init.body), { refresh_token: "refresh-secret" });
      return jsonResponse({ access_token: "fresh-id-token", expires_in: 7200 });
    },
  });

  const result = await client.establish({
    accessToken: "current-id-token",
    refreshToken: "refresh-secret",
  });
  assert.equal(result.accessToken, "fresh-id-token");
});

test("refresh sends no bearer or refresh token and deduplicates concurrent calls", async () => {
  let calls = 0;
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });

  const client = createSecureAuthClient({
    fetchImpl: async (url, init) => {
      calls += 1;
      assert.equal(url, SECURE_AUTH_ROUTES.refresh);
      assert.equal(init.headers.Authorization, undefined);
      assert.equal(init.body, undefined);
      await gate;
      return jsonResponse({ access_token: "refreshed-id-token" });
    },
  });

  const first = client.refresh();
  const second = client.refresh();
  release();

  const [a, b] = await Promise.all([first, second]);
  assert.equal(calls, 1);
  assert.equal(a.accessToken, "refreshed-id-token");
  assert.equal(b.accessToken, "refreshed-id-token");
});

test("logout uses only the logout route", async () => {
  const client = createSecureAuthClient({
    fetchImpl: async (url, init) => {
      assert.equal(url, SECURE_AUTH_ROUTES.logout);
      assert.equal(init.method, "POST");
      assert.equal(init.credentials, "include");
      assert.equal(init.body, undefined);
      return jsonResponse({ logged_out: true });
    },
  });

  assert.deepEqual(await client.logout(), { logged_out: true });
});

test("backend errors expose only status and stable code", async () => {
  const client = createSecureAuthClient({
    fetchImpl: async () => jsonResponse({ detail: "invalid_session" }, 401),
  });

  await assert.rejects(client.refresh(), (error) => {
    assert.equal(error instanceof SecureAuthSessionError, true);
    assert.equal(error.status, 401);
    assert.equal(error.code, "invalid_session");
    assert.equal(error.message.includes("invalid_session"), false);
    return true;
  });
});

test("successful establish and refresh require access_token", async () => {
  const client = createSecureAuthClient({
    fetchImpl: async () => jsonResponse({ token_type: "Bearer" }),
  });

  await assert.rejects(
    client.establish({ accessToken: "id", refreshToken: "refresh" }),
    (error) => error.code === "secure_auth_missing_access_token",
  );
});
