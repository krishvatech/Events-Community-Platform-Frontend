// src/lib/legalSections.js
// Section navigation for long legal StandardPages (Terms and Conditions, Privacy Policy). The
// body stays exactly as edited in Wagtail; section headings only gain an id (and, below h2, a
// data-legal-section marker for styling) so the page's table of contents and shared links
// (#section-4) can point at them.
//
// Sections are the body's top-level headings: <h2> when it has any, otherwise <h3>, otherwise
// <h4> (the Privacy Policy keeps WordPress's <h4> section headings). Below h2, a paragraph that
// contains only bold text starting with a section number ("<p><b>1. Who we are</b></p>", how the
// Privacy Policy's first section heading was saved in Wagtail) also starts a section.
//
// Returns { html, level, sections: [{ id, labelHtml }] }, or null when the body has fewer than
// MIN_SECTIONS sections (a short page needs no contents list). `labelHtml` is the heading
// without its tags (character references kept), so it is safe to render as link text.

export const LEGAL_TOC_SLUGS = Object.freeze(["terms-and-conditions", "privacy-policy"]);
const MIN_SECTIONS = 3;
const LEVELS = ["h2", "h3", "h4"];

const headingRe = (tag) => new RegExp(`<${tag}\\b([^>]*)>([\\s\\S]*?)<\\/${tag}>`, "gi");
// A paragraph whose whole content is one bold run that starts with "<number>. ".
const NUMBERED_BOLD_P = /<p\b([^>]*)>(\s*<(?:b|strong)\b[^>]*>\s*\d+\.\s[^<]*<\/(?:b|strong)>\s*)<\/p>/gi;

const stripTags = (html) => html.replace(/<[^>]*>/g, "");
const labelOf = (inner) => stripTags(inner).replace(/\s+/g, " ").trim();

const slugify = (text) =>
  text
    .replace(/&[a-z0-9#]+;/gi, " ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");

// "SECTION 4 – CANCELLATION …" and "4. Disclosure of …" -> "section-4"; other headings use their text.
const baseId = (label, index) => {
  const numbered = /^\s*section\s+(\d+)\b/i.exec(label) || /^\s*(\d+)\.\s/.exec(label);
  if (numbered) return `section-${numbered[1]}`;
  return slugify(label) || `section-${index + 1}`;
};

const topLevel = (html) => LEVELS.find((tag) => [...html.matchAll(headingRe(tag))].some((m) => labelOf(m[2])));

export function addLegalSectionAnchors(html) {
  if (typeof html !== "string") return null;
  const level = topLevel(html);
  if (!level) return null;

  const used = new Set();
  const sections = [];
  const marker = level === "h2" ? "" : " data-legal-section=\"\"";

  const anchor = (tag, match, attrs, inner) => {
    const labelHtml = labelOf(inner);
    if (!labelHtml) return match;
    // An element that already carries an id keeps it (and is linked by it).
    const existing = /\bid="([^"]+)"/i.exec(attrs);
    let id = existing ? existing[1] : baseId(labelHtml, sections.length);
    if (!existing) {
      for (let n = 2; used.has(id); n += 1) id = `${baseId(labelHtml, sections.length)}-${n}`;
    }
    used.add(id);
    sections.push({ id, labelHtml });
    if (existing) return marker ? match.replace(`<${tag}`, `<${tag}${marker}`) : match;
    return `<${tag} id="${id}"${marker}${attrs}>${inner}</${tag}>`;
  };

  // One pass over section headings (and, below h2, numbered bold paragraphs) in document order.
  const pattern =
    level === "h2"
      ? headingRe("h2")
      : new RegExp(`${headingRe(level).source}|${NUMBERED_BOLD_P.source}`, "gi");
  const anchored = html.replace(pattern, (match, hAttrs, hInner, pAttrs, pInner) =>
    hInner !== undefined ? anchor(level, match, hAttrs, hInner) : anchor("p", match, pAttrs, pInner)
  );

  return sections.length >= MIN_SECTIONS ? { html: anchored, level, sections } : null;
}
