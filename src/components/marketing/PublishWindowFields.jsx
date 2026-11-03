// A publish window (publish from / unpublish at) in the admin's own time zone.
// The API takes and returns ISO moments; empty means "no date".

import React from "react";
import { Stack, TextField } from "@mui/material";

const pad = (value) => String(value).padStart(2, "0");

/** An ISO moment as a datetime-local value in this browser's time zone. */
export const toLocalInput = (iso) => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

/** A datetime-local value as an ISO moment, or null when empty or invalid. */
export const fromLocalInput = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

/** "" when fine, else why the window is not valid. */
export const windowProblem = (start, end) => {
  if (start && end && new Date(end).getTime() <= new Date(start).getTime()) return "The unpublish date must be after the publish date.";
  return "";
};

export default function PublishWindowFields({ start, end, onChange, disabled = false, errors = {}, startHelp, endHelp }) {
  const problem = windowProblem(start, end);
  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
      <TextField type="datetime-local" label="Publish from" value={start} disabled={disabled} fullWidth
        onChange={(event) => onChange({ start: event.target.value, end })} InputLabelProps={{ shrink: true }}
        error={Boolean(errors.publishUp)} helperText={errors.publishUp || startHelp || "Optional. Your local time."} />
      <TextField type="datetime-local" label="Unpublish at" value={end} disabled={disabled} fullWidth
        onChange={(event) => onChange({ start, end: event.target.value })} InputLabelProps={{ shrink: true }}
        error={Boolean(errors.publishDown || problem)} helperText={errors.publishDown || problem || endHelp || "Optional. Your local time."} />
    </Stack>
  );
}
