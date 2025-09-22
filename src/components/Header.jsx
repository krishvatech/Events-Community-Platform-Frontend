// src/components/Header.jsx
import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

const Header = () => {
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(
    !!localStorage.getItem("token") || !!localStorage.getItem("access_token")
  );
  const location = useLocation();

  useEffect(() => {
    const onStorage = () =>
      setAuthed(
        !!localStorage.getItem("token") || !!localStorage.getItem("access_token")
      );
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => setOpen(false), [location.pathname, location.hash]);

  const NavA = ({ href, children }) => (
    <a
      href={href}
      className="px-4 py-2 text-base text-gray-500 hover:text-teal-400 transition-colors"
    >
      {children}
    </a>
);


  const signOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    setAuthed(false);
    window.location.href = "/";
  };

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-[#1bbbb3]/10">
      <div className="mx-auto max-w-7xl h-14 md:h-16 px-3 sm:px-4 lg:px-6 flex items-center justify-between">
        {/* Left: Logo + Brand */}
        <Link to="/" className="flex items-center gap-2">
          <svg width="32" height="32" viewBox="0 0 48 48" className="text-teal-500">
            <path
              fill="currentColor"
              d="M39.5 21.6c.9-.2 1.2 0 1.3.1.1.1.2.5.1 1.1-.1.7-.4 1.7-1 2.9-1.2 2.4-3.4 5.4-6.3 8.3s-5.9 5.1-8.3 6.3c-1.2.6-2.2.9-2.9 1-.6.1-1 0-1.1-.1-.1-.1-.3-.4-.1-1.3.2-1.1.8-2.5 1.8-4.1 1.3-2 3.1-4.2 5.3-6.4s4.4-4 6.4-5.3c1.6-1 3-1.6 4.1-1.8ZM4.4 29.2 18.8 43.6c1.1 1.1 2.6 1.3 4 1.2 1.3-.1 2.8-.6 4.2-1.3 3-1.4 6.3-3.9 9.4-7s5.6-6.4 7-9.4c.7-1.4 1.1-2.9 1.2-4.2.1-1.4 0-2.9-1.2-4L29.2 4.4c-1.4-1.4-3.4-1.4-5-.9-1.7.4-3.6 1.2-5.4 2.4-2.3 1.4-4.9 3.5-7.2 5.8-2.3 2.3-4.4 4.9-5.8 7.2-1.2 1.8-1.9 3.7-2.3 5.4-.5 1.6-.5 3.6.9 5Z"
            />
          </svg>
          {/* Bigger brand on md+ */}
          <span className="text-xl md:text-xl font-bold tracking-tight text-neutral-800">
            IMAA Connect
          </span>
        </Link>

        {/* Center: Nav (desktop) */}
        <nav className="hidden md:flex items-center">
          <NavA href="/#events">Events</NavA>
          <NavA href="/#community">Community</NavA>
          <NavA href="/#resources">Resources</NavA>
          <NavA href="/#about">About Us</NavA>
        </nav>

        {/* Right: Actions */}
        <div className="hidden md:flex items-center gap-2.5">
          {authed ? (
            <>
              <button
                onClick={signOut}
                className="h-9 inline-flex items-center justify-center px-4 rounded-xl text-base font-semibold
                          bg-teal-500 text-white
                          transition-all duration-200 hover:bg-teal-600 hover:-translate-y-0.5
                          focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/signin"
                className="h-9 inline-flex items-center justify-center px-4 rounded-xl text-base font-semibold
                          bg-teal-100 text-teal-500 border border-teal-100
                          transition-all duration-200 hover:bg-teal-200 hover:text-teal-600 hover:-translate-y-0.5
                          focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60"
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="h-9 inline-flex items-center justify-center px-4 rounded-xl text-base font-semibold
                          bg-teal-500 text-white
                          transition-all duration-200 hover:bg-teal-600 hover:-translate-y-0.5
                          focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60"
              >
                Join Now
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-1.5 rounded hover:bg-gray-100"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" className="text-neutral-700">
            <path fill="currentColor" d="M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z" />
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      <div
        className={`md:hidden border-t border-gray-100 transition-[max-height] duration-300 overflow-hidden ${
          open ? "max-h-96" : "max-h-0"
        }`}
      >
        <nav className="px-4 py-3 flex flex-col">
          <a href="/#events" className="py-2 text-lg text-gray-600 hover:text-gray-900">Events</a>
          <a href="/#community" className="py-2 text-lg text-gray-600 hover:text-gray-900">Community</a>
          <a href="/#resources" className="py-2 text-lg text-gray-600 hover:text-gray-900">Resources</a>
          <a href="/#about" className="py-2 text-lg text-gray-600 hover:text-gray-900">About Us</a>

          {authed ? (
            <div className="mt-3 flex gap-2">
              <button
                onClick={signOut}
                className="flex-1 inline-flex items-center justify-center h-10 rounded-xl bg-neutral-900 text-white text-base font-semibold"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="mt-3 flex gap-2">
              <Link
                to="/signin"
                className="flex-1 inline-flex items-center justify-center h-10 rounded-xl bg-teal-50 text-teal-700 border border-teal-100 text-base font-semibold"
                onClick={() => setOpen(false)}
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="flex-1 inline-flex items-center justify-center h-10 rounded-xl bg-teal-600 text-white text-base font-semibold"
                onClick={() => setOpen(false)}
              >
                Join Now
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
