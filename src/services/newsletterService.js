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
const adminAnalyticsEndpoint = "/newsletter/admin/analytics/";
const adminDashboardEndpoint = "/newsletter/admin/dashboard/";

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

export const getNewsletterMauticDiagnostics = () =>
  unwrap(apiClient.get("/newsletter/admin/settings/mautic-diagnostics/"));

export const getNewsletterDashboard = (params = {}) =>
  unwrap(apiClient.get(adminDashboardEndpoint, { params }));

export const getNewsletterAnalyticsOverview = (params = {}) =>
  unwrap(apiClient.get(`${adminAnalyticsEndpoint}overview/`, { params }));

export const listNewsletterAnalyticsCampaigns = (params = {}) =>
  unwrap(apiClient.get(`${adminAnalyticsEndpoint}campaigns/`, { params }));

export const listNewsletterAnalyticsEmails = (params = {}) =>
  unwrap(apiClient.get(`${adminAnalyticsEndpoint}emails/`, { params }));

export const getNewsletterAnalyticsContacts = (params = {}) =>
  unwrap(apiClient.get(`${adminAnalyticsEndpoint}contacts/`, { params }));

export const listNewsletterAnalyticsSegments = (params = {}) =>
  unwrap(apiClient.get(`${adminAnalyticsEndpoint}segments/`, { params }));

export const getMauticCampaignCapabilities = () =>
  unwrap(apiClient.get(`${adminMauticCampaignsEndpoint}capabilities/`));

export const getNativeMauticCampaign = (campaignId) =>
  unwrap(apiClient.get(`${adminMauticCampaignsEndpoint}${campaignId}/`));

export const getNativeMauticCampaignBuilder = (campaignId) =>
  unwrap(apiClient.get(`${adminMauticCampaignsEndpoint}${campaignId}/builder/`));

export const createNativeMauticCampaign = createNewsletterMauticCampaign;

export const updateNativeMauticCampaign = updateNewsletterMauticCampaign;

export const duplicateNativeMauticCampaign = (campaignId) =>
  unwrap(apiClient.post(`${adminMauticCampaignsEndpoint}${campaignId}/duplicate/`));

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

export const createNewsletterAdminContact = (payload) =>
  unwrap(apiClient.post(adminContactsEndpoint, payload));

export const getNewsletterAdminContact = (mauticContactId) =>
  unwrap(apiClient.get(`${adminContactsEndpoint}${mauticContactId}/`));

export const updateNewsletterAdminContact = (mauticContactId, payload) =>
  unwrap(apiClient.patch(`${adminContactsEndpoint}${mauticContactId}/`, payload));

export const listNewsletterAdminContactFieldMetadata = () =>
  unwrap(apiClient.get(`${adminContactsEndpoint}field-metadata/`));

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

export const listNewsletterAdminTags = (params = {}) =>
  unwrap(apiClient.get("/newsletter/admin/tags/", { params }));

export const addNewsletterAdminContactTag = (mauticContactId, tag) =>
  unwrap(apiClient.post(`${adminContactsEndpoint}${mauticContactId}/tags/`, { tag }));

export const removeNewsletterAdminContactTag = (mauticContactId, tag) =>
  unwrap(apiClient.delete(`${adminContactsEndpoint}${mauticContactId}/tags/${encodeURIComponent(tag)}/`));

export const listNewsletterAdminContactNotes = (mauticContactId, params = {}) =>
  unwrap(apiClient.get(`${adminContactsEndpoint}${mauticContactId}/notes/`, { params }));

export const createNewsletterAdminContactNote = (mauticContactId, payload) =>
  unwrap(apiClient.post(`${adminContactsEndpoint}${mauticContactId}/notes/`, payload));

export const addNewsletterAdminContactDnc = (mauticContactId, payload) =>
  unwrap(apiClient.post(`${adminContactsEndpoint}${mauticContactId}/dnc/`, payload));

export const removeNewsletterAdminContactDnc = (mauticContactId, channel) =>
  unwrap(apiClient.delete(`${adminContactsEndpoint}${mauticContactId}/dnc/${encodeURIComponent(channel)}/`));

export const listNewsletterAdminContactCompanies = (mauticContactId) =>
  unwrap(apiClient.get(`${adminContactsEndpoint}${mauticContactId}/companies/`));

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

export const listNativeMauticSegments = listMauticSegments;

export const getNativeMauticSegment = (segmentId) =>
  unwrap(apiClient.get(`/newsletter/admin/mautic/segments/${segmentId}/`));

export const createNativeMauticSegment = (payload) =>
  unwrap(apiClient.post("/newsletter/admin/mautic/segments/", payload));

export const updateNativeMauticSegment = (segmentId, payload) =>
  unwrap(apiClient.patch(`/newsletter/admin/mautic/segments/${segmentId}/`, payload));

export const deleteNativeMauticSegment = (segmentId) =>
  unwrap(apiClient.delete(`/newsletter/admin/mautic/segments/${segmentId}/`));

export const listNativeMauticSegmentContacts = (segmentId, params = {}) =>
  unwrap(apiClient.get(`/newsletter/admin/mautic/segments/${segmentId}/contacts/`, { params }));

export const addNativeMauticSegmentContact = (segmentId, contactId) =>
  unwrap(
    apiClient.post(`/newsletter/admin/mautic/segments/${segmentId}/contacts/`, {
      contact_id: String(contactId),
    })
  );

export const removeNativeMauticSegmentContact = (segmentId, contactId) =>
  unwrap(apiClient.delete(`/newsletter/admin/mautic/segments/${segmentId}/contacts/${contactId}/`));

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

/* ------------------------------------------------------------------ *
 * Native Mautic companies
 * ------------------------------------------------------------------ */

const adminCompaniesEndpoint = "/newsletter/admin/companies/";

export const listNewsletterCompanies = (params = {}) =>
  unwrap(apiClient.get(adminCompaniesEndpoint, { params }));

export const getNewsletterCompany = (companyId) =>
  unwrap(apiClient.get(`${adminCompaniesEndpoint}${companyId}/`));

export const createNewsletterCompany = (payload) =>
  unwrap(apiClient.post(adminCompaniesEndpoint, payload));

export const updateNewsletterCompany = (companyId, payload) =>
  unwrap(apiClient.patch(`${adminCompaniesEndpoint}${companyId}/`, payload));

export const deleteNewsletterCompany = (companyId) =>
  unwrap(apiClient.delete(`${adminCompaniesEndpoint}${companyId}/`));

export const listNewsletterCompanyContacts = (companyId, params = {}) =>
  unwrap(apiClient.get(`${adminCompaniesEndpoint}${companyId}/contacts/`, { params }));

export const addNewsletterCompanyContact = (companyId, contactId) =>
  unwrap(
    apiClient.post(`${adminCompaniesEndpoint}${companyId}/contacts/`, {
      contact_id: String(contactId),
    })
  );

export const removeNewsletterCompanyContact = (companyId, contactId) =>
  unwrap(apiClient.delete(`${adminCompaniesEndpoint}${companyId}/contacts/${contactId}/`));

/* ------------------------------------------------------------------ *
 * Native Mautic tag administration
 * ------------------------------------------------------------------ */

const adminTagDirectoryEndpoint = "/newsletter/admin/tags/directory/";

export const listNewsletterTagDirectory = (params = {}) =>
  unwrap(apiClient.get(adminTagDirectoryEndpoint, { params }));

export const createNewsletterTag = (payload) =>
  unwrap(apiClient.post(adminTagDirectoryEndpoint, payload));

export const updateNewsletterTag = (tagId, payload) =>
  unwrap(apiClient.patch(`${adminTagDirectoryEndpoint}${tagId}/`, payload));

export const deleteNewsletterTag = (tagId) =>
  unwrap(apiClient.delete(`${adminTagDirectoryEndpoint}${tagId}/`));

/* ------------------------------------------------------------------ *
 * Native Mautic custom field definitions
 * ------------------------------------------------------------------ */

const adminFieldsEndpoint = "/newsletter/admin/fields/";

export const listNewsletterFieldTypes = () =>
  unwrap(apiClient.get(`${adminFieldsEndpoint}types/`));

export const listNewsletterFieldChoices = (fieldType) =>
  unwrap(apiClient.get(`${adminFieldsEndpoint}choices/${fieldType}/`));

export const listNewsletterFields = (fieldObject, params = {}) =>
  unwrap(apiClient.get(`${adminFieldsEndpoint}${fieldObject}/`, { params }));

export const createNewsletterField = (fieldObject, payload) =>
  unwrap(apiClient.post(`${adminFieldsEndpoint}${fieldObject}/`, payload));

export const updateNewsletterField = (fieldObject, fieldId, payload) =>
  unwrap(apiClient.patch(`${adminFieldsEndpoint}${fieldObject}/${fieldId}/`, payload));

export const deleteNewsletterField = (fieldObject, fieldId) =>
  unwrap(apiClient.delete(`${adminFieldsEndpoint}${fieldObject}/${fieldId}/`));
