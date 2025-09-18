import React from 'react';
import { NavLink } from 'react-router-dom';

/**
 * Renders the navigation tabs on the authentication card.
 * It highlights the active tab based on the current URL.
 */
const AuthToggle = () => {
  return (
    <div className="flex bg-gray-100 rounded-full overflow-hidden mb-6">
      <NavLink
        to="/signin"
        className={({ isActive }) =>
          `flex-1 text-center py-2 text-sm font-medium transition-colors ` +
          (isActive ? 'bg-primary text-white' : 'text-black-700 hover:bg-gray-200')
        }
      >
        Sign In
      </NavLink>
      <NavLink
        to="/signup"
        className={({ isActive }) =>
          `flex-1 text-center py-2 text-sm font-medium transition-colors ` +
          (isActive ? 'bg-primary text-white' : 'text-black-700 hover:bg-gray-200')
        }
      >
        Join Us
      </NavLink>
    </div>
  );
};

export default AuthToggle;
