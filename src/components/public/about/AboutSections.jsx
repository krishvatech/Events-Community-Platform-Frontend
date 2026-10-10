// src/components/public/about/AboutSections.jsx
// Server Components for the About page's ordered CMS sections (cms.AboutPage.sections, served by
// cms/about_page_api.py and normalised by src/lib/publicAboutResponse.js). Every value comes from
// Wagtail; a component receives one section and renders nothing it was not given.
import FaqAccordion from "../FaqAccordion.jsx";
import AboutCarousel from "./AboutCarousel.jsx";
import { FORMAT_ICONS } from "./formatIcons.js";
import {
  HEADING_CLASS,
  PRIMARY_BUTTON,
  SECONDARY_BUTTON,
  SMALL_PROSE_CLASS,
  TEXT_LINK,
  isExternal,
} from "./aboutStyles.js";

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const slugify = (value) =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

// Fixed-size image: width/height reserve space, so nothing shifts while it loads.
function Img({ image, className = "", sizes, eager = false }) {
  if (!image) return null;
  return (
    <img
      src={image.url}
      alt={image.alt || ""}
      width={image.width || undefined}
      height={image.height || undefined}
      sizes={sizes}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      className={className}
    />
  );
}

function ExternalMark({ url }) {
  if (!isExternal(url)) return null;
  return (
    <>
      <span aria-hidden="true">↗</span>
      <span className="sr-only"> (imaa-institute.org)</span>
    </>
  );
}

function Button({ link, variant = "primary", className = "" }) {
  if (!link) return null;
  return (
    <a href={link.url} className={`${variant === "primary" ? PRIMARY_BUTTON : SECONDARY_BUTTON} gap-1.5 ${className}`}>
      {link.label}
      <ExternalMark url={link.url} />
    </a>
  );
}

function Heading({ children, id, className = "" }) {
  if (!children) return null;
  return (
    <h2 id={id} className={`${HEADING_CLASS} ${className}`}>
      {children}
    </h2>
  );
}

// -- accreditations: WordPress toggle behaviour (closed, several open), two columns from lg --------

function AccordionSection({ section }) {
  const used = new Set();
  const items = section.items.map((item) => {
    let id = `accreditation-${slugify(item.title) || "item"}`;
    for (let n = 2; used.has(id); n += 1) id = `accreditation-${slugify(item.title)}-${n}`;
    used.add(id);
    return { id, questionHtml: escapeHtml(item.title), answerHtml: item.body_html };
  });
  const half = Math.ceil(items.length / 2);
  return (
    <>
      <Heading>{section.heading}</Heading>
      {section.image ? (
        <Img image={section.image} className="mt-8 h-auto max-h-[360px] w-full rounded-xl object-cover" sizes="(min-width: 1200px) 1152px, 100vw" />
      ) : null}
      <div className="mt-8 grid items-start gap-3 lg:grid-cols-2 lg:gap-5">
        <FaqAccordion items={items.slice(0, half)} answerClassName={SMALL_PROSE_CLASS} />
        {items.length > half ? <FaqAccordion items={items.slice(half)} answerClassName={SMALL_PROSE_CLASS} /> : null}
      </div>
    </>
  );
}

// -- text band with logos and a button (WordPress: ISO certification + "Book a Training") --------

function CtaBandSection({ section }) {
  return (
    <div className={`grid items-center gap-10 ${section.logos.length ? "lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]" : ""}`}>
      {section.logos.length ? (
        <ul className="m-0 flex list-none flex-wrap items-center justify-center gap-x-10 gap-y-6 p-0 lg:justify-start">
          {section.logos.map((logo) => (
            <li key={logo.url}>
              <Img image={logo} className="imaa-logo-plate h-9 w-auto max-w-[160px] object-contain grayscale" />
            </li>
          ))}
        </ul>
      ) : null}
      <div>
        <div className={`${SMALL_PROSE_CLASS} md:text-base`} dangerouslySetInnerHTML={{ __html: section.text_html }} />
        {section.button ? <Button link={section.button} className="mt-6" /> : null}
      </div>
    </div>
  );
}

// -- cards: study formats (grid) and programmes (carousel) --------------------------------------

function FormatIcon({ name }) {
  const svg = FORMAT_ICONS[name];
  if (!svg) return null;
  return <span className="mb-4 inline-flex h-12 w-12 text-imaa-coral [&_svg]:h-12 [&_svg]:w-12" dangerouslySetInnerHTML={{ __html: svg }} />;
}

function Card({ card, compact = false }) {
  return (
    <article className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-imaa-border bg-white">
      {card.image ? (
        <Img image={card.image} className="aspect-[530/363] h-auto w-full object-cover" sizes="(min-width: 1024px) 360px, 85vw" />
      ) : null}
      <div className={`flex flex-1 flex-col ${compact ? "p-5" : "p-6"}`}>
        <FormatIcon name={card.icon} />
        <h3 className="m-0 font-sans text-lg font-semibold leading-snug text-imaa-ink">{card.title}</h3>
        {card.text ? <p className="mb-0 mt-2 whitespace-pre-line text-[15px] leading-relaxed text-imaa-body">{card.text}</p> : null}
        {card.link ? (
          <a href={card.link.url} className={`${TEXT_LINK} mt-auto self-start pt-4`}>
            {card.link.label}
            <span className="sr-only">: {card.title}</span>
            <ExternalMark url={card.link.url} />
          </a>
        ) : null}
      </div>
    </article>
  );
}

function CardGroupSection({ section }) {
  const label = section.heading || "Cards";
  return (
    <>
      <Heading>{section.heading}</Heading>
      <div className={section.heading ? "mt-8" : ""}>
        {section.layout === "carousel" ? (
          <AboutCarousel label={label} slideClassName="w-[85%] sm:w-[calc((100%-1.25rem)/2)] lg:w-[calc((100%-2.5rem)/3)]">
            {section.cards.map((card, index) => (
              <Card key={`${card.title}-${index}`} card={card} compact />
            ))}
          </AboutCarousel>
        ) : (
          <ul className="m-0 grid list-none gap-5 p-0 sm:grid-cols-2 lg:grid-cols-4">
            {section.cards.map((card, index) => (
              <li key={`${card.title}-${index}`} className="flex">
                <Card card={card} />
              </li>
            ))}
          </ul>
        )}
      </div>
      {section.prompt || section.button ? (
        <div className="mt-10 flex flex-col items-start gap-4 rounded-xl border border-imaa-border bg-white p-6 sm:flex-row sm:items-center sm:justify-between">
          {section.prompt ? <p className="m-0 font-sans text-lg font-semibold text-imaa-ink">{section.prompt}</p> : null}
          <Button link={section.button} />
        </div>
      ) : null}
    </>
  );
}

// -- testimonials ---------------------------------------------------------------------------------

function TestimonialCard({ item }) {
  const meta = [item.role, item.company].filter(Boolean).join(", ");
  return (
    <figure className="m-0 flex h-full w-full flex-col rounded-xl border border-imaa-border bg-white p-6 md:p-7">
      <svg aria-hidden="true" viewBox="0 0 32 24" width="32" height="24" className="text-imaa-teal" fill="currentColor">
        <path d="M0 24V14C0 6.3 4.3 1.6 12 0l1.5 3C9 4.3 6.8 7 6.5 10H12v14H0Zm20 0V14c0-7.7 4.3-12.4 12-14l1.5 3c-4.5 1.3-6.7 4-7 7H32v14H20Z" />
      </svg>
      <blockquote className="m-0 mt-4 flex-1">
        <div className={`${SMALL_PROSE_CLASS} line-clamp-[8]`} dangerouslySetInnerHTML={{ __html: item.quote_html }} />
      </blockquote>
      <figcaption className="mt-6 flex items-center gap-4 border-t border-imaa-border pt-5">
        {item.photo ? (
          <Img image={item.photo} className="h-16 w-16 shrink-0 rounded-full object-cover" sizes="64px" />
        ) : null}
        <div className="min-w-0">
          <p className="m-0 font-sans text-base font-semibold text-imaa-ink">{item.name}</p>
          {meta ? <p className="m-0 mt-0.5 text-sm text-imaa-meta">{meta}</p> : null}
          {item.programme ? (
            <p className="m-0 mt-1.5 inline-flex rounded-full bg-imaa-cool px-2.5 py-0.5 text-xs font-semibold text-imaa-teal-dark">
              {item.programme}
            </p>
          ) : null}
        </div>
      </figcaption>
      {item.url ? (
        <a href={item.url} className={`${TEXT_LINK} self-start pt-3`}>
          Read more<span className="sr-only">: testimonial by {item.name}</span>
          <ExternalMark url={item.url} />
        </a>
      ) : null}
    </figure>
  );
}

function TestimonialsSection({ section }) {
  return (
    <>
      <Heading>{section.heading}</Heading>
      <div className={section.heading ? "mt-8" : ""}>
        <AboutCarousel label={section.heading || "Testimonials"} slideClassName="w-[90%] md:w-[calc((100%-1.25rem)/2)]">
          {section.items.map((item) => (
            <TestimonialCard key={item.name} item={item} />
          ))}
        </AboutCarousel>
      </div>
      {section.button ? <Button link={section.button} variant="secondary" className="mt-6" /> : null}
    </>
  );
}

// -- logo strip: greyscale until hover, like the References page; in dark mode each logo sits on the
// white plate the header logo uses (brand.css .imaa-logo-plate). ----------------------------------

function LogoStripSection({ section }) {
  return (
    <>
      <Heading className="text-center">{section.heading}</Heading>
      <ul className={`m-0 grid list-none grid-cols-2 items-center gap-x-8 gap-y-10 p-0 sm:grid-cols-3 lg:grid-cols-6 ${section.heading ? "mt-10" : ""}`}>
        {section.logos.map((logo) => (
          <li key={logo.url} className="flex justify-center">
            <Img
              image={logo}
              className="imaa-logo-plate h-10 w-auto max-w-[150px] object-contain grayscale transition duration-300 hover:grayscale-0 motion-reduce:transition-none"
            />
          </li>
        ))}
      </ul>
      {section.button ? (
        <div className="mt-10 text-center">
          <Button link={section.button} variant="secondary" />
        </div>
      ) : null}
    </>
  );
}

// -- media enquiries --------------------------------------------------------------------------------

function ContactCalloutSection({ section }) {
  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-imaa-border bg-white p-6 md:flex-row md:items-center md:justify-between md:p-8">
      <div className="max-w-2xl">
        {section.heading ? <h2 className="m-0 font-serif text-2xl font-bold text-imaa-ink">{section.heading}</h2> : null}
        {section.text_html ? (
          <div className={`${SMALL_PROSE_CLASS} md:text-base ${section.heading ? "mt-3" : ""}`} dangerouslySetInnerHTML={{ __html: section.text_html }} />
        ) : null}
      </div>
      {section.email ? (
        <a href={`mailto:${section.email}`} className={`${PRIMARY_BUTTON} shrink-0`}>
          {section.button_label || section.email}
          {section.button_label ? <span className="sr-only">: {section.email}</span> : null}
        </a>
      ) : null}
    </div>
  );
}

// -- offices ----------------------------------------------------------------------------------------

function OfficesSection({ section }) {
  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <Heading>{section.heading}</Heading>
        {section.email ? (
          <a href={`mailto:${section.email}`} className={TEXT_LINK}>
            {section.email}
          </a>
        ) : null}
      </div>
      {section.offices.length ? (
        <ul className="m-0 mt-8 grid list-none gap-5 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {section.offices.map((office) => (
            <li key={office.city} className="flex overflow-hidden rounded-xl border border-imaa-border bg-white">
              {/* WordPress office images are round flag badges: shown whole, at badge size. */}
              <Img image={office.image} className="my-4 ml-4 h-16 w-16 shrink-0 self-center object-contain" sizes="64px" />
              <div className="flex min-w-0 flex-col justify-center p-4">
                <h3 className="m-0 font-sans text-base font-bold uppercase tracking-[0.06em] text-imaa-ink">{office.city}</h3>
                {office.country ? <p className="m-0 mt-0.5 text-sm text-imaa-meta">{office.country}</p> : null}
                {office.phone ? (
                  office.phone_href ? (
                    <a href={office.phone_href} className={`${TEXT_LINK} min-h-0 pt-2`}>
                      <span className="sr-only">Phone, {office.city}: </span>
                      {office.phone}
                    </a>
                  ) : (
                    <p className="m-0 pt-2 text-sm text-imaa-body">{office.phone}</p>
                  )
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

export const SECTION_COMPONENTS = {
  accordion: AccordionSection,
  cta_band: CtaBandSection,
  card_group: CardGroupSection,
  testimonials: TestimonialsSection,
  logo_strip: LogoStripSection,
  contact_callout: ContactCalloutSection,
  offices: OfficesSection,
};
