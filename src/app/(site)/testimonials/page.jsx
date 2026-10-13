// Public Testimonials page: the published cms.TestimonialsPage and the public Testimonial snippets
// (newest first, programme filters), server-rendered on the public website shell.
//
// No published page is a real HTTP 404 via `notFound()`; a backend or network failure throws and
// is shown by ../error.jsx, never as a 404 or substitute content.
import { notFound } from "next/navigation";
import TestimonialsPageView from "@/components/public/testimonials/TestimonialsPageView.jsx";
import { loadPublicTestimonialsPage } from "@/lib/publicBatch3.server";
import { canonicalUrl } from "@/lib/publicSite";

// Always render per request; the backend must not be contacted at build time.
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const page = await loadPublicTestimonialsPage();
  if (!page) return {};

  const title = page.seo_title || page.hero_title || page.title;
  const description = page.search_description || page.hero_intro || undefined;
  const canonical = canonicalUrl("/testimonials");

  return {
    title: { absolute: title },
    description,
    ...(canonical ? { alternates: { canonical } } : {}),
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "IMAA Connect",
      ...(canonical ? { url: canonical } : {}),
    },
  };
}

export default async function PublicTestimonialsPage() {
  const page = await loadPublicTestimonialsPage();
  if (!page) notFound();
  return <TestimonialsPageView page={page} />;
}
