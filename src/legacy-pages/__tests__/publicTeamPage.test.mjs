// Public Our Team page (src/app/(site)/our-team): response rules, loader, metadata, 404, rendering
// and the client-side programme filters.
//
// node:test + jsdom. The real modules are bundled on the fly with esbuild (as in
// publicAboutPage.test.mjs); the filters run in jsdom with react-dom/client and act().

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";
import { JSDOM } from "jsdom";

import { readTeamPageResponse } from "../../lib/publicTeamResponse.js";
import { PublicCmsUnavailableError } from "../../lib/publicCmsResponse.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../..");
const API_BASE = "http://cms.example.test/api";
const SITE_ORIGIN = "https://connect.example.test";
const MEDIA = "https://media.example.test/images";

// DOM globals before React DOM loads (the filter test mounts the client component).
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost:3000/our-team" });
const define = (key, value) => Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
define("window", dom.window);
define("document", dom.window.document);
define("navigator", dom.window.navigator);
for (const key of ["HTMLElement", "Element", "Node", "Event", "MouseEvent"]) define(key, dom.window[key]);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { act, createElement } = await import("react");
const { renderToStaticMarkup } = await import("react-dom/server");
const { createRoot } = await import("react-dom/client");

const jsonResponse = (status, body) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const NOT_FOUND = () => jsonResponse(404, { detail: "Not found" });
const photo = (name) => ({ url: `${MEDIA}/${name}.png`, width: 400, height: 400, alt: name });
const person = (slug, name, programmes, extra = {}) => ({
  slug, name, position: "Faculty", summary: `${name} summary`, location: "", programmes,
  linkedin_url: `https://www.linkedin.com/in/${slug}/`, profile_url: `https://imaa-institute.org/team/${slug}/`, photo: photo(slug), ...extra,
});

const teamPage = (overrides = {}) => ({
  id: 99, title: "Our Team", slug: "our-team", type: "TeamPage", path: "/our-team/",
  hero_title: "Our Team", hero_intro: "Meet our experts, faculty, staff and our advisory board.",
  hero_button: { label: "Contact our team", url: "https://imaa-institute.org/contact-us/" },
  faculty_heading: "Experts & Faculty", faculty_subheading: "Meet Our Faculty", faculty_intro_html: "<p>More than 60 professors.</p>",
  faculty_buttons: [{ label: "Schedule A Consultation", url: "https://imaa-institute.org/contact-us/" }, { label: "About In-House Trainings", url: "https://imaa-institute.org/in-house-training/" }],
  staff_heading: "Staff of IMAA", staff_subheading: "Meet the team", staff_intro_html: "<p>Our international team.</p>",
  staff_button: { label: "Contact our team", url: "https://imaa-institute.org/contact-us/" },
  programmes: [{ code: "IM&A", slug: "ima" }, { code: "CPMI", slug: "cpmi" }, { code: "SCDE", slug: "scde" }],
  faculty: [
    person("prof-dr-christopher-kummer", "Prof. Dr. Christopher Kummer", ["ima"], { position: "Founder and CEO" }),
    person("david-olsson", "David Olsson", ["cpmi", "ima", "scde"]),
    person("ajit-sane", "Ajit Sane", ["ima"]),
    person("christopher-young", "Christopher Young", [], { summary: "", linkedin_url: "" }),
  ],
  staff: [
    { ...person("prof-dr-christopher-kummer-staff", "Prof. Dr. Christopher Kummer", []), position: "CEO & Founder", location: "Zürich", linkedin_url: "", profile_url: "" },
    { ...person("erin-tan", "Erin Tan", []), position: "Director Strategic Partnership & Alliances APAC", location: "Singapore", linkedin_url: "", profile_url: "" },
  ],
  advisory: [],
  sections: [{ type: "offices", id: "s1", heading: "Contact Us", email: "info@imaa-institute.org",
               offices: [{ city: "ZURICH", country: "Switzerland", phone: "+41 43 505 17 99", phone_href: "tel:+41435051799", image: null }] }],
  seo_title: "Our Team of M&A Experts - IMAA",
  search_description: "Meet our experts coming from over 20 countries.",
  ...overrides,
});

let modules;
async function loadModules() {
  if (modules) return modules;
  const outDir = path.join(ROOT, "node_modules", ".cache", "public-team-tests");
  fs.mkdirSync(outDir, { recursive: true });
  const outfile = path.join(outDir, `public-team-${process.pid}.mjs`);
  await build({
    stdin: {
      contents: [
        'export { loadPublicTeamPage } from "@/lib/publicTeam.server";',
        'export { generateMetadata, default as PublicTeamPage } from "@/app/(site)/our-team/page.jsx";',
        'export { default as TeamPageView } from "@/components/public/team/TeamPageView.jsx";',
        'export { default as FacultyDirectory } from "@/components/public/team/FacultyDirectory.jsx";',
      ].join("\n"),
      resolveDir: ROOT, sourcefile: "public-team-entry.js", loader: "js",
    },
    bundle: true, format: "esm", platform: "node", target: "node20", jsx: "automatic", outfile, logLevel: "error",
    plugins: [{
      name: "public-team-test-resolve",
      setup(pluginBuild) {
        pluginBuild.onResolve({ filter: /^@\// }, (args) => pluginBuild.resolve(`./${args.path.slice(2)}`, { kind: args.kind, resolveDir: path.join(ROOT, "src") }));
        pluginBuild.onResolve({ filter: /^[^./]/ }, (args) => ({ path: args.path === "next/navigation" ? "next/navigation.js" : args.path, external: true }));
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
  const env = { CMS_API_BASE_URL: process.env.CMS_API_BASE_URL, NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL };
  globalThis.fetch = async (url, init) => { calls.push({ url: String(url), init }); return respond(String(url), init); };
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
const parse = (html) => new JSDOM(`<body>${html}</body>`).window.document;
const readPage = async (overrides) => (await readTeamPageResponse(jsonResponse(200, teamPage(overrides)))).page;

// ------------------------------------------------------------------ response rules --

test("a published TeamPage is read with only the renderer's fields", async () => {
  const page = await readPage({ unexpected: "x" });
  assert.equal(page.unexpected, undefined);
  assert.equal(page.faculty.length, 4);
  assert.equal(page.staff.length, 2);
  assert.deepEqual(page.programmes.map((p) => p.slug), ["ima", "cpmi", "scde"]);
  assert.deepEqual(page.faculty[1].programmes, ["cpmi", "ima", "scde"]);
  assert.equal(page.sections[0].type, "offices");
});

test("people are normalised: unsafe links, unknown programmes and duplicates are dropped", async () => {
  const page = await readPage({
    faculty: [
      person("a", "A", ["ima", "mba"], { linkedin_url: "http://www.linkedin.com/in/a", profile_url: "javascript:alert(1)", photo: { url: "/media/a.png" } }),
      person("a", "A again", ["ima"]),
      person("b", "", ["ima"]),
      person("c", "C", ["cpmi"], { profile_url: "mailto:x@example.com" }),
    ],
  });
  assert.deepEqual(page.faculty.map((m) => m.slug), ["a", "c"]);
  assert.deepEqual(page.faculty[0].programmes, ["ima"]);
  assert.equal(page.faculty[0].linkedin_url, "");
  assert.equal(page.faculty[0].profile_url, "");
  assert.equal(page.faculty[0].photo, null);
  assert.equal(page.faculty[1].profile_url, "", "a profile is a web page, never mailto:");
});

test("other page types and 404s are not found; failures are errors", async () => {
  assert.deepEqual(await readTeamPageResponse(jsonResponse(200, teamPage({ type: "AboutPage" }))), { status: "not_found" });
  assert.deepEqual(await readTeamPageResponse(NOT_FOUND()), { status: "not_found" });
  for (const response of [jsonResponse(500, { detail: "x" }), new Response("<html>", { status: 200 }), jsonResponse(200, { title: "", type: "TeamPage" })]) {
    await assert.rejects(readTeamPageResponse(response), PublicCmsUnavailableError);
  }
});

// ------------------------------------------------------------------ loader and route --

test("the loader asks for /our-team/ anonymously and uncached; no page is a 404", async () => {
  const { loadPublicTeamPage, PublicTeamPage, generateMetadata } = await loadModules();
  await withMockedFetch(() => jsonResponse(200, teamPage()), async (calls) => {
    assert.equal((await loadPublicTeamPage()).faculty.length, 4);
    assert.equal(calls[0].url, `${API_BASE}/cms/public/pages/by-path/?path=%2Four-team%2F`);
    assert.equal(calls[0].init.cache, "no-store");
    assert.equal(calls[0].init.credentials, undefined);
    const metadata = await generateMetadata();
    assert.deepEqual(metadata.title, { absolute: "Our Team of M&A Experts - IMAA" });
    assert.equal(metadata.description, "Meet our experts coming from over 20 countries.");
    assert.equal(metadata.alternates.canonical, `${SITE_ORIGIN}/our-team`);
  });
  await withMockedFetch(() => NOT_FOUND(), async () => {
    await assert.rejects(PublicTeamPage(), (error) => /^NEXT_HTTP_ERROR_FALLBACK;404$/.test(String(error?.digest)));
    assert.deepEqual(await generateMetadata(), {});
  });
  await withMockedFetch(() => jsonResponse(503, { detail: "down" }), async () => {
    await assert.rejects(loadPublicTeamPage(), { name: "PublicCmsUnavailableError" });
  });
});

// ------------------------------------------------------------------ rendering --

test("the page renders hero, faculty, staff and sections in order, all faculty in the server HTML", async () => {
  const { TeamPageView } = await loadModules();
  const doc = parse(renderToStaticMarkup(createElement(TeamPageView, { page: await readPage() })));
  assert.equal(doc.querySelector("h1").textContent, "Our Team");
  // The CMS keeps the WordPress address; Contact Us is migrated, so the button stays on this website
  // (src/lib/migratedLinks.js). Pages that are not migrated keep their imaa-institute.org link.
  assert.equal(doc.querySelector("header a").getAttribute("href"), "/contact-us");
  assert.deepEqual([...doc.querySelectorAll("[data-team-section=faculty] > div > div > div a")].slice(0, 2).map((a) => a.getAttribute("href")),
    ["/contact-us", "https://imaa-institute.org/in-house-training/"]);
  assert.deepEqual([...doc.querySelectorAll("[data-team-section]")].map((s) => s.dataset.teamSection), ["faculty", "staff", "offices"]);
  assert.deepEqual([...doc.querySelectorAll("[data-team-section] h2")].map((h) => h.textContent), ["Experts & Faculty", "Staff of IMAA", "Contact Us"]);
  const faculty = doc.querySelector("[data-faculty-directory]");
  assert.equal(faculty.querySelectorAll("article").length, 4, "every faculty member is in the HTML (All)");
  assert.deepEqual([...faculty.querySelectorAll("button")].map((b) => `${b.textContent}:${b.getAttribute("aria-pressed")}`),
    ["All:true", "IM&A:false", "CPMI:false", "SCDE:false"]);
  const olsson = [...faculty.querySelectorAll("article")][1];
  assert.deepEqual([...olsson.querySelectorAll("ul[aria-label=Programmes] li")].map((li) => li.textContent), ["CPMI", "IM&A", "SCDE"]);
  assert.equal(olsson.querySelector("a[href*='/team/']").getAttribute("href"), "https://imaa-institute.org/team/david-olsson/");
  assert.match(olsson.querySelector("a[href*='linkedin']").textContent, /David Olsson on LinkedIn/);
  const young = [...faculty.querySelectorAll("article")][3];
  assert.equal(young.querySelector("a[href*='linkedin']"), null, "no LinkedIn link when there is none");
  assert.equal(young.querySelector("ul[aria-label=Programmes]"), null);
  const staff = [...doc.querySelectorAll("[data-team-section=staff] article")];
  assert.deepEqual(staff.map((a) => a.querySelector("h3").textContent), ["Prof. Dr. Christopher Kummer", "Erin Tan"]);
  assert.match(staff[0].textContent, /Location: Zürich/);
  assert.equal(staff[0].querySelector("a"), null, "staff cards have no links (as on WordPress)");
  assert.equal(doc.querySelector("a[href='tel:+41435051799']").textContent.includes("+41 43 505 17 99"), true);
});

test("empty sections leave no blank space", async () => {
  const { TeamPageView } = await loadModules();
  const doc = parse(renderToStaticMarkup(createElement(TeamPageView, { page: await readPage({ faculty: [], staff: [], faculty_heading: "", staff_heading: "", sections: [] }) })));
  assert.equal(doc.querySelectorAll("[data-team-section]").length, 0);
});

// ------------------------------------------------------------------ filters (client) --

test("programme filters show only linked people, once each, and announce the result", async () => {
  const { FacultyDirectory } = await loadModules();
  const page = await readPage();
  const container = document.createElement("div");
  document.body.replaceChildren(container);
  const root = createRoot(container);
  await act(async () => root.render(createElement(FacultyDirectory, { faculty: page.faculty, programmes: page.programmes })));
  const names = () => [...container.querySelectorAll("article h3")].map((h) => h.textContent);
  const click = (label) => act(async () => [...container.querySelectorAll("button")].find((b) => b.textContent === label)
    .dispatchEvent(new MouseEvent("click", { bubbles: true })));
  const live = () => container.querySelector("[aria-live]").textContent;

  assert.equal(names().length, 4);
  assert.equal(live(), "Showing all 4 faculty");
  await click("CPMI");
  assert.deepEqual(names(), ["David Olsson"]);
  assert.equal(live(), "Showing 1 faculty in CPMI");
  assert.equal(container.querySelector("button[aria-pressed=true]").textContent, "CPMI");
  await click("IM&A");
  assert.deepEqual(names(), ["Prof. Dr. Christopher Kummer", "David Olsson", "Ajit Sane"], "CMS order kept, no duplicates");
  await click("All");
  assert.equal(new Set(names()).size, 4);

  // A filter with nobody (possible only if the CMS lists it) shows an empty state, not a blank grid.
  await act(async () => root.render(createElement(FacultyDirectory, { faculty: page.faculty, programmes: [...page.programmes, { code: "HRM&A", slug: "hrma" }] })));
  await click("HRM&A");
  assert.equal(names().length, 0);
  assert.match(container.textContent, /No faculty are listed for HRM&A yet\./);
  await act(async () => root.unmount());
});
