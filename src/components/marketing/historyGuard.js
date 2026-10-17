// One popstate dispatcher for unsaved-changes guards.
//
// React Router's <BrowserRouter> handles browser Back/Forward with a popstate
// listener on window, added when the app first renders. A guard has to see the
// event before the router does: once the router handles it, the new route
// renders synchronously, the editor unmounts and its unsaved content is gone.
// Browsers run window listeners in registration order (Chromium does not put
// capture listeners first on window), so a page cannot get ahead of the router
// by registering later. installHistoryGuard() is therefore called once at
// bootstrap (src/main.jsx), before the router mounts, and pages plug a handler
// into it. A handler returns true to consume the event, so the router never
// sees that navigation.
//
// State lives on one global so every copy of this module (dev HMR, separately
// bundled tests) shares the single dispatcher.

const state = (globalThis.__ecpHistoryGuard ||= { installed: false, handler: null });

function onPopState(event) {
  if (state.handler && state.handler(event) === true) {
    event.stopImmediatePropagation();
  }
}

export function installHistoryGuard() {
  if (state.installed || typeof window === "undefined") return;
  state.installed = true;
  window.addEventListener("popstate", onPopState, true);
}

/** Makes `handler` the active guard; returns a function that removes it. */
export function setHistoryGuardHandler(handler) {
  // Late fallback if bootstrap did not install it; only reliable where capture
  // listeners run first, so src/main.jsx installs it up front.
  installHistoryGuard();
  state.handler = handler;
  return () => {
    if (state.handler === handler) state.handler = null;
  };
}
