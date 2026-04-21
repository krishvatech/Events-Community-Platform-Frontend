import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Stack,
  Box,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

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

export default function PreEventQnAModal({ open, onClose, event }) {
  console.log("[DEBUG PreEventQnAModal] Component mounted/rendered. open=", open, "event=", event?.id);

  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    console.log("[DEBUG PreEventQnAModal] useEffect triggered. open=", open, "event?.id=", event?.id);
  }, [open, event]);

  // Guard: if the event has started while the modal is open, auto-close it.
  useEffect(() => {
    if (!open || !event?.start_time) return;
    const startMs = new Date(event.start_time).getTime();
    const msUntilStart = startMs - Date.now();
    if (msUntilStart <= 0) {
      // Already started — close immediately
      onClose({ eventStarted: true });
      return;
    }
    // Schedule auto-close when the event starts
    const timer = setTimeout(() => {
      if (typeof onClose === 'function') {
        onClose({ eventStarted: false });
      }
    }, msUntilStart);
    return () => clearTimeout(timer);
  }, [open, event?.start_time, onClose]);

  const handleClose = () => {
    console.log("[DEBUG PreEventQnAModal] handleClose called");
    setContent("");
    setError("");
    setSubmitted(false);
    if (typeof onClose === 'function') {
      onClose({ eventStarted: false });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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
    } catch (err) {
      setError(err.message || "Failed to submit question.");
    } finally {
      setSubmitting(false);
    }
  };

  if (open) {
    console.log("[DEBUG PreEventQnAModal] About to render Dialog");
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        disableEscapeKeyDown={false}
        onBackdropClick={handleClose}
      >
      <DialogTitle>Submit a Pre-Event Question</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Your question will be available to the host before{" "}
          <strong>{event?.title}</strong> begins.
        </Typography>

        {submitted ? (
          <Stack alignItems="center" spacing={1.5} sx={{ py: 2 }}>
            <CheckCircleOutlineIcon color="success" sx={{ fontSize: 44 }} />
            <Typography variant="body1" color="success.main" fontWeight={700}>
              Question submitted!
            </Typography>
            <Typography variant="body2" color="text.secondary">
              You can submit another question or close this dialog.
            </Typography>
            <Button onClick={() => setSubmitted(false)} variant="outlined" size="small">
              Submit another
            </Button>
          </Stack>
        ) : (
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              multiline
              minRows={3}
              label="Your question"
              placeholder="What would you like to ask the host?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={submitting}
              autoFocus
              sx={{ mt: 1 }}
            />
            {error && (
              <Alert severity="error" sx={{ mt: 1.5 }}>
                {error}
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button
          onClick={handleClose}
          disabled={submitting}
          variant="outlined"
          sx={{ textTransform: 'uppercase', fontWeight: 600 }}
        >
          Close
        </Button>
        {!submitted && (
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={submitting || !content.trim()}
            startIcon={submitting ? <CircularProgress size={14} color="inherit" /> : null}
            sx={{ textTransform: 'uppercase', fontWeight: 600 }}
          >
            {submitting ? "Submitting…" : "Submit Question"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
    </>
  );
}
