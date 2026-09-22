import assert from "node:assert/strict";
import test from "node:test";

import {
  APPLICATION_CACHE_KEY,
  APPLICATION_CACHE_MAX_AGE_MS,
  buildApplicationCacheEntry,
  guestJoinIdentity,
  parseApplicationCache,
  readApplicationCache,
  writeApplicationCache,
} from "../../utils/applicationCache.js";

function memoryStorage(initial = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = String(v);
    },
  };
}

const APPLICATION = {
  id: 12,
  email: "Guest@Example.com ",
  first_name: "Ada",
  last_name: "Applicant",
  job_title: "Analyst",
  company_name: "Acme",
  // Fields the public endpoint no longer returns and that must never be cached.
  phone: "+10000000001",
  comments: "private note",
  linkedin_url: "https://linkedin.example.com/in/ada",
  nominee_email: "nominee@example.com",
};

test("caches only the fields guest-join needs", () => {
  const entry = buildApplicationCacheEntry(42, APPLICATION, 1000);

  assert.deepEqual(Object.keys(entry).sort(), [
    "company_name",
    "email",
    "event_id",
    "first_name",
    "job_title",
    "last_name",
    "saved_at",
  ]);
  assert.equal(entry.event_id, 42);
  assert.equal(entry.email, "Guest@Example.com");
  assert.equal(entry.saved_at, 1000);
});

test("never caches application PII beyond the applicant's own identity", () => {
  const entry = buildApplicationCacheEntry(42, APPLICATION);
  const serialized = JSON.stringify(entry);

  for (const leaked of ["phone", "comments", "linkedin_url", "nominee_email", "+10000000001", "private note"]) {
    assert.ok(!serialized.includes(leaked), `${leaked} must not be cached`);
  }
});

test("refuses to build an entry without an event id or email", () => {
  assert.equal(buildApplicationCacheEntry(undefined, APPLICATION), null);
  assert.equal(buildApplicationCacheEntry(42, { first_name: "Ada" }), null);
});

test("ignores a cache entry belonging to a different event", () => {
  const raw = JSON.stringify({ event_id: 7, email: "guest@example.com" });

  assert.equal(parseApplicationCache(raw, { eventId: 8 }), null);
  assert.ok(parseApplicationCache(raw, { eventId: 7 }));
  assert.ok(parseApplicationCache(raw, { eventId: "7" }), "string ids from the router still match");
});

test("ignores malformed or empty cache data", () => {
  assert.equal(parseApplicationCache("not json", { eventId: 1 }), null);
  assert.equal(parseApplicationCache("", { eventId: 1 }), null);
  assert.equal(parseApplicationCache(null, { eventId: 1 }), null);
  assert.equal(parseApplicationCache(JSON.stringify({ event_id: 1 }), { eventId: 1 }), null);
});

test("expires entries older than the maximum age", () => {
  const now = 10 * APPLICATION_CACHE_MAX_AGE_MS;
  const fresh = JSON.stringify({ event_id: 1, email: "g@example.com", saved_at: now - 1000 });
  const stale = JSON.stringify({
    event_id: 1,
    email: "g@example.com",
    saved_at: now - APPLICATION_CACHE_MAX_AGE_MS - 1,
  });

  assert.ok(parseApplicationCache(fresh, { eventId: 1, now }));
  assert.equal(parseApplicationCache(stale, { eventId: 1, now }), null);
});

test("still accepts older entries written before saved_at existed", () => {
  const legacy = JSON.stringify({ event_id: 1, email: "g@example.com" });
  const parsed = parseApplicationCache(legacy, { eventId: 1 });

  assert.equal(parsed.email, "g@example.com");
  assert.equal(parsed.first_name, undefined);
});

test("round-trips through storage", () => {
  const storage = memoryStorage();
  const entry = buildApplicationCacheEntry(5, APPLICATION, 2000);

  assert.equal(writeApplicationCache(entry, { storage }), true);
  assert.ok(storage.data[APPLICATION_CACHE_KEY]);
  assert.equal(readApplicationCache({ eventId: 5, now: 2001, storage }).first_name, "Ada");
  assert.equal(readApplicationCache({ eventId: 6, now: 2001, storage }), null);
});

test("survives blocked or throwing storage", () => {
  const blocked = {
    getItem() {
      throw new Error("SecurityError");
    },
    setItem() {
      throw new Error("QuotaExceededError");
    },
  };

  assert.equal(readApplicationCache({ eventId: 1, storage: blocked }), null);
  assert.equal(writeApplicationCache({ event_id: 1, email: "g@example.com" }, { storage: blocked }), false);
});

test("builds a guest-join body from the cache for an anonymous applicant", () => {
  const cached = buildApplicationCacheEntry(5, APPLICATION);
  // The public endpoint now answers with a status only.
  const identity = guestJoinIdentity({ status: "approved", application_status: "accepted" }, cached);

  assert.deepEqual(identity, {
    first_name: "Ada",
    last_name: "Applicant",
    email: "Guest@Example.com",
    job_title: "Analyst",
    company_name: "Acme",
  });
});

test("prefers the API payload for an authenticated applicant", () => {
  const cached = buildApplicationCacheEntry(5, APPLICATION);
  const identity = guestJoinIdentity(
    { first_name: "Uri", last_name: "User", email: "uri@example.com" },
    cached
  );

  assert.equal(identity.first_name, "Uri");
  assert.equal(identity.email, "uri@example.com");
  assert.equal(identity.job_title, "Analyst", "falls back to the cache field by field");
});

test("returns null when identity is incomplete so guest-join is skipped", () => {
  assert.equal(guestJoinIdentity({ status: "approved" }, null), null);
  assert.equal(guestJoinIdentity(null, { email: "g@example.com" }), null, "needs a name too");
  assert.equal(
    guestJoinIdentity(null, { email: "g@example.com", first_name: "Ada" }),
    null,
    "last_name is required by guest-join"
  );
});
