// Contact export (CSV or Excel). Exports either the ticked contacts or every
// contact matching the list's current search and stage filter. The backend
// builds the file in the background: starting an export closes this dialog,
// and the Marketing Hub bell announces when the file is ready. The dialog also
// lists the admin's own exports from the last 24 hours.

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
  FormControl,
  FormControlLabel,
  FormLabel,
  IconButton,
  Radio,
  RadioGroup,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";

import {
  deleteNewsletterContactExport,
  downloadNewsletterContactExport,
  listNewsletterContactExports,
  startNewsletterContactExport,
} from "../../services/newsletterService";
import { notifyMarketingWorkStarted } from "./MarketingNotificationsBell.jsx";
import { saveBlob } from "./saveBlob";

export const RECENT_POLL_MS = 3000;

const errorText = (err, fallback) => err?.response?.data?.detail || fallback;
const inProgress = (job) => job?.status === "queued" || job?.status === "running";

const formatTime = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleString(undefined, { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" })
    : "";
};

/** What an export holds, in words. */
export function describeExport(job) {
  if (!job) return "";
  if (job.scope === "selected") return `${job.filters?.selected ?? 0} selected contact${job.filters?.selected === 1 ? "" : "s"}`;
  const parts = [];
  if (job.filters?.search) parts.push(`search "${job.filters.search}"`);
  if (job.filters?.stage_id) parts.push(job.filters.stage_id === "none" ? "no stage" : `stage #${job.filters.stage_id}`);
  return parts.length ? `Contacts matching ${parts.join(", ")}` : "All contacts";
}

/** The request body for the chosen scope. */
export function exportPayload({ scope, format, selectedIds, search, stageFilter }) {
  if (scope === "selected") return { format, contact_ids: selectedIds };
  return { format, ...(search ? { search } : {}), ...(stageFilter ? { stage_id: stageFilter } : {}) };
}

function recentStatus(item) {
  if (item.status === "done") return `${item.rows} rows · ${formatTime(item.created_at)}`;
  if (item.status === "failed") return `Failed: ${item.error || "try again"} · ${formatTime(item.created_at)}`;
  return item.total
    ? `In progress: ${item.processed} of ${item.total} · ${formatTime(item.created_at)}`
    : `In progress · ${formatTime(item.created_at)}`;
}

export default function ContactExportDialog({
  open, onClose, onStarted, selectedIds = [], search = "", stageFilter = "", stageLabel = "", count = 0,
}) {
  const [scope, setScope] = useState("filter");
  const [format, setFormat] = useState("csv");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [recent, setRecent] = useState([]);
  const [busyId, setBusyId] = useState("");
  const timer = useRef(null);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      window.clearTimeout(timer.current);
    };
  }, []);

  const loadRecent = useCallback(async () => {
    window.clearTimeout(timer.current);
    try {
      const data = await listNewsletterContactExports();
      if (!mounted.current) return;
      const results = Array.isArray(data?.results) ? data.results : [];
      setRecent(results);
      // Keep the list current while an export is still being built.
      if (results.some(inProgress)) timer.current = window.setTimeout(loadRecent, RECENT_POLL_MS);
    } catch {
      if (mounted.current) setRecent([]);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      window.clearTimeout(timer.current);
      return;
    }
    setScope(selectedIds.length ? "selected" : "filter");
    setError("");
    loadRecent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const start = async () => {
    setStarting(true);
    setError("");
    try {
      const created = await startNewsletterContactExport(exportPayload({ scope, format, selectedIds, search, stageFilter }));
      notifyMarketingWorkStarted();
      onStarted?.(created);
    } catch (err) {
      setError(errorText(err, "The export could not be started."));
    } finally {
      setStarting(false);
    }
  };

  const download = async (item) => {
    setBusyId(item.id);
    setError("");
    try {
      saveBlob(await downloadNewsletterContactExport(item.id), item.filename);
    } catch (err) {
      setError(errorText(err, "The file could not be downloaded."));
    } finally {
      setBusyId("");
    }
  };

  const remove = async (item) => {
    setBusyId(item.id);
    setError("");
    try {
      await deleteNewsletterContactExport(item.id);
      loadRecent();
    } catch (err) {
      setError(errorText(err, "The export could not be deleted."));
    } finally {
      setBusyId("");
    }
  };

  const filterParts = [search ? `search "${search}"` : "", stageFilter ? `stage: ${stageLabel || stageFilter}` : ""].filter(Boolean);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Export contacts</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 0.5 }}>
          <FormControl>
            <FormLabel id="contact-export-scope">Contacts</FormLabel>
            <RadioGroup aria-labelledby="contact-export-scope" value={scope} onChange={(e) => setScope(e.target.value)}>
              {selectedIds.length > 0 && (
                <FormControlLabel value="selected" control={<Radio />}
                  label={`The ${selectedIds.length} ticked contact${selectedIds.length === 1 ? "" : "s"}`} />
              )}
              <FormControlLabel value="filter" control={<Radio />}
                label={filterParts.length
                  ? `All ${count.toLocaleString()} contacts matching ${filterParts.join(", ")}`
                  : `All ${count.toLocaleString()} contacts`} />
            </RadioGroup>
          </FormControl>
          <FormControl>
            <FormLabel id="contact-export-format">Format</FormLabel>
            <RadioGroup row aria-labelledby="contact-export-format" value={format} onChange={(e) => setFormat(e.target.value)}>
              <FormControlLabel value="csv" control={<Radio />} label="CSV" />
              <FormControlLabel value="xlsx" control={<Radio />} label="Excel (.xlsx)" />
            </RadioGroup>
          </FormControl>
          <Alert severity="info" variant="outlined">
            The export runs in the background: you can keep working, and the bell at the top of the Marketing Hub tells
            you when the file is ready. It holds personal data (every contact field, tags, stage, Do Not Contact status
            and subscription lists), is kept encrypted for 24 hours, only you can download it, and downloads are logged.
          </Alert>
          {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}

          {recent.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>Your exports (last 24 hours)</Typography>
              <Stack spacing={0.5} component="ul" sx={{ listStyle: "none", m: 0, p: 0 }} aria-label="Your exports">
                {recent.map((item) => (
                  <Stack key={item.id} component="li" direction="row" alignItems="center" spacing={1} data-export-id={item.id}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" noWrap>{`${describeExport(item)} · ${String(item.format).toUpperCase()}`}</Typography>
                      <Typography variant="caption" color={item.status === "failed" ? "error" : "text.secondary"}>{recentStatus(item)}</Typography>
                    </Box>
                    {inProgress(item) && <CircularProgress size={16} aria-label="Export in progress" />}
                    {item.status === "done" && (
                      <Tooltip title="Download">
                        <span>
                          <IconButton size="small" aria-label={`Download ${item.filename}`} onClick={() => download(item)} disabled={busyId === item.id}>
                            <DownloadRoundedIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                    <Tooltip title="Delete now">
                      <span>
                        <IconButton size="small" aria-label={`Delete export from ${formatTime(item.created_at)}`} onClick={() => remove(item)}
                          disabled={busyId === item.id || inProgress(item)}>
                          <DeleteOutlineRoundedIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Stack>
                ))}
              </Stack>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" onClick={start} disabled={starting || (scope === "filter" && count === 0)}
          startIcon={starting ? <CircularProgress size={16} color="inherit" /> : <DownloadRoundedIcon />}>
          Start Export
        </Button>
      </DialogActions>
    </Dialog>
  );
}
