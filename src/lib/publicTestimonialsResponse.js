// src/lib/publicTestimonialsResponse.js
// Pure response handling for the Testimonials and Contact Us pages (src/app/(site)/testimonials,
// src/app/(site)/contact-us). No React or Next.js imports: shared by the server loader
// (publicBatch3.server.js) and the node:test unit tests.
//
// Same strictness as the About and Our Team pages: a published page renders as it is; any 404 is a
// real 404; network failures, throttling, 5xx and malformed responses are errors. The backend
// (cms/batch3_api.py) already sanitises rich text, drops unsafe links and lists only public
// testimonials with a quote; the rules are applied again so the renderer only receives safe values.
import { PublicCmsUnavailableError } from "./publicCmsResponse.js";
import { parseImage, parseSections, parseText } from "./publicAboutResponse.js";

export const TESTIMONIALS_PAGE_PATH = "/testimonials/";
export const CONTACT_PAGE_PATH = "/contact-us/";

const isPlainObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const list = (value) => (Array.isArray(value) ? value.filter(isPlainObject) : []);
const text = parseText;
const hasHtmlText = (html) => text(html).replace(/<[^>]*>|&nbsp;|\s/g, "") !== "";

/**
 * Read a by-path response that must be a published page of `type`.
 * @returns {Promise<{status: "found", data: object} | {status: "not_found"}>}
 */
export async function readCmsPageOfType(response, type) {
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
  return data.type === type ? { status: "found", data } : { status: "not_found" };
}

const common = (data, path) => ({
  title: data.title,
  slug: text(data.slug),
  type: data.type,
  path: text(data.path) || path,
  hero_title: text(data.hero_title),
  hero_intro: text(data.hero_intro),
  sections: parseSections(data.sections),
  seo_title: text(data.seo_title),
  search_description: text(data.search_description),
});

// -- Testimonials ---------------------------------------------------------------------------------

const SLUG = /^[a-z0-9-]+$/;

function programmes(value) {
  const seen = new Set();
  return list(value)
    .map((p) => ({ code: text(p.code).trim(), slug: text(p.slug).trim() }))
    .filter((p) => p.code && SLUG.test(p.slug) && !seen.has(p.slug) && seen.add(p.slug));
}

function testimonials(value, programmeSlugs) {
  const seen = new Set();
  return list(value)
    .map((t) => ({
      slug: text(t.slug).trim(),
      name: text(t.name).trim(),
      role: text(t.role).trim(),
      company: text(t.company).trim(),
      programme: text(t.programme).trim(),
      programmes: Array.isArray(t.programmes) ? [...new Set(t.programmes.filter((slug) => programmeSlugs.has(slug)))] : [],
      quote_html: text(t.quote_html),
      photo: parseImage(t.photo, text(t.name).trim()),
    }))
    // A testimonial is its quote: entries without one are never shown (the backend hides them too).
    .filter((t) => t.slug && t.name && hasHtmlText(t.quote_html) && !seen.has(t.slug) && seen.add(t.slug));
}

/** GET /api/cms/public/pages/by-path/?path=/testimonials/ */
export async function readTestimonialsPageResponse(response, path = TESTIMONIALS_PAGE_PATH) {
  const result = await readCmsPageOfType(response, "TestimonialsPage");
  if (result.status !== "found") return result;
  const { data } = result;
  const filters = programmes(data.programmes);
  const items = testimonials(data.testimonials, new Set(filters.map((p) => p.slug)));
  // Only programmes that at least one shown testimonial belongs to are offered as filters.
  const used = new Set(items.flatMap((t) => t.programmes));
  return {
    status: "found",
    page: { ...common(data, path), programmes: filters.filter((p) => used.has(p.slug)), testimonials: items },
  };
}

// -- Contact Us -----------------------------------------------------------------------------------

function stats(value) {
  return list(value)
    .map((stat) => ({ value: text(stat.value).trim(), label: text(stat.label).trim() }))
    .filter((stat) => stat.value && stat.label)
    .slice(0, 4);
}

const positiveInt = (value, fallback) => (Number.isInteger(value) && value > 0 ? value : fallback);
const DEFAULT_LIMITS = { first_name: 100, last_name: 100, email: 254, phone: 40, message: 2000 };

function form(value) {
  if (!isPlainObject(value)) return { enabled: false, countries: [], max_lengths: { ...DEFAULT_LIMITS }, token: "" };
  const countries = Array.isArray(value.countries) ? [...new Set(value.countries.filter((c) => typeof c === "string" && c.trim()))] : [];
  const limits = isPlainObject(value.max_lengths) ? value.max_lengths : {};
  const token = text(value.token).trim();
  return {
    // The form is offered only when the backend can deliver it and the page has what it needs.
    enabled: value.enabled === true && countries.length > 0 && token !== "",
    countries,
    max_lengths: Object.fromEntries(Object.entries(DEFAULT_LIMITS).map(([key, fallback]) => [key, positiveInt(limits[key], fallback)])),
    token,
  };
}

/** GET /api/cms/public/pages/by-path/?path=/contact-us/ */
export async function readContactPageResponse(response, path = CONTACT_PAGE_PATH) {
  const result = await readCmsPageOfType(response, "ContactPage");
  if (result.status !== "found") return result;
  const { data } = result;
  const contactForm = form(data.form);
  // The visitor must agree to a stated consent text; without one the form is not offered.
  if (!hasHtmlText(data.consent_html)) contactForm.enabled = false;
  return {
    status: "found",
    page: {
      ...common(data, path),
      form_heading: text(data.form_heading),
      form_intro_html: text(data.form_intro_html),
      consent_html: text(data.consent_html),
      success_message: text(data.success_message).trim(),
      form_image: parseImage(data.form_image),
      stats: stats(data.stats),
      form: contactForm,
    },
  };
}
