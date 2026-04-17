// src/components/QnAEngagementPromptModal.jsx
//
// Centered Q&A engagement prompt modal with embedded question input.
// Extension of Feature #9 (banner prompt) — shown when host triggers
// a prompt with prompt_type === "modal".
//
// Props:
//   open             – boolean, whether modal is visible
//   prompt           – ack payload { prompt_id, message, auto_hide_seconds, prompt_type }
//   anonymousMode    – boolean, whether event-level forced anonymous mode is on
//   allowAnonToggle  – boolean, whether per-question anon toggle is shown
//   onClose          – () => void  – manual dismiss
//   onOpenQnA        – () => void  – "Open Q&A" button
//   onSubmit         – async (content, isAnonymous) => void  – submit question

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    Box,
    Button,
    Checkbox,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Fade,
    FormControlLabel,
    IconButton,
    TextField,
    Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import QuestionAnswerIcon from "@mui/icons-material/QuestionAnswer";
import SendIcon from "@mui/icons-material/Send";

export default function QnAEngagementPromptModal({
    open,
    prompt,
    anonymousMode = false,
    allowAnonToggle = false,
    onClose,
    onOpenQnA,
    onSubmit,
}) {
    const [inputValue, setInputValue] = useState("");
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const countdownRef = useRef(null);
    const inputRef = useRef(null);
    // Track whether countdown is paused (user is typing)
    const pausedRef = useRef(false);

    const startCountdown = useCallback((onExpire) => {
        clearInterval(countdownRef.current);
        countdownRef.current = setInterval(() => {
            if (pausedRef.current) return; // skip tick while typing
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(countdownRef.current);
                    onExpire?.();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, []);

    // Reset state and start countdown when modal opens / prompt changes
    useEffect(() => {
        if (!open || !prompt) return;

        const seconds = prompt.auto_hide_seconds ?? 10;
        setInputValue("");
        setIsAnonymous(false);
        setError("");
        setSubmitting(false);
        setCountdown(seconds);
        pausedRef.current = false;

        // Auto-focus textarea after Dialog is mounted
        const focusTimer = setTimeout(() => inputRef.current?.focus(), 150);

        startCountdown(onClose);

        return () => {
            clearInterval(countdownRef.current);
            clearTimeout(focusTimer);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, prompt?.prompt_id]);

    const handleClose = useCallback(() => {
        clearInterval(countdownRef.current);
        onClose?.();
    }, [onClose]);

    const handleOpenQnA = useCallback(() => {
        clearInterval(countdownRef.current);
        onOpenQnA?.();
    }, [onOpenQnA]);

    const handleSubmit = useCallback(async () => {
        const content = inputValue.trim();
        if (!content) {
            setError("Please enter a question before submitting.");
            return;
        }

        setSubmitting(true);
        setError("");

        try {
            clearInterval(countdownRef.current);
            // Pass isAnonymous only when toggle is visible; if global anon mode, backend handles it
            await onSubmit?.(content, anonymousMode ? true : isAnonymous);
        } catch (e) {
            setError("Failed to submit question. Please try again.");
            setSubmitting(false);
            // Restart countdown from remaining time; keep paused if user is still typing
            startCountdown(onClose);
        }
    }, [inputValue, anonymousMode, isAnonymous, onSubmit, onClose, startCountdown]);

    const handleKeyDown = useCallback(
        (e) => {
            // Ctrl+Enter or Cmd+Enter submits
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                e.preventDefault();
                handleSubmit();
            }
        },
        [handleSubmit]
    );

    if (!prompt) return null;

    const showAnonCheckbox = !anonymousMode && allowAnonToggle;

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            TransitionComponent={Fade}
            transitionDuration={280}
            maxWidth="xs"
            fullWidth
            PaperProps={{
                sx: {
                    bgcolor: "rgba(16, 22, 36, 0.98)",
                    border: "1px solid rgba(99, 179, 237, 0.25)",
                    borderRadius: "16px",
                    backdropFilter: "blur(16px)",
                    boxShadow: "0 20px 60px rgba(0,0,0,0.65)",
                    overflow: "hidden",
                    // Blue accent top bar
                    "&::before": {
                        content: '""',
                        display: "block",
                        height: 3,
                        background: "linear-gradient(90deg, #63b3ed 0%, #4299e1 100%)",
                    },
                },
            }}
            // Keep focus trap inside dialog
            disableEnforceFocus={false}
            aria-labelledby="qna-prompt-modal-title"
        >
            {/* Title row */}
            <DialogTitle
                id="qna-prompt-modal-title"
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    pb: 0.5,
                    pt: 2,
                    px: 2.5,
                }}
            >
                <QuestionAnswerIcon sx={{ color: "#63b3ed", fontSize: 22 }} />
                <Typography
                    component="span"
                    sx={{
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: "1rem",
                        flex: 1,
                    }}
                >
                    Have a question?
                </Typography>

                {/* Countdown badge */}
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                        bgcolor: inputValue.length > 0 ? "rgba(99,179,237,0.1)" : "rgba(255,255,255,0.06)",
                        borderRadius: "6px",
                        px: 1,
                        py: 0.25,
                        transition: "background 0.2s",
                    }}
                >
                    <Typography
                        variant="caption"
                        sx={{
                            color: inputValue.length > 0
                                ? "#63b3ed"
                                : countdown <= 3
                                    ? "#fc8181"
                                    : "rgba(255,255,255,0.5)",
                            fontVariantNumeric: "tabular-nums",
                        }}
                    >
                        {inputValue.length > 0 ? "Paused" : `Closes in ${countdown}s`}
                    </Typography>
                </Box>

                {/* Close button */}
                <IconButton
                    size="small"
                    onClick={handleClose}
                    aria-label="Dismiss Q&A prompt"
                    sx={{
                        color: "rgba(255,255,255,0.45)",
                        p: 0.5,
                        "&:hover": { color: "#fff", bgcolor: "rgba(255,255,255,0.08)" },
                    }}
                >
                    <CloseIcon fontSize="small" />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ px: 2.5, pt: 0.5, pb: 1 }}>
                {/* Prompt body message */}
                <Typography
                    variant="body2"
                    sx={{ color: "rgba(255,255,255,0.65)", mb: 1.5, lineHeight: 1.5 }}
                >
                    {prompt.message || "Submit your question for the host or speaker."}
                </Typography>

                {/* Question textarea */}
                <TextField
                    inputRef={inputRef}
                    multiline
                    minRows={3}
                    maxRows={6}
                    fullWidth
                    placeholder="Type your question here…"
                    value={inputValue}
                    onChange={(e) => {
                        const val = e.target.value;
                        setInputValue(val);
                        if (error) setError("");
                        // Pause countdown while user is typing; resume when input is cleared
                        pausedRef.current = val.length > 0;
                    }}
                    onKeyDown={handleKeyDown}
                    disabled={submitting}
                    error={Boolean(error)}
                    helperText={error || (inputValue.trim() ? "Ctrl+Enter to submit" : "")}
                    inputProps={{ maxLength: 1000 }}
                    sx={{
                        "& .MuiOutlinedInput-root": {
                            bgcolor: "rgba(255,255,255,0.04)",
                            color: "#fff",
                            fontSize: "0.875rem",
                            borderRadius: "10px",
                            "& fieldset": { borderColor: "rgba(99,179,237,0.25)" },
                            "&:hover fieldset": { borderColor: "rgba(99,179,237,0.5)" },
                            "&.Mui-focused fieldset": { borderColor: "#63b3ed" },
                        },
                        "& .MuiFormHelperText-root": {
                            color: error ? "#fc8181" : "rgba(255,255,255,0.3)",
                            fontSize: "0.7rem",
                            mx: 0,
                            mt: 0.5,
                        },
                    }}
                />

                {/* Anonymous toggle (only when per-question anon is enabled and global anon is off) */}
                {showAnonCheckbox && (
                    <FormControlLabel
                        control={
                            <Checkbox
                                size="small"
                                checked={isAnonymous}
                                onChange={(e) => setIsAnonymous(e.target.checked)}
                                disabled={submitting}
                                sx={{
                                    color: "rgba(255,255,255,0.3)",
                                    "&.Mui-checked": { color: "#63b3ed" },
                                    p: 0.5,
                                }}
                            />
                        }
                        label={
                            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.55)" }}>
                                Ask anonymously
                            </Typography>
                        }
                        sx={{ mt: 0.75, ml: 0 }}
                    />
                )}

                {/* Forced-anonymous notice */}
                {anonymousMode && (
                    <Typography
                        variant="caption"
                        sx={{ display: "block", color: "rgba(255,255,255,0.4)", mt: 0.75 }}
                    >
                        All questions are submitted anonymously for this event.
                    </Typography>
                )}
            </DialogContent>

            <DialogActions
                sx={{
                    px: 2.5,
                    pb: 2,
                    pt: 0.5,
                    gap: 1,
                    justifyContent: "flex-end",
                }}
            >
                {/* Open Q&A panel */}
                <Button
                    size="small"
                    variant="text"
                    onClick={handleOpenQnA}
                    disabled={submitting}
                    sx={{
                        color: "rgba(255,255,255,0.55)",
                        fontSize: "0.78rem",
                        textTransform: "none",
                        "&:hover": { color: "#fff", bgcolor: "rgba(255,255,255,0.06)" },
                    }}
                >
                    Open Q&amp;A
                </Button>

                {/* Submit question */}
                <Button
                    size="small"
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={submitting || !inputValue.trim()}
                    startIcon={
                        submitting ? (
                            <CircularProgress size={14} sx={{ color: "inherit" }} />
                        ) : (
                            <SendIcon sx={{ fontSize: 15 }} />
                        )
                    }
                    sx={{
                        bgcolor: "#2b6cb0",
                        color: "#fff",
                        fontWeight: 600,
                        fontSize: "0.78rem",
                        px: 2,
                        textTransform: "none",
                        borderRadius: "8px",
                        "&:hover": { bgcolor: "#2c5282" },
                        "&.Mui-disabled": { bgcolor: "rgba(43,108,176,0.35)", color: "rgba(255,255,255,0.35)" },
                    }}
                >
                    {submitting ? "Submitting…" : "Submit Question"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
