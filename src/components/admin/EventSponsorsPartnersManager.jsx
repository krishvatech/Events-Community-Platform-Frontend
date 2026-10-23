import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, FormControl, InputLabel, MenuItem,
  Paper, Select, Stack, TextField, Typography,
} from "@mui/material";
import { getAccessToken } from "../../utils/tokenStore";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");
const blankSupporter = { name: "", kind: "sponsor", category: "", website_url: "", display_order: 0, logo: null };
const blankCategory = { kind: "sponsor", name: "", display_order: 0, is_active: true };

async function api(path, method = "GET", body = null) {
  const token = getAccessToken();
  const isForm = body instanceof FormData;
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(!isForm && body !== null ? { "Content-Type": "application/json" } : {}),
    },
    ...(body !== null ? { body: isForm ? body : JSON.stringify(body) } : {}),
  });
  if (!response.ok) {
    let details;
    try { details = await response.json(); } catch { details = null; }
    const validation = details && typeof details === "object" ? Object.values(details).flat().join(" ") : "";
    throw new Error(validation || details?.detail || `Request failed (${response.status})`);
  }
  return response.status === 204 ? null : response.json();
}

/** Event-specific CRUD plus superuser-only shared sponsor/partner type management. */
export default function EventSponsorsPartnersManager({ eventId, canManageTypes = false }) {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [supporterOpen, setSupporterOpen] = useState(false);
  const [editingSupporter, setEditingSupporter] = useState(null);
  const [supporter, setSupporter] = useState(blankSupporter);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [category, setCategory] = useState(blankCategory);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const deletionInProgress = useRef(false);

  const reload = useCallback(async () => {
    if (!eventId) return;
    const [logoRows, typeRows] = await Promise.all([
      api(`/events/${eventId}/supporters/`),
      api("/events/supporter-categories/"),
    ]);
    setItems(Array.isArray(logoRows) ? logoRows : []);
    setCategories(Array.isArray(typeRows) ? typeRows : []);
  }, [eventId]);

  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([api(`/events/${eventId}/supporters/`), api("/events/supporter-categories/")])
      .then(([rows, types]) => { if (!cancelled) { setItems(rows); setCategories(types); } })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [eventId]);

  const availableCategories = useMemo(
    () => categories.filter((c) => c.kind === supporter.kind && (c.is_active || c.id === Number(supporter.category))),
    [categories, supporter.kind, supporter.category],
  );

  const openAdd = () => {
    setEditingSupporter(null);
    setSupporter(blankSupporter);
    setError("");
    setSupporterOpen(true);
  };
  const openEdit = (item) => {
    setEditingSupporter(item);
    setSupporter({ name: item.name, kind: item.kind, category: item.category, website_url: item.website_url || "", display_order: item.display_order || 0, logo: null });
    setError("");
    setSupporterOpen(true);
  };

  const saveSupporter = async () => {
    if (!supporter.name.trim() || !supporter.category || (!editingSupporter && !supporter.logo)) {
      setError("Name, category, and a logo are required for a new entry.");
      return;
    }
    setSaving(true); setError("");
    try {
      const body = new FormData();
      body.append("name", supporter.name.trim());
      body.append("category", supporter.category);
      body.append("website_url", supporter.website_url.trim());
      body.append("display_order", String(Number(supporter.display_order) || 0));
      if (supporter.logo) body.append("logo", supporter.logo);
      await api(
        editingSupporter ? `/events/${eventId}/supporters/${editingSupporter.id}/` : `/events/${eventId}/supporters/`,
        editingSupporter ? "PATCH" : "POST", body,
      );
      await reload();
      setSupporterOpen(false);
      setMessage(editingSupporter ? "Logo entry updated." : "Logo entry added.");
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const openDeleteDialog = (kind, item) => {
    setError("");
    setMessage("");
    setDeleteError("");
    setDeleteTarget({ kind, item });
  };

  const closeDeleteDialog = () => {
    if (!deletionInProgress.current) {
      setDeleteTarget(null);
      setDeleteError("");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || deletionInProgress.current) return;
    deletionInProgress.current = true;
    setDeleting(true);
    setDeleteError("");
    const { kind, item } = deleteTarget;
    const path = kind === "supporter"
      ? `/events/${eventId}/supporters/${item.id}/`
      : `/events/supporter-categories/${item.id}/`;
    try {
      await api(path, "DELETE");
      // Close only after the server confirms deletion; prevent stale entries if refresh fails.
      if (kind === "supporter") {
        setItems((current) => current.filter((row) => row.id !== item.id));
      } else {
        setCategories((current) => current.filter((row) => row.id !== item.id));
      }
      setDeleteTarget(null);
      setMessage(kind === "supporter" ? "Logo entry removed." : "Category deleted.");
      try {
        await reload();
      } catch (err) {
        setError(`Deleted successfully, but the list could not refresh: ${err.message}`);
      }
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      deletionInProgress.current = false;
      setDeleting(false);
    }
  };

  const openCategory = (type = null) => {
    setEditingCategory(type);
    setCategory(type ? { kind: type.kind, name: type.name, display_order: type.display_order, is_active: type.is_active } : blankCategory);
    setError(""); setCategoryOpen(true);
  };
  const saveCategory = async () => {
    if (!category.name.trim()) { setError("Category name is required."); return; }
    setSaving(true); setError("");
    try {
      await api(editingCategory ? `/events/supporter-categories/${editingCategory.id}/` : "/events/supporter-categories/",
        editingCategory ? "PATCH" : "POST", { ...category, name: category.name.trim(), display_order: Number(category.display_order) || 0 });
      await reload(); setCategoryOpen(false); setMessage("Category saved.");
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  if (!eventId) return null;
  if (loading) return <Box sx={{ p: 4, textAlign: "center" }}><CircularProgress size={24} /></Box>;

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "start", sm: "center" }} spacing={1} sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>Sponsors &amp; Partners</Typography>
          <Typography variant="body2" color="text.secondary">Upload and categorize logos displayed on this event's detail page.</Typography>
        </Box>
        <Button variant="contained" onClick={openAdd} disabled={!categories.some((c) => c.is_active)}>Add sponsor / partner</Button>
      </Stack>
      {!!message && <Alert severity="success" onClose={() => setMessage("")} sx={{ mb: 2 }}>{message}</Alert>}
      {!!error && <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>{error}</Alert>}
      {!categories.some((c) => c.is_active) && <Alert severity="info" sx={{ mb: 2 }}>Create sponsor and partner category types first. A superuser can manage types below.</Alert>}
      {items.length === 0 ? <Typography color="text.secondary" sx={{ py: 3 }}>No sponsors or partners assigned to this event yet.</Typography> : (
        <Stack spacing={1.5}>
          {items.map((item) => (
            <Box key={item.id} sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center", border: "1px solid", borderColor: "divider", borderRadius: 2, p: 1.5 }}>
              <Box component="img" src={item.logo_url} alt={`${item.name} logo`} sx={{ width: 100, height: 56, objectFit: "contain" }} />
              <Box sx={{ flex: 1, minWidth: 140 }}>
                <Typography fontWeight={600}>{item.name}</Typography>
                <Chip size="small" label={`${item.kind === "sponsor" ? "Sponsor" : "Partner"} · ${item.category_name}`} />
              </Box>
              <Button onClick={() => openEdit(item)}>Edit</Button>
              <Button color="error" onClick={() => openDeleteDialog("supporter", item)}>Delete</Button>
            </Box>
          ))}
        </Stack>
      )}
      {canManageTypes && (
        <Box sx={{ mt: 4 }}>
          <Divider sx={{ mb: 2 }} />
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="h6">Sponsor / Partner Types</Typography>
            <Button onClick={() => openCategory()}>Add Type</Button>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Types are shared across events. Only platform superusers can change them.</Typography>
          <Stack spacing={1}>
            {categories.map((type) => (
              <Box key={type.id} sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.5 }}>
                <Typography sx={{ flex: 1 }}>{type.name} <Typography component="span" color="text.secondary" variant="caption">({type.kind}{type.is_active ? "" : ", inactive"})</Typography></Typography>
                <Button size="small" onClick={() => openCategory(type)}>Edit</Button>
                <Button size="small" color="error" onClick={() => openDeleteDialog("category", type)}>Delete</Button>
              </Box>
            ))}
          </Stack>
        </Box>
      )}

      {/* Use the same MUI confirmation style as other event-management delete dialogs. */}
      <Dialog
        open={Boolean(deleteTarget)}
        onClose={deleting ? undefined : closeDeleteDialog}
        maxWidth="xs"
        fullWidth
        aria-labelledby="supporter-delete-dialog-title"
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle id="supporter-delete-dialog-title" sx={{ fontWeight: 700 }}>
          {deleteTarget?.kind === "category" ? "Delete Sponsor / Partner Type?" : "Remove Sponsor / Partner?"}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            {deleteError && <Alert severity="error">{deleteError}</Alert>}
            <Typography>
              {deleteTarget?.kind === "category" ? "Delete category " : "Remove "}
              <Box component="span" sx={{ fontWeight: 700 }}>{deleteTarget?.item.name}</Box>
              {deleteTarget?.kind === "category" ? "?" : " from this event?"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {deleteTarget?.kind === "category"
                ? "This type is shared across all events. Categories assigned to any sponsor or partner cannot be deleted until those entries are reassigned."
                : "Its logo will no longer appear on this event's detail page. This does not affect other event records."}
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={closeDeleteDialog} disabled={deleting} sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={confirmDelete}
            disabled={deleting}
            sx={{ textTransform: "none", borderRadius: 2, fontWeight: 600 }}
          >
            {deleting ? <CircularProgress size={20} color="inherit" /> : deleteTarget?.kind === "category" ? "Delete Type" : "Remove"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={supporterOpen} onClose={saving ? undefined : () => setSupporterOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingSupporter ? "Edit" : "Add"} sponsor / partner</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField required label="Organization name" value={supporter.name} onChange={(e) => setSupporter({ ...supporter, name: e.target.value })} inputProps={{ maxLength: 200 }} />
            <FormControl fullWidth><InputLabel>Type</InputLabel><Select label="Type" value={supporter.kind} onChange={(e) => setSupporter({ ...supporter, kind: e.target.value, category: "" })}>
              <MenuItem value="sponsor">Sponsor</MenuItem><MenuItem value="partner">Partner</MenuItem>
            </Select></FormControl>
            <FormControl fullWidth required><InputLabel>Category</InputLabel><Select label="Category" value={supporter.category} onChange={(e) => setSupporter({ ...supporter, category: e.target.value })}>
              {availableCategories.map((type) => <MenuItem key={type.id} value={type.id}>{type.name}</MenuItem>)}
            </Select></FormControl>
            <TextField label="Website URL (optional)" placeholder="https://example.com" value={supporter.website_url} onChange={(e) => setSupporter({ ...supporter, website_url: e.target.value })} />
            <TextField label="Display order" type="number" inputProps={{ min: 0 }} value={supporter.display_order} onChange={(e) => setSupporter({ ...supporter, display_order: e.target.value })} />
            <Button component="label" variant="outlined">{supporter.logo ? supporter.logo.name : editingSupporter ? "Replace logo (optional)" : "Upload logo (required)"}
              <input type="file" hidden accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => setSupporter({ ...supporter, logo: e.target.files?.[0] || null })} />
            </Button>
            <Typography variant="caption" color="text.secondary">PNG, JPEG, WebP or GIF, maximum 5 MB. SVG is not supported.</Typography>
            {!!error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => setSupporterOpen(false)} disabled={saving}>Cancel</Button><Button variant="contained" onClick={saveSupporter} disabled={saving}>{saving ? "Saving…" : "Save"}</Button></DialogActions>
      </Dialog>

      <Dialog open={categoryOpen} onClose={saving ? undefined : () => setCategoryOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{editingCategory ? "Edit type" : "Add type"}</DialogTitle>
        <DialogContent><Stack spacing={2} sx={{ mt: 1 }}>
          <FormControl fullWidth><InputLabel>Type</InputLabel><Select label="Type" value={category.kind} onChange={(e) => setCategory({ ...category, kind: e.target.value })}>
            <MenuItem value="sponsor">Sponsor</MenuItem><MenuItem value="partner">Partner</MenuItem>
          </Select></FormControl>
          <TextField required label="Category name" value={category.name} inputProps={{ maxLength: 100 }} onChange={(e) => setCategory({ ...category, name: e.target.value })} />
          <TextField type="number" label="Display order" value={category.display_order} inputProps={{ min: 0 }} onChange={(e) => setCategory({ ...category, display_order: e.target.value })} />
          <FormControl fullWidth><InputLabel>Status</InputLabel><Select label="Status" value={category.is_active ? "active" : "inactive"} onChange={(e) => setCategory({ ...category, is_active: e.target.value === "active" })}>
            <MenuItem value="active">Active</MenuItem><MenuItem value="inactive">Inactive</MenuItem>
          </Select></FormControl>
          {!!error && <Alert severity="error">{error}</Alert>}
        </Stack></DialogContent>
        <DialogActions><Button onClick={() => setCategoryOpen(false)} disabled={saving}>Cancel</Button><Button variant="contained" onClick={saveCategory} disabled={saving}>{saving ? "Saving…" : "Save"}</Button></DialogActions>
      </Dialog>
    </Paper>
  );
}
