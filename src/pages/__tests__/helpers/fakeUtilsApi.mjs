// Test stand-in for utils/api.js. Blog UI tests never touch the network.
const offline = async () => {
  throw new Error("network disabled in tests");
};

export const API_BASE = "http://localhost/api";
export const apiClient = { get: offline, post: offline, patch: offline, put: offline, delete: offline };
export const listAdminUsers = offline;
export const getCurrentMarketingStatus = async () => ({ has_marketing_access: false });
export const createWagtailSession = offline;
export const getSaleorDashboardUrl = offline;
