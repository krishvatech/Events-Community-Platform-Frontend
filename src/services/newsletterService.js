import { apiClient } from "../utils/api";

const endpoint = () => "/newsletter/preferences/";

const unwrap = (promise) => promise.then((res) => res.data);

export const getNewsletterPreferences = () => unwrap(apiClient.get(endpoint()));

export const updateNewsletterPreferences = (preferences) =>
  unwrap(apiClient.patch(endpoint(), { preferences }));

const adminCampaignsEndpoint = "/newsletter/admin/campaigns/";
const adminAudiencesEndpoint = "/newsletter/admin/audiences/";

export const listNewsletterCampaigns = (params = {}) =>
  unwrap(apiClient.get(adminCampaignsEndpoint, { params }));

export const createNewsletterCampaign = (payload) =>
  unwrap(apiClient.post(adminCampaignsEndpoint, payload));

export const getNewsletterCampaign = (uuid) =>
  unwrap(apiClient.get(`${adminCampaignsEndpoint}${uuid}/`));

export const getNewsletterCampaignAnalytics = (uuid) =>
  unwrap(apiClient.get(`${adminCampaignsEndpoint}${uuid}/analytics/`));

export const updateNewsletterCampaign = (uuid, payload) =>
  unwrap(apiClient.patch(`${adminCampaignsEndpoint}${uuid}/`, payload));

export const deleteNewsletterCampaign = (uuid) =>
  unwrap(apiClient.delete(`${adminCampaignsEndpoint}${uuid}/`));

export const previewNewsletterCampaign = (uuid) =>
  unwrap(apiClient.get(`${adminCampaignsEndpoint}${uuid}/preview/`));

export const duplicateNewsletterCampaign = (uuid) =>
  unwrap(apiClient.post(`${adminCampaignsEndpoint}${uuid}/duplicate/`));

export const sendNewsletterTestEmail = (uuid, email) =>
  unwrap(apiClient.post(`${adminCampaignsEndpoint}${uuid}/test-email/`, { email }));

export const syncNewsletterCampaign = (uuid) =>
  unwrap(apiClient.post(`${adminCampaignsEndpoint}${uuid}/sync/`));

export const sendNewsletterCampaign = (uuid) =>
  unwrap(apiClient.post(`${adminCampaignsEndpoint}${uuid}/send/`));

export const scheduleNewsletterCampaign = (uuid, scheduledAt) =>
  unwrap(apiClient.post(`${adminCampaignsEndpoint}${uuid}/schedule/`, { scheduled_at: scheduledAt }));

export const cancelNewsletterCampaign = (uuid) =>
  unwrap(apiClient.post(`${adminCampaignsEndpoint}${uuid}/cancel/`));

export const listNewsletterCategories = () =>
  unwrap(apiClient.get("/newsletter/admin/categories/"));

export const listNewsletterAudiences = () =>
  unwrap(apiClient.get(adminAudiencesEndpoint));

export const createNewsletterAudience = (payload) =>
  unwrap(apiClient.post(adminAudiencesEndpoint, payload));

export const getNewsletterAudience = (uuid) =>
  unwrap(apiClient.get(`${adminAudiencesEndpoint}${uuid}/`));

export const updateNewsletterAudience = (uuid, payload) =>
  unwrap(apiClient.patch(`${adminAudiencesEndpoint}${uuid}/`, payload));

export const deleteNewsletterAudience = (uuid) =>
  unwrap(apiClient.delete(`${adminAudiencesEndpoint}${uuid}/`));

const adminCategoriesEndpoint = "/newsletter/admin/categories/";

export const listNewsletterCategoriesAdmin = ({ includeMautic = false } = {}) =>
  unwrap(
    apiClient.get(adminCategoriesEndpoint, {
      params: includeMautic ? { include_mautic: true } : {},
    })
  );

export const createNewsletterCategory = (payload) =>
  unwrap(apiClient.post(adminCategoriesEndpoint, payload));

export const updateNewsletterCategory = (slug, payload) =>
  unwrap(apiClient.patch(`${adminCategoriesEndpoint}${slug}/`, payload));

export const deleteNewsletterCategory = (slug) =>
  unwrap(apiClient.delete(`${adminCategoriesEndpoint}${slug}/`));

export const listMauticSegments = () =>
  unwrap(apiClient.get("/newsletter/admin/mautic/segments/"));

export const listNewsletterCategoryContacts = (slug, params = {}) =>
  unwrap(apiClient.get(`${adminCategoriesEndpoint}${slug}/contacts/`, { params }));

export const getNewsletterCategoryContactAnalytics = (slug, params = {}) =>
  unwrap(apiClient.get(`${adminCategoriesEndpoint}${slug}/contact-analytics/`, { params }));

export const linkNewsletterCategoryMauticSegment = (slug, mauticSegmentId) =>
  unwrap(
    apiClient.post(`${adminCategoriesEndpoint}${slug}/link-mautic-segment/`, {
      mautic_segment_id: String(mauticSegmentId),
    })
  );

export const syncNewsletterCategoryMautic = (slug) =>
  unwrap(apiClient.post(`${adminCategoriesEndpoint}${slug}/sync-mautic/`));
