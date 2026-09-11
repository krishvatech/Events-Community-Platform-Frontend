import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Checkbox,
  CircularProgress,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  ListSubheader,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
} from "@mui/material";

import { listNewsletterFieldChoices } from "../../services/newsletterService";

/**
 * Renders Mautic custom fields from live field metadata.
 *
 * Only field types Mautic 7.1.3 actually defines are rendered as inputs. An unknown
 * type is shown read-only rather than guessed at, so ECP never writes a value Mautic
 * would reject or reinterpret.
 */

// Simple <input type="..."> mappings.
const TEXT_INPUT_TYPES = {
  text: "text",
  email: "email",
  url: "url",
  tel: "tel",
  number: "number",
  date: "date",
  datetime: "datetime-local",
  time: "time",
};

const MULTILINE_TYPES = new Set(["textarea", "html"]);
const OPTION_TYPES = new Set(["select", "multiselect"]);
// Mautic supplies these option lists from its own bundled reference data.
const REFERENCE_TYPES = new Set(["country", "region", "timezone", "locale"]);
const BOOLEAN_TYPES = new Set(["boolean"]);
// `lookup` is a free-text field in Mautic with suggestions, not a closed list.
const LOOKUP_TYPES = new Set(["lookup"]);

export const SUPPORTED_FIELD_TYPES = new Set([
  ...Object.keys(TEXT_INPUT_TYPES),
  ...MULTILINE_TYPES,
  ...OPTION_TYPES,
  ...REFERENCE_TYPES,
  ...BOOLEAN_TYPES,
  ...LOOKUP_TYPES,
]);

export const isSupportedFieldType = (type) => SUPPORTED_FIELD_TYPES.has(String(type || ""));

const asArray = (value) => (Array.isArray(value) ? value : []);

const toMultiValue = (value) => {
  if (Array.isArray(value)) return value.map(String);
  if (value === null || value === undefined || value === "") return [];
  return String(value)
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
};

const isTruthy = (value) => {
  if (typeof value === "boolean") return value;
  return ["1", "true", "yes", "on"].includes(String(value ?? "").toLowerCase());
};

/** Cache reference lists per type for the lifetime of the page. */
const referenceCache = new Map();

function useReferenceChoices(type, enabled) {
  const [state, setState] = useState({ loading: false, choices: [], error: "" });

  useEffect(() => {
    if (!enabled || !REFERENCE_TYPES.has(type)) return undefined;

    if (referenceCache.has(type)) {
      setState({ loading: false, choices: referenceCache.get(type), error: "" });
      return undefined;
    }

    let active = true;
    setState({ loading: true, choices: [], error: "" });
    listNewsletterFieldChoices(type)
      .then((data) => {
        const choices = asArray(data?.results);
        referenceCache.set(type, choices);
        if (active) setState({ loading: false, choices, error: "" });
      })
      .catch(() => {
        if (active) {
          setState({
            loading: false,
            choices: [],
            error: `Could not load the ${type} list from Mautic.`,
          });
        }
      });

    return () => {
      active = false;
    };
  }, [type, enabled]);

  return state;
}

function ReferenceSelect({ field, value, onChange, disabled }) {
  const { loading, choices, error } = useReferenceChoices(field.type, true);
  const labelId = `mautic-field-${field.alias}`;

  // Falling back to a plain text input keeps an existing value editable even when the
  // reference list is unavailable.
  if (error) {
    return (
      <TextField
        fullWidth
        size="small"
        label={field.label}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        required={field.is_required}
        helperText={error}
      />
    );
  }

  const grouped = choices.some((choice) => choice.group);
  const items = [];
  if (grouped) {
    let lastGroup = null;
    choices.forEach((choice) => {
      if (choice.group !== lastGroup) {
        lastGroup = choice.group;
        items.push(<ListSubheader key={`group-${choice.group}`}>{choice.group}</ListSubheader>);
      }
      items.push(
        <MenuItem key={`${choice.group}-${choice.value}`} value={choice.value}>
          {choice.label}
        </MenuItem>
      );
    });
  } else {
    choices.forEach((choice) => {
      items.push(
        <MenuItem key={choice.value} value={choice.value}>
          {choice.label}
        </MenuItem>
      );
    });
  }

  return (
    <FormControl fullWidth size="small" disabled={disabled || loading} required={field.is_required}>
      <InputLabel id={labelId}>{field.label}</InputLabel>
      <Select
        labelId={labelId}
        label={field.label}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        endAdornment={loading ? <CircularProgress size={16} sx={{ mr: 3 }} /> : null}
      >
        <MenuItem value="">
          <em>Not set</em>
        </MenuItem>
        {items}
      </Select>
    </FormControl>
  );
}

export function MauticFieldInput({ field, value, onChange, disabled = false }) {
  const type = String(field?.type || "");
  const options = asArray(field?.options);

  if (BOOLEAN_TYPES.has(type)) {
    return (
      <FormControlLabel
        control={
          <Switch
            checked={isTruthy(value)}
            onChange={(event) => onChange(event.target.checked ? 1 : 0)}
            disabled={disabled}
          />
        }
        label={field.label}
      />
    );
  }

  if (OPTION_TYPES.has(type)) {
    const multiple = type === "multiselect";
    const labelId = `mautic-field-${field.alias}`;
    return (
      <FormControl fullWidth size="small" disabled={disabled} required={field.is_required}>
        <InputLabel id={labelId}>{field.label}</InputLabel>
        <Select
          labelId={labelId}
          label={field.label}
          multiple={multiple}
          value={multiple ? toMultiValue(value) : value ?? ""}
          onChange={(event) => onChange(event.target.value)}
          renderValue={
            multiple ? (selected) => asArray(selected).join(", ") : undefined
          }
        >
          {!multiple && (
            <MenuItem value="">
              <em>Not set</em>
            </MenuItem>
          )}
          {options.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {multiple ? (
                <>
                  <Checkbox
                    size="small"
                    checked={toMultiValue(value).includes(String(option.value))}
                  />
                  {option.label}
                </>
              ) : (
                option.label
              )}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  }

  if (REFERENCE_TYPES.has(type)) {
    return (
      <ReferenceSelect field={field} value={value} onChange={onChange} disabled={disabled} />
    );
  }

  if (MULTILINE_TYPES.has(type)) {
    return (
      <TextField
        fullWidth
        size="small"
        multiline
        minRows={type === "html" ? 4 : 3}
        label={field.label}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        required={field.is_required}
      />
    );
  }

  if (TEXT_INPUT_TYPES[type] || LOOKUP_TYPES.has(type)) {
    return (
      <TextField
        fullWidth
        size="small"
        type={TEXT_INPUT_TYPES[type] || "text"}
        label={field.label}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        required={field.is_required}
        InputLabelProps={
          ["date", "datetime", "time"].includes(type) ? { shrink: true } : undefined
        }
        inputProps={
          field.char_length_limit ? { maxLength: Number(field.char_length_limit) } : undefined
        }
      />
    );
  }

  // Unknown type: show the stored value without offering to change it.
  return (
    <TextField
      fullWidth
      size="small"
      label={`${field.label} (${type || "unknown type"})`}
      value={value ?? ""}
      disabled
      helperText="This Mautic field type is not editable from ECP."
    />
  );
}

/**
 * Renders a group of Mautic fields.
 *
 * `values` is keyed by field alias. `onChange(alias, value)` reports only the field the
 * admin actually touched, so callers can submit a partial payload and leave every other
 * Mautic value untouched.
 */
export default function MauticDynamicFields({
  fields,
  values,
  onChange,
  disabled = false,
  emptyMessage = "No custom fields are defined in Mautic yet.",
  title = "",
}) {
  const visible = useMemo(
    () => asArray(fields).filter((field) => field?.alias),
    [fields]
  );

  if (!visible.length) {
    return (
      <Alert severity="info" variant="outlined">
        {emptyMessage}
      </Alert>
    );
  }

  const unsupported = visible.filter((field) => !isSupportedFieldType(field.type));

  return (
    <Box>
      {title ? (
        <Typography sx={{ fontWeight: 800, color: "#1B2A4A", mb: 1.5 }}>{title}</Typography>
      ) : null}
      {unsupported.length ? (
        <Alert severity="warning" variant="outlined" sx={{ mb: 2 }}>
          {unsupported.length} field{unsupported.length === 1 ? "" : "s"} use a Mautic type
          ECP cannot edit safely and {unsupported.length === 1 ? "is" : "are"} shown read-only.
        </Alert>
      ) : null}
      <Grid container spacing={2}>
        {visible.map((field) => (
          <Grid item xs={12} md={6} key={field.alias}>
            <MauticFieldInput
              field={field}
              value={values?.[field.alias]}
              onChange={(value) => onChange(field.alias, value)}
              disabled={disabled}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
