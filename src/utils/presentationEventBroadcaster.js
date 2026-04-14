/**
 * presentationEventBroadcaster.js
 * Broadcasts presentation events to all participants
 * Ensures all devices know when presentation changes
 */

export function broadcastPresentationTarget(dyteMeeting, targetParticipant, byHostId) {
  if (!dyteMeeting?.participants?.broadcastMessage) {
    console.warn("[PresentationBroadcaster] Cannot broadcast - broadcastMessage not available");
    return false;
  }

  try {
    const message = {
      type: "presentation-target",
      participantId: targetParticipant?.id,
      participantUserId: targetParticipant?.customParticipantId || targetParticipant?.userId,
      participantName: targetParticipant?.name,
      byHostId: byHostId,
      ts: Date.now(),
    };

    dyteMeeting.participants.broadcastMessage("presentation-target", message);
    console.log("[PresentationBroadcaster] Broadcast presentation-target:", message);
    return true;
  } catch (error) {
    console.error("[PresentationBroadcaster] Failed to broadcast presentation-target:", error);
    return false;
  }
}

export function broadcastPresentationClear(dyteMeeting) {
  if (!dyteMeeting?.participants?.broadcastMessage) {
    console.warn("[PresentationBroadcaster] Cannot broadcast - broadcastMessage not available");
    return false;
  }

  try {
    dyteMeeting.participants.broadcastMessage("presentation-clear", {
      type: "presentation-clear",
      ts: Date.now(),
    });
    console.log("[PresentationBroadcaster] Broadcast presentation-clear");
    return true;
  } catch (error) {
    console.error("[PresentationBroadcaster] Failed to broadcast presentation-clear:", error);
    return false;
  }
}

/**
 * When granting presentation to a user, call this function
 * Example usage in your grant presentation handler:
 *
 * const targetParticipant = dyteMeeting.participants.joined.get(participantId);
 * broadcastPresentationTarget(dyteMeeting, targetParticipant, dyteMeeting.self?.id);
 */

/**
 * When revoking presentation, call this function
 * Example usage:
 *
 * broadcastPresentationClear(dyteMeeting);
 */
