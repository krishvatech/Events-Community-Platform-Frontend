// Form Field Builder inside the Forms editor. Every save is one provider write
// (add, change or re-order) that the backend confirms against Mautic before
// this list updates; nothing is shown as saved until then.

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
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowDownwardRoundedIcon from "@mui/icons-material/ArrowDownwardRounded";
import ArrowUpwardRoundedIcon from "@mui/icons-material/ArrowUpwardRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";

import {
  createNewsletterFormField,
  getNewsletterFormBuilderMetadata,
  reorderNewsletterFormFields,
  updateNewsletterFormField,
} from "../services/newsletterService";
import { CARD_BORDER, NAVY, getErrorMessage } from "./newsletterFormShared.jsx";
import {
  DEFAULT_FIELD_TYPES,
  blankFieldDraft,
  capabilityFor,
  changeDraftType,
  draftsEqual,
  fieldDraftToPayload,
  fieldToDraft,
  moveItem,
  optionValueFromLabel,
  suggestAlias,
  validateFieldDraft,
} from "./newsletterFormFields.js";

const serverFieldErrors = (data) => (data?.errors && typeof data.errors === "object" ? data.errors : {});

function OptionsEditor({ options, onChange, error }) {
  const update = (index, key, value) =>
    onChange(options.map((option, at) => (at === index ? { ...option, [key]: value } : option)));
  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: NAVY }}>Options</Typography>
      {options.map((option, index) => (
        <Stack key={option.key} direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "flex-start" }}>
          <TextField
            size="small"
            label={`Option ${index + 1} label`}
            value={option.label}
            onChange={(event) => update(index, "label", event.target.value)}
            onBlur={() => {
              if (!option.value.trim() && option.label.trim()) update(index, "value", optionValueFromLabel(option.label));
            }}
            fullWidth
          />
          <TextField
            size="small"
            label={`Option ${index + 1} value`}
            value={option.value}
            onChange={(event) => update(index, "value", event.target.value)}
            fullWidth
          />
          <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
            <IconButton size="small" aria-label={`Move option ${index + 1} up`} disabled={index === 0} onClick={() => onChange(moveItem(options, index, -1))}>
              <ArrowUpwardRoundedIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" aria-label={`Move option ${index + 1} down`} disabled={index === options.length - 1} onClick={() => onChange(moveItem(options, index, 1))}>
              <ArrowDownwardRoundedIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" aria-label={`Remove option ${index + 1}`} disabled={options.length === 1} onClick={() => onChange(options.filter((_, at) => at !== index))}>
              <DeleteOutlineRoundedIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>
      ))}
      {error && <Typography variant="body2" color="error">{error}</Typography>}
      <Box>
        <Button
          size="small"
          startIcon={<AddRoundedIcon />}
          onClick={() => onChange([...options, { ...blankFieldDraft("select").options[0] }])}
          sx={{ textTransform: "none" }}
        >
          Add option
        </Button>
      </Box>
    </Stack>
  );
}

function FieldPanel({ editing, draft, setDraft, errors, setErrors, types, contactFields, fields, saving, onSave, onCancel }) {
  const isNew = !editing.field;
  const capability = capabilityFor(types, draft.type) || {};
  const set = (key, value) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  };
  const compatible = contactFields.filter((field) => field.fieldTypes.includes(draft.type));
  const takenAliases = new Set(fields.map((field) => field.alias));
  const mappedElsewhere = new Map(
    fields.filter((field) => field.mappedField && field.id !== editing.field?.id).map((field) => [field.mappedField, field.label || field.alias])
  );

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 2, borderColor: "primary.light" }} aria-label="Field settings">
      <Stack spacing={2}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography component="h3" variant="subtitle1" sx={{ fontWeight: 850, color: NAVY }}>
            {isNew ? "Add field" : `Edit field — ${editing.field.label || editing.field.alias}`}
          </Typography>
          <Chip size="small" label="Unsaved" color="warning" variant="outlined" />
        </Stack>
        {errors.general && <Alert severity="error">{errors.general}</Alert>}
        <TextField
          select
          label="Field type"
          value={draft.type}
          disabled={!isNew}
          onChange={(event) => {
            setDraft((current) => changeDraftType(current, event.target.value, types));
            setErrors({});
          }}
          error={Boolean(errors.type)}
          helperText={errors.type || (isNew ? "" : "A field's type cannot change after it is saved.")}
          fullWidth
        >
          {types.map((entry) => (
            <MenuItem key={entry.type} value={entry.type}>{entry.label}</MenuItem>
          ))}
        </TextField>
        <TextField
          label={draft.type === "button" ? "Button text" : "Label"}
          value={draft.label}
          onChange={(event) => set("label", event.target.value)}
          required
          fullWidth
          error={Boolean(errors.label)}
          helperText={errors.label || ""}
        />
        <TextField
          label="Alias"
          value={isNew ? draft.alias : editing.field.alias}
          onChange={(event) => set("alias", event.target.value.toLowerCase())}
          disabled={!isNew}
          placeholder={isNew ? suggestAlias(draft.label, takenAliases) : ""}
          fullWidth
          error={Boolean(errors.alias)}
          helperText={errors.alias || (isNew ? "Leave blank to use the suggestion. It names the stored submission column and cannot change later." : "The alias cannot change after the field is saved.")}
        />
        {capability.required && (
          <FormControlLabel
            control={<Switch checked={draft.isRequired} onChange={(event) => set("isRequired", event.target.checked)} />}
            label="Required"
          />
        )}
        {capability.required && draft.isRequired && (
          <TextField
            label="Message when missing"
            value={draft.validationMessage}
            onChange={(event) => set("validationMessage", event.target.value)}
            fullWidth
            error={Boolean(errors.validationMessage)}
            helperText={errors.validationMessage || "Optional. Mautic shows its default message when blank."}
          />
        )}
        {capability.helpMessage && (
          <TextField
            label="Help text"
            value={draft.helpMessage}
            onChange={(event) => set("helpMessage", event.target.value)}
            fullWidth
            error={Boolean(errors.helpMessage)}
            helperText={errors.helpMessage || ""}
          />
        )}
        {capability.placeholder && (
          <TextField
            label={draft.type === "select" || draft.type === "country" ? "Empty choice text" : "Placeholder"}
            value={draft.placeholder}
            onChange={(event) => set("placeholder", event.target.value)}
            fullWidth
            error={Boolean(errors.placeholder)}
            helperText={errors.placeholder || ""}
          />
        )}
        {capability.precision && (
          <TextField
            label="Decimal places"
            value={draft.precision}
            onChange={(event) => set("precision", event.target.value)}
            fullWidth
            error={Boolean(errors.precision)}
            helperText={errors.precision || "0 for whole numbers."}
          />
        )}
        {capability.multiple && (
          <FormControlLabel
            control={<Switch checked={draft.multiple} onChange={(event) => set("multiple", event.target.checked)} />}
            label="Allow several choices"
          />
        )}
        {capability.options && (
          <OptionsEditor options={draft.options} onChange={(options) => set("options", options)} error={errors.options} />
        )}
        {capability.defaultValue && (capability.options ? (
          <TextField
            select
            label="Default choice"
            value={draft.options.some((option) => option.value === draft.defaultValue) ? draft.defaultValue : ""}
            onChange={(event) => set("defaultValue", event.target.value)}
            fullWidth
            error={Boolean(errors.defaultValue)}
            helperText={errors.defaultValue || ""}
          >
            <MenuItem value="">No default</MenuItem>
            {draft.options.filter((option) => option.value.trim()).map((option) => (
              <MenuItem key={option.key} value={option.value}>{option.label || option.value}</MenuItem>
            ))}
          </TextField>
        ) : (
          <TextField
            label={draft.type === "hidden" ? "Value" : "Default value"}
            value={draft.defaultValue}
            onChange={(event) => set("defaultValue", event.target.value)}
            placeholder={draft.type === "date" ? "YYYY-MM-DD" : ""}
            fullWidth
            error={Boolean(errors.defaultValue)}
            helperText={errors.defaultValue || ""}
          />
        ))}
        {capability.mapping && (
          <TextField
            select
            label="Save to Contact field"
            value={draft.mappedField}
            onChange={(event) => set("mappedField", event.target.value)}
            fullWidth
            error={Boolean(errors.mappedField)}
            helperText={errors.mappedField || "Mautic updates this Contact field from submissions. Consent fields are never offered."}
          >
            <MenuItem value="">Not mapped</MenuItem>
            {compatible.map((field) => (
              <MenuItem key={field.alias} value={field.alias} disabled={mappedElsewhere.has(field.alias)}>
                {field.label} ({field.alias}){mappedElsewhere.has(field.alias) ? ` — used by ${mappedElsewhere.get(field.alias)}` : ""}
              </MenuItem>
            ))}
            {draft.mappedField && !compatible.some((field) => field.alias === draft.mappedField) && (
              <MenuItem value={draft.mappedField}>{draft.mappedField} (current)</MenuItem>
            )}
          </TextField>
        )}
        <Stack direction="row" spacing={1} justifyContent="flex-end" flexWrap="wrap" useFlexGap>
          <Button onClick={onCancel} disabled={saving} sx={{ textTransform: "none" }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={onSave}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
            sx={{ textTransform: "none" }}
          >
            {isNew ? "Add field" : "Save field"}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}

/**
 * `form` is the backend's Form detail; `onFormChange` receives the verified
 * Form after each save; `onDirtyChange` reports unsaved field work so the page
 * guard can hold navigation.
 */
export default function NewsletterFormFieldBuilder({ form, onFormChange, onDirtyChange }) {
  const [metadata, setMetadata] = useState({ fieldTypes: DEFAULT_FIELD_TYPES, contactFields: [], error: "" });
  const [editing, setEditing] = useState(null); // { field } (null field = new)
  const [draft, setDraft] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [order, setOrder] = useState(null); // pending field id order
  const [notice, setNotice] = useState(null);
  const [pendingSwitch, setPendingSwitch] = useState(null);

  const fields = useMemo(() => (Array.isArray(form?.fields) ? form.fields : []), [form]);
  const savedOrder = fields.map((field) => field.id);
  const shownFields = order ? order.map((id) => fields.find((field) => field.id === id)).filter(Boolean) : fields;
  const editable = form?.fieldsEditable !== false;
  const types = metadata.fieldTypes;

  useEffect(() => {
    let active = true;
    getNewsletterFormBuilderMetadata()
      .then((data) => active && setMetadata({
        fieldTypes: Array.isArray(data?.fieldTypes) && data.fieldTypes.length ? data.fieldTypes : DEFAULT_FIELD_TYPES,
        contactFields: Array.isArray(data?.contactFields) ? data.contactFields : [],
        error: "",
      }))
      .catch((err) => active && setMetadata((current) => ({ ...current, error: getErrorMessage(err, "Contact fields could not be loaded; mapping is unavailable.") })));
    return () => {
      active = false;
    };
  }, []);

  const baseline = editing ? (editing.field ? fieldToDraft(editing.field) : blankFieldDraft(editing.type)) : null;
  const draftDirty = Boolean(editing && draft && !draftsEqual(draft, baseline));
  const orderDirty = Boolean(order && order.join() !== savedOrder.join());

  useEffect(() => {
    onDirtyChange?.(draftDirty || orderDirty);
  }, [draftDirty, orderDirty, onDirtyChange]);

  const open = (field, type = "text") => {
    const next = { field, type };
    if (draftDirty) {
      setPendingSwitch(next);
      return;
    }
    setEditing(next);
    setDraft(field ? fieldToDraft(field) : blankFieldDraft(type));
    setErrors({});
    setNotice(null);
  };

  const close = () => {
    setEditing(null);
    setDraft(null);
    setErrors({});
  };

  const applySaved = (saved, message) => {
    onFormChange(saved);
    setNotice({ severity: "success", message });
  };

  const saveField = async () => {
    const isNew = !editing.field;
    const nextErrors = validateFieldDraft(draft, {
      isNew, fields, types, contactFields: metadata.contactFields, fieldId: editing.field?.id,
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    const payload = fieldDraftToPayload(draft, editing.field, types);
    if (!isNew && Object.keys(payload).length === 0) {
      close();
      return;
    }
    setSaving(true);
    try {
      const saved = isNew
        ? await createNewsletterFormField(form.id, payload)
        : await updateNewsletterFormField(form.id, editing.field.id, payload);
      close();
      applySaved(saved, isNew ? "Field added and confirmed in Mautic." : "Field saved and confirmed in Mautic.");
    } catch (err) {
      const data = err?.response?.data;
      // Mautic's verified state after an unexpected result: show it, keep the draft.
      if (data?.form?.id) onFormChange(data.form);
      setErrors({ ...serverFieldErrors(data), general: getErrorMessage(err, "The field could not be saved.") });
    } finally {
      setSaving(false);
    }
  };

  const saveOrder = async () => {
    setSaving(true);
    try {
      const saved = await reorderNewsletterFormFields(form.id, order);
      setOrder(null);
      applySaved(saved, "Field order saved and confirmed in Mautic.");
    } catch (err) {
      const data = err?.response?.data;
      if (data?.form?.id) onFormChange(data.form);
      setNotice({ severity: "error", message: getErrorMessage(err, "The field order could not be saved.") });
    } finally {
      setSaving(false);
    }
  };

  const move = (index, delta) => setOrder(moveItem(shownFields.map((field) => field.id), index, delta));

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, borderColor: CARD_BORDER }}>
      <Stack spacing={2}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" alignItems={{ sm: "center" }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 850, color: NAVY }}>Form Fields ({fields.length})</Typography>
            <Typography variant="body2" color="text.secondary">
              Each change is saved straight to Mautic. Fields cannot be removed here.
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<AddRoundedIcon />}
            onClick={() => open(null, "text")}
            disabled={!editable || saving || Boolean(editing && !editing.field)}
            sx={{ textTransform: "none", alignSelf: { xs: "flex-start", sm: "center" } }}
          >
            Add Field
          </Button>
        </Stack>

        {!editable && <Alert severity="info" icon={<LockRoundedIcon />}>{form.fieldsLockReason}</Alert>}
        {metadata.error && <Alert severity="warning">{metadata.error}</Alert>}
        {notice && <Alert severity={notice.severity} onClose={() => setNotice(null)}>{notice.message}</Alert>}
        {!form.isPublished && (form.publishBlockers || []).length > 0 && (
          <Alert severity="warning">
            <strong>Before publishing:</strong>
            <Box component="ul" sx={{ m: 0, mt: 0.5, pl: 2.5 }}>
              {form.publishBlockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
            </Box>
          </Alert>
        )}

        {shownFields.length === 0 ? (
          <Typography color="text.secondary">No fields yet. Add the fields visitors fill in, then a submit button.</Typography>
        ) : (
          <Stack component="ol" spacing={1} sx={{ m: 0, p: 0, listStyle: "none" }} aria-label="Form fields in order">
            {shownFields.map((field, index) => (
              <Stack
                component="li"
                key={field.id}
                data-field-id={field.id}
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ p: 1.25, border: 1, borderColor: editing?.field?.id === field.id ? "primary.main" : CARD_BORDER, borderRadius: 1.5, minWidth: 0 }}
              >
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography sx={{ fontWeight: 700, wordBreak: "break-word" }}>{field.label || field.alias}</Typography>
                  <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                    <Chip size="small" label={field.typeLabel || field.type} />
                    {field.isRequired && <Chip size="small" color="primary" variant="outlined" label="Required" />}
                    {field.mappedField && <Chip size="small" variant="outlined" label={`→ ${field.mappedField}`} />}
                    {!field.editable && <Chip size="small" icon={<LockRoundedIcon />} label="Managed in Mautic" />}
                  </Stack>
                </Box>
                <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0 }}>
                  <Tooltip title="Move up">
                    <span>
                      <IconButton size="small" aria-label={`Move ${field.label || field.alias} up`} disabled={!editable || saving || index === 0} onClick={() => move(index, -1)}>
                        <ArrowUpwardRoundedIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Move down">
                    <span>
                      <IconButton size="small" aria-label={`Move ${field.label || field.alias} down`} disabled={!editable || saving || index === shownFields.length - 1} onClick={() => move(index, 1)}>
                        <ArrowDownwardRoundedIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title={field.editable ? "Edit field" : field.lockReason}>
                    <span>
                      <IconButton size="small" aria-label={`Edit ${field.label || field.alias}`} disabled={!editable || !field.editable || saving || orderDirty} onClick={() => open(field)}>
                        <EditRoundedIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>
              </Stack>
            ))}
          </Stack>
        )}

        {orderDirty && (
          <Alert
            severity="info"
            action={
              <Stack direction="row" spacing={1}>
                <Button color="inherit" size="small" onClick={() => setOrder(null)} disabled={saving}>Reset</Button>
                <Button color="inherit" size="small" variant="outlined" onClick={saveOrder} disabled={saving}>Save order</Button>
              </Stack>
            }
          >
            The new field order is not saved yet.
          </Alert>
        )}

        {editing && draft && (
          <FieldPanel
            editing={editing}
            draft={draft}
            setDraft={setDraft}
            errors={errors}
            setErrors={setErrors}
            types={types}
            contactFields={metadata.contactFields}
            fields={fields}
            saving={saving}
            onSave={saveField}
            onCancel={() => (draftDirty ? setPendingSwitch({ close: true }) : close())}
          />
        )}
      </Stack>

      <Dialog open={Boolean(pendingSwitch)} onClose={() => setPendingSwitch(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Discard field changes?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">The field you are editing has unsaved changes. They will be lost.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingSwitch(null)}>Keep Editing</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              const next = pendingSwitch;
              setPendingSwitch(null);
              close();
              if (!next.close) {
                setEditing({ field: next.field, type: next.type });
                setDraft(next.field ? fieldToDraft(next.field) : blankFieldDraft(next.type));
              }
            }}
          >
            Discard Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
