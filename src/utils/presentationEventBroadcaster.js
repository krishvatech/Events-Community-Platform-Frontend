/**
 * presentationEventBroadcaster.js
 * Broadcasts presentation events to all participants
 * Ensures all devices know when presentation changes
 */

export function broadcastPresentationTarget(rtkMeeting, targetParticipant, byHostId) {
  if (!rtkMeeting?.participants?.broadcastMessage) {
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

    rtkMeeting.participants.broadcastMessage("presentation-target", message);
    console.log("[PresentationBroadcaster] Broadcast presentation-target:", message);
    return true;
  } catch (error) {
    console.error("[PresentationBroadcaster] Failed to broadcast presentation-target:", error);
    return false;
  }
}

export function broadcastPresentationClear(rtkMeeting) {
  if (!rtkMeeting?.participants?.broadcastMessage) {
    console.warn("[PresentationBroadcaster] Cannot broadcast - broadcastMessage not available");
    return false;
  }

  try {
    rtkMeeting.participants.broadcastMessage("presentation-clear", {
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
 * const targetParticipant = rtkMeeting.participants.joined.get(participantId);
 * broadcastPresentationTarget(rtkMeeting, targetParticipant, rtkMeeting.self?.id);
 */

/**
 * When revoking presentation, call this function
 * Example usage:
 *
 * broadcastPresentationClear(rtkMeeting);
 */
