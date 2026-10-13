// Batch 3 public pages: Testimonials (/testimonials), Contact Us (/contact-us), In The News
// (/in-the-news) and M&A Publications (/publications). Response rules, loaders, metadata, 404s and
// errors, server rendering, the programme filters, the contact form (validation, token, honeypot,
// every backend answer) and the article archives (filters, pagination, missing images).
//
// node:test + jsdom. The real modules are bundled on the fly with esbuild (as publicTeamPage.test.mjs);
// client components run in jsdom with react-dom/client and act(). No real network: fetch is mocked.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";
import { JSDOM } from "jsdom";

import { PublicCmsUnavailableError } from "../../lib/publicCmsResponse.js";
import { readContactPageResponse, readTestimonialsPageResponse } from "../../lib/publicTestimonialsResponse.js";
import {
  archiveHref,
  formatArticleDate,
  paginationItems,
  parseArchiveQuery,
  readArticleDetailResponse,
  readArticleListResponse,
} from "../../lib/publicArticlesResponse.js";
import { contactPayload, interpretContactResponse, validateContact } from "../../lib/contactForm.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../..");
const API_BASE = "http://cms.example.test/api";
const SITE_ORIGIN = "https://connect.example.test";
const MEDIA = "https://media.example.test/images";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost:3000/contact-us" });
const define = (key, value) => Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
define("window", dom.window);
define("document", dom.window.document);
define("navigator", dom.window.navigator);
for (const key of ["HTMLElement", "HTMLInputElement", "HTMLSelectElement", "HTMLTextAreaElement", "HTMLFormElement", "Element", "Node", "Event", "MouseEvent", "FocusEvent", "KeyboardEvent"]) {
  define(key, dom.window[key]);
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { act, createElement } = await import("react");
const { renderToStaticMarkup } = await import("react-dom/server");
const { createRoot } = await import("react-dom/client");

const jsonResponse = (status, body) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const NOT_FOUND = () => jsonResponse(404, { detail: "Not found." });
const photo = (name) => ({ url: `${MEDIA}/${name}.png`, width: 300, height: 300, alt: "" });
const LONG = `<p>${"An excellent programme with practical insight. ".repeat(14)}</p>`;

const testimonial = (slug, name, programmes, extra = {}) => ({
  slug, name, role: "Director", company: "Acme", programme: "", programmes, quote_html: `<p>${name} quote.</p>`, photo: photo(slug), ...extra,
});
const testimonialsPage = (overrides = {}) => ({
  id: 7, title: "Testimonials", slug: "testimonials", type: "TestimonialsPage", path: "/testimonials/",
  hero_title: "Testimonials", hero_intro: "",
  programmes: [{ code: "IM&A", slug: "ima" }, { code: "CPMI", slug: "cpmi" }, { code: "FM&BV", slug: "fmbv" }],
  testimonials: [
    testimonial("aniruddha-sulake", "Aniruddha Sulake", ["cpmi"], { programme: "CPMI" }),
    testimonial("jane-doe", "Jane Doe", ["ima", "cpmi"], { quote_html: LONG }),
    testimonial("no-programme", "No Programme", [], { programme: "M&AP", photo: null }),
  ],
  sections: [{ type: "logo_strip", id: "l1", heading: "We’re trusted by", logos: [{ url: `${MEDIA}/kpmg.webp`, width: 200, height: 80, alt: "KPMG" }],
               button: { label: "SEE FULL LIST", url: "/references" } }],
  seo_title: "Testimonials Archive - IMAA – Institute for Mergers, Acquisitions, and Alliances",
  search_description: "",
  ...overrides,
});

const OFFICES = ["NEW YORK", "ZURICH", "VIENNA", "SINGAPORE", "BEIJING", "MOSCOW"].map((city, i) => ({
  city, country: `Country ${i}`, phone: `+41 43 505 17 9${i}`, phone_href: `tel:+4143505179${i}`, image: photo(city.toLowerCase()),
}));
const contactPage = (overrides = {}) => ({
  id: 8, title: "Contact Us", slug: "contact-us", type: "ContactPage", path: "/contact-us/",
  hero_title: "Contact Us", hero_intro: "",
  form_heading: "", form_intro_html: "",
  consent_html: '<p>I agree that IMAA may use the details I provide to respond to my enquiry, as described in the <a href="/privacy-policy">Privacy Policy</a>.</p>',
  success_message: "Thank you for your message. It has been sent.",
  form_image: { url: `${MEDIA}/aboutus.webp`, width: 800, height: 600, alt: "" },
  stats: [{ value: "100+", label: "Number of countries" }, { value: "4100+", label: "Number of participants" }, { value: "2000+", label: "Number of companies" }],
  sections: [
    { type: "card_group", id: "c1", heading: "", layout: "grid", prompt: "", button: null,
      cards: [{ title: "Get Personalized Insights", text: "Let’s talk.", icon: "", image: null, link: { label: "SCHEDULE YOUR CALL NOW", url: "https://imaa-institute.org/get-expert-guidance/" } }] },
    { type: "offices", id: "o1", heading: "Contact Us", email: "info@imaa-institute.org", offices: OFFICES },
  ],
  form: { enabled: true, countries: ["Germany", "Switzerland", "United States of America"],
          max_lengths: { first_name: 100, last_name: 100, phone: 40, email: 254, message: 2000 }, token: "signed-token-1" },
  seo_title: "Contact Us - IMAA – Institute for Mergers, Acquisitions, and Alliances", search_description: "",
  ...overrides,
});

const post = (slug, title, extra = {}) => ({
  id: slug.length, slug, title, excerpt: `${title} excerpt`, featured_image: `${MEDIA}/${slug}.webp`, author: null,
  legacy_author_name: "IMAA", published_at: "2024-06-25T04:31:40Z", categories: [{ id: 1, name: "Publications", slug: "publications" }],
  tags: [{ id: 2, name: "M&A", slug: "ma" }], ...extra,
});
const listBody = (results, count = results.length, filters) => ({
  count, next: null, previous: null, results,
  filters: filters || { years: [{ year: 2024, count: 9 }, { year: 2016, count: 109 }], tags: [{ slug: "ma", name: "M&A", count: 84 }, { slug: "survey", name: "Survey", count: 12 }] },
});

let modules;
async function loadModules() {
  if (modules) return modules;
  const outDir = path.join(ROOT, "node_modules", ".cache", "public-batch3-tests");
  fs.mkdirSync(outDir, { recursive: true });
  const outfile = path.join(outDir, `public-batch3-${process.pid}.mjs`);
  await build({
    stdin: {
      contents: [
        'export * from "@/lib/publicBatch3.server";',
        'export { generateMetadata as testimonialsMetadata, default as TestimonialsRoute } from "@/app/(site)/testimonials/page.jsx";',
        'export { generateMetadata as contactMetadata, default as ContactRoute } from "@/app/(site)/contact-us/page.jsx";',
        'export { generateMetadata as newsMetadata, default as NewsRoute } from "@/app/(site)/in-the-news/page.jsx";',
        'export { generateMetadata as publicationMetadata, default as PublicationRoute } from "@/app/(site)/publications/[slug]/page.jsx";',
        'export { default as TestimonialsPageView } from "@/components/public/testimonials/TestimonialsPageView.jsx";',
        'export { default as TestimonialDirectory } from "@/components/public/testimonials/TestimonialDirectory.jsx";',
        'export { default as ContactPageView } from "@/components/public/contact/ContactPageView.jsx";',
        'export { default as ContactForm } from "@/components/public/contact/ContactForm.jsx";',
        'export { default as ArticleArchiveView } from "@/components/public/articles/ArticleArchiveView.jsx";',
        'export { default as ArticleDetailView } from "@/components/public/articles/ArticleDetailView.jsx";',
        'export { ARTICLE_SECTIONS } from "@/lib/publicArticlesResponse";',
        'export { publicSectionHref, publicSectionRouteEnabled } from "@/lib/publicSectionRoutes.js";',
        'export { migratedRoutes, rewriteMigratedLinks, siteHref } from "@/lib/migratedLinks.js";',
      ].join("\n"),
      resolveDir: ROOT, sourcefile: "public-batch3-entry.js", loader: "js",
    },
    bundle: true, format: "esm", platform: "node", target: "node20", jsx: "automatic", outfile, logLevel: "error",
    plugins: [{
      name: "public-batch3-test-resolve",
      setup(pluginBuild) {
        pluginBuild.onResolve({ filter: /^@\// }, (args) => pluginBuild.resolve(`./${args.path.slice(2)}`, { kind: args.kind, resolveDir: path.join(ROOT, "src") }));
        pluginBuild.onResolve({ filter: /^#navigation$/ }, () => ({ path: path.join(ROOT, "src/navigation/next.jsx") }));
        // Next.js subpaths (next/link, next/navigation, ...) are CommonJS files without an exports map.
        pluginBuild.onResolve({ filter: /^[^./#]/ }, (args) => ({ path: /^next\/[a-z-]+$/.test(args.path) ? `${args.path}.js` : args.path, external: true }));
      },
    }],
  });
  try {
    modules = await import(pathToFileURL(outfile).href);
  } finally {
    fs.rmSync(outfile, { force: true });
  }
  return modules;
}

async function withMockedFetch(respond, fn) {
  const calls = [];
  const original = globalThis.fetch;
  const env = { CMS_API_BASE_URL: process.env.CMS_API_BASE_URL, NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL };
  globalThis.fetch = async (url, init) => { calls.push({ url: String(url), init }); return respond(String(url), init, calls.length); };
  process.env.CMS_API_BASE_URL = API_BASE;
  process.env.NEXT_PUBLIC_API_BASE_URL = API_BASE;
  process.env.NEXT_PUBLIC_SITE_URL = SITE_ORIGIN;
  try {
    return await fn(calls);
  } finally {
    globalThis.fetch = original;
    for (const [key, value] of Object.entries(env)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}
const parse = (html) => new JSDOM(`<body>${html}</body>`).window.document;
const is404 = (error) => /^NEXT_HTTP_ERROR_FALLBACK;404$/.test(String(error?.digest));

async function mount(element) {
  const container = document.createElement("div");
  document.body.replaceChildren(container);
  const root = createRoot(container);
  await act(async () => root.render(element));
  return { container, root };
}
const click = (element) => act(async () => element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true })));
async function type(element, value) {
  const proto = Object.getPrototypeOf(element);
  await act(async () => {
    Object.getOwnPropertyDescriptor(proto, "value").set.call(element, value);
    element.dispatchEvent(new Event(element.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
  });
}
const settle = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });

// ============================================================ Testimonials ==

test("testimonials: only quoted, well-formed entries; filters only for programmes in use", async () => {
  const { page } = await readTestimonialsPageResponse(jsonResponse(200, testimonialsPage({
    testimonials: [
      ...testimonialsPage().testimonials,
      testimonial("no-quote", "No Quote", ["ima"], { quote_html: "<p>&nbsp;</p>" }),
      testimonial("jane-doe", "Duplicate", ["ima"]),
      testimonial("unknown-prog", "Unknown", ["mba", "ima"], { photo: { url: "/media/x.png" } }),
    ],
  })));
  assert.deepEqual(page.testimonials.map((t) => t.slug), ["aniruddha-sulake", "jane-doe", "no-programme", "unknown-prog"]);
  assert.deepEqual(page.testimonials[3].programmes, ["ima"], "unknown programmes are dropped");
  assert.equal(page.testimonials[3].photo, null, "only absolute image URLs");
  assert.deepEqual(page.programmes.map((p) => p.slug), ["ima", "cpmi"], "FM&BV has no shown testimonial: no filter");
  assert.equal(page.sections[0].type, "logo_strip");
  assert.deepEqual(await readTestimonialsPageResponse(jsonResponse(200, testimonialsPage({ type: "AboutPage" }))), { status: "not_found" });
  assert.deepEqual(await readTestimonialsPageResponse(NOT_FOUND()), { status: "not_found" });
  for (const response of [jsonResponse(500, { detail: "x" }), jsonResponse(429, { detail: "slow down" }), new Response("<html>", { status: 200 })]) {
    await assert.rejects(readTestimonialsPageResponse(response), PublicCmsUnavailableError);
  }
});

test("testimonials route: anonymous uncached load, metadata, 404 and errors", async () => {
  const { loadPublicTestimonialsPage, testimonialsMetadata, TestimonialsRoute } = await loadModules();
  await withMockedFetch(() => jsonResponse(200, testimonialsPage()), async (calls) => {
    assert.equal((await loadPublicTestimonialsPage()).testimonials.length, 3);
    assert.equal(calls[0].url, `${API_BASE}/cms/public/pages/by-path/?path=%2Ftestimonials%2F`);
    assert.equal(calls[0].init.cache, "no-store");
    assert.equal(calls[0].init.credentials, undefined);
    const metadata = await testimonialsMetadata();
    assert.deepEqual(metadata.title, { absolute: "Testimonials Archive - IMAA – Institute for Mergers, Acquisitions, and Alliances" });
    assert.equal(metadata.alternates.canonical, `${SITE_ORIGIN}/testimonials`);
  });
  await withMockedFetch(() => NOT_FOUND(), async () => {
    await assert.rejects(TestimonialsRoute(), is404);
    assert.deepEqual(await testimonialsMetadata(), {});
  });
  await withMockedFetch(() => jsonResponse(503, { detail: "down" }), async () => {
    await assert.rejects(loadPublicTestimonialsPage(), { name: "PublicCmsUnavailableError" });
  });
});

test("testimonials page: every card in the server HTML with photo, name, role, programmes and quote", async () => {
  const { TestimonialsPageView } = await loadModules();
  const { page } = await readTestimonialsPageResponse(jsonResponse(200, testimonialsPage()));
  const doc = parse(renderToStaticMarkup(createElement(TestimonialsPageView, { page })));
  assert.equal(doc.querySelector("h1").textContent, "Testimonials");
  const cards = [...doc.querySelectorAll("[data-testimonial]")];
  assert.deepEqual(cards.map((c) => c.dataset.testimonial), ["aniruddha-sulake", "jane-doe", "no-programme"], "backend order (newest first)");
  assert.match(cards[0].textContent, /Aniruddha Sulake quote\./);
  assert.match(cards[0].textContent, /Director, Acme/);
  assert.deepEqual([...cards[1].querySelectorAll("ul[aria-label=Programmes] li")].map((li) => li.textContent), ["IM&A", "CPMI"]);
  assert.deepEqual([...cards[2].querySelectorAll("ul[aria-label=Programmes] li")].map((li) => li.textContent), ["M&AP"], "WordPress programme label");
  assert.equal(cards[2].querySelector("img"), null, "no photo: an initial, never a broken image");
  assert.equal(cards[0].querySelector("img").getAttribute("src"), `${MEDIA}/aniruddha-sulake.png`);
  assert.equal(cards[0].querySelector("button"), null, "short quotes are shown whole");
  assert.equal(cards[1].querySelector("button").getAttribute("aria-expanded"), "false");
  assert.deepEqual([...doc.querySelectorAll("[data-testimonials-section]")].map((s) => s.dataset.testimonialsSection), ["testimonials", "logo_strip"]);
  assert.equal(doc.querySelector("a[href='/references']").textContent.trim(), "SEE FULL LIST");

  const empty = parse(renderToStaticMarkup(createElement(TestimonialsPageView, { page: { ...page, testimonials: [], programmes: [] } })));
  assert.match(empty.body.textContent, /No testimonials are published yet\./);
});

test("testimonials filters show only linked testimonials, announce the result, and long quotes expand", async () => {
  const { TestimonialDirectory } = await loadModules();
  const { page } = await readTestimonialsPageResponse(jsonResponse(200, testimonialsPage()));
  const { container, root } = await mount(createElement(TestimonialDirectory, { testimonials: page.testimonials, programmes: page.programmes }));
  const names = () => [...container.querySelectorAll("figcaption p:first-child")].map((p) => p.textContent);
  const button = (label) => [...container.querySelectorAll("[role=group] button")].find((b) => b.textContent === label);
  const live = () => container.querySelector("[aria-live]").textContent;

  assert.equal(live(), "Showing all 3 testimonials");
  await click(button("IM&A"));
  assert.deepEqual(names(), ["Jane Doe"]);
  assert.equal(live(), "Showing 1 testimonial for IM&A");
  await click(button("CPMI"));
  assert.deepEqual(names(), ["Aniruddha Sulake", "Jane Doe"]);
  assert.equal(container.querySelector("button[aria-pressed=true]").textContent, "CPMI");
  await click(button("All"));
  assert.equal(names().length, 3);

  const toggle = container.querySelector("[data-testimonial=jane-doe] button");
  const quote = container.querySelector(`#${CSS.escape(toggle.getAttribute("aria-controls"))}`);
  assert.match(quote.className, /line-clamp/);
  await click(toggle);
  assert.equal(toggle.getAttribute("aria-expanded"), "true");
  assert.doesNotMatch(quote.className, /line-clamp/);
  assert.match(toggle.textContent, /Show less/);
  await act(async () => root.unmount());
});
const CSS = { escape: (value) => value.replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`) };

// ============================================================ Contact Us ==

test("contact page: form config is read strictly; no consent text or recipients means no form", async () => {
  const { page } = await readContactPageResponse(jsonResponse(200, contactPage()));
  assert.equal(page.form.enabled, true);
  assert.equal(page.form.token, "signed-token-1");
  assert.equal(page.stats.length, 3);
  assert.equal(page.sections[1].offices.length, 6);
  for (const overrides of [
    { form: { ...contactPage().form, enabled: false } },
    { form: { ...contactPage().form, token: "" } },
    { form: { ...contactPage().form, countries: [] } },
    { consent_html: "<p></p>" },
    { form: null },
  ]) {
    assert.equal((await readContactPageResponse(jsonResponse(200, contactPage(overrides)))).page.form.enabled, false, JSON.stringify(overrides));
  }
  const odd = (await readContactPageResponse(jsonResponse(200, contactPage({ form: { ...contactPage().form, max_lengths: { message: -1 } } })))).page;
  assert.equal(odd.form.max_lengths.message, 2000, "bad limits fall back to the backend defaults");
});

test("contact route: per-request load (fresh token), metadata, 404", async () => {
  const { loadPublicContactPage, contactMetadata, ContactRoute } = await loadModules();
  await withMockedFetch(() => jsonResponse(200, contactPage()), async (calls) => {
    assert.equal((await loadPublicContactPage()).form.enabled, true);
    assert.equal(calls[0].url, `${API_BASE}/cms/public/pages/by-path/?path=%2Fcontact-us%2F`);
    assert.equal(calls[0].init.cache, "no-store");
    const metadata = await contactMetadata();
    assert.equal(metadata.alternates.canonical, `${SITE_ORIGIN}/contact-us`);
    assert.deepEqual(metadata.title, { absolute: "Contact Us - IMAA – Institute for Mergers, Acquisitions, and Alliances" });
  });
  await withMockedFetch(() => NOT_FOUND(), async () => assert.rejects(ContactRoute(), is404));
});

test("contact page renders the form, image, statistics, card and all six offices", async () => {
  const { ContactPageView } = await loadModules();
  const { page } = await readContactPageResponse(jsonResponse(200, contactPage()));
  const doc = parse(renderToStaticMarkup(createElement(ContactPageView, { page })));
  assert.deepEqual([...doc.querySelectorAll("[data-contact-section]")].map((s) => s.dataset.contactSection), ["form", "card_group", "offices"]);
  const form = doc.querySelector("form[data-contact-form]");
  assert.ok(form);
  for (const name of ["first_name", "last_name", "email", "phone", "country", "message", "consent"]) {
    const field = form.querySelector(`[name=${name}]`);
    assert.ok(field, name);
    assert.ok(doc.querySelector(`label[for="${field.id}"]`), `${name} has a label`);
  }
  assert.equal(form.querySelector("[name=phone]").hasAttribute("required"), false);
  assert.equal(form.querySelectorAll("[name=country] option").length, 4);
  const honeypot = form.querySelector("[name=website]");
  assert.equal(honeypot.getAttribute("tabindex"), "-1");
  assert.equal(honeypot.closest("[aria-hidden=true]") !== null, true, "the honeypot is hidden from assistive technology");
  assert.match(form.textContent, /Privacy Policy/);
  assert.equal(form.querySelector("a[href='/privacy-policy']") !== null, true);
  assert.deepEqual([...doc.querySelectorAll("dl dd")].map((dd) => dd.textContent), ["100+", "4100+", "2000+"]);
  assert.equal(doc.querySelectorAll("[data-contact-section=offices] li").length, 6);
  assert.ok(doc.querySelector("a[href='tel:+41435051790']"));
  assert.ok(doc.querySelector("a[href='mailto:info@imaa-institute.org']"));

  const off = parse(renderToStaticMarkup(createElement(ContactPageView, { page: { ...page, form: { ...page.form, enabled: false } } })));
  assert.equal(off.querySelector("form"), null);
  assert.match(off.querySelector("[data-contact-unavailable]").textContent, /not available.*info@imaa-institute\.org/s);
});

test("contact rules: validation mirrors the backend; payload carries the honeypot and token", () => {
  const rules = { countries: ["Germany"], max_lengths: { first_name: 5, message: 2000 } };
  const errors = validateContact({ first_name: "Annabelle", last_name: " ", email: "x@", phone: "abc", country: "Mars", message: "", consent: false }, rules);
  assert.deepEqual(Object.keys(errors).sort(), ["consent", "country", "email", "first_name", "last_name", "message", "phone"]);
  assert.match(errors.first_name, /at most 5/);
  assert.deepEqual(validateContact({ first_name: "Ann", last_name: "Lee", email: "ann@example.com", phone: "", country: "Germany", message: "Hi", consent: true }, rules), {});
  const payload = contactPayload({ first_name: " Ann ", consent: true, website: "bot" }, "tok");
  assert.equal(payload.first_name, "Ann");
  assert.equal(payload.website, "bot");
  assert.equal(payload.form_token, "tok");
});

test("contact answers: success only for 200 sent; every failure is an error", () => {
  assert.deepEqual(interpretContactResponse(200, { status: "sent" }), { kind: "sent" });
  assert.deepEqual(interpretContactResponse(200, { status: "sent", duplicate: true }), { kind: "sent" });
  assert.equal(interpretContactResponse(200, {}).kind, "error");
  assert.equal(interpretContactResponse(200, null).kind, "error");
  const invalid = interpretContactResponse(400, { email: ["Enter a valid email address."], country: "Select your country." });
  assert.deepEqual(invalid.fieldErrors, { email: "Enter a valid email address.", country: "Select your country." });
  assert.equal(interpretContactResponse(400, { code: "form_expired", detail: "x" }).reload, true);
  assert.equal(interpretContactResponse(400, { code: "form_invalid", detail: "x" }).reload, true);
  assert.match(interpretContactResponse(400, { code: "too_fast", detail: "x" }).message, /take a moment/);
  assert.match(interpretContactResponse(429, { detail: "Request was throttled." }).message, /several messages/);
  assert.match(interpretContactResponse(503, { code: "contact_unavailable" }).message, /not available/);
  assert.match(interpretContactResponse(502, { code: "delivery_failed" }).message, /could not be sent/);
  assert.equal(interpretContactResponse(500, null).kind, "error");
});

async function fillValidForm(container) {
  const field = (name) => container.querySelector(`[name=${name}]`);
  await type(field("first_name"), "Ann");
  await type(field("last_name"), "Lee");
  await type(field("email"), "ann@example.com");
  await type(field("country"), "Germany");
  await type(field("message"), "Please call me.");
  await click(field("consent"));
}
const submitButton = (container) => container.querySelector("button[type=submit]");

test("contact form: client-side errors block sending and are announced; success after 200 sent", async () => {
  const { ContactForm } = await loadModules();
  const { page } = await readContactPageResponse(jsonResponse(200, contactPage()));
  const props = { form: page.form, consentHtml: page.consent_html, successMessage: page.success_message, fallbackEmail: "info@imaa-institute.org" };
  await withMockedFetch(() => jsonResponse(200, { status: "sent" }), async (calls) => {
    const { container, root } = await mount(createElement(ContactForm, props));
    await click(submitButton(container));
    await settle();
    assert.equal(calls.length, 0, "nothing is sent while fields are invalid");
    const alert = container.querySelector("[role=alert]");
    assert.match(alert.textContent, /Please correct the highlighted fields/);
    assert.equal(document.activeElement, alert, "the error summary receives focus");
    assert.equal(container.querySelector("[name=email]").getAttribute("aria-invalid"), "true");
    assert.ok(container.querySelector(`#${CSS.escape(container.querySelector("[name=email]").getAttribute("aria-describedby"))}`));

    await fillValidForm(container);
    await click(submitButton(container));
    await settle();
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, `${API_BASE}/cms/public/contact/`);
    assert.equal(calls[0].init.method, "POST");
    assert.equal(calls[0].init.credentials, "omit");
    const body = JSON.parse(calls[0].init.body);
    assert.deepEqual(body, { first_name: "Ann", last_name: "Lee", email: "ann@example.com", phone: "", country: "Germany",
                             message: "Please call me.", consent: true, website: "", form_token: "signed-token-1" });
    const result = container.querySelector("[data-contact-result=sent]");
    assert.match(result.textContent, /Thank you for your message/);
    assert.equal(container.querySelector("form"), null, "the form is replaced: it cannot be sent twice");
    await act(async () => root.unmount());
  });
});

test("contact form: backend failures never show success and keep the values; one request at a time", async () => {
  const { ContactForm } = await loadModules();
  const { page } = await readContactPageResponse(jsonResponse(200, contactPage()));
  const props = { form: page.form, consentHtml: page.consent_html, successMessage: page.success_message, fallbackEmail: "info@imaa-institute.org" };
  for (const [status, body, pattern] of [
    [502, { code: "delivery_failed", detail: "x" }, /could not be sent/],
    [503, { code: "contact_unavailable", detail: "x" }, /not available/],
    [429, { detail: "Request was throttled." }, /several messages/],
    [500, null, /could not be sent/],
  ]) {
    await withMockedFetch(() => (body === null ? new Response("<html>", { status }) : jsonResponse(status, body)), async (calls) => {
      const { container, root } = await mount(createElement(ContactForm, props));
      await fillValidForm(container);
      await click(submitButton(container));
      await settle();
      assert.equal(calls.length, 1, String(status));
      assert.equal(container.querySelector("[data-contact-result=sent]"), null, `${status} is not a success`);
      assert.match(container.querySelector("[role=alert]").textContent, pattern);
      assert.equal(container.querySelector("[name=message]").value, "Please call me.", "the message is kept");
      await act(async () => root.unmount());
    });
  }

  // Server-side field errors are shown on the fields.
  await withMockedFetch(() => jsonResponse(400, { email: ["Enter a valid email address."] }), async () => {
    const { container, root } = await mount(createElement(ContactForm, props));
    await fillValidForm(container);
    await click(submitButton(container));
    await settle();
    assert.equal(container.querySelector("[data-field-error=email]").textContent, "Enter a valid email address.");
    await act(async () => root.unmount());
  });

  // A second click while sending sends nothing.
  let release;
  await withMockedFetch(() => new Promise((resolve) => { release = () => resolve(jsonResponse(200, { status: "sent" })); }), async (calls) => {
    const { container, root } = await mount(createElement(ContactForm, props));
    await fillValidForm(container);
    await click(submitButton(container));
    assert.equal(submitButton(container).disabled, true);
    assert.match(submitButton(container).textContent, /Sending/);
    await click(submitButton(container));
    assert.equal(calls.length, 1);
    await act(async () => release());
    await settle();
    assert.ok(container.querySelector("[data-contact-result=sent]"));
    await act(async () => root.unmount());
  });
});

test("contact form: an expired token is renewed in place and used for the next attempt", async () => {
  const { ContactForm } = await loadModules();
  const { page } = await readContactPageResponse(jsonResponse(200, contactPage()));
  const props = { form: page.form, consentHtml: page.consent_html, successMessage: page.success_message, fallbackEmail: "" };
  await withMockedFetch((url, init, n) => {
    if (url.includes("/by-path/")) return jsonResponse(200, contactPage({ form: { ...contactPage().form, token: "signed-token-2" } }));
    return n === 1 ? jsonResponse(400, { code: "form_expired", detail: "expired" }) : jsonResponse(200, { status: "sent" });
  }, async (calls) => {
    const { container, root } = await mount(createElement(ContactForm, props));
    await fillValidForm(container);
    await click(submitButton(container));
    await settle();
    assert.match(container.querySelector("[role=alert]").textContent, /renewed/);
    assert.equal(calls[1].init.credentials, "omit");
    await click(submitButton(container));
    await settle();
    assert.equal(JSON.parse(calls[2].init.body).form_token, "signed-token-2");
    assert.ok(container.querySelector("[data-contact-result=sent]"));
    await act(async () => root.unmount());
  });
});

// ============================================================ Articles ==

test("articles: list and detail responses are read strictly", async () => {
  const { archive } = await readArticleListResponse(jsonResponse(200, listBody([
    post("a", "A"), post("bad slug", "Bad"), post("b", "", {}), post("c", "C", { featured_image: "/media/c.png", published_at: "nope", tags: [{ name: "x", slug: "bad slug" }] }),
  ], 30)));
  assert.equal(archive.count, 30);
  assert.deepEqual(archive.results.map((a) => a.slug), ["a", "c"]);
  assert.equal(archive.results[1].featured_image, "", "relative/unsafe image URLs are dropped (placeholder)");
  assert.equal(archive.results[1].published_at, "");
  assert.deepEqual(archive.results[1].tags, []);
  assert.equal(archive.results[0].author, "IMAA");
  assert.deepEqual(archive.filters.years.map((y) => y.year), ["2024", "2016"]);
  assert.deepEqual(await readArticleListResponse(jsonResponse(404, { detail: "Invalid page." })), { status: "not_found" });
  for (const response of [jsonResponse(500, {}), jsonResponse(200, { results: [] }), new Response("x", { status: 200 })]) {
    await assert.rejects(readArticleListResponse(response), PublicCmsUnavailableError);
  }
  const { article } = await readArticleDetailResponse(jsonResponse(200, { ...post("a", "A"), content_html: "<p>Body</p>", seo_title: "SEO", seo_description: "" }));
  assert.equal(article.content_html, "<p>Body</p>");
  await assert.rejects(readArticleDetailResponse(jsonResponse(200, post("a", "A"))), PublicCmsUnavailableError);
});

test("articles: query, links, pagination and dates", () => {
  assert.deepEqual(parseArchiveQuery({ page: "3", tag: "ma", year: "2016" }), { page: 3, tag: "ma", year: "2016", invalid: false });
  assert.deepEqual(parseArchiveQuery({}), { page: 1, tag: "", year: "", invalid: false });
  for (const bad of [{ page: "0" }, { page: "x" }, { year: "16" }, { tag: "a b" }]) assert.equal(parseArchiveQuery(bad).invalid, true);
  assert.equal(archiveHref("/publications", { page: 1 }), "/publications");
  assert.equal(archiveHref("/publications", { page: 2, tag: "ma", year: "2016" }), "/publications?tag=ma&year=2016&page=2");
  assert.deepEqual(paginationItems(1, 1), [1]);
  assert.deepEqual(paginationItems(5, 33), [1, null, 4, 5, 6, null, 33]);
  assert.deepEqual(paginationItems(2, 3), [1, 2, 3]);
  assert.equal(formatArticleDate("2024-06-25T23:31:40Z"), "June 25, 2024");
});

test("news archive route: API query, canonical/noindex metadata, 404 for bad pages and queries, errors", async () => {
  const { NewsRoute, newsMetadata } = await loadModules();
  await withMockedFetch(() => jsonResponse(200, listBody([post("a", "A")], 97)), async (calls) => {
    const html = renderToStaticMarkup(await NewsRoute({ searchParams: Promise.resolve({ page: "2" }) }));
    assert.equal(calls[0].url, `${API_BASE}/blogs/public/in-the-news/?page=2&page_size=12`);
    assert.equal(calls[0].init.cache, "no-store");
    const doc = parse(html);
    assert.equal(doc.querySelector("h1").textContent, "In The News");
    assert.equal(doc.querySelector("[data-article-list] a").getAttribute("href"), "/in-the-news/a");
    assert.equal(doc.querySelector("nav[aria-label=Pagination] [aria-current=page]").textContent, "Page 2");
    assert.equal(doc.querySelector("a[rel=prev]").getAttribute("href"), "/in-the-news");
    assert.equal(doc.querySelector("a[rel=next]").getAttribute("href"), "/in-the-news?page=3");
    const page2 = await newsMetadata({ searchParams: Promise.resolve({ page: "2" }) });
    assert.equal(page2.alternates.canonical, `${SITE_ORIGIN}/in-the-news?page=2`);
    assert.equal(page2.robots, undefined);
    const filtered = await newsMetadata({ searchParams: Promise.resolve({ tag: "ma" }) });
    assert.equal(filtered.alternates.canonical, `${SITE_ORIGIN}/in-the-news`);
    assert.deepEqual(filtered.robots, { index: false, follow: true });
    await NewsRoute({ searchParams: Promise.resolve({ tag: "ma", year: "2016" }) });
    assert.equal(calls.at(-1).url, `${API_BASE}/blogs/public/in-the-news/?page=1&page_size=12&tag=ma&year=2016`);
  });
  await withMockedFetch(() => jsonResponse(200, listBody([])), async (calls) => {
    await assert.rejects(NewsRoute({ searchParams: Promise.resolve({ page: "x" }) }), is404);
    assert.equal(calls.length, 0, "a malformed query never reaches the backend");
  });
  await withMockedFetch(() => jsonResponse(404, { detail: "Invalid page." }), async () => {
    await assert.rejects(NewsRoute({ searchParams: Promise.resolve({ page: "99" }) }), is404);
  });
  await withMockedFetch(() => jsonResponse(502, {}), async () => {
    await assert.rejects(NewsRoute({ searchParams: Promise.resolve({}) }), { name: "PublicCmsUnavailableError" });
  });
});

test("archive view: filters, placeholder images, empty and filtered-empty states", async () => {
  const { ArticleArchiveView, ARTICLE_SECTIONS } = await loadModules();
  const section = ARTICLE_SECTIONS.publications;
  const { archive } = await readArticleListResponse(jsonResponse(200, listBody([post("a", "A"), post("b", "B", { featured_image: null, excerpt: "" })], 2)));
  const doc = parse(renderToStaticMarkup(createElement(ArticleArchiveView, { section, archive, query: { page: 1, tag: "ma", year: "" } })));
  assert.equal(doc.querySelector("h1").textContent, "M&A Publications");
  const cards = [...doc.querySelectorAll("[data-article-list] article")];
  assert.equal(cards[0].querySelector("img").getAttribute("src"), `${MEDIA}/a.webp`);
  assert.ok(cards[1].querySelector("[data-image-placeholder]"), "missing image: placeholder, never a broken image");
  assert.equal(cards[1].querySelector("img"), null);
  assert.equal(cards[0].querySelector("time").getAttribute("datetime"), "2024-06-25T04:31:40Z");
  assert.equal(doc.querySelector("[data-article-filters] a[aria-current=page]").getAttribute("href"), "/publications?tag=ma");
  assert.equal(doc.querySelector("form[action='/publications'] input[name=tag]").value, "ma", "the year form keeps the topic");
  assert.deepEqual([...doc.querySelectorAll("select[name=year] option")].map((o) => o.textContent), ["All years", "2024 (9)", "2016 (109)"]);
  assert.match(doc.body.textContent, /2 publications on “M&A”/);
  assert.equal(doc.querySelector("nav[aria-label=Pagination]"), null, "one page: no pagination");

  const none = parse(renderToStaticMarkup(createElement(ArticleArchiveView, { section, archive: { count: 0, results: [], filters: { years: [], tags: [] } }, query: { page: 1, tag: "", year: "" } })));
  assert.match(none.querySelector("[data-article-empty]").textContent, /No publications have been published yet/);
  const filteredNone = parse(renderToStaticMarkup(createElement(ArticleArchiveView, { section, archive: { count: 0, results: [], filters: archive.filters }, query: { page: 1, tag: "", year: "1990" } })));
  assert.match(filteredNone.querySelector("[data-article-empty]").textContent, /No publications match these filters/);
});

test("publication article: server-rendered body, topics, metadata; incomplete legacy posts say so", async () => {
  const { PublicationRoute, publicationMetadata, ArticleDetailView, ARTICLE_SECTIONS } = await loadModules();
  const detail = { ...post("2024-m-and-a-mid-year-outlook", "2024 M&A Mid-Year Outlook"), content_html: '<p>Global M&amp;A <a href="https://imaa-institute.org/docs/report.pdf">report (PDF)</a></p>',
                   seo_title: "2024 M&A Mid-Year Outlook - IMAA", seo_description: "Outlook", updated_at: "2025-06-24T08:00:46Z" };
  await withMockedFetch(() => jsonResponse(200, detail), async (calls) => {
    const doc = parse(renderToStaticMarkup(await PublicationRoute({ params: Promise.resolve({ slug: detail.slug }) })));
    assert.equal(calls[0].url, `${API_BASE}/blogs/public/publications/2024-m-and-a-mid-year-outlook/`);
    assert.equal(doc.querySelector("h1").textContent, "2024 M&A Mid-Year Outlook");
    assert.equal(doc.querySelector("[data-article-body] a").getAttribute("href"), "https://imaa-institute.org/docs/report.pdf");
    assert.equal(doc.querySelector("a[href='/publications?tag=ma']").textContent, "M&A");
    assert.equal(doc.querySelector("header a").getAttribute("href"), "/publications");
    const metadata = await publicationMetadata({ params: Promise.resolve({ slug: detail.slug }) });
    assert.deepEqual(metadata.title, { absolute: "2024 M&A Mid-Year Outlook - IMAA" });
    assert.equal(metadata.alternates.canonical, `${SITE_ORIGIN}/publications/2024-m-and-a-mid-year-outlook`);
    assert.equal(metadata.openGraph.type, "article");
    assert.equal(metadata.openGraph.images[0].url, detail.featured_image);
  });
  await withMockedFetch(() => NOT_FOUND(), async () => {
    await assert.rejects(PublicationRoute({ params: Promise.resolve({ slug: "missing" }) }), is404);
  });
  await withMockedFetch(() => jsonResponse(200, detail), async (calls) => {
    await assert.rejects(PublicationRoute({ params: Promise.resolve({ slug: "../admin" }) }), is404);
    assert.equal(calls.length, 0);
  });

  const section = ARTICLE_SECTIONS.publications;
  const imageOnly = parse(renderToStaticMarkup(createElement(ArticleDetailView, { section, article: { ...(await readArticleDetailResponse(jsonResponse(200, { ...detail, content_html: '<p><img src="https://m.example/x.png" alt=""></p>' }))).article } })));
  assert.ok(imageOnly.querySelector("[data-article-body] img"), "image-only legacy content is shown");
  const empty = parse(renderToStaticMarkup(createElement(ArticleDetailView, { section, article: { ...(await readArticleDetailResponse(jsonResponse(200, { ...detail, content_html: "<p> </p>" }))).article } })));
  assert.match(empty.querySelector("[data-article-incomplete]").textContent, /Outlook excerpt|not available/);
});

// ============================================================ Navigation flags ==

test("route flags: development on, production off until enabled; links fall back to imaa-institute.org", async () => {
  const { publicSectionRouteEnabled, publicSectionHref } = await loadModules();
  assert.equal(publicSectionRouteEnabled("news", undefined, "development"), true);
  assert.equal(publicSectionRouteEnabled("news", undefined, "production"), false);
  assert.equal(publicSectionRouteEnabled("news", "enabled", "production"), true);
  assert.equal(publicSectionRouteEnabled("news", "disabled", "development"), false);
  assert.equal(publicSectionHref("contact", true), "/contact-us");
  assert.equal(publicSectionHref("contact", false), "https://imaa-institute.org/contact-us/");
  assert.equal(publicSectionHref("publications", false), "https://imaa-institute.org/publications/");
  assert.equal(publicSectionHref("testimonials", true), "/testimonials");
  assert.equal(publicSectionHref("news", true), "/in-the-news");
});

test("archive topics: the ten most used are visible, the rest in a disclosure that opens for an active topic", async () => {
  const { ArticleArchiveView, ARTICLE_SECTIONS } = await loadModules();
  const tags = Array.from({ length: 14 }, (_, i) => ({ slug: `t${i}`, name: `Topic ${i}`, count: 20 - i }));
  const archive = { count: 0, results: [], filters: { years: [], tags } };
  const render = (tag) => parse(renderToStaticMarkup(createElement(ArticleArchiveView, { section: ARTICLE_SECTIONS.news, archive, query: { page: 1, tag, year: "" } })));
  const doc = render("");
  const nav = doc.querySelector("[data-article-filters] nav");
  assert.equal(nav.querySelectorAll(":scope > ul > li").length, 11, "All topics + 10");
  const more = nav.querySelector("details");
  assert.match(more.querySelector("summary").textContent, /More topics \(4\)/);
  assert.equal(more.hasAttribute("open"), false);
  assert.equal(render("t12").querySelector("details").hasAttribute("open"), true);
});

test("article image: a failed image is replaced by the placeholder", async () => {
  const { ArticleArchiveView, ARTICLE_SECTIONS } = await loadModules();
  const { archive } = await readArticleListResponse(jsonResponse(200, listBody([post("a", "A")], 1)));
  const { container, root } = await mount(createElement(ArticleArchiveView, { section: ARTICLE_SECTIONS.news, archive, query: { page: 1, tag: "", year: "" } }));
  const img = container.querySelector("[data-article-list] img");
  assert.ok(img);
  await act(async () => img.dispatchEvent(new Event("error")));
  assert.equal(container.querySelector("[data-article-list] img"), null);
  assert.ok(container.querySelector("[data-image-placeholder]"));
  await act(async () => root.unmount());
});

test("migrated imaa-institute.org pages link to this website; everything else stays external", async () => {
  const { siteHref, rewriteMigratedLinks, migratedRoutes } = await loadModules();
  // Development build of the Next.js site: every migrated route is available and switched on.
  for (const [from, to] of [
    ["https://imaa-institute.org/contact-us/", "/contact-us"],
    ["https://imaa-institute.org/contact-us", "/contact-us"],
    ["https://www.imaa-institute.org/testimonials/", "/testimonials"],
    ["https://imaa-institute.org/our-team/", "/our-team"],
    ["https://imaa-institute.org/about-us/", "/about"],
    ["https://imaa-institute.org/in-the-news/", "/in-the-news"],
    ["https://imaa-institute.org/publications/", "/publications"],
    ["https://imaa-institute.org/frequently-asked-questions/#fees", "/frequently-asked-questions#fees"],
    ["https://imaa-institute.org/privacy-policy/", "/privacy-policy"],
  ]) assert.equal(siteHref(from), to, from);
  for (const external of [
    "https://imaa-institute.org/",
    "https://imaa-institute.org/testimonials/aniruddha-sulake/",
    "https://imaa-institute.org/team/david-olsson/",
    "https://imaa-institute.org/m-and-a-trainings/international-m-and-a/",
    "https://imaa-institute.org/book-a-demo/",
    "https://imaa-institute.org/publications/2024-m-and-a-mid-year-outlook/",
    "https://imaa-institute.org.evil.test/contact-us/",
    "https://www.linkedin.com/in/x/",
    "/references",
  ]) assert.equal(siteHref(external), external, external);
  // A route that is not available or not switched on keeps its WordPress address.
  assert.equal(siteHref("https://imaa-institute.org/imprint/", migratedRoutes(false)), "https://imaa-institute.org/imprint/");
  assert.equal(siteHref("https://imaa-institute.org/contact-us/", {}), "https://imaa-institute.org/contact-us/");
  const production = migratedRoutes(true, { contact: "enabled" }, "production");
  assert.equal(siteHref("https://imaa-institute.org/contact-us/", production), "/contact-us", "switched on in production");
  assert.equal(siteHref("https://imaa-institute.org/testimonials/", production), "https://imaa-institute.org/testimonials/",
               "production keeps the WordPress page until the route is enabled");
  assert.equal(
    rewriteMigratedLinks('<p><a href="https://imaa-institute.org/contact-us/">Contact</a> <a href="https://imaa-institute.org/team/a/">Bio</a></p>'),
    '<p><a href="/contact-us">Contact</a> <a href="https://imaa-institute.org/team/a/">Bio</a></p>',
  );
});

test("Our Team and About content buttons to migrated pages stay on this website", async () => {
  const { ContactPageView } = await loadModules();
  const { page } = await readContactPageResponse(jsonResponse(200, contactPage({
    sections: [{ type: "card_group", id: "c1", heading: "", layout: "grid", prompt: "", button: null,
                 cards: [{ title: "Card", text: "", icon: "", image: null, link: { label: "Testimonials", url: "https://imaa-institute.org/testimonials/" } },
                         { title: "Card 2", text: "", icon: "", image: null, link: { label: "Guidance", url: "https://imaa-institute.org/get-expert-guidance/" } }] }],
  })));
  const doc = parse(renderToStaticMarkup(createElement(ContactPageView, { page })));
  const links = [...doc.querySelectorAll("[data-contact-section=card_group] a")];
  assert.equal(links[0].getAttribute("href"), "/testimonials");
  assert.doesNotMatch(links[0].textContent, /imaa-institute\.org/, "no external mark on an internal link");
  assert.equal(links[1].getAttribute("href"), "https://imaa-institute.org/get-expert-guidance/");
  assert.match(links[1].textContent, /imaa-institute\.org/);
});
