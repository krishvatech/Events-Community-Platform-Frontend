"use client";

// Error boundary for the public website routes: shown when the CMS backend cannot be
// reached or answers with an error. This is distinct from a missing page (HTTP 404, see
// src/app/not-found.jsx) and shows no substitute content.
import { useEffect } from "react";

export default function PublicSiteError({ error, reset }) {
  useEffect(() => {
    // Keep the server-side detail out of the page; log for diagnostics only.
    console.error("[public-site] page failed to load:", error);
  }, [error]);

  return (
    <section className="mx-auto w-full max-w-[1200px] px-6 py-16 md:py-24">
      <p className="text-sm font-semibold uppercase tracking-[.12em] text-imaa-teal-dark">Temporarily unavailable</p>
      <h1 className="mt-3 max-w-2xl font-sans text-3xl font-bold leading-tight tracking-[-0.02em] text-imaa-ink md:text-4xl">
        This page can&apos;t be loaded right now
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-imaa-body md:text-lg">
        The content service did not respond. Please try again in a moment.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex h-12 items-center rounded-full bg-[#CC4422] px-6 text-sm font-bold text-white transition-colors hover:bg-[#A9361C]"
        >
          Try again
        </button>
        <a
          href="/"
          className="inline-flex h-12 items-center rounded-full border border-imaa-border px-6 text-sm font-bold text-imaa-ink transition-colors hover:border-imaa-border-hover"
        >
          Back to Home
        </a>
      </div>
    </section>
  );
}
