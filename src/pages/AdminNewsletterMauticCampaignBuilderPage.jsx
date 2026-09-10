import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Paper,
  Select,
  Skeleton,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import AccountTreeRoundedIcon from "@mui/icons-material/AccountTreeRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { useNavigate } from "react-router-dom";

import {
  createNativeMauticCampaign,
  getMauticCampaignCapabilities,
} from "../services/newsletterService";

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

const asArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return Object.values(value);
  return [];
};

const getEventKey = (event) => event?.key || event?.type || event?.eventType || "unknown";

const getEventLabel = (event) => event?.label || getEventKey(event);

const eventTypeLabel = (eventType) => {
  const normalized = String(eventType || "").toLowerCase();
  if (normalized === "action") return "Action";
  if (normalized === "condition") return "Condition";
  if (normalized === "decision") return "Decision";
  return "Event";
};

const eventTypeColor = (eventType) => {
  const normalized = String(eventType || "").toLowerCase();
  if (normalized === "action") return "primary";
  if (normalized === "condition") return "info";
  if (normalized === "decision") return "warning";
  return "default";
};

const sourceLabel = (source, fallback) =>
  source?.name || source?.alias || (source?.id ? `${fallback} #${source.id}` : fallback);

const workflowEventId = () =>
  `event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const isPlainObject = (value) =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const propertyPath = (parts) => parts.join(".");

const getNestedValue = (value, path) =>
  path.split(".").reduce((current, part) => {
    if (!isPlainObject(current)) return undefined;
    return current[part];
  }, value);

const setNestedValue = (value, path, nextValue) => {
  const parts = path.split(".");
  const root = isPlainObject(value) ? { ...value } : {};
  let current = root;

  parts.forEach((part, index) => {
    if (index === parts.length - 1) {
      current[part] = nextValue;
      return;
    }

    current[part] = isPlainObject(current[part]) ? { ...current[part] } : {};
    current = current[part];
  });

  return root;
};

const optionLabel = (option) => {
  if (isPlainObject(option)) {
    return option.label || option.name || option.title || option.value || option.id || "Option";
  }
  return String(option);
};

const optionValue = (option) => {
  if (isPlainObject(option)) {
    return option.value ?? option.id ?? option.key ?? option.label ?? option.name ?? "";
  }
  return option;
};

const optionChoices = (value) => {
  if (Array.isArray(value)) return value;
  if (isPlainObject(value?.choices)) return Object.entries(value.choices).map(([key, label]) => ({ value: key, label }));
  if (Array.isArray(value?.choices)) return value.choices;
  if (Array.isArray(value?.options)) return value.options;
  return [];
};

const buildPropertyFields = (value, prefix = []) => {
  if (!isPlainObject(value)) return [];

  return Object.entries(value).flatMap(([key, child]) => {
    const pathParts = [...prefix, key];
    if (Array.isArray(child) || Array.isArray(child?.choices) || Array.isArray(child?.options) || isPlainObject(child?.choices)) {
      return [{ path: propertyPath(pathParts), label: key, kind: "select", choices: optionChoices(child) }];
    }
    if (typeof child === "boolean") {
      return [{ path: propertyPath(pathParts), label: key, kind: "boolean" }];
    }
    if (typeof child === "string" || typeof child === "number") {
      return [{ path: propertyPath(pathParts), label: key, kind: "text" }];
    }
    if (isPlainObject(child)) {
      return buildPropertyFields(child, pathParts);
    }
    return [];
  });
};

const configuredPropertiesCount = (properties) => {
  if (!isPlainObject(properties)) return 0;
  return Object.values(properties).reduce((count, value) => {
    if (isPlainObject(value)) return count + configuredPropertiesCount(value);
    if (Array.isArray(value)) return count + (value.length ? 1 : 0);
    if (value === "" || value === undefined || value === null) return count;
    return count + 1;
  }, 0);
};

function CapabilityGroup({ title, description, events, loading }) {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: "#E7ECEF", p: 2.5 }}>
      <Stack spacing={1.5}>
        <Box>
          <Typography variant="h6" sx={{ color: "#1B2A4A", fontWeight: 850 }}>
            {title}
          </Typography>
          <Typography color="text.secondary">{description}</Typography>
        </Box>

        {loading ? (
          <Stack spacing={1}>
            <Skeleton height={32} />
            <Skeleton height={32} />
            <Skeleton height={32} />
          </Stack>
        ) : events.length ? (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {events.map((event, index) => (
              <Chip
                key={`${title}-${getEventKey(event)}-${index}`}
                label={getEventLabel(event)}
                variant="outlined"
                sx={{ maxWidth: "100%" }}
              />
            ))}
          </Stack>
        ) : (
          <Alert severity="warning" variant="outlined">
            No {title.toLowerCase()} were returned by the capability API.
          </Alert>
        )}
      </Stack>
    </Paper>
  );
}

function EventConfigurationPanel({ event, onChangeProperty }) {
  const fields = useMemo(
    () => buildPropertyFields(event?.metadata?.formTypeOptions),
    [event]
  );

  if (!event) {
    return (
      <Alert severity="info" variant="outlined">
        Select or add a workflow event to configure its provider metadata.
      </Alert>
    );
  }

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: "#E7ECEF", p: 2 }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="subtitle1" sx={{ color: "#1B2A4A", fontWeight: 850 }}>
            Selected Event Configuration
          </Typography>
          <Typography color="text.secondary">
            {getEventLabel(event.metadata)}
          </Typography>
        </Box>

        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Type
            </Typography>
            <Typography sx={{ fontWeight: 750 }}>
              {eventTypeLabel(event.eventType)}
            </Typography>
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Key
            </Typography>
            <Typography component="code" variant="body2">
              {event.key}
            </Typography>
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Form
            </Typography>
            <Typography component="code" variant="body2">
              {event.metadata?.formType || "No formType provided"}
            </Typography>
          </Box>
        </Stack>

        {fields.length ? (
          <Stack spacing={2}>
            {fields.map((field) => {
              const value = getNestedValue(event.properties, field.path);
              if (field.kind === "boolean") {
                return (
                  <FormControlLabel
                    key={field.path}
                    control={
                      <Switch
                        checked={Boolean(value)}
                        onChange={(changeEvent) =>
                          onChangeProperty(event.id, field.path, changeEvent.target.checked)
                        }
                      />
                    }
                    label={field.label}
                  />
                );
              }

              if (field.kind === "select") {
                return (
                  <FormControl key={field.path} fullWidth>
                    <InputLabel id={`${event.id}-${field.path}-label`}>
                      {field.label}
                    </InputLabel>
                    <Select
                      labelId={`${event.id}-${field.path}-label`}
                      value={value ?? ""}
                      label={field.label}
                      onChange={(changeEvent) =>
                        onChangeProperty(event.id, field.path, changeEvent.target.value)
                      }
                    >
                      {field.choices.map((choice, index) => (
                        <MenuItem
                          key={`${field.path}-${optionValue(choice)}-${index}`}
                          value={optionValue(choice)}
                        >
                          {optionLabel(choice)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                );
              }

              return (
                <TextField
                  key={field.path}
                  label={field.label}
                  value={value ?? ""}
                  onChange={(changeEvent) =>
                    onChangeProperty(event.id, field.path, changeEvent.target.value)
                  }
                  fullWidth
                />
              );
            })}
          </Stack>
        ) : (
          <Alert severity="info" variant="outlined">
            Additional configuration is provided by Mautic form metadata.
          </Alert>
        )}
      </Stack>
    </Paper>
  );
}

export default function AdminNewsletterMauticCampaignBuilderPage() {
  const navigate = useNavigate();
  const [capabilities, setCapabilities] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [snack, setSnack] = useState({
    open: false,
    severity: "success",
    message: "",
  });
  const [form, setForm] = useState({
    name: "",
    description: "",
    isPublished: false,
    lists: [],
    forms: [],
    events: [],
  });
  const [eventPicker, setEventPicker] = useState({
    eventType: "action",
    eventKey: "",
  });
  const [selectedWorkflowEventId, setSelectedWorkflowEventId] = useState("");

  const actions = useMemo(() => asArray(capabilities?.actions), [capabilities]);
  const conditions = useMemo(() => asArray(capabilities?.conditions), [capabilities]);
  const decisions = useMemo(() => asArray(capabilities?.decisions), [capabilities]);
  const eventGroups = useMemo(
    () => [
      { value: "action", label: "Actions", events: actions },
      { value: "condition", label: "Conditions", events: conditions },
      { value: "decision", label: "Decisions", events: decisions },
    ],
    [actions, conditions, decisions]
  );
  const selectedEventOptions = useMemo(
    () =>
      eventGroups.find((group) => group.value === eventPicker.eventType)?.events || [],
    [eventGroups, eventPicker.eventType]
  );
  const segments = useMemo(
    () => asArray(capabilities?.sources?.segments),
    [capabilities]
  );
  const forms = useMemo(() => asArray(capabilities?.sources?.forms), [capabilities]);
  const selectedWorkflowEvent = useMemo(
    () => form.events.find((event) => event.id === selectedWorkflowEventId) || null,
    [form.events, selectedWorkflowEventId]
  );

  const loadCapabilities = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getMauticCampaignCapabilities();
      setCapabilities(data || {});
    } catch (err) {
      setCapabilities(null);
      setError(
        getErrorMessage(err, "We could not load native Mautic Campaign capabilities.")
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCapabilities();
  }, [loadCapabilities]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFormError("");
  };

  const createCampaign = async (event) => {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) {
      setFormError("Campaign name is required.");
      return;
    }

    setSaving(true);
    setFormError("");
    try {
      await createNativeMauticCampaign({
        name,
        description: form.description,
        isPublished: Boolean(form.isPublished),
        lists: form.lists,
        forms: form.forms,
        events: [],
        canvasSettings: { nodes: [], connections: [] },
      });
      setSnack({
        open: true,
        severity: "success",
        message: "Native Mautic Campaign created.",
      });
      setForm({
        name: "",
        description: "",
        isPublished: false,
        lists: [],
        forms: [],
        events: [],
      });
      setSelectedWorkflowEventId("");
    } catch (err) {
      setFormError(
        getErrorMessage(
          err,
          "We could not create this native Mautic Campaign yet."
        )
      );
    } finally {
      setSaving(false);
    }
  };

  const addWorkflowEvent = () => {
    const selected = selectedEventOptions.find(
      (event) => getEventKey(event) === eventPicker.eventKey
    );
    if (!selected) return;
    const id = workflowEventId();

    setForm((current) => ({
      ...current,
      events: [
        ...current.events,
        {
          id,
          key: getEventKey(selected),
          eventType: selected.eventType || eventPicker.eventType,
          metadata: selected,
          properties: {},
        },
      ],
    }));
    setSelectedWorkflowEventId(id);
    setEventPicker((current) => ({ ...current, eventKey: "" }));
  };

  const removeWorkflowEvent = (eventId) => {
    setForm((current) => ({
      ...current,
      events: current.events.filter((event) => event.id !== eventId),
    }));
    if (selectedWorkflowEventId === eventId) {
      setSelectedWorkflowEventId("");
    }
  };

  const updateWorkflowEventProperty = (eventId, path, value) => {
    setForm((current) => ({
      ...current,
      events: current.events.map((event) =>
        event.id === eventId
          ? {
              ...event,
              properties: setNestedValue(event.properties, path, value),
            }
          : event
      ),
    }));
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Button
          startIcon={<ArrowBackRoundedIcon />}
          onClick={() => navigate("/admin/newsletter", { state: { newsletterTab: "campaigns" } })}
          sx={{ textTransform: "none", mb: 1 }}
        >
          Back to Campaigns
        </Button>
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          spacing={2}
        >
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 850, color: "#1B2A4A", mb: 0.75 }}>
              Native Mautic Campaign Builder
            </Typography>
            <Typography color="text.secondary">
              Create provider-owned Campaign drafts and inspect runtime Mautic Builder capabilities.
            </Typography>
          </Box>
          <Button
            startIcon={<RefreshRoundedIcon />}
            onClick={loadCapabilities}
            disabled={loading}
            sx={{ textTransform: "none", alignSelf: "flex-start" }}
          >
            Refresh
          </Button>
        </Stack>
      </Box>

      {error && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={loadCapabilities}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {capabilities?.builder_metadata?.available === false && (
        <Alert severity="warning" variant="outlined">
          {capabilities.builder_metadata.reason ||
            "The backend did not return runtime Campaign Builder metadata yet."}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: "#E7ECEF", p: 2.5 }}>
        <Stack spacing={2.5} component="form" onSubmit={createCampaign}>
          <Stack direction="row" spacing={1.25} alignItems="center">
            <AccountTreeRoundedIcon color="primary" />
            <Box>
              <Typography variant="h6" sx={{ color: "#1B2A4A", fontWeight: 850 }}>
                Basic Campaign Create
              </Typography>
              <Typography color="text.secondary">
                Foundation only. Workflow design and drag/drop will be added later.
              </Typography>
            </Box>
          </Stack>

          {formError && <Alert severity="error">{formError}</Alert>}

          <TextField
            label="Campaign Name"
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            inputProps={{ maxLength: 190 }}
            required
            fullWidth
            disabled={saving}
          />

          <TextField
            label="Description"
            value={form.description}
            onChange={(event) => updateField("description", event.target.value)}
            multiline
            minRows={3}
            fullWidth
            disabled={saving}
          />

          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <FormControl fullWidth disabled={saving || loading || !segments.length}>
              <InputLabel id="campaign-segments-label">Segments</InputLabel>
              <Select
                labelId="campaign-segments-label"
                multiple
                value={form.lists}
                onChange={(event) => updateField("lists", event.target.value)}
                input={<OutlinedInput label="Segments" />}
                renderValue={(selected) =>
                  selected
                    .map((id) => sourceLabel(segments.find((source) => String(source.id) === String(id)), "Segment"))
                    .join(", ")
                }
              >
                {segments.map((source) => (
                  <MenuItem key={`segment-${source.id}`} value={source.id}>
                    <Checkbox checked={form.lists.includes(source.id)} />
                    <ListItemText primary={sourceLabel(source, "Segment")} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth disabled={saving || loading || !forms.length}>
              <InputLabel id="campaign-forms-label">Forms</InputLabel>
              <Select
                labelId="campaign-forms-label"
                multiple
                value={form.forms}
                onChange={(event) => updateField("forms", event.target.value)}
                input={<OutlinedInput label="Forms" />}
                renderValue={(selected) =>
                  selected
                    .map((id) => sourceLabel(forms.find((source) => String(source.id) === String(id)), "Form"))
                    .join(", ")
                }
              >
                {forms.map((source) => (
                  <MenuItem key={`form-${source.id}`} value={source.id}>
                    <Checkbox checked={form.forms.includes(source.id)} />
                    <ListItemText primary={sourceLabel(source, "Form")} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          <FormControlLabel
            control={
              <Switch
                checked={form.isPublished}
                onChange={(event) => updateField("isPublished", event.target.checked)}
                disabled={saving}
              />
            }
            label={form.isPublished ? "Published" : "Draft / Unpublished"}
          />

          <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: "#E7ECEF", p: 2 }}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle1" sx={{ color: "#1B2A4A", fontWeight: 850 }}>
                  Workflow Events
                </Typography>
                <Typography color="text.secondary">
                  Select runtime Mautic events for the local builder state.
                </Typography>
              </Box>

              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <FormControl fullWidth disabled={saving || loading}>
                  <InputLabel id="event-category-label">Category</InputLabel>
                  <Select
                    labelId="event-category-label"
                    value={eventPicker.eventType}
                    label="Category"
                    onChange={(event) =>
                      setEventPicker({
                        eventType: event.target.value,
                        eventKey: "",
                      })
                    }
                  >
                    {eventGroups.map((group) => (
                      <MenuItem key={group.value} value={group.value}>
                        {group.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth disabled={saving || loading || !selectedEventOptions.length}>
                  <InputLabel id="event-option-label">Event</InputLabel>
                  <Select
                    labelId="event-option-label"
                    value={eventPicker.eventKey}
                    label="Event"
                    onChange={(event) =>
                      setEventPicker((current) => ({
                        ...current,
                        eventKey: event.target.value,
                      }))
                    }
                  >
                    {selectedEventOptions.map((event) => {
                      const key = getEventKey(event);
                      return (
                        <MenuItem key={`${eventPicker.eventType}-${key}`} value={key}>
                          <Stack spacing={0.25}>
                            <Typography sx={{ fontWeight: 750 }}>
                              {getEventLabel(event)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {eventTypeLabel(event.eventType || eventPicker.eventType)} · {key}
                            </Typography>
                          </Stack>
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>

                <Button
                  type="button"
                  variant="outlined"
                  onClick={addWorkflowEvent}
                  disabled={saving || loading || !eventPicker.eventKey}
                  sx={{ minWidth: { md: 132 } }}
                >
                  Add Event
                </Button>
              </Stack>
            </Stack>
          </Paper>

          <EventConfigurationPanel
            event={selectedWorkflowEvent}
            onChangeProperty={updateWorkflowEventProperty}
          />

          <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: "#E7ECEF", p: 2 }}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle1" sx={{ color: "#1B2A4A", fontWeight: 850 }}>
                  Workflow Preview
                </Typography>
                <Typography color="text.secondary">
                  Local preview only. Canvas layout comes in a later phase.
                </Typography>
              </Box>

              <Stack spacing={1.25} sx={{ maxWidth: 640 }}>
                <Paper
                  variant="outlined"
                  sx={{ p: 1.5, borderRadius: 2, bgcolor: "#F6F8FA" }}
                >
                  <Typography sx={{ fontWeight: 850 }}>
                    {form.name.trim() || "Campaign"}
                  </Typography>
                  {form.description && (
                    <Typography variant="body2" color="text.secondary">
                      {form.description}
                    </Typography>
                  )}
                </Paper>

                {form.events.length ? (
                  form.events.map((event, index) => {
                    const configuredCount = configuredPropertiesCount(event.properties);
                    return (
                    <React.Fragment key={event.id}>
                      <Box
                        sx={{
                          width: 2,
                          height: 20,
                          bgcolor: "#CBD5E1",
                          ml: 3,
                        }}
                      />
                      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                        <Stack
                          direction="row"
                          spacing={1.5}
                          alignItems="center"
                          justifyContent="space-between"
                        >
                          <Stack spacing={0.5}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Chip
                                size="small"
                                label={eventTypeLabel(event.eventType)}
                                color={eventTypeColor(event.eventType)}
                                variant="outlined"
                              />
                              <Typography sx={{ fontWeight: 800 }}>
                                {index + 1}. {getEventLabel(event.metadata)}
                              </Typography>
                            </Stack>
                            <Typography component="code" variant="body2" color="text.secondary">
                              {event.key}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {configuredCount
                                ? `Configured fields: ${configuredCount}`
                                : "Configuration incomplete"}
                            </Typography>
                          </Stack>
                          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                            <Button
                              type="button"
                              variant={selectedWorkflowEventId === event.id ? "contained" : "outlined"}
                              onClick={() => setSelectedWorkflowEventId(event.id)}
                              disabled={saving}
                            >
                              Configure
                            </Button>
                            <Button
                              type="button"
                              color="error"
                              startIcon={<DeleteRoundedIcon />}
                              onClick={() => removeWorkflowEvent(event.id)}
                              disabled={saving}
                            >
                              Remove
                            </Button>
                          </Stack>
                        </Stack>
                      </Paper>
                    </React.Fragment>
                    );
                  })
                ) : (
                  <Alert severity="info" variant="outlined">
                    No workflow events added.
                  </Alert>
                )}
              </Stack>
            </Stack>
          </Paper>

          <Divider />

          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="flex-end" spacing={1.5}>
            <Button
              type="button"
              onClick={() => {
                setForm({
                  name: "",
                  description: "",
                  isPublished: false,
                  lists: [],
                  forms: [],
                  events: [],
                });
                setSelectedWorkflowEventId("");
              }}
              disabled={saving}
            >
              Reset
            </Button>
            <Button
              type="submit"
              variant="contained"
              startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveRoundedIcon />}
              disabled={saving}
            >
              Create Campaign
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Stack direction={{ xs: "column", lg: "row" }} spacing={2}>
        <Box sx={{ flex: 1 }}>
          <CapabilityGroup
            title="Actions"
            description="Provider actions returned by Mautic."
            events={actions}
            loading={loading}
          />
        </Box>
        <Box sx={{ flex: 1 }}>
          <CapabilityGroup
            title="Conditions"
            description="Provider conditions returned by Mautic."
            events={conditions}
            loading={loading}
          />
        </Box>
        <Box sx={{ flex: 1 }}>
          <CapabilityGroup
            title="Decisions"
            description="Provider decisions returned by Mautic."
            events={decisions}
            loading={loading}
          />
        </Box>
      </Stack>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((current) => ({ ...current, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
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
