// src/lib/legalSections.js
// Section navigation for long legal StandardPages (currently Terms and Conditions). The body
// stays exactly as edited in Wagtail; every <h2> only gains an id so the page's table of
// contents and shared links (#section-4) can point at it.
//
// Returns { html, sections: [{ id, labelHtml }] }, or null when the body has fewer than
// MIN_SECTIONS headings (a short page needs no contents list). `labelHtml` is the heading
// without its tags (character references kept), so it is safe to render as link text.

export const LEGAL_TOC_SLUGS = Object.freeze(["terms-and-conditions"]);
const MIN_SECTIONS = 3;

const H2 = /<h2\b([^>]*)>([\s\S]*?)<\/h2>/gi;

const stripTags = (html) => html.replace(/<[^>]*>/g, "");

const slugify = (text) =>
  text
    .replace(/&[a-z0-9#]+;/gi, " ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");

// "SECTION 4 – CANCELLATION OF PARTICIPATION" -> "section-4"; other headings use their text.
const baseId = (label, index) => {
  const numbered = /^\s*section\s+(\d+)\b/i.exec(label);
  if (numbered) return `section-${numbered[1]}`;
  return slugify(label) || `section-${index + 1}`;
};

export function addLegalSectionAnchors(html) {
  if (typeof html !== "string") return null;
  const used = new Set();
  const sections = [];

  const anchored = html.replace(H2, (match, attrs, inner) => {
    const labelHtml = stripTags(inner).replace(/\s+/g, " ").trim();
    if (!labelHtml) return match;
    // A heading that already carries an id keeps it (and is linked by it).
    const existing = /\bid="([^"]+)"/i.exec(attrs);
    let id = existing ? existing[1] : baseId(labelHtml, sections.length);
    if (!existing) {
      for (let n = 2; used.has(id); n += 1) id = `${baseId(labelHtml, sections.length)}-${n}`;
    }
    used.add(id);
    sections.push({ id, labelHtml });
    return existing ? match : `<h2 id="${id}"${attrs}>${inner}</h2>`;
  });

  return sections.length >= MIN_SECTIONS ? { html: anchored, sections } : null;
}
