// Imprint page layout (src/lib/imprintSections.js and the Imprint branch of StandardPageArticle.jsx).
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
import { IMPRINT_SLUG, splitImprintSections } from "../../lib/imprintSections.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../..");

const defaultPage = (slug) =>
  toDefaultPage(JSON.parse(fs.readFileSync(path.join(ROOT, `src/content/public-pages/${slug}.json`), "utf8")));
const parse = (html) => new JSDOM(`<body>${html}</body>`).window.document;

let StandardPageArticle;
async function renderArticle(page) {
  if (!StandardPageArticle) {
    const outDir = path.join(ROOT, "node_modules", ".cache", "imprint-sections-tests");
    fs.mkdirSync(outDir, { recursive: true });
    const outfile = path.join(outDir, `imprint-sections-${process.pid}.mjs`);
    await build({
      stdin: {
        contents: 'export { default as StandardPageArticle } from "@/components/public/StandardPageArticle.jsx";',
        resolveDir: ROOT,
        sourcefile: "imprint-sections-entry.js",
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
          name: "imprint-sections-test-resolve",
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

// ------------------------------------------------------------------ splitting --

test("each <h2> starts a section that runs to the next heading", () => {
  const html = '<p>Intro</p>\n<h2>Switzerland</h2>\n<p>A<br>B</p>\n<h2 class="x">Côte &amp; <b>Co</b></h2><p>C</p>';
  const result = splitImprintSections(html);
  assert.equal(result.introHtml, "<p>Intro</p>");
  assert.deepEqual(result.sections, [
    { id: "switzerland", headingHtml: "Switzerland", bodyHtml: "<p>A<br>B</p>" },
    { id: "c-te-co", headingHtml: "Côte &amp; Co", bodyHtml: "<p>C</p>" },
  ]);
});

test("repeated headings get unique ids; bodies without usable headings are left alone", () => {
  assert.deepEqual(
    splitImprintSections("<h2>Office</h2><p>1</p><h2>Office</h2><p>2</p>").sections.map((s) => s.id),
    ["office", "office-2"]
  );
  assert.equal(splitImprintSections(undefined), null);
  assert.equal(splitImprintSections("<p>Only text</p>"), null);
  assert.equal(splitImprintSections("<h2>A</h2><p>a</p><h2> </h2><p>kept</p>"), null);
});

// ------------------------------------------------------------------ rendering --

test("the Imprint shows one card per region with the CMS content and links unchanged", async () => {
  const page = defaultPage(IMPRINT_SLUG);
  const doc = await renderArticle({ ...page, slug: IMPRINT_SLUG });

  assert.equal(doc.querySelector("h1").textContent, "Imprint");
  const cards = [...doc.querySelectorAll("article section")];
  assert.deepEqual(cards.map((card) => card.querySelector("h2").textContent), ["Switzerland", "Austria", "Singapore"]);
  for (const card of cards) {
    const heading = card.querySelector("h2");
    assert.equal(card.getAttribute("aria-labelledby"), heading.id);
  }

  // Every block between the headings is rendered verbatim, line breaks and all.
  const { sections } = splitImprintSections(page.body_html);
  cards.forEach((card, index) => {
    assert.equal(card.querySelector("h2 + div").innerHTML, parse(sections[index].bodyHtml).body.innerHTML);
  });
  assert.deepEqual(
    [...doc.querySelectorAll("article section a[href]")].map((a) => a.getAttribute("href")),
    [
      "tel:+41435051799",
      "mailto:info@imaa-institute.org",
      "tel:+4314351444",
      "mailto:info@imaa-institute.org",
      "tel:+6531292799",
      "mailto:info@imaa-institute.org",
    ]
  );
  // Three short sections: no contents list.
  assert.equal(doc.querySelector("nav[aria-label='On this page']"), null);
});

test("cards follow CMS edits: added regions, renamed headings and an intro", async () => {
  const doc = await renderArticle({
    title: "Imprint",
    slug: IMPRINT_SLUG,
    body_html: "<p>Operator of IMAA Connect:</p><h2>Germany</h2><p>New office</p><h2>Switzerland</h2><p>Zurich</p>",
  });
  assert.deepEqual([...doc.querySelectorAll("article section h2")].map((h) => h.id), ["germany", "switzerland"]);
  assert.ok(doc.body.innerHTML.includes("<p>Operator of IMAA Connect:</p>"));
});

test("an Imprint without <h2> headings renders as an ordinary article", async () => {
  const doc = await renderArticle({ title: "Imprint", slug: IMPRINT_SLUG, body_html: "<p>Coming soon.</p>" });
  assert.equal(doc.querySelector("article section"), null);
  assert.ok(doc.body.innerHTML.includes("<p>Coming soon.</p>"));
});

test("other public pages do not get Imprint cards", async () => {
  const body = "<h2>Switzerland</h2><p>a</p><h2>Austria</h2><p>b</p>";
  for (const slug of ["references", "terms-and-conditions", "privacy-policy", "frequently-asked-questions"]) {
    const doc = await renderArticle({ title: "Page", slug, body_html: body });
    assert.equal(doc.querySelector("article section"), null, slug);
  }
});
