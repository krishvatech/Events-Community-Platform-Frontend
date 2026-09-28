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
  Divider,
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
import SellRoundedIcon from "@mui/icons-material/SellRounded";

import {
  createNewsletterTag,
  deleteNewsletterTag,
  listNewsletterTagDirectory,
  updateNewsletterTag,
} from "../services/newsletterService";

const asArray = (value) => (Array.isArray(value) ? value : []);

const getErrorMessage = (err, fallback = "Something went wrong. Please try again.") => {
  const data = err?.response?.data;
  if (!data) return err?.message || fallback;
  if (typeof data === "string") return data;
  if (data.detail) return data.detail;
  if (data.error) return data.error;
  return fallback;
};

function TagDialog({ open, tag, onClose, onSaved }) {
  const isEdit = Boolean(tag?.id);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setName(tag?.tag || "");
      setError("");
    }
  }, [open, tag]);

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Tag name is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const saved = isEdit
        ? await updateNewsletterTag(tag.id, { tag: trimmed })
        : await createNewsletterTag({ tag: trimmed });
      onSaved(saved, isEdit);
    } catch (err) {
      setError(getErrorMessage(err, "Mautic rejected the tag."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 850 }}>{isEdit ? "Rename Tag" : "Create Tag"}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          <TextField
            autoFocus
            fullWidth
            size="small"
            label="Tag name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleSubmit();
            }}
            disabled={saving}
            inputProps={{ maxLength: 191 }}
          />
          {!isEdit ? (
            <Typography variant="caption" color="text.secondary">
              Mautic reuses an existing tag if this name already exists. New tags become
              immediately selectable on any contact.
            </Typography>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={saving} sx={{ textTransform: "none" }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
          sx={{ textTransform: "none", bgcolor: "#0f766e", "&:hover": { bgcolor: "#0d6259" } }}
        >
          {isEdit ? "Save" : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function AdminNewsletterTagsPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [dialog, setDialog] = useState({ open: false, tag: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const loadTags = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await listNewsletterTagDirectory({ page, page_size: 25, search }));
    } catch (err) {
      setError(getErrorMessage(err, "Could not load tags from Mautic."));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteNewsletterTag(deleteTarget.id);
      setSnackbar({ open: true, message: "Tag deleted in Mautic.", severity: "success" });
      setDeleteTarget(null);
      loadTags();
    } catch (err) {
      // Mautic refuses to delete a tag that is still applied to contacts.
      setSnackbar({
        open: true,
        message: getErrorMessage(
          err,
          "Mautic refused to delete this tag. It may still be applied to contacts."
        ),
        severity: "error",
      });
    } finally {
      setDeleting(false);
    }
  };

  const tags = asArray(data?.results);
  const numPages = Math.max(1, Number(data?.num_pages || 1));

  return (
    <Stack spacing={2.5}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "center" }}
        spacing={2}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 850, color: "#1B2A4A" }}>
            Tags
          </Typography>
          <Typography color="text.secondary" variant="body2">
            Native Mautic tags. Tags created here appear immediately in the contact tag picker.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            startIcon={<RefreshRoundedIcon />}
            onClick={loadTags}
            disabled={loading}
            sx={{ textTransform: "none" }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={() => setDialog({ open: true, tag: null })}
            sx={{ textTransform: "none", bgcolor: "#0f766e", "&:hover": { bgcolor: "#0d6259" } }}
          >
            Create Tag
          </Button>
        </Stack>
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
        <TextField
          size="small"
          fullWidth
          placeholder="Search tags"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              setPage(1);
              setSearch(searchInput.trim());
            }
          }}
        />
        <Button
          variant="outlined"
          onClick={() => {
            setPage(1);
            setSearch(searchInput.trim());
          }}
          sx={{ textTransform: "none" }}
        >
          Search
        </Button>
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: "#E7ECEF", overflow: "hidden" }}>
        <TableContainer sx={{ overflowX: "auto" }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: "#F6F8FA" }}>
                <TableCell>Tag</TableCell>
                <TableCell>Mautic ID</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                [0, 1, 2].map((key) => (
                  <TableRow key={key}>
                    <TableCell colSpan={3}>
                      <Skeleton variant="text" height={32} />
                    </TableCell>
                  </TableRow>
                ))
              ) : !tags.length ? (
                <TableRow>
                  <TableCell colSpan={3}>
                    <Stack spacing={1} alignItems="center" sx={{ py: 4 }}>
                      <SellRoundedIcon sx={{ fontSize: 36, color: "#94A3B8" }} />
                      <Typography sx={{ fontWeight: 700, color: "#1B2A4A" }}>
                        {search ? "No tags match that search" : "No tags in Mautic yet"}
                      </Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
              ) : (
                tags.map((tag) => (
                  <TableRow key={tag.id} hover>
                    <TableCell>
                      <Typography sx={{ fontWeight: 700, color: "#1B2A4A" }}>{tag.tag}</Typography>
                    </TableCell>
                    <TableCell>{tag.id}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Rename tag">
                        <IconButton size="small" onClick={() => setDialog({ open: true, tag })}>
                          <EditRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete tag">
                        <IconButton size="small" onClick={() => setDeleteTarget(tag)}>
                          <DeleteRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {tags.length ? (
          <>
            <Divider />
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ px: 2, py: 1.5 }}
            >
              <Typography variant="body2" color="text.secondary">
                {`${Number(data?.count || 0)} tag(s)`}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Button
                  size="small"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  sx={{ textTransform: "none" }}
                >
                  Previous
                </Button>
                <Typography variant="body2">{`Page ${page} of ${numPages}`}</Typography>
                <Button
                  size="small"
                  disabled={page >= numPages || loading}
                  onClick={() => setPage((current) => current + 1)}
                  sx={{ textTransform: "none" }}
                >
                  Next
                </Button>
              </Stack>
            </Stack>
          </>
        ) : null}
      </Paper>

      <TagDialog
        open={dialog.open}
        tag={dialog.tag}
        onClose={() => setDialog({ open: false, tag: null })}
        onSaved={(_saved, isEdit) => {
          setDialog({ open: false, tag: null });
          setSnackbar({
            open: true,
            message: isEdit ? "Tag renamed in Mautic." : "Tag created in Mautic.",
            severity: "success",
          });
          loadTags();
        }}
      />

      <Dialog open={Boolean(deleteTarget)} onClose={deleting ? undefined : () => setDeleteTarget(null)}>
        <DialogTitle sx={{ fontWeight: 850 }}>Delete Tag?</DialogTitle>
        <DialogContent>
          <Typography>
            {`"${deleteTarget?.tag || ""}" will be deleted in Mautic. Mautic will refuse if the tag is still applied to contacts.`}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting} sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDelete}
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : <DeleteRoundedIcon />}
            sx={{ textTransform: "none" }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((current) => ({ ...current, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
