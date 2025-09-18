import React from 'react';
import { FaGoogle, FaLinkedinIn } from 'react-icons/fa';

/**
 * Renders a horizontal separator with an optional text and two social login buttons.
 * Buttons currently execute dummy handlers.
 */
const SocialLogin = () => {
  const handleGoogle = () => {
    alert('Google login is not implemented yet.');
  };
  const handleLinkedIn = () => {
    alert('LinkedIn login is not implemented yet.');
  };

  return (
    <div className="mt-6">
      <div className="flex items-center my-4">
        <div className="flex-grow h-px bg-gray-200" />
        <span className="mx-2 text-xs text-gray-500 uppercase">Or continue with</span>
        <div className="flex-grow h-px bg-gray-200" />
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          onClick={handleGoogle}
          className="flex items-center justify-center w-full sm:w-1/2 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium bg-white hover:bg-gray-50 transition"
        >
          <FaGoogle className="mr-2 text-red-600" /> Google
        </button>
        <button
          onClick={handleLinkedIn}
          className="flex items-center justify-center w-full sm:w-1/2 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium bg-white hover:bg-gray-50 transition"
        >
          <FaLinkedinIn className="mr-2 text-blue-700" /> LinkedIn
        </button>
      </div>
    </div>
  );
};

export default SocialLogin;
