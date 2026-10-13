// src/components/public/testimonials/TestimonialsPageView.jsx
// Server Component: the Testimonials page (cms.TestimonialsPage + the public Testimonial snippets).
//
// Order follows the WordPress archive (imaa-institute.org/testimonials/): navy hero, the programme
// filters and testimonial cards, then the page's ordered sections (trusted-by logos, available
// programmes; shared with the About page). Every value comes from the CMS; empty parts are left out.
// The ten testimonials shown on About are the same snippets, never copies.
import PublicPageHero from "../PublicPageHero.jsx";
import { SECTION_COMPONENTS } from "../about/AboutSections.jsx";
import { GROUNDS, SECTION_INNER } from "../about/aboutStyles.js";
import TestimonialDirectory from "./TestimonialDirectory.jsx";

export default function TestimonialsPageView({ page }) {
  const blocks = [
    { key: "testimonials", Body: Directory, props: { page } },
    ...page.sections.map((section) => ({ key: section.id, type: section.type, Body: SECTION_COMPONENTS[section.type], props: { section } })),
  ].filter((block) => block.Body);

  return (
    <article data-public-content="cms" data-page-type="TestimonialsPage">
      <PublicPageHero title={page.hero_title || page.title} intro={page.hero_intro} />
      {blocks.map(({ key, type, Body, props }, index) => (
        <section key={key} data-testimonials-section={type || key} className={GROUNDS[index % 2]}>
          <div className={SECTION_INNER}>
            <Body {...props} />
          </div>
        </section>
      ))}
    </article>
  );
}

function Directory({ page }) {
  if (!page.testimonials.length) {
    return (
      <p className="m-0 rounded-xl border border-dashed border-imaa-border bg-white p-6 text-imaa-body">
        No testimonials are published yet.
      </p>
    );
  }
  return (
    <>
      <h2 className="sr-only">{page.title}</h2>
      <TestimonialDirectory testimonials={page.testimonials} programmes={page.programmes} />
    </>
  );
}
