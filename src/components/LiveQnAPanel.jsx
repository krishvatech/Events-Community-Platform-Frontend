// src/components/LiveQnAPanel.jsx
import React, { useEffect, useState, useCallback } from "react";
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
} from "@mui/material";
import ThumbUpAltOutlinedIcon from "@mui/icons-material/ThumbUpAltOutlined";
import ThumbUpAltIcon from "@mui/icons-material/ThumbUpAlt";
import CloseIcon from "@mui/icons-material/Close";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";

// --- same API pattern as other pages ---
const API_ROOT = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api"
).replace(/\/$/, "");

function getToken() {
  return (
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
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

/**
 * Q&A sidebar only
 */
export default function LiveQnAPanel({
  open,
  onClose,
  eventId,
  meeting,      // kept for future, not used right now
  activeTab,    // ignored, we always show Q&A
  onChangeTab,  // ignored
  isHost = false, // <--- NEW PROP
  currentUserId,  // <--- NEW PROP
}) {
  // --- Q&A state ---
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [error, setError] = useState("");

  // Editing state
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState("");

  const loadQuestions = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        toApiUrl(
          `interactions/questions/?event_id=${encodeURIComponent(eventId)}`
        ),
        {
          headers: {
            "Content-Type": "application/json",
            ...authHeader(),
          },
        }
      );

      if (!res.ok) {
        let msg = "Failed to load questions.";
        try {
          const data = await res.json();
          msg = data.detail || data.error || msg;
        } catch (_) { }
        throw new Error(msg);
      }

      const data = await res.json();
      setQuestions(data);
    } catch (e) {
      console.error(e);
      setError(e.message || "Failed to load questions.");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  // Load Q&A questions when sidebar opens
  useEffect(() => {
    if (!open) return;
    loadQuestions();
  }, [open, loadQuestions]);

  // WebSocket for Q&A live updates
  useEffect(() => {
    if (!open || !eventId) return;

    const API_RAW =
      import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";
    const WS_ROOT = API_RAW.replace(/^http/, "ws").replace(/\/api\/?$/, "");

    const token = getToken();
    const qs = token ? `?token=${encodeURIComponent(token)}` : "";

    const wsUrl = `${WS_ROOT}/ws/events/${eventId}/qna/${qs}`;
    console.log("QnA WS URL:", wsUrl);

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.debug("QnA WebSocket connected");
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === "qna.upvote") {
          setQuestions((prev) =>
            prev.map((q) =>
              q.id === msg.question_id
                ? {
                  ...q,
                  upvote_count: msg.upvote_count,
                  upvoters: msg.upvoters ?? q.upvoters,
                }
                : q
            )
          );
        }

        if (msg.type === "qna.question") {
          setQuestions((prev) => {
            if (prev.some((q) => q.id === msg.question_id)) return prev;
            const newQ = {
              id: msg.question_id,
              content: msg.content,
              user_id: msg.user_id,
              event_id: msg.event_id,
              upvote_count: msg.upvote_count ?? 0,
              user_upvoted: false,
              created_at: msg.created_at,
            };
            return [newQ, ...prev];
          });
        }

        if (msg.type === "qna.update") {
          setQuestions((prev) =>
            prev.map((q) =>
              q.id === msg.question_id
                ? { ...q, content: msg.content }
                : q
            )
          );
        }

        if (msg.type === "qna.delete") {
          setQuestions((prev) => prev.filter((q) => q.id !== msg.question_id));
        }
      } catch (e) {
        console.warn("Failed to parse QnA WS message", e);
      }
    };

    ws.onerror = (e) => {
      console.warn("QnA WebSocket error:", e);
    };

    ws.onclose = (e) => {
      console.debug("QnA WebSocket closed", e.code, e.reason);
    };

    return () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [open, eventId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const content = newQuestion.trim();
    if (!content || !eventId) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(toApiUrl("interactions/questions/"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeader(),
        },
        body: JSON.stringify({
          event: eventId,
          content,
        }),
      });

      if (!res.ok) {
        let msg = "Failed to create question.";
        try {
          const data = await res.json();
          msg = data.detail || data.error || msg;
        } catch (_) { }
        throw new Error(msg);
      }

      setNewQuestion("");
      await loadQuestions();
    } catch (e) {
      console.error(e);
      setError(e.message || "Failed to create question.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpvote = async (questionId) => {
    if (!eventId) return;
    setError("");

    try {
      const res = await fetch(
        toApiUrl(`interactions/questions/${questionId}/upvote/`),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeader(),
          },
        }
      );

      if (!res.ok) {
        let msg = "Failed to update vote.";
        try {
          const data = await res.json();
          msg = data.detail || data.error || msg;
        } catch (_) { }
        throw new Error(msg);
      }

      const data = await res.json(); // { question_id, upvoted, upvote_count }

      setQuestions((prev) =>
        prev.map((q) =>
          q.id === data.question_id
            ? {
              ...q,
              upvote_count: data.upvote_count,
              user_upvoted: data.upvoted,
            }
            : q
        )
      );
    } catch (e) {
      console.error(e);
      setError(e.message || "Failed to update vote.");
    }
  };

  const handleEditSubmit = async (qId) => {
    if (!editContent.trim()) return;

    try {
      const res = await fetch(toApiUrl(`interactions/questions/${qId}/`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeader(),
        },
        body: JSON.stringify({ content: editContent.trim() }),
      });

      if (!res.ok) throw new Error("Failed to edit");

      setEditingId(null);
      setEditContent("");
    } catch (e) {
      console.error(e);
      setError("Failed to edit question");
    }
  };

  const handleDelete = async (qId) => {
    if (!window.confirm("Delete this question?")) return;
    try {
      const res = await fetch(toApiUrl(`interactions/questions/${qId}/`), {
        method: "DELETE",
        headers: { ...authHeader() },
      });
      if (!res.ok) throw new Error("Failed to delete");
    } catch (e) {
      console.error(e);
      setError("Failed to delete question");
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
      <Box
        sx={{
          p: 2,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
      >
        {/* Header */}
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 1 }}
        >
          <Typography variant="subtitle1" fontWeight={600}>
            Q&amp;A
          </Typography>
          <IconButton size="small" onClick={onClose} sx={{ color: "#fff" }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>

        {/* Q&A content area */}
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {error && (
            <Typography
              variant="caption"
              color="error"
              sx={{ mb: 1, whiteSpace: "pre-line" }}
            >
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
              onChange={(e) => setNewQuestion(e.target.value)}
              disabled={!eventId || submitting}
              sx={{
                "& .MuiOutlinedInput-root": {
                  color: "#fff",
                  backgroundColor: "rgba(255,255,255,0.06)",
                  "& fieldset": {
                    borderColor: "rgba(255,255,255,0.3)",
                  },
                  "&:hover fieldset": {
                    borderColor: "rgba(255,255,255,0.5)",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#fff",
                  },
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
                disabled={
                  !eventId || submitting || newQuestion.trim().length === 0
                }
              >
                Send
              </Button>
            </Stack>
          </Box>

          {/* List of questions (scrollable) */}
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              mt: 1,
              overflow: "hidden",
            }}
          >
            {loading ? (
              <Box
                sx={{
                  mt: 2,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <CircularProgress size={24} />
              </Box>
            ) : questions.length === 0 ? (
              <Typography
                variant="body2"
                sx={{
                  mt: 2,
                  textAlign: "center",
                  color: "rgba(255,255,255,0.7)",
                }}
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
                  "&::-webkit-scrollbar": {
                    width: 6,
                  },
                  "&::-webkit-scrollbar-track": {
                    background: "transparent",
                  },
                  "&::-webkit-scrollbar-thumb": {
                    backgroundColor: "rgba(255,255,255,0.3)",
                    borderRadius: 999,
                  },
                  "&::-webkit-scrollbar-thumb:hover": {
                    backgroundColor: "rgba(255,255,255,0.5)",
                  },
                }}
              >
                {questions.map((q) => {
                  const isEditing = editingId === q.id;
                  const canManage = isHost || (currentUserId && q.user_id === currentUserId);

                  return (
                    <ListItem key={q.id} disableGutters sx={{ mb: 0.5 }}>
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
                        {isEditing ? (
                          // --- EDIT MODE ---
                          <Box component="form" onSubmit={(e) => { e.preventDefault(); handleEditSubmit(q.id); }}>
                            <TextField
                              fullWidth
                              size="small"
                              autoFocus
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Escape") {
                                  setEditingId(null);
                                }
                              }}
                              sx={{
                                mb: 1,
                                "& .MuiOutlinedInput-root": {
                                  color: "#fff",
                                  bgcolor: "rgba(255,255,255,0.1)",
                                  "& fieldset": { borderColor: "rgba(255,255,255,0.3)" },
                                }
                              }}
                            />
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              <Button
                                size="small"
                                onClick={() => setEditingId(null)}
                                sx={{ color: "rgba(255,255,255,0.7)" }}
                              >
                                Cancel
                              </Button>
                              <Button type="submit" size="small" variant="contained">
                                Save
                              </Button>
                            </Stack>
                          </Box>
                        ) : (
                          // --- VIEW MODE ---
                          <Stack
                            direction="row"
                            spacing={1}
                            justifyContent="space-between"
                            alignItems="flex-start"
                          >
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <ListItemText
                                primary={q.content}
                                secondary={
                                  q.created_at
                                    ? new Date(q.created_at).toLocaleTimeString()
                                    : null
                                }
                                primaryTypographyProps={{
                                  variant: "body2",
                                  sx: { color: "#fff", whiteSpace: "pre-wrap", wordBreak: "break-word" },
                                }}
                                secondaryTypographyProps={{
                                  variant: "caption",
                                  sx: { color: "rgba(255,255,255,0.6)" },
                                }}
                              />
                              {/* Edit/Delete Actions */}
                              {canManage && (
                                <Stack direction="row" spacing={0} sx={{ mt: 0.5 }}>
                                  <IconButton
                                    size="small"
                                    onClick={() => {
                                      setEditingId(q.id);
                                      setEditContent(q.content);
                                    }}
                                    sx={{ color: "rgba(255,255,255,0.5)", p: 0.5 }}
                                  >
                                    <EditRoundedIcon sx={{ fontSize: 16 }} />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDelete(q.id)}
                                    sx={{ color: "rgba(255,255,255,0.5)", p: 0.5 }}
                                  >
                                    <DeleteOutlineRoundedIcon sx={{ fontSize: 16 }} />
                                  </IconButton>
                                </Stack>
                              )}
                            </Box>

                            <Box
                              sx={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                minWidth: 40,
                              }}
                            >
                              <Tooltip
                                arrow
                                placement="left"
                                title={
                                  q.upvoters && q.upvoters.length > 0 ? (
                                    <Box
                                      sx={{
                                        display: "flex",
                                        flexDirection: "column",
                                      }}
                                    >
                                      {q.upvoters.slice(0, 5).map((u) => (
                                        <Typography
                                          key={u.id}
                                          variant="caption"
                                          sx={{ display: "block" }}
                                        >
                                          {u.name ||
                                            u.username ||
                                            `User ${u.id}`}
                                        </Typography>
                                      ))}
                                      {q.upvoters.length > 5 && (
                                        <Typography
                                          variant="caption"
                                          sx={{ mt: 0.5 }}
                                        >
                                          +{q.upvoters.length - 5} more
                                        </Typography>
                                      )}
                                    </Box>
                                  ) : (
                                    "No votes yet"
                                  )
                                }
                              >
                                <IconButton
                                  size="small"
                                  onClick={() => handleUpvote(q.id)}
                                  sx={{
                                    color: q.user_upvoted
                                      ? "#4dabf5"
                                      : "rgba(255,255,255,0.7)",
                                  }}
                                >
                                  {q.user_upvoted ? (
                                    <ThumbUpAltIcon fontSize="small" />
                                  ) : (
                                    <ThumbUpAltOutlinedIcon fontSize="small" />
                                  )}
                                </IconButton>
                              </Tooltip>

                              <Typography
                                variant="caption"
                                sx={{ color: "rgba(255,255,255,0.8)" }}
                              >
                                {q.upvote_count ?? 0}
                              </Typography>
                            </Box>
                          </Stack>
                        )}
                      </Paper>
                    </ListItem>
                  );
                })}
              </List>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
