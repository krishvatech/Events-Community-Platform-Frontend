// src/components/Footer.jsx
import React from "react";
import { Link } from "react-router-dom";
import { FaGraduationCap } from "react-icons/fa";

const Footer = () => {
  return (
    <footer className="bg-white border-top border-gray-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand + blurb */}
          <div>
            <div className="flex items-center gap-3">
              <FaGraduationCap className="text-indigo-600 text-2xl md:text-3xl" />
              <span className="font-bold tracking-tight text-xl md:text-2xl">
                IMAA Platform
              </span>
            </div>
            <p className="mt-4 text-base md:text-lg leading-relaxed text-gray-600">
              Empowering professionals to connect, learn, and grow through
              comprehensive community management tools.
            </p>
          </div>

          {/* Platform */}
          <div>
            <h4 className="font-bold text-gray-900 text-lg md:text-xl">Platform</h4>
            <ul className="mt-4 space-y-3 text-base md:text-lg text-gray-700">
              <li><Link to="/#events" className="hover:text-gray-900">Events</Link></li>
              <li><Link to="/#community" className="hover:text-gray-900">Community</Link></li>
              <li><Link to="/#mentoring" className="hover:text-gray-900">Mentoring</Link></li>
              <li><Link to="/#blog" className="hover:text-gray-900">Blog</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-bold text-gray-900 text-lg md:text-xl">Support</h4>
            <ul className="mt-4 space-y-3 text-base md:text-lg text-gray-700">
              <li><a href="#" className="hover:text-gray-900">Help Center</a></li>
              <li><a href="#" className="hover:text-gray-900">Documentation</a></li>
              <li><a href="#" className="hover:text-gray-900">Contact Us</a></li>
              <li><a href="#" className="hover:text-gray-900">System Status</a></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-bold text-gray-900 text-lg md:text-xl">Company</h4>
            <ul className="mt-4 space-y-3 text-base md:text-lg text-gray-700">
              <li><a href="#" className="hover:text-gray-900">About</a></li>
              <li><a href="#" className="hover:text-gray-900">Privacy</a></li>
              <li><a href="#" className="hover:text-gray-900">Terms</a></li>
              <li><a href="#" className="hover:text-gray-900">Security</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 text-sm md:text-base text-gray-500">
          © {new Date().getFullYear()} IMAA Platform. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
