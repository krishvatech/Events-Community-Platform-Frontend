import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/" });
for (const key of ["window", "document", "navigator", "HTMLElement", "Element", "Node", "MutationObserver", "DOMParser", "getComputedStyle"]) {
  Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

test("event descriptions render rich content safely and preserve legacy text", async () => {
  const vite = await createServer({ configFile: false, plugins: [react()], server: { middlewareMode: true }, appType: "custom" });
  try {
    const React = await import("react");
    const { createRoot } = await import("react-dom/client");
    const { act } = await import("react");
    const { default: EventDescription, plainEventDescription } = await vite.ssrLoadModule("/src/components/EventDescription.jsx");
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    const rich = '<h2>Agenda</h2><h3>Session</h3><p><strong>Bold</strong> &amp; <em>italic</em></p><ol><li>First<ul><li>Nested</li></ul></li></ol><a href="https://example.com">Details</a><a class="event-cta" href="/register">Register</a><table><tbody><tr><td>Cell</td></tr></tbody></table><figure><img src="https://example.com/photo.png" alt="Photo"></figure><iframe src="https://www.youtube-nocookie.com/embed/abcdefghijk"></iframe><script>alert(1)</script>';
    await act(async () => root.render(React.createElement(EventDescription, { value: rich })));
    for (const selector of ["h2", "h3", "p", "strong", "em", "ol li", "ol ul li", "a.event-cta", "table td", "figure img", "iframe"]) assert.ok(host.querySelector(selector), `${selector} rendered`);
    assert.equal(host.querySelector("p").textContent, "Bold & italic");
    assert.equal(host.querySelector('a[href="https://example.com"]').textContent, "Details");
    assert.equal(host.querySelector("script"), null);
    assert.equal(plainEventDescription("<p>News &amp; updates</p>"), "News & updates");
    assert.equal(plainEventDescription("<h2>Agenda</h2><p>First <strong>item</strong></p><p>Second &amp; third</p>"), "Agenda First item Second & third");
    assert.equal(plainEventDescription("<p>One</p><p>Two</p>").slice(0, 7), "One Two");
    await act(async () => root.render(React.createElement(EventDescription, { value: '<a href="javascript:alert(1)">Bad link</a><iframe src="https://evil.example/embed/a"></iframe><img src="javascript:alert(1)">' })));
    assert.equal(host.querySelector("a").hasAttribute("href"), false);
    assert.equal(host.querySelector("iframe"), null);
    assert.equal(host.querySelector("img"), null);
    await act(async () => root.render(React.createElement(EventDescription, { value: "Old description\nSecond line" })));
    assert.equal(host.textContent, "Old description\nSecond line");
    await act(async () => root.render(React.createElement(EventDescription, { value: "No description provided." })));
    assert.equal(host.textContent, "No description provided.");
    await act(async () => root.unmount());
    host.remove();
  } finally {
    await vite.close();
  }
});

test("management uses rich display and dashboard uses a plain summary", async () => {
  const manage = await readFile(new URL("../../pages/EventManagePage.jsx", import.meta.url), "utf8");
  const dashboard = await readFile(new URL("../../pages/DashboardPage.jsx", import.meta.url), "utf8");
  assert.match(manage, /<EventDescription\s+value=\{event\.description \|\| "No description provided\."\}/);
  assert.match(dashboard, /plainEventDescription\(event\?\.description \|\| event\?\.desc \|\| event\?\.short_description\)/);
  const liveFeed = await readFile(new URL("../../pages/community/LiveFeedPage.jsx", import.meta.url), "utf8");
  assert.match(liveFeed, /EventBlock[\s\S]*?<EventFeedDescription value=\{post\.text\}/);
  assert.match(liveFeed, /<Grid size=\{12\} sx=\{\{ minWidth: 0 \}\}>/);
  assert.match(liveFeed, /document\.documentElement\.style\.scrollbarGutter = "stable"/);
  assert.match(liveFeed, /function EventBlock[\s\S]*?maxWidth: "100%", overflow: "hidden"/);
  const eventFeedDescription = await readFile(new URL("../EventFeedDescription.jsx", import.meta.url), "utf8");
  assert.match(eventFeedDescription, /width: "100%", minWidth: 0, maxWidth: "100%"/);
  assert.match(eventFeedDescription, /maxHeight: expanded \? "none" : PREVIEW_HEIGHT, overflow: "hidden"/);
  assert.match(eventFeedDescription, /content\.scrollHeight > PREVIEW_HEIGHT/);
  const groupFeed = await readFile(new URL("../../pages/community/GroupDetailsPage.jsx", import.meta.url), "utf8");
  assert.match(groupFeed, /EventBlock[\s\S]*?plainEventDescription\(post\.text\)/);
  const renderer = await readFile(new URL("../EventDescription.jsx", import.meta.url), "utf8");
  for (const rule of ["& h2", "& h3", "& ul", "& ol", "listStyleType", "& li", "& p", "& table", "& iframe"]) assert.ok(renderer.includes(rule), `${rule} has a scoped style`);
});

test("Live Feed event preview expands to sanitized rich HTML and collapses again", async () => {
  const originalScrollHeight = Object.getOwnPropertyDescriptor(dom.window.HTMLElement.prototype, "scrollHeight");
  Object.defineProperty(dom.window.HTMLElement.prototype, "scrollHeight", { configurable: true, get() { return this.querySelector("h2, figure, iframe") ? 400 : 20; } });
  const vite = await createServer({ configFile: false, plugins: [react()], server: { middlewareMode: true }, appType: "custom" });
  try {
    const React = await import("react");
    const { createRoot } = await import("react-dom/client");
    const { act } = await import("react");
    const { default: EventFeedDescription } = await vite.ssrLoadModule("/src/components/EventFeedDescription.jsx");
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    const rich = '<h2>Agenda</h2><p><strong>Bold</strong> &amp; <em>italic</em></p><ol><li>First</li></ol><ul><li>Second</li></ul><a href="https://example.com">Details</a><a class="event-cta" href="/register">Register</a><table><tr><td>Cell</td></tr></table><figure><img src="https://example.com/photo.png"></figure><iframe src="https://www.youtube-nocookie.com/embed/abcdefghijk"></iframe><script>alert(1)</script>';
    await act(async () => root.render(React.createElement(EventFeedDescription, { value: rich })));
    assert.ok(host.querySelector("h2"), "rich markup remains mounted in the clipped preview");
    assert.doesNotMatch(host.textContent, /<h2>|&amp;/);
    assert.match(host.textContent, /Agenda/);
    await act(async () => [...host.querySelectorAll("button")].find(button => button.textContent === "See more").click());
    for (const selector of ["h2", "strong", "em", "ol li", "ul li", "a[href='https://example.com']", "a.event-cta", "table td", "figure img", "iframe"]) assert.ok(host.querySelector(selector), `${selector} rendered after expansion`);
    assert.equal(host.querySelector("script"), null);
    assert.equal(host.querySelector("h2").textContent, "Agenda");
    await act(async () => [...host.querySelectorAll("button")].find(button => button.textContent === "See less").click());
    assert.ok(host.querySelector("h2"), "collapsing preserves the rich DOM");
    assert.match(host.textContent, /Agenda/);
    await act(async () => root.render(React.createElement(EventFeedDescription, { value: "Legacy text\nSecond line" })));
    assert.match(host.textContent, /Legacy text\nSecond line/);
    assert.equal(host.querySelector("button"), null, "short plain text has no See More control");
    await act(async () => root.render(React.createElement(EventFeedDescription, { value: '<figure><img src="https://example.com/photo.png" alt="Photo"></figure>' })));
    assert.equal(host.querySelector("button")?.textContent, "See more", "tall media triggers the measured overflow control");
    await act(async () => root.unmount());
    host.remove();
  } finally {
    await vite.close();
    if (originalScrollHeight) Object.defineProperty(dom.window.HTMLElement.prototype, "scrollHeight", originalScrollHeight);
    else delete dom.window.HTMLElement.prototype.scrollHeight;
  }
});
