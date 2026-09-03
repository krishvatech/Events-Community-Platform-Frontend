import React, { useState, useCallback } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Skeleton,
  Snackbar,
  Stack,
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
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import {
  listNewsletterCategoriesAdmin,
  createNewsletterCategory,
  updateNewsletterCategory,
  deleteNewsletterCategory,
} from "../services/newsletterService";

const getErrorMessage = (err, fallback = "Something went wrong") => {
  const data = err?.response?.data;
  if (!data) return err?.message || fallback;
  if (typeof data === "string") return data;
  if (data.detail) return data.detail;
  if (data.error) return data.error;
  const firstKey = Object.keys(data)[0];
  const firstValue = firstKey ? data[firstKey] : null;
  if (Array.isArray(firstValue)) return `${firstKey}: ${firstValue.join(", ")}`;
  if (firstValue) return `${firstKey}: ${firstValue}`;
  return fallback;
};

const blankForm = {
  name: "",
  description: "",
};

export default function AdminNewsletterCategoriesTab({ onDataReady }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blankForm);
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState({ open: false, severity: "success", message: "" });
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listNewsletterCategoriesAdmin();
      setCategories(Array.isArray(data) ? data : data?.results || []);
      onDataReady?.();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load categories"));
    } finally {
      setLoading(false);
    }
  }, [onDataReady]);

  React.useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleOpen = (category = null) => {
    if (category) {
      setEditing(category.slug);
      setForm({
        name: category.name,
        description: category.description,
      });
    } else {
      setEditing(null);
      setForm(blankForm);
    }
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setSnack({ open: true, severity: "error", message: "Category name is required" });
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await updateNewsletterCategory(editing, {
          name: form.name.trim(),
          description: form.description.trim(),
        });
        setSnack({ open: true, severity: "success", message: "Category updated" });
      } else {
        await createNewsletterCategory({
          name: form.name.trim(),
          description: form.description.trim(),
        });
        setSnack({ open: true, severity: "success", message: "Category created" });
      }
      setOpen(false);
      loadCategories();
    } catch (err) {
      setSnack({ open: true, severity: "error", message: getErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (slug) => {
    setSaving(true);
    try {
      await deleteNewsletterCategory(slug);
      setSnack({ open: true, severity: "success", message: "Category deleted" });
      setDeleteConfirm(null);
      loadCategories();
    } catch (err) {
      setSnack({ open: true, severity: "error", message: getErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={3}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#2C3E5A" }}>
            Newsletter Categories
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage newsletter subscriptions that users can opt into
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Refresh">
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshRoundedIcon />}
              onClick={loadCategories}
              disabled={loading}
              sx={{ textTransform: "none" }}
            >
              Refresh
            </Button>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={() => handleOpen()}
            disabled={loading}
            sx={{ textTransform: "none" }}
          >
            Create Category
          </Button>
        </Stack>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <Box>
          <Stack spacing={1}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} height={60} variant="rectangular" sx={{ borderRadius: 1 }} />
            ))}
          </Stack>
        </Box>
      )}

      {/* Empty State */}
      {!loading && categories.length === 0 && (
        <Paper variant="outlined" sx={{ p: 3, textAlign: "center", borderRadius: 2, borderColor: "#F0EEEB" }}>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            No newsletter categories yet
          </Typography>
          <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => handleOpen()}>
            Create the first category
          </Button>
        </Paper>
      )}

      {/* Table */}
      {!loading && categories.length > 0 && (
        <TableContainer component={Paper} sx={{ borderRadius: 2, borderColor: "#F0EEEB", overflow: "hidden" }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: "#f3f4f6" }}>
                <TableCell sx={{ fontWeight: 700 }}>Category Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Slug</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">
                  Status
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.slug} sx={{ "&:hover": { bgcolor: "#fafafa" } }}>
                  <TableCell sx={{ fontWeight: 700, color: "#1B2A4A" }}>{category.name}</TableCell>
                  <TableCell>
                    <code style={{ fontSize: "12px", color: "#666" }}>{category.slug}</code>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 300, color: "#555" }}>
                    <Typography variant="body2" sx={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {category.description || "-"}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={category.is_active ? "Active" : "Inactive"}
                      color={category.is_active ? "success" : "default"}
                      size="small"
                      variant="filled"
                      sx={{ fontWeight: 700 }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit category">
                      <IconButton
                        size="small"
                        onClick={() => handleOpen(category)}
                        disabled={saving}
                        sx={{ color: "#10b8a6" }}
                      >
                        <EditRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete category">
                      <IconButton
                        size="small"
                        onClick={() => setDeleteConfirm(category.slug)}
                        disabled={saving}
                        sx={{ color: "#dc2626" }}
                      >
                        <DeleteRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create/Edit Dialog */}
      <Dialog
        open={open}
        onClose={() => !saving && setOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, color: "#1B2A4A" }}>
          {editing ? "Edit Category" : "Create New Category"}
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 3 }}>
          <Stack spacing={2.5}>
            <TextField
              label="Category Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., IMAA Events"
              fullWidth
              required
              disabled={saving}
              autoFocus
              size="small"
            />
            <TextField
              label="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What is this newsletter about?"
              multiline
              rows={4}
              fullWidth
              disabled={saving}
              size="small"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={saving || !form.name.trim()}
            sx={{
              background: "linear-gradient(135deg, #10b8a6 0%, #0ea5a4 100%)",
            }}
          >
            {saving ? <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> : null}
            {editing ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={Boolean(deleteConfirm)} onClose={() => !saving && setDeleteConfirm(null)}>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Category?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            Are you sure you want to delete this category? Users will no longer be able to subscribe to it.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteConfirm(null)} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={() => handleDelete(deleteConfirm)}
            variant="contained"
            color="error"
            disabled={saving}
          >
            {saving ? <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> : null}
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack({ ...snack, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnack({ ...snack, open: false })}
          severity={snack.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
