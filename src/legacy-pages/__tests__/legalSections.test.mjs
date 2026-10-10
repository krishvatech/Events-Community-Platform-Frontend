// Terms and Conditions and Privacy Policy page layout (src/lib/legalSections.js,
// src/components/public/LegalSectionNav.jsx and the legal branch of StandardPageArticle.jsx).
//
// node:test + jsdom. The real renderer is bundled on the fly with esbuild (as in
// publicSitePages.test.mjs); node_modules stay external so React resolves normally.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";
import { JSDOM } from "jsdom";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { toDefaultPage } from "../../lib/publicCmsResponse.js";
import { LEGAL_TOC_SLUGS, addLegalSectionAnchors } from "../../lib/legalSections.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../..");
const TERMS = "terms-and-conditions";
const PRIVACY = "privacy-policy";

const defaultPage = (slug) =>
  toDefaultPage(JSON.parse(fs.readFileSync(path.join(ROOT, `src/content/public-pages/${slug}.json`), "utf8")));
const withoutIds = (html) => html.replace(/<h2 id="[^"]*"/g, "<h2");
const withoutAnchors = (html) => html.replace(/ id="section-\d+" data-legal-section=""/g, "");
const parse = (html) => new JSDOM(`<body>${html}</body>`).window.document;

let StandardPageArticle;
async function renderArticle(page) {
  if (!StandardPageArticle) {
    const outDir = path.join(ROOT, "node_modules", ".cache", "legal-sections-tests");
    fs.mkdirSync(outDir, { recursive: true });
    const outfile = path.join(outDir, `legal-sections-${process.pid}.mjs`);
    await build({
      stdin: {
        contents: 'export { default as StandardPageArticle } from "@/components/public/StandardPageArticle.jsx";',
        resolveDir: ROOT,
        sourcefile: "legal-sections-entry.js",
        loader: "js",
      },
      bundle: true,
      format: "esm",
      platform: "node",
      target: "node20",
      jsx: "automatic",
      outfile,
      logLevel: "error",
      plugins: [
        {
          name: "legal-sections-test-resolve",
          setup(pluginBuild) {
            pluginBuild.onResolve({ filter: /^@\// }, (args) =>
              pluginBuild.resolve(`./${args.path.slice(2)}`, { kind: args.kind, resolveDir: path.join(ROOT, "src") })
            );
            pluginBuild.onResolve({ filter: /^[^./]/ }, (args) => ({ path: args.path, external: true }));
          },
        },
      ],
    });
    try {
      ({ StandardPageArticle } = await import(pathToFileURL(outfile).href));
    } finally {
      fs.rmSync(outfile, { force: true });
      fs.rmSync(outfile.replace(/\.mjs$/, ".css"), { force: true });
    }
  }
  return parse(renderToStaticMarkup(createElement(StandardPageArticle, { page, source: "cms" })));
}

// ------------------------------------------------------------------ anchors --

test("numbered SECTION headings get section-<n> ids; nothing else in the body changes", () => {
  const html = '<p>Intro</p>\n<h2><strong>SECTION 1 – A</strong></h2>\n<p>x</p>\n<h2>SECTION 2 – B &amp; C</h2>\n<h2>Annex</h2>';
  const result = addLegalSectionAnchors(html);
  assert.deepEqual(result.sections, [
    { id: "section-1", labelHtml: "SECTION 1 – A" },
    { id: "section-2", labelHtml: "SECTION 2 – B &amp; C" },
    { id: "annex", labelHtml: "Annex" },
  ]);
  assert.ok(result.html.includes('<h2 id="section-1"><strong>SECTION 1 – A</strong></h2>'));
  assert.equal(withoutIds(result.html), html);
});

test("repeated headings get unique ids and existing ids are kept", () => {
  const result = addLegalSectionAnchors('<h2>Same</h2><h2>Same</h2><h2 id="kept" class="x">Other</h2><h2> </h2>');
  assert.deepEqual(result.sections.map((section) => section.id), ["same", "same-2", "kept"]);
  assert.ok(result.html.includes('<h2 id="kept" class="x">Other</h2><h2> </h2>'));
});

test("short or missing bodies get no contents list", () => {
  assert.equal(addLegalSectionAnchors(undefined), null);
  assert.equal(addLegalSectionAnchors("<p>Text only</p>"), null);
  assert.equal(addLegalSectionAnchors("<h2>One</h2><h2>Two</h2>"), null);
});

test("the approved Terms body has 28 numbered sections and keeps its wording", () => {
  const { body_html: body } = defaultPage(TERMS);
  const result = addLegalSectionAnchors(body);
  assert.deepEqual(result.sections.map((section) => section.id), Array.from({ length: 28 }, (_, i) => `section-${i + 1}`));
  assert.equal(result.sections[3].labelHtml, "SECTION 4 – CANCELLATION OF PARTICIPATION");
  assert.equal(withoutIds(result.html), body);
});

// ------------------------------------------------------------------ rendering --

test("Terms renders the CMS body with a contents list for phones and a sticky sidebar", async () => {
  const page = defaultPage(TERMS);
  const doc = await renderArticle({ ...page, slug: TERMS });

  assert.equal(doc.querySelector("h1").textContent, "Terms and Conditions");
  const navs = doc.querySelectorAll("nav[aria-label='On this page']");
  assert.equal(navs.length, 2, "one in a <details> for small screens, one in the lg sidebar");
  assert.ok(navs[0].closest("details"));
  assert.ok(navs[1].closest("aside").className.includes("lg:block"));
  for (const nav of navs) {
    const links = [...nav.querySelectorAll("a")];
    assert.equal(links.length, 28);
    for (const link of links) assert.ok(doc.getElementById(link.getAttribute("href").slice(1)), link.getAttribute("href"));
  }

  // The legal text and its links are rendered unchanged.
  const body = doc.querySelector("#section-1").parentElement;
  assert.equal(withoutIds(body.innerHTML), parse(page.body_html).body.innerHTML);
  assert.deepEqual(
    [...new Set([...body.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")))],
    [
      "mailto:info@imaa-institute.org",
      "https://www.ibf.org.sg/home/for-individuals/skills-and-jobs-development/training-support/IBF-STS",
      "mailto:singapore@imaa.edu.sg",
    ]
  );
  // The sticky sidebar's overflow fix is scoped to pages that show it.
  assert.match(doc.querySelector("aside style").textContent, /html:has\(\[data-legal-section-nav\]\)/);
});

test("a short Terms body renders as an ordinary article", async () => {
  const doc = await renderArticle({ title: "Terms and Conditions", slug: TERMS, body_html: "<h2>Only</h2><p>One section</p>" });
  assert.equal(doc.querySelector("nav[aria-label='On this page']"), null);
  assert.ok(doc.body.innerHTML.includes("<h2>Only</h2><p>One section</p>"));
});

test("other public pages are not given the legal layout", async () => {
  assert.deepEqual([...LEGAL_TOC_SLUGS], [TERMS, PRIVACY]);
  const body = "<h2>SECTION 1 – A</h2><p>a</p><h2>SECTION 2 – B</h2><p>b</p><h2>SECTION 3 – C</h2><p>c</p>";
  for (const slug of ["references"]) {
    const doc = await renderArticle({ title: "Page", slug, body_html: body });
    assert.equal(doc.querySelector("nav[aria-label='On this page']"), null, slug);
    assert.equal(doc.querySelector("style"), null, slug);
    assert.ok(doc.body.innerHTML.includes(body), slug);
  }
  const faq = await renderArticle({ title: "FAQ", slug: "frequently-asked-questions", body_html: body });
  assert.equal(faq.querySelector("nav[aria-label='On this page']"), null);
  assert.equal(faq.querySelectorAll("[data-faq-accordion] button").length, 3);
});

// ------------------------------------------------------------------ privacy policy --

// The shape of the published local Privacy Policy (Wagtail editor output, as served by the API):
// section 1 saved as a bold paragraph, sections 2+ as <h4><b>…</b></h4>, plain <br> in the text.
const CMS_PRIVACY = [
  "<p><b>Data Privacy, Data Protection &amp; Cookie Policy</b></p>",
  "<p>BY VISITING [<a href=\"https://imaa-institute.org/\">imaa-institute.org</a>] (THE “SITE”)</p>",
  "<p><b>1. Who we are (Controllers)</b></p>",
  "<p>You may contact us at info@imaa-institute.org.</p>",
  "<h4><b>2. Information we may collect from you</b></h4>",
  "<ul><li>Line one<br>line two</li></ul>",
  "<h4><b>3. How your information may be used</b></h4>",
  "<p><b>Legal Basis</b></p>",
  "<p>Art. 6 (<a href=\"https://gdpr-info.eu/art-6-gdpr/\">https://gdpr-info.eu/art-6-gdpr/</a>).</p>",
  "<h4><b>14. Information about Our Use of cookies</b></h4>",
  "<p>Cookies.</p>",
].join("");

test("h4 sections and a numbered bold paragraph become anchored sections; other bold text does not", () => {
  const result = addLegalSectionAnchors(CMS_PRIVACY);
  assert.equal(result.level, "h4");
  assert.deepEqual(result.sections, [
    { id: "section-1", labelHtml: "1. Who we are (Controllers)" },
    { id: "section-2", labelHtml: "2. Information we may collect from you" },
    { id: "section-3", labelHtml: "3. How your information may be used" },
    { id: "section-14", labelHtml: "14. Information about Our Use of cookies" },
  ]);
  assert.ok(result.html.includes('<p id="section-1" data-legal-section=""><b>1. Who we are (Controllers)</b></p>'));
  assert.ok(result.html.includes('<h4 id="section-2" data-legal-section=""><b>2. Information'));
  assert.ok(result.html.includes("<p><b>Legal Basis</b></p>"), "unnumbered bold paragraphs are not sections");
  assert.equal(withoutAnchors(result.html), CMS_PRIVACY);
});

test("numbered bold paragraphs only count below h2, and the highest heading level wins", () => {
  const h2Body = "<p><b>1. Intro</b></p><h2>A</h2><h2>B</h2><h2>C</h2><h4>Sub</h4>";
  const h2 = addLegalSectionAnchors(h2Body);
  assert.equal(h2.level, "h2");
  assert.deepEqual(h2.sections.map((section) => section.id), ["a", "b", "c"]);
  assert.ok(h2.html.startsWith("<p><b>1. Intro</b></p>"));
  assert.ok(h2.html.includes("<h4>Sub</h4>"));
  assert.ok(!h2.html.includes("data-legal-section"));
});

test("the CMS Privacy Policy renders with 14-section style anchors, contents and its links", async () => {
  const doc = await renderArticle({ title: "Privacy Policy", slug: PRIVACY, body_html: CMS_PRIVACY });
  for (const nav of doc.querySelectorAll("nav[aria-label='On this page']")) {
    const hrefs = [...nav.querySelectorAll("a")].map((a) => a.getAttribute("href"));
    assert.deepEqual(hrefs, ["#section-1", "#section-2", "#section-3", "#section-14"]);
    for (const href of hrefs) assert.ok(doc.querySelector(href), href);
  }
  const body = doc.querySelector("#section-1").parentElement;
  assert.match(body.className, /\[&_\[data-legal-section\]\]:border-t/);
  assert.equal(withoutAnchors(body.innerHTML), parse(CMS_PRIVACY).body.innerHTML);
  assert.deepEqual(
    [...body.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")),
    ["https://imaa-institute.org/", "https://gdpr-info.eu/art-6-gdpr/"]
  );
});

test("the approved Privacy Policy default (h2 sections) gets all 14 WordPress sections", async () => {
  const page = defaultPage(PRIVACY);
  const result = addLegalSectionAnchors(page.body_html);
  assert.equal(result.level, "h2");
  assert.deepEqual(result.sections.map((section) => section.id), Array.from({ length: 14 }, (_, i) => `section-${i + 1}`));
  assert.equal(withoutIds(result.html), page.body_html);
  const doc = await renderArticle({ ...page, slug: PRIVACY });
  assert.equal(doc.querySelectorAll("aside nav[aria-label='On this page'] a").length, 14);
});
