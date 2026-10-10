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
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";

import {
  cancelContactDelete,
  executeContactDeleteBatch,
  prepareContactDeleteCsv,
  prepareContactDeleteSelected,
} from "../../services/newsletterService";
import { DEFAULT_MAX_BYTES, checkCsvFile, formatBytes, formatCount, importErrorMessage } from "../../utils/contactImport";

const PROTECTED_LABELS = {
  linked_ecp_account: "Linked to an ECP account",
  ecp_account_email: "Email belongs to an ECP account",
  do_not_contact: "Has a Do Not Contact record",
  ambiguous_email: "Email matches more than one contact",
};
const ACTIVE = ["ready", "running"];

const Row = ({ label, value, tone }) => (
  <TableRow>
    <TableCell>{label}</TableCell>
    <TableCell align="right" sx={{ fontWeight: 700, color: tone }}>
      {formatCount(value)}
    </TableCell>
  </TableRow>
);

/**
 * Bulk delete of Mautic contacts. mode "selected" deletes the ticked contacts;
 * mode "csv" matches a CSV of email addresses. The server holds the target
 * list: this dialog only shows its summary and confirms it by exact count.
 */
export default function ContactDeleteDialog({ open, mode, contactIds = [], onClose }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const [step, setStep] = useState("start");
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [emailColumn, setEmailColumn] = useState("");
  const [needsColumn, setNeedsColumn] = useState(false);
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const stopRef = useRef(false);
  const runningRef = useRef(false);
  const changedRef = useRef(false);
  const autoPreparedRef = useRef(false);

  const reset = useCallback(() => {
    setStep("start");
    setFile(null);
    setFileError("");
    setEmailColumn("");
    setNeedsColumn(false);
    setPlan(null);
    setError("");
    setConfirmText("");
    setBusy(false);
    stopRef.current = false;
    changedRef.current = false;
    autoPreparedRef.current = false;
  }, []);

  const prepare = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const data =
        mode === "csv" ? await prepareContactDeleteCsv(file, emailColumn.trim()) : await prepareContactDeleteSelected(contactIds);
      setPlan(data);
      setConfirmText("");
      setStep("review");
    } catch (err) {
      const code = err?.response?.data?.code;
      if (code === "email_column_required" || code === "unknown_column") setNeedsColumn(true);
      setError(importErrorMessage(err, "The deletion could not be prepared. Nothing was deleted."));
    } finally {
      setBusy(false);
    }
  }, [mode, file, emailColumn, contactIds]);

  // Selected contacts are reviewed straight away; a CSV waits for its file.
  useEffect(() => {
    if (open && mode === "selected" && step === "start" && !autoPreparedRef.current) {
      autoPreparedRef.current = true; // once per opening, even if it fails
      prepare();
    }
  }, [open, mode, step, prepare]);

  const deletable = plan?.summary?.deletable ?? 0;
  const confirmed = deletable > 0 && confirmText.trim() === String(deletable);

  const run = async () => {
    if (runningRef.current || !plan) return;
    runningRef.current = true;
    stopRef.current = false;
    setStep("running");
    setError("");
    let current = plan;
    try {
      while (ACTIVE.includes(current.state)) {
        if (stopRef.current) {
          current = await cancelContactDelete(current.plan_id);
          break;
        }
        current = await executeContactDeleteBatch(current.plan_id, deletable);
        changedRef.current = true;
        setPlan(current);
      }
      setPlan(current);
      setStep("done");
    } catch (err) {
      // Retrying is safe: the server re-checks every contact and counts ones
      // already deleted as "already gone".
      setError(importErrorMessage(err, "A batch failed."));
    } finally {
      runningRef.current = false;
    }
  };

  // Stop while idle (e.g. after a failed batch): cancel the plan directly.
  const stop = async () => {
    stopRef.current = true;
    if (runningRef.current || !plan) return;
    try {
      const cancelled = await cancelContactDelete(plan.plan_id);
      setPlan(cancelled);
      setStep("done");
    } catch (err) {
      setError(importErrorMessage(err, "The deletion could not be stopped."));
    }
  };

  const close = () => {
    if (runningRef.current) return;
    const changed = changedRef.current;
    reset();
    onClose?.({ changed });
  };

  const summary = plan?.summary || {};
  const protectedCounts = summary.protected || {};
  const results = plan?.results || {};
  const progress = plan?.progress || {};

  const renderStart = () =>
    mode === "csv" ? (
      <Stack spacing={2}>
        <Typography color="text.secondary">
          Upload a CSV with an Email column. Contacts are matched by exact email address only; uploading never deletes
          anything. Up to 50,000 rows and {formatBytes(DEFAULT_MAX_BYTES)}.
        </Typography>
        <Box>
          <input
            id="contact-delete-file"
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => {
              const candidate = event.target.files?.[0] || null;
              const problem = checkCsvFile(candidate);
              setFile(problem ? null : candidate);
              setFileError(problem);
              setError("");
              event.target.value = "";
            }}
          />
        </Box>
        {file && <Typography variant="body2">{file.name} · {formatBytes(file.size)}</Typography>}
        {fileError && <Alert severity="error">{fileError}</Alert>}
        {needsColumn && (
          <TextField
            size="small"
            label="Email column name"
            value={emailColumn}
            onChange={(event) => setEmailColumn(event.target.value)}
            helperText="The exact header of the column that holds email addresses."
          />
        )}
        {error && <Alert severity="error">{error}</Alert>}
      </Stack>
    ) : (
      <Stack spacing={2} alignItems="center" sx={{ py: 3 }}>
        {error ? <Alert severity="error" sx={{ width: "100%" }}>{error}</Alert> : <CircularProgress aria-label="Checking contacts" />}
      </Stack>
    );

  const renderReview = () => (
    <Stack spacing={2}>
      <Alert severity="error">
        Deleting contacts is permanent. Their activity history, notes, tags, segment and campaign memberships are removed
        from Mautic and cannot be restored.
      </Alert>
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table size="small" aria-label="Deletion summary">
          <TableBody>
            <Row label={mode === "csv" ? "Rows in file" : "Contacts selected"} value={summary.requested} />
            <Row label="Will be deleted" value={summary.deletable} tone="#B91C1C" />
            {Object.entries(protectedCounts).map(([reason, value]) => (
              <Row key={reason} label={`Protected — ${PROTECTED_LABELS[reason] || reason}`} value={value} />
            ))}
            <Row label={mode === "csv" ? "No matching contact" : "No longer exists"} value={summary.not_found} />
            {mode === "csv" && <Row label="Invalid or missing email" value={summary.invalid} />}
            {mode === "csv" && <Row label="Duplicate rows in file" value={summary.duplicate} />}
          </TableBody>
        </Table>
      </TableContainer>
      <Typography variant="body2" color="text.secondary">
        Protected contacts are never deleted: ECP-linked contacts belong to platform accounts, and contacts with Do Not
        Contact keep their suppression. {summary.in_campaigns ? `${formatCount(summary.in_campaigns)} contacts to delete are in campaigns.` : ""}
      </Typography>
      {(plan?.samples?.deletable || []).length > 0 && (
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>
            Contacts to delete{summary.deletable > plan.samples.deletable.length ? ` (first ${plan.samples.deletable.length})` : ""}
          </Typography>
          <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" aria-label="Contacts to delete">
            {plan.samples.deletable.map((item) => (
              <Chip key={item.id} size="small" label={`${item.email || "(no email)"} · #${item.id}`} />
            ))}
          </Stack>
        </Box>
      )}
      {(plan?.samples?.excluded || []).length > 0 && (
        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 220, borderRadius: 2 }}>
          <Table size="small" stickyHeader aria-label="Not deleted">
            <TableHead>
              <TableRow>
                <TableCell>{mode === "csv" ? "Row" : "Contact"}</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Not deleted because</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {plan.samples.excluded.map((item, index) => (
                <TableRow key={`${item.id || item.row}-${index}`}>
                  <TableCell>{item.row ?? `#${item.id}`}</TableCell>
                  <TableCell>{item.email || "—"}</TableCell>
                  <TableCell>{item.label}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {deletable > 0 ? (
        <TextField
          size="small"
          label={`Type ${deletable} to confirm`}
          value={confirmText}
          onChange={(event) => setConfirmText(event.target.value)}
          inputProps={{ inputMode: "numeric", "aria-label": "Confirm number of contacts to delete" }}
          helperText={`This plan expires ${plan?.expires_at ? new Date(plan.expires_at * 1000).toLocaleTimeString() : "soon"}.`}
        />
      ) : (
        <Alert severity="info">No contacts can be deleted.</Alert>
      )}
      {error && <Alert severity="error">{error}</Alert>}
    </Stack>
  );

  const renderRunning = () => (
    <Stack spacing={2}>
      <LinearProgress variant="determinate" value={Math.min(100, progress.percentage || 0)} aria-label="Deletion progress" />
      <Typography>
        {formatCount(progress.processed)} of {formatCount(progress.total)} checked · {formatCount(results.deleted)} deleted
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Keep this window open. Each batch of up to 100 contacts is re-checked just before it is deleted. Stopping takes
        effect before the next batch; contacts already deleted stay deleted.
      </Typography>
      {error && (
        <Alert severity="warning" action={<Button color="inherit" size="small" onClick={run}>Retry</Button>}>
          {error} Retrying is safe.
        </Alert>
      )}
    </Stack>
  );

  const renderDone = () => (
    <Stack spacing={2}>
      <Alert severity={plan?.state === "completed" ? "success" : "warning"}>
        {plan?.state === "cancelled"
          ? "Deletion stopped. Contacts deleted before stopping stay deleted."
          : plan?.state === "completed_with_errors"
            ? "Deletion finished with errors."
            : "Deletion finished."}
      </Alert>
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table size="small" aria-label="Deletion results">
          <TableBody>
            <Row label="Deleted" value={results.deleted} tone="#B91C1C" />
            <Row label="Already gone" value={results.already_gone} />
            {Object.entries(results.skipped || {}).map(([reason, value]) => (
              <Row key={reason} label={`Skipped — ${results.skipped_labels?.[reason] || reason}`} value={value} />
            ))}
            <Row label="Failed" value={results.failed} tone={results.failed ? "#B91C1C" : undefined} />
            {plan?.state === "cancelled" && <Row label="Not processed" value={progress.remaining} />}
          </TableBody>
        </Table>
      </TableContainer>
      {(plan?.failures || []).length > 0 && (
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Failed contacts</Typography>
          {plan.failures.map((item) => (
            <Typography key={item.id} variant="body2">#{item.id}: {item.label}</Typography>
          ))}
        </Box>
      )}
    </Stack>
  );

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="md" fullScreen={fullScreen} aria-labelledby="contact-delete-title">
      <DialogTitle id="contact-delete-title" sx={{ fontWeight: 850, color: "#1B2A4A" }}>
        {mode === "csv" ? "Bulk delete contacts by CSV" : `Delete ${formatCount(contactIds.length)} selected contacts`}
      </DialogTitle>
      <DialogContent dividers>
        {busy && <LinearProgress sx={{ mb: 2 }} />}
        {step === "start" && renderStart()}
        {step === "review" && plan && renderReview()}
        {step === "running" && plan && renderRunning()}
        {step === "done" && plan && renderDone()}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        {step === "start" && (
          <>
            <Button onClick={close} sx={{ textTransform: "none" }}>Cancel</Button>
            {mode === "csv" && (
              <Button variant="contained" onClick={prepare} disabled={!file || busy} sx={{ textTransform: "none" }}>
                {busy ? "Checking…" : "Check contacts"}
              </Button>
            )}
          </>
        )}
        {step === "review" && (
          <>
            <Button onClick={close} sx={{ textTransform: "none" }}>Cancel</Button>
            <Button variant="contained" color="error" onClick={run} disabled={!confirmed} sx={{ textTransform: "none" }}>
              Delete {formatCount(deletable)} {deletable === 1 ? "contact" : "contacts"} permanently
            </Button>
          </>
        )}
        {step === "running" && (
          <Button
            color="warning"
            onClick={stop}
            sx={{ textTransform: "none" }}
          >
            Stop after this batch
          </Button>
        )}
        {step === "done" && (
          <Button variant="contained" onClick={close} sx={{ textTransform: "none" }}>Close</Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
