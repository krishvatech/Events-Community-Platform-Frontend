/**
 * Virtual Speaker API Service
 * Handles all API calls related to virtual speaker profiles
 */

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api').replace(/\/$/, '');

/**
 * Get auth token from localStorage
 */
const getAuthToken = () => {
  return localStorage.getItem('access_token');
};

/**
 * Get auth headers
 */
const getAuthHeaders = () => {
  const token = getAuthToken();
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

/**
 * List virtual speakers for a community
 */
export const listVirtualSpeakers = async (communityId, params = {}) => {
  try {
    // Filter out undefined values from params
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([, value]) => value !== undefined && value !== null)
    );

    const queryParams = new URLSearchParams({
      community_id: communityId,
      ...cleanParams,
    });

    const response = await fetch(
      `${API_BASE}/virtual-speakers/?${queryParams}`,
      {
        headers: getAuthHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to list virtual speakers:', error);
    throw error;
  }
};

/**
 * Get a specific virtual speaker
 */
export const getVirtualSpeaker = async (id) => {
  try {
    const response = await fetch(
      `${API_BASE}/virtual-speakers/${id}/`,
      {
        headers: getAuthHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to get virtual speaker:', error);
    throw error;
  }
};

/**
 * Create a new virtual speaker
 */
export const createVirtualSpeaker = async (data) => {
  try {
    const formData = new FormData();

    // Add fields
    formData.append('community_id', data.communityId);
    formData.append('name', data.name);
    formData.append('job_title', data.jobTitle || '');
    formData.append('company', data.company || '');
    formData.append('bio', data.bio || '');

    // Add image if provided
    if (data.profileImage) {
      formData.append('profile_image', data.profileImage);
    }

    const token = getAuthToken();
    const response = await fetch(
      `${API_BASE}/virtual-speakers/`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to create virtual speaker:', error);
    throw error;
  }
};

/**
 * Update an existing virtual speaker
 */
export const updateVirtualSpeaker = async (id, data) => {
  try {
    const formData = new FormData();

    // Add fields
    if (data.name) formData.append('name', data.name);
    if (data.jobTitle !== undefined) formData.append('job_title', data.jobTitle);
    if (data.company !== undefined) formData.append('company', data.company);
    if (data.bio !== undefined) formData.append('bio', data.bio);

    // Add image if provided
    if (data.profileImage) {
      formData.append('profile_image', data.profileImage);
    }

    const token = getAuthToken();
    const response = await fetch(
      `${API_BASE}/virtual-speakers/${id}/`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to update virtual speaker:', error);
    throw error;
  }
};

/**
 * Delete a virtual speaker
 */
export const deleteVirtualSpeaker = async (id) => {
  try {
    const response = await fetch(
      `${API_BASE}/virtual-speakers/${id}/`,
      {
        method: 'DELETE',
        headers: getAuthHeaders(),
      }
    );

    if (!response.ok && response.status !== 204) {
      throw new Error(`API error: ${response.status}`);
    }

    return true;
  } catch (error) {
    console.error('Failed to delete virtual speaker:', error);
    throw error;
  }
};

/**
 * Convert a virtual speaker to a real user account
 */
export const convertVirtualSpeaker = async (id, email, sendInvite = true) => {
  try {
    const response = await fetch(
      `${API_BASE}/virtual-speakers/${id}/convert/`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          email,
          send_invite: sendInvite,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to convert virtual speaker:', error);
    throw error;
  }
};

/**
 * Resend invitation email for a converted virtual speaker
 */
export const resendVirtualSpeakerInvite = async (id) => {
  try {
    const response = await fetch(
      `${API_BASE}/virtual-speakers/${id}/resend-invite/`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to resend invitation:', error);
    throw error;
  }
};
