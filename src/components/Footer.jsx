import React from "react";

const Footer = () => (
  <footer className="bg-white border-t border-teal-500/20">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row items-center justify-between">
        {/* Match mock: footer links at text-base */}
        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-2base text-neutral-600">
          <a href="/#about" className="hover:text-teal-600">About Us</a>
          <a href="#" className="hover:text-teal-600">Contact</a>
          <a href="#" className="hover:text-teal-600">Privacy Policy</a>
          <a href="#" className="hover:text-teal-600">Terms of Service</a>
        </nav>

        <div className="flex gap-4 text-neutral-500">
          {/* Icons unchanged */}
          <a href="#" className="hover:text-teal-600" aria-label="X">
            <svg width="24" height="24" viewBox="0 0 256 256" fill="currentColor">
              <path d="M247.39,68.94A8,8,0,0,0,240,64H209.57A48.66,48.66,0,0,0,168.1,40a46.91,46.91,0,0,0-33.75,13.7A47.9,47.9,0,0,0,120,88v6.09C79.74,83.47,46.81,50.72,46.46,50.37a8,8,0,0,0-13.65,4.92c-4.31,47.79,9.57,79.77,22,98.18a110.93,110.93,0,0,0,21.88,24.2c-15.23,17.53-39.21,26.74-39.47,26.84a8,8,0,0,0-3.85,11.93c.75,1.12,3.75,5.05,11.08,8.72C53.51,229.7,65.48,232,80,232c70.67,0,129.72-54.42,135.75-124.44l29.91-29.9A8,8,0,0,0,247.39,68.94Zm-45,29.41a8,8,0,0,0-2.32,5.14C196,166.58,143.28,216,80,216c-10.56,0-18-1.4-23.22-3.08,11.51-6.25,27.56-17,37.88-32.48A8,8,0,0,0,92,169.08c-.47-.27-43.91-26.34-44-96,16,13,45.25,33.17,78.67,38.79A8,8,0,0,0,136,104V88a32,32,0,0,1,9.6-22.92A30.94,30.94,0,0,1,167.9,56c12.66.16,24.49,7.88,29.44,19.21A8,8,0,0,0,204.67,80h16Z" />
            </svg>
          </a>
          <a href="#" className="hover:text-teal-600" aria-label="Analytics">
            <svg width="24" height="24" viewBox="0 0 256 256" fill="currentColor">
              <path d="M216,24H40A16,16,0,0,0,24,40V216a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V40A16,16,0,0,0,216,24Zm0,192H40V40H216V216ZM96,112v64a8,8,0,0,1-16,0V112a8,8,0,0,1,16,0Zm88,28v36a8,8,0,0,1-16,0V140a20,20,0,0,0-40,0v36a8,8,0,0,1-16,0V112a8,8,0,0,1,15.79-1.78A36,36,0,0,1,184,140ZM100,84A12,12,0,1,1,88,72,12,12,0,0,1,100,84Z" />
            </svg>
          </a>
        </div>
      </div>

      {/* Match mock: copyright text-sm */}
      <div className="text-center text-neutral-500 text-2sm">
        © {new Date().getFullYear()} IMAA Connect. All rights reserved.
      </div>
    </div>
  </footer>
);

export default Footer;
