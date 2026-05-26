import { apiClient } from "../utils/api";

const endpoint = (eventId, path = "") =>
  `/events/${encodeURIComponent(eventId)}/email-templates/${path}`;

const templatePath = (templateKey, suffix = "") => `${encodeURIComponent(templateKey)}/${suffix}`;

const unwrap = (promise) => promise.then((res) => res.data);

export const listEventEmailTemplates = (eventId) => unwrap(apiClient.get(endpoint(eventId)));

export const getEventEmailTemplate = (eventId, templateKey) =>
  unwrap(apiClient.get(endpoint(eventId, templatePath(templateKey))));

export const saveEventEmailTemplate = (eventId, templateKey, payload) =>
  unwrap(apiClient.patch(endpoint(eventId, templatePath(templateKey)), payload));

export const previewEventEmailTemplate = (eventId, templateKey, payload = {}) =>
  unwrap(apiClient.post(endpoint(eventId, templatePath(templateKey, "preview/")), payload));

export const sendTestEventEmailTemplate = (eventId, templateKey, testEmail) =>
  unwrap(apiClient.post(endpoint(eventId, templatePath(templateKey, "send-test/")), { test_email: testEmail }));

export const resetEventEmailTemplate = (eventId, templateKey) =>
  unwrap(apiClient.post(endpoint(eventId, templatePath(templateKey, "reset/"))));
