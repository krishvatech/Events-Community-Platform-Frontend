// src/pages/SignInPage.jsx
import React, { useState } from 'react';
import HeroSection from '../components/HeroSection.jsx';
import AuthToggle from '../components/AuthToggle.jsx';
import InputField from '../components/InputField.jsx';
import SocialLogin from '../components/SocialLogin.jsx';
import FeaturesSection from '../components/FeaturesSection.jsx';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate, useLocation } from "react-router-dom";

export const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

const SignInPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ email: '', password: '' });

  const validate = () => {
    let newErrors = { email: '', password: '' };
    let valid = true;

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
      valid = false;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Enter a valid email address';
        valid = false;
      }
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      // Try to parse JSON even on error
      let data = null;
      try {
        data = await response.json();
      } catch {
        /* ignore parse errors */
      }

      if (!response.ok) {
        const msg = data?.detail || data?.error || response.statusText || 'Login failed';
        throw new Error(msg);
      }

      // Save tokens (support both keys)
      if (data?.access) {
        localStorage.setItem('access_token', data.access);
        localStorage.setItem('token', data.access); // for guards checking "token"
      }
      if (data?.refresh) {
        localStorage.setItem('refresh_token', data.refresh);
      }
      if (data?.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      toast.success(`✅ Login successful. Welcome ${formData.email}`);

      // Redirect to original target or /dashboard
      const redirectTo = location.state?.from?.pathname || '/dashboard';
      setTimeout(() => {
        navigate(redirectTo, { replace: true });
      }, 1200); // lets the toast be visible
    } catch (err) {
      toast.error(`❌ ${err.message || 'Login failed. Please try again.'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen flex flex-col lg:flex-row">
        {/* Left hero section */}
        <div className="lg:w-1/2 lg:min-h-screen">
          <HeroSection />
        </div>

        {/* Right form */}
        <div className="flex-1 flex flex-col justify-center p-6 sm:p-12 bg-white">
          <div className="max-w-md w-full mx-auto">
            <h1 className="text-2xl text-gray-800 mb-2 text-center">Welcome Back</h1>
            <p className="text-2sm text-gray-600 mb-6 text-center">
              Sign in to access your learning journey
            </p>

            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
              <AuthToggle />
              <form onSubmit={handleSubmit} noValidate>
                {/* Email */}
                <InputField
                  label="Email Address"
                  name="email"
                  type="text"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={handleChange}
                />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}

                {/* Password */}
                <InputField
                  label="Password"
                  name="password"
                  type="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                />
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}

                <div className="flex justify-end mb-4">
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() => toast.info('Password recovery is not implemented yet.')}
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 px-4 bg-primary hover:bg-primary-dark text-white rounded-md font-medium transition disabled:opacity-60"
                >
                  {loading ? 'Signing in...' : 'Sign Into Your Account'}
                </button>
              </form>
              <SocialLogin />
            </div>
            <FeaturesSection />
          </div>
        </div>
      </div>

      {/* Toasts */}
      <ToastContainer
        position="top-center"
        autoClose={2000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
    </>
  );
};

export default SignInPage;
