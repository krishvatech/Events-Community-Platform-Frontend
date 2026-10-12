// src/lib/publicTeamResponse.js
// Pure response handling for the server-rendered Our Team page (src/app/(site)/our-team).
// No React or Next.js imports, so it is shared by the server loader (publicTeam.server.js) and
// its node:test unit tests.
//
// Same strictness as the About page: a published TeamPage renders as it is; any 404 is a real
// 404; network failures, throttling, 5xx and malformed responses are errors. The backend
// (cms/team_page_api.py) already sanitises rich text and drops unsafe links; the rules are
// applied again here so the renderer only receives well-formed, safe values.
import { PublicCmsUnavailableError } from "./publicCmsResponse.js";
import { parseImage, parseLink, parseSafeUrl, parseSections, parseText } from "./publicAboutResponse.js";

export const TEAM_PAGE_PATH = "/our-team/";

const isPlainObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const list = (value) => (Array.isArray(value) ? value.filter(isPlainObject) : []);
const text = parseText;

function programmes(value) {
  const seen = new Set();
  return list(value)
    .map((p) => ({ code: text(p.code).trim(), slug: text(p.slug).trim() }))
    .filter((p) => p.code && /^[a-z0-9-]+$/.test(p.slug) && !seen.has(p.slug) && seen.add(p.slug));
}

function people(value, programmeSlugs) {
  const seen = new Set();
  return list(value)
    .map((m) => {
      const linkedin = parseSafeUrl(m.linkedin_url);
      return {
        slug: text(m.slug).trim(),
        name: text(m.name).trim(),
        position: text(m.position).trim(),
        summary: text(m.summary).trim(),
        location: text(m.location).trim(),
        linkedin_url: linkedin.startsWith("https://") ? linkedin : "",
        // A web page (absolute https?:// or a site path); never mailto:/tel:.
        profile_url: /^(https?:\/\/|\/)/i.test(parseSafeUrl(m.profile_url)) ? parseSafeUrl(m.profile_url) : "",
        programmes: Array.isArray(m.programmes) ? m.programmes.filter((slug) => programmeSlugs.has(slug)) : [],
        photo: parseImage(m.photo, text(m.name)),
      };
    })
    .filter((m) => m.name && m.slug && !seen.has(m.slug) && seen.add(m.slug));
}

const buttons = (value) => (Array.isArray(value) ? value.map(parseLink).filter(Boolean) : []);

/**
 * Interpret a fetch Response from GET /api/cms/public/pages/by-path/?path=/our-team/
 *
 * @returns {Promise<{status: "found", page: object} | {status: "not_found"}>}
 * @throws {PublicCmsUnavailableError} for every response that is not a recognisable answer.
 */
export async function readTeamPageResponse(response, path = TEAM_PAGE_PATH) {
  const { status } = response;
  if (status !== 200 && status !== 404) {
    throw new PublicCmsUnavailableError(`CMS responded with HTTP ${status}`, { status });
  }
  let data;
  try {
    data = await response.json();
  } catch {
    throw new PublicCmsUnavailableError(`CMS returned a non-JSON HTTP ${status} response`, { status });
  }
  if (status === 404) {
    if (!isPlainObject(data) || typeof data.detail !== "string") {
      throw new PublicCmsUnavailableError("CMS returned an unrecognised 404 response", { status });
    }
    return { status: "not_found" };
  }
  if (!isPlainObject(data) || typeof data.title !== "string" || !data.title.trim() || typeof data.type !== "string") {
    throw new PublicCmsUnavailableError("CMS returned a malformed page", { status });
  }
  if (data.type !== "TeamPage") return { status: "not_found" };

  const filters = programmes(data.programmes);
  const slugs = new Set(filters.map((p) => p.slug));
  return {
    status: "found",
    page: {
      title: data.title,
      slug: text(data.slug),
      type: data.type,
      path: text(data.path) || path,
      hero_title: text(data.hero_title),
      hero_intro: text(data.hero_intro),
      hero_button: parseLink(data.hero_button),
      faculty_heading: text(data.faculty_heading),
      faculty_subheading: text(data.faculty_subheading),
      faculty_intro_html: text(data.faculty_intro_html),
      faculty_buttons: buttons(data.faculty_buttons),
      staff_heading: text(data.staff_heading),
      staff_subheading: text(data.staff_subheading),
      staff_intro_html: text(data.staff_intro_html),
      staff_button: parseLink(data.staff_button),
      programmes: filters,
      faculty: people(data.faculty, slugs),
      staff: people(data.staff, slugs),
      advisory: people(data.advisory, slugs),
      sections: parseSections(data.sections),
      seo_title: text(data.seo_title),
      search_description: text(data.search_description),
    },
  };
}
