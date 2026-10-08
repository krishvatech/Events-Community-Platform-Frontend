// src/navigation/reactRouter.js
// Default target of the "#navigation" import (package.json "imports").
// Vite, Node tests and esbuild resolve "#navigation" here, so shared components
// keep using React Router exactly as before. Next.js aliases "#navigation" to
// ./next.jsx instead (see next.config.mjs).
//
// Two additions, both opt-in, so existing links behave exactly as before:
// - `resetScroll` on <Link>: the destination starts at the top of the page. For links at the
//   bottom of a page (the footer), where keeping the old scroll offset would land the reader at
//   the bottom of the next page. React Router keeps the scroll position otherwise.
// - PUBLIC_CMS_ROUTES_AVAILABLE: whether this build has the server-rendered public CMS pages
//   (/privacy-policy, /imprint, ...). Only the Next.js build does (src/app/(site)).
import { createElement, forwardRef } from "react";
import { Link as RouterLink } from "react-router-dom";

export { Navigate, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";

export const PUBLIC_CMS_ROUTES_AVAILABLE = false;

// True for a plain left click that the router will handle in this tab.
export function isPlainNavigationClick(event, target) {
  return (
    !event.defaultPrevented &&
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey &&
    (!target || target === "_self")
  );
}

export const Link = forwardRef(function Link({ resetScroll = false, onClick, ...props }, ref) {
  const handleClick = (event) => {
    onClick?.(event);
    if (resetScroll && isPlainNavigationClick(event, props.target)) {
      // React Router renders the destination synchronously for this click; scroll once it has.
      window.requestAnimationFrame(() => window.scrollTo(0, 0));
    }
  };
  return createElement(RouterLink, { ref, ...props, onClick: handleClick });
});
