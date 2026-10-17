import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { act, cleanup, click, getByRole, queryByRole, queryByText, typeInto, waitFor } from "./helpers/blogDomHarness.mjs";
import {
  FINGERPRINT,
  contentWith,
  designState,
  installTemplatesApi,
  makeTemplate,
  renderTemplatePages,
} from "./helpers/templatePagesHarness.mjs";

// Full-page Template editor (/templates/new and /templates/:id/edit).
// Assertions compare strings/booleans only (jsdom nodes in a failing assert
// exhaust memory).

const hasText = (matcher) => queryByText(matcher) !== null;
const visualEditor = () => document.querySelector("textarea[aria-label='Visual design (test double)']");
const htmlField = () => queryByRole("textbox", "HTML Content");
const saveButton = (label) => getByRole("button", label);

let api;
async function openEditor(url, templates) {
  api = installTemplatesApi(templates ? { templates } : {});
  const view = await renderTemplatePages(url);
  await waitFor(() => getByRole("textbox", "Template Name"));
  return view;
}

afterEach(async () => {
  await cleanup();
  delete globalThis.__testApiClient;
  delete globalThis.__fakeVisualEditor;
});

test("a new Template opens full-page in Visual Builder and saves its design, never client HTML", async () => {
  const view = await openEditor("/admin/newsletter/templates/new");
  await waitFor(() => assert.equal(Boolean(visualEditor()), true));
  assert.equal(htmlField() === null, true);
  assert.equal(queryByRole("dialog") === null, true, "the editor is a page, not a dialog");

  await act(async () => globalThis.__fakeVisualEditor.edit(contentWith("Hello {contactfield=firstname}")));
  await typeInto(getByRole("textbox", "Template Name"), "Visual Template");
  await typeInto(getByRole("textbox", "Subject"), "Hi there");
  await click(saveButton("Create Template"));

  await waitFor(() => assert.equal(api.writes("post", "/newsletter/admin/templates/").length, 1));
  const payload = api.writes("post", "/newsletter/admin/templates/")[0].payload;
  assert.deepEqual(payload.design, { editor: "templatical", version: 1, content: contentWith("Hello {contactfield=firstname}") });
  assert.match(payload.mjml, /^<mjml>/);
  assert.equal("customHtml" in payload, false);
  assert.equal("baseFingerprint" in payload, false);
  await waitFor(() => assert.equal(view.path(), "/admin/newsletter/templates/31"));
});

test("required fields are checked before anything is sent", async () => {
  await openEditor("/admin/newsletter/templates/new");
  await click(saveButton("Create Template"));
  await waitFor(() => assert.equal(hasText("Template name is required."), true));
  assert.equal(hasText("Subject is required."), true);
  assert.equal(api.writes("post", "/newsletter/admin/templates/").length, 0);
});

test("an in-sync design reopens on the edit page and saves against its fingerprint", async () => {
  const view = await openEditor("/admin/newsletter/templates/18/edit", [makeTemplate({ visualDesign: designState("in_sync") })]);
  await waitFor(() => assert.match(visualEditor()?.value || "", /Saved design/));
  assert.equal(hasText(/Edit Template — Reusable Newsletter/), true);

  await act(async () => globalThis.__fakeVisualEditor.edit(contentWith("Edited design")));
  await click(saveButton("Save Changes"));

  await waitFor(() => assert.equal(api.writes("patch").length, 1));
  const { url, payload } = api.writes("patch")[0];
  assert.equal(url, "/newsletter/admin/templates/18/");
  assert.equal(payload.baseFingerprint, FINGERPRINT);
  assert.deepEqual(payload.design.content, contentWith("Edited design"));
  assert.equal("customHtml" in payload, false);
  await waitFor(() => assert.equal(view.path(), "/admin/newsletter/templates/18"));
});

test("a legacy HTML Template opens in HTML mode and is never converted silently", async () => {
  await openEditor("/admin/newsletter/templates/18/edit");
  await waitFor(() => assert.equal(Boolean(htmlField()), true));
  assert.match(htmlField().value, /<h1>Legacy HTML<\/h1>/);
  assert.equal(visualEditor() === null, true);

  await click(getByRole("button", "Visual Builder"));
  await waitFor(() => assert.equal(hasText("Start a new visual design?"), true));
  await click(getByRole("button", "Stay in HTML Editor"));
  await waitFor(() => assert.equal(hasText("Start a new visual design?"), false));

  await click(saveButton("Save Changes"));
  await waitFor(() => assert.equal(api.writes("patch").length, 1));
  const { payload } = api.writes("patch")[0];
  assert.equal(payload.customHtml, makeTemplate().customHtml);
  assert.equal(payload.baseFingerprint, FINGERPRINT);
  assert.equal("design" in payload, false);
});

test("a stale design is shown as out of date and only restored on request", async () => {
  await openEditor("/admin/newsletter/templates/18/edit", [makeTemplate({ customHtml: "<p>Edited in Mautic</p>", visualDesign: designState("stale", "Older design") })]);
  await waitFor(() => assert.equal(htmlField()?.value, "<p>Edited in Mautic</p>"));
  assert.equal(hasText(/changed after its visual design was saved/), true);

  await click(getByRole("button", "Visual Builder"));
  await click(await waitFor(() => getByRole("button", "Restore Visual Design")));
  await waitFor(() => assert.match(visualEditor()?.value || "", /Older design/));
});

test("switching to HTML converts the current design on the server first", async () => {
  await openEditor("/admin/newsletter/templates/18/edit", [makeTemplate({ visualDesign: designState("in_sync") })]);
  await waitFor(() => assert.equal(Boolean(visualEditor()), true));
  await click(getByRole("button", "HTML Editor"));
  await waitFor(() => assert.equal(Boolean(htmlField()), true));
  assert.equal(api.writes("post", "/newsletter/admin/email-designs/compile/").length, 1);
  assert.match(htmlField().value, /^<html><body>compiled \d+<\/body><\/html>$/);
});

test("a conflict keeps the admin on the page with their changes and the reason", async () => {
  api = installTemplatesApi({
    templates: [makeTemplate({ visualDesign: designState("in_sync") })],
    handlers: {
      "patch /newsletter/admin/templates/18/": async () => {
        throw Object.assign(new Error("conflict"), {
          response: { status: 409, data: { detail: "This Template was changed since you opened it.", code: "template_changed" } },
        });
      },
    },
  });
  const view = await renderTemplatePages("/admin/newsletter/templates/18/edit");
  await waitFor(() => assert.equal(Boolean(visualEditor()), true));
  await act(async () => globalThis.__fakeVisualEditor.edit(contentWith("Not lost")));
  await click(saveButton("Save Changes"));
  await waitFor(() => assert.equal(hasText("This Template was changed since you opened it."), true));
  assert.equal(view.path(), "/admin/newsletter/templates/18/edit");
  assert.match(visualEditor().value, /Not lost/);
});

test("a create whose design was not stored continues as an edit of that Template", async () => {
  let posts = 0;
  api = installTemplatesApi({
    handlers: {
      "post /newsletter/admin/templates/": async () => {
        posts += 1;
        throw Object.assign(new Error("partial"), {
          response: {
            status: 500,
            data: {
              detail: "The Template was created in Mautic, but its visual design could not be stored.",
              code: "design_not_saved",
              template: makeTemplate({ id: "31", visualDesign: { ...designState("none"), htmlFingerprint: "b".repeat(64) } }),
            },
          },
        });
      },
    },
  });
  const view = await renderTemplatePages("/admin/newsletter/templates/new");
  await waitFor(() => assert.equal(Boolean(visualEditor()), true));
  await act(async () => globalThis.__fakeVisualEditor.edit(contentWith("Keep me")));
  await typeInto(getByRole("textbox", "Template Name"), "Visual Template");
  await typeInto(getByRole("textbox", "Subject"), "Hi");
  await click(saveButton("Create Template"));

  await waitFor(() => assert.equal(hasText(/visual design could not be stored/), true));
  await waitFor(() => assert.equal(view.path(), "/admin/newsletter/templates/31/edit"));
  // Same page instance: the design on screen survives and the retry edits Template 31.
  assert.match(visualEditor().value, /Keep me/);
  assert.equal(api.writes("get", "/newsletter/admin/templates/31/").length, 0, "no reload replaced the work");
  await click(saveButton("Save Changes"));
  await waitFor(() => assert.equal(api.writes("patch").length, 1));
  assert.equal(posts, 1);
  assert.equal(api.writes("patch")[0].url, "/newsletter/admin/templates/31/");
  assert.equal(api.writes("patch")[0].payload.baseFingerprint, "b".repeat(64));
  assert.deepEqual(api.writes("patch")[0].payload.design.content, contentWith("Keep me"));
});

test("leaving with unsaved changes asks first, for buttons and links alike", async () => {
  const view = await openEditor("/admin/newsletter/templates/18/edit");
  await typeInto(getByRole("textbox", "Subject"), "Changed subject");

  await click(getByRole("button", "Back"));
  await waitFor(() => assert.equal(hasText("Leave without saving?"), true));
  await click(getByRole("button", "Keep Editing"));
  await waitFor(() => assert.equal(hasText("Leave without saving?"), false));
  assert.equal(view.path(), "/admin/newsletter/templates/18/edit");
  assert.equal(getByRole("textbox", "Subject").value, "Changed subject");

  await click(getByRole("link", "Templates"));
  await waitFor(() => assert.equal(hasText("Leave without saving?"), true));
  await click(getByRole("button", "Leave Without Saving"));
  await waitFor(() => assert.equal(view.path(), "/admin/newsletter/templates"));
});

test("an unchanged page navigates without a prompt", async () => {
  const view = await openEditor("/admin/newsletter/templates/18/edit");
  await click(getByRole("button", "Back"));
  await waitFor(() => assert.equal(view.path(), "/admin/newsletter/templates/18"));
  assert.equal(hasText("Leave without saving?"), false);
});

test("preview of a visual design shows the server-compiled HTML inline", async () => {
  await openEditor("/admin/newsletter/templates/18/edit", [makeTemplate({ visualDesign: designState("in_sync") })]);
  await waitFor(() => assert.equal(Boolean(visualEditor()), true));
  await click(getByRole("button", "Preview"));
  await waitFor(() =>
    assert.match(document.querySelector("iframe[title='Template editor preview']")?.getAttribute("srcdoc") || "", /compiled/)
  );
  assert.equal(queryByRole("dialog") === null, true);
  assert.equal(api.writes("post", "/newsletter/admin/email-designs/compile/").length, 1);
  assert.equal(api.writes("post").some((c) => c.url.endsWith("/test-send/")), false, "preview never sends");
});

test("a double click saves once", async () => {
  let release;
  api = installTemplatesApi({
    templates: [makeTemplate({ visualDesign: designState("in_sync") })],
    handlers: {
      "patch /newsletter/admin/templates/18/": (payload) =>
        new Promise((resolve) => {
          release = () => resolve({ data: makeTemplate(payload) });
        }),
    },
  });
  await renderTemplatePages("/admin/newsletter/templates/18/edit");
  await waitFor(() => assert.equal(Boolean(visualEditor()), true));
  const button = saveButton("Save Changes");
  await act(async () => {
    button.click();
    button.click();
  });
  await waitFor(() => assert.equal(api.writes("patch").length, 1));
  await act(async () => release());
  assert.equal(api.writes("patch").length, 1);
});

test("typing that the editor has not reported yet still blocks leaving", async () => {
  const view = await openEditor("/admin/newsletter/templates/18/edit", [makeTemplate({ visualDesign: designState("in_sync") })]);
  await waitFor(() => assert.equal(Boolean(visualEditor()), true));
  globalThis.__fakeVisualEditor.editSilently(contentWith("Typed a moment ago"));

  await click(getByRole("button", "Back"));
  await waitFor(() => assert.equal(hasText("Leave without saving?"), true));
  assert.equal(view.path(), "/admin/newsletter/templates/18/edit");
});
