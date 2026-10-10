// Public About page (src/app/(site)/about): response rules, server loader, metadata, 404 and
// rendering of cms.AboutPage content, including the ordered sections (accreditations, ISO band,
// study formats, programmes, testimonials, media callout, logos, offices).
//
// node:test + jsdom. The real loader, route and view are bundled on the fly with esbuild (as in
// publicSitePages.test.mjs) and run against a mocked global fetch: no request leaves the process.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";
import { JSDOM } from "jsdom";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ABOUT_PAGE_PATHS, readAboutPageResponse } from "../../lib/publicAboutResponse.js";
import { PublicCmsUnavailableError } from "../../lib/publicCmsResponse.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../..");
const API_BASE = "http://cms.example.test/api";
const SITE_ORIGIN = "https://connect.example.test";
const MEDIA = "https://media.example.test/images";

const jsonResponse = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const NOT_FOUND = () => jsonResponse(404, { detail: "Not found" });
const img = (name, width = 600, height = 400, alt = "") => ({ url: `${MEDIA}/${name}`, width, height, alt });

// The shape cms/about_page_api.py serves for a populated page (values shortened).
const SECTIONS = [
  {
    type: "accordion", id: "s1", heading: "Accreditation & Recognition", image: img("accreditation.jpg", 1276, 370),
    items: [
      { title: "Association of Chartered Certified Accountants (ACCA)", body_html: '<p>The <a href="https://www.accaglobal.com/" rel="noopener noreferrer">ACCA</a> …</p>', logo: null },
      { title: "City of Vienna", body_html: "<p>Recognised as a research institute.</p>", logo: null },
      { title: "United Nations", body_html: "<p>A registered NGO.</p>", logo: null },
    ],
  },
  {
    type: "cta_band", id: "s2", text_html: "<p>We have been granted the ISO certification by TUEV Austria.</p>",
    logos: [img("amazon.png", 81, 31, "Amazon")], button: { label: "Book a Training", url: "/m-and-a-trainings" },
  },
  {
    type: "card_group", id: "s3", heading: "Study Formats Available", layout: "grid",
    cards: [{ title: "Onsite", text: "An intensive 30 hours program.", icon: "onsite", image: null, link: null }],
    prompt: "Don´t know which option is right for you?",
    button: { label: "SCHEDULE A CONSULTATION", url: "https://imaa-institute.org/book-a-demo/" },
  },
  {
    type: "card_group", id: "s4", heading: "Available Programs", layout: "carousel", prompt: "", button: null,
    cards: [
      { title: "International M&A Expert", text: "The entire M&A process.", icon: "", image: img("ima.png", 530, 363),
        link: { label: "LEARN MORE", url: "https://imaa-institute.org/m-and-a-trainings/international-m-and-a/" } },
      { title: "Certified Post Merger Integration Expert", text: "Integration planning.", icon: "", image: img("cpmi.png", 530, 363),
        link: { label: "LEARN MORE", url: "https://imaa-institute.org/m-and-a-trainings/post-merger-integration/" } },
    ],
  },
  {
    type: "testimonials", id: "s5", heading: "Participant Testimonials",
    items: [{ name: "Chuck Adams", role: "Managing Partner", company: "Coeptis Consulting Group", programme: "IM&A, M&AP",
              quote_html: "<p>Impressed by the rigor.</p>", photo: img("chuck.jpg", 240, 240, "Chuck Adams"),
              url: "https://imaa-institute.org/testimonials/chuck-adams/" }],
    button: { label: "See All Testimonials", url: "https://imaa-institute.org/testimonials/" },
  },
  { type: "contact_callout", id: "s6", heading: "Media inquiries", text_html: "<p>For media inquiries, please contact us at <b>info@imaa.org</b></p>", email: "info@imaa.org", button_label: "Email us" },
  { type: "logo_strip", id: "s7", heading: "We’re trusted by", logos: [img("givaudan.webp", 163, 36, "Givaudan"), img("ubs.webp", 99, 38, "UBS")], button: { label: "SEE FULL LIST", url: "/references" } },
  { type: "offices", id: "s8", heading: "Contact Us", email: "info@imaa-institute.org",
    offices: [{ city: "ZURICH", country: "Switzerland", phone: "+41 43 505 17 99", phone_href: "tel:+41435051799", image: img("ch.webp", 160, 160) }] },
];

const aboutPage = (overrides = {}) => ({
  id: 6,
  title: "About Us",
  slug: "about",
  type: "AboutPage",
  path: "/about/",
  hero_title: "Setting and Advancing the Standards of M&A Globally",
  hero_subtitle: "",
  hero_image_url: "",
  hero_image: img("banner.jpg", 1570, 450),
  intro_html: "<p>Since our establishment in 2004.</p><ul><li>Global Expertise</li><li>World-Class Faculty</li></ul>",
  intro_image: img("about-us.webp", 698, 515),
  stats: [{ value: "100+", label: "Number of countries" }, { value: "4100+", label: "Number of participants" }, { value: "2000+", label: "Number of companies" }],
  features_title: "",
  features: [
    { title: "Research", desc: "Design, conduct, and disseminate research.", image_url: "" },
    { title: "Integrator", desc: "Act as an integrator.", image_url: "" },
  ],
  mission_title: "Our Mission",
  mission_html: "<p>The world’s largest free-of-charge M&amp;A Statistics database.</p>",
  sections: SECTIONS,
  seo_title: "About Us - M&A Education in Imaa Institute",
  search_description: "",
  first_published_at: "2026-10-07T08:38:19Z",
  last_published_at: "2026-10-07T08:38:19Z",
  ...overrides,
});

const NEXT_NOT_FOUND = (error) => {
  assert.match(String(error?.digest), /^NEXT_HTTP_ERROR_FALLBACK;404$/);
  return true;
};

let modules;
async function loadModules() {
  if (modules) return modules;
  const outDir = path.join(ROOT, "node_modules", ".cache", "public-about-tests");
  fs.mkdirSync(outDir, { recursive: true });
  const outfile = path.join(outDir, `public-about-${process.pid}.mjs`);
  await build({
    stdin: {
      contents: [
        'export { loadPublicAboutPage } from "@/lib/publicAbout.server";',
        'export { generateMetadata, default as PublicAboutPage } from "@/app/(site)/about/page.jsx";',
        'export { default as AboutPageView } from "@/components/public/AboutPageView.jsx";',
      ].join("\n"),
      resolveDir: ROOT,
      sourcefile: "public-about-entry.js",
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
        name: "public-about-test-resolve",
        setup(pluginBuild) {
          pluginBuild.onResolve({ filter: /^@\// }, (args) =>
            pluginBuild.resolve(`./${args.path.slice(2)}`, { kind: args.kind, resolveDir: path.join(ROOT, "src") })
          );
          // Packages stay external. Next.js has no exports map, so ESM needs the file name.
          pluginBuild.onResolve({ filter: /^[^./]/ }, (args) => ({
            path: args.path === "next/navigation" ? "next/navigation.js" : args.path,
            external: true,
          }));
        },
      },
    ],
  });
  try {
    modules = await import(pathToFileURL(outfile).href);
  } finally {
    fs.rmSync(outfile, { force: true });
  }
  return modules;
}

// Runs `fn` with a mocked global fetch that answers from `respond(url)` and records calls.
async function withMockedFetch(respond, fn) {
  const calls = [];
  const original = globalThis.fetch;
  const env = { CMS_API_BASE_URL: process.env.CMS_API_BASE_URL, NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL };
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return respond(String(url), init);
  };
  process.env.CMS_API_BASE_URL = API_BASE;
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
const pathOf = (url) => new URL(url).searchParams.get("path");
const parse = (html) => new JSDOM(`<body>${html}</body>`).window.document;
const readPage = async (overrides) => (await readAboutPageResponse(jsonResponse(200, aboutPage(overrides)), "/about/")).page;
async function renderPage(overrides) {
  const { AboutPageView } = await loadModules();
  return parse(renderToStaticMarkup(createElement(AboutPageView, { page: await readPage(overrides) })));
}

// ------------------------------------------------------------------ response rules --

test("a published AboutPage is read with only the renderer's fields", async () => {
  const page = await readPage({ unexpected: "x", intro_image: { url: "/media/relative.jpg", width: 10, height: 10 } });
  assert.equal(page.unexpected, undefined);
  assert.equal(page.intro_image, null, "only absolute image URLs are used");
  assert.deepEqual(page.hero_image, img("banner.jpg", 1570, 450));
  assert.equal(page.stats.length, 3);
  assert.deepEqual(page.sections.map((s) => s.type), ["accordion", "cta_band", "card_group", "card_group", "testimonials", "contact_callout", "logo_strip", "offices"]);
});

test("sections are normalised: unknown types, empty blocks and unsafe links are dropped", async () => {
  const page = await readPage({
    sections: [
      { type: "script", id: "x", html: "<script>" },
      { type: "accordion", id: "a", heading: "Empty", items: [{ title: " ", body_html: "<p>x</p>" }] },
      { type: "cta_band", id: "b", text_html: "<p>ISO</p>", logos: [{ url: "javascript:x" }], button: { label: "Go", url: "javascript:alert(1)" } },
      { type: "card_group", id: "c", heading: "P", layout: "weird", cards: [{ title: "A", link: { label: "More", url: "//evil.example" } }] },
      { type: "contact_callout", id: "d", heading: "Media", text_html: "", email: "not-an-email", button_label: "Email" },
      { type: "offices", id: "e", heading: "Contact", email: "", offices: [{ city: "ZURICH", phone: "+41", phone_href: "javascript:x" }] },
    ],
    stats: [{ value: "1", label: "a" }, { value: "", label: "b" }, { value: "2", label: "c" }, { value: "3", label: "d" }, { value: "4", label: "e" }, { value: "5", label: "f" }],
  });
  assert.deepEqual(page.sections.map((s) => s.type), ["cta_band", "card_group", "offices"]);
  assert.equal(page.sections[0].button, null);
  assert.deepEqual(page.sections[0].logos, []);
  assert.equal(page.sections[1].layout, "grid");
  assert.equal(page.sections[1].cards[0].link, null);
  assert.equal(page.sections[2].offices[0].phone_href, "");
  assert.deepEqual(page.stats.map((s) => s.value), ["1", "2", "3", "4"], "at most four statistics, incomplete ones dropped");
});

test("a page without the new fields (before the CMS schema change) still renders its existing fields", async () => {
  const legacy = aboutPage();
  for (const key of ["hero_image", "intro_image", "stats", "sections"]) delete legacy[key];
  const { page } = await readAboutPageResponse(jsonResponse(200, { ...legacy, hero_image_url: `${MEDIA}/old.jpg` }), "/about/");
  assert.deepEqual(page.sections, []);
  assert.deepEqual(page.stats, []);
  assert.equal(page.intro_image, null);
  assert.equal(page.hero_image.url, `${MEDIA}/old.jpg`);
});

test("other page types and every 404 are not found; failures are errors", async () => {
  assert.deepEqual(await readAboutPageResponse(jsonResponse(200, aboutPage({ type: "StandardPage" })), "/about/"), { status: "not_found" });
  assert.deepEqual(await readAboutPageResponse(NOT_FOUND(), "/about/"), { status: "not_found" });
  for (const response of [
    jsonResponse(500, { detail: "x" }),
    jsonResponse(429, { detail: "throttled" }),
    new Response("<html>", { status: 200 }),
    jsonResponse(404, ["x"]),
    jsonResponse(200, { title: "", type: "AboutPage" }),
  ]) {
    await assert.rejects(readAboutPageResponse(response, "/about/"), PublicCmsUnavailableError);
  }
});

// ------------------------------------------------------------------ loader --

test("the loader asks for /about/ first, anonymously and uncached", async () => {
  const { loadPublicAboutPage } = await loadModules();
  await withMockedFetch(() => jsonResponse(200, aboutPage()), async (calls) => {
    const page = await loadPublicAboutPage();
    assert.equal(page.hero_title, "Setting and Advancing the Standards of M&A Globally");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, `${API_BASE}/cms/public/pages/by-path/?path=%2Fabout%2F`);
    assert.equal(calls[0].init.cache, "no-store");
    assert.deepEqual(calls[0].init.headers, { Accept: "application/json" });
    assert.equal(calls[0].init.credentials, undefined);
  });
});

test("the loader falls back to /about-us/ and /aboutus/, then reports a 404", async () => {
  const { loadPublicAboutPage } = await loadModules();
  assert.deepEqual([...ABOUT_PAGE_PATHS], ["/about/", "/about-us/", "/aboutus/"]);
  await withMockedFetch((url) => (pathOf(url) === "/about-us/" ? jsonResponse(200, aboutPage({ slug: "about-us" })) : NOT_FOUND()), async (calls) => {
    assert.equal((await loadPublicAboutPage()).slug, "about-us");
    assert.deepEqual(calls.map((call) => pathOf(call.url)), ["/about/", "/about-us/"]);
  });
  await withMockedFetch(() => NOT_FOUND(), async (calls) => {
    assert.equal(await loadPublicAboutPage(), null);
    assert.equal(calls.length, 3);
  });
});

test("a backend failure is an error, never a fallback or a 404", async () => {
  const { loadPublicAboutPage } = await loadModules();
  // The bundled loader has its own copy of the error class: compare by name.
  const unavailable = { name: "PublicCmsUnavailableError" };
  await withMockedFetch(() => jsonResponse(503, { detail: "down" }), async (calls) => {
    await assert.rejects(loadPublicAboutPage(), unavailable);
    assert.equal(calls.length, 1);
  });
  await withMockedFetch(() => { throw new TypeError("fetch failed"); }, async () => {
    await assert.rejects(loadPublicAboutPage(), unavailable);
  });
});

// ------------------------------------------------------------------ route --

test("metadata comes from the CMS: SEO title, description, canonical and the hero banner as social image", async () => {
  const { generateMetadata } = await loadModules();
  await withMockedFetch(() => jsonResponse(200, aboutPage({ hero_subtitle: "Executive education since 2004." })), async () => {
    const metadata = await generateMetadata();
    assert.deepEqual(metadata.title, { absolute: "About Us - M&A Education in Imaa Institute" });
    assert.equal(metadata.description, "Executive education since 2004.");
    assert.equal(metadata.alternates.canonical, `${SITE_ORIGIN}/about`);
    assert.equal(metadata.openGraph.url, `${SITE_ORIGIN}/about`);
    assert.deepEqual(metadata.openGraph.images, [{ url: `${MEDIA}/banner.jpg`, width: 1570, height: 450 }]);
  });
  await withMockedFetch(() => jsonResponse(200, aboutPage({ seo_title: "", search_description: "Own description" })), async () => {
    const metadata = await generateMetadata();
    assert.deepEqual(metadata.title, { absolute: "Setting and Advancing the Standards of M&A Globally" });
    assert.equal(metadata.description, "Own description");
  });
});

test("no published AboutPage is Next's 404 with empty metadata", async () => {
  const { PublicAboutPage, generateMetadata } = await loadModules();
  await withMockedFetch(() => NOT_FOUND(), async () => {
    await assert.rejects(PublicAboutPage(), NEXT_NOT_FOUND);
    assert.deepEqual(await generateMetadata(), {});
  });
});

// ------------------------------------------------------------------ rendering --

test("the page follows the WordPress order with alternating grounds", async () => {
  const { PublicAboutPage } = await loadModules();
  const html = await withMockedFetch(() => jsonResponse(200, aboutPage()), async () => renderToStaticMarkup(await PublicAboutPage()));
  const doc = parse(html);
  assert.equal(doc.querySelector("header p").textContent, "About Us", "the page title is the eyebrow");
  assert.equal(doc.querySelector("h1").textContent, "Setting and Advancing the Standards of M&A Globally");
  const sections = [...doc.querySelectorAll("[data-about-section]")];
  assert.deepEqual(sections.map((s) => s.dataset.aboutSection), [
    "intro", "mission", "accordion", "cta_band", "card_group", "card_group", "testimonials", "contact_callout", "logo_strip", "offices",
  ]);
  sections.forEach((section, index) => assert.equal(section.className, index % 2 ? "bg-imaa-cool" : "bg-white"));
});

test("intro: text beside the image, statistics and the trailing list as highlights", async () => {
  const doc = await renderPage();
  const intro = doc.querySelector("[data-about-section=intro]");
  assert.ok(intro.innerHTML.includes("<p>Since our establishment in 2004.</p>"));
  assert.equal(intro.querySelector(".max-w-\\[700px\\] ul"), null, "the highlights list is not repeated in the text");
  const image = intro.querySelector("img");
  assert.equal(image.getAttribute("src"), `${MEDIA}/about-us.webp`);
  assert.equal(image.getAttribute("loading"), "eager");
  assert.deepEqual([image.getAttribute("width"), image.getAttribute("height")], ["698", "515"]);
  assert.deepEqual([...intro.querySelectorAll("dl dd")].map((d) => d.textContent), ["100+", "4100+", "2000+"]);
  assert.deepEqual([...intro.querySelectorAll("dl dt")].map((d) => d.textContent), ["Number of countries", "Number of participants", "Number of companies"]);
  assert.deepEqual([...intro.querySelectorAll("ul li")].map((li) => li.textContent), ["Global Expertise", "World-Class Faculty"]);
});

test("mission: the statement comes before the pillar cards", async () => {
  const doc = await renderPage();
  const mission = doc.querySelector("[data-about-section=mission]");
  assert.equal(mission.querySelector("h2").textContent, "Our Mission");
  const statement = mission.querySelector("p");
  const firstCard = mission.querySelector("li");
  assert.ok(statement.compareDocumentPosition(firstCard) & 4, "statement precedes the cards");
  assert.deepEqual([...mission.querySelectorAll("li h3")].map((h) => h.textContent), ["Research", "Integrator"]);
});

test("accreditations: an accessible accordion in two columns, all items closed", async () => {
  const doc = await renderPage();
  const section = doc.querySelector("[data-about-section=accordion]");
  assert.equal(section.querySelector("h2").textContent, "Accreditation & Recognition");
  assert.equal(section.querySelector("img").getAttribute("loading"), "lazy");
  assert.equal(section.querySelectorAll("[data-faq-accordion]").length, 2);
  const buttons = [...section.querySelectorAll("h2 > button")];
  assert.equal(buttons.length, 3);
  for (const button of buttons) {
    assert.equal(button.getAttribute("aria-expanded"), "false");
    assert.ok(doc.getElementById(button.getAttribute("aria-controls")).hasAttribute("hidden"));
  }
  assert.equal(buttons[0].closest("h2").parentElement.id, "accreditation-association-of-chartered-certified-accountants-acca");
  assert.ok(section.innerHTML.includes('href="https://www.accaglobal.com/"'));
});

test("ISO band, study formats and the programme carousel render their CMS links and icons", async () => {
  const doc = await renderPage();
  const band = doc.querySelector("[data-about-section=cta_band]");
  assert.equal(band.querySelector("img").getAttribute("alt"), "Amazon");
  assert.equal(band.querySelector("a").getAttribute("href"), "/m-and-a-trainings");
  const [formats, programmes] = doc.querySelectorAll("[data-about-section=card_group]");
  assert.ok(formats.querySelector("svg path"), "the Onsite card shows its WordPress icon");
  assert.match(formats.textContent, /Don´t know which option is right for you\?/);
  assert.equal(formats.querySelector("a").getAttribute("href"), "https://imaa-institute.org/book-a-demo/");
  const carousel = programmes.querySelector("[aria-roledescription=carousel]");
  assert.equal(carousel.getAttribute("aria-label"), "Available Programs");
  const slides = [...carousel.querySelectorAll("[aria-roledescription=slide]")];
  assert.deepEqual(slides.map((s) => s.getAttribute("aria-label")), ["1 of 2", "2 of 2"]);
  const [previous, next] = carousel.querySelectorAll("button");
  assert.equal(previous.hasAttribute("disabled"), true);
  assert.equal(next.hasAttribute("disabled"), false);
  assert.equal(slides[0].querySelector("a").getAttribute("href"), "https://imaa-institute.org/m-and-a-trainings/international-m-and-a/");
});

test("testimonials, media callout, trusted logos and offices", async () => {
  const doc = await renderPage();
  const testimonial = doc.querySelector("[data-about-section=testimonials] figure");
  assert.equal(testimonial.querySelector("img").getAttribute("alt"), "Chuck Adams");
  assert.match(testimonial.textContent, /Managing Partner, Coeptis Consulting Group/);
  assert.match(testimonial.textContent, /IM&A, M&AP/);
  assert.equal(testimonial.querySelector("a").getAttribute("href"), "https://imaa-institute.org/testimonials/chuck-adams/");
  assert.equal(doc.querySelector("[data-about-section=contact_callout] a").getAttribute("href"), "mailto:info@imaa.org");
  const logos = doc.querySelector("[data-about-section=logo_strip]");
  assert.deepEqual([...logos.querySelectorAll("img")].map((i) => i.getAttribute("alt")), ["Givaudan", "UBS"]);
  assert.equal(logos.querySelectorAll("a").length, 1, "logos are not links; only 'See full list'");
  assert.equal(logos.querySelector("a").getAttribute("href"), "/references");
  const offices = doc.querySelector("[data-about-section=offices]");
  assert.equal(offices.querySelector("a[href^='mailto:']").getAttribute("href"), "mailto:info@imaa-institute.org");
  assert.equal(offices.querySelector("a[href^='tel:']").getAttribute("href"), "tel:+41435051799");
});

test("empty CMS fields and sections leave no blank sections", async () => {
  const doc = await renderPage({ hero_title: "", intro_html: "<p> </p>", intro_image: null, stats: [], features: [], mission_html: "", sections: [] });
  assert.equal(doc.querySelector("h1").textContent, "About Us");
  assert.equal(doc.querySelector("header p"), null, "no eyebrow when it would repeat the heading");
  assert.equal(doc.querySelectorAll("[data-about-section]").length, 0);
});

test("card text is plain text", async () => {
  const doc = await renderPage({ features: [{ title: "<b>Bold?</b>", desc: "<script>x</script>", image_url: "" }] });
  const html = doc.body.innerHTML;
  assert.ok(html.includes("&lt;b&gt;Bold?&lt;/b&gt;"));
  assert.ok(!html.includes("<script>"));
});
