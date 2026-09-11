import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AccountTreeRoundedIcon from "@mui/icons-material/AccountTreeRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import PublishRoundedIcon from "@mui/icons-material/PublishRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import UnpublishedRoundedIcon from "@mui/icons-material/UnpublishedRounded";
import { useNavigate, useParams } from "react-router-dom";

import WorkflowCanvas from "./WorkflowCanvas";
import {
  createNativeMauticCampaign,
  deleteNewsletterMauticCampaign,
  duplicateNativeMauticCampaign,
  getMauticCampaignCapabilities,
  getNativeMauticCampaignBuilder,
  updateNativeMauticCampaign,
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

const getRequiredFields = (formTypeOptions) => {
  const fields = buildPropertyFields(formTypeOptions);
  return fields.filter(field => {
    const fieldMeta = getNestedValue(formTypeOptions, field.path);
    return fieldMeta?.required === true || fieldMeta?.required === "true";
  });
};

const isEventConfigurationComplete = (event) => {
  if (!isPlainObject(event.metadata?.formTypeOptions)) return true;
  const requiredFields = getRequiredFields(event.metadata.formTypeOptions);
  if (!requiredFields.length) return true;

  return requiredFields.every(field => {
    const value = getNestedValue(event.properties, field.path);
    return value !== undefined && value !== null && value !== "";
  });
};

const getConfigurationStatus = (event) => {
  if (!isPlainObject(event.metadata?.formTypeOptions)) {
    return { complete: true, message: "No configuration fields" };
  }

  const requiredFields = getRequiredFields(event.metadata.formTypeOptions);
  if (!requiredFields.length) {
    const configuredCount = configuredPropertiesCount(event.properties);
    return {
      complete: configuredCount > 0,
      message: configuredCount > 0 ? "Configured" : "No configuration needed",
    };
  }

  const missingFields = requiredFields.filter(field => {
    const value = getNestedValue(event.properties, field.path);
    return value === undefined || value === null || value === "";
  });

  if (missingFields.length) {
    return {
      complete: false,
      message: `${missingFields.length} required field${missingFields.length > 1 ? "s" : ""} missing`,
    };
  }

  return { complete: true, message: "Configured" };
};

const hasValidPosition = (node) =>
  Boolean(node?.position) &&
  Number.isFinite(node.position.x) &&
  Number.isFinite(node.position.y);

// Trigger nodes first, then whatever each one flows into, then any orphans.
const orderCanvasNodes = (nodes, edges) => {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const outgoing = new Map();
  for (const edge of edges || []) {
    if (!outgoing.has(edge.source)) outgoing.set(edge.source, []);
    outgoing.get(edge.source).push(edge.target);
  }

  const ordered = [];
  const seen = new Set();
  const visit = (nodeId) => {
    if (seen.has(nodeId) || !byId.has(nodeId)) return;
    seen.add(nodeId);
    ordered.push(byId.get(nodeId));
    (outgoing.get(nodeId) || []).forEach(visit);
  };

  nodes.filter((node) => node.nodeType === "trigger").forEach((node) => visit(node.id));
  nodes.forEach((node) => visit(node.id));
  return ordered;
};

const applyWorkflowLayout = (nodes, edges) =>
  orderCanvasNodes(nodes, edges).map((node, index) => ({
    ...node,
    position: hasValidPosition(node)
      ? node.position
      : { x: 60 + index * 260, y: 120 },
  }));

const canvasNodeTypeLabel = (nodeType) =>
  ({ trigger: "Trigger", action: "Action", condition: "Condition", delay: "Delay" }[
    nodeType
  ] || "Node");

const canvasEdgeId = (source, target) => `edge-${source}-${target}`;

const canvasNodeDescription = (node) => {
  const typeLabel = canvasNodeTypeLabel(node?.nodeType);
  return node?.eventId && node?.label ? `${typeLabel} "${node.label}"` : `${typeLabel} node`;
};

// Chain nodes in workflow order so a saved canvas without edges still runs.
const buildSequentialEdges = (orderedNodes) =>
  orderedNodes.slice(1).map((node, index) => {
    const source = orderedNodes[index].id;
    return { id: canvasEdgeId(source, node.id), source, target: node.id };
  });

// Mautic models a campaign as events linked by `parent`. Trigger and delay
// nodes are canvas-only concepts: the trigger is the workflow start and a delay
// becomes the trigger timing of the event that follows it.
const EVENT_NODE_TYPES = new Set(["action", "condition", "decision"]);

const DELAY_UNIT_OPTIONS = [
  { value: "i", label: "Minutes" },
  { value: "h", label: "Hours" },
  { value: "d", label: "Days" },
  { value: "m", label: "Months" },
];

const readDelay = (node) => {
  const interval = Number(node?.delay?.interval);
  if (!Number.isFinite(interval) || interval <= 0) return null;
  const unit = node?.delay?.unit;
  return {
    interval,
    unit: DELAY_UNIT_OPTIONS.some((option) => option.value === unit) ? unit : "d",
  };
};

const buildCanvasGraph = (canvasNodes, canvasEdges) => {
  const byId = new Map((canvasNodes || []).map((node) => [node.id, node]));
  const outgoing = new Map();
  const incoming = new Map();

  for (const edge of canvasEdges || []) {
    if (!byId.has(edge?.source) || !byId.has(edge?.target)) continue;
    if (!outgoing.has(edge.source)) outgoing.set(edge.source, []);
    outgoing.get(edge.source).push(edge.target);
    if (!incoming.has(edge.target)) incoming.set(edge.target, []);
    incoming.get(edge.target).push(edge.source);
  }

  return { byId, outgoing, incoming };
};

const mapCanvasToExecution = (canvasNodes, canvasEdges, form) => {
  const nodes = canvasNodes || [];
  if (!nodes.length) {
    return { events: form.events || [], errors: [], nodeMap: new Map(), reachable: new Set() };
  }

  const errors = [];
  const { byId, outgoing } = buildCanvasGraph(nodes, canvasEdges);
  const triggerNodes = nodes.filter((node) => node.nodeType === "trigger");
  if (!triggerNodes.length) {
    errors.push("Workflow must start with a Trigger node.");
  }

  const executionEvents = [];
  const nodeMap = new Map();
  const reachable = new Set();
  let sequence = 0;

  // Walk forward from the trigger so each event learns its parent event, and a
  // delay in between is folded into the next event instead of becoming one.
  const queue = triggerNodes.map((node) => ({
    nodeId: node.id,
    parentEventId: null,
    delay: null,
  }));

  while (queue.length) {
    const { nodeId, parentEventId, delay } = queue.shift();
    if (reachable.has(nodeId)) continue;
    reachable.add(nodeId);

    const node = byId.get(nodeId);
    if (!node) continue;

    let nextParentEventId = parentEventId;
    let nextDelay = delay;

    if (node.nodeType === "delay") {
      nextDelay = readDelay(node);
      if (!nextDelay) {
        errors.push(
          `${canvasNodeDescription(node)} needs a delay interval before it can be saved.`
        );
      }
      if (!(outgoing.get(nodeId) || []).length) {
        errors.push(
          `${canvasNodeDescription(node)} has nothing after it — a delay must lead to an action.`
        );
      }
    } else if (EVENT_NODE_TYPES.has(node.nodeType)) {
      const event = form.events?.find((candidate) => candidate.id === node.eventId);
      if (!event) {
        errors.push(
          `${canvasNodeDescription(node)} has no linked event. Link one or remove the node.`
        );
      } else {
        sequence += 1;
        const executionId = `new_${sequence}`;
        const executionEvent = {
          id: executionId,
          name: getEventLabel(event.metadata),
          key: event.key,
          eventType: event.eventType,
          properties: isPlainObject(event.properties) ? event.properties : {},
          order: sequence,
          parent: parentEventId,
        };

        if (delay) {
          executionEvent.triggerMode = "interval";
          executionEvent.triggerInterval = delay.interval;
          executionEvent.triggerIntervalUnit = delay.unit;
        } else {
          executionEvent.triggerMode = "immediate";
        }

        executionEvents.push(executionEvent);
        nodeMap.set(node.id, { executionId, event, nodeType: node.nodeType });
        nextParentEventId = executionId;
        nextDelay = null;
      }
    }

    for (const targetId of outgoing.get(nodeId) || []) {
      queue.push({
        nodeId: targetId,
        parentEventId: nextParentEventId,
        delay: nextDelay,
      });
    }
  }

  for (const node of nodes) {
    if (node.nodeType !== "trigger" && !reachable.has(node.id)) {
      errors.push(`${canvasNodeDescription(node)} is not connected to the trigger.`);
    }
  }

  // Every workflow event must be represented by a node, or Mautic receives an
  // event with no place in the graph and rejects the campaign as orphaned.
  const linkedEventIds = new Set(
    nodes
      .filter((node) => node.eventId && EVENT_NODE_TYPES.has(node.nodeType))
      .map((node) => node.eventId)
  );
  for (const event of form.events || []) {
    if (!linkedEventIds.has(event.id)) {
      errors.push(
        `Event "${getEventLabel(event.metadata)}" is not on the canvas. Link it to a node or remove it.`
      );
    }
  }

  if (!executionEvents.length && !errors.length) {
    errors.push(
      "Workflow has no runnable step. Add an action after the trigger and link it to an event."
    );
  }

  return { events: executionEvents, errors, nodeMap, reachable };
};

// The provider stores the graph on each event via `parent`; `children` is
// rebuilt server-side and must not be sent.
const toEventPayload = (workflowEvent) => {
  const payload = {
    key: workflowEvent.key,
    eventType: workflowEvent.eventType,
    properties: isPlainObject(workflowEvent.properties) ? workflowEvent.properties : {},
  };

  if (String(workflowEvent.id || "").startsWith("new_")) {
    payload.id = workflowEvent.id;
    payload.name = workflowEvent.name;
    payload.order = workflowEvent.order;
    payload.parent = workflowEvent.parent ?? null;
    if (workflowEvent.triggerMode) payload.triggerMode = workflowEvent.triggerMode;
    if (workflowEvent.triggerInterval) {
      payload.triggerInterval = workflowEvent.triggerInterval;
      payload.triggerIntervalUnit = workflowEvent.triggerIntervalUnit;
    }
  }

  return payload;
};

// The provider reads `connections`, not `edges`; our own keys ride along so the
// canvas round-trips exactly on reload.
const toCanvasSettingsPayload = (canvasSettings) => ({
  nodes: (canvasSettings?.nodes || []).map((node) => ({
    ...node,
    positionX: String(Math.round(node.position?.x ?? 0)),
    positionY: String(Math.round(node.position?.y ?? 0)),
  })),
  connections: (canvasSettings?.edges || []).map((edge) => ({
    ...edge,
    sourceId: edge.source,
    targetId: edge.target,
  })),
});

const validateExecutionMapping = (canvasNodes, canvasEdges, form) => {
  const { errors } = mapCanvasToExecution(canvasNodes, canvasEdges, form);
  return { valid: errors.length === 0, errors };
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
  const status = useMemo(() => (event ? getConfigurationStatus(event) : null), [event]);

  if (!event) {
    return (
      <Alert severity="info" variant="outlined">
        Select or add a workflow event to configure its provider metadata.
      </Alert>
    );
  }

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: status?.complete ? "#E7ECEF" : "#FCA5A5", p: 2 }}>
      <Stack spacing={2}>
        <Stack direction="row" spacing={2} alignItems="flex-start" justifyContent="space-between">
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" sx={{ color: "#1B2A4A", fontWeight: 850 }}>
              Selected Event Configuration
            </Typography>
            <Typography color="text.secondary">
              {getEventLabel(event.metadata)}
            </Typography>
          </Box>
          <Chip
            label={status?.message || "Unknown"}
            color={status?.complete ? "success" : "error"}
            variant={status?.complete ? "filled" : "outlined"}
          />
        </Stack>

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
              const fieldMeta = getNestedValue(event.metadata?.formTypeOptions, field.path);
              const isRequired = fieldMeta?.required === true || fieldMeta?.required === "true";
              const isEmpty = value === undefined || value === null || value === "";
              const fieldLabel = isRequired ? `${field.label} *` : field.label;
              const fieldError = isRequired && isEmpty;

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
                    label={fieldLabel}
                  />
                );
              }

              if (field.kind === "select") {
                return (
                  <FormControl key={field.path} fullWidth error={fieldError}>
                    <InputLabel id={`${event.id}-${field.path}-label`}>
                      {fieldLabel}
                    </InputLabel>
                    <Select
                      labelId={`${event.id}-${field.path}-label`}
                      value={value ?? ""}
                      label={fieldLabel}
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
                  label={fieldLabel}
                  value={value ?? ""}
                  onChange={(changeEvent) =>
                    onChangeProperty(event.id, field.path, changeEvent.target.value)
                  }
                  fullWidth
                  error={fieldError}
                  helperText={fieldError ? "This field is required" : fieldMeta?.description || ""}
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

function CanvasNodeConfigPanel({
  node,
  events,
  linkedEvent,
  onLinkEvent,
  onChangeDelay,
  onChangeProperty,
  onDeleteNode,
  onClose,
  disabled,
}) {
  if (!node) {
    return (
      <Alert severity="info" variant="outlined">
        Select a node on the canvas to configure it.
      </Alert>
    );
  }

  const status = linkedEvent ? getConfigurationStatus(linkedEvent) : null;
  const canLinkEvent = EVENT_NODE_TYPES.has(node.nodeType);
  const isDelay = node.nodeType === "delay";

  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: "#E7ECEF", p: 2 }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} alignItems="flex-start" justifyContent="space-between">
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Node Type
              </Typography>
              <Typography variant="subtitle1" sx={{ color: "#1B2A4A", fontWeight: 850 }}>
                {canvasNodeTypeLabel(node.nodeType)}
              </Typography>
            </Box>
            <Button type="button" size="small" onClick={onClose}>
              Close
            </Button>
          </Stack>

          {canLinkEvent && (
            <>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Linked Event
                </Typography>
                <Typography sx={{ fontWeight: 750 }}>
                  {linkedEvent ? getEventLabel(linkedEvent.metadata) : "No event linked"}
                </Typography>
                {linkedEvent && (
                  <Typography component="code" variant="body2" color="text.secondary">
                    {linkedEvent.key}
                  </Typography>
                )}
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary">
                  Configuration Status
                </Typography>
                <Box>
                  <Chip
                    size="small"
                    label={status ? status.message : "No event linked"}
                    color={status?.complete ? "success" : "error"}
                    variant={status?.complete ? "filled" : "outlined"}
                  />
                </Box>
              </Box>
            </>
          )}

          {canLinkEvent ? (
            <FormControl fullWidth disabled={disabled}>
              <InputLabel id={`canvas-node-event-${node.id}`}>Change Linked Event</InputLabel>
              <Select
                labelId={`canvas-node-event-${node.id}`}
                value={events.some((e) => e.id === node.eventId) ? node.eventId : ""}
                label="Change Linked Event"
                onChange={(changeEvent) => onLinkEvent(node.id, changeEvent.target.value)}
              >
                <MenuItem value="">
                  <em>Not linked</em>
                </MenuItem>
                {events.map((event) => (
                  <MenuItem key={event.id} value={event.id}>
                    {getEventLabel(event.metadata)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : isDelay ? (
            <Stack spacing={1.5}>
              <Typography variant="body2" color="text.secondary">
                Waits before running the next step. It is not sent to Mautic as an
                event of its own.
              </Typography>
              <Stack direction="row" spacing={1.5}>
                <TextField
                  label="Wait"
                  type="number"
                  value={node.delay?.interval ?? ""}
                  onChange={(changeEvent) =>
                    onChangeDelay(node.id, {
                      interval: changeEvent.target.value,
                      unit: node.delay?.unit || "d",
                    })
                  }
                  inputProps={{ min: 1 }}
                  disabled={disabled}
                  sx={{ flex: 1 }}
                />
                <FormControl sx={{ flex: 1 }} disabled={disabled}>
                  <InputLabel id={`canvas-node-delay-${node.id}`}>Unit</InputLabel>
                  <Select
                    labelId={`canvas-node-delay-${node.id}`}
                    value={node.delay?.unit || "d"}
                    label="Unit"
                    onChange={(changeEvent) =>
                      onChangeDelay(node.id, {
                        interval: node.delay?.interval ?? "",
                        unit: changeEvent.target.value,
                      })
                    }
                  >
                    {DELAY_UNIT_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            </Stack>
          ) : (
            <Box>
              <Typography variant="caption" color="text.secondary">
                Linked Event
              </Typography>
              <Typography variant="body2">
                Campaign Entry — contacts enter the workflow here.
              </Typography>
            </Box>
          )}

          {canLinkEvent && !events.length && (
            <Alert severity="info" variant="outlined">
              No workflow events yet. Add one from the Workflow Events tab first.
            </Alert>
          )}

          <Button
            type="button"
            color="error"
            size="small"
            startIcon={<DeleteRoundedIcon />}
            onClick={() => onDeleteNode(node.id)}
            disabled={disabled}
            sx={{ alignSelf: "flex-start" }}
          >
            Delete Node
          </Button>
        </Stack>
      </Paper>

      {canLinkEvent && (
        <EventConfigurationPanel event={linkedEvent} onChangeProperty={onChangeProperty} />
      )}

      <Alert severity="info" variant="outlined">
        Changes apply immediately. Click Update Campaign to persist them.
      </Alert>
    </Stack>
  );
}

export default function AdminNewsletterMauticCampaignBuilderPage() {
  const navigate = useNavigate();
  const { campaignId } = useParams();
  const isEditMode = Boolean(campaignId);
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
    canvasSettings: { nodes: [], edges: [] },
  });
  const [eventPicker, setEventPicker] = useState({
    eventType: "action",
    eventKey: "",
  });
  const [selectedWorkflowEventId, setSelectedWorkflowEventId] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [canvasNodes, setCanvasNodes] = useState([]);
  const [selectedCanvasNodeId, setSelectedCanvasNodeId] = useState("");
  const [builderTab, setBuilderTab] = useState("edit");

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
  const selectedCanvasNode = useMemo(
    () => canvasNodes.find((node) => node.id === selectedCanvasNodeId) || null,
    [canvasNodes, selectedCanvasNodeId]
  );
  const selectedCanvasNodeEvent = useMemo(
    () =>
      selectedCanvasNode?.eventId
        ? form.events.find((event) => event.id === selectedCanvasNode.eventId) || null
        : null,
    [form.events, selectedCanvasNode]
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


  const loadCampaign = useCallback(async () => {
    if (!campaignId) return;

    const campaign = await getNativeMauticCampaignBuilder(campaignId);

    const rawCanvasNodes = (campaign?.canvasSettings?.nodes || [])
      .filter((node) => node && node.id)
      .map((node) => ({
        ...node,
        nodeType: node.nodeType || node.type,
        position: hasValidPosition(node)
          ? node.position
          : {
              x: Number(node.positionX),
              y: Number(node.positionY),
            },
      }));
    const savedEdges = [
      ...(campaign?.canvasSettings?.connections || []),
      ...(campaign?.canvasSettings?.edges || []),
    ]
      .map((edge) => ({
        ...edge,
        source: edge?.source || edge?.sourceId,
        target: edge?.target || edge?.targetId,
      }))
      .filter(
        (edge, index, all) =>
          edge.source &&
          edge.target &&
          all.findIndex((o) => o.source === edge.source && o.target === edge.target) === index
      );
    const validatedCanvasNodes = applyWorkflowLayout(rawCanvasNodes, savedEdges);
    const validatedCanvasEdges = savedEdges.length
      ? savedEdges
      : buildSequentialEdges(validatedCanvasNodes);

    setForm({
      name: campaign?.name || "",
      description: campaign?.description || "",
      isPublished: Boolean(campaign?.isPublished),
      lists: (campaign?.sources?.segments || []).map((item) => item.id).filter(Boolean),
      forms: (campaign?.sources?.forms || []).map((item) => item.id).filter(Boolean),
      events: (campaign?.events || []).map((event) => ({
        id: String(event.id || workflowEventId()),
        key: event.key,
        eventType: event.eventType,
        metadata: event.metadata,
        properties: isPlainObject(event.properties) ? event.properties : {},
      })),
      canvasSettings: {
        nodes: validatedCanvasNodes,
        edges: validatedCanvasEdges,
      },
    });
    setCanvasNodes(validatedCanvasNodes);
  }, [campaignId]);

  useEffect(() => {
    loadCampaign();
  }, [loadCampaign]);

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
    if (!form.lists.length && !form.forms.length) {
      setFormError("Select at least one Segment or Form source.");
      return;
    }
    if (!form.events.length) {
      setFormError("Add at least one workflow event.");
      return;
    }

    const incompleteEvents = form.events.filter(evt => !isEventConfigurationComplete(evt));
    if (incompleteEvents.length) {
      const eventNames = incompleteEvents.map(evt => getEventLabel(evt.metadata)).join(", ");
      setFormError(`Event configuration incomplete: ${eventNames}. Please configure all required fields.`);
      return;
    }

    const canvasValidation = validateCanvasWorkflow();
    if (!canvasValidation.valid) {
      reportWorkflowErrors(canvasValidation.errors);
      return;
    }

    setSaving(true);
    setFormError("");
    try {
      let executionEvents = form.events;
      if (canvasNodes.length > 0) {
        const mapping = mapCanvasToExecution(canvasNodes, form.canvasSettings?.edges || [], form);
        if (mapping.errors.length > 0) {
          reportWorkflowErrors(mapping.errors);
          setSaving(false);
          return;
        }
        executionEvents = mapping.events;
      }

      const payload = {
        name,
        description: form.description,
        isPublished: Boolean(form.isPublished),
        sources: {
          segments: form.lists,
          forms: form.forms,
        },
        events: executionEvents.map(toEventPayload),
        canvasSettings: toCanvasSettingsPayload(form.canvasSettings),
      };

      const createdCampaign = isEditMode
        ? await updateNativeMauticCampaign(campaignId, payload)
        : await createNativeMauticCampaign(payload);
      setSnack({
        open: true,
        severity: "success",
        message: createdCampaign?.id
          ? `Native Mautic Campaign #${createdCampaign.id} ${isEditMode ? "updated" : "created"}.`
          : `Native Mautic Campaign ${isEditMode ? "updated" : "created"}.`,
      });
      if (!isEditMode) {
        setForm({
          name: "",
          description: "",
          isPublished: false,
          lists: [],
          forms: [],
          events: [],
        });
        setSelectedWorkflowEventId("");
      }
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

  const handleCanvasNodesChange = (nodes) => {
    const updatedCanvasNodes = nodes.map((n) => ({
      id: n.id,
      type: n.data?.nodeType,
      nodeType: n.data?.nodeType,
      position: n.position,
      eventId: n.data?.eventId,
      label: n.data?.label,
    }));
    setCanvasNodes(updatedCanvasNodes);
    setForm((current) => ({
      ...current,
      canvasSettings: {
        ...current.canvasSettings,
        nodes: updatedCanvasNodes,
      },
    }));
  };

  const handleCanvasEdgesChange = (edges) => {
    setForm((current) => ({
      ...current,
      canvasSettings: {
        ...current.canvasSettings,
        edges: edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
        })),
      },
    }));
  };

  const handleCanvasConnect = (connection) => {
    setForm((current) => {
      const exists = current.canvasSettings.edges.some(
        (edge) => edge.source === connection.source && edge.target === connection.target
      );
      if (exists) return current;

      return {
        ...current,
        canvasSettings: {
          ...current.canvasSettings,
          edges: [
            ...current.canvasSettings.edges,
            {
              id: canvasEdgeId(connection.source, connection.target),
              source: connection.source,
              target: connection.target,
            },
          ],
        },
      };
    });
  };

  const handleCanvasDeleteNode = (nodeId) => {
    const node = canvasNodes.find((n) => n.id === nodeId);
    if (node?.eventId) {
      removeWorkflowEvent(node.eventId);
    }
    setCanvasNodes((current) => current.filter((n) => n.id !== nodeId));
    setForm((current) => ({
      ...current,
      canvasSettings: {
        ...current.canvasSettings,
        nodes: current.canvasSettings.nodes.filter((n) => n.id !== nodeId),
        edges: current.canvasSettings.edges.filter(
          (e) => e.source !== nodeId && e.target !== nodeId
        ),
      },
    }));
    setSelectedCanvasNodeId((current) => (current === nodeId ? "" : current));
  };

  const handleCanvasAddNode = (nodeType, position) => {
    const nodeId = `node-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const newNode = {
      id: nodeId,
      type: nodeType,
      nodeType,
      position: {
        x: Number.isFinite(position?.x) ? position.x : 250,
        y: Number.isFinite(position?.y) ? position.y : 250,
      },
      eventId: null,
      label: canvasNodeTypeLabel(nodeType),
    };
    const previousNode = canvasNodes[canvasNodes.length - 1];

    setCanvasNodes((current) => [...current, newNode]);
    setForm((current) => ({
      ...current,
      canvasSettings: {
        ...current.canvasSettings,
        nodes: [...current.canvasSettings.nodes, newNode],
        edges: previousNode
          ? [
              ...current.canvasSettings.edges,
              {
                id: canvasEdgeId(previousNode.id, nodeId),
                source: previousNode.id,
                target: nodeId,
              },
            ]
          : current.canvasSettings.edges,
      },
    }));
    setSelectedCanvasNodeId(nodeId);
  };

  const handleCanvasNodeSelect = (nodeId) => {
    setSelectedCanvasNodeId(nodeId);
    const node = canvasNodes.find((n) => n.id === nodeId);
    if (node?.eventId) {
      setSelectedWorkflowEventId(node.eventId);
    }
  };

  const applyToCanvasNode = (nodeId, patch) => {
    const update = (node) => (node.id === nodeId ? { ...node, ...patch } : node);
    setCanvasNodes((current) => current.map(update));
    setForm((current) => ({
      ...current,
      canvasSettings: {
        ...current.canvasSettings,
        nodes: current.canvasSettings.nodes.map(update),
      },
    }));
  };

  const handleCanvasLinkEvent = (nodeId, eventId) => {
    applyToCanvasNode(nodeId, { eventId: eventId || null });
  };

  const handleCanvasSetDelay = (nodeId, delay) => {
    applyToCanvasNode(nodeId, { delay });
  };

  // Surface workflow problems in the UI rather than letting the provider reject
  // the save with an opaque 400.
  const reportWorkflowErrors = (errors, prefix) => {
    const message = [prefix, errors.join(" ")].filter(Boolean).join(": ");
    setFormError(message);
    setSnack({ open: true, severity: "error", message });
  };

  const validateCanvasWorkflow = () => {
    const nodes = canvasNodes || [];
    const edges = form.canvasSettings?.edges || [];

    // No canvas means the campaign is driven by the Workflow Events tab alone.
    if (nodes.length === 0) {
      return { valid: true, errors: [] };
    }

    const errors = [];
    const { incoming } = buildCanvasGraph(nodes, edges);

    for (const node of nodes) {
      if (node.nodeType !== "trigger" && !(incoming.get(node.id) || []).length) {
        errors.push(`${canvasNodeDescription(node)} has no incoming connection.`);
      }
      if (EVENT_NODE_TYPES.has(node.nodeType) && node.eventId) {
        const event = form.events.find((e) => e.id === node.eventId);
        if (event && !isEventConfigurationComplete(event)) {
          errors.push(`${canvasNodeDescription(node)} is missing required configuration.`);
        }
      }
    }

    errors.push(...validateExecutionMapping(nodes, edges, form).errors);

    return { valid: errors.length === 0, errors: Array.from(new Set(errors)) };
  };

  const publishCampaign = async () => {
    if (!isEditMode || !campaignId) return;
    setSaving(true);
    setFormError("");
    try {
      let executionEvents = form.events;
      if (canvasNodes.length > 0) {
        const mapping = mapCanvasToExecution(canvasNodes, form.canvasSettings?.edges || [], form);
        if (mapping.errors.length > 0) {
          reportWorkflowErrors(mapping.errors, "Cannot publish");
          setSaving(false);
          return;
        }
        executionEvents = mapping.events;
      }

      const payload = {
        name: form.name,
        description: form.description,
        isPublished: true,
        sources: {
          segments: form.lists,
          forms: form.forms,
        },
        events: executionEvents.map(toEventPayload),
        canvasSettings: toCanvasSettingsPayload(form.canvasSettings),
      };

      await updateNativeMauticCampaign(campaignId, payload);
      setForm((current) => ({ ...current, isPublished: true }));
      setSnack({
        open: true,
        severity: "success",
        message: `Native Mautic Campaign #${campaignId} published.`,
      });
    } catch (err) {
      setFormError(
        getErrorMessage(err, "We could not publish this native Mautic Campaign.")
      );
    } finally {
      setSaving(false);
    }
  };

  const unpublishCampaign = async () => {
    if (!isEditMode || !campaignId) return;
    setSaving(true);
    setFormError("");
    try {
      let executionEvents = form.events;
      if (canvasNodes.length > 0) {
        const mapping = mapCanvasToExecution(canvasNodes, form.canvasSettings?.edges || [], form);
        if (mapping.errors.length > 0) {
          reportWorkflowErrors(mapping.errors, "Cannot unpublish");
          setSaving(false);
          return;
        }
        executionEvents = mapping.events;
      }

      const payload = {
        name: form.name,
        description: form.description,
        isPublished: false,
        sources: {
          segments: form.lists,
          forms: form.forms,
        },
        events: executionEvents.map(toEventPayload),
        canvasSettings: toCanvasSettingsPayload(form.canvasSettings),
      };

      await updateNativeMauticCampaign(campaignId, payload);
      setForm((current) => ({ ...current, isPublished: false }));
      setSnack({
        open: true,
        severity: "success",
        message: `Native Mautic Campaign #${campaignId} unpublished.`,
      });
    } catch (err) {
      setFormError(
        getErrorMessage(err, "We could not unpublish this native Mautic Campaign.")
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteCampaign = async () => {
    if (!isEditMode || !campaignId) return;
    setIsDeleting(true);
    setFormError("");
    try {
      await deleteNewsletterMauticCampaign(campaignId);
      setSnack({
        open: true,
        severity: "success",
        message: `Native Mautic Campaign #${campaignId} deleted.`,
      });
      setTimeout(() => {
        navigate("/admin/newsletter/campaigns");
      }, 1500);
    } catch (err) {
      setDeleteConfirmOpen(false);
      setFormError(
        getErrorMessage(err, "We could not delete this native Mautic Campaign.")
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const duplicateCampaign = async () => {
    if (!isEditMode || !campaignId) return;
    setIsDuplicating(true);
    setFormError("");
    try {
      const duplicated = await duplicateNativeMauticCampaign(campaignId);
      setSnack({
        open: true,
        severity: "success",
        message: `Campaign duplicated. New ID: ${duplicated?.id}`,
      });
      setTimeout(() => {
        navigate(`/admin/newsletter/builder/${duplicated?.id}`);
      }, 1500);
    } catch (err) {
      setFormError(
        getErrorMessage(err, "We could not duplicate this native Mautic Campaign.")
      );
    } finally {
      setIsDuplicating(false);
    }
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Button
          startIcon={<ArrowBackRoundedIcon />}
          onClick={() => navigate("/admin/newsletter/campaigns")}
          sx={{ textTransform: "none", mb: 1 }}
        >
          Back to Campaigns
        </Button>
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          spacing={2}
        >
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 0.75 }}>
              <Typography variant="h4" sx={{ fontWeight: 850, color: "#1B2A4A" }}>
                {isEditMode ? "Edit Native Mautic Campaign" : "Native Mautic Campaign Builder"}
              </Typography>
              {isEditMode && (
                <Chip
                  label={form.isPublished ? "Published" : "Draft"}
                  color={form.isPublished ? "success" : "default"}
                  variant={form.isPublished ? "filled" : "outlined"}
                  size="small"
                />
              )}
            </Stack>
            <Typography color="text.secondary">
              {isEditMode ? "Update provider-owned Mautic Campaign." : "Create provider-owned Campaign drafts and inspect runtime Mautic Builder capabilities."}
            </Typography>
          </Box>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignSelf: "flex-start" }}>
            <Button
              startIcon={<RefreshRoundedIcon />}
              onClick={loadCapabilities}
              disabled={loading || saving}
              sx={{ textTransform: "none" }}
            >
              Refresh
            </Button>
            {isEditMode && (
              <>
                <Tooltip title={form.isPublished ? "Unpublish campaign" : "Publish campaign"}>
                  <Button
                    startIcon={form.isPublished ? <UnpublishedRoundedIcon /> : <PublishRoundedIcon />}
                    onClick={form.isPublished ? unpublishCampaign : publishCampaign}
                    disabled={saving || isDuplicating}
                    variant="outlined"
                    sx={{ textTransform: "none" }}
                  >
                    {form.isPublished ? "Unpublish" : "Publish"}
                  </Button>
                </Tooltip>
                <Tooltip title="Create a copy of this campaign">
                  <Button
                    startIcon={isDuplicating ? <CircularProgress size={18} color="inherit" /> : <ContentCopyRoundedIcon />}
                    onClick={duplicateCampaign}
                    disabled={saving || isDuplicating}
                    sx={{ textTransform: "none" }}
                  >
                    Duplicate
                  </Button>
                </Tooltip>
                <Tooltip title="Delete this campaign">
                  <Button
                    color="error"
                    startIcon={<DeleteRoundedIcon />}
                    onClick={() => setDeleteConfirmOpen(true)}
                    disabled={saving || isDeleting}
                    sx={{ textTransform: "none" }}
                  >
                    Delete
                  </Button>
                </Tooltip>
              </>
            )}
          </Stack>
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

      <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: "#E7ECEF" }}>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs value={builderTab} onChange={(e, val) => setBuilderTab(val)}>
            <Tab label="Edit" value="edit" />
            <Tab label="Workflow Events" value="workflow-events" />
            <Tab label="Canvas" value="canvas" />
          </Tabs>
        </Box>

        <Stack spacing={2.5} component="form" onSubmit={createCampaign} sx={{ p: 2.5 }}>
          {formError && <Alert severity="error">{formError}</Alert>}

          {builderTab === "edit" && (
            <Stack spacing={2.5}>
              <Stack direction="row" spacing={1.25} alignItems="center">
                <AccountTreeRoundedIcon color="primary" />
                <Box>
                  <Typography variant="h6" sx={{ color: "#1B2A4A", fontWeight: 850 }}>
                    Campaign Settings
                  </Typography>
                  <Typography color="text.secondary">
                    Configure campaign name, description, and audience sources.
                  </Typography>
                </Box>
              </Stack>

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
                      Campaign Preview
                    </Typography>
                    <Typography color="text.secondary">
                      Review your campaign before saving.
                    </Typography>
                  </Box>

                  <Stack spacing={1.5}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Campaign Name
                      </Typography>
                      <Typography sx={{ fontWeight: 750 }}>
                        {form.name.trim() || "Untitled"}
                      </Typography>
                    </Box>

                    {form.description && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Description
                        </Typography>
                        <Typography variant="body2">
                          {form.description}
                        </Typography>
                      </Box>
                    )}

                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Status
                      </Typography>
                      <Chip
                        label={form.isPublished ? "Published" : "Draft"}
                        color={form.isPublished ? "success" : "default"}
                        variant={form.isPublished ? "filled" : "outlined"}
                        size="small"
                      />
                    </Box>

                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Sources
                      </Typography>
                      <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }} flexWrap="wrap" useFlexGap>
                        {form.lists.map((list) => (
                          <Chip key={list} label={`Segment: ${list}`} size="small" variant="outlined" />
                        ))}
                        {form.forms.map((formId) => (
                          <Chip key={formId} label={`Form: ${formId}`} size="small" variant="outlined" />
                        ))}
                        {!form.lists.length && !form.forms.length && (
                          <Typography variant="caption" color="error">
                            No sources selected
                          </Typography>
                        )}
                      </Stack>
                    </Box>
                  </Stack>
                </Stack>
              </Paper>
            </Stack>
          )}

          {builderTab === "workflow-events" && (
            <Stack spacing={2.5}>
              <Stack direction="row" spacing={1.25} alignItems="center">
                <AccountTreeRoundedIcon color="primary" />
                <Box>
                  <Typography variant="h6" sx={{ color: "#1B2A4A", fontWeight: 850 }}>
                    Workflow Events
                  </Typography>
                  <Typography color="text.secondary">
                    Select and configure runtime Mautic events.
                  </Typography>
                </Box>
              </Stack>

              <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: "#E7ECEF", p: 2 }}>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ color: "#1B2A4A", fontWeight: 850 }}>
                      Add Workflow Event
                    </Typography>
                    <Typography color="text.secondary">
                      Select runtime Mautic events for the workflow.
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
                      Events Summary
                    </Typography>
                    <Typography color="text.secondary">
                      Review configured workflow events.
                    </Typography>
                  </Box>

                  {form.events.length > 0 ? (
                    <Stack spacing={1}>
                      {form.events.map((event, index) => {
                        const status = getConfigurationStatus(event);
                        return (
                          <Stack key={event.id} direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1 }}>
                              <Typography variant="body2">
                                {index + 1}. {getEventLabel(event.metadata)}
                              </Typography>
                              <Chip
                                label={status.message}
                                color={status.complete ? "success" : "error"}
                                variant={status.complete ? "filled" : "outlined"}
                                size="small"
                              />
                            </Stack>
                            <Button
                              type="button"
                              variant="outlined"
                              onClick={() => setSelectedWorkflowEventId(event.id)}
                              disabled={saving}
                              size="small"
                            >
                              Configure
                            </Button>
                          </Stack>
                        );
                      })}
                    </Stack>
                  ) : (
                    <Alert severity="info" variant="outlined">
                      No workflow events added yet.
                    </Alert>
                  )}
                </Stack>
              </Paper>
            </Stack>
          )}

          {builderTab === "canvas" && (
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="h6" sx={{ color: "#1B2A4A", fontWeight: 850 }}>
                  Visual Workflow Canvas
                </Typography>
                <Typography color="text.secondary">
                  Arrange the flow left to right, connect nodes, and click a node to configure it.
                </Typography>
              </Box>

              <Stack
                direction={{ xs: "column", lg: "row" }}
                spacing={2}
                alignItems="flex-start"
              >
                <Box sx={{ flex: 1, minWidth: 0, width: "100%" }}>
                  <WorkflowCanvas
                    events={form.events}
                    canvasNodes={canvasNodes}
                    onNodeSelect={handleCanvasNodeSelect}
                    onNodesChange={handleCanvasNodesChange}
                    onEdgesChange={handleCanvasEdgesChange}
                    onConnect={handleCanvasConnect}
                    canvasSettings={form.canvasSettings}
                    onDeleteNode={handleCanvasDeleteNode}
                    onAddNode={handleCanvasAddNode}
                    getConfigurationStatus={getConfigurationStatus}
                    getEventLabel={getEventLabel}
                    selectedNodeId={selectedCanvasNodeId}
                  />
                </Box>

                <Box sx={{ width: { xs: "100%", lg: 380 }, flexShrink: 0 }}>
                  <CanvasNodeConfigPanel
                    node={selectedCanvasNode}
                    events={form.events}
                    linkedEvent={selectedCanvasNodeEvent}
                    onLinkEvent={handleCanvasLinkEvent}
                    onChangeDelay={handleCanvasSetDelay}
                    onChangeProperty={updateWorkflowEventProperty}
                    onDeleteNode={handleCanvasDeleteNode}
                    onClose={() => setSelectedCanvasNodeId("")}
                    disabled={saving}
                  />
                </Box>
              </Stack>
            </Stack>
          )}

          <Divider sx={{ my: 2 }} />

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
                  canvasSettings: { nodes: [], edges: [] },
                });
                setCanvasNodes([]);
                setSelectedWorkflowEventId("");
                setSelectedCanvasNodeId("");
                setBuilderTab("edit");
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
              {isEditMode ? "Update Campaign" : "Create Campaign"}
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

      <Dialog open={deleteConfirmOpen} onClose={() => !isDeleting && setDeleteConfirmOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Delete Native Mautic Campaign?</DialogTitle>
        <DialogContent>
          <Typography>
            This removes the campaign from Mautic and is not reversible.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={deleteCampaign}
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={18} color="inherit" /> : <DeleteRoundedIcon />}
          >
            {isDeleting ? "Deleting..." : "Delete Campaign"}
          </Button>
        </DialogActions>
      </Dialog>

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
