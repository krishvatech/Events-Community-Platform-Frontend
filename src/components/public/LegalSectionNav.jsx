// src/components/public/LegalSectionNav.jsx
// "On this page" contents for long legal pages (sections from src/lib/legalSections.js).
// Server Component, no client JavaScript: plain in-page links, a sticky sidebar from lg up and
// a native <details> disclosure above the text on smaller screens.

const FOCUS_RING =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-imaa-teal";

function SectionLinks({ sections }) {
  return (
    <ol className="m-0 list-none space-y-0.5 p-0">
      {sections.map(({ id, labelHtml }) => (
        <li key={id}>
          <a
            href={`#${id}`}
            className={`block rounded-md px-3 py-1.5 text-[13px] font-medium leading-snug text-imaa-body no-underline transition-colors hover:bg-imaa-cool hover:text-imaa-teal-dark ${FOCUS_RING}`}
            dangerouslySetInnerHTML={{ __html: labelHtml }}
          />
        </li>
      ))}
    </ol>
  );
}

export function LegalSectionNavMobile({ sections }) {
  return (
    <details className="group mb-8 rounded-xl border border-imaa-border bg-white lg:hidden">
      <summary
        className={`flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 font-sans text-sm font-semibold text-imaa-ink [&::-webkit-details-marker]:hidden ${FOCUS_RING}`}
      >
        <span>
          On this page <span className="font-normal text-imaa-meta">({sections.length} sections)</span>
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="shrink-0 text-imaa-teal transition-transform group-open:rotate-180 motion-reduce:transition-none"
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </summary>
      <nav aria-label="On this page" className="max-h-[60vh] overflow-y-auto border-t border-imaa-border px-1 py-2">
        <SectionLinks sections={sections} />
      </nav>
    </details>
  );
}

// index.css sets `overflow-x: hidden` on html, body and #root for the whole app, which makes body
// and #root scroll containers, so `position: sticky` never sticks. `clip` hides the same overflow
// without creating a scroll container. Applied only while this sidebar is on the page and shown.
const STICKY_FIX_CSS =
  "@media (min-width:1024px){html:has([data-legal-section-nav]) body,html:has([data-legal-section-nav]) #root{overflow-x:clip}}";

export function LegalSectionNavSidebar({ sections }) {
  return (
    <aside className="hidden lg:block">
      <style>{STICKY_FIX_CSS}</style>
      <nav
        data-legal-section-nav=""
        aria-label="On this page"
        className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto rounded-xl border border-imaa-border bg-white py-4"
      >
        <p className="m-0 px-4 pb-2 font-sans text-xs font-bold uppercase tracking-[0.08em] text-imaa-meta">On this page</p>
        <div className="px-1">
          <SectionLinks sections={sections} />
        </div>
      </nav>
    </aside>
  );
}
