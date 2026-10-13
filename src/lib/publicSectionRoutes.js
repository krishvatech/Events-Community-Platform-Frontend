// src/lib/publicSectionRoutes.js
// Where the links to the Batch 3 public pages point (public header, mobile menu, footer):
// Testimonials, Contact Us, In The News and M&A Publications.
//
// Same rule as Our Team (src/lib/ourTeamRoute.js): each route needs its content on the backend the
// build talks to (TestimonialsPage / ContactPage from import_batch3_content; the News and
// Publications articles from import_wordpress_section). Until a route is switched on, its links keep
// pointing at the page on imaa-institute.org, so no build links to an empty or missing page:
// * development: on, unless NEXT_PUBLIC_<NAME>_ROUTE=disabled;
// * production builds: off until NEXT_PUBLIC_<NAME>_ROUTE=enabled is set, after that content is
//   imported and published on that environment's backend.
// The literal process.env reads are required for Next.js to inline the values into client bundles.
import { PUBLIC_CMS_ROUTES_AVAILABLE } from "#navigation";
import { ourTeamRouteEnabled as routeFlagEnabled } from "./ourTeamRoute.js";

export const PUBLIC_SECTION_ROUTES = Object.freeze({
  testimonials: { path: "/testimonials", wordpress: "https://imaa-institute.org/testimonials/" },
  contact: { path: "/contact-us", wordpress: "https://imaa-institute.org/contact-us/" },
  news: { path: "/in-the-news", wordpress: "https://imaa-institute.org/in-the-news/" },
  publications: { path: "/publications", wordpress: "https://imaa-institute.org/publications/" },
});

const FLAGS = {
  testimonials: process.env.NEXT_PUBLIC_TESTIMONIALS_ROUTE,
  contact: process.env.NEXT_PUBLIC_CONTACT_ROUTE,
  news: process.env.NEXT_PUBLIC_IN_THE_NEWS_ROUTE,
  publications: process.env.NEXT_PUBLIC_PUBLICATIONS_ROUTE,
};

export function publicSectionRouteEnabled(name, flag = FLAGS[name], nodeEnv = process.env.NODE_ENV) {
  return routeFlagEnabled(flag, nodeEnv);
}

/** The Connect route when it is available and switched on, the imaa-institute.org page otherwise. */
export function publicSectionHref(name, enabled = PUBLIC_CMS_ROUTES_AVAILABLE && publicSectionRouteEnabled(name)) {
  const route = PUBLIC_SECTION_ROUTES[name];
  return enabled ? route.path : route.wordpress;
}
