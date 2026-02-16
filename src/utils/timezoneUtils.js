import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Detects the user's browser timezone using the Intl API
 * @returns {string} The timezone string (e.g., 'America/New_York')
 */
export const getBrowserTimezone = () => {
  if (typeof Intl !== "undefined" && Intl.DateTimeFormat) {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (e) {
      console.warn("Failed to detect timezone:", e);
      return "UTC";
    }
  }
  return "UTC";
};

/**
 * Formats session times for multi-day events
 * Returns array of formatted session strings with timezone awareness
 * For single-day events, returns null to use event-level time display
 *
 * @param {Object} event - Event object with is_multi_day and sessions fields
 * @param {string} organizerTimezone - Organizer's timezone
 * @returns {Array|null} Array of formatted session strings or null for single-day events
 *
 * Example output for multi-day:
 * [
 *   "Session 1: Feb 14, 2026 | 10:00 AM – 11:00 AM",
 *   "Session 2: Feb 15, 2026 | 2:00 PM – 3:00 PM"
 * ]
 */
export const formatSessionTimes = (event, organizerTimezone) => {
  // Only format sessions for multi-day events
  if (!event?.is_multi_day || !event?.sessions || event.sessions.length === 0) {
    return null;
  }

  const dateFormat = "MMM D, YYYY";
  const timeFormat = "h:mm A";

  try {
    return event.sessions
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
      .map((session, index) => {
        // Session timing in organizer's timezone
        const startObj = (session.start_time && organizerTimezone)
          ? dayjs(session.start_time).tz(organizerTimezone)
          : dayjs(session.start_time);
        const endObj = (session.end_time && organizerTimezone)
          ? dayjs(session.end_time).tz(organizerTimezone)
          : dayjs(session.end_time);

        const dateStr = startObj.format(dateFormat);
        const timeRangeStr = `${startObj.format(timeFormat)} – ${endObj.format(timeFormat)}`;

        // Use session title if available, otherwise use index
        const sessionLabel = session.title || `Session ${index + 1}`;
        return `${sessionLabel}: ${dateStr} | ${timeRangeStr}`;
      });
  } catch (error) {
    console.warn("Error formatting session times:", error);
    return null;
  }
};

/**
 * Gets formatted display string for session times (for displaying in UI)
 * Shows multiple sessions separated by newlines or custom separator
 *
 * @param {Object} event - Event object with is_multi_day and sessions fields
 * @param {string} organizerTimezone - Organizer's timezone
 * @param {string} separator - String to separate multiple sessions (default: "\n")
 * @returns {string|null} Formatted session string or null for single-day events
 */
export const getSessionTimesDisplay = (event, organizerTimezone, separator = "\n") => {
  const sessions = formatSessionTimes(event, organizerTimezone);
  return sessions ? sessions.join(separator) : null;
};

/**
 * Gets the next upcoming session for a multi-day event
 * Returns formatted string for the nearest future session, or null if no upcoming sessions
 * Past sessions are excluded
 *
 * @param {Object} event - Event object with is_multi_day and sessions fields
 * @param {string} organizerTimezone - Organizer's timezone
 * @returns {string|null} Formatted next session string or null
 *
 * Example output:
 * "Feb 15, 2026 | 2:00 PM – 3:00 PM"
 */
export const getNextUpcomingSession = (event, organizerTimezone) => {
  // Only for multi-day events with sessions
  if (!event?.is_multi_day || !event?.sessions || event.sessions.length === 0) {
    console.warn("[getNextUpcomingSession] Event is not multi-day or has no sessions:", {
      is_multi_day: event?.is_multi_day,
      sessions_present: !!event?.sessions,
      sessions_length: event?.sessions?.length,
    });
    return null;
  }

  const now = new Date();
  const dateFormat = "MMM D, YYYY";
  const timeFormat = "h:mm A";

  try {
    // Sort sessions by start time
    const sortedSessions = [...event.sessions]
      .filter((s) => s && s.start_time && s.end_time) // Filter out invalid sessions
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

    console.log("[getNextUpcomingSession] Sorted sessions:", {
      count: sortedSessions.length,
      sessions: sortedSessions.map((s) => ({
        title: s.title,
        start_time: s.start_time,
        end_time: s.end_time,
      })),
    });

    // Find the first session that hasn't ended yet
    const nextSession = sortedSessions.find((session) => {
      const sessionEndTime = new Date(session.end_time);
      const hasEnded = sessionEndTime <= now;
      console.log(`[getNextUpcomingSession] Checking session "${session.title}":`, {
        end_time: session.end_time,
        sessionEndTime: sessionEndTime.toISOString(),
        now: now.toISOString(),
        hasEnded,
      });
      return !hasEnded; // Return true if session hasn't ended
    });

    if (!nextSession) {
      console.log("[getNextUpcomingSession] No upcoming sessions found - all have ended");
      return null;
    }

    console.log("[getNextUpcomingSession] Found next session:", nextSession.title);

    // Format the next session
    const startObj = (nextSession.start_time && organizerTimezone)
      ? dayjs(nextSession.start_time).tz(organizerTimezone)
      : dayjs(nextSession.start_time);
    const endObj = (nextSession.end_time && organizerTimezone)
      ? dayjs(nextSession.end_time).tz(organizerTimezone)
      : dayjs(nextSession.end_time);

    const dateStr = startObj.format(dateFormat);
    const timeRangeStr = `${startObj.format(timeFormat)} – ${endObj.format(timeFormat)}`;

    const formatted = `${dateStr} | ${timeRangeStr}`;
    console.log("[getNextUpcomingSession] Formatted result:", formatted);
    return formatted;
  } catch (error) {
    console.error("[getNextUpcomingSession] Error occurred:", error, {
      event_title: event?.title,
      timezone: organizerTimezone,
      sessions_count: event?.sessions?.length,
    });
    return null;
  }
};
