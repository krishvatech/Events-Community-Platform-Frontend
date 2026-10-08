// Root 404 page (Server Component). Rendered with HTTP 404 for unknown public URLs, for
// `notFound()` thrown by the public CMS routes (no published page) and by the legacy
// catch-all (URLs that are neither a migrated page nor a deliberately legacy route).
// Uses the public shell so it is complete in the initial HTML.
import { Link } from "#navigation";
import PublicSiteShell from "@/components/public/PublicSiteShell.jsx";

export const metadata = {
  title: "Page not found | IMAA Connect",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <PublicSiteShell>
      <section className="mx-auto w-full max-w-[1200px] px-6 py-16 md:py-24">
        <p className="text-sm font-semibold uppercase tracking-[.12em] text-imaa-teal-dark">Error 404</p>
        <h1 className="mt-3 max-w-2xl font-sans text-4xl font-bold leading-[1.08] tracking-[-0.025em] text-imaa-ink md:text-5xl">
          Page not found
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-imaa-body md:text-lg">
          The page you were looking for doesn&apos;t exist or has moved.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/"
            className="inline-flex h-12 items-center rounded-full bg-[#CC4422] px-6 text-sm font-bold text-white transition-colors hover:bg-[#A9361C]"
          >
            Back to Home
          </Link>
          <Link
            to="/events"
            className="inline-flex h-12 items-center rounded-full border border-imaa-border px-6 text-sm font-bold text-imaa-ink transition-colors hover:border-imaa-border-hover"
          >
            Explore events
          </Link>
        </div>
      </section>
    </PublicSiteShell>
  );
}
