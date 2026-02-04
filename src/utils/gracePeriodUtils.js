/**
 * Grace Period Utilities
 *
 * Determines if an event's grace period is active and provides appropriate UI text
 * for join buttons based on grace period and waiting room status.
 */

/**
 * Check if grace period is currently active for an event
 * @param {Object} event - Event object with start_time, waiting_room_grace_period_minutes, waiting_room_enabled
 * @returns {Boolean} true if grace period is currently active
 */
export function isGracePeriodActive(event) {
  if (!event) return false;
  if (!event.waiting_room_enabled) return false;
  if (!event.start_time) return false;

  const gracePeriodMinutes = event.waiting_room_grace_period_minutes || 10;
  if (!gracePeriodMinutes || gracePeriodMinutes < 0) return false;

  const now = Date.now();
  const startTime = new Date(event.start_time).getTime();
  const gracePeriodMs = gracePeriodMinutes * 60 * 1000;
  const gracePeriodEnd = startTime + gracePeriodMs;

  // Grace period is active if: start_time <= now < start_time + grace_period
  // The end boundary is EXCLUSIVE (at exactly grace_period_end, grace period has ended)
  return now >= startTime && now < gracePeriodEnd;
}

/**
 * Check if user will be sent to waiting room on join
 * @param {Object} event - Event object
 * @returns {Boolean} true if waiting room will be required
 */
export function willGoToWaitingRoom(event) {
  if (!event) return false;
  if (!event.waiting_room_enabled) return false;
  if (isGracePeriodActive(event)) return false; // Grace period allows direct join

  return true; // Waiting room enabled and grace period not active
}

/**
 * Determine appropriate button text for event join button
 * @param {Object} event - Event object with timing and waiting room info
 * @param {Boolean} isLive - Is event currently live?
 * @param {Boolean} isJoining - Is user currently joining?
 * @returns {String} Button text to display
 */
export function getJoinButtonText(event, isLive, isJoining) {
  if (isJoining) return "Joining…";

  if (!event) return "Join";

  // If waiting room will be required (e.g. grace period expired or event hasn't started),
  // always reflect that in the button label wherever a join option is shown.
  if (willGoToWaitingRoom(event)) {
    return "Join Waiting Room";
  }

  // Event is live (or within early-join windows that allow direct join)
  if (isLive) return "Join Live";

  return "Join";
}

/**
 * Get grace period end time for an event
 * @param {Object} event - Event object
 * @returns {Date|null} End time of grace period, or null if not applicable
 */
export function getGracePeriodEndTime(event) {
  if (!event || !event.start_time || !event.waiting_room_enabled) return null;

  const gracePeriodMinutes = event.waiting_room_grace_period_minutes || 10;
  const startTime = new Date(event.start_time);
  const endTime = new Date(startTime.getTime() + gracePeriodMinutes * 60 * 1000);

  return endTime;
}

/**
 * Get time remaining in grace period (in seconds)
 * @param {Object} event - Event object
 * @returns {Number} Seconds remaining, or 0 if grace period not active
 */
export function getGracePeriodSecondsRemaining(event) {
  if (!isGracePeriodActive(event)) return 0;

  const gracePeriodEnd = getGracePeriodEndTime(event);
  if (!gracePeriodEnd) return 0;

  const secondsRemaining = Math.floor((gracePeriodEnd.getTime() - Date.now()) / 1000);
  return Math.max(0, secondsRemaining);
}

/**
 * Get human-readable description of join behavior
 * @param {Object} event - Event object
 * @returns {String} Description of what will happen when user joins
 */
export function getJoinBehaviorDescription(event) {
  if (!event) return "";

  if (isGracePeriodActive(event)) {
    const secondsRemaining = getGracePeriodSecondsRemaining(event);
    const minutesRemaining = Math.ceil(secondsRemaining / 60);
    return `Grace period active: you can join directly for ${minutesRemaining} more minute${minutesRemaining !== 1 ? 's' : ''}`;
  }

  if (event.waiting_room_enabled) {
    return "Waiting room is active: you will need host approval to join";
  }

  return "You can join directly";
}

/**
 * Check if event grace period configuration is valid
 * @param {Object} event - Event object
 * @returns {Boolean} true if grace period is properly configured
 */
export function isGracePeriodConfigured(event) {
  if (!event) return false;
  if (!event.waiting_room_enabled) return false;
  if (!event.start_time) return false;
  if (event.waiting_room_grace_period_minutes === undefined || event.waiting_room_grace_period_minutes === null) return false;

  return true;
}
