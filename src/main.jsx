// src/main.jsx
import './utils/fetchInterceptor';
import './setupPolyfills';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';
import './styles/brand.css';
import "leaflet/dist/leaflet.css";

const DEFAULT_LOCALE = "en-US";
const wrapLocale = (fn) =>
  function localeWrapper(_locales, options) {
    return fn.call(this, DEFAULT_LOCALE, options);
  };

if (typeof Intl !== "undefined" && Intl.DateTimeFormat) {
  const OriginalDateTimeFormat = Intl.DateTimeFormat;
  Intl.DateTimeFormat = function DateTimeFormat(_locales, options) {
    return new OriginalDateTimeFormat(DEFAULT_LOCALE, options);
  };
  Intl.DateTimeFormat.prototype = OriginalDateTimeFormat.prototype;
  Intl.DateTimeFormat.supportedLocalesOf =
    OriginalDateTimeFormat.supportedLocalesOf.bind(OriginalDateTimeFormat);
}

if (typeof Intl !== "undefined" && Intl.NumberFormat) {
  const OriginalNumberFormat = Intl.NumberFormat;
  Intl.NumberFormat = function NumberFormat(_locales, options) {
    return new OriginalNumberFormat(DEFAULT_LOCALE, options);
  };
  Intl.NumberFormat.prototype = OriginalNumberFormat.prototype;
  Intl.NumberFormat.supportedLocalesOf =
    OriginalNumberFormat.supportedLocalesOf.bind(OriginalNumberFormat);
}

if (typeof Intl !== "undefined" && Intl.Collator) {
  const OriginalCollator = Intl.Collator;
  Intl.Collator = function Collator(_locales, options) {
    return new OriginalCollator(DEFAULT_LOCALE, options);
  };
  Intl.Collator.prototype = OriginalCollator.prototype;
  Intl.Collator.supportedLocalesOf =
    OriginalCollator.supportedLocalesOf.bind(OriginalCollator);
}

if (typeof Date !== "undefined") {
  Date.prototype.toLocaleString = wrapLocale(Date.prototype.toLocaleString);
  Date.prototype.toLocaleDateString = wrapLocale(Date.prototype.toLocaleDateString);
  Date.prototype.toLocaleTimeString = wrapLocale(Date.prototype.toLocaleTimeString);
}

if (typeof Number !== "undefined") {
  Number.prototype.toLocaleString = wrapLocale(Number.prototype.toLocaleString);
}

// MUI providers
import { ThemeProvider, StyledEngineProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './muiTheme';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>
        {/* Keep Tailwind look exactly the same; CssBaseline only normalizes defaults */}
        <CssBaseline />
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ThemeProvider>
    </StyledEngineProvider>
  </React.StrictMode>
);
