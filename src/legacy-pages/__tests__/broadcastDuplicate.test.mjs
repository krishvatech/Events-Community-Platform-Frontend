import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

import {
  React,
  act,
  all,
  cleanup,
  click,
  getByRole,
  loadSource,
  queryByText,
  renderRoutes,
  router,
  waitFor,
} from "./helpers/blogDomHarness.mjs";

const { default: AdminNewsletterPage } = await loadSource("src/legacy-pages/AdminNewsletterPage.jsx");
const { Route } = router;
const h = React.createElement;

// Assertions only ever compare strings/booleans: a failing assert on a live
// jsdom node makes Node pretty-print the whole DOM graph and exhaust memory.

const SOURCE = {
  uuid: "11111111-1111-4111-8111-111111111111",
  name: "September Deal Newsletter",
  subject: "September deals",
  preview_text: "",
  from_name: "IMAA Connect",
  from_email: "newsletter@example.test",
  html_content: "<p>Hello</p>",
  plain_text: "Hello",
  status: "sent",
  audiences: [{ slug: "imaa-events", name: "IMAA Events" }],
  scheduled_at: null,
  schedule_owner: "",
  send_started_at: "2026-09-30T10:00:00Z",
  sent_at: "2026-09-30T10:01:00Z",
  mautic_email_id: "88",
  last_synced_to_mautic_at: null,
  last_error: "",
  created_at: "2026-09-29T10:00:00Z",
  updated_at: "2026-09-30T10:01:00Z",
};
const COPY = {
  ...SOURCE,
  uuid: "22222222-2222-4222-8222-222222222222",
  name: "September Deal Newsletter Copy",
  status: "draft",
  send_started_at: null,
  sent_at: null,
  mautic_email_id: null,
};

let posts;

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

function installApi({ onDuplicate = async () => ({ data: COPY }) } = {}) {
  posts = [];
  const byUuid = { [SOURCE.uuid]: SOURCE, [COPY.uuid]: COPY };
  globalThis.__testApiClient = {
    get: async (url) => {
      if (url === "/newsletter/admin/campaigns/") return { data: [SOURCE] };
      if (url === "/newsletter/admin/categories/") {
        return { data: [{ slug: "imaa-events", name: "IMAA Events", is_active: true }] };
      }
      const match = url.match(/^\/newsletter\/admin\/campaigns\/([^/]+)\/$/);
      if (match && byUuid[match[1]]) return { data: byUuid[match[1]] };
      return { data: {} };
    },
    post: async (url, payload) => {
      posts.push({ url, payload });
      if (url.endsWith("/duplicate/")) return onDuplicate(url);
      throw new Error(`unexpected POST ${url}`);
    },
  };
}

async function renderAt(url) {
  return renderRoutes(
    [
      h(Route, { key: "list", path: "/admin/newsletter/broadcasts", element: h(AdminNewsletterPage) }),
      h(Route, { key: "detail", path: "/admin/newsletter/:campaignId", element: h(AdminNewsletterPage) }),
    ],
    { url }
  );
}

const listDuplicateButton = () => all("button[aria-label='Duplicate broadcast']")[0];
const detailDuplicateButton = () =>
  all("button").find((button) => /^(Duplicate|Duplicating\.\.\.)$/.test(button.textContent.trim()));
const hasText = (matcher) => queryByText(matcher) !== null;
const duplicatePosts = () => posts.filter((entry) => entry.url.endsWith("/duplicate/"));

async function renderList() {
  const view = await renderAt("/admin/newsletter/broadcasts");
  await waitFor(() => assert.equal(Boolean(listDuplicateButton()), true));
  return view;
}

async function renderDetail() {
  const view = await renderAt(`/admin/newsletter/${SOURCE.uuid}`);
  await waitFor(() => assert.equal(Boolean(detailDuplicateButton()), true));
  return view;
}

beforeEach(() => installApi());
afterEach(async () => {
  await cleanup();
  delete globalThis.__testApiClient;
});

test("list Duplicate posts to the broadcast's duplicate endpoint once", async () => {
  await renderList();

  await click(listDuplicateButton());

  await waitFor(() => assert.equal(duplicatePosts().length, 1));
  assert.equal(duplicatePosts()[0].url, `/newsletter/admin/campaigns/${SOURCE.uuid}/duplicate/`);
});

test("list Duplicate opens the new draft and confirms it", async () => {
  const view = await renderList();

  await click(listDuplicateButton());

  await waitFor(() => assert.equal(view.path(), `/admin/newsletter/${COPY.uuid}`));
  await waitFor(() => assert.equal(hasText("Broadcast duplicated as a new draft."), true));
});

test("detail Duplicate posts the open broadcast and navigates to the copy", async () => {
  const view = await renderDetail();

  await click(detailDuplicateButton());

  await waitFor(() => assert.equal(view.path(), `/admin/newsletter/${COPY.uuid}`));
  assert.equal(duplicatePosts().length, 1);
  assert.equal(duplicatePosts()[0].url, `/newsletter/admin/campaigns/${SOURCE.uuid}/duplicate/`);
  await waitFor(() => assert.equal(hasText("Broadcast duplicated as a new draft."), true));
});

test("while duplicating, both entry points are disabled and a double click sends one request", async () => {
  const pending = deferred();
  installApi({ onDuplicate: () => pending.promise });
  await renderList();
  const button = listDuplicateButton();

  // Two clicks in the same tick, before React can re-render the disabled state.
  await act(async () => {
    button.click();
    button.click();
  });

  await waitFor(() => assert.equal(listDuplicateButton().disabled, true));
  assert.equal(listDuplicateButton().querySelector("[role='progressbar']") !== null, true);
  await click(listDuplicateButton());
  assert.equal(duplicatePosts().length, 1);

  await act(async () => {
    pending.resolve({ data: COPY });
  });
});

test("detail button shows progress and blocks a second request", async () => {
  const pending = deferred();
  installApi({ onDuplicate: () => pending.promise });
  await renderDetail();
  const button = detailDuplicateButton();

  await act(async () => {
    button.click();
    button.click();
  });

  await waitFor(() => assert.equal(detailDuplicateButton().textContent.trim(), "Duplicating..."));
  assert.equal(detailDuplicateButton().disabled, true);
  assert.equal(duplicatePosts().length, 1);

  await act(async () => {
    pending.resolve({ data: COPY });
  });
});

test("a backend error is reported, the list stays and nothing navigates", async () => {
  installApi({
    onDuplicate: async () => {
      const error = new Error("Request failed with status code 403");
      error.response = {
        status: 403,
        data: { detail: "Marketing Hub access requires an ECP superuser account." },
      };
      throw error;
    },
  });
  const view = await renderList();

  await click(listDuplicateButton());

  await waitFor(() =>
    assert.equal(hasText("Marketing Hub access requires an ECP superuser account."), true)
  );
  assert.equal(view.path(), "/admin/newsletter/broadcasts");
  // The source row and its actions are still there, and usable again.
  assert.equal(hasText("September Deal Newsletter"), true);
  assert.equal(listDuplicateButton().disabled, false);
});

test("a network error gets its own message and the editor stays on the source", async () => {
  installApi({
    onDuplicate: async () => {
      throw new Error("Network Error");
    },
  });
  const view = await renderDetail();

  await click(detailDuplicateButton());

  await waitFor(() => assert.equal(hasText(/could not reach the server/), true));
  assert.equal(view.path(), `/admin/newsletter/${SOURCE.uuid}`);
  assert.equal(detailDuplicateButton().disabled, false);
  assert.equal(detailDuplicateButton().textContent.trim(), "Duplicate");
});

test("the source row is rendered unchanged after a failed duplicate", async () => {
  installApi({
    onDuplicate: async () => {
      const error = new Error("Request failed with status code 404");
      error.response = { status: 404, data: { detail: "Not found." } };
      throw error;
    },
  });
  await renderList();
  const rowText = () => getByRole("button", "Duplicate broadcast").closest("tr").textContent;
  const before = rowText();

  await click(listDuplicateButton());

  await waitFor(() => assert.equal(hasText("Not found."), true));
  assert.equal(rowText(), before);
});
