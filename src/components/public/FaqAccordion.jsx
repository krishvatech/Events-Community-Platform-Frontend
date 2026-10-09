"use client";

// src/components/public/FaqAccordion.jsx
// The FAQ page's question list (items from src/lib/faqSections.js, i.e. from the Wagtail body).
//
// Behaviour follows the WordPress page's Elementor toggle: every answer starts closed, any number
// can be open at once, and a plus/minus icon sits on the right. Markup is the WAI-ARIA accordion
// pattern: each question stays an <h2> (so heading navigation and the page outline keep working)
// containing a <button aria-expanded aria-controls>. Enter/Space come with the native button.
//
// All answers are in the server HTML. Closed answers use hidden="until-found" where the browser
// supports it, so find-in-page reveals them, and #faq-… links open (and scroll to) their question.
import { useCallback, useEffect, useRef, useState } from "react";

const FOCUS_RING = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-imaa-teal";

function ToggleIcon({ open }) {
  return (
    <span
      aria-hidden="true"
      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors ${
        open ? "border-imaa-teal bg-imaa-teal text-white" : "border-imaa-border text-imaa-teal group-hover:border-imaa-teal"
      }`}
    >
      <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M3 8h10" />
        <path d="M8 3v10" className={`origin-center transition-transform duration-200 motion-reduce:transition-none ${open ? "scale-y-0" : ""}`} />
      </svg>
    </span>
  );
}

export default function FaqAccordion({ items, answerClassName = "" }) {
  const [openIds, setOpenIds] = useState(() => new Set());
  const listRef = useRef(null);

  const setOpen = useCallback((id, open) => {
    setOpenIds((current) => {
      if (current.has(id) === open) return current;
      const next = new Set(current);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  // Deep links: /frequently-asked-questions#faq-what-is-imaa opens that answer.
  useEffect(() => {
    const openFromHash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!items.some((item) => item.id === id)) return;
      setOpen(id, true);
      document.getElementById(id)?.scrollIntoView({ block: "start" });
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, [items, setOpen]);

  // React only renders boolean `hidden`; upgrade closed panels to "until-found" after each
  // render and open a panel when find-in-page matches text inside it.
  useEffect(() => {
    const panels = listRef.current?.querySelectorAll("[data-faq-panel]") ?? [];
    const onBeforeMatch = (event) => setOpen(event.currentTarget.dataset.faqPanel, true);
    for (const panel of panels) {
      if (panel.hidden) panel.setAttribute("hidden", "until-found");
      panel.addEventListener("beforematch", onBeforeMatch);
    }
    return () => {
      for (const panel of panels) panel.removeEventListener("beforematch", onBeforeMatch);
    };
  });

  return (
    <div ref={listRef} className="space-y-3" data-faq-accordion="">
      {items.map(({ id, questionHtml, answerHtml }) => {
        const open = openIds.has(id);
        const buttonId = `${id}-button`;
        const panelId = `${id}-panel`;
        return (
          <div
            key={id}
            id={id}
            className={`scroll-mt-28 rounded-xl border bg-white transition-colors ${
              open ? "border-imaa-teal shadow-imaa-sm" : "border-imaa-border hover:border-imaa-border-hover"
            }`}
          >
            <h2 className="m-0">
              <button
                type="button"
                id={buttonId}
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpen(id, !open)}
                className={`group flex w-full items-start justify-between gap-4 rounded-xl px-5 py-4 text-left font-sans text-base font-semibold leading-snug text-imaa-ink hover:text-imaa-teal-dark md:px-6 md:py-5 md:text-lg ${FOCUS_RING}`}
              >
                <span dangerouslySetInnerHTML={{ __html: questionHtml }} />
                <ToggleIcon open={open} />
              </button>
            </h2>
            <div
              id={panelId}
              data-faq-panel={id}
              aria-labelledby={buttonId}
              hidden={!open}
            >
              {/* Padding lives inside: hidden="until-found" collapses only the content, not the box. */}
              <div className={`px-5 pb-5 md:px-6 md:pb-6 ${answerClassName}`} dangerouslySetInnerHTML={{ __html: answerHtml }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
