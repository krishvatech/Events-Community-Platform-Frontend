import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";

import {
  createBlogSanitizer,
  formatBlogDate,
  getBlogAuthorName,
  getBlogSeoMeta,
  getBlogStatusMeta,
  hasComplexBlogHtml,
} from "../../utils/blogContent.js";

const { window } = new JSDOM("");
const sanitize = createBlogSanitizer(window);

const parse = (html) => {
  const doc = new JSDOM(`<body>${html}</body>`).window.document;
  return doc.body;
};

test("scripts, frames, forms and embedded objects are removed", () => {
  const out = sanitize(`
    <p>Hi</p><script>alert(1)</script><iframe src="https://evil.test"></iframe>
    <object data="x"></object><embed src="x"><form action="/steal"><input name="p"></form>
    <style>body{display:none}</style><svg><script>alert(2)</script></svg>`);
  const body = parse(out);
  for (const tag of ["script", "iframe", "object", "embed", "form", "input", "style", "svg"]) {
    assert.equal(body.querySelector(tag), null, `${tag} survived`);
  }
  assert.equal(body.querySelector("p").textContent, "Hi");
});

test("event-handler attributes and javascript: URLs are stripped", () => {
  const out = sanitize(`
    <img src="x.png" onerror="alert(1)" onload="alert(2)">
    <a href="javascript:alert(3)" onclick="alert(4)">bad</a>
    <a href="JaVaScRiPt:alert(5)">bad2</a>
    <p onmouseover="alert(6)">text</p>`);
  assert.doesNotMatch(out, /on(error|load|click|mouseover)=/i);
  assert.doesNotMatch(out, /javascript:/i);
  const links = parse(out).querySelectorAll("a");
  links.forEach((a) => assert.equal(a.getAttribute("href"), null));
});

test("legitimate article structure survives", () => {
  const html = `
    <h2>Heading</h2><h3>Sub</h3><p>Para with <strong>bold</strong> and <em>italic</em>
    and <a href="https://imaa-institute.org/x">a link</a>.</p>
    <ul><li>one</li></ul><ol><li>two</li></ol>
    <blockquote>quote</blockquote>
    <figure><img src="https://cdn.test/a.jpg" alt="Chart"><figcaption>Caption</figcaption></figure>
    <table><thead><tr><th>A</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table>`;
  const body = parse(sanitize(html));
  for (const tag of ["h2", "h3", "p", "strong", "em", "a", "ul", "ol", "li", "blockquote", "figure", "img", "figcaption", "table", "th", "td"]) {
    assert.ok(body.querySelector(tag), `${tag} was removed`);
  }
  assert.equal(body.querySelector("a").getAttribute("href"), "https://imaa-institute.org/x");
  assert.equal(body.querySelector("img").getAttribute("alt"), "Chart");
  assert.equal(body.querySelector("img").getAttribute("loading"), "lazy");
});

test("inline styles are dropped and only content class names survive", () => {
  const body = parse(sanitize(`<p style="position:fixed;inset:0" class="fixed inset-0 z-50 has-text-align-center">x</p><img class="aligncenter wp-image-5 hidden" src="a.png">`));
  const p = body.querySelector("p");
  assert.equal(p.getAttribute("style"), null);
  assert.equal(p.getAttribute("class"), "has-text-align-center");
  assert.equal(body.querySelector("img").getAttribute("class"), "aligncenter wp-image-5");
});

test("links opening a new tab get rel=noopener", () => {
  const a = parse(sanitize(`<a href="https://x.test" target="_self">x</a>`)).querySelector("a");
  assert.equal(a.getAttribute("target"), "_blank");
  assert.equal(a.getAttribute("rel"), "noopener noreferrer");
});

test("hasComplexBlogHtml flags markup the visual editor would drop", () => {
  assert.equal(hasComplexBlogHtml("<h2>T</h2><p>a <strong>b</strong> <a href='/x'>c</a></p><ul><li>d</li></ul>"), false);
  assert.equal(hasComplexBlogHtml(""), false);
  assert.equal(hasComplexBlogHtml("<p><img src='a.png'></p>"), true);
  assert.equal(hasComplexBlogHtml("<table><tr><td>1</td></tr></table>"), true);
  assert.equal(hasComplexBlogHtml("<p class='has-large-font-size'>x</p>"), true);
  assert.equal(hasComplexBlogHtml("<p style='color:red'>x</p>"), true);
});

test("author display prefers the ECP author, then the legacy author", () => {
  assert.equal(getBlogAuthorName({ author: { full_name: "Ada Lovelace" }, legacy_author_name: "Old" }), "Ada Lovelace");
  assert.equal(getBlogAuthorName({ author: null, legacy_author_name: "Historic Writer" }), "Historic Writer");
  assert.equal(getBlogAuthorName({ author: { full_name: "" }, legacy_author_name: "" }), "");
});

test("dates are formatted, never shown as raw ISO", () => {
  assert.equal(formatBlogDate("2026-09-24T10:15:00Z"), "September 24, 2026");
  assert.equal(formatBlogDate(null), "");
  assert.equal(formatBlogDate("not a date"), "");
});

test("status metadata carries a text label, not only a colour", () => {
  assert.deepEqual(getBlogStatusMeta("draft"), { label: "Draft", color: "default" });
  assert.deepEqual(getBlogStatusMeta("published"), { label: "Published", color: "success" });
});

test("SEO meta falls back sensibly and only honours same-site canonical URLs", () => {
  const origin = "https://connect.imaa.test";
  assert.deepEqual(getBlogSeoMeta({ title: "T", excerpt: "E" }, origin), { title: "T", description: "E", canonical: "" });
  assert.deepEqual(
    getBlogSeoMeta({ title: "T", seo_title: "S", excerpt: "E", seo_description: "D", canonical_url: `${origin}/blogs/t` }, origin),
    { title: "S", description: "D", canonical: `${origin}/blogs/t` }
  );
  assert.equal(getBlogSeoMeta({ title: "T", canonical_url: "https://imaa-institute.org/old-post/" }, origin).canonical, "");
  assert.equal(getBlogSeoMeta({ title: "T", canonical_url: "not a url" }, origin).canonical, "");
});
