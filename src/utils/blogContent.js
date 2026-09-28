// src/utils/blogContent.js
//
// Rendering helpers for Blog posts.
//
// SECURITY: `content_html` is authored by superusers today and will later be
// imported from WordPress. It is never rendered raw: `sanitizeBlogHtml` runs it
// through a dedicated DOMPurify instance (its hooks never touch other callers)
// with a strict profile: no scripts, frames, forms, embedded objects, inline
// styles or event-handler attributes, and only safe URL schemes.

import DOMPurify from "dompurify";
import dayjs from "dayjs";

const FORBID_TAGS = [
  "script", "style", "iframe", "frame", "frameset", "object", "embed", "applet",
  "form", "input", "button", "textarea", "select", "option", "link", "meta",
  "base", "template", "noscript", "svg", "math",
];

// Inline styles are dropped so article HTML cannot restyle or overlay the app.
const FORBID_ATTR = ["style"];

// Only content-oriented class names survive (WordPress block/alignment classes
// and our own). Arbitrary classes could otherwise pick up global app utility
// classes such as Tailwind's `fixed inset-0`.
const SAFE_CLASS = /^(wp-|has-|is-|align|size-|blog-)[a-z0-9_-]*$/i;

const configureInstance = (purifier) => {
  purifier.addHook("uponSanitizeAttribute", (node, data) => {
    if (data.attrName === "class") {
      const kept = String(data.attrValue || "")
        .split(/\s+/)
        .filter((token) => SAFE_CLASS.test(token));
      if (kept.length) {
        data.attrValue = kept.join(" ");
      } else {
        data.keepAttr = false;
      }
    }
  });

  purifier.addHook("afterSanitizeAttributes", (node) => {
    const tag = node.tagName?.toLowerCase();
    if (tag === "a" && node.hasAttribute("target")) {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer");
    }
    if (tag === "img") {
      node.setAttribute("loading", "lazy");
      node.setAttribute("decoding", "async");
      if (!node.hasAttribute("alt")) node.setAttribute("alt", "");
    }
  });

  return (html) =>
    purifier.sanitize(String(html || ""), {
      USE_PROFILES: { html: true },
      FORBID_TAGS,
      FORBID_ATTR,
      ADD_ATTR: ["target"],
      ALLOW_DATA_ATTR: false,
    });
};

/** Builds a sanitiser bound to a given window (a jsdom window in tests). */
export const createBlogSanitizer = (win) => configureInstance(DOMPurify(win));

let browserSanitizer = null;

/** Sanitises article HTML for rendering in the current browser window. */
export const sanitizeBlogHtml = (html) => {
  if (!browserSanitizer) {
    if (typeof window === "undefined") return "";
    browserSanitizer = createBlogSanitizer(window);
  }
  return browserSanitizer(html);
};

// Tags the visual editor can round-trip without losing structure.
const VISUAL_EDITOR_TAGS = new Set([
  "p", "h1", "h2", "h3", "h4", "h5", "h6", "strong", "b", "em", "i", "u", "s",
  "strike", "del", "a", "ul", "ol", "li", "blockquote", "br", "hr", "code", "pre",
]);

/**
 * True when HTML contains markup the visual editor would drop (images, tables,
 * figures, embeds, classes, inline styles...). Such content opens in HTML mode
 * so editing never silently strips it. Detection only; never used to sanitise.
 */
export const hasComplexBlogHtml = (html) => {
  const source = String(html || "");
  const tagPattern = /<\s*([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*)>/g;
  let match;
  while ((match = tagPattern.exec(source))) {
    if (!VISUAL_EDITOR_TAGS.has(match[1].toLowerCase())) return true;
    if (/\s(class|style|id)\s*=/i.test(match[2])) return true;
  }
  return false;
};

/** Display author: ECP author name, else the legacy (imported) author name. */
export const getBlogAuthorName = (post) =>
  (post?.author?.full_name || "").trim() || (post?.legacy_author_name || "").trim();

export const formatBlogDate = (iso) => {
  if (!iso) return "";
  const value = dayjs(iso);
  return value.isValid() ? value.format("MMMM D, YYYY") : "";
};

export const BLOG_STATUS = Object.freeze({
  draft: { label: "Draft", color: "default" },
  published: { label: "Published", color: "success" },
});

export const getBlogStatusMeta = (status) =>
  BLOG_STATUS[status] || { label: status ? String(status) : "Unknown", color: "default" };

/**
 * Document metadata for the reader page. `canonical_url` is honoured only when
 * it points at this ECP site; a legacy WordPress URL is not made canonical for
 * the ECP page (redirect/canonical strategy belongs to the migration batch).
 */
export const getBlogSeoMeta = (post, currentOrigin) => {
  const title = (post?.seo_title || "").trim() || (post?.title || "").trim();
  const description =
    (post?.seo_description || "").trim() || (post?.excerpt || "").trim();
  let canonical = "";
  const raw = (post?.canonical_url || "").trim();
  if (raw && currentOrigin) {
    try {
      if (new URL(raw).origin === new URL(currentOrigin).origin) canonical = raw;
    } catch {
      canonical = "";
    }
  }
  return { title, description, canonical };
};
