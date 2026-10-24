import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { readFile } from "node:fs/promises";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/" });
for (const key of ["window", "document", "navigator", "HTMLElement", "Element", "Node", "MutationObserver", "DOMParser", "getComputedStyle", "File", "FileList", "Blob", "FormData"]) {
  Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
}
globalThis.requestAnimationFrame = callback => setTimeout(callback, 0);
globalThis.cancelAnimationFrame = clearTimeout;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
dom.window.Range.prototype.getClientRects = () => ({ length: 1, item: () => ({ top: 0, left: 0, right: 0, bottom: 0 }), 0: { top: 0, left: 0, right: 0, bottom: 0 } });
dom.window.Range.prototype.getBoundingClientRect = () => ({ top: 0, left: 0, right: 0, bottom: 0 });

test("event editor preserves selection and round-trips bold and italic HTML", async () => {
  const vite = await createServer({ configFile: false, plugins: [react()], server: { middlewareMode: true }, appType: "custom" });
  try {
    const React = await import("react");
    const { createRoot } = await import("react-dom/client");
    const { act } = await import("react");
    const { default: EventRichTextEditor } = await vite.ssrLoadModule("/src/components/EventRichTextEditor.jsx");
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    let html = "<p>Hello world</p>";
    let editor;
    const onEditorReady = value => { editor = value; };
    await act(async () => { root.render(React.createElement(EventRichTextEditor, { value: html, onChange: value => { html = value; }, onEditorReady })); });
    const editable = host.querySelector(".ProseMirror");
    assert.ok(editable, "TipTap editable area rendered");
    const view = editor?.view;
    assert.ok(view, "TipTap editor is available");
    const { TextSelection } = await import("@tiptap/pm/state");
    await act(async () => { editable.focus(); view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 1, 6))); });
    assert.equal(editor.state.selection.from, 1);
    assert.equal(editor.state.selection.to, 6);
    const click = label => {
      const button = host.querySelector(`[aria-label="${label}"] button`);
      assert.ok(button, `${label} control rendered`);
      button.dispatchEvent(new dom.window.MouseEvent("mousedown", { bubbles: true, cancelable: true }));
      button.click();
    };
    await act(async () => click("Bold"));
    assert.match(html, /<strong>Hello<\/strong>/);
    await act(async () => click("Italic"));
    assert.match(html, /<strong><em>Hello<\/em><\/strong>|<em><strong>Hello<\/strong><\/em>/);
    await act(async () => click("Bold"));
    assert.doesNotMatch(html, /<strong>Hello<\/strong>/);
    assert.match(html, /<em>Hello<\/em>/);
    await act(async () => click("Italic"));
    assert.equal(html, "<p>Hello world</p>");
    await act(async () => { editor.commands.setTextSelection(6); click("Bold"); editor.commands.insertContent("!"); });
    assert.match(html, /Hello<strong>!<\/strong> world/);
    await act(async () => { editor.commands.setContent("<h2>Heading</h2><ul><li>List text</li></ul>"); });
    const positions = [];
    editor.state.doc.descendants((node, pos) => { if (node.isText) positions.push({ text: node.text, pos }); });
    const heading = positions.find(item => item.text === "Heading");
    const list = positions.find(item => item.text === "List text");
    await act(async () => { editor.commands.setTextSelection({ from: heading.pos, to: heading.pos + 7 }); click("Bold"); });
    await act(async () => { editor.commands.setTextSelection({ from: list.pos, to: list.pos + 4 }); click("Italic"); });
    assert.match(html, /<h2><strong>Heading<\/strong><\/h2>/);
    assert.match(html, /<li><p><em>List<\/em> text<\/p><\/li>/);
    const saved = html;
    await act(async () => { root.render(React.createElement(EventRichTextEditor, { key: "reopened", value: saved, onChange: value => { html = value; }, onEditorReady })); });
    assert.equal(editor.getHTML(), saved, "saved marks reopen in the shared editor");
    const setInput = (input, value) => {
      const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value").set;
      setter.call(input, value);
      input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    };
    await act(async () => { editor.commands.setTextSelection({ from: 1, to: 8 }); click("Link"); });
    let dialog = host.querySelector('[role="dialog"]');
    assert.equal(dialog?.getAttribute("aria-label"), "Add Link");
    await act(async () => { setInput(dialog.querySelector("input"), "https://example.com"); });
    await act(async () => { [...dialog.querySelectorAll("button")].find(button => button.textContent === "Insert").click(); });
    assert.match(html, /href="https:\/\/example.com"/);
    const linkedHtml = html;
    await act(async () => click("Undo"));
    assert.doesNotMatch(html, /href="https:\/\/example.com"/);
    await act(async () => click("Redo"));
    assert.equal(html, linkedHtml);
    await act(async () => { host.querySelector(".ProseMirror a").click(); });
    dialog = host.querySelector('[role="dialog"]');
    assert.equal(dialog?.getAttribute("aria-label"), "Edit Link");
    await act(async () => { setInput(dialog.querySelector("input"), "https://example.org"); });
    await act(async () => { [...dialog.querySelectorAll("button")].find(button => button.textContent === "Update").click(); });
    assert.match(html, /href="https:\/\/example.org"/);
    await act(async () => click("CTA Button"));
    dialog = host.querySelector('[role="dialog"]');
    await act(async () => { setInput(dialog.querySelectorAll("input")[0], "https://example.com/register"); setInput(dialog.querySelectorAll("input")[1], "Register now"); });
    await act(async () => { [...dialog.querySelectorAll("button")].find(button => button.textContent === "Insert").click(); });
    assert.match(html, /class="event-cta"/);
    assert.match(html, /Register now/);
    await act(async () => click("Undo"));
    assert.doesNotMatch(html, /Register now/);
    await act(async () => click("Redo"));
    assert.match(html, /Register now/);
    await act(async () => { editor.commands.setContent("<p>Before after</p>"); editor.commands.setTextSelection(8); host.querySelector(".event-rich-plus").click(); });
    assert.ok(host.querySelector(".event-rich-menu"), "block menu opens");
    await act(async () => { [...host.querySelectorAll(".event-rich-block-grid button")].find(button => button.textContent.includes("Table")).click(); });
    assert.match(html, /Before/);
    assert.match(html, /<table>/);
    assert.match(html, /after/);
    await act(async () => click("Undo"));
    assert.doesNotMatch(html, /<table>/);
    await act(async () => click("Redo"));
    assert.match(html, /<table>/);
    await act(async () => { editor.commands.setContent('<figure class="event-content-image event-content-image--center" data-width="75"><img src="https://example.com/photo.png" alt="Photo"><figcaption>Caption</figcaption></figure>'); });
    await act(async () => { host.querySelector(".ProseMirror img").click(); });
    assert.ok(host.querySelector(".event-rich-image-tools img"), "selected image has a preview");
    await act(async () => { [...host.querySelectorAll(".event-rich-image-row button")].find(button => button.textContent === "50%").click(); });
    assert.match(html, /data-width="50"/);
    await act(async () => { editor.commands.setContent("<p>Video</p>"); host.querySelector(".event-rich-plus").click(); });
    await act(async () => { [...host.querySelectorAll(".event-rich-block-grid button")].find(button => button.textContent.includes("Video / YouTube")).click(); });
    dialog = host.querySelector('[role="dialog"]');
    await act(async () => { setInput(dialog.querySelector("input"), "https://www.youtube.com/watch?v=abcdefghijk"); });
    await act(async () => { [...dialog.querySelectorAll("button")].find(button => button.textContent === "Insert").click(); });
    assert.match(html, /youtube-nocookie.com\/embed\/abcdefghijk/);
    await act(async () => click("Undo"));
    assert.doesNotMatch(html, /youtube-nocookie.com/);
    await act(async () => click("Redo"));
    assert.match(html, /youtube-nocookie.com/);
    await act(async () => {
      editor.commands.setContent("<p>Keys</p>");
      editor.commands.setTextSelection({ from: 1, to: 5 });
      host.querySelector(".ProseMirror").dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "b", ctrlKey: true, bubbles: true, cancelable: true }));
    });
    assert.match(html, /<strong>Keys<\/strong>/, "Ctrl+B applies bold through TipTap's keymap");
    await act(async () => { host.querySelector(".ProseMirror").dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "i", ctrlKey: true, bubbles: true, cancelable: true })); });
    assert.match(html, /<strong><em>Keys<\/em><\/strong>|<em><strong>Keys<\/strong><\/em>/, "Ctrl+I combines italic with bold");
    await act(async () => click("Undo"));
    assert.match(html, /<strong>Keys<\/strong>/);
    await act(async () => click("Redo"));
    assert.match(html, /<em>/);
    const { default: EventDescription } = await vite.ssrLoadModule("/src/components/EventDescription.jsx");
    await act(async () => { root.render(React.createElement(EventDescription, { value: '<p><strong>Bold</strong> and <em>italic</em></p><script>alert(1)</script>' })); });
    assert.ok(host.querySelector("strong"));
    assert.ok(host.querySelector("em"));
    assert.equal(host.querySelector("script"), null);
    const css = await readFile(new URL("../EventRichTextEditor.css", import.meta.url), "utf8");
    assert.match(css, /@media \(max-width: 600px\)/);
    assert.match(css, /--imaa-teal/);
    await act(async () => root.unmount());
    host.remove();
  } finally {
    await vite.close();
  }
});

test("undo to an empty description retains redo after parent state updates", async () => {
  const vite = await createServer({ configFile: false, plugins: [react()], server: { middlewareMode: true }, appType: "custom" });
  try {
    const React = await import("react");
    const { createRoot } = await import("react-dom/client");
    const { act } = await import("react");
    const { default: EventRichTextEditor } = await vite.ssrLoadModule("/src/components/EventRichTextEditor.jsx");
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    let editor;
    let rerenderParent;
    const onEditorReady = value => { editor = value; };
    function Form({ initial = "" }) {
      const [description, setDescription] = React.useState(initial);
      const [tick, setTick] = React.useState(0);
      rerenderParent = () => setTick(value => value + 1);
      return React.createElement(React.Fragment, null,
        React.createElement("input", { "aria-label": "Event title", defaultValue: "Title" }),
        React.createElement("span", { hidden: true }, tick),
        React.createElement(EventRichTextEditor, { value: description, onChange: setDescription, onEditorReady }));
    }
    const button = label => host.querySelector(`[aria-label="${label}"] button`);
    const mount = async (initial, key) => { await act(async () => root.render(React.createElement(Form, { initial, key }))); };
    await mount("", "create");
    await act(async () => editor.commands.insertContent("New event text"));
    assert.equal(editor.getHTML(), "<p>New event text</p>");
    assert.equal(button("Undo").disabled, false);
    await act(async () => button("Undo").click());
    assert.equal(editor.isEmpty, true);
    assert.equal(button("Redo").disabled, false, "redo must survive controlled empty value");
    await act(async () => button("Redo").click());
    assert.equal(editor.getHTML(), "<p>New event text</p>");
    await act(async () => rerenderParent());
    assert.equal(button("Undo").disabled, false, "ordinary parent render preserves history");
    await act(async () => button("Undo").click());
    await act(async () => editor.commands.insertContent("Different text"));
    assert.equal(button("Redo").disabled, true, "new edit clears the redo branch");
    await mount("<p>Existing text</p>", "edit");
    await act(async () => { editor.commands.setTextSelection({ from: 2, to: 5 }); editor.commands.deleteSelection(); });
    assert.equal(editor.getHTML(), "<p>Eting text</p>");
    await act(async () => button("Undo").click());
    assert.equal(editor.getHTML(), "<p>Existing text</p>");
    await act(async () => button("Redo").click());
    assert.equal(editor.getHTML(), "<p>Eting text</p>");
    await mount("<p>Image</p>", "image");
    await act(async () => editor.commands.insertContent({ type: "eventImage", attrs: { src: "https://example.com/image.png", alt: "Image" } }));
    assert.match(editor.getHTML(), /<figure/);
    await act(async () => button("Undo").click());
    assert.doesNotMatch(editor.getHTML(), /<figure/);
    await act(async () => button("Redo").click());
    assert.match(editor.getHTML(), /<figure/);
    await mount("<p>Keys</p>", "keys");
    await act(async () => { editor.commands.setTextSelection(5); editor.commands.insertContent("!"); });
    const editable = host.querySelector(".ProseMirror");
    await act(async () => { editable.focus(); editable.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "z", ctrlKey: true, bubbles: true, cancelable: true })); });
    assert.equal(editor.getHTML(), "<p>Keys</p>");
    await act(async () => editable.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "y", ctrlKey: true, bubbles: true, cancelable: true })));
    assert.equal(editor.getHTML(), "<p>Keys!</p>");
    await act(async () => editable.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "z", ctrlKey: true, bubbles: true, cancelable: true })));
    await act(async () => editable.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "z", ctrlKey: true, shiftKey: true, bubbles: true, cancelable: true })));
    assert.equal(editor.getHTML(), "<p>Keys!</p>");
    await act(async () => host.querySelector('[aria-label="Event title"]').dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "z", ctrlKey: true, bubbles: true, cancelable: true })));
    assert.equal(editor.getHTML(), "<p>Keys!</p>", "shortcuts in another form field leave editor history alone");
    const saved = editor.getHTML();
    await mount(saved, "reopened");
    assert.equal(editor.getHTML(), saved);
    assert.equal(button("Undo").disabled, true, "reopening restores content without old history");
    const formatCases = [
      ["Bold", "<p>Word</p>", /<strong>Word<\/strong>/],
      ["Italic", "<p>Word</p>", /<em>Word<\/em>/],
      ["Heading 2", "<p>Word</p>", /<h2>Word<\/h2>/],
      ["Bulleted list", "<p>Word</p>", /<ul>/],
    ];
    for (const [label, initial, formatted] of formatCases) {
      await mount(initial, `format-${label}`);
      await act(async () => { editor.commands.setTextSelection({ from: 1, to: 5 }); button(label).dispatchEvent(new dom.window.MouseEvent("mousedown", { bubbles: true, cancelable: true })); button(label).click(); });
      assert.match(editor.getHTML(), formatted, `${label} applies`);
      await act(async () => button("Undo").click());
      assert.equal(editor.getHTML(), initial, `${label} undoes`);
      await act(async () => button("Redo").click());
      assert.match(editor.getHTML(), formatted, `${label} redoes`);
    }
    await mount("", "multi");
    const { closeHistory } = await import("@tiptap/pm/history");
    await act(async () => editor.commands.insertContent("A"));
    await act(async () => editor.view.dispatch(closeHistory(editor.state.tr)));
    await act(async () => editor.commands.insertContent("B"));
    assert.equal(editor.getHTML(), "<p>AB</p>");
    await act(async () => button("Undo").click());
    assert.equal(editor.getHTML(), "<p>A</p>");
    await act(async () => button("Undo").click());
    assert.equal(editor.isEmpty, true);
    await act(async () => button("Redo").click());
    assert.equal(editor.getHTML(), "<p>A</p>");
    await act(async () => button("Redo").click());
    assert.equal(editor.getHTML(), "<p>AB</p>");
    await act(async () => root.unmount());
    host.remove();
  } finally {
    await vite.close();
  }
});
