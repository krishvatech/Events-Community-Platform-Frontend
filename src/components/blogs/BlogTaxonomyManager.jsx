import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Pagination,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import useDebouncedValue from "../../hooks/useDebouncedValue";
import { totalPagesFor } from "../../services/blogService";
import { blogPrimaryButtonSx } from "./blogTheme";

/**
 * Lightweight list/create/edit manager for a flat Blog taxonomy (categories or
 * tags). There is deliberately no delete: the backend exposes none, so posts
 * can never lose their terms from here.
 *
 * `api` = { list(params), create(payload), update(id, payload) }
 */
export default function BlogTaxonomyManager({ api, singular, plural, onNotify }) {
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [dialog, setDialog] = useState(null); // { id?, name, slug }
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");

  useEffect(() => setPage(1), [debouncedSearch]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    api
      .list({ page, search: debouncedSearch })
      .then((data) => {
        if (cancelled) return;
        setRows(data.results);
        setCount(data.count);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [api, page, debouncedSearch, reloadKey]);

  const openCreate = () => {
    setFieldErrors({});
    setFormError("");
    setDialog({ name: "", slug: "" });
  };

  const openEdit = (row) => {
    setFieldErrors({});
    setFormError("");
    setDialog({ id: row.id, name: row.name, slug: row.slug });
  };

  const closeDialog = () => {
    if (!saving) setDialog(null);
  };

  const handleSave = useCallback(async () => {
    if (!dialog || saving) return;
    const name = dialog.name.trim();
    const slug = dialog.slug.trim();
    const errors = {};
    if (!name) errors.name = "Name is required.";
    if (dialog.id && !slug) errors.slug = "Slug cannot be blank.";
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      return;
    }
    setSaving(true);
    setFieldErrors({});
    setFormError("");
    try {
      const payload = { name, ...(slug || dialog.id ? { slug } : {}) };
      if (dialog.id) {
        await api.update(dialog.id, payload);
        onNotify?.(`${singular} updated.`, "success");
      } else {
        await api.create(payload);
        onNotify?.(`${singular} created.`, "success");
      }
      setDialog(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setFieldErrors(err.fieldErrors || {});
      if (!err.fieldErrors || !Object.keys(err.fieldErrors).length) setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }, [api, dialog, onNotify, saving, singular]);

  const totalPages = totalPagesFor(count);

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 2, display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
        <TextField
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${plural.toLowerCase()}`}
          inputProps={{ "aria-label": `Search ${plural.toLowerCase()}` }}
          InputProps={{ startAdornment: <SearchRoundedIcon sx={{ mr: 1, color: "grey.500" }} /> }}
          sx={{ minWidth: { xs: "100%", sm: 240 } }}
        />
        <Button
          variant="contained"
          startIcon={<AddRoundedIcon />}
          onClick={openCreate}
          sx={{ ml: { sm: "auto" }, ...blogPrimaryButtonSx }}
        >
          New {singular}
        </Button>
      </Paper>

      {loadError ? (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => setReloadKey((k) => k + 1)}>
              Retry
            </Button>
          }
        >
          {loadError}
        </Alert>
      ) : loading && rows.length === 0 ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress aria-label={`Loading ${plural.toLowerCase()}`} />
        </Box>
      ) : rows.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography color="text.secondary">
            {debouncedSearch ? `No ${plural.toLowerCase()} match your search.` : `No ${plural.toLowerCase()} yet.`}
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2, overflowX: "auto" }}>
          <Table size="small" aria-label={plural}>
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.50" }}>
                <TableCell sx={{ fontWeight: 800 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Slug</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell sx={{ overflowWrap: "anywhere" }}>{row.name}</TableCell>
                  <TableCell sx={{ color: "text.secondary", overflowWrap: "anywhere" }}>{row.slug}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => openEdit(row)} aria-label={`Edit ${singular.toLowerCase()} ${row.name}`}>
                      <EditRoundedIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {totalPages > 1 && (
        <Stack sx={{ mt: 2, alignItems: "center" }}>
          <Pagination count={totalPages} page={page} onChange={(_e, value) => setPage(value)} color="primary" />
        </Stack>
      )}

      <Dialog open={Boolean(dialog)} onClose={closeDialog} maxWidth="xs" fullWidth>
        <DialogTitle>{dialog?.id ? `Edit ${singular}` : `New ${singular}`}</DialogTitle>
        <DialogContent>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <TextField
            autoFocus
            fullWidth
            required
            label="Name"
            margin="dense"
            value={dialog?.name || ""}
            onChange={(e) => setDialog((d) => ({ ...d, name: e.target.value }))}
            error={Boolean(fieldErrors.name)}
            helperText={fieldErrors.name}
            inputProps={{ maxLength: 120 }}
          />
          <TextField
            fullWidth
            label="Slug"
            margin="dense"
            value={dialog?.slug || ""}
            onChange={(e) => setDialog((d) => ({ ...d, slug: e.target.value }))}
            error={Boolean(fieldErrors.slug)}
            helperText={fieldErrors.slug || (dialog?.id ? "" : "Leave blank to generate from the name.")}
            inputProps={{ maxLength: 140 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} sx={blogPrimaryButtonSx}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
