import { apiClient } from './api';

/**
 * Utility functions for Phase 9: Review Queue
 * Handles API calls for review queue list, stats, bulk actions, and exports
 */

/**
 * Fetch review queue with filters
 */
export const fetchReviewQueue = async (eventId, filters = {}, page = 1, pageSize = 25) => {
  try {
    const params = new URLSearchParams();

    if (filters.trackId) params.append('track_id', filters.trackId);
    if (filters.submissionMode) params.append('submission_mode', filters.submissionMode);
    if (filters.status) params.append('status', filters.status);
    if (filters.tierId) params.append('tier_id', filters.tierId);
    if (filters.reviewerId) params.append('reviewer_id', filters.reviewerId);
    if (filters.search) params.append('search', filters.search);
    if (filters.ordering) params.append('ordering', filters.ordering);

    params.append('limit', pageSize);
    params.append('offset', (page - 1) * pageSize);

    const response = await apiClient.get(
      `/events/${eventId}/review-queue/?${params.toString()}`
    );

    return {
      success: true,
      data: response.data.results || [],
      count: response.data.count || 0,
      next: response.data.next,
      previous: response.data.previous,
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to fetch review queue',
      data: [],
      count: 0,
    };
  }
};

/**
 * Fetch review queue statistics
 */
export const fetchReviewQueueStats = async (eventId) => {
  try {
    const response = await apiClient.get(
      `/events/${eventId}/review-queue/stats/`
    );

    return {
      success: true,
      stats: response.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to fetch stats',
      stats: {},
    };
  }
};

/**
 * Perform bulk action on track applications
 */
export const performBulkAction = async (eventId, action, trackAppIds, options = {}) => {
  try {
    const payload = {
      action,
      track_application_ids: trackAppIds,
    };

    if (action === 'accept' && options.tierId) {
      payload.tier_preference_id = options.tierId;
    }
    if (action === 'assign_reviewer' && options.reviewerId) {
      payload.reviewer_id = options.reviewerId;
    }

    const response = await apiClient.post(
      `/events/${eventId}/bulk-action/`,
      payload
    );

    return {
      success: true,
      updatedCount: response.data.updated_count,
      message: `Successfully ${action}ed ${response.data.updated_count} applications`,
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.detail || 'Bulk action failed',
    };
  }
};

/**
 * Export track applications as CSV (FIX 6: Use responseType blob)
 */
export const exportReviewQueue = async (eventId, filters = {}, format = 'csv') => {
  try {
    const params = new URLSearchParams();

    if (filters.trackId) params.append('track_id', filters.trackId);
    if (filters.submissionMode) params.append('submission_mode', filters.submissionMode);
    if (filters.status) params.append('status', filters.status);
    if (filters.tierId) params.append('tier_id', filters.tierId);
    if (filters.reviewerId) params.append('reviewer_id', filters.reviewerId);
    if (filters.search) params.append('search', filters.search);

    // FIX 6: Use responseType: 'blob' for direct binary file download
    const response = await apiClient.get(
      `/events/${eventId}/review-queue/export/?${params.toString()}&format=${format}`,
      { responseType: 'blob' }
    );

    const fileExtension = format === 'csv' ? 'csv' : 'json';
    const mimeType = format === 'csv' ? 'text/csv' : 'application/json';
    const filename = `review-queue-${new Date().toISOString().split('T')[0]}.${fileExtension}`;

    return {
      success: true,
      blob: response.data,
      mimeType,
      filename,
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.detail || 'Export failed',
    };
  }
};


/**
 * Get submission mode display label
 */
export const getSubmissionModeLabel = (mode) => {
  const labels = {
    self_submission: 'Self Submission',
    confirmed: 'Confirmed Submission',
    self_nomination: 'Self Nomination',
    third_party_nomination: 'Third-Party Nomination',
  };
  return labels[mode] || mode;
};

/**
 * Get status badge color
 */
export const getStatusColor = (status) => {
  const colors = {
    pending: 'default',
    pre_approved: 'info',
    accepted: 'success',
    declined: 'error',
    waitlisted: 'warning',
  };
  return colors[status] || 'default';
};

/**
 * Format date for display
 */
export const formatDate = (dateString) => {
  if (!dateString) return 'Not reviewed';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * FIX 4: Fetch attendee origins (payment status) for a registration
 */
export const fetchAttendeeOrigins = async (eventId, registrationId) => {
  try {
    const response = await apiClient.get(
      `/events/${eventId}/attendee-origins/?registration_id=${registrationId}`
    );
    return {
      success: true,
      data: response.data.results || response.data || [],
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to fetch origins',
      data: [],
    };
  }
};

/**
 * FIX 4: Mark an attendee origin as paid
 */
export const markOriginPaid = async (eventId, originId, paymentReference = '') => {
  try {
    const response = await apiClient.post(
      `/events/${eventId}/attendee-origins/${originId}/mark-paid/`,
      { payment_reference: paymentReference }
    );
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to mark origin as paid',
    };
  }
};

/**
 * Phase 10: Accept track application with tier selection
 */
export const acceptTrackApplication = async (eventId, applicationId, trackAppId, tierId, notes = '') => {
  try {
    const payload = {
      accepted_tier_id: tierId,
    };
    if (notes) {
      payload.notes = notes;
    }

    const response = await apiClient.post(
      `/events/${eventId}/applications/${applicationId}/track-applications/${trackAppId}/accept/`,
      payload
    );

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to accept application',
    };
  }
};

/**
 * Phase 10: Decline track application
 */
export const declineTrackApplication = async (eventId, applicationId, trackAppId, sendEmail = true, notes = '') => {
  try {
    const payload = {
      send_email: sendEmail,
    };
    if (notes) {
      payload.notes = notes;
    }

    const response = await apiClient.post(
      `/events/${eventId}/applications/${applicationId}/track-applications/${trackAppId}/decline/`,
      payload
    );

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to decline application',
    };
  }
};

/**
 * Phase 10: Waitlist track application
 */
export const waitlistTrackApplication = async (eventId, applicationId, trackAppId, sendEmail = true, notes = '') => {
  try {
    const payload = {
      send_email: sendEmail,
    };
    if (notes) {
      payload.notes = notes;
    }

    const response = await apiClient.post(
      `/events/${eventId}/applications/${applicationId}/track-applications/${trackAppId}/waitlist/`,
      payload
    );

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to waitlist application',
    };
  }
};
