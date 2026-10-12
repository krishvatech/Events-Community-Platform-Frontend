// src/lib/publicTeam.server.js
// Server-side loader for the Our Team page (Server Components only). Reads the published TeamPage
// from the backend's public by-path endpoint without credentials; see ./publicTeamResponse.js.
import { cache } from "react";
import { cmsApiBaseUrl } from "./publicSite";
import { PublicCmsUnavailableError } from "./publicCmsResponse";
import { TEAM_PAGE_PATH, readTeamPageResponse } from "./publicTeamResponse";

/** The published TeamPage at /our-team/, or null for HTTP 404. */
export const loadPublicTeamPage = cache(async () => {
  const url = `${cmsApiBaseUrl()}/cms/public/pages/by-path/?path=${encodeURIComponent(TEAM_PAGE_PATH)}`;
  let response;
  try {
    // Always fresh: an unpublished page or a hidden person must stop rendering immediately.
    response = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } });
  } catch (error) {
    throw new PublicCmsUnavailableError(`CMS request failed: ${error?.message || error}`);
  }
  const result = await readTeamPageResponse(response, TEAM_PAGE_PATH);
  return result.status === "found" ? result.page : null;
});
