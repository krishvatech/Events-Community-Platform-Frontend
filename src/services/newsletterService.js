import { apiClient } from "../utils/api";

const endpoint = () => "/newsletter/preferences/";

const unwrap = (promise) => promise.then((res) => res.data);

export const getNewsletterPreferences = () => unwrap(apiClient.get(endpoint()));

export const updateNewsletterPreferences = (preferences) =>
  unwrap(apiClient.patch(endpoint(), { preferences }));
