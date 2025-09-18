import React, { useState } from "react";
import HeroSection from "../components/HeroSection.jsx";
import AuthToggle from "../components/AuthToggle.jsx";
import InputField from "../components/InputField.jsx";
import FeaturesSection from "../components/FeaturesSection.jsx";
import { registerUser } from "../utils/api";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const SignUpPage = () => {
  const [formData, setFormData] = useState({
    username: "",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // ✅ Restrict input based on field rules
  const filterInput = (value, field) => {
    switch (field) {
      case "username":
        return value.replace(/[^a-zA-Z0-9]/g, ""); // only letters + digits
      case "firstName":
      case "lastName":
        return value.replace(/[^a-zA-Z]/g, ""); // only letters
      case "email":
        return value.replace(/\s/g, ""); // remove spaces
      case "password":
      case "confirmPassword":
        return value.replace(/\s/g, ""); // remove spaces
      default:
        return value;
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const filteredValue = filterInput(value, name);
    setFormData((prev) => ({ ...prev, [name]: filteredValue }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  // ✅ Validation rules
  const validate = () => {
    let newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    } else if (!/^[A-Za-z0-9]{6,}$/.test(formData.username)) {
      newErrors.username =
        "Username must be at least 6 characters, only letters & digits, no spaces";
    }

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    } else if (!/^[A-Za-z]{3,}$/.test(formData.firstName)) {
      newErrors.firstName =
        "First name must be at least 3 letters, alphabets only, no spaces";
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    } else if (!/^[A-Za-z]{3,}$/.test(formData.lastName)) {
      newErrors.lastName =
        "Last name must be at least 3 letters, alphabets only, no spaces";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email) || /\s/.test(formData.email)) {
        newErrors.email = "Enter a valid email address (no spaces)";
      }
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (
      !/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(
        formData.password
      )
    ) {
      newErrors.password =
        "Password must be 8+ chars, include 1 uppercase, 1 number & 1 special character, no spaces";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    if (!validate()) return;

    try {
      setLoading(true);
      const res = await registerUser({
        username: formData.username,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
      });

      toast.success(`🎉 Welcome ${res.full_name || res.email}!`, {
        position: "top-center",
      });
    } catch (err) {
      toast.error(`❌ ${err.message || "Registration failed"}`, {
        position: "top-center",
      });
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

        {/* Right form container */}
        <div className="flex-1 flex flex-col justify-center p-6 sm:p-12 bg-white">
          <div className="max-w-md w-full mx-auto">
            <h1 className="text-2xl text-gray-800 mb-2 text-center">Welcome</h1>
            <p className="text-2sm text-gray-600 mb-6 text-center">
              Sign up to access your learning journey
            </p>

            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
              <AuthToggle />
              <form onSubmit={handleSubmit} noValidate>
                {/* Username */}
                <InputField
                  label="Username"
                  name="username"
                  type="text"
                  placeholder="JohnDoe"
                  value={formData.username}
                  onChange={handleChange}
                />
                {errors.username && (
                  <p className="text-red-500 text-xs">{errors.username}</p>
                )}

                {/* First + Last Name */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <InputField
                      label="First Name"
                      name="firstName"
                      placeholder="John"
                      value={formData.firstName}
                      onChange={handleChange}
                    />
                    {errors.firstName && (
                      <p className="text-red-500 text-xs">{errors.firstName}</p>
                    )}
                  </div>
                  <div className="flex-1">
                    <InputField
                      label="Last Name"
                      name="lastName"
                      placeholder="Doe"
                      value={formData.lastName}
                      onChange={handleChange}
                    />
                    {errors.lastName && (
                      <p className="text-red-500 text-xs">{errors.lastName}</p>
                    )}
                  </div>
                </div>

                {/* Email */}
                <InputField
                  label="Email Address"
                  name="email"
                  type="text"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={handleChange}
                />
                {errors.email && (
                  <p className="text-red-500 text-xs">{errors.email}</p>
                )}

                {/* Password */}
                <InputField
                  label="Password"
                  name="password"
                  type="password"
                  placeholder="Create a secure password"
                  value={formData.password}
                  onChange={handleChange}
                />
                {errors.password && (
                  <p className="text-red-500 text-xs">{errors.password}</p>
                )}

                {/* Confirm Password */}
                <InputField
                  label="Confirm Password"
                  name="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
                {errors.confirmPassword && (
                  <p className="text-red-500 text-xs">
                    {errors.confirmPassword}
                  </p>
                )}

                {/* General errors */}
                {errors.general && (
                  <p className="text-red-500 text-sm mt-2">{errors.general}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 px-4 mt-2 bg-primary hover:bg-primary-dark text-white rounded-md font-medium transition"
                >
                  {loading ? "Creating..." : "Create Your Account"}
                </button>
              </form>

              <p className="text-2xs text-gray-500 mt-4">
                By joining, you agree to our{" "}
                <a
                  href="#"
                  className="text-primary font-semibold hover:underline"
                >
                  Terms of Service
                </a>{" "}
                and{" "}
                <a
                  href="#"
                  className="text-primary font-semibold hover:underline"
                >
                  Privacy Policy
                </a>
                .
              </p>
            </div>

            <FeaturesSection />
          </div>
        </div>
      </div>

      {/* Toast container */}
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

export default SignUpPage;
