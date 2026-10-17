import React from "react";
import MergerStatisticsChart from "./MergerStatisticsChart.jsx";
import { maChartData } from "./mergerStatisticsData.js";

const regions = [
  ["Worldwide", "worldwide", "6726"], ["North America", "north-america", "6727"],
  ["Europe", "europe", "6730"], ["Western Europe", "western-europe", "6731"],
  ["Eastern Europe", "eastern-europe", "6733"], ["Asia-Pacific", "asia-pacific", "6732"],
  ["South East Asia / ASEAN", "asean", "6734"], ["Gulf Cooperation Council (GCC)", "gcc", "6735"],
  ["Middle East & North Africa (MENA)", "mena", "6728"], ["South America", "south-america", "6736"],
];

export default function MergerStatisticsRegions({ Cta }) {
  return <div className="ms-regional-layout"><nav className="ms-regional-nav" aria-label="M&A statistics regions">{regions.map(([name, id]) => <a href={`#ms-${id}`} key={id}>{name}</a>)}</nav><div className="ms-regional-content">{regions.map(([name, id, chartId]) => <section className="ms-regional-section" id={`ms-${id}`} key={id}><h2>Number &amp; Value of M&amp;A {name}</h2>{name === "Worldwide" && <p>Since 2000, more than 790,000 transactions have been announced worldwide with a known value of over USD 57 trillion.</p>}{chartId ? <MergerStatisticsChart chart={maChartData[chartId]} /> : <p className="ms-source">The original IMAA research provides this regional Number &amp; Value series through its spreadsheet-download workflow.</p>}<Cta /></section>)}</div></div>;
}
