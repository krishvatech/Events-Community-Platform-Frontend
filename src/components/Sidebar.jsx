// src/components/Sidebar.jsx
import React, { useState } from "react";

const Sidebar = () => {
  const [active, setActive] = useState("Dashboard");

  const base =
    "flex items-center gap-3 p-2 rounded-lg font-medium text-base transition-colors";;

  // Inactive: force solid dark grey
    const inactive =
    "!text-medium text-neutral-700 dark:text-grey-300 hover:!text-[#1bbbb3]";

    // Active: teal
    const activeCls = "text-[#1bbbb3] font-medium text-base opacity-100";

  const linkClasses = (name) =>
    `${base} ${active === name ? activeCls : inactive}`;

  const Link = ({ name, iconPath, children }) => (
    <a
      href="#"
      onClick={() => setActive(name)}
      className={linkClasses(name)}
    >
      <svg
        className="w-5 h-5 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.0"
            d={iconPath}
        />
    </svg>
      {children}
    </a>
  );

  return (
<aside className="w-64 bg-background-light dark:bg-background-dark border-r border-[#1bbbb3]/10 p-6 hidden md:block">


      <nav className="flex flex-col gap-4">
        <Link name="Dashboard" iconPath="M3 12l2-2m0 0l7-7 7 7M6 7l7-7 7 7">
          Dashboard
        </Link>
        <Link name="My Events" iconPath="M8 7h12m0 0l-4-4m4 4l-4 4m6-4h-4m0 0V4m0 6V7">
          My Events
        </Link>
        <Link
          name="Community"
          iconPath="M17 20h5v-2a2 2 0 00-2-2h-5a2 2 0 00-2 2v2zm0-7a2 2 0 012-2h5a2 2 0 012 2v5a2 2 0 01-2 2h-5a2 2 0 01-2-2v-5z"
        >
          Community
        </Link>
        <Link
          name="Resources"
          iconPath="M12 15v2m-6 4h12a2 2 0 002-2v-4a2 2 0 00-2-2H6a2 2 0 00-2 2v4a2 2 0 002 2zM8 3h8a2 2 0 012 2v1a2 2 0 01-2 2H8a2 2 0 01-2-2V5a2 2 0 012-2z"
        >
          Resources
        </Link>
        <Link
          name="Settings"
          iconPath="M10.325 4.315c.552-3.361 5.522-3.361 6.074 0 .552 3.361-5.522 3.361-6.074 0zM1.325 11.315c.552-3.361 5.522-3.361 6.074 0 .552 3.361-5.522 3.361-6.074 0zM20.325 11.315c-.552-3.361-5.522-3.361-6.074 0-.552 3.361 5.522 3.361 6.074 0zM3.325 19.315c.552-3.361 5.522-3.361 6.074 0 .552-3.361-5.522 3.361-6.074 0zM10.325 19.315c-.552-3.361-5.522-3.361-6.074 0-.552 3.361 5.522 3.361 6.074 0zM17.325 19.315c-.552-3.361-5.522-3.361-6.074 0z"
        >
          Settings
        </Link>
      </nav>
    </aside>
  );
};

export default Sidebar;
