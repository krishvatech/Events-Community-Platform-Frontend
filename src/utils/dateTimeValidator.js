/**
 * Frontend timezone-aware event date-time validation.
 * Mirrors backend validation logic for consistency across all timezones.
 *
 * All validations work with user-selected timezone, not browser/server time.
 */

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Get current time and today's date in the specified timezone.
 * @param {string} tzName - IANA timezone name (e.g. "America/New_York", "Asia/Kolkata")
 * @returns {Object} { nowUTC: Dayjs, nowLocal: Dayjs, today: string (YYYY-MM-DD) }
 */
export const getLocalNow = (tzName) => {
  const nowUTC = dayjs.utc();
  const tz = tzName || "UTC";
  try {
    const nowLocal = nowUTC.tz(tz);
    const today = nowLocal.format("YYYY-MM-DD");
    return { nowUTC, nowLocal, today };
  } catch {
    // Fallback to UTC if timezone is invalid
    const nowLocal = nowUTC.tz("UTC");
    const today = nowLocal.format("YYYY-MM-DD");
    return { nowUTC, nowLocal, today };
  }
};

/**
 * Convert a UTC-aware ISO datetime to local date in the specified timezone.
 * @param {string} isoDateTime - ISO 8601 datetime string
 * @param {string} tzName - IANA timezone name
 * @returns {string|null} Local date (YYYY-MM-DD) or null
 */
export const toLocalDate = (isoDateTime, tzName) => {
  if (!isoDateTime) return null;
  try {
    const dt = dayjs(isoDateTime);
    if (!dt.isValid()) return null;
    const tz = tzName || "UTC";
    return dt.tz(tz).format("YYYY-MM-DD");
  } catch {
    return null;
  }
};

/**
 * Check if two datetimes are effectively unchanged (within tolerance).
 * Used to bypass validation on updates where the time didn't change.
 * @param {string} newDt - New datetime (ISO string)
 * @param {string} oldDt - Old datetime (ISO string)
 * @param {number} toleranceSeconds - Tolerance in seconds (default 60)
 * @returns {boolean}
 */
export const isUnchanged = (newDt, oldDt, toleranceSeconds = 60) => {
  if (!newDt || !oldDt) return false;
  try {
    const newDayjs = dayjs.isDayjs(newDt) ? newDt : dayjs(newDt);
    const oldDayjs = dayjs.isDayjs(oldDt) ? oldDt : dayjs(oldDt);
    if (!newDayjs.isValid() || !oldDayjs.isValid()) return false;
    const diffMs = Math.abs(newDayjs.diff(oldDayjs));
    return diffMs <= toleranceSeconds * 1000;
  } catch {
    return false;
  }
};

/**
 * Validate times for non-multiday events.
 *
 * Rules:
 * - start_date must be today or a future date (in user's timezone)
 * - if start_date == today: start_time >= now + 30 minutes
 * - if start_date > today: any time 00:00–23:59 is allowed
 * - end_time must always be greater than start_time
 *
 * @param {string} startDate - YYYY-MM-DD in user's timezone
 * @param {string} startTime - HH:mm in user's timezone
 * @param {string} endDate - YYYY-MM-DD in user's timezone (same as startDate for non-multiday)
 * @param {string} endTime - HH:mm in user's timezone
 * @param {string} tzName - IANA timezone name
 * @param {Object} existingEvent - Existing event object (for PATCH). null for POST.
 * @returns {Object} { valid: boolean, errors: { field: message } }
 */
export const validateNonMultidayEvent = (
  startDate,
  startTime,
  endDate,
  endTime,
  tzName,
  existingEvent = null
) => {
  const errors = {};
  const { nowLocal, today } = getLocalNow(tzName);
  const minStartLocal = nowLocal.add(30, "minute");

  // Check: start_date must be today or future
  if (startDate && startTime) {
    if (startDate < today) {
      // Past date
      const existingStart = existingEvent?.start_time;
      if (!isUnchanged(dayjs(`${startDate}T${startTime}`), existingStart)) {
        errors.startDate = "Event date cannot be in the past.";
      }
    } else if (startDate === today) {
      // Today: must be at least 30 minutes ahead
      const startLocal = dayjs.tz(`${startDate}T${startTime}:00`, tzName);
      if (startLocal.isBefore(minStartLocal)) {
        const existingStart = existingEvent?.start_time;
        if (!isUnchanged(startLocal, existingStart)) {
          errors.startTime =
            "Start time must be at least 30 minutes from now when the event is scheduled for today.";
        }
      }
    }
    // else: startDate > today — any time is valid; no restriction
  }

  // Check: end_time > start_time
  if (startDate && startTime && endDate && endTime) {
    const startLocal = dayjs.tz(`${startDate}T${startTime}:00`, tzName);
    const endLocal = dayjs.tz(`${endDate}T${endTime}:00`, tzName);
    if (!endLocal.isAfter(startLocal)) {
      errors.endTime = "End time must be after start time.";
      if (!errors.endDate) errors.endDate = "End time must be after start time.";
    }
  }

  // Check: if end_time provided, start_time must also be provided
  if ((endDate || endTime) && (!startDate || !startTime)) {
    errors.startDate = errors.startDate || "Provide start date and time when setting end time.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validate times for multiday events.
 *
 * Rules:
 * - start_date >= today (in user's timezone)
 * - end_date >= start_date (date-level comparison)
 *
 * @param {string} startDate - YYYY-MM-DD in user's timezone
 * @param {string} startTime - HH:mm in user's timezone
 * @param {string} endDate - YYYY-MM-DD in user's timezone
 * @param {string} endTime - HH:mm in user's timezone
 * @param {string} tzName - IANA timezone name
 * @param {Object} existingEvent - Existing event object (for PATCH). null for POST.
 * @returns {Object} { valid: boolean, errors: { field: message } }
 */
export const validateMultidayEvent = (
  startDate,
  startTime,
  endDate,
  endTime,
  tzName,
  existingEvent = null
) => {
  const errors = {};
  const { today } = getLocalNow(tzName);

  // Check: start_date >= today
  if (startDate && startTime) {
    if (startDate < today) {
      const existingStart = existingEvent?.start_time;
      if (!isUnchanged(dayjs(`${startDate}T${startTime}`), existingStart)) {
        errors.startDate = "Event start date must be today or a future date.";
      }
    }
  }

  // Check: end_date >= start_date (date-level)
  if (startDate && endDate) {
    if (endDate < startDate) {
      errors.endDate = "Event end date must be on or after the start date.";
    }
  }

  // Check: if end_date/end_time provided, start_date/start_time must also be provided
  if ((endDate || endTime) && (!startDate || !startTime)) {
    errors.startDate = errors.startDate || "Provide start date and time when setting end date and time.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validate session times within an event.
 *
 * Rules:
 * - end_time must be greater than start_time
 * - Session times must be within event boundaries
 * - If the event is a single-day event scheduled for today:
 *   - session start_time >= now + 30 minutes
 * - If the event is scheduled for a future date:
 *   - sessions can start at any time (within event bounds)
 *
 * @param {string} sessionStartDate - YYYY-MM-DD in user's timezone
 * @param {string} sessionStartTime - HH:mm in user's timezone
 * @param {string} sessionEndDate - YYYY-MM-DD in user's timezone
 * @param {string} sessionEndTime - HH:mm in user's timezone
 * @param {string} eventStartDate - YYYY-MM-DD event start (in user's timezone)
 * @param {string} eventEndDate - YYYY-MM-DD event end (in user's timezone)
 * @param {string} tzName - IANA timezone name
 * @param {Object} existingSession - Existing session object (for PATCH). null for POST.
 * @returns {Object} { valid: boolean, errors: { field: message } }
 */
export const validateSessionTimes = (
  sessionStartDate,
  sessionStartTime,
  sessionEndDate,
  sessionEndTime,
  eventStartDate,
  eventEndDate,
  tzName,
  existingSession = null,
  isMultiDay = false
) => {
  const errors = {};
  const { nowLocal, today } = getLocalNow(tzName);
  const minStartLocal = nowLocal.add(30, "minute");

  // Rule: end > start (required early check)
  if (sessionStartDate && sessionStartTime && sessionEndDate && sessionEndTime) {
    const sessStartLocal = dayjs.tz(`${sessionStartDate}T${sessionStartTime}:00`, tzName);
    const sessEndLocal = dayjs.tz(`${sessionEndDate}T${sessionEndTime}:00`, tzName);

    if (!sessEndLocal.isAfter(sessStartLocal)) {
      errors.sessionEndTime = "Session end time must be after start time.";
      return { valid: false, errors };
    }
  }

  const isSingleDayToday =
    eventStartDate && eventEndDate && eventStartDate === eventEndDate && eventStartDate === today;

  // Check: if event is single-day today, apply 30-minute buffer and end-of-day cap
  if (isSingleDayToday) {
    if (sessionStartDate && sessionStartTime) {
      const sessStartLocal = dayjs.tz(`${sessionStartDate}T${sessionStartTime}:00`, tzName);

      if (sessStartLocal.isBefore(minStartLocal)) {
        const existingStart = existingSession?.start_time;
        if (!isUnchanged(sessStartLocal, existingStart)) {
          errors.sessionStartTime =
            "Session start time must be at least 30 minutes from now for an event scheduled today.";
        }
      }
    }

    if (sessionEndDate && sessionEndTime) {
      const sessEndLocal = dayjs.tz(`${sessionEndDate}T${sessionEndTime}:00`, tzName);
      const endOfDayLocal = dayjs.tz(`${today}T23:59:59`, tzName);
      if (sessEndLocal.isAfter(endOfDayLocal)) {
        errors.sessionEndTime =
          "Session end time must be no later than 23:59 for an event scheduled today.";
      }
    }
  }

  if (isMultiDay) {
    // Multi-day: validate by date range only (00:00–23:59 each day)
    if (eventStartDate && sessionStartDate && sessionStartDate < eventStartDate) {
      errors.sessionStartTime = "Session cannot start before the event start date.";
    }
    if (eventEndDate && sessionEndDate && sessionEndDate > eventEndDate) {
      errors.sessionEndTime = "Session cannot end after the event end date.";
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};
