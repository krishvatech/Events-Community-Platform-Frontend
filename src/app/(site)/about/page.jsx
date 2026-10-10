// Public About page: the published cms.AboutPage, server-rendered on the public website shell
// (src/app/(site)/layout.jsx) so its content and metadata are in the initial HTML.
//
// Content comes from the backend's public by-path endpoint (src/lib/publicAbout.server.js):
// a published AboutPage renders; no page is a real HTTP 404 via `notFound()`; a backend or
// network failure throws and is shown by ../error.jsx, never as a 404 or substitute content.
import { notFound } from "next/navigation";
import AboutPageView from "@/components/public/AboutPageView.jsx";
import { loadPublicAboutPage } from "@/lib/publicAbout.server";
import { canonicalUrl } from "@/lib/publicSite";

// Always render per request: content must change as soon as it is published or unpublished,
// and the backend must not be contacted at build time.
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const page = await loadPublicAboutPage();
  if (!page) return {};

  const title = page.seo_title || page.hero_title || page.title;
  const description = page.search_description || page.hero_subtitle || undefined;
  const canonical = canonicalUrl("/about");

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
      // The WordPress hero banner is the page's social image.
      ...(page.hero_image ? { images: [{ url: page.hero_image.url, ...(page.hero_image.width ? { width: page.hero_image.width, height: page.hero_image.height } : {}) }] } : {}),
    },
  };
}

export default async function PublicAboutPage() {
  const page = await loadPublicAboutPage();
  if (!page) notFound();
  return <AboutPageView page={page} />;
}
