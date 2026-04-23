/**
 * PreEventQnAModal.jsx
 *
 * Submit a pre-event question — with optional AI Advisor:
 *   1. "Improve with AI"   → side-by-side original vs improved comparison
 *   2. "Check duplicates"  → flags similar existing questions, suggests merge
 *
 * AI calls are private and ephemeral.
 * Nothing is auto-submitted or auto-modified; the user always decides.
 */

import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

const API_ROOT = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");

function toApiUrl(path) {
  const rel = String(path).replace(/^\/+/, "");
  return `${API_ROOT}/${rel.replace(/^api\/+/, "")}`;
}

function getToken() {
  return localStorage.getItem("access") || localStorage.getItem("access_token") || "";
}

function authHeader() {
  const tok = getToken();
  return tok ? { Authorization: `Bearer ${tok}` } : {};
}

// ─── AI Compare Panel (side-by-side) ────────────────────────────────────────

function AiComparePanel({ original, improved, onKeepOriginal, onUseImproved }) {
  return (
    <Box
      sx={{
        mt: 1.5,
        p: 2,
        borderRadius: 2,
        bgcolor: "rgba(99,102,241,0.05)",
        border: "1px solid rgba(99,102,241,0.2)",
      }}
    >
      <Typography variant="caption" fontWeight={700} color="primary" sx={{ mb: 1.5, display: "block" }}>
        ✨ AI Suggestion — Side-by-Side
      </Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            Original
          </Typography>
          <Paper
            elevation={0}
            sx={{
              mt: 0.5,
              p: 1.5,
              bgcolor: "grey.50",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1.5,
              minHeight: 60,
            }}
          >
            <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
              {original}
            </Typography>
          </Paper>
        </Box>
        <Box>
          <Typography variant="caption" color="primary" fontWeight={600}>
            AI Improved
          </Typography>
          <Paper
            elevation={0}
            sx={{
              mt: 0.5,
              p: 1.5,
              bgcolor: "rgba(99,102,241,0.04)",
              border: "1px solid rgba(99,102,241,0.3)",
              borderRadius: 1.5,
              minHeight: 60,
            }}
          >
            <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
              {improved}
            </Typography>
          </Paper>
        </Box>
      </Box>
      <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
        <Button
          size="small"
          variant="outlined"
          onClick={onKeepOriginal}
          sx={{ textTransform: "none", flex: 1 }}
        >
          Keep original
        </Button>
        <Button
          size="small"
          variant="contained"
          onClick={onUseImproved}
          sx={{
            textTransform: "none",
            flex: 1,
            bgcolor: "#6366f1",
            "&:hover": { bgcolor: "#4f46e5" },
          }}
        >
          Use AI version
        </Button>
      </Stack>
    </Box>
  );
}

// ─── Duplicate Warning Panel ─────────────────────────────────────────────────

function DuplicatePanel({ duplicates, onDismiss, onUseExisting }) {
  if (!duplicates?.length) return null;
  return (
    <Box
      sx={{
        mt: 1.5,
        p: 2,
        borderRadius: 2,
        bgcolor: "rgba(245,158,11,0.06)",
        border: "1px solid rgba(245,158,11,0.3)",
      }}
    >
      <Typography variant="caption" fontWeight={700} color="warning.dark" sx={{ mb: 1.5, display: "block" }}>
        ⚠️ Similar Question Detected
      </Typography>
      {duplicates.map((dup) => (
        <Box key={dup.question_id} sx={{ mb: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            <b>Existing:</b> {dup.existing_text}
          </Typography>
          <Typography variant="caption" color="warning.dark">
            {dup.similarity_reason}
          </Typography>
          {dup.suggested_merge && (
            <Alert severity="info" sx={{ mt: 1, py: 0.5 }} icon={<CompareArrowsIcon fontSize="small" />}>
              <Typography variant="caption">
                <b>Suggested merge:</b> {dup.suggested_merge}
              </Typography>
            </Alert>
          )}
          <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap", gap: 0.5 }}>
            <Button size="small" variant="outlined" onClick={onDismiss} sx={{ textTransform: "none" }}>
              Keep both
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="warning"
              onClick={() => onUseExisting(dup.existing_text)}
              sx={{ textTransform: "none" }}
            >
              Edit existing instead
            </Button>
            <Button size="small" variant="outlined" color="error" onClick={onDismiss} sx={{ textTransform: "none" }}>
              Cancel
            </Button>
          </Stack>
        </Box>
      ))}
    </Box>
  );
}

// ─── Main Modal ──────────────────────────────────────────────────────────────

export default function PreEventQnAModal({ open, onClose, event }) {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // AI Polish state
  const [polishing, setPolishing] = useState(false);
  const [polishResult, setPolishResult] = useState(null); // { original, improved }
  const [polishError, setPolishError] = useState(null);

  // AI Duplicate state
  const [checking, setChecking] = useState(false);
  const [dupResult, setDupResult] = useState(null);
  const [dupError, setDupError] = useState(null);

  // Advisor info toggle
  const [advisorOpen, setAdvisorOpen] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setContent("");
      setError("");
      setSubmitted(false);
      setPolishResult(null);
      setPolishError(null);
      setDupResult(null);
      setDupError(null);
      setAdvisorOpen(false);
    }
  }, [open]);

  // Auto-close guard: if event starts while modal is open, close it
  useEffect(() => {
    if (!open || !event?.start_time) return;
    const msUntilStart = new Date(event.start_time).getTime() - Date.now();
    if (msUntilStart <= 0) { onClose({ eventStarted: true }); return; }
    const timer = setTimeout(() => {
      if (typeof onClose === "function") onClose({ eventStarted: false });
    }, msUntilStart);
    return () => clearTimeout(timer);
  }, [open, event?.start_time, onClose]);

  const handleClose = () => {
    setContent("");
    setError("");
    setSubmitted(false);
    if (typeof onClose === "function") onClose({ eventStarted: false });
  };

  // ── AI: Polish ──────────────────────────────────────────────────────────────

  const handlePolish = async () => {
    const trimmed = content.trim();
    if (!trimmed || trimmed.length < 5) return;
    setPolishing(true);
    setPolishError(null);
    setPolishResult(null);
    try {
      const res = await fetch(toApiUrl("interactions/questions/polish-draft/"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ event_id: event.id, content: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || "AI unavailable. Please try again.");
      if (data.changed) {
        setPolishResult({ original: data.original, improved: data.improved });
      } else {
        setPolishError("Your question already looks great — no changes suggested!");
      }
    } catch (e) {
      setPolishError(e.message || "AI improvement unavailable. Please try again.");
    } finally {
      setPolishing(false);
    }
  };

  // ── AI: Duplicate check ─────────────────────────────────────────────────────

  const handleDuplicateCheck = async () => {
    const trimmed = content.trim();
    if (!trimmed || trimmed.length < 5) return;
    setChecking(true);
    setDupError(null);
    setDupResult(null);
    try {
      const res = await fetch(toApiUrl("interactions/questions/pre-event-duplicate-check/"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ event_id: event.id, content: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || "Duplicate check unavailable.");
      setDupResult(data);
    } catch (e) {
      setDupError(e.message || "Duplicate check unavailable. Please try again.");
    } finally {
      setChecking(false);
    }
  };

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || !event?.id) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(toApiUrl("interactions/questions/"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ event: event.id, content: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to submit question.");
      }
      setSubmitted(true);
      setContent("");
      setPolishResult(null);
      setDupResult(null);
    } catch (err) {
      setError(err.message || "Failed to submit question.");
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = !submitting && content.trim().length >= 5;
  const aiDisabled = content.trim().length < 5;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6" fontWeight={700}>
            Submit a Pre-Event Question
          </Typography>
          <Tooltip title="AI Advisor helps polish your question and avoid duplicates. Nothing is auto-submitted.">
            <IconButton size="small" onClick={() => setAdvisorOpen((v) => !v)}>
              <InfoOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ pt: 0 }}>
        {/* AI Advisor info banner */}
        <Collapse in={advisorOpen}>
          <Alert
            severity="info"
            icon={<AutoFixHighIcon fontSize="small" />}
            onClose={() => setAdvisorOpen(false)}
            sx={{ mb: 1.5 }}
          >
            <Typography variant="caption">
              <strong>Q&A AI Advisor</strong> — Before submitting, you can:
              <br />• <b>Improve with AI</b> — get a clearer version, compare side-by-side, then decide.
              <br />• <b>Check duplicates</b> — see if you already asked something similar.
              <br />AI is private to you. Nothing changes without your confirmation.
            </Typography>
          </Alert>
        </Collapse>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Your question will be shared with the host before{" "}
          <strong>{event?.title}</strong> begins.
        </Typography>

        {submitted ? (
          /* ── Success state ── */
          <Stack alignItems="center" spacing={1.5} sx={{ py: 2 }}>
            <CheckCircleOutlineIcon color="success" sx={{ fontSize: 44 }} />
            <Typography variant="body1" color="success.main" fontWeight={700}>
              Question submitted!
            </Typography>
            <Typography variant="body2" color="text.secondary">
              You can submit another question or close this dialog.
            </Typography>
            <Button onClick={() => { setSubmitted(false); setContent(""); }} variant="outlined" size="small">
              Submit another
            </Button>
          </Stack>
        ) : (
          /* ── Form state ── */
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              multiline
              minRows={3}
              maxRows={8}
              label="Your question"
              placeholder="What would you like to ask the host?"
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                // Clear AI results when content changes
                setPolishResult(null);
                setDupResult(null);
              }}
              disabled={submitting}
              autoFocus
              inputProps={{ maxLength: 1000 }}
              helperText={`${content.length}/1000`}
              sx={{ mt: 0.5 }}
            />

            {/* AI action buttons */}
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={
                  polishing ? (
                    <CircularProgress size={14} />
                  ) : (
                    <AutoFixHighIcon fontSize="small" />
                  )
                }
                onClick={handlePolish}
                disabled={polishing || aiDisabled || submitting}
                sx={{
                  textTransform: "none",
                  borderColor: "#6366f1",
                  color: "#6366f1",
                  "&:hover": { borderColor: "#4f46e5", bgcolor: "rgba(99,102,241,0.04)" },
                }}
              >
                {polishing ? "Improving…" : "Improve with AI"}
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={
                  checking ? (
                    <CircularProgress size={14} />
                  ) : (
                    <CompareArrowsIcon fontSize="small" />
                  )
                }
                onClick={handleDuplicateCheck}
                disabled={checking || aiDisabled || submitting}
                sx={{ textTransform: "none" }}
              >
                {checking ? "Checking…" : "Check duplicates"}
              </Button>
            </Stack>

            {/* AI Polish feedback */}
            {polishError && (
              <Alert severity="info" sx={{ mt: 1 }}>
                {polishError}
              </Alert>
            )}
            {polishResult && (
              <AiComparePanel
                original={polishResult.original}
                improved={polishResult.improved}
                onKeepOriginal={() => setPolishResult(null)}
                onUseImproved={() => {
                  setContent(polishResult.improved);
                  setPolishResult(null);
                }}
              />
            )}

            {/* Duplicate check feedback */}
            {dupError && (
              <Alert severity="warning" sx={{ mt: 1 }}>
                {dupError}
              </Alert>
            )}
            {dupResult && !dupResult.has_duplicates && (
              <Alert severity="success" icon={<CheckCircleOutlineIcon />} sx={{ mt: 1 }}>
                No duplicates found — this question looks unique!
              </Alert>
            )}
            {dupResult?.has_duplicates && (
              <DuplicatePanel
                duplicates={dupResult.duplicates}
                onDismiss={() => setDupResult(null)}
                onUseExisting={(existingText) => {
                  setContent(existingText);
                  setDupResult(null);
                }}
              />
            )}

            {/* Submit error */}
            {error && (
              <Alert severity="error" sx={{ mt: 1.5 }}>
                {error}
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          onClick={handleClose}
          disabled={submitting}
          variant="outlined"
          sx={{ textTransform: "none" }}
        >
          Close
        </Button>
        {!submitted && (
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!canSubmit}
            startIcon={submitting ? <CircularProgress size={14} color="inherit" /> : null}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              bgcolor: "#10b8a6",
              "&:hover": { bgcolor: "#0ea5a4" },
            }}
          >
            {submitting ? "Submitting…" : "Submit Question"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
