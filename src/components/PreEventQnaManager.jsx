/**
 * PreEventQnaManager.jsx
 *
 * Attendee-facing component for managing pre-event Q&A questions.
 * Renders inside EventDetailsPage when the event has not yet started and
 * the attendee is registered.
 *
 * Features:
 *  - List own submitted pre-event questions (with status chips)
 *  - Edit own question (with optional AI polish + duplicate check)
 *  - Delete own question (confirmation modal, soft-delete)
 *  - AI Advisor: polish draft & detect near-duplicate questions
 *
 * All AI actions are private and ephemeral — nothing is auto-submitted.
 * Edit/delete UI is disabled once the event has started.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Collapse,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    Paper,
    Skeleton,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditIcon from "@mui/icons-material/Edit";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

// ─── Helpers ────────────────────────────────────────────────────────────────

function statusChip(status) {
    switch (status) {
        case "approved":
            return { label: "Approved", color: "success" };
        case "rejected":
            return { label: "Rejected", color: "error" };
        case "pending":
        default:
            return { label: "Pending Review", color: "warning" };
    }
}

// ─── Sub-component: AI Compare Panel ────────────────────────────────────────

function AiComparePanel({ original, improved, onKeepOriginal, onUseImproved }) {
    return (
        <Box
            sx={{
                mt: 2,
                p: 2,
                borderRadius: 2,
                bgcolor: "rgba(99,102,241,0.05)",
                border: "1px solid rgba(99,102,241,0.2)",
            }}
        >
            <Typography variant="caption" fontWeight={700} color="primary" sx={{ mb: 1.5, display: "block" }}>
                ✨ AI Suggestion — Side-by-Side
            </Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
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
                            minHeight: 64,
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
                            minHeight: 64,
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

// ─── Sub-component: Duplicate Check Panel ───────────────────────────────────

function DuplicatePanel({ duplicates, onClose, onEditExisting }) {
    if (!duplicates || duplicates.length === 0) return null;

    return (
        <Box
            sx={{
                mt: 2,
                p: 2,
                borderRadius: 2,
                bgcolor: "rgba(245,158,11,0.07)",
                border: "1px solid rgba(245,158,11,0.3)",
            }}
        >
            <Typography variant="caption" fontWeight={700} color="warning.dark" sx={{ mb: 1.5, display: "block" }}>
                ⚠️ Similar Question Detected
            </Typography>
            {duplicates.map((dup) => (
                <Box key={dup.question_id} sx={{ mb: 1.5 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        <b>Existing:</b> {dup.existing_text}
                    </Typography>
                    <Typography variant="caption" color="warning.dark">
                        {dup.similarity_reason}
                    </Typography>
                    {dup.suggested_merge && (
                        <Alert severity="info" sx={{ mt: 1, py: 0.5 }} icon={<CompareArrowsIcon fontSize="small" />}>
                            <Typography variant="caption">
                                <b>Suggested merged version:</b> {dup.suggested_merge}
                            </Typography>
                        </Alert>
                    )}
                    <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap", gap: 0.5 }}>
                        <Button size="small" variant="outlined" onClick={onClose} sx={{ textTransform: "none" }}>
                            Keep both
                        </Button>
                        <Button
                            size="small"
                            variant="outlined"
                            color="warning"
                            onClick={() => onEditExisting(dup)}
                            sx={{ textTransform: "none" }}
                        >
                            Edit existing
                        </Button>
                        <Button size="small" variant="outlined" color="error" onClick={onClose} sx={{ textTransform: "none" }}>
                            Cancel
                        </Button>
                    </Stack>
                </Box>
            ))}
        </Box>
    );
}

// ─── Sub-component: Edit Dialog ──────────────────────────────────────────────

function EditDialog({
    open,
    question,
    eventId,
    token,
    isBeforeEventStart,
    qnaModerationEnabled,
    onClose,
    onSaved,
}) {
    const [content, setContent] = useState(question?.content || "");
    const [isAnonymous, setIsAnonymous] = useState(question?.is_anonymous || false);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState(null);

    // AI polish state
    const [polishing, setPolishing] = useState(false);
    const [polishResult, setPolishResult] = useState(null); // { original, improved }
    const [polishError, setPolishError] = useState(null);

    // AI duplicate check state
    const [checking, setChecking] = useState(false);
    const [dupResult, setDupResult] = useState(null);
    const [dupError, setDupError] = useState(null);

    useEffect(() => {
        if (open && question) {
            setContent(question.content || "");
            setIsAnonymous(question.is_anonymous || false);
            setSaveError(null);
            setPolishResult(null);
            setPolishError(null);
            setDupResult(null);
            setDupError(null);
        }
    }, [open, question]);

    const handlePolish = async () => {
        if (!content.trim() || content.trim().length < 5) return;
        setPolishing(true);
        setPolishError(null);
        setPolishResult(null);
        try {
            const res = await fetch(`${API_BASE}/interactions/questions/polish-draft/`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ event_id: eventId, content: content.trim() }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || "AI unavailable");
            if (data.changed) {
                setPolishResult({ original: data.original, improved: data.improved });
            } else {
                setPolishError("Your question already looks great — no changes needed!");
            }
        } catch (e) {
            setPolishError(e.message || "AI improvement unavailable. Please try again.");
        } finally {
            setPolishing(false);
        }
    };

    const handleDuplicateCheck = async () => {
        if (!content.trim() || content.trim().length < 5) return;
        setChecking(true);
        setDupError(null);
        setDupResult(null);
        try {
            const res = await fetch(`${API_BASE}/interactions/questions/pre-event-duplicate-check/`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ event_id: eventId, content: content.trim() }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || "AI unavailable");
            setDupResult(data);
        } catch (e) {
            setDupError(e.message || "Duplicate check unavailable. Please try again.");
        } finally {
            setChecking(false);
        }
    };

    const handleSave = async () => {
        if (!content.trim()) return;
        setSaving(true);
        setSaveError(null);
        try {
            const res = await fetch(
                `${API_BASE}/interactions/questions/${question.id}/pre-event-edit/`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ content: content.trim(), is_anonymous: isAnonymous }),
                }
            );
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || "Failed to save");
            onSaved(data);
        } catch (e) {
            setSaveError(e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle sx={{ fontWeight: 700 }}>
                Edit Pre-Event Question
                {!isBeforeEventStart && (
                    <Chip label="Event started — read only" color="default" size="small" sx={{ ml: 1 }} />
                )}
            </DialogTitle>
            <DialogContent dividers>
                {qnaModerationEnabled && (
                    <Alert severity="info" sx={{ mb: 2 }} icon={<InfoOutlinedIcon fontSize="small" />}>
                        Editing will reset your question to <b>Pending Review</b> — the host will re-approve it.
                    </Alert>
                )}

                <TextField
                    fullWidth
                    multiline
                    minRows={3}
                    maxRows={8}
                    label="Your question"
                    value={content}
                    onChange={(e) => {
                        setContent(e.target.value);
                        setPolishResult(null);
                        setDupResult(null);
                    }}
                    disabled={!isBeforeEventStart || saving}
                    inputProps={{ maxLength: 1000 }}
                    helperText={`${content.length}/1000`}
                    sx={{ mb: 1 }}
                />

                {isBeforeEventStart && (
                    <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                        <Button
                            size="small"
                            variant="outlined"
                            startIcon={polishing ? <CircularProgress size={14} /> : <AutoFixHighIcon fontSize="small" />}
                            onClick={handlePolish}
                            disabled={polishing || content.trim().length < 5}
                            sx={{ textTransform: "none", borderColor: "#6366f1", color: "#6366f1" }}
                        >
                            {polishing ? "Improving…" : "Improve with AI"}
                        </Button>
                        <Button
                            size="small"
                            variant="outlined"
                            startIcon={checking ? <CircularProgress size={14} /> : <CompareArrowsIcon fontSize="small" />}
                            onClick={handleDuplicateCheck}
                            disabled={checking || content.trim().length < 5}
                            sx={{ textTransform: "none" }}
                        >
                            {checking ? "Checking…" : "Check duplicates"}
                        </Button>
                    </Stack>
                )}

                {polishError && (
                    <Alert severity="info" sx={{ mb: 1 }}>
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

                {dupError && (
                    <Alert severity="warning" sx={{ mt: 1 }}>
                        {dupError}
                    </Alert>
                )}

                {dupResult && !dupResult.has_duplicates && (
                    <Alert severity="success" icon={<CheckCircleOutlineIcon />} sx={{ mt: 1 }}>
                        No similar questions found — this looks unique!
                    </Alert>
                )}

                {dupResult?.has_duplicates && (
                    <DuplicatePanel
                        duplicates={dupResult.duplicates}
                        onClose={() => setDupResult(null)}
                        onEditExisting={(dup) => {
                            // Fill editor with existing question text so user can start from it
                            setContent(dup.existing_text);
                            setDupResult(null);
                        }}
                    />
                )}

                {saveError && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                        {saveError}
                    </Alert>
                )}
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={onClose} sx={{ textTransform: "none" }}>
                    Cancel
                </Button>
                {isBeforeEventStart && (
                    <Button
                        onClick={handleSave}
                        variant="contained"
                        disabled={saving || !content.trim() || content.trim() === question?.content}
                        sx={{ textTransform: "none", bgcolor: "#10b8a6", "&:hover": { bgcolor: "#0ea5a4" } }}
                    >
                        {saving ? "Saving…" : "Save changes"}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
}

// ─── Sub-component: Delete Confirmation Dialog ───────────────────────────────

function DeleteDialog({ open, question, token, onClose, onDeleted }) {
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState(null);

    const handleConfirm = async () => {
        setDeleting(true);
        setError(null);
        try {
            const res = await fetch(
                `${API_BASE}/interactions/questions/${question.id}/pre-event-delete/`,
                {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            if (res.status === 204) {
                onDeleted(question.id);
            } else {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.detail || "Failed to delete question.");
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setDeleting(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ fontWeight: 700 }}>Delete question?</DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    This will permanently remove your pre-event question. This action cannot be undone.
                </Typography>
                {question && (
                    <Paper
                        elevation={0}
                        sx={{ p: 1.5, bgcolor: "grey.50", border: "1px solid", borderColor: "divider", borderRadius: 1.5 }}
                    >
                        <Typography variant="body2" sx={{ fontStyle: "italic" }}>
                            "{question.content}"
                        </Typography>
                    </Paper>
                )}
                {error && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                        {error}
                    </Alert>
                )}
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={onClose} sx={{ textTransform: "none" }}>
                    Cancel
                </Button>
                <Button
                    onClick={handleConfirm}
                    variant="contained"
                    color="error"
                    disabled={deleting}
                    sx={{ textTransform: "none" }}
                >
                    {deleting ? "Deleting…" : "Yes, delete"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

// ─── Main Component ──────────────────────────────────────────────────────────

/**
 * @param {object} props
 * @param {number}  props.eventId
 * @param {string}  props.token             JWT access token
 * @param {boolean} props.isBeforeEventStart True when event has not yet started
 * @param {boolean} props.qnaModerationEnabled
 */
export default function PreEventQnaManager({
    eventId,
    token,
    isBeforeEventStart,
    qnaModerationEnabled,
}) {
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);

    const [editTarget, setEditTarget] = useState(null);   // question being edited
    const [deleteTarget, setDeleteTarget] = useState(null); // question being deleted

    const [advisorOpen, setAdvisorOpen] = useState(false);

    const loadQuestions = useCallback(async () => {
        if (!eventId || !token) return;
        setLoading(true);
        setFetchError(null);
        try {
            const res = await fetch(
                `${API_BASE}/interactions/questions/my-pre-event/?event_id=${eventId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!res.ok) {
                const d = await res.json().catch(() => ({}));
                throw new Error(d.detail || "Could not load your questions.");
            }
            setQuestions(await res.json());
        } catch (e) {
            setFetchError(e.message);
        } finally {
            setLoading(false);
        }
    }, [eventId, token]);

    useEffect(() => {
        loadQuestions();
    }, [loadQuestions]);

    const handleSaved = (updated) => {
        setQuestions((prev) =>
            prev.map((q) =>
                q.id === updated.id ? { ...q, ...updated } : q
            )
        );
        setEditTarget(null);
    };

    const handleDeleted = (deletedId) => {
        setQuestions((prev) => prev.filter((q) => q.id !== deletedId));
        setDeleteTarget(null);
    };

    // ── Render ─────────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <Box sx={{ mt: 2 }}>
                <Skeleton variant="text" width={220} height={24} />
                <Skeleton variant="rounded" height={72} sx={{ mt: 1 }} />
                <Skeleton variant="rounded" height={72} sx={{ mt: 1 }} />
            </Box>
        );
    }

    if (fetchError) {
        return (
            <Alert severity="warning" sx={{ mt: 2 }}>
                {fetchError}
            </Alert>
        );
    }

    if (questions.length === 0) {
        return (
            <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
                    You haven't submitted any pre-event questions yet.
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ mt: 2 }}>
            {/* Section Header */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                <Typography variant="subtitle2" fontWeight={700} color="text.primary">
                    Your pre-event questions ({questions.length})
                </Typography>
                <Tooltip title="The AI Advisor helps you polish questions and find duplicates. It never auto-submits or auto-modifies anything.">
                    <IconButton size="small" onClick={() => setAdvisorOpen((v) => !v)}>
                        <InfoOutlinedIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Stack>

            {/* AI Advisor info banner (collapsible) */}
            <Collapse in={advisorOpen}>
                <Alert
                    severity="info"
                    icon={<AutoFixHighIcon fontSize="small" />}
                    onClose={() => setAdvisorOpen(false)}
                    sx={{ mb: 1.5 }}
                >
                    <Typography variant="caption">
                        <strong>Q&A AI Advisor</strong> — While editing, you can:
                        <br />• <b>Improve with AI</b> — polish clarity/grammar, see a side-by-side comparison, then decide.
                        <br />• <b>Check duplicates</b> — detect similar questions you already submitted and merge/keep as you see fit.
                        <br />AI is private to you. Nothing changes without your confirmation.
                    </Typography>
                </Alert>
            </Collapse>

            {/* Disabled notice after event started */}
            {!isBeforeEventStart && (
                <Alert severity="info" sx={{ mb: 1.5 }} icon={<InfoOutlinedIcon fontSize="small" />}>
                    The event has started — pre-event question management is now closed.
                </Alert>
            )}

            {/* Question list */}
            <Stack spacing={1.5}>
                {questions.map((q) => {
                    const chip = statusChip(q.moderation_status);
                    return (
                        <Paper
                            key={q.id}
                            elevation={0}
                            sx={{
                                p: 2,
                                border: "1px solid",
                                borderColor: "divider",
                                borderRadius: 2,
                                bgcolor: "background.paper",
                            }}
                        >
                            <Stack direction="row" spacing={1} alignItems="flex-start">
                                {/* Content */}
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 500, wordBreak: "break-word" }}>
                                        {q.content}
                                    </Typography>
                                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1, flexWrap: "wrap" }}>
                                        <Chip
                                            label={chip.label}
                                            color={chip.color}
                                            size="small"
                                            variant="outlined"
                                            sx={{ height: 20, fontSize: "0.7rem" }}
                                        />
                                        {q.is_anonymous && (
                                            <Chip
                                                label="Anonymous"
                                                size="small"
                                                variant="outlined"
                                                sx={{ height: 20, fontSize: "0.7rem" }}
                                            />
                                        )}
                                        <Typography variant="caption" color="text.secondary">
                                            {dayjs(q.created_at).fromNow()}
                                        </Typography>
                                    </Stack>
                                </Box>

                                {/* Actions */}
                                <Stack direction="row" spacing={0.5} flexShrink={0}>
                                    <Tooltip title={isBeforeEventStart ? "Edit" : "Event has started"}>
                                        <span>
                                            <IconButton
                                                size="small"
                                                disabled={!isBeforeEventStart}
                                                onClick={() => setEditTarget(q)}
                                                sx={{ color: "primary.main" }}
                                            >
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                    <Tooltip title={isBeforeEventStart ? "Delete" : "Event has started"}>
                                        <span>
                                            <IconButton
                                                size="small"
                                                disabled={!isBeforeEventStart}
                                                onClick={() => setDeleteTarget(q)}
                                                sx={{ color: "error.main" }}
                                            >
                                                <DeleteOutlineIcon fontSize="small" />
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                </Stack>
                            </Stack>
                        </Paper>
                    );
                })}
            </Stack>

            {/* Edit Dialog */}
            {editTarget && (
                <EditDialog
                    open={Boolean(editTarget)}
                    question={editTarget}
                    eventId={eventId}
                    token={token}
                    isBeforeEventStart={isBeforeEventStart}
                    qnaModerationEnabled={qnaModerationEnabled}
                    onClose={() => setEditTarget(null)}
                    onSaved={handleSaved}
                />
            )}

            {/* Delete Confirmation Dialog */}
            {deleteTarget && (
                <DeleteDialog
                    open={Boolean(deleteTarget)}
                    question={deleteTarget}
                    token={token}
                    onClose={() => setDeleteTarget(null)}
                    onDeleted={handleDeleted}
                />
            )}
        </Box>
    );
}
