// src/utils/roleRedirect.js

const decodeJwtPayload = (token) => {
  try {
    const b64 = (token.split(".")[1] || "").replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(b64));
  } catch {
    return null;
  }
};

export const getCognitoGroupsFromTokens = (accessToken) => {
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
  const isPlatformAdminGroup = groups.includes("platform_admin");
  const isStaffGroup = groups.includes("staff");

  if (isSuperuser || isPlatformAdminGroup) {
    return { role: "admin", path: "/admin/events" };
  }

  if (isStaff || isStaffGroup) {
    return { role: "staff", path: "/admin/events" };
  }

  return { role: "user", path: defaultPath || "/" };
};
