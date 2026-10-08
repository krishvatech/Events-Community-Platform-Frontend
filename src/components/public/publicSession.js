// src/components/public/publicSession.js
// Browser-only sign-in state for the public shell's client islands (header actions and the
// mobile menu). Auth state lives in browser storage (src/utils/tokenStore.js) and must never
// reach the server-rendered HTML, so callers read it in an effect after mount.
import { useEffect, useState } from "react";
import { getAccessToken } from "../../utils/tokenStore";

export const isMemberSession = () => {
  try {
    if (localStorage.getItem("is_guest") === "true") return false;
  } catch {
    // storage unavailable: treat as logged out
  }
  return !!getAccessToken();
};

/** `true` for a signed-in member; `false` on the server, before mount and for guests. */
export function useMemberSession() {
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    const sync = () => setAuthed(isMemberSession());
    sync();
    window.addEventListener("auth:changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("auth:changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return authed;
}
