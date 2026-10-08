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

// Users admin (AdminStaffPage) imports. Only the Marketing Access wrappers are
// routed, with the same paths as utils/api.js, so tests can assert the real
// request shape through apiClient.
const MARKETING_ACCESS_BASE = "/newsletter/admin/marketing-access";
const data = (r) => r.data;

export const patchAdminUser = offline;
export const patchStaff = offline;
export const bulkSetStaff = offline;
export const createAdminUser = offline;
export const createAdminUserWithPassword = offline;
export const updateAdminUser = offline;
export const deactivateAdminUser = offline;
export const restoreAdminUser = offline;
export const mergeAdminUsers = offline;
export const getSaleorStaffList = offline;
export const addUserToSaleorStaff = offline;
export const removeUserFromSaleorStaff = offline;
export const getMarketingAccessUsers = () => apiClient.get(`${MARKETING_ACCESS_BASE}/`).then(data);
export const addUserToMarketing = (ecpUserId) =>
  apiClient.post(`${MARKETING_ACCESS_BASE}/${ecpUserId}/add/`).then(data);
export const removeUserFromMarketing = (ecpUserId, reason = "") =>
  apiClient.post(`${MARKETING_ACCESS_BASE}/${ecpUserId}/remove/`, reason ? { reason } : {}).then(data);
