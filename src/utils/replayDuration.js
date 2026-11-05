const DURATION_PATTERN = /^\s*(\d+)\s*(?:(day|month|year)s?)?\s*$/i;
const UNIT_DAYS = { day: 1, month: 30, year: 365 };

// replay_availability_duration is free text: the event forms store "14 Days",
// "6 Months", "1 Year" or "Unlimited", and the recording page stores a bare day
// count such as "30". Returns the number of days, or null if it never expires.
// Keep in step with get_replay_expiration in ecp-backend/events/tasks.py.
export function replayDurationToDays(value) {
  const match = DURATION_PATTERN.exec(String(value ?? ''));
  if (!match) return null;
  const days = Number(match[1]) * UNIT_DAYS[(match[2] || 'day').toLowerCase()];
  return days > 0 ? days : null;
}
