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

  const filterInput = (value, field) => {
    switch (field) {
      case "username":
        return value.replace(/[^a-zA-Z0-9]/g, "");
      case "firstName":
      case "lastName":
        return value.replace(/[^a-zA-Z]/g, "");
      case "email":
        return value.replace(/\s/g, "");
      case "password":
      case "confirmPassword":
        return value.replace(/\s/g, "");
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

  const validate = () => {
    let newErrors = {};

    if (!/^[A-Za-z0-9]{6,}$/.test(formData.username)) {
      newErrors.username =
        "Username must be at least 6 characters, only letters & digits, no spaces";
    }

    if (!/^[A-Za-z]{3,}$/.test(formData.firstName || "")) {
      newErrors.firstName = "First name must be at least 3 letters, alphabets only";
    }

    if (!/^[A-Za-z]{3,}$/.test(formData.lastName || "")) {
      newErrors.lastName = "Last name must be at least 3 letters, alphabets only";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email || "")) {
      newErrors.email = "Enter a valid email address";
    }

    const strongPwd =
      /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!strongPwd.test(formData.password || "")) {
      newErrors.password =
        "Min 8 chars, include 1 uppercase, 1 number, 1 special character";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await registerUser({
        username: formData.username,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
      });
      toast.success("✅ Account created! You can now sign in.");
    } catch (err) {
      toast.error(`❌ ${err.message || "Signup failed"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen flex flex-col lg:flex-row">
        <div className="lg:w-1/2 lg:min-h-screen">
          <HeroSection />
        </div>

        <div className="flex-1 flex flex-col justify-center p-6 sm:p-12 bg-white">
          <div className="max-w-md w-full mx-auto">
            <h1 className="text-2xl text-gray-800 mb-2 text-center">Welcome</h1>
            <p className="text-sm text-gray-600 mb-6 text-center">
              Sign up to access your learning journey
            </p>

            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
              <AuthToggle />
              <form onSubmit={handleSubmit} noValidate>
                <InputField label="Username" name="username" type="text" placeholder="JohnDoe" value={formData.username} onChange={handleChange} />
                {errors.username && <p className="text-red-500 text-xs">{errors.username}</p>}

                <InputField label="First Name" name="firstName" type="text" placeholder="John" value={formData.firstName} onChange={handleChange} />
                {errors.firstName && <p className="text-red-500 text-xs">{errors.firstName}</p>}

                <InputField label="Last Name" name="lastName" type="text" placeholder="Doe" value={formData.lastName} onChange={handleChange} />
                {errors.lastName && <p className="text-red-500 text-xs">{errors.lastName}</p>}

                <InputField label="Email" name="email" type="email" placeholder="your@email.com" value={formData.email} onChange={handleChange} />
                {errors.email && <p className="text-red-500 text-xs">{errors.email}</p>}

                <InputField label="Password" name="password" type="password" placeholder="Create a secure password" value={formData.password} onChange={handleChange} />
                {errors.password && <p className="text-red-500 text-xs">{errors.password}</p>}

                <InputField label="Confirm Password" name="confirmPassword" type="password" placeholder="Confirm your password" value={formData.confirmPassword} onChange={handleChange} />
                {errors.confirmPassword && <p className="text-red-500 text-xs">{errors.confirmPassword}</p>}

                <button type="submit" disabled={loading} className="w-full py-2 px-4 bg-primary hover:bg-primary-dark text-white rounded-md font-medium transition disabled:opacity-60">
                  {loading ? "Creating account..." : "Create Account"}
                </button>
              </form>

              <FeaturesSection />
            </div>
          </div>
        </div>
      </div>

      <ToastContainer position="top-center" autoClose={2000} theme="colored" />
    </>
  );
};

export default SignUpPage;
