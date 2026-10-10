// src/components/public/AboutPageView.jsx
// Server Component: the About page (cms.AboutPage) on the public website shell.
//
// Order follows the WordPress page (imaa-institute.org/about-us/); the look follows the IMAA
// design pack (ui-mockup-audit-2026-09-30, appendix A2): a flat navy "hero C", then section blocks
// on a 1200px container with grounds that alternate white / cool grey automatically.
//   intro    the introduction; beside it the intro image, the statistics and the highlights
//            (a bulleted list that ends the intro text is shown as the highlights)
//   mission  the mission statement, then the pillar cards (AboutPage.features)
//   …        the ordered sections (AboutPage.sections: accreditations, ISO band, study formats,
//            programmes, testimonials, media callout, logos, offices; see about/AboutSections.jsx)
// Every value comes from the CMS and empty fields leave their part out, so nothing is invented
// here. Rich text is the backend's sanitised public HTML; card text is plain text.
import { SECTION_COMPONENTS } from "./about/AboutSections.jsx";
import { GROUNDS, HEADING_CLASS, PROSE_CLASS, SECTION_INNER } from "./about/aboutStyles.js";

const hasText = (html) => typeof html === "string" && html.replace(/<[^>]*>|&nbsp;|\s/g, "") !== "";

// "<p>…</p><ul><li>…</li></ul>" -> ["<p>…</p>", ["…", …]]: a list that ends the intro is shown as
// the highlights beside the image (as on WordPress). Anything else stays in the text.
const TRAILING_LIST = /<ul>((?:(?!<\/?ul>)[\s\S])*)<\/ul>\s*$/;
function splitHighlights(html) {
  const match = TRAILING_LIST.exec(html || "");
  if (!match) return [html || "", []];
  const items = [...match[1].matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => m[1].trim()).filter(Boolean);
  return items.length ? [html.slice(0, match.index), items] : [html, []];
}

function StatsStrip({ stats }) {
  return (
    <dl
      className="m-0 grid overflow-hidden rounded-xl border border-imaa-border bg-white"
      style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}
    >
      {stats.map((stat, index) => (
        <div
          key={`${stat.label}-${index}`}
          className={`flex flex-col-reverse items-center px-3 py-5 text-center ${index ? "border-l border-imaa-border" : ""}`}
        >
          <dt className="mt-1 text-xs font-medium leading-snug text-imaa-meta sm:text-[13px]">{stat.label}</dt>
          <dd className="m-0 font-sans text-[28px] font-bold leading-none tracking-[-0.02em] text-imaa-ink tabular-nums sm:text-4xl">
            {stat.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Intro({ page }) {
  const [textHtml, highlights] = splitHighlights(page.intro_html);
  const aside = page.intro_image || page.stats.length > 0 || highlights.length > 0;
  return (
    <div className={`grid items-start gap-10 ${aside ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:gap-14" : ""}`}>
      {hasText(textHtml) ? (
        <div className={`${PROSE_CLASS} max-w-[700px]`} dangerouslySetInnerHTML={{ __html: textHtml }} />
      ) : (
        <div />
      )}
      {aside ? (
        <div className="flex flex-col gap-6">
          {page.intro_image ? (
            // Near the top of the page, often in the first viewport: not lazy-loaded.
            <img
              src={page.intro_image.url}
              alt={page.intro_image.alt || ""}
              width={page.intro_image.width || undefined}
              height={page.intro_image.height || undefined}
              sizes="(min-width: 1024px) 480px, 100vw"
              loading="eager"
              decoding="async"
              className="h-auto w-full rounded-lg object-cover"
            />
          ) : null}
          {page.stats.length ? <StatsStrip stats={page.stats} /> : null}
          {highlights.length ? (
            <ul className="m-0 grid list-none gap-x-6 gap-y-3 p-0 sm:grid-cols-2">
              {highlights.map((item) => (
                <li key={item} className="flex items-start gap-2.5 font-sans text-[15px] font-semibold leading-snug text-imaa-ink">
                  <svg aria-hidden="true" viewBox="0 0 20 20" width="20" height="20" className="mt-px shrink-0 text-imaa-teal" fill="currentColor">
                    <path d="M10 1.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Zm4.2 6.2-5 5.3a.9.9 0 0 1-1.3 0L5.8 10.8a.9.9 0 1 1 1.3-1.3l1.5 1.5 4.3-4.6a.9.9 0 1 1 1.3 1.3Z" />
                  </svg>
                  <span dangerouslySetInnerHTML={{ __html: item }} />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Mission({ page }) {
  const heading = page.mission_title || page.features_title;
  const cardsHeading = page.features_title && page.features_title !== heading ? page.features_title : "";
  return (
    <>
      {heading ? <h2 className={HEADING_CLASS}>{heading}</h2> : null}
      {hasText(page.mission_html) ? (
        <div className={`${PROSE_CLASS} max-w-[700px] ${heading ? "mt-6" : ""}`} dangerouslySetInnerHTML={{ __html: page.mission_html }} />
      ) : null}
      {page.features.length ? (
        <>
          {cardsHeading ? <h3 className="mb-0 mt-10 font-sans text-xl font-semibold text-imaa-ink">{cardsHeading}</h3> : null}
          <ul className="m-0 mt-8 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {page.features.map((feature, index) => (
              <li key={`${feature.title}-${index}`} className="flex flex-col overflow-hidden rounded-xl border border-imaa-border bg-white">
                {feature.image_url ? (
                  <img src={feature.image_url} alt="" loading="lazy" decoding="async" width="1200" height="700" className="aspect-[12/7] h-auto w-full object-cover" />
                ) : null}
                <div className="flex flex-1 flex-col border-t-4 border-imaa-teal p-5 md:p-6">
                  {feature.title ? <h3 className="m-0 font-sans text-lg font-semibold leading-snug text-imaa-ink">{feature.title}</h3> : null}
                  {feature.desc ? (
                    <p className={`m-0 whitespace-pre-line text-[15px] leading-relaxed text-imaa-body ${feature.title ? "mt-2" : ""}`}>{feature.desc}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </>
  );
}

export default function AboutPageView({ page }) {
  const heading = page.hero_title || page.title;
  // The page title becomes the hero eyebrow when it adds something to the heading.
  const eyebrow = page.title && page.title !== heading ? page.title : "";

  const blocks = [
    (hasText(page.intro_html) || page.intro_image || page.stats.length > 0) && { key: "intro", Body: Intro, props: { page } },
    (hasText(page.mission_html) || page.features.length > 0) && { key: "mission", Body: Mission, props: { page } },
    ...page.sections.map((section) => ({ key: section.id, type: section.type, Body: SECTION_COMPONENTS[section.type], props: { section } })),
  ].filter((block) => block && block.Body);

  return (
    <article data-public-content="cms" data-page-type="AboutPage">
      <header className="bg-imaa-navy">
        <div className="mx-auto w-full max-w-[1200px] px-6 py-14 md:py-[60px]">
          {eyebrow ? <p className="m-0 text-xs font-bold uppercase tracking-[0.18em] text-white/75">{eyebrow}</p> : null}
          <h1 className={`max-w-3xl font-serif text-4xl font-bold leading-[1.1] tracking-[-0.02em] text-white md:text-5xl ${eyebrow ? "mt-3" : "m-0"}`}>
            {heading}
          </h1>
          {page.hero_subtitle ? (
            <p className="mb-0 mt-5 max-w-2xl whitespace-pre-line text-base leading-relaxed text-white/85 md:text-lg">{page.hero_subtitle}</p>
          ) : null}
        </div>
      </header>

      {blocks.map(({ key, type, Body, props }, index) => (
        <section key={key} data-about-section={type || key} className={GROUNDS[index % 2]}>
          <div className={SECTION_INNER}>
            <Body {...props} />
          </div>
        </section>
      ))}
    </article>
  );
}
