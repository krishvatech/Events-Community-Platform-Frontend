// Landing page HTML <-> visual builder. The saved page HTML stays the only
// copy (no separate design is stored). The builder edits the <body> only: the
// <head> (title, meta, existing styles) is kept exactly as it was, and the
// builder's own CSS lives in one <style> element, marked by a leading CSS
// comment, that is replaced on every save from the builder. (Mautic strips
// attributes from <style> on save, so an attribute cannot mark it.)

export const BUILDER_CSS_MARKER = "/* ecp-page-builder */";
export const FORM_BLOCK_ATTR = "data-ecp-mautic-form";

const builderStylesOf = (doc) =>
  Array.from(doc.head.querySelectorAll("style")).filter((node) => node.textContent.trimStart().startsWith(BUILDER_CSS_MARKER));

const escapeAttr = (value) =>
  String(value ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const attrsOf = (element) => Array.from(element?.attributes || []).map((attr) => [attr.name, attr.value]);

const openTag = (tag, attrs) =>
  `<${tag}${attrs.map(([name, value]) => (value === "" ? ` ${name}` : ` ${name}="${escapeAttr(value)}"`)).join("")}>`;

const parse = (html) => new DOMParser().parseFromString(String(html || ""), "text/html");

/** True when the page was last saved from the visual builder. */
export function hasBuilderStyle(html) {
  return builderStylesOf(parse(html)).length > 0;
}

/**
 * The parts the builder needs: the body to edit, the builder CSS to restore,
 * and everything else, kept verbatim for the saved document.
 */
export function splitPageDocument(html) {
  const doc = parse(html);
  const builderStyles = builderStylesOf(doc);
  const builderCss = builderStyles.map((node) => node.textContent.trimStart().slice(BUILDER_CSS_MARKER.length).trim()).join("\n");
  builderStyles.forEach((node) => node.remove());
  return {
    htmlAttrs: attrsOf(doc.documentElement),
    headHtml: doc.head.innerHTML.trim(),
    bodyAttrs: attrsOf(doc.body),
    bodyHtml: doc.body.innerHTML.trim(),
    builderCss,
  };
}

/** The <style> and stylesheet <link> elements of the head, for the builder canvas only. */
export function headStyleMarkup(headHtml) {
  const doc = parse(`<!DOCTYPE html><html><head>${headHtml || ""}</head><body></body></html>`);
  return Array.from(doc.head.querySelectorAll("style, link[rel~='stylesheet']")).map((node) => node.outerHTML);
}

/** The builder's export (`<body…>…</body>`) without its body tag. */
export function builderBodyContent(builderHtml) {
  return String(builderHtml || "")
    .trim()
    .replace(/^<body\b[^>]*>/i, "")
    .replace(/<\/body>\s*$/i, "")
    .trim();
}

/** A full document from the kept parts plus the builder's body and CSS. */
export function composePageDocument(parts, { bodyHtml, css }) {
  const head = [parts.headHtml, css && css.trim() ? `<style>${BUILDER_CSS_MARKER}\n${css.trim().replace(/<\/style/gi, "<\\/style")}</style>` : ""]
    .filter(Boolean)
    .join("\n");
  return [
    "<!DOCTYPE html>",
    openTag("html", parts.htmlAttrs || []),
    `<head>\n${head}\n</head>`,
    `${openTag("body", parts.bodyAttrs || [])}\n${bodyHtml || ""}\n</body>`,
    "</html>",
  ].join("\n");
}

// Mirrors newsletter/page_html_policy.py: what the builder would strip.
const ACTIVE_ELEMENTS = {
  script: "a <script> element",
  object: "an <object> element",
  embed: "an <embed> element",
  applet: "an <applet> element",
  base: "a <base> element",
  frame: "a <frame> element",
  frameset: "a <frameset> element",
};
const URL_ATTRIBUTES = new Set(["href", "src", "action", "formaction", "data", "xlink:href", "poster", "background"]);
// eslint-disable-next-line no-control-regex
const SCHEME_NOISE = /[\u0000- \u007f]+/g;
const SCRIPT_SCHEMES = ["javascript:", "vbscript:", "data:text/html", "data:application/xhtml", "data:image/svg"];

/** Plain-language descriptions of code the HTML would run; empty when none. */
export function findActiveContent(html) {
  const findings = [];
  const add = (finding) => {
    if (!findings.includes(finding)) findings.push(finding);
  };
  const doc = parse(html);
  for (const element of doc.querySelectorAll("*")) {
    const tag = element.tagName.toLowerCase();
    if (ACTIVE_ELEMENTS[tag]) add(ACTIVE_ELEMENTS[tag]);
    for (const { name, value } of Array.from(element.attributes)) {
      const attr = name.toLowerCase();
      if (attr.startsWith("on")) add(`an event-handler attribute (${attr})`);
      else if (attr === "srcdoc" && tag === "iframe") add("an <iframe srcdoc> document");
      else if (URL_ATTRIBUTES.has(attr) && SCRIPT_SCHEMES.some((scheme) => value.replace(SCHEME_NOISE, "").toLowerCase().startsWith(scheme))) {
        add(`a script URL in ${attr}`);
      } else if (tag === "meta" && attr === "http-equiv" && value.trim().toLowerCase() === "refresh") {
        add("a <meta http-equiv=refresh> redirect");
      }
    }
  }
  return findings.slice(0, 10);
}

/** Markup the builder inserts for a Mautic Form; Mautic renders the token on the live page. */
export function formBlockMarkup(formId, name = "") {
  const id = String(formId || "").replace(/\D/g, "");
  if (!id) throw new Error("A Mautic Form ID is required.");
  return `<div ${FORM_BLOCK_ATTR}="${id}" title="${escapeAttr(name ? `Mautic Form: ${name}` : `Mautic Form #${id}`)}">{form=${id}}</div>`;
}
