// src/pages/AdminModerationPage.jsx
import * as React from "react";
import { useNavigate } from "#navigation";
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
  Alert,
} from "@mui/material";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";

import { isAdminUser } from "../utils/adminRole";
import AdminProfileModerationPage from "./AdminProfileModerationPage";
import { getAccessToken as getStoredAccessToken } from "../utils/tokenStore";
import AdminStatusChip from "../components/admin/AdminStatusChip.jsx";
import AdminEmptyState from "../components/admin/AdminEmptyState.jsx";

const API_ROOT = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");
function getToken() {
  return (
    getStoredAccessToken() ||
    localStorage.getItem("access") ||
    getStoredAccessToken() ||
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
  const navigate = useNavigate();

  // Role-based access control: Staff and Super Admin only
  React.useEffect(() => {
    if (!isAdminUser()) {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  // Top-level tab: 0 = Content, 1 = Profiles
  const [viewMode, setViewMode] = React.useState(0);

  // Content Moderation State
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState("");
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
    setLoadError("");
    try {
      const url = new URL(`${API_ROOT}/moderation/queue/`);
      if (status && status !== "all") url.searchParams.set("status", status);
      const res = await fetch(url.toString(), { headers: { Accept: "application/json", ...authHeader() } });
      const j = res.ok ? await res.json() : {};
      const rows = Array.isArray(j?.results) ? j.results : (Array.isArray(j) ? j : []);
      setItems(rows);
    } catch (error) {
      setItems([]);
      setLoadError(error?.message || "Failed to load moderation reports.");
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
      <Box sx={{ px: { xs: 2, md: 3 }, py: { xs: 2, md: 3 }, minWidth: 0 }}>
        <Tabs value={viewMode} onChange={(_, v) => setViewMode(v)} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile aria-label="Moderation areas" sx={{ mb: 2, borderBottom: "1px solid var(--imaa-border)" }}>
          <Tab label="Content Reports" />
          <Tab label="Profile Reports" />
        </Tabs>
        <AdminProfileModerationPage embedded />
      </Box>
    );
  }

  return (
    <Box sx={{ px: { xs: 2, md: 3 }, py: { xs: 2, md: 3 }, minWidth: 0, maxWidth: "100%", overflow: "hidden" }}>
      <Tabs value={viewMode} onChange={(_, v) => setViewMode(v)} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile aria-label="Moderation areas" sx={{ mb: 2, borderBottom: "1px solid var(--imaa-border)" }}>
        <Tab label="Content Reports" />
        <Tab label="Profile Reports" />
      </Tabs>

      <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "stretch", md: "center" }} sx={{ mb: 2 }}>
        <Typography component="h1" variant="h5" sx={{ fontFamily: "var(--imaa-font-serif)", fontWeight: 700, color: "var(--imaa-ink)" }}>Content Moderation Queue</Typography>
        <Box sx={{ flex: 1 }} />
        <TextField
          size="small"
          label="Search content reports"
          placeholder="Search text, author..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{ minWidth: { xs: "100%", sm: 280 }, bgcolor: "background.paper" }}
        />
      </Stack>

      <Paper variant="outlined" sx={{ mb: 2, borderRadius: "var(--imaa-radius-card)", borderColor: "var(--imaa-border)", overflow: "hidden" }}>
        <Tabs
          value={status}
          onChange={(_, v) => setStatus(v)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          aria-label="Content moderation status filters"
        >
          <Tab value="under_review" label="Under Review" />
          <Tab value="all" label="All Reports" />
          <Tab value="removed" label="Removed" />
        </Tabs>
      </Paper>

      {loadError ? (
        <Alert severity="error" role="alert" sx={{ borderRadius: "var(--imaa-radius-card)" }}>{loadError}</Alert>
      ) : loading ? (
        <LinearProgress aria-label="Loading content reports" />
      ) : filtered.length === 0 ? (
        <AdminEmptyState compact title="No reports in this view." />
      ) : (
        <Stack spacing={2}>
          {filtered.map((item) => (
            <Paper key={`${item.target_type}:${item.target_id}`} variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: "var(--imaa-radius-card)", borderColor: "var(--imaa-border)", boxShadow: "var(--imaa-shadow-sm)", minWidth: 0 }}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "flex-start", md: "center" }}>
                <Stack spacing={0.5} sx={{ flex: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
                    <Chip size="small" icon={<FlagOutlinedIcon />} label={`${item.report_count} reports`} />
                    <Chip size="small" label={item.content_kind} variant="outlined" />
                    <AdminStatusChip status={item.status} label={item.status} color={item.status === "removed" ? "warning" : "default"} />
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
                    <Typography variant="body2" sx={{ mt: 0.5, overflowWrap: "anywhere" }}>
                      {item.content.text}
                    </Typography>
                  )}
                </Stack>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "center" }} sx={{ width: { xs: "100%", md: "auto" } }}>
                  {/* ✅ Edit button removed - Use "Remove Content" option in dialog instead */}
                  <Button
                    size="small"
                    startIcon={<CheckCircleOutlineRoundedIcon />}
                    onClick={() => runAction(item, "approve")}
                    disabled={actionBusy}
                    sx={{ minHeight: 40, fontWeight: 700 }}
                  >
                    {item.status === "removed" ? "Restore Content" : "Keep Content"}
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<DeleteOutlineRoundedIcon />}
                    onClick={() => setConfirmTarget(item)}
                    disabled={actionBusy}
                    sx={{ minHeight: 40, fontWeight: 700 }}
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

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth aria-labelledby="moderation-edit-title">
        <DialogTitle id="moderation-edit-title">Edit content</DialogTitle>
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

      <Dialog open={!!confirmTarget} onClose={() => setConfirmTarget(null)} maxWidth="xs" fullWidth aria-labelledby="moderation-remove-title">
        <DialogTitle id="moderation-remove-title" sx={{ fontWeight: 700 }}>Confirm Removal?</DialogTitle>
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
