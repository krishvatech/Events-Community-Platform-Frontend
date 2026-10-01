// Test stand-in for utils/api.js. Blog UI tests never touch the network.
const offline = async () => {
  throw new Error("network disabled in tests");
};

// A test may answer apiClient calls itself by installing handlers on
// globalThis.__testApiClient ({ get, post, ... }). Anything not handled stays
// offline, so no request ever leaves the process.
const routed = (method) => (...args) => {
  const handler = globalThis.__testApiClient?.[method];
  return handler ? handler(...args) : offline();
};

export const API_BASE = "http://localhost/api";
export const apiClient = {
  get: routed("get"),
  post: routed("post"),
  patch: routed("patch"),
  put: routed("put"),
  delete: routed("delete"),
};
export const listAdminUsers = offline;
export const getCurrentMarketingStatus = async () => ({ has_marketing_access: false });
export const createWagtailSession = offline;
export const createOpenApiDocsSession = offline;
export const getSaleorDashboardUrl = offline;
