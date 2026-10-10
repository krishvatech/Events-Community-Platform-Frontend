// src/lib/publicAboutResponse.js
// Pure response handling for the server-rendered About page (src/app/(site)/about).
// No React, Next.js or JSON imports, so it is shared by the server loader
// (publicAbout.server.js) and its node:test unit tests.
//
// Same strictness as publicCmsResponse.js, without defaults (About has no approved default
// content): a published AboutPage renders as it is; any 404 is a real 404; network failures,
// throttling, 5xx and malformed responses are errors (PublicCmsUnavailableError).
//
// The backend (cms/about_page_api.py) already sanitises rich text and drops unsafe links; the
// rules are applied again here so the renderer only ever receives well-formed, safe values.
import { PublicCmsUnavailableError } from "./publicCmsResponse.js";

// Paths the About route accepts, in order: the same candidates the client page used
// (slugs "about", "about-us", "aboutus" directly under the Site's HomePage).
export const ABOUT_PAGE_PATHS = Object.freeze(["/about/", "/about-us/", "/aboutus/"]);

const SAFE_URL = /^(https?:\/\/\S+|mailto:\S+|tel:\+?[0-9][0-9 ()./-]*|\/(?!\/)\S*)$/i;
const SECTION_TYPES = new Set(["accordion", "cta_band", "card_group", "testimonials", "logo_strip", "contact_callout", "offices"]);

const isPlainObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const text = (value) => (typeof value === "string" ? value : "");
const list = (value) => (Array.isArray(value) ? value.filter(isPlainObject) : []);
// Images come from the Wagtail rendition API as absolute URLs; anything else is dropped.
const imageUrl = (value) => (typeof value === "string" && /^https?:\/\//i.test(value) ? value : "");
const safeUrl = (value) => (typeof value === "string" && SAFE_URL.test(value.trim()) ? value.trim() : "");
const positive = (value) => (Number.isInteger(value) && value > 0 ? value : null);
const hasHtmlText = (html) => text(html).replace(/<[^>]*>|&nbsp;|\s/g, "") !== "";

function image(value, fallbackAlt = "") {
  if (!isPlainObject(value)) return null;
  const url = imageUrl(value.url);
  if (!url) return null;
  return { url, width: positive(value.width), height: positive(value.height), alt: text(value.alt) || fallbackAlt };
}

function link(value) {
  if (!isPlainObject(value)) return null;
  const label = text(value.label).trim();
  const url = safeUrl(value.url);
  return label && url ? { label, url } : null;
}

const email = (value) => (typeof value === "string" && /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(value.trim()) ? value.trim() : "");

const SECTION_PARSERS = {
  accordion: (s) => {
    const items = list(s.items)
      .map((item) => ({ title: text(item.title).trim(), body_html: text(item.body_html), logo: image(item.logo) }))
      .filter((item) => item.title);
    return items.length ? { heading: text(s.heading), image: image(s.image), items } : null;
  },
  cta_band: (s) =>
    hasHtmlText(s.text_html)
      ? { text_html: text(s.text_html), logos: list(s.logos).map((logo) => image(logo)).filter(Boolean), button: link(s.button) }
      : null,
  card_group: (s) => {
    const cards = list(s.cards)
      .map((card) => ({
        title: text(card.title).trim(),
        text: text(card.text).trim(),
        icon: text(card.icon),
        image: image(card.image),
        link: link(card.link),
      }))
      .filter((card) => card.title);
    if (!cards.length) return null;
    return {
      heading: text(s.heading),
      layout: s.layout === "carousel" ? "carousel" : "grid",
      cards,
      prompt: text(s.prompt).trim(),
      button: link(s.button),
    };
  },
  testimonials: (s) => {
    const items = list(s.items)
      .map((item) => ({
        name: text(item.name).trim(),
        role: text(item.role).trim(),
        company: text(item.company).trim(),
        programme: text(item.programme).trim(),
        quote_html: text(item.quote_html),
        photo: image(item.photo, text(item.name)),
        url: safeUrl(item.url),
      }))
      .filter((item) => item.name && hasHtmlText(item.quote_html));
    return items.length ? { heading: text(s.heading), items, button: link(s.button) } : null;
  },
  logo_strip: (s) => {
    const logos = list(s.logos).map((logo) => image(logo)).filter(Boolean);
    return logos.length ? { heading: text(s.heading), logos, button: link(s.button) } : null;
  },
  contact_callout: (s) => {
    const address = email(s.email);
    if (!hasHtmlText(s.text_html) && !address) return null;
    return { heading: text(s.heading), text_html: text(s.text_html), email: address, button_label: address ? text(s.button_label).trim() : "" };
  },
  offices: (s) => {
    const offices = list(s.offices)
      .map((office) => ({
        city: text(office.city).trim(),
        country: text(office.country).trim(),
        phone: text(office.phone).trim(),
        phone_href: /^tel:\+?[0-9]{4,}$/.test(text(office.phone_href)) ? office.phone_href : "",
        image: image(office.image),
      }))
      .filter((office) => office.city);
    const address = email(s.email);
    return offices.length || address ? { heading: text(s.heading), email: address, offices } : null;
  },
};

function sections(value) {
  return list(value)
    .filter((section) => SECTION_TYPES.has(section.type))
    .map((section, index) => {
      const parsed = SECTION_PARSERS[section.type](section);
      return parsed ? { type: section.type, id: text(section.id) || `${section.type}-${index}`, ...parsed } : null;
    })
    .filter(Boolean);
}

function features(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isPlainObject)
    .map((item) => ({ title: text(item.title).trim(), desc: text(item.desc).trim(), image_url: imageUrl(item.image_url) }))
    .filter((item) => item.title || item.desc);
}

function stats(value) {
  return list(value)
    .map((stat) => ({ value: text(stat.value).trim(), label: text(stat.label).trim() }))
    .filter((stat) => stat.value && stat.label)
    .slice(0, 4);
}

/**
 * Interpret a fetch Response from GET /api/cms/public/pages/by-path/?path=/about/
 *
 * @returns {Promise<{status: "found", page: object} | {status: "not_found"}>}
 * @throws {PublicCmsUnavailableError} for every response that is not a recognisable answer.
 */
export async function readAboutPageResponse(response, path) {
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
  // Another page type at the path is content this renderer cannot show: a 404.
  if (data.type !== "AboutPage") return { status: "not_found" };

  // Only the fields the About renderer needs. Rich-text fields arrive sanitised by the
  // backend's public endpoint (cms/public_pages.py) and are rendered as they are.
  return {
    status: "found",
    page: {
      title: data.title,
      slug: text(data.slug),
      type: data.type,
      path: text(data.path) || path,
      hero_title: text(data.hero_title),
      hero_subtitle: text(data.hero_subtitle),
      // The hero banner: shared as the page's social image (the About hero itself is flat navy).
      hero_image: image(data.hero_image) || (imageUrl(data.hero_image_url) ? { url: imageUrl(data.hero_image_url), width: null, height: null, alt: "" } : null),
      intro_html: text(data.intro_html),
      intro_image: image(data.intro_image),
      stats: stats(data.stats),
      features_title: text(data.features_title),
      features: features(data.features),
      mission_title: text(data.mission_title),
      mission_html: text(data.mission_html),
      sections: sections(data.sections),
      seo_title: text(data.seo_title),
      search_description: text(data.search_description),
    },
  };
}
