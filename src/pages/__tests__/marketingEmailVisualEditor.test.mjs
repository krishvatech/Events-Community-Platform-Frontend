import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import {
  React,
  act,
  cleanup,
  click,
  getByRole,
  loadSource,
  queryByRole,
  queryByText,
  renderRoutes,
  router,
  waitFor,
} from "./helpers/blogDomHarness.mjs";

const tokensModule = await loadSource("src/components/marketing/marketingEmailTokens.js");
const designModule = await loadSource("src/components/marketing/marketingEmailDesign.js");
const { default: MarketingEmailVisualEditor } = await loadSource(
  "src/components/marketing/MarketingEmailVisualEditor.jsx"
);

const {
  createMauticMergeTagSyntax,
  findUnknownFieldTokens,
  insertTokenAt,
  isMauticToken,
  normalizeMauticTokens,
  toEditorMergeTags,
} = tokensModule;
const {
  DESIGN_EDITOR,
  DESIGN_VERSION,
  checkEmailUrl,
  createMarketingStarterDesign,
  isTemplateContent,
  readDesign,
  renderDesignToMjml,
  validateDesignUrls,
  wrapDesign,
} = designModule;

const { Route } = router;
const h = React.createElement;

// The shape returned by GET /newsletter/admin/templates/tokens/.
const BACKEND_TOKENS = [
  { token: "{unsubscribe_url}", label: "Unsubscribe URL", group: "Email" },
  { token: "{webview_url}", label: "Web View URL", group: "Email" },
  { token: "{contactfield=firstname}", label: "First Name", group: "Contact Fields" },
  { token: "{contactfield=lastname}", label: "Last Name", group: "Contact Fields" },
  { token: "{companyfield=companyname}", label: "Company Name", group: "Company Fields" },
];

// The complete block/settings shape the real editor always produces.
const STYLES = { padding: { top: 0, right: 0, bottom: 0, left: 0 }, margin: { top: 0, right: 0, bottom: 0, left: 0 } };
const SETTINGS = { width: 600, backgroundColor: "#ffffff", fontFamily: "Arial", locale: "en" };

afterEach(cleanup);

const matchesAll = (regex, text) => [...text.matchAll(regex)].map((m) => m[0]);

// ------------------------------------------------------------- tokens --

test("token normalization keeps valid Mautic tokens once and drops malformed rows", () => {
  const tokens = normalizeMauticTokens([
    ...BACKEND_TOKENS,
    { token: "{contactfield=firstname}", label: "Duplicate" },
    { token: "{{ first_name }}", label: "Django" },
    { token: "{contactfield=}", label: "Empty" },
    { token: "contactfield=email", label: "No braces" },
    null,
  ]);
  assert.deepEqual(tokens.map((t) => t.token), BACKEND_TOKENS.map((t) => t.token));
  assert.equal(tokens[2].label, "First Name");
  assert.equal(isMauticToken("{contactfield=first_name2}"), true);
  assert.equal(isMauticToken("{{ first_name }}"), false);
});

test("merge-tag syntax recognizes Mautic tokens only, never liquid or CSS braces", () => {
  const syntax = createMauticMergeTagSyntax(BACKEND_TOKENS);
  const text =
    "Hi {contactfield=firstname} of {companyfield=companyname}, {contactfield=custom_field} " +
    "{unsubscribe_url} {webview_url} {{ first_name }} {color} {other_system_token} p{margin:0}";
  assert.deepEqual(matchesAll(syntax.value, text), [
    "{contactfield=firstname}",
    "{companyfield=companyname}",
    "{contactfield=custom_field}",
    "{unsubscribe_url}",
    "{webview_url}",
  ]);
  assert.deepEqual(matchesAll(syntax.logic, "{% if x %} {%if%}"), []);
  assert.deepEqual(toEditorMergeTags(BACKEND_TOKENS)[0], { label: "Unsubscribe URL", value: "{unsubscribe_url}" });
});

test("unknown or malformed field tokens are reported, listed ones are not", () => {
  const html = "<p>{contactfield=firstname} {contactfield=nickname} {companyfield=} {unsubscribe_url}</p>";
  assert.deepEqual(findUnknownFieldTokens(html, BACKEND_TOKENS), ["{contactfield=nickname}", "{companyfield=}"]);
  assert.deepEqual(findUnknownFieldTokens({ blocks: [{ content: "{contactfield=lastname}" }] }, BACKEND_TOKENS), []);
});

test("token insertion replaces the selection and returns the caret position", () => {
  assert.deepEqual(insertTokenAt("Hello !", "{contactfield=firstname}", 6, 6), {
    value: "Hello {contactfield=firstname}!",
    caret: 30,
  });
  assert.deepEqual(insertTokenAt("abc", "{webview_url}", 1, 2).value, "a{webview_url}c");
  assert.deepEqual(insertTokenAt(null, "{webview_url}").value, "{webview_url}");
});

// ------------------------------------------------------------- design --

test("starter design is valid and only uses tokens the backend listed", () => {
  const withTokens = createMarketingStarterDesign(BACKEND_TOKENS);
  assert.equal(isTemplateContent(withTokens), true);
  const serialized = JSON.stringify(withTokens);
  assert.match(serialized, /data-merge-tag=\\"\{contactfield=firstname\}\\"/);
  assert.match(serialized, /href=\\"\{unsubscribe_url\}\\"/);

  const withoutTokens = JSON.stringify(createMarketingStarterDesign([]));
  assert.doesNotMatch(withoutTokens, /contactfield|unsubscribe_url|webview_url/);
});

test("design envelope round-trips and refuses content it cannot reopen", () => {
  const content = createMarketingStarterDesign(BACKEND_TOKENS);
  const design = wrapDesign(content);
  assert.equal(design.editor, DESIGN_EDITOR);
  assert.equal(design.version, DESIGN_VERSION);
  assert.deepEqual(readDesign(JSON.parse(JSON.stringify(design))), { ok: true, content });
  assert.deepEqual(readDesign(JSON.stringify(design)).ok, true);

  assert.equal(readDesign(null).reason, "missing");
  assert.equal(readDesign("{not json").reason, "invalid");
  assert.equal(readDesign({ editor: "grapesjs", version: 1, content }).reason, "unsupported_editor");
  assert.equal(readDesign({ editor: DESIGN_EDITOR, version: 2, content }).reason, "unsupported_version");
  assert.equal(readDesign({ editor: DESIGN_EDITOR, version: 1, content: { blocks: "x", settings: {} } }).reason, "invalid");
  assert.throws(() => wrapDesign({ blocks: [{ type: "paragraph" }], settings: { width: 600 } }), /not valid/);
});

test("rendered MJML keeps raw Mautic tokens and drops editor chip markup", async () => {
  const mjml = await renderDesignToMjml(createMarketingStarterDesign(BACKEND_TOKENS));
  assert.match(mjml, /^<mjml/);
  assert.match(mjml, /Hello \{contactfield=firstname\},/);
  assert.match(mjml, /href="\{webview_url\}"/);
  assert.match(mjml, /href="\{unsubscribe_url\}"/);
  assert.doesNotMatch(mjml, /data-merge-tag/);
  assert.doesNotMatch(mjml, /\{\{|first_name/);
});

test("sections, columns, images and buttons render to responsive MJML", async () => {
  const content = {
    blocks: [
      {
        id: "s1",
        type: "section",
        columns: "2",
        children: [
          [{ id: "i1", type: "image", src: "https://cdn.example.com/hero.png", alt: "Hero", width: "full", align: "center", linkUrl: "https://imaa.example.com", styles: STYLES }],
          [{ id: "b1", type: "button", text: "Join", url: "{webview_url}", backgroundColor: "#0f766e", textColor: "#ffffff", borderRadius: 4, fontSize: 14, buttonPadding: { top: 10, right: 20, bottom: 10, left: 20 }, styles: STYLES }],
        ],
        styles: STYLES,
      },
    ],
    settings: SETTINGS,
  };
  assert.equal(isTemplateContent(content), true);
  const mjml = await renderDesignToMjml(content);
  // Body columns only; <mj-head> carries a self-closing <mj-column> default.
  assert.equal((mjml.match(/<mj-column(?![^>]*\/>)/g) || []).length, 2);
  assert.match(mjml, /<mj-image[^>]*src="https:\/\/cdn\.example\.com\/hero\.png"/);
  assert.match(mjml, /alt="Hero"/);
  assert.match(mjml, /<mj-button[^>]*href="\{webview_url\}"/);
  assert.deepEqual(validateDesignUrls(content), []);
  await assert.rejects(() => renderDesignToMjml({ blocks: null }), /not valid/);
  // Structurally valid but damaged (no styles): a clear error, not a TypeError.
  await assert.rejects(
    () => renderDesignToMjml({ blocks: [{ id: "x", type: "paragraph", content: "<p>x</p>" }], settings: SETTINGS }),
    /could not be rendered/
  );
});

test("email URL checks require public HTTPS images and safe links", () => {
  assert.equal(checkEmailUrl("image", "https://cdn.example.com/a.png"), "");
  assert.match(checkEmailUrl("image", "http://cdn.example.com/a.png"), /HTTPS/);
  assert.match(checkEmailUrl("image", "/media/a.png"), /HTTPS/);
  assert.match(checkEmailUrl("image", "data:image/png;base64,AAAA"), /public HTTPS/);
  assert.match(checkEmailUrl("image", ""), /no URL/);
  assert.equal(checkEmailUrl("link", "{unsubscribe_url}"), "");
  assert.equal(checkEmailUrl("link", "mailto:events@example.com"), "");
  assert.match(checkEmailUrl("link", "javascript:alert(1)"), /Script/);
  assert.match(checkEmailUrl("link", "https://"), /no URL/);
  assert.match(checkEmailUrl("link", "http://example.com"), /HTTPS/);

  const problems = validateDesignUrls({
    blocks: [{ id: "p", type: "paragraph", content: '<p><a href="javascript:x()">x</a> <img src="http://x.test/i.png"></p>' }],
    settings: { width: 600 },
  });
  assert.equal(problems.length, 2);
});

// ------------------------------------------------------------ component --

/** A recording stand-in for Templatical's init(); no Vue, no canvas. */
function fakeTemplatical({ fail = false } = {}) {
  const log = { instances: [], configs: [] };
  const init = async (config) => {
    if (fail) throw new Error("Editor bundle failed to load");
    log.configs.push(config);
    const editor = {
      config,
      content: JSON.parse(JSON.stringify(config.content)),
      mounted: true,
      getContent() {
        return this.content;
      },
      edit(content) {
        this.content = content;
        config.onChange?.(content);
      },
      unmount() {
        this.mounted = false;
      },
    };
    config.container.setAttribute("data-fake-editor", String(log.instances.length));
    log.instances.push(editor);
    return editor;
  };
  return { log, loadEditor: async () => init };
}

const live = (log) => log.instances.filter((editor) => editor.mounted);

/** Renders the editor with props that a test can replace later. */
async function renderEditor(initialProps) {
  const ref = React.createRef();
  let setProps;
  function Host() {
    const [props, update] = React.useState(initialProps);
    setProps = update;
    return h(MarketingEmailVisualEditor, { ref, ...props });
  }
  await renderRoutes(h(Route, { path: "/", element: h(Host) }));
  return {
    ref,
    update: async (patch) => act(async () => setProps((current) => ({ ...current, ...patch }))),
  };
}

const designFor = (text) => ({
  blocks: [{ id: `p-${text}`, type: "paragraph", content: `<p>${text}</p>`, styles: STYLES }],
  settings: SETTINGS,
});

test("mounts the starter layout with Mautic merge-tag configuration", async () => {
  const { log, loadEditor } = fakeTemplatical();
  let readyContent = null;
  const { ref } = await renderEditor({
    designKey: "template:new",
    tokens: BACKEND_TOKENS,
    loadEditor,
    onReady: (content) => {
      readyContent = content;
    },
  });
  await waitFor(() => assert.equal(log.instances.length, 1));

  const config = log.configs[0];
  assert.equal(config.mergeTags.autocomplete, false);
  assert.equal(typeof config.mergeTags.onRequest, "function");
  assert.equal(config.mergeTags.tags.length, BACKEND_TOKENS.length);
  assert.deepEqual(matchesAll(config.mergeTags.syntax.value, "{contactfield=firstname} {{ x }}"), ["{contactfield=firstname}"]);
  assert.equal(config.branding, false);
  assert.match(JSON.stringify(config.content), /contactfield=firstname/);
  assert.equal(isTemplateContent(readyContent), true);
  assert.equal(ref.current.isReady(), true);
  // Booleans only: a failing assert on a jsdom node serializes the whole DOM graph.
  assert.equal(queryByRole("progressbar", "Loading visual editor") === null, true);
});

test("loads saved content and exposes the design envelope and MJML", async () => {
  const { log, loadEditor } = fakeTemplatical();
  const saved = designFor("Saved {contactfield=firstname}");
  const { ref } = await renderEditor({ designKey: "template:7", initialContent: saved, tokens: BACKEND_TOKENS, loadEditor });
  await waitFor(() => assert.equal(ref.current.isReady(), true));

  assert.deepEqual(log.configs[0].content, saved);
  const design = ref.current.getDesign();
  assert.deepEqual(design, { editor: DESIGN_EDITOR, version: DESIGN_VERSION, content: saved });
  assert.deepEqual(readDesign(design), { ok: true, content: saved });
  const mjml = await ref.current.toMjml();
  assert.match(mjml, /Saved \{contactfield=firstname\}/);
});

test("switching the design identity never keeps the previous item's content", async () => {
  const { log, loadEditor } = fakeTemplatical();
  const changes = [];
  const { ref, update } = await renderEditor({
    designKey: "template:1",
    initialContent: designFor("Template one"),
    tokens: BACKEND_TOKENS,
    loadEditor,
    onChange: (content) => changes.push(content),
  });
  await waitFor(() => assert.equal(ref.current.isReady(), true));
  await act(async () => live(log)[0].edit(designFor("Template one, edited")));
  assert.equal(changes.length, 1);

  await update({ designKey: "template:2", initialContent: designFor("Template two") });
  await waitFor(() => assert.equal(live(log).length, 1));
  await waitFor(() => assert.equal(ref.current.isReady(), true));
  assert.equal(log.instances[0].mounted, false);
  assert.deepEqual(ref.current.getContent(), designFor("Template two"));

  // A late change from the replaced editor is ignored.
  await act(async () => log.instances[0].edit(designFor("stale")));
  assert.equal(changes.length, 1);
  assert.deepEqual(ref.current.getContent(), designFor("Template two"));

  // Back to the first item: its saved content, not the stale in-memory edit.
  await update({ designKey: "template:1", initialContent: designFor("Template one") });
  await waitFor(() => assert.equal(ref.current.isReady(), true));
  await waitFor(() => assert.deepEqual(ref.current.getContent(), designFor("Template one")));
});

test("a token list change for the same item keeps the edits made so far", async () => {
  const { log, loadEditor } = fakeTemplatical();
  const { ref, update } = await renderEditor({ designKey: "broadcast:a", initialContent: designFor("Start"), tokens: [], loadEditor });
  await waitFor(() => assert.equal(ref.current.isReady(), true));
  await act(async () => live(log)[0].edit(designFor("Edited before tokens loaded")));

  await update({ tokens: BACKEND_TOKENS });
  await waitFor(() => assert.equal(log.instances.length, 2));
  await waitFor(() => assert.equal(ref.current.isReady(), true));
  assert.deepEqual(log.configs[1].content, designFor("Edited before tokens loaded"));
  assert.equal(log.configs[1].mergeTags.tags.length, BACKEND_TOKENS.length);
  assert.equal(live(log).length, 1);
});

test("invalid saved content is refused instead of being replaced", async () => {
  const { log, loadEditor } = fakeTemplatical();
  const { ref } = await renderEditor({ designKey: "template:9", initialContent: { blocks: "broken" }, loadEditor });
  await waitFor(() => getByRole("alert"));
  assert.match(getByRole("alert").textContent, /cannot be opened/);
  assert.equal(log.instances.length, 0);
  assert.throws(() => ref.current.getDesign(), /not ready/);
});

test("an editor load failure is shown and reported", async () => {
  const { loadEditor } = fakeTemplatical({ fail: true });
  let reported = null;
  await renderEditor({ designKey: "template:3", loadEditor, onError: (err) => { reported = err; } });
  await waitFor(() => getByRole("alert"));
  assert.match(getByRole("alert").textContent, /Editor bundle failed to load/);
  assert.equal(reported?.message, "Editor bundle failed to load");
});

test("the editor's merge-tag request opens the token picker and returns the chosen token", async () => {
  const { log, loadEditor } = fakeTemplatical();
  const { ref } = await renderEditor({ designKey: "template:5", tokens: BACKEND_TOKENS, loadEditor });
  await waitFor(() => assert.equal(ref.current.isReady(), true));

  let chosen;
  await act(async () => {
    chosen = log.configs[0].mergeTags.onRequest();
  });
  await waitFor(() => getByRole("dialog"));
  await click(getByRole("button", "Company Name"));
  assert.deepEqual(await chosen, { label: "Company Name", value: "{companyfield=companyname}" });
  await waitFor(() => assert.equal(queryByRole("dialog") === null, true));

  let cancelled;
  await act(async () => {
    cancelled = log.configs[0].mergeTags.onRequest();
  });
  await waitFor(() => getByRole("dialog"));
  await click(getByRole("button", "Cancel"));
  assert.equal(await cancelled, null);
});

test("unmounting removes the editor and settles a pending token request", async () => {
  const { log, loadEditor } = fakeTemplatical();
  const { ref } = await renderEditor({ designKey: "template:6", tokens: BACKEND_TOKENS, loadEditor });
  await waitFor(() => assert.equal(ref.current.isReady(), true));
  let pending;
  await act(async () => {
    pending = log.configs[0].mergeTags.onRequest();
  });
  await cleanup();
  assert.equal(await pending, null);
  assert.equal(live(log).length, 0);
  assert.equal(queryByText("Insert Mautic Token") === null, true);
});

test("StrictMode's double mount leaves exactly one live editor", async () => {
  const { log, loadEditor } = fakeTemplatical();
  const ref = React.createRef();
  await renderRoutes(
    h(Route, {
      path: "/",
      element: h(React.StrictMode, null, h(MarketingEmailVisualEditor, { ref, designKey: "broadcast:s", loadEditor })),
    })
  );
  await waitFor(() => assert.equal(ref.current?.isReady(), true));
  assert.equal(live(log).length, 1);
  assert.equal(document.querySelectorAll("[data-fake-editor]").length, 1);
});
