import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { designs, REVIEW_BASE } from './designOptions';
import './trainingDesignReview.css';

function PreviewArt({ design, index }) {
  return (
    <div className={`itdr-thumb itdr-thumb-${index + 1}`} aria-hidden="true">
      <div className="itdr-thumb-nav">
        <b>imaa</b>
        <span>{design.category}</span>
        <i />
      </div>
      <div className="itdr-thumb-inner">
        <div className="itdr-thumb-copy">
          <small>INTERNATIONAL M&amp;A EXPERT</small>
          <strong>{design.name}<span>IM&amp;A</span></strong>
          <div className="itdr-thumb-button">View design</div>
        </div>
        <div className="itdr-thumb-art">
          <i /><i /><i /><i />
          <span>{design.number}</span>
        </div>
      </div>
      <div className="itdr-thumb-foot">
        <span>Formats</span>
        <span>Curriculum</span>
        <span>Faculty</span>
        <span>Schedule</span>
      </div>
    </div>
  );
}

export default function DesignGallery() {
  return (
    <div className="itdr-gallery">
      <Helmet>
        <title>IMAA M&amp;A Training - Design Concepts</title>
        <meta name="robots" content="noindex,nofollow,noarchive" />
      </Helmet>
      <main className="itdr-gallery-inner">
        <header className="itdr-gallery-heading">
          <p>Client design review</p>
          <h1>IMAA M&amp;A Training - Design Concepts</h1>
        </header>
        <div className="itdr-gallery-grid">
          {designs.map((design, index) => (
            <Link key={design.id} className="itdr-gallery-card" to={`${REVIEW_BASE}/${design.id}`}>
              <PreviewArt design={design} index={index} />
              <div className="itdr-gallery-card-info">
                <div>
                  <small>Design {design.number} / 07 - {design.category}</small>
                  <h2>{design.name}</h2>
                  <p>{design.description}</p>
                </div>
                <span className="itdr-card-arrow">+</span>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
