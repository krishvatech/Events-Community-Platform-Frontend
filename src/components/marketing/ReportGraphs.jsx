// Mautic report graphs (line, pie, table) drawn without a chart library.
// The bridge hands them over as {labels, datasets} or {rows}. Series colours
// follow the reference categorical order, assigned by series position and
// never cycled: past eight series the rest are listed in the table view only.

import React, { useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

const NAVY = "#1B2A4A";
const CARD_BORDER = "#E7ECEF";
export const SERIES_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"];
const GRID = "#E7ECEF";
const AXIS_TEXT = "#5f6b7a";

const formatNumber = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value ?? "");
  return number.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const columnLabel = (key) => String(key).replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

function niceMax(value) {
  // Small counts get whole-number ticks (0..4) rather than quarters.
  if (value <= 4) return 4;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * power >= value / 4) * power;
  return Math.ceil(value / step) * step;
}

function DataTable({ graph, label }) {
  const isRows = graph.type === "table";
  const headers = isRows
    ? [...new Set((graph.rows || []).flatMap((row) => Object.keys(row)))].filter((key) => key !== "id")
    : ["", ...(graph.datasets || []).map((dataset, index) => dataset.label || `Series ${index + 1}`)];
  const rows = isRows
    ? (graph.rows || []).map((row) => headers.map((key) => row[key]))
    : (graph.labels || []).map((point, index) => [point, ...(graph.datasets || []).map((dataset) => formatNumber(dataset.data?.[index]))]);
  return (
    <TableContainer sx={{ maxHeight: 320 }}>
      <Table size="small" aria-label={label} stickyHeader>
        <TableHead>
          <TableRow>
            {headers.map((header, index) => <TableCell key={`${header}-${index}`} sx={{ fontWeight: 800, color: NAVY }}>{isRows ? columnLabel(header) : header}</TableCell>)}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length ? rows.map((row, index) => (
            <TableRow key={index}>
              {row.map((cell, cellIndex) => (
                <TableCell key={cellIndex} align={cellIndex > 0 && !Number.isNaN(Number(cell)) ? "right" : "left"} sx={{ wordBreak: "break-word" }}>
                  {cell ?? ""}
                </TableCell>
              ))}
            </TableRow>
          )) : (
            <TableRow><TableCell colSpan={headers.length || 1}><Typography variant="body2" color="text.secondary">No data for these dates.</Typography></TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function Legend({ items }) {
  return (
    <Stack direction="row" flexWrap="wrap" sx={{ gap: 1.5, mt: 1 }} aria-hidden="true">
      {items.map((item) => (
        <Stack key={item.label} direction="row" spacing={0.75} alignItems="center">
          <Box sx={{ width: 10, height: 10, borderRadius: "2px", bgcolor: item.color, flexShrink: 0 }} />
          <Typography variant="caption" sx={{ color: "text.primary" }}>{item.label}{item.value !== undefined ? `: ${formatNumber(item.value)}` : ""}</Typography>
        </Stack>
      ))}
    </Stack>
  );
}

export function LineGraph({ graph }) {
  const width = 640;
  const height = 240;
  const margin = { top: 12, right: 12, bottom: 28, left: 44 };
  const labels = graph.labels || [];
  const datasets = (graph.datasets || []).slice(0, SERIES_COLORS.length);
  const [hover, setHover] = useState(null);
  const svgRef = useRef(null);

  const max = niceMax(Math.max(0, ...datasets.flatMap((dataset) => dataset.data || []).map(Number).filter(Number.isFinite)));
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const x = (index) => margin.left + (labels.length > 1 ? (index / (labels.length - 1)) * innerW : innerW / 2);
  const y = (value) => margin.top + innerH - (Number(value) / max) * innerH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ratio * max);
  const labelEvery = Math.max(1, Math.ceil(labels.length / 8));

  const onMove = (event) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || !labels.length) return;
    const px = ((event.clientX - rect.left) / rect.width) * width;
    const index = Math.round(((px - margin.left) / innerW) * (labels.length - 1));
    setHover(Math.max(0, Math.min(labels.length - 1, index)));
  };

  return (
    <Box sx={{ position: "relative" }}>
      <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label={`${graph.label}: line chart`}
        onMouseMove={onMove} onMouseLeave={() => setHover(null)} style={{ display: "block", touchAction: "pan-y" }}>
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={margin.left} x2={width - margin.right} y1={y(tick)} y2={y(tick)} stroke={GRID} strokeWidth="1" />
            <text x={margin.left - 6} y={y(tick)} dy="0.32em" textAnchor="end" fontSize="11" fill={AXIS_TEXT}>{formatNumber(tick)}</text>
          </g>
        ))}
        {labels.map((label, index) => (index % labelEvery === 0 ? (
          <text key={`${label}-${index}`} x={x(index)} y={height - 8} textAnchor="middle" fontSize="11" fill={AXIS_TEXT}>{label}</text>
        ) : null))}
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={margin.top} y2={margin.top + innerH} stroke="#9aa5b1" strokeWidth="1" />}
        {datasets.map((dataset, seriesIndex) => (
          <polyline
            key={dataset.label || seriesIndex}
            fill="none"
            stroke={SERIES_COLORS[seriesIndex]}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={(dataset.data || []).map((value, index) => `${x(index)},${y(value)}`).join(" ")}
          />
        ))}
        {hover !== null && datasets.map((dataset, seriesIndex) => (
          <circle key={seriesIndex} cx={x(hover)} cy={y(dataset.data?.[hover] || 0)} r="4" fill={SERIES_COLORS[seriesIndex]} stroke="#fff" strokeWidth="2" />
        ))}
      </svg>
      {hover !== null && (
        <Paper elevation={3} role="status" sx={{ position: "absolute", top: 4, left: `${Math.min(70, (x(hover) / width) * 100)}%`, p: 1, pointerEvents: "none", minWidth: 140 }}>
          <Typography variant="caption" sx={{ fontWeight: 800, display: "block" }}>{labels[hover]}</Typography>
          {datasets.map((dataset, seriesIndex) => (
            <Stack key={seriesIndex} direction="row" spacing={0.75} alignItems="center">
              <Box sx={{ width: 8, height: 8, borderRadius: "2px", bgcolor: SERIES_COLORS[seriesIndex] }} />
              <Typography variant="caption">{dataset.label}: {formatNumber(dataset.data?.[hover])}</Typography>
            </Stack>
          ))}
        </Paper>
      )}
      {datasets.length > 1 && <Legend items={datasets.map((dataset, index) => ({ label: dataset.label || `Series ${index + 1}`, color: SERIES_COLORS[index] }))} />}
    </Box>
  );
}

export function PieGraph({ graph }) {
  const values = (graph.datasets?.[0]?.data || []).map((value) => Math.max(0, Number(value) || 0));
  const labels = graph.labels || [];
  const total = values.reduce((sum, value) => sum + value, 0);
  const slices = values.slice(0, SERIES_COLORS.length);
  const radius = 70;
  const stroke = 26;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
      <svg viewBox="0 0 180 180" width="180" height="180" role="img" aria-label={`${graph.label}: ${labels.map((label, i) => `${label} ${formatNumber(values[i])}`).join(", ")}`}>
        <circle cx="90" cy="90" r={radius} fill="none" stroke={GRID} strokeWidth={stroke} />
        {total > 0 && slices.map((value, index) => {
          const length = (value / total) * circumference;
          // A 2px gap between slices, when there is more than one.
          const gap = slices.filter(Boolean).length > 1 ? Math.min(2, length) : 0;
          const segment = (
            <circle key={index} cx="90" cy="90" r={radius} fill="none" stroke={SERIES_COLORS[index]} strokeWidth={stroke}
              strokeDasharray={`${Math.max(0, length - gap)} ${circumference}`} strokeDashoffset={-offset} transform="rotate(-90 90 90)">
              <title>{`${labels[index]}: ${formatNumber(value)}`}</title>
            </circle>
          );
          offset += length;
          return segment;
        })}
        <text x="90" y="86" textAnchor="middle" fontSize="20" fontWeight="800" fill={NAVY}>{formatNumber(total)}</text>
        <text x="90" y="106" textAnchor="middle" fontSize="11" fill={AXIS_TEXT}>total</text>
      </svg>
      {/* Mautic's slice labels often carry the count already ("Read emails; 16x, 21.05%"). */}
      <Legend items={slices.map((value, index) => {
        const label = labels[index] || `Part ${index + 1}`;
        return { label, color: SERIES_COLORS[index], value: /\d/.test(label) ? undefined : value };
      })} />
    </Stack>
  );
}

export function ReportGraph({ graph }) {
  const [showTable, setShowTable] = useState(graph.type === "table");
  const empty = graph.type === "table"
    ? !(graph.rows || []).length
    : !(graph.datasets || []).some((dataset) => (dataset.data || []).some((value) => Number(value)));
  return (
    <Paper variant="outlined" component="figure" role="figure" aria-label={graph.label} sx={{ m: 0, p: 2, borderRadius: 2, borderColor: CARD_BORDER, minWidth: 0 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <Typography component="figcaption" sx={{ fontWeight: 800, color: NAVY }}>{graph.label}</Typography>
        {graph.type !== "table" && (
          <Button size="small" onClick={() => setShowTable((value) => !value)} sx={{ textTransform: "none", whiteSpace: "nowrap" }}>
            {showTable ? "Show chart" : "Show data"}
          </Button>
        )}
      </Stack>
      {showTable ? <DataTable graph={graph} label={`${graph.label} data`} />
        : empty ? <Typography variant="body2" color="text.secondary">No data for these dates.</Typography>
          : graph.type === "pie" ? <PieGraph graph={graph} /> : <LineGraph graph={graph} />}
    </Paper>
  );
}

export default function ReportGraphs({ graphs }) {
  const items = useMemo(() => (Array.isArray(graphs) ? graphs : []), [graphs]);
  if (!items.length) return null;
  return (
    <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "repeat(2, minmax(0, 1fr))" } }}>
      {items.map((graph) => <ReportGraph key={graph.key} graph={graph} />)}
    </Box>
  );
}
