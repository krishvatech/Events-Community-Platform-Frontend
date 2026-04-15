/**
 * WordPress IMAA Login Component
 * Provides login form for WordPress credentials
 */

import { useState } from 'react';
import { useWordPressAuth } from '../hooks/useWordPressAuth';

export default function WordPressLogin({ onSuccess, onError }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { login, loading, error, clearError } = useWordPressAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();

    if (!email || !password) {
      onError?.('Please enter both email and password');
      return;
    }

    try {
      const result = await login(email, password);
      setEmail('');
      setPassword('');
      onSuccess?.(result);
    } catch (err) {
      onError?.(err.message);
    }
  };

  return (
    <div className="wordpress-login-container">
      <div className="wordpress-login-card">
        <h2>Login with IMAA</h2>
        <p className="subtitle">Enter your IMAA WordPress credentials</p>

        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          {/* Email Field */}
          <div className="form-group">
            <label htmlFor="wp-email">Email</label>
            <input
              id="wp-email"
              type="email"
              placeholder="your.email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          {/* Password Field */}
          <div className="form-group">
            <label htmlFor="wp-password">Password</label>
            <div className="password-input-wrapper">
              <input
                id="wp-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Logging in...
              </>
            ) : (
              'Login with IMAA'
            )}
          </button>
        </form>

        {/* Info Text */}
        <p className="info-text">
          Don't have an IMAA account?{' '}
          <a href="https://staging.manda.sg" target="_blank" rel="noopener noreferrer">
            Create one
          </a>
        </p>
      </div>

      <style jsx>{`
        .wordpress-login-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        .wordpress-login-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
          padding: 40px;
          width: 100%;
          max-width: 400px;
        }

        h2 {
          margin: 0 0 10px 0;
          font-size: 28px;
          font-weight: 700;
          color: #1a1a1a;
          text-align: center;
        }

        .subtitle {
          margin: 0 0 30px 0;
          font-size: 14px;
          color: #666;
          text-align: center;
        }

        .error-message {
          background-color: #fee;
          color: #c33;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          border: 1px solid #fcc;
        }

        .error-icon {
          font-size: 16px;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        label {
          font-size: 14px;
          font-weight: 600;
          color: #1a1a1a;
        }

        input[type='email'],
        input[type='password'],
        input[type='text'] {
          padding: 12px 16px;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 16px;
          transition: all 0.3s ease;
          font-family: inherit;
        }

        input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        input:disabled {
          background-color: #f5f5f5;
          cursor: not-allowed;
        }

        .password-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .password-input-wrapper input {
          flex: 1;
          padding-right: 45px;
        }

        .toggle-password {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 18px;
          padding: 4px 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: opacity 0.2s;
        }

        .toggle-password:hover {
          opacity: 0.7;
        }

        .toggle-password:focus {
          outline: none;
        }

        .login-button {
          padding: 12px 16px;
          background-color: #667eea;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 10px;
        }

        .login-button:hover:not(:disabled) {
          background-color: #5568d3;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
          transform: translateY(-2px);
        }

        .login-button:disabled {
          background-color: #ccc;
          cursor: not-allowed;
          opacity: 0.8;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid #fff;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .info-text {
          margin: 20px 0 0 0;
          font-size: 13px;
          color: #666;
          text-align: center;
        }

        .info-text a {
          color: #667eea;
          text-decoration: none;
          font-weight: 600;
        }

        .info-text a:hover {
          text-decoration: underline;
        }

        @media (max-width: 600px) {
          .wordpress-login-card {
            padding: 30px 20px;
          }

          h2 {
            font-size: 24px;
          }
        }
      `}</style>
    </div>
  );
}
