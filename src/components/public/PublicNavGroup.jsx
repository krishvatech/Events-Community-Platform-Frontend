"use client";

// src/components/public/PublicNavGroup.jsx
// A header entry with sub-pages ("About Us" -> About IMAA, Our Team, References) for the public
// shell's desktop navigation. Disclosure pattern (a button that shows a list of links), not an
// ARIA menu: links stay ordinary links in the tab order.
// * Click/tap or Enter/Space toggles; ArrowDown opens and moves into the list; arrows move
//   between links. Never opens on hover alone.
// * Escape closes and returns focus to the button; a click outside, focus leaving the group,
//   choosing a link or a route change closes it.
// * The current page has aria-current="page"; the button is highlighted when one of its pages is.
import { useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Link } from "#navigation";

const normalise = (path) => (path || "/").replace(/\/+$/, "") || "/";
export const isCurrentPath = (pathname, to) => typeof to === "string" && to.startsWith("/") && normalise(pathname) === normalise(to);

const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-imaa-teal";

function Chevron({ open }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="currentColor"
         className={`shrink-0 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}>
      <path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4Z" />
    </svg>
  );
}

export default function PublicNavGroup({ label, items }) {
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const container = useRef(null);
  const button = useRef(null);
  const active = items.some((item) => isCurrentPath(pathname, item.to));

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (container.current && !container.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const links = () => [...(container.current?.querySelectorAll("[data-nav-group-link]") || [])];
  const focusLink = (index) => {
    const all = links();
    if (all.length) all[(index + all.length) % all.length].focus();
  };

  const onKeyDown = (event) => {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
      button.current?.focus();
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const all = links();
    const index = all.indexOf(document.activeElement);
    if (!open) {
      setOpen(true);
      requestAnimationFrame(() => focusLink(event.key === "ArrowDown" ? 0 : -1));
    } else {
      focusLink(index === -1 ? 0 : index + (event.key === "ArrowDown" ? 1 : -1));
    }
  };

  const onBlur = (event) => {
    if (open && container.current && !container.current.contains(event.relatedTarget)) setOpen(false);
  };

  return (
    <div ref={container} className="relative" onKeyDown={onKeyDown} onBlur={onBlur} data-nav-group={label}>
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className={`inline-flex min-h-11 items-center gap-1 rounded-md text-sm font-medium transition-colors hover:text-imaa-teal-dark ${
          active ? "text-imaa-teal-dark" : "text-imaa-body"
        } ${FOCUS}`}
      >
        {label}
        <Chevron open={open} />
      </button>
      <ul
        id={panelId}
        hidden={!open}
        aria-label={label}
        className="absolute left-1/2 top-full z-40 m-0 mt-2 min-w-[220px] -translate-x-1/2 list-none rounded-xl border border-imaa-border bg-white p-2 shadow-lg"
      >
        {items.map((item) => {
          const current = isCurrentPath(pathname, item.to);
          const external = !item.to.startsWith("/");
          const className = `flex min-h-11 items-center justify-between gap-3 rounded-lg px-3 text-sm no-underline transition-colors hover:bg-imaa-cool hover:text-imaa-teal-dark ${
            current ? "bg-imaa-cool font-semibold text-imaa-teal-dark" : "font-medium text-imaa-ink"
          } ${FOCUS}`;
          return (
            <li key={item.label}>
              {external ? (
                <a href={item.to} className={className} data-nav-group-link="">
                  {item.label}
                  <span aria-hidden="true">↗</span>
                  <span className="sr-only"> (imaa-institute.org)</span>
                </a>
              ) : (
                <Link
                  to={item.to}
                  resetScroll
                  className={className}
                  aria-current={current ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  data-nav-group-link=""
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
