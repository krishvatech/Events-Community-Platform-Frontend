/**
 * WordPress IMAA Authentication Service
 * Handles login, token management, and profile sync
 */

import {
  clearCognitoAuthTokens,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setCognitoAccessToken,
  setIdToken,
  setRefreshToken,
} from '../utils/tokenStore';
import { logoutBrowserSession } from '../utils/logoutSession';

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
        let errorData = {};
        try {
          errorData = await syncResponse.json();
        } catch {
          // Keep the fallback message when the backend returns a non-JSON error.
        }

        const authError = new Error(
          errorData.detail || errorData.error || 'Login failed'
        );
        authError.code = errorData.code || '';
        authError.profileStatus = errorData.profile_status || '';
        authError.status = syncResponse.status;
        throw authError;
      }

      const syncData = await syncResponse.json();
      // Never log the sync payload: it can contain Cognito credentials.
      // Store Cognito tokens if provided
      if (syncData.access_token) {
        setAccessToken(syncData.access_token);
      }
      if (syncData.id_token) {
        setIdToken(syncData.id_token);
      }
      if (syncData.refresh_token) {
        setRefreshToken(syncData.refresh_token);
      }

      // Also store cognito_access_token if available
      if (syncData.access_token) {
        setCognitoAccessToken(syncData.access_token);
      }

      return {
        ...syncData,
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
    if (accessToken) setAccessToken(accessToken);
    if (refreshToken) setRefreshToken(refreshToken);
  },

  /**
   * Retrieve access token
   */
  getAccessToken() {
    return getAccessToken();
  },

  /**
   * Retrieve refresh token
   */
  getRefreshToken() {
    return getRefreshToken();
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
    clearCognitoAuthTokens();
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
  async logout() {
    await logoutBrowserSession();
    localStorage.removeItem('user');
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
