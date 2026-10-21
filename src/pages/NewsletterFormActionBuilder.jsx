// Submission Actions inside the Forms editor. Only tag and points actions are
// offered; every other native action is shown read-only. Each save is one
// provider write that the backend confirms against Mautic before this list
// updates.

import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
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
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowDownwardRoundedIcon from "@mui/icons-material/ArrowDownwardRounded";
import ArrowUpwardRoundedIcon from "@mui/icons-material/ArrowUpwardRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";

import {
  createNewsletterFormAction,
  getNewsletterFormActionMetadata,
  reorderNewsletterFormActions,
  updateNewsletterFormAction,
} from "../services/newsletterService";
import { CARD_BORDER, NAVY, getErrorMessage } from "./newsletterFormShared.jsx";
import { moveItem } from "./newsletterFormFields.js";
import {
  DEFAULT_ACTION_TYPES,
  POINTS,
  TAGS,
  actionDraftToPayload,
  actionDraftsEqual,
  actionToDraft,
  blankActionDraft,
  describeAction,
  validateActionDraft,
} from "./newsletterFormActions.js";

const serverErrors = (data) => (data?.errors && typeof data.errors === "object" ? data.errors : {});

function TagPicker({ label, value, onChange, tags, disabled, error }) {
  const byId = useMemo(() => Object.fromEntries(tags.map((tag) => [tag.id, tag])), [tags]);
  return (
    <Autocomplete
      multiple
      options={tags}
      value={value.map((id) => byId[id] || { id, name: `Tag ${id}` })}
      onChange={(_, chosen) => onChange(chosen.map((tag) => tag.id))}
      getOptionLabel={(tag) => tag.name}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      disabled={disabled}
      renderInput={(params) => <TextField {...params} label={label} error={Boolean(error)} helperText={error || ""} />}
    />
  );
}

function ActionPanel({ editing, draft, setDraft, errors, setErrors, types, tags, saving, onSave, onCancel }) {
  const isNew = !editing.action;
  const locked = editing.action?.settingsLocked || "";
  const type = types.find((entry) => entry.type === draft.type) || {};
  const set = (key, value) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  };
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 2, borderColor: "primary.light" }} aria-label="Submit action settings">
      <Stack spacing={2}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography component="h3" variant="subtitle1" sx={{ fontWeight: 850, color: NAVY }}>
            {isNew ? "Add submit action" : `Edit action — ${editing.action.name || editing.action.typeLabel}`}
          </Typography>
          <Chip size="small" label="Unsaved" color="warning" variant="outlined" />
        </Stack>
        {errors.general && <Alert severity="error">{errors.general}</Alert>}
        <TextField
          select
          label="Action"
          value={draft.type}
          disabled={!isNew}
          onChange={(event) => {
            setDraft((current) => ({ ...blankActionDraft(event.target.value), name: current.name, description: current.description }));
            setErrors({});
          }}
          helperText={type.description || (isNew ? "" : "An action's type cannot change.")}
          fullWidth
        >
          {types.map((entry) => <MenuItem key={entry.type} value={entry.type}>{entry.label}</MenuItem>)}
        </TextField>
        <TextField label="Action name" value={draft.name} onChange={(event) => set("name", event.target.value)} required fullWidth
          error={Boolean(errors.name)} helperText={errors.name || ""} />
        <TextField label="Description" value={draft.description} onChange={(event) => set("description", event.target.value)} fullWidth
          multiline minRows={2} error={Boolean(errors.description)} helperText={errors.description || "Optional internal note."} />
        {locked && <Alert severity="info" icon={<LockRoundedIcon />}>{locked}</Alert>}
        {draft.type === TAGS && (
          <>
            <TagPicker label="Add tags" value={draft.addTags} onChange={(ids) => set("addTags", ids)} tags={tags} disabled={Boolean(locked)} error={errors.addTags} />
            <TagPicker label="Remove tags" value={draft.removeTags} onChange={(ids) => set("removeTags", ids)} tags={tags} disabled={Boolean(locked)} error={errors.removeTags} />
          </>
        )}
        {draft.type === POINTS && (
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField select label="Change" value={draft.operator} onChange={(event) => set("operator", event.target.value)}
              disabled={Boolean(locked)} error={Boolean(errors.operator)} helperText={errors.operator || ""} sx={{ minWidth: { sm: 180 } }}>
              {(type.operators || DEFAULT_ACTION_TYPES[1].operators).map((operator) => (
                <MenuItem key={operator.value} value={operator.value}>{operator.label}</MenuItem>
              ))}
            </TextField>
            <TextField label="Points" value={draft.points} onChange={(event) => set("points", event.target.value)} disabled={Boolean(locked)}
              error={Boolean(errors.points)} helperText={errors.points || `1 to ${type.maxPoints || 10000}`} fullWidth />
          </Stack>
        )}
        <Stack direction="row" spacing={1} justifyContent="flex-end" flexWrap="wrap" useFlexGap>
          <Button onClick={onCancel} disabled={saving} sx={{ textTransform: "none" }}>Cancel</Button>
          <Button variant="contained" onClick={onSave} disabled={saving} startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
            sx={{ textTransform: "none" }}>
            {isNew ? "Add action" : "Save action"}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}

export default function NewsletterFormActionBuilder({ form, onFormChange, onDirtyChange }) {
  const [metadata, setMetadata] = useState({ actionTypes: DEFAULT_ACTION_TYPES, tags: [], note: "", error: "" });
  const [editing, setEditing] = useState(null); // { action } (null action = new)
  const [draft, setDraft] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [order, setOrder] = useState(null);
  const [notice, setNotice] = useState(null);
  const [pendingSwitch, setPendingSwitch] = useState(null);

  const actions = useMemo(() => (Array.isArray(form?.actions) ? form.actions : []), [form]);
  const savedOrder = actions.map((action) => action.id);
  const shownActions = order ? order.map((id) => actions.find((action) => action.id === id)).filter(Boolean) : actions;
  const types = metadata.actionTypes;

  useEffect(() => {
    let active = true;
    getNewsletterFormActionMetadata()
      .then((data) => active && setMetadata({
        actionTypes: Array.isArray(data?.actionTypes) && data.actionTypes.length ? data.actionTypes : DEFAULT_ACTION_TYPES,
        tags: Array.isArray(data?.tags) ? data.tags : [],
        note: data?.policyNote || "",
        error: "",
      }))
      .catch((err) => active && setMetadata((current) => ({ ...current, error: getErrorMessage(err, "Mautic tags could not be loaded.") })));
    return () => {
      active = false;
    };
  }, []);

  const baseline = editing ? (editing.action ? actionToDraft(editing.action) : blankActionDraft(editing.type)) : null;
  const draftDirty = Boolean(editing && draft && !actionDraftsEqual(draft, baseline));
  const orderDirty = Boolean(order && order.join() !== savedOrder.join());

  useEffect(() => {
    onDirtyChange?.(draftDirty || orderDirty);
  }, [draftDirty, orderDirty, onDirtyChange]);

  const open = (action, type = TAGS) => {
    if (draftDirty) {
      setPendingSwitch({ action, type });
      return;
    }
    setEditing({ action, type });
    setDraft(action ? actionToDraft(action) : blankActionDraft(type));
    setErrors({});
    setNotice(null);
  };

  const close = () => {
    setEditing(null);
    setDraft(null);
    setErrors({});
  };

  const save = async () => {
    const nextErrors = validateActionDraft(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    const payload = actionDraftToPayload(draft, editing.action);
    if (editing.action && Object.keys(payload).length === 0) {
      close();
      return;
    }
    setSaving(true);
    try {
      const saved = editing.action
        ? await updateNewsletterFormAction(form.id, editing.action.id, payload)
        : await createNewsletterFormAction(form.id, payload);
      const isNew = !editing.action;
      close();
      onFormChange(saved);
      setNotice({ severity: "success", message: isNew ? "Submit action added and confirmed in Mautic." : "Submit action saved and confirmed in Mautic." });
    } catch (err) {
      const data = err?.response?.data;
      if (data?.form?.id) onFormChange(data.form);
      setErrors({ ...serverErrors(data), general: getErrorMessage(err, "The submit action could not be saved.") });
    } finally {
      setSaving(false);
    }
  };

  const saveOrder = async () => {
    setSaving(true);
    try {
      const saved = await reorderNewsletterFormActions(form.id, order);
      setOrder(null);
      onFormChange(saved);
      setNotice({ severity: "success", message: "Submit action order saved and confirmed in Mautic." });
    } catch (err) {
      const data = err?.response?.data;
      if (data?.form?.id) onFormChange(data.form);
      setNotice({ severity: "error", message: getErrorMessage(err, "The submit action order could not be saved.") });
    } finally {
      setSaving(false);
    }
  };

  const move = (index, delta) => setOrder(moveItem(shownActions.map((action) => action.id), index, delta));

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, borderColor: CARD_BORDER }}>
      <Stack spacing={2}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" alignItems={{ sm: "center" }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 850, color: NAVY }}>Submission Actions ({actions.length})</Typography>
            <Typography variant="body2" color="text.secondary">
              {metadata.note || "Run when a visitor submits the Form. Each change is saved straight to Mautic; actions cannot be removed here."}
            </Typography>
          </Box>
          <Button variant="outlined" startIcon={<AddRoundedIcon />} onClick={() => open(null, TAGS)}
            disabled={saving || Boolean(editing && !editing.action)} sx={{ textTransform: "none", whiteSpace: "nowrap", flexShrink: 0, alignSelf: { xs: "flex-start", sm: "center" } }}>
            Add Action
          </Button>
        </Stack>
        {metadata.error && <Alert severity="warning">{metadata.error}</Alert>}
        {notice && <Alert severity={notice.severity} onClose={() => setNotice(null)}>{notice.message}</Alert>}

        {shownActions.length === 0 ? (
          <Typography color="text.secondary">No submit actions. Submissions still create or update the contact.</Typography>
        ) : (
          <Stack component="ol" spacing={1} sx={{ m: 0, p: 0, listStyle: "none" }} aria-label="Submit actions in order">
            {shownActions.map((action, index) => {
              const warning = action.policy && action.policy !== "allowed";
              return (
                <Stack component="li" key={action.id} data-action-id={action.id} direction="row" spacing={1} alignItems="center"
                  sx={{ p: 1.25, border: 1, borderColor: warning ? "warning.main" : editing?.action?.id === action.id ? "primary.main" : CARD_BORDER, borderRadius: 1.5, minWidth: 0 }}>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography sx={{ fontWeight: 700, wordBreak: "break-word" }}>{action.name || action.typeLabel}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ wordBreak: "break-word" }}>{describeAction(action)}</Typography>
                    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                      <Chip size="small" label={action.typeLabel || action.type} />
                      {warning && <Chip size="small" color="warning" icon={<WarningAmberRoundedIcon />} label={action.policyReason} />}
                      {!warning && !action.editable && <Chip size="small" icon={<LockRoundedIcon />} label="Managed in Mautic" />}
                    </Stack>
                  </Box>
                  <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0 }}>
                    <Tooltip title="Move up"><span>
                      <IconButton size="small" aria-label={`Move ${action.name || action.typeLabel} up`} disabled={saving || index === 0} onClick={() => move(index, -1)}>
                        <ArrowUpwardRoundedIcon fontSize="small" />
                      </IconButton>
                    </span></Tooltip>
                    <Tooltip title="Move down"><span>
                      <IconButton size="small" aria-label={`Move ${action.name || action.typeLabel} down`} disabled={saving || index === shownActions.length - 1} onClick={() => move(index, 1)}>
                        <ArrowDownwardRoundedIcon fontSize="small" />
                      </IconButton>
                    </span></Tooltip>
                    <Tooltip title={action.editable ? "Edit action" : action.lockReason}><span>
                      <IconButton size="small" aria-label={`Edit ${action.name || action.typeLabel}`} disabled={!action.editable || saving || orderDirty} onClick={() => open(action)}>
                        <EditRoundedIcon fontSize="small" />
                      </IconButton>
                    </span></Tooltip>
                  </Stack>
                </Stack>
              );
            })}
          </Stack>
        )}

        {orderDirty && (
          <Alert severity="info" action={
            <Stack direction="row" spacing={1}>
              <Button color="inherit" size="small" onClick={() => setOrder(null)} disabled={saving}>Reset</Button>
              <Button color="inherit" size="small" variant="outlined" onClick={saveOrder} disabled={saving}>Save action order</Button>
            </Stack>
          }>
            The new action order is not saved yet.
          </Alert>
        )}

        {editing && draft && (
          <ActionPanel editing={editing} draft={draft} setDraft={setDraft} errors={errors} setErrors={setErrors} types={types}
            tags={metadata.tags} saving={saving} onSave={save} onCancel={() => (draftDirty ? setPendingSwitch({ close: true }) : close())} />
        )}
      </Stack>

      <Dialog open={Boolean(pendingSwitch)} onClose={() => setPendingSwitch(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Discard action changes?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">The submit action you are editing has unsaved changes. They will be lost.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingSwitch(null)}>Keep Editing</Button>
          <Button color="error" variant="contained" onClick={() => {
            const next = pendingSwitch;
            setPendingSwitch(null);
            close();
            if (!next.close) {
              setEditing({ action: next.action, type: next.type });
              setDraft(next.action ? actionToDraft(next.action) : blankActionDraft(next.type));
            }
          }}>
            Discard Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
