import React, { useState } from 'react';
import HeroSection from '../components/HeroSection.jsx';
import AuthToggle from '../components/AuthToggle.jsx';
import InputField from '../components/InputField.jsx';
import SocialLogin from '../components/SocialLogin.jsx';
import FeaturesSection from '../components/FeaturesSection.jsx';
export const API_BASE =import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

const SignInPage = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/auth/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Login failed');
      }

      const data = await response.json();

      // Example: token-based auth
      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);

      alert(`✅ Login successful. Welcome ${formData.email}`);
      // Redirect to dashboard
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left hero section */}
      <div className="lg:w-1/2 lg:min-h-screen">
        <HeroSection />
      </div>
      {/* Right form container */}
      <div className="flex-1 flex flex-col justify-center p-6 sm:p-12 bg-white">
        <div className="max-w-md w-full mx-auto">
          <h1 className="text-2xl text-gray-800 mb-2 text-center">Welcome Back</h1>
          <p className="text-2sm text-gray-600 mb-6 text-center">Sign in to access your learning journey</p>
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
            <AuthToggle />
            <form onSubmit={handleSubmit}>
              <InputField
                label="Email Address"
                name="email"
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
              <InputField
                label="Password"
                name="password"
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                required
              />
              <div className="flex justify-end mb-4">
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => alert('Password recovery is not implemented yet.')}
                >
                  Forgot password?
                </button>
              </div>
              <button
                type="submit"
                className="w-full py-2 px-4 bg-primary hover:bg-primary-dark text-white rounded-md font-medium transition"
              >
                Sign Into Your Account
              </button>
            </form>
            <SocialLogin />
          </div>
          <FeaturesSection />
        </div>
      </div>
    </div>
  );
};

export default SignInPage;
