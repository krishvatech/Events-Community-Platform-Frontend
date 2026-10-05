"use client";

// Client provider boundary for the Next.js App Router.
// Next.js equivalent of the MUI provider stack in src/main.jsx:
//   <StyledEngineProvider injectFirst> -> AppRouterCacheProvider with prepend: true
//   (MUI styles are inserted first so Tailwind/global CSS keep precedence)
//   <ThemeProvider theme={theme}> + <CssBaseline /> -> reused unchanged.
// Browser-only startup from main.jsx (polyfills, Sentry, fetch interceptor,
// Intl locale overrides, auth bootstrap) is intentionally NOT initialized here yet.

import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { appTheme, appThemeProviderProps } from "../muiTheme";

export default function AppProviders({ children }) {
  return (
    <AppRouterCacheProvider options={{ prepend: true }}>
      {/* Same theme selection as src/main.jsx; dark-mode props are empty while the flag is off */}
      <ThemeProvider theme={appTheme} {...appThemeProviderProps}>
        {/* Keep Tailwind look exactly the same; CssBaseline only normalizes defaults */}
        <CssBaseline />
        {children}
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
