// src/utils/blogAccess.js
//
// Blog-specific management permission, matching the backend Blog APIs
// (Django is_superuser only). Deliberately separate from isOwnerUser /
// RequireSuperAdmin, which also admit the Cognito platform_admin group for
// other platform areas and must stay unchanged.

import { getBackendUserFromStorage } from "./adminRole";
import { canManageBlogsFor } from "../config/blogNavigation";

export const canManageBlogs = () => canManageBlogsFor(getBackendUserFromStorage());
