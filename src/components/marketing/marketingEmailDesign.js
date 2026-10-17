// Visual design helpers for Marketing Hub emails (Templates and Broadcasts).
//
// Content ownership, kept separate on purpose:
//   design   - Templatical TemplateContent JSON, wrapped in a versioned envelope;
//              only ever stored by ECP, never sent to recipients
//   MJML     - generated from the design by @templatical/renderer
//   HTML     - compiled from MJML by the Django API; this is what Mautic sends
//   plain text and delivery metadata stay in their existing fields.
//
// Independent of the system/event editor (components/admin/TemplaticalEmailEditor.jsx):
// no template_key, no Django template syntax, no event placeholders.

import { isMauticToken } from "./marketingEmailTokens";

export const DESIGN_EDITOR = "templatical";
export const DESIGN_VERSION = 1;

/** Upper bound for a stored design; mirrors the server's MJML limit order of magnitude. */
export const MAX_DESIGN_BYTES = 1024 * 1024;

const makeId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `mkt-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const spacing = (top, right, bottom, left) => ({ top, right, bottom, left });
const styles = (padding) => ({ padding, margin: spacing(0, 0, 0, 0) });

const BRAND_NAVY = "#1B2A4A";
const BRAND_TEAL = "#0f766e";

const hasToken = (tokens, token) => (tokens || []).some((item) => item?.token === token);

const tokenChip = (token, label) => `<span data-merge-tag="${token}">${label}</span>`;

/**
 * A neutral starter layout. Tokens are used only when the backend listed them,
 * so the starter never contains a field Mautic cannot resolve.
 */
export function createMarketingStarterDesign(tokens = []) {
  const greeting = hasToken(tokens, "{contactfield=firstname}")
    ? `Hello ${tokenChip("{contactfield=firstname}", "First Name")},`
    : "Hello,";
  const footerLinks = [
    hasToken(tokens, "{webview_url}") ? '<a href="{webview_url}">View in browser</a>' : "",
    hasToken(tokens, "{unsubscribe_url}") ? '<a href="{unsubscribe_url}">Unsubscribe</a>' : "",
  ].filter(Boolean);

  const blocks = [
    {
      id: makeId(),
      type: "title",
      content: "Newsletter headline",
      level: 1,
      color: BRAND_NAVY,
      textAlign: "left",
      fontFamily: "Arial",
      styles: styles(spacing(24, 24, 8, 24)),
    },
    {
      id: makeId(),
      type: "paragraph",
      content: `<p>${greeting}</p>`,
      styles: styles(spacing(8, 24, 4, 24)),
    },
    {
      id: makeId(),
      type: "paragraph",
      content: "<p>Write your newsletter content here.</p>",
      styles: styles(spacing(4, 24, 8, 24)),
    },
    {
      id: makeId(),
      type: "button",
      text: "Read more",
      url: "https://",
      openInNewTab: false,
      backgroundColor: BRAND_TEAL,
      textColor: "#ffffff",
      borderRadius: 4,
      fontSize: 15,
      buttonPadding: spacing(12, 24, 12, 24),
      fontFamily: "Arial",
      styles: styles(spacing(16, 24, 16, 24)),
    },
    {
      id: makeId(),
      type: "divider",
      lineStyle: "solid",
      color: "#e5e7eb",
      thickness: 1,
      width: "full",
      styles: styles(spacing(12, 24, 12, 24)),
    },
  ];
  if (footerLinks.length) {
    blocks.push({
      id: makeId(),
      type: "paragraph",
      content: `<p><span style="color:#6b7280;font-size:12px;">${footerLinks.join(" | ")}</span></p>`,
      styles: styles(spacing(8, 24, 24, 24)),
    });
  }

  return {
    blocks,
    settings: { width: 600, backgroundColor: "#ffffff", fontFamily: "Arial", locale: "en" },
  };
}

const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

function blocksAreValid(blocks, depth = 0) {
  if (!Array.isArray(blocks) || depth > 4) return false;
  return blocks.every((block) => {
    if (!isPlainObject(block) || typeof block.id !== "string" || !block.id || typeof block.type !== "string") {
      return false;
    }
    if (block.type !== "section") return true;
    return Array.isArray(block.children) && block.children.every((column) => blocksAreValid(column, depth + 1));
  });
}

/** True for a structurally usable Templatical TemplateContent. */
export function isTemplateContent(content) {
  return (
    isPlainObject(content) &&
    isPlainObject(content.settings) &&
    Number.isFinite(Number(content.settings.width)) &&
    blocksAreValid(content.blocks)
  );
}

/** Wraps editor content for storage. Throws for content that cannot be reopened. */
export function wrapDesign(content) {
  if (!isTemplateContent(content)) throw new Error("The visual design is not valid editor content.");
  const design = { editor: DESIGN_EDITOR, version: DESIGN_VERSION, content };
  if (new Blob([JSON.stringify(design)]).size > MAX_DESIGN_BYTES) {
    throw new Error("The visual design is too large to save.");
  }
  return design;
}

/**
 * Reads a stored design envelope. Never throws: an unknown editor, a future
 * version or malformed content is reported so the caller opens HTML mode
 * instead of a broken or silently reset canvas.
 */
export function readDesign(stored) {
  if (stored === null || stored === undefined || stored === "") return { ok: false, reason: "missing" };
  let design = stored;
  if (typeof stored === "string") {
    try {
      design = JSON.parse(stored);
    } catch {
      return { ok: false, reason: "invalid" };
    }
  }
  if (!isPlainObject(design) || design.editor !== DESIGN_EDITOR) return { ok: false, reason: "unsupported_editor" };
  if (Number(design.version) !== DESIGN_VERSION) return { ok: false, reason: "unsupported_version" };
  if (!isTemplateContent(design.content)) return { ok: false, reason: "invalid" };
  return { ok: true, content: design.content };
}

/** Every block in a design, including those nested in section columns. */
export function walkDesignBlocks(content, visit) {
  const walk = (blocks) => {
    for (const block of Array.isArray(blocks) ? blocks : []) {
      if (!isPlainObject(block)) continue;
      visit(block);
      if (block.type === "section") (block.children || []).forEach(walk);
    }
  };
  walk(content?.blocks);
}

const ATTRIBUTE_URLS = /\b(href|src)\s*=\s*("([^"]*)"|'([^']*)')/gi;

/** URLs a recipient's mail client will load or open, with where they came from. */
export function collectDesignUrls(content) {
  const urls = [];
  const fromHtml = (html, blockType) => {
    for (const match of String(html || "").matchAll(ATTRIBUTE_URLS)) {
      urls.push({ kind: match[1].toLowerCase() === "src" ? "image" : "link", url: match[3] ?? match[4] ?? "", blockType });
    }
  };
  walkDesignBlocks(content, (block) => {
    if (block.type === "image") {
      urls.push({ kind: "image", url: String(block.src || ""), blockType: "image" });
      if (block.linkUrl) urls.push({ kind: "link", url: String(block.linkUrl), blockType: "image" });
    } else if (block.type === "button") {
      urls.push({ kind: "link", url: String(block.url || ""), blockType: "button" });
    } else if (["paragraph", "title", "html"].includes(block.type)) {
      fromHtml(block.content, block.type);
    }
  });
  return urls;
}

const isHttpsUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && Boolean(url.hostname);
  } catch {
    return false;
  }
};

/**
 * Checks a URL for email use. Images must be absolute public HTTPS URLs
 * (data:, blob:, relative and http: images are dropped or blocked by mail
 * clients). Links may be HTTPS, mailto:, tel:, or a Mautic token such as
 * {unsubscribe_url}; script URLs are always rejected.
 */
export function checkEmailUrl(kind, rawUrl) {
  const url = String(rawUrl || "").trim();
  if (!url || url === "https://" || url === "http://") {
    return kind === "image" ? "An image has no URL." : "A link or button has no URL.";
  }
  if (/^\s*(javascript|vbscript):/i.test(url)) return `Script URLs are not allowed: ${url}`;
  if (kind === "image") {
    if (/^(data|blob):/i.test(url)) return "Images must be hosted at a public HTTPS URL, not embedded.";
    if (!isHttpsUrl(url)) return `Image URLs must be absolute HTTPS URLs: ${url}`;
    return "";
  }
  if (isMauticToken(url)) return "";
  if (/^(mailto|tel):/i.test(url) || url.startsWith("#")) return "";
  if (/^http:\/\//i.test(url)) return `Use HTTPS for links: ${url}`;
  if (!isHttpsUrl(url)) return `Links must be absolute HTTPS URLs or Mautic tokens: ${url}`;
  return "";
}

/** Distinct problems with the URLs in a design, for display before saving. */
export function validateDesignUrls(content) {
  const problems = new Set();
  for (const { kind, url } of collectDesignUrls(content)) {
    const problem = checkEmailUrl(kind, url);
    if (problem) problems.add(problem);
  }
  return [...problems];
}

/**
 * Renders a design to MJML. Mautic tokens inserted as merge-tag chips are
 * written out as their raw token text by the renderer.
 */
export async function renderDesignToMjml(content) {
  if (!isTemplateContent(content)) throw new Error("The visual design is not valid editor content.");
  // Loaded on demand so pages that only read designs stay out of the editor chunk.
  const { renderToMjml } = await import("@templatical/renderer");
  try {
    return await renderToMjml(content, { allowHtmlBlocks: true });
  } catch (err) {
    // Editor output is always complete; this guards hand-edited or damaged designs.
    throw new Error(`The visual design could not be rendered: ${err?.message || "unknown error"}`);
  }
}
