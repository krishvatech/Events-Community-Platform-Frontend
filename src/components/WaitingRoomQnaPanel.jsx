/**
 * WaitingRoomQnaPanel.jsx
 *
 * Inline Q&A panel rendered in the waiting room (WaitingForHost /
 * WaitingRoomScreen components inside LiveMeetingPage).
 *
 * Features — identical to the Event Detail Page experience:
 *   ✅ Submit a question (with min 5 / max 1000 chars)
 *   ✅ Immediately shows in "Your questions" list below
 *   ✅ Edit each question (inline text area, Save/Cancel)
 *   ✅ Delete each question (confirmation step)
 *   ✅ "Improve with AI" → side-by-side comparison, user picks
 *   ✅ "Check duplicates" → similarity warnings, merge suggestion
 *   ✅ Status chip (Pending / Approved / Rejected) per question
 *   ✅ Disabled after event starts (all controls locked)
 *
 * Design: dark glassmorphism palette to match the waiting room.
 * Everything is self-contained — no modal, no prop drilling.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Collapse,
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
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditIcon from "@mui/icons-material/Edit";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import CloseIcon from "@mui/icons-material/Close";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

const API_ROOT = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");

function toApi(path) {
    const rel = String(path).replace(/^\/+/, "");
    return `${API_ROOT}/${rel.replace(/^api\/+/, "")}`;
}

function getToken() {
    return localStorage.getItem("access") || localStorage.getItem("access_token") || "";
}

function authH() {
    const t = getToken();
    return t ? { Authorization: `Bearer ${t}` } : {};
}

// ─── Palette helpers ─────────────────────────────────────────────────────────

const dark = {
    card: "rgba(15, 23, 42, 0.70)",
    border: "rgba(255,255,255,0.10)",
    inputBg: "rgba(255,255,255,0.05)",
    text: "rgba(255,255,255,0.88)",
    subtext: "rgba(255,255,255,0.55)",
    teal: "#10b8a6",
    purple: "#818cf8",
};
const QUESTION_ROWS_VISIBLE_BY_DEFAULT = 2;
const QUESTION_ROW_ESTIMATED_HEIGHT = 88;
const QUESTION_LIST_MAX_HEIGHT = QUESTION_ROWS_VISIBLE_BY_DEFAULT * QUESTION_ROW_ESTIMATED_HEIGHT;

function statusChip(s) {
    switch (s) {
        case "approved": return { label: "Approved", color: "#22c55e" };
        case "rejected": return { label: "Rejected", color: "#ef4444" };
        default: return { label: "Pending Review", color: "#f59e0b" };
    }
}

// ─── AI Compare Panel ─────────────────────────────────────────────────────────

function AiComparePanel({ original, improved, onKeep, onUse }) {
    return (
        <Box
            sx={{
                mt: 1.5,
                p: 1.5,
                borderRadius: 2,
                bgcolor: "rgba(129,140,248,0.07)",
                border: "1px solid rgba(129,140,248,0.22)",
            }}
        >
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: dark.purple, mb: 1 }}>
                ✨ AI Suggestion — Side-by-Side
            </Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
                {[
                    { label: "Original", text: original, borderColor: dark.border, bg: "rgba(255,255,255,0.03)" },
                    { label: "AI Improved", text: improved, borderColor: "rgba(129,140,248,0.35)", bg: "rgba(129,140,248,0.05)" },
                ].map(({ label, text, borderColor, bg }) => (
                    <Box key={label}>
                        <Typography sx={{ fontSize: 10, color: dark.subtext, fontWeight: 600, mb: 0.5 }}>
                            {label}
                        </Typography>
                        <Box
                            sx={{
                                p: 1.2,
                                borderRadius: 1.5,
                                bgcolor: bg,
                                border: `1px solid ${borderColor}`,
                                minHeight: 48,
                            }}
                        >
                            <Typography sx={{ fontSize: 12, color: dark.text, whiteSpace: "pre-wrap" }}>
                                {text}
                            </Typography>
                        </Box>
                    </Box>
                ))}
            </Box>
            <Stack direction="row" spacing={1} sx={{ mt: 1.2 }}>
                <Button size="small" variant="outlined" onClick={onKeep}
                    sx={{ textTransform: "none", flex: 1, fontSize: 11, color: dark.subtext, borderColor: dark.border }}>
                    Keep original
                </Button>
                <Button size="small" variant="contained" onClick={onUse}
                    sx={{ textTransform: "none", flex: 1, fontSize: 11, bgcolor: dark.purple, "&:hover": { bgcolor: "#6366f1" } }}>
                    Use AI version
                </Button>
            </Stack>
        </Box>
    );
}

// ─── Duplicate Panel ──────────────────────────────────────────────────────────

function DuplicatePanel({ duplicates, onDismiss, onUseExisting }) {
    if (!duplicates?.length) return null;
    return (
        <Box
            sx={{
                mt: 1.5,
                p: 1.5,
                borderRadius: 2,
                bgcolor: "rgba(245,158,11,0.07)",
                border: "1px solid rgba(245,158,11,0.3)",
            }}
        >
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#f59e0b", mb: 1 }}>
                ⚠️ Similar Question by Another Participant Detected
            </Typography>
            {duplicates.map((dup) => (
                <Box key={dup.question_id} sx={{ mb: 1 }}>
                    <Typography sx={{ fontSize: 12, color: dark.subtext, mb: 0.5 }}>
                        <b style={{ color: dark.text }}>Existing:</b> {dup.existing_text}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: "#f59e0b" }}>{dup.similarity_reason}</Typography>
                    {dup.suggested_merge && (
                        <Box sx={{ mt: 0.8, p: 1, borderRadius: 1.5, bgcolor: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.2)" }}>
                            <Typography sx={{ fontSize: 11, color: dark.purple }}>
                                <b>Suggested merge:</b> {dup.suggested_merge}
                            </Typography>
                        </Box>
                    )}
                    <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: "wrap", gap: 0.5 }}>
                        <Button size="small" onClick={onDismiss} sx={{ fontSize: 11, textTransform: "none", color: dark.subtext }}>Still post mine</Button>
                        <Button size="small" color="warning" onClick={() => onUseExisting(dup.existing_text)} sx={{ fontSize: 11, textTransform: "none" }}>Let me edit my question</Button>
                        <Button size="small" color="error" onClick={onDismiss} sx={{ fontSize: 11, textTransform: "none" }}>Delete my question</Button>
                    </Stack>
                </Box>
            ))}
        </Box>
    );
}

// ─── Single Question Row ──────────────────────────────────────────────────────

function QuestionRow({ q, isBeforeEventStart, token, eventId, onUpdated, onDeleted }) {
    const [editing, setEditing] = useState(false);
    const [editText, setEditText] = useState(q.content);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState(null);

    // AI polish state
    const [polishing, setPolishing] = useState(false);
    const [polishResult, setPolishResult] = useState(null);
    const [polishMsg, setPolishMsg] = useState(null);

    // AI duplicate state
    const [checking, setChecking] = useState(false);
    const [dupResult, setDupResult] = useState(null);
    const [dupError, setDupError] = useState(null);

    const chip = statusChip(q.moderation_status);

    const startEdit = () => {
        setEditText(q.content);
        setPolishResult(null);
        setPolishMsg(null);
        setDupResult(null);
        setSaveError(null);
        setEditing(true);
    };

    const handlePolish = async () => {
        const text = editText.trim();
        if (text.length < 5) return;
        setPolishing(true);
        setPolishMsg(null);
        setPolishResult(null);
        try {
            const res = await fetch(toApi("interactions/questions/polish-draft/"), {
                method: "POST",
                headers: { "Content-Type": "application/json", ...authH() },
                body: JSON.stringify({ event_id: eventId, content: text }),
            });
            const d = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(d.detail || "AI unavailable");
            if (d.changed) setPolishResult({ original: d.original, improved: d.improved });
            else setPolishMsg("Your question already looks great!");
        } catch (e) {
            setPolishMsg(e.message);
        } finally {
            setPolishing(false);
        }
    };

    const handleDupCheck = async () => {
        const text = editText.trim();
        if (text.length < 5) return;
        setChecking(true);
        setDupResult(null);
        setDupError(null);
        try {
            const res = await fetch(toApi("interactions/questions/pre-event-duplicate-check/"), {
                method: "POST",
                headers: { "Content-Type": "application/json", ...authH() },
                body: JSON.stringify({ event_id: eventId, content: text }),
            });
            const d = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(d.detail || "Check unavailable");
            setDupResult(d);
        } catch (e) {
            setDupError(e.message);
        } finally {
            setChecking(false);
        }
    };

    const handleSave = async () => {
        const text = editText.trim();
        if (!text || text.length < 5) return;
        setSaving(true);
        setSaveError(null);
        try {
            const res = await fetch(toApi(`interactions/questions/${q.id}/pre-event-edit/`), {
                method: "PATCH",
                headers: { "Content-Type": "application/json", ...authH() },
                body: JSON.stringify({ content: text }),
            });
            const d = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(d.detail || "Save failed");
            onUpdated({ ...q, ...d });
            setEditing(false);
        } catch (e) {
            setSaveError(e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        setDeleteError(null);
        try {
            const res = await fetch(toApi(`interactions/questions/${q.id}/pre-event-delete/`), {
                method: "DELETE",
                headers: authH(),
            });
            if (res.status === 204) {
                onDeleted(q.id);
            } else {
                const d = await res.json().catch(() => ({}));
                throw new Error(d.detail || "Delete failed");
            }
        } catch (e) {
            setDeleteError(e.message);
            setDeleting(false);
        }
    };

    return (
        <Box
            sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: "rgba(255,255,255,0.04)",
                border: `1px solid ${dark.border}`,
                textAlign: "left",
            }}
        >
            {editing ? (
                /* ── Edit mode ── */
                <Box>
                    <TextField
                        fullWidth
                        multiline
                        minRows={2}
                        maxRows={6}
                        value={editText}
                        onChange={(e) => {
                            setEditText(e.target.value);
                            setPolishResult(null);
                            setDupResult(null);
                        }}
                        disabled={saving}
                        inputProps={{ maxLength: 1000 }}
                        sx={{
                            "& .MuiInputBase-root": { bgcolor: dark.inputBg, color: dark.text, borderRadius: 1.5 },
                            "& .MuiOutlinedInput-notchedOutline": { borderColor: dark.border },
                            "& .MuiInputBase-root.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: dark.teal },
                        }}
                    />

                    {/* AI buttons */}
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                        <Button
                            size="small"
                            startIcon={polishing ? <CircularProgress size={12} sx={{ color: dark.purple }} /> : <AutoFixHighIcon sx={{ fontSize: 14 }} />}
                            onClick={handlePolish}
                            disabled={polishing || editText.trim().length < 5 || saving}
                            sx={{ textTransform: "none", fontSize: 11, color: dark.purple, borderColor: "rgba(129,140,248,0.4)", border: "1px solid" }}
                        >
                            {polishing ? "Improving…" : "Improve with AI"}
                        </Button>
                        <Button
                            size="small"
                            startIcon={checking ? <CircularProgress size={12} sx={{ color: dark.subtext }} /> : <CompareArrowsIcon sx={{ fontSize: 14 }} />}
                            onClick={handleDupCheck}
                            disabled={checking || editText.trim().length < 5 || saving}
                            sx={{ textTransform: "none", fontSize: 11, color: dark.subtext, borderColor: dark.border, border: "1px solid" }}
                        >
                            {checking ? "Checking…" : "Check duplicates"}
                        </Button>
                    </Stack>

                    {polishMsg && (
                        <Typography sx={{ fontSize: 11, color: dark.subtext, mt: 0.8 }}>{polishMsg}</Typography>
                    )}
                    {polishResult && (
                        <AiComparePanel
                            original={polishResult.original}
                            improved={polishResult.improved}
                            onKeep={() => setPolishResult(null)}
                            onUse={() => { setEditText(polishResult.improved); setPolishResult(null); }}
                        />
                    )}
                    {dupError && (
                        <Typography sx={{ fontSize: 11, color: "#f59e0b", mt: 0.8 }}>{dupError}</Typography>
                    )}
                    {dupResult && !dupResult.has_duplicates && (
                        <Typography sx={{ fontSize: 11, color: "#22c55e", mt: 0.8 }}>✓ No duplicates found</Typography>
                    )}
                    {dupResult?.has_duplicates && (
                        <DuplicatePanel
                            duplicates={dupResult.duplicates}
                            onDismiss={() => setDupResult(null)}
                            onUseExisting={(t) => { setEditText(t); setDupResult(null); }}
                        />
                    )}
                    {saveError && (
                        <Typography sx={{ fontSize: 11, color: "#ef4444", mt: 0.8 }}>{saveError}</Typography>
                    )}

                    {/* Save / Cancel */}
                    <Stack direction="row" spacing={1} sx={{ mt: 1.2 }}>
                        <Button size="small" onClick={() => setEditing(false)} disabled={saving}
                            sx={{ textTransform: "none", fontSize: 11, color: dark.subtext, borderColor: dark.border, border: "1px solid" }}>
                            Cancel
                        </Button>
                        <Button
                            size="small"
                            onClick={handleSave}
                            variant="contained"
                            disabled={saving || !editText.trim() || editText.trim() === q.content}
                            sx={{ textTransform: "none", fontSize: 11, bgcolor: dark.teal, "&:hover": { bgcolor: "#0ea5a4" } }}
                        >
                            {saving ? "Saving…" : "Save changes"}
                        </Button>
                    </Stack>
                </Box>
            ) : confirmDelete ? (
                /* ── Delete confirm ── */
                <Box>
                    <Typography sx={{ fontSize: 12, color: "#f59e0b", mb: 0.8 }}>
                        Delete this question? This cannot be undone.
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: dark.subtext, fontStyle: "italic", mb: 1 }}>
                        "{q.content}"
                    </Typography>
                    {deleteError && (
                        <Typography sx={{ fontSize: 11, color: "#ef4444", mb: 0.8 }}>{deleteError}</Typography>
                    )}
                    <Stack direction="row" spacing={1}>
                        <Button size="small" onClick={() => setConfirmDelete(false)} disabled={deleting}
                            sx={{ textTransform: "none", fontSize: 11, color: dark.subtext }}>
                            Cancel
                        </Button>
                        <Button size="small" variant="contained" color="error" onClick={handleDelete} disabled={deleting}
                            sx={{ textTransform: "none", fontSize: 11 }}>
                            {deleting ? "Deleting…" : "Yes, delete"}
                        </Button>
                    </Stack>
                </Box>
            ) : (
                /* ── View mode ── */
                <Stack direction="row" spacing={1} alignItems="flex-start">
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: 13, color: dark.text, wordBreak: "break-word", fontWeight: 500 }}>
                            {q.content}
                        </Typography>
                        <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mt: 0.8, flexWrap: "wrap" }}>
                            {q.moderation_status !== "approved" && (
                                <Box
                                    sx={{
                                        px: 0.8,
                                        py: 0.2,
                                        borderRadius: 999,
                                        border: `1px solid ${chip.color}44`,
                                        bgcolor: `${chip.color}18`,
                                    }}
                                >
                                    <Typography sx={{ fontSize: 10, fontWeight: 700, color: chip.color }}>
                                        {chip.label}
                                    </Typography>
                                </Box>
                            )}
                            {q.is_anonymous && (
                                <Box sx={{ px: 0.8, py: 0.2, borderRadius: 999, border: `1px solid ${dark.border}`, bgcolor: "rgba(255,255,255,0.04)" }}>
                                    <Typography sx={{ fontSize: 10, color: dark.subtext }}>Anonymous</Typography>
                                </Box>
                            )}
                            <Typography sx={{ fontSize: 10, color: dark.subtext }}>
                                {dayjs(q.created_at).fromNow()}
                            </Typography>
                        </Stack>
                    </Box>
                    {isBeforeEventStart && (
                        <Stack direction="row" spacing={0.3} flexShrink={0}>
                            <Tooltip title="Edit">
                                <IconButton size="small" onClick={startEdit} sx={{ color: dark.purple, p: 0.4 }}>
                                    <EditIcon sx={{ fontSize: 15 }} />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                                <IconButton size="small" onClick={() => setConfirmDelete(true)} sx={{ color: "#ef4444", p: 0.4 }}>
                                    <DeleteOutlineIcon sx={{ fontSize: 15 }} />
                                </IconButton>
                            </Tooltip>
                        </Stack>
                    )}
                </Stack>
            )}
        </Box>
    );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

/**
 * Props:
 *   eventId              {number}  — event pk
 *   isBeforeEventStart   {boolean} — false after event.start_time
 *   qnaModerationEnabled {boolean}
 *   token                {string}  — JWT (passed for SSR compat; also read from localStorage)
 */
export default function WaitingRoomQnaPanel({
    eventId,
    isBeforeEventStart = true,
    qnaModerationEnabled = false,
}) {
    const [questions, setQuestions] = useState([]);
    const [loadState, setLoadState] = useState("loading"); // loading | ok | error
    const [fetchError, setFetchError] = useState(null);

    // Submit form state
    const [draft, setDraft] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    const [submitSuccess, setSubmitSuccess] = useState(false);

    // AI polish state (for submit form)
    const [polishing, setPolishing] = useState(false);
    const [polishResult, setPolishResult] = useState(null);
    const [polishMsg, setPolishMsg] = useState(null);

    // AI dup state (for submit form)
    const [checking, setChecking] = useState(false);
    const [dupResult, setDupResult] = useState(null);
    const [dupError, setDupError] = useState(null);

    // Advisor info toggle
    const [advisorOpen, setAdvisorOpen] = useState(false);

    // Load user's existing questions
    const loadQuestions = useCallback(async () => {
        if (!eventId) return;
        setLoadState("loading");
        try {
            const res = await fetch(toApi(`interactions/questions/my-pre-event/?event_id=${eventId}`), {
                headers: authH(),
            });
            if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.detail || "Failed to load"); }
            setQuestions(await res.json());
            setLoadState("ok");
        } catch (e) {
            setFetchError(e.message);
            setLoadState("error");
        }
    }, [eventId]);

    useEffect(() => { loadQuestions(); }, [loadQuestions]);

    // ── Submit form AI ──────────────────────────────────────────────────────────

    const handlePolish = async () => {
        const text = draft.trim();
        if (text.length < 5) return;
        setPolishing(true);
        setPolishMsg(null);
        setPolishResult(null);
        try {
            const res = await fetch(toApi("interactions/questions/polish-draft/"), {
                method: "POST",
                headers: { "Content-Type": "application/json", ...authH() },
                body: JSON.stringify({ event_id: eventId, content: text }),
            });
            const d = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(d.detail || "AI unavailable");
            if (d.changed) setPolishResult({ original: d.original, improved: d.improved });
            else setPolishMsg("Your question already looks great!");
        } catch (e) {
            setPolishMsg(e.message);
        } finally {
            setPolishing(false);
        }
    };

    const handleDupCheck = async () => {
        const text = draft.trim();
        if (text.length < 5) return;
        setChecking(true);
        setDupResult(null);
        setDupError(null);
        try {
            const res = await fetch(toApi("interactions/questions/pre-event-duplicate-check/"), {
                method: "POST",
                headers: { "Content-Type": "application/json", ...authH() },
                body: JSON.stringify({ event_id: eventId, content: text }),
            });
            const d = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(d.detail || "Check unavailable");
            setDupResult(d);
        } catch (e) {
            setDupError(e.message);
        } finally {
            setChecking(false);
        }
    };

    // ── Submit ──────────────────────────────────────────────────────────────────

    const handleSubmit = async () => {
        const text = draft.trim();
        if (!text || text.length < 5 || !eventId) return;
        setSubmitting(true);
        setSubmitError(null);
        setSubmitSuccess(false);
        try {
            const res = await fetch(toApi("interactions/questions/"), {
                method: "POST",
                headers: { "Content-Type": "application/json", ...authH() },
                body: JSON.stringify({ event: eventId, content: text }),
            });
            const d = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(d.detail || "Submission failed");
            // Optimistically add to list
            setQuestions((prev) => [
                {
                    id: d.id,
                    content: text,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    moderation_status: d.moderation_status || "pending",
                    is_anonymous: d.is_anonymous || false,
                    submission_phase: "pre_event",
                },
                ...prev,
            ]);
            setDraft("");
            setPolishResult(null);
            setDupResult(null);
            setSubmitSuccess(true);
            setTimeout(() => setSubmitSuccess(false), 3000);
        } catch (e) {
            setSubmitError(e.message);
        } finally {
            setSubmitting(false);
        }
    };

    const aiDisabled = draft.trim().length < 5;
    const canSubmit = !submitting && draft.trim().length >= 5;

    return (
        <Box
            sx={{
                mt: 0,
                p: 1.2,
                borderRadius: 3,
                bgcolor: dark.card,
                border: `1px solid ${dark.border}`,
                backdropFilter: "blur(12px)",
                boxShadow: "0 4px 24px rgba(0,0,0,0.25)",
                textAlign: "left",
            }}
        >
            {/* Header */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.6 }}>
                <Typography sx={{ fontSize: 14, fontWeight: 800, color: dark.text, letterSpacing: 0.2 }}>
                    💬 Pre-Event Questions
                </Typography>
                <Tooltip title="AI Advisor: privately polish questions and detect duplicates. Nothing auto-changes.">
                    <IconButton size="small" onClick={() => setAdvisorOpen((v) => !v)} sx={{ color: dark.subtext }}>
                        <InfoOutlinedIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                </Tooltip>
            </Stack>

            {/* AI Advisor info banner */}
            <Collapse in={advisorOpen}>
                <Box
                    sx={{
                        mb: 1.5,
                        p: 1.2,
                        borderRadius: 2,
                        bgcolor: "rgba(99,102,241,0.07)",
                        border: "1px solid rgba(99,102,241,0.2)",
                    }}
                >
                    <Stack direction="row" alignItems="flex-start" spacing={1}>
                        <AutoFixHighIcon sx={{ fontSize: 14, color: dark.purple, mt: 0.2 }} />
                        <Box sx={{ flex: 1 }}>
                            <Typography sx={{ fontSize: 11, color: dark.purple, fontWeight: 700, mb: 0.4 }}>
                                Q&A AI Advisor
                            </Typography>
                            <Typography sx={{ fontSize: 11, color: dark.subtext }}>
                                • <b style={{ color: dark.text }}>Improve with AI</b> — polishes clarity &amp; grammar; you compare and decide.
                                <br />
                                • <b style={{ color: dark.text }}>Check duplicates</b> — detects similar questions you already submitted.
                                <br />
                                Nothing is changed without your explicit action.
                            </Typography>
                        </Box>
                        <IconButton size="small" onClick={() => setAdvisorOpen(false)} sx={{ color: dark.subtext, p: 0.2 }}>
                            <CloseIcon sx={{ fontSize: 13 }} />
                        </IconButton>
                    </Stack>
                </Box>
            </Collapse>

            {/* ── Submit form ─────────────────────────────────────────────────────── */}
            {isBeforeEventStart ? (
                <Box sx={{ mb: 0.5 }}>
                    <TextField
                        fullWidth
                        multiline
                        minRows={1}
                        maxRows={6}
                        placeholder="What would you like to ask before the session starts?"
                        value={draft}
                        onChange={(e) => {
                            setDraft(e.target.value);
                            setPolishResult(null);
                            setDupResult(null);
                        }}
                        disabled={submitting}
                        inputProps={{ maxLength: 1000 }}
                        sx={{
                            "& .MuiInputBase-root": { bgcolor: dark.inputBg, color: dark.text, borderRadius: 2, fontSize: 13 },
                            "& .MuiOutlinedInput-notchedOutline": { borderColor: dark.border },
                            "& .MuiInputBase-root.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: dark.teal },
                            "& .MuiInputBase-input::placeholder": { color: dark.subtext, opacity: 1 },
                        }}
                    />

                    {/* AI + Submit rows — only visible when user has typed something */}
                    <Collapse in={draft.trim().length > 0}>
                        {/* AI buttons row */}
                        <Stack direction="row" spacing={0.8} sx={{ mt: 0.8 }}>
                            <Button
                                size="small"
                                startIcon={polishing ? <CircularProgress size={12} sx={{ color: dark.purple }} /> : <AutoFixHighIcon sx={{ fontSize: 14 }} />}
                                onClick={handlePolish}
                                disabled={polishing || submitting}
                                sx={{ textTransform: "none", fontSize: 11, color: dark.purple, borderColor: "rgba(129,140,248,0.35)", border: "1px solid", "&:hover": { bgcolor: "rgba(129,140,248,0.08)" } }}
                            >
                                {polishing ? "Improving…" : "Improve with AI"}
                            </Button>
                            <Button
                                size="small"
                                startIcon={checking ? <CircularProgress size={12} sx={{ color: dark.subtext }} /> : <CompareArrowsIcon sx={{ fontSize: 14 }} />}
                                onClick={handleDupCheck}
                                disabled={checking || submitting}
                                sx={{ textTransform: "none", fontSize: 11, color: dark.subtext, borderColor: dark.border, border: "1px solid", "&:hover": { bgcolor: "rgba(255,255,255,0.04)" } }}
                            >
                                {checking ? "Checking…" : "Check duplicates"}
                            </Button>
                        </Stack>

                        {/* Submit row */}
                        <Stack direction="row" justifyContent="flex-end" sx={{ mt: 0.8 }}>
                            <Button
                                size="small"
                                variant="contained"
                                endIcon={submitting ? <CircularProgress size={12} color="inherit" /> : <SendRoundedIcon sx={{ fontSize: 14 }} />}
                                onClick={handleSubmit}
                                disabled={!canSubmit}
                                sx={{ textTransform: "none", fontSize: 12, fontWeight: 700, bgcolor: dark.teal, "&:hover": { bgcolor: "#0ea5a4" }, px: 2 }}
                            >
                                {submitting ? "Submitting…" : "Submit"}
                            </Button>
                        </Stack>
                    </Collapse>
                    {/* AI polish feedback */}
                    {polishMsg && (
                        <Typography sx={{ fontSize: 11, color: dark.subtext, mt: 0.8 }}>{polishMsg}</Typography>
                    )}
                    {polishResult && (
                        <AiComparePanel
                            original={polishResult.original}
                            improved={polishResult.improved}
                            onKeep={() => setPolishResult(null)}
                            onUse={() => { setDraft(polishResult.improved); setPolishResult(null); }}
                        />
                    )}

                    {/* Dup check feedback */}
                    {dupError && (
                        <Typography sx={{ fontSize: 11, color: "#f59e0b", mt: 0.8 }}>{dupError}</Typography>
                    )}
                    {dupResult && !dupResult.has_duplicates && (
                        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.8 }}>
                            <CheckCircleOutlineIcon sx={{ fontSize: 13, color: "#22c55e" }} />
                            <Typography sx={{ fontSize: 11, color: "#22c55e" }}>No duplicates found</Typography>
                        </Stack>
                    )}
                    {dupResult?.has_duplicates && (
                        <DuplicatePanel
                            duplicates={dupResult.duplicates}
                            onDismiss={() => setDupResult(null)}
                            onUseExisting={(t) => { setDraft(t); setDupResult(null); }}
                        />
                    )}

                    {/* Submit error / success */}
                    {submitError && (
                        <Typography sx={{ fontSize: 11, color: "#ef4444", mt: 0.8 }}>{submitError}</Typography>
                    )}
                    {submitSuccess && (
                        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.8 }}>
                            <CheckCircleOutlineIcon sx={{ fontSize: 13, color: "#22c55e" }} />
                            <Typography sx={{ fontSize: 11, color: "#22c55e" }}>Question submitted!</Typography>
                        </Stack>
                    )}
                </Box>
            ) : (
                <Box
                    sx={{
                        mb: 2,
                        p: 1.2,
                        borderRadius: 2,
                        bgcolor: "rgba(255,255,255,0.04)",
                        border: `1px solid ${dark.border}`,
                    }}
                >
                    <Typography sx={{ fontSize: 12, color: dark.subtext }}>
                        The session has started — pre-event question submission is now closed.
                    </Typography>
                </Box>
            )}

            {/* ── Question list ────────────────────────────────────────────────────── */}
            {questions.length > 0 && (
                <>
                    <Divider sx={{ borderColor: dark.border, mb: 0.4 }} />
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: dark.subtext, mb: 0.4 }}>
                        Your questions ({questions.length})
                    </Typography>
                </>
            )}

            {loadState === "loading" && (
                <Stack spacing={1}>
                    <Skeleton variant="rounded" height={52} sx={{ bgcolor: "rgba(255,255,255,0.06)" }} />
                    <Skeleton variant="rounded" height={52} sx={{ bgcolor: "rgba(255,255,255,0.06)" }} />
                </Stack>
            )}

            {loadState === "error" && (
                <Typography sx={{ fontSize: 11, color: "#f59e0b" }}>{fetchError}</Typography>
            )}

            {loadState === "ok" && questions.length === 0 && !isBeforeEventStart && (
                <Typography sx={{ fontSize: 12, color: dark.subtext, fontStyle: "italic" }}>
                    No pre-event questions submitted.
                </Typography>
            )}

            {loadState === "ok" && questions.length > 0 && (
                <Box
                    sx={{
                        maxHeight: QUESTION_LIST_MAX_HEIGHT,
                        overflowY: "auto",
                        pr: 0.5,                 // leave room for scrollbar
                        "&::-webkit-scrollbar": { width: 4 },
                        "&::-webkit-scrollbar-track": { bgcolor: "transparent" },
                        "&::-webkit-scrollbar-thumb": {
                            bgcolor: "rgba(255,255,255,0.18)",
                            borderRadius: 4,
                        },
                        "&::-webkit-scrollbar-thumb:hover": {
                            bgcolor: "rgba(255,255,255,0.32)",
                        },
                    }}
                >
                    <Stack spacing={0.8}>
                        {questions.map((q) => (
                            <QuestionRow
                                key={q.id}
                                q={q}
                                isBeforeEventStart={isBeforeEventStart}
                                token={getToken()}
                                eventId={eventId}
                                onUpdated={(updated) => setQuestions((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))}
                                onDeleted={(id) => setQuestions((prev) => prev.filter((x) => x.id !== id))}
                            />
                        ))}
                    </Stack>
                </Box>
            )}
        </Box>
    );
}
