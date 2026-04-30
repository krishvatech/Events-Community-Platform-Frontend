// src/components/LiveQnAPanel.jsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Box,
  Paper,
  Stack,
  Typography,
  TextField,
  IconButton,
  Button,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Tooltip,
  Collapse,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
} from "@mui/material";
import ThumbUpAltOutlinedIcon from "@mui/icons-material/ThumbUpAltOutlined";
import ThumbUpAltIcon from "@mui/icons-material/ThumbUpAlt";
import CloseIcon from "@mui/icons-material/Close";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import ReplyIcon from "@mui/icons-material/Reply";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import HighlightOffIcon from "@mui/icons-material/HighlightOff";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import UnfoldLessIcon from "@mui/icons-material/UnfoldLess";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import PeopleOutlineIcon from "@mui/icons-material/PeopleOutline";
import BoltIcon from "@mui/icons-material/Bolt";
import SettingsInputAntennaIcon from "@mui/icons-material/SettingsInputAntenna";
import SensorsIcon from "@mui/icons-material/Sensors";
import SensorsOffIcon from "@mui/icons-material/SensorsOff";
import Divider from "@mui/material/Divider";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";

// --- same API pattern as other pages ---
const API_ROOT = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api"
).replace(/\/$/, "");

const REPLIES_COLLAPSED_COUNT = 3;

function getToken() {
  return (
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    ""
  );
}

function authHeader() {
  const tok = getToken();
  return tok ? { Authorization: `Bearer ${tok}` } : {};
}

function toApiUrl(pathOrUrl) {
  try {
    return new URL(pathOrUrl).toString();
  } catch {
    const rel = String(pathOrUrl).replace(/^\/+/, "");
    return `${API_ROOT}/${rel.replace(/^api\/+/, "")}`;
  }
}

function fmtTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ─────────────────────────────────────────────────────────────────────────────
// ReplyItem – single reply row
// ─────────────────────────────────────────────────────────────────────────────
function ReplyItem({
  reply,
  isHost,
  currentUserId,
  currentGuestId,
  onUpvote,
  onEdit,
  onDelete,
}) {
  const canManage =
    isHost ||
    (currentUserId && reply.author_id === currentUserId) ||
    (currentGuestId && reply.author_id === `guest_${currentGuestId}`);

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(reply.content);

  const handleEditSave = () => {
    if (editContent.trim()) {
      onEdit(reply.id, editContent.trim());
    }
    setIsEditing(false);
  };

  return (
    <Box
      sx={{
        ml: 3,
        mt: 0.5,
        pl: 1.5,
        borderLeft: "2px solid rgba(255,255,255,0.12)",
      }}
    >
      {isEditing ? (
        <Box>
          <TextField
            fullWidth
            size="small"
            autoFocus
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setIsEditing(false);
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleEditSave();
              }
            }}
            sx={{
              mb: 0.5,
              "& .MuiOutlinedInput-root": {
                color: "#fff",
                bgcolor: "rgba(255,255,255,0.08)",
                "& fieldset": { borderColor: "rgba(255,255,255,0.3)" },
              },
            }}
          />
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button
              size="small"
              onClick={() => setIsEditing(false)}
              sx={{ color: "rgba(255,255,255,0.6)", textTransform: "none" }}
            >
              Cancel
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={handleEditSave}
              sx={{ textTransform: "none" }}
            >
              Save
            </Button>
          </Stack>
        </Box>
      ) : (
        <Stack direction="row" spacing={0.5} alignItems="flex-start" justifyContent="space-between">
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={0.75} alignItems="baseline" sx={{ flexWrap: "wrap" }}>
              <Typography
                variant="caption"
                sx={{ color: "rgba(255,255,255,0.75)", fontWeight: 600 }}
              >
                {reply.author_name || "Anonymous"}
              </Typography>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.4)" }}>
                {fmtTime(reply.created_at)}
              </Typography>
            </Stack>
            <Typography
              variant="body2"
              sx={{ color: "#fff", whiteSpace: "pre-wrap", wordBreak: "break-word", mt: 0.25 }}
            >
              {reply.content}
            </Typography>
            {canManage && (
              <Stack direction="row" spacing={0} sx={{ mt: 0.25 }}>
                <IconButton
                  size="small"
                  onClick={() => {
                    setEditContent(reply.content);
                    setIsEditing(true);
                  }}
                  sx={{ color: "rgba(255,255,255,0.4)", p: 0.25 }}
                >
                  <EditRoundedIcon sx={{ fontSize: 13 }} />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => onDelete(reply.id)}
                  sx={{ color: "rgba(255,255,255,0.4)", p: 0.25 }}
                >
                  <DeleteOutlineRoundedIcon sx={{ fontSize: 13 }} />
                </IconButton>
              </Stack>
            )}
          </Box>
          {/* Upvote */}
          <Stack alignItems="center" sx={{ minWidth: 32 }}>
            <IconButton
              size="small"
              onClick={() => onUpvote(reply.id)}
              sx={{ color: reply.user_upvoted ? "#4dabf5" : "rgba(255,255,255,0.5)", p: 0.25 }}
            >
              {reply.user_upvoted ? (
                <ThumbUpAltIcon sx={{ fontSize: 13 }} />
              ) : (
                <ThumbUpAltOutlinedIcon sx={{ fontSize: 13 }} />
              )}
            </IconButton>
            {reply.upvote_count > 0 && (
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)", fontSize: 10 }}>
                {reply.upvote_count}
              </Typography>
            )}
          </Stack>
        </Stack>
      )}
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// QuestionItem – question card with nested replies
// ─────────────────────────────────────────────────────────────────────────────
function QuestionItem({
  q,
  isHost,
  currentUserId,
  currentGuestId,
  eventId,
  onUpvote,
  onReplyUpvote,
  onReplyCreate,
  onReplyEdit,
  onReplyDelete,
  onEditQuestion,
  onDeleteQuestion,
  selectable,
  selected,
  onSelect,
}) {
  const canManage = isHost || (currentUserId && q.user_id === currentUserId);

  const [isEditingQuestion, setIsEditingQuestion] = useState(false);
  const [editQuestionContent, setEditQuestionContent] = useState(q.content);

  const [polishing, setPolishing] = useState(false);
  const [polishResult, setPolishResult] = useState(null);
  const [polishError, setPolishError] = useState("");

  const [checking, setChecking] = useState(false);
  const [dupResult, setDupResult] = useState(null);
  const [dupError, setDupError] = useState("");

  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);

  const [repliesExpanded, setRepliesExpanded] = useState(false);

  const replies = q.replies || [];
  const totalReplies = replies.length;
  const visibleReplies = repliesExpanded ? replies : replies.slice(0, REPLIES_COLLAPSED_COUNT);
  const hiddenCount = totalReplies - REPLIES_COLLAPSED_COUNT;

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    const content = replyText.trim();
    if (!content) return;
    setReplySubmitting(true);
    await onReplyCreate(q.id, content);
    setReplyText("");
    setReplyOpen(false);
    setReplySubmitting(false);
  };

  const handlePolishEdit = async () => {
    const text = editQuestionContent.trim();
    if (text.length < 5 || !eventId) return;
    setPolishing(true);
    setPolishError("");
    setPolishResult(null);
    try {
      const res = await fetch(
        toApiUrl("interactions/questions/polish-draft/"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader() },
          body: JSON.stringify({ event_id: eventId, content: text }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || "Could not improve the question right now.");
      }
      if (data.changed) {
        setPolishResult({ original: data.original, improved: data.improved });
      } else {
        setPolishError("Your question already looks great!");
      }
    } catch (e) {
      setPolishError(e.message || "Could not improve the question. Please try again.");
    } finally {
      setPolishing(false);
    }
  };

  const handleDupCheckEdit = async () => {
    const text = editQuestionContent.trim();
    if (text.length < 5 || !eventId) return;
    setChecking(true);
    setDupError("");
    setDupResult(null);
    try {
      const res = await fetch(
        toApiUrl("interactions/questions/pre-event-duplicate-check/"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader() },
          body: JSON.stringify({ event_id: eventId, content: text }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || "Could not check duplicates right now.");
      }
      setDupResult(data);
    } catch (e) {
      setDupError(e.message || "Could not check duplicates. Please try again.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <ListItem disableGutters sx={{ mb: 0.5 }}>
      <Paper
        variant="outlined"
        sx={{
          p: 1,
          width: "100%",
          borderRadius: 2,
          bgcolor: "rgba(255,255,255,0.04)",
          borderColor: "rgba(255,255,255,0.12)",
        }}
      >
        {/* ── Question body ── */}
        {isEditingQuestion ? (
          <Box component="form" onSubmit={(e) => { e.preventDefault(); onEditQuestion(q.id, editQuestionContent); setIsEditingQuestion(false); }}>
            <TextField
              fullWidth
              size="small"
              autoFocus
              value={editQuestionContent}
              onChange={(e) => {
                setEditQuestionContent(e.target.value);
                setPolishResult(null);
                setPolishError("");
                setDupResult(null);
                setDupError("");
              }}
              onKeyDown={(e) => { if (e.key === "Escape") setIsEditingQuestion(false); }}
              sx={{
                mb: 1,
                "& .MuiOutlinedInput-root": {
                  color: "#fff",
                  bgcolor: "rgba(255,255,255,0.1)",
                  "& fieldset": { borderColor: "rgba(255,255,255,0.3)" },
                },
              }}
            />

            {/* AI Polish button */}
            <Stack direction="row" spacing={1} sx={{ mb: 1, alignItems: "center" }}>
              <Tooltip title="Improve your question">
                <span>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handlePolishEdit}
                    disabled={
                      polishing ||
                      editQuestionContent.trim().length < 5 ||
                      !eventId
                    }
                    startIcon={
                      polishing ? (
                        <CircularProgress size={13} color="inherit" />
                      ) : (
                        <AutoAwesomeIcon sx={{ fontSize: 14 }} />
                      )
                    }
                    sx={{
                      textTransform: "none",
                      borderColor: "rgba(255,255,255,0.6)",
                      color: "#ffffff !important",
                      "& .MuiButton-startIcon": { color: "#ffffff !important" },
                      "&:hover": { borderColor: "#fff", color: "#ffffff !important" },
                      "&.Mui-disabled": { borderColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.25) !important" },
                      fontSize: "0.75rem",
                      py: 0.4,
                    }}
                  >
                    {polishing ? "Improving…" : "Improve with AI"}
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title="Check for similar questions">
                <span>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleDupCheckEdit}
                    disabled={
                      checking ||
                      editQuestionContent.trim().length < 5 ||
                      !eventId
                    }
                    startIcon={
                      checking ? (
                        <CircularProgress size={13} color="inherit" />
                      ) : null
                    }
                    sx={{
                      textTransform: "none",
                      borderColor: "rgba(255,255,255,0.6)",
                      color: "#ffffff !important",
                      "& .MuiButton-startIcon": { color: "#ffffff !important" },
                      "&:hover": { borderColor: "#fff", color: "#ffffff !important" },
                      "&.Mui-disabled": { borderColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.25) !important" },
                      fontSize: "0.75rem",
                      py: 0.4,
                    }}
                  >
                    {checking ? "Checking…" : "Check duplicates"}
                  </Button>
                </span>
              </Tooltip>
            </Stack>

            {/* Polish error */}
            {polishError && (
              <Typography variant="caption" sx={{ color: "#f88", display: "block", mb: 0.5 }}>
                {polishError}
              </Typography>
            )}

            {/* Duplicate check results */}
            {dupError && (
              <Typography variant="caption" sx={{ color: "#f59e0b", display: "block", mb: 0.5 }}>
                {dupError}
              </Typography>
            )}
            {dupResult && !dupResult.has_duplicates && (
              <Typography variant="caption" sx={{ color: "#22c55e", display: "block", mb: 0.5 }}>
                ✓ No duplicates found
              </Typography>
            )}
            {dupResult?.has_duplicates && (
              <Box sx={{ mb: 1, p: 1, bgcolor: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 1 }}>
                <Typography variant="caption" sx={{ color: "#f59e0b", fontWeight: 600, display: "block", mb: 0.5 }}>
                  Similar questions found:
                </Typography>
                {dupResult.duplicates.filter(dup => dup.id !== q.id && dup.question_id !== q.id).map((dup, idx) => (
                  <Box key={idx} sx={{ mb: 0.5, p: 0.75, bgcolor: "rgba(255,255,255,0.05)", borderRadius: 1 }}>
                    <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.85)", display: "block", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                      {dup.existing_text}
                    </Typography>
                    {dup.existing_text && (
                      <Button
                        size="small"
                        onClick={() => {
                          setEditQuestionContent(dup.existing_text);
                          setDupResult(null);
                        }}
                        sx={{ mt: 0.5, textTransform: "none", fontSize: 10, color: "#4dabf5", p: 0 }}
                      >
                        Use this version
                      </Button>
                    )}
                  </Box>
                ))}
                {dupResult.duplicates.filter(dup => dup.id !== q.id && dup.question_id !== q.id).length === 0 && (
                  <Typography variant="caption" sx={{ color: "#22c55e", display: "block" }}>
                    ✓ No other similar questions found
                  </Typography>
                )}
              </Box>
            )}

            {/* Inline comparison panel */}
            {polishResult && (
              <Box sx={{ mb: 1 }}>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 1,
                    mb: 1,
                  }}
                >
                  {/* Original */}
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "rgba(255,255,255,0.45)",
                        fontWeight: 600,
                        letterSpacing: 0.5,
                        textTransform: "uppercase",
                        mb: 0.5,
                        display: "block",
                      }}
                    >
                      Original
                    </Typography>
                    <Box
                      sx={{
                        bgcolor: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "8px",
                        px: 1.5,
                        py: 1,
                        fontSize: "0.8rem",
                        lineHeight: 1.55,
                        color: "rgba(255,255,255,0.75)",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {polishResult.original}
                    </Box>
                  </Box>

                  {/* Improved */}
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "#9c7bff",
                        fontWeight: 600,
                        letterSpacing: 0.5,
                        textTransform: "uppercase",
                        mb: 0.5,
                        display: "block",
                      }}
                    >
                      Improved
                    </Typography>
                    <Box
                      sx={{
                        bgcolor: "rgba(156,123,255,0.08)",
                        border: "1px solid rgba(156,123,255,0.35)",
                        borderRadius: "8px",
                        px: 1.5,
                        py: 1,
                        fontSize: "0.8rem",
                        lineHeight: 1.55,
                        color: "#fff",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {polishResult.improved}
                    </Box>
                  </Box>
                </Box>

                {/* Comparison actions */}
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => setPolishResult(null)}
                    sx={{
                      textTransform: "none",
                      fontSize: 11,
                      color: "rgba(255,255,255,0.7)",
                      borderColor: "rgba(255,255,255,0.3)",
                    }}
                  >
                    Keep original
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => {
                      setEditQuestionContent(polishResult.improved);
                      setPolishResult(null);
                    }}
                    sx={{
                      textTransform: "none",
                      fontSize: 11,
                      bgcolor: "#7c5cbf",
                      "&:hover": { bgcolor: "#6a4daa" },
                    }}
                  >
                    Use improved
                  </Button>
                </Stack>
              </Box>
            )}

            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button size="small" onClick={() => setIsEditingQuestion(false)} sx={{ color: "rgba(255,255,255,0.7)" }}>
                Cancel
              </Button>
              <Button type="submit" size="small" variant="contained">Save</Button>
            </Stack>
          </Box>
        ) : (
          <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="flex-start">
            {selectable && (
              <Checkbox
                checked={selected}
                onChange={() => onSelect(q.id)}
                size="small"
                sx={{ p: 0, mt: 0.5, color: "rgba(255,255,255,0.4)", "&.Mui-checked": { color: "#4dabf5" } }}
              />
            )}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <ListItemText
                primary={q.content}
                secondary={q.created_at ? fmtTime(q.created_at) : null}
                primaryTypographyProps={{
                  variant: "body2",
                  sx: { color: "#fff", whiteSpace: "pre-wrap", wordBreak: "break-word" },
                }}
                secondaryTypographyProps={{
                  variant: "caption",
                  sx: { color: "rgba(255,255,255,0.6)" },
                }}
              />
              {/* Pre-event chip */}
              {isHost && q.submission_phase === "pre_event" && (
                <Chip
                  label="Pre-event"
                  size="small"
                  sx={{
                    mt: 0.5,
                    fontSize: "0.65rem",
                    height: 18,
                    color: "#10b8a6",
                    borderColor: "rgba(16,184,166,0.5)",
                    bgcolor: "rgba(16,184,166,0.06)",
                  }}
                  variant="outlined"
                />
              )}
              {/* Question actions */}
              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
                {/* Reply button */}
                <Button
                  size="small"
                  startIcon={<ReplyIcon sx={{ fontSize: "14px !important" }} />}
                  onClick={() => setReplyOpen((v) => !v)}
                  sx={{
                    color: replyOpen ? "#4dabf5" : "rgba(255,255,255,0.5)",
                    textTransform: "none",
                    fontSize: 11,
                    p: "2px 6px",
                    minWidth: 0,
                  }}
                >
                  Reply
                </Button>
                {/* Edit / delete for owner/host */}
                {canManage && (
                  <>
                    <IconButton
                      size="small"
                      onClick={() => { setEditQuestionContent(q.content); setIsEditingQuestion(true); }}
                      sx={{ color: "rgba(255,255,255,0.4)", p: 0.5 }}
                    >
                      <EditRoundedIcon sx={{ fontSize: 15 }} />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => onDeleteQuestion(q.id)}
                      sx={{ color: "rgba(255,255,255,0.4)", p: 0.5 }}
                    >
                      <DeleteOutlineRoundedIcon sx={{ fontSize: 15 }} />
                    </IconButton>
                  </>
                )}
              </Stack>
            </Box>

            {/* Upvote column */}
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 40 }}>
              <Tooltip
                arrow
                placement="left"
                title={
                  q.upvoters && q.upvoters.length > 0 ? (
                    <Box sx={{ display: "flex", flexDirection: "column" }}>
                      {q.upvoters.slice(0, 5).map((u) => (
                        <Typography key={u.id} variant="caption" sx={{ display: "block" }}>
                          {u.name || u.username || `User ${u.id}`}
                        </Typography>
                      ))}
                      {q.upvoters.length > 5 && (
                        <Typography variant="caption" sx={{ mt: 0.5 }}>
                          +{q.upvoters.length - 5} more
                        </Typography>
                      )}
                    </Box>
                  ) : "No votes yet"
                }
              >
                <IconButton
                  size="small"
                  onClick={() => onUpvote(q.id)}
                  sx={{ color: q.user_upvoted ? "#4dabf5" : "rgba(255,255,255,0.7)" }}
                >
                  {q.user_upvoted ? <ThumbUpAltIcon fontSize="small" /> : <ThumbUpAltOutlinedIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.8)" }}>
                {q.upvote_count ?? 0}
              </Typography>
            </Box>
          </Stack>
        )}

        {/* ── Inline reply form ── */}
        <Collapse in={replyOpen}>
          <Box component="form" onSubmit={handleReplySubmit} sx={{ mt: 1, ml: 2 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Write a reply..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              disabled={replySubmitting}
              sx={{
                "& .MuiOutlinedInput-root": {
                  color: "#fff",
                  bgcolor: "rgba(255,255,255,0.06)",
                  "& fieldset": { borderColor: "rgba(255,255,255,0.2)" },
                  "&:hover fieldset": { borderColor: "rgba(255,255,255,0.4)" },
                  "&.Mui-focused fieldset": { borderColor: "#fff" },
                },
                "& .MuiInputBase-input::placeholder": {
                  color: "rgba(255,255,255,0.5)",
                  opacity: 1,
                },
              }}
            />
            <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 0.5 }}>
              <Button
                size="small"
                onClick={() => { setReplyOpen(false); setReplyText(""); }}
                sx={{ color: "rgba(255,255,255,0.6)", textTransform: "none" }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="small"
                variant="contained"
                disabled={replySubmitting || !replyText.trim()}
                sx={{ textTransform: "none" }}
              >
                {replySubmitting ? <CircularProgress size={14} color="inherit" /> : "Reply"}
              </Button>
            </Stack>
          </Box>
        </Collapse>

        {/* ── Replies list ── */}
        {totalReplies > 0 && (
          <Box sx={{ mt: 0.75 }}>
            {visibleReplies.map((r) => (
              <ReplyItem
                key={r.id}
                reply={r}
                isHost={isHost}
                currentUserId={currentUserId}
                currentGuestId={currentGuestId}
                onUpvote={onReplyUpvote}
                onEdit={onReplyEdit}
                onDelete={onReplyDelete}
              />
            ))}

            {/* Show more / collapse toggle */}
            {totalReplies > REPLIES_COLLAPSED_COUNT && (
              <Button
                size="small"
                onClick={() => setRepliesExpanded((v) => !v)}
                startIcon={repliesExpanded ? <ExpandLessIcon sx={{ fontSize: 14 }} /> : <ExpandMoreIcon sx={{ fontSize: 14 }} />}
                sx={{
                  ml: 3,
                  mt: 0.5,
                  color: "rgba(255,255,255,0.55)",
                  textTransform: "none",
                  fontSize: 11,
                  p: "2px 4px",
                }}
              >
                {repliesExpanded
                  ? "Collapse replies"
                  : `View ${hiddenCount} more ${hiddenCount === 1 ? "reply" : "replies"}`}
              </Button>
            )}
          </Box>
        )}
      </Paper>
    </ListItem>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Grouped Question Card — shows a synthesized summary as the primary question,
// with collapsible original sub-questions, aggregated authors, and host toolbar.
// Does NOT disclose whether grouping was manual or AI-assisted.
// ─────────────────────────────────────────────────────────────────────────────
function GroupedQuestionCard({ g, memberedQuestions, isHost, onDelete, onGroupAction, currentUserId, currentGuestId }) {
  const [subOpen, setSubOpen] = useState(false);
  const [onStage, setOnStage] = useState(false);
  const [isAnswered, setIsAnswered] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // null | 'stage' | 'answered' | 'archive'

  // Collect unique, non-anonymous author names from sub-questions
  const authorNames = [
    ...new Set(
      memberedQuestions
        .filter((q) => !q.is_anonymous && q.user_display)
        .map((q) => q.user_display)
    ),
  ];

  const summaryText = g.summary?.trim() || g.title?.trim() || "Grouped question";
  const subCount = memberedQuestions.length;
  // Deduplicated vote count from the backend-computed field
  const voteCount = g.aggregated_vote_count ?? 0;
  // Whether the current user has already voted on any sub-question in this group
  const userHasVoted = !!g.user_has_voted_in_group;

  const handleMarkOnStage = async () => {
    setActionLoading("stage");
    try {
      // Toggle a visual "on stage" state — broadcast via WS or local state
      setOnStage((v) => !v);
      if (onGroupAction) onGroupAction(g.id, onStage ? "unstage" : "stage");
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkAnswered = async () => {
    setActionLoading("answered");
    try {
      setIsAnswered((v) => !v);
      if (onGroupAction) onGroupAction(g.id, isAnswered ? "unanswered" : "answered");
    } finally {
      setActionLoading(null);
    }
  };

  const handleArchive = async () => {
    if (onDelete) onDelete(g.id);
  };

  return (
    <Box
      sx={{
        mb: 1.5,
        borderRadius: 2,
        border: onStage
          ? "1.5px solid rgba(77,171,245,0.6)"
          : isAnswered
            ? "1.5px solid rgba(34,197,94,0.45)"
            : "1.5px solid rgba(77,171,245,0.22)",
        bgcolor: onStage
          ? "rgba(77,171,245,0.06)"
          : isAnswered
            ? "rgba(34,197,94,0.04)"
            : "rgba(77,171,245,0.04)",
        overflow: "hidden",
        transition: "border-color 0.25s, background-color 0.25s",
      }}
    >
      {/* ── Group header / summary question ── */}
      <Box sx={{ px: 1.5, pt: 1.2, pb: 0.8 }}>
        {/* Status pill row */}
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.75 }}>
          {onStage && (
            <Chip
              label="On Stage"
              size="small"
              icon={<PlayCircleOutlineIcon sx={{ fontSize: 13, color: "#4dabf5 !important" }} />}
              sx={{
                height: 20,
                fontSize: "0.65rem",
                fontWeight: 700,
                bgcolor: "rgba(77,171,245,0.12)",
                color: "#4dabf5",
                border: "1px solid rgba(77,171,245,0.35)",
                "& .MuiChip-icon": { ml: 0.5 },
              }}
            />
          )}
          {isAnswered && (
            <Chip
              label="Answered"
              size="small"
              icon={<CheckCircleIcon sx={{ fontSize: 13, color: "#22c55e !important" }} />}
              sx={{
                height: 20,
                fontSize: "0.65rem",
                fontWeight: 700,
                bgcolor: "rgba(34,197,94,0.10)",
                color: "#22c55e",
                border: "1px solid rgba(34,197,94,0.3)",
                "& .MuiChip-icon": { ml: 0.5 },
              }}
            />
          )}
          {/* Combined count pill */}
          <Chip
            label={`${subCount} questions grouped`}
            size="small"
            icon={<AutoAwesomeIcon sx={{ fontSize: 11, color: "rgba(77,171,245,0.7) !important" }} />}
            sx={{
              height: 18,
              fontSize: "0.62rem",
              fontWeight: 600,
              bgcolor: "rgba(77,171,245,0.08)",
              color: "rgba(77,171,245,0.8)",
              border: "1px solid rgba(77,171,245,0.18)",
              "& .MuiChip-icon": { ml: 0.5 },
            }}
          />
          {/* Vote count badge — deduplicated distinct voters */}
          {voteCount > 0 && (
            <Chip
              label={`▲ ${voteCount}`}
              size="small"
              sx={{
                height: 18,
                fontSize: "0.62rem",
                fontWeight: 700,
                bgcolor: userHasVoted
                  ? "rgba(255,167,38,0.18)"
                  : "rgba(255,167,38,0.08)",
                color: userHasVoted
                  ? "rgba(255,167,38,1)"
                  : "rgba(255,167,38,0.7)",
                border: userHasVoted
                  ? "1px solid rgba(255,167,38,0.5)"
                  : "1px solid rgba(255,167,38,0.22)",
              }}
            />
          )}
          {/* 'Voted' badge shown when user has already voted in this group */}
          {userHasVoted && (
            <Chip
              label="Voted"
              size="small"
              sx={{
                height: 18,
                fontSize: "0.62rem",
                fontWeight: 600,
                bgcolor: "rgba(255,167,38,0.10)",
                color: "rgba(255,167,38,0.85)",
                border: "1px solid rgba(255,167,38,0.3)",
              }}
            />
          )}
        </Stack>

        {/* Summary question text — AI-generated indicator + expandability cue */}
        <Box
          sx={{
            pb: 0.8,
            mb: authorNames.length > 0 ? 0.4 : 0.2,
            borderBottom: subOpen ? "none" : "1px dashed rgba(77,171,245,0.18)",
          }}
        >
          <Stack direction="row" alignItems="flex-start" spacing={0.6}>
            <AutoAwesomeIcon
              sx={{
                fontSize: 13,
                color: "rgba(77,171,245,0.6)",
                mt: "3px",
                flexShrink: 0,
              }}
            />
            <Typography
              variant="body2"
              sx={{
                color: "#fff",
                fontWeight: 600,
                fontSize: "0.88rem",
                lineHeight: 1.5,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {summaryText}
            </Typography>
          </Stack>
        </Box>

        {/* Authors row */}
        {authorNames.length > 0 && (
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.5 }}>
            <PeopleOutlineIcon sx={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }} />
            <Typography
              variant="caption"
              sx={{ color: "rgba(255,255,255,0.45)", fontSize: "0.7rem", lineHeight: 1.3 }}
            >
              {authorNames.slice(0, 4).join(" · ")}
              {authorNames.length > 4 ? ` · +${authorNames.length - 4} more` : ""}
            </Typography>
          </Stack>
        )}
      </Box>

      {/* ── Host toolbar ── */}
      {isHost && (
        <Box
          sx={{
            px: 1.2,
            py: 0.6,
            borderTop: "1px solid rgba(255,255,255,0.06)",
            bgcolor: "rgba(0,0,0,0.18)",
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            flexWrap: "wrap",
          }}
        >
          {/* Show on Stage */}
          <Tooltip title={onStage ? "Remove from stage" : "Show this question on stage"}>
            <Button
              size="small"
              onClick={handleMarkOnStage}
              disabled={actionLoading === "stage"}
              startIcon={
                actionLoading === "stage" ? (
                  <CircularProgress size={11} sx={{ color: "#4dabf5" }} />
                ) : onStage ? (
                  <SensorsIcon sx={{ fontSize: 14 }} />
                ) : (
                  <SensorsOffIcon sx={{ fontSize: 14 }} />
                )
              }
              sx={{
                textTransform: "none",
                fontSize: "0.72rem",
                py: 0.3,
                px: 1,
                minWidth: 0,
                borderRadius: "6px",
                color: onStage ? "#4dabf5" : "rgba(255,255,255,0.55)",
                bgcolor: onStage ? "rgba(77,171,245,0.12)" : "transparent",
                border: onStage ? "1px solid rgba(77,171,245,0.3)" : "1px solid transparent",
                "&:hover": {
                  bgcolor: "rgba(77,171,245,0.12)",
                  color: "#4dabf5",
                  borderColor: "rgba(77,171,245,0.3)",
                },
              }}
            >
              {onStage ? "On Stage" : "Show on Stage"}
            </Button>
          </Tooltip>

          {/* Mark as Answered */}
          <Tooltip title={isAnswered ? "Mark as unanswered" : "Mark as answered"}>
            <Button
              size="small"
              onClick={handleMarkAnswered}
              disabled={actionLoading === "answered"}
              startIcon={
                actionLoading === "answered" ? (
                  <CircularProgress size={11} sx={{ color: "#22c55e" }} />
                ) : isAnswered ? (
                  <CheckCircleIcon sx={{ fontSize: 14 }} />
                ) : (
                  <CheckCircleOutlineIcon sx={{ fontSize: 14 }} />
                )
              }
              sx={{
                textTransform: "none",
                fontSize: "0.72rem",
                py: 0.3,
                px: 1,
                minWidth: 0,
                borderRadius: "6px",
                color: isAnswered ? "#22c55e" : "rgba(255,255,255,0.55)",
                bgcolor: isAnswered ? "rgba(34,197,94,0.1)" : "transparent",
                border: isAnswered ? "1px solid rgba(34,197,94,0.3)" : "1px solid transparent",
                "&:hover": {
                  bgcolor: "rgba(34,197,94,0.1)",
                  color: "#22c55e",
                  borderColor: "rgba(34,197,94,0.3)",
                },
              }}
            >
              {isAnswered ? "Answered" : "Mark Answered"}
            </Button>
          </Tooltip>

          {/* Spacer */}
          <Box sx={{ flex: 1 }} />

          {/* Unfold sub-questions toggle */}
          <Tooltip title={subOpen ? "Collapse original questions" : "Show original questions"}>
            <Button
              size="small"
              onClick={() => setSubOpen((v) => !v)}
              startIcon={
                <KeyboardArrowDownIcon
                  sx={{
                    fontSize: 15,
                    transition: "transform 0.2s ease",
                    transform: subOpen ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                />
              }
              sx={{
                textTransform: "none",
                fontSize: "0.72rem",
                py: 0.3,
                px: 1,
                minWidth: 0,
                borderRadius: "6px",
                color: "rgba(255,255,255,0.45)",
                "&:hover": { color: "rgba(255,255,255,0.8)", bgcolor: "rgba(255,255,255,0.06)" },
              }}
            >
              {subOpen ? "Collapse" : `${subCount} originals`}
            </Button>
          </Tooltip>

          {/* Delete / archive group */}
          <Tooltip title="Delete this group" placement="top">
            <IconButton
              size="small"
              onClick={handleArchive}
              sx={{ color: "rgba(255,255,255,0.3)", p: 0.4, "&:hover": { color: "#ef4444", bgcolor: "rgba(239,68,68,0.1)" } }}
            >
              <DeleteOutlineRoundedIcon sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      {/* ── Attendee unfold toggle (non-host) ── */}
      {!isHost && subCount > 0 && (
        <Box
          sx={{
            px: 1.5,
            py: 0.65,
            borderTop: "1px solid rgba(77,171,245,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer",
            userSelect: "none",
            bgcolor: "rgba(77,171,245,0.03)",
            "&:hover": { bgcolor: "rgba(77,171,245,0.07)" },
            transition: "background-color 0.15s ease",
          }}
          onClick={() => setSubOpen((v) => !v)}
        >
          <Typography variant="caption" sx={{ color: "rgba(77,171,245,0.7)", fontSize: "0.68rem", fontWeight: 500 }}>
            {subOpen ? "Collapse original questions" : `See ${subCount} original question${subCount !== 1 ? "s" : ""}`}
          </Typography>
          <KeyboardArrowDownIcon
            sx={{
              fontSize: 15,
              color: "rgba(77,171,245,0.6)",
              transition: "transform 0.2s ease",
              transform: subOpen ? "rotate(180deg)" : "rotate(0deg)",
            }}
          />
        </Box>
      )}

      {/* ── Collapsible original sub-questions ── */}
      <Collapse in={subOpen}>
        <Box
          sx={{
            mx: 1.2,
            mb: 1.2,
            mt: 0,
            borderRadius: 1.5,
            bgcolor: "rgba(0,0,0,0.18)",
            border: "1px solid rgba(255,255,255,0.06)",
            overflow: "hidden",
          }}
        >
          {memberedQuestions.map((q, idx) => (
            <Box
              key={q.id}
              sx={{
                px: 1.2,
                py: 0.8,
                borderBottom:
                  idx < memberedQuestions.length - 1
                    ? "1px solid rgba(255,255,255,0.05)"
                    : "none",
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  color: "rgba(255,255,255,0.75)",
                  fontSize: "0.8rem",
                  lineHeight: 1.45,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {q.content}
              </Typography>
              {!q.is_anonymous && q.user_display && (
                <Typography
                  variant="caption"
                  sx={{ color: "rgba(255,255,255,0.35)", fontSize: "0.68rem", display: "block", mt: 0.3 }}
                >
                  — {q.user_display}
                </Typography>
              )}
            </Box>
          ))}
        </Box>
      </Collapse>
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main panel
// ─────────────────────────────────────────────────────────────────────────────
export default function LiveQnAPanel({
  open,
  onClose,
  eventId,
  meeting,      // kept for future, not used right now
  activeTab,    // ignored, we always show Q&A
  onChangeTab,  // ignored
  isHost = false,
  currentUserId,
  currentGuestId, // numeric guest ID (without "guest_" prefix)
}) {
  const [questions, setQuestions] = useState([]);
  const [groups, setGroups] = useState([]);
  const [aiSuggestions, setAiSuggestions] = useState([]);

  const [groupingMode, setGroupingMode] = useState(false);
  const [selectedQs, setSelectedQs] = useState([]);
  const [createGroupModalOpen, setCreateGroupModalOpen] = useState(false);
  const [newGroupTitle, setNewGroupTitle] = useState("");
  const [newGroupSummary, setNewGroupSummary] = useState("");
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [adoptedSuggestionId, setAdoptedSuggestionId] = useState(null); // A3: track source suggeston
  const [error, setError] = useState("");

  // --- A3: Public AI Question Suggestions (Host + Participant) ---
  const [publicSuggestions, setPublicSuggestions] = useState([]);
  const [publicSuggLoading, setPublicSuggLoading] = useState(false);
  const [publicSuggError, setPublicSuggError] = useState("");
  const [publicSuggGenerating, setPublicSuggGenerating] = useState(false);
  const [publicSuggHubOpen, setPublicSuggHubOpen] = useState(false); // Host Hub
  const [publicSuggSectionOpen, setPublicSuggSectionOpen] = useState(true); // Participant toggle

  // ── Polish-draft AI state ─────────────────────────────────────────────────
  const [polishLoading, setPolishLoading] = useState(false);
  const [polishDialog, setPolishDialog] = useState(null); // null | { original, improved }
  const [polishError, setPolishError] = useState("");

  // ── A2: private AI question suggestions state ─────────────────────────────
  const [aiQSugg, setAiQSugg] = useState([]);
  const [aiQSuggLoading, setAiQSuggLoading] = useState(false);
  const [aiQSuggError, setAiQSuggError] = useState("");
  // Dismiss is persisted per event in localStorage so it survives panel re-opens
  const [aiQSuggDismissed, setAiQSuggDismissed] = useState(
    () => !!localStorage.getItem(`qna_ai_sugg_dismissed_${eventId}`)
  );

  // ── A2: host context modal state ──────────────────────────────────────────
  const [contextModalOpen, setContextModalOpen] = useState(false);
  const [contextText, setContextText] = useState("");
  const [contextTitle, setContextTitle] = useState("");
  const [contextSaving, setContextSaving] = useState(false);
  const [contextSaveError, setContextSaveError] = useState("");
  const [contextSaved, setContextSaved] = useState(false);

  // ── Typing indicator state ────────────────────────────────────────────────
  // Map keyed by user_id, value: { user_id, user_name, last_seen (ms) }
  const [typingUsers, setTypingUsers] = useState({});

  // Refs for WS access and timer handles
  const wsRef = useRef(null);               // live WebSocket instance
  const typingThrottleRef = useRef(0);      // timestamp of last is_typing=true send
  const typingDebounceRef = useRef(null);   // setTimeout id for auto-send is_typing=false

  // ── Load questions (includes replies) ───────────────────────────────────
  const loadQuestions = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        toApiUrl(`interactions/questions/?event_id=${encodeURIComponent(eventId)}`),
        { headers: { "Content-Type": "application/json", ...authHeader() } }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to load questions.");
      }
      const data = await res.json();
      // Ensure each question has a replies array
      setQuestions(data.map((q) => ({ ...q, replies: q.replies ?? [] })));
    } catch (e) {
      setError(e.message || "Failed to load questions.");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  const loadGroups = useCallback(async () => {
    if (!eventId) return;
    try {
      const res = await fetch(toApiUrl(`interactions/qna-groups/?event_id=${encodeURIComponent(eventId)}`), { headers: authHeader() });
      if (res.ok) {
        const data = await res.json();
        setGroups(data);
      }
    } catch (e) {
      console.error("Failed to load Q&A groups", e);
    }
  }, [eventId]);

  const loadAiSuggestions = useCallback(async () => {
    if (!eventId || !isHost) return;
    try {
      const res = await fetch(toApiUrl(`interactions/qna-groups/ai-suggestions/?event_id=${encodeURIComponent(eventId)}`), { headers: authHeader() });
      if (res.ok) {
        const data = await res.json();
        setAiSuggestions(data);
      }
    } catch (e) {
      console.error("Failed to load AI suggestions", e);
    }
  }, [eventId, isHost]);

  useEffect(() => {
    if (!open) return;
    loadQuestions();
    loadGroups();
    if (isHost) loadAiSuggestions();
    // Auto-fetch A3 public suggestions
    fetchPublicSuggestions();

    // Auto-fetch A2 suggestions on first open (not dismissed, not already loaded)
    if (!aiQSuggDismissed && aiQSugg.length === 0) {
      fetchAiQSuggestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ── sendQnaTyping helper ─────────────────────────────────────────────────
  const sendQnaTyping = useCallback((isTyping) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    try {
      ws.send(JSON.stringify({ type: "qna.typing", is_typing: isTyping }));
    } catch (e) {
      console.warn("QnA typing send failed:", e);
    }
  }, []);

  // ── WebSocket ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open || !eventId) return;

    const API_RAW = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";
    const WS_ROOT = API_RAW.replace(/^http/, "ws").replace(/\/api\/?$/, "");
    const token = getToken();
    const qs = token ? `?token=${encodeURIComponent(token)}` : "";
    const ws = new WebSocket(`${WS_ROOT}/ws/events/${eventId}/qna/${qs}`);

    wsRef.current = ws; // store ref so sendQnaTyping can access it

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        // ── question events (existing) ──────────────────────────────────────
        if (msg.type === "qna.upvote") {
          setQuestions((prev) =>
            prev.map((q) =>
              q.id === msg.question_id
                ? { ...q, upvote_count: msg.upvote_count, upvoters: msg.upvoters ?? q.upvoters }
                : q
            )
          );
        } else if (msg.type === "qna.question") {
          setQuestions((prev) => {
            if (prev.some((q) => q.id === msg.question_id)) return prev;
            return [
              {
                id: msg.question_id,
                content: msg.content,
                user_id: msg.user_id,
                event_id: msg.event_id,
                upvote_count: msg.upvote_count ?? 0,
                user_upvoted: false,
                created_at: msg.created_at,
                submission_phase: msg.submission_phase ?? "live",
                replies: [],
                reply_count: 0,
              },
              ...prev,
            ];
          });
        } else if (msg.type === "qna.update") {
          setQuestions((prev) =>
            prev.map((q) => (q.id === msg.question_id ? { ...q, content: msg.content } : q))
          );
        } else if (msg.type === "qna.delete") {
          setQuestions((prev) => prev.filter((q) => q.id !== msg.question_id));

          // ── reply events ─────────────────────────────────────────────────────
        } else if (msg.type === "qna.reply") {
          // New reply: add to the parent question's replies array
          setQuestions((prev) =>
            prev.map((q) => {
              if (q.id !== msg.question_id) return q;
              // Avoid duplicates
              if ((q.replies || []).some((r) => r.id === msg.reply_id)) return q;
              const newReply = {
                id: msg.reply_id,
                question_id: msg.question_id,
                content: msg.content,
                author_id: msg.author_id,
                author_name: msg.author_name,
                author_avatar_url: msg.author_avatar_url,
                upvote_count: msg.upvote_count ?? 0,
                user_upvoted: false,
                created_at: msg.created_at,
                is_anonymous: msg.is_anonymous,
                moderation_status: msg.moderation_status,
              };
              return {
                ...q,
                replies: [...(q.replies || []), newReply],
                reply_count: (q.reply_count ?? 0) + 1,
              };
            })
          );
        } else if (msg.type === "qna.reply_update") {
          setQuestions((prev) =>
            prev.map((q) =>
              q.id === msg.question_id
                ? {
                  ...q,
                  replies: (q.replies || []).map((r) =>
                    r.id === msg.reply_id ? { ...r, content: msg.content } : r
                  ),
                }
                : q
            )
          );
        } else if (msg.type === "qna.reply_delete") {
          setQuestions((prev) =>
            prev.map((q) =>
              q.id === msg.question_id
                ? {
                  ...q,
                  replies: (q.replies || []).filter((r) => r.id !== msg.reply_id),
                  reply_count: Math.max(0, (q.reply_count ?? 1) - 1),
                }
                : q
            )
          );
        } else if (msg.type === "qna.reply_upvote") {
          setQuestions((prev) =>
            prev.map((q) =>
              q.id === msg.question_id
                ? {
                  ...q,
                  replies: (q.replies || []).map((r) =>
                    r.id === msg.reply_id
                      ? { ...r, upvote_count: msg.upvote_count }
                      : r
                  ),
                }
                : q
            )
          );
        } else if (msg.type === "qna.reply_approved") {
          // Remove pending status — update moderation_status to approved
          setQuestions((prev) =>
            prev.map((q) =>
              q.id === msg.question_id
                ? {
                  ...q,
                  replies: (q.replies || []).map((r) =>
                    r.id === msg.reply_id ? { ...r, moderation_status: "approved" } : r
                  ),
                }
                : q
            )
          );
        } else if (msg.type === "qna.reply_rejected") {
          setQuestions((prev) =>
            prev.map((q) =>
              q.id === msg.question_id
                ? {
                  ...q,
                  replies: (q.replies || []).filter((r) => r.id !== msg.reply_id),
                  reply_count: Math.max(0, (q.reply_count ?? 1) - 1),
                }
                : q
            )
          );
          // ── typing indicator ──────────────────────────────────────────────
        } else if (msg.type === "qna.typing") {
          const { user_id: uid, user_name, is_typing } = msg;
          // Determine current user id — support both authenticated and guest
          const myId = currentUserId != null ? String(currentUserId)
            : currentGuestId != null ? `guest_${currentGuestId}` : null;
          if (uid && uid !== myId) {
            if (is_typing) {
              setTypingUsers((prev) => ({
                ...prev,
                [uid]: { user_id: uid, user_name: user_name || uid, last_seen: Date.now() },
              }));
            } else {
              setTypingUsers((prev) => {
                const next = { ...prev };
                delete next[uid];
                return next;
              });
            }
          }
        } else if (msg.type === "qna.reply_anonymized") {
          setQuestions((prev) =>
            prev.map((q) =>
              q.id === msg.question_id
                ? {
                  ...q,
                  replies: (q.replies || []).map((r) =>
                    r.id === msg.reply_id
                      ? {
                        ...r,
                        is_anonymous: msg.is_anonymous,
                        author_name: msg.is_anonymous ? "Anonymous" : r.author_name,
                        author_id: msg.is_anonymous ? null : r.author_id,
                      }
                      : r
                  ),
                }
                : q
            )
          );
        }

        // Update group vote count in real-time (deduplicated)
        if (msg.type === "qna.group_upvote") {
          const myActorId = currentUserId != null
            ? String(currentUserId)
            : currentGuestId != null
              ? `guest_${currentGuestId}`
              : null;
          setGroups((prev) =>
            prev.map((g) =>
              g.id === msg.group_id
                ? {
                  ...g,
                  aggregated_vote_count: msg.group_vote_count,
                  // Only update the current user's voted status if they are the actor
                  user_has_voted_in_group:
                    myActorId && String(msg.actor_id) === myActorId
                      ? msg.user_has_voted_in_group
                      : g.user_has_voted_in_group,
                }
                : g
            )
          );
        }

        // Group events
        if (msg.type.startsWith("qna.group_")) {
          loadGroups();
          if (isHost && msg.type.includes("suggestion")) {
            loadAiSuggestions();
          }
        }

        // A3: Public AI Suggestion Refresh
        if (msg.type === "qna.ai_public_suggestions_refresh") {
          fetchPublicSuggestions();
        }
      } catch (e) {
        console.warn("Failed to parse QnA WS message", e);
      }
    };

    ws.onerror = (e) => console.warn("QnA WebSocket error:", e);
    ws.onclose = (e) => console.debug("QnA WebSocket closed", e.code, e.reason);

    return () => {
      // Notify peers that this user stopped typing before disconnecting
      if (ws.readyState === WebSocket.OPEN) {
        try { ws.send(JSON.stringify({ type: "qna.typing", is_typing: false })); } catch (_) { }
        ws.close();
      }
      wsRef.current = null;
      // Clear typing debounce timer
      if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
      typingThrottleRef.current = 0;
      // Clear any stale typing users
      setTypingUsers({});
    };
  }, [open, eventId]);

  // ── Auto-expire stale typing users (runs every 1 s) ─────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTypingUsers((prev) => {
        const expired = Object.keys(prev).filter((k) => now - prev[k].last_seen > 5000);
        if (expired.length === 0) return prev;
        const next = { ...prev };
        expired.forEach((k) => delete next[k]);
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // ── Polish draft question via AI ──────────────────────────────────────────
  const handlePolish = async () => {
    const content = newQuestion.trim();
    if (!content || content.length < 5 || !eventId) return;
    setPolishLoading(true);
    setPolishError("");
    try {
      const res = await fetch(
        toApiUrl("interactions/questions/polish-draft/"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader() },
          body: JSON.stringify({ event_id: eventId, content }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || "Could not polish the question right now.");
      }
      setPolishDialog({ original: data.original, improved: data.improved });
    } catch (e) {
      setPolishError(e.message || "Could not polish the question right now. Please try again.");
    } finally {
      setPolishLoading(false);
    }
  };

  // ── A2: fetch private AI question suggestions ─────────────────────────────
  const fetchAiQSuggestions = async () => {
    if (!eventId || aiQSuggDismissed) return;
    setAiQSuggLoading(true);
    setAiQSuggError("");
    try {
      const res = await fetch(
        toApiUrl("interactions/questions/ai-suggestions/"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader() },
          body: JSON.stringify({ event_id: eventId, count: 3 }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (res.status === 404) {
        // No context available — silently hide the card for attendees
        return;
      }
      if (!res.ok) {
        throw new Error(data.detail || "Could not load question suggestions.");
      }
      setAiQSugg(data.suggestions || []);
    } catch (e) {
      setAiQSuggError(e.message || "Could not load question suggestions. Please try again.");
    } finally {
      setAiQSuggLoading(false);
    }
  };

  const handleDismissAiSuggestions = () => {
    setAiQSuggDismissed(true);
    localStorage.setItem(`qna_ai_sugg_dismissed_${eventId}`, "1");
  };

  const handleUseAiSuggestion = (question) => {
    setNewQuestion(question);
  };

  // ── A2: host adds presentation context ───────────────────────────────────
  const handleAddContext = async () => {
    if (!contextText.trim() || !eventId) return;
    setContextSaving(true);
    setContextSaveError("");
    setContextSaved(false);
    try {
      const res = await fetch(toApiUrl("interactions/qna-context/"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({
          event_id: eventId,
          source_type: "host_notes",
          source_title: contextTitle.trim() || "Session Notes",
          content_text: contextText.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || "Could not save context.");
      setContextSaved(true);
      setContextText("");
      setContextTitle("");
      setTimeout(() => { setContextModalOpen(false); setContextSaved(false); }, 1200);
    } catch (e) {
      setContextSaveError(e.message || "Could not save context.");
    } finally {
      setContextSaving(false);
    }
  };

  // ── A3: Public AI Question Suggestions Hub (Host) ──────────────────────────
  const fetchPublicSuggestions = async () => {
    if (!eventId) return;
    setPublicSuggLoading(true);
    setPublicSuggError("");
    try {
      const res = await fetch(toApiUrl(`interactions/ai-public-suggestions/?event_id=${eventId}`), {
        headers: authHeader(),
      });
      const data = await res.json().catch(() => []);
      if (!res.ok) throw new Error(data.detail || "Could not load suggestions.");
      setPublicSuggestions(data);
    } catch (e) {
      setPublicSuggError(e.message);
    } finally {
      setPublicSuggLoading(false);
    }
  };

  const handleGeneratePublicSuggestions = async () => {
    if (!eventId) return;
    setPublicSuggGenerating(true);
    setPublicSuggError("");
    try {
      const res = await fetch(toApiUrl("interactions/ai-public-suggestions/generate/"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ event_id: eventId, count: 5 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || "Generation failed.");
      // Refresh list
      await fetchPublicSuggestions();
    } catch (e) {
      setPublicSuggError(e.message);
    } finally {
      setPublicSuggGenerating(false);
    }
  };

  const handleSuggestionAction = async (id, action) => {
    try {
      const res = await fetch(toApiUrl(`interactions/ai-public-suggestions/${id}/${action}/`), {
        method: "POST",
        headers: authHeader(),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `Action ${action} failed.`);
      }
      await fetchPublicSuggestions();
    } catch (e) {
      setPublicSuggError(e.message);
    }
  };

  const handleAdoptSuggestion = async (suggestion) => {
    // Pre-fill the input
    setNewQuestion(suggestion.question_text);
    // Store the ID to link it when submitting
    setAdoptedSuggestionId(suggestion.id);
  };

  // ── Submit question ───────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    const content = newQuestion.trim();
    if (!content || !eventId) return;
    // Clear typing indicator before submitting
    if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
    sendQnaTyping(false);
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(toApiUrl("interactions/questions/"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({
          event: eventId,
          content,
          adopted_suggestion_id: adoptedSuggestionId
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to create question.");
      }
      setNewQuestion("");
      setAdoptedSuggestionId(null);
      await loadQuestions();
    } catch (e) {
      setError(e.message || "Failed to create question.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Question upvote ───────────────────────────────────────────────────────
  const handleUpvote = async (questionId) => {
    try {
      const res = await fetch(toApiUrl(`interactions/questions/${questionId}/upvote/`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
      });
      if (!res.ok) return;
      const data = await res.json();
      // Update the individual question's vote state
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === data.question_id
            ? { ...q, upvote_count: data.upvote_count, user_upvoted: data.upvoted }
            : q
        )
      );
      // If the question belongs to a group, update that group's aggregated count
      // and mark whether the current user has now voted in the group.
      if (data.group_id != null && data.group_vote_count != null) {
        setGroups((prev) =>
          prev.map((g) =>
            g.id === data.group_id
              ? {
                ...g,
                aggregated_vote_count: data.group_vote_count,
                user_has_voted_in_group: data.user_has_voted_in_group,
              }
              : g
          )
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  // ── Question edit / delete ────────────────────────────────────────────────
  const handleEditQuestion = async (qId, content) => {
    try {
      await fetch(toApiUrl(`interactions/questions/${qId}/`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ content }),
      });
      setQuestions((prev) =>
        prev.map((q) => (q.id === qId ? { ...q, content } : q))
      );
    } catch (e) {
      setError("Failed to edit question.");
    }
  };

  const handleDeleteQuestion = async (qId) => {
    if (!window.confirm("Delete this question?")) return;
    try {
      await fetch(toApiUrl(`interactions/questions/${qId}/`), {
        method: "DELETE",
        headers: authHeader(),
      });
      setQuestions((prev) => prev.filter((q) => q.id !== qId));
    } catch (e) {
      setError("Failed to delete question.");
    }
  };

  // ── Reply create ─────────────────────────────────────────────────────────
  const handleReplyCreate = async (questionId, content) => {
    try {
      const res = await fetch(toApiUrl(`interactions/questions/${questionId}/replies/`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to post reply.");
      }
      // WS will deliver the new reply to all clients; but we can also add optimistically.
      // The loadQuestions call below ensures consistency.
    } catch (e) {
      setError(e.message || "Failed to post reply.");
    }
  };

  // ── Reply upvote ─────────────────────────────────────────────────────────
  const handleReplyUpvote = async (replyId) => {
    try {
      const res = await fetch(toApiUrl(`interactions/replies/${replyId}/upvote/`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
      });
      if (!res.ok) return;
      const data = await res.json();
      setQuestions((prev) =>
        prev.map((q) => ({
          ...q,
          replies: (q.replies || []).map((r) =>
            r.id === data.reply_id
              ? { ...r, upvote_count: data.upvote_count, user_upvoted: data.upvoted }
              : r
          ),
        }))
      );
    } catch (e) {
      console.error(e);
    }
  };

  // ── Reply edit ───────────────────────────────────────────────────────────
  const handleReplyEdit = async (replyId, content) => {
    try {
      await fetch(toApiUrl(`interactions/replies/${replyId}/`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ content }),
      });
      setQuestions((prev) =>
        prev.map((q) => ({
          ...q,
          replies: (q.replies || []).map((r) =>
            r.id === replyId ? { ...r, content } : r
          ),
        }))
      );
    } catch (e) {
      setError("Failed to edit reply.");
    }
  };

  // ── Reply delete ─────────────────────────────────────────────────────────
  const handleReplyDelete = async (replyId) => {
    if (!window.confirm("Delete this reply?")) return;
    try {
      await fetch(toApiUrl(`interactions/replies/${replyId}/`), {
        method: "DELETE",
        headers: authHeader(),
      });
      setQuestions((prev) =>
        prev.map((q) => ({
          ...q,
          replies: (q.replies || []).filter((r) => r.id !== replyId),
          reply_count: Math.max(0, (q.reply_count ?? 1) - 1),
        }))
      );
    } catch (e) {
      setError("Failed to delete reply.");
    }
  };

  if (!open) return null;

  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        right: 0,
        height: "100vh",
        width: { xs: "100%", sm: 360, md: 400 },
        zIndex: 2000000,
        bgcolor: "#000",
        color: "#fff",
        boxShadow: 8,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box sx={{ p: 2, height: "100%", display: "flex", flexDirection: "column", gap: 1 }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            Q&amp;A
          </Typography>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Tooltip title={aiQSuggDismissed ? "Show AI Suggestions" : "Hide AI Suggestions"} arrow>
              <IconButton
                size="small"
                onClick={() => {
                  const newState = !aiQSuggDismissed;
                  setAiQSuggDismissed(newState);
                  if (!newState) localStorage.removeItem(`qna_ai_sugg_dismissed_${eventId}`);
                  else localStorage.setItem(`qna_ai_sugg_dismissed_${eventId}`, "1");
                }}
                sx={{ color: aiQSuggDismissed ? "rgba(255,255,255,0.3)" : "#9c7bff" }}
              >
                <AutoAwesomeIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <IconButton size="small" onClick={onClose} sx={{ color: "#fff" }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>

        {/* Content area */}
        <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          {error && (
            <Typography variant="caption" color="error" sx={{ mb: 1, whiteSpace: "pre-line" }}>
              {error}
            </Typography>
          )}

          {/* Ask a question */}
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              size="small"
              placeholder="Ask a question for the host..."
              value={newQuestion}
              onChange={(e) => {
                const val = e.target.value;
                setNewQuestion(val);

                if (val.length >= 3) {
                  // Debounce: reset the auto-false timer every keystroke
                  if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
                  typingDebounceRef.current = setTimeout(() => sendQnaTyping(false), 3000);

                  // Throttle: send true at most once per 2 s
                  const now = Date.now();
                  if (now - typingThrottleRef.current >= 2000) {
                    typingThrottleRef.current = now;
                    sendQnaTyping(true);
                  }
                } else {
                  // Below threshold — clear immediately
                  if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
                  sendQnaTyping(false);
                }
              }}
              disabled={!eventId || submitting}
              sx={{
                "& .MuiOutlinedInput-root": {
                  color: "#fff",
                  backgroundColor: "rgba(255,255,255,0.06)",
                  "& fieldset": { borderColor: "rgba(255,255,255,0.3)" },
                  "&:hover fieldset": { borderColor: "rgba(255,255,255,0.5)" },
                  "&.Mui-focused fieldset": { borderColor: "#fff" },
                },
                "& .MuiInputBase-input::placeholder": {
                  color: "rgba(255,255,255,0.6)",
                  opacity: 1,
                },
              }}
            />
            <Stack direction="row" justifyContent={isHost ? "space-between" : "flex-end"} alignItems="center" sx={{ mt: 1 }}>
              {isHost && (
                <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
                  <Button size="small" variant="contained" onClick={() => setGroupingMode(!groupingMode)} sx={{ textTransform: "none", bgcolor: groupingMode ? "#d32f2f" : "#1976d2" }}>
                    {groupingMode ? "Cancel Grouping" : "Group Mode"}
                  </Button>
                  {groupingMode && selectedQs.length >= 1 && (
                    <Button size="small" variant="contained" color="secondary" onClick={() => setCreateGroupModalOpen(true)} sx={{ textTransform: "none" }}>
                      Create Group ({selectedQs.length})
                    </Button>
                  )}
                  <Button size="small" variant="outlined" color="info" onClick={() => setAiModalOpen(true)} sx={{ textTransform: "none" }}>
                    AI Suggestions
                  </Button>
                  {meeting?.event?.qna_ai_public_suggestions_enabled && (
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => {
                        setPublicSuggHubOpen(true);
                        fetchPublicSuggestions();
                      }}
                      sx={{
                        textTransform: "none",
                        bgcolor: "rgba(156,123,255,0.2)",
                        color: "#c4a8ff",
                        border: "1px solid rgba(156,123,255,0.4)",
                        "&:hover": { bgcolor: "rgba(156,123,255,0.3)" },
                      }}
                    >
                      💡 Suggestion Hub
                    </Button>
                  )}
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => { setContextModalOpen(true); setContextSaved(false); setContextSaveError(""); }}
                    sx={{
                      textTransform: "none",
                      borderColor: "rgba(156,123,255,0.5)",
                      color: "#c4a8ff",
                      "&:hover": { borderColor: "#c4a8ff", bgcolor: "rgba(124,77,255,0.12)" },
                    }}
                  >
                    📋 Add Context
                  </Button>
                </Stack>
              )}
              <Stack direction="row" spacing={1} alignItems="center">
                <Tooltip title="Polish my question">
                  <span>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={handlePolish}
                      disabled={
                        !eventId ||
                        submitting ||
                        polishLoading ||
                        newQuestion.trim().length < 5
                      }
                      startIcon={polishLoading ? <CircularProgress size={13} color="inherit" /> : <AutoAwesomeIcon sx={{ fontSize: 14 }} />}
                      sx={{
                        textTransform: "none",
                        borderColor: "rgba(255,255,255,0.6)",
                        color: "#ffffff !important",
                        "& .MuiButton-startIcon": { color: "#ffffff !important" },
                        "&:hover": { borderColor: "#fff", color: "#ffffff !important" },
                        "&.Mui-disabled": { borderColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.25) !important" },
                        fontSize: "0.75rem",
                        py: 0.4,
                      }}
                    >
                      {polishLoading ? "Polishing…" : "Polish"}
                    </Button>
                  </span>
                </Tooltip>
                <Button
                  type="submit"
                  size="small"
                  variant="contained"
                  disabled={!eventId || submitting || newQuestion.trim().length === 0}
                >
                  Send
                </Button>
              </Stack>
            </Stack>

            {/* Polish inline error */}
            {polishError && (
              <Typography variant="caption" sx={{ color: "#f88", display: "block", mt: 0.5 }}>
                {polishError}
              </Typography>
            )}
          </Box>

          {/* ── A2: AI Question Suggestion Card ──────────────────────────── */}
          {!aiQSuggDismissed && (aiQSuggLoading || aiQSugg.length > 0) && (
            <Box
              sx={{
                mt: 1,
                mb: 0.5,
                borderRadius: 2,
                border: "1px solid rgba(124,77,255,0.25)",
                bgcolor: "rgba(124,77,255,0.07)",
                p: 1.25,
              }}
            >
              {/* Card header */}
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.75 }}>
                <Stack direction="row" alignItems="center" spacing={0.75}>
                  <AutoAwesomeIcon sx={{ fontSize: 14, color: "#9c7bff" }} />
                  <Typography variant="caption" sx={{ color: "#c4a8ff", fontWeight: 700, fontSize: "0.72rem", letterSpacing: 0.3 }}>
                    Need help asking a question?
                  </Typography>
                </Stack>
                <IconButton
                  size="small"
                  onClick={handleDismissAiSuggestions}
                  sx={{ color: "rgba(255,255,255,0.35)", p: 0.25 }}
                  title="Dismiss suggestions"
                >
                  <CloseIcon sx={{ fontSize: 13 }} />
                </IconButton>
              </Stack>

              {/* Loading state */}
              {aiQSuggLoading && (
                <Stack direction="row" alignItems="center" spacing={1} sx={{ py: 0.5 }}>
                  <CircularProgress size={12} sx={{ color: "#9c7bff" }} />
                  <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.45)", fontSize: "0.72rem" }}>
                    Finding relevant questions…
                  </Typography>
                </Stack>
              )}

              {/* Error state */}
              {!aiQSuggLoading && aiQSuggError && (
                <Typography variant="caption" sx={{ color: "rgba(255,120,120,0.9)", display: "block", fontSize: "0.72rem" }}>
                  {aiQSuggError}
                </Typography>
              )}

              {/* Suggestion list */}
              {!aiQSuggLoading && !aiQSuggError && aiQSugg.length > 0 && (
                <Stack spacing={0.5}>
                  {aiQSugg.map((s) => (
                    <Stack
                      key={s.id}
                      direction="row"
                      alignItems="flex-start"
                      justifyContent="space-between"
                      spacing={1}
                      sx={{
                        p: 0.75,
                        borderRadius: 1.5,
                        bgcolor: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.07)",
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          color: "rgba(255,255,255,0.85)",
                          fontSize: "0.75rem",
                          lineHeight: 1.45,
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        {s.question}
                      </Typography>
                      <Button
                        size="small"
                        onClick={() => handleUseAiSuggestion(s.question)}
                        sx={{
                          flexShrink: 0,
                          textTransform: "none",
                          fontSize: "0.68rem",
                          py: 0.3,
                          px: 0.9,
                          minWidth: 0,
                          borderRadius: 1,
                          bgcolor: "rgba(124,77,255,0.2)",
                          color: "#c4a8ff",
                          border: "1px solid rgba(124,77,255,0.3)",
                          "&:hover": { bgcolor: "rgba(124,77,255,0.35)", borderColor: "rgba(124,77,255,0.5)" },
                        }}
                      >
                        Use this
                      </Button>
                    </Stack>
                  ))}
                </Stack>
              )}

              {/* Card footer: Suggest again */}
              {!aiQSuggLoading && (
                <Stack direction="row" justifyContent="flex-end" sx={{ mt: 0.75 }}>
                  <Button
                    size="small"
                    disabled={aiQSuggLoading}
                    onClick={fetchAiQSuggestions}
                    sx={{
                      textTransform: "none",
                      fontSize: "0.68rem",
                      py: 0.2,
                      px: 0.75,
                      color: "rgba(196,168,255,0.65)",
                      "&:hover": { color: "#c4a8ff", bgcolor: "rgba(124,77,255,0.12)" },
                    }}
                  >
                    ↻ Suggest again
                  </Button>
                </Stack>
              )}
            </Box>
          )}

          {/* ── A3: Public Suggested Questions (Participant) ───────────── */}
          {meeting?.event?.qna_ai_public_suggestions_enabled && publicSuggestions.length > 0 && (
            <Box
              sx={{
                mt: 1,
                mb: 0.5,
                borderRadius: 2,
                border: "1px solid rgba(139, 92, 246, 0.3)",
                bgcolor: "rgba(139, 92, 246, 0.04)",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Box
                sx={{
                  px: 1.5,
                  py: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  userSelect: "none",
                  "&:hover": { bgcolor: "rgba(139, 92, 246, 0.08)" },
                }}
                onClick={() => setPublicSuggSectionOpen(!publicSuggSectionOpen)}
              >
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Box sx={{ color: "#9c7bff", display: "flex", alignItems: "center" }}>
                    <Typography sx={{ fontSize: 16 }}>💡</Typography>
                  </Box>
                  <Typography variant="caption" sx={{ color: "#c4a8ff", fontWeight: 700, fontSize: "0.75rem" }}>
                    Suggested Questions
                  </Typography>
                </Stack>
                {publicSuggSectionOpen ? (
                  <ExpandLessIcon sx={{ fontSize: 16, color: "rgba(255,255,255,0.4)" }} />
                ) : (
                  <ExpandMoreIcon sx={{ fontSize: 16, color: "rgba(255,255,255,0.4)" }} />
                )}
              </Box>

              <Collapse in={publicSuggSectionOpen}>
                <Box sx={{ px: 1.25, pb: 1.25 }}>
                  <Stack spacing={0.75}>
                    {publicSuggestions.map((s) => (
                      <Stack
                        key={s.id}
                        direction="row"
                        alignItems="flex-start"
                        spacing={1.5}
                        sx={{
                          p: 1.25,
                          borderRadius: 2,
                          bgcolor: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.06)",
                          transition: "all 0.2s ease",
                          "&:hover": {
                            bgcolor: "rgba(255,255,255,0.06)",
                            borderColor: "rgba(255,255,255,0.12)",
                            transform: "translateX(2px)",
                          },
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            color: "rgba(255,255,255,0.9)",
                            fontSize: "0.82rem",
                            lineHeight: 1.5,
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          {s.question_text}
                        </Typography>
                        <Button
                          size="small"
                          onClick={() => handleAdoptSuggestion(s)}
                          sx={{
                            flexShrink: 0,
                            textTransform: "none",
                            fontSize: "0.7rem",
                            py: 0.4,
                            px: 1.25,
                            minWidth: 0,
                            borderRadius: "8px",
                            bgcolor: "rgba(124,77,255,0.15)",
                            color: "#c4a8ff",
                            border: "1px solid rgba(124,77,255,0.25)",
                            "&:hover": {
                              bgcolor: "rgba(124,77,255,0.3)",
                              borderColor: "rgba(124,77,255,0.5)",
                              boxShadow: "0 4px 12px rgba(124,77,255,0.2)",
                            },
                          }}
                        >
                          Use this
                        </Button>
                      </Stack>
                    ))}
                  </Stack>
                  <Typography
                    variant="caption"
                    sx={{
                      display: "block",
                      mt: 1.25,
                      textAlign: "center",
                      color: "rgba(255,255,255,0.3)",
                      fontSize: "0.68rem",
                      fontStyle: "italic",
                    }}
                  >
                    Host has approved these questions for participant use.
                  </Typography>
                </Box>
              </Collapse>
            </Box>
          )}

          {/* Typing indicator */}
          {Object.keys(typingUsers).length > 0 && (
            <Typography
              variant="caption"
              sx={{
                display: "block",
                color: "rgba(255,255,255,0.5)",
                fontStyle: "italic",
                px: 0.5,
                mt: 0.25,
                mb: 0.25,
                letterSpacing: 0.1,
              }}
            >
              {Object.keys(typingUsers).length === 1
                ? "1 person is writing..."
                : `${Object.keys(typingUsers).length} people are writing...`}
            </Typography>
          )}

          {/* Question list */}
          <Box sx={{ flex: 1, minHeight: 0, mt: 1, overflow: "hidden" }}>
            {loading ? (
              <Box sx={{ mt: 2, display: "flex", justifyContent: "center", alignItems: "center" }}>
                <CircularProgress size={24} />
              </Box>
            ) : questions.length === 0 ? (
              <Typography
                variant="body2"
                sx={{ mt: 2, textAlign: "center", color: "rgba(255,255,255,0.7)" }}
              >
                No questions yet. Be the first to ask!
              </Typography>
            ) : (
              <List
                dense
                sx={{
                  height: "100%",
                  overflowY: "auto",
                  pr: 0.5,
                  scrollbarWidth: "thin",
                  scrollbarColor: "rgba(255,255,255,0.3) transparent",
                  "&::-webkit-scrollbar": { width: 6 },
                  "&::-webkit-scrollbar-track": { background: "transparent" },
                  "&::-webkit-scrollbar-thumb": {
                    backgroundColor: "rgba(255,255,255,0.3)",
                    borderRadius: 999,
                  },
                  "&::-webkit-scrollbar-thumb:hover": { backgroundColor: "rgba(255,255,255,0.5)" },
                }}
              >
                {(() => {
                  const groupedQuestions = {};
                  const ungroupedQuestions = [];
                  const visibleGroups = isHost ? groups : groups.filter(g => g.is_visible_to_attendees);
                  visibleGroups.forEach(g => { groupedQuestions[g.id] = []; });

                  questions.forEach(q => {
                    let assigned = false;
                    for (const g of visibleGroups) {
                      if (g.memberships && g.memberships.some(m => m.question === q.id)) {
                        groupedQuestions[g.id].push(q);
                        assigned = true;
                        break;
                      }
                    }
                    if (!assigned) ungroupedQuestions.push(q);
                  });

                  const toggleSelect = (id) => setSelectedQs(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

                  return (
                    <React.Fragment>
                      {visibleGroups.map(g => (
                        <GroupedQuestionCard
                          key={g.id}
                          g={g}
                          memberedQuestions={groupedQuestions[g.id]}
                          isHost={isHost}
                          onDelete={async (gId) => {
                            if (window.confirm('Delete this group?')) {
                              await fetch(toApiUrl(`interactions/qna-groups/${gId}/`), { method: "DELETE", headers: authHeader() });
                              loadGroups();
                            }
                          }}
                          onGroupAction={(gId, action) => {
                            if (action === "answered") {
                              console.log(`Group ${gId} marked as answered`);
                            } else if (action === "unanswered") {
                              console.log(`Group ${gId} marked as unanswered`);
                            } else if (action === "stage") {
                              console.log(`Group ${gId} put on stage`);
                            } else if (action === "unstage") {
                              console.log(`Group ${gId} removed from stage`);
                            }
                          }}
                        />
                      ))}
                      {visibleGroups.length > 0 && ungroupedQuestions.length > 0 && <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', mb: 1, mt: 1, pl: 1 }}>Ungrouped Questions</Typography>}
                      {ungroupedQuestions.map((q) => (
                        <QuestionItem
                          key={q.id} q={q} isHost={isHost} currentUserId={currentUserId} currentGuestId={currentGuestId} eventId={eventId}
                          onUpvote={handleUpvote} onReplyUpvote={handleReplyUpvote} onReplyCreate={handleReplyCreate}
                          onReplyEdit={handleReplyEdit} onReplyDelete={handleReplyDelete} onEditQuestion={handleEditQuestion}
                          onDeleteQuestion={handleDeleteQuestion}
                          selectable={groupingMode} selected={selectedQs.includes(q.id)} onSelect={toggleSelect}
                        />
                      ))}
                    </React.Fragment>
                  );
                })()}
              </List>
            )}
          </Box>
        </Box>
      </Box>

      {/* ── Add Q&A Context Modal (host only) ─────────────────────────── */}
      <Dialog
        open={contextModalOpen}
        onClose={() => setContextModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "#141414",
            color: "#fff",
            borderRadius: "16px",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
            overflow: "hidden",
          },
        }}
      >
        {/* Header */}
        <Box sx={{ background: "linear-gradient(135deg, #1a0a3e 0%, #2d1b69 60%, #3d1f8a 100%)", px: 3, py: 2.5 }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ width: 36, height: 36, borderRadius: "10px", bgcolor: "rgba(156,123,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Typography sx={{ fontSize: 18 }}>📋</Typography>
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "0.95rem", color: "#fff", lineHeight: 1.2 }}>
                Add Presentation Context
              </Typography>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.55)", fontSize: "0.72rem" }}>
                This text grounds AI question suggestions for attendees
              </Typography>
            </Box>
          </Stack>
        </Box>

        <DialogContent sx={{ px: 3, pt: 2.5, pb: 1, bgcolor: "#141414" }}>
          <TextField
            fullWidth
            size="small"
            label="Title (optional)"
            placeholder="e.g. Session Overview, Slide Deck"
            value={contextTitle}
            onChange={(e) => setContextTitle(e.target.value)}
            sx={{
              mb: 2,
              "& .MuiInputBase-input": { color: "#fff", fontSize: "0.88rem" },
              "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.45)" },
              "& .MuiInputLabel-root.Mui-focused": { color: "#c4a8ff" },
              "& .MuiOutlinedInput-root": {
                borderRadius: "10px",
                "& fieldset": { borderColor: "rgba(255,255,255,0.12)" },
                "&:hover fieldset": { borderColor: "rgba(255,255,255,0.3)" },
                "&.Mui-focused fieldset": { borderColor: "#9c7bff" },
              },
            }}
          />
          <TextField
            fullWidth
            multiline
            rows={6}
            label="Presentation content"
            placeholder={"Paste your session agenda, slide text, speaker notes, or event description here…\n\nAttendees will receive AI-generated questions grounded in this content."}
            value={contextText}
            onChange={(e) => setContextText(e.target.value)}
            sx={{
              "& .MuiInputBase-input": { color: "#fff", fontSize: "0.85rem", lineHeight: 1.55 },
              "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.45)" },
              "& .MuiInputLabel-root.Mui-focused": { color: "#c4a8ff" },
              "& .MuiInputBase-input::placeholder": { color: "rgba(255,255,255,0.3)", opacity: 1 },
              "& .MuiOutlinedInput-root": {
                borderRadius: "10px",
                "& fieldset": { borderColor: "rgba(255,255,255,0.12)" },
                "&:hover fieldset": { borderColor: "rgba(255,255,255,0.3)" },
                "&.Mui-focused fieldset": { borderColor: "#9c7bff" },
              },
            }}
          />
          {contextSaveError && (
            <Typography variant="caption" sx={{ color: "#f88", display: "block", mt: 1 }}>
              {contextSaveError}
            </Typography>
          )}
          {contextSaved && (
            <Typography variant="caption" sx={{ color: "#81c784", display: "block", mt: 1, fontWeight: 600 }}>
              ✓ Context saved! Attendees will now receive AI suggestions.
            </Typography>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2.5, bgcolor: "#141414", gap: 1 }}>
          <Button
            onClick={() => setContextModalOpen(false)}
            sx={{ textTransform: "none", color: "rgba(255,255,255,0.45)", borderRadius: "8px", px: 2, "&:hover": { bgcolor: "rgba(255,255,255,0.06)" } }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!contextText.trim() || contextSaving}
            onClick={handleAddContext}
            startIcon={contextSaving ? <CircularProgress size={14} color="inherit" /> : null}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              borderRadius: "8px",
              px: 3,
              background: "linear-gradient(135deg, #7c4dff, #651fff)",
              boxShadow: "0 4px 14px rgba(124,77,255,0.4)",
              "&:hover": { background: "linear-gradient(135deg, #651fff, #4527a0)" },
              "&.Mui-disabled": { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.3)", boxShadow: "none" },
            }}
          >
            {contextSaving ? "Saving…" : "Save Context"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Manual Group Modal */}
      <Dialog
        open={createGroupModalOpen}
        onClose={() => setCreateGroupModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "#141414",
            color: "#fff",
            borderRadius: "16px",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
            overflow: "hidden",
          },
        }}
      >
        {/* Gradient Header */}
        <Box sx={{ background: "linear-gradient(135deg, #1a237e 0%, #283593 50%, #1565c0 100%)", px: 3, py: 2.5, position: "relative" }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ width: 36, height: 36, borderRadius: "10px", bgcolor: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)" }}>
              <GroupAddIcon sx={{ fontSize: 20, color: "#fff" }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "1rem", color: "#fff", lineHeight: 1.2 }}>
                Create Q&amp;A Group
              </Typography>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.65)", fontSize: "0.72rem" }}>
                Organise selected questions into a named group
              </Typography>
            </Box>
          </Stack>
          {selectedQs.length > 0 && (
            <Chip
              label={`${selectedQs.length} question${selectedQs.length > 1 ? "s" : ""} selected`}
              size="small"
              sx={{ position: "absolute", top: 14, right: 16, bgcolor: "rgba(255,255,255,0.15)", color: "#fff", fontSize: "0.7rem", fontWeight: 600, backdropFilter: "blur(8px)" }}
            />
          )}
        </Box>

        <DialogContent sx={{ px: 3, pt: 3, pb: 1, bgcolor: "#141414" }}>
          <TextField
            fullWidth
            size="small"
            label="Group Title"
            value={newGroupTitle}
            onChange={(e) => setNewGroupTitle(e.target.value)}
            sx={{
              mb: 2.5,
              "& .MuiInputBase-input": { color: "#fff", fontSize: "0.9rem" },
              "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.45)" },
              "& .MuiInputLabel-root.Mui-focused": { color: "#64b5f6" },
              "& .MuiOutlinedInput-root": {
                borderRadius: "10px",
                "& fieldset": { borderColor: "rgba(255,255,255,0.12)" },
                "&:hover fieldset": { borderColor: "rgba(255,255,255,0.3)" },
                "&.Mui-focused fieldset": { borderColor: "#1976d2" },
              },
            }}
          />
          <TextField
            fullWidth
            size="small"
            multiline
            rows={3}
            label="Summary (Optional)"
            value={newGroupSummary}
            onChange={(e) => setNewGroupSummary(e.target.value)}
            sx={{
              "& .MuiInputBase-input": { color: "#fff", fontSize: "0.85rem" },
              "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.45)" },
              "& .MuiInputLabel-root.Mui-focused": { color: "#64b5f6" },
              "& .MuiOutlinedInput-root": {
                borderRadius: "10px",
                "& fieldset": { borderColor: "rgba(255,255,255,0.12)" },
                "&:hover fieldset": { borderColor: "rgba(255,255,255,0.3)" },
                "&.Mui-focused fieldset": { borderColor: "#1976d2" },
              },
            }}
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2.5, bgcolor: "#141414", gap: 1 }}>
          <Button
            onClick={() => setCreateGroupModalOpen(false)}
            sx={{
              color: "rgba(255,255,255,0.5)",
              textTransform: "none",
              fontWeight: 500,
              borderRadius: "8px",
              px: 2,
              "&:hover": { bgcolor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.8)" },
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!newGroupTitle.trim()}
            onClick={async () => {
              const res = await fetch(toApiUrl(`interactions/qna-groups/`), { method: "POST", headers: { "Content-Type": "application/json", ...authHeader() }, body: JSON.stringify({ event: eventId, title: newGroupTitle, summary: newGroupSummary }) });
              if (res.ok) {
                const g = await res.json();
                if (selectedQs.length) await fetch(toApiUrl(`interactions/qna-groups/${g.id}/add_questions/`), { method: "POST", headers: { "Content-Type": "application/json", ...authHeader() }, body: JSON.stringify({ question_ids: selectedQs }) });
                setCreateGroupModalOpen(false); setGroupingMode(false); setSelectedQs([]); setNewGroupTitle(""); setNewGroupSummary(""); loadGroups();
              }
            }}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              borderRadius: "8px",
              px: 3,
              background: "linear-gradient(135deg, #1976d2, #1565c0)",
              boxShadow: "0 4px 14px rgba(25,118,210,0.4)",
              "&:hover": { background: "linear-gradient(135deg, #1565c0, #0d47a1)", boxShadow: "0 6px 20px rgba(25,118,210,0.5)" },
              "&.Mui-disabled": { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.3)", boxShadow: "none" },
            }}
          >
            Create Group
          </Button>
        </DialogActions>
      </Dialog>

      {/* AI Suggestion Modal */}
      <Dialog
        open={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "#141414",
            color: "#fff",
            borderRadius: "16px",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
            overflow: "hidden",
            minHeight: "52vh",
          },
        }}
      >
        {/* Gradient Header */}
        <Box sx={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)", px: 3, py: 2.5, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box sx={{ width: 38, height: 38, borderRadius: "10px", background: "linear-gradient(135deg, #7c4dff, #651fff)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(124,77,255,0.4)" }}>
                <AutoAwesomeIcon sx={{ fontSize: 20, color: "#fff" }} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "1rem", color: "#fff", lineHeight: 1.2 }}>
                  AI Group Suggestions
                </Typography>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", fontSize: "0.72rem" }}>
                  Pending suggestions for this event
                </Typography>
              </Box>
            </Stack>
            <Button
              variant="contained"
              disabled={aiLoading}
              startIcon={aiLoading ? null : <BoltIcon sx={{ fontSize: 16 }} />}
              onClick={async () => {
                setAiLoading(true);
                try {
                  const res = await fetch(toApiUrl(`interactions/qna-groups/ai-suggest/`), { method: "POST", headers: { "Content-Type": "application/json", ...authHeader() }, body: JSON.stringify({ event_id: eventId }) });
                  if (res.ok) loadAiSuggestions(); else alert(await res.text());
                } finally { setAiLoading(false); }
              }}
              sx={{
                textTransform: "none",
                fontWeight: 600,
                borderRadius: "9px",
                px: 2.5,
                py: 0.9,
                fontSize: "0.8rem",
                background: aiLoading ? "rgba(255,255,255,0.07)" : "linear-gradient(135deg, #7c4dff, #651fff)",
                boxShadow: aiLoading ? "none" : "0 4px 14px rgba(124,77,255,0.4)",
                color: aiLoading ? "rgba(255,255,255,0.3)" : "#fff",
                "&:hover": { background: "linear-gradient(135deg, #651fff, #4527a0)", boxShadow: "0 6px 18px rgba(124,77,255,0.5)" },
                "&.Mui-disabled": { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.25)" },
              }}
            >
              {aiLoading ? "Generating…" : "Generate New"}
            </Button>
          </Stack>
          {aiLoading && <LinearProgress sx={{ mt: 2, borderRadius: 4, bgcolor: "rgba(255,255,255,0.06)", "& .MuiLinearProgress-bar": { background: "linear-gradient(90deg, #7c4dff, #651fff)" } }} />}
        </Box>

        <DialogContent sx={{ px: 3, py: 2.5, bgcolor: "#141414" }}>
          {aiSuggestions.filter(s => s.status === "pending").length === 0 ? (
            <Stack alignItems="center" justifyContent="center" spacing={2} sx={{ py: 6 }}>
              <Box sx={{ width: 64, height: 64, borderRadius: "50%", bgcolor: "rgba(124,77,255,0.1)", border: "1px solid rgba(124,77,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <AutoAwesomeIcon sx={{ fontSize: 28, color: "rgba(124,77,255,0.6)" }} />
              </Box>
              <Box sx={{ textAlign: "center" }}>
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>
                  No pending AI suggestions right now
                </Typography>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.3)", mt: 0.5, display: "block" }}>
                  Click "Generate New" to create AI-powered group suggestions
                </Typography>
              </Box>
            </Stack>
          ) : (
            <Stack spacing={2}>
              {aiSuggestions.filter(s => s.status === "pending").map(s => {
                const confidence = Math.round((s.confidence_score || 0) * 100);
                return (
                  <Card key={s.id} sx={{ bgcolor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", transition: "border-color 0.2s", "&:hover": { borderColor: "rgba(124,77,255,0.35)" } }}>
                    <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                        <Box sx={{ flex: 1 }}>
                          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                            <Typography variant="subtitle2" sx={{ color: "#fff", fontWeight: 700, fontSize: "0.88rem" }}>
                              {s.suggested_title}
                            </Typography>
                            <Chip
                              label={`${confidence}%`}
                              size="small"
                              sx={{ height: 18, fontSize: "0.65rem", fontWeight: 700, bgcolor: confidence >= 70 ? "rgba(76,175,80,0.15)" : "rgba(255,167,38,0.15)", color: confidence >= 70 ? "#81c784" : "#ffb74d", border: `1px solid ${confidence >= 70 ? "rgba(76,175,80,0.3)" : "rgba(255,167,38,0.3)"}` }}
                            />
                          </Stack>
                          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.55)", fontSize: "0.8rem", lineHeight: 1.5 }}>
                            {s.suggested_summary}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "rgba(124,77,255,0.7)", mt: 0.8, display: "block", fontWeight: 500 }}>
                            {s.suggested_question_ids.length} question{s.suggested_question_ids.length !== 1 ? "s" : ""} suggested
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                          <Button
                            size="small"
                            startIcon={<CheckCircleOutlineIcon sx={{ fontSize: 15 }} />}
                            onClick={async () => {
                              await fetch(toApiUrl(`interactions/qna-groups/ai-suggestions/${s.id}/approve/`), { method: "POST", headers: authHeader() });
                              loadAiSuggestions(); loadGroups();
                            }}
                            sx={{ textTransform: "none", fontWeight: 600, fontSize: "0.75rem", borderRadius: "7px", px: 1.5, py: 0.6, bgcolor: "rgba(76,175,80,0.12)", color: "#81c784", border: "1px solid rgba(76,175,80,0.25)", "&:hover": { bgcolor: "rgba(76,175,80,0.22)", borderColor: "rgba(76,175,80,0.5)" } }}
                          >
                            Approve
                          </Button>
                          <Button
                            size="small"
                            startIcon={<HighlightOffIcon sx={{ fontSize: 15 }} />}
                            onClick={async () => {
                              await fetch(toApiUrl(`interactions/qna-groups/ai-suggestions/${s.id}/reject/`), { method: "POST", headers: authHeader() });
                              loadAiSuggestions();
                            }}
                            sx={{ textTransform: "none", fontWeight: 600, fontSize: "0.75rem", borderRadius: "7px", px: 1.5, py: 0.6, bgcolor: "rgba(244,67,54,0.1)", color: "#ef9a9a", border: "1px solid rgba(244,67,54,0.2)", "&:hover": { bgcolor: "rgba(244,67,54,0.2)", borderColor: "rgba(244,67,54,0.45)" } }}
                          >
                            Reject
                          </Button>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })}
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, bgcolor: "#141414", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <Button
            onClick={() => setAiModalOpen(false)}
            sx={{ textTransform: "none", fontWeight: 500, borderRadius: "8px", px: 2.5, color: "rgba(255,255,255,0.5)", "&:hover": { bgcolor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.8)" } }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Polish Question Dialog ─────────────────────────────────────── */}
      <Dialog
        open={Boolean(polishDialog)}
        onClose={() => setPolishDialog(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "#141414",
            color: "#fff",
            borderRadius: "12px",
            border: "1px solid rgba(255,255,255,0.1)",
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            pb: 1,
            fontSize: "1rem",
            fontWeight: 600,
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <AutoAwesomeIcon sx={{ fontSize: 18, color: "#9c7bff" }} />
          Polish my question
        </DialogTitle>

        <DialogContent sx={{ pt: 2, pb: 1 }}>
          <Stack spacing={2}>
            {/* Original */}
            <Box>
              <Typography
                variant="caption"
                sx={{
                  color: "rgba(255,255,255,0.45)",
                  fontWeight: 600,
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                  mb: 0.5,
                  display: "block",
                }}
              >
                Original
              </Typography>
              <Box
                sx={{
                  bgcolor: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  px: 1.5,
                  py: 1.25,
                  fontSize: "0.875rem",
                  lineHeight: 1.55,
                  color: "rgba(255,255,255,0.75)",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {polishDialog?.original}
              </Box>
            </Box>

            {/* Improved */}
            <Box>
              <Typography
                variant="caption"
                sx={{
                  color: "#9c7bff",
                  fontWeight: 600,
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                  mb: 0.5,
                  display: "block",
                }}
              >
                Improved
              </Typography>
              <Box
                sx={{
                  bgcolor: "rgba(156,123,255,0.08)",
                  border: "1px solid rgba(156,123,255,0.35)",
                  borderRadius: "8px",
                  px: 1.5,
                  py: 1.25,
                  fontSize: "0.875rem",
                  lineHeight: 1.55,
                  color: "#fff",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {polishDialog?.improved}
              </Box>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions
          sx={{
            px: 2.5,
            py: 1.75,
            bgcolor: "#141414",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            gap: 1,
          }}
        >
          <Button
            onClick={() => setPolishDialog(null)}
            sx={{
              textTransform: "none",
              color: "rgba(255,255,255,0.5)",
              "&:hover": { bgcolor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.8)" },
              borderRadius: "8px",
              px: 2,
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => setPolishDialog(null)}
            variant="outlined"
            sx={{
              textTransform: "none",
              borderColor: "rgba(255,255,255,0.3)",
              color: "rgba(255,255,255,0.75)",
              "&:hover": { borderColor: "#fff", color: "#fff" },
              borderRadius: "8px",
              px: 2,
            }}
          >
            Keep original
          </Button>
          <Button
            onClick={() => {
              if (polishDialog?.improved) {
                setNewQuestion(polishDialog.improved);
              }
              setPolishDialog(null);
            }}
            variant="contained"
            sx={{
              textTransform: "none",
              bgcolor: "#7c5cbf",
              "&:hover": { bgcolor: "#6a4daa" },
              borderRadius: "8px",
              px: 2.5,
              fontWeight: 600,
            }}
          >
            Use improved
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── A3: Public AI Suggestion Hub (Host Only) ────────────────────── */}
      <Dialog
        open={publicSuggHubOpen}
        onClose={() => setPublicSuggHubOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "#0a0a0a",
            color: "#fff",
            borderRadius: "20px",
            border: "1px solid rgba(156,123,255,0.15)",
            boxShadow: "0 30px 100px rgba(0,0,0,0.8)",
            overflow: "hidden",
          },
        }}
      >
        <Box sx={{ background: "linear-gradient(135deg, #1a0a3e 0%, #2d1b69 60%, #3d1f8a 100%)", px: 3, py: 2.5 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={2}>
              <Box sx={{ width: 42, height: 42, borderRadius: "12px", bgcolor: "rgba(156,123,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <AutoAwesomeIcon sx={{ color: "#c4a8ff", fontSize: 24 }} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, fontSize: "1.1rem", color: "#fff", letterSpacing: -0.2 }}>
                  AI Suggestion Hub
                </Typography>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)", fontWeight: 500 }}>
                  Generate and publish questions for attendees to adopt.
                </Typography>
              </Box>
            </Stack>
            <IconButton onClick={() => setPublicSuggHubOpen(false)} sx={{ color: "rgba(255,255,255,0.4)", "&:hover": { color: "#fff", bgcolor: "rgba(255,255,255,0.06)" } }}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </Box>

        <DialogContent sx={{ p: 0, bgcolor: "#0a0a0a" }}>
          <Box sx={{ p: 3, borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Box>
              <Typography variant="subtitle2" sx={{ color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>
                Candidate Questions
              </Typography>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.4)" }}>
                Drafts are private. Published questions appear for all participants.
              </Typography>
            </Box>
            <Button
              variant="contained"
              disabled={publicSuggGenerating}
              onClick={handleGeneratePublicSuggestions}
              startIcon={publicSuggGenerating ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon />}
              sx={{
                textTransform: "none",
                borderRadius: "10px",
                bgcolor: "#7c5cbf",
                px: 3,
                "&:hover": { bgcolor: "#6a4daa" },
              }}
            >
              {publicSuggGenerating ? "Generating..." : "Generate AI Suggestions"}
            </Button>
          </Box>

          <Box sx={{ minHeight: 400, maxHeight: 600, overflowY: "auto", p: 2 }}>
            {publicSuggLoading && publicSuggestions.length === 0 ? (
              <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
                <CircularProgress size={30} sx={{ color: "#9c7bff" }} />
              </Box>
            ) : publicSuggestions.length === 0 ? (
              <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", py: 10, opacity: 0.5 }}>
                <AutoAwesomeIcon sx={{ fontSize: 60, mb: 2, color: "rgba(156,123,255,0.3)" }} />
                <Typography variant="body2">No suggestions generated yet.</Typography>
              </Box>
            ) : (
              <Stack spacing={2}>
                {publicSuggestions.map((s) => (
                  <Card
                    key={s.id}
                    sx={{
                      bgcolor: "rgba(255,255,255,0.03)",
                      border: "1px solid",
                      borderColor: s.status === "published" ? "rgba(102, 187, 106, 0.3)" : "rgba(255,255,255,0.08)",
                      borderRadius: "12px",
                    }}
                  >
                    <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                        <Box sx={{ flex: 1 }}>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                            <Chip
                              label={s.status.toUpperCase()}
                              size="small"
                              sx={{
                                fontSize: "10px",
                                fontWeight: 700,
                                height: 20,
                                bgcolor: s.status === "published" ? "rgba(76, 175, 80, 0.2)" : "rgba(255,255,255,0.1)",
                                color: s.status === "published" ? "#81c784" : "rgba(255,255,255,0.6)",
                                border: "1px solid",
                                borderColor: s.status === "published" ? "rgba(76, 175, 80, 0.3)" : "rgba(255,255,255,0.15)",
                              }}
                            />
                            {s.confidence_score > 0 && (
                              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.3)", fontSize: "11px" }}>
                                AI Confidence: {(s.confidence_score * 100).toFixed(0)}%
                              </Typography>
                            )}
                          </Stack>
                          <Typography variant="body1" sx={{ color: "#fff", fontWeight: 500, mb: 1.5, lineHeight: 1.5 }}>
                            {s.question_text}
                          </Typography>
                          {s.rationale && (
                            <Box sx={{ p: 1.5, bgcolor: "rgba(156,123,255,0.05)", borderRadius: "8px", borderLeft: "3px solid #9c7bff" }}>
                              <Typography variant="caption" sx={{ color: "rgba(196,168,255,0.8)", fontStyle: "italic", display: "block" }}>
                                Rationale: {s.rationale}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                        <Stack spacing={1}>
                          {s.status !== "published" && (
                            <Button
                              variant="contained"
                              size="small"
                              color="success"
                              onClick={() => handleSuggestionAction(s.id, "publish")}
                              sx={{ textTransform: "none", bgcolor: "#2e7d32", "&:hover": { bgcolor: "#1b5e20" } }}
                            >
                              Publish
                            </Button>
                          )}
                          {s.status === "draft" && (
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => handleSuggestionAction(s.id, "reject")}
                              sx={{ textTransform: "none", color: "#ef5350", borderColor: "rgba(239, 83, 80, 0.4)" }}
                            >
                              Reject
                            </Button>
                          )}
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
