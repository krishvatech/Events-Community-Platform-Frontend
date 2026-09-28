// src/services/blogApi.js
//
// Blog service bound to the shared authenticated axios client. Token handling,
// refresh and secure-session behaviour all come from `apiClient`.

import { apiClient, listAdminUsers } from "../utils/api";
import { BlogApiError, createBlogService, normalizeBlogError } from "./blogService";

const blogApi = createBlogService(apiClient);

/**
 * Author picker search for the superuser-only Blog editor. Reuses the existing
 * superuser-readable admin users endpoint and keeps only display fields.
 */
blogApi.searchBlogAuthors = async (search) => {
  try {
    const data = await listAdminUsers({ search: (search || "").trim(), limit: 10 });
    const rows = Array.isArray(data) ? data : data?.results || [];
    return rows.map((user) => ({
      id: user.id,
      full_name:
        `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
        user.profile?.full_name ||
        user.username ||
        `User #${user.id}`,
      email: user.email || "",
    }));
  } catch (error) {
    throw new BlogApiError(normalizeBlogError(error));
  }
};

export default blogApi;
