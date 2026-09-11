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
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Snackbar,
  Stack,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowDownwardRoundedIcon from "@mui/icons-material/ArrowDownwardRounded";
import ArrowUpwardRoundedIcon from "@mui/icons-material/ArrowUpwardRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";

import {
  createNewsletterField,
  deleteNewsletterField,
  listNewsletterFieldTypes,
  listNewsletterFields,
  updateNewsletterField,
} from "../services/newsletterService";

const asArray = (value) => (Array.isArray(value) ? value : []);

const getErrorMessage = (err, fallback = "Something went wrong. Please try again.") => {
  const data = err?.response?.data;
  if (!data) return err?.message || fallback;
  if (typeof data === "string") return data;
  if (data.detail) return data.detail;
  if (data.error) return data.error;
  return fallback;
};

/** Create/edit dialog. On edit, Mautic locks alias and type, so they are read-only. */
function FieldDialog({ open, fieldObject, field, fieldTypes, onClose, onSaved }) {
  const isEdit = Boolean(field?.id);
  const [form, setForm] = useState({});
  const [options, setOptions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    setForm({
      label: field?.label || "",
      alias: field?.alias || "",
      type: field?.type || "text",
      group: field?.group || "core",
      is_published: field?.is_published ?? true,
      is_required: field?.is_required ?? false,
      default_value: field?.default_value ?? "",
    });
    setOptions(asArray(field?.options).map((option) => ({ ...option })));
  }, [open, field]);

  const selectedType = useMemo(
    () => fieldTypes.find((type) => type.type === form.type),
    [fieldTypes, form.type]
  );

  // Only select/multiselect keep their option list inside the field definition;
  // country/region/timezone/locale draw theirs from Mautic's reference data.
  const editsOptions = ["select", "multiselect"].includes(form.type);

  const handleSubmit = async () => {
    if (!String(form.label || "").trim()) {
      setError("Label is required.");
      return;
    }
    if (editsOptions && !options.filter((option) => String(option.value || "").trim()).length) {
      setError("This field type requires at least one option.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const payload = {
        label: form.label.trim(),
        group: form.group,
        is_published: form.is_published,
        is_required: form.is_required,
        default_value: form.default_value,
      };
      if (!isEdit) {
        payload.type = form.type;
        if (String(form.alias || "").trim()) payload.alias = form.alias.trim();
      }
      // Options are sent only when this type owns them, so an unrelated edit never
      // wipes an existing option list.
      if (editsOptions) {
        payload.options = options
          .filter((option) => String(option.value || "").trim())
          .map((option) => ({
            label: String(option.label || option.value).trim(),
            value: String(option.value).trim(),
          }));
      }

      const saved = isEdit
        ? await updateNewsletterField(fieldObject, field.id, payload)
        : await createNewsletterField(fieldObject, payload);
      onSaved(saved, isEdit);
    } catch (err) {
      setError(getErrorMessage(err, "Mautic rejected this field definition."));
    } finally {
      setSaving(false);
    }
  };

  const setValue = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 850 }}>
        {isEdit ? "Edit Field" : `Create ${fieldObject === "company" ? "Company" : "Contact"} Field`}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          {isEdit && field?.is_system ? (
            <Alert severity="warning" variant="outlined" icon={<LockRoundedIcon fontSize="small" />}>
              This is a built-in Mautic field. Its group and type are locked by Mautic and it
              cannot be deleted.
            </Alert>
          ) : null}

          <TextField
            autoFocus
            fullWidth
            size="small"
            label="Label"
            value={form.label || ""}
            onChange={(event) => setValue("label", event.target.value)}
            disabled={saving}
            required
          />

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Alias"
                value={form.alias || ""}
                onChange={(event) => setValue("alias", event.target.value)}
                disabled={saving || isEdit}
                helperText={
                  isEdit
                    ? "Mautic locks the alias after creation."
                    : "Optional — Mautic generates one from the label."
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small" disabled={saving || isEdit}>
                <InputLabel id="field-type-label">Type</InputLabel>
                <Select
                  labelId="field-type-label"
                  label="Type"
                  value={form.type || "text"}
                  onChange={(event) => setValue("type", event.target.value)}
                >
                  {fieldTypes.map((type) => (
                    <MenuItem key={type.type} value={type.type}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Group"
                value={form.group || ""}
                onChange={(event) => setValue("group", event.target.value)}
                disabled={saving || (isEdit && field?.is_system)}
                helperText={
                  isEdit && field?.is_system ? "Locked by Mautic for built-in fields." : " "
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Default value"
                value={form.default_value ?? ""}
                onChange={(event) => setValue("default_value", event.target.value)}
                disabled={saving}
              />
            </Grid>
          </Grid>

          <Stack direction="row" spacing={3}>
            <FormControlLabel
              control={
                <Switch
                  checked={Boolean(form.is_published)}
                  onChange={(event) => setValue("is_published", event.target.checked)}
                  disabled={saving}
                />
              }
              label="Published"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={Boolean(form.is_required)}
                  onChange={(event) => setValue("is_required", event.target.checked)}
                  disabled={saving}
                />
              }
              label="Required"
            />
          </Stack>

          {editsOptions ? (
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography sx={{ fontWeight: 800, color: "#1B2A4A" }}>Options</Typography>
                <Button
                  size="small"
                  startIcon={<AddRoundedIcon />}
                  onClick={() => setOptions((current) => [...current, { label: "", value: "" }])}
                  disabled={saving}
                  sx={{ textTransform: "none" }}
                >
                  Add option
                </Button>
              </Stack>
              <Stack spacing={1}>
                {options.map((option, index) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <Stack direction="row" spacing={1} alignItems="center" key={index}>
                    <TextField
                      size="small"
                      label="Label"
                      value={option.label}
                      onChange={(event) =>
                        setOptions((current) =>
                          current.map((item, position) =>
                            position === index ? { ...item, label: event.target.value } : item
                          )
                        )
                      }
                      disabled={saving}
                    />
                    <TextField
                      size="small"
                      label="Value"
                      value={option.value}
                      onChange={(event) =>
                        setOptions((current) =>
                          current.map((item, position) =>
                            position === index ? { ...item, value: event.target.value } : item
                          )
                        )
                      }
                      disabled={saving}
                    />
                    <Tooltip title="Move up">
                      <span>
                        <IconButton
                          size="small"
                          disabled={saving || index === 0}
                          onClick={() =>
                            setOptions((current) => {
                              const next = [...current];
                              [next[index - 1], next[index]] = [next[index], next[index - 1]];
                              return next;
                            })
                          }
                        >
                          <ArrowUpwardRoundedIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Move down">
                      <span>
                        <IconButton
                          size="small"
                          disabled={saving || index === options.length - 1}
                          onClick={() =>
                            setOptions((current) => {
                              const next = [...current];
                              [next[index + 1], next[index]] = [next[index], next[index + 1]];
                              return next;
                            })
                          }
                        >
                          <ArrowDownwardRoundedIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <IconButton
                      size="small"
                      disabled={saving}
                      onClick={() =>
                        setOptions((current) => current.filter((_, position) => position !== index))
                      }
                    >
                      <DeleteRoundedIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                ))}
                {!options.length ? (
                  <Typography variant="body2" color="text.secondary">
                    This field type requires at least one option.
                  </Typography>
                ) : null}
              </Stack>
            </Box>
          ) : selectedType?.has_option_list ? (
            <Alert severity="info" variant="outlined">
              Mautic supplies the option list for this field type from its own reference data.
            </Alert>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={saving} sx={{ textTransform: "none" }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
          sx={{ textTransform: "none", bgcolor: "#0f766e", "&:hover": { bgcolor: "#0d6259" } }}
        >
          {isEdit ? "Save Field" : "Create Field"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function AdminNewsletterCustomFieldsPanel() {
  const [fieldObject, setFieldObject] = useState("contact");
  const [data, setData] = useState(null);
  const [fieldTypes, setFieldTypes] = useState([]);
  const [typesError, setTypesError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState({ open: false, field: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const loadFields = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await listNewsletterFields(fieldObject));
    } catch (err) {
      setError(getErrorMessage(err, "Could not load field definitions from Mautic."));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [fieldObject]);

  useEffect(() => {
    loadFields();
  }, [loadFields]);

  useEffect(() => {
    listNewsletterFieldTypes()
      .then((response) => setFieldTypes(asArray(response?.results)))
      .catch((err) =>
        setTypesError(
          getErrorMessage(
            err,
            "Could not load the Mautic field type list. Creating new fields is unavailable."
          )
        )
      );
  }, []);

  const togglePublished = async (field) => {
    setBusy(true);
    try {
      await updateNewsletterField(fieldObject, field.id, { is_published: !field.is_published });
      setSnackbar({
        open: true,
        message: field.is_published ? "Field unpublished." : "Field published.",
        severity: "success",
      });
      loadFields();
    } catch (err) {
      setSnackbar({
        open: true,
        message: getErrorMessage(err, "Mautic rejected the change."),
        severity: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await deleteNewsletterField(fieldObject, deleteTarget.id);
      setSnackbar({ open: true, message: "Field deleted in Mautic.", severity: "success" });
      setDeleteTarget(null);
      loadFields();
    } catch (err) {
      setSnackbar({
        open: true,
        message: getErrorMessage(err, "Mautic refused to delete this field."),
        severity: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const fields = useMemo(() => {
    const all = asArray(data?.results);
    const term = search.trim().toLowerCase();
    if (!term) return all;
    return all.filter(
      (field) =>
        field.label.toLowerCase().includes(term) || field.alias.toLowerCase().includes(term)
    );
  }, [data, search]);

  return (
    <Stack spacing={2.5}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "center" }}
        spacing={2}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 850, color: "#1B2A4A" }}>
            Custom Fields
          </Typography>
          <Typography color="text.secondary" variant="body2">
            Native Mautic field definitions. Built-in Mautic fields are protected and cannot be deleted.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            startIcon={<RefreshRoundedIcon />}
            onClick={loadFields}
            disabled={loading}
            sx={{ textTransform: "none" }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={() => setDialog({ open: true, field: null })}
            disabled={!fieldTypes.length}
            sx={{ textTransform: "none", bgcolor: "#0f766e", "&:hover": { bgcolor: "#0d6259" } }}
          >
            Create Field
          </Button>
        </Stack>
      </Stack>

      {typesError ? <Alert severity="warning">{typesError}</Alert> : null}

      <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: "#E7ECEF", overflow: "hidden" }}>
        <Tabs
          value={fieldObject}
          onChange={(_, value) => setFieldObject(value)}
          sx={{
            px: 2,
            "& .MuiTab-root": { textTransform: "none", fontWeight: 750 },
            "& .Mui-selected": { color: "#0f766e !important" },
            "& .MuiTabs-indicator": { backgroundColor: "#0f766e" },
          }}
        >
          <Tab label="Contact Fields" value="contact" />
          <Tab label="Company Fields" value="company" />
        </Tabs>
      </Paper>

      <TextField
        size="small"
        fullWidth
        placeholder="Filter by label or alias"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: "#E7ECEF", overflow: "hidden" }}>
        <TableContainer sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "#F6F8FA" }}>
                <TableCell>Label</TableCell>
                <TableCell>Alias</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Group</TableCell>
                <TableCell>Order</TableCell>
                <TableCell>Options</TableCell>
                <TableCell>State</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                [0, 1, 2, 3].map((key) => (
                  <TableRow key={key}>
                    <TableCell colSpan={8}>
                      <Skeleton variant="text" height={30} />
                    </TableCell>
                  </TableRow>
                ))
              ) : !fields.length ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <Stack spacing={1} alignItems="center" sx={{ py: 4 }}>
                      <Typography sx={{ fontWeight: 700, color: "#1B2A4A" }}>
                        No fields match
                      </Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
              ) : (
                fields.map((field) => (
                  <TableRow key={field.id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <Typography sx={{ fontWeight: 700, color: "#1B2A4A" }}>
                          {field.label}
                        </Typography>
                        {field.is_system ? (
                          <Tooltip title="Built-in Mautic field — protected">
                            <LockRoundedIcon sx={{ fontSize: 15, color: "#94A3B8" }} />
                          </Tooltip>
                        ) : null}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                        {field.alias}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={field.type} variant="outlined" />
                    </TableCell>
                    <TableCell>{field.group || "—"}</TableCell>
                    <TableCell>{field.order ?? "—"}</TableCell>
                    <TableCell>{field.options?.length ? field.options.length : "—"}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        <Chip
                          size="small"
                          label={field.is_published ? "Published" : "Unpublished"}
                          color={field.is_published ? "success" : "default"}
                          variant={field.is_published ? "filled" : "outlined"}
                        />
                        {field.is_required ? (
                          <Chip size="small" label="Required" variant="outlined" />
                        ) : null}
                      </Stack>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title={field.is_published ? "Unpublish" : "Publish"}>
                        <span>
                          <Switch
                            size="small"
                            checked={field.is_published}
                            onChange={() => togglePublished(field)}
                            disabled={busy}
                          />
                        </span>
                      </Tooltip>
                      <Tooltip title="Edit field">
                        <IconButton size="small" onClick={() => setDialog({ open: true, field })}>
                          <EditRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip
                        title={
                          field.can_delete
                            ? "Delete field"
                            : "Mautic protects this built-in field from deletion"
                        }
                      >
                        <span>
                          <IconButton
                            size="small"
                            disabled={!field.can_delete}
                            onClick={() => setDeleteTarget(field)}
                          >
                            <DeleteRoundedIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <Divider />
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="body2" color="text.secondary">
            {`${fields.length} of ${Number(data?.count || 0)} ${fieldObject} field(s)`}
          </Typography>
        </Box>
      </Paper>

      <FieldDialog
        open={dialog.open}
        fieldObject={fieldObject}
        field={dialog.field}
        fieldTypes={fieldTypes}
        onClose={() => setDialog({ open: false, field: null })}
        onSaved={(_saved, isEdit) => {
          setDialog({ open: false, field: null });
          setSnackbar({
            open: true,
            message: isEdit ? "Field updated in Mautic." : "Field created in Mautic.",
            severity: "success",
          });
          loadFields();
        }}
      />

      <Dialog open={Boolean(deleteTarget)} onClose={busy ? undefined : () => setDeleteTarget(null)}>
        <DialogTitle sx={{ fontWeight: 850 }}>Delete Field?</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Deleting a field in Mautic also removes the values stored for it on every
            {fieldObject === "company" ? " company" : " contact"}. This cannot be undone.
          </Alert>
          <Typography>{`"${deleteTarget?.label || ""}" (${deleteTarget?.alias || ""}) will be deleted.`}</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} disabled={busy} sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDelete}
            disabled={busy}
            startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <DeleteRoundedIcon />}
            sx={{ textTransform: "none" }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((current) => ({ ...current, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
