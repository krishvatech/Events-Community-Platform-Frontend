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
  LinearProgress,
  Paper,
  Skeleton,
  Stack,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import AnalyticsRoundedIcon from "@mui/icons-material/AnalyticsRounded";
import ContactsRoundedIcon from "@mui/icons-material/ContactsRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import FlagRoundedIcon from "@mui/icons-material/FlagRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import ListAltRoundedIcon from "@mui/icons-material/ListAltRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import ViewModuleRoundedIcon from "@mui/icons-material/ViewModuleRounded";
import { useNavigate } from "react-router-dom";

import {
  createNewsletterStage,
  deleteNewsletterStage,
  getNewsletterStageAnalytics,
  listNewsletterStages,
  updateNewsletterStage,
} from "../services/newsletterService";

const marketingTabs = [
  { value: "dashboard", label: "Dashboard", icon: <InsightsRoundedIcon fontSize="small" /> },
  { value: "campaigns", label: "Campaigns", icon: <EmailRoundedIcon fontSize="small" /> },
  { value: "lists", label: "Subscription Lists", icon: <ListAltRoundedIcon fontSize="small" /> },
  { value: "contacts", label: "Contacts", icon: <ContactsRoundedIcon fontSize="small" /> },
  { value: "stages", label: "Stages", icon: <FlagRoundedIcon fontSize="small" /> },
  { value: "audiences", label: "Audiences", icon: <GroupsRoundedIcon fontSize="small" /> },
  { value: "templates", label: "Templates", icon: <ViewModuleRoundedIcon fontSize="small" /> },
  { value: "analytics", label: "Analytics", icon: <AnalyticsRoundedIcon fontSize="small" /> },
  { value: "settings", label: "Settings", icon: <SettingsRoundedIcon fontSize="small" /> },
];

const blankForm = {
  name: "",
  description: "",
  weight: "0",
  isPublished: true,
};

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

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

function NewsletterTabs({ onChange }) {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: "#E7ECEF", overflow: "hidden" }}>
      <Tabs
        value="stages"
        onChange={(_, value) => onChange(value)}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{
          minHeight: 52,
          px: { xs: 1, md: 2 },
          "& .MuiTab-root": { gap: 1, minHeight: 52, textTransform: "none", fontWeight: 750 },
          "& .Mui-selected": { color: "#0f766e !important" },
          "& .MuiTabs-indicator": { backgroundColor: "#0f766e", height: 3 },
        }}
      >
        {marketingTabs.map((tab) => (
          <Tab key={tab.value} icon={tab.icon} iconPosition="start" label={tab.label} value={tab.value} />
        ))}
      </Tabs>
    </Paper>
  );
}

function StageDialog({ open, stage, saving, error, onClose, onSave }) {
  const [form, setForm] = useState(blankForm);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm(
      stage
        ? {
            name: stage.name || "",
            description: stage.description || "",
            weight: String(stage.weight ?? 0),
            isPublished: stage.isPublished !== false,
          }
        : blankForm
    );
    setFormError("");
  }, [open, stage]);

  const submit = () => {
    const name = form.name.trim();
    const weightText = String(form.weight).trim();
    if (!name) {
      setFormError("Stage name is required.");
      return;
    }
    if (!/^-?\d+$/.test(weightText)) {
      setFormError("Weight must be a whole number.");
      return;
    }
    setFormError("");
    onSave({
      name,
      description: form.description.trim(),
      weight: Number(weightText),
      isPublished: Boolean(form.isPublished),
    });
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{stage ? "Edit Stage" : "Create Stage"}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {(error || formError) && <Alert severity="error">{error || formError}</Alert>}
          <TextField
            autoFocus
            label="Name"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            fullWidth
            required
            disabled={saving}
          />
          <TextField
            label="Description"
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            fullWidth
            multiline
            minRows={3}
            disabled={saving}
          />
          <TextField
            label="Weight"
            type="number"
            inputProps={{ step: 1 }}
            value={form.weight}
            onChange={(event) => setForm((current) => ({ ...current, weight: event.target.value }))}
            helperText="Weight is lifecycle metadata used to order stages."
            fullWidth
            disabled={saving}
          />
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(form.isPublished)}
                onChange={(event) => setForm((current) => ({ ...current, isPublished: event.target.checked }))}
                disabled={saving}
              />
            }
            label="Published"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={saving}>
          {saving ? <CircularProgress size={20} color="inherit" /> : stage ? "Save Changes" : "Create Stage"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function DeleteDialog({ open, stage, deleting, error, onClose, onConfirm }) {
  return (
    <Dialog open={open} onClose={deleting ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Delete Stage?</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          {error && <Alert severity="error">{error}</Alert>}
          <Typography>
            Delete <strong>{stage?.name || `Stage #${stage?.id}`}</strong> from Mautic?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This removes the Stage itself. Existing contact activity remains historical Mautic data.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={deleting}>Cancel</Button>
        <Button color="error" variant="contained" onClick={onConfirm} disabled={deleting}>
          {deleting ? <CircularProgress size={20} color="inherit" /> : "Delete"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function AdminNewsletterStagesPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState("");
  const [dialog, setDialog] = useState({ open: false, stage: null, saving: false, error: "" });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, stage: null, deleting: false, error: "" });
  const pageSize = 25;

  const loadStages = useCallback(
    async ({ nextPage = page, nextSearch = search } = {}) => {
      setLoading(true);
      setError("");
      try {
        const response = await listNewsletterStages({
          page: nextPage,
          page_size: pageSize,
          ...(nextSearch ? { search: nextSearch } : {}),
        });
        setData(response);
        setPage(response?.page || nextPage);
      } catch (err) {
        setData(null);
        setError(getErrorMessage(err, "We could not load Mautic stages."));
      } finally {
        setLoading(false);
      }
    },
    [page, search]
  );

  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    setAnalyticsError("");
    try {
      const response = await getNewsletterStageAnalytics();
      setAnalytics(response);
    } catch (err) {
      setAnalytics(null);
      setAnalyticsError(
        getErrorMessage(err, "We could not load Stage distribution analytics.")
      );
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStages({ nextPage: 1, nextSearch: "" });
    loadAnalytics();
  }, []);

  const rows = Array.isArray(data?.results) ? data.results : [];
  const count = Number(data?.count || 0);
  const numPages = Math.max(1, Number(data?.num_pages || 1));
  const analyticsStages = Array.isArray(analytics?.stages) ? analytics.stages : [];
  const analyticsByStage = new Map(
    analyticsStages.map((stage) => [String(stage.id), stage])
  );

  const handleTabChange = (tab) => {
    if (tab === "stages") return;
    if (tab === "contacts") return navigate("/admin/newsletter/contacts");
    if (tab === "audiences") return navigate("/admin/newsletter/audiences");
    navigate("/admin/newsletter", { state: { newsletterTab: tab } });
  };

  const handleSearch = () => {
    const nextSearch = searchInput.trim();
    setSearch(nextSearch);
    setPage(1);
    loadStages({ nextPage: 1, nextSearch });
  };

  const saveStage = async (payload) => {
    const editing = dialog.stage;
    setDialog((current) => ({ ...current, saving: true, error: "" }));
    try {
      if (editing) await updateNewsletterStage(editing.id, payload);
      else await createNewsletterStage(payload);
      setDialog({ open: false, stage: null, saving: false, error: "" });
      setSuccess(editing ? "Stage updated in Mautic." : "Stage created in Mautic.");
      await loadStages({ nextPage: editing ? page : 1, nextSearch: search });
      await loadAnalytics();
    } catch (err) {
      setDialog((current) => ({
        ...current,
        saving: false,
        error: getErrorMessage(err, editing ? "Failed to update this Stage." : "Failed to create this Stage."),
      }));
    }
  };

  const deleteStage = async () => {
    if (!deleteDialog.stage) return;
    setDeleteDialog((current) => ({ ...current, deleting: true, error: "" }));
    try {
      await deleteNewsletterStage(deleteDialog.stage.id);
      setDeleteDialog({ open: false, stage: null, deleting: false, error: "" });
      setSuccess("Stage deleted from Mautic.");
      const nextPage = rows.length === 1 && page > 1 ? page - 1 : page;
      await loadStages({ nextPage, nextSearch: search });
      await loadAnalytics();
    } catch (err) {
      setDeleteDialog((current) => ({
        ...current,
        deleting: false,
        error: getErrorMessage(err, "Failed to delete this Stage."),
      }));
    }
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 850, color: "#1B2A4A", mb: 0.75 }}>
          Newsletter
        </Typography>
        <Typography color="text.secondary">
          Manage campaigns, subscription lists, contacts, lifecycle stages, audiences, and performance from ECP.
        </Typography>
      </Box>

      <NewsletterTabs onChange={handleTabChange} />

      {success && <Alert severity="success" onClose={() => setSuccess("")}>{success}</Alert>}

      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "center" }}
        spacing={2}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 850, color: "#1B2A4A", mb: 0.5 }}>
            Stages
          </Typography>
          <Typography color="text.secondary">
            Manage Mautic lifecycle stages used to classify each contact's current position.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            startIcon={<RefreshRoundedIcon />}
            onClick={() => {
              loadStages({ nextPage: page, nextSearch: search });
              loadAnalytics();
            }}
            disabled={loading || analyticsLoading}
            sx={{ textTransform: "none" }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={() => setDialog({ open: true, stage: null, saving: false, error: "" })}
            sx={{ textTransform: "none" }}
          >
            Create Stage
          </Button>
        </Stack>
      </Stack>

      <Alert severity="info" variant="outlined">
        Mautic is the source of truth. Weight is lifecycle metadata; direct Mautic Stage moves can still move contacts between any stages.
      </Alert>

      {analyticsError ? (
        <Alert
          severity="warning"
          action={
            <Button color="inherit" size="small" onClick={loadAnalytics}>
              Retry
            </Button>
          }
        >
          {analyticsError}
        </Alert>
      ) : analyticsLoading ? (
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} variant="rounded" height={112} sx={{ flex: 1 }} />
          ))}
        </Stack>
      ) : analytics ? (
        <>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <Paper
              variant="outlined"
              sx={{ p: 2.25, borderRadius: 2, borderColor: "#E7ECEF", flex: 1 }}
            >
              <Typography variant="body2" color="text.secondary">
                Total Contacts
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 850, color: "#1B2A4A" }}>
                {Number(analytics.total_contacts || 0)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Current Mautic contact directory
              </Typography>
            </Paper>
            <Paper
              variant="outlined"
              sx={{ p: 2.25, borderRadius: 2, borderColor: "#E7ECEF", flex: 1 }}
            >
              <Typography variant="body2" color="text.secondary">
                Staged Contacts
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 850, color: "#1B2A4A" }}>
                {Number(analytics.staged_contacts || 0)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {Number(analytics.staged_percentage || 0).toFixed(2)}% of contacts
              </Typography>
            </Paper>
            <Paper
              variant="outlined"
              sx={{ p: 2.25, borderRadius: 2, borderColor: "#E7ECEF", flex: 1 }}
            >
              <Typography variant="body2" color="text.secondary">
                No Stage
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 850, color: "#1B2A4A" }}>
                {Number(analytics.unstaged_contacts || 0)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {Number(analytics.unstaged_percentage || 0).toFixed(2)}% of contacts
              </Typography>
            </Paper>
          </Stack>

          <Paper
            variant="outlined"
            sx={{ p: 2.25, borderRadius: 2, borderColor: "#E7ECEF" }}
          >
            <Typography sx={{ fontWeight: 800, color: "#1B2A4A", mb: 1.5 }}>
              Stage Distribution
            </Typography>
            {analyticsStages.length ? (
              <Stack spacing={1.5}>
                {analyticsStages.map((stage) => (
                  <Box key={stage.id}>
                    <Stack direction="row" justifyContent="space-between" spacing={2}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {stage.name || `Stage #${stage.id}`}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {Number(stage.count || 0)} · {Number(stage.percentage || 0).toFixed(2)}%
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(100, Math.max(0, Number(stage.percentage || 0)))}
                      sx={{ mt: 0.75, height: 8, borderRadius: 4 }}
                    />
                  </Box>
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No lifecycle stages are configured yet.
              </Typography>
            )}
          </Paper>
        </>
      ) : null}

      <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: "#E7ECEF", overflow: "hidden" }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", md: "center" }}
          sx={{ p: 2, borderBottom: "1px solid #E7ECEF" }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography sx={{ fontWeight: 800, color: "#1B2A4A" }}>All Stages</Typography>
            {!loading && <Chip size="small" label={`${count} stage${count === 1 ? "" : "s"}`} variant="outlined" color="primary" />}
          </Stack>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ minWidth: { md: 440 } }}>
            <TextField
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleSearch();
                }
              }}
              placeholder="Search stages"
              size="small"
              fullWidth
              disabled={loading}
            />
            <Button variant="outlined" onClick={handleSearch} disabled={loading} sx={{ minWidth: 92, textTransform: "none" }}>
              Search
            </Button>
          </Stack>
        </Stack>

        {error ? (
          <Box sx={{ p: 2 }}>
            <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => loadStages({ nextPage: page, nextSearch: search })}>Retry</Button>}>
              {error}
            </Alert>
          </Box>
        ) : loading ? (
          <Stack spacing={1} sx={{ p: 2 }}>{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} height={48} />)}</Stack>
        ) : (
          <TableContainer sx={{ overflowX: "auto" }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: "#F6F8FA" }}>
                  <TableCell>Stage</TableCell>
                  <TableCell>Weight</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Contacts</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Modified</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((stage) => {
                  const category = stage.category?.title || stage.category?.name || "—";
                  const stageStats = analyticsByStage.get(String(stage.id));
                  return (
                    <TableRow hover key={stage.id}>
                      <TableCell sx={{ minWidth: 220 }}>
                        <Stack direction="row" spacing={1} alignItems="flex-start">
                          <FlagRoundedIcon fontSize="small" sx={{ mt: 0.35, color: "#64748B" }} />
                          <Box>
                            <Typography sx={{ fontWeight: 800, color: "#1B2A4A" }}>
                              {stage.name || `Stage #${stage.id}`}
                            </Typography>
                            {stage.description && <Typography variant="body2" color="text.secondary">{stage.description}</Typography>}
                            <Typography variant="caption" color="text.secondary">Mautic ID #{stage.id}</Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>{stage.weight ?? "—"}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={stage.isPublished === false ? "Unpublished" : "Published"}
                          color={stage.isPublished === false ? "default" : "success"}
                          variant={stage.isPublished === false ? "outlined" : "filled"}
                        />
                      </TableCell>
                      <TableCell sx={{ minWidth: 110 }}>
                        {stageStats ? (
                          <Stack spacing={0.15}>
                            <Typography sx={{ fontWeight: 750 }}>
                              {Number(stageStats.count || 0)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {Number(stageStats.percentage || 0).toFixed(2)}%
                            </Typography>
                          </Stack>
                        ) : "—"}
                      </TableCell>
                      <TableCell>{category}</TableCell>
                      <TableCell sx={{ minWidth: 165 }}>{formatDateTime(stage.dateModified || stage.dateAdded)}</TableCell>
                      <TableCell align="right" sx={{ minWidth: 120 }}>
                        <Tooltip title="Edit Stage">
                          <IconButton
                            onClick={() => setDialog({ open: true, stage, saving: false, error: "" })}
                            aria-label={`Edit ${stage.name || `Stage ${stage.id}`}`}
                          >
                            <EditRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Stage">
                          <IconButton
                            color="error"
                            onClick={() => setDeleteDialog({ open: true, stage, deleting: false, error: "" })}
                            aria-label={`Delete ${stage.name || `Stage ${stage.id}`}`}
                          >
                            <DeleteRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!rows.length && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 5 }}>
                      <Typography color="text.secondary">
                        {search ? "No stages match this search." : "No Mautic stages found."}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", sm: "center" }}
          spacing={1.5}
          sx={{ px: 2, py: 1.5, borderTop: "1px solid #E7ECEF" }}
        >
          <Typography variant="body2" color="text.secondary">
            {count} stage{count === 1 ? "" : "s"} · Page {page} of {numPages}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant="outlined"
              disabled={loading || page <= 1}
              onClick={() => loadStages({ nextPage: page - 1, nextSearch: search })}
            >
              Previous
            </Button>
            <Button
              size="small"
              variant="outlined"
              disabled={loading || page >= numPages}
              onClick={() => loadStages({ nextPage: page + 1, nextSearch: search })}
            >
              Next
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <StageDialog
        open={dialog.open}
        stage={dialog.stage}
        saving={dialog.saving}
        error={dialog.error}
        onClose={() => setDialog({ open: false, stage: null, saving: false, error: "" })}
        onSave={saveStage}
      />
      <DeleteDialog
        open={deleteDialog.open}
        stage={deleteDialog.stage}
        deleting={deleteDialog.deleting}
        error={deleteDialog.error}
        onClose={() => setDeleteDialog({ open: false, stage: null, deleting: false, error: "" })}
        onConfirm={deleteStage}
      />
    </Stack>
  );
}
