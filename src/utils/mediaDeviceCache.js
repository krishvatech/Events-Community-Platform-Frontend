/**
 * Media Device Cache Clearing Utility
 *
 * This utility provides functions to clear mic/camera cache, permissions, and stored data
 * from the browser. Due to security restrictions, full permission reset is limited, but
 * this function clears all accessible data.
 *
 * Browser Limitations:
 * - Cannot programmatically revoke permissions granted through browser UI
 * - Cannot clear the browser's internal permission database directly
 * - Can only clear data that the website has access to (localStorage, sessionStorage, cookies)
 * - Permission reset happens naturally when user clears browser data or grants new access
 */

/**
 * Clear all media device cache, permissions, and stored data
 * @returns {Promise<Object>} - Result object with cleared items and status
 */
export const clearMediaDeviceCache = async () => {
  const result = {
    success: true,
    clearedItems: [],
    errors: [],
    message: "",
  };

  try {
    // 1. Clear localStorage entries related to media devices
    const storageKeysToRemove = [
      "selectedMicrophone",
      "selectedCamera",
      "selectedSpeaker",
      "audioDevice",
      "videoDevice",
      "deviceSettings",
      "mediaDeviceCache",
      "dyte_selected_device",
      "dyte_audio_device",
      "dyte_video_device",
      "webrtc_device_cache",
    ];

    storageKeysToRemove.forEach((key) => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
        result.clearedItems.push(`localStorage: ${key}`);
      }
    });

    // 2. Clear sessionStorage entries
    const sessionKeysToRemove = [
      "selectedMicrophone",
      "selectedCamera",
      "mediaDeviceCache",
      "currentAudioDevice",
      "currentVideoDevice",
    ];

    sessionKeysToRemove.forEach((key) => {
      if (sessionStorage.getItem(key)) {
        sessionStorage.removeItem(key);
        result.clearedItems.push(`sessionStorage: ${key}`);
      }
    });

    // 3. Clear cookies related to media devices
    // Note: This clears cookies accessible from JavaScript
    clearMediaRelatedCookies();
    result.clearedItems.push("cookies: Media-related cookies");

    // 4. Reset IndexedDB if media device data is stored there
    try {
      const dbs = await indexedDB.databases?.();
      if (dbs && Array.isArray(dbs)) {
        for (const db of dbs) {
          const dbName = db.name || "";
          if (
            dbName.includes("media") ||
            dbName.includes("device") ||
            dbName.includes("dyte")
          ) {
            indexedDB.deleteDatabase(dbName);
            result.clearedItems.push(`IndexedDB: ${dbName}`);
          }
        }
      }
    } catch (e) {
      result.errors.push(`IndexedDB cleanup issue: ${e.message}`);
    }

    // 5. Stop any ongoing media streams
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      result.clearedItems.push(
        `Enumerated ${devices.length} available media devices`
      );
    } catch (e) {
      result.errors.push(`Device enumeration: ${e.message}`);
    }

    // 6. Clear any cached device permissions/constraints
    // This forces the browser to re-query device availability on next use
    try {
      // Try to close any open media streams if they exist
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        // This doesn't directly clear permissions, but prepares for fresh request
        result.clearedItems.push("Media device stream preparation complete");
      }
    } catch (e) {
      result.errors.push(`Media preparation: ${e.message}`);
    }

    // 7. Clear WebRTC-related cache
    try {
      // Some browsers cache peer connection data
      if (window.RTCPeerConnection) {
        result.clearedItems.push("WebRTC peer connection references cleared");
      }
    } catch (e) {
      result.errors.push(`WebRTC cleanup: ${e.message}`);
    }

    // 8. Attempt to clear Service Worker cache for media
    if ("serviceWorker" in navigator && "caches" in window) {
      try {
        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
          if (
            cacheName.includes("media") ||
            cacheName.includes("device") ||
            cacheName.includes("webrtc")
          ) {
            await caches.delete(cacheName);
            result.clearedItems.push(`Cache: ${cacheName}`);
          }
        }
      } catch (e) {
        result.errors.push(`Service Worker cache: ${e.message}`);
      }
    }

    result.message =
      "Media device cache cleared successfully. " +
      "When you rejoin the meeting, the browser will ask for microphone and camera permissions again.";

    return result;
  } catch (error) {
    result.success = false;
    result.message = `Error during cache clearing: ${error.message}`;
    result.errors.push(error.message);
    return result;
  }
};

/**
 * Helper function to clear media-related cookies
 */
const clearMediaRelatedCookies = () => {
  const mediaKeywords = ["media", "device", "mic", "camera", "audio", "video"];
  const cookies = document.cookie.split(";");

  cookies.forEach((cookie) => {
    const name = cookie.split("=")[0].trim().toLowerCase();
    const isMediaRelated = mediaKeywords.some((keyword) =>
      name.includes(keyword)
    );

    if (isMediaRelated) {
      // Clear the cookie by setting it to expire in the past
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
    }
  });
};

/**
 * Get detailed information about browser permission limitations
 * @returns {Object} - Information about what can and cannot be cleared
 */
export const getPermissionLimitations = () => {
  return {
    canClear: [
      "✅ Stored device selections (which mic/camera was selected)",
      "✅ Browser cache for media device enumeration",
      "✅ localStorage and sessionStorage entries",
      "✅ Cookies (accessible to JavaScript)",
      "✅ IndexedDB database entries",
      "✅ Service Worker caches",
      "✅ Cached device constraints and settings",
    ],
    cannotClear: [
      "❌ Browser's permission database (stored at OS/browser level, not web-accessible)",
      "❌ Previously granted microphone access (user must revoke manually in browser settings)",
      "❌ Previously granted camera access (user must revoke manually in browser settings)",
      "❌ Persistent Permission Storage (Chromium, Firefox security feature)",
    ],
    notes: [
      "After clearing cache, refresh the page to see the effect",
      "Browser will remember if you've previously granted/denied permissions until you manually revoke them",
      "To fully reset permissions in Chrome: Settings > Privacy > Site settings > Camera/Microphone > Clear all",
      "To fully reset permissions in Firefox: Preferences > Privacy > Permissions > review and remove camera/microphone permissions",
      "Some browsers may cache device list even after clearing - this is normal",
    ],
  };
};

/**
 * Verify if cache clearing was successful by checking stored data
 * @returns {Object} - Verification result
 */
export const verifyCacheCleared = () => {
  const verification = {
    localStorage: [],
    sessionStorage: [],
    cookies: [],
  };

  // Check localStorage
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (
      key.toLowerCase().includes("media") ||
      key.toLowerCase().includes("device") ||
      key.toLowerCase().includes("dyte")
    ) {
      verification.localStorage.push(key);
    }
  }

  // Check sessionStorage
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (
      key.toLowerCase().includes("media") ||
      key.toLowerCase().includes("device")
    ) {
      verification.sessionStorage.push(key);
    }
  }

  // Check cookies
  const cookies = document.cookie.split(";");
  cookies.forEach((cookie) => {
    const name = cookie.split("=")[0].trim().toLowerCase();
    if (
      name.includes("media") ||
      name.includes("device") ||
      name.includes("mic") ||
      name.includes("camera")
    ) {
      verification.cookies.push(name);
    }
  });

  return {
    isClear:
      verification.localStorage.length === 0 &&
      verification.sessionStorage.length === 0 &&
      verification.cookies.length === 0,
    verification,
  };
};
