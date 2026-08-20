// Shared group form rules.
//
// The backend enforces the same limits in groups/serializers.py. These helpers
// exist so the create/edit dialogs can show the counter and block submission
// before a round trip, not as a replacement for the server-side check.

export const GROUP_DESCRIPTION_MAX_WORDS = 2000;
export const GROUP_SHORT_DESCRIPTION_MAX_LENGTH = 255;

/** Count whitespace-separated words, matching Python's str.split(). */
export function countWords(text) {
  const trimmed = String(text || "").trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

/** Helper text for the description field, e.g. "1250 / 2000 words". */
export function describeWordCount(text, max = GROUP_DESCRIPTION_MAX_WORDS) {
  return `${countWords(text)} / ${max} words`;
}

/**
 * Returns an error string when the description exceeds the word limit,
 * otherwise null. Mirrors the backend message so both paths read the same.
 */
export function validateDescriptionWords(text, max = GROUP_DESCRIPTION_MAX_WORDS) {
  return countWords(text) > max ? `Description cannot exceed ${max} words.` : null;
}
