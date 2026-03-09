/**
 * WordPress IMAA Authentication Service
 * Handles login, token management, and profile sync
 */

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api').replace(/\/+$/, '');

export const wordpressAuthService = {
  /**
   * Authenticate user with WordPress credentials
   * Calls backend which syncs with WordPress and returns JWT tokens
   */
  async loginWithWordPress(email, password) {
    try {
      // Option 1: If you have a dedicated WordPress login endpoint
      // const response = await axios.post(`${API_BASE}/auth/wordpress/login/`, {
      //   email,
      //   password,
      // });

      // Option 2: Manual sync endpoint (for testing)
      const syncResponse = await fetch(`${API_BASE}/auth/wordpress/sync/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!syncResponse.ok) {
        const error = await syncResponse.json();
        throw new Error(error.error || 'Sync failed');
      }

      const syncData = await syncResponse.json();
      console.log('WordPress user synced:', syncData);

      // Store Cognito tokens if provided
      if (syncData.access_token) {
        localStorage.setItem('access_token', syncData.access_token);
      }
      if (syncData.id_token) {
        localStorage.setItem('id_token', syncData.id_token);
      }
      if (syncData.refresh_token) {
        localStorage.setItem('refresh_token', syncData.refresh_token);
      }

      // Also store cognito_access_token if available
      if (syncData.access_token) {
        localStorage.setItem('cognito_access_token', syncData.access_token);
      }

      return {
        user_id: syncData.user_id,
        username: syncData.username,
        email: syncData.email,
        created: syncData.created,
        status: 'success',
      };
    } catch (error) {
      console.error('WordPress login error:', error);
      throw error;
    }
  },

  /**
   * Store authentication tokens
   */
  storeTokens(accessToken, refreshToken) {
    if (accessToken) localStorage.setItem('access_token', accessToken);
    if (refreshToken) localStorage.setItem('refresh_token', refreshToken);
  },

  /**
   * Retrieve access token
   */
  getAccessToken() {
    return localStorage.getItem('access_token');
  },

  /**
   * Retrieve refresh token
   */
  getRefreshToken() {
    return localStorage.getItem('refresh_token');
  },

  /**
   * Get current user from localStorage
   */
  getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  /**
   * Store user data
   */
  storeUser(userData) {
    localStorage.setItem('user', JSON.stringify(userData));
  },

  /**
   * Clear all auth data
   */
  clearAuth() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!this.getAccessToken();
  },

  /**
   * Logout
   */
  logout() {
    this.clearAuth();
  },

  /**
   * Get profile from authenticated API
   */
  async getProfile() {
    const token = this.getAccessToken();
    if (!token) throw new Error('No authentication token');

    const response = await fetch(`${API_BASE}/auth/me/profile/`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) throw new Error('Failed to fetch profile');
    return response.json();
  },
};
