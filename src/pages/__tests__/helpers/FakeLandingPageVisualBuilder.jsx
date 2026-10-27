// Test double for components/marketing/LandingPageVisualBuilder.jsx: same ref
// API and callbacks, no GrapesJS. It edits the body as plain text and exports
// through the real landingPageDocument helpers. The live instance is reachable
// as globalThis.__fakePageBuilder so tests can simulate builder edits.
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

import { composePageDocument, formBlockMarkup, splitPageDocument } from "../../../components/marketing/landingPageDocument";

const FakeLandingPageVisualBuilder = forwardRef(function FakeLandingPageVisualBuilder({ pageKey, html, onDirtyChange, onReady }, ref) {
  const partsRef = useRef(null);
  const bodyRef = useRef("");
  const dirtyRef = useRef(false);
  const callbacks = useRef({ onDirtyChange, onReady });
  callbacks.current = { onDirtyChange, onReady };
  const [body, setBody] = useState("");

  useEffect(() => {
    partsRef.current = splitPageDocument(html);
    bodyRef.current = partsRef.current.bodyHtml;
    dirtyRef.current = false;
    setBody(bodyRef.current);
    callbacks.current.onReady?.();
    return () => {
      partsRef.current = null;
    };
    // Like the real builder, html is read only when the identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey]);

  const change = (next) => {
    bodyRef.current = next;
    dirtyRef.current = true;
    setBody(next);
    callbacks.current.onDirtyChange?.(true);
  };

  useImperativeHandle(ref, () => ({
    isReady: () => Boolean(partsRef.current),
    isDirty: () => dirtyRef.current,
    getDocument: () => composePageDocument(partsRef.current, { bodyHtml: bodyRef.current, css: "#i1{color:red;}" }),
    insertForm: (formId, name) => change(`${bodyRef.current}${formBlockMarkup(formId, name)}`),
  }));

  globalThis.__fakePageBuilder = { pageKey, body: () => bodyRef.current, edit: change };

  return <textarea aria-label="Page builder (test double)" data-page-key={pageKey} value={body} readOnly />;
});

export default FakeLandingPageVisualBuilder;
