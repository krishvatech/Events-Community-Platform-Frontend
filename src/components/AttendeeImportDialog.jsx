import React, { useEffect, useRef, useState } from "react";
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
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";
import { apiClient } from "../utils/api";
import {
  buildReportCsv,
  describeRow,
  emailStatus,
  importableTracks,
  rowNotes,
} from "../utils/attendeeImport";

// Each authenticated request also queues a Saleor user sync (cognito_auth), so poll gently.
const POLL_MS = 3000;

const errorDetail = (err, fallback) =>
  err?.response?.data?.detail || err?.message || fallback;

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function RowsTable({ rows, showEmails }) {
  return (
    <Box sx={{ overflowX: "auto", border: "1px solid", borderColor: "divider", borderRadius: 2, maxHeight: 360 }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell>Row</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Result</TableCell>
            <TableCell>Notes</TableCell>
            {showEmails && <TableCell>Emails</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => {
            const { label, color } = describeRow(row);
            return (
              <TableRow key={row.row}>
                <TableCell>{row.row}</TableCell>
                <TableCell sx={{ minWidth: 200, overflowWrap: "anywhere" }}>{row.email}</TableCell>
                <TableCell sx={{ minWidth: 110 }}>{`${row.first_name || ""} ${row.last_name || ""}`.trim()}</TableCell>
                <TableCell>{row.type_label}</TableCell>
                <TableCell>
                  <Chip size="small" label={label} color={color} variant={color === "default" ? "outlined" : "filled"} />
                </TableCell>
                <TableCell sx={{ color: "text.secondary", minWidth: 160 }}>{rowNotes(row)}</TableCell>
                {showEmails && <TableCell sx={{ color: "text.secondary", minWidth: 160 }}>{emailStatus(row)}</TableCell>}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Box>
  );
}

export default function AttendeeImportDialog({ open, onClose, event, onImported }) {
  const isApplyEvent = event?.registration_type === "apply";
  const [step, setStep] = useState("upload"); // upload | preview | running | done
  const [file, setFile] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [trackId, setTrackId] = useState("");
  const [preview, setPreview] = useState(null);
  const [job, setJob] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef(null);
  // Bumped on close/unmount so a running poll loop stops.
  const pollToken = useRef(0);

  useEffect(() => {
    if (!open) return undefined;
    pollToken.current += 1;
    setStep("upload");
    setFile(null);
    setPreview(null);
    setJob(null);
    setError("");
    setTrackId("");
    return () => {
      pollToken.current += 1;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !isApplyEvent || !event?.id) return;
    let active = true;
    setTracksLoading(true);
    apiClient
      .get(`/events/${event.id}/application-tracks/`)
      .then(({ data }) => {
        if (!active) return;
        const list = importableTracks(Array.isArray(data) ? data : data?.results || []);
        setTracks(list);
        if (list.length === 1) setTrackId(String(list[0].id));
      })
      .catch(() => active && setError("Could not load application tracks."))
      .finally(() => active && setTracksLoading(false));
    return () => {
      active = false;
    };
  }, [open, isApplyEvent, event?.id]);

  const selectedTrack = tracks.find((track) => String(track.id) === String(trackId));
  const actionable = preview ? preview.summary.register + preview.summary.accept_application : 0;

  const downloadTemplate = async () => {
    try {
      const { data } = await apiClient.get(`/events/${event.id}/attendee-import/template/`, { responseType: "blob" });
      downloadBlob(data instanceof Blob ? data : new Blob([data], { type: "text/csv" }), "attendee-import-template.csv");
    } catch (err) {
      setError(errorDetail(err, "Could not download the template."));
    }
  };

  const runPreview = async () => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      if (isApplyEvent && trackId) form.append("track_id", trackId);
      const { data } = await apiClient.post(`/events/${event.id}/attendee-import/preview/`, form);
      setPreview(data);
      setStep("preview");
    } catch (err) {
      setError(errorDetail(err, "Could not read the file."));
    } finally {
      setBusy(false);
    }
  };

  const poll = async (jobId, token) => {
    while (token === pollToken.current) {
      try {
        const { data } = await apiClient.get(`/events/${event.id}/attendee-import/status/${jobId}/`);
        if (token !== pollToken.current) return;
        setJob(data);
        if (data.status === "done") {
          setStep("done");
          onImported?.(data);
          return;
        }
        if (data.status === "failed") {
          setError(data.error || "The import failed.");
          setStep("done");
          return;
        }
      } catch (err) {
        if (token !== pollToken.current) return;
        setError(errorDetail(err, "Lost track of the import. Refresh the members list to see its progress."));
        setStep("done");
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    }
  };

  const runImport = async () => {
    setBusy(true);
    setError("");
    try {
      const { data } = await apiClient.post(`/events/${event.id}/attendee-import/apply/`, { plan_id: preview.plan_id });
      setStep("running");
      setJob({ status: data.status, processed: 0, total: preview.summary.total, results: [] });
      poll(data.job_id, pollToken.current);
    } catch (err) {
      setError(errorDetail(err, "Could not start the import."));
    } finally {
      setBusy(false);
    }
  };

  const downloadReport = () => {
    const csv = buildReportCsv(job?.results || []);
    downloadBlob(new Blob([csv], { type: "text/csv" }), `attendee-import-report-${event.id}.csv`);
  };

  const close = () => {
    if (step === "running") return;
    onClose?.();
  };

  const summary = preview?.summary;
  const progress = job?.total ? Math.round((job.processed / job.total) * 100) : 0;

  return (
    <Dialog open={open} onClose={close} maxWidth="md" fullWidth>
      <DialogTitle>Import Attendees</DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {step === "upload" && (
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Upload a CSV or Excel file with <b>email</b>, <b>first_name</b>, <b>last_name</b> and <b>type</b>{" "}
              (Attendee, Sponsor or Paid Attendee). <b>job_title</b>, <b>company</b>, <b>country</b> and{" "}
              <b>payment_reference</b> are optional. Missing accounts are created and emailed login details;
              everyone registered gets the registration confirmation email.
            </Typography>
            <Box>
              <Button size="small" startIcon={<FileDownloadRoundedIcon />} onClick={downloadTemplate} sx={{ textTransform: "none" }}>
                Download template
              </Button>
            </Box>

            {isApplyEvent && (
              <Box>
                <FormControl fullWidth size="small" disabled={tracksLoading}>
                  <InputLabel id="attendee-import-track">Application track</InputLabel>
                  <Select
                    labelId="attendee-import-track"
                    label="Application track"
                    value={trackId}
                    onChange={(e) => setTrackId(e.target.value)}
                  >
                    {tracks.map((track) => (
                      <MenuItem key={track.id} value={String(track.id)}>
                        {track.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>
                  Each person gets an accepted application on this track
                  {selectedTrack?.role_mappings_on_acceptance?.length
                    ? `, with roles: ${selectedTrack.role_mappings_on_acceptance.join(", ")}.`
                    : "."}
                </Typography>
              </Box>
            )}

            <Box>
              <input
                ref={fileInput}
                type="file"
                accept=".csv,.xlsx"
                aria-label="Attendee file"
                style={{ display: "none" }}
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <Button
                variant="outlined"
                startIcon={<UploadFileRoundedIcon />}
                onClick={() => fileInput.current?.click()}
                sx={{ textTransform: "none" }}
              >
                {file ? "Change file" : "Choose file"}
              </Button>
              {file && (
                <Typography variant="body2" sx={{ mt: 1, wordBreak: "break-all" }}>
                  {file.name}
                </Typography>
              )}
            </Box>
          </Stack>
        )}

        {step === "preview" && summary && (
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Nothing has been saved yet. Review what will happen to each row, then confirm.
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip label={`${summary.total} rows`} />
              <Chip color="success" label={`${actionable} to register`} />
              <Chip label={`${summary.create_account} new account${summary.create_account === 1 ? "" : "s"}`} variant="outlined" />
              <Chip label={`${summary.skip} skipped`} variant="outlined" />
              <Chip color={summary.error ? "error" : "default"} label={`${summary.error} errors`} variant="outlined" />
            </Stack>
            {preview.event?.track && (
              <Alert severity="info">
                Track <b>{preview.event.track.label}</b> gives these roles: {preview.event.track.roles.join(", ") || "none"}.
              </Alert>
            )}
            {preview.capacity_warning && (
              <Alert severity="warning">
                This import takes the event to {preview.capacity_warning.after_import} registrations, over its limit of{" "}
                {preview.capacity_warning.max_participants}.
              </Alert>
            )}
            <RowsTable rows={preview.rows} />
          </Stack>
        )}

        {step === "running" && (
          <Stack spacing={1.5} sx={{ py: 2 }}>
            <Typography variant="body2">
              Importing… {job?.processed || 0} of {job?.total || 0}
            </Typography>
            <LinearProgress variant="determinate" value={progress} />
            <Typography variant="caption" color="text.secondary">
              Keep this window open until the import finishes.
            </Typography>
          </Stack>
        )}

        {step === "done" && job?.summary && (
          <Stack spacing={2}>
            <Alert severity={job.summary.errors ? "warning" : "success"}>
              Registered {job.summary.registered} · New accounts {job.summary.accounts_created} · Skipped{" "}
              {job.summary.skipped} · Errors {job.summary.errors}
              {job.summary.emails_failed ? ` · Emails failed ${job.summary.emails_failed}` : ""}
            </Alert>
            <RowsTable rows={job.results} showEmails />
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        {step === "upload" && (
          <>
            <Button onClick={close} sx={{ textTransform: "none" }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={runPreview}
              disabled={!file || busy || (isApplyEvent && !trackId)}
              startIcon={busy ? <CircularProgress size={14} /> : null}
              sx={{ textTransform: "none" }}
            >
              Preview
            </Button>
          </>
        )}
        {step === "preview" && (
          <>
            <Button onClick={() => setStep("upload")} disabled={busy} sx={{ textTransform: "none" }}>
              Back
            </Button>
            <Button
              variant="contained"
              onClick={runImport}
              disabled={busy || actionable === 0}
              startIcon={busy ? <CircularProgress size={14} /> : null}
              sx={{ textTransform: "none" }}
            >
              {`Import ${actionable} ${actionable === 1 ? "person" : "people"}`}
            </Button>
          </>
        )}
        {step === "done" && (
          <>
            {job?.results?.length > 0 && (
              <Button startIcon={<FileDownloadRoundedIcon />} onClick={downloadReport} sx={{ textTransform: "none" }}>
                Download report
              </Button>
            )}
            <Button variant="contained" onClick={close} sx={{ textTransform: "none" }}>
              Close
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
