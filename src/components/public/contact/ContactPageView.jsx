// src/components/public/contact/ContactPageView.jsx
// Server Component: the Contact Us page (cms.ContactPage).
//
// Order follows the WordPress page (imaa-institute.org/contact-us/): navy hero; the enquiry form with
// its image and the statistics beside it; then the ordered sections (personal-insights card,
// trusted-by logos, the six offices with phone numbers and the general e-mail address). Every text
// comes from the CMS. When the backend cannot deliver enquiries (no recipients configured) the form
// is not offered, and visitors are pointed to the e-mail address instead.
import PublicPageHero from "../PublicPageHero.jsx";
import { SECTION_COMPONENTS } from "../about/AboutSections.jsx";
import { GROUNDS, HEADING_CLASS, PROSE_CLASS, SECTION_INNER } from "../about/aboutStyles.js";
import ContactForm from "./ContactForm.jsx";
import { rewriteMigratedLinks } from "../../../lib/migratedLinks.js";

const hasText = (html) => typeof html === "string" && html.replace(/<[^>]*>|&nbsp;|\s/g, "") !== "";

// Literal class names, so Tailwind generates them (a page has at most four statistics).
const STAT_COLUMNS = ["", "", "min-[420px]:grid-cols-2", "min-[420px]:grid-cols-3", "min-[420px]:grid-cols-4"];

function StatsStrip({ stats }) {
  return (
    <dl className={`m-0 grid grid-cols-1 overflow-hidden rounded-xl border border-imaa-border bg-white ${STAT_COLUMNS[stats.length]}`}>
      {stats.map((stat, index) => (
        <div
          key={`${stat.label}-${index}`}
          className={`flex flex-col-reverse items-center px-3 py-5 text-center ${index ? "border-t border-imaa-border min-[420px]:border-l min-[420px]:border-t-0" : ""}`}
        >
          <dt className="mt-1 text-xs font-medium leading-snug text-imaa-meta sm:text-[13px]">{stat.label}</dt>
          <dd className="m-0 font-sans text-[28px] font-bold leading-none tracking-[-0.02em] text-imaa-ink tabular-nums sm:text-4xl">{stat.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Enquiry({ page, fallbackEmail }) {
  const aside = page.form_image || page.stats.length > 0;
  return (
    <div className={`grid gap-10 ${aside ? "lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-14" : ""}`}>
      <div className="min-w-0">
        {/* Without a CMS form heading the section keeps an accessible name, but no repeated "Contact Us". */}
        <h2 id="contact-form-heading" className={page.form_heading ? HEADING_CLASS : "sr-only"}>{page.form_heading || "Send us a message"}</h2>
        {hasText(page.form_intro_html) ? (
          <div className={`${PROSE_CLASS} ${page.form_heading ? "mt-4" : ""}`} dangerouslySetInnerHTML={{ __html: rewriteMigratedLinks(page.form_intro_html) }} />
        ) : null}
        <div className={page.form_heading || hasText(page.form_intro_html) ? "mt-8" : ""}>
          {page.form.enabled ? (
            <ContactForm form={page.form} consentHtml={page.consent_html} successMessage={page.success_message} fallbackEmail={fallbackEmail} />
          ) : (
            <div className="rounded-xl border border-imaa-border bg-white p-6" data-contact-unavailable="">
              <p className="m-0 font-sans text-base font-semibold text-imaa-ink">The contact form is not available at the moment.</p>
              {fallbackEmail ? (
                <p className="m-0 mt-2 text-imaa-body">
                  Please e-mail us at{" "}
                  <a href={`mailto:${fallbackEmail}`} className="font-semibold text-imaa-link underline underline-offset-2 hover:text-imaa-teal-dark">
                    {fallbackEmail}
                  </a>
                  .
                </p>
              ) : null}
            </div>
          )}
        </div>
      </div>
      {aside ? (
        <div className="flex min-w-0 flex-col gap-6">
          {page.form_image ? (
            <img
              src={page.form_image.url}
              alt={page.form_image.alt || ""}
              width={page.form_image.width || undefined}
              height={page.form_image.height || undefined}
              sizes="(min-width: 1024px) 460px, 100vw"
              loading="eager"
              decoding="async"
              className="block h-auto w-full rounded-2xl object-cover"
            />
          ) : null}
          {page.stats.length ? <StatsStrip stats={page.stats} /> : null}
        </div>
      ) : null}
    </div>
  );
}

export default function ContactPageView({ page }) {
  const fallbackEmail = page.sections.find((section) => section.type === "offices" && section.email)?.email || "";
  const blocks = [
    { key: "form", Body: Enquiry, props: { page, fallbackEmail } },
    ...page.sections.map((section) => ({ key: section.id, type: section.type, Body: SECTION_COMPONENTS[section.type], props: { section } })),
  ].filter((block) => block.Body);

  return (
    <article data-public-content="cms" data-page-type="ContactPage">
      <PublicPageHero title={page.hero_title || page.title} intro={page.hero_intro} />
      {blocks.map(({ key, type, Body, props }, index) => (
        <section key={key} data-contact-section={type || key} className={GROUNDS[index % 2]}
                 {...(key === "form" ? { "aria-labelledby": "contact-form-heading" } : {})}>
          <div className={SECTION_INNER}>
            <Body {...props} />
          </div>
        </section>
      ))}
    </article>
  );
}
