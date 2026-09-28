import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import '../styles/imaaPublicPages.css';

const INSTITUTIONS = [
  {
    id: 1,
    name: "Association of Chartered Certified Accountants",
    location: "London · United Kingdom · Global",
    status: "review",
    competencies: [1, 2, 3, 4],
    programs: 1,
    mobileMeta: "GLOBAL · UNDER REVIEW · 1 PROGRAM"
  },
  {
    id: 2,
    name: "CAIA Association",
    location: "Amherst · United States · Global",
    status: "review",
    competencies: [1, 2, 3, 4],
    programs: 1,
    mobileMeta: "AMHERST · UNDER REVIEW · 1 PROGRAM"
  },
  {
    id: 3,
    name: "CFA Institute",
    location: "Charlottesville · United States · Global",
    status: "review",
    competencies: [1, 2, 3, 4],
    programs: 1,
    mobileMeta: "GLOBAL · UNDER REVIEW · 1 PROGRAM"
  },
  {
    id: 4,
    name: "Columbia Business School Executive Education",
    location: "New York · United States",
    status: "review",
    competencies: [1, 2, 3, 4],
    programs: 2,
    mobileMeta: "NEW YORK · UNDER REVIEW · 2 PROGRAMS"
  },
  {
    id: 5,
    name: "DIFC Academy",
    location: "Dubai · United Arab Emirates",
    status: "review",
    competencies: [1, 2, 3, 4],
    programs: 1,
    mobileMeta: "DUBAI · UNDER REVIEW · 1 PROGRAM"
  },
  {
    id: 6,
    name: "INSEAD",
    location: "Fontainebleau · France · Singapore · Abu Dhabi",
    status: "review",
    competencies: [1, 2, 3, 4],
    programs: 2,
    mobileMeta: "FRANCE · UNDER REVIEW · 2 PROGRAMS"
  },
  {
    id: 7,
    name: "Institute of Singapore Chartered Accountants",
    location: "Singapore",
    status: "review",
    competencies: [1, 2, 3, 4],
    programs: 1,
    mobileMeta: "SINGAPORE · UNDER REVIEW · 1 PROGRAM"
  },
  {
    id: 8,
    name: "International Valuation Standards Council",
    location: "London · Global standards body",
    status: "review",
    competencies: [1, 2, 3, 4],
    programs: 0,
    mobileMeta: "LONDON · UNDER REVIEW · REFERENCE"
  },
  {
    id: 9,
    name: "Invest Europe",
    location: "Brussels · Belgium · Pan-European · formerly EVCA",
    status: "review",
    competencies: [1, 2, 3, 4],
    programs: 1,
    mobileMeta: "BRUSSELS · UNDER REVIEW · 1 PROGRAM"
  }
];

function getStatusDot(status) {
  switch (status) {
    case 'partner':
      return 'partner';
    case 'recognized':
      return 'recognized';
    case 'affiliated':
      return 'affiliated';
    case 'review':
    default:
      return 'review';
  }
}

function getStatusLabel(status) {
  switch (status) {
    case 'partner':
      return 'Partner';
    case 'recognized':
      return 'Recognized';
    case 'affiliated':
      return 'Affiliated';
    case 'review':
    default:
      return 'Under Review';
  }
}

export default function RecognitionDirectoryPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeCompetencies, setActiveCompetencies] = useState(new Set());
  const [viewMode, setViewMode] = useState('institution');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Filter institutions
  const filteredInstitutions = INSTITUTIONS.filter(inst => {
    const matchesSearch = !searchTerm.trim() ||
      inst.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inst.location.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || inst.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleCompetencyToggle = (comp) => {
    const newActive = new Set(activeCompetencies);
    if (newActive.has(comp)) {
      newActive.delete(comp);
    } else {
      newActive.add(comp);
    }
    setActiveCompetencies(newActive);
  };

  return (
    <div className="imaa-public-page imaa-recognition-page">
      <Helmet>
        <title>The IMAA Recognition Directory</title>
        <meta name="description" content="A public register of education providers whose curricula have been evaluated against the M&A Competency Standards." />
      </Helmet>

      {/* Header */}
      <div className="header-white">
        <div className="logo">
          <span className="mark">IMAA</span>
          <span className="desc">The Professional Body for M&amp;A</span>
        </div>
        <nav className={mobileMenuOpen ? 'mobile-open' : ''}>
          <a href="#">Programs</a>
          <a href="#">Conferences</a>
          <a href="#">Standards</a>
          <a href="#">Statistics</a>
          <a href="#">About</a>
        </nav>
        <div className="right">
          <div className="search-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
            </svg>
          </div>
          <a href="#" className="login">Login</a>
          <span className="pill btn-coral">Join IMAA</span>
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
      <section className="hero with-gradient">
        <div className="hero-inner">
          <div className="hero-eyebrow">Recognition by IMAA · Public Register</div>
          <h1 className="hero-title">The institutions and programs that <em>meet the standards</em>.</h1>
          <p className="hero-lede">A public register of education providers whose curricula have been evaluated against the M&amp;A Competency Standards. Recognition is granted at two levels: the institution and the individual program.</p>
          <p className="hero-lede">Every entry carries the date of its last review. Status and scope are listed openly.</p>
          <div className="hero-ctas">
            <a className="pill btn-coral" href="mailto:info@imaa.org">Apply for recognition</a>
            <a className="pill btn-ghost-light" href="#">Read the standards</a>
          </div>
        </div>
      </section>

      {/* Context */}
      <section className="context">
        <div className="context-inner">
          <div className="context-eyebrow">Public register</div>
          <h2 className="context-title">Every entry, every review, on the record.</h2>
          <p className="top-notice"><strong>Under review</strong> indicates an institution or program is under active evaluation against the M&amp;A Competency Standards. A review in progress is not an endorsement, and recognition is not guaranteed.</p>
          <div className="meta-row">
            <div><span className="count">9 institutions</span> &nbsp;·&nbsp; <span className="count">10 published programs</span></div>
            <div>Last updated 18 April 2026</div>
          </div>
        </div>
      </section>

      {/* Filter Bar */}
      <section className="filter-bar">
        <div className="filter-bar-inner">
          <div className="search-field">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
            </svg>
            <input
              type="text"
              placeholder="Search institution or program…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <span className="filter-label">Status</span>
            <button
              className={`chip filter ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              All
            </button>
            <button
              className={`chip filter ${statusFilter === 'recognized' ? 'active' : ''}`}
              onClick={() => setStatusFilter('recognized')}
            >
              Recognized
            </button>
            <button
              className={`chip filter ${statusFilter === 'partner' ? 'active' : ''}`}
              onClick={() => setStatusFilter('partner')}
            >
              Partner
            </button>
            <button
              className={`chip filter ${statusFilter === 'review' ? 'active' : ''}`}
              onClick={() => setStatusFilter('review')}
            >
              Under review
            </button>
          </div>

          <div className="filter-group">
            <span className="filter-label">Competency</span>
            {[1, 2, 3, 4].map((comp) => (
              <button
                key={comp}
                className={`chip filter chip-comp ${activeCompetencies.has(comp) ? 'active' : ''}`}
                onClick={() => handleCompetencyToggle(comp)}
              >
                C{comp}
              </button>
            ))}
          </div>

          <div className="view-toggle">
            <button
              className={viewMode === 'institution' ? 'active' : ''}
              onClick={() => setViewMode('institution')}
            >
              By institution
            </button>
            <button
              className={viewMode === 'program' ? 'active' : ''}
              onClick={() => setViewMode('program')}
            >
              By program
            </button>
          </div>
        </div>
      </section>

      {/* Directory */}
      <main className="directory">
        <div className="directory-inner">
          {filteredInstitutions.map((inst) => (
            <article key={inst.id} className="institution" data-status={inst.status}>
              <div className="inst-header" data-mobile-meta={inst.mobileMeta}>
                <div className="inst-body">
                  <div className="inst-name">{inst.name}</div>
                  <div className="inst-location">{inst.location}</div>
                </div>
                <div className="status-marker">
                  <span className={`status-dot ${getStatusDot(inst.status)}`}></span>
                  {getStatusLabel(inst.status)}
                </div>
                <div className="comp-cells">
                  {[1, 2, 3, 4].map((comp) => (
                    <div
                      key={comp}
                      className={`comp-cell ${inst.competencies.includes(comp) ? 'on' : ''}`}
                    >
                      {comp}
                    </div>
                  ))}
                </div>
                <div className="prog-count">
                  <strong>{inst.programs}</strong> {inst.programs === 1 ? 'program' : 'programs'}
                </div>
              </div>
            </article>
          ))}
        </div>
      </main>

      {/* Legend */}
      <section className="legend">
        <div className="legend-inner">
          <div className="legend-block">
            <h4>Status</h4>
            <div className="item">
              <span className="status-dot partner"></span>
              Partner — delivers IMAA programs directly
            </div>
            <div className="item">
              <span className="status-dot affiliated"></span>
              Affiliated — integrates the IMAA framework
            </div>
            <div className="item">
              <span className="status-dot recognized"></span>
              Recognized — meets the M&amp;A Competency Standards
            </div>
            <div className="item">
              <span className="status-dot review"></span>
              Under Review — active evaluation in progress
            </div>
          </div>
          <div className="legend-block">
            <h4>Competencies</h4>
            <div className="item">
              <span className="comp-cell on" style={{ width: '18px', height: '18px', fontSize: 'var(--fs-micro)' }}>1</span>
              C1 &nbsp; M&amp;A Fundamentals
            </div>
            <div className="item">
              <span className="comp-cell on" style={{ width: '18px', height: '18px', fontSize: 'var(--fs-micro)' }}>2</span>
              C2 &nbsp; Due Diligence
            </div>
            <div className="item">
              <span className="comp-cell on" style={{ width: '18px', height: '18px', fontSize: 'var(--fs-micro)' }}>3</span>
              C3 &nbsp; Valuation
            </div>
            <div className="item">
              <span className="comp-cell on" style={{ width: '18px', height: '18px', fontSize: 'var(--fs-micro)' }}>4</span>
              C4 &nbsp; Post Merger Integration
            </div>
          </div>
          <div className="legend-block">
            <h4>About this register</h4>
            <p>Every entry is reviewed against the published M&amp;A Competency Standards and revisited on a scheduled cycle. Providers may apply for review at any time.</p>
            <a href="mailto:info@imaa.org" className="pill btn-coral">Apply for recognition</a>
          </div>
        </div>
      </section>

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
                <a href="#">IM&amp;A Certification</a>
                <a href="#">CPMI Certification</a>
                <a href="#">M&amp;AP Program</a>
                <a href="#">Masterclass</a>
              </div>
              <div className="footer-col">
                <h4>Resources</h4>
                <a href="#">M&amp;A Statistics</a>
                <a href="#">Publications</a>
                <a href="#">M&amp;A Library</a>
                <a href="#">Blog</a>
              </div>
              <div className="footer-col">
                <h4>Institute</h4>
                <a href="#">About IMAA</a>
                <a href="#">Standards</a>
                <a href="/recognition/">Recognition</a>
                <a href="#">Membership</a>
                <a href="#">Faculty &amp; Team</a>
                <a href="#">Contact</a>
              </div>
              <div className="footer-col">
                <h4>Connect</h4>
                <a href="#">IMAA Connect</a>
                <a href="#">Community</a>
                <a href="#">Events</a>
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
