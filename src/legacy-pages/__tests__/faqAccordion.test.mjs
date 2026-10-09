// FAQ page accordion (src/lib/faqSections.js, src/components/public/FaqAccordion.jsx and the
// FAQ branch of StandardPageArticle.jsx).
//
// node:test + jsdom. The real modules are bundled on the fly with esbuild (as in
// publicSitePages.test.mjs); node_modules stay external so React resolves normally.
// Server markup is checked with renderToStaticMarkup; interaction runs the client component
// in jsdom with react-dom/client and act().

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";
import { JSDOM } from "jsdom";

import { toDefaultPage } from "../../lib/publicCmsResponse.js";
import { FAQ_CONTACT_URL, FAQ_SLUG, splitFaqSections } from "../../lib/faqSections.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../..");

// The 19 questions of https://imaa-institute.org/frequently-asked-questions/ (Elementor toggle),
// in page order, as captured on 2026-10-09. Used only to check the approved default content.
const WORDPRESS_QUESTIONS = [
  "What training programs are available?",
  "What is the M&A training program?",
  "What is the Post-Merger Integration Course?",
  "What are the benefits of studying Mergers and Acquisitions?",
  "What is the Program of Due Diligence Course?",
  "How to learn about Mergers and Acquisitions?",
  "What is the Program of Valuation Course?",
  "What is the Program of Legal Mergers & Acquisitions Expert Course?",
  "What is the Program of International Mergers & Acquisitions Course?",
  "What is the Program of Mergers & Acquisitions Professional Course?",
  "What is the Program of the HR Mergers & Acquisitions Expert Course?",
  "What is the Program of International Hospitality Mergers & Acquisitions Course?",
  "What customer support is available?",
  "What is Imaa?",
  "What accreditation does Imaa have?",
  "Who teaches the students in your courses?",
  "What kind of students attend the Imaa courses?",
  "How to get a certificate for completing an online course?",
  "How long does it take to study mergers and acquisitions at Imaa?",
];

const defaultFaqPage = () =>
  toDefaultPage(JSON.parse(fs.readFileSync(path.join(ROOT, "src/content/public-pages/frequently-asked-questions.json"), "utf8")));

// ------------------------------------------------------------------ DOM globals --
// Installed before React DOM is imported (it reads `window` when it loads).
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost:3000/frequently-asked-questions" });
const define = (key, value) => Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
define("window", dom.window);
define("document", dom.window.document);
define("navigator", dom.window.navigator);
for (const key of ["HTMLElement", "Element", "Node", "Event", "HashChangeEvent", "MouseEvent"]) define(key, dom.window[key]);
dom.window.Element.prototype.scrollIntoView = function scrollIntoView() {
  globalThis.__scrolledTo = this.id;
};
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { act, createElement } = await import("react");
const { renderToStaticMarkup } = await import("react-dom/server");
const { createRoot } = await import("react-dom/client");

let modules;
async function loadModules() {
  if (modules) return modules;
  const outDir = path.join(ROOT, "node_modules", ".cache", "faq-accordion-tests");
  fs.mkdirSync(outDir, { recursive: true });
  const outfile = path.join(outDir, `faq-accordion-${process.pid}.mjs`);
  await build({
    stdin: {
      contents: [
        'export { default as StandardPageArticle } from "@/components/public/StandardPageArticle.jsx";',
        'export { default as FaqAccordion } from "@/components/public/FaqAccordion.jsx";',
      ].join("\n"),
      resolveDir: ROOT,
      sourcefile: "faq-accordion-entry.js",
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
        name: "faq-test-resolve",
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
    modules = await import(pathToFileURL(outfile).href);
  } finally {
    fs.rmSync(outfile, { force: true });
    fs.rmSync(outfile.replace(/\.mjs$/, ".css"), { force: true });
  }
  return modules;
}

const parse = (html) => new JSDOM(`<body>${html}</body>`).window.document;
const renderArticle = async (page) => {
  const { StandardPageArticle } = await loadModules();
  return parse(renderToStaticMarkup(createElement(StandardPageArticle, { page, source: "cms" })));
};

// ------------------------------------------------------------------ parser --

test("splitFaqSections makes one item per <h2>, answers run to the next heading", () => {
  const html = '<p>Intro</p>\n<h2>First?</h2>\n<p>A1</p>\n<ul><li>x</li></ul>\n<h2 class="x">Second &amp; <b>last</b>?</h2><p>A2</p>';
  const faq = splitFaqSections(html);
  assert.equal(faq.introHtml, "<p>Intro</p>");
  assert.deepEqual(
    faq.items.map(({ questionHtml, answerHtml }) => [questionHtml, answerHtml]),
    [["First?", "<p>A1</p>\n<ul><li>x</li></ul>"], ["Second &amp; last?", "<p>A2</p>"]]
  );
  assert.deepEqual(faq.items.map((item) => item.id), ["faq-first", "faq-second-last"]);
});

test("splitFaqSections gives repeated questions unique ids", () => {
  const faq = splitFaqSections("<h2>Same?</h2><p>1</p><h2>Same?</h2><p>2</p><h2>¿?</h2>");
  assert.deepEqual(faq.items.map((item) => item.id), ["faq-same", "faq-same-2", "faq-3"]);
});

test("splitFaqSections leaves bodies without usable <h2> questions alone", () => {
  assert.equal(splitFaqSections(""), null);
  assert.equal(splitFaqSections(undefined), null);
  assert.equal(splitFaqSections("<p>Only text</p><h3>Not a question</h3>"), null);
  assert.equal(splitFaqSections("<h2>Q?</h2><p>A</p><h2> <br> </h2><p>kept</p>"), null);
});

test("the approved default FAQ has the 19 WordPress questions, each with an answer", () => {
  const { items, introHtml } = splitFaqSections(defaultFaqPage().body_html);
  assert.equal(introHtml, "");
  const text = (html) => parse(html).body.textContent;
  assert.deepEqual(items.map((item) => text(item.questionHtml)), WORDPRESS_QUESTIONS);
  for (const item of items) assert.ok(text(item.answerHtml).trim(), `${item.id} has no answer`);
  assert.equal(new Set(items.map((item) => item.id)).size, 19);
});

// ------------------------------------------------------------------ server markup --

test("the FAQ renders every question as a collapsed, labelled toggle with its answer in the HTML", async () => {
  const page = defaultFaqPage();
  const doc = await renderArticle(page);
  const buttons = [...doc.querySelectorAll("[data-faq-accordion] h2 > button")];
  assert.equal(buttons.length, 19);
  for (const button of buttons) {
    assert.equal(button.getAttribute("type"), "button");
    assert.equal(button.getAttribute("aria-expanded"), "false");
    const panel = doc.getElementById(button.getAttribute("aria-controls"));
    assert.ok(panel, "aria-controls points at the answer");
    assert.equal(panel.hasAttribute("hidden"), true);
    assert.equal(panel.getAttribute("aria-labelledby"), button.id);
    assert.ok(panel.textContent.trim());
  }
  // Answer markup is the CMS markup, unchanged (lists included). The "ten benefits" list has 9
  // items as on WordPress, where items 3 and 4 are merged into one <li>: an editorial fix for Wagtail.
  assert.equal(doc.querySelector("#faq-what-are-the-benefits-of-studying-mergers-and-acquisitions-panel ol").children.length, 9);
  // Title stays the page <h1>; questions are the <h2>s below it.
  assert.equal(doc.querySelector("h1").textContent, page.title);
});

test("the FAQ ends with a Contact Us link to the working IMAA contact form, not a local form", async () => {
  const doc = await renderArticle(defaultFaqPage());
  const contact = doc.querySelector("aside[aria-labelledby='faq-contact-heading']");
  assert.equal(contact.querySelector("h2").textContent, "Contact Us");
  assert.equal(contact.querySelector("a").getAttribute("href"), FAQ_CONTACT_URL);
  assert.equal(doc.querySelectorAll("form, input, textarea").length, 0);
});

test("CMS edits drive the FAQ: questions come from the published body, not from the defaults", async () => {
  const doc = await renderArticle({
    title: "FAQ",
    slug: FAQ_SLUG,
    body_html: "<p>Read this first.</p><h2>Edited in Wagtail?</h2><p>Yes.</p>",
  });
  const buttons = doc.querySelectorAll("[data-faq-accordion] button");
  assert.equal(buttons.length, 1);
  assert.equal(buttons[0].textContent, "Edited in Wagtail?");
  assert.ok(doc.body.innerHTML.includes("<p>Read this first.</p>"));
});

test("a FAQ body without <h2> questions renders as an ordinary article", async () => {
  const doc = await renderArticle({ title: "FAQ", slug: FAQ_SLUG, body_html: "<p>Coming soon.</p>" });
  assert.equal(doc.querySelector("[data-faq-accordion]"), null);
  assert.equal(doc.querySelector("aside"), null);
  assert.ok(doc.body.innerHTML.includes("<p>Coming soon.</p>"));
});

test("other StandardPages with <h2> headings are not turned into an accordion", async () => {
  for (const slug of ["privacy-policy", "terms-and-conditions", "imprint", "references"]) {
    const doc = await renderArticle({ title: "Page", slug, body_html: "<h2>Section</h2><p>Text</p>" });
    assert.equal(doc.querySelector("[data-faq-accordion]"), null, slug);
    assert.equal(doc.querySelector("aside"), null, slug);
    assert.ok(doc.body.innerHTML.includes("<h2>Section</h2><p>Text</p>"), slug);
  }
});

// ------------------------------------------------------------------ interaction --

async function mountAccordion(hash = "") {
  const { FaqAccordion } = await loadModules();
  dom.reconfigure({ url: `http://localhost:3000/frequently-asked-questions${hash}` });
  const container = document.createElement("div");
  document.body.replaceChildren(container);
  const root = createRoot(container);
  const { items } = splitFaqSections(defaultFaqPage().body_html);
  await act(async () => root.render(createElement(FaqAccordion, { items })));
  return { container, root, items };
}

const click = (element) => act(async () => element.dispatchEvent(new MouseEvent("click", { bubbles: true })));

test("clicking a question opens and closes its answer; several answers can be open at once", async () => {
  const { container, root } = await mountAccordion();
  const [first, second] = container.querySelectorAll("button");
  const panelOf = (button) => document.getElementById(button.getAttribute("aria-controls"));

  await click(first);
  assert.equal(first.getAttribute("aria-expanded"), "true");
  assert.equal(panelOf(first).hasAttribute("hidden"), false);

  await click(second);
  assert.equal(first.getAttribute("aria-expanded"), "true", "opening another question keeps the first open");
  assert.equal(second.getAttribute("aria-expanded"), "true");

  await click(first);
  assert.equal(first.getAttribute("aria-expanded"), "false");
  assert.equal(panelOf(first).hasAttribute("hidden"), true);
  // Closed panels stay findable by the browser's find-in-page.
  assert.equal(panelOf(first).getAttribute("hidden"), "until-found");

  await act(async () => root.unmount());
});

test("find-in-page (beforematch) opens the matching answer", async () => {
  const { container, root, items } = await mountAccordion();
  const panel = document.getElementById(`${items[5].id}-panel`);
  await act(async () => panel.dispatchEvent(new Event("beforematch")));
  assert.equal(container.querySelector(`#${items[5].id}-button`).getAttribute("aria-expanded"), "true");
  await act(async () => root.unmount());
});

test("a #faq-… link opens and scrolls to its question, on load and on hash change", async () => {
  const { container, root } = await mountAccordion("#faq-what-is-imaa");
  assert.equal(container.querySelector("#faq-what-is-imaa-button").getAttribute("aria-expanded"), "true");
  assert.equal(globalThis.__scrolledTo, "faq-what-is-imaa");

  const target = "faq-what-accreditation-does-imaa-have";
  dom.reconfigure({ url: `http://localhost:3000/frequently-asked-questions#${target}` });
  await act(async () => window.dispatchEvent(new HashChangeEvent("hashchange")));
  assert.equal(container.querySelector(`#${target}-button`).getAttribute("aria-expanded"), "true");

  // Unknown hashes change nothing.
  dom.reconfigure({ url: "http://localhost:3000/frequently-asked-questions#main-content" });
  await act(async () => window.dispatchEvent(new HashChangeEvent("hashchange")));
  assert.equal(container.querySelectorAll("button[aria-expanded='true']").length, 2);
  await act(async () => root.unmount());
});
