import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormHelperText,
  IconButton,
  LinearProgress,
  ListSubheader,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";

import {
  getContactImport,
  getContactImportFields,
  listContactImportErrors,
  listContactImports,
  previewContactImport,
  startContactImport,
  validateContactImport,
} from "../../services/newsletterService";
import {
  DEFAULT_MAX_BYTES,
  STATE_COLORS,
  STATE_LABELS,
  checkCsvFile,
  duplicateTargets,
  formatBytes,
  formatCount,
  importErrorMessage,
  isTerminalState,
  mappingPayload,
  nextPollDelay,
  readStoredImportId,
  storeImportId,
  validationKey,
} from "../../utils/contactImport";

const STEPS = ["Upload CSV", "Preview data", "Map fields", "Validate & review", "Import progress", "Results"];
const STEP = { upload: 0, preview: 1, mapping: 2, review: 3, progress: 4, results: 5 };
const DEFAULT_OPTIONS = { existing_mode: "skip_existing", tag_separator: "|" };
const ERROR_PAGE_SIZE = 25;
const cellSx = { maxWidth: 220, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };

const StatTile = ({ label, value, tone }) => (
  <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, minWidth: 0 }}>
    <Typography variant="caption" color="text.secondary" component="div">
      {label}
    </Typography>
    <Typography variant="h6" sx={{ fontWeight: 800, color: tone || "#1B2A4A" }}>
      {formatCount(value)}
    </Typography>
  </Paper>
);

const StatGrid = ({ children }) => (
  <Box
    sx={{
      display: "grid",
      gap: 1.5,
      gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))" },
    }}
  >
    {children}
  </Box>
);

function ErrorAlert({ error }) {
  if (!error) return null;
  return (
    <Alert severity="error" role="alert">
      {error.message}
      {Array.isArray(error.errors) && error.errors.length > 0 && (
        <Box component="ul" sx={{ m: 0, mt: 0.5, pl: 2.5 }}>
          {error.errors.map((item, index) => (
            <li key={`${item.code}-${index}`}>{item.message}</li>
          ))}
        </Box>
      )}
    </Alert>
  );
}

export default function ContactImportDialog({ open, onClose, onFinished }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const [step, setStep] = useState(STEP.upload);
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [targets, setTargets] = useState([]);
  const [maxBytes, setMaxBytes] = useState(DEFAULT_MAX_BYTES);
  const [fieldsError, setFieldsError] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const [mapping, setMapping] = useState({});
  const [options, setOptions] = useState(DEFAULT_OPTIONS);
  const [validation, setValidation] = useState(null);
  const [validatedFor, setValidatedFor] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [job, setJob] = useState(null);
  const [jobError, setJobError] = useState("");
  const [history, setHistory] = useState([]);
  const [rowErrors, setRowErrors] = useState(null);
  const [rowErrorsLoading, setRowErrorsLoading] = useState(false);
  const startingRef = useRef(false);
  const inputRef = useRef(null);
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;

  const headers = preview?.headers || [];
  const targetByAlias = useMemo(
    () => Object.fromEntries(targets.map((target) => [target.alias, target])),
    [targets]
  );
  const duplicates = useMemo(() => duplicateTargets(mapping), [mapping]);
  const emailMapped = Object.values(mapping).includes("email");
  const tagsMapped = Object.values(mapping).includes("tags");
  const currentKey = validationKey(file, headers, mapping, options);
  const validationCurrent = Boolean(validation && validatedFor === currentKey);

  const resetWizard = useCallback(() => {
    setStep(STEP.upload);
    setFile(null);
    setFileError("");
    setError(null);
    setPreview(null);
    setMapping({});
    setOptions(DEFAULT_OPTIONS);
    setValidation(null);
    setValidatedFor("");
    setConfirmed(false);
    setJob(null);
    setJobError("");
    setRowErrors(null);
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const data = await listContactImports({ page_size: 5 });
      setHistory(Array.isArray(data?.results) ? data.results : []);
    } catch {
      setHistory([]);
    }
  }, []);

  // Field metadata, recent imports, and resuming an import still in progress.
  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    setFieldsError("");
    getContactImportFields()
      .then((data) => {
        if (!active) return;
        setTargets(Array.isArray(data?.results) ? data.results : []);
        if (data?.limits?.max_bytes) setMaxBytes(Number(data.limits.max_bytes));
      })
      .catch((err) => {
        if (active) setFieldsError(importErrorMessage(err, "We could not load Mautic contact fields."));
      });
    loadHistory();
    const storedId = readStoredImportId();
    if (storedId) {
      getContactImport(storedId)
        .then((data) => {
          if (!active) return;
          setJob(data);
          setStep(isTerminalState(data.state) ? STEP.results : STEP.progress);
          if (isTerminalState(data.state)) storeImportId(null);
        })
        .catch(() => storeImportId(null));
    }
    return () => {
      active = false;
    };
  }, [open, loadHistory]);

  // Bounded polling while an import is queued or running. Mautic holds the
  // durable state, so closing the dialog simply stops polling.
  const jobId = job?.id;
  const jobActive = Boolean(jobId) && !isTerminalState(job?.state);
  useEffect(() => {
    if (!open || !jobActive) return undefined;
    let cancelled = false;
    let timer;
    let attempt = 0;
    let lastProcessed = -1;
    const tick = async () => {
      try {
        const next = await getContactImport(jobId);
        if (cancelled) return;
        setJob(next);
        setJobError("");
        if (isTerminalState(next.state)) {
          storeImportId(null);
          setStep(STEP.results);
          loadHistory();
          onFinishedRef.current?.();
          return;
        }
        attempt = next.processed !== lastProcessed ? 0 : attempt + 1;
        lastProcessed = next.processed;
      } catch (err) {
        if (cancelled) return;
        setJobError(importErrorMessage(err, "We could not refresh the import progress."));
        attempt += 1;
      }
      timer = setTimeout(tick, nextPollDelay(attempt));
    };
    timer = setTimeout(tick, nextPollDelay(0));
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, jobActive, jobId, loadHistory]);

  const handleClose = () => {
    if (busy === "start") return;
    resetWizard();
    onClose?.();
  };

  const acceptFile = (candidate) => {
    const problem = checkCsvFile(candidate, maxBytes);
    setFile(problem ? null : candidate);
    setFileError(problem);
    setError(null);
    setPreview(null);
    setValidation(null);
    setConfirmed(false);
  };

  const handlePreview = async () => {
    if (!file) return;
    setBusy("preview");
    setError(null);
    try {
      const data = await previewContactImport(file);
      setPreview(data);
      setMapping(data?.suggested_mapping || {});
      setStep(STEP.preview);
    } catch (err) {
      setError({ message: importErrorMessage(err, "We could not read this file."), errors: err?.response?.data?.errors });
    } finally {
      setBusy("");
    }
  };

  const updateMapping = (header, alias) => {
    setMapping((current) => ({ ...current, [header]: alias }));
    setValidation(null);
    setConfirmed(false);
  };

  const updateOption = (key, value) => {
    setOptions((current) => ({ ...current, [key]: value }));
    setValidation(null);
    setConfirmed(false);
  };

  const handleValidate = async () => {
    setBusy("validate");
    setError(null);
    try {
      const data = await validateContactImport(file, {
        mapping: mappingPayload(headers, mapping),
        options,
      });
      setValidation(data);
      setValidatedFor(currentKey);
      setConfirmed(false);
      setStep(STEP.review);
    } catch (err) {
      setError({ message: importErrorMessage(err, "Validation failed."), errors: err?.response?.data?.errors });
    } finally {
      setBusy("");
    }
  };

  const handleStart = async () => {
    // A ref, not state: a fast double-click fires twice before React re-renders.
    if (startingRef.current || !validationCurrent || !confirmed) return;
    startingRef.current = true;
    setBusy("start");
    setError(null);
    try {
      const data = await startContactImport(file, {
        mapping: mappingPayload(headers, mapping),
        options,
        validationToken: validation.validation_token,
      });
      const started = data?.import;
      setJob(started);
      if (started && !isTerminalState(started.state)) storeImportId(started.id);
      setStep(started && isTerminalState(started.state) ? STEP.results : STEP.progress);
      loadHistory();
    } catch (err) {
      const code = err?.response?.data?.code;
      if (code === "revalidation_required" || code === "validation_expired") {
        // Keep the report on screen, but it can no longer be confirmed.
        setValidatedFor("");
        setConfirmed(false);
      }
      setError({ message: importErrorMessage(err, "The import could not be started."), errors: err?.response?.data?.errors });
    } finally {
      startingRef.current = false;
      setBusy("");
    }
  };

  const openHistoryItem = (item) => {
    setError(null);
    setRowErrors(null);
    setJob(item);
    if (!isTerminalState(item.state)) storeImportId(item.id);
    setStep(isTerminalState(item.state) ? STEP.results : STEP.progress);
  };

  const loadRowErrors = async (page = 1) => {
    if (!job?.id) return;
    setRowErrorsLoading(true);
    try {
      const data = await listContactImportErrors(job.id, { page, page_size: ERROR_PAGE_SIZE });
      setRowErrors({ ...data, page });
    } catch (err) {
      setRowErrors({ count: 0, results: [], page, error: importErrorMessage(err, "We could not load row errors.") });
    } finally {
      setRowErrorsLoading(false);
    }
  };

  // ------------------------------------------------------------- steps --
  const renderUpload = () => (
    <Stack spacing={2.5}>
      <Typography color="text.secondary">
        Upload a CSV file of contacts. You will preview the data, map columns to Mautic fields and review a
        full validation report before anything is imported.
      </Typography>
      <Box
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragActive(false);
          acceptFile(event.dataTransfer?.files?.[0] || null);
        }}
        sx={{
          border: "2px dashed",
          borderColor: dragActive ? "primary.main" : "#CBD5E1",
          bgcolor: dragActive ? "rgba(25, 118, 210, 0.04)" : "#F8FAFC",
          borderRadius: 2,
          p: { xs: 2.5, sm: 4 },
          textAlign: "center",
        }}
      >
        <UploadFileRoundedIcon sx={{ fontSize: 40, color: "#64748B" }} aria-hidden="true" />
        <Typography sx={{ fontWeight: 700, mt: 1 }}>Drag a CSV file here</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          UTF-8 CSV with a header row, up to {formatBytes(maxBytes)}.
        </Typography>
        <input
          ref={inputRef}
          id="contact-import-file"
          type="file"
          accept=".csv,text/csv"
          hidden
          onChange={(event) => {
            acceptFile(event.target.files?.[0] || null);
            event.target.value = "";
          }}
        />
        <Button variant="outlined" onClick={() => inputRef.current?.click()} sx={{ textTransform: "none" }}>
          Choose CSV file
        </Button>
      </Box>
      {file && (
        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
          <Typography sx={{ fontWeight: 700, wordBreak: "break-all" }}>{file.name}</Typography>
          <Typography variant="body2" color="text.secondary">
            {formatBytes(file.size)}
          </Typography>
        </Paper>
      )}
      {fileError && <Alert severity="error">{fileError}</Alert>}
      {fieldsError && <Alert severity="warning">{fieldsError}</Alert>}
      <ErrorAlert error={error} />
      {history.length > 0 && (
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
            Your recent imports
          </Typography>
          <Stack spacing={1}>
            {history.map((item) => (
              <Paper key={item.id} variant="outlined" sx={{ p: 1.25, borderRadius: 2 }}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }} justifyContent="space-between">
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700, wordBreak: "break-all" }}>{item.file_name || `Import ${item.id}`}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.created_at ? new Date(item.created_at).toLocaleString() : ""} · {formatCount(item.created)} created
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip size="small" color={STATE_COLORS[item.state] || "default"} label={STATE_LABELS[item.state] || item.state} />
                    <Button size="small" onClick={() => openHistoryItem(item)} sx={{ textTransform: "none" }}>
                      Open
                    </Button>
                  </Stack>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </Box>
      )}
    </Stack>
  );

  const renderPreview = () => (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
        <Chip label={`${formatCount(preview.total_rows)} rows`} />
        <Chip label={`${formatCount(preview.total_columns)} columns`} />
        <Chip
          color={preview.detected_email_column ? "success" : "warning"}
          label={preview.detected_email_column ? `Email column: ${preview.detected_email_column}` : "No email column detected"}
        />
        {preview.duplicate_email_rows > 0 && (
          <Chip color="warning" label={`${formatCount(preview.duplicate_email_rows)} duplicate emails`} />
        )}
      </Stack>
      {(preview.warnings || []).map((warning) => (
        <Alert key={warning} severity="warning">
          {warning}
        </Alert>
      ))}
      <Typography variant="body2" color="text.secondary">
        Showing the first {formatCount(preview.sample_rows?.length || 0)} of {formatCount(preview.total_rows)} rows. Nothing has been imported.
      </Typography>
      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 420, borderRadius: 2 }}>
        <Table size="small" stickyHeader aria-label="CSV preview">
          <TableHead>
            <TableRow>
              <TableCell>Row</TableCell>
              {headers.map((header) => (
                <TableCell key={header} sx={cellSx} title={header}>
                  <Box sx={{ fontWeight: 700 }}>{header}</Box>
                  <Typography variant="caption" color="text.secondary">
                    {formatCount(preview.missing_values?.[header] || 0)} empty
                  </Typography>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {(preview.sample_rows || []).map((row) => (
              <TableRow key={row.row}>
                <TableCell>{row.row}</TableCell>
                {headers.map((header, index) => (
                  <TableCell key={header} sx={cellSx} title={row.cells[index] || ""}>
                    {row.cells[index] || ""}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );

  const targetMenu = useMemo(() => {
    const groups = [
      ["Contact fields", targets.filter((t) => !t.special && t.group === "core")],
      ["Custom fields", targets.filter((t) => !t.special && t.group !== "core")],
      ["Special", targets.filter((t) => t.special)],
    ];
    const items = [
      <MenuItem key="__skip" value="">
        <em>Skip this column</em>
      </MenuItem>,
    ];
    groups.forEach(([label, list]) => {
      if (!list.length) return;
      items.push(<ListSubheader key={`h-${label}`}>{label}</ListSubheader>);
      list.forEach((target) => {
        items.push(
          <MenuItem key={target.alias} value={target.alias} disabled={!target.importable}>
            <Box>
              <Box component="span">{target.label}</Box>
              <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                {target.importable ? target.alias : target.reason}
              </Typography>
            </Box>
          </MenuItem>
        );
      });
    });
    return items;
  }, [targets]);

  const sampleFor = (header) => {
    const index = headers.indexOf(header);
    const row = (preview?.sample_rows || []).find((item) => String(item.cells[index] || "").trim());
    return row ? row.cells[index] : "";
  };

  const renderMapping = () => (
    <Stack spacing={2.5}>
      <Typography color="text.secondary">
        Choose the Mautic field for each column, or skip it. Suggestions are based on column names; review them
        before validating. Email is required and is used to match existing contacts.
      </Typography>
      {!emailMapped && <Alert severity="warning">Map one column to Email to continue.</Alert>}
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table size="small" aria-label="Field mapping">
          <TableHead>
            <TableRow>
              <TableCell>CSV column</TableCell>
              <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>Example value</TableCell>
              <TableCell>Mautic field</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {headers.map((header) => {
              const alias = mapping[header] || "";
              const isDuplicate = alias && duplicates.has(alias);
              const labelId = `map-${headers.indexOf(header)}`;
              return (
                <TableRow key={header}>
                  <TableCell id={labelId} sx={{ ...cellSx, fontWeight: 700 }} title={header}>
                    {header}
                  </TableCell>
                  <TableCell sx={{ ...cellSx, display: { xs: "none", sm: "table-cell" } }} title={sampleFor(header)}>
                    {sampleFor(header)}
                  </TableCell>
                  <TableCell sx={{ minWidth: 200 }}>
                    <FormControl size="small" fullWidth error={Boolean(isDuplicate)}>
                      <Select
                        value={alias}
                        displayEmpty
                        onChange={(event) => updateMapping(header, String(event.target.value || ""))}
                        inputProps={{ "aria-labelledby": labelId }}
                        renderValue={(value) => (value ? targetByAlias[value]?.label || value : <em>Skip this column</em>)}
                      >
                        {targetMenu}
                      </Select>
                      {isDuplicate && <FormHelperText>Another column is mapped to this field.</FormHelperText>}
                      {alias === "doNotEmail" && (
                        <FormHelperText>Only "true" values add Do Not Contact. Existing records are never removed.</FormHelperText>
                      )}
                    </FormControl>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
        <Typography id="existing-mode-label" sx={{ fontWeight: 800, mb: 0.5 }}>
          Contacts that already exist in Mautic
        </Typography>
        <RadioGroup
          aria-labelledby="existing-mode-label"
          value={options.existing_mode}
          onChange={(event) => updateOption("existing_mode", event.target.value)}
        >
          <FormControlLabel
            value="skip_existing"
            control={<Radio />}
            label="Skip them (recommended). Existing contacts are not changed."
          />
          <FormControlLabel
            value="fill_empty"
            control={<Radio />}
            label="Fill empty fields only. Values already in Mautic are never overwritten or blanked."
          />
        </RadioGroup>
        {tagsMapped && (
          <FormControl size="small" sx={{ mt: 1.5, minWidth: 240 }}>
            <Typography id="tag-separator-label" variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
              Tags are separated by
            </Typography>
            <Select
              value={options.tag_separator}
              onChange={(event) => updateOption("tag_separator", event.target.value)}
              inputProps={{ "aria-labelledby": "tag-separator-label" }}
            >
              <MenuItem value="|">Pipe ( | )</MenuItem>
              <MenuItem value=",">Comma ( , )</MenuItem>
              <MenuItem value=";">Semicolon ( ; )</MenuItem>
            </Select>
          </FormControl>
        )}
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
          Imported contacts are not added to any segment or campaign and no email is sent. Contacts never become ECP
          platform users.
        </Typography>
      </Paper>
      <ErrorAlert error={error} />
    </Stack>
  );

  const renderReview = () => {
    const summary = validation?.summary || {};
    const estimate = summary.existing_checked ? "" : " (estimate)";
    return (
      <Stack spacing={2.5}>
        {!validationCurrent && (
          <Alert severity="warning">This validation can no longer be used. Validate again before importing.</Alert>
        )}
        <StatGrid>
          <StatTile label="Total rows" value={summary.total_rows} />
          <StatTile label={`New contacts to create${estimate}`} value={summary.to_create} tone="#15803D" />
          <StatTile
            label={summary.existing_mode === "fill_empty" ? `Existing to fill${estimate}` : `Existing to skip${estimate}`}
            value={summary.existing_mode === "fill_empty" ? summary.to_update : summary.to_skip}
          />
          <StatTile label="Invalid rows" value={summary.invalid_rows} tone={summary.invalid_rows ? "#B91C1C" : undefined} />
          <StatTile label="Duplicates in file" value={summary.duplicate_rows} />
          <StatTile label="Do Not Contact to add" value={summary.dnc_rows} />
          <StatTile label="Existing with Do Not Contact" value={summary.existing_suppressed} />
          <StatTile label="Rows to send to Mautic" value={summary.to_import} tone="#1D4ED8" />
        </StatGrid>
        {(validation?.warnings || []).map((warning) => (
          <Alert key={warning} severity="info">
            {warning}
          </Alert>
        ))}
        {validation?.issue_count > 0 && (
          <Box>
            <Typography sx={{ fontWeight: 800, mb: 1 }}>
              Rows that will not be imported
              {validation.issues_truncated
                ? ` (showing ${formatCount(validation.issues.length)} of ${formatCount(validation.issue_count)})`
                : ""}
            </Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 280, borderRadius: 2 }}>
              <Table size="small" stickyHeader aria-label="Validation issues">
                <TableHead>
                  <TableRow>
                    <TableCell>Row</TableCell>
                    <TableCell>Column</TableCell>
                    <TableCell>Problem</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {validation.issues.map((issue, index) => (
                    <TableRow key={`${issue.row}-${issue.code}-${index}`}>
                      <TableCell>{issue.row}</TableCell>
                      <TableCell sx={cellSx}>{issue.column || "—"}</TableCell>
                      <TableCell>{issue.message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Typography sx={{ fontWeight: 800, mb: 1 }}>Confirm import</Typography>
          <Typography variant="body2" color="text.secondary" component="div">
            <strong>{validation?.file?.name}</strong> · {formatCount(summary.to_import)} rows ·{" "}
            {summary.existing_mode === "fill_empty" ? "fill empty fields on existing contacts" : "skip existing contacts"} ·{" "}
            {(validation?.mapping || []).map((item) => `${item.column} → ${item.label}`).join(", ")}
          </Typography>
          <FormControlLabel
            sx={{ mt: 1 }}
            control={
              <Checkbox
                checked={confirmed}
                disabled={!validationCurrent || !summary.to_import}
                onChange={(event) => setConfirmed(event.target.checked)}
              />
            }
            label={`I have reviewed this summary. Import ${formatCount(summary.to_import)} rows into Mautic.`}
          />
          {!summary.to_import && <Alert severity="warning">There are no rows to import.</Alert>}
        </Paper>
        <ErrorAlert error={error} />
      </Stack>
    );
  };

  const renderProgress = () => {
    const percentage = job?.progress_percentage;
    const processing = job?.state === "processing" && percentage !== null && percentage !== undefined;
    return (
      <Stack spacing={2.5}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip color={STATE_COLORS[job?.state] || "default"} label={STATE_LABELS[job?.state] || "Unknown"} />
          <Typography color="text.secondary">{job?.file_name}</Typography>
        </Stack>
        <Box>
          {processing ? (
            <LinearProgress variant="determinate" value={Math.min(100, percentage)} aria-label="Import progress" />
          ) : (
            <LinearProgress aria-label="Waiting for Mautic's import queue" />
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {job?.state === "queued"
              ? "Waiting for Mautic's import queue to pick up this import."
              : `${formatCount(job?.processed)} of ${formatCount(job?.rows_sent)} rows processed${processing ? ` (${percentage}%)` : ""}.`}
          </Typography>
        </Box>
        <StatGrid>
          <StatTile label="Created" value={job?.created} tone="#15803D" />
          <StatTile label="Updated" value={job?.updated} />
          <StatTile label="Skipped (already in Mautic)" value={job?.skipped_existing} />
          <StatTile label="Failed" value={job?.failed} tone={job?.failed ? "#B91C1C" : undefined} />
        </StatGrid>
        {jobError && <Alert severity="warning">{jobError}</Alert>}
        {job?.stalled && (
          <Alert severity="warning">
            Mautic has not reported progress for over 15 minutes. If its import worker stopped, Mautic marks this
            import as failed after 2 hours. Contacts already created are kept, and importing the same file again
            skips them.
          </Alert>
        )}
        <Alert severity="info">
          You can close this window. The import keeps running in Mautic, and you can reopen it from Your recent imports.
        </Alert>
      </Stack>
    );
  };

  const renderResults = () => {
    const failedState = job?.state === "failed" || job?.state === "stopped";
    const rows = [
      ["Rows in file", job?.total_rows],
      ["Created", job?.created],
      ["Updated (empty fields filled)", job?.updated],
      ["Skipped (already in Mautic)", job?.skipped_existing],
      ["Not imported (invalid or duplicate in file)", job?.excluded_invalid],
      ["Failed in Mautic", job?.failed],
    ];
    return (
      <Stack spacing={2.5}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip color={STATE_COLORS[job?.state] || "default"} label={STATE_LABELS[job?.state] || "Unknown"} />
          <Typography color="text.secondary">{job?.file_name}</Typography>
        </Stack>
        {failedState && (
          <Alert severity="error">
            {job?.status_info ? `${job.status_info} ` : ""}
            Contacts already created are kept (an import is never rolled back). To finish, validate the same file
            again: contacts that now exist are skipped, so nothing is duplicated.
          </Alert>
        )}
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
          <Table size="small" aria-label="Import results">
            <TableHead>
              <TableRow>
                <TableCell>Result</TableCell>
                <TableCell align="right">Count</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map(([label, value]) => (
                <TableRow key={label}>
                  <TableCell>{label}</TableCell>
                  <TableCell align="right">{formatCount(value)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Box>
          <Button
            onClick={() => loadRowErrors(1)}
            disabled={rowErrorsLoading}
            sx={{ textTransform: "none" }}
          >
            {rowErrorsLoading ? "Loading row details…" : "View skipped and failed rows"}
          </Button>
          {rowErrors && (
            <Box sx={{ mt: 1 }}>
              {rowErrors.error && <Alert severity="warning">{rowErrors.error}</Alert>}
              {!rowErrors.error && rowErrors.count === 0 && (
                <Typography color="text.secondary">Mautic reported no skipped or failed rows.</Typography>
              )}
              {rowErrors.count > 0 && (
                <>
                  <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 280, borderRadius: 2 }}>
                    <Table size="small" stickyHeader aria-label="Import row errors">
                      <TableHead>
                        <TableRow>
                          <TableCell>CSV row</TableCell>
                          <TableCell>Reason</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {rowErrors.results.map((item, index) => (
                          <TableRow key={`${item.row}-${index}`}>
                            <TableCell>{item.row ?? "—"}</TableCell>
                            <TableCell>{item.message}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                    <Button
                      size="small"
                      disabled={rowErrorsLoading || rowErrors.page <= 1}
                      onClick={() => loadRowErrors(rowErrors.page - 1)}
                    >
                      Previous
                    </Button>
                    <Typography variant="caption">
                      Page {rowErrors.page} of {Math.max(1, Math.ceil(rowErrors.count / ERROR_PAGE_SIZE))}
                    </Typography>
                    <Button
                      size="small"
                      disabled={rowErrorsLoading || rowErrors.page * ERROR_PAGE_SIZE >= rowErrors.count}
                      onClick={() => loadRowErrors(rowErrors.page + 1)}
                    >
                      Next
                    </Button>
                  </Stack>
                </>
              )}
            </Box>
          )}
        </Box>
      </Stack>
    );
  };

  // ----------------------------------------------------------- actions --
  const renderActions = () => {
    if (step === STEP.upload) {
      return (
        <>
          <Button onClick={handleClose} sx={{ textTransform: "none" }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handlePreview}
            disabled={!file || busy === "preview"}
            startIcon={busy === "preview" ? <CircularProgress size={16} color="inherit" /> : null}
            sx={{ textTransform: "none" }}
          >
            {busy === "preview" ? "Reading file…" : "Upload and preview"}
          </Button>
        </>
      );
    }
    if (step === STEP.preview) {
      return (
        <>
          <Button onClick={() => setStep(STEP.upload)} sx={{ textTransform: "none" }}>Back</Button>
          <Button variant="contained" onClick={() => setStep(STEP.mapping)} sx={{ textTransform: "none" }}>
            Map fields
          </Button>
        </>
      );
    }
    if (step === STEP.mapping) {
      return (
        <>
          <Button onClick={() => setStep(STEP.preview)} sx={{ textTransform: "none" }}>Back</Button>
          <Button
            variant="contained"
            onClick={handleValidate}
            disabled={!emailMapped || duplicates.size > 0 || busy === "validate"}
            startIcon={busy === "validate" ? <CircularProgress size={16} color="inherit" /> : null}
            sx={{ textTransform: "none" }}
          >
            {busy === "validate" ? "Validating all rows…" : "Validate all rows"}
          </Button>
        </>
      );
    }
    if (step === STEP.review) {
      return (
        <>
          <Button onClick={() => setStep(STEP.mapping)} disabled={busy === "start"} sx={{ textTransform: "none" }}>
            Back to mapping
          </Button>
          {!validationCurrent ? (
            <Button variant="contained" onClick={handleValidate} disabled={busy === "validate"} sx={{ textTransform: "none" }}>
              Validate again
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleStart}
              disabled={!confirmed || busy === "start"}
              startIcon={busy === "start" ? <CircularProgress size={16} color="inherit" /> : null}
              sx={{ textTransform: "none" }}
            >
              {busy === "start" ? "Starting import…" : "Start import"}
            </Button>
          )}
        </>
      );
    }
    if (step === STEP.progress) {
      return (
        <Button onClick={handleClose} sx={{ textTransform: "none" }}>
          Close
        </Button>
      );
    }
    return (
      <>
        <Button onClick={resetWizard} sx={{ textTransform: "none" }}>Import another file</Button>
        <Button
          variant="contained"
          onClick={() => {
            resetWizard();
            onClose?.({ viewContacts: true });
          }}
          sx={{ textTransform: "none" }}
        >
          View contacts
        </Button>
      </>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="lg"
      fullScreen={fullScreen}
      aria-labelledby="contact-import-title"
    >
      <DialogTitle id="contact-import-title" sx={{ pr: 6, fontWeight: 850, color: "#1B2A4A" }}>
        Import contacts from CSV
        <IconButton
          aria-label="Close import"
          onClick={handleClose}
          disabled={busy === "start"}
          sx={{ position: "absolute", right: 12, top: 12 }}
        >
          <CloseRoundedIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stepper activeStep={step} alternativeLabel sx={{ mb: 3, display: { xs: "none", md: "flex" } }}>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        <Typography variant="overline" sx={{ display: { xs: "block", md: "none" }, mb: 1 }}>
          Step {step + 1} of {STEPS.length}: {STEPS[step]}
        </Typography>
        {busy === "validate" || busy === "preview" ? <LinearProgress sx={{ mb: 2 }} /> : null}
        {step === STEP.upload && renderUpload()}
        {step === STEP.preview && preview && renderPreview()}
        {step === STEP.mapping && preview && renderMapping()}
        {step === STEP.review && validation && renderReview()}
        {step === STEP.progress && job && renderProgress()}
        {step === STEP.results && job && renderResults()}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, flexWrap: "wrap", gap: 1 }}>{renderActions()}</DialogActions>
    </Dialog>
  );
}
