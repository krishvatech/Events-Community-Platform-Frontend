import React, { useState } from 'react';
import HeroSection from '../components/HeroSection.jsx';
import AuthToggle from '../components/AuthToggle.jsx';
import InputField from '../components/InputField.jsx';
import FeaturesSection from '../components/FeaturesSection.jsx';

/**
 * Sign up page containing a hero on the left and registration form on the right.
 */
const SignUpPage = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Basic client-side validation
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    // Mock signup handler
    alert(`Account created for ${formData.firstName} ${formData.lastName}`);
    // In a real application, call your registration API here
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
              <button
                type="submit"
                className="w-full py-2 px-4 mt-2 bg-primary hover:bg-primary-dark text-white rounded-md font-medium transition"
              >
                Create Your Account
              </button>
            </form>
            <p className="text-xs text-gray-500 mt-4">
              By joining, you agree to our{' '}
              <a href="#" className="text-primary hover:underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="text-primary hover:underline">
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
