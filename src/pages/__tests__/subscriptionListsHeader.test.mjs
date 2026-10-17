import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { React, cleanup, getByRole, loadSource, queryByText, renderRoutes, router, waitFor } from "./helpers/blogDomHarness.mjs";

const { default: AdminNewsletterCategoriesTab } = await loadSource("src/pages/AdminNewsletterCategoriesTab.jsx");
const { Route } = router;
const h = React.createElement;

// Layout geometry (320px vs desktop) is measured in the real browser; jsdom
// has no layout, so this checks what the header is allowed to do.

afterEach(async () => {
  await cleanup();
  delete globalThis.__testApiClient;
});

test("the Subscription Lists header can wrap its actions instead of overflowing", async () => {
  globalThis.__testApiClient = { get: async () => ({ data: [] }) };
  await renderRoutes(h(Route, { path: "/", element: h(AdminNewsletterCategoriesTab) }));
  await waitFor(() => assert.equal(queryByText("Subscription Lists") !== null, true));

  const create = getByRole("button", "Create List");
  const actions = create.parentElement;
  const header = actions.parentElement;
  assert.equal(getComputedStyle(header).flexWrap, "wrap", "the title and actions may wrap");
  assert.equal(getComputedStyle(actions).flexWrap, "wrap", "the action buttons may wrap");
  assert.equal(getComputedStyle(header).justifyContent, "space-between", "desktop placement is unchanged");
  assert.equal(header.contains(queryByText("Subscription Lists")), true);
  assert.equal(getByRole("button", "Refresh").parentElement === actions || actions.contains(getByRole("button", "Refresh")), true);
});
