// src/components/public/articles/ArticleDetailView.jsx
// Server Component: one In The News / M&A Publications article.
//
// The body is the post's content_html as imported from WordPress, sanitised by the backend's
// allowlist sanitiser (nh3) for the public endpoint, so it is server-rendered (in the initial HTML)
// without a browser-side sanitiser. Links inside keep their imaa-institute.org addresses, documents
// (PDF links) included. Legacy posts whose content is only images show the images; a post without
// any content shows its summary and says so, instead of an empty page.
import { FOCUS_RING, TEXT_LINK } from "../about/aboutStyles.js";
import { archiveHref, formatArticleDate } from "../../../lib/publicArticlesResponse.js";
import { ArticleImage } from "./ArticleCard.jsx";
import { rewriteMigratedLinks } from "../../../lib/migratedLinks.js";

// Article typography, scoped to the body (the same rules as the member Blog reader, in Tailwind).
const ARTICLE_BODY = [
  "break-words text-base leading-[1.75] text-imaa-body md:text-[17px] [overflow-wrap:anywhere]",
  "[&>:first-child]:mt-0 [&_p]:my-4",
  "[&_h1]:mb-3 [&_h1]:mt-10 [&_h1]:font-serif [&_h1]:text-[26px] [&_h1]:font-bold [&_h1]:leading-snug [&_h1]:text-imaa-ink",
  "[&_h2]:mb-3 [&_h2]:mt-10 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:leading-snug [&_h2]:text-imaa-ink",
  "[&_h3]:mb-2 [&_h3]:mt-8 [&_h3]:font-serif [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-imaa-ink",
  "[&_h4]:mb-2 [&_h4]:mt-6 [&_h4]:font-sans [&_h4]:text-lg [&_h4]:font-semibold [&_h4]:text-imaa-ink",
  "[&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mt-1.5 [&_li::marker]:text-imaa-teal",
  "[&_a]:text-imaa-link [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:text-imaa-teal-dark",
  "[&_strong]:font-semibold [&_strong]:text-imaa-ink [&_b]:font-semibold [&_b]:text-imaa-ink",
  "[&_img]:my-6 [&_img]:block [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-lg",
  "[&_figure]:my-8 [&_figure]:mx-0 [&_figcaption]:mt-2 [&_figcaption]:text-center [&_figcaption]:text-sm [&_figcaption]:text-imaa-meta",
  "[&_blockquote]:my-6 [&_blockquote]:border-l-4 [&_blockquote]:border-imaa-teal [&_blockquote]:bg-imaa-cool [&_blockquote]:px-5 [&_blockquote]:py-3 [&_blockquote]:italic",
  "[&_table]:my-6 [&_table]:block [&_table]:w-full [&_table]:overflow-x-auto [&_table]:border-collapse [&_table]:text-[15px]",
  "[&_td]:border [&_td]:border-imaa-border [&_td]:p-2 [&_td]:align-top [&_th]:border [&_th]:border-imaa-border [&_th]:bg-imaa-cool [&_th]:p-2 [&_th]:text-left",
  "[&_hr]:my-8 [&_hr]:border-0 [&_hr]:border-t [&_hr]:border-imaa-border",
  "[&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-imaa-cool [&_pre]:p-4 [&_pre]:text-sm",
  "[&_.aligncenter]:mx-auto [&_.aligncenter]:text-center",
].join(" ");

const textOf = (html) => html.replace(/<[^>]*>/g, "").replace(/&nbsp;|&#160;/g, " ").trim();
export const hasBodyContent = (html) => textOf(html) !== "" || /<img\b/i.test(html);

export default function ArticleDetailView({ section, article }) {
  const date = formatArticleDate(article.published_at);
  const body = hasBodyContent(article.content_html);
  return (
    <article data-public-content="articles" data-article-section={section.key} data-article={article.slug}>
      <header className="bg-imaa-navy">
        <div className="mx-auto w-full max-w-[880px] px-6 py-12 md:py-14">
          <p className="m-0">
            <a href={section.path} className={`inline-flex min-h-[44px] items-center gap-1.5 font-sans text-sm font-semibold text-white/85 no-underline hover:text-white hover:underline ${FOCUS_RING} rounded`}>
              <span aria-hidden="true">←</span> {section.label}
            </a>
          </p>
          <h1 className="m-0 mt-3 break-words font-serif text-3xl font-bold leading-[1.15] tracking-[-0.02em] text-white md:text-[42px]">{article.title}</h1>
          {date || article.author ? (
            <p className="m-0 mt-5 text-sm text-white/80 md:text-base">
              {date ? <time dateTime={article.published_at}>{date}</time> : null}
              {date && article.author ? <span aria-hidden="true"> · </span> : null}
              {article.author ? <span>{article.author}</span> : null}
            </p>
          ) : null}
        </div>
      </header>

      <div className="mx-auto w-full max-w-[880px] px-6 py-12 md:py-14">
        {article.featured_image ? (
          <ArticleImage article={article} section={section} eager className="mb-10 aspect-[16/9] h-auto w-full rounded-2xl" sizes="(min-width: 880px) 832px, 100vw" />
        ) : null}

        {body ? (
          <div className={ARTICLE_BODY} data-article-body="" dangerouslySetInnerHTML={{ __html: rewriteMigratedLinks(article.content_html) }} />
        ) : (
          <div data-article-body="" data-article-incomplete="">
            {article.excerpt ? <p className="m-0 text-base leading-[1.75] text-imaa-body md:text-[17px]">{article.excerpt}</p> : null}
            <p className="m-0 mt-6 rounded-xl border border-dashed border-imaa-border p-5 text-imaa-meta">
              The full text of this article is not available on this page.
            </p>
          </div>
        )}

        {article.tags.length ? (
          <div className="mt-12 border-t border-imaa-border pt-6">
            <h2 className="m-0 font-sans text-sm font-semibold uppercase tracking-[.08em] text-imaa-meta">Topics</h2>
            <ul className="m-0 mt-3 flex list-none flex-wrap gap-2 p-0">
              {article.tags.map((tag) => (
                <li key={tag.slug}>
                  <a href={archiveHref(section.path, { tag: tag.slug })}
                     className={`inline-flex min-h-[36px] items-center rounded-full border border-imaa-border bg-white px-3 text-sm font-medium text-imaa-ink no-underline hover:border-imaa-teal hover:text-imaa-teal-dark ${FOCUS_RING}`}>
                    {tag.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className="m-0 mt-10">
          <a href={section.path} className={TEXT_LINK}>
            <span aria-hidden="true">←</span> All {section.noun}
          </a>
        </p>
      </div>
    </article>
  );
}
