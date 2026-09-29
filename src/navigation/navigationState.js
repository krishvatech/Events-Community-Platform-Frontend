// src/navigation/navigationState.js
// Next.js has no equivalent of React Router's `navigate(to, { state })`.
// During the migration the Next navigation adapter and the React Router bridge
// keep that per-entry state in sessionStorage, keyed by the target URL
// (pathname + search), so pages can keep reading `location.state`
// (e.g. SignInPage's `state.from`, SecurityCard -> ForgotPassword `state.email`).

const PREFIX = "ecp_nav_state:";

const storage = () => {
  try {
    return typeof window !== "undefined" ? window.sessionStorage : null;
  } catch {
    return null;
  }
};

export const toHref = (to) => {
  if (to == null) return "";
  if (typeof to === "string") return to;
  const { pathname = "", search = "", hash = "" } = to;
  const s = search && !search.startsWith("?") ? `?${search}` : search;
  const h = hash && !hash.startsWith("#") ? `#${hash}` : hash;
  return `${pathname}${s}${h}`;
};

// Resolve relative targets ("../x", "?q=1", "#h") against the current URL.
export const resolveHref = (to) => {
  const href = toHref(to);
  if (typeof window === "undefined" || href.startsWith("/")) return href;
  const url = new URL(href, window.location.href);
  return `${url.pathname}${url.search}${url.hash}`;
};

const stateKey = (href) => {
  const withoutHash = String(href || "").split("#")[0];
  return PREFIX + (withoutHash || "/");
};

export const writeNavigationState = (href, state) => {
  const store = storage();
  if (!store) return;
  try {
    if (state === undefined || state === null) store.removeItem(stateKey(href));
    else store.setItem(stateKey(href), JSON.stringify(state));
  } catch {
    // Unserializable state is dropped, like a full page reload would.
  }
};

// ---------------------------------------------------------------------------
// Pending navigation.
// React Router updates `location` synchronously on navigate(); Next.js router
// navigations are transitions, so for a moment the old pathname is still
// committed. Components that react to auth changes in the same tick as a
// navigation (e.g. logout: AppChrome swaps UnifiedSidebar for Header, whose
// protected-prefix guard reads the pathname) must see the navigation target,
// as they did under React Router. The Next adapter's useLocation() reports the
// pending target until Next commits it (or moves elsewhere / 10s elapse).

// The target is recorded silently (no subscriber notification): broadcasting it
// would force an urgent re-render of every useLocation() consumer - including a
// RequireAuth guard on the page being left - before Next.js swaps routes, which
// React Router never does. Components that render in the meantime (e.g. Header
// mounting when AppChrome reacts to "auth:changed") read it directly.

const PENDING_TTL_MS = 10000;
let pendingNavigation = null;

const currentCommittedKey = () =>
  typeof window === "undefined" ? "" : `${window.location.pathname}${window.location.search}`;

export const setPendingNavigation = (href) => {
  if (typeof window === "undefined") return;
  const url = new URL(href, window.location.href);
  pendingNavigation = {
    pathname: url.pathname,
    search: url.search,
    hash: url.hash,
    fromKey: currentCommittedKey(),
    at: Date.now(),
  };
};

export const clearPendingNavigation = (expected) => {
  if (!pendingNavigation || (expected && expected !== pendingNavigation)) return;
  pendingNavigation = null;
};

export const getPendingNavigation = () => pendingNavigation;

// The pending target applies only while the committed URL is still the one the
// navigation started from.
export const isPendingNavigationActive = (pending, committedKey) =>
  !!pending && pending.fromKey === committedKey && Date.now() - pending.at < PENDING_TTL_MS;

export const readNavigationState = (pathname, search = "") => {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(stateKey(`${pathname}${search}`));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
