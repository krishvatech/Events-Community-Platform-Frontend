/**
 * Local cache of a guest applicant's own details.
 *
 * The public application-status endpoint
 * (`GET /api/events/<id>/apply/?email=...`) answers anonymous callers with a
 * status only, because the email in the query string is not proof of identity
 * and the stored application holds phone, comments and nominee details.
 *
 * A guest who was approved still needs to identify themselves to
 * `POST /api/events/<id>/guest-join/`, which requires first_name, last_name and
 * email. Those values are the applicant's own, typed by them in the apply form,
 * so they are kept in this browser-local cache instead of being served back by
 * the public API. Nothing is stored here that the applicant did not type into
 * the form themselves, and nothing is stored that guest-join does not use.
 */

export const APPLICATION_CACHE_KEY = "application_cache";

/** Entries older than this are ignored (and dropped on the next read). */
export const APPLICATION_CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/** The only fields guest-join accepts; nothing else is cached. */
const IDENTITY_FIELDS = [
  "email",
  "first_name",
  "last_name",
  "job_title",
  "company_name",
];

function asText(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Build the cache entry for a submitted application.
 * Returns null when there is nothing useful to store.
 */
export function buildApplicationCacheEntry(eventId, application, now = Date.now()) {
  const id = Number(eventId);
  const email = asText(application?.email);
  if (!Number.isFinite(id) || !email) return null;

  const entry = { event_id: id, saved_at: now };
  for (const field of IDENTITY_FIELDS) {
    const value = asText(application?.[field]);
    if (value) entry[field] = value;
  }
  return entry;
}

/**
 * Parse a raw cache string for one event.
 *
 * Returns null for malformed JSON, an entry for a different event, an entry
 * with no email, or an entry older than APPLICATION_CACHE_MAX_AGE_MS. Entries
 * written before `saved_at` existed are still accepted: they carry the email,
 * which keeps the existing status check working.
 */
export function parseApplicationCache(raw, { eventId, now = Date.now() } = {}) {
  if (!raw) return null;

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  if (!asText(parsed.email)) return null;

  // One cache entry at a time: an application for another event must not be
  // used to look up this one.
  if (eventId !== undefined && eventId !== null) {
    if (Number(parsed.event_id) !== Number(eventId)) return null;
  }

  if (typeof parsed.saved_at === "number" && now - parsed.saved_at > APPLICATION_CACHE_MAX_AGE_MS) {
    return null;
  }

  return parsed;
}

function safeStorage(storage) {
  if (storage) return storage;
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null; // private mode / blocked storage
  }
}

/** Read the cached entry for one event, or null. */
export function readApplicationCache({ eventId, now = Date.now(), storage } = {}) {
  const store = safeStorage(storage);
  if (!store) return null;
  try {
    return parseApplicationCache(store.getItem(APPLICATION_CACHE_KEY), { eventId, now });
  } catch {
    return null;
  }
}

/** Persist an entry. Returns true when it was written. */
export function writeApplicationCache(entry, { storage } = {}) {
  const store = safeStorage(storage);
  if (!store || !entry) return false;
  try {
    store.setItem(APPLICATION_CACHE_KEY, JSON.stringify(entry));
    return true;
  } catch {
    return false; // quota or blocked storage: the flow still works while the tab lives
  }
}

/**
 * Identity for a guest-join call.
 *
 * Prefers whatever the API returned (an authenticated applicant still receives
 * their own application in full), and falls back to the local cache for the
 * anonymous case. Returns null when the required fields are missing, so the
 * caller can skip a request that the backend would reject with 400.
 */
export function guestJoinIdentity(application, cached) {
  const pick = (field) => asText(application?.[field]) || asText(cached?.[field]);

  const first_name = pick("first_name");
  const last_name = pick("last_name");
  const email = pick("email");
  if (!first_name || !last_name || !email) return null;

  return {
    first_name,
    last_name,
    email,
    job_title: pick("job_title"),
    company_name: pick("company_name"),
  };
}
