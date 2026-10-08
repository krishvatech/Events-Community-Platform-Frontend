// Public website StandardPage route: /frequently-asked-questions, /references,
// /terms-and-conditions, /privacy-policy, /imprint (see src/lib/publicSite.js).
//
// One implementation for all five: the slug is matched against the allow-list, the page is
// resolved by its complete path within the configured Wagtail Site, and the content plus
// page-specific metadata are rendered into the initial server HTML by one renderer.
//
// Content precedence (src/lib/publicCmsResponse.js): a published CMS page wins, as it is;
// approved default content only when the backend reports the page as genuinely absent;
// every other case (unknown slug, draft/unpublished/archived/restricted page, no default)
// is a real HTTP 404 via `notFound()`. A backend or network failure throws and is shown by
// ./error.jsx, so an outage is never turned into a 404 or into default content.
import { notFound } from "next/navigation";
import StandardPageArticle from "@/components/public/StandardPageArticle.jsx";
import { loadPublicStandardPage } from "@/lib/publicCms.server";
import { canonicalUrl } from "@/lib/publicSite";

// Always render per request: content must change as soon as it is published or unpublished,
// and the backend must not be contacted at build time.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const resolved = await loadPublicStandardPage(slug);
  if (!resolved) return {};

  const { page } = resolved;
  const title = page.seo_title || page.title;
  const description = page.search_description || undefined;
  const canonical = canonicalUrl(`/${slug}`);

  return {
    title: { absolute: title },
    description,
    ...(canonical ? { alternates: { canonical } } : {}),
    openGraph: {
      title,
      description,
      type: "article",
      siteName: "IMAA Connect",
      ...(canonical ? { url: canonical } : {}),
    },
  };
}

export default async function PublicStandardPage({ params }) {
  const { slug } = await params;
  const resolved = await loadPublicStandardPage(slug);
  if (!resolved) notFound();

  return <StandardPageArticle page={resolved.page} source={resolved.source} />;
}
