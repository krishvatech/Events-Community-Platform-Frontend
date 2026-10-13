"use client";

// src/components/public/testimonials/TestimonialDirectory.jsx
// The testimonial cards with their programme filters (WordPress: "ALL", "IM&A", "CPMI", ... tabs).
//
// Every public testimonial is in the server HTML (the "All" view), newest first as on WordPress.
// A programme button shows only the testimonials linked to that programme (cms Testimonial
// .programmes); someone in several programmes appears in each of them, never twice in one view. The
// buttons are a labelled group with aria-pressed and a polite live region announces the result, as
// the Our Team faculty filters. Long quotes are shortened, with a button to read the whole quote.
import { useId, useMemo, useState } from "react";
import { FOCUS_RING, SMALL_PROSE_CLASS } from "../about/aboutStyles.js";

export const ALL = "all";
// Quotes longer than this (plain text) start shortened.
export const LONG_QUOTE = 420;

const plainLength = (html) => html.replace(/<[^>]*>/g, "").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim().length;

function QuoteIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 24" width="32" height="24" className="shrink-0 text-imaa-teal" fill="currentColor">
      <path d="M0 24V14C0 6.3 4.3 1.6 12 0l1.5 3C9 4.3 6.8 7 6.5 10H12v14H0Zm20 0V14c0-7.7 4.3-12.4 12-14l1.5 3c-4.5 1.3-6.7 4-7 7H32v14H20Z" />
    </svg>
  );
}

export function TestimonialCard({ item, programmeCodes = {}, eager = false }) {
  const quoteId = useId();
  const long = plainLength(item.quote_html) > LONG_QUOTE;
  const [expanded, setExpanded] = useState(false);
  const meta = [item.role, item.company].filter(Boolean).join(", ");
  const codes = item.programmes.map((slug) => programmeCodes[slug]).filter(Boolean);
  // The programme as WordPress displays it when no programme link is known.
  const badges = codes.length ? codes : item.programme ? [item.programme] : [];

  return (
    <figure className="m-0 flex h-full w-full flex-col rounded-xl border border-imaa-border bg-white p-6 md:p-7" data-testimonial={item.slug}>
      <QuoteIcon />
      <blockquote className="m-0 mt-4 flex-1">
        <div
          id={quoteId}
          className={`${SMALL_PROSE_CLASS} ${long && !expanded ? "line-clamp-[9]" : ""}`}
          dangerouslySetInnerHTML={{ __html: item.quote_html }}
        />
      </blockquote>
      {long ? (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={quoteId}
          onClick={() => setExpanded((open) => !open)}
          className={`mt-3 inline-flex min-h-[44px] items-center self-start rounded font-sans text-sm font-semibold text-imaa-link hover:text-imaa-teal-dark hover:underline ${FOCUS_RING}`}
        >
          {expanded ? "Show less" : "Read the full testimonial"}
          <span className="sr-only"> by {item.name}</span>
        </button>
      ) : null}
      <figcaption className="mt-5 flex items-center gap-4 border-t border-imaa-border pt-5">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-imaa-cool ring-1 ring-imaa-border">
          {item.photo ? (
            <img
              src={item.photo.url}
              alt={item.photo.alt || item.name}
              width={item.photo.width || undefined}
              height={item.photo.height || undefined}
              sizes="64px"
              loading={eager ? "eager" : "lazy"}
              decoding="async"
              className="block h-full w-full object-cover"
            />
          ) : (
            <span aria-hidden="true" className="flex h-full w-full items-center justify-center font-sans text-xl font-bold text-imaa-teal-dark">
              {item.name.charAt(0)}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <p className="m-0 font-sans text-base font-semibold text-imaa-ink">{item.name}</p>
          {meta ? <p className="m-0 mt-0.5 text-sm text-imaa-meta">{meta}</p> : null}
          {badges.length ? (
            <ul aria-label="Programmes" className="m-0 mt-1.5 flex list-none flex-wrap gap-1.5 p-0">
              {badges.map((code) => (
                <li key={code} className="rounded-full bg-imaa-cool px-2.5 py-0.5 text-xs font-semibold text-imaa-teal-dark">
                  {code}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </figcaption>
    </figure>
  );
}

export const TESTIMONIAL_GRID = "m-0 grid list-none gap-5 p-0 md:grid-cols-2 lg:grid-cols-3";

export default function TestimonialDirectory({ testimonials, programmes }) {
  const [selected, setSelected] = useState(ALL);
  const programmeCodes = useMemo(() => Object.fromEntries(programmes.map((p) => [p.slug, p.code])), [programmes]);
  const visible = selected === ALL ? testimonials : testimonials.filter((item) => item.programmes.includes(selected));
  const label = selected === ALL ? "" : programmeCodes[selected];
  const noun = (count) => (count === 1 ? "testimonial" : "testimonials");
  const filters = [{ slug: ALL, code: "All" }, ...programmes];

  return (
    <div data-testimonial-directory="">
      {programmes.length ? (
        // As the Our Team filters: the scroller's inner padding keeps every focus ring visible.
        <div role="group" aria-label="Filter testimonials by programme" className="-mx-6 -mt-1 overflow-x-auto px-6 pb-2 pt-1 sm:-mx-1 sm:px-1">
          <ul className="m-0 flex w-max list-none gap-2 p-0 sm:w-auto sm:flex-wrap">
            {filters.map(({ slug, code }) => {
              const active = selected === slug;
              return (
                <li key={slug}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelected(slug)}
                    className={`inline-flex min-h-[44px] items-center rounded-full border px-4 text-sm font-semibold transition-colors ${
                      active
                        ? "border-imaa-teal-dark bg-imaa-teal-dark text-white"
                        : "border-imaa-border bg-white text-imaa-ink hover:border-imaa-teal hover:text-imaa-teal-dark"
                    } ${FOCUS_RING}`}
                  >
                    {code}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <p aria-live="polite" className="mb-0 mt-4 text-sm text-imaa-meta">
        {label ? `Showing ${visible.length} ${noun(visible.length)} for ${label}` : `Showing all ${visible.length} ${noun(visible.length)}`}
      </p>

      {visible.length ? (
        <ul className={`${TESTIMONIAL_GRID} mt-6`}>
          {visible.map((item, index) => (
            <li key={item.slug} className="flex">
              <TestimonialCard item={item} programmeCodes={programmeCodes} eager={selected === ALL && index < 3} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-0 mt-6 rounded-xl border border-dashed border-imaa-border bg-white p-6 text-imaa-body">
          No testimonials are listed for {label} yet.
        </p>
      )}
    </div>
  );
}
