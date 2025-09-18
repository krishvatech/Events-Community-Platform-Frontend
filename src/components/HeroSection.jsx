import React from 'react';
import { FaGraduationCap, FaMedal } from 'react-icons/fa';

/**
 * Renders the left side hero panel used on both the sign‑in and sign‑up pages.
 * Includes branding, an illustration and marketing copy. Uses a remote image to avoid bundling
 * large assets into the repository.
 */
const HeroSection = () => {
  // Remote illustration representing a classroom/learning session
  const illustrationUrl =
    'https://images.pexels.com/photos/4145150/pexels-photo-4145150.jpeg?auto=compress&cs=tinysrgb&w=800';

  return (
    <div className="flex flex-col justify-between h-full p-8 sm:p-12 text-white bg-gradient-to-br from-primary via-blue-600 to-secondary relative overflow-hidden">
      {/* Branding */}
      <div>
        <div className="flex items-center mb-6">
          <div className="relative">
            <FaGraduationCap className="text-4xl" />
            <FaMedal className="absolute -top-2 -right-3 text-yellow-400 text-lg" />
          </div>
          <span className="ml-3 text-2xl font-semibold">IMAA Institute</span>
        </div>
        <h2 className="text-xl font-light">Events &amp; Community Hub</h2>
      </div>

      {/* Illustration */}
      <div className="my-6">
        <img
          src={illustrationUrl}
          alt="Learning session"
          className="rounded-lg shadow-xl w-full object-cover max-h-64 sm:max-h-72"
        />
      </div>

      {/* Description */}
      <p className="text-sm leading-relaxed max-w-sm">
        Connect with industry professionals, advance your career through continuous learning,
        and participate in transformative events that shape the future of your field.
      </p>

      {/* Cookie button placeholder */}
      <div className="mt-6">
        <button className="text-xs underline opacity-80 hover:opacity-100">
          Manage cookies or opt out
        </button>
      </div>
    </div>
  );
};

export default HeroSection;
