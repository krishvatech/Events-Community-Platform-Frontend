import React, { useMemo, useState } from 'react';
import { course, getFaculty, getTestimonials } from './courseData';
import { contentSources } from './contentSources';

export function Brand({ light = false }) {
  return (
    <a className={`itdr-brand ${light ? 'itdr-brand-light' : ''}`} href="#top" aria-label="IMAA design preview home">
      <strong>imaa</strong>
      <span>Institute for Mergers,<br />Acquisitions &amp; Alliances</span>
    </a>
  );
}

export function CourseNav({ light = false, compact = false }) {
  return (
    <header className={`itdr-site-nav ${light ? 'itdr-site-nav-light' : ''} ${compact ? 'itdr-site-nav-compact' : ''}`}>
      <div className="itdr-wrap itdr-site-nav-inner">
        <Brand light={light} />
        <nav aria-label="Training page sections">
          <a href="#overview">Overview</a>
          <a href="#curriculum">Curriculum</a>
          <a href="#formats">Formats</a>
          <a href="#schedule">Schedule</a>
          <a href="#faculty">Faculty</a>
          <a href="#faqs">FAQs</a>
        </nav>
        <a className="itdr-nav-action" href="#formats">Compare formats <span aria-hidden="true">+</span></a>
      </div>
    </header>
  );
}

export function PreviewButton({ children = 'Compare formats', href = '#formats', className = '' }) {
  return <a className={`itdr-primary-action ${className}`} href={href}>{children}<span aria-hidden="true">+</span></a>;
}

export function Eyebrow({ children }) {
  return <span className="itdr-eyebrow">{children}</span>;
}

export function ImageFrame({ src, alt, tone = '' }) {
  const [failed, setFailed] = useState(false);
  return (
    <figure className={`itdr-image-frame ${tone}`}>
      {src && !failed ? (
        <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <div className="itdr-image-fallback">{alt}</div>
      )}
    </figure>
  );
}

function initials(name) {
  return name
    .replace(/Prof\.|Dr\.|PhD|CPA/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('');
}

function AvatarImage({ src, name }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <div className="itdr-person-placeholder">{initials(name)}</div>;
  return <img src={src} alt={name} loading="lazy" onError={() => setFailed(true)} />;
}

export function SourceBlocks({ blocks = [], mode = 'prose' }) {
  if (!blocks.length) return null;
  return (
    <div className={`itdr-source-blocks itdr-source-${mode}`}>
      {blocks.map((item, index) => {
        if (item.kind === 'heading') return <h3 key={`${item.text}-${index}`}>{item.text}</h3>;
        if (item.kind === 'li') return <p className="itdr-source-bullet" key={`${item.text}-${index}`}><span aria-hidden="true">-</span>{item.text}</p>;
        return <p key={`${item.text}-${index}`}>{item.text}</p>;
      })}
    </div>
  );
}

export function HeroMetrics({ variant = '' }) {
  const metrics = [
    ['60 approx. hours', 'Online programme'],
    ['30 approx. hours', 'Live and onsite formats'],
    ['4 modules', 'Complete M&A lifecycle'],
    ['IM&A', 'Charter upon completion']
  ];
  return (
    <div className={`itdr-hero-metrics ${variant}`}>
      {metrics.map(([value, label]) => (
        <div key={label}>
          <strong>{value}</strong>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}

export function FormatCards({ variant = 'cards' }) {
  return (
    <div className={`itdr-format-grid itdr-format-${variant}`}>
      {course.formats.map((format, index) => (
        <article className="itdr-format-card" key={format.id}>
          <div className="itdr-card-kicker">
            <span>{String(index + 1).padStart(2, '0')}</span>
            <span>{format.mode}</span>
          </div>
          <h3>{format.name}</h3>
          <p className="itdr-duration">{format.duration}</p>
          <p>{format.summary}</p>
          <div className="itdr-price">
            {format.oldPrice && <del>{format.oldPrice}</del>}
            <strong>{format.price}</strong>
            <span>{format.note}</span>
          </div>
          <a href="#schedule" className="itdr-text-action" aria-label={`Review ${format.name} schedule information`}>
            Review availability <span aria-hidden="true">+</span>
          </a>
        </article>
      ))}
    </div>
  );
}

export function FormatRail({ variant = 'rail' }) {
  return (
    <div className={`itdr-format-rail itdr-format-rail-${variant}`}>
      {course.formats.map((format) => (
        <a href="#formats" key={format.id}>
          <span>{format.name}</span>
          <strong>{format.price}</strong>
          <small>{format.duration}</small>
        </a>
      ))}
    </div>
  );
}

export function OverviewSection({ layout = 'split' }) {
  return (
    <section className={`itdr-section itdr-overview itdr-overview-${layout}`} id="overview">
      <div className="itdr-wrap itdr-overview-grid">
        <div>
          <Eyebrow>The Programme</Eyebrow>
          <h2>What to Expect From IM&amp;A Certification</h2>
          <SourceBlocks blocks={course.source.overview} />
        </div>
        <aside className="itdr-included">
          <Eyebrow>Included With Certification</Eyebrow>
          <ul>
            {course.benefits.map((benefit) => <li key={benefit}><span aria-hidden="true">+</span>{benefit}</li>)}
          </ul>
        </aside>
      </div>
      <div className="itdr-wrap itdr-practice-grid">
        {course.practiceAreas.map((item) => (
          <article key={item.title}>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function DesignationSection({ visual = 'seal' }) {
  return (
    <section className={`itdr-section itdr-designation-section itdr-designation-${visual}`} id="designation">
      <div className="itdr-wrap itdr-designation-grid">
        <div className="itdr-designation-mark">
          <span>IM&amp;A</span>
          <small>Charter</small>
        </div>
        <div>
          <Eyebrow>Designation</Eyebrow>
          <h2>Internationally recognized M&amp;A designation.</h2>
          <SourceBlocks blocks={course.source.designation} />
        </div>
      </div>
    </section>
  );
}

export function CurriculumSection({ variant = 'grid' }) {
  return (
    <section className={`itdr-section itdr-curriculum itdr-curriculum-${variant}`} id="curriculum">
      <div className="itdr-wrap">
        <div className="itdr-section-heading">
          <div>
            <Eyebrow>Complete M&amp;A Lifecycle</Eyebrow>
            <h2>Included in the IM&amp;A Course</h2>
          </div>
          <p>{course.intro} You will also learn terminology and best practices for cross-border deals, corporate inversions, earn-outs, spin-offs, restructurings and corporate governance.</p>
        </div>
        <div className="itdr-module-grid">
          {course.modules.map((module) => {
            const details = course.source.curriculum?.[module.title] || [];
            return (
              <article className="itdr-module-card" key={module.title}>
                <span className="itdr-module-number">{module.tag}</span>
                <div>
                  <h3>{module.title}</h3>
                  <p>{module.line}</p>
                  <details>
                    <summary>Module description and learning outcomes</summary>
                    <SourceBlocks blocks={details} mode="compact" />
                  </details>
                </div>
              </article>
            );
          })}
        </div>
        <div className="itdr-module-products">
          {course.moduleProducts.map((module) => (
            <article key={module.title}>
              <span>{module.format}</span>
              <h3>{module.title}</h3>
              <strong>{module.price}</strong>
              <p>{module.summary}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FormatsSection({ variant = 'cards' }) {
  return (
    <section className={`itdr-section itdr-formats-section itdr-section-soft itdr-formats-${variant}`} id="formats">
      <div className="itdr-wrap">
        <div className="itdr-section-heading">
          <div>
            <Eyebrow>Four Ways To Learn</Eyebrow>
            <h2>Training formats and fees</h2>
          </div>
          <p>Published WordPress prices captured on {course.capturedAt}. Booking and payment actions are disabled in this design review.</p>
        </div>
        <FormatCards variant={variant} />
      </div>
    </section>
  );
}

export function ScheduleSection({ variant = 'table' }) {
  const grouped = useMemo(() => {
    return course.sessions.reduce((acc, item) => {
      acc[item.mode] = acc[item.mode] || [];
      acc[item.mode].push(item);
      return acc;
    }, {});
  }, []);

  const flatSessions = course.sessions;

  if (variant === 'cards' || variant === 'hybridCards') {
    return (
      <section className={`itdr-section itdr-schedule-section itdr-schedule-${variant}`} id="schedule">
        <div className="itdr-wrap">
          <div className="itdr-section-heading">
            <div>
              <Eyebrow>Training Calendar</Eyebrow>
              <h2>Schedule and fees</h2>
            </div>
            <p>Published sessions are grouped into clear review cards. Prototype links do not create orders.</p>
          </div>
          <div className={`itdr-session-card-grid itdr-session-card-grid-${variant}`}>
            {flatSessions.map((session) => (
              <article className="itdr-session-card" key={session.title}>
                <div className="itdr-session-card-top">
                  <span className={`itdr-status ${session.status === 'Sold out' ? 'is-sold-out' : ''}`}>{session.status}</span>
                  <span>{session.mode}</span>
                </div>
                <h3>{session.title}</h3>
                <dl>
                  <div><dt>Date</dt><dd>{session.when}</dd></div>
                  <div><dt>Starts</dt><dd>{session.start}</dd></div>
                  <div><dt>Location</dt><dd>{session.place}</dd></div>
                </dl>
                <div className="itdr-session-card-fee">
                  {session.oldFee && <del>{session.oldFee}</del>}
                  <strong>{session.fee}</strong>
                </div>
              </article>
            ))}
          </div>
          <div className={`itdr-bundle-grid itdr-bundle-grid-${variant}`}>
            {course.bundles.map((bundle) => (
              <article key={bundle.name}>
                <span>Bundle &amp; Save</span>
                <h3>{bundle.name}</h3>
                <p><del>{bundle.oldPrice}</del><strong>{bundle.price}</strong></p>
              </article>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`itdr-section itdr-schedule-section itdr-schedule-${variant}`} id="schedule">
      <div className="itdr-wrap">
        <div className="itdr-section-heading">
          <div>
            <Eyebrow>Training Calendar</Eyebrow>
            <h2>Schedule and fees</h2>
          </div>
          <p>All currently published sessions are presented as review content only. Prototype links do not create orders.</p>
        </div>
        <div className={`itdr-schedule-groups itdr-schedule-groups-${variant}`}>
          {Object.entries(grouped).map(([mode, sessions]) => (
            <div className="itdr-schedule-group" key={mode}>
              <h3>{mode}</h3>
              {sessions.map((session) => (
                <article className="itdr-session" key={session.title}>
                  <span className={`itdr-status ${session.status === 'Sold out' ? 'is-sold-out' : ''}`}>{session.status}</span>
                  <div>
                    <strong>{session.title}</strong>
                    <small>{session.start}</small>
                  </div>
                  <span>{session.when}</span>
                  <span>{session.place}</span>
                  <span className="itdr-fee">{session.oldFee && <del>{session.oldFee}</del>}{session.fee}</span>
                </article>
              ))}
            </div>
          ))}
        </div>
        <div className={`itdr-bundle-grid itdr-bundle-grid-${variant}`}>
          {course.bundles.map((bundle) => (
            <article key={bundle.name}>
              <span>Bundle &amp; Save</span>
              <h3>{bundle.name}</h3>
              <p><del>{bundle.oldPrice}</del><strong>{bundle.price}</strong></p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function AudienceSection({ variant = 'panel' }) {
  return (
    <section className={`itdr-section itdr-audience itdr-audience-${variant}`} id="participants">
      <div className="itdr-wrap itdr-audience-grid">
        <div>
          <Eyebrow>Who Participates</Eyebrow>
          <h2>Designed for senior M&amp;A responsibility.</h2>
          <SourceBlocks blocks={course.source.audience} />
        </div>
        <div>
          <Eyebrow>Prerequisites</Eyebrow>
          <h2>Before you begin</h2>
          <SourceBlocks blocks={course.source.prerequisites} />
        </div>
      </div>
    </section>
  );
}

export function FacultySection({ variant = 'grid' }) {
  const faculty = getFaculty();
  const lead = faculty[0];
  const rest = faculty.slice(1);
  return (
    <section className={`itdr-section itdr-faculty itdr-faculty-${variant}`} id="faculty">
      <div className="itdr-wrap">
        <div className="itdr-section-heading">
          <div>
            <Eyebrow>Meet Our Faculty</Eyebrow>
            <h2>Experts and Faculty</h2>
          </div>
          <p>IMAA lists a growing faculty of more than 60 professors and professionals from over 20 countries.</p>
        </div>
        <div className="itdr-faculty-intro">
          <ImageFrame src={course.images.faculty} alt="IMAA faculty session" tone="faculty-image" />
          <SourceBlocks blocks={course.source.other} />
        </div>
        {variant === 'authority' && lead && (
          <article className="itdr-faculty-lead">
            <AvatarImage src={lead.image} name={lead.name} />
            <div>
              <Eyebrow>Faculty Leadership</Eyebrow>
              <h3>{lead.name}</h3>
              <p>{lead.title}</p>
            </div>
          </article>
        )}
        <div className="itdr-faculty-grid">
          {(variant === 'authority' ? rest : faculty).map((person) => (
            <article className="itdr-person" key={person.name}>
              <AvatarImage src={person.image} name={person.name} />
              <strong>{person.name}</strong>
              <span>{person.title}</span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function TestimonialsSection({ variant = 'grid' }) {
  const testimonials = getTestimonials();
  return (
    <section className={`itdr-section itdr-testimonials itdr-section-soft itdr-testimonials-${variant}`} id="testimonials">
      <div className="itdr-wrap">
        <div className="itdr-section-heading">
          <div>
            <Eyebrow>Participant Testimonials</Eyebrow>
            <h2>Participant feedback</h2>
          </div>
        </div>
        <div className="itdr-testimonial-grid">
          {testimonials.map((person) => (
            <article className="itdr-testimonial" key={person.name}>
              <AvatarImage src={person.image} name={person.name} />
              <p>{person.quote}</p>
              <strong>{person.name}</strong>
              {person.role && <small>{person.role}</small>}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ComparisonSection({ variant = 'matrix' }) {
  return (
    <section className={`itdr-section itdr-comparison itdr-comparison-${variant}`} id="comparison">
      <div className="itdr-wrap">
        <div className="itdr-section-heading">
          <div>
            <Eyebrow>Online vs Onsite</Eyebrow>
            <h2>Comparison: Online vs. Onsite Program</h2>
          </div>
        </div>
        <div className="itdr-comparison-table" role="table" aria-label="Comparison of online and onsite programme features">
          <div role="row" className="itdr-comparison-head"><span>Feature</span><span>Online</span><span>Onsite</span></div>
          {course.comparisonRows.map((row) => (
            <div role="row" key={row.feature}>
              <span>{row.feature}</span>
              <span aria-label={row.online ? 'Included online' : 'Not included online'}>{row.online ? 'Yes' : '-'}</span>
              <span aria-label={row.onsite ? 'Included onsite' : 'Not included onsite'}>{row.onsite ? 'Yes' : '-'}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FaqSection({ variant = 'stack' }) {
  const [open, setOpen] = useState(0);
  return (
    <section className={`itdr-section itdr-faqs itdr-section-soft itdr-faqs-${variant}`} id="faqs">
      <div className="itdr-wrap itdr-faq-grid">
        <div>
          <Eyebrow>FAQs</Eyebrow>
          <h2>Published programme questions</h2>
          <p>FAQ answers are captured from the source programme page and kept factual for this design review.</p>
        </div>
        <div className="itdr-faq-list">
          {course.faqs.map((faq, index) => (
            <div className="itdr-faq-item" key={faq.question}>
              <button type="button" onClick={() => setOpen(open === index ? -1 : index)} aria-expanded={open === index}>
                <span>{faq.question}</span>
                <span aria-hidden="true">{open === index ? '-' : '+'}</span>
              </button>
              {open === index && <p>{faq.answer}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function BrochureSection({ variant = 'band' }) {
  if (variant === 'single') {
    const cta = course.callsToAction[0];
    return (
      <section className="itdr-section itdr-brochure itdr-brochure-single" id="brochure">
        <div className="itdr-wrap">
          <div>
            <Eyebrow>{cta.action}</Eyebrow>
            <h2>{cta.title}</h2>
          </div>
          <p>{cta.text}</p>
          <a href={cta.target}>{cta.action}<span aria-hidden="true">+</span></a>
        </div>
      </section>
    );
  }

  if (variant === 'editorial') {
    return (
      <section className="itdr-section itdr-brochure itdr-brochure-editorial" id="brochure">
        <div className="itdr-wrap">
          <article>
            <Eyebrow>{course.callsToAction[2].action}</Eyebrow>
            <h2>{course.callsToAction[2].title}</h2>
            <p>{course.callsToAction[2].text}</p>
            <a href={course.callsToAction[2].target}>{course.callsToAction[2].action}<span aria-hidden="true">+</span></a>
          </article>
          <article>
            <Eyebrow>{course.callsToAction[1].action}</Eyebrow>
            <h2>{course.callsToAction[1].title}</h2>
            <p>{course.callsToAction[1].text}</p>
            <a href={course.callsToAction[1].target}>{course.callsToAction[1].action}<span aria-hidden="true">+</span></a>
          </article>
        </div>
      </section>
    );
  }

  if (variant === 'compact') {
    return (
      <section className="itdr-section itdr-brochure itdr-brochure-compact" id="brochure">
        <div className="itdr-wrap">
          {course.callsToAction.map((cta) => (
            <a key={cta.title} href={cta.target}>
              <span>{cta.action}</span>
              <strong>{cta.title}</strong>
            </a>
          ))}
        </div>
      </section>
    );
  }

  if (variant === 'trust') {
    return (
      <section className="itdr-section itdr-brochure itdr-brochure-trust" id="brochure">
        <div className="itdr-wrap">
          <div className="itdr-trust-cta-main">
            <Eyebrow>{course.callsToAction[1].action}</Eyebrow>
            <h2>{course.callsToAction[1].title}</h2>
            <p>{course.callsToAction[1].text}</p>
            <a href={course.callsToAction[1].target}>{course.callsToAction[1].action}<span aria-hidden="true">+</span></a>
          </div>
          <div className="itdr-trust-cta-stack">
            <article>
              <strong>{getFaculty().length}</strong>
              <span>featured faculty profiles</span>
            </article>
            <article>
              <strong>{getTestimonials().length}</strong>
              <span>participant testimonials</span>
            </article>
            <article>
              <strong>IM&amp;A</strong>
              <span>charter designation</span>
            </article>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`itdr-section itdr-brochure itdr-brochure-${variant}`} id="brochure">
      <div className="itdr-wrap">
        {course.callsToAction.map((cta) => (
          <article key={cta.title}>
            <Eyebrow>{cta.action}</Eyebrow>
            <h2>{cta.title}</h2>
            <p>{cta.text}</p>
            <a href={cta.target}>{cta.action}<span aria-hidden="true">+</span></a>
          </article>
        ))}
      </div>
    </section>
  );
}

export function ContentInventory() {
  const facts = [
    ['Capture date', contentSources.capturedAt],
    ['Programme page', contentSources.primaryProgramPage],
    ['Training formats', String(course.formats.length)],
    ['Published sessions/products', String(course.sessions.length + course.moduleProducts.length)],
    ['Curriculum modules', String(course.modules.length)],
    ['Faculty profiles rendered', String(getFaculty().length)],
    ['Testimonials rendered', String(getTestimonials().length)],
    ['FAQs rendered', String(course.faqs.length)]
  ];
  return (
    <section className="itdr-section itdr-inventory" id="content-inventory">
      <div className="itdr-wrap">
        <div className="itdr-section-heading">
          <div>
            <Eyebrow>Content Verification</Eyebrow>
            <h2>Source inventory for review</h2>
          </div>
          <p>Included for internal review transparency. It uses structured data, not embedded WordPress HTML.</p>
        </div>
        <div className="itdr-inventory-grid">
          {facts.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
        </div>
      </div>
    </section>
  );
}

export function Endcap({ light = false }) {
  return (
    <footer className={`itdr-course-end ${light ? 'itdr-course-end-light' : ''}`}>
      <div className="itdr-wrap">
        <Brand light />
        <div>
          <strong>{course.label}</strong>
          <p>Design preview only. Registration and payment actions are intentionally disabled.</p>
        </div>
        <a href="#top">Back to top</a>
      </div>
    </footer>
  );
}

export function CompleteContent({
  order = ['overview', 'designation', 'formats', 'curriculum', 'schedule', 'audience', 'faculty', 'testimonials', 'comparison', 'faqs', 'brochure'],
  variants = {},
  showInventory = false
}) {
  const components = {
    overview: <OverviewSection layout={variants.overview} />,
    designation: <DesignationSection visual={variants.designation} />,
    formats: <FormatsSection variant={variants.formats} />,
    curriculum: <CurriculumSection variant={variants.curriculum} />,
    schedule: <ScheduleSection variant={variants.schedule} />,
    audience: <AudienceSection variant={variants.audience} />,
    faculty: <FacultySection variant={variants.faculty} />,
    testimonials: <TestimonialsSection variant={variants.testimonials} />,
    comparison: <ComparisonSection variant={variants.comparison} />,
    faqs: <FaqSection variant={variants.faqs} />,
    brochure: <BrochureSection variant={variants.brochure} />
  };

  return (
    <>
      {order.map((key) => <React.Fragment key={key}>{components[key]}</React.Fragment>)}
      {showInventory && <ContentInventory />}
      <Endcap />
    </>
  );
}
