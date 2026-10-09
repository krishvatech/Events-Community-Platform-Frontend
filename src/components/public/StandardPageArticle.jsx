import referenceStyles from "./ReferenceGallery.module.css";

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

const BODY_CLASS = [
  // break-words: long URLs and e-mail addresses wrap instead of widening the page on phones.
  "break-words text-base leading-relaxed text-imaa-body md:text-lg",
  "[&_p]:mt-4 [&_p:first-child]:mt-0",
  "[&_h2]:mt-10 [&_h2]:font-sans [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:tracking-[-0.02em] [&_h2]:text-imaa-ink",
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

// Images in the (already sanitised) body load lazily: the References logo wall has 258 of them.
// Every image carries width and height, so lazy loading causes no layout shift.
const withLazyImages = (html) => html.replace(/<img(?![^>]*\bloading=)/g, '<img loading="lazy" decoding="async"');

export default function StandardPageArticle({ page, source = "cms" }) {
  const rawBody = typeof page?.body_html === "string" ? page.body_html.trim() : "";
  const isReferences = page?.slug === "references";
  const body = withLazyImages(rawBody);

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

      {body ? (
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
