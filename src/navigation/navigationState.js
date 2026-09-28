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
