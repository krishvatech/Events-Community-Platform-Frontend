import React from "react";
import "../styles/mergerStatisticsChart.css";

export default function MergerStatisticsChart({ chart }) {
  const { years, number, value, title, currency, prefix } = chart;
  const width = 760, height = 320, left = 56, right = 30, top = 38, bottom = 254;
  const plotWidth = width - left - right, plotHeight = bottom - top;
  const maxNumber = Math.max(...number), maxValue = Math.max(...value);
  const x = (index) => left + index * plotWidth / (years.length - 1);
  const yNumber = (point) => bottom - point / maxNumber * plotHeight;
  const yValue = (point) => bottom - point / maxValue * plotHeight;
  const line = value.map((point, index) => `${x(index)},${yValue(point)}`).join(" ");
  return <figure className="ms-chart"><figcaption>{title}</figcaption><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${title}: transaction-count bars and transaction-value line`}><g className="ms-chart-grid">{[0, .25, .5, .75, 1].map((step) => <line key={step} x1={left} x2={width - right} y1={bottom - step * plotHeight} y2={bottom - step * plotHeight} />)}</g>{number.map((point, index) => <rect className="ms-chart-bar" key={years[index]} x={x(index) - 3} y={yNumber(point)} width="6" height={bottom - yNumber(point)} />)}<polyline className="ms-chart-line" points={line} />{years.map((year, index) => index % 4 === 0 && <text key={year} x={x(index)} y={bottom + 23} textAnchor="middle">{year}</text>)}<text x={left} y="22">Number of Transactions</text><text x={width - right} y="22" textAnchor="end">Value of Transactions ({prefix} {currency})</text></svg><div className="ms-chart-legend"><span><i />Number</span><span><b />Value</span></div></figure>;
}
