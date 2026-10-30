import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

import {
  React,
  cleanup,
  click,
  getByRole,
  loadSource,
  queryByRole,
  queryByText,
  renderRoutes,
  router,
  selectFile,
  typeInto,
  waitFor,
} from "./helpers/blogDomHarness.mjs";

// Assertions compare strings/booleans only (see broadcastDuplicate.test.mjs).

const { default: ListPage } = await loadSource("src/pages/AdminNewsletterAssetsPage.jsx");
const { default: EditorPage } = await loadSource("src/pages/AdminNewsletterAssetEditorPage.jsx");
const { default: DetailsPage } = await loadSource("src/pages/AdminNewsletterAssetDetailsPage.jsx");
const shared = await loadSource("src/pages/newsletterAssetShared.jsx");
const { Route } = router;
const h = React.createElement;

const A = "/newsletter/admin/assets/";
const META = { allowedExtensions: ["pdf", "png", "docx"], maxSizeMb: 6, categories: [{ id: 3, title: "Guides" }] };
const ASSET = {
  id: 12, title: "Buyer guide", description: "", language: "en", category: { id: 3, title: "Guides" }, isPublished: true,
  storageLocation: "local", remotePath: "", originalFileName: "buyer-guide.pdf", extension: "pdf", mime: "application/pdf", size: 204800,
  downloadUrl: "https://mautic.example/asset/abc", token: "{assetlink=12}", downloadCount: 5, uniqueDownloadCount: 3,
  createdByUser: "Ada Admin", dateAdded: "2026-10-29T09:00:00+00:00", dateModified: "2026-10-30T09:00:00+00:00",
};
const DOWNLOADS = {
  totals: { downloads: 5, unique: 3, recorded: 6, failed: 1 }, days: 30,
  daily: [{ date: "2026-10-29", downloads: 2 }, { date: "2026-10-30", downloads: 3 }],
  recent: [
    { date: "2026-10-30T08:00:00+00:00", contactId: 44, contactName: "Grace Hopper", contactEmail: "g@x.test", source: "email", sourceId: 9, code: 200 },
    { date: "2026-10-29T08:00:00+00:00", contactId: null, contactName: "", contactEmail: "", source: "", referer: "", code: 401 },
  ],
};

let calls;

function installApi() {
  calls = [];
  const respond = async (method, url, payload, config) => {
    calls.push({ method, url, payload, config });
    if (method === "get") {
      if (url === A) return { data: { count: 1, page: 1, num_pages: 1, results: [ASSET] } };
      if (url === `${A}metadata/`) return { data: META };
      if (url === `${A}12/`) return { data: ASSET };
      if (url === `${A}12/downloads/`) return { data: DOWNLOADS };
      if (url === `${A}12/file/`) return { data: new Blob(["%PDF"]) };
      return { data: {} };
    }
    if (method === "post" && url === A) return { data: { ...ASSET, id: 13 } };
    if (method === "patch") return { data: ASSET };
    if (method === "delete") return { data: null, status: 204 };
    return { data: {} };
  };
  globalThis.__testApiClient = {
    get: (url, config) => respond("get", url, undefined, config),
    post: (url, payload, config) => respond("post", url, payload, config),
    patch: (url, payload, config) => respond("patch", url, payload, config),
    delete: (url) => respond("delete", url),
  };
}

const hasText = (matcher) => queryByText(matcher) !== null;
const writes = (method, url) => calls.filter((c) => c.method === method && c.url === url);
const routes = () => [
  h(Route, { key: "list", path: "/admin/newsletter/assets", element: h(ListPage) }),
  h(Route, { key: "new", path: "/admin/newsletter/assets/new", element: h(EditorPage) }),
  h(Route, { key: "view", path: "/admin/newsletter/assets/:assetId", element: h(DetailsPage) }),
  h(Route, { key: "edit", path: "/admin/newsletter/assets/:assetId/edit", element: h(EditorPage) }),
];
// jsdom's File, so the page's (jsdom) FormData accepts it.
const pdf = (name = "annual-report_2026.pdf", size = 1024) => new window.File([new Uint8Array(size)], name, { type: "application/pdf" });

// A browser pairs FormData with its own File; give the pages jsdom's pair.
const nodeFormData = globalThis.FormData;
beforeEach(() => {
  globalThis.FormData = window.FormData;
  installApi();
});

afterEach(async () => {
  await cleanup();
  delete globalThis.__testApiClient;
  globalThis.FormData = nodeFormData;
});

test("helpers check files against Mautic's settings and build the form", () => {
  assert.equal(shared.titleFromFileName("C:\\x\\annual-report_2026.pdf"), "annual report 2026");
  assert.equal(shared.formatBytes(204800), "200 KB");
  const draft = { ...shared.blankAsset, title: "Guide" };
  assert.equal(shared.validateAssetDraft(draft, { source: "upload", file: pdf("a.exe"), remoteUrl: "", creating: true, config: META }),
    "Files of this type cannot be uploaded. Allowed: pdf, png, docx.");
  assert.equal(shared.validateAssetDraft(draft, { source: "upload", file: pdf("a.pdf", 7 * 1024 * 1024), remoteUrl: "", creating: true, config: META }),
    "The file is larger than Mautic's limit of 6 MB.");
  assert.equal(shared.validateAssetDraft(draft, { source: "remote", file: null, remoteUrl: "http://x.test/a.pdf", creating: true, config: META }),
    "Remote files must use an https:// link.");
  const form = shared.assetFormData({ ...draft, isPublished: true, publishUp: "2026-11-01T09:00" }, { remoteUrl: " https://x.test/a.pdf " });
  assert.equal(form.get("isPublished"), "1");
  assert.equal(form.get("publishUp"), "2026-11-01 09:00");
  assert.equal(form.get("remoteUrl"), "https://x.test/a.pdf");
  assert.equal(form.has("file"), false);
});

test("the list shows each asset with its downloads", async () => {
  await renderRoutes(routes(), { url: "/admin/newsletter/assets" });
  await waitFor(() => assert.equal(hasText("Buyer guide"), true));
  assert.equal(hasText("buyer-guide.pdf"), true);
  assert.equal(hasText("(3 unique)"), true);
  assert.equal(getByRole("link", "Buyer guide").getAttribute("href"), "/admin/newsletter/assets/12");
});

test("uploading a file names the asset after it and sends it as multipart", async () => {
  const view = await renderRoutes(routes(), { url: "/admin/newsletter/assets/new" });
  await waitFor(() => assert.equal(hasText(".pdf, .png, .docx · up to 6 MB"), true));
  await selectFile(document.querySelector("input[aria-label='Asset file']"), pdf());
  await waitFor(() => assert.equal(getByRole("textbox", "Title").value, "annual report 2026"));
  await click(getByRole("button", "Add Asset"));
  await waitFor(() => assert.equal(view.path(), "/admin/newsletter/assets/13"));
  const call = writes("post", A)[0];
  assert.equal(call.payload.get("file").name, "annual-report_2026.pdf");
  assert.equal(call.payload.get("title"), "annual report 2026");
  assert.equal(call.payload.get("isPublished"), "0");
  assert.equal(call.config.headers["Content-Type"], "multipart/form-data");
});

test("a wrong file type or a missing file never reaches the server", async () => {
  await renderRoutes(routes(), { url: "/admin/newsletter/assets/new" });
  await waitFor(() => assert.equal(queryByRole("button", "Add Asset") !== null, true));
  await typeInto(getByRole("textbox", "Title"), "Guide");
  await click(getByRole("button", "Add Asset"));
  await waitFor(() => assert.equal(hasText("Choose a file to upload."), true));
  await selectFile(document.querySelector("input[aria-label='Asset file']"), pdf("setup.exe"));
  await click(getByRole("button", "Add Asset"));
  await waitFor(() => assert.equal(hasText(/Files of this type cannot be uploaded/), true));
  assert.equal(writes("post", A).length, 0);
});

test("linking to a remote file", async () => {
  await renderRoutes(routes(), { url: "/admin/newsletter/assets/new" });
  await click(await waitFor(() => getByRole("button", "Link to a file")));
  await typeInto(getByRole("textbox", "Link to the file"), "https://files.example.com/guide.pdf");
  await typeInto(getByRole("textbox", "Title"), "Remote guide");
  await click(getByRole("button", "Add Asset"));
  await waitFor(() => assert.equal(writes("post", A).length, 1));
  const form = writes("post", A)[0].payload;
  assert.equal(form.get("remoteUrl"), "https://files.example.com/guide.pdf");
  assert.equal(form.has("file"), false);
});

test("editing keeps the file unless it is replaced", async () => {
  await renderRoutes(routes(), { url: "/admin/newsletter/assets/12/edit" });
  await waitFor(() => assert.equal(hasText("Current file: buyer-guide.pdf (200 KB)"), true));
  assert.equal(queryByRole("button", "Upload a file"), null);
  await typeInto(getByRole("textbox", "Title"), "Buyer guide 2027");
  await click(getByRole("button", "Save Asset"));
  await waitFor(() => assert.equal(writes("patch", `${A}12/`).length, 1));
  const form = writes("patch", `${A}12/`)[0].payload;
  assert.equal(form.get("title"), "Buyer guide 2027");
  assert.equal(form.get("category"), "3");
  assert.equal(form.has("file"), false);
});

test("details show sharing, totals and recent downloads", async () => {
  await renderRoutes(routes(), { url: "/admin/newsletter/assets/12" });
  await waitFor(() => assert.equal(hasText("{assetlink=12}"), true));
  assert.equal(hasText("https://mautic.example/asset/abc"), true);
  await waitFor(() => assert.equal(hasText("Grace Hopper"), true));
  assert.equal(getByRole("link", "Grace Hopper").getAttribute("href"), "/admin/newsletter/contacts/44");
  assert.equal(hasText("Email #9"), true);
  assert.equal(hasText("Anonymous visitor"), true);
  assert.equal(hasText("Failed (401)"), true);
  assert.equal(queryByRole("img", /Downloads, last 30 days/) !== null, true);
  globalThis.URL.createObjectURL = () => "blob:x";
  globalThis.URL.revokeObjectURL = () => {};
  await click(getByRole("button", "Download"));
  await waitFor(() => assert.equal(calls.some((c) => c.url === `${A}12/file/` && c.config?.responseType === "blob"), true));
});
