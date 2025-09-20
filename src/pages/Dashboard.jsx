// src/pages/Dashboard.jsx
import React, { useState } from 'react';
import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";

const Dashboard = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const name = user?.profile?.full_name || user?.name || "Member";

  return (
    <>
      <Header />
      <main className="bg-slate-50 min-h-[70vh]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Welcome back, {name} 👋
          </h1>
          <p className="mt-2 text-gray-600">
            Here’s a quick overview of your community activity.
          </p>

          {/* Quick stats */}
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Upcoming Events", "3"],
              ["Registered", "8"],
              ["Messages", "12"],
              ["Mentoring Matches", "2"],
            ].map(([label, value]) => (
              <div key={label} className="bg-white rounded-2xl border p-6 shadow-sm">
                <div className="text-3xl font-bold text-gray-900">{value}</div>
                <div className="text-sm text-gray-500">{label}</div>
              </div>
            ))}
          </div>

          {/* Lists */}
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <section className="bg-white rounded-2xl border p-6 shadow-sm">
              <h2 className="font-semibold text-gray-900">Upcoming events</h2>
              <ul className="mt-4 space-y-3 text-sm text-gray-700">
                <li>Tech Leadership Summit — Oct 05</li>
                <li>Community AMA — Oct 12</li>
                <li>Mentor Onboarding — Oct 18</li>
              </ul>
            </section>

            <section className="bg-white rounded-2xl border p-6 shadow-sm">
              <h2 className="font-semibold text-gray-900">Quick actions</h2>
              <div className="mt-4 flex flex-wrap gap-3">
                <a href="#events" className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700">
                  Browse Events
                </a>
                <a href="#community" className="px-4 py-2 rounded-xl border hover:bg-gray-50">
                  Open Community
                </a>
                <a href="#mentoring" className="px-4 py-2 rounded-xl border hover:bg-gray-50">
                  Find Mentor
                </a>
              </div>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default Dashboard;
