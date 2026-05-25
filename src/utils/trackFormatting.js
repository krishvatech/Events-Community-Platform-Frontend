/**
 * Track and Application Formatting Utilities
 * Provides friendly display formats for tracks, roles, and submission modes
 */

/**
 * Format role keys to display names
 * Example: "speaker" → "Speaker", "speaker_staff" → "Speaker Staff"
 */
export const formatRoleName = (roleKey) => {
  if (!roleKey) return '';

  const roleLabels = {
    speaker: 'Speaker',
    moderator: 'Moderator',
    host: 'Host',
    attendee: 'Attendee',
    participant: 'Participant',
    sponsor: 'Sponsor',
    sponsor_staff: 'Sponsor Staff',
    startup: 'Start-up',
    investor: 'Investor',
  };

  return roleLabels[roleKey] || formatKeyToLabel(roleKey);
};

const normalizeLabel = (value) =>
  (value || '').toString().replace(/[^a-z0-9]/gi, '').toLowerCase();

/**
 * Format multiple roles to display string
 * Example: ["speaker", "moderator"] → "Speaker, Moderator"
 */
export const formatRolesList = (roleKeys = []) => {
  if (!Array.isArray(roleKeys) || roleKeys.length === 0) return '';
  return roleKeys.map(formatRoleName).join(', ');
};

const getSingleRolePhrase = (roleKey) => {
  const roleName = formatRoleName(roleKey);
  if (!roleName) return '';

  if (roleKey === 'sponsor_staff') {
    return roleName;
  }

  const article = /^[aeiou]/i.test(roleName) ? 'an' : 'a';
  return `${article} ${roleName}`;
};

/**
 * Get friendly acceptance message based on roles
 * Example: ["speaker"] → "If accepted, you will be registered as a Speaker and asked to complete a Promotional Profile."
 */
export const getAcceptanceMessage = (roleKeys = []) => {
  if (!Array.isArray(roleKeys) || roleKeys.length === 0) {
    return 'If accepted, you will be registered for this event.';
  }

  const rolesList = formatRolesList(roleKeys);

  if (roleKeys.length === 1) {
    if (roleKeys[0] === 'speaker') {
      return `If accepted, you will be registered as a ${rolesList} and asked to complete a Promotional Profile.`;
    }
    return `If accepted, you will be registered as ${getSingleRolePhrase(roleKeys[0])}.`;
  }

  return `If accepted, you will be registered as: ${rolesList}.`;
};

/**
 * Format submission mode to display label
 * Example: "self_submission" → "Apply for Yourself"
 */
export const formatSubmissionMode = (mode) => {
  const modeLabels = {
    self_submission: 'Apply for Yourself',
    confirmed: 'Confirmed / Invited',
    self_nomination: 'Nominate Yourself',
    third_party_nomination: 'Nominate Someone Else',
  };

  return modeLabels[mode] || formatKeyToLabel(mode);
};

/**
 * Get description for submission mode
 */
export const getSubmissionModeDescription = (mode) => {
  const descriptions = {
    self_submission: 'Submit your own application',
    confirmed: 'Already confirmed by sponsor or partner organization',
    self_nomination: 'Nominate yourself for this opportunity',
    third_party_nomination: 'Nominate another person for this opportunity',
  };

  return descriptions[mode] || '';
};

/**
 * Convert snake_case to Title Case
 * Example: "speaker_staff" → "Speaker Staff"
 */
export const formatKeyToLabel = (key) => {
  if (!key) return '';
  return key
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Get track display name (uses label, fallback to formatted key)
 */
export const getTrackDisplayName = (track) => {
  if (!track) return '';
  if (track.label) return track.label;
  if (track.key) return formatKeyToLabel(track.key);
  return 'Application Track';
};

/**
 * Get track description or empty string
 */
export const getTrackDescription = (track) => {
  if (!track) return '';
  return track.short_description || track.description || '';
};

/**
 * Format introduction text for application form
 * Example: "You are applying as: Speaker"
 */
export const getApplicationIntroText = (track) => {
  const trackName = getTrackDisplayName(track);
  const rolesList = formatRolesList(track?.role_mappings_on_acceptance || []);

  if (rolesList && normalizeLabel(rolesList) !== normalizeLabel(trackName)) {
    return `You are applying as: ${trackName} / ${rolesList}`;
  }

  return `You are applying as: ${trackName}`;
};
