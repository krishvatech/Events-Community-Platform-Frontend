import React, { useEffect, useState } from "react";
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
  FormControlLabel,
  IconButton,
  InputAdornment,
  Pagination,
  Paper,
  Skeleton,
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
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";

import {
  createNewsletterPointGroup,
  deleteNewsletterPointGroup,
  getNewsletterPointGroup,
  getNewsletterPointGroupDeleteCheck,
  listNewsletterPointGroups,
  updateNewsletterPointGroup,
} from "../services/newsletterService";

const blankForm = {
  name: "",
  description: "",
  isPublished: false,
};

const getErrorMessage = (
  err,
  fallback = "Something went wrong. Please try again."
) => {
  const data = err?.response?.data;
  if (!data) return err?.message || fallback;
  if (typeof data === "string") return data;
  return data.detail || data.error || fallback;
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const groupToForm = (group) => ({
  name: group?.name || "",
  description: group?.description || "",
  isPublished: Boolean(group?.isPublished),
});

export default function AdminNewsletterPointGroupsPanel() {
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState(blankForm);
  const [formDialog, setFormDialog] = useState({
    open: false,
    group: null,
    loading: false,
    saving: false,
    error: "",
  });
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    group: null,
    loading: false,
    deleting: false,
    guard: null,
    error: "",
  });
  const pageSize = 25;

  const loadGroups = async (nextPage = page, nextSearch = search) => {
    setLoading(true);
    setError("");
    try {
      const data = await listNewsletterPointGroups({
        page: nextPage,
        page_size: pageSize,
        ...(nextSearch ? { search: nextSearch } : {}),
      });
      const nextRows = Array.isArray(data)
        ? data
        : Array.isArray(data?.results)
          ? data.results
          : [];
      setRows(nextRows);
      setCount(Number(data?.count ?? nextRows.length) || 0);
      setNumPages(Number(data?.num_pages ?? 0) || 0);
    } catch (err) {
      setRows([]);
      setCount(0);
      setNumPages(0);
      setError(
        getErrorMessage(err, "We could not load Mautic Point Groups.")
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups(page, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);

  const handleSearch = (event) => {
    event.preventDefault();
    const nextSearch = query.trim();
    if (page === 1 && search === nextSearch) {
      loadGroups(1, nextSearch);
      return;
    }
    setPage(1);
    setSearch(nextSearch);
  };

  const openCreate = () => {
    setForm(blankForm);
    setFormDialog({
      open: true,
      group: null,
      loading: false,
      saving: false,
      error: "",
    });
  };

  const openEdit = async (group) => {
    setForm(groupToForm(group));
    setFormDialog({
      open: true,
      group,
      loading: true,
      saving: false,
      error: "",
    });
    try {
      const fresh = await getNewsletterPointGroup(group.id);
      setForm(groupToForm(fresh));
      setFormDialog((state) => ({
        ...state,
        group: fresh,
        loading: false,
      }));
    } catch (err) {
      setFormDialog((state) => ({
        ...state,
        loading: false,
        error: getErrorMessage(
          err,
          "We could not load this Point Group."
        ),
      }));
    }
  };

  const closeForm = () => {
    if (formDialog.saving) return;
    setFormDialog({
      open: false,
      group: null,
      loading: false,
      saving: false,
      error: "",
    });
  };

  const saveGroup = async () => {
    const name = form.name.trim();
    if (!name) {
      setFormDialog((state) => ({
        ...state,
        error: "Point Group name is required.",
      }));
      return;
    }

    const payload = {
      name,
      description: form.description.trim(),
      isPublished: Boolean(form.isPublished),
    };

    setFormDialog((state) => ({
      ...state,
      saving: true,
      error: "",
    }));
    try {
      if (formDialog.group?.id) {
        await updateNewsletterPointGroup(formDialog.group.id, payload);
        setSuccess(`Point Group "${name}" updated.`);
      } else {
        await createNewsletterPointGroup(payload);
        setSuccess(`Point Group "${name}" created.`);
      }
      setFormDialog({
        open: false,
        group: null,
        loading: false,
        saving: false,
        error: "",
      });
      await loadGroups(page, search);
    } catch (err) {
      setFormDialog((state) => ({
        ...state,
        saving: false,
        error: getErrorMessage(
          err,
          formDialog.group?.id
            ? "Failed to update this Point Group."
            : "Failed to create this Point Group."
        ),
      }));
    }
  };

  const openDelete = async (group) => {
    setDeleteDialog({
      open: true,
      group,
      loading: true,
      deleting: false,
      guard: null,
      error: "",
    });
    try {
      const guard = await getNewsletterPointGroupDeleteCheck(group.id);
      setDeleteDialog((state) => ({
        ...state,
        loading: false,
        guard,
      }));
    } catch (err) {
      setDeleteDialog((state) => ({
        ...state,
        loading: false,
        error: getErrorMessage(
          err,
          "We could not verify whether this Point Group can be deleted safely."
        ),
      }));
    }
  };

  const closeDelete = () => {
    if (deleteDialog.deleting) return;
    setDeleteDialog({
      open: false,
      group: null,
      loading: false,
      deleting: false,
      guard: null,
      error: "",
    });
  };

  const confirmDelete = async () => {
    const group = deleteDialog.group;
    if (!group?.id || !deleteDialog.guard?.delete_allowed) return;

    setDeleteDialog((state) => ({
      ...state,
      deleting: true,
      error: "",
    }));
    try {
      await deleteNewsletterPointGroup(group.id);
      setSuccess(`Point Group "${group.name || group.id}" deleted.`);
      setDeleteDialog({
        open: false,
        group: null,
        loading: false,
        deleting: false,
        guard: null,
        error: "",
      });

      if (rows.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        await loadGroups(page, search);
      }
    } catch (err) {
      const providerGuard = err?.response?.data?.delete_guard;
      setDeleteDialog((state) => ({
        ...state,
        deleting: false,
        guard: providerGuard || state.guard,
        error: getErrorMessage(
          err,
          "Failed to delete this Point Group safely."
        ),
      }));
    }
  };

  const guard = deleteDialog.guard;
  const deleteAllowed = Boolean(guard?.delete_allowed);
  const actionCount = Number(guard?.point_actions || 0);
  const triggerCount = Number(guard?.point_triggers || 0);

  return (
    <Stack spacing={3}>
      {success && (
        <Alert severity="success" onClose={() => setSuccess("")}>
          {success}
        </Alert>
      )}

      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", md: "center" }}
        spacing={2}
      >
        <Box>
          <Typography
            variant="h5"
            sx={{ fontWeight: 850, color: "#1B2A4A" }}
          >
            Point Groups
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Organize Mautic scoring into separate score groups. Mautic remains
            the source of truth.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            startIcon={<RefreshRoundedIcon />}
            onClick={() => loadGroups(page, search)}
            disabled={loading}
            sx={{ textTransform: "none" }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={openCreate}
            sx={{ textTransform: "none" }}
          >
            Create Point Group
          </Button>
        </Stack>
      </Stack>

      <Alert severity="info" variant="outlined">
        Mautic 7.1.3 can cascade-delete linked Point Actions and Point Triggers
        when a Point Group is deleted. ECP always runs a server-side safety
        check before enabling deletion.
      </Alert>

      <Paper
        variant="outlined"
        sx={{ borderRadius: 2, borderColor: "#E7ECEF", overflow: "hidden" }}
      >
        <Box
          component="form"
          onSubmit={handleSearch}
          sx={{
            px: { xs: 2, md: 3 },
            py: 2,
            borderBottom: "1px solid #E7ECEF",
          }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            alignItems={{ xs: "stretch", sm: "center" }}
          >
            <TextField
              size="small"
              placeholder="Search Point Groups"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: { sm: 340 } }}
            />
            <Button
              type="submit"
              variant="outlined"
              sx={{ textTransform: "none" }}
            >
              Search
            </Button>
            {search && (
              <Button
                onClick={() => {
                  setQuery("");
                  setPage(1);
                  setSearch("");
                }}
                sx={{ textTransform: "none" }}
              >
                Clear
              </Button>
            )}
            <Box sx={{ flexGrow: 1 }} />
            <Typography variant="body2" color="text.secondary">
              {count} Point Group{count === 1 ? "" : "s"}
            </Typography>
          </Stack>
        </Box>

        {error && (
          <Box sx={{ p: 3 }}>
            <Alert
              severity="error"
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => loadGroups(page, search)}
                >
                  Retry
                </Button>
              }
            >
              {error}
            </Alert>
          </Box>
        )}

        {!error && loading ? (
          <Box sx={{ p: 3 }}>
            <Stack spacing={1}>
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} height={48} />
              ))}
            </Stack>
          </Box>
        ) : !error && rows.length === 0 ? (
          <Box sx={{ p: 3 }}>
            <Alert severity="info" variant="outlined">
              {search
                ? "No Point Groups match this search."
                : "No Point Groups have been created in Mautic yet."}
            </Alert>
          </Box>
        ) : !error ? (
          <>
            <TableContainer sx={{ overflowX: "auto" }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: "#F6F8FA" }}>
                    <TableCell>Point Group</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Modified</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((group) => (
                    <TableRow hover key={group.id}>
                      <TableCell>
                        <Typography
                          sx={{ fontWeight: 800, color: "#1B2A4A" }}
                        >
                          {group.name || `Point Group #${group.id}`}
                        </Typography>
                        {group.description && (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mt: 0.25, maxWidth: 650 }}
                          >
                            {group.description}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={group.isPublished ? "Published" : "Unpublished"}
                          color={group.isPublished ? "success" : "default"}
                          variant={group.isPublished ? "filled" : "outlined"}
                          sx={{ fontWeight: 750 }}
                        />
                      </TableCell>
                      <TableCell>
                        {formatDateTime(group.dateModified || group.dateAdded)}
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Edit Point Group">
                          <IconButton onClick={() => openEdit(group)}>
                            <EditRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Check and delete Point Group">
                          <IconButton
                            color="error"
                            onClick={() => openDelete(group)}
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

            {numPages > 1 && (
              <Stack
                direction="row"
                justifyContent="center"
                sx={{ p: 2, borderTop: "1px solid #E7ECEF" }}
              >
                <Pagination
                  count={numPages}
                  page={page}
                  onChange={(_, value) => setPage(value)}
                  disabled={loading}
                  color="primary"
                />
              </Stack>
            )}
          </>
        ) : null}
      </Paper>

      <Dialog
        open={formDialog.open}
        onClose={formDialog.saving ? undefined : closeForm}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {formDialog.group?.id ? "Edit Point Group" : "Create Point Group"}
        </DialogTitle>
        <DialogContent dividers>
          {formDialog.loading ? (
            <Stack spacing={1.5}>
              <Skeleton height={56} />
              <Skeleton height={100} />
              <Skeleton height={44} />
            </Stack>
          ) : (
            <Stack spacing={2}>
              {formDialog.error && (
                <Alert severity="error">{formDialog.error}</Alert>
              )}
              <TextField
                autoFocus
                required
                label="Name"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                disabled={formDialog.saving}
                fullWidth
              />
              <TextField
                label="Description"
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                disabled={formDialog.saving}
                multiline
                minRows={3}
                fullWidth
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={form.isPublished}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        isPublished: event.target.checked,
                      }))
                    }
                    disabled={formDialog.saving}
                  />
                }
                label="Published"
              />
              <Typography variant="caption" color="text.secondary">
                New Point Groups are unpublished by default so they can be
                reviewed before use.
              </Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeForm} disabled={formDialog.saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={saveGroup}
            disabled={
              formDialog.loading ||
              formDialog.saving ||
              !form.name.trim()
            }
          >
            {formDialog.saving ? (
              <CircularProgress size={20} color="inherit" />
            ) : formDialog.group?.id ? (
              "Save Changes"
            ) : (
              "Create Group"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteDialog.open}
        onClose={deleteDialog.deleting ? undefined : closeDelete}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Point Group?</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography>
              {deleteDialog.group?.name
                ? `Check whether "${deleteDialog.group.name}" can be deleted safely.`
                : "Check whether this Point Group can be deleted safely."}
            </Typography>

            {deleteDialog.loading && (
              <Alert severity="info" icon={<CircularProgress size={18} />}>
                Checking Mautic dependencies...
              </Alert>
            )}

            {deleteDialog.error && (
              <Alert severity="error">{deleteDialog.error}</Alert>
            )}

            {!deleteDialog.loading && guard && deleteAllowed && (
              <Alert severity="success">
                Safety check passed. Mautic currently has no Point Actions or
                Point Triggers, so this Group can be deleted without cascading
                to those resources.
              </Alert>
            )}

            {!deleteDialog.loading && guard && !deleteAllowed && (
              <Alert severity="warning">
                Deletion is blocked for safety. Mautic currently contains{" "}
                <strong>{actionCount}</strong> Point Action
                {actionCount === 1 ? "" : "s"} and{" "}
                <strong>{triggerCount}</strong> Point Trigger
                {triggerCount === 1 ? "" : "s"}. Mautic 7.1.3 does not expose
                a reliable Group relationship in the legacy list responses, so
                ECP will not risk cascade-deleting automation.
              </Alert>
            )}

            {guard?.mode === "global_conservative" && (
              <Typography variant="body2" color="text.secondary">
                Safety mode: conservative provider check. Group deletion will
                become more specific once reliable Action/Trigger Group
                assignment mapping is implemented.
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDelete} disabled={deleteDialog.deleting}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={confirmDelete}
            disabled={
              deleteDialog.loading ||
              deleteDialog.deleting ||
              !deleteAllowed
            }
          >
            {deleteDialog.deleting ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              "Delete Point Group"
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
