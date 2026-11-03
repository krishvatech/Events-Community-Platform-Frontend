// Picks a Mautic category for one item type, as Mautic's own pickers do:
// published categories of that type plus global ones. The Subscription List
// category is never offered. A category the item already has but that is no
// longer offered (unpublished or deleted) stays visible so saving keeps it
// unless the admin changes it.

import React, { useEffect, useState } from "react";
import { Box, MenuItem, TextField } from "@mui/material";

import { listMauticCategories } from "../../services/newsletterService";

export const categoryLabel = (category) => (category ? `${category.title}${category.bundle === "global" ? " (global)" : ""}` : "");

function Swatch({ color }) {
  return (
    <Box component="span" aria-hidden sx={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", mr: 1,
      bgcolor: color ? `#${color}` : "transparent", border: color ? "none" : "1px solid #C5CED6", flexShrink: 0 }} />
  );
}

export default function MauticCategoryPicker({ bundle, value, current, onChange, disabled = false, label = "Category", helperText }) {
  const [state, setState] = useState({ loading: true, options: [], error: "" });

  useEffect(() => {
    let active = true;
    setState({ loading: true, options: [], error: "" });
    listMauticCategories({ bundle })
      .then((data) => active && setState({ loading: false, options: Array.isArray(data?.results) ? data.results : [], error: "" }))
      .catch(() => active && setState({ loading: false, options: [], error: "Categories could not be loaded." }));
    return () => {
      active = false;
    };
  }, [bundle]);

  const selected = value ? String(value) : "";
  const offered = state.options.some((option) => String(option.id) === selected);
  return (
    <TextField
      select
      label={label}
      value={state.loading && selected && !offered ? "" : selected}
      onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}
      disabled={disabled || state.loading}
      error={Boolean(state.error)}
      helperText={state.error || helperText}
      fullWidth
      SelectProps={{ displayEmpty: true }}
      InputLabelProps={{ shrink: true }}
    >
      <MenuItem value="">No category</MenuItem>
      {selected && !offered && !state.loading && (
        <MenuItem value={selected}>{current?.title ? `${current.title} (unavailable)` : `Category #${selected} (unavailable)`}</MenuItem>
      )}
      {state.options.map((option) => (
        <MenuItem key={option.id} value={String(option.id)}>
          <Swatch color={option.color} />
          {categoryLabel(option)}
        </MenuItem>
      ))}
    </TextField>
  );
}
