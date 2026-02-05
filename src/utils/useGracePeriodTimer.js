import { useEffect, useState } from 'react';

/**
 * Custom React hook to trigger re-renders based on grace period state changes
 *
 * This hook ensures that the join button text updates from "Join Live" to
 * "Join Waiting Room" when the grace period expires, by forcing a re-render
 * at the appropriate times.
 *
 * @param {Object} event - Event object with grace period configuration
 * @returns {number} Tick count (used to trigger re-renders)
 *
 * @example
 * function EventCard({ event }) {
 *   const gracePeriodTick = useGracePeriodTimer(event);
 *   // Component will re-render when grace period state changes
 *   return <Button>{getJoinButtonText(event, isLive, isJoining)}</Button>;
 * }
 */
export function useGracePeriodTimer(event) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    // Only set up timer if event has grace period configuration
    if (!event || !event.waiting_room_enabled || !event.start_time) {
      return; // No grace period to monitor
    }

    // Calculate grace period boundaries
    const startTime = new Date(event.start_time).getTime();
    const gracePeriodMinutes = event.waiting_room_grace_period_minutes ?? 10;
    if (gracePeriodMinutes <= 0) return;
    const gracePeriodMs = gracePeriodMinutes * 60 * 1000;
    const gracePeriodEnd = startTime + gracePeriodMs;

    // Set up interval to check grace period state
    const interval = setInterval(() => {
      const now = Date.now();

      // We need to re-render in these scenarios:
      // 1. Before event start (to show "Join")
      // 2. Event just started (to show "Join Live")
      // 3. During grace period (to show "Join Live")
      // 4. Grace period just expired (to show "Join Waiting Room")
      // 5. Well after grace period (to keep showing "Join Waiting Room")

      // Calculate time until key moments
      const timeToStart = startTime - now;
      const timeToGracePeriodEnd = gracePeriodEnd - now;

      // Re-render if we're within the "action zone" (2 min before to 2 min after key times)
      // This catches the button text changes with good precision
      const isNearStart = timeToStart > -120000 && timeToStart < 60000; // 2 min before to 1 min after
      const isNearGracePeriodEnd = timeToGracePeriodEnd > -60000 && timeToGracePeriodEnd < 60000; // 1 min before/after

      if (isNearStart || isNearGracePeriodEnd) {
        setTick(prev => prev + 1);
      }
    }, 1000); // Check every second

    return () => clearInterval(interval);
  }, [event?.id, event?.start_time, event?.waiting_room_enabled, event?.waiting_room_grace_period_minutes]);

  return tick;
}

/**
 * Alternative hook for simple 1-second tick (if you want all components to refresh every second)
 * Use this for pages where multiple events might have active grace periods
 * @returns {number} Tick count that increments every second
 */
export function useSecondTick() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return tick;
}
