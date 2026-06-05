/**
 * ✅ Live Join Gate - Prevents non-critical APIs during RTK room join burst
 *
 * During the first 2-5 minutes of a live meeting, we want ONLY critical APIs to run:
 * - /api/events/<id>/rtk/join/
 * - /api/events/<id>/live/rejoin/
 * - /api/events/<id>/live-context/
 * - /ws/events/<id>/ (WebSocket)
 *
 * All other APIs (notifications, messaging, metrics, etc.) should defer until:
 * 1. roomJoined = true, AND
 * 2. User is not on a /live/ route, OR
 * 3. User explicitly opens a panel that needs that data
 *
 * Usage in polling hooks:
 *
 *   useEffect(() => {
 *     if (isLiveJoinCriticalPhase()) return;  // Skip during join burst
 *     // ... fetch notifications, etc
 *   }, [deps]);
 */

/**
 * Check if we're in the critical join phase
 * Returns true if:
 * - User is on a /live/ route AND
 * - RTK room has not joined yet
 */
export const isLiveJoinCriticalPhase = () => {
  const onLiveRoute = window.location.pathname.includes("/live/");
  const roomJoined = window.__ECP_ROOM_JOINED__ === true;

  return onLiveRoute && !roomJoined;
};

/**
 * Guard function to use at the start of polling useEffects
 *
 * Usage:
 *   useEffect(() => {
 *     if (shouldSkipDuringLiveJoin()) return;
 *     // ... fetch non-critical API
 *   }, [deps]);
 */
export const shouldSkipDuringLiveJoin = isLiveJoinCriticalPhase;

/**
 * Check if a given URL path is critical for live join
 * Critical paths should run even during join burst
 */
export const isCriticalLiveApi = (urlPath) => {
  const critical = [
    "/api/events/",  // All event endpoints
    "/ws/events/",   // WebSocket
  ];

  // More specific critical paths
  const specificCritical = [
    "/rtk/join/",
    "/live/rejoin/",
    "/live-context/",
  ];

  // Check general paths
  if (critical.some(path => urlPath.includes(path))) {
    // Check if it's one of the specific critical endpoints
    if (specificCritical.some(path => urlPath.includes(path))) {
      return true;
    }

    // If it's another event endpoint during live, it's non-critical
    if (urlPath.includes("/events/") && !specificCritical.some(path => urlPath.includes(path))) {
      return false;
    }
  }

  // Non-event APIs during live join are non-critical
  return false;
};

/**
 * Comprehensive guard: skip if:
 * 1. On a /live/ route AND room not joined yet, OR
 * 2. On a /live/ route AND this is not a critical API endpoint
 */
export const shouldDeferNonCriticalApi = (urlPath = "") => {
  if (!isLiveJoinCriticalPhase()) {
    // We're either not on /live/ or room is already joined
    return false;
  }

  // We're in critical phase - only allow critical APIs
  if (isCriticalLiveApi(urlPath)) {
    return false;
  }

  // Non-critical API during critical phase - defer it
  return true;
};
