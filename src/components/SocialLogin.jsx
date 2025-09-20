import React from 'react';
import { FaGoogle, FaLinkedinIn } from 'react-icons/fa';
import { toast } from 'react-toastify';

const SocialLogin = () => {
  const handleGoogle = () => toast.info('🔐 Google login is not implemented yet.');
  const handleLinkedIn = () => toast.info('🔐 LinkedIn login is not implemented yet.');

  return (
    <div className="mt-6">
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-2 text-xs text-gray-500">or continue with</span>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <button
          onClick={handleGoogle}
          className="flex items-center justify-center w-full rounded-md text-sm font-medium bg-white hover:bg-gray-50 border px-3 py-2 transition"
        >
          <FaGoogle className="mr-2 text-red-600" /> Google
        </button>

        <button
          onClick={handleLinkedIn}
          className="flex items-center justify-center w-full rounded-md text-sm font-medium bg-white hover:bg-gray-50 border px-3 py-2 transition"
        >
          <FaLinkedinIn className="mr-2 text-blue-700" /> LinkedIn
        </button>
      </div>
    </div>
  );
};

export default SocialLogin;
