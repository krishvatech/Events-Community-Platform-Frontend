// src/theme/useColorMode.js
// Small wrapper around MUI's colour-scheme state for feature code (phase D2).
// MUI owns the state and persistence; this hook only exposes what UI needs.
// When dark mode is disabled it always reports light and the setters do nothing.
import { useCallback } from "react";
import { useColorScheme } from "@mui/material/styles";
import { DARK_MODE_ENABLED } from "./colorMode";

export function useColorMode() {
  const { mode, setMode } = useColorScheme();
  const isDark = DARK_MODE_ENABLED && mode === "dark";

  const setLight = useCallback(() => {
    if (DARK_MODE_ENABLED) setMode("light");
  }, [setMode]);
  const setDark = useCallback(() => {
    if (DARK_MODE_ENABLED) setMode("dark");
  }, [setMode]);
  const toggle = useCallback(() => {
    if (DARK_MODE_ENABLED) setMode(isDark ? "light" : "dark");
  }, [setMode, isDark]);

  return { enabled: DARK_MODE_ENABLED, mode: isDark ? "dark" : "light", isDark, setLight, setDark, toggle };
}
