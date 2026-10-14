import React from 'react';
import { course } from './courseData';
import {
  CompleteContent,
  CourseNav,
  Eyebrow,
  FormatRail,
  HeroMetrics,
  ImageFrame,
  PreviewButton
} from './CourseSections';

export function Concept01() {
  return (
    <main className="itdr-course itdr-concept-1" id="top">
      <CourseNav light />
      <section className="itdr-hero itdr-hero-executive">
        <div className="itdr-wrap itdr-executive-grid">
          <div>
            <Eyebrow>IM&amp;A Certification Programme</Eyebrow>
            <h1>International <em>M&amp;A</em> Expert <span>IM&amp;A</span></h1>
            <p>{course.intro}</p>
            <div className="itdr-hero-actions">
              <PreviewButton href="#designation">Review designation</PreviewButton>
              <a href="#curriculum">Explore curriculum</a>
            </div>
          </div>
          <div className="itdr-executive-panel" aria-label="IMAA programme seal">
            <span>Institute for Mergers, Acquisitions &amp; Alliances</span>
            <strong>IM&amp;A</strong>
            <small>Professional M&amp;A Education</small>
          </div>
        </div>
      </section>
      <HeroMetrics variant="itdr-executive-metrics" />
      <CompleteContent
        order={['overview', 'designation', 'curriculum', 'formats', 'schedule', 'faculty', 'testimonials', 'audience', 'comparison', 'faqs', 'brochure']}
        variants={{ overview: 'editorial', designation: 'editorial', curriculum: 'editorial', formats: 'executive', schedule: 'ledger', faculty: 'portrait', testimonials: 'editorial', brochure: 'editorial' }}
      />
    </main>
  );
}

export function Concept02() {
  return (
    <main className="itdr-course itdr-concept-2" id="top">
      <CourseNav light compact />
      <section className="itdr-hero itdr-hero-conversion">
        <div className="itdr-wrap itdr-conversion-grid">
          <div>
            <Eyebrow>International M&amp;A Expert</Eyebrow>
            <h1>Choose the right IM&amp;A training format.</h1>
            <p>{course.intro}</p>
            <HeroMetrics />
          </div>
          <aside className="itdr-conversion-box">
            <h2>Published fees</h2>
            {course.formats.map((format) => (
              <a href="#formats" key={format.id}>
                <span>{format.name}</span>
                <strong>{format.price}</strong>
              </a>
            ))}
            <PreviewButton href="#schedule">See dates and fees</PreviewButton>
          </aside>
        </div>
      </section>
      <CompleteContent
        order={['formats', 'schedule', 'overview', 'comparison', 'curriculum', 'audience', 'faculty', 'testimonials', 'designation', 'faqs', 'brochure']}
        variants={{ formats: 'conversion', schedule: 'cards', curriculum: 'compact', faculty: 'conversion', testimonials: 'conversion', brochure: 'single' }}
      />
    </main>
  );
}

export function Concept03() {
  return (
    <main className="itdr-course itdr-concept-3" id="top">
      <CourseNav />
      <section className="itdr-hero itdr-hero-academy">
        <div className="itdr-wrap itdr-academy-grid">
          <div>
            <span className="itdr-pill">Modern Training Academy</span>
            <Eyebrow>Learning Experience By IMAA</Eyebrow>
            <h1>Learn the full deal lifecycle.</h1>
            <p>{course.intro}</p>
            <PreviewButton href="#curriculum">Start with curriculum</PreviewButton>
          </div>
          <div className="itdr-academy-board">
            {course.modules.map((module) => (
              <a href="#curriculum" key={module.title}>
                <span>{module.tag}</span>
                <strong>{module.title}</strong>
                <small>{module.line}</small>
              </a>
            ))}
          </div>
        </div>
      </section>
      <CompleteContent
        order={['curriculum', 'overview', 'formats', 'schedule', 'faculty', 'audience', 'comparison', 'testimonials', 'designation', 'faqs', 'brochure']}
        variants={{ overview: 'academy', curriculum: 'academy', formats: 'academy', schedule: 'timeline', faculty: 'academy', testimonials: 'academy', brochure: 'compact' }}
      />
    </main>
  );
}

export function Concept04() {
  return (
    <main className="itdr-course itdr-concept-4" id="top">
      <CourseNav light />
      <section className="itdr-hero itdr-hero-journey">
        <div className="itdr-wrap itdr-journey-grid">
          <div>
            <Eyebrow>Interactive Deal Journey</Eyebrow>
            <h1>From strategy to post-merger integration.</h1>
            <p>{course.intro}</p>
            <PreviewButton href="#curriculum">Walk the journey</PreviewButton>
          </div>
          <div className="itdr-journey-map" aria-label="M&A lifecycle modules">
            <div className="itdr-journey-core">IM&amp;A</div>
            {course.modules.map((module, index) => (
              <a className={`itdr-journey-node node-${index + 1}`} href="#curriculum" key={module.title}>
                <span>{module.tag}</span>
                <strong>{module.title}</strong>
              </a>
            ))}
          </div>
        </div>
      </section>
      <CompleteContent
        order={['curriculum', 'schedule', 'formats', 'overview', 'audience', 'comparison', 'faculty', 'testimonials', 'designation', 'faqs', 'brochure']}
        variants={{ curriculum: 'journey', formats: 'journey', schedule: 'timeline', comparison: 'dark', faculty: 'journey', testimonials: 'journey', brochure: 'single' }}
      />
    </main>
  );
}

export function Concept05() {
  return (
    <main className="itdr-course itdr-concept-5" id="top">
      <CourseNav compact />
      <section className="itdr-hero itdr-hero-minimal">
        <div className="itdr-wrap">
          <div className="itdr-minimal-kicker"><span>Education for M&amp;A Professionals</span><span>IMAA</span></div>
          <h1>International<br />M&amp;A Expert.</h1>
          <div className="itdr-minimal-bottom">
            <strong>IM&amp;A</strong>
            <p>{course.intro}</p>
            <PreviewButton href="#overview">Read programme</PreviewButton>
          </div>
        </div>
      </section>
      <div className="itdr-wrap itdr-minimal-formats">
        <FormatRail variant="minimal" />
      </div>
      <CompleteContent
        order={['overview', 'curriculum', 'designation', 'audience', 'schedule', 'faculty', 'testimonials', 'formats', 'comparison', 'faqs', 'brochure']}
        variants={{ overview: 'minimal', curriculum: 'minimal', formats: 'minimal', schedule: 'minimal', faculty: 'minimal', testimonials: 'minimal', brochure: 'compact' }}
      />
    </main>
  );
}

export function Concept06() {
  return (
    <main className="itdr-course itdr-concept-6" id="top">
      <CourseNav />
      <section className="itdr-hero itdr-hero-authority">
        <div className="itdr-wrap itdr-authority-grid">
          <div>
            <Eyebrow>Authority and Trust</Eyebrow>
            <h1>Professional certification backed by expert faculty.</h1>
            <p>{course.source.designation[0]?.text}</p>
            <HeroMetrics />
            <PreviewButton href="#faculty">Meet faculty</PreviewButton>
          </div>
          <ImageFrame src={course.images.curriculum} alt="IMAA curriculum visual" tone="authority-image" />
        </div>
      </section>
      <CompleteContent
        order={['designation', 'faculty', 'testimonials', 'overview', 'curriculum', 'formats', 'schedule', 'audience', 'comparison', 'faqs', 'brochure']}
        variants={{ designation: 'authority', faculty: 'authority', testimonials: 'authority', schedule: 'ledger', formats: 'authority', brochure: 'trust' }}
      />
    </main>
  );
}

export function Concept07() {
  return (
    <main className="itdr-course itdr-concept-7" id="top">
      <CourseNav light />
      <section className="itdr-hero itdr-hero-hybrid">
        <div className="itdr-hybrid-angle" aria-hidden="true" />
        <div className="itdr-wrap itdr-hybrid-grid">
          <div>
            <Eyebrow>Premium Hybrid</Eyebrow>
            <h1>Executive polish with enrollment clarity.</h1>
            <p>{course.intro}</p>
            <div className="itdr-hero-actions">
              <PreviewButton href="#formats">Compare formats</PreviewButton>
              <a href="#schedule">View calendar</a>
            </div>
          </div>
          <aside className="itdr-hybrid-ticket">
            <span>Starting from</span>
            <strong>US $3,290</strong>
            <small>Online self-paced programme</small>
          </aside>
        </div>
      </section>
      <div className="itdr-wrap itdr-hybrid-ribbon">
        {course.benefits.map((benefit) => <span key={benefit}>{benefit}</span>)}
      </div>
      <CompleteContent
        order={['overview', 'formats', 'schedule', 'curriculum', 'comparison', 'faculty', 'testimonials', 'audience', 'designation', 'faqs', 'brochure']}
        variants={{ overview: 'hybrid', formats: 'hybrid', schedule: 'hybridCards', curriculum: 'hybrid', faculty: 'hybrid', testimonials: 'hybrid', brochure: 'single' }}
      />
    </main>
  );
}
