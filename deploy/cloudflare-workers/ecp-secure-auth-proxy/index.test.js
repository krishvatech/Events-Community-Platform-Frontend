import test from "node:test";
import assert from "node:assert/strict";

import worker, {
  backendPathFor,
  extractNamedCookie,
  handleSecureAuthRequest,
} from "./index.js";

const ORIGIN = "https://connect.imaa-institute.org";
const BACKEND = "https://api.colligatus.com";
const COOKIE = "__Host-ecp_secure_session";

function authHeaders(extra = {}) {
  return {
    Origin: ORIGIN,
    "X-ECP-Secure-Auth": "1",
    ...extra,
  };
}

function post(path, { headers = {}, body = null } = {}) {
  return new Request(`${ORIGIN}${path}`, {
    method: "POST",
    headers: authHeaders(headers),
    body,
  });
}

async function withMockFetch(mock, fn) {
  const original = globalThis.fetch;
  globalThis.fetch = mock;
  try {
    return await fn();
  } finally {
    globalThis.fetch = original;
  }
}

test("maps only the three secure auth routes and accepts one trailing slash", () => {
  assert.equal(
    backendPathFor("/_auth/session/establish"),
    "/api/auth/secure-session/establish/",
  );
  assert.equal(
    backendPathFor("/_auth/session/refresh/"),
    "/api/auth/secure-session/refresh/",
  );
  assert.equal(
    backendPathFor("/_auth/session/logout"),
    "/api/auth/secure-session/logout/",
  );
  assert.equal(backendPathFor("/_auth/session/other"), null);
});

test("extracts only the named cookie without exposing unrelated cookies", () => {
  assert.equal(
    extractNamedCookie(`theme=dark; ${COOKIE}=opaque-handle; other=1`, COOKIE),
    `${COOKIE}=opaque-handle`,
  );
  assert.equal(extractNamedCookie("theme=dark; other=1", COOKIE), null);
});

test("unknown paths never reach the backend", async () => {
  let called = false;
  await withMockFetch(async () => {
    called = true;
    throw new Error("should not be called");
  }, async () => {
    const response = await handleSecureAuthRequest(post("/_auth/not-real"));
    assert.equal(response.status, 404);
    assert.equal(called, false);
  });
});

test("rejects non-POST requests", async () => {
  const request = new Request(`${ORIGIN}/_auth/session/refresh`, {
    method: "GET",
    headers: authHeaders(),
  });
  const response = await handleSecureAuthRequest(request);
  assert.equal(response.status, 405);
  assert.equal(response.headers.get("Allow"), "POST");
});

test("rejects query-string auth requests", async () => {
  const response = await handleSecureAuthRequest(
    post("/_auth/session/refresh?debug=1"),
  );
  assert.equal(response.status, 400);
});

test("requires exact Connect Origin and custom secure-auth header", async () => {
  const wrongOrigin = new Request(`${ORIGIN}/_auth/session/refresh`, {
    method: "POST",
    headers: {
      Origin: "https://imaa-institute.org",
      "X-ECP-Secure-Auth": "1",
    },
  });
  assert.equal((await handleSecureAuthRequest(wrongOrigin)).status, 403);

  const noHeader = new Request(`${ORIGIN}/_auth/session/refresh`, {
    method: "POST",
    headers: { Origin: ORIGIN },
  });
  assert.equal((await handleSecureAuthRequest(noHeader)).status, 403);
});

test("establish forwards bearer token but strips cookies and spoofed forwarding headers", async () => {
  await withMockFetch(async (url, init) => {
    assert.equal(url, `${BACKEND}/api/auth/secure-session/establish/`);
    assert.equal(init.method, "POST");
    assert.equal(init.headers.get("Authorization"), "Bearer id-token");
    assert.equal(init.headers.get("Origin"), ORIGIN);
    assert.equal(init.headers.get("X-ECP-Secure-Auth"), "1");
    assert.equal(init.headers.get("Cookie"), null);
    assert.equal(init.headers.get("X-Forwarded-For"), null);
    assert.equal(init.headers.get("X-Forwarded-Proto"), "https");
    assert.equal(init.headers.get("X-Forwarded-Host"), "connect.imaa-institute.org");
    return new Response(JSON.stringify({ session_established: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": `${COOKIE}=new-handle; Secure; HttpOnly; Path=/; SameSite=Strict`,
      },
    });
  }, async () => {
    const response = await handleSecureAuthRequest(
      post("/_auth/session/establish", {
        headers: {
          Authorization: "Bearer id-token",
          Cookie: "unrelated=secret",
          "X-Forwarded-For": "203.0.113.99",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh_token: "never-log-this" }),
      }),
    );
    assert.equal(response.status, 200);
    assert.match(response.headers.get("Set-Cookie"), new RegExp(`^${COOKIE}=`));
    assert.match(response.headers.get("Cache-Control"), /no-store/);
  });
});

test("refresh forwards only the secure-session cookie and no bearer token", async () => {
  await withMockFetch(async (url, init) => {
    assert.equal(url, `${BACKEND}/api/auth/secure-session/refresh/`);
    assert.equal(init.headers.get("Authorization"), null);
    assert.equal(init.headers.get("Cookie"), `${COOKIE}=opaque-handle`);
    assert.equal(init.headers.get("X-Forwarded-For"), null);
    return new Response(JSON.stringify({ access_token: "fresh-id-token" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }, async () => {
    const response = await handleSecureAuthRequest(
      post("/_auth/session/refresh", {
        headers: {
          Authorization: "Bearer should-not-forward",
          Cookie: `theme=dark; ${COOKIE}=opaque-handle; analytics=abc`,
          "X-Forwarded-For": "198.51.100.12",
        },
      }),
    );
    assert.equal(response.status, 200);
  });
});

test("logout forwards the secure cookie and preserves backend status", async () => {
  await withMockFetch(async (_url, init) => {
    assert.equal(init.headers.get("Cookie"), `${COOKIE}=opaque-handle`);
    return new Response(JSON.stringify({ logged_out: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": `${COOKIE}=; Max-Age=0; Secure; HttpOnly; Path=/; SameSite=Strict`,
      },
    });
  }, async () => {
    const response = await worker.fetch(
      post("/_auth/session/logout", {
        headers: { Cookie: `${COOKIE}=opaque-handle; other=1` },
      }),
      {},
    );
    assert.equal(response.status, 200);
    assert.match(response.headers.get("Set-Cookie"), /Max-Age=0/i);
    assert.match(response.headers.get("Cache-Control"), /no-store/);
  });
});

test("preserves backend 404 while feature is disabled", async () => {
  await withMockFetch(async () => {
    return new Response(JSON.stringify({ detail: "Not found." }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }, async () => {
    const response = await handleSecureAuthRequest(post("/_auth/session/refresh"));
    assert.equal(response.status, 404);
    assert.match(response.headers.get("Cache-Control"), /no-store/);
  });
});

test("returns generic 502 when backend fetch fails without exposing exception details", async () => {
  await withMockFetch(async () => {
    throw new Error("secret upstream detail");
  }, async () => {
    const response = await handleSecureAuthRequest(post("/_auth/session/refresh"));
    assert.equal(response.status, 502);
    const body = await response.text();
    assert.equal(body.includes("secret upstream detail"), false);
    assert.equal(body.includes("auth_backend_unavailable"), true);
  });
});

test("rejects non-HTTPS backend configuration", async () => {
  const response = await handleSecureAuthRequest(
    post("/_auth/session/refresh"),
    { AUTH_BACKEND_ORIGIN: "http://api.colligatus.com" },
  );
  assert.equal(response.status, 503);
});
