import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Alert, Box, CircularProgress } from "@mui/material";

import {
  FORM_BLOCK_ATTR,
  builderBodyContent,
  composePageDocument,
  formBlockMarkup,
  headStyleMarkup,
  splitPageDocument,
} from "./landingPageDocument";

/** Loads GrapesJS on demand so the builder stays out of the main bundle. */
export async function loadGrapesBuilder() {
  const [core, blocks] = await Promise.all([
    import("grapesjs"),
    import("grapesjs-blocks-basic"),
    import("grapesjs/dist/css/grapes.min.css"),
  ]);
  return { grapesjs: core.default || core, blocksBasic: blocks.default || blocks };
}

// Canvas only (never exported): makes a Mautic Form token visible as a placeholder.
const FORM_PLACEHOLDER_STYLE = `<style>[${FORM_BLOCK_ATTR}]{border:1px dashed #1B2A4A;background:#F7F9FA;padding:16px;font-family:monospace;color:#1B2A4A}[${FORM_BLOCK_ATTR}]::before{content:attr(title) " — shown on the live page";display:block;font-family:Arial,sans-serif;font-weight:700;margin-bottom:4px}</style>`;

// Line icons in the style of the basic blocks' own.
const blockIcon = (paths) =>
  `<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">${paths}</svg>`;

const EXTRA_BLOCKS = [
  {
    id: "ecp-heading",
    label: "Heading",
    category: "Basic",
    media: blockIcon('<path d="M6 4v16M18 4v16M6 12h12"/>'),
    content: '<h2 style="font-family:Arial,sans-serif;color:#1B2A4A;margin:0 0 16px;">Section heading</h2>',
  },
  {
    id: "ecp-button",
    label: "Button",
    category: "Basic",
    media: blockIcon('<rect x="3" y="8" width="18" height="8" rx="3"/>'),
    content: {
      type: "link",
      content: "Register now",
      attributes: { href: "https://" },
      style: {
        display: "inline-block",
        padding: "12px 24px",
        "background-color": "#1B2A4A",
        color: "#ffffff",
        "border-radius": "6px",
        "text-decoration": "none",
        "font-family": "Arial,sans-serif",
        "font-weight": "700",
      },
    },
  },
  {
    id: "ecp-divider",
    label: "Divider",
    category: "Basic",
    media: blockIcon('<path d="M3 12h18"/>'),
    content: '<hr style="border:0;border-top:1px solid #E7ECEF;margin:24px 0;">',
  },
];

/**
 * Visual builder for one landing page's HTML (GrapesJS). `pageKey` is the
 * identity of what is being edited; changing it remounts with that `html`.
 * Scripts and unsafe attributes are never imported (GrapesJS parser
 * defaults), so callers must not open HTML that contains them.
 *
 * `loadBuilder` exists for tests; it resolves to { grapesjs, blocksBasic }.
 */
const LandingPageVisualBuilder = forwardRef(function LandingPageVisualBuilder(
  { pageKey, html, onDirtyChange, onReady, onError, height = 720, loadBuilder = loadGrapesBuilder },
  ref
) {
  const containerRef = useRef(null);
  const editorRef = useRef(null);
  const partsRef = useRef(null);
  const baselineRef = useRef("");
  const readyRef = useRef(false);

  const exportDocument = (editor) =>
    composePageDocument(partsRef.current, { bodyHtml: builderBodyContent(editor.getHtml()), css: editor.getCss() || "" });
  const callbacks = useRef({ onDirtyChange, onReady, onError });
  callbacks.current = { onDirtyChange, onReady, onError };
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useImperativeHandle(ref, () => ({
    isReady: () => Boolean(editorRef.current) && readyRef.current,
    // GrapesJS counts changes only with its storage manager on (ours is off),
    // so a change is what makes the export differ from the one it opened with.
    isDirty: () => Boolean(editorRef.current) && readyRef.current && exportDocument(editorRef.current) !== baselineRef.current,
    /** The full page document as the builder would save it. */
    getDocument: () => {
      const editor = editorRef.current;
      if (!editor || !readyRef.current) throw new Error("The visual builder is still loading. Try again in a moment.");
      return exportDocument(editor);
    },
    /** Adds a Mautic Form after the selected element, or at the end of the page. */
    insertForm: (formId, name) => {
      const editor = editorRef.current;
      if (!editor || !readyRef.current) return;
      const markup = formBlockMarkup(formId, name);
      const selected = editor.getSelected();
      const parent = selected?.parent?.();
      const [added] = parent
        ? parent.components().add(markup, { at: selected.index() + 1 })
        : editor.getWrapper().append(markup);
      if (added) editor.select(added);
    },
  }));

  useEffect(() => {
    let cancelled = false;
    let editor = null;
    let pending = 0;
    // A fresh host per mount: a discarded mount (StrictMode, fast switching)
    // never renders into, or destroys, the current builder's DOM.
    const host = document.createElement("div");
    host.style.height = "100%";
    containerRef.current?.appendChild(host);
    readyRef.current = false;
    setLoading(true);
    setError("");

    const parts = splitPageDocument(html);
    partsRef.current = parts;
    const canvasStyles = headStyleMarkup(parts.headHtml);

    (async () => {
      try {
        const { grapesjs, blocksBasic } = await loadBuilder();
        if (cancelled) return;
        editor = grapesjs.init({
          container: host,
          height: "100%",
          fromElement: false,
          components: parts.bodyHtml,
          style: parts.builderCss,
          // No styles of the builder's own leak into the saved page.
          protectedCss: "",
          storageManager: false,
          assetManager: { upload: false },
          parser: { optionsHtml: { allowScripts: false, allowUnsafeAttr: false, allowUnsafeAttrValue: false } },
          plugins: [(instance) => blocksBasic(instance, { flexGrid: true })],
          blockManager: { blocks: EXTRA_BLOCKS },
        });
        // The page's own head styles render in the canvas but are never edited
        // or exported: they stay in the saved <head> as they were.
        const injectHeadStyles = (frameDocument) => {
          const frameHead = frameDocument?.head;
          if (!frameHead || frameHead.hasAttribute("data-ecp-page-styles")) return;
          frameHead.setAttribute("data-ecp-page-styles", "");
          for (const markup of canvasStyles) frameHead.insertAdjacentHTML("beforeend", markup);
          frameHead.insertAdjacentHTML("beforeend", FORM_PLACEHOLDER_STYLE);
        };
        editor.on("canvas:frame:load", ({ window }) => injectHeadStyles(window?.document));
        // Runs at once when the editor already loaded during init.
        editor.onReady(() => {
          if (cancelled) return;
          injectHeadStyles(editor.Canvas?.getDocument?.());
          // Blocks are what a marketer reaches for first.
          editor.Panels?.getButton?.("views", "open-blocks")?.set("active", true);
          baselineRef.current = exportDocument(editor);
          editorRef.current = editor;
          readyRef.current = true;
          setLoading(false);
          callbacks.current.onReady?.();
        });
        const reportDirty = () => {
          if (cancelled || !readyRef.current) return;
          window.clearTimeout(pending);
          pending = window.setTimeout(() => {
            if (cancelled || !readyRef.current) return;
            callbacks.current.onDirtyChange?.(exportDocument(editor) !== baselineRef.current);
          }, 250);
        };
        editor.on("component:add component:remove component:update component:styleUpdate style:property:update undo redo", reportDirty);
      } catch (err) {
        if (cancelled) return;
        setError(err?.message || "The visual builder could not be loaded.");
        setLoading(false);
        callbacks.current.onError?.(err);
      }
    })();

    return () => {
      cancelled = true;
      readyRef.current = false;
      window.clearTimeout(pending);
      if (editor) editor.destroy();
      if (editorRef.current === editor) editorRef.current = null;
      host.remove();
    };
    // html is read only when the identity changes (pageKey).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey, loadBuilder]);

  return (
    <Box sx={{ position: "relative" }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading && (
        <Box
          role="progressbar"
          aria-label="Loading visual builder"
          sx={{ minHeight: height, display: "grid", placeItems: "center", border: "1px solid", borderColor: "divider", borderRadius: 1 }}
        >
          <CircularProgress />
        </Box>
      )}
      <Box
        ref={containerRef}
        data-testid="landing-page-visual-builder"
        sx={{
          height,
          display: loading || error ? "none" : "block",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 1,
          overflow: "hidden",
        }}
      />
    </Box>
  );
});

export default LandingPageVisualBuilder;
