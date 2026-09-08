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
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Switch,
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
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import RuleRoundedIcon from "@mui/icons-material/RuleRounded";
import SettingsSuggestRoundedIcon from "@mui/icons-material/SettingsSuggestRounded";

import {
  createNewsletterPointTrigger,
  createNewsletterPointTriggerEvent,
  deleteNewsletterPointTrigger,
  deleteNewsletterPointTriggerEvent,
  listNewsletterPointTriggerEvents,
  listNewsletterPointTriggerEventTypes,
  listNewsletterPointTriggers,
  updateNewsletterPointTrigger,
  updateNewsletterPointTriggerEvent,
} from "../services/newsletterService";

const pageSize = 25;

const blankTriggerForm = {
  name: "",
  description: "",
  points: "0",
  color: "a0acb8",
  triggerExistingLeads: false,
  isPublished: false,
};

const blankEventForm = {
  name: "",
  description: "",
  type: "",
  order: "1",
  propertiesText: "{}",
};

const eventPropertyTemplates = {
  "campaign.changecampaign": {
    addTo: [],
    removeFrom: [],
  },
  "lead.changelists": {
    addToLists: [],
    removeFromLists: [],
  },
  "lead.changetags": {
    add_tags: [],
    remove_tags: [],
  },
  "plugin.leadpush": {
    integration: "",
    config: {},
  },
  "email.send": {
    email: null,
  },
  "email.send_to_user": {
    useremail: { email: null },
    user_id: [],
    to_owner: false,
    to: "",
    cc: "",
    bcc: "",
  },
};

const eventPropertyHelp = {
  "campaign.changecampaign":
    'Use Mautic campaign IDs in "addTo" and "removeFrom".',
  "lead.changelists":
    'Use Mautic segment IDs in "addToLists" and "removeFromLists".',
  "lead.changetags":
    'Use Mautic tag values in "add_tags" and "remove_tags".',
  "plugin.leadpush":
    'Integration configuration is provider-specific. Keep "integration" and "config" aligned with the connected Mautic integration.',
  "email.send":
    'Set "email" to the Mautic email ID that should be sent.',
  "email.send_to_user":
    'Configure the nested "useremail.email" ID and optional "user_id", "to_owner", "to", "cc", and "bcc" fields.',
};

const getErrorMessage = (err, fallback = "Something went wrong. Please try again.") => {
  const data = err?.response?.data;
  if (!data) return err?.message || fallback;
  if (typeof data === "string") return data;
  return data.detail || data.error || fallback;
};

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const normalizeColor = (value) => String(value || "").trim().replace(/^#/, "").toLowerCase();

const formatProperties = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length === 0) {
    return "No properties";
  }
  const text = JSON.stringify(value);
  return text.length > 100 ? `${text.slice(0, 97)}...` : text;
};

function PointTriggerDialog({ open, trigger, saving, error, onClose, onSave }) {
  const [form, setForm] = useState(blankTriggerForm);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm(
      trigger
        ? {
            name: trigger.name || "",
            description: trigger.description || "",
            points: String(trigger.points ?? 0),
            color: normalizeColor(trigger.color || "a0acb8"),
            triggerExistingLeads: Boolean(trigger.triggerExistingLeads),
            isPublished: Boolean(trigger.isPublished),
          }
        : blankTriggerForm
    );
    setFormError("");
  }, [open, trigger]);

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const submit = () => {
    const name = form.name.trim();
    const pointsText = String(form.points ?? "").trim();
    const color = normalizeColor(form.color);

    if (!name) return setFormError("Point Trigger name is required.");
    if (!/^-?\d+$/.test(pointsText)) return setFormError("Point threshold must be a whole number.");
    if (!/^[0-9a-f]{6}$/i.test(color)) {
      return setFormError("Color must be a 6-digit hexadecimal value, for example a0acb8.");
    }

    setFormError("");
    onSave({
      name,
      description: form.description.trim(),
      points: Number(pointsText),
      color,
      triggerExistingLeads: Boolean(form.triggerExistingLeads),
      isPublished: Boolean(form.isPublished),
    });
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{trigger ? "Edit Point Trigger" : "Create Point Trigger"}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {(error || formError) && <Alert severity="error">{error || formError}</Alert>}
          <TextField
            autoFocus
            label="Name"
            value={form.name}
            onChange={(event) => setField("name", event.target.value)}
            required
            fullWidth
            disabled={saving}
          />
          <TextField
            label="Description"
            value={form.description}
            onChange={(event) => setField("description", event.target.value)}
            multiline
            minRows={2}
            fullWidth
            disabled={saving}
          />
          <TextField
            label="Point Threshold"
            type="number"
            value={form.points}
            onChange={(event) => setField("points", event.target.value)}
            inputProps={{ step: 1 }}
            helperText="The Trigger runs when a contact reaches this Mautic Point threshold."
            required
            fullWidth
            disabled={saving}
          />
          <TextField
            label="Color"
            value={form.color}
            onChange={(event) => setField("color", event.target.value)}
            helperText="6-digit hex value without #, for example a0acb8."
            inputProps={{ maxLength: 7 }}
            fullWidth
            disabled={saving}
          />
          <FormControlLabel
            control={
              <Switch
                checked={form.triggerExistingLeads}
                onChange={(event) => setField("triggerExistingLeads", event.target.checked)}
                disabled={saving}
              />
            }
            label="Trigger existing contacts"
          />
          {form.triggerExistingLeads && (
            <Alert severity="warning" variant="outlined">
              When this Trigger is published, Mautic may evaluate contacts that already meet the threshold.
            </Alert>
          )}
          <FormControlLabel
            control={
              <Switch
                checked={form.isPublished}
                onChange={(event) => setField("isPublished", event.target.checked)}
                disabled={saving}
              />
            }
            label="Published"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={saving}>
          {saving ? (
            <CircularProgress size={20} color="inherit" />
          ) : trigger ? (
            "Save Changes"
          ) : (
            "Create Trigger"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function PointTriggerEventDialog({ open, event, types, saving, error, onClose, onSave }) {
  const [form, setForm] = useState(blankEventForm);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!open) return;
    const properties = event?.properties && typeof event.properties === "object" ? event.properties : {};
    setForm(
      event
        ? {
            name: event.name || "",
            description: event.description || "",
            type: event.type || "",
            order: String(event.order ?? 1),
            propertiesText: JSON.stringify(properties, null, 2),
          }
        : blankEventForm
    );
    setFormError("");
  }, [open, event]);

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const handleTypeChange = (type) => {
    const template = eventPropertyTemplates[type] || {};
    setForm((current) => ({
      ...current,
      type,
      propertiesText: JSON.stringify(template, null, 2),
    }));
  };

  const submit = () => {
    const name = form.name.trim();
    const orderText = String(form.order || "").trim();

    if (!name) return setFormError("Trigger Event name is required.");
    if (!form.type) return setFormError("Trigger Event type is required.");
    if (!/^\d+$/.test(orderText) || Number(orderText) < 1) {
      return setFormError("Event order must be a positive whole number.");
    }

    let properties;
    try {
      properties = JSON.parse(form.propertiesText || "{}");
    } catch {
      return setFormError("Event properties must contain valid JSON.");
    }
    if (!properties || typeof properties !== "object" || Array.isArray(properties)) {
      return setFormError("Event properties must be a JSON object.");
    }

    setFormError("");
    onSave({
      name,
      description: form.description.trim(),
      ...(event ? {} : { type: form.type }),
      order: Number(orderText),
      properties,
    });
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>{event ? "Edit Trigger Event" : "Create Trigger Event"}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {(error || formError) && <Alert severity="error">{error || formError}</Alert>}
          <TextField
            autoFocus
            label="Name"
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
            required
            fullWidth
            disabled={saving}
          />
          <TextField
            label="Description"
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
            multiline
            minRows={2}
            fullWidth
            disabled={saving}
          />
          <FormControl fullWidth required>
            <InputLabel id="trigger-event-type-label">Event Type</InputLabel>
            <Select
              labelId="trigger-event-type-label"
              label="Event Type"
              value={form.type}
              onChange={(eventChange) => handleTypeChange(eventChange.target.value)}
              disabled={saving || Boolean(event)}
            >
              {types.map((item) => (
                <MenuItem key={item.value} value={item.value}>
                  {item.label} ({item.value})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {event && (
            <Typography variant="caption" color="text.secondary">
              Event type is fixed after creation. Delete this Event and create a new one if the provider type must change.
            </Typography>
          )}
          <TextField
            label="Order"
            type="number"
            value={form.order}
            onChange={(e) => setField("order", e.target.value)}
            inputProps={{ min: 1, step: 1 }}
            helperText="Controls the Event order inside this Point Trigger."
            fullWidth
            disabled={saving}
          />
          <TextField
            label="Event Properties (JSON)"
            value={form.propertiesText}
            onChange={(e) => setField("propertiesText", e.target.value)}
            multiline
            minRows={8}
            fullWidth
            disabled={saving}
            helperText={
              eventPropertyHelp[form.type] ||
              "Properties are stored directly in Mautic. Use the structure required by the selected provider Event type."
            }
            inputProps={{ style: { fontFamily: "monospace" } }}
          />
          <Alert severity="info" variant="outlined">
            Event types come from the connected Mautic instance. ECP stores no duplicate Point Trigger/Event records.
          </Alert>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={saving}>
          {saving ? (
            <CircularProgress size={20} color="inherit" />
          ) : event ? (
            "Save Event"
          ) : (
            "Create Event"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function TriggerEventsDialog({ open, trigger, types, typesLoading, typesError, onClose, onChanged }) {
  const [eventsData, setEventsData] = useState({ count: 0, results: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [eventDialog, setEventDialog] = useState({
    open: false,
    event: null,
    saving: false,
    error: "",
  });
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    event: null,
    deleting: false,
    error: "",
  });

  const loadEvents = useCallback(async () => {
    if (!trigger?.id) return;
    setLoading(true);
    setError("");
    try {
      const response = await listNewsletterPointTriggerEvents(trigger.id);
      setEventsData({
        count: Number(response?.count || 0),
        results: Array.isArray(response?.results) ? response.results : [],
      });
    } catch (err) {
      setEventsData({ count: 0, results: [] });
      setError(getErrorMessage(err, "We could not load this Point Trigger's Events."));
    } finally {
      setLoading(false);
    }
  }, [trigger?.id]);

  useEffect(() => {
    if (!open || !trigger?.id) return;
    setSuccess("");
    setEventDialog({ open: false, event: null, saving: false, error: "" });
    setDeleteDialog({ open: false, event: null, deleting: false, error: "" });
    loadEvents();
  }, [open, trigger?.id, loadEvents]);

  const saveEvent = async (payload) => {
    const editing = eventDialog.event;
    setEventDialog((current) => ({ ...current, saving: true, error: "" }));
    try {
      if (editing) {
        await updateNewsletterPointTriggerEvent(trigger.id, editing.id, payload);
      } else {
        await createNewsletterPointTriggerEvent(trigger.id, payload);
      }
      setEventDialog({ open: false, event: null, saving: false, error: "" });
      setSuccess(editing ? "Trigger Event updated in Mautic." : "Trigger Event created in Mautic.");
      await loadEvents();
      await onChanged?.();
    } catch (err) {
      setEventDialog((current) => ({
        ...current,
        saving: false,
        error: getErrorMessage(
          err,
          editing ? "Failed to update this Trigger Event." : "Failed to create this Trigger Event."
        ),
      }));
    }
  };

  const deleteEvent = async () => {
    if (!deleteDialog.event) return;
    setDeleteDialog((current) => ({ ...current, deleting: true, error: "" }));
    try {
      await deleteNewsletterPointTriggerEvent(trigger.id, deleteDialog.event.id);
      setDeleteDialog({ open: false, event: null, deleting: false, error: "" });
      setSuccess("Trigger Event deleted from Mautic.");
      await loadEvents();
      await onChanged?.();
    } catch (err) {
      setDeleteDialog((current) => ({
        ...current,
        deleting: false,
        error: getErrorMessage(err, "Failed to delete this Trigger Event."),
      }));
    }
  };

  const events = Array.isArray(eventsData.results) ? eventsData.results : [];

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" alignItems={{ sm: "center" }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 850 }}>
                Trigger Events
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {trigger?.name || `Point Trigger #${trigger?.id || ""}`}
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddRoundedIcon />}
              onClick={() => setEventDialog({ open: true, event: null, saving: false, error: "" })}
              disabled={typesLoading || Boolean(typesError) || types.length === 0}
              sx={{ textTransform: "none" }}
            >
              Create Event
            </Button>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            {success && <Alert severity="success" onClose={() => setSuccess("")}>{success}</Alert>}
            {typesError && <Alert severity="warning">{typesError}</Alert>}
            {loading ? (
              <Stack spacing={1}>
                {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} height={48} />)}
              </Stack>
            ) : error ? (
              <Alert severity="error" action={<Button color="inherit" size="small" onClick={loadEvents}>Retry</Button>}>
                {error}
              </Alert>
            ) : events.length === 0 ? (
              <Alert severity="info" variant="outlined">
                This Point Trigger has no Events yet. Add an Event to define what Mautic should do when the threshold is reached.
              </Alert>
            ) : (
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: "#F6F8FA" }}>
                      <TableCell>Name</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Order</TableCell>
                      <TableCell>Properties</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {events.map((event) => (
                      <TableRow hover key={event.id}>
                        <TableCell>
                          <Typography sx={{ fontWeight: 750 }}>{event.name || `Event #${event.id}`}</Typography>
                          {event.description && <Typography variant="caption" color="text.secondary">{event.description}</Typography>}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{event.type_label || event.type || "—"}</Typography>
                          {event.type && <Typography variant="caption" color="text.secondary">{event.type}</Typography>}
                        </TableCell>
                        <TableCell>{event.order ?? "—"}</TableCell>
                        <TableCell sx={{ maxWidth: 320 }}>
                          <Tooltip title={<pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{JSON.stringify(event.properties || {}, null, 2)}</pre>}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
                              {formatProperties(event.properties)}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Edit Trigger Event">
                            <IconButton
                              size="small"
                              onClick={() => setEventDialog({ open: true, event, saving: false, error: "" })}
                            >
                              <EditRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Trigger Event">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => setDeleteDialog({ open: true, event, deleting: false, error: "" })}
                            >
                              <DeleteRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>

      <PointTriggerEventDialog
        open={eventDialog.open}
        event={eventDialog.event}
        types={types}
        saving={eventDialog.saving}
        error={eventDialog.error}
        onClose={() => setEventDialog({ open: false, event: null, saving: false, error: "" })}
        onSave={saveEvent}
      />

      <Dialog
        open={deleteDialog.open}
        onClose={deleteDialog.deleting ? undefined : () => setDeleteDialog({ open: false, event: null, deleting: false, error: "" })}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Trigger Event?</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            {deleteDialog.error && <Alert severity="error">{deleteDialog.error}</Alert>}
            <Typography>
              Delete <strong>{deleteDialog.event?.name || "this Trigger Event"}</strong> from Mautic?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              This is a persistent provider deletion. The Event will no longer run when this Point Trigger fires.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteDialog({ open: false, event: null, deleting: false, error: "" })}
            disabled={deleteDialog.deleting}
          >
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={deleteEvent} disabled={deleteDialog.deleting}>
            {deleteDialog.deleting ? <CircularProgress size={20} color="inherit" /> : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default function AdminNewsletterPointTriggersPanel() {
  const [data, setData] = useState(null);
  const [eventTypes, setEventTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typesLoading, setTypesLoading] = useState(true);
  const [error, setError] = useState("");
  const [typesError, setTypesError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState({ open: false, trigger: null, saving: false, error: "" });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, trigger: null, deleting: false, error: "" });
  const [eventsTrigger, setEventsTrigger] = useState(null);

  const loadEventTypes = useCallback(async () => {
    setTypesLoading(true);
    setTypesError("");
    try {
      const response = await listNewsletterPointTriggerEventTypes();
      setEventTypes(Array.isArray(response?.types) ? response.types : []);
    } catch (err) {
      setEventTypes([]);
      setTypesError(getErrorMessage(err, "We could not load Mautic Point Trigger Event types."));
    } finally {
      setTypesLoading(false);
    }
  }, []);

  const loadTriggers = useCallback(
    async ({ nextPage = page, nextSearch = search } = {}) => {
      setLoading(true);
      setError("");
      try {
        const response = await listNewsletterPointTriggers({
          page: nextPage,
          page_size: pageSize,
          ...(nextSearch ? { search: nextSearch } : {}),
        });
        setData(response);
        setPage(response?.page || nextPage);
      } catch (err) {
        setData(null);
        setError(getErrorMessage(err, "We could not load Mautic Point Triggers."));
      } finally {
        setLoading(false);
      }
    },
    [page, search]
  );

  useEffect(() => {
    loadTriggers({ nextPage: 1, nextSearch: "" });
    loadEventTypes();
  }, []);

  const rows = Array.isArray(data?.results) ? data.results : [];
  const count = Number(data?.count || 0);
  const numPages = Math.max(1, Number(data?.num_pages || 1));
  const typeLabelMap = useMemo(
    () => new Map(eventTypes.map((item) => [item.value, item.label])),
    [eventTypes]
  );

  const handleSearch = () => {
    const nextSearch = searchInput.trim();
    setSearch(nextSearch);
    setPage(1);
    loadTriggers({ nextPage: 1, nextSearch });
  };

  const saveTrigger = async (payload) => {
    const editing = dialog.trigger;
    setDialog((current) => ({ ...current, saving: true, error: "" }));
    try {
      if (editing) {
        await updateNewsletterPointTrigger(editing.id, payload);
      } else {
        await createNewsletterPointTrigger(payload);
      }
      setDialog({ open: false, trigger: null, saving: false, error: "" });
      setSuccess(editing ? "Point Trigger updated in Mautic." : "Point Trigger created in Mautic.");
      await loadTriggers({ nextPage: editing ? page : 1, nextSearch: search });
    } catch (err) {
      setDialog((current) => ({
        ...current,
        saving: false,
        error: getErrorMessage(err, editing ? "Failed to update this Point Trigger." : "Failed to create this Point Trigger."),
      }));
    }
  };

  const deleteTrigger = async () => {
    if (!deleteDialog.trigger) return;
    setDeleteDialog((current) => ({ ...current, deleting: true, error: "" }));
    try {
      await deleteNewsletterPointTrigger(deleteDialog.trigger.id);
      setDeleteDialog({ open: false, trigger: null, deleting: false, error: "" });
      if (eventsTrigger?.id === deleteDialog.trigger.id) setEventsTrigger(null);
      setSuccess("Point Trigger deleted from Mautic.");
      const nextPage = rows.length === 1 && page > 1 ? page - 1 : page;
      await loadTriggers({ nextPage, nextSearch: search });
    } catch (err) {
      setDeleteDialog((current) => ({
        ...current,
        deleting: false,
        error: getErrorMessage(err, "Failed to delete this Point Trigger."),
      }));
    }
  };

  return (
    <Stack spacing={3}>
      {success && <Alert severity="success" onClose={() => setSuccess("")}>{success}</Alert>}

      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", md: "center" }}
        spacing={2}
      >
        <Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <RuleRoundedIcon sx={{ color: "#0f766e" }} />
            <Typography variant="h5" sx={{ fontWeight: 850, color: "#1B2A4A" }}>
              Point Triggers
            </Typography>
          </Stack>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Run Mautic Trigger Events when contacts reach configured Point thresholds.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            startIcon={<RefreshRoundedIcon />}
            onClick={() => {
              loadTriggers({ nextPage: page, nextSearch: search });
              loadEventTypes();
            }}
            disabled={loading || typesLoading}
            sx={{ textTransform: "none" }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={() => setDialog({ open: true, trigger: null, saving: false, error: "" })}
            sx={{ textTransform: "none" }}
          >
            Create Point Trigger
          </Button>
        </Stack>
      </Stack>

      <Alert severity="info" variant="outlined">
        Mautic is the source of truth for Point Triggers and Trigger Events. Events are created, updated, and persistently deleted through the verified native Mautic APIs.
      </Alert>

      {typesError && (
        <Alert severity="warning" action={<Button color="inherit" size="small" onClick={loadEventTypes}>Retry</Button>}>
          {typesError}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: "#E7ECEF", overflow: "hidden" }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1.5}
          justifyContent="space-between"
          sx={{ p: 2, borderBottom: "1px solid #E7ECEF" }}
        >
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField
              size="small"
              label="Search Point Triggers"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleSearch();
              }}
              sx={{ minWidth: { sm: 320 } }}
            />
            <Button variant="outlined" onClick={handleSearch} disabled={loading}>Search</Button>
            {(search || searchInput) && (
              <Button
                onClick={() => {
                  setSearchInput("");
                  setSearch("");
                  setPage(1);
                  loadTriggers({ nextPage: 1, nextSearch: "" });
                }}
                disabled={loading}
              >
                Clear
              </Button>
            )}
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ alignSelf: { md: "center" } }}>
            {count} Point Trigger{count === 1 ? "" : "s"}
          </Typography>
        </Stack>

        {loading ? (
          <Stack spacing={1} sx={{ p: 3 }}>
            {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} height={48} />)}
          </Stack>
        ) : error ? (
          <Box sx={{ p: 3 }}>
            <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => loadTriggers()}>Retry</Button>}>
              {error}
            </Alert>
          </Box>
        ) : rows.length === 0 ? (
          <Box sx={{ p: 3 }}>
            <Alert severity="info" variant="outlined">
              No Mautic Point Triggers found. Create one to automate actions when contacts reach a Point threshold.
            </Alert>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: "#F6F8FA" }}>
                  <TableCell>Name</TableCell>
                  <TableCell>Threshold</TableCell>
                  <TableCell>Events</TableCell>
                  <TableCell>Existing Contacts</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Modified</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => {
                  const events = Array.isArray(row.events) ? row.events : [];
                  return (
                    <TableRow hover key={row.id}>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="flex-start">
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: "50%",
                              bgcolor: `#${normalizeColor(row.color || "a0acb8")}`,
                              border: "1px solid rgba(0,0,0,0.12)",
                              mt: 0.75,
                              flexShrink: 0,
                            }}
                          />
                          <Box>
                            <Typography sx={{ fontWeight: 800, color: "#1B2A4A" }}>
                              {row.name || `Point Trigger #${row.id}`}
                            </Typography>
                            {row.description && <Typography variant="body2" color="text.secondary">{row.description}</Typography>}
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={`${Number(row.points || 0)} pts`} variant="outlined" sx={{ fontWeight: 800 }} />
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.5}>
                          <Typography variant="body2">{events.length} Event{events.length === 1 ? "" : "s"}</Typography>
                          {events.slice(0, 2).map((event) => (
                            <Typography key={event.id} variant="caption" color="text.secondary">
                              {event.type_label || typeLabelMap.get(event.type) || event.type || `Event #${event.id}`}
                            </Typography>
                          ))}
                        </Stack>
                      </TableCell>
                      <TableCell>{row.triggerExistingLeads ? "Yes" : "No"}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={row.isPublished ? "Published" : "Unpublished"}
                          color={row.isPublished ? "success" : "default"}
                          variant={row.isPublished ? "filled" : "outlined"}
                        />
                      </TableCell>
                      <TableCell>{formatDateTime(row.dateModified || row.dateAdded)}</TableCell>
                      <TableCell align="right">
                        <Tooltip title="Manage Trigger Events">
                          <IconButton size="small" onClick={() => setEventsTrigger(row)}>
                            <SettingsSuggestRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit Point Trigger">
                          <IconButton
                            size="small"
                            onClick={() => setDialog({ open: true, trigger: row, saving: false, error: "" })}
                          >
                            <EditRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Point Trigger">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setDeleteDialog({ open: true, trigger: row, deleting: false, error: "" })}
                          >
                            <DeleteRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ px: 2, py: 1.5, borderTop: "1px solid #E7ECEF" }}
        >
          <Typography variant="body2" color="text.secondary">Page {page} of {numPages}</Typography>
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant="outlined"
              disabled={loading || page <= 1}
              onClick={() => {
                const nextPage = page - 1;
                setPage(nextPage);
                loadTriggers({ nextPage, nextSearch: search });
              }}
            >
              Previous
            </Button>
            <Button
              size="small"
              variant="outlined"
              disabled={loading || page >= numPages}
              onClick={() => {
                const nextPage = page + 1;
                setPage(nextPage);
                loadTriggers({ nextPage, nextSearch: search });
              }}
            >
              Next
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <PointTriggerDialog
        open={dialog.open}
        trigger={dialog.trigger}
        saving={dialog.saving}
        error={dialog.error}
        onClose={() => setDialog({ open: false, trigger: null, saving: false, error: "" })}
        onSave={saveTrigger}
      />

      <TriggerEventsDialog
        open={Boolean(eventsTrigger)}
        trigger={eventsTrigger}
        types={eventTypes}
        typesLoading={typesLoading}
        typesError={typesError}
        onClose={() => setEventsTrigger(null)}
        onChanged={() => loadTriggers({ nextPage: page, nextSearch: search })}
      />

      <Dialog
        open={deleteDialog.open}
        onClose={deleteDialog.deleting ? undefined : () => setDeleteDialog({ open: false, trigger: null, deleting: false, error: "" })}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Point Trigger?</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            {deleteDialog.error && <Alert severity="error">{deleteDialog.error}</Alert>}
            <Typography>
              Delete <strong>{deleteDialog.trigger?.name || "this Point Trigger"}</strong> from Mautic?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Its Trigger Events are provider-owned and will be removed with the Trigger. Existing contact Point history is not changed.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteDialog({ open: false, trigger: null, deleting: false, error: "" })}
            disabled={deleteDialog.deleting}
          >
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={deleteTrigger} disabled={deleteDialog.deleting}>
            {deleteDialog.deleting ? <CircularProgress size={20} color="inherit" /> : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
