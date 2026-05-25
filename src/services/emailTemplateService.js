import { apiClient } from "../utils/api";

const endpoint = (path = "") => `/cms/email-templates/${path}`;

const unwrap = (promise) => promise.then((res) => res.data);

export const listEmailTemplates = () => unwrap(apiClient.get(endpoint()));

export const getEmailTemplate = (templateKey) =>
  unwrap(apiClient.get(endpoint(`${encodeURIComponent(templateKey)}/`)));

export const saveEmailTemplate = (templateKey, payload) =>
  unwrap(apiClient.patch(endpoint(`${encodeURIComponent(templateKey)}/`), payload));

export const previewEmailTemplate = (templateKey, payload = {}) =>
  unwrap(apiClient.post(endpoint(`${encodeURIComponent(templateKey)}/preview/`), payload));

export const sendTestEmail = (templateKey, testEmail) =>
  unwrap(apiClient.post(endpoint(`${encodeURIComponent(templateKey)}/send-test/`), { test_email: testEmail }));

export const resetEmailTemplate = (templateKey) =>
  unwrap(apiClient.post(endpoint(`${encodeURIComponent(templateKey)}/reset/`)));
