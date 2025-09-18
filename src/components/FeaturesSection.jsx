import React from 'react';
import { FaBookOpen, FaNetworkWired, FaCalendarAlt } from 'react-icons/fa';

/**
 * Displays a set of feature cards below the authentication card.
 */
const FeaturesSection = () => {
  const features = [
    {
      title: 'Continuous Learning',
      description: 'Keep your knowledge up‑to‑date with new content.',
      icon: FaBookOpen,
      color: 'text-blue-600',
    },
    {
      title: 'Professional Network',
      description: 'Connect with peers and industry experts.',
      icon: FaNetworkWired,
      color: 'text-green-600',
    },
    {
      title: 'Exclusive Events',
      description: 'Participate in transformative events.',
      icon: FaCalendarAlt,
      color: 'text-purple-600',
    },
  ];

  return (
    <div className="mt-12 grid gap-4 sm:grid-cols-3">
      {features.map(({ title, description, icon: Icon, color }, index) => (
        <div
          key={index}
          className="flex flex-col items-center text-center p-4 rounded-lg border border-gray-200 shadow-sm bg-white"
        >
          <div
            className={`p-3 rounded-full bg-gray-100 mb-2 ${color} text-xl flex items-center justify-center`}
          >
            <Icon />
          </div>
          <h3 className="font-semibold text-sm mb-1">{title}</h3>
          <p className="text-xs text-gray-600">{description}</p>
        </div>
      ))}
    </div>
  );
};

export default FeaturesSection;
