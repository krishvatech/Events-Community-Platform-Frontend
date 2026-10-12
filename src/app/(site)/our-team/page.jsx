// Public Our Team page: the published cms.TeamPage and its people (TeamMember snippets),
// server-rendered on the public website shell (src/app/(site)/layout.jsx).
//
// No published page is a real HTTP 404 via `notFound()`; a backend or network failure throws and
// is shown by ../error.jsx, never as a 404 or substitute content.
import { notFound } from "next/navigation";
import TeamPageView from "@/components/public/team/TeamPageView.jsx";
import { loadPublicTeamPage } from "@/lib/publicTeam.server";
import { canonicalUrl } from "@/lib/publicSite";

// Always render per request; the backend must not be contacted at build time.
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const page = await loadPublicTeamPage();
  if (!page) return {};

  const title = page.seo_title || page.hero_title || page.title;
  const description = page.search_description || page.hero_intro || undefined;
  const canonical = canonicalUrl("/our-team");

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

export default async function PublicTeamPage() {
  const page = await loadPublicTeamPage();
  if (!page) notFound();
  return <TeamPageView page={page} />;
}
