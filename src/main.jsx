// src/main.jsx
import './setupPolyfills';

// Suppress internal RealtimeKit SDK unhandled promise rejections (request timeout noise).
// These are fired by the SDK's own retry/polling internals and do not affect functionality.
window.addEventListener('unhandledrejection', (event) => {
  const msg = event?.reason?.message || '';
  if (msg.includes('request timeout for callback')) {
    event.preventDefault();
  }
});

import './sentry';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';
import './styles/brand.css';
import "leaflet/dist/leaflet.css";
import { applyEnUsLocaleOverrides } from "./bootstrap/enUsLocale";

applyEnUsLocaleOverrides();

// MUI providers
import { ThemeProvider, StyledEngineProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { appTheme, appThemeProviderProps } from './muiTheme';

// SEO provider
import { HelmetProvider } from 'react-helmet-async';

// Initialize fetch interceptor after all dependencies are loaded
import './utils/fetchInterceptor';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <StyledEngineProvider injectFirst>
        {/* Same theme selection as src/providers/AppProviders.jsx; dark-mode props are empty while the flag is off */}
        <ThemeProvider theme={appTheme} {...appThemeProviderProps}>
          {/* Keep Tailwind look exactly the same; CssBaseline only normalizes defaults */}
          <CssBaseline />
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ThemeProvider>
      </StyledEngineProvider>
    </HelmetProvider>
  </React.StrictMode>
);
