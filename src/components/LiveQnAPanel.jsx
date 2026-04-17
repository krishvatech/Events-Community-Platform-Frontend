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
} from "@mui/material";
import ThumbUpAltOutlinedIcon from "@mui/icons-material/ThumbUpAltOutlined";
import ThumbUpAltIcon from "@mui/icons-material/ThumbUpAlt";
import CloseIcon from "@mui/icons-material/Close";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import ReplyIcon from "@mui/icons-material/Reply";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";

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
  onUpvote,
  onReplyUpvote,
  onReplyCreate,
  onReplyEdit,
  onReplyDelete,
  onEditQuestion,
  onDeleteQuestion,
}) {
  const canManage = isHost || (currentUserId && q.user_id === currentUserId);

  const [isEditingQuestion, setIsEditingQuestion] = useState(false);
  const [editQuestionContent, setEditQuestionContent] = useState(q.content);

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
              onChange={(e) => setEditQuestionContent(e.target.value)}
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
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button size="small" onClick={() => setIsEditingQuestion(false)} sx={{ color: "rgba(255,255,255,0.7)" }}>
                Cancel
              </Button>
              <Button type="submit" size="small" variant="contained">Save</Button>
            </Stack>
          </Box>
        ) : (
          <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="flex-start">
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
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [error, setError] = useState("");

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

  useEffect(() => {
    if (!open) return;
    loadQuestions();
  }, [open, loadQuestions]);

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
        body: JSON.stringify({ event: eventId, content }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to create question.");
      }
      setNewQuestion("");
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
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === data.question_id
            ? { ...q, upvote_count: data.upvote_count, user_upvoted: data.upvoted }
            : q
        )
      );
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
          <IconButton size="small" onClick={onClose} sx={{ color: "#fff" }}>
            <CloseIcon fontSize="small" />
          </IconButton>
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
            <Stack direction="row" justifyContent="flex-end" sx={{ mt: 1 }}>
              <Button
                type="submit"
                size="small"
                variant="contained"
                disabled={!eventId || submitting || newQuestion.trim().length === 0}
              >
                Send
              </Button>
            </Stack>
          </Box>

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
                {questions.map((q) => (
                  <QuestionItem
                    key={q.id}
                    q={q}
                    isHost={isHost}
                    currentUserId={currentUserId}
                    currentGuestId={currentGuestId}
                    onUpvote={handleUpvote}
                    onReplyUpvote={handleReplyUpvote}
                    onReplyCreate={handleReplyCreate}
                    onReplyEdit={handleReplyEdit}
                    onReplyDelete={handleReplyDelete}
                    onEditQuestion={handleEditQuestion}
                    onDeleteQuestion={handleDeleteQuestion}
                  />
                ))}
              </List>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
