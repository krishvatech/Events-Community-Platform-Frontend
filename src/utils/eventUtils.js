import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import * as isoCountries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";

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
        return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
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

export const toUTCISO = (date, time, tz) => {
    if (!date || !time || !tz) return null;
    const dayjsString = `${date}T${time}:00`;
    const dt = dayjs.tz(dayjsString, tz);
    const result = dt.isValid() ? dt.toDate().toISOString() : null;
    return result;
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
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
