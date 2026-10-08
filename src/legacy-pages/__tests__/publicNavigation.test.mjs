// Public website navigation: footer/header links that reset the scroll position, the
// build-dependent footer links (Next.js has the public CMS routes, Vite does not) and the
// server-rendered public shell's burger menu.
//
// node:test + jsdom. Next.js modules are bundled on the fly with esbuild and small stubs for
// next/link, next/navigation and next/dynamic; no browser, network or Next.js server.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";
import { JSDOM } from "jsdom";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../..");

// ---------------------------------------------------------------- DOM globals --
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/", pretendToBeVisual: true });
const define = (key, value) => Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
define("window", dom.window);
define("document", dom.window.document);
define("navigator", dom.window.navigator);
for (const key of ["HTMLElement", "Element", "Node", "MouseEvent", "Event", "getComputedStyle"]) define(key, dom.window[key]);
define("IS_REACT_ACT_ENVIRONMENT", true);

const React = await import("react");
const { createElement, act } = React;
const { createRoot } = await import("react-dom/client");
const { renderToStaticMarkup } = await import("react-dom/server");
const RouterDom = await import("react-router-dom");

// ------------------------------------------------------------------ bundling --
const NEXT_STUBS = {
  "next/link": `
    import { createElement, forwardRef } from "react";
    const NextLink = forwardRef(function NextLink({ href, scroll, prefetch, replace, ...rest }, ref) {
      (globalThis.__nextLinkCalls ||= []).push({ href, scroll, props: Object.keys(rest) });
      return createElement("a", { ref, href, ...rest });
    });
    export default NextLink;`,
  "next/navigation": `
    export const usePathname = () => globalThis.__pathname || "/privacy-policy";
    export const useRouter = () => ({ push() {}, replace() {}, prefetch() {} });
    export const useParams = () => ({});
    export const useSearchParams = () => new URLSearchParams();`,
  "next/dynamic": `
    export default function dynamic(_loader, options = {}) {
      return options.loading ? options.loading : () => null;
    }`,
};

async function bundle(entry, { nextAdapter }) {
  const outDir = path.join(ROOT, "node_modules", ".cache", "public-navigation-tests");
  fs.mkdirSync(outDir, { recursive: true });
  const outfile = path.join(outDir, `${path.basename(entry).replace(/\W/g, "_")}-${nextAdapter ? "next" : "vite"}-${process.pid}.mjs`);
  await build({
    entryPoints: [path.join(ROOT, entry)],
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node20",
    jsx: "automatic",
    loader: { ".js": "jsx", ".svg": "dataurl" },
    banner: { js: 'import { createRequire as __cr } from "node:module"; const require = __cr(import.meta.url);' },
    define: { "import.meta.env": "{}" },
    outfile,
    logLevel: "error",
    plugins: [
      {
        name: "public-navigation-test-stubs",
        setup(pluginBuild) {
          pluginBuild.onResolve({ filter: /\.css$/ }, (args) => ({ path: args.path, namespace: "empty" }));
          pluginBuild.onLoad({ filter: /.*/, namespace: "empty" }, () => ({ contents: "", loader: "js" }));
          pluginBuild.onResolve({ filter: /^next\/(link|navigation|dynamic)$/ }, (args) => ({ path: args.path, namespace: "next-stub" }));
          pluginBuild.onLoad({ filter: /.*/, namespace: "next-stub" }, (args) => ({ contents: NEXT_STUBS[args.path], loader: "js", resolveDir: ROOT }));
          if (nextAdapter) {
            pluginBuild.onResolve({ filter: /^#navigation$/ }, () => ({ path: path.join(ROOT, "src/navigation/next.jsx") }));
          }
          pluginBuild.onResolve({ filter: /^[^./#]/ }, (args) => ({ path: args.path, external: true }));
        },
      },
    ],
  });
  try {
    return await import(pathToFileURL(outfile).href);
  } finally {
    fs.rmSync(outfile, { force: true });
  }
}

const parse = (html) => new JSDOM(`<body>${html}</body>`).window.document;

// ------------------------------------------------------- React Router (Vite) --

async function clickInRouter(linkProps, init = {}) {
  const { Link } = await import("../../navigation/reactRouter.js");
  const scrolls = [];
  window.scrollTo = (...args) => scrolls.push(args);
  window.requestAnimationFrame = (callback) => {
    callback(0);
    return 0;
  };
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const tree = createElement(
    RouterDom.MemoryRouter,
    { initialEntries: ["/from"] },
    createElement(
      RouterDom.Routes,
      null,
      createElement(RouterDom.Route, { path: "/from", element: createElement(Link, { to: "/to", ...linkProps }, "Go") }),
      createElement(RouterDom.Route, { path: "/to", element: createElement("p", null, "Destination") })
    )
  );
  await act(async () => root.render(tree));
  const anchor = container.querySelector("a");
  await act(async () => {
    anchor.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0, ...init }));
  });
  const text = container.textContent;
  await act(async () => root.unmount());
  container.remove();
  return { scrolls, text };
}

test("React Router adapter: resetScroll scrolls the destination to the top", async () => {
  const { scrolls, text } = await clickInRouter({ resetScroll: true });
  assert.equal(text, "Destination");
  assert.deepEqual(scrolls, [[0, 0]]);
});

test("React Router adapter: links keep the scroll position unless they opt in", async () => {
  const { scrolls, text } = await clickInRouter({});
  assert.equal(text, "Destination");
  assert.deepEqual(scrolls, []);
});

test("React Router adapter: modified clicks (new tab) never scroll", async () => {
  const { scrolls } = await clickInRouter({ resetScroll: true }, { ctrlKey: true });
  assert.deepEqual(scrolls, []);
});

test("React Router adapter: the Vite build has no public CMS routes", async () => {
  const adapter = await import("../../navigation/reactRouter.js");
  assert.equal(adapter.PUBLIC_CMS_ROUTES_AVAILABLE, false);
  const markup = renderToStaticMarkup(
    createElement(RouterDom.MemoryRouter, null, createElement(adapter.Link, { to: "/x", resetScroll: true }, "x"))
  );
  assert.equal(markup, '<a href="/x">x</a>', "resetScroll is not passed to the DOM");
});

// --------------------------------------------------------------- Next.js adapter --

test("Next.js adapter: resetScroll maps to Next's scroll; other links keep scroll={false}", async () => {
  const adapter = await bundle("src/navigation/next.jsx", { nextAdapter: true });
  assert.equal(adapter.PUBLIC_CMS_ROUTES_AVAILABLE, true);
  globalThis.__nextLinkCalls = [];
  renderToStaticMarkup(createElement(adapter.Link, { to: "/imprint", resetScroll: true }, "Imprint"));
  renderToStaticMarkup(createElement(adapter.Link, { to: "/events" }, "Events"));
  const [withReset, plain] = globalThis.__nextLinkCalls;
  assert.deepEqual([withReset.href, withReset.scroll], ["/imprint", true]);
  assert.deepEqual([plain.href, plain.scroll], ["/events", false]);
  assert.ok(!withReset.props.includes("resetScroll"), "resetScroll is not passed on");
});

// ---------------------------------------------------------------------- footer --

const FOOTER_PAGES = {
  FAQ: "frequently-asked-questions",
  References: "references",
  "Privacy Policy": "privacy-policy",
  "Terms & Conditions": "terms-and-conditions",
  Imprint: "imprint",
};

test("footer (Next.js build): public pages are internal links, References included", async () => {
  const { PublicFooter } = await bundle("src/components/Footer.jsx", { nextAdapter: true });
  globalThis.__nextLinkCalls = [];
  const doc = parse(renderToStaticMarkup(createElement(PublicFooter)));
  for (const [label, slug] of Object.entries(FOOTER_PAGES)) {
    const link = [...doc.querySelectorAll("a")].find((a) => a.textContent === label);
    assert.ok(link, `${label} link missing`);
    assert.equal(link.getAttribute("href"), `/${slug}`, label);
  }
  // Every internal footer link opens the destination at its top.
  const internal = globalThis.__nextLinkCalls.filter((call) => call.href.startsWith("/"));
  assert.ok(internal.length >= 9, `internal links: ${internal.length}`);
  assert.ok(internal.every((call) => call.scroll === true), JSON.stringify(internal.filter((c) => !c.scroll)));
});

test("footer (Vite build): public pages link to imaa-institute.org instead of a missing route", async () => {
  const { PublicFooter, default: Footer } = await bundle("src/components/Footer.jsx", { nextAdapter: false });
  const render = (element) => parse(renderToStaticMarkup(createElement(RouterDom.MemoryRouter, null, element)));
  const doc = render(createElement(PublicFooter));
  for (const [label, slug] of Object.entries(FOOTER_PAGES)) {
    const link = [...doc.querySelectorAll("a")].find((a) => a.textContent === label);
    assert.equal(link?.getAttribute("href"), `https://imaa-institute.org/${slug}/`, label);
  }
  assert.equal([...doc.querySelectorAll("a")].find((a) => a.textContent === "About us").getAttribute("href"), "/about");
  const navy = render(createElement(Footer));
  assert.equal([...navy.querySelectorAll("a")].find((a) => a.textContent === "Imprint").getAttribute("href"), "https://imaa-institute.org/imprint/");
});

// ---------------------------------------------------------------- public shell --

test("public shell: burger menu below 1200px, desktop navigation and actions from 1200px", async () => {
  const { default: PublicSiteShell } = await bundle("src/components/public/PublicSiteShell.jsx", { nextAdapter: true });
  const doc = parse(renderToStaticMarkup(createElement(PublicSiteShell, null, createElement("p", null, "Body"))));
  const header = doc.querySelector("header");
  const burger = header.querySelector('button[aria-label="Open navigation menu"]');
  assert.ok(burger, "burger button in the server HTML");
  assert.equal(burger.getAttribute("aria-expanded"), "false");
  assert.equal(burger.getAttribute("aria-haspopup"), "dialog");
  assert.match(burger.closest("div").className, /min-\[1200px\]:hidden/);
  const nav = header.querySelector('nav[aria-label="Primary navigation"]');
  assert.match(nav.className, /\bhidden\b/);
  assert.match(nav.className, /min-\[1200px\]:flex/);
  assert.deepEqual([...nav.querySelectorAll("a")].map((a) => a.getAttribute("href")), ["/events", "/community", "/account/resources", "/about"]);
  assert.equal(doc.querySelector("main").textContent, "Body");
  assert.ok(doc.querySelector("footer"), "public footer");
});
