import React, { useCallback, useEffect, useState } from "react";
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
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";

import {
  deleteNewsletterMauticCampaign,
  getNewsletterMauticCampaign,
  listNewsletterMauticCampaigns,
  updateNewsletterMauticCampaign,
} from "../services/newsletterService";

const PAGE_SIZE = 25;

const getErrorMessage = (err, fallback = "Something went wrong. Please try again.") => {
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

const formatCount = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  const number = Number(value);
  return Number.isFinite(number) ? new Intl.NumberFormat().format(number) : "-";
};

const sourceLabel = (source, fallback) =>
  source?.name || source?.alias || (source?.id ? `${fallback} #${source.id}` : fallback);

const eventCategoryColor = (eventType) => {
  const normalized = String(eventType || "").toLowerCase();
  if (normalized === "action") return "primary";
  if (normalized === "decision") return "warning";
  if (normalized === "condition") return "info";
  return "default";
};

function PublishedChip({ published }) {
  return (
    <Chip
      size="small"
      label={published ? "Published" : "Draft"}
      color={published ? "success" : "default"}
      variant={published ? "filled" : "outlined"}
      sx={{ fontWeight: 800 }}
    />
  );
}

function CampaignDetailDialog({
  open,
  campaign,
  loading,
  error,
  onClose,
  onRefresh,
  onEdit,
  onDelete,
}) {
  const events = Array.isArray(campaign?.events) ? campaign.events : [];
  const lists = Array.isArray(campaign?.lists) ? campaign.lists : [];
  const forms = Array.isArray(campaign?.forms) ? campaign.forms : [];
  const canvas = campaign?.canvasSettings || {};
  const nodes = Array.isArray(canvas?.nodes) ? canvas.nodes : [];
  const connections = Array.isArray(canvas?.connections) ? canvas.connections : [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          alignItems={{ xs: "flex-start", sm: "center" }}
          justifyContent="space-between"
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 850, color: "#1B2A4A" }}>
              {campaign?.name || "Native Mautic Campaign"}
            </Typography>
            {campaign?.id && (
              <Typography variant="body2" color="text.secondary">
                Mautic Campaign ID {campaign.id}
              </Typography>
            )}
          </Box>
          {campaign && <PublishedChip published={Boolean(campaign.isPublished)} />}
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        {loading ? (
          <Stack spacing={1.5}>
            <Skeleton height={36} />
            <Skeleton height={80} />
            <Skeleton variant="rectangular" height={240} />
          </Stack>
        ) : error ? (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={onRefresh}>
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        ) : campaign ? (
          <Stack spacing={3}>
            <Alert severity="info" variant="outlined">
              This is a native Mautic automation Campaign. Mautic is the source of truth;
              this view does not read from the legacy ECP NewsletterCampaign model.
            </Alert>

            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
              <Stack spacing={1}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                  Campaign Information
                </Typography>
                <Typography color="text.secondary">
                  {campaign.description || "No description."}
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={3} sx={{ pt: 1 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Contacts
                    </Typography>
                    <Typography sx={{ fontWeight: 750 }}>
                      {formatCount(campaign.contactCount)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Added
                    </Typography>
                    <Typography sx={{ fontWeight: 750 }}>
                      {formatDateTime(campaign.dateAdded)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Modified
                    </Typography>
                    <Typography sx={{ fontWeight: 750 }}>
                      {formatDateTime(campaign.dateModified)}
                    </Typography>
                  </Box>
                </Stack>
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.5 }}>
                Sources
              </Typography>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75 }}>
                    Segments
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {lists.length ? (
                      lists.map((source) => (
                        <Chip
                          key={`list-${source.id}`}
                          label={sourceLabel(source, "Segment")}
                          variant="outlined"
                        />
                      ))
                    ) : (
                      <Typography variant="body2">No Segment sources.</Typography>
                    )}
                  </Stack>
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75 }}>
                    Forms
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {forms.length ? (
                      forms.map((source) => (
                        <Chip
                          key={`form-${source.id}`}
                          label={sourceLabel(source, "Form")}
                          variant="outlined"
                        />
                      ))
                    ) : (
                      <Typography variant="body2">No Form sources.</Typography>
                    )}
                  </Stack>
                </Box>
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
              <Box
                sx={{
                  px: 2.5,
                  py: 2,
                  bgcolor: "#F6F8FA",
                  borderBottom: "1px solid #E7ECEF",
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                  Workflow Events
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Native Mautic actions, decisions, and conditions.
                </Typography>
              </Box>

              {events.length ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Order</TableCell>
                        <TableCell>Name</TableCell>
                        <TableCell>Category</TableCell>
                        <TableCell>Provider Type</TableCell>
                        <TableCell>Parent</TableCell>
                        <TableCell>Path</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {events.map((event, index) => (
                        <TableRow key={event.id || `${event.type}-${index}`}>
                          <TableCell>{event.order ?? index + 1}</TableCell>
                          <TableCell sx={{ fontWeight: 750 }}>
                            {event.name || "Unnamed event"}
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={event.eventType || "Unknown"}
                              color={eventCategoryColor(event.eventType)}
                              variant="outlined"
                              sx={{ textTransform: "capitalize" }}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography component="code" variant="body2">
                              {event.type || "-"}
                            </Typography>
                          </TableCell>
                          <TableCell>{event.parent || "-"}</TableCell>
                          <TableCell>{event.decisionPath || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Box sx={{ p: 2.5 }}>
                  <Alert severity="info" variant="outlined">
                    No workflow events are present in this Campaign.
                  </Alert>
                </Box>
              )}
            </Paper>

            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
                Canvas
              </Typography>
              <Stack direction="row" spacing={3}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Nodes
                  </Typography>
                  <Typography sx={{ fontWeight: 800 }}>{nodes.length}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Connections
                  </Typography>
                  <Typography sx={{ fontWeight: 800 }}>{connections.length}</Typography>
                </Box>
              </Stack>
            </Paper>
          </Stack>
        ) : null}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button
          startIcon={<EditRoundedIcon />}
          onClick={onEdit}
          disabled={!campaign || loading}
        >
          Edit
        </Button>
        <Button
          color="error"
          startIcon={<DeleteRoundedIcon />}
          onClick={onDelete}
          disabled={!campaign || loading}
        >
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function EditCampaignDialog({
  open,
  campaign,
  saving,
  error,
  onClose,
  onSave,
}) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    isPublished: false,
  });
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm({
      name: campaign?.name || "",
      description: campaign?.description || "",
      isPublished: Boolean(campaign?.isPublished),
    });
    setFormError("");
  }, [open, campaign]);

  const save = () => {
    const name = form.name.trim();
    if (!name) {
      setFormError("Campaign name is required.");
      return;
    }
    onSave({
      name,
      description: form.description,
      isPublished: Boolean(form.isPublished),
    });
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Native Mautic Campaign</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Alert severity="info" variant="outlined">
            This phase edits provider-owned Campaign metadata and publication state. Segment
            sources and workflow events are displayed from Mautic and will be edited in the
            Campaign Builder phase.
          </Alert>

          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="Campaign Name"
            value={form.name}
            onChange={(event) => {
              setForm((current) => ({ ...current, name: event.target.value }));
              setFormError("");
            }}
            error={Boolean(formError)}
            helperText={formError}
            inputProps={{ maxLength: 190 }}
            fullWidth
            required
            disabled={saving}
          />

          <TextField
            label="Description"
            value={form.description}
            onChange={(event) =>
              setForm((current) => ({ ...current, description: event.target.value }))
            }
            multiline
            minRows={4}
            fullWidth
            disabled={saving}
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
                disabled={saving}
              />
            }
            label={form.isPublished ? "Published" : "Draft / Unpublished"}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" onClick={save} disabled={saving}>
          {saving ? <CircularProgress size={20} color="inherit" /> : "Save Changes"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function DeleteCampaignDialog({
  open,
  campaign,
  deleting,
  onClose,
  onConfirm,
}) {
  return (
    <Dialog open={open} onClose={deleting ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Delete Native Mautic Campaign?</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Alert severity="warning">
            This permanently deletes the Campaign from native Mautic. Only delete a Campaign
            when you are sure it is no longer needed.
          </Alert>
          <Typography>
            Campaign: <strong>{campaign?.name || "-"}</strong>
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={deleting}>
          Cancel
        </Button>
        <Button color="error" variant="contained" onClick={onConfirm} disabled={deleting}>
          {deleting ? <CircularProgress size={20} color="inherit" /> : "Delete Campaign"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function AdminNewsletterMauticCampaignsPanel() {
  const [campaigns, setCampaigns] = useState([]);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [numPages, setNumPages] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [selected, setSelected] = useState(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [snack, setSnack] = useState({
    open: false,
    severity: "success",
    message: "",
  });

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listNewsletterMauticCampaigns({
        page,
        page_size: PAGE_SIZE,
        ...(search ? { search } : {}),
      });
      setCampaigns(Array.isArray(data?.results) ? data.results : []);
      setCount(Number(data?.count || 0));
      setNumPages(Number(data?.num_pages || 0));
    } catch (err) {
      setCampaigns([]);
      setError(
        getErrorMessage(err, "We could not load native Mautic Campaigns.")
      );
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  const loadDetail = async (campaignId, { open = true } = {}) => {
    if (open) setDetailOpen(true);
    setDetailLoading(true);
    setDetailError("");
    try {
      const data = await getNewsletterMauticCampaign(campaignId);
      setSelected(data);
      return data;
    } catch (err) {
      setDetailError(
        getErrorMessage(err, "We could not load this native Mautic Campaign.")
      );
      return null;
    } finally {
      setDetailLoading(false);
    }
  };

  const openCampaign = (campaign) => {
    setSelected(campaign);
    loadDetail(campaign.id);
  };

  const openEdit = async (campaign = selected) => {
    if (!campaign?.id) return;
    const fresh = await loadDetail(campaign.id, { open: false });
    if (!fresh) return;
    setEditError("");
    setEditOpen(true);
  };

  const saveEdit = async (payload) => {
    if (!selected?.id) return;
    setEditSaving(true);
    setEditError("");
    try {
      const data = await updateNewsletterMauticCampaign(selected.id, payload);
      setSelected(data);
      setEditOpen(false);
      setSnack({
        open: true,
        severity: "success",
        message: "Native Mautic Campaign updated.",
      });
      await loadCampaigns();
    } catch (err) {
      setEditError(
        getErrorMessage(err, "We could not update this native Mautic Campaign.")
      );
    } finally {
      setEditSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!selected?.id) return;
    setDeleting(true);
    try {
      await deleteNewsletterMauticCampaign(selected.id);
      setDeleteOpen(false);
      setDetailOpen(false);
      setSelected(null);
      setSnack({
        open: true,
        severity: "success",
        message: "Native Mautic Campaign deleted.",
      });
      if (campaigns.length === 1 && page > 1) {
        setPage((current) => Math.max(1, current - 1));
      } else {
        await loadCampaigns();
      }
    } catch (err) {
      setDeleteOpen(false);
      setSnack({
        open: true,
        severity: "error",
        message: getErrorMessage(
          err,
          "We could not delete this native Mautic Campaign."
        ),
      });
    } finally {
      setDeleting(false);
    }
  };

  const submitSearch = (event) => {
    event.preventDefault();
    const next = searchInput.trim();
    setPage(1);
    setSearch(next);
  };

  const clearSearch = () => {
    setSearchInput("");
    setPage(1);
    setSearch("");
  };

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        spacing={2}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 850, color: "#1B2A4A" }}>
            Native Mautic Campaigns
          </Typography>
          <Typography color="text.secondary">
            Manage provider-owned Mautic automation Campaigns from ECP.
          </Typography>
        </Box>

        <Button
          startIcon={<RefreshRoundedIcon />}
          onClick={loadCampaigns}
          disabled={loading}
          sx={{ textTransform: "none", alignSelf: "flex-start" }}
        >
          Refresh
        </Button>
      </Stack>

      <Alert severity="info" variant="outlined">
        Mautic is the source of truth for this Campaign screen. The old ECP newsletter
        broadcast Campaign model is not used here. Native Campaign creation, Segment/Form
        source editing, and workflow building will be enabled in the next Campaign Builder
        phases.
      </Alert>

      <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: "#E7ECEF" }}>
        <Box
          component="form"
          onSubmit={submitSearch}
          sx={{
            p: 2,
            display: "flex",
            gap: 1.5,
            alignItems: "center",
            flexDirection: { xs: "column", sm: "row" },
          }}
        >
          <TextField
            size="small"
            placeholder="Search native Mautic Campaigns"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            fullWidth
            InputProps={{
              startAdornment: (
                <SearchRoundedIcon
                  fontSize="small"
                  sx={{ mr: 1, color: "text.secondary" }}
                />
              ),
            }}
          />
          <Button type="submit" variant="contained" disabled={loading}>
            Search
          </Button>
          {(search || searchInput) && (
            <Button onClick={clearSearch} disabled={loading}>
              Clear
            </Button>
          )}
        </Box>
      </Paper>

      {error && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={loadCampaigns}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      <Paper
        variant="outlined"
        sx={{ borderRadius: 2, borderColor: "#E7ECEF", overflow: "hidden" }}
      >
        {loading ? (
          <Box sx={{ p: 3 }}>
            <Stack spacing={1}>
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} height={46} />
              ))}
            </Stack>
          </Box>
        ) : campaigns.length === 0 ? (
          <Box sx={{ p: 3 }}>
            <Alert severity="info" variant="outlined">
              {search
                ? "No native Mautic Campaigns match this search."
                : "No native Mautic Campaigns exist yet. Campaigns created in Mautic will appear here immediately."}
            </Alert>
          </Box>
        ) : (
          <TableContainer sx={{ overflowX: "auto" }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: "#F6F8FA" }}>
                  <TableCell>Campaign</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Sources</TableCell>
                  <TableCell>Workflow</TableCell>
                  <TableCell>Contacts</TableCell>
                  <TableCell>Modified</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {campaigns.map((campaign) => {
                  const listCount = Array.isArray(campaign.lists)
                    ? campaign.lists.length
                    : 0;
                  const formCount = Array.isArray(campaign.forms)
                    ? campaign.forms.length
                    : 0;
                  const eventCount = Array.isArray(campaign.events)
                    ? campaign.events.length
                    : 0;

                  return (
                    <TableRow
                      hover
                      key={campaign.id}
                      sx={{ cursor: "pointer" }}
                      onClick={() => openCampaign(campaign)}
                    >
                      <TableCell>
                        <Typography sx={{ fontWeight: 800, color: "#1B2A4A" }}>
                          {campaign.name || "Untitled Campaign"}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Mautic ID {campaign.id}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <PublishedChip published={Boolean(campaign.isPublished)} />
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2">
                          {listCount} Segment{listCount === 1 ? "" : "s"}
                          {formCount ? ` · ${formCount} Form${formCount === 1 ? "" : "s"}` : ""}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        {eventCount} event{eventCount === 1 ? "" : "s"}
                      </TableCell>

                      <TableCell>{formatCount(campaign.contactCount)}</TableCell>

                      <TableCell>{formatDateTime(campaign.dateModified)}</TableCell>

                      <TableCell align="right">
                        <Tooltip title="View Campaign">
                          <IconButton
                            onClick={(event) => {
                              event.stopPropagation();
                              openCampaign(campaign);
                            }}
                          >
                            <VisibilityRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit Campaign metadata">
                          <IconButton
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelected(campaign);
                              openEdit(campaign);
                            }}
                          >
                            <EditRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete native Campaign">
                          <IconButton
                            color="error"
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelected(campaign);
                              setDeleteOpen(true);
                            }}
                          >
                            <DeleteRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {!loading && !error && (
          <Box
            sx={{
              p: 2,
              borderTop: campaigns.length ? "1px solid #E7ECEF" : 0,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 2,
              flexWrap: "wrap",
            }}
          >
            <Typography variant="body2" color="text.secondary">
              {count} Campaign{count === 1 ? "" : "s"}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                size="small"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </Button>
              <Typography variant="body2">
                Page {page}
                {numPages ? ` of ${numPages}` : ""}
              </Typography>
              <Button
                size="small"
                disabled={!numPages || page >= numPages}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </Button>
            </Stack>
          </Box>
        )}
      </Paper>

      <CampaignDetailDialog
        open={detailOpen}
        campaign={selected}
        loading={detailLoading}
        error={detailError}
        onClose={() => {
          setDetailOpen(false);
          setDetailError("");
        }}
        onRefresh={() => selected?.id && loadDetail(selected.id)}
        onEdit={() => openEdit(selected)}
        onDelete={() => setDeleteOpen(true)}
      />

      <EditCampaignDialog
        open={editOpen}
        campaign={selected}
        saving={editSaving}
        error={editError}
        onClose={() => {
          setEditOpen(false);
          setEditError("");
        }}
        onSave={saveEdit}
      />

      <DeleteCampaignDialog
        open={deleteOpen}
        campaign={selected}
        deleting={deleting}
        onClose={() => setDeleteOpen(false)}
        onConfirm={confirmDelete}
      />

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((current) => ({ ...current, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity={snack.severity}
          onClose={() => setSnack((current) => ({ ...current, open: false }))}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
