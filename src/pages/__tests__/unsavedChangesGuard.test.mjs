import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

import { React, act, cleanup, click, getByRole, loadSource, queryByText, renderRoutes, router, waitFor } from "./helpers/blogDomHarness.mjs";

const { useUnsavedChangesGuard, UnsavedChangesDialog } = await loadSource("src/components/marketing/UnsavedChangesGuard.jsx");
const { installHistoryGuard } = await loadSource("src/components/marketing/historyGuard.js");

// As in src/main.jsx: the dispatcher is installed before the router listens.
// Browsers run window popstate listeners in registration order, so this
// ordering (not capture-phase precedence) is what the guard relies on.
installHistoryGuard();
const { Route } = router;
const h = React.createElement;

// Browser Back/Forward handling of the unsaved-changes guard. React Router's
// own popstate listener is stood in by `routerSaw`, registered after the
// bootstrap dispatcher exactly like the real app.

const PAGE_IDX = 5;
let routerSaw;
let goCalls;
let originalGo;
let historyCalls;
let originalPushState;
let originalBack;
const routerListener = (event) => routerSaw.push(event.state?.idx);

function GuardedPage({ dirty = false, isDirtyNow }) {
  const guard = useUnsavedChangesGuard(dirty, { isDirtyNow });
  return h(React.Fragment, null, h("p", null, "Editor page"), h(UnsavedChangesDialog, { guard }));
}

async function renderGuarded(props) {
  return renderRoutes(h(Route, { path: "/", element: h(GuardedPage, props) }));
}

const popTo = (idx) =>
  act(async () => {
    window.dispatchEvent(new window.PopStateEvent("popstate", { state: { idx } }));
  });
const dialogShown = () => queryByText("Leave without saving?") !== null;

beforeEach(() => {
  routerSaw = [];
  goCalls = [];
  window.history.replaceState({ idx: PAGE_IDX, key: "page" }, "");
  originalGo = window.history.go;
  window.history.go = (delta) => goCalls.push(delta);
  historyCalls = [];
  originalPushState = window.history.pushState;
  originalBack = window.history.back;
  window.history.pushState = (state, title, url) => historyCalls.push(["pushState", state?.idx, String(url)]);
  window.history.back = () => historyCalls.push(["back"]);
  // Capture too, so only registration order decides who runs first — as on
  // window in Chromium, which runs window listeners in registration order.
  window.addEventListener("popstate", routerListener, true);
});

afterEach(async () => {
  await cleanup();
  window.removeEventListener("popstate", routerListener, true);
  window.history.go = originalGo;
  window.history.pushState = originalPushState;
  window.history.back = originalBack;
});

test("Forward with unsaved changes is held before the router, returned and confirmed", async () => {
  await renderGuarded({ dirty: true });
  await popTo(PAGE_IDX + 1);

  assert.deepEqual(routerSaw, [], "the router never saw the Forward navigation");
  assert.deepEqual(goCalls, [-1], "the browser is returned to the editor's entry");
  await waitFor(() => assert.equal(dialogShown(), true));

  // The return trip is swallowed too, and causes no second dialog or loop.
  await popTo(PAGE_IDX);
  assert.deepEqual(routerSaw, []);
  assert.deepEqual(goCalls, [-1]);

  await click(getByRole("button", "Keep Editing"));
  await waitFor(() => assert.equal(dialogShown(), false));
  assert.equal(queryByText("Editor page") !== null, true, "still on the editor");
  assert.deepEqual(goCalls, [-1], "Cancel navigates nowhere");
});

test("Leave replays the exact Forward navigation, and the router then handles it", async () => {
  await renderGuarded({ dirty: true });
  await popTo(PAGE_IDX + 1);
  await popTo(PAGE_IDX);
  await waitFor(() => assert.equal(dialogShown(), true));

  await click(getByRole("button", "Leave Without Saving"));
  assert.deepEqual(goCalls, [-1, 1]);
  await popTo(PAGE_IDX + 1);
  assert.deepEqual(routerSaw, [PAGE_IDX + 1], "the replayed Forward reaches the router");
});

test("Back, including multi-step jumps, keeps its direction and distance", async () => {
  await renderGuarded({ dirty: true });
  await popTo(PAGE_IDX - 3);
  assert.deepEqual(goCalls, [3]);
  await popTo(PAGE_IDX);
  await waitFor(() => assert.equal(dialogShown(), true));
  await click(getByRole("button", "Leave Without Saving"));
  assert.deepEqual(goCalls, [3, -3]);
  assert.deepEqual(routerSaw, []);
});

test("typing the editor has not reported yet is held too", async () => {
  await renderGuarded({ dirty: false, isDirtyNow: () => true });
  await popTo(PAGE_IDX + 1);
  assert.deepEqual(routerSaw, []);
  assert.deepEqual(goCalls, [-1]);
  await waitFor(() => assert.equal(dialogShown(), true));
});

test("a clean page lets Back and Forward through untouched", async () => {
  await renderGuarded({ dirty: false, isDirtyNow: () => false });
  await popTo(PAGE_IDX + 1);
  await popTo(PAGE_IDX - 1);
  assert.deepEqual(routerSaw, [PAGE_IDX + 1, PAGE_IDX - 1]);
  assert.deepEqual(goCalls, []);
  assert.equal(dialogShown(), false);
});

test("repeated Back presses while asking hold each one without looping", async () => {
  await renderGuarded({ dirty: true });
  for (let i = 0; i < 3; i += 1) {
    await popTo(PAGE_IDX - 1);
    await popTo(PAGE_IDX);
  }
  assert.deepEqual(goCalls, [1, 1, 1]);
  assert.deepEqual(routerSaw, []);
  await waitFor(() => assert.equal(dialogShown(), true));
});

test("unmounting removes the listeners", async () => {
  await renderGuarded({ dirty: true });
  await cleanup();
  await popTo(PAGE_IDX + 1);
  assert.deepEqual(routerSaw, [PAGE_IDX + 1]);
  assert.deepEqual(goCalls, []);
});

test("reload or close asks through beforeunload only while something is unsaved", async () => {
  await renderGuarded({ dirty: true });
  const dirtyEvent = new window.Event("beforeunload", { cancelable: true });
  window.dispatchEvent(dirtyEvent);
  assert.equal(dirtyEvent.defaultPrevented, true);
  await cleanup();

  await renderGuarded({ dirty: false, isDirtyNow: () => false });
  const cleanEvent = new window.Event("beforeunload", { cancelable: true });
  window.dispatchEvent(cleanEvent);
  assert.equal(cleanEvent.defaultPrevented, false);
});

test("only the bootstrap dispatcher can get ahead of the router; a page-level listener cannot", async () => {
  // What a page adding its own listener after the router would see: the
  // router (registered earlier) handles the navigation first.
  const lateSaw = [];
  const late = (event) => {
    lateSaw.push(routerSaw.length);
    event.stopImmediatePropagation();
  };
  window.addEventListener("popstate", late, true);
  await popTo(PAGE_IDX + 1);
  window.removeEventListener("popstate", late, true);
  assert.deepEqual(routerSaw, [PAGE_IDX + 1], "too late: the router already handled it");
  assert.deepEqual(lateSaw, [1]);
});

const popToState = (state) =>
  act(async () => {
    window.dispatchEvent(new window.PopStateEvent("popstate", { state }));
  });

test("a destination without a router index is held, never lost, and Leave still reaches it", async () => {
  // e.g. an entry another page rewrote with history.replaceState({ path }).
  await renderGuarded({ dirty: false, isDirtyNow: () => true });
  await popToState({ path: "/events/some-event" });

  assert.deepEqual(routerSaw, [], "the router never saw it");
  assert.deepEqual(goCalls, [], "no guessed return trip");
  assert.equal(historyCalls.length, 1);
  assert.deepEqual(historyCalls[0].slice(0, 2), ["pushState", PAGE_IDX], "this page's own entry is put back");
  await waitFor(() => assert.equal(dialogShown(), true));

  await click(getByRole("button", "Keep Editing"));
  await waitFor(() => assert.equal(dialogShown(), false));
  assert.equal(queryByText("Editor page") !== null, true);
  assert.equal(historyCalls.length, 1, "Cancel adds nothing more");

  await popToState({ path: "/events/some-event" });
  await waitFor(() => assert.equal(dialogShown(), true));
  await click(getByRole("button", "Leave Without Saving"));
  assert.deepEqual(historyCalls.at(-1), ["back"]);
  await popToState({ path: "/events/some-event" });
  assert.equal(routerSaw.length, 1, "the router then handles the user's destination");
});

test("invalid router indices are treated as unknown, not guessed", async () => {
  await renderGuarded({ dirty: true });
  for (const idx of ["6", 6.5, null]) {
    await popToState({ idx });
  }
  assert.deepEqual(routerSaw, []);
  assert.deepEqual(goCalls, []);
  assert.equal(historyCalls.filter((c) => c[0] === "pushState").length, 3);
});

test("with nothing unsaved, unknown destinations pass straight through", async () => {
  await renderGuarded({ dirty: false, isDirtyNow: () => false });
  await popToState({ path: "/events/some-event" });
  await popToState(null);
  assert.equal(routerSaw.length, 2);
  assert.deepEqual(historyCalls, []);
  assert.equal(dialogShown(), false);
});

test("installing the dispatcher again never adds a second listener", async () => {
  installHistoryGuard();
  installHistoryGuard();
  let checks = 0;
  await renderGuarded({ dirty: false, isDirtyNow: () => {
    checks += 1;
    return false;
  } });
  await popTo(PAGE_IDX + 1);
  assert.equal(checks, 1, "one dispatch per popstate");
  assert.deepEqual(routerSaw, [PAGE_IDX + 1]);
});

test("StrictMode's double mount leaves exactly one active guard, removed on unmount", async () => {
  await renderRoutes(
    h(Route, { path: "/", element: h(React.StrictMode, null, h(GuardedPage, { dirty: true })) })
  );
  await popTo(PAGE_IDX + 1);
  assert.deepEqual(goCalls, [-1], "held once, not twice");
  await popTo(PAGE_IDX);
  await cleanup();
  await popTo(PAGE_IDX + 1);
  assert.deepEqual(routerSaw, [PAGE_IDX + 1], "no guard left after unmount");
});
