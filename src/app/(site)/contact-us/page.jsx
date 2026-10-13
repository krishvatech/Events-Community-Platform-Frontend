// Public Contact Us page: the published cms.ContactPage with the enquiry form, server-rendered on the
// public website shell. Rendered per request: the form's signed token is issued with each page.
//
// No published page is a real HTTP 404 via `notFound()`; a backend or network failure throws and
// is shown by ../error.jsx, never as a 404 or substitute content.
import { notFound } from "next/navigation";
import ContactPageView from "@/components/public/contact/ContactPageView.jsx";
import { loadPublicContactPage } from "@/lib/publicBatch3.server";
import { canonicalUrl } from "@/lib/publicSite";

// Always render per request; the backend must not be contacted at build time.
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const page = await loadPublicContactPage();
  if (!page) return {};

  const title = page.seo_title || page.hero_title || page.title;
  const description = page.search_description || page.hero_intro || undefined;
  const canonical = canonicalUrl("/contact-us");

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

export default async function PublicContactPage() {
  const page = await loadPublicContactPage();
  if (!page) notFound();
  return <ContactPageView page={page} />;
}
