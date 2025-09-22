// src/pages/Dashboard.jsx
import React from "react";
import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";
import Sidebar from "../components/Sidebar.jsx";

const Dashboard = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const name = user?.profile?.full_name || user?.name || " [User Name]";

  return (
    <>
      <Header />
      <main className="bg-background-light dark:bg-background-dark min-h-screen text-neutral-800 dark:text-gray-200 flex">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <div className="flex-1 flex flex-col border-l border-gray-100 dark:border-white/10
  p-6 md:p-12">
          {/* Welcome */}
          <section className="mb-12">
            <h1 className="text-4xl font-bold text-neutral-900 dark:text-black mb-4">
              Welcome back, {name}!
            </h1>
            <p className="text-lg text-neutral-600 dark:text-grey-300">
              Here's a summary of your activity and upcoming opportunities.
            </p>
          </section>

          {/* Top 3 cards */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            {/* Upcoming Events */}
            <div className="bg-white dark:bg-background-dark rounded-xl
  shadow-sm p-6 border border-gray-200 dark:border-white/10">
              <h3 className="text-xl font-bold text-neutral-900 dark:text-black mb-4">
                Upcoming Events for You
              </h3>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-medium text-neutral-800 dark:text-grey-200">
                      The Annual M&A Summit
                    </span>
                    <span className="text-sm text-neutral-500 dark:text-grey-400">
                      October 26, 2024
                    </span>
                  </div>
                  <button className="px-3 py-1 rounded-lg text-sm font-semibold bg-[#1bbbb3] text-white hover:bg-opacity-80 transition">
  View
</button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-medium text-neutral-800 dark:text-grey-200">
                      Networking Mixer for Dealmakers
                    </span>
                    <span className="text-sm text-neutral-500 dark:text-grey-400">
                      November 10, 2024
                    </span>
                  </div>
                  <button className="px-3 py-1 rounded-lg text-sm font-semibold bg-[#1bbbb3] text-white hover:bg-opacity-80 transition">
                    View
                  </button>
                </div>
                <a href="#" className="text-[#1bbbb3] font-semibold mt-2 block hover:underline">
                  See All Events
                </a>
              </div>
            </div>

           {/* Community Activity */}
          <div className="bg-white dark:bg-background-dark rounded-xl
  shadow-sm p-6 border border-gray-200 dark:border-white/10">
            <h3 className="text-xl font-bold text-neutral-900 dark:text-black mb-4">
              Recent Community Activity
            </h3>

            <div className="flex flex-col gap-3">
              {/* Row 1 */}
              <div className="flex items-center gap-3">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDdSPl7HlGanqF5RiHaWSVQ9QI2CYal_9-3lhgFRuUcj0LJ7FyigScYCf42bDup4QYrla0Aln-C46uqeXJhIAksFjdBMKfMlx_XL76mZWGp5BfQfXPY5QK2DoXBXPXXgOu-5o9NfaoHXbPutMkZQKI90QZLq2rz60xJrX6Ai2ZtuTA-p3Z7OmGbaSqKCuLIgLgHHa3cZbj2wjcEa2RzvP2CsMOmz4Ele0pUh4DmzsREvZpWCqFWyomvrXSxSqxYLdpE8Rqhp6NOVw"
                  alt="User Avatar"
                  className="w-10 h-10 rounded-full object-cover"
                />
                {/* 👇 key: min-w-0 lets truncation work inside flex */}
                <div className="flex flex-col min-w-0">
                  <span className="font-medium text-neutral-800 dark:text-grey-200">
                    Sarah Chen posted:
                  </span>
                  {/* single-line truncation */}
                  <p className="text-sm text-gray-700 dark:text-gray-400 overflow-hidden text-ellipsis whitespace-nowrap">
                    Excited to share my insights on recent market trends...
                  </p>
                  {/* If you prefer 2 lines instead of one, and you use the line-clamp plugin:
                      <p className="text-sm text-gray-700 dark:text-gray-400 line-clamp-2">
                        Excited to share my insights on recent market trends...
                      </p>
                  */}
                </div>
              </div>

              {/* Row 2 */}
              <div className="flex items-center gap-3">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCQW-ZoVKENpsFY1tjGkibf08ZkqKxluVLOwsfGJgAXDPQe3ARaxI0Fpq8kvwyPzBs_xUqZ99oTq0tCiEIBdPjYmlXmuJaQ_NNWaJJ4Slt0Is4kMTPG7EBC4DGWIkdkjA4PG8kTikw8UF-U_yf8mdO89_yz10W74VT6tRaEJwPFzMHfhN_pJTYCN4vP9c8p67yFfQrKgTOqNZs_u7vwTAVuNqlWDxuMSUDiOoVQ4RjquGzVTeIuaFu1lUidUFC-Z1pk7-ZY-j9M8A"
                  alt="User Avatar"
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div className="flex flex-col min-w-0">
                  <span className="font-medium text-neutral-800 dark:text-grey-200">
                    New Discussion: Valuation Strategies
                  </span>
                  <p className="text-sm text-gray-700 dark:text-gray-400 overflow-hidden text-ellipsis whitespace-nowrap">
                    Join the conversation about effective valuation methods...
                  </p>
                </div>
              </div>

              <a href="#" className="text-[#1bbbb3] font-semibold mt-2 block hover:underline">
                Visit Community
              </a>
            </div>
          </div>


            {/* Resources */}
            <div className="bg-white dark:bg-background-dark rounded-xl
  shadow-sm p-6 border border-gray-200 dark:border-white/10">
              <h3 className="text-xl font-bold text-neutral-900 dark:text-black mb-4">
                Recommended Resources
              </h3>
              <div className="flex flex-col gap-3">
                <a
                  href="#"
                  className="text-neutral-800 dark:text-grey-200 hover:text-primary font-medium"
                >
                  Guide to M&A Due Diligence
                </a>
                <a
                  href="#"
                  className="text-neutral-800 dark:text-grey-200 hover:text-primary font-medium"
                >
                  Top 5 M&A Trends for 2024
                </a>
                <a
                  href="#"
                  className="text-neutral-800 dark:text-grey-200 hover:text-primary font-medium"
                >
                  Webinar: Navigating Deal Complexity
                </a>
                <a href="#" className="text-[#1bbbb3] font-semibold mt-2 block hover:underline">
                  Explore All Resources
                </a>
              </div>
            </div>
          </section>

          {/* Bottom 2 cards */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Network */}
            <div className="bg-white dark:bg-background-dark rounded-xl
  shadow-sm p-6 border border-gray-200 dark:border-white/10">
              <h3 className="text-xl font-bold text-neutral-900 dark:text-black mb-4">
                Your Network
              </h3>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDpUlccQRm1PXSS0loNs-FKCqJTs4a7F_YMYhd-hWRaPT2NmhXcGfJSEbAEXEiV1YJWFOPV2ZFhpmcXmvvCxdK8LvzQevucug9zBpmskeywIkcStxazGqZ6pNPZk3PCYgx7DTh5lMxamy0J8FQ91lyswO3lzn5ReWAmmE9XvkrBuHhhaK3K9f97ozDa_VcaF_Jnhf-cdNxLVeU85fS7w_5zed_VX1KW1lhohLNn2fXdZs4djuNERHa-la-kQoGfpE36EWIB4qn3oQ"
                    alt="David Lee"
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="flex flex-col">
                    <span className="font-medium text-neutral-800 dark:text-grey-200">
                      David Lee
                    </span>
                    <span className="text-sm text-neutral-500 dark:text-grey-400">
                      M&A Advisor
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBHKjDgAAMcSOy6ZsGC9_IG-SmJR4XLhvxvQGjuOs4Vuj9EicNWSohpqOz76rcop0_KtYJrD--JYG3XgdfGUjjLTc3VGAcREdHC66b7TYZ4fPy8Y127xDhvRyqXhdIPcLHnc3HOlh5-AMjErYzkAy0kfaaB9WwKYbooqpeoZ6iKUZbT5fdW_JOy4Qxs-rxvaw3uA-K7_vFbg1N1_yZcmCEZ-PISeaU89b1Noeujcgstqz_vZozsyNQS0PlCf6gSc1ZgeVqz2-06iw"
                    alt="Maria Garcia"
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="flex flex-col">
                    <span className="font-medium text-neutral-800 dark:text-grey-200">
                      Maria Garcia
                    </span>
                    <span className="text-sm text-neutral-500 dark:text-grey-400">
                      Investment Banker
                    </span>
                  </div>
                </div>
                <a href="#" className="text-[#1bbbb3] font-semibold mt-2 block hover:underline">
                  View Connections
                </a>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-background-dark rounded-xl
  shadow-sm p-6 border border-gray-200 dark:border-white/10">
              <h3 className="text-xl font-bold text-neutral-900 dark:text-black mb-4">
                Quick Actions
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <button className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#1bbbb3]/20 hover:bg-[#1bbbb3]/30 text-[#1bbbb3] transition-colors flex items-center justify-center gap-2">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M3 8l7-5 7 5M3 12l7-5 7 5m-7 5a4 4 0 01-8 0v-1a4 4 0 108 0v1z"
                    ></path>
                  </svg>
                  Register for Event
                </button>
                <button className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#1bbbb3]/20 hover:bg-[#1bbbb3]/30 text-[#1bbbb3] transition-colors flex items-center justify-center gap-2">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    ></path>
                  </svg>
                  Join Discussion
                </button>
                <button className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#1bbbb3]/20 hover:bg-[#1bbbb3]/30 text-[#1bbbb3] transition-colors flex items-center justify-center gap-2">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M11 3a1 1 0 100 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L15 6.414V11a1 1 0 102 0V6.414l1.293 1.293a1 1 0 101.414-1.414L19 3.586V3a1 1 0 10-2 0v2.586l-1.293-1.293a1 1 0 00-1.414 0L13 6.414V3a1 1 0 00-2 0V6.414l-1.293-1.293a1 1 0 00-1.414 0L7 6.414V3a1 1 0 10-2 0v2.586l-1.293-1.293A1 1 0 003 6.414V3a1 1 0 10-2 0v2.586l-1.293-1.293a1 1 0 00-1.414 0L3 6.414V3a1 1 0 10-2 0v2.586l-1.293-1.293a1 1 0 00-1.414 0L3 6.414V3a1 1 0 10-2 0v2.586l-1.293-1.293a1 1 0 00-1.414 0L3 6.414V3a1 1 0 10-2 0z"
                    ></path>
                  </svg>
                  Access Resources
                </button>
                <button className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#1bbbb3]/20 hover:bg-[#1bbbb3]/30 text-[#1bbbb3] transition-colors flex items-center justify-center gap-2">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-6m7-7l-3.586-3.586a2 2 0 00-1.414-.586h-6a2 2 0 00-2 2v3.586a2 2 0 00.586 1.414L15 12h2a2 2 0 012 2v5a2 2 0 01-2 2h-5a2 2 0 01-2-2v-2"
                    ></path>
                  </svg>
                  My Profile
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default Dashboard;
