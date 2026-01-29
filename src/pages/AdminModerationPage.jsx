// src/pages/AdminModerationPage.jsx
import * as React from "react";
import {
  Box,
  Paper,
  Stack,
  Typography,
  Chip,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  LinearProgress,
  CircularProgress,
  Tabs,
  Tab,
} from "@mui/material";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";

import AdminProfileModerationPage from "./AdminProfileModerationPage";

const API_ROOT = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");
function getToken() {
  return (
    localStorage.getItem("access_token") ||
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
  try { return new URL(pathOrUrl).toString(); } catch {
    const rel = String(pathOrUrl).replace(/^\/+/, "");
    return `${API_ROOT}/${rel}`;
  }
}

function formatWhen(iso) {
  if (!iso) return "";
  try { return new Date(iso).toLocaleString(); } catch { return String(iso); }
}

function buildPatch(item, text, title) {
  if (item.content_kind === "comment") return { text };
  const type = (item.content?.type || "text").toLowerCase();
  if (type === "image") return { caption: text };
  if (type === "link") {
    const out = {};
    if (text) out.description = text;
    if (title) out.title = title;
    return out;
  }
  if (type === "poll") return { question: title || text };
  return { text };
}

export default function AdminModerationPage() {
  // Top-level tab: 0 = Content, 1 = Profiles
  const [viewMode, setViewMode] = React.useState(0);

  // Content Moderation State
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [status, setStatus] = React.useState("under_review");
  const [query, setQuery] = React.useState("");
  const [actionBusy, setActionBusy] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState(null);
  const [editText, setEditText] = React.useState("");
  const [editTitle, setEditTitle] = React.useState("");
  const [editNote, setEditNote] = React.useState("");
  const [confirmTarget, setConfirmTarget] = React.useState(null);

  const fetchQueue = React.useCallback(async () => {
    // Only fetch if in content mode
    if (viewMode !== 0) return;

    setLoading(true);
    try {
      const url = new URL(`${API_ROOT}/moderation/queue/`);
      if (status && status !== "all") url.searchParams.set("status", status);
      const res = await fetch(url.toString(), { headers: { Accept: "application/json", ...authHeader() } });
      const j = res.ok ? await res.json() : {};
      const rows = Array.isArray(j?.results) ? j.results : (Array.isArray(j) ? j : []);
      setItems(rows);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [status, viewMode]);

  React.useEffect(() => { fetchQueue(); }, [fetchQueue]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => {
      const text = [
        i?.content?.text,
        i?.content?.title,
        i?.author?.first_name,
        i?.author?.last_name,
        i?.author?.username,
      ].filter(Boolean).join(" ").toLowerCase();
      return text.includes(q);
    });
  }, [items, query]);

  async function runAction(item, action, patch, note) {
    if (!item) return;
    setActionBusy(true);
    try {
      const payload = {
        target_type: item.target_type,
        target_id: item.target_id,
        action,
      };
      if (patch) payload.patch = patch;
      if (note) payload.note = note;

      const res = await fetch(toApiUrl("moderation/actions/"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchQueue();
    } catch (e) {
      alert("Moderation action failed. Please try again.");
    } finally {
      setActionBusy(false);
    }
  }

  function openEdit(item) {
    setEditTarget(item);
    setEditText(item?.content?.text || "");
    setEditTitle(item?.content?.title || "");
    setEditNote("");
    setEditOpen(true);
  }

  async function submitEdit() {
    if (!editTarget) return;
    const patch = buildPatch(editTarget, editText, editTitle);
    if (!patch || Object.keys(patch).length === 0) return;
    await runAction(editTarget, "edit", patch, editNote);
    setEditOpen(false);
  }

  // If viewing profiles, render that component directly
  if (viewMode === 1) {
    return (
      <Box sx={{ px: { xs: 1, md: 2 } }}>
        <Tabs value={viewMode} onChange={(_, v) => setViewMode(v)} sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}>
          <Tab label="Content Reports" />
          <Tab label="Profile Reports" />
        </Tabs>
        <AdminProfileModerationPage />
      </Box>
    );
  }

  return (
    <Box sx={{ px: { xs: 1, md: 2 } }}>
      <Tabs value={viewMode} onChange={(_, v) => setViewMode(v)} sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}>
        <Tab label="Content Reports" />
        <Tab label="Profile Reports" />
      </Tabs>

      <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "stretch", md: "center" }} sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>Content Moderation Queue</Typography>
        <Box sx={{ flex: 1 }} />
        <TextField
          size="small"
          placeholder="Search text, author..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{ minWidth: 240 }}
        />
      </Stack>

      <Paper variant="outlined" sx={{ mb: 2 }}>
        <Tabs
          value={status}
          onChange={(_, v) => setStatus(v)}
          variant="scrollable"
          allowScrollButtonsMobile
        >
          <Tab value="under_review" label="Under Review" />
          <Tab value="all" label="All Reports" />
          <Tab value="removed" label="Removed" />
        </Tabs>
      </Paper>

      {loading ? (
        <LinearProgress />
      ) : filtered.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography color="text.secondary">No reports in this view.</Typography>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {filtered.map((item) => (
            <Paper key={`${item.target_type}:${item.target_id}`} variant="outlined" sx={{ p: 2 }}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "flex-start", md: "center" }}>
                <Stack spacing={0.5} sx={{ flex: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip size="small" icon={<FlagOutlinedIcon />} label={`${item.report_count} reports`} />
                    <Chip size="small" label={item.content_kind} variant="outlined" />
                    <Chip size="small" label={item.status} color={item.status === "removed" ? "warning" : "default"} />
                  </Stack>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    {item.content?.title || item.content?.text || "(no text)"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.author?.first_name || item.author?.last_name
                      ? `${item.author?.first_name || ""} ${item.author?.last_name || ""}`.trim()
                      : item.author?.username || "Unknown author"}
                    {item.created_at ? ` · Created ${formatWhen(item.created_at)}` : ""}
                    {item.last_reported_at ? ` · Last report ${formatWhen(item.last_reported_at)}` : ""}
                  </Typography>
                  {item.content?.text && (
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      {item.content.text}
                    </Typography>
                  )}
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  {/* ✅ Edit button removed - Use "Remove Content" option in dialog instead */}
                  <Button
                    size="small"
                    startIcon={<CheckCircleOutlineRoundedIcon />}
                    onClick={() => runAction(item, "approve")}
                    disabled={actionBusy}
                  >
                    {item.status === "removed" ? "Restore Content" : "Keep Content"}
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<DeleteOutlineRoundedIcon />}
                    onClick={() => setConfirmTarget(item)}
                    disabled={actionBusy}
                  >
                    Remove Content
                  </Button>
                </Stack>
              </Stack>

              <Divider sx={{ my: 1 }} />

              <Stack direction="row" spacing={1} flexWrap="wrap">
                {Object.entries(item.reason_breakdown || {}).map(([reason, count]) => (
                  <Chip key={reason} size="small" label={`${reason.replace(/_/g, " ")}: ${count}`} />
                ))}
              </Stack>

              {(item.notes || []).length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" color="text.secondary">Reporter notes</Typography>
                  <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                    {item.notes.map((n, i) => (
                      <Typography key={i} variant="body2" color="text.secondary">
                        "{n.note}"
                      </Typography>
                    ))}
                  </Stack>
                </Box>
              )}
            </Paper>
          ))}
        </Stack>
      )}

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit content</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField
              label={editTarget?.content_kind === "comment" ? "Comment" : "Text / caption"}
              fullWidth
              multiline
              minRows={3}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
            />
            {editTarget?.content?.title !== undefined && (
              <TextField
                label="Title / question"
                fullWidth
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            )}
            <TextField
              label="Moderator note (optional)"
              fullWidth
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submitEdit} disabled={actionBusy}>
            {actionBusy ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!confirmTarget} onClose={() => setConfirmTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Confirm Removal?</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary">
            You are about to remove this content from public view. It will be hidden from users but retained in the database for audit purposes.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This action can be reversed later if needed.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setConfirmTarget(null)} sx={{ color: "text.secondary" }}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={async () => {
              await runAction(confirmTarget, "soft_delete");
              setConfirmTarget(null);
            }}
            disabled={actionBusy}
          >
            {actionBusy ? <CircularProgress size={16} color="inherit" /> : "Remove Content"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
