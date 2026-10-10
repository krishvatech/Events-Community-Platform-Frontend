"use client";

// src/components/public/about/AboutCarousel.jsx
// A manual carousel for the About page's programmes and testimonials.
//
// The slides are server-rendered children in a native horizontal scroll-snap list, so touch
// swipe, trackpad and keyboard scrolling (the list is focusable; arrow keys scroll it) work
// without a library, and every slide is in the HTML. Previous/next buttons move by one page
// of visible slides and are disabled at either end. Nothing moves on its own; scrolling is
// instant when the user prefers reduced motion.
import { Children, useCallback, useEffect, useRef, useState } from "react";

const FOCUS_RING =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-imaa-teal";

function Arrow({ direction }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={direction === "previous" ? "M10 3 5 8l5 5" : "M6 3l5 5-5 5"} />
    </svg>
  );
}

export default function AboutCarousel({ label, children, slideClassName = "" }) {
  const listRef = useRef(null);
  const slides = Children.toArray(children);
  const [edges, setEdges] = useState({ atStart: true, atEnd: slides.length <= 1 });

  const update = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const max = list.scrollWidth - list.clientWidth;
    setEdges({ atStart: list.scrollLeft <= 4, atEnd: list.scrollLeft >= max - 4 });
  }, []);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return undefined;
    update();
    list.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      list.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [update]);

  const move = (direction) => {
    const list = listRef.current;
    if (!list) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const first = list.firstElementChild;
    const gap = parseFloat(getComputedStyle(list).columnGap) || 0;
    const step = first ? first.getBoundingClientRect().width + gap : list.clientWidth;
    const perPage = Math.max(1, Math.floor((list.clientWidth + gap) / step));
    list.scrollBy({ left: direction * step * perPage, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <section aria-roledescription="carousel" aria-label={label} className="relative">
      <ul
        ref={listRef}
        tabIndex={0}
        aria-label={`${label}: use the arrow keys or swipe to scroll`}
        className={`m-0 flex list-none snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth p-0 pb-4 [scrollbar-width:thin] motion-reduce:scroll-auto ${FOCUS_RING} rounded-xl`}
      >
        {slides.map((slide, index) => (
          <li
            key={slide.key ?? index}
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${slides.length}`}
            className={`flex shrink-0 snap-start ${slideClassName}`}
          >
            {slide}
          </li>
        ))}
      </ul>
      {slides.length > 1 ? (
        <div className="mt-4 flex justify-end gap-3">
          {[
            ["previous", -1, edges.atStart],
            ["next", 1, edges.atEnd],
          ].map(([name, direction, disabled]) => (
            <button
              key={name}
              type="button"
              onClick={() => move(direction)}
              disabled={disabled}
              aria-label={`${name === "previous" ? "Previous" : "Next"}: ${label}`}
              className={`inline-flex h-11 w-11 items-center justify-center rounded-full border border-imaa-border bg-white text-imaa-ink transition-colors hover:border-imaa-teal hover:text-imaa-teal-dark disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
            >
              <Arrow direction={name} />
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
