const CACHE = new Map();
const IN_FLIGHT = new Map();

const now = () => Date.now();
const normalizeBase = (baseUrl = "") => String(baseUrl || "").replace(/\/+$/, "");
const cacheKey = (kind, id) => `${kind}:${id}`;
const authCacheKey = (headers = {}) => {
  const auth = headers.Authorization || headers.authorization || "";
  return auth ? auth.slice(-24) : "anon";
};

function readFresh(key) {
  const hit = CACHE.get(key);
  if (!hit) return undefined;
  if (hit.expiresAt <= now()) {
    CACHE.delete(key);
    return undefined;
  }
  return hit.value;
}

export function primeEntityCache(key, value, ttlMs = 60_000) {
  CACHE.set(key, { value, expiresAt: now() + ttlMs });
  return value;
}

export async function fetchJsonCached(key, loader, ttlMs = 60_000) {
  const cached = readFresh(key);
  if (cached !== undefined) return cached;
  if (IN_FLIGHT.has(key)) return IN_FLIGHT.get(key);

  const promise = (async () => {
    const value = await loader();
    primeEntityCache(key, value, ttlMs);
    return value;
  })().finally(() => {
    IN_FLIGHT.delete(key);
  });

  IN_FLIGHT.set(key, promise);
  return promise;
}

export async function fetchEventSummaryCached({
  baseUrl,
  eventId,
  headers = {},
  ttlMs = 60_000,
  fetcher = fetch,
} = {}) {
  const id = String(eventId || '').trim();
  if (!id) throw new Error('Missing eventId');
  const root = normalizeBase(baseUrl);
  return fetchJsonCached(cacheKey('event-summary', id), async () => {
    const res = await fetcher(`${root}/events/${id}/summary/`, {
      headers,
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`Event summary ${id} failed: HTTP ${res.status}`);
    return res.json();
  }, ttlMs);
}

export async function fetchUserDetailCached({
  baseUrl,
  userId,
  headers = {},
  ttlMs = 300_000,
  fetcher = fetch,
} = {}) {
  const id = String(userId || '').trim();
  if (!id) throw new Error('Missing userId');
  const root = normalizeBase(baseUrl);
  return fetchJsonCached(cacheKey('user-detail', id), async () => {
    const res = await fetcher(`${root}/users/${id}/`, {
      headers,
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`User detail ${id} failed: HTTP ${res.status}`);
    return res.json();
  }, ttlMs);
}

export async function fetchCurrentUserPreferencesCached({
  baseUrl,
  headers = {},
  ttlMs = 300_000,
  fetcher = fetch,
} = {}) {
  const root = normalizeBase(baseUrl);
  return fetchJsonCached(cacheKey('current-user-preferences', authCacheKey(headers)), async () => {
    const res = await fetcher(`${root}/users/me/?ecp_lite=qna`, {
      headers,
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`Current user preferences failed: HTTP ${res.status}`);
    return res.json();
  }, ttlMs);
}

export async function fetchUserKycStatusCached({
  baseUrl,
  userId,
  headers = {},
  ttlMs = 300_000,
  fetcher = fetch,
} = {}) {
  const id = String(userId || '').trim();
  if (!id) throw new Error('Missing userId');
  const root = normalizeBase(baseUrl);
  return fetchJsonCached(cacheKey('user-kyc', id), async () => {
    const res = await fetcher(`${root}/users/${id}/?ecp_lite=kyc`, {
      headers,
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`User KYC ${id} failed: HTTP ${res.status}`);
    return res.json();
  }, ttlMs);
}
