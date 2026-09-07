import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
  IconButton,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import PowerSettingsNewRoundedIcon from "@mui/icons-material/PowerSettingsNewRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import RestoreRoundedIcon from "@mui/icons-material/RestoreRounded";
import SyncRoundedIcon from "@mui/icons-material/SyncRounded";
import {
  listNewsletterCategoriesAdmin,
  createNewsletterCategory,
  updateNewsletterCategory,
  deleteNewsletterCategory,
  listMauticSegments,
  linkNewsletterCategoryMauticSegment,
  syncNewsletterCategoryMautic,
} from "../services/newsletterService";

const getErrorMessage = (err, fallback = "Something went wrong") => {
  const data = err?.response?.data;
  if (!data) return err?.message || fallback;
  if (typeof data === "string") return data;
  if (data.detail) return data.detail;
  if (data.error) return data.error;
  const firstKey = Object.keys(data)[0];
  const firstValue = firstKey ? data[firstKey] : null;
  if (Array.isArray(firstValue)) return `${firstKey}: ${firstValue.join(", ")}`;
  if (firstValue && typeof firstValue === "object") {
    try {
      return `${firstKey}: ${JSON.stringify(firstValue)}`;
    } catch {
      return fallback;
    }
  }
  if (firstValue) return `${firstKey}: ${firstValue}`;
  return fallback;
};

const blankForm = {
  name: "",
  description: "",
};

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return Object.values(value);
  return [];
};

const normalizeSegments = (data) => {
  const raw = Array.isArray(data)
    ? data
    : data?.results ?? data?.segments ?? data?.lists ?? [];

  return toArray(raw).map((segment) => ({
    ...segment,
    id: segment?.id ?? segment?.segment_id ?? segment?.segmentId,
    name: segment?.name || "Unnamed segment",
    alias: segment?.alias || "",
  }));
};

const segmentStaticState = (segment) => {
  if (typeof segment?.is_static === "boolean") return segment.is_static;
  if (typeof segment?.isStatic === "boolean") return segment.isStatic;
  if (typeof segment?.is_dynamic === "boolean") return !segment.is_dynamic;
  if (typeof segment?.isDynamic === "boolean") return !segment.isDynamic;
  if (Array.isArray(segment?.filters)) return segment.filters.length === 0;
  return null;
};

const segmentMappedState = (segment) => {
  if (typeof segment?.is_mapped === "boolean") return segment.is_mapped;
  if (typeof segment?.mapped === "boolean") return segment.mapped;
  if (segment?.mapped_category_slug || segment?.mappedCategorySlug) return true;
  return false;
};

const categoryMauticId = (category) => {
  const value = category?.mautic_segment_id;
  return value === null || value === undefined || value === "" ? "" : String(value);
};

export default function AdminNewsletterCategoriesTab({ onDataReady }) {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blankForm);
  const [saving, setSaving] = useState(false);
  const [actionKey, setActionKey] = useState("");
  const [snack, setSnack] = useState({ open: false, severity: "success", message: "" });
  const [deactivateConfirm, setDeactivateConfirm] = useState(null);

  const [connectCategory, setConnectCategory] = useState(null);
  const [mauticSegments, setMauticSegments] = useState([]);
  const [segmentsLoading, setSegmentsLoading] = useState(false);
  const [segmentsError, setSegmentsError] = useState("");
  const [selectedSegmentId, setSelectedSegmentId] = useState("");

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listNewsletterCategoriesAdmin({ includeMautic: true });
      setCategories(Array.isArray(data) ? data : data?.results || []);
      onDataReady?.();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load subscription lists"));
    } finally {
      setLoading(false);
    }
  }, [onDataReady]);

  React.useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleOpen = (category = null) => {
    if (category) {
      setEditing(category.slug);
      setForm({
        name: category.name,
        description: category.description || "",
      });
    } else {
      setEditing(null);
      setForm(blankForm);
    }
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setSnack({ open: true, severity: "error", message: "List name is required" });
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await updateNewsletterCategory(editing, {
          name: form.name.trim(),
          description: form.description.trim(),
        });
        setSnack({ open: true, severity: "success", message: "Subscription list updated and synced" });
      } else {
        await createNewsletterCategory({
          name: form.name.trim(),
          description: form.description.trim(),
        });
        setSnack({ open: true, severity: "success", message: "Subscription list created" });
      }
      setOpen(false);
      await loadCategories();
    } catch (err) {
      setSnack({
        open: true,
        severity: "error",
        message: getErrorMessage(err, editing ? "Failed to update subscription list" : "Failed to create subscription list"),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (slug) => {
    const key = `deactivate:${slug}`;
    setActionKey(key);
    try {
      await deleteNewsletterCategory(slug);
      setSnack({ open: true, severity: "success", message: "Subscription list deactivated" });
      setDeactivateConfirm(null);
      await loadCategories();
    } catch (err) {
      setSnack({ open: true, severity: "error", message: getErrorMessage(err, "Failed to deactivate subscription list") });
    } finally {
      setActionKey("");
    }
  };

  const handleReactivate = async (slug) => {
    const key = `reactivate:${slug}`;
    setActionKey(key);
    try {
      await updateNewsletterCategory(slug, { is_active: true });
      setSnack({ open: true, severity: "success", message: "Subscription list reactivated" });
      await loadCategories();
    } catch (err) {
      setSnack({ open: true, severity: "error", message: getErrorMessage(err, "Failed to reactivate subscription list") });
    } finally {
      setActionKey("");
    }
  };

  const handleSync = async (category) => {
    const key = `sync:${category.slug}`;
    setActionKey(key);
    try {
      const result = await syncNewsletterCategoryMautic(category.slug);
      const message = result?.detail || result?.message || "Mautic sync completed";
      setSnack({ open: true, severity: "success", message });
      await loadCategories();
    } catch (err) {
      setSnack({ open: true, severity: "error", message: getErrorMessage(err, "Mautic sync failed") });
    } finally {
      setActionKey("");
    }
  };

  const handleOpenConnect = async (category) => {
    setConnectCategory(category);
    setSelectedSegmentId("");
    setMauticSegments([]);
    setSegmentsError("");
    setSegmentsLoading(true);
    try {
      const data = await listMauticSegments();
      setMauticSegments(normalizeSegments(data));
    } catch (err) {
      setSegmentsError(getErrorMessage(err, "Failed to load Mautic segments"));
    } finally {
      setSegmentsLoading(false);
    }
  };

  const handleCloseConnect = () => {
    if (actionKey.startsWith("connect:")) return;
    setConnectCategory(null);
    setSelectedSegmentId("");
    setMauticSegments([]);
    setSegmentsError("");
  };

  const handleConnect = async () => {
    if (!connectCategory || !selectedSegmentId) return;
    const key = `connect:${connectCategory.slug}`;
    setActionKey(key);
    try {
      const result = await linkNewsletterCategoryMauticSegment(connectCategory.slug, selectedSegmentId);
      const message = result?.detail || result?.message || "Mautic segment connected";
      setSnack({ open: true, severity: "success", message });
      setConnectCategory(null);
      setSelectedSegmentId("");
      setMauticSegments([]);
      await loadCategories();
    } catch (err) {
      setSnack({ open: true, severity: "error", message: getErrorMessage(err, "Failed to connect Mautic segment") });
    } finally {
      setActionKey("");
    }
  };

  const connectBusy = Boolean(connectCategory && actionKey === `connect:${connectCategory.slug}`);
  const selectableSegments = mauticSegments.filter((segment) => {
    const isStatic = segmentStaticState(segment);
    const isMapped = segmentMappedState(segment);
    return isStatic !== false && !isMapped && segment.id !== null && segment.id !== undefined && segment.id !== "";
  });

  return (
    <Stack spacing={3}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#2C3E5A" }}>
            Subscription Lists
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage ECP subscription lists and their Mautic segment connections.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Refresh">
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshRoundedIcon />}
              onClick={loadCategories}
              disabled={loading}
              sx={{ textTransform: "none" }}
            >
              Refresh
            </Button>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={() => handleOpen()}
            disabled={loading}
            sx={{ textTransform: "none" }}
          >
            Create List
          </Button>
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {loading && (
        <Box>
          <Stack spacing={1}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} height={60} variant="rectangular" sx={{ borderRadius: 1 }} />
            ))}
          </Stack>
        </Box>
      )}

      {!loading && categories.length === 0 && (
        <Paper variant="outlined" sx={{ p: 3, textAlign: "center", borderRadius: 2, borderColor: "#F0EEEB" }}>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            No subscription lists yet
          </Typography>
          <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => handleOpen()}>
            Create the first list
          </Button>
        </Paper>
      )}

      {!loading && categories.length > 0 && (
        <TableContainer component={Paper} sx={{ borderRadius: 2, borderColor: "#F0EEEB", overflow: "hidden" }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: "#f3f4f6" }}>
                <TableCell sx={{ fontWeight: 700 }}>List Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Slug</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">ECP Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Mautic</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {categories.map((category) => {
                const segmentId = categoryMauticId(category);
                const syncing = actionKey === `sync:${category.slug}`;
                const reactivating = actionKey === `reactivate:${category.slug}`;
                const deactivating = actionKey === `deactivate:${category.slug}`;

                return (
                  <TableRow key={category.slug} sx={{ "&:hover": { bgcolor: "#fafafa" } }}>
                    <TableCell sx={{ minWidth: 220 }}>
                      <Typography
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate(`/admin/newsletter/lists/${category.slug}`)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            navigate(`/admin/newsletter/lists/${category.slug}`);
                          }
                        }}
                        sx={{ fontWeight: 700, color: "#1B2A4A", cursor: "pointer", "&:hover": { color: "#0f766e" } }}
                      >
                        {category.name}
                      </Typography>
                      {category.description && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.4, maxWidth: 360 }}>
                          {category.description}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <code style={{ fontSize: "12px", color: "#666" }}>{category.slug}</code>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={category.is_active ? "Active" : "Inactive"}
                        color={category.is_active ? "success" : "default"}
                        size="small"
                        variant={category.is_active ? "filled" : "outlined"}
                        sx={{ fontWeight: 700 }}
                      />
                    </TableCell>
                    <TableCell sx={{ minWidth: 180 }}>
                      {segmentId ? (
                        <Stack spacing={0.35} alignItems="flex-start">
                          <Chip label="Connected" color="success" size="small" variant="outlined" sx={{ fontWeight: 700 }} />
                          <Typography variant="caption" color="text.secondary">
                            Segment #{segmentId}
                          </Typography>
                        </Stack>
                      ) : (
                        <Chip label="Not Connected" color="warning" size="small" variant="outlined" sx={{ fontWeight: 700 }} />
                      )}
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                      <Tooltip title="View subscribers">
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/admin/newsletter/lists/${category.slug}`)}
                            disabled={saving || Boolean(actionKey)}
                            sx={{ color: "#475569" }}
                          >
                            <PeopleAltRoundedIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>

                      <Tooltip title="Edit list">
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => handleOpen(category)}
                            disabled={saving || Boolean(actionKey)}
                            sx={{ color: "#10b8a6" }}
                          >
                            <EditRoundedIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>

                      <Tooltip title={segmentId ? "Sync / repair Mautic connection" : "Create / sync Mautic segment"}>
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => handleSync(category)}
                            disabled={saving || Boolean(actionKey)}
                            sx={{ color: "#2563eb" }}
                          >
                            {syncing ? <CircularProgress size={18} /> : <SyncRoundedIcon fontSize="small" />}
                          </IconButton>
                        </span>
                      </Tooltip>

                      {!segmentId && (
                        <Tooltip title="Connect existing Mautic segment">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => handleOpenConnect(category)}
                              disabled={saving || Boolean(actionKey)}
                              sx={{ color: "#7c3aed" }}
                            >
                              <LinkRoundedIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      )}

                      {category.is_active ? (
                        <Tooltip title="Deactivate list">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => setDeactivateConfirm(category)}
                              disabled={saving || Boolean(actionKey)}
                              sx={{ color: "#dc2626" }}
                            >
                              {deactivating ? <CircularProgress size={18} /> : <PowerSettingsNewRoundedIcon fontSize="small" />}
                            </IconButton>
                          </span>
                        </Tooltip>
                      ) : (
                        <Tooltip title="Reactivate list">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => handleReactivate(category.slug)}
                              disabled={saving || Boolean(actionKey)}
                              sx={{ color: "#16a34a" }}
                            >
                              {reactivating ? <CircularProgress size={18} /> : <RestoreRoundedIcon fontSize="small" />}
                            </IconButton>
                          </span>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={open} onClose={() => !saving && setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: "#1B2A4A" }}>
          {editing ? "Edit List" : "Create New List"}
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 3 }}>
          <Stack spacing={2.5}>
            <TextField
              label="List Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., IMAA Events"
              fullWidth
              required
              disabled={saving}
              autoFocus
              size="small"
            />
            {editing && (
              <TextField
                label="Slug"
                value={editing}
                fullWidth
                disabled
                size="small"
                helperText="The slug is a stable integration identifier and cannot be changed."
              />
            )}
            <TextField
              label="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What is this newsletter about?"
              multiline
              rows={4}
              fullWidth
              disabled={saving}
              size="small"
            />
            {!editing && (
              <Alert severity="info" sx={{ py: 0.5 }}>
                When Mautic sync is enabled, ECP will automatically create or reuse the matching static Mautic segment.
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={saving || !form.name.trim()}
            sx={{ background: "linear-gradient(135deg, #10b8a6 0%, #0ea5a4 100%)" }}
          >
            {saving ? <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> : null}
            {editing ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deactivateConfirm)} onClose={() => !actionKey && setDeactivateConfirm(null)}>
        <DialogTitle sx={{ fontWeight: 700 }}>Deactivate List?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            {deactivateConfirm
              ? `Deactivate “${deactivateConfirm.name}”? Members will no longer be able to subscribe to this list, and its mapped Mautic segment will be unpublished.`
              : "Members will no longer be able to subscribe to this list."}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeactivateConfirm(null)} disabled={Boolean(actionKey)}>Cancel</Button>
          <Button
            onClick={() => handleDeactivate(deactivateConfirm?.slug)}
            variant="contained"
            color="error"
            disabled={!deactivateConfirm || Boolean(actionKey)}
          >
            {deactivateConfirm && actionKey === `deactivate:${deactivateConfirm.slug}` ? (
              <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
            ) : null}
            Deactivate
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(connectCategory)} onClose={handleCloseConnect} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: "#1B2A4A" }}>
          Connect Mautic Segment
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Link an existing static Mautic segment to <strong>{connectCategory?.name}</strong>. Existing ECP subscription states will be queued for reconciliation after the link succeeds.
            </Typography>

            {segmentsError && <Alert severity="error">{segmentsError}</Alert>}

            {segmentsLoading ? (
              <Stack spacing={1}>
                <Skeleton height={48} variant="rectangular" sx={{ borderRadius: 1 }} />
                <Skeleton height={24} width="65%" />
              </Stack>
            ) : (
              <>
                <Select
                  value={selectedSegmentId}
                  onChange={(e) => setSelectedSegmentId(String(e.target.value))}
                  displayEmpty
                  fullWidth
                  size="small"
                  disabled={connectBusy || selectableSegments.length === 0}
                  renderValue={(value) => {
                    if (!value) return "Select a Mautic segment";
                    const segment = mauticSegments.find((item) => String(item.id) === String(value));
                    return segment ? `${segment.name} (#${segment.id})` : `Segment #${value}`;
                  }}
                >
                  <MenuItem value="" disabled>Select a Mautic segment</MenuItem>
                  {mauticSegments.map((segment) => {
                    const staticState = segmentStaticState(segment);
                    const mapped = segmentMappedState(segment);
                    const disabled = staticState === false || mapped || segment.id === null || segment.id === undefined || segment.id === "";
                    return (
                      <MenuItem key={String(segment.id ?? segment.alias ?? segment.name)} value={String(segment.id ?? "")} disabled={disabled}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ width: "100%" }}>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>{segment.name}</Typography>
                            <Typography variant="caption" color="text.secondary" noWrap>
                              #{segment.id ?? "-"}{segment.alias ? ` · ${segment.alias}` : ""}
                            </Typography>
                          </Box>
                          {staticState === false ? (
                            <Chip size="small" label="Dynamic" color="warning" variant="outlined" />
                          ) : staticState === true ? (
                            <Chip size="small" label="Static" color="success" variant="outlined" />
                          ) : null}
                          {mapped ? <Chip size="small" label="Already mapped" variant="outlined" /> : null}
                        </Stack>
                      </MenuItem>
                    );
                  })}
                </Select>

                {mauticSegments.length === 0 && !segmentsError && (
                  <Alert severity="info">No Mautic segments are available.</Alert>
                )}
                {mauticSegments.length > 0 && selectableSegments.length === 0 && !segmentsError && (
                  <Alert severity="info">No unassigned static Mautic segments are available to connect.</Alert>
                )}
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseConnect} disabled={connectBusy}>Cancel</Button>
          <Button
            onClick={handleConnect}
            variant="contained"
            disabled={connectBusy || segmentsLoading || !selectedSegmentId}
          >
            {connectBusy ? <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> : <LinkRoundedIcon sx={{ mr: 1 }} />}
            Connect
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((current) => ({ ...current, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnack((current) => ({ ...current, open: false }))}
          severity={snack.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
