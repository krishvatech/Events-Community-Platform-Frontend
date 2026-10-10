// src/lib/imprintSections.js
// Splits the Imprint StandardPage body (sanitised Wagtail rich text) into one block per <h2>,
// so each heading (Switzerland, Austria, Singapore, or whatever editors add) is shown as its own
// card. The regional details themselves stay in Wagtail; nothing about them is in the frontend.
//
// Returns { introHtml, sections: [{ id, headingHtml, bodyHtml }] }, or null when the body has no
// <h2> or an empty one (the page then renders as an ordinary article). `headingHtml` keeps the
// heading's character references but none of its tags.

export const IMPRINT_SLUG = "imprint";

const H2 = /<h2\b[^>]*>([\s\S]*?)<\/h2>/gi;

const stripTags = (html) => html.replace(/<[^>]*>/g, "");

// "Switzerland" -> "switzerland": readable ids for links such as /imprint#austria.
const slugify = (html) =>
  stripTags(html)
    .replace(/&[a-z0-9#]+;/gi, " ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");

export function splitImprintSections(html) {
  if (typeof html !== "string") return null;
  const headings = [...html.matchAll(H2)];
  if (!headings.length) return null;

  const used = new Set();
  const sections = headings.map((match, index) => {
    const start = match.index + match[0].length;
    const end = index + 1 < headings.length ? headings[index + 1].index : html.length;
    const base = slugify(match[1]) || `section-${index + 1}`;
    let id = base;
    for (let n = 2; used.has(id); n += 1) id = `${base}-${n}`;
    used.add(id);
    return { id, headingHtml: stripTags(match[1]).trim(), bodyHtml: html.slice(start, end).trim() };
  });

  // An empty heading cannot label a card; render the page unchanged rather than drop content.
  if (sections.some((section) => !section.headingHtml)) return null;

  return { introHtml: html.slice(0, headings[0].index).trim(), sections };
}
