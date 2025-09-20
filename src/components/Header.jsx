// src/components/Header.jsx
import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FaGraduationCap, FaBars, FaTimes } from "react-icons/fa";

const Header = () => {
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(
    !!localStorage.getItem("token") || !!localStorage.getItem("access_token")
  );
  const location = useLocation();

  useEffect(() => {
    const onStorage = () => {
      setAuthed(
        !!localStorage.getItem("token") || !!localStorage.getItem("access_token")
      );
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.hash]);

  const AnchorItem = ({ to, label }) => (
    <Link
      to={to}
      className="px-4 py-2 text-base md:text-lg font-medium text-gray-700 hover:text-gray-900"
      onClick={() => setOpen(false)}
    >
      {label}
    </Link>
  );

  const handleSignOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    setAuthed(false);
    window.location.href = "/";
  };

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
      <div className="mx-auto max-w-7xl h-16 md:h-20 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <FaGraduationCap className="text-indigo-600 text-2xl md:text-3xl" />
          <span className="font-bold tracking-tight text-xl md:text-2xl">
            IMAA Platform
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          <AnchorItem to="/#events" label="Events" />
          <AnchorItem to="/#community" label="Community" />
          <AnchorItem to="/#mentoring" label="Mentoring" />
          <AnchorItem to="/#blog" label="Blog" />
          <AnchorItem to="/#members" label="Members" />
        </nav>

        {/* Right side actions */}
        <div className="hidden md:flex items-center gap-3">
          {authed ? (
            <>
              <Link
                to="/dashboard"
                className="px-5 py-2.5 text-base md:text-lg font-medium rounded-xl border hover:bg-gray-50"
              >
                Dashboard
              </Link>
              <button
                onClick={handleSignOut}
                className="px-5 py-2.5 text-base md:text-lg font-semibold rounded-xl bg-gray-900 text-white hover:bg-black"
              >
                Sign Out
              </button>
            </>
          ) : (
            <Link
              to="/signin"
              className="inline-flex items-center px-5 py-2.5 text-base md:text-lg font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Sign In
            </Link>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2 rounded hover:bg-gray-100"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <FaTimes className="text-xl" /> : <FaBars className="text-xl" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-gray-100">
          <nav className="px-4 py-3 flex flex-col">
            <AnchorItem to="/#events" label="Events" />
            <AnchorItem to="/#community" label="Community" />
            <AnchorItem to="/#mentoring" label="Mentoring" />
            <AnchorItem to="/#blog" label="Blog" />
            <AnchorItem to="/#members" label="Members" />

            {authed ? (
              <div className="mt-3 flex gap-2">
                <Link
                  to="/dashboard"
                  className="flex-1 inline-flex items-center justify-center px-4 py-2.5 text-base font-medium rounded-xl border hover:bg-gray-50"
                  onClick={() => setOpen(false)}
                >
                  Dashboard
                </Link>
                <button
                  onClick={handleSignOut}
                  className="flex-1 inline-flex items-center justify-center px-4 py-2.5 text-base font-semibold rounded-xl bg-gray-900 text-white hover:bg-black"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                to="/signin"
                className="mt-3 inline-flex items-center justify-center px-4 py-2.5 text-base font-semibold rounded-xl bg-indigo-600 text-white"
                onClick={() => setOpen(false)}
              >
                Sign In
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
