import React, { useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";

import {
  GLUES,
  addFilterRow,
  filterFieldList,
  filterRowValue,
  filterValueControl,
  findFilterField,
  operatorsForField,
  removeFilterRow,
  setFilterRowField,
  setFilterRowGlue,
  setFilterRowOperator,
  setFilterRowValue,
  updateFilterRow,
  validateFilterRows,
} from "./mauticSegmentFilters";
import MauticRemoteChoiceField from "./MauticRemoteChoiceField";
import {
  remoteChoiceFieldDescriptor,
  segmentChoiceRequestParams,
  usesRemoteChoices,
} from "./mauticSegmentChoices";
import { getNativeMauticSegmentFilterChoices } from "../services/newsletterService";

/**
 * Builds native Mautic dynamic segment filters.
 *
 * Every row is [field] [condition] [value], joined by the provider's own and/or
 * glue. Which fields exist, which conditions each accepts and how its value is
 * entered all come from the provider metadata passed in — this component names no
 * field and no operator of its own.
 */
export default function MauticSegmentFilterEditor({
  rows,
  metadataIndex,
  loading,
  error,
  disabled,
  onChange,
}) {
  const fields = useMemo(() => filterFieldList(metadataIndex), [metadataIndex]);
  const issues = useMemo(
    () => validateFilterRows(rows, metadataIndex),
    [rows, metadataIndex]
  );
  const issueFor = (position) =>
    issues.find((issue) => issue.position === position)?.message || "";

  const [fieldToAdd, setFieldToAdd] = useState(null);

  if (loading) {
    return (
      <Stack direction="row" spacing={1} alignItems="center">
        <CircularProgress size={18} />
        <Typography variant="body2" color="text.secondary">
          Loading filter options from Mautic…
        </Typography>
      </Stack>
    );
  }

  if (error) {
    return (
      <Alert severity="error" variant="outlined">
        {error}
      </Alert>
    );
  }

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 750 }}>
          Filters
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Contacts join this segment automatically when they match. Leave empty for
          a static segment whose members you manage by hand.
        </Typography>
      </Box>

      {(rows || []).map((row, position) => {
        const field = findFilterField(metadataIndex, row);
        const operators = operatorsForField(field);
        const control = filterValueControl(field, row.operator, metadataIndex);
        const value = filterRowValue(row);
        const rowIssue = issueFor(position);

        const change = (next) => onChange(updateFilterRow(rows, position, next));

        return (
          <Stack
            key={`${row.field}-${position}`}
            spacing={1}
            sx={{ p: 1.5, border: "1px solid", borderColor: rowIssue ? "#FCA5A5" : "#E7ECEF", borderRadius: 2 }}
          >
            {/* One row, laid out so every control keeps its own room: join and
                remove stay small, the value gets what is left. At narrower
                widths it wraps to [join | field] then [condition | value] then
                the remove action, rather than scrolling sideways. */}
            <Box
              sx={{
                display: "grid",
                gap: 1.5,
                alignItems: "start",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "minmax(0, 1fr) minmax(0, 1.4fr) 48px",
                  lg: "96px minmax(0, 1.3fr) minmax(0, 1.1fr) minmax(0, 1.6fr) 48px",
                },
              }}
            >
              <Box sx={{ minWidth: 0, gridColumn: { sm: "1 / 2", lg: "auto" } }}>
                {position > 0 ? (
                  <FormControl fullWidth size="small" disabled={disabled}>
                    <InputLabel id={`glue-${position}`}>Join</InputLabel>
                    <Select
                      labelId={`glue-${position}`}
                      label="Join"
                      value={row.glue || "and"}
                      onChange={(event) => change(setFilterRowGlue(row, event.target.value))}
                    >
                      {GLUES.map((glue) => (
                        <MenuItem key={glue} value={glue}>
                          {glue === "and" ? "AND" : "OR"}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : (
                  <Chip label="WHERE" size="small" sx={{ mt: 0.5 }} />
                )}
              </Box>

              <Autocomplete
                sx={{ minWidth: 0, gridColumn: { sm: "2 / -1", lg: "auto" } }}
                size="small"
                disabled={disabled}
                options={fields}
                value={field}
                isOptionEqualToValue={(option, selected) =>
                  option.alias === selected?.alias && option.object === selected?.object
                }
                getOptionLabel={(option) => option?.label || option?.alias || ""}
                groupBy={(option) => (option.object === "company" ? "Company" : "Contact")}
                onChange={(event, nextField) =>
                  nextField && change(setFilterRowField(row, nextField))
                }
                renderInput={(params) => <TextField {...params} label="Field" />}
              />

              <FormControl
                sx={{ minWidth: 0, gridColumn: { sm: "1 / 2", lg: "auto" } }}
                size="small"
                disabled={disabled || !field}
              >
                <InputLabel id={`operator-${position}`}>Condition</InputLabel>
                <Select
                  labelId={`operator-${position}`}
                  label="Condition"
                  value={row.operator || ""}
                  onChange={(event) =>
                    change(setFilterRowOperator(row, event.target.value, metadataIndex))
                  }
                >
                  {operators.map((operator) => (
                    <MenuItem key={String(operator.value)} value={String(operator.value)}>
                      {operator.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box sx={{ minWidth: 0, gridColumn: { sm: "2 / 3", lg: "auto" } }}>
                <FilterValueInput
                  position={position}
                  field={field}
                  control={control}
                  value={value}
                  disabled={disabled}
                  onChange={(nextValue) => change(setFilterRowValue(row, nextValue))}
                />
              </Box>

              <Box
                sx={{
                  minWidth: 0,
                  alignSelf: "center",
                  justifySelf: { xs: "start", sm: "center" },
                  gridColumn: { sm: "3 / 4", lg: "auto" },
                }}
              >
                <Tooltip title="Remove this filter">
                  <span>
                    <IconButton
                      aria-label="Remove this filter"
                      color="error"
                      size="small"
                      disabled={disabled}
                      onClick={() => onChange(removeFilterRow(rows, position))}
                    >
                      <DeleteRoundedIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
            </Box>

            {rowIssue && (
              <Typography variant="caption" color="error">
                {rowIssue}
              </Typography>
            )}
          </Stack>
        );
      })}

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        alignItems={{ xs: "stretch", sm: "center" }}
      >
        <Autocomplete
          sx={{ flex: 1, minWidth: 0 }}
          size="small"
          disabled={disabled || !fields.length}
          options={fields}
          value={fieldToAdd}
          getOptionLabel={(option) => option?.label || option?.alias || ""}
          groupBy={(option) => (option.object === "company" ? "Company" : "Contact")}
          isOptionEqualToValue={(option, selected) =>
            option.alias === selected?.alias && option.object === selected?.object
          }
          onChange={(event, nextField) => setFieldToAdd(nextField)}
          renderInput={(params) => <TextField {...params} label="Add a filter on…" />}
        />
        <Button
          variant="outlined"
          startIcon={<AddRoundedIcon />}
          sx={{ flexShrink: 0, whiteSpace: "nowrap", minWidth: 140 }}
          disabled={disabled || !fieldToAdd}
          onClick={() => {
            onChange(addFilterRow(rows, fieldToAdd));
            setFieldToAdd(null);
          }}
        >
          Add filter
        </Button>
      </Stack>
    </Stack>
  );
}

/**
 * The value control the provider asked for: nothing here decides by field name.
 * A catalog small enough to be inlined becomes a select; one the provider only
 * describes by reference becomes a searchable picker, when ECP can serve that
 * catalog; anything else is typed in.
 */
function FilterValueInput({ position, field, control, value, disabled, onChange }) {
  if (!field) {
    return <TextField size="small" label="Value" value="" disabled fullWidth />;
  }

  if (!control.requiresValue) {
    return (
      <TextField
        size="small"
        label="Value"
        value=""
        placeholder="No value needed"
        disabled
        fullWidth
      />
    );
  }

  if (usesRemoteChoices(control)) {
    return (
      <MauticRemoteChoiceField
        field={remoteChoiceFieldDescriptor(field, control, position)}
        value={value}
        disabled={disabled}
        onChange={onChange}
        buildParams={segmentChoiceRequestParams}
        loadChoices={getNativeMauticSegmentFilterChoices}
        cacheNamespace="segment::"
        size="small"
      />
    );
  }

  if (control.choices.length) {
    const selected = control.multiple
      ? (Array.isArray(value) ? value.map(String) : value ? [String(value)] : [])
      : value === undefined || value === null
      ? ""
      : String(value);

    return (
      <FormControl fullWidth size="small" disabled={disabled}>
        <InputLabel id={`value-${position}`}>Value</InputLabel>
        <Select
          labelId={`value-${position}`}
          label="Value"
          multiple={control.multiple}
          value={selected}
          input={<OutlinedInput label="Value" />}
          onChange={(event) => onChange(event.target.value)}
          renderValue={(chosen) => {
            const text = (Array.isArray(chosen) ? chosen : [chosen])
              .map((item) => {
                const choice = control.choices.find(
                  (option) => String(option.value) === String(item)
                );
                return choice ? choice.label : item;
              })
              .join(", ");

            // Long provider labels stay in their control and say the rest on hover.
            return (
              <Box
                title={text}
                sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              >
                {text}
              </Box>
            );
          }}
        >
          {control.choices.map((choice) => (
            <MenuItem key={String(choice.value)} value={String(choice.value)}>
              {control.multiple && (
                <Checkbox
                  size="small"
                  checked={
                    Array.isArray(selected) &&
                    selected.map(String).includes(String(choice.value))
                  }
                />
              )}
              <ListItemText primary={choice.label} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  }

  const inputType =
    control.control === "number"
      ? "number"
      : control.control === "date"
      ? "date"
      : control.control === "datetime"
      ? "datetime-local"
      : "text";

  return (
    <TextField
      size="small"
      fullWidth
      label="Value"
      type={inputType}
      value={Array.isArray(value) ? value.join(", ") : value ?? ""}
      disabled={disabled}
      onChange={(event) =>
        onChange(
          control.multiple
            ? event.target.value.split(",").map((item) => item.trim()).filter(Boolean)
            : event.target.value
        )
      }
      InputLabelProps={inputType === "text" || inputType === "number" ? undefined : { shrink: true }}
      helperText={
        control.choiceMode === "remote"
          ? `Enter the ${String(field.label).toLowerCase()} value exactly as Mautic stores it.`
          : control.multiple
          ? "Separate several values with commas."
          : ""
      }
    />
  );
}
