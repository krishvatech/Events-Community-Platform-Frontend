/**
 * Custom Hook: useWordPressAuth
 * Manages WordPress authentication state and actions
 */

import { useState, useCallback, useEffect } from 'react';
import { wordpressAuthService } from '../services/wordpressAuth';

export function useWordPressAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is already logged in on mount
  useEffect(() => {
    const storedUser = wordpressAuthService.getCurrentUser();
    const token = wordpressAuthService.getAccessToken();

    if (storedUser && token) {
      setUser(storedUser);
      setIsAuthenticated(true);
    }
  }, []);

  /**
   * Login with WordPress credentials
   */
  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);

    try {
      const result = await wordpressAuthService.loginWithWordPress(email, password);

      // Store user data
      wordpressAuthService.storeUser({
        id: result.user_id,
        username: result.username,
        email: result.email,
        created: result.created,
      });

      setUser(result);
      setIsAuthenticated(true);

      return result;
    } catch (err) {
      const errorMessage = err.message || 'Login failed';
      setError(errorMessage);
      console.error('Login error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Logout
   */
  const logout = useCallback(() => {
    wordpressAuthService.logout();
    setUser(null);
    setIsAuthenticated(false);
    setError(null);
  }, []);

  /**
   * Fetch user profile
   */
  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const profile = await wordpressAuthService.getProfile();
      setUser(profile);
      return profile;
    } catch (err) {
      setError(err.message || 'Failed to fetch profile');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    user,
    loading,
    error,
    isAuthenticated,
    login,
    logout,
    fetchProfile,
    clearError,
  };
}
