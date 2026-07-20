import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import * as isoCountries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";
import { normalizeTimezoneName } from "./timezoneUtils";

dayjs.extend(utc);
dayjs.extend(timezone);

isoCountries.registerLocale(enLocale);

const RAW = import.meta.env.VITE_API_BASE_URL || "";
const BASE = RAW.replace(/\/+$/, "");
export const API_ROOT = BASE.endsWith("/api") ? BASE : `${BASE}/api`;

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api").replace(/\/$/, "");
export const API_ORIGIN = API_BASE.replace(/\/api$/, "");

export const getToken = () =>
    localStorage.getItem("access_token") ||
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    "";

export const toAbs = (u) => {
    if (!u) return u;
    // already absolute?
    if (/^https?:\/\//i.test(u)) return u;
    // ensure leading slash then join to origin
    const p = u.startsWith("/") ? u : `/${u}`;
    return `${API_ORIGIN}${p}`;
};

const FALLBACK_TIMEZONES = [
    "Asia/Kolkata",
    "UTC",
    "Asia/Dubai",
    "Europe/London",
    "America/New_York",
];

export const getBrowserTimezone = () => {
    if (typeof Intl !== "undefined" && Intl.DateTimeFormat) {
        return normalizeTimezoneName(Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata");
    }
    return "Asia/Kolkata";
};

const getTimezoneOptions = () => {
    if (typeof Intl !== "undefined" && typeof Intl.supportedValuesOf === "function") {
        return Intl.supportedValuesOf("timeZone");
    }
    return FALLBACK_TIMEZONES;
};

export const TIMEZONE_OPTIONS = getTimezoneOptions();

export const roundToHour = (d = dayjs()) => dayjs(d).minute(0).second(0).millisecond(0);

export const getDefaultSchedule = (durationHours = 2) => {
    const start = roundToHour(dayjs());
    const end = start.add(durationHours, "hour");
    return {
        startDate: start.format("YYYY-MM-DD"),
        endDate: end.format("YYYY-MM-DD"),
        startTime: start.format("HH:mm"),
        endTime: end.format("HH:mm"),
    };
};

export const computeEndFromStart = (startDate, startTime, durationHours = 2) => {
    const start = dayjs(`${startDate}T${startTime}:00`);
    if (!start.isValid()) {
        return { endDate: startDate, endTime: startTime };
    }
    const end = start.add(durationHours, "hour");
    return { endDate: end.format("YYYY-MM-DD"), endTime: end.format("HH:mm") };
};

// Returns true only when time is a well-formed HH:mm string that dayjs accepts.
export const isValidHHmm = (time) =>
    typeof time === "string" &&
    /^\d{2}:\d{2}$/.test(time) &&
    dayjs(`1970-01-01T${time}:00`).isValid();

export const toUTCISO = (date, time, tz) => {
    if (!date || !time || !tz) return null;
    // Reject malformed time strings before they reach dayjs.tz (avoids RangeError)
    if (!isValidHHmm(time)) return null;
    try {
        const dt = dayjs.tz(`${date}T${time}:00`, tz);
        return dt.isValid() ? dt.toDate().toISOString() : null;
    } catch {
        return null;
    }
};

export const iso = (d, t) => (d && t ? dayjs(`${d}T${t}:00`).toISOString() : null);

// Country helpers
const flagEmoji = (code) =>
    code
        .toUpperCase()
        .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt()));

export const COUNTRY_OPTIONS = Object.entries(
    isoCountries.getNames("en", { select: "official" })
).map(([code, label]) => ({ code, label, emoji: flagEmoji(code) }));

export const getSelectedCountry = ({ location }) => {
    if (!location) return null;

    // if you ever store code directly
    const byCode = COUNTRY_OPTIONS.find((opt) => opt.code === location);
    if (byCode) return byCode;

    // match by name (what you use now)
    return (
        COUNTRY_OPTIONS.find(
            (opt) =>
                (opt.label || "").toLowerCase() === String(location).toLowerCase()
        ) || null
    );
};

export const slugifyLocal = (s) =>
    (s || "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9_]+/g, "-")
        .replace(/^-+|-+$/g, "");

export const sanitizeSlugInput = (s) =>
    (s || "")
        .toLowerCase()
        .replace(/\//g, "-")     // forward slash can never appear in URL paths
        .replace(/\s+/g, "-")    // spaces → hyphens
        .replace(/^-+/g, ""); // trim leading hyphens (allow trailing while editing)
// Allows: @, #, $, &, ?, !, (, ), *, +, ;, :, ~, ' and other special chars

/**
 * Return the replay registration CTA that matches the viewer's auth state.
 *
 * Event administrators may configure public copy such as
 * "Sign up to watch full replay". For a signed-in user, clicking the same
 * button creates an event registration rather than a new account, so the
 * leading "Sign up" wording would be misleading. Preserve all other custom
 * CTA copy and only replace a leading sign-up phrase for authenticated users.
 */
export const getReplayCtaText = (event, isAuthenticated = false) => {
  const configuredText = String(event?.replay_cta_text || "").trim();
  const ctaText = configuredText || "Sign up to watch full replay";

  if (!isAuthenticated) return ctaText;

  return ctaText.replace(/^sign(?:\s|-)?up\b/i, "Register");
};

/**
 * Treat stale published/imported events as past once their end time passes.
 * A meeting that is genuinely live may continue past its scheduled end time.
 */
export const isEventEffectivelyPast = (event, nowMs = Date.now()) => {
  if (!event) return false;
  if (event.status === "ended") return true;
  if (event.is_live) return false;

  const rawEnd = event.end_time || event.end;
  if (!rawEnd) return false;

  const endMs = new Date(rawEnd).getTime();
  return Number.isFinite(endMs) && endMs <= nowMs;
};

/**
 * Replay signup is valid only after the event and only when participants can
 * actually open a published recording. Prefer the backend-derived flag when
 * available and keep a fallback for preloaded/older API payloads.
 */
export const isReplayReadyForSignup = (event) => {
  if (!event) return false;
  if (typeof event.replay_ready === "boolean") return event.replay_ready;

  return Boolean(
    isEventEffectivelyPast(event) &&
    event.replay_enabled &&
    event.replay_visible_to_participants &&
    (event.replay_video_url || event.recording_url)
  );
};

export const getDisplayPrice = (event) => {
  const label = String(event?.price_label || event?.price_display_label || "").trim();

  // Manual labels are useful while the Saleor product is not priced yet.
  // Once a paid event has a valid Saleor/ECP price, show the real checkout price
  // so public event cards never display a stale label such as "80" while checkout
  // charges a different amount such as "$150".
  // allow_manual_price_display remains the explicit escape hatch for special cases
  // like "By invitation only" or "Price on application".
  if (event?.allow_manual_price_display && label) return label;

  if (event?.is_free) return label || "Free";

  const rawPrice = event?.price;

  if (rawPrice !== null && rawPrice !== undefined && rawPrice !== "") {
    const amount = Number(rawPrice);

    if (Number.isFinite(amount) && amount > 0) {
      try {
        return new Intl.NumberFormat(undefined, {
          style: "currency",
          currency: event?.currency || "USD",
          maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
        }).format(amount);
      } catch {
        return `$${amount}`;
      }
    }
  }

  return label || "Price to be announced";
};
