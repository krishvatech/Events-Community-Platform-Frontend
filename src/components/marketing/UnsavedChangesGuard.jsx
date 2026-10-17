import React, { useContext, useEffect, useRef, useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import { UNSAFE_NavigationContext, useLocation } from "react-router-dom";

import { setHistoryGuardHandler } from "./historyGuard";

/**
 * Warns before leaving a page with unsaved changes.
 *
 * The app uses <BrowserRouter> (not a data router), so React Router's
 * useBlocker is unavailable. Instead, whenever the page has unsaved changes
 * (`when`, or `isDirtyNow()` checked at the moment of leaving):
 *  - in-app navigation (sidebar, drawer, links, breadcrumbs, Back buttons:
 *    everything that goes through navigate()) is held at the router's
 *    navigator and confirmed;
 *  - browser Back and Forward (including multi-step jumps from the history
 *    menu) are held before React Router sees them: the app-wide dispatcher in
 *    historyGuard.js (installed at bootstrap, ahead of the router's listener)
 *    hands the event to this page, which stops it, returns the browser to this
 *    page's history entry and asks. The direction and distance come from the
 *    `idx` React Router stores in each history entry, so Leave replays exactly
 *    the navigation the user chose;
 *  - reloading or closing the tab uses the browser's own beforeunload prompt.
 * History is not rewritten: no entries are added and Forward history stays,
 * except when a held destination has no router index (see onPopState), where
 * this page's entry is pushed back on top of it rather than losing unsaved
 * work (dropping any Forward history that followed that destination).
 *
 * Returns the pending state for <UnsavedChangesDialog> and `allowNavigation`,
 * which a page calls right before it navigates on purpose (e.g. after a save).
 */
export function useUnsavedChangesGuard(when, { isDirtyNow } = {}) {
  const { navigator } = useContext(UNSAFE_NavigationContext);
  const location = useLocation();
  const [pending, setPending] = useState(null);
  const bypass = useRef(false);
  const whenRef = useRef(when);
  whenRef.current = when;
  // Some editors report changes after a short delay; `isDirtyNow` lets the
  // page answer synchronously at the moment someone tries to leave.
  const isDirtyRef = useRef(isDirtyNow);
  isDirtyRef.current = isDirtyNow;
  const original = useRef(null);
  // React Router's index of this page's own history entry, plus the entry
  // itself (state and URL) for the rare case it has to be restored.
  const pageIdx = useRef(null);
  const pageEntry = useRef({ state: null, url: "" });

  const dirtyNow = () => !bypass.current && Boolean(whenRef.current || isDirtyRef.current?.());

  // In-app navigation, for the page's whole lifetime: each attempt asks
  // whether there is anything unsaved right now.
  useEffect(() => {
    const { push, replace, go } = navigator;
    original.current = { push, replace, go };
    navigator.push = (...args) => (dirtyNow() ? setPending({ kind: "push", args }) : push(...args));
    navigator.replace = (...args) => (dirtyNow() ? setPending({ kind: "replace", args }) : replace(...args));
    navigator.go = (delta) => (dirtyNow() ? setPending({ kind: "go", args: [delta] }) : go(delta));
    return () => {
      navigator.push = push;
      navigator.replace = replace;
      navigator.go = go;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigator]);

  // Track this page's entry as the router moves within it (e.g. ?query changes).
  useEffect(() => {
    const idx = window.history.state?.idx;
    pageIdx.current = Number.isInteger(idx) ? idx : null;
    pageEntry.current = { state: window.history.state, url: window.location.href };
  }, [location.key]);

  // Browser Back / Forward, through the app-wide dispatcher that runs before
  // React Router's own popstate listener (see historyGuard.js).
  useEffect(() => {
    // The entry we are returning to after holding a navigation; that return
    // trip must not reach the router either.
    let returningTo = null;

    // Returns true to keep the router from seeing the event.
    const onPopState = (event) => {
      const nextIdx = event.state?.idx;
      if (returningTo !== null && nextIdx === returningTo) {
        returningTo = null;
        return true;
      }
      returningTo = null;
      if (!dirtyNow()) return false;
      const current = pageIdx.current;

      if (!Number.isInteger(nextIdx) || !Number.isInteger(current)) {
        // The destination (or this page) has no router index, e.g. an entry
        // another page rewrote with history.replaceState. Direction and
        // distance are unknown, so a return trip cannot be computed. Rather
        // than let unsaved work go, hold it and push this page's own entry
        // back on top of the destination. That push replaces whatever Forward
        // history followed the destination (the one case that changes
        // history); Leave then steps back to the destination the user picked.
        window.history.pushState(pageEntry.current.state, "", pageEntry.current.url);
        setPending({ kind: "history-unknown" });
        return true;
      }
      if (nextIdx === current) return false;

      // Hold it: the page and its unsaved content stay mounted while the
      // browser goes back to this page's entry.
      const delta = nextIdx - current;
      returningTo = current;
      window.history.go(-delta);
      setPending({ kind: "history", args: [delta] });
      return true;
    };

    return setHistoryGuardHandler(onPopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onBeforeUnload = (event) => {
      if (!dirtyNow()) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allowNavigation = () => {
    bypass.current = true;
  };

  const leave = () => {
    const request = pending;
    setPending(null);
    if (!request) return;
    bypass.current = true;
    const { push, replace, go } = original.current || navigator;
    if (request.kind === "history") {
      // Replays the user's own Back/Forward; the router handles it normally.
      window.history.go(request.args[0]);
    } else if (request.kind === "history-unknown") {
      // Off the restored entry, back to the destination the user picked.
      window.history.back();
    } else if (request.kind === "push") {
      push(...request.args);
    } else if (request.kind === "replace") {
      replace(...request.args);
    } else {
      go(...request.args);
    }
  };

  const stay = () => setPending(null);

  return { pending: Boolean(pending), leave, stay, allowNavigation };
}

export function UnsavedChangesDialog({ guard, title = "Leave without saving?", children }) {
  return (
    <Dialog open={guard.pending} onClose={guard.stay} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography color="text.secondary">
          {children || "You have unsaved changes on this page. If you leave now, they will be lost."}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={guard.stay}>Keep Editing</Button>
        <Button color="error" variant="contained" onClick={guard.leave}>Leave Without Saving</Button>
      </DialogActions>
    </Dialog>
  );
}
