// Mautic categories (not Subscription Lists): organise emails, landing pages,
// forms, campaigns, segments and assets. The Subscription List category is
// listed but managed by ECP. As in Mautic, a category that items use cannot be
// deleted; one that only contacts' email preferences refer to is deleted after
// the admin confirms.

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
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Skeleton,
  Snackbar,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";

import {
  createMauticCategory,
  deleteMauticCategory,
  listMauticCategories,
  updateMauticCategory,
} from "../services/newsletterService";

const NAVY = "#1B2A4A";
const BORDER = "#E7ECEF";
export const CATEGORY_TYPES = [
  ["email", "Emails"],
  ["page", "Landing Pages"],
  ["form", "Forms"],
  ["campaign", "Campaigns"],
  ["segment", "Segments"],
  ["asset", "Assets"],
  ["plugin:focus", "Focus Items"],
  ["global", "Global (every type)"],
];
const typeLabel = (bundle) => CATEGORY_TYPES.find(([key]) => key === bundle)?.[1] || bundle || "";
const HEX = /^[0-9a-fA-F]{6}$/;
const errorText = (err, fallback) => err?.response?.data?.detail || err?.message || fallback;

export const usageText = (usage) => {
  if (!usage) return "Unknown";
  const parts = [];
  if (usage.items) parts.push(`${usage.items} item${usage.items === 1 ? "" : "s"}`);
  if (usage.contact_preferences) parts.push(`${usage.contact_preferences} contact preference${usage.contact_preferences === 1 ? "" : "s"}`);
  return parts.join(" · ") || "Not used";
};
// Types arrive plural ("segments"); one item reads "1 segment".
const usageDetail = (usage) => (usage?.by_type || [])
  .map((entry) => `${entry.count} ${entry.count === 1 ? entry.type.replace(/s$/, "") : entry.type}`).join(", ");

function Swatch({ color }) {
  return (
    <Box component="span" aria-hidden sx={{ display: "inline-block", width: 12, height: 12, borderRadius: "50%", mr: 1, flexShrink: 0,
      bgcolor: color ? `#${color}` : "transparent", border: color ? "none" : "1px solid #C5CED6" }} />
  );
}

const blankForm = { title: "", bundle: "email", description: "", color: "", isPublished: true };

export function CategoryFormDialog({ open, category, busy, error, onClose, onSubmit }) {
  const [form, setForm] = useState(blankForm);
  useEffect(() => {
    if (!open) return;
    setForm(category
      ? { title: category.title, bundle: category.bundle, description: category.description || "", color: category.color || "",
        isPublished: category.isPublished !== false }
      : blankForm);
  }, [open, category]);
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const colorProblem = form.color && !HEX.test(form.color) ? "Use 6 hex digits, such as 4E5D9D." : "";
  const isEdit = Boolean(category);
  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? "Edit Category" : "New Category"}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField autoFocus label="Title" value={form.title} onChange={(event) => update("title", event.target.value)}
            inputProps={{ maxLength: 191 }} required fullWidth />
          <TextField select label="Used for" value={form.bundle} onChange={(event) => update("bundle", event.target.value)}
            disabled={isEdit} helperText={isEdit ? "A category keeps its type." : "Global categories show in every picker."} fullWidth>
            {CATEGORY_TYPES.map(([key, label]) => <MenuItem key={key} value={key}>{label}</MenuItem>)}
          </TextField>
          <TextField label="Description" value={form.description} onChange={(event) => update("description", event.target.value)}
            multiline minRows={2} inputProps={{ maxLength: 2000 }} fullWidth />
          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <TextField label="Colour" value={form.color} placeholder="4E5D9D"
              onChange={(event) => update("color", event.target.value.replace(/^#/, "").slice(0, 6))}
              error={Boolean(colorProblem)} helperText={colorProblem || "Optional, shown beside the category."} sx={{ flex: 1 }} />
            <Box component="input" type="color" aria-label="Pick a colour" value={HEX.test(form.color) ? `#${form.color}` : "#4E5D9D"}
              onChange={(event) => update("color", event.target.value.replace(/^#/, "").toUpperCase())}
              sx={{ width: 48, height: 40, p: 0, border: `1px solid ${BORDER}`, borderRadius: 1, cursor: "pointer", bgcolor: "transparent" }} />
          </Stack>
          <FormControlLabel control={<Switch checked={form.isPublished} onChange={(event) => update("isPublished", event.target.checked)} />}
            label="Published: offered in category pickers" />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="contained" disabled={busy || !form.title.trim() || Boolean(colorProblem)}
          onClick={() => onSubmit(isEdit
            ? { title: form.title.trim(), description: form.description, color: form.color, isPublished: form.isPublished }
            : { ...form, title: form.title.trim() })}>
          {busy ? <CircularProgress size={20} color="inherit" /> : isEdit ? "Save" : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function DeleteCategoryDialog({ open, category, busy, error, usage, onClose, onConfirm }) {
  const [understood, setUnderstood] = useState(false);
  useEffect(() => {
    if (open) setUnderstood(false);
  }, [open, category]);
  const current = usage || category?.usage;
  const inUse = Boolean(current?.items);
  const preferencesOnly = !inUse && Boolean(current?.contact_preferences);
  const unknown = !current;
  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Delete Category</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <Typography>Delete the {typeLabel(category?.bundle).toLowerCase()} category "{category?.title || ""}"?</Typography>
          {unknown ? (
            <Alert severity="warning">Mautic could not say where this category is used. Refresh and try again.</Alert>
          ) : inUse ? (
            <Alert severity="warning">
              It is used by {usageDetail(current) || usageText(current)}, so it can't be deleted. Choose another category for those
              items first.
            </Alert>
          ) : preferencesOnly ? (
            <>
              <Alert severity="warning">
                {current.contact_preferences} contact{current.contact_preferences === 1 ? " has" : "s have"} email preferences for
                this category. Deleting it removes them.
              </Alert>
              <FormControlLabel control={<Checkbox checked={understood} onChange={(event) => setUnderstood(event.target.checked)} />}
                label="I understand; delete it anyway" />
            </>
          ) : (
            <Alert severity="info" variant="outlined">Nothing uses this category.</Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>Cancel</Button>
        <Button color="error" variant="contained" onClick={() => onConfirm(preferencesOnly)}
          disabled={busy || unknown || inUse || (preferencesOnly && !understood)}>
          {busy ? <CircularProgress size={20} color="inherit" /> : "Delete"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function AdminNewsletterMauticCategoriesPage() {
  const [state, setState] = useState({ loading: true, rows: [], error: "", usageAvailable: true });
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ open: false, category: null, busy: false, error: "" });
  const [removal, setRemoval] = useState({ open: false, category: null, busy: false, error: "", usage: null });
  const [snack, setSnack] = useState("");

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const data = await listMauticCategories();
      setState({ loading: false, rows: Array.isArray(data?.results) ? data.results : [], error: "", usageAvailable: data?.usage_available !== false });
    } catch (err) {
      setState({ loading: false, rows: [], error: errorText(err, "Categories could not be loaded."), usageAvailable: true });
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return state.rows.filter((row) => (typeFilter === "all" || row.bundle === typeFilter)
      && (!query || `${row.title} ${row.description}`.toLowerCase().includes(query)));
  }, [state.rows, typeFilter, search]);

  const save = async (payload) => {
    setForm((current) => ({ ...current, busy: true, error: "" }));
    try {
      if (form.category) await updateMauticCategory(form.category.id, payload);
      else await createMauticCategory(payload);
      setForm({ open: false, category: null, busy: false, error: "" });
      setSnack(form.category ? "Category saved." : "Category created.");
      load();
    } catch (err) {
      setForm((current) => ({ ...current, busy: false, error: errorText(err, "The category could not be saved.") }));
    }
  };

  const remove = async (confirmPreferences) => {
    setRemoval((current) => ({ ...current, busy: true, error: "" }));
    try {
      await deleteMauticCategory(removal.category.id, { confirm: confirmPreferences });
      setRemoval({ open: false, category: null, busy: false, error: "", usage: null });
      setSnack("Category deleted.");
      load();
    } catch (err) {
      const data = err?.response?.data;
      // It came into use after the list loaded: show where, ask again.
      setRemoval((current) => ({ ...current, busy: false, error: errorText(err, "The category could not be deleted."),
        usage: data?.usage || current.usage }));
    }
  };

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }} spacing={2}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 850, color: NAVY, mb: 0.5 }}>Categories</Typography>
          <Typography color="text.secondary">
            Mautic categories organise emails, landing pages, forms, campaigns, segments and assets. They are not Subscription Lists.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ flexShrink: 0, "& .MuiButton-root": { whiteSpace: "nowrap" } }}>
          <Button startIcon={<RefreshRoundedIcon />} onClick={load} disabled={state.loading} sx={{ textTransform: "none" }}>Refresh</Button>
          <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setForm({ open: true, category: null, busy: false, error: "" })}
            sx={{ textTransform: "none", bgcolor: "#0f766e", "&:hover": { bgcolor: "#0d6259" } }}>
            New Category
          </Button>
        </Stack>
      </Stack>

      <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: BORDER, p: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <TextField size="small" label="Search categories" value={search} onChange={(event) => setSearch(event.target.value)} sx={{ flex: 1 }} />
          <TextField select size="small" label="Type" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} sx={{ minWidth: 200 }}>
            <MenuItem value="all">All types</MenuItem>
            {CATEGORY_TYPES.map(([key, label]) => <MenuItem key={key} value={key}>{label}</MenuItem>)}
          </TextField>
        </Stack>
      </Paper>

      {!state.usageAvailable && (
        <Alert severity="warning">Mautic could not report where categories are used or whether they are published.</Alert>
      )}

      <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: BORDER, overflow: "hidden" }}>
        {state.loading ? (
          <Box sx={{ p: 3 }}><Stack spacing={1}>{[0, 1, 2, 3].map((n) => <Skeleton key={n} height={44} />)}</Stack></Box>
        ) : state.error ? (
          <Box sx={{ p: 3 }}><Alert severity="error" action={<Button color="inherit" size="small" onClick={load}>Retry</Button>}>{state.error}</Alert></Box>
        ) : rows.length === 0 ? (
          <Box sx={{ p: 3 }}>
            <Alert severity="info" variant="outlined">
              {state.rows.length ? "No category matches these filters." : "No categories yet. Create one to start organising your marketing items."}
            </Alert>
          </Box>
        ) : (
          <TableContainer sx={{ overflowX: "auto" }}>
            <Table aria-label="Categories" sx={{ minWidth: { xs: 0, md: 760 } }}>
              <TableHead>
                <TableRow sx={{ bgcolor: "#F6F8FA" }}>
                  <TableCell>Category</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Used by</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow hover key={row.id}>
                    <TableCell>
                      <Stack direction="row" alignItems="center">
                        <Swatch color={row.color} />
                        <Typography sx={{ fontWeight: 800, color: NAVY }}>{row.title}</Typography>
                      </Stack>
                      {row.description && <Typography variant="body2" color="text.secondary">{row.description}</Typography>}
                    </TableCell>
                    <TableCell>{typeLabel(row.bundle)}</TableCell>
                    <TableCell>
                      {row.isPublished === null || row.isPublished === undefined ? "-" : (
                        <Chip size="small" label={row.isPublished ? "Published" : "Unpublished"} color={row.isPublished ? "success" : "default"}
                          variant={row.isPublished ? "filled" : "outlined"} />
                      )}
                    </TableCell>
                    <TableCell>
                      <Tooltip title={usageDetail(row.usage) || ""}>
                        <span>{usageText(row.usage)}</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                      {row.protected ? (
                        <Tooltip title="Marks Subscription List segments, which gate consent-based email.">
                          <Chip size="small" icon={<LockRoundedIcon />} label="Managed by ECP" />
                        </Tooltip>
                      ) : (
                        <>
                          <Tooltip title="Edit category">
                            <IconButton aria-label={`Edit ${row.title}`} onClick={() => setForm({ open: true, category: row, busy: false, error: "" })}>
                              <EditRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete category">
                            <IconButton aria-label={`Delete ${row.title}`} color="error"
                              onClick={() => setRemoval({ open: true, category: row, busy: false, error: "", usage: null })}>
                              <DeleteRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <CategoryFormDialog open={form.open} category={form.category} busy={form.busy} error={form.error}
        onClose={() => setForm({ open: false, category: null, busy: false, error: "" })} onSubmit={save} />
      <DeleteCategoryDialog open={removal.open} category={removal.category} busy={removal.busy} error={removal.error} usage={removal.usage}
        onClose={() => setRemoval({ open: false, category: null, busy: false, error: "", usage: null })} onConfirm={remove} />
      <Snackbar open={Boolean(snack)} autoHideDuration={3500} onClose={() => setSnack("")}>
        <Alert severity="success" variant="filled" onClose={() => setSnack("")}>{snack}</Alert>
      </Snackbar>
    </Stack>
  );
}
