// src/components/public/articles/ArticleArchiveView.jsx
// Server Component: the archive of a public article section (In The News, M&A Publications).
//
// Server-rendered and link-based, so it works without JavaScript and every view has its own URL:
// * filters: the section's topics (WordPress tags used by at least three articles) as links, and
//   the publication years as a GET form (?tag=, ?year=); both come from the API (`filters`);
// * newest-first article cards;
// * numbered pagination (?page=) with Previous / Next and aria-current on the current page.
// Every article text comes from the Blog posts imported from WordPress; nothing is invented.
import PublicPageHero from "../PublicPageHero.jsx";
import { FOCUS_RING, SECTION_INNER, SECONDARY_BUTTON } from "../about/aboutStyles.js";
import { archiveHref, paginationItems, totalPages } from "../../../lib/publicArticlesResponse.js";
import ArticleCard from "./ArticleCard.jsx";

const CHIP = `inline-flex min-h-[40px] items-center rounded-full border px-3.5 text-sm font-semibold no-underline transition-colors ${FOCUS_RING}`;
const CHIP_ON = "border-imaa-teal-dark bg-imaa-teal-dark text-white";
const VISIBLE_TOPICS = 10;
const CHIP_OFF = "border-imaa-border bg-white text-imaa-ink hover:border-imaa-teal hover:text-imaa-teal-dark";

function Filters({ section, archive, query }) {
  const { years, tags } = archive.filters;
  if (!years.length && !tags.length) return null;
  // The most used topics stay visible; the rest open on demand (and stay open when one is active).
  const shown = tags.slice(0, VISIBLE_TOPICS);
  const more = tags.slice(VISIBLE_TOPICS);
  const moreOpen = more.some((tag) => tag.slug === query.tag);
  const chip = (tag) => {
    const active = query.tag === tag.slug;
    return (
      <li key={tag.slug}>
        <a href={archiveHref(section.path, { tag: tag.slug, year: query.year })} aria-current={active ? "page" : undefined} className={`${CHIP} ${active ? CHIP_ON : CHIP_OFF}`}>
          {tag.name}
          <span className={`ml-1.5 text-xs font-medium ${active ? "text-white/80" : "text-imaa-meta"}`}>
            <span className="sr-only">(</span>{tag.count}<span className="sr-only"> articles)</span>
          </span>
        </a>
      </li>
    );
  };
  return (
    <div className="flex flex-col gap-6 rounded-xl border border-imaa-border bg-white p-5 md:p-6" data-article-filters="">
      {tags.length ? (
        <nav aria-label={`Filter ${section.noun} by topic`}>
          <h2 className="m-0 font-sans text-sm font-semibold uppercase tracking-[.08em] text-imaa-meta">Topics</h2>
          <ul className="m-0 mt-3 flex list-none flex-wrap gap-2 p-0">
            <li>
              <a href={archiveHref(section.path, { year: query.year })} aria-current={!query.tag ? "page" : undefined} className={`${CHIP} ${!query.tag ? CHIP_ON : CHIP_OFF}`}>
                All topics
              </a>
            </li>
            {shown.map(chip)}
          </ul>
          {more.length ? (
            <details className="mt-3" open={moreOpen}>
              <summary className={`inline-flex min-h-[44px] cursor-pointer items-center rounded font-sans text-sm font-semibold text-imaa-link ${FOCUS_RING}`}>
                More topics ({more.length})
              </summary>
              <ul className="m-0 mt-2 flex list-none flex-wrap gap-2 p-0">{more.map(chip)}</ul>
            </details>
          ) : null}
        </nav>
      ) : null}
      {years.length ? (
        <form method="get" action={section.path} className="flex flex-wrap items-end gap-3" aria-label={`Filter ${section.noun} by year`}>
          {query.tag ? <input type="hidden" name="tag" value={query.tag} /> : null}
          <div className="flex flex-col">
            <label htmlFor={`${section.key}-year`} className="mb-1.5 font-sans text-sm font-semibold uppercase tracking-[.08em] text-imaa-meta">Year</label>
            <select
              id={`${section.key}-year`}
              name="year"
              defaultValue={query.year}
              className={`min-h-[44px] min-w-[180px] rounded-lg border border-imaa-border bg-white px-3 font-sans text-base text-imaa-ink ${FOCUS_RING}`}
            >
              <option value="">All years</option>
              {years.map(({ year, count }) => (
                <option key={year} value={year}>{`${year} (${count})`}</option>
              ))}
            </select>
          </div>
          <button type="submit" className={`${SECONDARY_BUTTON} min-h-[44px]`}>Apply</button>
        </form>
      ) : null}
    </div>
  );
}

function Pagination({ section, query, pages }) {
  if (pages <= 1) return null;
  const href = (page) => archiveHref(section.path, { ...query, page });
  const BOX = `inline-flex h-11 min-w-[44px] items-center justify-center rounded-full border px-3 font-sans text-sm font-semibold no-underline ${FOCUS_RING}`;
  return (
    <nav aria-label="Pagination" className="mt-10">
      <ul className="m-0 flex list-none flex-wrap items-center justify-center gap-2 p-0">
        <li>
          {query.page > 1 ? (
            <a href={href(query.page - 1)} rel="prev" className={`${BOX} ${CHIP_OFF}`}>
              <span aria-hidden="true">‹</span>&nbsp;Previous<span className="sr-only"> page</span>
            </a>
          ) : null}
        </li>
        {paginationItems(query.page, pages).map((page, index) =>
          page === null ? (
            <li key={`gap-${index}`} aria-hidden="true" className="px-1 text-imaa-meta">…</li>
          ) : (
            <li key={page}>
              <a href={href(page)} aria-current={page === query.page ? "page" : undefined} className={`${BOX} ${page === query.page ? CHIP_ON : CHIP_OFF}`}>
                <span className="sr-only">Page </span>{page}
              </a>
            </li>
          )
        )}
        <li>
          {query.page < pages ? (
            <a href={href(query.page + 1)} rel="next" className={`${BOX} ${CHIP_OFF}`}>
              Next<span className="sr-only"> page</span>&nbsp;<span aria-hidden="true">›</span>
            </a>
          ) : null}
        </li>
      </ul>
    </nav>
  );
}

export default function ArticleArchiveView({ section, archive, query, intro }) {
  const pages = totalPages(archive.count);
  const filtered = Boolean(query.tag || query.year);
  const tagName = archive.filters.tags.find((t) => t.slug === query.tag)?.name || query.tag;
  const scope = [query.tag ? `on “${tagName}”` : "", query.year ? `from ${query.year}` : ""].filter(Boolean).join(" ");

  return (
    <article data-public-content="articles" data-article-section={section.key}>
      <PublicPageHero title={section.label} intro={intro} />
      <section className="bg-imaa-cool">
        <div className={SECTION_INNER}>
          <Filters section={section} archive={archive} query={query} />

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <p className="m-0 text-sm text-imaa-meta" aria-live="polite">
              {archive.count === 0
                ? ""
                : `${archive.count} ${section.noun}${scope ? ` ${scope}` : ""}${pages > 1 ? ` · page ${query.page} of ${pages}` : ""}`}
            </p>
            {filtered ? (
              <a href={section.path} className={`text-sm font-semibold text-imaa-link underline-offset-2 hover:underline ${FOCUS_RING} rounded`}>
                Clear filters
              </a>
            ) : null}
          </div>

          {archive.results.length ? (
            <ul className="m-0 mt-6 grid list-none gap-5 p-0 sm:grid-cols-2 lg:grid-cols-3" data-article-list="">
              {archive.results.map((article, index) => (
                <li key={article.slug} className="flex">
                  <ArticleCard article={article} section={section} eager={index < 3} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-6 rounded-xl border border-dashed border-imaa-border bg-white p-8 text-center" data-article-empty="">
              <p className="m-0 font-sans text-lg font-semibold text-imaa-ink">
                {filtered ? `No ${section.noun} match these filters.` : `No ${section.noun} have been published yet.`}
              </p>
              {filtered ? (
                <a href={section.path} className={`${SECONDARY_BUTTON} mt-5`}>Show all {section.noun}</a>
              ) : null}
            </div>
          )}

          <Pagination section={section} query={query} pages={pages} />
        </div>
      </section>
    </article>
  );
}
