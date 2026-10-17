// Route + API fixtures for the Marketing Hub Templates pages (list, details,
// create/edit). Requests are answered in-process and recorded; nothing leaves.
import { React, loadSource, renderRoutes, router } from "./blogDomHarness.mjs";

const { default: AdminNewsletterTemplatesPanel } = await loadSource("src/pages/AdminNewsletterTemplatesPanel.jsx");
const { default: AdminNewsletterTemplateDetailsPage } = await loadSource("src/pages/AdminNewsletterTemplateDetailsPage.jsx");
const { default: AdminNewsletterTemplateEditorPage } = await loadSource("src/pages/AdminNewsletterTemplateEditorPage.jsx");

const { Route } = router;
const h = React.createElement;

export const STYLES = { padding: { top: 0, right: 0, bottom: 0, left: 0 }, margin: { top: 0, right: 0, bottom: 0, left: 0 } };
export const contentWith = (text) => ({
  blocks: [{ id: `p-${text}`, type: "paragraph", content: `<p>${text}</p>`, styles: STYLES }],
  settings: { width: 600, backgroundColor: "#ffffff", fontFamily: "Arial", locale: "en" },
});
export const FINGERPRINT = "a".repeat(64);
export const designState = (status, text = "Saved design") => ({
  status,
  design: status === "none" || status === "invalid" ? null : { editor: "templatical", version: 1, content: contentWith(text) },
  htmlFingerprint: FINGERPRINT,
  updatedAt: "2026-10-17T10:00:00Z",
});

export const makeTemplate = (overrides = {}) => ({
  id: "18",
  name: "Reusable Newsletter",
  subject: "Monthly update for {contactfield=firstname}",
  preheaderText: "What changed this month",
  fromName: "IMAA Connect",
  fromAddress: "newsletter@example.test",
  plainText: "Plain content",
  customHtml: '<h1>Legacy HTML</h1><a href="{unsubscribe_url}">Unsubscribe</a>',
  emailType: "template",
  category: { id: "4", title: "Email Updates" },
  template: "blank",
  isPublished: true,
  dateAdded: "2026-10-01T09:00:00Z",
  dateModified: "2026-10-16T09:00:00Z",
  sentCount: 3,
  readCount: 2,
  visualDesign: designState("none"),
  ...overrides,
});

/**
 * Installs a fake API. `templates` is keyed by id; `handlers` may override any
 * "<method> <url>" (async (payload, config) => response or throw).
 */
export function installTemplatesApi({ templates = [makeTemplate()], count, handlers = {} } = {}) {
  const calls = [];
  const byId = Object.fromEntries(templates.map((t) => [String(t.id), t]));
  const respond = async (method, url, payload, config) => {
    calls.push({ method, url, payload, params: config?.params });
    const key = `${method} ${url}`;
    if (handlers[key]) return handlers[key](payload, config);
    if (method === "get") {
      if (url === "/newsletter/admin/templates/") {
        return { data: { count: count ?? templates.length, page: config?.params?.page || 1, page_size: 25, num_pages: Math.ceil((count ?? templates.length) / 25), results: templates } };
      }
      if (url === "/newsletter/admin/templates/tokens/") {
        return { data: { results: [{ token: "{contactfield=firstname}", label: "First Name", group: "Contact Fields" }] } };
      }
      if (url === "/newsletter/admin/templates/categories/") return { data: { results: [{ id: "4", title: "Email Updates" }] } };
      if (url === "/newsletter/admin/templates/themes/") return { data: { results: [{ key: "blank", name: "Blank" }] } };
      const usage = url.match(/^\/newsletter\/admin\/templates\/([^/]+)\/usage\/$/);
      if (usage) return { data: { available: false, dependencies: [] } };
      const detail = url.match(/^\/newsletter\/admin\/templates\/([^/]+)\/$/);
      if (detail) {
        if (byId[detail[1]]) return { data: byId[detail[1]] };
        throw Object.assign(new Error("Not found"), { response: { status: 404, data: { detail: "Not found." } } });
      }
      return { data: {} };
    }
    if (method === "post" && url === "/newsletter/admin/email-designs/compile/") {
      return { data: { html: `<html><body>compiled ${payload.mjml.length}</body></html>`, tokens: [] } };
    }
    if (method === "post" && url === "/newsletter/admin/templates/") return { data: makeTemplate({ id: "31", ...payload }) };
    if (method === "patch") {
      const id = url.match(/templates\/([^/]+)\/$/)?.[1];
      return { data: { ...byId[id], ...payload } };
    }
    if (method === "post" && /\/duplicate\/$/.test(url)) return { data: makeTemplate({ id: "44", name: "Reusable Newsletter Copy", isPublished: false, designCopied: false }) };
    if (method === "delete") return { data: null, status: 204 };
    throw new Error(`unexpected ${method} ${url}`);
  };
  globalThis.__testApiClient = {
    get: (url, config) => respond("get", url, undefined, config),
    post: (url, payload) => respond("post", url, payload),
    patch: (url, payload) => respond("patch", url, payload),
    delete: (url) => respond("delete", url),
  };
  return {
    calls,
    writes: (method, url) => calls.filter((c) => c.method === method && (!url || c.url === url)),
  };
}

/** The real Templates routes, as mounted under /admin/newsletter in App.jsx. */
export async function renderTemplatePages(url) {
  return renderRoutes(
    [
      h(Route, { key: "hub", path: "/admin/newsletter", element: h("div", null, "Marketing Hub home") }),
      h(Route, { key: "list", path: "/admin/newsletter/templates", element: h(AdminNewsletterTemplatesPanel) }),
      h(Route, { key: "new", path: "/admin/newsletter/templates/new", element: h(AdminNewsletterTemplateEditorPage) }),
      h(Route, { key: "details", path: "/admin/newsletter/templates/:templateId", element: h(AdminNewsletterTemplateDetailsPage) }),
      h(Route, { key: "edit", path: "/admin/newsletter/templates/:templateId/edit", element: h(AdminNewsletterTemplateEditorPage) }),
    ],
    { url }
  );
}
