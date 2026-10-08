"use client";

// src/components/public/PublicAuthActions.jsx
// Sign-in actions for the server-rendered public shell (desktop header). Loaded client-only
// (ssr: false) by PublicSiteShell, because auth state lives in browser storage and must never
// reach the server-rendered HTML. Logged-out: Log in / Sign up (the existing routes).
// Signed-in member: My Account. Below 1200px the same actions are in PublicMobileMenu.
import { Link } from "#navigation";
import { useMemberSession } from "./publicSession";

const textLinkClass =
  "inline-flex h-11 items-center rounded-md px-4 text-sm font-semibold text-imaa-ink transition-colors hover:text-[#CC4422]";
const pillClass =
  "inline-flex h-11 items-center rounded-full bg-[#CC4422] px-6 text-sm font-bold text-white transition-colors hover:bg-[#A9361C]";

export default function PublicAuthActions() {
  const authed = useMemberSession();

  if (authed) {
    return (
      <Link to="/account/profile" resetScroll className={textLinkClass}>
        My Account
      </Link>
    );
  }

  return (
    <>
      <Link to="/signin" resetScroll className={textLinkClass}>
        Log in
      </Link>
      <Link to="/signup" resetScroll className={pillClass}>
        Sign up
      </Link>
    </>
  );
}
