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

const getBackendUserFromStorage = () => {
  // In your SignInPage.jsx you do: localStorage.setItem("user", JSON.stringify(userObj || {}));
  const raw =
    safeParse(window.localStorage.getItem("user")) ||
    safeParse(window.sessionStorage.getItem("user"));

  if (!raw) return null;
  return raw.user ? raw.user : raw;
};

const getCognitoGroupsFromAccessToken = () => {
  const token = window.localStorage.getItem("access_token") || "";
  const claims = decodeJwtPayload(token);
  const raw = claims?.["cognito:groups"] || [];

  const arr =
    typeof raw === "string" ? [raw] : Array.isArray(raw) ? raw : [];

  return arr.map((g) => String(g).trim().toLowerCase());
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

// OWNER/Admin = platform_admin group + DB flags match
export const isOwnerUser = () => {
  const groups = getCognitoGroupsFromAccessToken();
  const dbUser = getBackendUserFromStorage();

  const hasPlatformAdmin = groups.includes("platform_admin");
  const dbIsStaff = truthyFlag(dbUser?.is_staff);
  const dbIsSuper = truthyFlag(dbUser?.is_superuser);

  return hasPlatformAdmin && dbIsStaff && dbIsSuper;
};

// STAFF = staff group + DB flags match, and NOT platform_admin
export const isStaffUser = () => {
  const groups = getCognitoGroupsFromAccessToken();
  const dbUser = getBackendUserFromStorage();

  const hasPlatformAdmin = groups.includes("platform_admin");
  const hasStaff = groups.includes("staff");

  const dbIsStaff = truthyFlag(dbUser?.is_staff);
  const dbIsSuper = truthyFlag(dbUser?.is_superuser);

  return !hasPlatformAdmin && hasStaff && dbIsStaff && !dbIsSuper;
};

// generic "some level of admin"
export const isAdminUser = () => isOwnerUser() || isStaffUser();

