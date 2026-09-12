import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AnalyticsRoundedIcon from "@mui/icons-material/AnalyticsRounded";
import CampaignRoundedIcon from "@mui/icons-material/CampaignRounded";
import ContactMailRoundedIcon from "@mui/icons-material/ContactMailRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SegmentRoundedIcon from "@mui/icons-material/SegmentRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import ViewModuleRoundedIcon from "@mui/icons-material/ViewModuleRounded";
import { useNavigate } from "react-router-dom";

import { getNewsletterDashboard } from "../services/newsletterService";

const CARD_BORDER = "#E7ECEF";
const TEXT = "#1B2A4A";
const TEAL = "#0f766e";
const TWO_COLUMN_GRID = {
  display: "grid",
  gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
  gap: 2.5,
  alignItems: "stretch",
};

const toIsoDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const rangeForDays = (days) => {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  return { from: toIsoDate(start), to: toIsoDate(end) };
};

const formatDateTime = (value) => {
  if (!value) return "No date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No date";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatChartDate = (value) => {
  if (!value) return "No date";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "No date";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
};

const errorMessage = (err) => err?.response?.data?.detail || err?.message || "Dashboard data is unavailable.";

function Widget({ title, action, children, minHeight = 260, compact = false }) {
  return (
    <Paper variant="outlined" sx={{ p: compact ? 1.75 : 2.25, borderRadius: 2, borderColor: CARD_BORDER, bgcolor: "#fff", minHeight, height: "100%" }}>
      <Stack spacing={2} sx={{ height: "100%" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.5}>
          <Typography variant="h6" sx={{ color: TEXT, fontWeight: 850, fontSize: 18 }}>
            {title}
          </Typography>
          {action}
        </Stack>
        {children}
      </Stack>
    </Paper>
  );
}

function ContactsCreatedChart({ section, loading }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const rows = Array.isArray(section?.series) ? section.series : [];
  const width = 1100;
  const height = 340;
  const margin = { top: 24, right: 28, bottom: 48, left: 52 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const maxValue = Math.max(1, ...rows.map((item) => Number(item.count || 0)));
  const xFor = (index) => margin.left + (rows.length <= 1 ? plotWidth / 2 : (index / (rows.length - 1)) * plotWidth);
  const yFor = (value) => margin.top + plotHeight - (Math.max(0, Number(value || 0)) / maxValue) * plotHeight;
  const points = rows.map((item, index) => `${xFor(index)},${yFor(item.count)}`).join(" ");
  const areaPoints = rows.length ? `${margin.left},${margin.top + plotHeight} ${points} ${margin.left + plotWidth},${margin.top + plotHeight}` : "";
  const labelEvery = Math.max(1, Math.ceil(rows.length / 7));
  const yTicks = Array.from({ length: 5 }, (_, index) => Math.round((maxValue * index) / 4));
  const activePoint = activeIndex === null ? null : rows[activeIndex];
  const tooltipWidth = 176;
  const tooltipHeight = 62;
  const tooltipX = activePoint
    ? Math.max(margin.left, Math.min(width - margin.right - tooltipWidth, xFor(activeIndex) - tooltipWidth / 2))
    : 0;
  const tooltipY = activePoint
    ? Math.max(margin.top + 4, yFor(activePoint.count) - tooltipHeight - 14)
    : 0;

  return (
    <Widget title="Contacts Created" minHeight={{ xs: 360, md: 420 }}>
      {loading ? <Skeleton variant="rounded" height={320} /> : section?.status === "unavailable" ? (
        <SectionUnavailable detail={section.detail} />
      ) : rows.length ? (
        <Box sx={{ width: "100%", overflowX: "auto" }}>
          <Box
            component="svg"
            viewBox={`0 0 ${width} ${height}`}
            onMouseLeave={() => setActiveIndex(null)}
            sx={{ display: "block", width: "100%", minWidth: { xs: 640, md: 0 } }}
          >
            {yTicks.map((tick) => {
              const y = yFor(tick);
              return (
                <React.Fragment key={tick}>
                  <line x1={margin.left} x2={width - margin.right} y1={y} y2={y} stroke="#EEF2F4" />
                  <text x={margin.left - 12} y={y + 4} textAnchor="end" fontSize="12" fill="#64748B">{tick}</text>
                </React.Fragment>
              );
            })}
            <line x1={margin.left} x2={margin.left} y1={margin.top} y2={height - margin.bottom} stroke="#CBD5E1" />
            <line x1={margin.left} x2={width - margin.right} y1={height - margin.bottom} y2={height - margin.bottom} stroke="#CBD5E1" />
            {areaPoints ? <polygon points={areaPoints} fill="rgba(15, 118, 110, 0.12)" /> : null}
            {points ? <polyline points={points} fill="none" stroke={TEAL} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" /> : null}
            {activePoint ? (
              <line
                x1={xFor(activeIndex)}
                x2={xFor(activeIndex)}
                y1={margin.top}
                y2={height - margin.bottom}
                stroke="rgba(15, 118, 110, 0.28)"
                strokeDasharray="4 5"
              />
            ) : null}
            {rows.map((item, index) => (
              <g key={item.date}>
                <circle
                  cx={xFor(index)}
                  cy={yFor(item.count)}
                  r={activeIndex === index ? "7" : "4"}
                  fill={activeIndex === index ? TEAL : "#fff"}
                  stroke={TEAL}
                  strokeWidth={activeIndex === index ? "3" : "2"}
                  tabIndex={0}
                  role="img"
                  aria-label={`${formatChartDate(item.date)}, Contacts Created: ${Number(item.count || 0)}`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onFocus={() => setActiveIndex(index)}
                  onBlur={() => setActiveIndex(null)}
                  style={{ cursor: "pointer", outline: "none" }}
                />
                {index % labelEvery === 0 || index === rows.length - 1 ? (
                  <text x={xFor(index)} y={height - margin.bottom + 24} textAnchor="middle" fontSize="12" fill="#64748B">
                    {item.date.slice(5)}
                  </text>
                ) : null}
              </g>
            ))}
            {activePoint ? (
              <g pointerEvents="none">
                <rect
                  x={tooltipX}
                  y={tooltipY}
                  width={tooltipWidth}
                  height={tooltipHeight}
                  rx="8"
                  fill="#fff"
                  stroke={CARD_BORDER}
                  filter="drop-shadow(0 8px 18px rgba(15, 23, 42, 0.14))"
                />
                <rect x={tooltipX} y={tooltipY} width="4" height={tooltipHeight} rx="2" fill={TEAL} />
                <text x={tooltipX + 16} y={tooltipY + 25} fontSize="13" fontWeight="700" fill={TEXT}>
                  {formatChartDate(activePoint.date)}
                </text>
                <text x={tooltipX + 16} y={tooltipY + 46} fontSize="12" fill="#475569">
                  Contacts Created: {Number(activePoint.count || 0)}
                </text>
              </g>
            ) : null}
          </Box>
        </Box>
      ) : (
        <EmptyCopy>No contact creation data is available for this range.</EmptyCopy>
      )}
    </Widget>
  );
}

function LoadingRows({ count = 4 }) {
  return (
    <Stack spacing={1.25}>
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} variant="rounded" height={46} />
      ))}
    </Stack>
  );
}

function SectionUnavailable({ detail }) {
  return <Alert severity="warning" variant="outlined">{detail || "Provider data is unavailable."}</Alert>;
}

function EmptyCopy({ children }) {
  return <Typography color="text.secondary">{children}</Typography>;
}

function RecentActivity({ section, loading }) {
  const navigate = useNavigate();
  const rows = (section?.results || []).slice(0, 6);
  return (
    <Widget title="Recent Marketing Activity" minHeight={320}>
      {loading ? <LoadingRows count={5} /> : section?.status === "unavailable" ? (
        <SectionUnavailable detail={section.detail} />
      ) : rows.length ? (
        <List disablePadding>
          {rows.map((row, index) => (
            <React.Fragment key={row.id || index}>
              <ListItemButton
                disabled={!row.contact_id && !row.campaign_id}
                onClick={() => {
                  if (row.contact_id) navigate(`/admin/newsletter/contacts/${row.contact_id}`);
                  else if (row.campaign_id) navigate(`/admin/newsletter/builder/${row.campaign_id}`);
                }}
                sx={{ px: 0.5, py: 0.85, borderRadius: 1.5 }}
              >
                <Box sx={{ width: 34, height: 34, borderRadius: 2, bgcolor: "rgba(15, 118, 110, 0.1)", color: TEAL, display: "grid", placeItems: "center", mr: 1.25, flexShrink: 0 }}>
                  <TaskAltRoundedIcon fontSize="small" />
                </Box>
                <ListItemText
                  primary={<Typography sx={{ fontWeight: 800, color: TEXT }}>{row.description}</Typography>}
                  secondary={`${row.entity || row.email || "Marketing activity"} · ${formatDateTime(row.timestamp)}`}
                />
              </ListItemButton>
              {index < rows.length - 1 ? <Divider /> : null}
            </React.Fragment>
          ))}
        </List>
      ) : (
        <EmptyCopy>No recent provider-backed activity is available yet.</EmptyCopy>
      )}
    </Widget>
  );
}

function UpcomingEmails({ section, loading }) {
  const rows = section?.results || [];
  return (
    <Widget title="Upcoming Emails" minHeight={320}>
      {loading ? <LoadingRows count={3} /> : section?.status === "unavailable" ? (
        <SectionUnavailable detail={section.detail} />
      ) : rows.length ? (
        <Stack spacing={1.25}>
          {rows.map((row) => (
            <Box key={row.id} sx={{ p: 1.5, border: `1px solid ${CARD_BORDER}`, borderRadius: 1.5 }}>
              <Stack direction="row" justifyContent="space-between" spacing={1.5}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 800, color: TEXT }} noWrap>{row.name || row.subject || "Scheduled email"}</Typography>
                  <Typography variant="body2" color="text.secondary" noWrap>{row.subject || row.emailType || "Email"}</Typography>
                </Box>
                <Chip size="small" label={row.status || "Scheduled"} color="info" variant="outlined" />
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>{formatDateTime(row.scheduledAt)}</Typography>
            </Box>
          ))}
        </Stack>
      ) : (
        <EmptyCopy>No emails are currently scheduled.</EmptyCopy>
      )}
    </Widget>
  );
}

function AttentionRequired({ section, loading }) {
  const navigate = useNavigate();
  const warnings = section?.warnings || [];
  const hasWarnings = Number(section?.warning_count || 0) > 0;
  return (
    <Widget
      title="Attention Required"
      minHeight={120}
      compact
      action={
        <Button size="small" startIcon={<SettingsRoundedIcon />} onClick={() => navigate("/admin/newsletter/settings")} sx={{ textTransform: "none" }}>
          View Settings
        </Button>
      }
    >
      {loading ? <LoadingRows count={3} /> : section?.status === "unavailable" ? (
        <SectionUnavailable detail={section.detail} />
      ) : hasWarnings ? (
        <Stack spacing={1.25}>
          <Alert icon={<ErrorOutlineRoundedIcon />} severity="warning" variant="outlined">
            {section.warning_count} current operational warning{section.warning_count === 1 ? "" : "s"}
          </Alert>
          {warnings.map((warning) => (
            <Typography key={warning} variant="body2" color="text.secondary">{warning}</Typography>
          ))}
        </Stack>
      ) : (
        <Alert icon={<TaskAltRoundedIcon />} severity="success" variant="outlined">No current operational warnings.</Alert>
      )}
    </Widget>
  );
}

function RecentCampaigns({ section, loading }) {
  const navigate = useNavigate();
  const rows = section?.results || [];
  return (
    <Widget title="Recent Campaigns" minHeight={320}>
      {loading ? <LoadingRows count={4} /> : section?.status === "unavailable" ? (
        <SectionUnavailable detail={section.detail} />
      ) : rows.length ? (
        <Stack spacing={1.25}>
          {rows.map((row) => (
            <ListItemButton key={row.id} onClick={() => navigate(`/admin/newsletter/builder/${row.id}`)} sx={{ px: 1.25, py: 1.25, border: `1px solid ${CARD_BORDER}`, borderRadius: 1.5 }}>
              <CampaignRoundedIcon sx={{ color: TEAL, mr: 1.25 }} />
              <ListItemText
                primary={<Typography sx={{ fontWeight: 800, color: TEXT }} noWrap>{row.name || "Campaign"}</Typography>}
                secondary={formatDateTime(row.dateModified)}
              />
              <Chip size="small" label={row.status || "Draft"} color={row.isPublished ? "success" : "default"} variant={row.isPublished ? "filled" : "outlined"} />
            </ListItemButton>
          ))}
        </Stack>
      ) : (
        <EmptyCopy>No native Mautic campaigns are available yet.</EmptyCopy>
      )}
    </Widget>
  );
}

function RecentContacts({ section, loading }) {
  const navigate = useNavigate();
  const rows = section?.results || [];
  return (
    <Widget title="Recent Contacts" minHeight={320}>
      {loading ? <LoadingRows count={4} /> : section?.status === "unavailable" ? (
        <SectionUnavailable detail={section.detail} />
      ) : rows.length ? (
        <Stack spacing={1.25}>
          {rows.map((row) => (
            <ListItemButton key={row.id} onClick={() => navigate(`/admin/newsletter/contacts/${row.id}`)} sx={{ px: 1.25, py: 1.25, border: `1px solid ${CARD_BORDER}`, borderRadius: 1.5 }}>
              <ContactMailRoundedIcon sx={{ color: TEAL, mr: 1.25 }} />
              <ListItemText
                primary={<Typography sx={{ fontWeight: 800, color: TEXT }} noWrap>{row.name || row.email || "Contact"}</Typography>}
                secondary={`${row.email || "No email"} · ${row.stage || "No stage"} · ${formatDateTime(row.dateAdded)}`}
              />
            </ListItemButton>
          ))}
        </Stack>
      ) : (
        <EmptyCopy>No native Mautic contacts are available yet.</EmptyCopy>
      )}
    </Widget>
  );
}

function QuickActions() {
  const navigate = useNavigate();
  const actions = [
    { label: "Create Campaign", icon: <CampaignRoundedIcon />, path: "/admin/newsletter/campaigns" },
    { label: "Create Template", icon: <ViewModuleRoundedIcon />, path: "/admin/newsletter/templates" },
    { label: "Add Contact", icon: <ContactMailRoundedIcon />, path: "/admin/newsletter/contacts" },
    { label: "Create Segment", icon: <SegmentRoundedIcon />, path: "/admin/newsletter/segments" },
  ];
  return (
    <Widget
      title="Quick Actions"
      minHeight={120}
      compact
      action={
        <Button size="small" startIcon={<AnalyticsRoundedIcon />} onClick={() => navigate("/admin/newsletter/analytics")} sx={{ textTransform: "none" }}>
          View Analytics
        </Button>
      }
    >
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.25 }}>
        {actions.map((action) => (
          <Button
            key={action.label}
            variant="outlined"
            startIcon={action.icon}
            onClick={() => navigate(action.path)}
            sx={{ justifyContent: "flex-start", textTransform: "none", borderColor: CARD_BORDER, color: TEXT, py: 1, minWidth: { xs: "100%", sm: 190 } }}
          >
            {action.label}
          </Button>
        ))}
      </Box>
    </Widget>
  );
}

export default function AdminNewsletterDashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [range, setRange] = useState(() => rangeForDays(30));

  const loadDashboard = async (nextRange = range) => {
    setLoading(true);
    setError("");
    try {
      setDashboard(await getNewsletterDashboard(nextRange));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const applyPreset = (days) => {
    const nextRange = rangeForDays(days);
    setRange(nextRange);
    loadDashboard(nextRange);
  };

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={2}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 850, color: TEXT }}>Marketing Dashboard</Typography>
          <Typography color="text.secondary">Operational overview of your Mautic-powered marketing workspace.</Typography>
        </Box>
        <Button startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <RefreshRoundedIcon />} onClick={() => loadDashboard(range)} disabled={loading} sx={{ textTransform: "none", alignSelf: "flex-start" }}>
          Refresh
        </Button>
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Paper variant="outlined" sx={{ px: 1.5, py: 1.25, borderRadius: 2, borderColor: CARD_BORDER, bgcolor: "#fff" }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.25} alignItems={{ xs: "stretch", md: "center" }}>
          <TextField
            label="From"
            type="date"
            size="small"
            value={range.from}
            onChange={(event) => setRange((state) => ({ ...state, from: event.target.value }))}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="To"
            type="date"
            size="small"
            value={range.to}
            onChange={(event) => setRange((state) => ({ ...state, to: event.target.value }))}
            InputLabelProps={{ shrink: true }}
          />
          <Button variant="contained" onClick={() => loadDashboard(range)} disabled={loading} sx={{ textTransform: "none" }}>
            Apply
          </Button>
          <Stack direction="row" spacing={1} sx={{ ml: { md: 0.5 }, flexWrap: "wrap", rowGap: 1 }}>
            {[7, 30, 90].map((days) => (
              <Button key={days} size="small" variant="outlined" onClick={() => applyPreset(days)} disabled={loading} sx={{ textTransform: "none", borderColor: CARD_BORDER }}>
                {days} days
              </Button>
            ))}
          </Stack>
        </Stack>
      </Paper>

      <Stack spacing={2.5}>
        <ContactsCreatedChart section={dashboard?.contacts_created} loading={loading} />

        <Box sx={TWO_COLUMN_GRID}>
          <RecentActivity section={dashboard?.recent_activity} loading={loading} />
          <UpcomingEmails section={dashboard?.upcoming_emails} loading={loading} />
        </Box>

        <Box sx={TWO_COLUMN_GRID}>
          <RecentContacts section={dashboard?.recent_contacts} loading={loading} />
          <RecentCampaigns section={dashboard?.recent_campaigns} loading={loading} />
        </Box>

        <AttentionRequired section={dashboard?.attention} loading={loading} />
        <QuickActions />
      </Stack>
    </Stack>
  );
}
