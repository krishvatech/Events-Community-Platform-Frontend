import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
  Paper,
  Skeleton,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";

import {
  getNewsletterAnalyticsContacts,
  getNewsletterAnalyticsOverview,
  listNewsletterAnalyticsCampaigns,
  listNewsletterAnalyticsEmails,
  listNewsletterAnalyticsSegments,
} from "../services/newsletterService";

const pageSize = 25;

const todayIso = () => new Date().toISOString().slice(0, 10);
const daysAgoIso = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
};

const initialRange = { from: daysAgoIso(30), to: todayIso() };

const getErrorMessage = (err, fallback = "Could not load Mautic analytics.") => {
  const data = err?.response?.data;
  if (!data) return err?.message || fallback;
  if (typeof data === "string") return data;
  return data.detail || data.error || fallback;
};

const formatNumber = (value) => {
  if (value === null || value === undefined || value === "") return "N/A";
  const number = Number(value);
  if (!Number.isFinite(number)) return "N/A";
  return new Intl.NumberFormat().format(number);
};

const formatRate = (value) => {
  if (value === null || value === undefined || value === "") return "N/A";
  const number = Number(value);
  if (!Number.isFinite(number)) return "N/A";
  return `${Math.round(number * 100)}%`;
};

const formatDateTime = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function MetricCard({ metric, loading }) {
  return (
    <Paper variant="outlined" sx={{ p: 2.25, borderRadius: 2, borderColor: "#E7ECEF", minHeight: 128 }}>
      <Stack spacing={0.75}>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
          <Typography variant="body2" color="text.secondary">{metric?.label}</Typography>
          {metric?.scope ? <Chip size="small" label={metric.scope === "date_range" ? "Date range" : metric.scope} variant="outlined" /> : null}
        </Stack>
        {loading ? (
          <Skeleton width="70%" height={36} />
        ) : (
          <Typography variant="h5" sx={{ color: "#1B2A4A", fontWeight: 850 }}>
            {metric?.available === false ? "Not available" : formatNumber(metric?.value)}
          </Typography>
        )}
        {metric?.note ? <Typography variant="caption" color="text.secondary">{metric.note}</Typography> : null}
      </Stack>
    </Paper>
  );
}

function DateRangeBar({ draftRange, setDraftRange, applyRange, refresh, loading }) {
  const setPreset = (days) => setDraftRange({ from: daysAgoIso(days), to: todayIso() });
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: "#E7ECEF" }}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ xs: "stretch", md: "center" }}>
        <TextField
          label="From"
          type="date"
          size="small"
          value={draftRange.from}
          onChange={(event) => setDraftRange((current) => ({ ...current, from: event.target.value }))}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="To"
          type="date"
          size="small"
          value={draftRange.to}
          onChange={(event) => setDraftRange((current) => ({ ...current, to: event.target.value }))}
          InputLabelProps={{ shrink: true }}
        />
        <Button variant="contained" onClick={applyRange} disabled={loading} sx={{ textTransform: "none" }}>Apply</Button>
        <Button variant="outlined" onClick={() => setPreset(7)} disabled={loading} sx={{ textTransform: "none" }}>7 days</Button>
        <Button variant="outlined" onClick={() => setPreset(30)} disabled={loading} sx={{ textTransform: "none" }}>30 days</Button>
        <Button variant="outlined" onClick={() => setPreset(90)} disabled={loading} sx={{ textTransform: "none" }}>90 days</Button>
        <Box sx={{ flexGrow: 1 }} />
        <Button startIcon={<RefreshRoundedIcon />} onClick={refresh} disabled={loading} sx={{ textTransform: "none" }}>Refresh</Button>
      </Stack>
    </Paper>
  );
}

function DataTable({ columns, rows, loading, empty }) {
  if (loading) {
    return <Stack spacing={1}>{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} height={48} />)}</Stack>;
  }
  return (
    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, borderColor: "#E7ECEF" }}>
      <Table>
        <TableHead>
          <TableRow sx={{ bgcolor: "#F6F8FA" }}>
            {columns.map((column) => <TableCell key={column.key}>{column.label}</TableCell>)}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length ? rows.map((row) => (
            <TableRow hover key={row.id}>
              {columns.map((column) => <TableCell key={column.key}>{column.render ? column.render(row) : row[column.key]}</TableCell>)}
            </TableRow>
          )) : (
            <TableRow>
              <TableCell colSpan={columns.length} align="center" sx={{ py: 5 }}>
                <Typography color="text.secondary">{empty}</Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default function AdminNewsletterAnalyticsPage() {
  const [tab, setTab] = useState("overview");
  const [range, setRange] = useState(initialRange);
  const [draftRange, setDraftRange] = useState(initialRange);
  const [state, setState] = useState({ loading: true, error: "", data: null });
  const [page, setPage] = useState(1);

  const params = useMemo(() => ({ from: range.from, to: range.to, page, page_size: pageSize }), [range, page]);

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const loader = {
        overview: getNewsletterAnalyticsOverview,
        campaigns: listNewsletterAnalyticsCampaigns,
        emails: listNewsletterAnalyticsEmails,
        contacts: getNewsletterAnalyticsContacts,
        segments: listNewsletterAnalyticsSegments,
      }[tab];
      const data = await loader(params);
      setState({ loading: false, error: "", data });
    } catch (err) {
      setState({ loading: false, error: getErrorMessage(err), data: null });
    }
  }, [params, tab]);

  useEffect(() => {
    load();
  }, [load]);

  const switchTab = (_, value) => {
    setTab(value);
    setPage(1);
  };

  const metrics = Array.isArray(state.data?.metrics) ? state.data.metrics : [];
  const rows = Array.isArray(state.data?.results) ? state.data.results : [];
  const numPages = Math.max(1, Number(state.data?.num_pages || 1));

  const campaignColumns = [
    { key: "name", label: "Campaign", render: (row) => <Box><Typography sx={{ fontWeight: 800 }}>{row.name || `Campaign ${row.id}`}</Typography><Typography variant="caption" color="text.secondary">Mautic ID {row.id}</Typography></Box> },
    { key: "status", label: "Status", render: (row) => <Chip size="small" label={row.status} color={row.isPublished ? "success" : "default"} variant={row.isPublished ? "filled" : "outlined"} /> },
    { key: "contactCount", label: "Contacts", render: (row) => formatNumber(row.contactCount) },
    { key: "eventCount", label: "Events", render: (row) => formatNumber(row.eventCount) },
    { key: "dateModified", label: "Last Modified", render: (row) => formatDateTime(row.dateModified || row.dateAdded) },
  ];

  const emailColumns = [
    { key: "name", label: "Email", render: (row) => <Box><Typography sx={{ fontWeight: 800 }}>{row.name || `Email ${row.id}`}</Typography><Typography variant="caption" color="text.secondary">{row.subject || `Mautic ID ${row.id}`}</Typography></Box> },
    { key: "status", label: "Status", render: (row) => <Chip size="small" label={row.status} color={row.isPublished ? "success" : "default"} variant={row.isPublished ? "filled" : "outlined"} /> },
    { key: "sent", label: "Sent", render: (row) => formatNumber(row.sent) },
    { key: "opened", label: "Opened", render: (row) => formatNumber(row.opened) },
    { key: "clicked", label: "Clicked", render: (row) => formatNumber(row.clicked) },
    { key: "bounced", label: "Bounced", render: (row) => formatNumber(row.bounced) },
    { key: "unsubscribed", label: "Unsubscribed", render: (row) => formatNumber(row.unsubscribed) },
    { key: "openRate", label: "Open Rate", render: (row) => formatRate(row.openRate) },
    { key: "clickRate", label: "Click Rate", render: (row) => formatRate(row.clickRate) },
    { key: "lastActivity", label: "Last Activity", render: (row) => formatDateTime(row.lastActivity) },
  ];

  const segmentColumns = [
    { key: "name", label: "Segment", render: (row) => <Box><Typography sx={{ fontWeight: 800 }}>{row.name || `Segment ${row.id}`}</Typography><Typography variant="caption" color="text.secondary">Mautic ID {row.id}</Typography></Box> },
    { key: "segmentType", label: "Type", render: (row) => row.segmentType },
    { key: "isPublished", label: "Published", render: (row) => row.isPublished ? "Yes" : "No" },
    { key: "totalContacts", label: "Total Contacts", render: (row) => formatNumber(row.totalContacts) },
    { key: "activeContacts", label: "Active Contacts", render: (row) => formatNumber(row.activeContacts) },
  ];

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 850, color: "#1B2A4A" }}>Analytics</Typography>
        <Typography color="text.secondary">Mautic-backed marketing reporting. ECP newsletter consent is kept separate.</Typography>
      </Box>

      <DateRangeBar
        draftRange={draftRange}
        setDraftRange={setDraftRange}
        applyRange={() => {
          setRange(draftRange);
          setPage(1);
        }}
        refresh={load}
        loading={state.loading}
      />

      <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: "#E7ECEF", overflow: "hidden" }}>
        <Tabs value={tab} onChange={switchTab} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile sx={{ px: 2, "& .MuiTab-root": { textTransform: "none", fontWeight: 800 }, "& .Mui-selected": { color: "#0f766e !important" }, "& .MuiTabs-indicator": { backgroundColor: "#0f766e" } }}>
          <Tab label="Overview" value="overview" />
          <Tab label="Campaigns" value="campaigns" />
          <Tab label="Emails" value="emails" />
          <Tab label="Contacts" value="contacts" />
          <Tab label="Segments" value="segments" />
        </Tabs>
      </Paper>

      {state.error ? <Alert severity="error" action={<Button color="inherit" size="small" onClick={load}>Retry</Button>}>{state.error}</Alert> : null}

      {tab === "overview" ? (
        <Stack spacing={2}>
          <Grid container spacing={2}>
            {(state.loading ? Array.from({ length: 6 }).map((_, index) => ({ key: index, label: "" })) : metrics).map((metric) => (
              <Grid item xs={12} sm={6} md={3} key={metric.key}>
                <MetricCard metric={metric} loading={state.loading} />
              </Grid>
            ))}
          </Grid>
          {state.data?.notes?.map((note) => <Alert key={note} severity="info" variant="outlined">{note}</Alert>)}
        </Stack>
      ) : null}

      {tab === "campaigns" ? <DataTable columns={campaignColumns} rows={rows} loading={state.loading} empty="No native Mautic campaigns found." /> : null}
      {tab === "emails" ? <DataTable columns={emailColumns} rows={rows} loading={state.loading} empty="No native Mautic emails found." /> : null}
      {tab === "segments" ? <DataTable columns={segmentColumns} rows={rows} loading={state.loading} empty="No native Mautic segments found." /> : null}

      {tab === "contacts" ? (
        <Stack spacing={2}>
          <Grid container spacing={2}>
            {(state.loading ? Array.from({ length: 3 }).map((_, index) => ({ key: index, label: "" })) : metrics).map((metric) => (
              <Grid item xs={12} sm={6} md={4} key={metric.key}>
                <MetricCard metric={metric} loading={state.loading} />
              </Grid>
            ))}
          </Grid>
          {state.data?.stage_distribution ? (
            <Paper variant="outlined" sx={{ p: 2.25, borderRadius: 2, borderColor: "#E7ECEF" }}>
              <Typography sx={{ fontWeight: 800, color: "#1B2A4A", mb: 1.5 }}>Stage Distribution</Typography>
              <Stack spacing={1}>
                {(state.data.stage_distribution.stages || []).map((stage) => (
                  <Stack key={stage.id} direction="row" justifyContent="space-between">
                    <Typography>{stage.name || `Stage ${stage.id}`}</Typography>
                    <Typography color="text.secondary">{formatNumber(stage.count)} · {formatRate((stage.percentage || 0) / 100)}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Paper>
          ) : null}
          {state.data?.notes?.map((note) => <Alert key={note} severity="info" variant="outlined">{note}</Alert>)}
        </Stack>
      ) : null}

      {["campaigns", "emails", "segments"].includes(tab) ? (
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" color="text.secondary">Page {page} of {numPages}</Typography>
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="outlined" disabled={state.loading || page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</Button>
            <Button size="small" variant="outlined" disabled={state.loading || page >= numPages} onClick={() => setPage((current) => current + 1)}>Next</Button>
          </Stack>
        </Stack>
      ) : null}
    </Stack>
  );
}
