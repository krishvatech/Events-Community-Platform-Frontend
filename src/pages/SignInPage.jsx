import React, { useState } from 'react';
import HeroSection from '../components/HeroSection.jsx';
import AuthToggle from '../components/AuthToggle.jsx';
import InputField from '../components/InputField.jsx';
import SocialLogin from '../components/SocialLogin.jsx';
import FeaturesSection from '../components/FeaturesSection.jsx';

/**
 * Sign in page containing a hero on the left and authentication form on the right.
 */
const SignInPage = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Mock login handler
    alert(`Logged in as ${formData.email}`);
    // In a real application, call your authentication API here
    // On success, redirect to dashboard/home page
    // navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left hero section */}
      <div className="lg:w-1/2 lg:h-auto h-96">
        <HeroSection />
      </div>
      {/* Right form container */}
      <div className="flex-1 flex flex-col justify-center p-6 sm:p-12 bg-white">
        <div className="max-w-md w-full mx-auto">
          <h1 className="text-2xl font-semibold text-gray-800 mb-2">Welcome Back</h1>
          <p className="text-sm text-gray-600 mb-6">Sign in to access your learning journey</p>
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
