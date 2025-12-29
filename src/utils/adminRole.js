// src/utils/adminRole.js

// Small helper: treat booleans / numbers / strings as truthy
const truthyFlag = (flag) => {
  if (flag === true) return true;
  if (flag === 1) return true;
  if (typeof flag === "string") {
    const s = flag.trim().toLowerCase();
    return s === "true" || s === "1";
  }
  return false;
};

const safeParse = (raw) => {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const decodeJwtPayload = (token) => {
  try {
    if (!token) return null;
    const base64 = token.split(".")[1];
    if (!base64) return null;
    const norm = base64.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(norm));
  } catch {
    return null;
  }
};

// Collect all possible "user-like" objects we might have in storage / token
const getUserCandidates = () => {
  const candidates = [];

  const storageKeys = [
    "user",
    "authUser",
    "loginPayload",
    "auth",
    "profile",
  ];

  // localStorage + sessionStorage
  for (const key of storageKeys) {
    const rawLocal = safeParse(window.localStorage.getItem(key));
    const rawSess = safeParse(window.sessionStorage.getItem(key));

    const vals = [rawLocal, rawSess].filter(Boolean);
    for (const val of vals) {
      if (!val) continue;
      // if wrapped as { user: { ... } }
      if (val.user) {
        candidates.push(val.user);
      } else {
        candidates.push(val);
      }
    }
  }

  // JWT tokens (these usually contain is_superuser / is_staff)
  const jwtToken = window.localStorage.getItem("access_token");

  const claims = decodeJwtPayload(jwtToken);
  if (claims) candidates.push(claims);

  return candidates.filter(Boolean);
};

// Exported in case you want to inspect what we see
export const getCurrentUserCandidate = () => {
  const c = getUserCandidates();
  return c[0] || null;
};

// OWNER = Django auth_user.is_superuser = true (from any candidate or JWT claim)
export const isOwnerUser = () => {
  const candidates = getUserCandidates();   // user objects / JWT claims
  return candidates.some((u) => truthyFlag(u?.is_superuser));
};

// STAFF = auth_user.is_staff = true, BUT NOT owner
export const isStaffUser = () => {
  const candidates = getUserCandidates();

  // If ANY candidate is superuser, treat as owner, NOT staff
  if (candidates.some((u) => truthyFlag(u?.is_superuser))) {
    return false;
  }

  // Otherwise, staff if ANY candidate has is_staff = true
  return candidates.some((u) => truthyFlag(u?.is_staff));
};


// generic "some level of admin"
export const isAdminUser = () => isOwnerUser();
