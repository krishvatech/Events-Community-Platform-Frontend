// Submission Actions inside the Forms editor. Actions that email the
// submitting contact, lift Do Not Contact or change segments are never offered;
// other native actions are shown read-only. Any action can be removed. Each
// save is one provider write that the backend confirms against Mautic before
// this list updates.

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
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowDownwardRoundedIcon from "@mui/icons-material/ArrowDownwardRounded";
import ArrowUpwardRoundedIcon from "@mui/icons-material/ArrowUpwardRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";

import {
  createNewsletterFormAction,
  deleteNewsletterFormAction,
  getNewsletterFormActionMetadata,
  reorderNewsletterFormActions,
  updateNewsletterFormAction,
} from "../services/newsletterService";
import { CARD_BORDER, NAVY, getErrorMessage } from "./newsletterFormShared.jsx";
import { moveItem } from "./newsletterFormFields.js";
import {
  ASSET,
  COMPANY_SCORE,
  DEFAULT_ACTION_TYPES,
  POINTS,
  REPOST,
  RESULTS_EMAIL,
  TAGS,
  UPDATE_CONTACT,
  USER_EMAIL,
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

const byId = (rows) => Object.fromEntries((rows || []).map((row) => [String(row.id), row.name]));

function ReferenceSelect({ label, value, onChange, rows, disabled, error, helperText, empty }) {
  const known = (rows || []).some((row) => String(row.id) === String(value));
  return (
    <TextField select label={label} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} fullWidth
      error={Boolean(error)} helperText={error || helperText || ""}>
      <MenuItem value="" disabled>{empty}</MenuItem>
      {(rows || []).map((row) => <MenuItem key={row.id} value={String(row.id)}>{row.name}</MenuItem>)}
      {value && !known && <MenuItem value={value}>#{value} (current)</MenuItem>}
    </TextField>
  );
}

function ContactFieldRows({ rows, onChange, fields, disabled, error }) {
  const update = (index, key, value) => onChange(rows.map((row, at) => (at === index ? { ...row, [key]: value } : row)));
  return (
    <Stack spacing={1.25}>
      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: NAVY }}>Contact fields to set</Typography>
      {rows.map((row, index) => (
        <Stack key={row.key} direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "flex-start" }}>
          <TextField select size="small" label="Contact field" value={row.alias} onChange={(event) => update(index, "alias", event.target.value)}
            disabled={disabled} fullWidth>
            {(fields || []).map((field) => <MenuItem key={field.id} value={field.id}>{field.name} ({field.id})</MenuItem>)}
            {row.alias && !(fields || []).some((field) => field.id === row.alias) && <MenuItem value={row.alias}>{row.alias}</MenuItem>}
          </TextField>
          <TextField size="small" label="Value" value={row.value} onChange={(event) => update(index, "value", event.target.value)} disabled={disabled} fullWidth />
          <IconButton size="small" aria-label={`Remove contact field ${index + 1}`} disabled={disabled || rows.length === 1}
            onClick={() => onChange(rows.filter((_, at) => at !== index))}>
            <DeleteOutlineRoundedIcon fontSize="small" />
          </IconButton>
        </Stack>
      ))}
      {error && <Typography variant="body2" color="error">{error}</Typography>}
      <Box>
        <Button size="small" startIcon={<AddRoundedIcon />} disabled={disabled}
          onClick={() => onChange([...rows, { key: `row-new-${rows.length}-${Date.now()}`, alias: "", value: "" }])} sx={{ textTransform: "none" }}>
          Add contact field
        </Button>
      </Box>
      <Typography variant="caption" color="text.secondary">Email, consent and system fields are never offered.</Typography>
    </Stack>
  );
}

function ActionPanel({ editing, draft, setDraft, errors, setErrors, types, tags, references, saving, onSave, onCancel }) {
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
        {draft.type === COMPANY_SCORE && (
          <TextField label="Change the company score by" value={draft.score} onChange={(event) => set("score", event.target.value)}
            disabled={Boolean(locked)} error={Boolean(errors.score)} helperText={errors.score || "Use a negative number to subtract."} fullWidth />
        )}
        {draft.type === UPDATE_CONTACT && (
          <ContactFieldRows rows={draft.fieldValues} onChange={(rows) => set("fieldValues", rows)} fields={references.contactFields}
            disabled={Boolean(locked)} error={errors.fieldValues} />
        )}
        {draft.type === ASSET && (
          <ReferenceSelect label="Asset to download" value={draft.assetId} onChange={(value) => set("assetId", value)} rows={references.assets}
            disabled={Boolean(locked)} error={errors.assetId} empty="Choose a published asset" helperText="The download starts after the visitor submits." />
        )}
        {draft.type === RESULTS_EMAIL && (
          <>
            <TextField label="Subject" value={draft.subject} onChange={(event) => set("subject", event.target.value)} required fullWidth
              disabled={Boolean(locked)} error={Boolean(errors.subject)} helperText={errors.subject || ""} />
            <TextField label="To" value={draft.to} onChange={(event) => set("to", event.target.value)} fullWidth disabled={Boolean(locked)}
              error={Boolean(errors.to)} helperText={errors.to || "Team addresses, separated by commas. A copy is never sent to the contact."} />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField label="Cc" value={draft.cc} onChange={(event) => set("cc", event.target.value)} fullWidth disabled={Boolean(locked)}
                error={Boolean(errors.cc)} helperText={errors.cc || ""} />
              <TextField label="Bcc" value={draft.bcc} onChange={(event) => set("bcc", event.target.value)} fullWidth disabled={Boolean(locked)}
                error={Boolean(errors.bcc)} helperText={errors.bcc || ""} />
            </Stack>
            <FormControlLabel control={<Switch checked={draft.emailToOwner} onChange={(event) => set("emailToOwner", event.target.checked)} disabled={Boolean(locked)} />}
              label="Also email the contact's owner" />
            <FormControlLabel control={<Switch checked={draft.replyToSubmitter} onChange={(event) => set("replyToSubmitter", event.target.checked)} disabled={Boolean(locked)} />}
              label="Replies go to the person who submitted" />
            <TextField label="Message" value={draft.message} onChange={(event) => set("message", event.target.value)} fullWidth multiline minRows={4}
              disabled={Boolean(locked)} error={Boolean(errors.message)}
              helperText={errors.message || "HTML allowed. Use {formfield=alias} for submitted values; leave blank for Mautic's default list of all fields."} />
          </>
        )}
        {draft.type === USER_EMAIL && (
          <>
            <ReferenceSelect label="Email to send" value={draft.emailId} onChange={(value) => set("emailId", value)} rows={references.emails}
              disabled={Boolean(locked)} error={errors.emailId} empty="Choose a published email" />
            <Autocomplete
              multiple
              options={references.users || []}
              value={draft.userIds.map((id) => (references.users || []).find((user) => String(user.id) === id) || { id, name: `User ${id}` })}
              onChange={(_, chosen) => set("userIds", chosen.map((user) => String(user.id)))}
              getOptionLabel={(user) => user.name}
              isOptionEqualToValue={(a, b) => String(a.id) === String(b.id)}
              disabled={Boolean(locked)}
              renderInput={(params) => (
                <TextField {...params} label="Mautic users" error={Boolean(errors.userIds)}
                  helperText={errors.userIds || "The email goes to these users only — never to the contact."} />
              )}
            />
          </>
        )}
        {draft.type === REPOST && (
          <>
            <TextField label="Post to (https://)" value={draft.postUrl} onChange={(event) => set("postUrl", event.target.value)} required fullWidth
              disabled={Boolean(locked)} error={Boolean(errors.postUrl)} helperText={errors.postUrl || "A public https:// address, such as a CRM webhook."} />
            <TextField label="Notify this address if posting fails" value={draft.failureEmail} onChange={(event) => set("failureEmail", event.target.value)}
              fullWidth disabled={Boolean(locked)} error={Boolean(errors.failureEmail)} helperText={errors.failureEmail || "Optional."} />
            <TextField label="Authorization header" value={draft.authorizationHeader} type="password" autoComplete="off"
              onChange={(event) => set("authorizationHeader", event.target.value)} fullWidth disabled={Boolean(locked)}
              error={Boolean(errors.authorizationHeader)}
              helperText={errors.authorizationHeader || (editing.action?.hasAuthorizationHeader
                ? "A header is saved and never shown. Leave blank to keep it."
                : "Optional, for example: Bearer <token>. It is never shown again.")} />
            {editing.action?.hasAuthorizationHeader && (
              <FormControlLabel control={<Switch checked={draft.clearHeader} onChange={(event) => set("clearHeader", event.target.checked)} disabled={Boolean(locked)} />}
                label="Remove the saved authorization header" />
            )}
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
  const [metadata, setMetadata] = useState({
    actionTypes: DEFAULT_ACTION_TYPES, tags: [], users: [], emails: [], assets: [], contactFields: [], note: "", error: "",
  });
  const [removing, setRemoving] = useState(null); // { action, busy, error }
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
        users: Array.isArray(data?.users) ? data.users : [],
        emails: Array.isArray(data?.emails) ? data.emails : [],
        assets: Array.isArray(data?.assets) ? data.assets : [],
        contactFields: Array.isArray(data?.contactFields) ? data.contactFields : [],
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
  const names = useMemo(() => ({ users: byId(metadata.users), emails: byId(metadata.emails), assets: byId(metadata.assets) }), [metadata]);

  const removeAction = async () => {
    const { action } = removing;
    setRemoving((current) => ({ ...current, busy: true, error: "" }));
    try {
      const saved = await deleteNewsletterFormAction(form.id, action.id);
      setRemoving(null);
      if (editing?.action?.id === action.id) close();
      onFormChange(saved);
      setNotice({ severity: "success", message: `Submit action “${action.name || action.typeLabel}” removed and confirmed in Mautic.` });
    } catch (err) {
      const data = err?.response?.data;
      if (data?.form?.id) onFormChange(data.form);
      setRemoving((current) => ({ ...current, busy: false, error: getErrorMessage(err, "The submit action could not be removed.") }));
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, borderColor: CARD_BORDER }}>
      <Stack spacing={2}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" alignItems={{ sm: "center" }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 850, color: NAVY }}>Submission Actions ({actions.length})</Typography>
            <Typography variant="body2" color="text.secondary">
              Run when a visitor submits the Form. Each change is saved straight to Mautic. {metadata.note}
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
                    <Typography variant="body2" color="text.secondary" sx={{ wordBreak: "break-word" }}>{describeAction(action, names)}</Typography>
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
                    <Tooltip title="Remove action"><span>
                      <IconButton size="small" aria-label={`Remove ${action.name || action.typeLabel}`} disabled={saving || orderDirty || Boolean(removing)}
                        onClick={() => setRemoving({ action, busy: false, error: "" })}>
                        <DeleteOutlineRoundedIcon fontSize="small" />
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
            tags={metadata.tags} references={metadata} saving={saving} onSave={save} onCancel={() => (draftDirty ? setPendingSwitch({ close: true }) : close())} />
        )}
      </Stack>

      <Dialog open={Boolean(removing)} onClose={() => !removing?.busy && setRemoving(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Remove submit action “{removing?.action.name || removing?.action.typeLabel}”?</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5}>
            <Typography color="text.secondary">New submissions will no longer run it. Past submissions are not changed.</Typography>
            {removing?.error && <Alert severity="error">{removing.error}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoving(null)} disabled={removing?.busy}>Cancel</Button>
          <Button color="error" variant="contained" onClick={removeAction} disabled={removing?.busy}
            startIcon={removing?.busy ? <CircularProgress size={16} color="inherit" /> : null}>
            Remove action
          </Button>
        </DialogActions>
      </Dialog>

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
