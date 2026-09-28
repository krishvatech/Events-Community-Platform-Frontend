// src/bootstrap/enUsLocale.js
// Forces en-US formatting for Intl and Date/Number toLocale* calls, exactly as
// src/main.jsx has always done. Shared by the Vite entry (src/main.jsx) and the
// Next.js browser bootstrap (src/next/browserBootstrap.js).
// Browser-only: must never run on the Next.js server, where it would patch the
// Node process globals for every request.

const DEFAULT_LOCALE = "en-US";
const APPLIED_FLAG = "__ecpEnUsLocaleApplied";

const wrapLocale = (fn) =>
  (function localeWrapper(_locales, options) {
    return fn.call(this, DEFAULT_LOCALE, options);
  });

export function applyEnUsLocaleOverrides() {
  if (globalThis[APPLIED_FLAG]) return;
  globalThis[APPLIED_FLAG] = true;

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
}
