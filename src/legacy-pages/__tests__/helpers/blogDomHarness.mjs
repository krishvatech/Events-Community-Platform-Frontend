// DOM test harness for the Blog UI, built on node:test + jsdom.
//
// Real page/component code is bundled on the fly with esbuild (already shipped
// with Vite), with node_modules left external so React/MUI resolve normally.
// Network-facing modules are swapped at bundle time:
//   services/blogApi       -> fakeBlogApi.mjs (delegates to globalThis.__blogTestApi)
//   utils/api              -> fakeUtilsApi.mjs (no network)
//   BlogRichTextEditor.jsx -> FakeRichTextEditor.jsx (plain textarea)
// No request ever leaves the process.

import { createHash } from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { JSDOM } from "jsdom";
import { build } from "esbuild";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../../..");
const OUT_DIR = path.join(ROOT, "node_modules", ".cache", "blog-dom-tests");

// ---------------------------------------------------------------- globals --
const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>", {
  url: "http://localhost:5173/",
  pretendToBeVisual: true,
});
const { window } = dom;

const define = (key, value) =>
  Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });

define("window", window);
define("document", window.document);
define("navigator", window.navigator);
define("localStorage", window.localStorage);
define("sessionStorage", window.sessionStorage);
for (const key of [
  "HTMLElement", "HTMLInputElement", "HTMLTextAreaElement", "HTMLSelectElement", "Element", "Node",
  "Text", "DocumentFragment", "Event", "CustomEvent", "KeyboardEvent", "MouseEvent", "FocusEvent",
  "InputEvent", "MutationObserver", "DOMParser", "getComputedStyle", "File", "FileList",
]) {
  if (window[key]) define(key, window[key]);
}
define("requestAnimationFrame", (cb) => setTimeout(() => cb(Date.now()), 0));
define("cancelAnimationFrame", (id) => clearTimeout(id));
window.requestAnimationFrame = globalThis.requestAnimationFrame;
window.cancelAnimationFrame = globalThis.cancelAnimationFrame;
window.scrollTo = () => {};
window.Element.prototype.scrollTo = window.Element.prototype.scrollTo || function scrollTo() {};
window.Element.prototype.scrollIntoView = window.Element.prototype.scrollIntoView || function scrollIntoView() {};
window.matchMedia =
  window.matchMedia ||
  ((query) => ({ matches: false, media: query, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; } }));
class NoopResizeObserver { observe() {} unobserve() {} disconnect() {} }
window.ResizeObserver = window.ResizeObserver || NoopResizeObserver;
define("ResizeObserver", window.ResizeObserver);
// Node's own createObjectURL only accepts Node Blobs, not jsdom Files.
URL.createObjectURL = () => "blob:mock-preview";
URL.revokeObjectURL = () => {};
define("IS_REACT_ACT_ENVIRONMENT", true);

// Keep test output readable: drop known third-party dev warnings only.
const QUIET = [/React Router Future Flag Warning/, /not wrapped in act/, /Not implemented: /];
for (const level of ["warn", "error"]) {
  const original = console[level].bind(console);
  console[level] = (...args) => {
    if (QUIET.some((re) => re.test(String(args[0])))) return;
    original(...args);
  };
}
window.console = console;

// -------------------------------------------------------------- bundling --
const STUBS = [
  { match: /\/services\/blogApi(\.js)?$/, file: path.join(HERE, "fakeBlogApi.mjs") },
  { match: /\/utils\/api(\.js)?$/, file: path.join(HERE, "fakeUtilsApi.mjs") },
  { match: /\/BlogRichTextEditor(\.jsx)?$/, file: path.join(HERE, "FakeRichTextEditor.jsx") },
];

// CommonJS packages whose named exports Node's ESM loader cannot detect are
// loaded through `require` via a tiny ESM shim, so the harness and the bundle
// share one instance (and one React context).
const CJS_SHIMS = {
  "react-helmet-async": ["Helmet", "HelmetProvider"],
};

const stubPlugin = {
  name: "blog-test-stubs",
  setup(pluginBuild) {
    pluginBuild.onResolve({ filter: /^\.{1,2}\// }, (args) => {
      const stub = STUBS.find((s) => s.match.test(args.path));
      return stub ? { path: stub.file } : undefined;
    });
    pluginBuild.onResolve({ filter: /^[^./]/ }, (args) => {
      if (CJS_SHIMS[args.path] && args.kind !== "require-call") {
        return { path: args.path, namespace: "cjs-shim" };
      }
      return { path: args.path, external: true };
    });
    pluginBuild.onLoad({ filter: /.*/, namespace: "cjs-shim" }, (args) => ({
      contents: [
        `const mod = require(${JSON.stringify(args.path)});`,
        ...CJS_SHIMS[args.path].map((name) => `export const ${name} = mod.${name};`),
        "export default mod;",
      ].join("\n"),
      loader: "js",
      resolveDir: ROOT,
    }));
  },
};

const moduleCache = new Map();

/** Bundles a source module (path relative to the repo root) and imports it. */
export async function loadSource(relativePath) {
  if (moduleCache.has(relativePath)) return moduleCache.get(relativePath);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const hash = createHash("sha1").update(relativePath).digest("hex").slice(0, 10);
  const outfile = path.join(OUT_DIR, `${path.basename(relativePath).replace(/\W/g, "_")}-${hash}-${process.pid}.mjs`);
  await build({
    entryPoints: [path.join(ROOT, relativePath)],
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node20",
    jsx: "automatic",
    loader: { ".js": "jsx" },
    banner: { js: 'import { createRequire as __cr } from "node:module"; const require = __cr(import.meta.url);' },
    define: { "import.meta.env": "{}" },
    plugins: [stubPlugin],
    outfile,
    logLevel: "error",
  });
  const mod = await import(pathToFileURL(outfile).href);
  moduleCache.set(relativePath, mod);
  return mod;
}

// ------------------------------------------------------------- rendering --
const React = (await import("react")).default;
const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
const router = await import("react-router-dom");
const { HelmetProvider } = createRequire(import.meta.url)("react-helmet-async");

export { React, act, router };

let mounted = [];

/**
 * Renders `routes` (React Router <Route> elements) in a MemoryRouter at `url`.
 * The current location is always readable through `location()`.
 */
export async function renderRoutes(routes, { url = "/" } = {}) {
  const { MemoryRouter, Routes, useLocation } = router;
  const seen = { current: null };
  function LocationProbe() {
    seen.current = useLocation();
    return null;
  }
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      React.createElement(
        HelmetProvider,
        null,
        React.createElement(
          MemoryRouter,
          { initialEntries: [url] },
          React.createElement(LocationProbe),
          React.createElement(Routes, null, routes)
        )
      )
    );
  });
  mounted.push({ root, container });
  return {
    container,
    location: () => seen.current,
    path: () => (seen.current ? `${seen.current.pathname}${seen.current.search}` : ""),
  };
}

export async function cleanup() {
  for (const { root, container } of mounted) {
    await act(async () => root.unmount());
    container.remove();
  }
  mounted = [];
  document.body.innerHTML = "";
  // Emotion keeps references to its <style> tags; only drop Helmet's tags.
  all("[data-rh]", document.head).forEach((node) => node.remove());
  document.title = "";
}

// --------------------------------------------------------------- queries --
const textOf = (el) => (el.textContent || "").replace(/\s+/g, " ").trim();

/** Visible text for accessible names: aria-hidden parts (e.g. MUI's required "*") are skipped. */
const nameText = (el) => {
  if (!el) return "";
  const clone = el.cloneNode(true);
  clone.querySelectorAll?.("[aria-hidden='true']").forEach((node) => node.remove());
  return textOf(clone);
};
const matches = (value, matcher) =>
  matcher instanceof RegExp ? matcher.test(value) : value === matcher;

export const all = (selector, scope = document.body) => [...scope.querySelectorAll(selector)];

export function queryByText(matcher, { selector = "*", scope = document.body } = {}) {
  const candidates = all(selector, scope).filter((el) => matches(textOf(el), matcher));
  // Prefer the innermost matching element.
  return candidates.find((el) => !candidates.some((other) => other !== el && el.contains(other))) || null;
}

export function queryByRole(role, name, { scope = document.body } = {}) {
  const implicit = {
    button: "button, [role='button']",
    link: "a[href], [role='link']",
    textbox: "input:not([type]), input[type='text'], input[type='search'], input[type='url'], textarea, [role='textbox']",
    combobox: "[role='combobox']",
    option: "[role='option']",
    tab: "[role='tab']",
    dialog: "[role='dialog']",
    alert: "[role='alert']",
    heading: "h1, h2, h3, h4, h5, h6",
  }[role] || `[role='${role}']`;
  const labelFor = (el) => (el.id ? document.querySelector(`label[for='${el.id}']`) : null);
  const accessibleName = (el) =>
    (el.getAttribute("aria-label") ||
      (el.getAttribute("aria-labelledby") &&
        el.getAttribute("aria-labelledby").split(/\s+/).map((id) => nameText(document.getElementById(id))).join(" ")) ||
      nameText(labelFor(el)) ||
      nameText(el)).trim();
  return all(implicit, scope).find((el) => name === undefined || matches(accessibleName(el), name)) || null;
}

export function getByRole(role, name, options) {
  const el = queryByRole(role, name, options);
  if (!el) throw new Error(`No ${role} named ${name}. Body text: ${textOf(document.body).slice(0, 400)}`);
  return el;
}

export function getByText(matcher, options) {
  const el = queryByText(matcher, options);
  if (!el) throw new Error(`Text not found: ${matcher}. Body text: ${textOf(document.body).slice(0, 400)}`);
  return el;
}

export async function waitFor(assertion, { timeout = 3000, interval = 15 } = {}) {
  const started = Date.now();
  let lastError;
  while (Date.now() - started < timeout) {
    try {
      let result;
      await act(async () => {
        result = await assertion();
      });
      return result;
    } catch (error) {
      lastError = error;
    }
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, interval));
    });
  }
  throw lastError;
}

/** Waits long enough for debounced inputs (350 ms) to settle. */
export const settle = (ms = 420) =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });

// ---------------------------------------------------------- interactions --
export async function click(el) {
  await act(async () => {
    el.dispatchEvent(new window.MouseEvent("mousedown", { bubbles: true }));
    el.dispatchEvent(new window.MouseEvent("mouseup", { bubbles: true }));
    if (typeof el.click === "function") el.click();
    else el.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true })); // SVG
  });
}

/** Sets an input/textarea value the way React expects, then fires `input`. */
export async function typeInto(el, value) {
  const proto = el.tagName === "TEXTAREA" ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
  await act(async () => {
    el.focus();
    setter.call(el, value);
    el.dispatchEvent(new window.Event("input", { bubbles: true }));
  });
}

export async function selectFile(input, file) {
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  await act(async () => {
    input.dispatchEvent(new window.Event("change", { bubbles: true }));
  });
}

/** Opens an MUI Select and picks the option with the given text. */
export async function chooseSelectOption(combobox, optionText) {
  await act(async () => {
    combobox.dispatchEvent(new window.MouseEvent("mousedown", { bubbles: true, button: 0 }));
  });
  const option = await waitFor(() => getByRole("option", optionText));
  await click(option);
}

// ------------------------------------------------------------ fake data --
export function setBlogApi(api) {
  globalThis.__blogTestApi = api;
}

/**
 * Signs a user in for guard/sidebar checks via the app's real storage
 * contract (legacy token mode + stored /users/me/ payload).
 *   superuser     -> Django is_superuser (also is_staff unless staff: false)
 *   staff         -> Django is_staff
 *   platformAdmin -> Cognito "platform_admin" group claim in the access token
 */
export function signIn({ superuser = false, staff, platformAdmin = false } = {}) {
  window.localStorage.clear();
  window.sessionStorage.clear();
  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  const claims = { sub: "test", exp: 4102444800, ...(platformAdmin ? { "cognito:groups": ["platform_admin"] } : {}) };
  const token = `${b64({ alg: "none" })}.${b64(claims)}.sig`;
  window.localStorage.setItem("access_token", token);
  window.localStorage.setItem(
    "user",
    JSON.stringify({ id: 1, is_superuser: superuser, is_staff: staff ?? superuser })
  );
}

export function signOut() {
  window.localStorage.clear();
  window.sessionStorage.clear();
}

export const page = (results, count = results.length, next = null) => ({ count, next, previous: null, results });

export const makePost = (overrides = {}) => ({
  id: 1,
  title: "M&A Market Update",
  slug: "m-a-market-update",
  excerpt: "Quarterly deal activity.",
  featured_image: "https://cdn.test/cover.jpg",
  author: { id: 3, full_name: "Ada Lovelace", avatar_url: "" },
  legacy_author_name: "",
  published_at: "2026-09-20T09:00:00Z",
  categories: [{ id: 1, name: "Research", slug: "research" }],
  tags: [{ id: 2, name: "Europe", slug: "europe" }],
  ...overrides,
});

/** Recording fake of the blog service; override any method per test. */
export function fakeBlogService(overrides = {}) {
  const calls = [];
  const wrap = (name, impl) => async (...args) => {
    calls.push([name, ...args]);
    return impl(...args);
  };
  const defaults = {
    listPublishedBlogs: async () => page([]),
    getPublishedBlog: async () => makePost(),
    listAdminBlogs: async () => page([]),
    getAdminBlog: async () => ({ ...makePost(), status: "draft", content_html: "<p>Body</p>" }),
    createBlog: async (payload) => ({ id: 50, status: "draft", published_at: null, ...payload }),
    updateBlog: async (id, payload) => ({ id, status: "draft", ...payload }),
    uploadBlogFeaturedImage: async (id) => ({ id, featured_image: "https://cdn.test/new.jpg" }),
    clearBlogFeaturedImage: async (id) => ({ id, featured_image: null }),
    publishBlog: async (id) => ({ id, status: "published", published_at: "2026-09-25T10:00:00Z" }),
    unpublishBlog: async (id) => ({ id, status: "draft", published_at: "2026-09-25T10:00:00Z" }),
    listBlogCategories: async () => page([]),
    createBlogCategory: async (payload) => ({ id: 90, slug: "new", ...payload }),
    updateBlogCategory: async (id, payload) => ({ id, ...payload }),
    listBlogTags: async () => page([]),
    createBlogTag: async (payload) => ({ id: 91, slug: "new", ...payload }),
    updateBlogTag: async (id, payload) => ({ id, ...payload }),
    searchBlogAuthors: async () => [],
  };
  const api = { calls };
  for (const [name, impl] of Object.entries({ ...defaults, ...overrides })) api[name] = wrap(name, impl);
  api.callsTo = (name) => calls.filter((c) => c[0] === name);
  return api;
}

export const apiError = (status, message, fieldErrors = {}) => {
  const error = new Error(message);
  error.status = status;
  error.fieldErrors = fieldErrors;
  return error;
};
