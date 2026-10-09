import referenceStyles from "./ReferenceGallery.module.css";
import FaqAccordion from "./FaqAccordion.jsx";
import { FAQ_CONTACT_URL, FAQ_SLUG, splitFaqSections } from "@/lib/faqSections";
import { LegalSectionNavMobile, LegalSectionNavSidebar } from "./LegalSectionNav.jsx";
import { LEGAL_TOC_SLUGS, addLegalSectionAnchors } from "@/lib/legalSections";

// src/components/public/StandardPageArticle.jsx
// Server Component: the one renderer for public StandardPage content (title + rich-text body),
// whether it comes from the CMS or from the approved defaults.
//
// CMS body HTML comes from the backend's public by-path endpoint, which expands Wagtail
// rich text, makes backend media/document URLs absolute and passes the result through an
// allowlist sanitiser (cms/public_pages.py). Default body HTML (src/content/public-pages)
// is stored in exactly that sanitised form; tests in both repositories verify it. It is
// rendered as-is here; nothing is added to it, and an empty body renders no filler text.
//
// `source` ("cms" | "default") and the default's content hash are exposed as data attributes
// for diagnostics: compare data-content-sha256 with `manage.py setup_public_pages` output.
//
// Typography mirrors the public Home/Events pages: Inter headings in the public ink colour,
// token-based body text, teal list markers and link colour. The Tailwind colour utilities
// follow the dark palette through tailwind.config.js, so no inline colours are needed.

const DEFAULT_H2 = "[&_h2]:mt-10 [&_h2]:font-sans [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:tracking-[-0.02em] [&_h2]:text-imaa-ink";
// Legal pages: numbered, capitalised "SECTION n – …" headings read better smaller with a little
// letter-spacing, each section separated by a rule; scroll-mt keeps an #anchor below the header.
const LEGAL_H2 = [
  "[&_h2]:mt-12 [&_h2]:scroll-mt-24 [&_h2]:border-t [&_h2]:border-imaa-border [&_h2]:pt-8",
  "[&_h2]:font-sans [&_h2]:text-base [&_h2]:font-bold [&_h2]:leading-snug [&_h2]:tracking-[0.02em] [&_h2]:text-imaa-ink md:[&_h2]:text-lg",
].join(" ");

const bodyClass = (h2Rule) => [
  // break-words: long URLs and e-mail addresses wrap instead of widening the page on phones.
  "break-words text-base leading-relaxed text-imaa-body md:text-lg",
  "[&_p]:mt-4 [&_p:first-child]:mt-0",
  h2Rule,
  "[&_h3]:mt-8 [&_h3]:font-sans [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-imaa-ink",
  "[&_h4]:mt-6 [&_h4]:font-sans [&_h4]:text-lg [&_h4]:font-semibold [&_h4]:text-imaa-ink",
  "[&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mt-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mt-1.5 [&_li::marker]:text-imaa-teal",
  "[&_a]:text-imaa-link [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:text-imaa-teal-dark",
  "[&_strong]:font-semibold [&_strong]:text-imaa-ink",
  "[&_blockquote]:mt-6 [&_blockquote]:border-l-4 [&_blockquote]:border-imaa-teal [&_blockquote]:pl-5 [&_blockquote]:italic",
  "[&_img]:mt-6 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-lg",
  "[&_figcaption]:mt-2 [&_figcaption]:text-sm [&_figcaption]:text-imaa-meta",
  "[&_hr]:my-8 [&_hr]:border-imaa-border",
  "[&_table]:mt-6 [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm",
  "[&_th]:border [&_th]:border-imaa-border [&_th]:bg-imaa-cool [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-imaa-ink",
  "[&_td]:border [&_td]:border-imaa-border [&_td]:px-3 [&_td]:py-2 [&_td]:align-top",
].join(" ");

const BODY_CLASS = bodyClass(DEFAULT_H2);
const LEGAL_BODY_CLASS = bodyClass(LEGAL_H2);

// Images in the (already sanitised) body load lazily: the References logo wall has 258 of them.
// Every image carries width and height, so lazy loading causes no layout shift.
const withLazyImages = (html) => html.replace(/<img(?![^>]*\bloading=)/g, '<img loading="lazy" decoding="async"');

export default function StandardPageArticle({ page, source = "cms" }) {
  const rawBody = typeof page?.body_html === "string" ? page.body_html.trim() : "";
  const isReferences = page?.slug === "references";
  const body = withLazyImages(rawBody);
  // FAQ: the same CMS body, shown as one toggle per <h2> question (src/lib/faqSections.js).
  const faq = page?.slug === FAQ_SLUG ? splitFaqSections(body) : null;
  // Long legal pages: the same CMS body with anchored section headings and a contents list.
  const legal = LEGAL_TOC_SLUGS.includes(page?.slug) ? addLegalSectionAnchors(body) : null;

  return (
    <article
      className="bg-white"
      data-public-content={source}
      data-content-sha256={source === "default" && page.content_sha256 ? page.content_sha256 : undefined}
    >
      <header className="border-b border-imaa-border bg-imaa-cool">
        <div className="mx-auto w-full max-w-[1200px] px-6 py-12 md:py-16">
          <h1 className="max-w-3xl font-sans text-4xl font-bold leading-[1.08] tracking-[-0.025em] text-imaa-ink md:text-5xl">
            {page.title}
          </h1>
        </div>
      </header>

      {faq ? (
        <div className="mx-auto w-full max-w-[1200px] px-6 py-12 md:py-16">
          <div className="max-w-3xl">
            {faq.introHtml ? (
              <div className={`${BODY_CLASS} mb-8`} dangerouslySetInnerHTML={{ __html: faq.introHtml }} />
            ) : null}
            <FaqAccordion items={faq.items} answerClassName={BODY_CLASS} />
            <aside
              aria-labelledby="faq-contact-heading"
              className="mt-12 flex flex-col gap-5 rounded-2xl border border-imaa-border bg-imaa-cool p-6 sm:flex-row sm:items-center sm:justify-between md:p-8"
            >
              <div>
                <h2 id="faq-contact-heading" className="m-0 font-sans text-xl font-bold tracking-[-0.01em] text-imaa-ink md:text-2xl">
                  Contact Us
                </h2>
                <p className="mt-2 text-base leading-relaxed text-imaa-body">
                  Didn&apos;t find your answer? Send the IMAA team a message and we&apos;ll get back to you.
                </p>
              </div>
              <a
                href={FAQ_CONTACT_URL}
                className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-full bg-imaa-teal-dark px-6 py-2.5 font-sans text-base font-semibold text-white no-underline transition-colors hover:bg-imaa-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-imaa-teal"
              >
                Contact us
              </a>
            </aside>
          </div>
        </div>
      ) : legal ? (
        <div className="mx-auto grid w-full max-w-[1200px] gap-10 px-6 py-10 md:py-14 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-14">
          <div className="min-w-0 max-w-3xl">
            <LegalSectionNavMobile sections={legal.sections} />
            <div className={LEGAL_BODY_CLASS} dangerouslySetInnerHTML={{ __html: legal.html }} />
          </div>
          <LegalSectionNavSidebar sections={legal.sections} />
        </div>
      ) : body ? (
        <div className="mx-auto w-full max-w-[1200px] px-6 py-12 md:py-16">
          <div
            className={`${BODY_CLASS} ${isReferences ? referenceStyles.gallery : "max-w-3xl"}`}
            dangerouslySetInnerHTML={{ __html: body }}
          />
        </div>
      ) : null}
    </article>
  );
}
