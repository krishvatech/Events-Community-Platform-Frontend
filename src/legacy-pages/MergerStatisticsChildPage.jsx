import React from 'react';
import { Helmet } from 'react-helmet-async';
import DOMPurify from 'dompurify';
import data from './mergerStatisticsSourceData.json';
import { statisticsLinks, statisticsBase } from './mergerStatisticsRoutes.js';
import '../styles/mergerStatistics.css';
import '../styles/mergerStatisticsChild.css';

const source = 'https://imaa-institute.org';
const slugFor = (path) => path.replace(/\/$/, '').split('/').pop();
const safeId = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const localRoutes = Object.fromEntries(statisticsLinks.map(([label, path]) => [slugFor(path), path]));
const countryHeroTitles = {
  'united-states-ma-statistics': 'M&A United States',
  'canada-ma-statistics': 'M&A Canada',
  'united-kingdom-ma-statistics': 'M&A United Kingdom',
  'china-ma-statistics': 'M&A China',
  'germany-ma-statistics': 'M&A Germany',
  'switzerland-ma-statistics': 'M&A Switzerland',
  'mergers-acquisitions-austria': 'M&A Austria',
  'singapore-ma-statistics': 'M&A Singapore',
};
// [left chart, last block in its column, right chart, last block in its column] from the IMAA two-column sections.
const chartPairRanges = {
  'united-states-ma-statistics': [[10, 11, 12, 13], [19, 20, 21, 22], [39, 39, 40, 40], [42, 42, 43, 43]],
  'canada-ma-statistics': [[9, 10, 11, 12], [16, 17, 18, 19]],
  'united-kingdom-ma-statistics': [[10, 11, 12, 13], [20, 20, 21, 21]],
  'china-ma-statistics': [[9, 10, 11, 12], [18, 19, 20, 21]],
  'germany-ma-statistics': [[7, 8, 9, 10], [14, 15, 16, 17], [21, 22, 23, 24]],
  'switzerland-ma-statistics': [[9, 10, 11, 12], [16, 17, 18, 19]],
  'mergers-acquisitions-austria': [[12, 13, 14, 15]],
  'singapore-ma-statistics': [[9, 10, 11, 12], [18, 19, 20, 21]],
};

function sourceHtml(html) {
  return html.replace(/(<a\b[^>]*>)(\s*)(Login|Become a Member|Free User)(\s*<\/a>)/gi, (_match, opening, space, label, closing) => {
    const kind = /^login$/i.test(label) ? 'login' : /^free user$/i.test(label) ? 'free' : 'member';
    return `${opening.replace(/>$/, ` class="ms-action-${kind}">`)}${space}${label}${closing}`;
  }).replace(/href="([^"]+)"/g, (_match, href) => {
    if (href.startsWith('#')) return `href="${href}"`;
    const parsed = new URL(href, source);
    if (parsed.hostname === 'imaa-institute.org' || parsed.hostname === 'www.imaa-institute.org') {
      const slug = slugFor(parsed.pathname);
      if (localRoutes[slug]) return `href="${localRoutes[slug]}"`;
      if (slug === 'login') return 'href="/signin"';
      if (slug === 'register') return 'href="/signup"';
    }
    return `href="${parsed.href}"`;
  });
}

function PublishedChart({ chart }) {
  const count = Math.min(chart.years?.length || 0, chart.numbers?.length || 0);
  if (!count) return null;
  const numbers = chart.numbers.slice(0, count).map(Number);
  const values = (chart.values || []).slice(0, count).map(Number);
  const maxNumber = Math.max(...numbers, 1);
  const maxValue = Math.max(...values, 1);
  const width = Math.max(760, count * 24);
  const chartHeight = 220;
  return <figure className="msc-chart">
    <figcaption>{chart.title || 'Number and value of M&A'}</figcaption>
    <div className="msc-chart-scroll"><svg viewBox={`0 0 ${width} 270`} role="img" aria-label={`${chart.title || 'M&A'}: published yearly number and value data`} style={{ minWidth: width }}>
      <line x1="34" y1="225" x2={width - 10} y2="225" stroke="#9aa9bd" />
      {values.length > 0 && <polyline points={values.map((value, index) => `${48 + index * ((width - 55) / count)},${225 - value / maxValue * chartHeight}`).join(' ')} fill="none" stroke="#d45b48" strokeWidth="2" />}
      {numbers.map((number, index) => {
        const x = 42 + index * ((width - 55) / count);
        const barHeight = number / maxNumber * chartHeight;
        const valueY = 225 - (values[index] || 0) / maxValue * chartHeight;
        return <g key={index}><rect x={x} y={225 - barHeight} width="13" height={barHeight} fill="#294f7a"><title>{chart.years[index]}: {number} deals</title></rect>{values.length > 0 && <circle cx={x + 6} cy={valueY} r="3" fill="#d45b48"><title>{chart.years[index]}: {values[index]} {chart.prefix || ''} {chart.currency || ''}</title></circle>}<text x={x + 6} y="245" textAnchor="middle" fontSize="9" fill="#617398" transform={`rotate(45 ${x + 6} 245)`}>{chart.years[index]}</text></g>;
      })}
    </svg></div>
    <p className="msc-chart-key"><span className="msc-number-key" /> Number of transactions {values.length > 0 && <><span className="msc-value-key" /> Value ({chart.prefix || ''} {chart.currency || ''})</>}</p>
    <details><summary>View published source data</summary><div className="msc-table"><table><thead><tr><th>Year</th><th>Number</th>{values.length > 0 && <th>Value ({chart.prefix || ''} {chart.currency || ''})</th>}</tr></thead><tbody>{numbers.map((number, index) => <tr key={index}><td>{chart.years[index]}</td><td>{number}</td>{values.length > 0 && <td>{values[index]}</td>}</tr>)}</tbody></table></div></details>
  </figure>;
}

function SourceBlock({ block, index, industryHeadings }) {
  if (block.type === 'heading') return React.createElement(block.level === 'h2' ? 'h2' : 'h3', { id: safeId(block.text), key: index }, block.text);
  if (block.type === 'html') return <div key={index} className="msc-copy" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(sourceHtml(block.html)) }} />;
  if (block.type === 'anchors') return <nav key={index} className="msc-anchors" aria-label="Page sections">{block.links.map((link, i) => <a key={i} href={`#${safeId(industryHeadings[i] || link.text)}`}>{link.text}</a>)}</nav>;
  if (block.type === 'embed') return <div key={index} className="msc-embed"><iframe src={block.src} title={`IMAA published chart ${index}`} loading="lazy" /></div>;
  if (block.type === 'chart') return <PublishedChart key={index} chart={block} />;
  if (block.type === 'table') return <div key={index} className="msc-table"><table><thead><tr>{block.rows[0]?.map((cell, i) => <th key={i}>{cell}</th>)}</tr></thead><tbody>{block.rows.slice(1).map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>;
  return null;
}

export default function MergerStatisticsChildPage({ slug: suppliedSlug }) {
  const slug = suppliedSlug || slugFor(window.location.pathname);
  const blocks = data[slug];
  const name = statisticsLinks.find(([, path]) => slugFor(path) === slug)?.[0]?.replace(' – M&A Statistics', '');
  if (!blocks || !name) return null;
  const industryHeadings = blocks.filter((block) => block.type === 'heading' && block.text.startsWith('M&A ')).map((block) => block.text);
  const mapPairStarts = new Set(blocks.flatMap((block, index) => {
    const pair = blocks.slice(index, index + 6);
    const geographicSection = /Acquisitions (Abroad|Inbound|by Foreign Companies)|Map of Outbound Acquisition/.test(block.text || '');
    return geographicSection && pair.map((part) => part?.type).join(',') === 'heading,html,heading,embed,heading,embed'
      && /Numbers/i.test(pair[2].text) && /Value/i.test(pair[4].text) ? [index] : [];
  }));
  const pairedBlockIndexes = new Set([...mapPairStarts].flatMap((start) => [1, 2, 3, 4, 5].map((offset) => start + offset)));
  const chartPairs = new Map((chartPairRanges[slug] || []).filter(([leftStart, leftEnd, rightStart, rightEnd]) =>
    blocks[leftStart]?.type === 'embed' && blocks[rightStart]?.type === 'embed' && leftStart <= leftEnd && leftEnd + 1 === rightStart && rightStart <= rightEnd
      && blocks.slice(leftStart + 1, leftEnd + 1).every((part) => part.type === 'html')
      && blocks.slice(rightStart + 1, rightEnd + 1).every((part) => part.type === 'html')
  ).map(([leftStart, leftEnd, rightStart, rightEnd]) => [leftStart, { leftEnd, rightStart, rightEnd }]));
  const chartPairBlockIndexes = new Set([...chartPairs.entries()].flatMap(([start, { rightEnd }]) =>
    Array.from({ length: rightEnd - start }, (_, offset) => start + offset + 1)));
  return <div className="ms-page msc-page"><Helmet><title>{name} | IMAA Connect</title></Helmet>
    <section className="ms-hero"><div><p>IMAA RESEARCH</p><h1>{countryHeroTitles[slug] || name}</h1><p>IMAA offers extensive and up-to-date information, data, research on M&amp;A and Mergers &amp; Acquisitions statistics for registered users. Corporate members have access to tailored research services.</p><a className="ms-button" href={`${source}/membership/`}>Become a member</a></div><img src={`${source}/wp-content/uploads/2024/06/Statistics.webp`} alt="IMAA M&A statistics" /></section>
    <nav className="ms-nav" aria-label="Statistics navigation">{statisticsLinks.map(([label, href]) => <a key={href} href={href} aria-current={slugFor(href) === slug ? 'page' : undefined}>{label}</a>)}</nav>
    <main className="msc-content">{blocks.map((block, index) => {
      if (pairedBlockIndexes.has(index)) return null;
      if (chartPairBlockIndexes.has(index)) return null;
      if (chartPairs.has(index)) {
        const { leftEnd, rightStart, rightEnd } = chartPairs.get(index);
        return <div key={index} className="msc-chart-pair">
          <div>{blocks.slice(index, leftEnd + 1).map((part, offset) => <SourceBlock key={index + offset} block={part} index={index + offset} industryHeadings={industryHeadings} />)}</div>
          <div>{blocks.slice(rightStart, rightEnd + 1).map((part, offset) => <SourceBlock key={rightStart + offset} block={part} index={rightStart + offset} industryHeadings={industryHeadings} />)}</div>
        </div>;
      }
      if (mapPairStarts.has(index)) return <section key={index} className="msc-map-pair" aria-labelledby={safeId(block.text)}>
        <SourceBlock block={block} index={index} industryHeadings={industryHeadings} />
        <SourceBlock block={blocks[index + 1]} index={index + 1} industryHeadings={industryHeadings} />
        <div className="msc-map-pair-grid">
          <div><SourceBlock block={blocks[index + 2]} index={index + 2} industryHeadings={industryHeadings} /><SourceBlock block={blocks[index + 3]} index={index + 3} industryHeadings={industryHeadings} /></div>
          <div><SourceBlock block={blocks[index + 4]} index={index + 4} industryHeadings={industryHeadings} /><SourceBlock block={blocks[index + 5]} index={index + 5} industryHeadings={industryHeadings} /></div>
        </div>
      </section>;
      return <React.Fragment key={index}><SourceBlock block={block} index={index} industryHeadings={industryHeadings} />{index === 1 && slug !== 'ma-statistics-by-countries' && <p className="msc-login"><a className="ms-button" href="/signin">Log In</a></p>}</React.Fragment>;
    })}</main>
  </div>;
}
