import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { act, all, cleanup, click, getByRole, queryByRole, queryByText, typeInto, waitFor } from "./helpers/blogDomHarness.mjs";
import { designState, installTemplatesApi, makeTemplate, renderTemplatePages } from "./helpers/templatePagesHarness.mjs";

// Assertions compare strings/booleans only: a failing assert on a jsdom node
// serializes the whole DOM graph and exhausts memory.

const hasText = (matcher) => queryByText(matcher) !== null;
const tableRows = () => all("table[aria-label='Newsletter Templates'] tbody tr[data-template-id]");

afterEach(async () => {
  await cleanup();
  delete globalThis.__testApiClient;
});

// ------------------------------------------------------------------ list --

test("the list is a table with one row per Template and the expected columns", async () => {
  installTemplatesApi({ templates: [makeTemplate(), makeTemplate({ id: "19", name: "Draft Template", isPublished: false, category: null, template: "", fromName: "" })] });
  await renderTemplatePages("/admin/newsletter/templates");
  await waitFor(() => assert.equal(tableRows().length, 2));

  const headers = all("table thead th").map((th) => th.textContent.trim());
  assert.deepEqual(headers, ["Template Name", "Subject", "Status", "Category", "Theme", "Sender", "Last Updated", "Actions"]);
  const [first, second] = tableRows().map((row) => row.textContent);
  assert.match(first, /Reusable Newsletter.*Monthly update.*Published.*Email Updates.*blank.*IMAA Connect/);
  assert.match(second, /Draft Template.*Draft.*Uncategorized.*Custom HTML/);
  assert.equal(hasText("Newsletter Templates"), true);
  assert.equal(hasText(/Mautic is the source of truth/), true);
});

test("clicking a row opens its Details page", async () => {
  installTemplatesApi();
  const view = await renderTemplatePages("/admin/newsletter/templates");
  await waitFor(() => assert.equal(tableRows().length, 1));
  await click(tableRows()[0].querySelectorAll("td")[1]);
  await waitFor(() => assert.equal(view.path(), "/admin/newsletter/templates/18"));
});

test("row actions never trigger row navigation, and each action goes where it should", async () => {
  installTemplatesApi();
  const view = await renderTemplatePages("/admin/newsletter/templates");
  await waitFor(() => assert.equal(tableRows().length, 1));

  await click(getByRole("button", "More actions for Reusable Newsletter"));
  await waitFor(() => getByRole("menuitem", "Test Send"));
  assert.equal(view.path(), "/admin/newsletter/templates");
  // Closing the menu (backdrop) must not open the row either.
  await act(async () => {
    document.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  });
  assert.equal(view.path(), "/admin/newsletter/templates");

  await click(getByRole("button", "More actions for Reusable Newsletter"));
  await click(await waitFor(() => getByRole("menuitem", "Test Send")));
  await waitFor(() => assert.equal(view.path(), "/admin/newsletter/templates/18?testSend=1"));
});

test("Edit in the row goes straight to the full-page editor", async () => {
  installTemplatesApi();
  const view = await renderTemplatePages("/admin/newsletter/templates");
  await waitFor(() => assert.equal(tableRows().length, 1));
  await click(getByRole("button", "Edit Reusable Newsletter"));
  await waitFor(() => assert.equal(view.path(), "/admin/newsletter/templates/18/edit"));
});

test("search and pagination use the backend's own parameters", async () => {
  const api = installTemplatesApi({ count: 60 });
  await renderTemplatePages("/admin/newsletter/templates");
  await waitFor(() => assert.equal(tableRows().length, 1));
  assert.equal(hasText(/1–25 of 60/), true);

  await click(getByRole("button", "Go to next page"));
  await waitFor(() => assert.equal(api.writes("get", "/newsletter/admin/templates/").at(-1).params.page, 2));

  await typeInto(getByRole("textbox", "Search Templates"), "Deals");
  await click(getByRole("button", "Search"));
  await waitFor(() => {
    const params = api.writes("get", "/newsletter/admin/templates/").at(-1).params;
    assert.deepEqual([params.page, params.search, params.page_size], [1, "Deals", 25]);
  });
});

test("empty and error states", async () => {
  installTemplatesApi({ templates: [] });
  await renderTemplatePages("/admin/newsletter/templates");
  await waitFor(() => assert.equal(hasText("No Newsletter Templates yet."), true));
  await cleanup();

  installTemplatesApi({
    handlers: {
      "get /newsletter/admin/templates/": async () => {
        throw Object.assign(new Error("bad gateway"), { response: { status: 502, data: { detail: "Mautic is unavailable." } } });
      },
    },
  });
  await renderTemplatePages("/admin/newsletter/templates");
  await waitFor(() => assert.equal(hasText("Mautic is unavailable."), true));
  assert.equal(queryByRole("button", "Retry") !== null, true);
});

test("Create Template opens the full-page editor, not a dialog", async () => {
  installTemplatesApi();
  const view = await renderTemplatePages("/admin/newsletter/templates");
  await waitFor(() => assert.equal(tableRows().length, 1));
  await click(getByRole("link", "Create Template"));
  await waitFor(() => assert.equal(view.path(), "/admin/newsletter/templates/new"));
  await waitFor(() => assert.equal(hasText("Design a reusable email. It is stored as a native Mautic Template."), true));
  assert.equal(queryByRole("dialog") === null, true);
});

// --------------------------------------------------------------- details --

test("Details loads from the URL alone and shows the Template's information", async () => {
  const api = installTemplatesApi({ templates: [makeTemplate({ visualDesign: designState("in_sync") })] });
  await renderTemplatePages("/admin/newsletter/templates/18");
  await waitFor(() => getByRole("heading", "Reusable Newsletter"));

  assert.equal(api.writes("get", "/newsletter/admin/templates/18/").length, 1);
  for (const text of ["Monthly update for {contactfield=firstname}", "Email Updates", "newsletter@example.test", "What changed this month", "Plain content", "#18 · template", "3 / 2"]) {
    assert.equal(hasText(new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))), true, text);
  }
  assert.equal(hasText(/matches its saved HTML/), true);
  // Tokens are listed; raw design JSON is never shown.
  assert.equal(hasText("{contactfield=firstname}"), true);
  assert.equal(hasText("{unsubscribe_url}"), true);
  assert.equal(document.body.textContent.includes('"editor"'), false);
  const frame = document.querySelector("iframe[title='Saved Newsletter Template preview']");
  assert.equal(frame.getAttribute("sandbox"), "");
  assert.match(frame.getAttribute("srcdoc"), /Legacy HTML/);
  assert.equal(getByRole("link", "Edit Template").getAttribute("href"), "/admin/newsletter/templates/18/edit");
  // Nothing is sent on page load.
  assert.equal(api.writes("post").length, 0);
});

test("Details explains HTML-only and out-of-date designs", async () => {
  installTemplatesApi();
  await renderTemplatePages("/admin/newsletter/templates/18");
  await waitFor(() => assert.equal(hasText(/HTML-only Template/), true));
  await cleanup();

  installTemplatesApi({ templates: [makeTemplate({ visualDesign: designState("stale") })] });
  await renderTemplatePages("/admin/newsletter/templates/18");
  await waitFor(() => assert.equal(hasText(/changed after the visual design was saved/), true));
});

test("Details handles an invalid id, a missing Template and no access", async () => {
  const api = installTemplatesApi();
  await renderTemplatePages("/admin/newsletter/templates/not-a-number");
  await waitFor(() => assert.equal(hasText("Invalid Template ID."), true));
  assert.equal(api.calls.some((c) => c.url.includes("not-a-number")), false);
  await cleanup();

  installTemplatesApi();
  await renderTemplatePages("/admin/newsletter/templates/999");
  await waitFor(() => assert.equal(hasText("Template not found."), true));
  await cleanup();

  installTemplatesApi({
    handlers: {
      "get /newsletter/admin/templates/18/": async () => {
        throw Object.assign(new Error("forbidden"), { response: { status: 403, data: { detail: "Permission denied." } } });
      },
    },
  });
  await renderTemplatePages("/admin/newsletter/templates/18");
  await waitFor(() => assert.equal(hasText("You do not have access to this Template."), true));
});

test("Duplicate from Details opens the new copy's Details page", async () => {
  const api = installTemplatesApi({ templates: [makeTemplate(), makeTemplate({ id: "44", name: "Reusable Newsletter Copy", isPublished: false })] });
  const view = await renderTemplatePages("/admin/newsletter/templates/18");
  await waitFor(() => getByRole("button", "Duplicate"));
  const button = getByRole("button", "Duplicate");
  await act(async () => {
    button.click();
    button.click();
  });
  await waitFor(() => assert.equal(view.path(), "/admin/newsletter/templates/44"));
  assert.equal(api.writes("post", "/newsletter/admin/templates/18/duplicate/").length, 1);
  await waitFor(() => assert.equal(hasText("Template duplicated as a draft."), true));
});

test("Delete from Details asks first and returns to the list only after success", async () => {
  const failing = installTemplatesApi({
    handlers: {
      "delete /newsletter/admin/templates/18/": async () => {
        throw Object.assign(new Error("in use"), { response: { status: 400, data: { detail: "Mautic refused: Template is in use." } } });
      },
    },
  });
  const view = await renderTemplatePages("/admin/newsletter/templates/18");
  await waitFor(() => getByRole("button", "Delete"));
  await click(getByRole("button", "Delete"));
  const dialog = await waitFor(() => getByRole("dialog"));
  await waitFor(() => assert.match(dialog.textContent, /provider validation remains the guard/));
  await click(getByRole("button", "Delete", { scope: dialog }));
  await waitFor(() => assert.equal(hasText("Mautic refused: Template is in use."), true));
  assert.equal(view.path(), "/admin/newsletter/templates/18");
  assert.equal(failing.writes("delete").length, 1);
  await cleanup();

  installTemplatesApi();
  const second = await renderTemplatePages("/admin/newsletter/templates/18");
  await waitFor(() => getByRole("button", "Delete"));
  await click(getByRole("button", "Delete"));
  const confirm = await waitFor(() => getByRole("dialog"));
  await waitFor(() => assert.equal(getByRole("button", "Delete", { scope: confirm }).disabled, false));
  await click(getByRole("button", "Delete", { scope: confirm }));
  await waitFor(() => assert.equal(second.path(), "/admin/newsletter/templates"));
  await waitFor(() => assert.equal(hasText("Template deleted from Mautic."), true));
});
