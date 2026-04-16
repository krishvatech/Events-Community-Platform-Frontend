// src/components/QnAEngagementPromptBanner.jsx
//
// Slim dismissible banner that prompts attendees to submit a Q&A question.
// Rendered at the bottom of LiveMeetingPage when a host triggers it.
//
// Props:
//   prompt          – ack response payload { prompt_id, message, auto_hide_seconds }
//   onClose         – called when attendee manually closes banner (dismiss)
//   onOpenQnA       – called when attendee clicks "Open Q&A"

import React, { useEffect, useRef } from "react";
import {
    Box,
    Button,
    Fade,
    IconButton,
    Paper,
    Stack,
    Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import QuestionAnswerIcon from "@mui/icons-material/QuestionAnswer";

/**
 * QnAEngagementPromptBanner
 *
 * A slim, dark-themed, non-blocking bottom banner that nudges attendees
 * to submit a question in the live Q&A.
 *
 * • Auto-hides after `prompt.auto_hide_seconds` seconds.
 * • Dismissed immediately on close (✕) or "Open Q&A" click.
 * • Timer is cleared safely on unmount.
 */
export default function QnAEngagementPromptBanner({ prompt, onClose, onOpenQnA }) {
    const timerRef = useRef(null);

    // Start auto-hide timer when banner mounts (or prompt changes)
    useEffect(() => {
        if (!prompt) return;

        const hideAfterMs = ((prompt.auto_hide_seconds ?? 10) * 1000);

        timerRef.current = setTimeout(() => {
            onClose?.();
        }, hideAfterMs);

        return () => {
            clearTimeout(timerRef.current);
        };
    }, [prompt, onClose]);

    if (!prompt) return null;

    const handleClose = () => {
        clearTimeout(timerRef.current);
        onClose?.();
    };

    const handleOpenQnA = () => {
        clearTimeout(timerRef.current);
        onOpenQnA?.();
    };

    return (
        <Fade in timeout={350}>
            <Paper
                elevation={8}
                sx={{
                    position: "fixed",
                    bottom: 16,
                    left: "50%",
                    transform: "translateX(-50%)",
                    zIndex: 9999,
                    // Slim horizontal banner – max 640 px wide, never wider than viewport
                    width: { xs: "calc(100vw - 32px)", sm: 540, md: 620 },
                    bgcolor: "rgba(18, 24, 38, 0.97)",
                    border: "1px solid rgba(99, 179, 237, 0.30)",
                    borderRadius: "12px",
                    backdropFilter: "blur(12px)",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.55)",
                    overflow: "hidden",
                    // Accent bar on left edge
                    "&::before": {
                        content: '""',
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: 4,
                        height: "100%",
                        bgcolor: "#63b3ed",
                        borderRadius: "12px 0 0 12px",
                    },
                }}
            >
                <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1.5}
                    sx={{ pl: 2.5, pr: 1, py: 1.25 }}
                >
                    {/* Icon */}
                    <QuestionAnswerIcon
                        sx={{ color: "#63b3ed", fontSize: 22, flexShrink: 0 }}
                        aria-hidden
                    />

                    {/* Message */}
                    <Typography
                        variant="body2"
                        sx={{
                            color: "rgba(255,255,255,0.92)",
                            flex: 1,
                            minWidth: 0,
                            fontWeight: 500,
                            lineHeight: 1.4,
                        }}
                    >
                        {prompt.message || "Have a question? Submit it in Q&A now."}
                    </Typography>

                    {/* Open Q&A Action */}
                    <Button
                        size="small"
                        variant="contained"
                        onClick={handleOpenQnA}
                        sx={{
                            flexShrink: 0,
                            bgcolor: "#2b6cb0",
                            color: "#fff",
                            fontWeight: 600,
                            fontSize: "0.75rem",
                            px: 1.5,
                            py: 0.5,
                            borderRadius: "8px",
                            textTransform: "none",
                            whiteSpace: "nowrap",
                            "&:hover": {
                                bgcolor: "#2c5282",
                            },
                        }}
                    >
                        Open Q&amp;A
                    </Button>

                    {/* Close Button */}
                    <IconButton
                        size="small"
                        onClick={handleClose}
                        aria-label="Dismiss Q&A prompt"
                        sx={{
                            color: "rgba(255,255,255,0.55)",
                            flexShrink: 0,
                            p: 0.5,
                            "&:hover": {
                                color: "#fff",
                                bgcolor: "rgba(255,255,255,0.08)",
                            },
                        }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Stack>
            </Paper>
        </Fade>
    );
}
