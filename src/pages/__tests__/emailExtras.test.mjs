import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { React, cleanup, click, getByRole, loadSource, queryByText, renderRoutes, router, typeInto, waitFor } from "./helpers/blogDomHarness.mjs";

// Assertions compare strings/booleans only.
const { BroadcastDeliveryOptionsPanel, deliveryOptionsFrom, deliveryOptionsPayload, validateDeliveryOptions } =
  await loadSource("src/components/marketing/EmailDeliveryOptions.jsx");
const { Route } = router;
const h = React.createElement;
const hasText = (matcher) => queryByText(matcher) !== null;

afterEach(async () => {
  await cleanup();
  delete globalThis.__testApiClient;
});

test("templates never send exclusions; broadcasts do", () => {
  const value = deliveryOptionsFrom({ bccAddress: "a@imaa.test", excludedLists: [{ id: 5, name: "Staff" }] });
  assert.equal("excludedLists" in deliveryOptionsPayload(value), false);
  assert.equal(JSON.stringify(deliveryOptionsPayload(value, { exclusions: true }).excludedLists), JSON.stringify(["5"]));
  assert.equal(deliveryOptionsPayload(value).bccAddress, "a@imaa.test");
  assert.equal(Boolean(validateDeliveryOptions({ ...value, bccAddress: "a@x.test, b@x.test" }).bccAddress), true);
});

test("a broadcast saves its BCC and keeps its excluded segments", async () => {
  const patches = [];
  globalThis.__testApiClient = {
    get: async (url) => {
      if (url === "/newsletter/admin/mautic/segments/") return { data: [{ id: "5", name: "Staff", isPublished: true }, { id: "7", name: "Old", isPublished: false }] };
      if (url === "/newsletter/admin/assets/") return { data: { results: [] } };
      return { data: { available: true, editable: true, replyToAddress: "", bccAddress: "", utmTags: {}, assetAttachments: [],
        excludedLists: [{ id: "5", name: "Staff" }] } };
    },
    patch: async (url, payload) => {
      patches.push({ url, payload });
      return { data: { available: true, editable: true, ...payload, excludedLists: [{ id: "5", name: "Staff" }], assetAttachments: [] } };
    },
  };
  await renderRoutes([h(Route, { key: "x", path: "/x", element: h(BroadcastDeliveryOptionsPanel, { campaignUuid: "u1" }) })], { url: "/x" });
  await waitFor(() => assert.equal(hasText("Staff"), true));
  assert.equal(hasText(/never sent this broadcast/), true);
  await typeInto(getByRole("textbox", /BCC address/), "archive@imaa.test");
  await click(getByRole("button", "Save delivery options"));
  await waitFor(() => assert.equal(patches.length, 1));
  assert.equal(patches[0].payload.bccAddress, "archive@imaa.test");
  assert.equal(JSON.stringify(patches[0].payload.excludedLists), JSON.stringify(["5"]));
});
