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
  TableHead,
  TableRow,
  TextField,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import AdminEmptyState from "../admin/AdminEmptyState.jsx";
import AdminTableShell from "../admin/AdminTableShell.jsx";
import useDebouncedValue from "../../hooks/useDebouncedValue";
import { totalPagesFor } from "../../services/blogService";
import { blogPrimaryButtonSx } from "./blogTheme";
import { colors, focus, radii, shadows, semanticColors } from "../../styles/designTokens";

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
    <Box sx={{ minWidth: 0 }}>
      <Paper
        component="section"
        aria-label={`${plural} search and actions`}
        variant="outlined"
        sx={{
          p: { xs: 1.5, sm: 2 },
          mb: 2,
          display: "grid",
          gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "minmax(240px, 1fr) auto" },
          gap: 1.5,
          alignItems: "center",
          borderColor: semanticColors.border,
          borderRadius: `${radii.card}px`,
          boxShadow: shadows.sm,
        }}
      >
        <TextField
          size="small"
          label={`Search ${plural.toLowerCase()}`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${plural.toLowerCase()}`}
          inputProps={{ "aria-label": `Search ${plural.toLowerCase()}` }}
          InputProps={{ startAdornment: <SearchRoundedIcon sx={{ mr: 1, color: "var(--imaa-dm-text-hint, #9e9e9e)" }} /> }}
          fullWidth
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: `${radii.field}px` } }}
        />
        <Button
          variant="contained"
          startIcon={<AddRoundedIcon />}
          onClick={openCreate}
          sx={{ width: { xs: "100%", sm: "auto" }, minHeight: 40, ...blogPrimaryButtonSx, borderRadius: `${radii.field}px` }}
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
        <AdminEmptyState
          title={debouncedSearch ? `No ${plural.toLowerCase()} match your search.` : `No ${plural.toLowerCase()} yet.`}
          titleComponent="h2"
          compact
          icon={<SearchRoundedIcon />}
          sx={{ boxShadow: shadows.sm }}
        />
      ) : (
        <AdminTableShell minWidth={560} sx={{ boxShadow: shadows.sm }}>
          <Table size="small" aria-label={plural}>
            <TableHead>
              <TableRow>
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
                    <IconButton
                      size="small"
                      onClick={() => openEdit(row)}
                      aria-label={`Edit ${singular.toLowerCase()} ${row.name}`}
                      sx={{ minWidth: 40, minHeight: 40, borderRadius: `${radii.field}px`, "&:focus-visible": { outline: `${focus.width}px solid ${focus.color}`, outlineOffset: focus.offset } }}
                    >
                      <EditRoundedIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </AdminTableShell>
      )}

      {totalPages > 1 && (
        <Stack sx={{ mt: 2, alignItems: "center", overflowX: "auto", pb: 0.5 }}>
          <Pagination count={totalPages} page={page} onChange={(_e, value) => setPage(value)} color="primary" sx={{ minWidth: "max-content" }} />
        </Stack>
      )}

      <Dialog open={Boolean(dialog)} onClose={closeDialog} maxWidth="xs" fullWidth aria-labelledby="taxonomy-dialog-title" PaperProps={{ sx: { m: 1.5, borderRadius: `${radii.popup}px` } }}>
        <DialogTitle id="taxonomy-dialog-title" sx={{ color: semanticColors.text, fontWeight: 750 }}>{dialog?.id ? `Edit ${singular}` : `New ${singular}`}</DialogTitle>
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
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: `${radii.field}px` } }}
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
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: `${radii.field}px` } }}
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
