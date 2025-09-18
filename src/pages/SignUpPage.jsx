import React, { useState } from 'react';
import HeroSection from '../components/HeroSection.jsx';
import AuthToggle from '../components/AuthToggle.jsx';
import InputField from '../components/InputField.jsx';
import FeaturesSection from '../components/FeaturesSection.jsx';
import { registerUser } from '../utils/api';

/**
 * Sign up page containing a hero on the left and registration form on the right.
 */
const SignUpPage = () => {
  const [formData, setFormData] = useState({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  // ✅ added
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ✅ modified to call backend
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setOk('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      const res = await registerUser({
        username: formData.username,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
      });

      // res should include { full_name, email, access, refresh, ... }
      setOk(`Welcome ${res.full_name || res.email}!`);
      // Optional: persist tokens and redirect
      // localStorage.setItem('access', res.access);
      // localStorage.setItem('refresh', res.refresh);
      // navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed');
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
          <p className="text-2sm text-gray-600 mb-6 text-center">Sign up to access your learning journey</p>
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
            <AuthToggle />
            <form onSubmit={handleSubmit}>
              <InputField
                label="Username"
                name="username"
                type="text"
                placeholder="JohnDoe"
                value={formData.username}
                onChange={handleChange}
                required
              />
              <div className="flex flex-col sm:flex-row gap-4">
                <InputField
                  label="First Name"
                  name="firstName"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                />
                <InputField
                  label="Last Name"
                  name="lastName"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                />
              </div>
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
                placeholder="Create a secure password"
                value={formData.password}
                onChange={handleChange}
                required
              />
              <InputField
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
              {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
              {ok && <p className="text-green-600 text-sm mt-2">{ok}</p>}
              <button
                type="submit"
                className="w-full py-2 px-4 mt-2 bg-primary hover:bg-primary-dark text-white rounded-md font-medium transition"
              >
                Create Your Account
              </button>
            </form>
            <p className="text-2xs text-gray-500 mt-4">
              By joining, you agree to our{' '}
              <a href="#" className="text-primary font-semibold hover:underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="text-primary font-semibold hover:underline">
                Privacy Policy
              </a>
              .
            </p>
          </div>
          <FeaturesSection />
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;
