"use client";

// src/components/public/PublicSiteShell.jsx
// Chrome for the server-rendered public website routes (src/app/(site)) and the root 404 page.
//
// Why not AppChrome: the application shell (src/next/AppRuntime.jsx) is loaded with
// `ssr: false`, so anything inside it reaches the browser as an empty document. Public CMS
// pages need their content and metadata in the initial HTML, so they render in this
// server-renderable shell instead. It reuses the public branding (logo, tokens, Tailwind
// utilities that follow the dark palette) and the existing public footer. Auth-dependent
// actions are a client-only island (PublicAuthActions), so no user data is rendered on the
// server. Authenticated layouts, guards and the navigation adapters are untouched.
import dynamic from "next/dynamic";
import { Link } from "#navigation";
import imaaLogo from "../../assets/IMAA-logo130.svg";
import { PublicFooter } from "../Footer.jsx";
import PublicColorModeGuard from "./PublicColorModeGuard.jsx";
import PublicMobileMenu from "./PublicMobileMenu.jsx";

const imaaLogoSrc = typeof imaaLogo === "string" ? imaaLogo : imaaLogo.src;

// Reserve the actions' width until the island hydrates, so the header does not jump.
const PublicAuthActions = dynamic(() => import("./PublicAuthActions.jsx"), {
  ssr: false,
  loading: () => <span aria-hidden="true" className="inline-block h-11 w-[196px]" />,
});

// Same destinations as src/components/Header.jsx. Member-only targets keep their own guard.
const NAV_ITEMS = [
  { label: "Events", to: "/events" },
  { label: "Community", to: "/community" },
  { label: "Resources", to: "/account/resources" },
  { label: "About Us", to: "/about" },
];

// Links in this shell start the destination at the top (`resetScroll`): the header is sticky,
// so they can be used from anywhere down a long policy page. Desktop navigation from 1200px,
// the burger menu below, the same switch as the application header.
export default function PublicSiteShell({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <PublicColorModeGuard />
      <header className="sticky top-0 z-30 border-b border-imaa-border bg-white">
        <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between gap-6 px-4 sm:px-6 md:h-[76px]">
          <Link to="/" resetScroll aria-label="IMAA Connect home" className="flex shrink-0 items-center rounded-md">
            {/* Navy logo on a white plate in dark mode (brand.css .imaa-logo-plate); no effect in light mode. */}
            <img src={imaaLogoSrc} alt="IMAA" className="imaa-logo-plate block h-auto w-[130px] sm:w-[150px]" />
          </Link>
          <nav aria-label="Primary navigation" className="hidden items-center gap-8 min-[1200px]:flex">
            {NAV_ITEMS.map(({ label, to }) => (
              <Link
                key={to}
                to={to}
                resetScroll
                className="inline-flex min-h-11 items-center text-sm font-medium text-imaa-body transition-colors hover:text-imaa-teal-dark"
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="hidden items-center gap-2 min-[1200px]:flex">
            <PublicAuthActions />
          </div>
          <div className="flex items-center min-[1200px]:hidden">
            <PublicMobileMenu items={NAV_ITEMS} />
          </div>
        </div>
      </header>

      <main id="main-content" className="flex-1">
        {children}
      </main>

      <PublicFooter />
    </div>
  );
}
