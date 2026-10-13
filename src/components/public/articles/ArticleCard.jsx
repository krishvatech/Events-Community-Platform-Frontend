// src/components/public/articles/ArticleCard.jsx
// Server Component: an article card of the In The News / M&A Publications archives.
import { FOCUS_RING } from "../about/aboutStyles.js";
import { formatArticleDate } from "../../../lib/publicArticlesResponse.js";
import ArticleImage from "./ArticleImage.jsx";

export { ArticleImage };

export default function ArticleCard({ article, section, eager = false, headingLevel = "h2" }) {
  const Heading = headingLevel;
  const href = `${section.path}/${article.slug}`;
  const date = formatArticleDate(article.published_at);
  return (
    <article className="group relative flex h-full w-full flex-col overflow-hidden rounded-xl border border-imaa-border bg-white transition-shadow hover:shadow-imaa-md">
      <ArticleImage article={article} section={section} eager={eager} className="aspect-[16/9] h-auto w-full" sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw" />
      <div className="flex flex-1 flex-col p-5 md:p-6">
        {date ? (
          <p className="m-0 text-sm font-medium text-imaa-meta">
            <time dateTime={article.published_at}>{date}</time>
          </p>
        ) : null}
        <Heading className="m-0 mt-2 font-sans text-lg font-semibold leading-snug text-imaa-ink">
          {/* The whole card is clickable through the stretched link; the title is its text. */}
          <a href={href} className={`text-imaa-ink no-underline after:absolute after:inset-0 after:content-[''] group-hover:text-imaa-teal-dark ${FOCUS_RING} rounded`}>
            {article.title}
          </a>
        </Heading>
        {article.excerpt ? <p className="m-0 mt-3 line-clamp-3 text-[15px] leading-relaxed text-imaa-body">{article.excerpt}</p> : null}
        {article.author ? <p className="m-0 mt-auto pt-4 text-sm text-imaa-meta">{article.author}</p> : null}
      </div>
    </article>
  );
}
