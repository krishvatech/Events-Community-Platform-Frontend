// Read-only list of one Form's native Mautic submissions. Submissions hold
// personal data: values are shown as text (never as HTML), nothing is cached
// by the backend, and only what identifies the contact is shown. Exports are
// built in the background, encrypted at rest and kept for 24 hours.

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Link,
  MenuItem,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";

import { notifyMarketingWorkStarted } from "../components/marketing/MarketingNotificationsBell.jsx";
import { saveBlob } from "../components/marketing/saveBlob";
import {
  deleteNewsletterFormSubmissionExport,
  downloadNewsletterFormSubmissionExport,
  listNewsletterFormSubmissionExports,
  listNewsletterFormSubmissions,
  startNewsletterFormSubmissionExport,
} from "../services/newsletterService";
import {
  CARD_BORDER,
  FORMS_PATH,
  NAVY,
  describeFormLoadError,
  formDetailsPath,
  formSubmissionPath,
  formatDateTime,
  getErrorMessage,
  isValidFormId,
} from "./newsletterFormShared.jsx";

const PAGE_SIZE = 25;
const EXPORT_POLL_MS = 3000;
const wideOnly = { display: { xs: "none", md: "table-cell" } };
const inProgress = (job) => job?.status === "queued" || job?.status === "running";

function SubmissionExportDialog({ open, onClose, formId }) {
  const [format, setFormat] = useState("csv");
  const [jobs, setJobs] = useState([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const timer = useRef(null);

  const load = useCallback(async () => {
    try {
      const response = await listNewsletterFormSubmissionExports(formId);
      setJobs(Array.isArray(response?.results) ? response.results : []);
    } catch (err) {
      setError(getErrorMessage(err, "Recent exports could not be loaded."));
    }
  }, [formId]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  // Poll while an export is still being built.
  useEffect(() => {
    clearTimeout(timer.current);
    if (open && jobs.some(inProgress)) timer.current = setTimeout(load, EXPORT_POLL_MS);
    return () => clearTimeout(timer.current);
  }, [open, jobs, load]);

  const run = async (key, work, fallback) => {
    setBusy(key);
    setError("");
    try {
      await work();
    } catch (err) {
      setError(getErrorMessage(err, fallback));
    } finally {
      setBusy("");
    }
  };

  const start = () => run("start", async () => {
    await startNewsletterFormSubmissionExport(formId, format);
    notifyMarketingWorkStarted();
    await load();
  }, "The export could not be started.");

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Export submissions</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Typography color="text.secondary">
            Every submission with each field's value, built in the background. The bell tells you when it is ready; files are kept for 24 hours. Password values are never exported.
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
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{`${String(job.format).toUpperCase()} · ${formatDateTime(job.created_at)}`}</Typography>
                        <Typography variant="caption" color={job.status === "failed" ? "error" : "text.secondary"}>
                          {job.status === "done" ? `${Number(job.rows || 0).toLocaleString()} submissions ready`
                            : job.status === "failed" ? job.error || "The export failed."
                              : `Building… ${Number(job.processed || 0).toLocaleString()}${job.total ? ` of ${Number(job.total).toLocaleString()}` : ""} submissions`}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        {inProgress(job) && <CircularProgress size={18} aria-label="Export in progress" />}
                        {job.status === "done" && (
                          <Button size="small" startIcon={<DownloadRoundedIcon />} disabled={busy === job.id} sx={{ textTransform: "none" }}
                            onClick={() => run(job.id, async () => saveBlob(await downloadNewsletterFormSubmissionExport(job.id), job.filename),
                              "The file could not be downloaded.")}>
                            Download
                          </Button>
                        )}
                        {!inProgress(job) && (
                          <IconButton size="small" aria-label="Delete this export" disabled={busy === job.id}
                            onClick={() => run(job.id, async () => {
                              await deleteNewsletterFormSubmissionExport(job.id);
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

export default function AdminNewsletterFormSubmissionsPage() {
  const { formId } = useParams();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const [reload, setReload] = useState(0);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    if (!isValidFormId(formId)) {
      setState({ loading: false, error: { title: "Invalid Form link.", detail: "Form links use a numeric Mautic Form ID.", retry: false }, data: null });
      return undefined;
    }
    let active = true;
    setState((current) => ({ ...current, loading: true, error: null }));
    listNewsletterFormSubmissions(formId, { page, page_size: PAGE_SIZE })
      .then((data) => active && setState({ loading: false, error: null, data }))
      .catch((err) => active && setState({ loading: false, error: describeFormLoadError(err), data: null }));
    return () => {
      active = false;
    };
  }, [formId, page, reload]);

  const data = state.data;
  const rows = Array.isArray(data?.results) ? data.results : [];
  const formName = data?.form?.name || `Form #${formId}`;

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Breadcrumbs aria-label="breadcrumb">
          <Link component={RouterLink} to="/admin/newsletter" underline="hover" color="inherit">Marketing Hub</Link>
          <Link component={RouterLink} to={FORMS_PATH} underline="hover" color="inherit">Forms</Link>
          {isValidFormId(formId) && (
            <Link component={RouterLink} to={formDetailsPath(formId)} underline="hover" color="inherit" sx={{ wordBreak: "break-word" }}>{formName}</Link>
          )}
          <Typography color="text.primary">Submissions</Typography>
        </Breadcrumbs>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ md: "center" }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 850, color: NAVY, wordBreak: "break-word" }}>Submissions — {formName}</Typography>
            <Typography color="text.secondary">Newest first. Submissions contain personal data and are stored in Mautic; exports are kept for 24 hours.</Typography>
          </Box>
          <Stack direction="row" spacing={1} sx={{ alignSelf: { xs: "flex-start", md: "center" } }}>
            {isValidFormId(formId) && data?.count > 0 && (
              <Button variant="outlined" startIcon={<FileDownloadRoundedIcon />} onClick={() => setExportOpen(true)} sx={{ textTransform: "none" }}>
                Export
              </Button>
            )}
            <Button startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate(isValidFormId(formId) ? formDetailsPath(formId) : FORMS_PATH)} sx={{ textTransform: "none" }}>
              Back to Form
            </Button>
          </Stack>
        </Stack>
      </Stack>

      {state.error ? (
        <Alert severity="error" action={state.error.retry ? <Button color="inherit" size="small" onClick={() => setReload((n) => n + 1)}>Retry</Button> : null}>
          <strong>{state.error.title}</strong> {state.error.detail}
        </Alert>
      ) : !state.loading && rows.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, borderColor: CARD_BORDER }}>
          <Typography sx={{ fontWeight: 850, color: NAVY }}>No submissions yet.</Typography>
          <Typography color="text.secondary">Submissions appear here once visitors submit the published Form.</Typography>
        </Paper>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: CARD_BORDER, overflow: "hidden" }}>
          <TableContainer>
            <Table aria-label="Form submissions">
              <TableHead>
                <TableRow sx={{ "& th": { fontWeight: 800, color: NAVY, bgcolor: "#F7F9FA", whiteSpace: "nowrap" } }}>
                  <TableCell>Submitted</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell sx={wideOnly}>Values</TableCell>
                  <TableCell align="right">ID</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {state.loading
                  ? Array.from({ length: 5 }).map((_, index) => (
                      <TableRow key={`skeleton-${index}`}>
                        {[0, 1, 2, 3].map((cell) => <TableCell key={cell} sx={cell === 2 ? wideOnly : undefined}><Skeleton height={24} /></TableCell>)}
                      </TableRow>
                    ))
                  : rows.map((row) => (
                      <TableRow key={row.id} hover data-submission-id={row.id} onClick={() => navigate(formSubmissionPath(formId, row.id))} sx={{ cursor: "pointer" }}>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>
                          <Link component={RouterLink} to={formSubmissionPath(formId, row.id)} onClick={(event) => event.stopPropagation()} underline="hover" sx={{ fontWeight: 700 }}>
                            {formatDateTime(row.dateSubmitted)}
                          </Link>
                        </TableCell>
                        <TableCell sx={{ wordBreak: "break-all" }}>{row.contact ? row.contact.email || `Contact #${row.contact.id}` : "—"}</TableCell>
                        <TableCell sx={{ ...wideOnly, maxWidth: 420 }}>
                          <Typography variant="body2" color="text.secondary" noWrap>
                            {(row.preview || []).map((item) => `${item.label}: ${item.value}`).join(" · ") || "—"}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">#{row.id}</TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </TableContainer>
          {data?.count > 0 && (
            <TablePagination component="div" count={data.count} page={Math.max(0, page - 1)} rowsPerPage={PAGE_SIZE} rowsPerPageOptions={[PAGE_SIZE]}
              onPageChange={(_, next) => !state.loading && setPage(next + 1)} />
          )}
        </Paper>
      )}
      {isValidFormId(formId) && <SubmissionExportDialog open={exportOpen} onClose={() => setExportOpen(false)} formId={formId} />}
    </Stack>
  );
}
