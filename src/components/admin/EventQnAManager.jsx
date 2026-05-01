import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Tooltip,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";

const RAW = import.meta.env.VITE_API_BASE_URL || "";
const BASE = RAW.replace(/\/+$/, "");
const API_ROOT = BASE.endsWith("/api") ? BASE : `${BASE}/api`;

const getToken = () =>
  localStorage.getItem("access_token") ||
  localStorage.getItem("access") ||
  "";

export default function EventQnAManager({ event, onEventUpdated }) {
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [allQuestions, setAllQuestions] = useState([]);
  const [postEventAnswered, setPostEventAnswered] = useState([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [visibilityFilter, setVisibilityFilter] = useState("all");
  const [feedbackFilter, setFeedbackFilter] = useState("all");
  const [editing, setEditing] = useState(null);
  const [editText, setEditText] = useState("");
  const [feedbackFor, setFeedbackFor] = useState(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [groupLoading, setGroupLoading] = useState(false);
  const [groups, setGroups] = useState([]);
  const [setupSaving, setSetupSaving] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const authHeaders = useMemo(() => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  }), []);

  const load = useCallback(async () => {
    if (!event?.id) return;
    setLoading(true);
    setError("");
    try {
      const [preRes, allRes, postAnsRes] = await Promise.all([
        fetch(`${API_ROOT}/interactions/questions/admin-pre-event/?event_id=${event.id}`, { headers: authHeaders }),
        fetch(`${API_ROOT}/interactions/questions/?event_id=${event.id}`, { headers: authHeaders }),
        fetch(`${API_ROOT}/interactions/questions/post_event_answered/?event_id=${event.id}`, { headers: authHeaders }),
      ]);
      if (!preRes.ok) throw new Error("Failed to load pre-event questions.");
      const preData = await preRes.json();
      const allData = allRes.ok ? await allRes.json() : [];
      const postAnsData = postAnsRes.ok ? await postAnsRes.json() : [];
      setQuestions(Array.isArray(preData) ? preData : []);
      setAllQuestions(Array.isArray(allData) ? allData : []);
      setPostEventAnswered(Array.isArray(postAnsData) ? postAnsData : []);
    } catch (e) {
      setError(e.message || "Failed to load Q&A data.");
    } finally {
      setLoading(false);
    }
  }, [event?.id, authHeaders]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (search && !`${q.content || ""}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== "all" && q.moderation_status !== statusFilter) return false;
      if (visibilityFilter === "hidden" && !q.is_hidden) return false;
      if (visibilityFilter === "visible" && q.is_hidden) return false;
      const hasFeedback = !!(q.feedback_message || "").trim();
      if (feedbackFilter === "has_feedback" && !hasFeedback) return false;
      if (feedbackFilter === "no_feedback" && hasFeedback) return false;
      return true;
    });
  }, [questions, search, statusFilter, visibilityFilter, feedbackFilter]);

  const doAction = async (url, method = "POST", body = null) => {
    const res = await fetch(url, {
      method,
      headers: authHeaders,
      body: body ? JSON.stringify(body) : null,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || `Request failed (${res.status})`);
    }
    return res.status === 204 ? null : res.json().catch(() => null);
  };

  const handleSetupSave = async (field, value) => {
    if (!event?.id) return;
    setSetupSaving(true);
    try {
      const res = await doAction(`${API_ROOT}/events/${event.id}/`, "PATCH", { [field]: value });
      if (res && onEventUpdated) onEventUpdated(res);
    } finally {
      setSetupSaving(false);
    }
  };

  const handleAiGroup = async () => {
    if (!event?.id) return;
    setGroupLoading(true);
    try {
      const data = await doAction(`${API_ROOT}/interactions/qna-groups/ai-suggest/`, "POST", { event_id: event.id });
      const rows = (Array.isArray(data) ? data : []).map((d) => ({
        title: d.suggested_title || "Group",
        summary: d.suggested_summary || "",
        question_ids: d.suggested_question_ids || [],
      }));
      setGroups(rows);
    } catch (e) {
      setError(e.message || "Failed to generate groups.");
    } finally {
      setGroupLoading(false);
    }
  };

  const unansweredPostEvent = useMemo(
    () => allQuestions.filter((q) => !q.is_answered && !q.is_deleted),
    [allQuestions]
  );

  const sectionSx = {
    p: { xs: 2, md: 2.5 },
    borderRadius: 4,
    border: "1px solid",
    borderColor: "rgba(15,23,42,0.14)",
    backgroundColor: "#f8fafc",
    boxShadow: "0 2px 6px rgba(15,23,42,0.06)",
  };

  return (
    <Stack spacing={2}>
      {error && <Alert severity="error">{error}</Alert>}

      <Paper sx={sectionSx}>
        <Typography variant="h5" sx={{ fontWeight: 500 }}>Q&A Setup</Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mt={1.5} flexWrap="wrap">
          <FormControlLabel control={<Switch checked={!!event?.pre_event_qna_enabled} onChange={(e) => handleSetupSave("pre_event_qna_enabled", e.target.checked)} disabled={setupSaving} />} label="Enable pre-event Q&A" />
          <FormControlLabel control={<Switch checked={!!event?.qna_moderation_enabled} onChange={(e) => handleSetupSave("qna_moderation_enabled", e.target.checked)} disabled={setupSaving} />} label="Enable Q&A moderation" />
          <FormControlLabel control={<Switch checked={!!event?.qna_anonymous_mode} onChange={(e) => handleSetupSave("qna_anonymous_mode", e.target.checked)} disabled={setupSaving} />} label="Enable anonymous Q&A mode" />
          <FormControlLabel control={<Switch checked={!!event?.qna_ai_public_suggestions_enabled} onChange={(e) => handleSetupSave("qna_ai_public_suggestions_enabled", e.target.checked)} disabled={setupSaving} />} label="Enable AI public suggestions" />
        </Stack>
      </Paper>

      <Paper sx={sectionSx}>
        <Typography variant="h4" sx={{ fontSize: 40 }}></Typography>
        <Typography variant="h5" sx={{ fontWeight: 500 }}>Pre-event Q&A</Typography>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.2} mt={1.5} alignItems={{ xs: "stretch", md: "center" }}>
          <TextField size="small" label="Search" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ minWidth: { md: 260 } }} />
          <FormControl size="small" sx={{ minWidth: { md: 160 } }}><InputLabel>Status</InputLabel><Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}><MenuItem value="all">All</MenuItem><MenuItem value="pending">Pending</MenuItem><MenuItem value="approved">Approved</MenuItem><MenuItem value="rejected">Rejected</MenuItem></Select></FormControl>
          <FormControl size="small" sx={{ minWidth: { md: 160 } }}><InputLabel>Visibility</InputLabel><Select value={visibilityFilter} label="Visibility" onChange={(e) => setVisibilityFilter(e.target.value)}><MenuItem value="all">All</MenuItem><MenuItem value="visible">Visible</MenuItem><MenuItem value="hidden">Hidden</MenuItem></Select></FormControl>
          <FormControl size="small" sx={{ minWidth: { md: 160 } }}><InputLabel>Feedback</InputLabel><Select value={feedbackFilter} label="Feedback" onChange={(e) => setFeedbackFilter(e.target.value)}><MenuItem value="all">All</MenuItem><MenuItem value="has_feedback">Has feedback</MenuItem><MenuItem value="no_feedback">No feedback</MenuItem></Select></FormControl>
        </Stack>
        <Divider sx={{ my: 2 }} />
        {loading ? <CircularProgress size={22} /> : (
          <Stack spacing={1.5}>
            {filteredQuestions.length === 0 && (
              <Typography variant="body2" color="text.secondary">No pre-event questions for current filters.</Typography>
            )}
            {filteredQuestions.map((q) => (
              <Paper key={q.id} variant="outlined" sx={{ p: 1.6, borderRadius: 2.5, backgroundColor: "#ffffff" }}>
                <Stack direction="row" spacing={1} alignItems="center" mb={1} flexWrap="wrap">
                  <Chip
                    size="small"
                    color={q.moderation_status === "approved" ? "success" : q.moderation_status === "rejected" ? "error" : "warning"}
                    variant={q.moderation_status === "approved" ? "filled" : "outlined"}
                    label={(q.moderation_status || "approved").toUpperCase()}
                  />
                  <Chip
                    size="small"
                    icon={q.is_hidden ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
                    label={q.is_hidden ? "HIDDEN" : "VISIBLE"}
                    variant="outlined"
                  />
                  {q.feedback_message ? <Chip size="small" color="info" label="Feedback added" /> : null}
                </Stack>
                <Typography variant="body2" sx={{ mb: 0.6 }}>{q.content}</Typography>
                {q.feedback_message ? (
                  <Alert severity="info" sx={{ mt: 0.5, py: 0 }}>
                    <Typography variant="caption">Feedback: {q.feedback_message}</Typography>
                  </Alert>
                ) : null}
                <Stack direction="row" spacing={1} mt={1} flexWrap="wrap">
                  <Button size="small" variant="outlined" onClick={() => { setEditing(q); setEditText(q.content || ""); }}>Edit</Button>
                  <Tooltip title={q.is_hidden ? "Make question visible to attendees" : "Hide question from attendee view"}>
                    <Button size="small" variant="outlined" onClick={async () => {
                      setActionLoadingId(q.id);
                      try { await doAction(`${API_ROOT}/interactions/questions/${q.id}/set-visibility/`, "POST", { is_hidden: !q.is_hidden }); await load(); }
                      finally { setActionLoadingId(null); }
                    }}>
                      {q.is_hidden ? "Unhide" : "Hide"}
                    </Button>
                  </Tooltip>
                  <Button size="small" color="error" variant="outlined" onClick={async () => {
                    setActionLoadingId(q.id);
                    try { await doAction(`${API_ROOT}/interactions/questions/${q.id}/admin-soft-delete/`, "POST"); await load(); }
                    finally { setActionLoadingId(null); }
                  }}>Delete</Button>
                  <Button size="small" color="success" variant="outlined" onClick={async () => {
                    setActionLoadingId(q.id);
                    try { await doAction(`${API_ROOT}/interactions/questions/${q.id}/approve/`, "POST"); await load(); }
                    finally { setActionLoadingId(null); }
                  }}>Approve</Button>
                  <Button size="small" color="warning" variant="outlined" onClick={async () => {
                    setActionLoadingId(q.id);
                    try { await doAction(`${API_ROOT}/interactions/questions/${q.id}/reject/`, "POST", { reason: "Rejected by moderator" }); await load(); }
                    finally { setActionLoadingId(null); }
                  }}>Reject</Button>
                  <Button size="small" variant="contained" onClick={() => { setFeedbackFor(q); setFeedbackText(q.feedback_message || ""); }}>Feedback</Button>
                  {actionLoadingId === q.id ? <CircularProgress size={16} /> : null}
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </Paper>

      <Paper sx={sectionSx}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h5" sx={{ fontWeight: 500 }}>AI Grouping</Typography>
          <Button
            variant="contained"
            onClick={handleAiGroup}
            disabled={groupLoading}
            sx={{
              textTransform: "uppercase",
              borderRadius: 2,
              bgcolor: "#14b8a6",
              "&:hover": { bgcolor: "#0d9488" },
            }}
          >
            {groupLoading ? "Grouping..." : "Group Similar Questions"}
          </Button>
        </Stack>
        <Typography variant="body2" color="text.secondary">Groups are suggestions only. Questions are not permanently changed until you approve suggestions.</Typography>
        <Stack spacing={1} mt={1}>
          {groups.map((g, i) => (
            <Paper key={`${g.title}-${i}`} variant="outlined" sx={{ p: 1.25 }}>
              <Typography variant="subtitle2">{g.title}</Typography>
              <Typography variant="body2">{g.summary}</Typography>
              <Typography variant="caption">Question IDs: {(g.question_ids || []).join(", ") || "—"}</Typography>
            </Paper>
          ))}
        </Stack>
      </Paper>

      <Paper sx={sectionSx}>
        <Typography variant="h5" sx={{ fontWeight: 500 }}>Post-event Q&A</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 0.4 }}>
          Unanswered: {unansweredPostEvent.length} | Answered (post-event): {postEventAnswered.length}
        </Typography>
        <Button sx={{ mt: 1.5, textTransform: "uppercase", color: "#14b8a6" }} onClick={load}>Refresh Post-event Q&A</Button>
      </Paper>

      <Dialog open={!!editing} onClose={() => setEditing(null)} fullWidth maxWidth="sm">
        <DialogTitle>Edit Question</DialogTitle>
        <DialogContent><TextField fullWidth multiline minRows={3} value={editText} onChange={(e) => setEditText(e.target.value)} /></DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(null)}>Cancel</Button>
          <Button onClick={async () => { await doAction(`${API_ROOT}/interactions/questions/${editing.id}/admin-pre-event/`, "PATCH", { content: editText }); setEditing(null); load(); }} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!feedbackFor} onClose={() => setFeedbackFor(null)} fullWidth maxWidth="sm">
        <DialogTitle>Question Feedback</DialogTitle>
        <DialogContent><TextField fullWidth multiline minRows={3} value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} placeholder="Feedback message" /></DialogContent>
        <DialogActions>
          <Button onClick={() => setFeedbackFor(null)}>Cancel</Button>
          <Button onClick={async () => { await doAction(`${API_ROOT}/interactions/questions/${feedbackFor.id}/feedback/`, "POST", { feedback_message: feedbackText }); setFeedbackFor(null); load(); }} variant="contained">Save Feedback</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
