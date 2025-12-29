// src/utils/roleRedirect.js

const decodeJwtPayload = (token) => {
  try {
    const b64 = (token.split(".")[1] || "").replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(b64));
  } catch {
    return null;
  }
};

export const getCognitoGroupsFromIdToken = (idToken) => {
  if (!idToken) return [];
  const payload = decodeJwtPayload(idToken);
  const raw = payload?.["cognito:groups"] || [];
  if (typeof raw === "string") return [raw];
  return Array.isArray(raw) ? raw : [];
};

export const getCognitoGroupsFromTokens = (idToken, accessToken) => {
  const fromId = getCognitoGroupsFromIdToken(idToken);
  if (fromId.length) return fromId;
  if (!accessToken) return [];
  const payload = decodeJwtPayload(accessToken);
  const raw = payload?.["cognito:groups"] || [];
  if (typeof raw === "string") return [raw];
  return Array.isArray(raw) ? raw : [];
};

export const getRoleAndRedirectPath = ({ cognitoGroups, backendUser, defaultPath }) => {
  const groups = Array.isArray(cognitoGroups)
    ? cognitoGroups.map((g) => String(g).toLowerCase())
    : [];

  const isStaff = backendUser?.is_staff === true;
  const isSuperuser = backendUser?.is_superuser === true;

  if (groups.includes("platform_admin") && isStaff && isSuperuser) {
    return { role: "admin", path: "/admin/events" };
  }

  if (groups.includes("staff") && isStaff && !isSuperuser) {
    return { role: "staff", path: "/admin/events" };
  }

  return { role: "user", path: defaultPath || "/" };
};
