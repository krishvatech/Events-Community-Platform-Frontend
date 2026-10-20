import test from "node:test";
import assert from "node:assert/strict";

import { requestSignupProof } from "./captchaProof.js";

// Build a mock fetch response matching the subset the helper reads.
function mockResponse({ status = 200, ok, body = null } = {}) {
  return {
    status,
    ok: ok !== undefined ? ok : status >= 200 && status < 300,
    json: async () => {
      if (body === null) throw new Error("no body");
      return body;
    },
  };
}

test("success: 200 with proof returns ok+proof", async () => {
  const fetchImpl = async () => mockResponse({ status: 200, body: { proof: "v1.a.b" } });
  const r = await requestSignupProof({ token: "t1", email: "A@Example.com", fetchImpl });
  assert.deepEqual(r, { ok: true, proof: "v1.a.b" });
});

test("invalid CAPTCHA: 400 returns detail reason", async () => {
  const fetchImpl = async () => mockResponse({ status: 400, ok: false, body: { detail: "captcha_failed" } });
  const r = await requestSignupProof({ token: "t2", email: "a@example.com", fetchImpl });
  assert.deepEqual(r, { ok: false, error: "captcha_failed" });
});

test("disabled: 404 returns disabled", async () => {
  const fetchImpl = async () => mockResponse({ status: 404, ok: false, body: { detail: "Not found." } });
  const r = await requestSignupProof({ token: "t3", email: "a@example.com", fetchImpl });
  assert.deepEqual(r, { ok: false, error: "disabled" });
});

test("rate limited: 429 returns rate_limited", async () => {
  const fetchImpl = async () => mockResponse({ status: 429, ok: false, body: {} });
  const r = await requestSignupProof({ token: "t4", email: "a@example.com", fetchImpl });
  assert.deepEqual(r, { ok: false, error: "rate_limited" });
});

test("missing config: 503 returns proof_unavailable detail", async () => {
  const fetchImpl = async () => mockResponse({ status: 503, ok: false, body: { detail: "proof_unavailable" } });
  const r = await requestSignupProof({ token: "t5", email: "a@example.com", fetchImpl });
  assert.deepEqual(r, { ok: false, error: "proof_unavailable" });
});

test("network failure: fetch throws -> network_error (fail closed)", async () => {
  const fetchImpl = async () => { throw new Error("boom"); };
  const r = await requestSignupProof({ token: "t6", email: "a@example.com", fetchImpl });
  assert.deepEqual(r, { ok: false, error: "network_error" });
});

test("retry after failure issues a fresh request (no stale result)", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return calls === 1
      ? mockResponse({ status: 400, ok: false, body: { detail: "captcha_failed" } })
      : mockResponse({ status: 200, body: { proof: "v1.ok" } });
  };
  const first = await requestSignupProof({ token: "same", email: "a@example.com", fetchImpl });
  const second = await requestSignupProof({ token: "same", email: "a@example.com", fetchImpl });
  assert.equal(first.ok, false);
  assert.equal(second.ok, true);
  assert.equal(calls, 2, "settled entry must clear so a later call re-requests");
});

test("dedup: identical overlapping calls share one request", async () => {
  let calls = 0;
  let resolveFetch;
  const gate = new Promise((res) => { resolveFetch = res; });
  const fetchImpl = async () => { calls += 1; await gate; return mockResponse({ status: 200, body: { proof: "v1.dup" } }); };
  const p1 = requestSignupProof({ token: "tok", email: "a@example.com", fetchImpl });
  const p2 = requestSignupProof({ token: "tok", email: "a@example.com", fetchImpl });
  assert.equal(p1, p2, "same token/email/op must return the same in-flight promise");
  resolveFetch();
  await Promise.all([p1, p2]);
  assert.equal(calls, 1, "only one network call for coalesced requests");
});

test("dedup: different tokens do NOT share a result", async () => {
  let calls = 0;
  let resolveFetch;
  const gate = new Promise((res) => { resolveFetch = res; });
  const fetchImpl = async () => { calls += 1; await gate; return mockResponse({ status: 200, body: { proof: "v1.x" } }); };
  const p1 = requestSignupProof({ token: "tokA", email: "a@example.com", fetchImpl });
  const p2 = requestSignupProof({ token: "tokB", email: "a@example.com", fetchImpl });
  assert.notEqual(p1, p2, "different tokens must be separate in-flight requests");
  resolveFetch();
  await Promise.all([p1, p2]);
  assert.equal(calls, 2, "different tokens trigger two network calls");
});
