import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";

import { groupMauticTokens } from "./marketingEmailTokens";

/**
 * Explicit Mautic token chooser. Used where typing autocomplete is not
 * available (the visual editor with Mautic syntax) and for HTML fields.
 * Selecting a token only reports it; inserting is the caller's job.
 */
export default function MauticTokenPicker({ open, tokens = [], loading = false, error = "", onRetry, onSelect, onClose }) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const visible = needle
      ? tokens.filter((item) => `${item.label} ${item.token} ${item.group}`.toLowerCase().includes(needle))
      : tokens;
    return Object.entries(groupMauticTokens(visible));
  }, [tokens, query]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Insert Mautic Token</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            Mautic replaces the token with each contact&apos;s own value when the email is sent.
          </Typography>
          {error ? (
            <Alert
              severity="warning"
              action={onRetry ? <Button color="inherit" size="small" onClick={onRetry}>Retry</Button> : null}
            >
              {error}
            </Alert>
          ) : null}
          <TextField
            label="Search tokens"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            size="small"
            fullWidth
            autoFocus
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> }}
          />
          {loading ? (
            <Box sx={{ display: "grid", placeItems: "center", py: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : groups.length === 0 ? (
            <Typography color="text.secondary">{tokens.length ? "No tokens match your search." : "No tokens are available."}</Typography>
          ) : (
            groups.map(([group, items]) => (
              <Box key={group}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                  {group}
                </Typography>
                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                  {items.map((item) => (
                    <Button
                      key={item.token}
                      size="small"
                      variant="outlined"
                      onClick={() => onSelect(item)}
                      title={item.token}
                      sx={{ textTransform: "none" }}
                    >
                      {item.label}
                    </Button>
                  ))}
                </Stack>
              </Box>
            ))
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}
