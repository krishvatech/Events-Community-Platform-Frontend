"use client";

// src/navigation/next.jsx
// Next.js target of the "#navigation" import (aliased in next.config.mjs).
// Exposes the small React Router API surface used by migrated components
// (useNavigate, useLocation, useParams, useSearchParams, Link, Navigate) on top
// of next/navigation.
//
// When a component is rendered inside the temporary legacy fallback (a React
// Router <Router> bridged to Next, see src/next/ReactRouterBridge.jsx) these
// delegate to React Router, so route params and navigation stay correct there.
// The branch is fixed for a component's lifetime, so hook order is stable.

import { forwardRef, useCallback, useEffect, useMemo } from "react";
import NextLink from "next/link";
import {
  useParams as useNextParams,
  usePathname,
  useRouter,
  useSearchParams as useNextSearchParams,
} from "next/navigation";
import * as RR from "react-router-dom";
import {
  clearPendingNavigation,
  getPendingNavigation,
  isPendingNavigationActive,
  readNavigationState,
  resolveHref,
  setPendingNavigation,
  writeNavigationState,
} from "./navigationState";

const useInReactRouter = RR.useInRouterContext;

const currentHash = () => (typeof window !== "undefined" ? window.location.hash : "");

function useNextLocation() {
  const committedPathname = usePathname() || "/";
  const params = useNextSearchParams();
  const query = params ? params.toString() : "";
  const committedSearch = query ? `?${query}` : "";
  const committedKey = `${committedPathname}${committedSearch}`;

  // Report an in-flight navigation's target immediately, like React Router
  // (see "Pending navigation" in navigationState.js).
  const pending = getPendingNavigation();
  const active = isPendingNavigationActive(pending, committedKey);
  useEffect(() => {
    if (pending && !active) clearPendingNavigation(pending);
  }, [pending, active]);

  const pathname = active ? pending.pathname : committedPathname;
  const search = active ? pending.search : committedSearch;
  const hash = active ? pending.hash : currentHash();
  return useMemo(
    () => ({
      pathname,
      search,
      hash,
      state: readNavigationState(pathname, search),
      key: `${pathname}${search}`,
    }),
    [pathname, search, hash]
  );
}

function useNextNavigate() {
  const router = useRouter();
  return useCallback(
    (to, options = {}) => {
      if (typeof to === "number") {
        window.history.go(to);
        return;
      }
      const href = resolveHref(to);
      writeNavigationState(href, options.state);
      setPendingNavigation(href);
      // React Router keeps the scroll position on navigation; match it.
      if (options.replace) router.replace(href, { scroll: false });
      else router.push(href, { scroll: false });
    },
    [router]
  );
}

export function useNavigate() {
  if (useInReactRouter()) return RR.useNavigate();
  return useNextNavigate();
}

export function useLocation() {
  if (useInReactRouter()) return RR.useLocation();
  return useNextLocation();
}

export function useParams() {
  if (useInReactRouter()) return RR.useParams();
  const params = useNextParams() || {};
  return useMemo(() => {
    const out = {};
    for (const [key, value] of Object.entries(params)) {
      const raw = Array.isArray(value) ? value.join("/") : value;
      try {
        out[key] = decodeURIComponent(raw);
      } catch {
        out[key] = raw;
      }
    }
    return out;
  }, [params]);
}

export function useSearchParams() {
  if (useInReactRouter()) return RR.useSearchParams();
  const { pathname, search } = useNextLocation();
  const navigate = useNextNavigate();
  const current = useMemo(() => new URLSearchParams(search), [search]);
  const setSearchParams = useCallback(
    (next, options) => {
      const value = typeof next === "function" ? next(new URLSearchParams(current)) : next;
      const query = new URLSearchParams(value).toString();
      navigate(`${pathname}${query ? `?${query}` : ""}`, options);
    },
    [current, navigate, pathname]
  );
  return [current, setSearchParams];
}

// Like React Router's <Link>, the computed href always wins: callers such as
// `<Button component={isExternal ? "a" : Link} href={isExternal ? url : undefined} to={url}>`
// pass `href={undefined}` alongside `to`, which must not override it.
export const Link = forwardRef(function Link(
  { to, replace, state, reloadDocument, onClick, href: _ignoredHref, as: _ignoredAs, ...rest },
  ref
) {
  if (useInReactRouter()) {
    return <RR.Link ref={ref} {...rest} to={to} replace={replace} state={state} reloadDocument={reloadDocument} onClick={onClick} />;
  }
  const href = resolveHref(to);
  if (reloadDocument) {
    return <a ref={ref} {...rest} href={href} onClick={onClick} />;
  }
  return (
    <NextLink
      ref={ref}
      {...rest}
      href={href}
      replace={replace}
      scroll={false}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          writeNavigationState(href, state);
          const modified = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0 || rest.target;
          if (!modified) setPendingNavigation(href);
        }
      }}
    />
  );
});

function NextNavigate({ to, replace = false, state }) {
  const navigate = useNextNavigate();
  const target = resolveHref(to);
  const serializedState = JSON.stringify(state ?? null);
  useEffect(() => {
    navigate(target, { replace, state: JSON.parse(serializedState) ?? undefined });
  }, [navigate, target, replace, serializedState]);
  return null;
}

export function Navigate(props) {
  if (useInReactRouter()) return <RR.Navigate {...props} />;
  return <NextNavigate {...props} />;
}
