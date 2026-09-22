// Authoritative Marketing Hub access state.
//
// Marketing Hub visibility must never be derived from is_superuser (or is_staff)
// in the browser: a superuser without an active Mautic mapping has no Marketing
// access. The backend is the source of truth and enforces it regardless of what
// this returns; this only decides what we bother showing.
//
// The result is cached per page load and shared by every caller, so the sidebar
// and the route guard agree and we do not refetch on each render.

import React from "react";
import { getCurrentMarketingStatus } from "../utils/api";
import { getAccessToken as getStoredAccessToken } from "../utils/tokenStore";

const DENIED = {
  eligible: false,
  has_marketing_access: false,
  connected: false,
  marketing_state: "not_eligible",
};

let cachedPromise = null;

const hasSession = () =>
  Boolean(
    getStoredAccessToken() ||
      window.localStorage.getItem("user") ||
      window.sessionStorage.getItem("user")
  );

export const fetchMarketingStatus = () => {
  if (!hasSession()) return Promise.resolve(DENIED);
  if (!cachedPromise) {
    cachedPromise = getCurrentMarketingStatus().catch(() => DENIED);
  }
  return cachedPromise;
};

// Call after granting/removing access, or on sign-out, so the next read is fresh.
export const resetMarketingStatusCache = () => {
  cachedPromise = null;
};

// Sign-in and sign-out are SPA navigations, not page loads, so the cache has to
// be dropped when the session changes. Otherwise the next user in the same tab
// would inherit the previous user's Marketing answer until a manual reload.
if (typeof window !== "undefined") {
  window.addEventListener("auth:changed", resetMarketingStatusCache);
}

/**
 * @returns {{status: object|null, loading: boolean, hasMarketingAccess: boolean}}
 */
export default function useMarketingAccess() {
  const [status, setStatus] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;

    const load = () => {
      setLoading(true);
      fetchMarketingStatus()
        .then((data) => {
          if (active) {
            setStatus(data || DENIED);
            setLoading(false);
          }
        })
        .catch(() => {
          if (active) {
            setStatus(DENIED);
            setLoading(false);
          }
        });
    };

    load();

    // The listener registered above has already cleared the cache by the time
    // this runs, so this re-reads for whoever is signed in now.
    window.addEventListener("auth:changed", load);
    return () => {
      active = false;
      window.removeEventListener("auth:changed", load);
    };
  }, []);

  return {
    status,
    loading,
    hasMarketingAccess: Boolean(status?.has_marketing_access),
  };
}
