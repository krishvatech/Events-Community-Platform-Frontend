// src/lib/migratedLinks.js
// Links to imaa-institute.org pages that this website now serves itself.
//
// Content migrated from WordPress (CMS buttons, card links, rich text) and a few constants still
// point at the WordPress copy of pages that exist here (e.g. https://imaa-institute.org/contact-us/).
// `siteHref` maps such a link to the internal route, but only for an exact page match and only
// where that route is switched on. Everything else is returned unchanged: pages that are not
// migrated (trainings, faculty bios, single testimonials, book-a-demo, ...) keep their
// imaa-institute.org address, and a route that is not enabled yet keeps its WordPress fallback,
// so a link never leads to a missing page.
//
// Used by the server-rendered public pages (src/app/(site)), which exist only in the Next.js build,
// so the CMS routes are available there. Deliberately free of the "#navigation" adapter (as these
// views always were); the switches follow the same rule and build variables as
// src/lib/ourTeamRoute.js and src/lib/publicSectionRoutes.js. The literal process.env reads are
// required for Next.js to inline the values.

const FLAGS = {
  ourTeam: process.env.NEXT_PUBLIC_OUR_TEAM_ROUTE,
  testimonials: process.env.NEXT_PUBLIC_TESTIMONIALS_ROUTE,
  contact: process.env.NEXT_PUBLIC_CONTACT_ROUTE,
  news: process.env.NEXT_PUBLIC_IN_THE_NEWS_ROUTE,
  publications: process.env.NEXT_PUBLIC_PUBLICATIONS_ROUTE,
};

// Development: on unless "disabled"; production builds: off until "enabled" (as ourTeamRouteEnabled).
export function flagEnabled(flag, nodeEnv = process.env.NODE_ENV) {
  if (flag === "enabled") return true;
  if (flag === "disabled") return false;
  return nodeEnv !== "production";
}

const WORDPRESS_PAGE = /^https?:\/\/(?:www\.)?imaa-institute\.org(\/[a-z0-9-]*)\/?(#[\w-]*)?$/i;
const STANDARD_PAGES = ["frequently-asked-questions", "references", "terms-and-conditions", "privacy-policy", "imprint"];

/** WordPress page path ("/contact-us") -> internal route, for the routes switched on in this build. */
export function migratedRoutes(cmsRoutes = true, flags = FLAGS, nodeEnv = process.env.NODE_ENV) {
  if (!cmsRoutes) return {};
  const on = (name) => flagEnabled(flags[name], nodeEnv);
  const routes = {
    "/about": "/about",
    "/about-us": "/about",
    "/our-team": on("ourTeam") && "/our-team",
    "/testimonials": on("testimonials") && "/testimonials",
    "/contact-us": on("contact") && "/contact-us",
    "/in-the-news": on("news") && "/in-the-news",
    "/publications": on("publications") && "/publications",
  };
  for (const slug of STANDARD_PAGES) routes[`/${slug}`] = `/${slug}`;
  // Only switched-on routes count; any other link stays as it is.
  return Object.fromEntries(Object.entries(routes).filter(([, to]) => typeof to === "string"));
}

/** The internal route for a link to a migrated imaa-institute.org page, else the link unchanged. */
export function siteHref(url, routes = migratedRoutes()) {
  if (typeof url !== "string") return url;
  const match = WORDPRESS_PAGE.exec(url.trim());
  if (!match) return url;
  const to = routes[match[1].toLowerCase()];
  return to ? `${to}${match[2] || ""}` : url;
}

/** Rich text: rewrite href="..." values that point at migrated imaa-institute.org pages. */
export function rewriteMigratedLinks(html, routes = migratedRoutes()) {
  if (typeof html !== "string" || !/imaa-institute\.org/i.test(html)) return html;
  return html.replace(/href="([^"]*)"/g, (whole, url) => {
    const to = siteHref(url.replace(/&amp;/g, "&"), routes);
    return to === url.replace(/&amp;/g, "&") ? whole : `href="${to}"`;
  });
}
