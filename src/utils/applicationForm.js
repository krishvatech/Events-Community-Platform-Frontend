import { apiClient } from './api';

/**
 * Utility functions for application form handling
 * Phase 7: Multi-track application support
 * Phase 8: Fine-grained pre-approval per event × track × submission_mode
 */

/**
 * Validate applicant form data
 */
export const validateApplicationForm = (formData, track) => {
  const errors = {};

  // Required applicant fields
  if (!formData.first_name) errors.first_name = 'First name is required';
  if (!formData.last_name) errors.last_name = 'Last name is required';
  if (!formData.email) {
    errors.email = 'Email is required';
  } else if (!isValidEmail(formData.email)) {
    errors.email = 'Invalid email format';
  }

  // Track-specific validation
  if (track && formData.submission_mode) {
    if (formData.submission_mode === 'confirmed') {
      if (!formData.sponsor_organization) {
        errors.sponsor_organization = 'Organization is required for confirmed submissions';
      }
    }
    if (formData.submission_mode === 'third_party_nomination') {
      if (!formData.nominator_name) errors.nominator_name = 'Nominator name is required';
      if (!formData.nominator_email) errors.nominator_email = 'Nominator email is required';
      if (!formData.nominee_name) errors.nominee_name = 'Nominee name is required';
      if (!formData.nominee_email) errors.nominee_email = 'Nominee email is required';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validate email format
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Submit multi-track application
 */
export const submitMultiTrackApplication = async (eventId, data) => {
  try {
    const response = await apiClient.post(
      `/events/${eventId}/apply/`,
      data
    );
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to submit application',
      data: error.response?.data,
    };
  }
};

/**
 * Handle file upload with progress
 */
export const handleFileUpload = async (eventId, file, fieldId) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('field_id', fieldId);

    const response = await apiClient.post(
      `/events/${eventId}/applications/upload/`,
      formData,
      {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          return percentCompleted;
        },
      }
    );

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.detail || 'File upload failed',
    };
  }
};

/**
 * Get form schema for a track
 */
export const getFormSchemaForTrack = async (eventId, trackId) => {
  try {
    const response = await apiClient.get(
      `/events/${eventId}/application-tracks/${trackId}/form-fields/`
    );
    return {
      success: true,
      fields: response.data.results || response.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to load form schema',
    };
  }
};

/**
 * Resolve profile binding (get value from user profile)
 */
export const resolveProfileBinding = (bindingPath, user) => {
  if (!bindingPath || !user) return null;

  const parts = bindingPath.split('.');
  let value = user;

  for (const part of parts) {
    if (value && typeof value === 'object') {
      value = value[part];
    } else {
      return null;
    }
  }

  return value;
};

/**
 * Fetch track application details
 */
export const fetchTrackApplication = async (eventId, applicationId, trackId) => {
  try {
    const response = await apiClient.get(
      `/events/${eventId}/applications/${applicationId}/track-applications/${trackId}/`
    );
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to fetch application',
    };
  }
};

/**
 * Update track application status (admin)
 */
export const updateTrackApplicationStatus = async (
  eventId,
  trackId,
  applicationId,
  status
) => {
  try {
    const response = await apiClient.patch(
      `/events/${eventId}/applications/${applicationId}/track-applications/${trackId}/`,
      { status }
    );
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to update status',
    };
  }
};

/**
 * Get applicant's applications
 */
export const fetchApplicantApplications = async (eventId, email) => {
  try {
    const response = await apiClient.get(
      `/events/${eventId}/applications/`,
      {
        params: { email },
      }
    );
    return {
      success: true,
      applications: response.data.results || response.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to fetch applications',
    };
  }
};

/**
 * Render markdown content safely
 */
export const renderMarkdownContent = (content) => {
  if (!content) return '';

  // Simple markdown to HTML conversion
  // In production, use a proper markdown parser like react-markdown or marked
  let html = content
    .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
    .replace(/^# (.*?)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/(?<!<\w+>)^(?!<[ul|ol|li|h])(.+)$/gm, '<p>$1</p>');

  return html;
};

// ========== Phase 8: Pre-Approval Functions ==========

/**
 * Check pre-approval code for a specific track + submission_mode
 * Returns: { preapproved: bool, source: 'code'|'email'|null, message: string }
 */
export const checkPreapprovalCodeForTrackMode = async (
  eventId,
  code,
  trackId = null,
  submissionMode = ''
) => {
  try {
    const response = await apiClient.post(
      `/events/${eventId}/preapproval/check-code/`,
      {
        code: code.trim(),
        ...(trackId && { track_id: trackId }),
        ...(submissionMode && { submission_mode: submissionMode }),
      }
    );
    return {
      success: true,
      preapproved: response.data.preapproved,
      source: response.data.source || null,
      message: response.data.message,
    };
  } catch (error) {
    return {
      success: false,
      preapproved: false,
      error: error.response?.data?.message || 'Code check failed',
    };
  }
};

/**
 * Check email pre-approval for a specific track + submission_mode
 * Returns: { preapproved: bool, source: 'email'|null, first_name?, last_name?, message: string }
 */
export const checkPreapprovalEmailForTrackMode = async (
  eventId,
  email,
  trackId = null,
  submissionMode = ''
) => {
  try {
    const response = await apiClient.post(
      `/events/${eventId}/preapproval/check-email/`,
      {
        email: email.trim().toLowerCase(),
        ...(trackId && { track_id: trackId }),
        ...(submissionMode && { submission_mode: submissionMode }),
      }
    );
    return {
      success: true,
      preapproved: response.data.preapproved,
      source: response.data.source || null,
      first_name: response.data.first_name || null,
      last_name: response.data.last_name || null,
      message: response.data.message,
    };
  } catch (error) {
    return {
      success: false,
      preapproved: false,
      error: error.response?.data?.message || 'Email check failed',
    };
  }
};

/**
 * Get dynamic CTA text based on pre-approval state
 * selectedTracks: array of track IDs
 * preapprovalState: { trackId: { codePreapproved, emailPreapproved, ... }, ... }
 * Returns: "Register" | "Submit" | "Submit Application"
 */
export const getCtaTextBasedOnPreapproval = (selectedTracks, preapprovalState) => {
  if (!selectedTracks || selectedTracks.length === 0) {
    return 'Submit Application';
  }

  // Check if all tracks are pre-approved
  const allPreapproved = selectedTracks.every((trackId) => {
    const state = preapprovalState[trackId];
    return state && (state.codePreapproved || state.emailPreapproved);
  });

  // Check if some tracks are pre-approved
  const somePreapproved = selectedTracks.some((trackId) => {
    const state = preapprovalState[trackId];
    return state && (state.codePreapproved || state.emailPreapproved);
  });

  if (allPreapproved) return 'Register';
  if (somePreapproved) return 'Submit';
  return 'Submit Application';
};

/**
 * Check pre-approval for all tracks (helper for batch checking)
 * Returns: { trackId: { codePreapproved, emailPreapproved, source }, ... }
 */
export const checkAllTracksPreapproval = async (
  eventId,
  code,
  email,
  selectedTracks,
  submissionModes
) => {
  const state = {};

  // Check code for all tracks
  if (code && code.trim()) {
    for (const trackId of selectedTracks) {
      try {
        const result = await checkPreapprovalCodeForTrackMode(
          eventId,
          code,
          trackId,
          submissionModes[trackId] || 'self_submission'
        );
        if (result.preapproved) {
          state[trackId] = {
            codePreapproved: true,
            emailPreapproved: false,
            source: 'code',
          };
        }
      } catch (error) {
        console.debug(`Code check failed for track ${trackId}:`, error);
      }
    }
  }

  // Check email for all tracks (if no code found)
  if (email && email.trim()) {
    for (const trackId of selectedTracks) {
      // Skip if already code-approved
      if (state[trackId]?.codePreapproved) continue;

      try {
        const result = await checkPreapprovalEmailForTrackMode(
          eventId,
          email,
          trackId,
          submissionModes[trackId] || 'self_submission'
        );
        if (result.preapproved) {
          state[trackId] = {
            codePreapproved: false,
            emailPreapproved: true,
            source: 'email',
            first_name: result.first_name,
            last_name: result.last_name,
          };
        }
      } catch (error) {
        console.debug(`Email check failed for track ${trackId}:`, error);
      }
    }
  }

  return state;
};
