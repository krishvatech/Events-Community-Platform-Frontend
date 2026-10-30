import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Skeleton,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import ScheduleSendRoundedIcon from "@mui/icons-material/ScheduleSendRounded";
import { Link as RouterLink, useLocation, useNavigate, useParams } from "react-router-dom";

import ReportGraphs from "../components/marketing/ReportGraphs.jsx";
import { saveBlob } from "../components/marketing/saveBlob";
import {
  deleteNewsletterReportExport,
  downloadNewsletterReportExport,
  getNewsletterReport,
  getNewsletterReportData,
  getNewsletterReportSource,
  listNewsletterReportExports,
  startNewsletterReportExport,
} from "../services/newsletterService";
import {
  CARD_BORDER,
  LIST_CONDITIONS,
  NAVY,
  NO_VALUE_CONDITIONS,
  RANGE_PRESETS,
  REPORTS_PATH,
  ReportDeleteDialog,
  defaultRange,
  getErrorMessage,
  isValidReportId,
  presetRange,
  reportEditPath,
  scheduleSummary,
} from "./newsletterReportShared.jsx";

const ROWS_PER_PAGE = 50;
const EXPORT_POLL_MS = 3000;
const truthy = (value) => value === true || value === 1 || value === "1";
const inProgress = (job) => job?.status === "queued" || job?.status === "running";

function ExportDialog({ open, onClose, reportId, range, dynamicFilters }) {
  const [format, setFormat] = useState("csv");
  const [jobs, setJobs] = useState([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const timer = useRef(null);

  const load = useCallback(async () => {
    try {
      const response = await listNewsletterReportExports(reportId);
      setJobs(Array.isArray(response?.results) ? response.results : []);
    } catch (err) {
      setError(getErrorMessage(err, "Recent exports could not be loaded."));
    }
  }, [reportId]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  // Poll while an export is still being built.
  useEffect(() => {
    clearTimeout(timer.current);
    if (open && jobs.some(inProgress)) timer.current = setTimeout(load, EXPORT_POLL_MS);
    return () => clearTimeout(timer.current);
  }, [open, jobs, load]);

  const start = async () => {
    setBusy("start");
    setError("");
    try {
      await startNewsletterReportExport(reportId, { format, ...range, dynamicFilters });
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "The export could not be started."));
    } finally {
      setBusy("");
    }
  };

  const download = async (job) => {
    setBusy(job.id);
    setError("");
    try {
      saveBlob(await downloadNewsletterReportExport(job.id), job.filename);
    } catch (err) {
      setError(getErrorMessage(err, "The file could not be downloaded."));
    } finally {
      setBusy("");
    }
  };

  const remove = async (job) => {
    setBusy(job.id);
    try {
      await deleteNewsletterReportExport(job.id);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "The export could not be deleted."));
    } finally {
      setBusy("");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Export report</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Typography color="text.secondary">
            {`Every row from ${range.dateFrom} to ${range.dateTo} (UTC), built in the background. You are notified when it is ready; files are kept for 24 hours.`}
          </Typography>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <TextField select size="small" label="Format" value={format} onChange={(event) => setFormat(event.target.value)} sx={{ minWidth: 160 }}>
              <MenuItem value="csv">CSV</MenuItem>
              <MenuItem value="xlsx">Excel (.xlsx)</MenuItem>
            </TextField>
            <Button variant="contained" startIcon={<FileDownloadRoundedIcon />} onClick={start} disabled={busy === "start"} sx={{ textTransform: "none", whiteSpace: "nowrap" }}>
              {busy === "start" ? "Starting…" : "Start Export"}
            </Button>
          </Stack>
          {error && <Alert severity="error">{error}</Alert>}
          {jobs.length > 0 && (
            <Box>
              <Typography sx={{ fontWeight: 800, color: NAVY, mb: 1 }}>Recent exports</Typography>
              <Stack spacing={1} aria-label="Recent exports" role="list">
                {jobs.map((job) => (
                  <Paper key={job.id} role="listitem" variant="outlined" sx={{ p: 1.5, borderColor: CARD_BORDER }}>
                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {`${String(job.format).toUpperCase()} · ${job.date_from} to ${job.date_to}`}
                        </Typography>
                        <Typography variant="caption" color={job.status === "failed" ? "error" : "text.secondary"}>
                          {job.status === "done" ? `${Number(job.rows || 0).toLocaleString()} rows ready`
                            : job.status === "failed" ? job.error || "The export failed."
                              : `Building… ${Number(job.processed || 0).toLocaleString()}${job.total ? ` of ${Number(job.total).toLocaleString()}` : ""} rows`}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        {inProgress(job) && <CircularProgress size={18} aria-label="Export in progress" />}
                        {job.status === "done" && (
                          <Button size="small" startIcon={<DownloadRoundedIcon />} onClick={() => download(job)} disabled={busy === job.id} sx={{ textTransform: "none" }}>
                            Download
                          </Button>
                        )}
                        {!inProgress(job) && (
                          <IconButton size="small" aria-label="Delete this export" onClick={() => remove(job)} disabled={busy === job.id}>
                            <DeleteOutlineRoundedIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Stack>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: "none" }}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

// Dates, numbers and addresses stay on one line; free text wraps within a
// readable width. The table scrolls sideways on narrow screens.
const ONE_LINE_TYPES = ["datetime", "date", "time", "int", "float", "bool", "boolean", "email", "url"];
const cellSx = (column) => (ONE_LINE_TYPES.includes(column.type)
  ? { whiteSpace: "nowrap", verticalAlign: "top" }
  : { minWidth: 160, maxWidth: 320, overflowWrap: "anywhere", verticalAlign: "top" });

function cellText(value) {
  if (value === null || value === undefined) return "";
  return String(value);
}

export default function AdminNewsletterReportViewerPage() {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [report, setReport] = useState(null);
  const [result, setResult] = useState(null);
  const [range, setRange] = useState(defaultRange);
  const [draftRange, setDraftRange] = useState(defaultRange);
  const [preset, setPreset] = useState("30");
  const [dynamicDraft, setDynamicDraft] = useState({});
  const [dynamic, setDynamic] = useState({});
  const [page, setPage] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [dataError, setDataError] = useState("");
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [snack, setSnack] = useState("");
  const [filterLabels, setFilterLabels] = useState({});

  useEffect(() => {
    const flash = location.state?.flash;
    if (!flash) return;
    setSnack(flash);
    navigate(location.pathname, { replace: true, state: {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setLoadError("");
      try {
        if (!isValidReportId(reportId)) throw Object.assign(new Error("bad id"), { notFound: true });
        const data = await getNewsletterReport(reportId);
        if (active) setReport(data);
      } catch (err) {
        if (active) setLoadError(err?.notFound || err?.response?.status === 404 ? "That report does not exist." : getErrorMessage(err, "We could not load the report."));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [reportId]);

  // Field labels for the dynamic filters (the report stores column keys).
  useEffect(() => {
    if (!report?.source || !(report.filters || []).some((filter) => truthy(filter.dynamic))) return undefined;
    let active = true;
    getNewsletterReportSource(report.source)
      .then((meta) => {
        if (active) setFilterLabels(Object.fromEntries((meta?.filters || []).map((item) => [item.key, item])));
      })
      .catch(() => {});
    return () => { active = false; };
  }, [report]);

  const loadData = useCallback(async () => {
    if (!report) return;
    setDataLoading(true);
    setDataError("");
    try {
      const params = { ...range, page: page + 1, limit: ROWS_PER_PAGE, graphs: page === 0 ? 1 : 0 };
      if (Object.keys(dynamic).length) params.dynamicFilters = JSON.stringify(dynamic);
      const data = await getNewsletterReportData(report.id, params);
      // Graphs cover the whole range, so later table pages keep the first page's graphs.
      setResult((current) => ({ ...data, graphs: page === 0 ? data.graphs : current?.graphs || [] }));
    } catch (err) {
      setDataError(getErrorMessage(err, "Mautic could not run this report."));
    } finally {
      setDataLoading(false);
    }
  }, [report, range, page, dynamic]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) return <Stack alignItems="center" sx={{ py: 8 }}><CircularProgress aria-label="Loading report" /></Stack>;
  if (loadError) {
    return (
      <Stack spacing={2}>
        <Alert severity="error">{loadError}</Alert>
        <Button component={RouterLink} to={REPORTS_PATH} startIcon={<ArrowBackRoundedIcon />} sx={{ alignSelf: "flex-start", textTransform: "none" }}>Back to Reports</Button>
      </Stack>
    );
  }

  const settings = report.settings || {};
  const dynamicFilters = (report.filters || []).filter((filter) => truthy(filter.dynamic)
    && !LIST_CONDITIONS.includes(filter.condition) && !NO_VALUE_CONDITIONS.includes(filter.condition));
  const showDynamic = truthy(settings.showDynamicFilters) && dynamicFilters.length > 0;
  const hideRange = truthy(settings.hideDateRangeFilter);
  const columns = result?.columns || [];
  const rows = result?.rows || [];
  const graphsFirst = truthy(settings.showGraphsAboveTable);
  const filterLabel = (column) => filterLabels[column]?.label || column;
  const conditionLabel = (column, condition) =>
    filterLabels[column]?.operators?.find((option) => option.value === condition)?.label || condition;

  const applyPreset = (value) => {
    if (!value) return;
    const days = RANGE_PRESETS.find((item) => item.id === value)?.days || 30;
    const next = presetRange(days);
    setPreset(value);
    setDraftRange(next);
    setRange(next);
    setPage(0);
  };
  const applyCustom = (event) => {
    event.preventDefault();
    setPreset("");
    setRange(draftRange);
    setDynamic(Object.fromEntries(Object.entries(dynamicDraft).filter(([, value]) => String(value).trim())));
    setPage(0);
  };

  const table = (
    <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: CARD_BORDER, overflow: "hidden" }}>
      {columns.length === 0 ? (
        <Typography color="text.secondary" sx={{ p: 2 }}>This report has no table columns.</Typography>
      ) : (
        <>
          <TableContainer sx={{ maxHeight: 640 }}>
            <Table size="small" stickyHeader aria-label="Report data">
              <TableHead>
                <TableRow>
                  {columns.map((column) => (
                    <TableCell key={column.alias} sx={{ fontWeight: 800, color: NAVY, bgcolor: "#F7F9FA", whiteSpace: "nowrap" }}>{column.label}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {dataLoading && !rows.length
                  ? Array.from({ length: 5 }).map((_, index) => (
                      <TableRow key={index}>{columns.map((column) => <TableCell key={column.alias}><Skeleton height={20} /></TableCell>)}</TableRow>
                    ))
                  : rows.length === 0 ? (
                    <TableRow><TableCell colSpan={columns.length}><Typography color="text.secondary">No rows for these dates and filters.</Typography></TableCell></TableRow>
                  ) : rows.map((row, index) => (
                    <TableRow key={index} hover>
                      {columns.map((column) => (
                        <TableCell key={column.alias} sx={cellSx(column)}>{cellText(row[column.alias])}</TableCell>
                      ))}
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={Number(result?.totalResults || 0)}
            page={page}
            rowsPerPage={ROWS_PER_PAGE}
            rowsPerPageOptions={[ROWS_PER_PAGE]}
            onPageChange={(_, next) => { if (!dataLoading) setPage(next); }}
          />
        </>
      )}
    </Paper>
  );
  const graphs = <ReportGraphs graphs={result?.graphs} />;

  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
        <Box sx={{ minWidth: 0 }}>
          <Button component={RouterLink} to={REPORTS_PATH} startIcon={<ArrowBackRoundedIcon />} size="small" sx={{ textTransform: "none", mb: 1 }}>Back to Reports</Button>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 850, color: NAVY, wordBreak: "break-word" }}>{report.name}</Typography>
          {report.description && <Typography color="text.secondary">{report.description}</Typography>}
          <Stack direction="row" flexWrap="wrap" sx={{ gap: 0.75, mt: 1 }}>
            <Chip size="small" label={report.sourceLabel || report.source} />
            {!report.isPublished && <Chip size="small" label="Unpublished" />}
            <Chip size="small" variant="outlined" icon={report.isScheduled ? <ScheduleSendRoundedIcon /> : undefined}
              label={report.isScheduled ? `${scheduleSummary(report)} to ${String(report.toAddress || "").split(",").length} recipient(s)` : "Not emailed"} />
          </Stack>
        </Box>
        <Stack direction="row" spacing={1} alignItems="flex-start">
          <Tooltip title="Run again">
            <span><IconButton aria-label="Run again" onClick={loadData} disabled={dataLoading}><RefreshRoundedIcon /></IconButton></span>
          </Tooltip>
          <Button variant="outlined" startIcon={<FileDownloadRoundedIcon />} onClick={() => setExportOpen(true)} disabled={!report.columns?.length}
            sx={{ textTransform: "none", whiteSpace: "nowrap" }}>
            Export
          </Button>
          <Button variant="contained" startIcon={<EditRoundedIcon />} onClick={() => navigate(reportEditPath(report.id))} sx={{ textTransform: "none", whiteSpace: "nowrap" }}>Edit</Button>
          <Tooltip title="Delete">
            <IconButton aria-label="Delete report" color="error" onClick={() => setDeleting(true)}><DeleteOutlineRoundedIcon /></IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {(!hideRange || showDynamic) && (
        <Paper component="form" onSubmit={applyCustom} variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: CARD_BORDER }}>
          <Stack spacing={2}>
            {!hideRange && (
              <Stack direction={{ xs: "column", lg: "row" }} spacing={1.5} alignItems={{ lg: "center" }}>
                <ToggleButtonGroup size="small" exclusive value={preset} onChange={(_, value) => applyPreset(value)} aria-label="Date range"
                  sx={{ flexWrap: "wrap" }}>
                  {RANGE_PRESETS.map((item) => <ToggleButton key={item.id} value={item.id} sx={{ textTransform: "none" }}>{item.label}</ToggleButton>)}
                </ToggleButtonGroup>
                <Stack direction="row" spacing={1} alignItems="center">
                  <TextField size="small" type="date" label="From" value={draftRange.dateFrom} InputLabelProps={{ shrink: true }}
                    onChange={(event) => setDraftRange((current) => ({ ...current, dateFrom: event.target.value }))} />
                  <TextField size="small" type="date" label="To" value={draftRange.dateTo} InputLabelProps={{ shrink: true }}
                    onChange={(event) => setDraftRange((current) => ({ ...current, dateTo: event.target.value }))} />
                </Stack>
                <Typography variant="caption" color="text.secondary">Dates are in UTC.</Typography>
              </Stack>
            )}
            {showDynamic && (
              <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} flexWrap="wrap">
                {dynamicFilters.map((filter) => (
                  <TextField key={filter.column} size="small" label={filterLabel(filter.column)} value={dynamicDraft[filter.column] ?? ""}
                    placeholder={String(filter.value ?? "")} helperText={`${conditionLabel(filter.column, filter.condition)}; empty keeps "${filter.value ?? ""}"`}
                    onChange={(event) => setDynamicDraft((current) => ({ ...current, [filter.column]: event.target.value }))} />
                ))}
              </Stack>
            )}
            <Box><Button type="submit" variant="outlined" disabled={dataLoading} sx={{ textTransform: "none" }}>Apply</Button></Box>
          </Stack>
        </Paper>
      )}

      {dataError && <Alert severity="error" action={<Button color="inherit" size="small" onClick={loadData}>Retry</Button>}>{dataError}</Alert>}
      {!dataError && result && (
        <Typography variant="body2" color="text.secondary" aria-live="polite">
          {`${Number(result.totalResults || 0).toLocaleString()} row${Number(result.totalResults) === 1 ? "" : "s"} · ${result.dateFrom} to ${result.dateTo}`}
          {dataLoading ? " · updating…" : ""}
        </Typography>
      )}

      {graphsFirst ? <>{graphs}{table}</> : <>{table}{graphs}</>}

      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} reportId={report.id} range={range} dynamicFilters={dynamic} />
      <ReportDeleteDialog report={report} open={deleting} onClose={() => setDeleting(false)}
        onDeleted={(_, message) => navigate(REPORTS_PATH, { state: { flash: message } })} />
      <Snackbar open={Boolean(snack)} autoHideDuration={4000} onClose={() => setSnack("")} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert severity="success" onClose={() => setSnack("")}>{snack}</Alert>
      </Snackbar>
    </Stack>
  );
}
