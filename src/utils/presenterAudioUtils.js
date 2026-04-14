/**
 * presenterAudioUtils.js
 * Utility functions for presenter audio management
 */

/**
 * Intercept getDisplayMedia to capture the returned stream
 * Returns the captured stream for audio processing
 */
export async function captureDisplayMediaWithAudio(constraints = {}) {
  return new Promise((resolve, reject) => {
    let capturedStream = null;

    // Store original getDisplayMedia
    const originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia.bind(
      navigator.mediaDevices
    );

    // Replace with interceptor
    navigator.mediaDevices.getDisplayMedia = async (displayConstraints) => {
      try {
        const stream = await originalGetDisplayMedia({
          ...displayConstraints,
          audio: true,
        });
        capturedStream = stream;
        return stream;
      } catch (error) {
        reject(error);
        throw error;
      }
    };

    // Return a callback to restore and get the captured stream
    resolve({
      capturedStream: () => capturedStream,
      restore: () => {
        navigator.mediaDevices.getDisplayMedia = originalGetDisplayMedia;
      },
    });
  });
}

/**
 * Setup getDisplayMedia interception for a single call
 * Auto-restores after the displayMedia call is complete
 */
export async function withDisplayMediaInterception(displayMediaFn) {
  const originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia.bind(
    navigator.mediaDevices
  );
  let capturedStream = null;

  // Replace getDisplayMedia
  navigator.mediaDevices.getDisplayMedia = async (constraints) => {
    const stream = await originalGetDisplayMedia({
      ...constraints,
      audio: true,
    });
    capturedStream = stream;
    return stream;
  };

  try {
    // Execute the display media function
    const result = await displayMediaFn();

    // Restore getDisplayMedia
    navigator.mediaDevices.getDisplayMedia = originalGetDisplayMedia;

    return { result, capturedStream };
  } catch (error) {
    // Restore getDisplayMedia even on error
    navigator.mediaDevices.getDisplayMedia = originalGetDisplayMedia;
    throw error;
  }
}

/**
 * Extract user ID from JWT token
 */
export function getMyUserIdFromJwt() {
  try {
    const token = localStorage.getItem("access_token") || localStorage.getItem("access");
    if (!token) return null;

    const payload = token.split(".")[1];
    if (!payload) return null;

    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const json = JSON.parse(atob(padded));

    return json.user_id ?? json.id ?? json.sub ?? null;
  } catch {
    return null;
  }
}

/**
 * Get participant user key for identification
 */
export function getParticipantUserKey(participant) {
  if (!participant) return "";

  const raw = participant?._raw || participant || {};
  return (
    raw.customParticipantId ||
    raw.customParticipant_id ||
    raw.clientSpecificId ||
    raw.client_specific_id ||
    raw.userId ||
    raw.user_id ||
    raw.uid ||
    raw.id ||
    participant.id ||
    ""
  );
}

/**
 * Check if a participant is the current user
 */
export function isCurrentUser(participant, myUserId) {
  if (!participant || !myUserId) return false;

  const participantKey = getParticipantUserKey(participant);
  const expectedKey = `id:${myUserId}`;

  return (
    participantKey === expectedKey ||
    participantKey === myUserId ||
    String(participantKey) === String(myUserId)
  );
}

/**
 * Format audio volume value for display (0-100)
 */
export function formatVolumeForDisplay(value) {
  const normalized = Math.max(0, Math.min(1, Number(value) || 0));
  return Math.round(normalized * 100);
}

/**
 * Parse volume from display format (0-100) to internal (0-1)
 */
export function parseVolumeFromDisplay(displayValue) {
  const value = Number(displayValue) || 0;
  return Math.max(0, Math.min(1, value / 100));
}

/**
 * Log presenter audio action
 */
export function logPresenterAudioAction(action, details = {}) {
  const timestamp = new Date().toISOString();
  const log = {
    timestamp,
    action,
    ...details,
  };
  console.log("[PresenterAudio]", log);
}

/**
 * Validate presenter state
 */
export function isValidPresenterState(presenter) {
  return (
    presenter &&
    typeof presenter === "object" &&
    (presenter.id || presenter.participantId) &&
    presenter.name
  );
}

/**
 * Create presenter state snapshot
 */
export function createPresenterSnapshot(participant, audioState = {}) {
  return {
    participantId: participant?.id,
    participantName: participant?.name,
    participantUserId: getParticipantUserKey(participant),
    audioEnabled: audioState.enabled || false,
    audioVolume: audioState.volume || 1.0,
    timestamp: Date.now(),
  };
}

/**
 * Merge presenter states (for multi-presenter tracking)
 */
export function mergePresenterStates(existing = {}, incoming = {}) {
  return {
    ...existing,
    ...incoming,
    timestamp: Date.now(),
  };
}

/**
 * Create error report for audio issues
 */
export function createAudioErrorReport(error, context = {}) {
  return {
    error: error?.message || String(error),
    stack: error?.stack,
    context,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
  };
}
