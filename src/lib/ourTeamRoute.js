// src/lib/ourTeamRoute.js
// Where "Our Team" links point (public header, mobile menu, footer).
//
// The /our-team route needs its CMS content (cms.TeamPage, imported with import_team_page) on the
// backend the build talks to; until then it is a 404. So links use the Connect route only when it
// is switched on, and the page on imaa-institute.org otherwise — no build ever links to a 404:
// * development: on, unless NEXT_PUBLIC_OUR_TEAM_ROUTE=disabled;
// * production builds (staging/production on Amplify): off until NEXT_PUBLIC_OUR_TEAM_ROUTE=enabled
//   is set, after the Team content is imported and published on that environment's backend.
// The literal process.env reads are required for Next.js to inline the value into client bundles.
import { PUBLIC_CMS_ROUTES_AVAILABLE } from "#navigation";

export const OUR_TEAM_PATH = "/our-team";
export const OUR_TEAM_WORDPRESS_URL = "https://imaa-institute.org/our-team/";

export function ourTeamRouteEnabled(flag = process.env.NEXT_PUBLIC_OUR_TEAM_ROUTE, nodeEnv = process.env.NODE_ENV) {
  if (flag === "enabled") return true;
  if (flag === "disabled") return false;
  return nodeEnv !== "production";
}

export function ourTeamHref(enabled = PUBLIC_CMS_ROUTES_AVAILABLE && ourTeamRouteEnabled()) {
  return enabled ? OUR_TEAM_PATH : OUR_TEAM_WORDPRESS_URL;
}
