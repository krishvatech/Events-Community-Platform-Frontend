import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import '../styles/imaaPublicPages.css';

const PROGRAMS = [
  {
    abbr: "IM&A",
    name: "International M&A Expert",
    desc: "This course covers the entire M&A process — from strategy and valuation to execution and post-merger integration (PMI).",
    formats: ["Onsite", "Interactive Online Live", "Online Self-Paced", "In-House"],
    link: "https://imaa-institute.org/m-and-a-trainings/international-m-and-a/"
  },
  {
    abbr: "CPMI",
    name: "Certified Post-Merger Integration Expert",
    desc: "CPMI prepares you for post-merger integration issues, from integration planning through governance and project management to implementation.",
    formats: ["Onsite", "Interactive Online Live", "Online Self-Paced", "In-House"],
    link: "https://imaa-institute.org/m-and-a-trainings/post-merger-integration/"
  },
  {
    abbr: "M&AP",
    name: "Mergers & Acquisitions Professional Expert",
    desc: "This certification covers the transaction journey — auditing, consulting, deal advisory, and the operating discipline of running an M&A practice.",
    formats: ["Onsite", "Interactive Online Live", "Online Self-Paced", "In-House"],
    link: "https://imaa-institute.org/m-and-a-trainings/m-and-a-professional/"
  },
  {
    abbr: "LM&A",
    name: "Legal Mergers & Acquisitions Expert",
    desc: "This certification covers the legal aspects of M&A, including contracts, tax considerations, and deal structuring across geographies and jurisdictions.",
    formats: ["Interactive Online Live", "Online Self-Paced", "In-House"],
    link: "https://imaa-institute.org/m-and-a-trainings/legal-mergers-acquisitions-certification-training/"
  },
  {
    abbr: "HRM&A",
    name: "HR Mergers & Acquisitions Expert",
    desc: "HRM&A covers the transaction process from a human-resources perspective — strategy, due diligence, post-merger integration, and compensation & benefits.",
    formats: ["Onsite", "Interactive Online Live", "Online Self-Paced", "In-House"],
    link: "https://imaa-institute.org/m-and-a-trainings/human-resources-mergers-acquisitions-certification-training/"
  },
  {
    abbr: "ITM&A",
    name: "IT Mergers & Acquisitions Expert",
    desc: "This program covers the IT dimensions of M&A — from IT due diligence and systems integration planning to Day 1 readiness, IT carve-outs, and post-merger technology harmonization.",
    formats: ["Interactive Online Live", "Online Self-Paced", "In-House"],
    link: "#"
  },
  {
    abbr: "SCDE",
    name: "Certified Separation, Carve-Out and Divestment Expert",
    desc: "This training covers the divestment life cycle, from analyzing key business drivers and structuring the Transition Services Agreement to executing and implementing separations.",
    formats: ["Interactive Online Live", "In-House"],
    link: "https://imaa-institute.org/m-and-a-trainings/certified-separation-carve-out-and-divestment-expert-scde/"
  },
  {
    abbr: "Valuation",
    name: "Valuation Training with Prof. Aswath Damodaran",
    desc: "This training covers the fundamentals of each approach to valuation, the limitations and caveats of each, and extended worked examples in application.",
    formats: ["Onsite"],
    link: "https://imaa-institute.org/m-and-a-trainings/valuation-damodaran/"
  }
];

const STUDY_FORMATS = [
  {
    icon: (
      <svg viewBox="0 0 24 24"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
    ),
    title: "Onsite",
    desc: "In-person training at select locations worldwide, combining intensive classroom learning with networking opportunities."
  },
  {
    icon: (
      <svg viewBox="0 0 24 24"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg>
    ),
    title: "Interactive Online Live",
    desc: "Real-time virtual sessions led by faculty, with live Q&A, group exercises, and collaborative case studies."
  },
  {
    icon: (
      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
    ),
    title: "Online Self-Paced",
    desc: "Pre-recorded lectures, readings, and assessments accessible on your own schedule."
  }
];

export default function TrainingProgramsPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="imaa-public-page imaa-training-page">
      <Helmet>
        <title>All IMAA M&A Training Courses & Programs</title>
        <meta name="description" content="Explore IMAA's comprehensive M&A training and certification programs." />
      </Helmet>

      {/* Header */}
      <div className="header-white">
        <a className="logo" href="https://imaa-institute.org">
          <span className="mark">IMAA</span>
          <span className="desc">Institute for Mergers, Acquisitions &amp; Alliances</span>
        </a>
        <nav className={mobileMenuOpen ? 'mobile-open' : ''}>
          <a href="https://imaa-institute.org/m-and-a-trainings/" className="active">Programs</a>
          <a href="https://imaa-institute.org/m-and-a-statistics/">Statistics</a>
          <a href="https://imaa-institute.org/e-library-m-and-a/">Library</a>
          <a href="#">Resources</a>
          <a href="#">About</a>
        </nav>
        <div className="right">
          <a className="login" href="#">Log in</a>
          <div className="search-btn">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </div>
          <a className="pill btn-coral" href="https://imaa-institute.org/membership/">Join IMAA</a>
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="mobile-menu-overlay"
          onClick={() => setMobileMenuOpen(false)}
        ></div>
      )}

      {/* Hero */}
      <div className="hero">
        <div className="hero-inner">
          <div className="hero-eyebrow">M&amp;A Training &amp; Certification</div>
          <h1 className="hero-title">All IMAA M&amp;A Training Courses &amp; Programs</h1>
          <p className="hero-lede">Build M&amp;A expertise through programs designed by practitioners and recognized internationally.</p>
          <a className="pill btn-teal" href="#programs">Explore Programs</a>
        </div>
      </div>

      {/* Programs Grid */}
      <div className="programs-section" id="programs">
        <h2 className="section-title">Our Programs</h2>
        <p className="section-lede">Each program combines practical frameworks with real-world application, delivered by faculty who have led and advised on M&amp;A transactions worldwide.</p>

        <div className="program-grid">
          {PROGRAMS.map((program, idx) => (
            <div className="program-card" key={idx}>
              <div className="program-abbr">{program.abbr}</div>
              <h3 className="program-name">{program.name}</h3>
              <p className="program-desc">{program.desc}</p>
              <div className="program-formats">
                {program.formats.map((format, i) => (
                  <span className="format-tag" key={i}>{format}</span>
                ))}
              </div>
              <a className="program-link" href={program.link}>
                Learn more
                <svg viewBox="0 0 24 24"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </a>
            </div>
          ))}
        </div>

        {/* In-House Banner */}
        <div className="inhouse-banner">
          <div className="inhouse-text">
            <h3>Custom In-House M&amp;A Training</h3>
            <p>On-demand in-house M&amp;A training programs tailored to your organization's specific needs and objectives.</p>
          </div>
          <a className="pill btn-teal" href="https://imaa-institute.org/in-house-training/">Request Info</a>
        </div>
      </div>

      {/* Study Formats */}
      <div className="formats-section">
        <div className="formats-inner">
          <h2 className="section-title">Study Formats Available</h2>
          <p className="section-lede">Choose the learning format that fits your schedule and preferred style.</p>

          <div className="formats-grid">
            {STUDY_FORMATS.map((format, idx) => (
              <div className="format-card" key={idx}>
                <div className="format-card-icon">
                  {format.icon}
                </div>
                <h3>{format.title}</h3>
                <p>{format.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="cta-section">
        <h2>Not Sure Which Program Is Right for You?</h2>
        <p>Our team can help you find the program that best matches your career goals and experience level.</p>
        <div className="cta-buttons">
          <a className="pill btn-coral" href="https://imaa-institute.org/get-expert-guidance/">Get Personalized Guidance</a>
          <a className="pill btn-ghost" href="https://imaa-institute.org/m-and-a-trainings/#request-a-brochure">Request a Brochure</a>
        </div>
      </div>

      {/* Footer */}
      <div className="footer">
        <div className="footer-inner">
          <div className="footer-top">
            <div className="footer-brand">
              <span className="mark">IMAA</span>
              <span className="desc">The Professional Body for M&amp;A</span>
              <p>Setting and advancing the standards of M&amp;A globally since 2004.</p>
            </div>
            <div className="footer-cols">
              <div className="footer-col">
                <h4>Programs</h4>
                <a href="https://imaa-institute.org/m-and-a-trainings/international-m-and-a/">IM&amp;A Certification</a>
                <a href="https://imaa-institute.org/m-and-a-trainings/post-merger-integration/">CPMI Certification</a>
                <a href="https://imaa-institute.org/m-and-a-trainings/m-and-a-professional/">M&amp;AP Program</a>
                <a href="https://imaa-institute.org/m-and-a-masterclass/">Masterclass</a>
              </div>
              <div className="footer-col">
                <h4>Resources</h4>
                <a href="https://imaa-institute.org/m-and-a-statistics/">M&amp;A Statistics</a>
                <a href="#">Publications</a>
                <a href="https://imaa-institute.org/e-library-m-and-a/">M&amp;A Library</a>
                <a href="https://imaa-institute.org/m-and-a-news/">Blog</a>
              </div>
              <div className="footer-col">
                <h4>Institute</h4>
                <a href="#">About IMAA</a>
                <a href="#">Standards</a>
                <a href="#">Recognition</a>
                <a href="#">Membership</a>
                <a href="#">Faculty &amp; Team</a>
                <a href="#">Contact</a>
              </div>
              <div className="footer-col">
                <h4>Connect</h4>
                <a href="#">IMAA Connect</a>
                <a href="#">Community</a>
                <a href="https://imaa-institute.org/m-and-a-conferences/">Events</a>
                <a href="#">Groups</a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <span>&copy; 2026 Institute for Mergers, Acquisitions &amp; Alliances</span>
            <span>
              <a href="#">Terms</a>
              <a href="#">Privacy</a>
              <a href="#">Imprint</a>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
