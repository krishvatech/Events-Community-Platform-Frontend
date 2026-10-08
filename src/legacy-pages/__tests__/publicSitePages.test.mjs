// Public website StandardPages (src/app/(site)/[slug]): approved default content, CMS
// precedence, the server loader, route metadata and the shared renderer.
//
// node:test + jsdom. The real loader, route and renderer are bundled on the fly with esbuild
// (as in helpers/blogDomHarness.mjs) and run against a mocked global fetch: no request ever
// leaves the process and no backend or Next.js server is needed.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";
import { JSDOM } from "jsdom";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { PUBLIC_STANDARD_PAGE_SLUGS } from "../../lib/publicSite.js";
import {
  PAGE_ABSENT_CODE,
  PublicCmsUnavailableError,
  choosePublicPageContent,
  readPublicPageResponse,
  toDefaultPage,
} from "../../lib/publicCmsResponse.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../..");
const CONTENT_DIR = path.join(ROOT, "src", "content", "public-pages");
const BACKEND_CONTENT_DIR = process.env.ECP_BACKEND_DIR
  ? path.join(process.env.ECP_BACKEND_DIR, "cms", "public_page_content")
  : path.resolve(ROOT, "..", "ecp-backend", "cms", "public_page_content");
// A bundled-image body line (see ecp-backend/cms/public_page_content/__init__.py).
const MEDIA_LINE = /^<img alt="([^"<>]*)" class="richtext-image ([a-z][a-z-]*)" height="([1-9][0-9]*)" src="media:([^"]+)" width="([1-9][0-9]*)">$/;
const isMediaLine = (line) => line.includes("media:");

const SITE_ORIGIN = "https://connect.example.test";
const API_BASE = "http://cms.example.test/api";

// ------------------------------------------------------------------ helpers --

const readContent = (slug) => {
  const raw = fs.readFileSync(path.join(CONTENT_DIR, `${slug}.json`), "utf8");
  return { raw, data: JSON.parse(raw) };
};

// Same definition as compute_content_hash in ecp-backend/cms/public_page_content/__init__.py:
// media (key, file SHA-256, width, height) is appended only when a page has media.
const contentHash = (d) => {
  const fields = [d.slug, d.title, d.seo_title, d.search_description, d.body_html.join("\n")];
  if (d.media?.length) fields.push(d.media.map((m) => `${m.key}\t${m.sha256}\t${m.width}\t${m.height}`).join("\n"));
  return createHash("sha256").update(fields.join("\x1f"), "utf8").digest("hex");
};
const fileSha256 = (file) => createHash("sha256").update(fs.readFileSync(file)).digest("hex");

const jsonResponse = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const textResponse = (status, text) => new Response(text, { status, headers: { "Content-Type": "text/html" } });

const ABSENT_404 = () => jsonResponse(404, { detail: "Not found", code: PAGE_ABSENT_CODE });
const UNAVAILABLE_404 = () => jsonResponse(404, { detail: "Not found", code: "page_unavailable" });
const PLAIN_404 = () => jsonResponse(404, { detail: "Not found" });

const cmsPage = (overrides = {}) => ({
  id: 7,
  title: "Privacy Policy",
  slug: "privacy-policy",
  type: "StandardPage",
  body_html: "<h2>Edited in Wagtail</h2><p>Published CMS text.</p>",
  path: "/privacy-policy/",
  seo_title: "Privacy Policy | IMAA Institute",
  search_description: "How IMAA handles personal data.",
  first_published_at: "2026-10-01T10:00:00Z",
  last_published_at: "2026-10-07T09:30:00Z",
  ...overrides,
});

async function rejectsUnavailable(promise, status) {
  await assert.rejects(promise, (error) => {
    assert.equal(error.name, "PublicCmsUnavailableError");
    if (status !== undefined) assert.equal(error.status, status);
    return true;
  });
}

// Bundles the real route modules once; node_modules stay external so React resolves normally.
let routeModules;
async function loadRoute() {
  if (routeModules) return routeModules;
  const outDir = path.join(ROOT, "node_modules", ".cache", "public-site-tests");
  fs.mkdirSync(outDir, { recursive: true });
  const outfile = path.join(outDir, `public-site-route-${process.pid}.mjs`);
  await build({
    stdin: {
      contents: [
        'export * from "@/lib/publicCms.server";',
        'export { generateMetadata, default as PublicStandardPage } from "@/app/(site)/[slug]/page.jsx";',
        'export { default as StandardPageArticle } from "@/components/public/StandardPageArticle.jsx";',
      ].join("\n"),
      resolveDir: ROOT,
      sourcefile: "public-site-route-entry.js",
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
        name: "public-site-test-resolve",
        setup(pluginBuild) {
          // The "@/..." alias from jsconfig.json, resolved by esbuild itself (extensions included).
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
    routeModules = await import(pathToFileURL(outfile).href);
  } finally {
    fs.rmSync(outfile, { force: true });
  }
  return routeModules;
}

// Runs `fn` with a mocked global fetch that answers from `respond(url, init)` and records calls.
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

const NEXT_NOT_FOUND = (error) => {
  assert.match(String(error?.digest), /^NEXT_HTTP_ERROR_FALLBACK;404$/);
  return true;
};

// ------------------------------------------------------------ content files --

test("the content files cover exactly the public route allow-list", () => {
  const files = fs.readdirSync(CONTENT_DIR).filter((name) => name.endsWith(".json")).sort();
  assert.deepEqual(files, [...PUBLIC_STANDARD_PAGE_SLUGS].map((slug) => `${slug}.json`).sort());
  for (const slug of PUBLIC_STANDARD_PAGE_SLUGS) {
    const { data } = readContent(slug);
    assert.equal(data.format_version, 1, slug);
    assert.equal(data.slug, slug);
    assert.ok(data.title.trim(), `${slug} has no title`);
  }
});

test("the content files are in canonical format (Python json.dumps, indent 2, ensure_ascii off)", () => {
  for (const slug of PUBLIC_STANDARD_PAGE_SLUGS) {
    const { raw, data } = readContent(slug);
    assert.equal(`${JSON.stringify(data, null, 2)}\n`, raw, `${slug}.json is not canonically formatted`);
  }
});

test("each content_sha256 matches its content", () => {
  for (const slug of PUBLIC_STANDARD_PAGE_SLUGS) {
    const { data } = readContent(slug);
    assert.equal(
      contentHash(data),
      data.content_sha256,
      `${slug}.json was edited without updating content_sha256 (run \`python -m cms.public_page_content --update-hashes\` in ecp-backend and copy the file here)`
    );
  }
});

test("every page is migrated with a body; only References has bundled media", () => {
  for (const slug of PUBLIC_STANDARD_PAGE_SLUGS) {
    const { data } = readContent(slug);
    assert.equal(data.migration_status, "migrated", slug);
    assert.ok(data.body_html.length > 0, `${slug} has no body`);
    assert.ok(Array.isArray(data.media), `${slug}: media must be a list`);
    assert.equal(data.media.length > 0, slug === "references", slug);
  }
  assert.equal(readContent("references").data.media.length, 258);
});

test("each file records its WordPress source and migration notes", () => {
  for (const slug of PUBLIC_STANDARD_PAGE_SLUGS) {
    const { source, migration_notes: notes } = readContent(slug).data;
    assert.match(source.url, /^https:\/\/imaa-institute\.org\/[a-z-]+\/$/, slug);
    assert.equal(typeof source.wordpress_page_id, "number", slug);
    assert.match(source.retrieved_at, /^\d{4}-\d{2}-\d{2}$/, slug);
    assert.ok(Array.isArray(notes) && notes.length > 0 && notes.every((n) => typeof n === "string" && n.trim()), slug);
  }
});

test("default bodies use only sanitised, editor-compatible markup", () => {
  const ALLOWED = new Set(["P", "BR", "H2", "H3", "H4", "UL", "OL", "LI", "A", "B", "STRONG", "I", "EM", "HR"]);
  for (const slug of PUBLIC_STANDARD_PAGE_SLUGS) {
    const { data } = readContent(slug);
    if (!data.body_html.length) continue;
    const { document } = new JSDOM(`<body>${data.body_html.filter((line) => !isMediaLine(line)).join("\n")}</body>`).window;
    for (const el of document.body.querySelectorAll("*")) {
      assert.ok(ALLOWED.has(el.tagName), `${slug}: <${el.tagName.toLowerCase()}> is not allowed`);
      const attrs = el.getAttributeNames().sort();
      if (el.tagName === "A") {
        assert.deepEqual(attrs, ["href", "rel"], `${slug}: link attributes ${attrs}`);
        assert.equal(el.getAttribute("rel"), "noopener noreferrer");
        assert.match(el.getAttribute("href"), /^(https:\/\/|mailto:[^\s]|tel:\+?\d|#)/, `${slug}: href ${el.getAttribute("href")}`);
      } else {
        assert.deepEqual(attrs, [], `${slug}: <${el.tagName.toLowerCase()}> has attributes ${attrs}`);
      }
      if (["P", "LI", "H2", "H3", "H4", "A"].includes(el.tagName)) {
        assert.ok(el.textContent.trim(), `${slug}: empty <${el.tagName.toLowerCase()}>`);
      }
    }
  }
});

test("source image manifest is canonical and no References images are deployed in frontend public/", () => {
  for (const slug of PUBLIC_STANDARD_PAGE_SLUGS) {
    const { data } = readContent(slug);
    const byKey = new Map(data.media.map((item) => [item.key, item]));
    const used = new Set();
    for (const line of data.body_html.filter(isMediaLine)) {
      const match = MEDIA_LINE.exec(line);
      assert.ok(match, `${slug}: not a canonical image line: ${line.slice(0, 100)}`);
      const [, alt, format, height, key, width] = match;
      const item = byKey.get(key);
      assert.ok(item, `${slug}: unlisted media ${key}`);
      assert.equal(format, "logo");
      assert.ok(alt.trim(), `${slug}: ${key} has no alt text`);
      assert.deepEqual([Number(width), Number(height)], [item.width, item.height], key);
      used.add(key);
    }
    assert.equal(used.size, data.media.length, `${slug}: every listed file is shown`);
  }
  assert.equal(
    fs.existsSync(path.join(ROOT, "public", "public-pages", "references")),
    false,
    "References images must not be bundled in the frontend deployment"
  );
});

test("the content files are identical to the backend's copies", {
  skip: fs.existsSync(BACKEND_CONTENT_DIR) ? false : `no backend checkout at ${BACKEND_CONTENT_DIR} (set ECP_BACKEND_DIR)`,
}, () => {
  for (const slug of PUBLIC_STANDARD_PAGE_SLUGS) {
    const backend = fs.readFileSync(path.join(BACKEND_CONTENT_DIR, `${slug}.json`), "utf8");
    assert.equal(readContent(slug).raw, backend, `${slug}.json differs from ${BACKEND_CONTENT_DIR}; copy the backend file here`);
    for (const item of readContent(slug).data.media) {
      const backendFile = path.join(BACKEND_CONTENT_DIR, "media", item.key);
      assert.equal(fileSha256(backendFile), item.sha256, `backend source image hash mismatch: ${item.key}`);
    }
  }
});

// ----------------------------------------------------- response interpretation --

test("a published StandardPage is read with only the renderer's fields", async () => {
  const result = await readPublicPageResponse(jsonResponse(200, cmsPage({ unexpected: "x" })), "/privacy-policy/");
  assert.equal(result.status, "found");
  assert.deepEqual(result.page, {
    title: "Privacy Policy",
    slug: "privacy-policy",
    type: "StandardPage",
    path: "/privacy-policy/",
    body_html: "<h2>Edited in Wagtail</h2><p>Published CMS text.</p>",
    seo_title: "Privacy Policy | IMAA Institute",
    search_description: "How IMAA handles personal data.",
    first_published_at: "2026-10-01T10:00:00Z",
    last_published_at: "2026-10-07T09:30:00Z",
  });
});

test("only an explicit page_absent 404 means the page is absent", async () => {
  assert.deepEqual(await readPublicPageResponse(ABSENT_404(), "/imprint/"), { status: "absent" });
  assert.deepEqual(await readPublicPageResponse(UNAVAILABLE_404(), "/imprint/"), { status: "not_found" });
  // Older backends and non-eligible paths answer without a code: a real 404.
  assert.deepEqual(await readPublicPageResponse(PLAIN_404(), "/imprint/"), { status: "not_found" });
  assert.deepEqual(
    await readPublicPageResponse(jsonResponse(404, { detail: "Not found", code: "something_else" }), "/imprint/"),
    { status: "not_found" }
  );
});

test("another page type at the path is a 404, not a default", async () => {
  const about = cmsPage({ type: "AboutPage", body_html: undefined, hero_title: "About" });
  assert.deepEqual(await readPublicPageResponse(jsonResponse(200, about), "/privacy-policy/"), { status: "not_found" });
});

test("throttling, backend errors and unexpected statuses are errors, never absence", async () => {
  // Even a body that claims absence is ignored when the status is not 404.
  await rejectsUnavailable(
    readPublicPageResponse(jsonResponse(429, { detail: "Request was throttled.", code: PAGE_ABSENT_CODE }), "/imprint/"),
    429
  );
  for (const status of [400, 401, 403, 500, 502, 503, 504]) {
    await rejectsUnavailable(readPublicPageResponse(jsonResponse(status, { detail: "x" }), "/imprint/"), status);
  }
  await rejectsUnavailable(readPublicPageResponse(new Response(null, { status: 302 }), "/imprint/"), 302);
});

test("malformed responses are errors", async () => {
  const cases = [
    textResponse(200, "<!doctype html><title>Gateway</title>"),
    textResponse(404, "<!doctype html><h1>Not Found</h1>"),
    jsonResponse(404, {}),
    jsonResponse(404, []),
    jsonResponse(404, { code: PAGE_ABSENT_CODE }),
    jsonResponse(200, null),
    jsonResponse(200, []),
    jsonResponse(200, cmsPage({ title: undefined })),
    jsonResponse(200, cmsPage({ title: "   " })),
    jsonResponse(200, cmsPage({ type: undefined })),
    jsonResponse(200, cmsPage({ body_html: null })),
  ];
  for (const response of cases) {
    await rejectsUnavailable(readPublicPageResponse(response, "/privacy-policy/"));
  }
});

test("precedence: a published CMS page wins, defaults only on explicit absence", () => {
  const defaultPage = toDefaultPage(readContent("privacy-policy").data);
  const published = { title: "Privacy Policy", body_html: "<p>CMS</p>", seo_title: "", search_description: "" };
  // An editor's intentionally empty fields stay empty: nothing is filled in from the default.
  const emptyPublished = { title: "Privacy Policy", body_html: "", seo_title: "", search_description: "" };

  assert.deepEqual(choosePublicPageContent({ status: "found", page: published }, defaultPage), { source: "cms", page: published });
  assert.deepEqual(choosePublicPageContent({ status: "found", page: emptyPublished }, defaultPage), {
    source: "cms",
    page: emptyPublished,
  });
  assert.deepEqual(choosePublicPageContent({ status: "absent" }, defaultPage), { source: "default", page: defaultPage });
  assert.equal(choosePublicPageContent({ status: "absent" }, null), null);
  assert.equal(choosePublicPageContent({ status: "not_found" }, defaultPage), null);
  assert.equal(choosePublicPageContent(undefined, defaultPage), null);
  assert.equal(choosePublicPageContent({ status: "found" }, defaultPage), null);
});

test("pages with media never render from frontend defaults", () => {
  assert.equal(toDefaultPage(readContent("references").data), null);
  assert.equal(toDefaultPage({ ...readContent("imprint").data, media: [{ key: "references/abb.png" }] }), null);
  assert.equal(toDefaultPage({ ...readContent("imprint").data, body_html: ['<img src="media:references/abb.png">'] }), null);
});

test("toDefaultPage maps only migrated content with a body", () => {
  assert.equal(toDefaultPage({ ...readContent("references").data, migration_status: "not_migrated", body_html: [] }), null);
  assert.equal(toDefaultPage({ ...readContent("imprint").data, body_html: [] }), null);
  assert.equal(toDefaultPage({ ...readContent("imprint").data, migration_status: "not_migrated" }), null);
  assert.equal(toDefaultPage(null), null);

  const { data } = readContent("imprint");
  assert.deepEqual(toDefaultPage(data), {
    title: "Imprint",
    slug: "imprint",
    type: "StandardPage",
    path: "/imprint/",
    body_html: data.body_html.join("\n"),
    seo_title: data.seo_title,
    search_description: data.search_description,
    content_sha256: data.content_sha256,
  });
});

test("PublicCmsUnavailableError carries the HTTP status", () => {
  const error = new PublicCmsUnavailableError("CMS responded with HTTP 503", { status: 503 });
  assert.ok(error instanceof Error);
  assert.equal(error.name, "PublicCmsUnavailableError");
  assert.equal(error.status, 503);
});

// ------------------------------------------------------------- server loader --

test("the loader asks the backend for the exact path, anonymously and uncached", async () => {
  const { loadPublicStandardPage } = await loadRoute();
  await withMockedFetch(() => jsonResponse(200, cmsPage()), async (calls) => {
    await loadPublicStandardPage("privacy-policy");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, `${API_BASE}/cms/public/pages/by-path/?path=%2Fprivacy-policy%2F`);
    assert.equal(calls[0].init.cache, "no-store");
    assert.deepEqual(calls[0].init.headers, { Accept: "application/json" });
    assert.equal(calls[0].init.credentials, undefined);
  });
});

test("absent text-only pages render defaults; References remains a 404 until CMS publication", async () => {
  const { loadPublicStandardPage } = await loadRoute();
  await withMockedFetch(() => ABSENT_404(), async () => {
    for (const slug of PUBLIC_STANDARD_PAGE_SLUGS.filter((value) => value !== "references")) {
      const { data } = readContent(slug);
      const resolved = await loadPublicStandardPage(slug);
      assert.equal(resolved.source, "default", slug);
      assert.equal(resolved.page.title, data.title);
      assert.equal(resolved.page.body_html, data.body_html.join("\n"));
      assert.equal(resolved.page.seo_title, data.seo_title);
      assert.equal(resolved.page.search_description, data.search_description);
      assert.equal(resolved.page.content_sha256, data.content_sha256);
    }
    assert.equal(await loadPublicStandardPage("references"), null);
  });
});

test("published References receives remote CMS logo URLs and lazy loads them", async () => {
  const { loadPublicStandardPage, PublicStandardPage } = await loadRoute();
  const remoteUrl = "https://media.example.test/images/abb-logo.png";
  const body = `<img alt="ABB logo" class="richtext-image logo" height="156" src="${remoteUrl}" width="156">`;
  await withMockedFetch(() => jsonResponse(200, cmsPage({
    title: "References", slug: "references", path: "/references/", body_html: body,
  })), async () => {
    const resolved = await loadPublicStandardPage("references");
    assert.equal(resolved.source, "cms");
    assert.ok(resolved.page.body_html.includes(remoteUrl));
    const html = renderToStaticMarkup(await PublicStandardPage({ params: Promise.resolve({ slug: "references" }) }));
    const { document } = new JSDOM(`<body>${html}</body>`).window;
    const img = document.querySelector("img.logo");
    assert.equal(img.getAttribute("src"), remoteUrl);
    assert.equal(img.getAttribute("loading"), "lazy");
    assert.equal(img.getAttribute("decoding"), "async");
  });
});

test("a published CMS page replaces the default, empty fields included", async () => {
  const { loadPublicStandardPage } = await loadRoute();
  await withMockedFetch(() => jsonResponse(200, cmsPage()), async () => {
    const resolved = await loadPublicStandardPage("privacy-policy");
    assert.equal(resolved.source, "cms");
    assert.equal(resolved.page.body_html, "<h2>Edited in Wagtail</h2><p>Published CMS text.</p>");
  });
  await withMockedFetch(
    () => jsonResponse(200, cmsPage({ body_html: "", seo_title: "", search_description: "" })),
    async () => {
      const resolved = await loadPublicStandardPage("privacy-policy");
      assert.equal(resolved.source, "cms");
      assert.equal(resolved.page.body_html, "");
      assert.equal(resolved.page.seo_title, "");
    }
  );
});

test("drafts and other unavailable pages are 404s even when a default exists", async () => {
  const { loadPublicStandardPage } = await loadRoute();
  for (const respond of [UNAVAILABLE_404, PLAIN_404]) {
    await withMockedFetch(respond, async () => {
      assert.equal(await loadPublicStandardPage("privacy-policy"), null);
      assert.equal(await loadPublicStandardPage("imprint"), null);
    });
  }
});

test("unknown slugs are 404s without contacting the backend", async () => {
  const { loadPublicStandardPage } = await loadRoute();
  await withMockedFetch(() => ABSENT_404(), async (calls) => {
    for (const slug of ["about", "Privacy-Policy", "privacy-policy/extra", "", "faq", "__proto__", "constructor"]) {
      assert.equal(await loadPublicStandardPage(slug), null, slug);
    }
    assert.equal(calls.length, 0);
  });
});

test("network failures, throttling and backend errors are errors, not defaults or 404s", async () => {
  const { loadPublicStandardPage } = await loadRoute();
  await withMockedFetch(
    () => {
      throw new TypeError("fetch failed");
    },
    async () => rejectsUnavailable(loadPublicStandardPage("privacy-policy"))
  );
  for (const status of [429, 500, 503]) {
    await withMockedFetch(
      () => jsonResponse(status, { detail: "x", code: PAGE_ABSENT_CODE }),
      async () => rejectsUnavailable(loadPublicStandardPage("privacy-policy"), status)
    );
  }
  await withMockedFetch(
    () => textResponse(404, "<html>proxy</html>"),
    async () => rejectsUnavailable(loadPublicStandardPage("privacy-policy"), 404)
  );
});

// ------------------------------------------------------- route and renderer --

test("metadata comes from the default page while the page is absent", async () => {
  const { generateMetadata } = await loadRoute();
  await withMockedFetch(() => ABSENT_404(), async () => {
    for (const slug of ["frequently-asked-questions", "privacy-policy"]) {
      const { data } = readContent(slug);
      const metadata = await generateMetadata({ params: Promise.resolve({ slug }) });
      assert.deepEqual(metadata.title, { absolute: data.seo_title || data.title });
      assert.equal(metadata.description, data.search_description || undefined);
      assert.deepEqual(metadata.alternates, { canonical: `${SITE_ORIGIN}/${slug}` });
      assert.equal(metadata.openGraph.url, `${SITE_ORIGIN}/${slug}`);
    }
  });
});

test("metadata comes from the published CMS page, falling back to its own title", async () => {
  const { generateMetadata } = await loadRoute();
  await withMockedFetch(() => jsonResponse(200, cmsPage()), async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ slug: "privacy-policy" }) });
    assert.deepEqual(metadata.title, { absolute: "Privacy Policy | IMAA Institute" });
    assert.equal(metadata.description, "How IMAA handles personal data.");
  });
  await withMockedFetch(() => jsonResponse(200, cmsPage({ seo_title: "", search_description: "" })), async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ slug: "privacy-policy" }) });
    assert.deepEqual(metadata.title, { absolute: "Privacy Policy" });
    assert.equal(metadata.description, undefined);
  });
});

test("the route raises Next's 404 for unavailable pages (References drafts included) and unknown slugs", async () => {
  const { PublicStandardPage, generateMetadata } = await loadRoute();
  await withMockedFetch(() => UNAVAILABLE_404(), async () => {
    await assert.rejects(PublicStandardPage({ params: Promise.resolve({ slug: "privacy-policy" }) }), NEXT_NOT_FOUND);
    assert.deepEqual(await generateMetadata({ params: Promise.resolve({ slug: "privacy-policy" }) }), {});
  });
  await withMockedFetch(() => ABSENT_404(), async () => {
    await assert.rejects(PublicStandardPage({ params: Promise.resolve({ slug: "unknown-page" }) }), NEXT_NOT_FOUND);
  });
  await withMockedFetch(() => UNAVAILABLE_404(), async () => {
    // A References draft (as created by setup_public_pages) is a 404, never the default logo wall.
    await assert.rejects(PublicStandardPage({ params: Promise.resolve({ slug: "references" }) }), NEXT_NOT_FOUND);
  });
});

test("default and CMS content render through the same article renderer", async () => {
  const { PublicStandardPage } = await loadRoute();
  const { data } = readContent("privacy-policy");

  const defaultHtml = await withMockedFetch(() => ABSENT_404(), async () =>
    renderToStaticMarkup(await PublicStandardPage({ params: Promise.resolve({ slug: "privacy-policy" }) }))
  );
  const cmsHtml = await withMockedFetch(() => jsonResponse(200, cmsPage()), async () =>
    renderToStaticMarkup(await PublicStandardPage({ params: Promise.resolve({ slug: "privacy-policy" }) }))
  );

  const parse = (html) => new JSDOM(`<body>${html}</body>`).window.document;
  const defaultDoc = parse(defaultHtml);
  const cmsDoc = parse(cmsHtml);

  const defaultArticle = defaultDoc.querySelector("article");
  assert.equal(defaultArticle.getAttribute("data-public-content"), "default");
  assert.equal(defaultArticle.getAttribute("data-content-sha256"), data.content_sha256);
  assert.equal(defaultDoc.querySelector("h1").textContent, "Privacy Policy");
  assert.ok(defaultHtml.includes(data.body_html.join("\n")), "default body is not rendered verbatim");

  const cmsArticle = cmsDoc.querySelector("article");
  assert.equal(cmsArticle.getAttribute("data-public-content"), "cms");
  assert.equal(cmsArticle.hasAttribute("data-content-sha256"), false);
  assert.ok(cmsHtml.includes("<h2>Edited in Wagtail</h2><p>Published CMS text.</p>"));

  // Same markup structure around the content: one renderer.
  assert.equal(defaultArticle.className, cmsArticle.className);
  assert.equal(defaultDoc.querySelector("h1").className, cmsDoc.querySelector("h1").className);
  assert.equal(
    defaultDoc.querySelector("article > div > div").className,
    cmsDoc.querySelector("article > div > div").className
  );
});

test("a published page with an empty body renders its title and no filler", async () => {
  const { StandardPageArticle } = await loadRoute();
  const html = renderToStaticMarkup(
    createElement(StandardPageArticle, { page: { title: "Imprint", body_html: "  " }, source: "cms" })
  );
  const doc = new JSDOM(`<body>${html}</body>`).window.document;
  assert.equal(doc.querySelector("h1").textContent, "Imprint");
  assert.equal(doc.querySelectorAll("article > div").length, 0);
  assert.equal(doc.querySelector("article").textContent.trim(), "Imprint");
});
