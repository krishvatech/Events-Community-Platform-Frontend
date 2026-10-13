// src/components/public/articles/articleRoutes.jsx
// Shared route logic of the public article sections, used by src/app/(site)/in-the-news and
// src/app/(site)/publications (archive at /<section>, article at /<section>/<slug>).
//
// Same rules as the other public pages: rendered per request on the server; a missing article,
// an out-of-range page or a malformed query is a real HTTP 404 via notFound(); a backend failure
// throws and is shown by src/app/(site)/error.jsx, never as an empty archive.
//
// SEO: page 1 of the unfiltered archive is canonical; further pages are canonical to themselves;
// topic/year views are noindex (follow) with the archive as canonical, so filters never compete
// with the archive in search results.
import { notFound } from "next/navigation";
import { loadArticle, loadArticleArchive } from "@/lib/publicBatch3.server";
import { ARTICLE_SECTIONS, archiveHref, parseArchiveQuery } from "@/lib/publicArticlesResponse";
import { canonicalUrl } from "@/lib/publicSite";
import ArticleArchiveView from "./ArticleArchiveView.jsx";
import ArticleDetailView from "./ArticleDetailView.jsx";

const SITE_NAME = "IMAA Connect";
const TITLE_SUFFIX = " - IMAA – Institute for Mergers, Acquisitions, and Alliances";
// FOR REVIEW: the WordPress archives have no meta description; these are factual placeholders.
const DESCRIPTIONS = {
  news: "News coverage of IMAA – Institute for Mergers, Acquisitions, and Alliances.",
  publications: "M&A publications and research from IMAA – Institute for Mergers, Acquisitions, and Alliances.",
};
const SLUG = /^[-a-zA-Z0-9_]+$/;

export function articleArchiveRoute(sectionKey) {
  const section = ARTICLE_SECTIONS[sectionKey];

  async function resolve(searchParams) {
    const query = parseArchiveQuery((await searchParams) || {});
    if (query.invalid) return null;
    const archive = await loadArticleArchive(sectionKey, query.page, query.tag, query.year);
    return archive ? { query, archive } : null;
  }

  async function generateMetadata({ searchParams }) {
    const resolved = await resolve(searchParams);
    if (!resolved) return {};
    const { query } = resolved;
    const filtered = Boolean(query.tag || query.year);
    const canonical = canonicalUrl(section.path);
    const self = canonical && !filtered && query.page > 1 ? `${canonical}${archiveHref("", { page: query.page })}` : canonical;
    const title = `${section.label}${query.page > 1 && !filtered ? ` – page ${query.page}` : ""}${TITLE_SUFFIX}`;
    return {
      title: { absolute: title },
      description: DESCRIPTIONS[sectionKey],
      ...(self ? { alternates: { canonical: self } } : {}),
      ...(filtered ? { robots: { index: false, follow: true } } : {}),
      openGraph: { title, description: DESCRIPTIONS[sectionKey], type: "website", siteName: SITE_NAME, ...(self ? { url: self } : {}) },
    };
  }

  async function ArchivePage({ searchParams }) {
    const resolved = await resolve(searchParams);
    if (!resolved) notFound();
    return <ArticleArchiveView section={section} archive={resolved.archive} query={resolved.query} />;
  }

  return { generateMetadata, ArchivePage };
}

export function articleDetailRoute(sectionKey) {
  const section = ARTICLE_SECTIONS[sectionKey];

  async function resolve(params) {
    const { slug } = (await params) || {};
    if (typeof slug !== "string" || !SLUG.test(slug)) return null;
    return loadArticle(sectionKey, slug);
  }

  async function generateMetadata({ params }) {
    const article = await resolve(params);
    if (!article) return {};
    const title = article.seo_title || `${article.title}${TITLE_SUFFIX}`;
    const description = article.seo_description || article.excerpt || undefined;
    const canonical = canonicalUrl(`${section.path}/${article.slug}`);
    return {
      title: { absolute: title },
      description,
      ...(canonical ? { alternates: { canonical } } : {}),
      openGraph: {
        title,
        description,
        type: "article",
        siteName: SITE_NAME,
        ...(canonical ? { url: canonical } : {}),
        ...(article.published_at ? { publishedTime: article.published_at } : {}),
        ...(article.featured_image ? { images: [{ url: article.featured_image }] } : {}),
      },
    };
  }

  async function ArticlePage({ params }) {
    const article = await resolve(params);
    if (!article) notFound();
    return <ArticleDetailView section={section} article={article} />;
  }

  return { generateMetadata, ArticlePage };
}
