// src/lib/faqSections.js
// Splits the FAQ StandardPage body (sanitised Wagtail rich text, see StandardPageArticle.jsx)
// into accordion items: every <h2> is a question and everything up to the next <h2> is its
// answer. Editors keep authoring the page in Wagtail as plain headings and paragraphs; nothing
// about the questions is stored in the frontend.
//
// Returns { introHtml, items: [{ id, questionHtml, answerHtml }] }, or null when the body has
// no <h2> or an empty one (the page then renders as an ordinary article). `questionHtml` keeps the heading's
// character references but none of its tags, so it is safe inside the toggle <button>.

export const FAQ_SLUG = "frequently-asked-questions";

// The WordPress FAQ ends with a "Contact Us" form. Connect has no contact-submission API, so the
// FAQ links to the working form on imaa-institute.org, the same target as the footer's "Contact us".
export const FAQ_CONTACT_URL = "https://imaa-institute.org/contact-us/";

const H2 = /<h2\b[^>]*>([\s\S]*?)<\/h2>/gi;

const stripTags = (html) => html.replace(/<[^>]*>/g, "");

// "What is the M&amp;A training program?" -> "what-is-the-m-a-training-program"
const slugify = (html) =>
  stripTags(html)
    .replace(/&[a-z0-9#]+;/gi, " ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");

export function splitFaqSections(html) {
  if (typeof html !== "string") return null;
  const headings = [...html.matchAll(H2)];
  if (!headings.length) return null;

  const usedIds = new Set();
  const items = headings.map((match, index) => {
    const start = match.index + match[0].length;
    const end = index + 1 < headings.length ? headings[index + 1].index : html.length;
    const questionHtml = stripTags(match[1]).trim();

    // Stable, readable ids so a question can be linked to (#faq-what-is-imaa).
    const base = `faq-${slugify(match[1]) || index + 1}`;
    let id = base;
    for (let n = 2; usedIds.has(id); n += 1) id = `${base}-${n}`;
    usedIds.add(id);

    return { id, questionHtml, answerHtml: html.slice(start, end).trim() };
  });

  // An empty heading cannot label a toggle; render the page unchanged rather than drop content.
  if (items.some((item) => !item.questionHtml)) return null;

  return { introHtml: html.slice(0, headings[0].index).trim(), items };
}
