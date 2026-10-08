/**
 * LinkedIn URL helpers for event application forms.
 *
 * The backend validates `linkedin_url` with DRF's URLField (Django
 * URLValidator): the field is optional, surrounding whitespace is stripped,
 * and the value must be an absolute URL with a scheme. These helpers mirror
 * that so applicants get feedback before submitting. The backend stays the
 * authority; anything it still rejects is mapped back to the same message.
 */

export const LINKEDIN_URL_ERROR_MESSAGE =
  'Please enter a valid LinkedIn URL, for example https://www.linkedin.com/in/your-profile, or leave this field blank.';

// EventApplication.linkedin_url is a Django URLField (varchar(200)). The
// serializer does not enforce this, so a longer URL fails at the database.
export const LINKEDIN_URL_MAX_LENGTH = 200;

export const LINKEDIN_URL_TOO_LONG_MESSAGE =
  `Your LinkedIn URL is too long (maximum ${LINKEDIN_URL_MAX_LENGTH} characters). Please remove extra tracking parameters, for example use https://www.linkedin.com/in/your-profile, or leave this field blank.`;

export const LINKEDIN_URL_MISSING_SCHEME_MESSAGE =
  'Please start your LinkedIn URL with https://, for example https://www.linkedin.com/in/your-profile, or leave this field blank.';

// Whitespace plus invisible characters that copy-paste can carry along
// (zero-width space/joiners, BOM). Python's str.strip() does not remove the
// zero-width ones, so the backend rejects a URL that starts with one.
const EDGE_JUNK = /^[\s​-‍⁠﻿]+|[\s​-‍⁠﻿]+$/g;

// Schemes Django's URLValidator accepts by default.
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'ftp:', 'ftps:']);

/** Trims surrounding whitespace/invisible characters; never alters the URL itself. */
export const normalizeLinkedinUrl = (value) => String(value ?? '').replace(EDGE_JUNK, '');

/** Returns a user-facing error message, or null when the value is acceptable (including empty). */
export const getLinkedinUrlError = (value) => {
  const url = normalizeLinkedinUrl(value);
  if (!url) return null;

  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(url)) {
    return LINKEDIN_URL_MISSING_SCHEME_MESSAGE;
  }
  if (/[\s​-‍⁠﻿]/.test(url)) {
    return LINKEDIN_URL_ERROR_MESSAGE;
  }

  try {
    const parsed = new URL(url);
    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) return LINKEDIN_URL_ERROR_MESSAGE;
    // Django requires a dotted domain (or localhost/an IP); "https://linkedin" is rejected.
    if (!parsed.hostname.includes('.') && parsed.hostname !== 'localhost') {
      return LINKEDIN_URL_ERROR_MESSAGE;
    }
  } catch {
    return LINKEDIN_URL_ERROR_MESSAGE;
  }
  // Postgres counts characters (code points), not UTF-16 units.
  if (Array.from(url).length > LINKEDIN_URL_MAX_LENGTH) {
    return LINKEDIN_URL_TOO_LONG_MESSAGE;
  }
  return null;
};

const FIELD_LABELS = {
  first_name: 'First name',
  last_name: 'Last name',
  email: 'Email',
  job_title: 'Job title',
  company_name: 'Company',
  location: 'Country/Region',
  phone: 'Contact number',
  linkedin_url: 'LinkedIn URL',
  comments: 'Comments',
};

/**
 * Turns a DRF field-error body ({"field": ["message", ...]}) into one readable
 * sentence. Only plain string messages are used; anything else (nested or
 * unexpected shapes) is ignored, and null is returned when nothing is usable
 * so callers keep their existing fallback.
 */
export const formatFieldErrors = (responseData) => {
  if (!responseData || typeof responseData !== 'object' || Array.isArray(responseData)) return null;

  const parts = Object.entries(responseData)
    .map(([field, messages]) => {
      const list = (Array.isArray(messages) ? messages : [messages]).filter(
        (message) => typeof message === 'string' && message.trim()
      );
      if (!list.length) return null;
      if (field === 'non_field_errors') return list.join(' ');
      const label = FIELD_LABELS[field] || field.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
      return `${label}: ${list.join(' ')}`;
    })
    .filter(Boolean);

  return parts.length ? `Please check the following: ${parts.join(' ')}` : null;
};
