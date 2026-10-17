// Test double for components/marketing/MarketingEmailVisualEditor.jsx: same
// ref API and callbacks, no Templatical. The live instance is reachable as
// globalThis.__fakeVisualEditor so tests can simulate design edits.
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

const STYLES = { padding: { top: 0, right: 0, bottom: 0, left: 0 }, margin: { top: 0, right: 0, bottom: 0, left: 0 } };

export const FAKE_STARTER = {
  blocks: [{ id: "starter", type: "paragraph", content: "<p>Starter layout</p>", styles: STYLES }],
  settings: { width: 600, backgroundColor: "#ffffff", fontFamily: "Arial", locale: "en" },
};

const FakeMarketingEmailVisualEditor = forwardRef(function FakeMarketingEmailVisualEditor(
  { designKey, initialContent, onChange, onReady },
  ref
) {
  const contentRef = useRef(null);
  const callbacks = useRef({ onChange, onReady });
  callbacks.current = { onChange, onReady };
  const [text, setText] = useState("");

  useEffect(() => {
    const start = initialContent || FAKE_STARTER;
    contentRef.current = start;
    setText(JSON.stringify(start));
    callbacks.current.onChange?.(start, { initial: true });
    callbacks.current.onReady?.(start);
    return () => {
      contentRef.current = null;
    };
    // Like the real editor, content is read only when the identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [designKey]);

  useImperativeHandle(ref, () => ({
    isReady: () => Boolean(contentRef.current),
    getContent: () => contentRef.current,
    getDesign: () => ({ editor: "templatical", version: 1, content: contentRef.current }),
    toMjml: async () => `<mjml><mj-body><mj-text>${JSON.stringify(contentRef.current)}</mj-text></mj-body></mjml>`,
  }));

  globalThis.__fakeVisualEditor = {
    designKey,
    content: () => contentRef.current,
    edit(content) {
      contentRef.current = content;
      setText(JSON.stringify(content));
      callbacks.current.onChange?.(content, { initial: false });
    },
    // Like the real editor right after typing: content changed, change event not yet fired.
    editSilently(content) {
      contentRef.current = content;
    },
  };

  return <textarea aria-label="Visual design (test double)" data-design-key={designKey} value={text} readOnly />;
});

export default FakeMarketingEmailVisualEditor;
