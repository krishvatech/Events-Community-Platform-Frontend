"use client";

// src/components/public/team/FacultyDirectory.jsx
// The faculty grid with its programme filters (WordPress: "ALL", "IM&A", "CPMI", ... tabs).
//
// Every faculty member is in the server HTML (the "All" view). The filter buttons show only the
// people linked to that programme; a person in several programmes appears once in "All" and once
// in each of their programmes, never twice in one view. Order is the CMS order. The buttons are a
// labelled group with aria-pressed, and a polite live region announces the result.
import { useMemo, useState } from "react";
import { FOCUS_RING } from "../about/aboutStyles.js";
import { CARD_GRID, FacultyCard } from "./TeamCards.jsx";

export const ALL = "all";

export default function FacultyDirectory({ faculty, programmes }) {
  const [selected, setSelected] = useState(ALL);
  const programmeCodes = useMemo(() => Object.fromEntries(programmes.map((p) => [p.slug, p.code])), [programmes]);
  const visible = selected === ALL ? faculty : faculty.filter((member) => member.programmes.includes(selected));
  const label = selected === ALL ? "" : programmeCodes[selected];

  const filters = [{ slug: ALL, code: "All" }, ...programmes];
  return (
    <div data-faculty-directory="">
      {programmes.length ? (
        // The scroller clips overflow, focus rings included: 4px of inner padding (offset by the
        // negative margins) keeps the 2px ring with its 2px offset visible on every button.
        <div role="group" aria-label="Filter faculty by programme" className="-mx-6 -mt-1 overflow-x-auto px-6 pb-2 pt-1 sm:-mx-1 sm:px-1">
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
        {label ? `Showing ${visible.length} faculty in ${label}` : `Showing all ${visible.length} faculty`}
      </p>

      {visible.length ? (
        <ul className={`${CARD_GRID} mt-6`}>
          {visible.map((member, index) => (
            <li key={member.slug} className="flex">
              <FacultyCard member={member} programmeCodes={programmeCodes} eager={selected === ALL && index < 4} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-0 mt-6 rounded-xl border border-dashed border-imaa-border bg-white p-6 text-imaa-body">
          No faculty are listed for {label} yet.
        </p>
      )}
    </div>
  );
}
