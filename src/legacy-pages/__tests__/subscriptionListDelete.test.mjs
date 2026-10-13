import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

import {
  React,
  all,
  cleanup,
  click,
  loadSource,
  queryByRole,
  queryByText,
  renderRoutes,
  router,
  waitFor,
} from "./helpers/blogDomHarness.mjs";

const { default: AdminNewsletterCategoriesTab } = await loadSource("src/legacy-pages/AdminNewsletterCategoriesTab.jsx");
const { default: AdminNewsletterListManagePage } = await loadSource("src/legacy-pages/AdminNewsletterListManagePage.jsx");
const { default: NewsletterPage } = await loadSource("src/legacy-pages/NewsletterPage.jsx");
const { deleteListErrorMessage } = await loadSource("src/components/marketing/DeleteSubscriptionListDialog.jsx");
const { RequireMarketingAccess } = await loadSource("src/components/RoleBasedRoute.jsx");
const { Route } = router;
const h = React.createElement;

// Assertions only compare strings/booleans (a failing assert on a jsdom node
// pretty-prints the whole DOM).

const CATEGORIES = "/newsletter/admin/categories/";
const list = (slug, name, extra = {}) => ({
  slug,
  name,
  description: "",
  is_active: true,
  mautic_segment_id: "300",
  deletion_state: "",
  ...extra,
});
const preflightFor = (slug, extra = {}) => ({
  slug,
  name: slug === "deal-alerts" ? "Deal Alerts" : "Events",
  is_active: true,
  deletion_state: "",
  mautic_segment_id: "300",
  mautic_segment_missing: false,
  subscriber_count: 12,
  subscription_record_count: 14,
  sync_event_count: 3,
  can_delete: true,
  blockers: [],
  warnings: [],
  ...extra,
});

let requests;
let lists;
let preflight;
let deleteResponse;

function installApi() {
  requests = [];
  lists = [list("deal-alerts", "Deal Alerts"), list("events", "Events", { is_active: false })];
  preflight = async (slug) => ({ data: preflightFor(slug) });
  deleteResponse = async (slug) => {
    lists = lists.filter((row) => row.slug !== slug);
    return { data: { slug, name: "Deal Alerts", deletion_state: "deleted", warnings: [] } };
  };
  globalThis.__testApiClient = {
    get: async (url, config = {}) => {
      requests.push({ method: "get", url, params: config.params });
      if (url === CATEGORIES) return { data: lists };
      const delMatch = url.match(/^\/newsletter\/admin\/categories\/([^/]+)\/delete\/$/);
      if (delMatch) return preflight(delMatch[1]);
      if (url.endsWith("/contacts/")) return { data: { count: 0, page: 1, num_pages: 1, results: [] } };
      if (url.endsWith("/contact-analytics/")) return { data: { series: [], totals: {} } };
      if (url === "/newsletter/preferences/") {
        return {
          data: {
            preferences: [{ slug: "events", name: "Events", description: "", subscribed: true, locally_subscribed: true, suppressed: false }],
            email_suppression: null,
          },
        };
      }
      return { data: {} };
    },
    post: async (url, body) => {
      requests.push({ method: "post", url, body });
      const delMatch = url.match(/^\/newsletter\/admin\/categories\/([^/]+)\/delete\/$/);
      if (delMatch) return deleteResponse(delMatch[1]);
      throw new Error(`unexpected POST ${url}`);
    },
    patch: async (url, body) => {
      requests.push({ method: "patch", url, body });
      const slug = url.split("/").at(-2);
      lists = lists.map((row) => (row.slug === slug ? { ...row, ...body } : row));
      return { data: lists.find((row) => row.slug === slug) };
    },
    delete: async (url) => {
      requests.push({ method: "delete", url });
      const slug = url.split("/").at(-2);
      lists = lists.map((row) => (row.slug === slug ? { ...row, is_active: false } : row));
      return { data: null };
    },
  };
}

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};
const httpError = (status, data = {}) => Object.assign(new Error(`HTTP ${status}`), { response: { status, data } });

const sent = (method, suffix) => requests.filter((r) => r.method === method && r.url.endsWith(suffix));
const hasText = (matcher) => queryByText(matcher) !== null;
const dialog = () => document.querySelector("[role='dialog']");
const dialogButton = (label) => all("[role='dialog'] button").find((b) => b.textContent.trim() === label) || null;
const rowDeleteButton = (name) => document.querySelector(`button[aria-label='Delete list ${name}']`);

async function renderTab() {
  const view = await renderRoutes(
    [h(Route, { key: "lists", path: "/admin/newsletter/lists", element: h(AdminNewsletterCategoriesTab) }),
     h(Route, { key: "detail", path: "/admin/newsletter/lists/:slug", element: h(AdminNewsletterListManagePage) })],
    { url: "/admin/newsletter/lists" }
  );
  await waitFor(() => assert.equal(Boolean(rowDeleteButton("Deal Alerts")), true));
  return view;
}

async function openDeleteFor(name) {
  await click(rowDeleteButton(name));
  await waitFor(() => assert.equal(hasText("Delete Subscription List?"), true));
  await waitFor(() => assert.equal(dialogButton("Delete List")?.disabled, false));
}

beforeEach(() => installApi());
afterEach(async () => {
  await cleanup();
  delete globalThis.__testApiClient;
  window.localStorage.clear();
});

test("every list row offers Delete next to the existing Edit, Sync and Deactivate/Reactivate actions", async () => {
  await renderTab();
  assert.equal(Boolean(rowDeleteButton("Events")), true);
  assert.equal(document.querySelectorAll("tbody tr").length, 2);
  // Existing controls are untouched: an active row deactivates, an inactive one reactivates.
  const [active, inactive] = all("tbody tr");
  for (const icon of ["EditRoundedIcon", "SyncRoundedIcon", "PowerSettingsNewRoundedIcon"]) {
    assert.equal(Boolean(active.querySelector(`[data-testid='${icon}']`)), true, icon);
  }
  assert.equal(Boolean(inactive.querySelector("[data-testid='RestoreRoundedIcon']")), true);
});

test("Delete opens the confirmation with real list details; Cancel never calls the backend", async () => {
  await renderTab();
  await openDeleteFor("Deal Alerts");
  assert.equal(hasText(/permanently remove this Subscription List/), true);
  assert.equal(hasText("Deal Alerts"), true);
  assert.equal(hasText("12"), true);
  assert.equal(hasText("#300"), true);
  assert.equal(sent("get", "/deal-alerts/delete/").length, 1);

  await click(dialogButton("Cancel"));
  await waitFor(() => assert.equal(Boolean(dialog()), false));
  assert.equal(sent("post", "/delete/").length, 0);
  assert.equal(Boolean(rowDeleteButton("Deal Alerts")), true);
});

test("confirming posts to the delete endpoint once, shows loading, then refreshes and notifies", async () => {
  const pending = deferred();
  deleteResponse = async (slug) => {
    await pending.promise;
    lists = lists.filter((row) => row.slug !== slug);
    return { data: { slug, name: "Deal Alerts", deletion_state: "deleted", warnings: [] } };
  };
  await renderTab();
  await openDeleteFor("Deal Alerts");
  const listLoadsBefore = sent("get", CATEGORIES).length;

  await click(dialogButton("Delete List"));
  await waitFor(() => assert.equal(dialogButton("Delete List").disabled, true));
  assert.equal(Boolean(dialog().querySelector("[role='progressbar']")), true);
  assert.equal(dialogButton("Cancel").disabled, true);
  // A second click while in flight is ignored.
  await click(dialogButton("Delete List"));
  assert.equal(sent("post", "/deal-alerts/delete/").length, 1);

  pending.resolve();
  await waitFor(() => assert.equal(Boolean(rowDeleteButton("Deal Alerts")), false));
  assert.equal(sent("post", "/newsletter/admin/categories/deal-alerts/delete/").length, 1);
  assert.equal(sent("get", CATEGORIES).length > listLoadsBefore, true);
  assert.equal(hasText(/Subscription list “Deal Alerts” deleted/), true);
  assert.equal(Boolean(rowDeleteButton("Events")), true);
});

test("a dependency conflict is shown and the list is not removed", async () => {
  deleteResponse = async () => {
    throw httpError(409, {
      code: "dependency_conflict",
      detail: "This Subscription List cannot be deleted until its dependencies are removed.",
      dependencies: [{ type: "mautic_campaign", id: "9", name: "Nurture", detail: "Mautic campaign uses this segment." }],
    });
  };
  await renderTab();
  await openDeleteFor("Deal Alerts");
  await click(dialogButton("Delete List"));

  await waitFor(() => assert.equal(hasText(/cannot be deleted until its dependencies are removed/), true));
  assert.equal(hasText(/Nurture/), true);
  assert.equal(dialogButton("Delete List").disabled, true);
  assert.equal(dialogButton("Cancel").disabled, false);
  assert.equal(Boolean(rowDeleteButton("Deal Alerts")), true);
});

test("preflight blockers disable Delete before anything is sent", async () => {
  preflight = async (slug) => ({
    data: preflightFor(slug, {
      can_delete: false,
      blockers: [{ type: "broadcast", id: "u1", name: "October Digest", detail: "Broadcast is scheduled." }],
    }),
  });
  await renderTab();
  await click(rowDeleteButton("Deal Alerts"));
  await waitFor(() => assert.equal(hasText(/October Digest/), true));
  assert.equal(dialogButton("Delete List").disabled, true);
  assert.equal(sent("post", "/delete/").length, 0);
});

test("a provider failure keeps the dialog open with a retry hint and restores the button", async () => {
  deleteResponse = async () => {
    throw httpError(503, { code: "mautic_unavailable", detail: "Mautic API request failed", deletion_state: "deleting" });
  };
  await renderTab();
  await openDeleteFor("Deal Alerts");
  await click(dialogButton("Delete List"));

  await waitFor(() => assert.equal(hasText(/pending deletion; select Delete List again to finish/), true));
  assert.equal(dialogButton("Delete List").disabled, false);
  assert.equal(hasText(/Subscription list “Deal Alerts” deleted/), false);
});

test("error messages cover auth, missing, conflict, provider and network failures", () => {
  assert.equal(deleteListErrorMessage(httpError(401)), "Your session has expired. Sign in again and retry.");
  assert.equal(deleteListErrorMessage(httpError(403)), "You do not have permission to delete subscription lists.");
  assert.equal(deleteListErrorMessage(httpError(404)), "This subscription list no longer exists.");
  assert.equal(deleteListErrorMessage(httpError(409, { detail: "Already being deleted." })), "Already being deleted.");
  assert.equal(deleteListErrorMessage(httpError(502, { detail: "refused" })), "refused Nothing was deleted.");
  assert.equal(deleteListErrorMessage(new Error("offline")), "Network error. Check your connection and try again.");
});

test("Deactivate and Reactivate keep using their existing endpoints", async () => {
  await renderTab();
  const deactivate = all("button").find((b) => b.closest("tr")?.textContent.includes("Deal Alerts") && b.querySelector("[data-testid='PowerSettingsNewRoundedIcon']"));
  await click(deactivate);
  await waitFor(() => assert.equal(hasText("Deactivate List?"), true));
  await click(dialogButton("Deactivate"));
  await waitFor(() => assert.equal(sent("delete", "/newsletter/admin/categories/deal-alerts/").length, 1));

  const reactivate = all("button").find((b) => b.closest("tr")?.textContent.includes("Events") && b.querySelector("[data-testid='RestoreRoundedIcon']"));
  await click(reactivate);
  await waitFor(() => assert.equal(sent("patch", "/newsletter/admin/categories/events/").length, 1));
  assert.deepEqual(sent("patch", "/events/")[0].body, { is_active: true });
  assert.equal(sent("post", "/delete/").length, 0);
});

test("Edit still opens the existing edit form", async () => {
  await renderTab();
  const edit = all("button").find((b) => b.closest("tr")?.textContent.includes("Deal Alerts") && b.querySelector("[data-testid='EditRoundedIcon']"));
  await click(edit);
  await waitFor(() => assert.equal(hasText("Edit List"), true));
  assert.equal(sent("post", "/delete/").length, 0);
});

test("a list pending deletion only offers Retry delete", async () => {
  lists = [list("deal-alerts", "Deal Alerts", { is_active: false, deletion_state: "deleting" })];
  await renderTab();
  assert.equal(hasText("Deletion pending"), true);
  const row = document.querySelector("tbody tr");
  assert.equal(Boolean(row.querySelector("[data-testid='EditRoundedIcon']")), false);
  assert.equal(Boolean(row.querySelector("[data-testid='RestoreRoundedIcon']")), false);
  assert.equal(Boolean(row.querySelector("[data-testid='SyncRoundedIcon']")), false);
  await openDeleteFor("Deal Alerts");
  assert.equal(hasText(/previous deletion of this list did not finish/), true);
});

test("deleting from the list detail page returns to Lists with a confirmation", async () => {
  const view = await renderRoutes(
    [h(Route, { key: "lists", path: "/admin/newsletter/lists", element: h(AdminNewsletterCategoriesTab) }),
     h(Route, { key: "detail", path: "/admin/newsletter/lists/:slug", element: h(AdminNewsletterListManagePage) })],
    { url: "/admin/newsletter/lists/deal-alerts" }
  );
  await waitFor(() => assert.equal(Boolean(queryByRole("button", "Delete List")), true));
  await click(queryByRole("button", "Delete List"));
  await waitFor(() => assert.equal(dialogButton("Delete List")?.disabled, false));
  await click(dialogButton("Delete List"));

  await waitFor(() => assert.equal(view.path(), "/admin/newsletter/lists"));
  await waitFor(() => assert.equal(hasText(/Subscription list “Deal Alerts” deleted/), true));
  assert.equal(Boolean(rowDeleteButton("Deal Alerts")), false);
});

test("users without Marketing access never see the Lists actions", async () => {
  window.localStorage.setItem("user", JSON.stringify({ id: 2 }));
  const view = await renderRoutes(
    [h(Route, { key: "home", path: "/", element: h("p", null, "home") }),
     h(Route, { key: "lists", path: "/admin/newsletter/lists", element: h(RequireMarketingAccess, null, h(AdminNewsletterCategoriesTab)) })],
    { url: "/admin/newsletter/lists" }
  );
  await waitFor(() => assert.equal(view.path(), "/"));
  assert.equal(Boolean(rowDeleteButton("Deal Alerts")), false);
  assert.equal(sent("get", CATEGORIES).length, 0);
});

test("the member Newsletter tab lists only what the backend returns", async () => {
  await renderRoutes([h(Route, { key: "n", path: "/newsletter", element: h(NewsletterPage) })], { url: "/newsletter" });
  await waitFor(() => assert.equal(hasText("Events"), true));
  assert.equal(hasText("Deal Alerts"), false);
});
