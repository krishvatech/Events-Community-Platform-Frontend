import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

import {
  React,
  cleanup,
  click,
  loadSource,
  queryByRole,
  queryByText,
  renderRoutes,
  router,
  signIn,
  waitFor,
} from "./helpers/blogDomHarness.mjs";

const { Route } = router;
const h = React.createElement;

// Assertions only ever compare strings/booleans: a failing assert on a live
// jsdom node makes Node pretty-print the whole DOM graph and exhaust memory.

// Mautic identity is an internal backend concern: this tab shows it read-only
// and never offers manual mapping controls.

const { MarketingAccessTab } = await loadSource("src/pages/AdminStaffPage.jsx");

const apiError = (status, data) => {
  const error = new Error(`HTTP ${status}`);
  error.response = { status, data };
  return error;
};

const CURRENT_ADMIN = 1;
const baseRow = {
  first_name: "",
  last_name: "",
  is_active: true,
  is_staff: true,
  is_superuser: true,
  eligible: true,
  connection_id: null,
  connection_status: null,
  connection_active: false,
  mautic_user_id: null,
  mautic_username: null,
  mautic_display_name: null,
  mautic_role_name: null,
  connected_at: null,
  disabled_at: null,
  last_verified_at: null,
  has_marketing_access: false,
  marketing_state: "eligible_not_added",
};
const ROWS = [
  {
    ...baseRow,
    ecp_user_id: 1,
    username: "me",
    email: "me@example.test",
    marketing_state: "active",
    has_marketing_access: true,
    connection_id: 10,
    connection_active: true,
    mautic_user_id: 6,
    mautic_username: "ecp-dev-proof",
    mautic_role_name: "Administrator",
  },
  {
    ...baseRow,
    ecp_user_id: 2,
    username: "jane",
    email: "jane@example.test",
    marketing_state: "active",
    has_marketing_access: true,
    connection_id: 11,
    connection_active: true,
    mautic_user_id: 27,
    mautic_username: "jsmith",
    mautic_role_name: "Marketing",
  },
  { ...baseRow, ecp_user_id: 3, username: "newbie", email: "new@example.test" },
  {
    ...baseRow,
    ecp_user_id: 4,
    username: "gone",
    email: "gone@example.test",
    marketing_state: "inactive",
    connection_id: 12,
    mautic_user_id: 8,
    mautic_username: "old-mautic",
  },
];

const MANUAL_IDENTITY_CONTROLS = /^(Mapping History|Change Mautic User|Link Existing Mautic User)$/;

let requests;
let postHandlers;

beforeEach(() => {
  signIn({ superuser: true });
  requests = [];
  postHandlers = {};
  globalThis.__testApiClient = {
    get: async (url, config) => {
      requests.push({ method: "get", url, params: config?.params });
      if (url === "/newsletter/admin/marketing-access/") return { data: { count: ROWS.length, results: ROWS } };
      throw new Error(`unexpected GET ${url}`);
    },
    post: async (url, body) => {
      requests.push({ method: "post", url, body });
      const handler = postHandlers[url];
      if (handler) return handler(body);
      throw new Error(`unexpected POST ${url}`);
    },
  };
});

afterEach(async () => {
  await cleanup();
  delete globalThis.__testApiClient;
});

async function renderTab() {
  await renderRoutes(
    [
      h(Route, {
        key: "tab",
        path: "/",
        element: h(MarketingAccessTab, { currentUserId: CURRENT_ADMIN, navigate: () => {} }),
      }),
    ],
    { url: "/" }
  );
  await waitFor(() => assert.ok(rowFor("jane@example.test")));
}

const rowFor = (email) => queryByText(email, { selector: "td" })?.closest("tr") || null;
const buttonIn = (email, name) => {
  const row = rowFor(email);
  return row ? queryByRole("button", name, { scope: row }) : null;
};
const has = (email, name) => Boolean(buttonIn(email, name));
const identityRequests = () => requests.filter((r) => r.url.includes("mautic-identity"));

test("rows keep the existing Marketing Access actions and read-only Mautic identity", async () => {
  await renderTab();

  assert.equal(has("jane@example.test", "Remove Marketing Access"), true);
  assert.equal(has("new@example.test", "+ Add to Marketing"), true);
  assert.equal(has("gone@example.test", "Re-enable Marketing"), true);
  for (const email of ["me@example.test", "jane@example.test", "new@example.test", "gone@example.test"]) {
    assert.equal(has(email, "View Activity"), true, email);
  }

  const jane = rowFor("jane@example.test")?.textContent || "";
  assert.match(jane, /jsmith/);
  assert.match(jane, /#27 · Marketing/);
  assert.match(rowFor("gone@example.test")?.textContent || "", /old-mautic#8/);
});

test("the admin's own row cannot be managed", async () => {
  await renderTab();
  const remove = buttonIn("me@example.test", "Remove Marketing Access");
  assert.equal(Boolean(remove), true);
  assert.equal(remove.disabled, true);
  assert.equal(has("me@example.test", "+ Add to Marketing"), false);
});

test("no manual Mautic identity controls are offered on any row", async () => {
  await renderTab();
  assert.equal(Boolean(queryByRole("button", MANUAL_IDENTITY_CONTROLS)), false);
  assert.equal(Boolean(queryByRole("textbox", /Mautic User ID/)), false);
  assert.equal(identityRequests().length, 0);
});

test("Add, Remove and Re-enable still use the Marketing Access endpoints", async () => {
  postHandlers["/newsletter/admin/marketing-access/3/add/"] = async () => ({
    data: { outcome: "provisioned", ecp_user_id: 3, mautic_user_id: 40 },
  });
  postHandlers["/newsletter/admin/marketing-access/2/remove/"] = async () => ({ data: { ecp_user_id: 2 } });
  postHandlers["/newsletter/admin/marketing-access/4/add/"] = async () => ({
    data: { outcome: "reactivated", ecp_user_id: 4, mautic_user_id: 8 },
  });
  await renderTab();

  await click(buttonIn("new@example.test", "+ Add to Marketing"));
  await waitFor(() => assert.ok(queryByRole("button", "Add to Marketing")));
  await click(queryByRole("button", "Add to Marketing"));
  await waitFor(() => assert.ok(queryByText(/new@example\.test now has Marketing access as Mautic user #40/)));

  await click(buttonIn("jane@example.test", "Remove Marketing Access"));
  await waitFor(() => assert.ok(queryByRole("button", "Remove")));
  await click(queryByRole("button", "Remove"));
  await waitFor(() => assert.ok(queryByText(/Marketing access removed for jane@example\.test/)));

  await click(buttonIn("gone@example.test", "Re-enable Marketing"));
  await waitFor(() => assert.ok(queryByRole("button", "Re-enable")));
  await click(queryByRole("button", "Re-enable"));
  await waitFor(() => assert.ok(queryByText(/re-enabled for gone@example\.test \(same Mautic user #8\)/)));

  assert.deepEqual(
    requests.filter((r) => r.method === "post").map((r) => r.url),
    [
      "/newsletter/admin/marketing-access/3/add/",
      "/newsletter/admin/marketing-access/2/remove/",
      "/newsletter/admin/marketing-access/4/add/",
    ]
  );
  assert.equal(identityRequests().length, 0);
});

test("a Mautic identity conflict on Add explains the problem without mapping controls", async () => {
  postHandlers["/newsletter/admin/marketing-access/3/add/"] = async () => {
    throw apiError(409, {
      code: "marketing_identity_conflict",
      detail: "A Mautic user already exists for this person. An administrator must link the correct Mautic user explicitly before Marketing access can be granted.",
    });
  };
  await renderTab();

  await click(buttonIn("new@example.test", "+ Add to Marketing"));
  await waitFor(() => assert.ok(queryByRole("button", "Add to Marketing")));
  await click(queryByRole("button", "Add to Marketing"));

  await waitFor(() =>
    assert.ok(queryByText(/Marketing Access could not be added because a Mautic account already exists for this email/))
  );
  const body = document.body.textContent || "";
  assert.match(body, /contact the system administrator to resolve the account mapping/);
  assert.equal(/link the correct Mautic user explicitly/.test(body), false);
  assert.equal(Boolean(queryByRole("button", MANUAL_IDENTITY_CONTROLS)), false);
  assert.equal(Boolean(queryByRole("textbox", /Mautic User ID/)), false);
  assert.equal(has("new@example.test", "+ Add to Marketing"), true);
  assert.deepEqual(
    requests.filter((r) => r.method === "post").map((r) => r.url),
    ["/newsletter/admin/marketing-access/3/add/"]
  );
});

test("other Add failures still show the backend's message", async () => {
  postHandlers["/newsletter/admin/marketing-access/3/add/"] = async () => {
    throw apiError(502, {
      code: "marketing_provisioning_failed",
      detail: "The Mautic user for this person could not be provisioned. No Marketing access was granted.",
    });
  };
  await renderTab();
  await click(buttonIn("new@example.test", "+ Add to Marketing"));
  await waitFor(() => assert.ok(queryByRole("button", "Add to Marketing")));
  await click(queryByRole("button", "Add to Marketing"));
  await waitFor(() => assert.ok(queryByText(/could not be provisioned\. No Marketing access was granted\./)));
});

// --------------------------------------------- Marketing Hub settings --

const { default: AdminNewsletterPage } = await loadSource("src/pages/AdminNewsletterPage.jsx");

test("Mautic Connection settings show diagnostics without a per-user identity card", async () => {
  globalThis.__testApiClient = {
    get: async (url) => {
      requests.push({ method: "get", url });
      if (url === "/newsletter/admin/settings/mautic-diagnostics/") {
        return {
          data: {
            connection: { status: "Healthy", configured: true, reachable: true, authenticated: true },
            diagnostics: { status: "Healthy", warnings: [] },
            identity: {
              per_user_execution_enabled: true,
              signing_configured: true,
              active_connections: 3,
              current_user_connected: true,
              status: "Healthy",
              warnings: [],
            },
          },
        };
      }
      return { data: { results: [] } };
    },
  };
  await renderRoutes(
    [h(Route, { key: "settings", path: "/admin/newsletter/settings", element: h(AdminNewsletterPage) })],
    { url: "/admin/newsletter/settings" }
  );
  await waitFor(() => assert.ok(queryByText("Mautic Instance")));
  assert.equal(Boolean(queryByText("Per-user Mautic Identity")), false);
  assert.equal(Boolean(queryByText("Your execution mode")), false);
  assert.equal(identityRequests().length, 0);
});
