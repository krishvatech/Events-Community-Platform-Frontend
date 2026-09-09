import { apiClient } from "../utils/api";

const endpoint = () => "/newsletter/preferences/";

const unwrap = (promise) => promise.then((res) => res.data);

export const getNewsletterPreferences = () => unwrap(apiClient.get(endpoint()));

export const updateNewsletterPreferences = (preferences) =>
  unwrap(apiClient.patch(endpoint(), { preferences }));

const adminCampaignsEndpoint = "/newsletter/admin/campaigns/";
const adminAudiencesEndpoint = "/newsletter/admin/audiences/";
const adminContactsEndpoint = "/newsletter/admin/contacts/";
const adminStagesEndpoint = "/newsletter/admin/stages/";
const adminPointsEndpoint = "/newsletter/admin/points/";
const adminPointTriggersEndpoint = `${adminPointsEndpoint}triggers/`;
const adminPointGroupsEndpoint = `${adminPointsEndpoint}groups/`;
const adminTemplatesEndpoint = "/newsletter/admin/templates/";
const adminMauticCampaignsEndpoint = "/newsletter/admin/mautic-campaigns/";

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

export const listNewsletterMauticCampaigns = (params = {}) =>
  unwrap(apiClient.get(adminMauticCampaignsEndpoint, { params }));

export const getNewsletterMauticCampaign = (campaignId) =>
  unwrap(apiClient.get(`${adminMauticCampaignsEndpoint}${campaignId}/`));

export const createNewsletterMauticCampaign = (payload) =>
  unwrap(apiClient.post(adminMauticCampaignsEndpoint, payload));

export const updateNewsletterMauticCampaign = (campaignId, payload) =>
  unwrap(apiClient.patch(`${adminMauticCampaignsEndpoint}${campaignId}/`, payload));

export const deleteNewsletterMauticCampaign = (campaignId) =>
  unwrap(apiClient.delete(`${adminMauticCampaignsEndpoint}${campaignId}/`));

export const listNewsletterTemplates = (params = {}) =>
  unwrap(apiClient.get(adminTemplatesEndpoint, { params }));

export const getNewsletterTemplate = (templateId) =>
  unwrap(apiClient.get(`${adminTemplatesEndpoint}${templateId}/`));

export const createNewsletterTemplate = (payload) =>
  unwrap(apiClient.post(adminTemplatesEndpoint, payload));

export const updateNewsletterTemplate = (templateId, payload) =>
  unwrap(apiClient.patch(`${adminTemplatesEndpoint}${templateId}/`, payload));

export const deleteNewsletterTemplate = (templateId) =>
  unwrap(apiClient.delete(`${adminTemplatesEndpoint}${templateId}/`));

export const listNewsletterCategories = () =>
  unwrap(apiClient.get("/newsletter/admin/categories/"));

export const listNewsletterAudiences = () =>
  unwrap(apiClient.get(adminAudiencesEndpoint));

export const listNewsletterAdminContacts = (params = {}) =>
  unwrap(apiClient.get(adminContactsEndpoint, { params }));

export const getNewsletterAdminContact = (mauticContactId) =>
  unwrap(apiClient.get(`${adminContactsEndpoint}${mauticContactId}/`));

export const listNewsletterAdminContactActivity = (mauticContactId, params = {}) =>
  unwrap(apiClient.get(`${adminContactsEndpoint}${mauticContactId}/activity/`, { params }));

export const getNewsletterAdminContactEngagement = (mauticContactId, params = {}) =>
  unwrap(apiClient.get(`${adminContactsEndpoint}${mauticContactId}/engagement-analytics/`, { params }));

export const moveNewsletterAdminContactStage = (mauticContactId, stageId) =>
  unwrap(
    apiClient.post(`${adminContactsEndpoint}${mauticContactId}/stage/`, {
      stage_id: String(stageId),
    })
  );

export const clearNewsletterAdminContactStage = (mauticContactId) =>
  unwrap(apiClient.delete(`${adminContactsEndpoint}${mauticContactId}/stage/`));

export const listNewsletterStages = (params = {}) =>
  unwrap(apiClient.get(adminStagesEndpoint, { params }));

export const bulkUpdateNewsletterAdminContactStage = (payload) =>
  unwrap(apiClient.post(`${adminContactsEndpoint}bulk-stage/`, payload));

export const getNewsletterStage = (stageId) =>
  unwrap(apiClient.get(`${adminStagesEndpoint}${stageId}/`));

export const createNewsletterStage = (payload) =>
  unwrap(apiClient.post(adminStagesEndpoint, payload));

export const updateNewsletterStage = (stageId, payload) =>
  unwrap(apiClient.patch(`${adminStagesEndpoint}${stageId}/`, payload));

export const deleteNewsletterStage = (stageId) =>
  unwrap(apiClient.delete(`${adminStagesEndpoint}${stageId}/`));

export const getNewsletterStageAnalytics = () =>
  unwrap(apiClient.get(`${adminStagesEndpoint}analytics/`));

export const listNewsletterPointActionTypes = () =>
  unwrap(apiClient.get(`${adminPointsEndpoint}types/`));

export const listNewsletterPointActions = (params = {}) =>
  unwrap(apiClient.get(adminPointsEndpoint, { params }));

export const getNewsletterPointAction = (pointId) =>
  unwrap(apiClient.get(`${adminPointsEndpoint}${pointId}/`));

export const createNewsletterPointAction = (payload) =>
  unwrap(apiClient.post(adminPointsEndpoint, payload));

export const updateNewsletterPointAction = (pointId, payload) =>
  unwrap(apiClient.patch(`${adminPointsEndpoint}${pointId}/`, payload));

export const deleteNewsletterPointAction = (pointId) =>
  unwrap(apiClient.delete(`${adminPointsEndpoint}${pointId}/`));

export const listNewsletterPointTriggerEventTypes = () =>
  unwrap(apiClient.get(`${adminPointTriggersEndpoint}event-types/`));

export const listNewsletterPointTriggers = (params = {}) =>
  unwrap(apiClient.get(adminPointTriggersEndpoint, { params }));

export const getNewsletterPointTrigger = (triggerId) =>
  unwrap(apiClient.get(`${adminPointTriggersEndpoint}${triggerId}/`));

export const createNewsletterPointTrigger = (payload) =>
  unwrap(apiClient.post(adminPointTriggersEndpoint, payload));

export const updateNewsletterPointTrigger = (triggerId, payload) =>
  unwrap(apiClient.patch(`${adminPointTriggersEndpoint}${triggerId}/`, payload));

export const deleteNewsletterPointTrigger = (triggerId) =>
  unwrap(apiClient.delete(`${adminPointTriggersEndpoint}${triggerId}/`));

export const listNewsletterPointTriggerEvents = (triggerId) =>
  unwrap(apiClient.get(`${adminPointTriggersEndpoint}${triggerId}/events/`));

export const createNewsletterPointTriggerEvent = (triggerId, payload) =>
  unwrap(apiClient.post(`${adminPointTriggersEndpoint}${triggerId}/events/`, payload));

export const getNewsletterPointTriggerEvent = (triggerId, eventId) =>
  unwrap(apiClient.get(`${adminPointTriggersEndpoint}${triggerId}/events/${eventId}/`));

export const updateNewsletterPointTriggerEvent = (triggerId, eventId, payload) =>
  unwrap(apiClient.patch(`${adminPointTriggersEndpoint}${triggerId}/events/${eventId}/`, payload));

export const deleteNewsletterPointTriggerEvent = (triggerId, eventId) =>
  unwrap(apiClient.delete(`${adminPointTriggersEndpoint}${triggerId}/events/${eventId}/`));

export const listNewsletterPointGroups = (params = {}) =>
  unwrap(apiClient.get(adminPointGroupsEndpoint, { params }));

export const getNewsletterPointGroup = (groupId) =>
  unwrap(apiClient.get(`${adminPointGroupsEndpoint}${groupId}/`));

export const createNewsletterPointGroup = (payload) =>
  unwrap(apiClient.post(adminPointGroupsEndpoint, payload));

export const updateNewsletterPointGroup = (groupId, payload) =>
  unwrap(apiClient.patch(`${adminPointGroupsEndpoint}${groupId}/`, payload));

export const getNewsletterPointGroupDeleteCheck = (groupId) =>
  unwrap(apiClient.get(`${adminPointGroupsEndpoint}${groupId}/delete-check/`));

export const deleteNewsletterPointGroup = (groupId) =>
  unwrap(apiClient.delete(`${adminPointGroupsEndpoint}${groupId}/`));

export const listNewsletterAdminContactPointGroups = (mauticContactId) =>
  unwrap(apiClient.get(`${adminContactsEndpoint}${mauticContactId}/point-groups/`));

export const getNewsletterAdminContactPointGroup = (mauticContactId, groupId) =>
  unwrap(
    apiClient.get(
      `${adminContactsEndpoint}${mauticContactId}/point-groups/${groupId}/`
    )
  );

export const adjustNewsletterAdminContactPointGroup = (
  mauticContactId,
  groupId,
  payload
) =>
  unwrap(
    apiClient.post(
      `${adminContactsEndpoint}${mauticContactId}/point-groups/${groupId}/`,
      payload
    )
  );

export const adjustNewsletterAdminContactPoints = (mauticContactId, payload) =>
  unwrap(
    apiClient.post(`${adminContactsEndpoint}${mauticContactId}/points/`, payload)
  );

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
