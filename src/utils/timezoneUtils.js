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
