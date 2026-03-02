import React from "react";
import dayjs from "dayjs";

/**
 * Determines the "Join Live" button state for an event
 * Works for both single-day and multi-day events
 *
 * @param {Object} event - Event object with is_multi_day, sessions, start_time, end_time
 * @param {Date} currentTime - Current time for testing (defaults to now)
 * @returns {Object} - Join state with buttonText, enabled, status, sessionName, sessionId
 */
export const determineJoinState = (event, currentTime = new Date()) => {
  if (!event) {
    return {
      buttonText: "Loading...",
      enabled: false,
      status: "no_event",
      sessionName: null,
      sessionId: null,
    };
  }

  // ===== SINGLE-DAY EVENT LOGIC (UNCHANGED) =====
  if (!event.is_multi_day) {
    return getSingleDayJoinState(event, currentTime);
  }

  // ===== MULTI-DAY EVENT LOGIC =====
  const sessions = event.sessions || [];

  // DEBUG: Log session data
  console.log(`[determineJoinState] Event ${event.id} (${event.title}):`, {
    is_multi_day: event.is_multi_day,
    sessions_count: sessions.length,
    sessions: sessions.map(s => ({ id: s.id, title: s.title, start: s.start_time, end: s.end_time })),
    currentTime,
  });

  if (sessions.length === 0) {
    console.warn(`[determineJoinState] Event ${event.id} has no sessions!`);
    return {
      buttonText: "No Sessions Created",
      enabled: false,
      status: "no_sessions",
      sessionName: null,
      sessionId: null,
    };
  }

  const currentDateTime = new Date(currentTime);
  const GRACE_PERIOD_MS = 15 * 60 * 1000; // 15 minutes

  // Sort sessions by start_time to ensure proper ordering
  const sortedSessions = [...sessions].sort((a, b) =>
    new Date(a.start_time) - new Date(b.start_time)
  );

  // Find current session, next session, and last session
  let currentSession = null;
  let nextSession = null;
  const lastSession = sortedSessions[sortedSessions.length - 1];

  for (let i = 0; i < sortedSessions.length; i++) {
    const session = sortedSessions[i];
    const startTime = new Date(session.start_time);
    const endTime = new Date(session.end_time);

    // Check if currently IN a session
    if (currentDateTime >= startTime && currentDateTime < endTime) {
      currentSession = session;
      break;
    }

    // Check if session is upcoming (first upcoming)
    if (currentDateTime < startTime && !nextSession) {
      nextSession = session;
    }
  }

  // ===== DETERMINE BUTTON STATE =====

  // Case 1: Currently in an active session
  if (currentSession) {
    return {
      buttonText: `Join ${currentSession.title || "Session"}`,
      enabled: true,
      status: "in_session",
      sessionName: currentSession.title,
      sessionId: currentSession.id,
    };
  }

  // Case 2: Next session coming up soon (within 15 minutes)
  if (nextSession) {
    const startTime = new Date(nextSession.start_time);
    const timeUntilStart = startTime - currentDateTime;

    if (timeUntilStart <= GRACE_PERIOD_MS && timeUntilStart > 0) {
      // Within grace period before session
      return {
        buttonText: `Join ${nextSession.title || "Session"}`,
        enabled: true,
        status: "session_starting_soon",
        sessionName: nextSession.title,
        sessionId: nextSession.id,
      };
    }

    // Session coming up but not within 15 minutes
    return {
      buttonText: `Waiting for ${nextSession.title || "Next Session"}`,
      enabled: false,
      status: "waiting_for_session",
      sessionName: nextSession.title,
      sessionId: null,
    };
  }

  // Case 3: No upcoming sessions
  // Check if event itself has ended
  const eventEndTime = new Date(event.end_time);
  const eventHasEnded = currentDateTime >= eventEndTime ||
                        event.is_live === false ||
                        event.status === "ended";

  if (eventHasEnded) {
    return {
      buttonText: "Event Ended",
      enabled: false,
      status: "event_ended",
      sessionName: null,
      sessionId: null,
    };
  }

  // Case 4: After the last session
  const lastSessionEndTime = new Date(lastSession.end_time);
  if (currentDateTime > lastSessionEndTime) {
    // All sessions have ended
    return {
      buttonText: "Event Ended",
      enabled: false,
      status: "event_ended",
      sessionName: null,
      sessionId: null,
    };
  }

  // Default fallback
  return {
    buttonText: "Loading...",
    enabled: false,
    status: "unknown",
    sessionName: null,
    sessionId: null,
  };
};

/**
 * Single-day event logic (KEEP EXISTING)
 * Event is live 10-15 minutes before start until end time
 */
function getSingleDayJoinState(event, currentTime) {
  const eventStart = new Date(event.start_time);
  const eventEnd = new Date(event.end_time);
  const GRACE_PERIOD_MS = 15 * 60 * 1000; // 15 minutes

  const timeUntilStart = eventStart - currentTime;
  const timeUntilEnd = eventEnd - currentTime;

  // Event hasn't started yet
  if (currentTime < eventStart) {
    if (timeUntilStart <= GRACE_PERIOD_MS) {
      return {
        buttonText: "Join Live",
        enabled: true,
        status: "event_starting_soon",
        sessionName: event.title,
        sessionId: null,
      };
    }
    return {
      buttonText: "Event Not Started",
      enabled: false,
      status: "waiting_for_event",
      sessionName: event.title,
      sessionId: null,
    };
  }

  // Event is ongoing
  if (currentTime >= eventStart && currentTime < eventEnd) {
    return {
      buttonText: "Join Live",
      enabled: true,
      status: "event_live",
      sessionName: event.title,
      sessionId: null,
    };
  }

  // Event has ended
  return {
    buttonText: "Event Ended",
    enabled: false,
    status: "event_ended",
    sessionName: null,
    sessionId: null,
  };
}

/**
 * React Hook to poll and update join state every 10 seconds
 * Automatically updates button state without requiring page refresh
 */
export const useJoinLiveState = (event) => {
  const [joinState, setJoinState] = React.useState(() =>
    determineJoinState(event)
  );

  React.useEffect(() => {
    if (!event) return;

    // Update immediately
    setJoinState(determineJoinState(event));

    // Poll every 10 seconds to update button state
    const interval = setInterval(() => {
      setJoinState(determineJoinState(event));
    }, 10000);

    return () => clearInterval(interval);
  }, [event]);

  return joinState;
};
