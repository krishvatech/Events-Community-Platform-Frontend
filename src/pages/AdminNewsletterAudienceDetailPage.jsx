import React, { useEffect, useMemo, useState } from "react";
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
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ArchiveRoundedIcon from "@mui/icons-material/ArchiveRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { useNavigate, useParams } from "react-router-dom";

import {
  createNewsletterAudience,
  deleteNewsletterAudience,
  getNewsletterAudience,
  updateNewsletterAudience,
} from "../services/newsletterService";

const blankForm = {
  name: "",
  description: "",
  audience_type: "static",
};

const TYPE_LABELS = {
  static: "Static",
  dynamic: "Dynamic",
};

const STATUS_LABELS = {
  draft: "Draft",
  active: "Active",
  archived: "Archived",
};

const STATUS_COLORS = {
  draft: "default",
  active: "success",
  archived: "default",
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatNumber = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  return new Intl.NumberFormat().format(number);
};

const getErrorMessage = (err, fallback = "Something went wrong. Please try again.") => {
  const data = err?.response?.data;
  if (!data) return err?.message || fallback;
  if (typeof data === "string") return data;
  if (data.detail) return data.detail;
  if (data.error) return data.error;
  const firstKey = Object.keys(data)[0];
  const firstValue = firstKey ? data[firstKey] : null;
  if (Array.isArray(firstValue)) return `${firstKey}: ${firstValue.join(", ")}`;
  if (firstValue) return `${firstKey}: ${firstValue}`;
  return fallback;
};

const audienceToForm = (audience) => ({
  name: audience?.name || "",
  description: audience?.description || "",
  audience_type: audience?.audience_type || "static",
});

function AudienceStatusChip({ status }) {
  const normalized = String(status || "draft").toLowerCase();
  return (
    <Chip
      size="small"
      label={STATUS_LABELS[normalized] || normalized}
      color={STATUS_COLORS[normalized] || "default"}
      variant={normalized === "active" ? "filled" : "outlined"}
      sx={{ fontWeight: 700 }}
    />
  );
}

function ConfirmDialog({ open, title, children, confirmLabel, confirmColor = "primary", loading, onClose, onConfirm }) {
  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>{children}</DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button onClick={onConfirm} color={confirmColor} variant="contained" disabled={loading}>
          {loading ? <CircularProgress size={20} color="inherit" /> : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function AudienceForm({ value, errors, readOnly, onChange }) {
  const setField = (field, nextValue) => onChange({ ...value, [field]: nextValue });
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, borderColor: Object.keys(errors).length ? "error.main" : "#F0EEEB" }}>
      <Typography variant="h6" sx={{ fontWeight: 700, color: "#2C3E5A", mb: 2 }}>Audience Details</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <TextField
            label="Name"
            value={value.name}
            onChange={(e) => setField("name", e.target.value)}
            error={Boolean(errors.name)}
            helperText={errors.name}
            fullWidth
            required
            InputProps={{ readOnly }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth disabled={readOnly} error={Boolean(errors.audience_type)}>
            <InputLabel>Audience Type</InputLabel>
            <Select
              label="Audience Type"
              value={value.audience_type}
              onChange={(e) => setField("audience_type", e.target.value)}
            >
              <MenuItem value="static">Static</MenuItem>
              <MenuItem value="dynamic">Dynamic</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="Description"
            value={value.description}
            onChange={(e) => setField("description", e.target.value)}
            multiline
            minRows={4}
            fullWidth
            InputProps={{ readOnly }}
          />
        </Grid>
      </Grid>
    </Paper>
  );
}

export default function AdminNewsletterAudienceDetailPage() {
  const navigate = useNavigate();
  const { audienceId } = useParams();
  const isNew = !audienceId;
  const [audience, setAudience] = useState(null);
  const [form, setForm] = useState(blankForm);
  const [savedForm, setSavedForm] = useState(blankForm);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(isNew);
  const [error, setError] = useState("");
  const [formErrors, setFormErrors] = useState({});
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [snack, setSnack] = useState({ open: false, severity: "success", message: "" });

  const loadAudience = async () => {
    if (isNew) return;
    setLoading(true);
    setError("");
    try {
      const data = await getNewsletterAudience(audienceId);
      const nextForm = audienceToForm(data);
      setAudience(data);
      setForm(nextForm);
      setSavedForm(nextForm);
      setEditing(false);
    } catch (err) {
      setAudience(null);
      setError(getErrorMessage(err, "We could not load this audience."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isNew) {
      setAudience(null);
      setForm(blankForm);
      setSavedForm(blankForm);
      setEditing(true);
      setLoading(false);
      setError("");
      return;
    }
    loadAudience();
  }, [audienceId, isNew]);

  const validate = () => {
    const errors = {};
    if (!form.name.trim()) errors.name = "Audience name is required.";
    if (!["static", "dynamic"].includes(form.audience_type)) errors.audience_type = "Select a valid audience type.";
    setFormErrors(errors);
    const isValid = Object.keys(errors).length === 0;
    if (!isValid) setError("Complete the required audience fields before continuing.");
    return isValid;
  };

  const saveAudience = async () => {
    if (!validate()) return;
    setSaving(true);
    setError("");
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      audience_type: form.audience_type,
    };
    try {
      const data = isNew ? await createNewsletterAudience(payload) : await updateNewsletterAudience(audienceId, payload);
      const nextForm = audienceToForm(data);
      setAudience(data);
      setForm(nextForm);
      setSavedForm(nextForm);
      setEditing(false);
      setSnack({ open: true, severity: "success", message: "Audience saved." });
      if (isNew) navigate(`/admin/newsletter/audiences/${data.uuid}`, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, "We could not save this audience."));
    } finally {
      setSaving(false);
    }
  };

  const archiveAudience = async () => {
    if (isNew || !audienceId) return;
    setArchiveLoading(true);
    setError("");
    try {
      const data = await deleteNewsletterAudience(audienceId);
      const nextForm = audienceToForm(data);
      setAudience(data);
      setForm(nextForm);
      setSavedForm(nextForm);
      setEditing(false);
      setConfirmArchive(false);
      setSnack({ open: true, severity: "success", message: "Audience archived." });
    } catch (err) {
      setError(getErrorMessage(err, "We could not archive this audience."));
      setConfirmArchive(false);
    } finally {
      setArchiveLoading(false);
    }
  };

  const isDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(savedForm), [form, savedForm]);
  const readOnly = !editing;
  const canArchive = !isNew && audience?.status !== "archived" && audience?.is_active !== false;

  return (
    <Stack spacing={3}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "flex-start", md: "center" }, gap: 2, flexDirection: { xs: "column", md: "row" } }}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <IconButton onClick={() => navigate("/admin/newsletter/audiences")}>
            <ArrowBackRoundedIcon />
          </IconButton>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Typography variant="h4" sx={{ fontWeight: 800, color: "#1B2A4A" }}>{isNew ? "Create Audience" : audience?.name || "Newsletter Audience"}</Typography>
              {!isNew && audience?.status && <AudienceStatusChip status={audience.status} />}
            </Stack>
            <Typography color="text.secondary">{editing ? "Save audience details before using future audience tools." : "Audience details are ready for future targeting phases."}</Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {!isNew && !editing && (
            <Button startIcon={<EditRoundedIcon />} onClick={() => setEditing(true)} sx={{ textTransform: "none" }}>
              Edit
            </Button>
          )}
          {editing && (
            <Button variant="contained" startIcon={<SaveRoundedIcon />} onClick={saveAudience} disabled={saving || loading} sx={{ textTransform: "none" }}>
              {saving ? "Saving..." : "Save"}
            </Button>
          )}
          <Button onClick={() => navigate("/admin/newsletter/audiences")} sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          {canArchive && (
            <Button color="warning" startIcon={<ArchiveRoundedIcon />} onClick={() => setConfirmArchive(true)} disabled={archiveLoading} sx={{ textTransform: "none" }}>
              Archive Audience
            </Button>
          )}
        </Stack>
      </Box>

      {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
      {editing && isDirty && !isNew && <Alert severity="info">Save your changes before leaving this audience.</Alert>}

      {loading ? (
        <Stack spacing={2}>{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} variant="rectangular" height={120} />)}</Stack>
      ) : !isNew && error && !audience ? (
        <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, borderColor: "#F0EEEB" }}>
          <Stack spacing={2} alignItems="flex-start">
            <Typography sx={{ fontWeight: 700, color: "#1B2A4A" }}>Audience could not be loaded.</Typography>
            <Button variant="contained" onClick={loadAudience} sx={{ textTransform: "none" }}>Retry</Button>
          </Stack>
        </Paper>
      ) : (
        <Stack spacing={3}>
          {!isNew && audience && (
            <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, borderColor: "#F0EEEB" }}>
              <Stack direction={{ xs: "column", md: "row" }} divider={<Divider flexItem orientation="vertical" />} spacing={2}>
                <Box sx={{ flex: 1 }}><Typography variant="body2" color="text.secondary">Status</Typography><Typography sx={{ fontWeight: 700 }}>{STATUS_LABELS[audience.status] || audience.status || "-"}</Typography></Box>
                <Box sx={{ flex: 1 }}><Typography variant="body2" color="text.secondary">Audience Type</Typography><Typography sx={{ fontWeight: 700 }}>{TYPE_LABELS[audience.audience_type] || audience.audience_type || "-"}</Typography></Box>
                <Box sx={{ flex: 1 }}><Typography variant="body2" color="text.secondary">Estimated Count</Typography><Typography sx={{ fontWeight: 700 }}>{formatNumber(audience.estimated_count)}</Typography></Box>
                <Box sx={{ flex: 1 }}><Typography variant="body2" color="text.secondary">Created</Typography><Typography sx={{ fontWeight: 700 }}>{formatDateTime(audience.created_at)}</Typography></Box>
                <Box sx={{ flex: 1 }}><Typography variant="body2" color="text.secondary">Updated</Typography><Typography sx={{ fontWeight: 700 }}>{formatDateTime(audience.updated_at)}</Typography></Box>
              </Stack>
            </Paper>
          )}
          <AudienceForm value={form} errors={formErrors} readOnly={readOnly} onChange={setForm} />
        </Stack>
      )}

      <ConfirmDialog
        open={confirmArchive}
        title="Archive Audience?"
        confirmLabel="Archive"
        confirmColor="warning"
        loading={archiveLoading}
        onClose={() => setConfirmArchive(false)}
        onConfirm={archiveAudience}
      >
        <Typography>This audience will be archived and hidden from the active audience list.</Typography>
      </ConfirmDialog>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))}>{snack.message}</Alert>
      </Snackbar>
    </Stack>
  );
}
