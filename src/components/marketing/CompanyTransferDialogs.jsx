// Company CSV import (queued on Mautic's own import, which matches companies
// by name) and company export (built in the background, kept 24 hours).

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  LinearProgress,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";

import { notifyMarketingWorkStarted } from "./MarketingNotificationsBell.jsx";
import { saveBlob } from "./saveBlob";
import {
  deleteNewsletterCompanyExport,
  downloadNewsletterCompanyExport,
  listNewsletterCompanyExports,
  listNewsletterCompanyImports,
  previewNewsletterCompanyImport,
  startNewsletterCompanyExport,
  startNewsletterCompanyImport,
} from "../../services/newsletterService";

const NAVY = "#1B2A4A";
const BORDER = "#E7ECEF";
const POLL_MS = 3000;
const errorText = (err, fallback) => err?.response?.data?.detail || err?.message || fallback;
const IMPORT_RUNNING = new Set(["queued", "in_progress", "delayed"]);

export const importStatusLabel = (item) => ({
  queued: "Queued — Mautic imports it shortly",
  in_progress: `Importing… ${item.progress_percentage ?? 0}%`,
  imported: `Done: ${item.inserted} created, ${item.updated} updated, ${item.ignored} skipped`,
  failed: `Failed${item.status_info ? `: ${item.status_info}` : ""}`,
  stopped: "Stopped",
  delayed: "Delayed — Mautic will continue it",
  manual: "Waiting to be started in Mautic",
}[item.status_name] || item.status_name);

function RecentImports({ refreshKey }) {
  const [state, setState] = useState({ loading: true, rows: [], error: "" });
  const timer = useRef(null);
  const load = useCallback(() => {
    listNewsletterCompanyImports()
      .then((data) => setState({ loading: false, rows: Array.isArray(data?.results) ? data.results : [], error: "" }))
      .catch((err) => setState({ loading: false, rows: [], error: errorText(err, "Recent imports could not be loaded.") }));
  }, []);
  useEffect(() => {
    load();
  }, [load, refreshKey]);
  useEffect(() => {
    clearTimeout(timer.current);
    if (state.rows.some((item) => IMPORT_RUNNING.has(item.status_name))) timer.current = setTimeout(load, POLL_MS);
    return () => clearTimeout(timer.current);
  }, [state.rows, load]);

  if (state.error) return <Alert severity="warning">{state.error}</Alert>;
  if (!state.rows.length) return null;
  return (
    <Box>
      <Typography sx={{ fontWeight: 800, color: NAVY, mb: 1 }}>Recent company imports</Typography>
      <Stack spacing={1} role="list" aria-label="Recent company imports">
        {state.rows.slice(0, 5).map((item) => (
          <Paper key={item.id} role="listitem" variant="outlined" sx={{ p: 1.25, borderColor: BORDER }}>
            <Typography variant="body2" sx={{ fontWeight: 700, wordBreak: "break-word" }}>
              {item.original_file || `Import #${item.id}`} · {item.rows} rows
            </Typography>
            <Typography variant="caption" color={item.status_name === "failed" ? "error" : "text.secondary"}>{importStatusLabel(item)}</Typography>
            {item.status_name === "in_progress" && <LinearProgress variant="determinate" value={Number(item.progress_percentage || 0)} sx={{ mt: 0.5 }} />}
          </Paper>
        ))}
      </Stack>
    </Box>
  );
}

export function CompanyImportDialog({ open, onClose, onQueued }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [mapping, setMapping] = useState({});
  const [mode, setMode] = useState("create_or_update");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [queued, setQueued] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setPreview(null);
    setMapping({});
    setMode("create_or_update");
    setError("");
    setQueued(null);
  }, [open]);

  const choose = async (chosen) => {
    if (!chosen) return;
    setFile(chosen);
    setBusy("preview");
    setError("");
    setQueued(null);
    try {
      const data = await previewNewsletterCompanyImport(chosen);
      setPreview(data);
      setMapping(data.mapping || {});
    } catch (err) {
      setPreview(null);
      setError(errorText(err, "The file could not be read."));
    } finally {
      setBusy("");
    }
  };

  const recheck = async (nextMapping) => {
    setMapping(nextMapping);
    if (!Object.values(nextMapping).includes("companyname")) {
      setPreview((current) => (current ? { ...current, checks: null } : current));
      return;
    }
    try {
      const data = await previewNewsletterCompanyImport(file, nextMapping);
      setPreview(data);
    } catch (err) {
      setError(errorText(err, "The mapping could not be checked."));
    }
  };

  const start = async () => {
    setBusy("start");
    setError("");
    try {
      const result = await startNewsletterCompanyImport(file, mapping, mode, preview?.attempt);
      setQueued(result);
      setRefreshKey((n) => n + 1);
      onQueued?.(result);
    } catch (err) {
      setError(errorText(err, "The import could not be queued."));
    } finally {
      setBusy("");
    }
  };

  const used = new Set(Object.values(mapping).filter(Boolean));
  const hasName = used.has("companyname");
  const checks = preview?.checks;
  return (
    <Dialog open={open} onClose={() => busy !== "start" && onClose?.()} fullWidth maxWidth="md">
      <DialogTitle>Import companies from CSV</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography color="text.secondary">
            Mautic imports the file on its own queue and matches companies by name. Up to 50,000 rows, UTF-8 CSV (comma, semicolon or tab).
          </Typography>
          <Box>
            <Button component="label" variant="outlined" startIcon={busy === "preview" ? <CircularProgress size={16} /> : <UploadFileRoundedIcon />}
              disabled={Boolean(busy)} sx={{ textTransform: "none" }}>
              {file ? `Change file (${file.name})` : "Choose CSV file"}
              <input hidden type="file" accept=".csv,text/csv" aria-label="Company CSV file" onChange={(event) => choose(event.target.files?.[0])} />
            </Button>
          </Box>
          {error && <Alert severity="error">{error}</Alert>}
          {queued && (
            <Alert severity="success">
              {queued.duplicate ? "This file was already queued; nothing new was added." : "Import queued. Mautic creates and updates the companies shortly."}
            </Alert>
          )}
          {preview && !queued && (
            <>
              <Typography sx={{ fontWeight: 800, color: NAVY }}>{preview.rows.toLocaleString()} companies in the file. Choose the company field for each column:</Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ borderColor: BORDER, maxHeight: 360 }}>
                <Table size="small" stickyHeader aria-label="Column mapping">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800 }}>Column</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>First value</TableCell>
                      <TableCell sx={{ fontWeight: 800, minWidth: 220 }}>Company field</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {preview.headers.map((header) => (
                      <TableRow key={header}>
                        <TableCell sx={{ wordBreak: "break-word" }}>{header}</TableCell>
                        <TableCell sx={{ wordBreak: "break-word", color: "text.secondary" }}>{preview.preview?.[0]?.[header] || "—"}</TableCell>
                        <TableCell>
                          <TextField select size="small" fullWidth value={mapping[header] || ""} label={`Field for ${header}`}
                            SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }}
                            onChange={(event) => recheck({ ...mapping, [header]: event.target.value })}>
                            <MenuItem value="">Do not import</MenuItem>
                            {preview.fields.map((field) => (
                              <MenuItem key={field.alias} value={field.alias} disabled={used.has(field.alias) && mapping[header] !== field.alias}>
                                {field.label}
                              </MenuItem>
                            ))}
                          </TextField>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {!hasName && <Alert severity="warning">Choose which column holds the company name: Mautic matches companies by name.</Alert>}
              {checks && (
                <Alert severity={checks.issues.length || checks.line_breaks || checks.null_literals ? "warning" : "success"}>
                  {checks.rows - checks.without_name} companies will be imported
                  {checks.without_name ? `; ${checks.without_name} rows without a name are skipped` : ""}
                  {checks.duplicate_names ? `; ${checks.duplicate_names} repeat a name and update that company` : ""}.
                  {checks.line_breaks ? ` ${checks.line_breaks} values contain line breaks; they are imported with spaces instead.` : ""}
                  {checks.null_literals ? ` ${checks.null_literals} values are the text NULL; they are imported as empty, so they never clear a field.` : ""}
                  {checks.issues.length > 0 && (
                    <Box component="ul" sx={{ m: 0, mt: 0.5, pl: 2.5 }}>
                      {checks.issues.slice(0, 8).map((issue) => <li key={`${issue.row}-${issue.column}`}>Row {issue.row}, {issue.column}: {issue.message}</li>)}
                    </Box>
                  )}
                </Alert>
              )}
              <RadioGroup value={mode} onChange={(event) => setMode(event.target.value)} aria-label="Existing companies">
                <FormControlLabel value="create_or_update" control={<Radio />} label="Existing companies (matched by name) take the file's values; empty cells change nothing" />
                <FormControlLabel value="skip_existing" control={<Radio />} label="Keep values existing companies already have; only fill their empty fields" />
              </RadioGroup>
            </>
          )}
          <RecentImports refreshKey={refreshKey} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy === "start"}>{queued ? "Close" : "Cancel"}</Button>
        {!queued && (
          <Button variant="contained" onClick={start} disabled={!preview || !hasName || Boolean(busy)}
            startIcon={busy === "start" ? <CircularProgress size={16} color="inherit" /> : null}>
            Start import
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

const exportRunning = (job) => job?.status === "queued" || job?.status === "running";

export function CompanyExportDialog({ open, onClose, search = "" }) {
  const [format, setFormat] = useState("csv");
  const [jobs, setJobs] = useState([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const timer = useRef(null);

  const load = useCallback(async () => {
    try {
      const data = await listNewsletterCompanyExports();
      setJobs(Array.isArray(data?.results) ? data.results : []);
    } catch (err) {
      setError(errorText(err, "Recent exports could not be loaded."));
    }
  }, []);
  useEffect(() => {
    if (open) load();
  }, [open, load]);
  useEffect(() => {
    clearTimeout(timer.current);
    if (open && jobs.some(exportRunning)) timer.current = setTimeout(load, POLL_MS);
    return () => clearTimeout(timer.current);
  }, [open, jobs, load]);

  const run = async (key, work, fallback) => {
    setBusy(key);
    setError("");
    try {
      await work();
    } catch (err) {
      setError(errorText(err, fallback));
    } finally {
      setBusy("");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Export companies</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Typography color="text.secondary">
            {search ? `Companies matching "${search}"` : "Every company"}, with all company fields, built in the background. The bell tells you when it is ready; files are kept for 24 hours.
          </Typography>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <TextField select size="small" label="Format" value={format} onChange={(event) => setFormat(event.target.value)} sx={{ minWidth: 160 }}>
              <MenuItem value="csv">CSV</MenuItem>
              <MenuItem value="xlsx">Excel (.xlsx)</MenuItem>
            </TextField>
            <Button variant="contained" startIcon={<FileDownloadRoundedIcon />} disabled={busy === "start"} sx={{ textTransform: "none", whiteSpace: "nowrap" }}
              onClick={() => run("start", async () => {
                await startNewsletterCompanyExport(format, search);
                notifyMarketingWorkStarted();
                await load();
              }, "The export could not be started.")}>
              {busy === "start" ? "Starting…" : "Start Export"}
            </Button>
          </Stack>
          {error && <Alert severity="error">{error}</Alert>}
          {jobs.length > 0 && (
            <Stack spacing={1} role="list" aria-label="Recent company exports">
              {jobs.map((job) => (
                <Paper key={job.id} role="listitem" variant="outlined" sx={{ p: 1.25, borderColor: BORDER }}>
                  <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{String(job.format).toUpperCase()}{job.search ? ` · "${job.search}"` : ""}</Typography>
                      <Typography variant="caption" color={job.status === "failed" ? "error" : "text.secondary"}>
                        {job.status === "done" ? `${Number(job.rows || 0).toLocaleString()} companies ready`
                          : job.status === "failed" ? job.error || "The export failed."
                            : `Building… ${Number(job.processed || 0).toLocaleString()}${job.total ? ` of ${Number(job.total).toLocaleString()}` : ""}`}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      {exportRunning(job) && <CircularProgress size={18} aria-label="Export in progress" />}
                      {job.status === "done" && (
                        <Button size="small" startIcon={<DownloadRoundedIcon />} disabled={busy === job.id} sx={{ textTransform: "none" }}
                          onClick={() => run(job.id, async () => saveBlob(await downloadNewsletterCompanyExport(job.id), job.filename), "The file could not be downloaded.")}>
                          Download
                        </Button>
                      )}
                      {!exportRunning(job) && (
                        <IconButton size="small" aria-label="Delete this export" disabled={busy === job.id}
                          onClick={() => run(job.id, async () => {
                            await deleteNewsletterCompanyExport(job.id);
                            await load();
                          }, "The export could not be deleted.")}>
                          <DeleteOutlineRoundedIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Stack>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: "none" }}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
