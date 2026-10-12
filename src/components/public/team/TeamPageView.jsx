// src/components/public/team/TeamPageView.jsx
// Server Component: the Our Team page (cms.TeamPage + public TeamMember snippets).
//
// Order follows the WordPress page (imaa-institute.org/our-team/): navy hero, experts & faculty
// (introduction, buttons, programme filters, faculty cards), staff of IMAA, then the ordered
// sections shared with the About page (programme carousel, offices). Grounds alternate white /
// cool grey as on the About page. Every value comes from the CMS; empty parts are left out.
import { SECTION_COMPONENTS } from "../about/AboutSections.jsx";
import { GROUNDS, HEADING_CLASS, PRIMARY_BUTTON, PROSE_CLASS, SECONDARY_BUTTON, SECTION_INNER, isExternal } from "../about/aboutStyles.js";
import FacultyDirectory from "./FacultyDirectory.jsx";
import { CARD_GRID, StaffCard } from "./TeamCards.jsx";

const hasText = (html) => typeof html === "string" && html.replace(/<[^>]*>|&nbsp;|\s/g, "") !== "";

function Button({ link, variant = "primary", className = "" }) {
  if (!link) return null;
  return (
    <a href={link.url} className={`${variant === "primary" ? PRIMARY_BUTTON : SECONDARY_BUTTON} gap-1.5 ${className}`}>
      {link.label}
      {isExternal(link.url) ? (
        <>
          <span aria-hidden="true">↗</span>
          <span className="sr-only"> (imaa-institute.org)</span>
        </>
      ) : null}
    </a>
  );
}

function SectionIntro({ heading, subheading, html, buttons }) {
  return (
    <div className="max-w-[760px]">
      {heading ? <h2 className={HEADING_CLASS}>{heading}</h2> : null}
      {subheading ? <p className="mb-0 mt-3 font-sans text-lg font-semibold text-imaa-teal-dark">{subheading}</p> : null}
      {hasText(html) ? <div className={`${PROSE_CLASS} mt-5`} dangerouslySetInnerHTML={{ __html: html }} /> : null}
      {buttons.length ? (
        <div className="mt-6 flex flex-wrap gap-3">
          {buttons.map((link, index) => (
            <Button key={`${link.url}-${index}`} link={link} variant={index === 0 ? "primary" : "secondary"} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Faculty({ page }) {
  return (
    <>
      <SectionIntro heading={page.faculty_heading} subheading={page.faculty_subheading} html={page.faculty_intro_html} buttons={page.faculty_buttons} />
      {page.faculty.length ? (
        <div className="mt-10">
          <FacultyDirectory faculty={page.faculty} programmes={page.programmes} />
        </div>
      ) : null}
    </>
  );
}

function Staff({ page }) {
  return (
    <>
      <SectionIntro heading={page.staff_heading} subheading={page.staff_subheading} html={page.staff_intro_html} buttons={page.staff_button ? [page.staff_button] : []} />
      {page.staff.length ? (
        <ul className={`${CARD_GRID} mt-10`}>
          {page.staff.map((member) => (
            <li key={member.slug} className="flex">
              <StaffCard member={member} />
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

export default function TeamPageView({ page }) {
  const heading = page.hero_title || page.title;
  const blocks = [
    (page.faculty.length > 0 || page.faculty_heading) && { key: "faculty", Body: Faculty, props: { page } },
    (page.staff.length > 0 || page.staff_heading) && { key: "staff", Body: Staff, props: { page } },
    ...page.sections.map((section) => ({ key: section.id, type: section.type, Body: SECTION_COMPONENTS[section.type], props: { section } })),
  ].filter((block) => block && block.Body);

  return (
    <article data-public-content="cms" data-page-type="TeamPage">
      <header className="bg-imaa-navy">
        <div className="mx-auto w-full max-w-[1200px] px-6 py-14 md:py-[60px]">
          <h1 className="m-0 max-w-3xl font-serif text-4xl font-bold leading-[1.1] tracking-[-0.02em] text-white md:text-5xl">{heading}</h1>
          {page.hero_intro ? (
            <p className="mb-0 mt-5 max-w-2xl whitespace-pre-line text-base leading-relaxed text-white/85 md:text-lg">{page.hero_intro}</p>
          ) : null}
          {page.hero_button ? (
            <a
              href={page.hero_button.url}
              className="mt-7 inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-white/70 px-6 py-2.5 font-sans text-sm font-bold text-white no-underline transition-colors hover:bg-white hover:text-imaa-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {page.hero_button.label}
              {isExternal(page.hero_button.url) ? (
                <>
                  <span aria-hidden="true">↗</span>
                  <span className="sr-only"> (imaa-institute.org)</span>
                </>
              ) : null}
            </a>
          ) : null}
        </div>
      </header>

      {blocks.map(({ key, type, Body, props }, index) => (
        <section key={key} data-team-section={type || key} className={GROUNDS[index % 2]}>
          <div className={SECTION_INNER}>
            <Body {...props} />
          </div>
        </section>
      ))}
    </article>
  );
}
