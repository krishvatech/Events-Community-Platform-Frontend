// The Mautic segments an Email Broadcast goes to. Only published segments are
// offered, because Mautic's email form refuses any other. A chosen segment that
// is no longer offered stays listed, so it can be seen and unticked.

import React, { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

const SEARCH_FROM = 8;

const fallbackName = (id) => `Segment ${id}`;

/** The rows to show: offered segments, plus chosen ones that no longer are. */
export function segmentPickerRows({ options = [], selectedIds = [], savedSegments = [], loaded = false, readOnly = false }) {
  const offered = new Map(options.map((segment) => [String(segment.id), { ...segment, id: String(segment.id) }]));
  const saved = new Map(savedSegments.map((segment) => [String(segment.id), segment]));
  const selected = selectedIds.map((id) => offered.get(id) || {
    id,
    name: saved.get(id)?.name || fallbackName(id),
    unavailable: loaded && !readOnly,
  });
  if (readOnly) return selected;
  return [...selected.filter((row) => !offered.has(row.id)), ...offered.values()];
}

/** The chosen segments' names, for the Review step. */
export function selectedSegmentNames(args) {
  return segmentPickerRows({ ...args, readOnly: true }).map((row) => row.name || fallbackName(row.id));
}

const contactCountLabel = (count) => {
  if (count === null || count === undefined || count === "") return null;
  const number = Number(count);
  if (!Number.isFinite(number)) return null;
  return `${new Intl.NumberFormat().format(number)} ${number === 1 ? "contact" : "contacts"}`;
};

export default function BroadcastSegmentPicker({ state, selectedIds = [], savedSegments = [], readOnly, error, onToggle, onRetry }) {
  const [search, setSearch] = useState("");
  const options = state?.rows || [];
  const loaded = !state?.loading && !state?.error;

  const rows = useMemo(
    () => segmentPickerRows({ options, selectedIds, savedSegments, loaded, readOnly }),
    [options, selectedIds, savedSegments, loaded, readOnly],
  );
  const term = search.trim().toLowerCase();
  const visible = term ? rows.filter((row) => (row.name || "").toLowerCase().includes(term)) : rows;

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, borderColor: error ? "error.main" : "#E7ECEF" }}>
      <Typography variant="h6" sx={{ fontWeight: 800, color: "#1B2A4A", mb: 1 }}>Segments</Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        {readOnly ? "The segments this broadcast goes to." : "Choose the segments this broadcast should be sent to."}
      </Typography>

      {!readOnly && state?.error && (
        <Alert severity="error" sx={{ mb: 2 }} action={<Button color="inherit" size="small" onClick={onRetry}>Retry</Button>}>
          {state.error}
        </Alert>
      )}

      {!readOnly && rows.length >= SEARCH_FROM && (
        <TextField
          size="small"
          fullWidth
          label="Search segments"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          sx={{ mb: 2 }}
        />
      )}

      {state?.loading && !rows.length ? (
        <Stack spacing={1} aria-label="Loading segments">
          {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} height={46} />)}
        </Stack>
      ) : (
        <FormControl component="fieldset" fullWidth disabled={readOnly} error={Boolean(error)}>
          <FormGroup>
            <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "repeat(2, minmax(0, 1fr))" } }}>
              {visible.map((row) => {
                const checked = selectedIds.includes(row.id);
                const count = contactCountLabel(row.contact_count);
                return (
                  <Box key={row.id} sx={{ minWidth: 0 }}>
                    <Paper variant="outlined" sx={{ p: 1.5, height: "100%", boxSizing: "border-box", borderRadius: 2, borderColor: row.unavailable ? "warning.main" : checked ? "#0f766e" : "#E7ECEF" }}>
                      <FormControlLabel
                        sx={{ width: "100%", m: 0, alignItems: "flex-start", "& .MuiFormControlLabel-label": { minWidth: 0 } }}
                        control={<Checkbox checked={checked} onChange={() => onToggle(row.id)} sx={{ mt: -0.5 }} />}
                        label={(
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontWeight: 800, overflowWrap: "anywhere" }}>{row.name || fallbackName(row.id)}</Typography>
                            {row.description && <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>{row.description}</Typography>}
                            {row.unavailable ? (
                              <Typography variant="body2" color="warning.dark">No longer available in Mautic. Untick it or publish it again.</Typography>
                            ) : (
                              <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mt: 0.5 }}>
                                {row.is_dynamic !== undefined && <Chip size="small" variant="outlined" label={row.is_dynamic ? "Dynamic" : "Static"} />}
                                {count && <Chip size="small" variant="outlined" label={count} />}
                              </Stack>
                            )}
                          </Box>
                        )}
                      />
                    </Paper>
                  </Box>
                );
              })}
            </Box>
          </FormGroup>
          {error && <FormHelperText>{error}</FormHelperText>}
          {!state?.loading && !state?.error && rows.length === 0 && (
            <FormHelperText>No published segments found. Create one under Segments first.</FormHelperText>
          )}
          {term && rows.length > 0 && visible.length === 0 && (
            <FormHelperText>No segments match your search.</FormHelperText>
          )}
        </FormControl>
      )}
    </Paper>
  );
}
