import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Alert, Box, CircularProgress } from "@mui/material";

import MauticTokenPicker from "./MauticTokenPicker";
import {
  createMarketingStarterDesign,
  isTemplateContent,
  renderDesignToMjml,
  wrapDesign,
} from "./marketingEmailDesign";
import { createMauticMergeTagSyntax, normalizeMauticTokens, toEditorMergeTags } from "./marketingEmailTokens";

/** Loads Templatical on demand so the editor stays out of the main bundle. */
export async function loadTemplaticalEditor() {
  const [editorModule] = await Promise.all([
    import("@templatical/editor"),
    import("@templatical/editor/style.css"),
  ]);
  return editorModule.init;
}

/**
 * Marketing Hub visual email editor (Templates and Broadcasts).
 *
 * `designKey` is the identity of the email being edited, e.g.
 * "template:42" or "broadcast:<uuid>". Changing it always remounts the editor
 * with that item's `initialContent`, so content never carries over from the
 * previously open email. `initialContent` of null/undefined starts from the
 * marketing starter layout; invalid content is refused instead of replaced.
 *
 * `loadEditor` exists for tests; it resolves to Templatical's `init`.
 */
const MarketingEmailVisualEditor = forwardRef(function MarketingEmailVisualEditor(
  { designKey, initialContent, tokens = [], onChange, onReady, onError, height = 720, loadEditor = loadTemplaticalEditor },
  ref
) {
  const containerRef = useRef(null);
  const editorRef = useRef(null);
  const readyRef = useRef(false);
  const contentRef = useRef(null);
  const keyRef = useRef(designKey);
  const pickerResolve = useRef(null);
  const callbacks = useRef({ onChange, onReady, onError });
  callbacks.current = { onChange, onReady, onError };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  const normalizedTokens = normalizeMauticTokens(tokens);
  const tokenSignature = normalizedTokens.map((item) => item.token).join("|");
  const invalidInitial = initialContent !== null && initialContent !== undefined && !isTemplateContent(initialContent);

  // A new identity starts from that item's own content; a token-list change for
  // the same item keeps the edits made so far.
  if (keyRef.current !== designKey) {
    keyRef.current = designKey;
    contentRef.current = null;
  }

  const resolvePicker = (value) => {
    const resolve = pickerResolve.current;
    pickerResolve.current = null;
    setPickerOpen(false);
    resolve?.(value);
  };

  useImperativeHandle(ref, () => ({
    isReady: () => Boolean(editorRef.current) && readyRef.current,
    getContent: () => editorRef.current?.getContent() || null,
    getDesign: () => {
      const content = editorRef.current?.getContent();
      if (!content) throw new Error("The visual editor is not ready.");
      return wrapDesign(content);
    },
    toMjml: async () => {
      const content = editorRef.current?.getContent();
      if (!content) throw new Error("The visual editor is not ready.");
      return renderDesignToMjml(content);
    },
  }));

  useEffect(() => {
    if (invalidInitial) {
      setLoading(false);
      setError("This saved visual design cannot be opened. It has not been changed.");
      return undefined;
    }

    let cancelled = false;
    let editor = null;
    const mountedKey = designKey;
    const isCurrentItem = () => keyRef.current === mountedKey;
    // A fresh host per mount: a discarded mount (StrictMode, fast item
    // switching) can never render into, or unmount, the current editor's DOM.
    const host = document.createElement("div");
    host.style.height = "100%";
    containerRef.current?.appendChild(host);

    readyRef.current = false;
    setLoading(true);
    setError("");

    const startContent = contentRef.current || initialContent || createMarketingStarterDesign(normalizedTokens);

    (async () => {
      try {
        const init = await loadEditor();
        if (cancelled) return;
        editor = await init({
          container: host,
          content: startContent,
          mergeTags: {
            syntax: createMauticMergeTagSyntax(normalizedTokens),
            tags: toEditorMergeTags(normalizedTokens),
            autocomplete: false,
            onRequest: () =>
              new Promise((resolve) => {
                pickerResolve.current?.(null);
                pickerResolve.current = resolve;
                setPickerOpen(true);
              }),
          },
          branding: false,
          uiTheme: "light",
          lint: { disabled: true },
          onChange(content) {
            // A late change from a replaced editor must not leak into the next item.
            if (cancelled || !isCurrentItem()) return;
            contentRef.current = content;
            callbacks.current.onChange?.(content, { initial: !readyRef.current });
          },
        });
        if (cancelled) {
          editor.unmount();
          editor = null;
          return;
        }
        editorRef.current = editor;
        contentRef.current = editor.getContent();
        readyRef.current = true;
        setLoading(false);
        callbacks.current.onReady?.(contentRef.current);
      } catch (err) {
        if (cancelled) return;
        setError(err?.message || "The visual editor could not be loaded.");
        setLoading(false);
        callbacks.current.onError?.(err);
      }
    })();

    return () => {
      cancelled = true;
      readyRef.current = false;
      if (editor) {
        // Keep this item's edits for a same-item remount (token list change).
        // On an identity change the render already cleared them; keep it so.
        if (isCurrentItem()) contentRef.current = editor.getContent();
        editor.unmount();
      }
      if (editorRef.current === editor) editorRef.current = null;
      host.remove();
      if (pickerResolve.current) {
        pickerResolve.current(null);
        pickerResolve.current = null;
      }
      setPickerOpen(false);
    };
    // initialContent is read only when the identity changes (designKey).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [designKey, tokenSignature, loadEditor, invalidInitial]);

  return (
    <Box sx={{ position: "relative" }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading && (
        <Box
          role="progressbar"
          aria-label="Loading visual editor"
          sx={{ minHeight: height, display: "grid", placeItems: "center", border: "1px solid", borderColor: "divider", borderRadius: 1 }}
        >
          <CircularProgress />
        </Box>
      )}
      <Box
        ref={containerRef}
        data-testid="marketing-visual-editor"
        sx={{
          height,
          display: loading || error ? "none" : "block",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 1,
          overflow: "hidden",
          bgcolor: "background.paper",
        }}
      />
      <MauticTokenPicker
        open={pickerOpen}
        tokens={normalizedTokens}
        onSelect={(item) => resolvePicker({ label: item.label, value: item.token })}
        onClose={() => resolvePicker(null)}
      />
    </Box>
  );
});

export default MarketingEmailVisualEditor;
