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
import { readNavigationState, resolveHref, writeNavigationState } from "./navigationState";

const useInReactRouter = RR.useInRouterContext;

const currentHash = () => (typeof window !== "undefined" ? window.location.hash : "");

function useNextLocation() {
  const pathname = usePathname() || "/";
  const params = useNextSearchParams();
  const query = params ? params.toString() : "";
  const search = query ? `?${query}` : "";
  return useMemo(
    () => ({
      pathname,
      search,
      hash: currentHash(),
      state: readNavigationState(pathname, search),
      key: `${pathname}${search}`,
    }),
    [pathname, search]
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
  const params = useNextSearchParams();
  const pathname = usePathname() || "/";
  const navigate = useNextNavigate();
  const current = useMemo(() => new URLSearchParams(params ? params.toString() : ""), [params]);
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

export const Link = forwardRef(function Link({ to, replace, state, reloadDocument, onClick, ...rest }, ref) {
  if (useInReactRouter()) {
    return <RR.Link ref={ref} to={to} replace={replace} state={state} reloadDocument={reloadDocument} onClick={onClick} {...rest} />;
  }
  const href = resolveHref(to);
  if (reloadDocument) {
    return <a ref={ref} href={href} onClick={onClick} {...rest} />;
  }
  return (
    <NextLink
      ref={ref}
      href={href}
      replace={replace}
      scroll={false}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) writeNavigationState(href, state);
      }}
      {...rest}
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
