// IPDT-773 — regression tests for TurnstileWidget: a parent re-render (typing,
// state changes, validation errors, a successful token setting parent state)
// must NOT tear down and re-create the Turnstile widget. Only an actual config
// change or an explicit remount (parent key bump) re-initialises it. Also covers
// callback freshness (refs), expiry/error recovery, Cloudflare error-code capture
// without leaking the token, and single-pass success.
//
// Runs on the project's node:test + jsdom + esbuild harness (no jest/RTL needed).
import assert from "node:assert/strict";
import { test, beforeEach, afterEach } from "node:test";

// turnstile.js reads VITE_TURNSTILE_SITE_KEY; the harness bundles with
// import.meta.env = {}, so our Node-safe fallback reads process.env here.
process.env.VITE_TURNSTILE_SITE_KEY = "1x00000000000000000000AA";

import { React, act, loadSource } from "../../pages/__tests__/helpers/blogDomHarness.mjs";

const { createRoot } = await import("react-dom/client");
const { default: TurnstileWidget } = await loadSource("src/components/TurnstileWidget.jsx");

let renders, removes, lastOpts, warned;

beforeEach(() => {
  renders = 0;
  removes = 0;
  lastOpts = null;
  warned = [];
  // Stub the injected Turnstile global so loadTurnstileScript() resolves without
  // any network and render/remove are observable.
  window.turnstile = {
    render: (_el, opts) => {
      renders += 1;
      lastOpts = opts;
      return `wid-${renders}`;
    },
    remove: () => {
      removes += 1;
    },
  };
  const origWarn = console.warn;
  console.warn.__orig = origWarn;
  console.warn = (...args) => {
    warned.push(args.map(String).join(" "));
  };
});

afterEach(() => {
  if (console.warn.__orig) console.warn = console.warn.__orig;
  delete window.turnstile;
});

async function mount(props) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const api = {
    container,
    root,
    async render(p) {
      await act(async () => {
        root.render(React.createElement(TurnstileWidget, p));
      });
    },
    async unmount() {
      await act(async () => root.unmount());
      container.remove();
    },
  };
  await api.render(props);
  return api;
}

test("mounts the widget exactly once", async () => {
  const w = await mount({ action: "signup", onVerify() {}, onExpire() {}, onError() {} });
  assert.equal(renders, 1);
  assert.equal(removes, 0);
  await w.unmount();
});

test("parent re-renders with NEW inline callbacks do NOT re-init or remove the widget", async () => {
  const w = await mount({ action: "signup", onVerify() {}, onExpire() {}, onError() {} });
  assert.equal(renders, 1);
  // Simulate typing / validation-error state changes: the parent re-renders and
  // passes brand-new inline callback identities each time.
  for (let i = 0; i < 6; i += 1) {
    await w.render({ action: "signup", onVerify: () => {}, onExpire: () => {}, onError: () => {} });
  }
  assert.equal(renders, 1, "widget must not be re-rendered on callback-identity change");
  assert.equal(removes, 0, "widget must not be removed on callback-identity change");
  await w.unmount();
});

test("success token is delivered once and to the LATEST onVerify (ref freshness)", async () => {
  const first = [];
  const latest = [];
  const w = await mount({ action: "signup", onVerify: (t) => first.push(t), onExpire() {}, onError() {} });
  // Parent re-renders with a new onVerify (as happens after any state change).
  await w.render({ action: "signup", onVerify: (t) => latest.push(t), onExpire() {}, onError() {} });
  assert.equal(renders, 1); // still the same widget
  // Turnstile fires its success callback once.
  await act(async () => lastOpts.callback("TOKEN_ABC"));
  assert.deepEqual(first, [], "stale onVerify must not be called");
  assert.deepEqual(latest, ["TOKEN_ABC"], "latest onVerify receives the token exactly once");
  await w.unmount();
});

test("expiry recovery calls the latest onExpire", async () => {
  const calls = [];
  const w = await mount({ action: "signup", onVerify() {}, onExpire: () => calls.push("stale"), onError() {} });
  await w.render({ action: "signup", onVerify() {}, onExpire: () => calls.push("fresh"), onError() {} });
  await act(async () => lastOpts["expired-callback"]());
  assert.deepEqual(calls, ["fresh"]);
  assert.equal(renders, 1);
  await w.unmount();
});

test("error recovery reports the Cloudflare error code without leaking the token", async () => {
  const errs = [];
  const w = await mount({ action: "signup", onVerify() {}, onExpire() {}, onError: (e) => errs.push(e) });
  await act(async () => lastOpts["error-callback"]("110200"));
  assert.equal(errs.length, 1);
  assert.match(errs[0].message, /turnstile_error:110200/);
  // The widget logs only the short error code — never a token/secret.
  assert.ok(warned.some((line) => line.includes("110200")), "error code should be reported");
  assert.ok(!warned.some((line) => /TOKEN|sitekey|secret/i.test(line)), "no token/secret in logs");
  await w.unmount();
});

test("an actual config change (action) DOES re-initialise the widget", async () => {
  const w = await mount({ action: "signup", onVerify() {}, onExpire() {}, onError() {} });
  assert.equal(renders, 1);
  await w.render({ action: "guest_signup", onVerify() {}, onExpire() {}, onError() {} });
  assert.equal(renders, 2, "config change should re-render");
  assert.equal(removes, 1, "old widget removed before re-render");
  await w.unmount();
});

test("unmount removes the widget exactly once (explicit reset / key bump path)", async () => {
  const w = await mount({ action: "signup", onVerify() {}, onExpire() {}, onError() {} });
  await w.unmount();
  assert.equal(removes, 1);
  // A parent key bump remounts: fresh mount renders a new widget.
  const w2 = await mount({ action: "signup", onVerify() {}, onExpire() {}, onError() {} });
  assert.equal(renders, 2);
  await w2.unmount();
});
