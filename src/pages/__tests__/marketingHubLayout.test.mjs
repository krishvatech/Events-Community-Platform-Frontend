import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { React, act, cleanup, click, getByRole, loadSource, queryByRole, queryByText, renderRoutes, router, waitFor } from "./helpers/blogDomHarness.mjs";

const { default: MarketingHubLayout } = await loadSource("src/components/marketing/MarketingHubLayout.jsx");
const { useUnsavedChangesGuard, UnsavedChangesDialog } = await loadSource("src/components/marketing/UnsavedChangesGuard.jsx");
const { Route } = router;
const h = React.createElement;

// Assertions compare strings/booleans only (jsdom nodes in a failing assert
// exhaust memory).

const originalMatchMedia = window.matchMedia;
function setViewport({ mobile }) {
  // MUI's breakpoints.down("md") asks for a max-width query.
  window.matchMedia = (query) => ({
    matches: mobile && query.includes("max-width"),
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {
      return false;
    },
  });
}

function DirtyEditor() {
  const guard = useUnsavedChangesGuard(true);
  return h(React.Fragment, null, h("p", null, "Unsaved editor"), h(UnsavedChangesDialog, { guard }));
}

async function renderHub(url, { mobile }) {
  setViewport({ mobile });
  globalThis.__testApiClient = { get: async () => ({ data: { first_name: "Ada", is_superuser: true } }) };
  return renderRoutes(
    h(
      Route,
      { path: "/admin/newsletter", element: h(MarketingHubLayout) },
      h(Route, { index: true, element: h("p", null, "Dashboard page") }),
      h(Route, { path: "templates", element: h("p", null, "Templates page") }),
      h(Route, { path: "broadcasts", element: h("p", null, "Broadcasts page") }),
      h(Route, { path: "templates/:templateId/edit", element: h(DirtyEditor) })
    ),
    { url }
  );
}

const menuButton = () => queryByRole("button", "Open navigation menu");
const drawerOpen = () => menuButton()?.getAttribute("aria-expanded") === "true";

afterEach(async () => {
  await cleanup();
  window.matchMedia = originalMatchMedia;
  delete globalThis.__testApiClient;
});

test("desktop keeps the permanent sidebar and has no menu button", async () => {
  await renderHub("/admin/newsletter", { mobile: false });
  await waitFor(() => assert.equal(queryByText("Dashboard page") !== null, true));
  assert.equal(menuButton() === null, true);
  assert.equal(document.querySelector(".MuiDrawer-docked") !== null, true);
  assert.equal(queryByRole("button", "Templates") !== null, true);
});

test("mobile: the bar and the page share one column, so the page gets the full width", async () => {
  await renderHub("/admin/newsletter", { mobile: true });
  await waitFor(() => assert.equal(menuButton() !== null, true));
  const content = document.querySelector("[data-testid='marketing-hub-content']");
  // The root cause was the bar sitting beside <main> in the outer row.
  assert.equal(content.contains(menuButton()), true);
  assert.equal(content.contains(document.querySelector("main")), true);
  assert.equal(document.querySelector(".MuiDrawer-docked") === null, true, "no permanent sidebar on mobile");
});

test("mobile drawer opens from the menu button and closes after navigating", async () => {
  const view = await renderHub("/admin/newsletter", { mobile: true });
  await waitFor(() => assert.equal(menuButton() !== null, true));
  assert.equal(drawerOpen(), false);

  await click(menuButton());
  await waitFor(() => assert.equal(drawerOpen(), true));
  await click(getByRole("button", "Templates"));
  await waitFor(() => assert.equal(view.path(), "/admin/newsletter/templates"));
  await waitFor(() => assert.equal(drawerOpen(), false));
  assert.equal(queryByText("Templates page") !== null, true);
});

test("mobile drawer closes with Escape", async () => {
  await renderHub("/admin/newsletter", { mobile: true });
  await waitFor(() => assert.equal(menuButton() !== null, true));
  await click(menuButton());
  await waitFor(() => assert.equal(drawerOpen(), true));
  const paper = document.querySelector(".MuiDrawer-paper");
  await act(async () => {
    paper.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  });
  await waitFor(() => assert.equal(drawerOpen(), false));
});

test("drawer navigation away from unsaved edits asks first", async () => {
  const view = await renderHub("/admin/newsletter/templates/18/edit", { mobile: true });
  await waitFor(() => assert.equal(queryByText("Unsaved editor") !== null, true));
  await click(menuButton());
  await waitFor(() => assert.equal(drawerOpen(), true));
  await click(getByRole("button", "Email Broadcasts"));

  await waitFor(() => assert.equal(queryByText("Leave without saving?") !== null, true));
  assert.equal(view.path(), "/admin/newsletter/templates/18/edit");
  await click(getByRole("button", "Keep Editing"));
  await waitFor(() => assert.equal(queryByText("Leave without saving?") === null, true));
  assert.equal(queryByText("Unsaved editor") !== null, true);
  assert.equal(view.path(), "/admin/newsletter/templates/18/edit");
});
